import { Result } from "better-result";
import type { Grid, Message, ScoreEntry, SessionPlayer } from "@inboxkit-assignment/game-types";

import {
  CellClaimingWorkflowError,
  cellClaimingWorkflow,
  ensureSessionGrid,
  handleActivePlayerExpired,
  isGameOver,
  deadlockWorkflow,
} from "@/services/game-state";
import { getSessionPlayersDetails } from "@/services/session-player";
import { redisRepo } from "@/redis/repo";
import { broadcastToSession, sendMessage } from "../redis/pubsub";
import { createRegistry } from "./types";

const toSessionPlayers = (players: { userId?: string; username?: string }[]): SessionPlayer[] =>
  players.map((player) => ({
    userId: player.userId ?? "",
    username: player.username ?? "",
  }));

const toScoreEntries = (
  scores: { userId: string; score: number }[],
  players: SessionPlayer[],
): ScoreEntry[] => {
  const playerMap = new Map(players.map((player) => [player.userId, player.username]));
  return scores.map((score) => ({
    userId: score.userId,
    username: playerMap.get(score.userId) ?? "Unknown",
    score: score.score,
  }));
};

export const gameHandlers = createRegistry({
  get_game_state: async (ctx, payload) => {
    const { sessionId } = payload;

    const repo = redisRepo({ redis: ctx.redis });

    const [gridResult, playersResult, scoresResult, activePlayerResult] = await Promise.all([
      ensureSessionGrid(ctx.redis)(sessionId),
      getSessionPlayersDetails({ db: ctx.db })(sessionId),
      repo.scores.get(sessionId),
      handleActivePlayerExpired({ db: ctx.db, redis: ctx.redis })(sessionId),
    ]);

    if (
      Result.isError(gridResult) ||
      Result.isError(playersResult) ||
      Result.isError(scoresResult) ||
      Result.isError(activePlayerResult)
    ) {
      return;
    }

    const players = toSessionPlayers(playersResult.value);
    const scores = toScoreEntries(scoresResult.value, players);
    const winnerUserId =
      gridResult.value.every((row: Grid[number]) =>
        row.every((cell) => cell.claimed),
      ) && scores[0]
        ? scores[0].userId
        : null;

    const activePlayer = activePlayerResult.value;

    sendMessage(ctx.ws)({
      type: "game_state",
      state: {
        sessionId,
        grid: gridResult.value,
        activePlayer: activePlayer.activePlayer,
        scores,
        players,
        status: winnerUserId ? "finished" : "active",
        winnerUserId,
      },
    } satisfies Message);

    if (activePlayer.changed) {
      await broadcastToSession(sessionId, {
        type: "turn_changed",
        sessionId,
        activePlayer: activePlayer.activePlayer,
      } satisfies Message);
    }
  },

  claim_cell: async (ctx, payload) => {
    const { sessionId, row, col } = payload;
    const claimResult = await cellClaimingWorkflow({ db: ctx.db, redis: ctx.redis })({
      sessionId,
      userId: ctx.userId,
      userColor: ctx.userColor,
      row,
      col,
    });

    if (Result.isError(claimResult)) {
      if (!(claimResult.error instanceof CellClaimingWorkflowError)) {
        return;
      }

      sendMessage(ctx.ws)({
        type: "claim_rejected",
        reason: claimResult.error.reason,
        message: claimResult.error.message,
      } satisfies Message);
      return;
    }

    const playersResult = await getSessionPlayersDetails({ db: ctx.db })(sessionId);
    const scoresResult = await redisRepo({ redis: ctx.redis }).scores.get(sessionId);

    if (Result.isError(playersResult) || Result.isError(scoresResult)) {
      return;
    }

    const players = toSessionPlayers(playersResult.value);
    const scores = toScoreEntries(scoresResult.value, players);

    await broadcastToSession(sessionId, {
      type: "cell_claimed",
      sessionId,
      row: claimResult.value.row,
      col: claimResult.value.col,
      userId: ctx.userId,
      userColor: ctx.userColor,
    } satisfies Message);

    await broadcastToSession(sessionId, {
      type: "score_updated",
      sessionId,
      scores,
    } satisfies Message);
  },

  turn_expired: async (ctx, payload) => {
    const { sessionId } = payload;
    const activePlayerResult = await handleActivePlayerExpired({ db: ctx.db, redis: ctx.redis })(
      sessionId,
    );

    if (Result.isError(activePlayerResult)) {
      return;
    }

    const { activePlayer, changed } = activePlayerResult.value;
    // Only broadcast if the turn actually changed
    if (!changed) return;

    // 1. Notify clients immediately
    await broadcastToSession(sessionId, {
      type: "turn_changed",
      sessionId,
      activePlayer,
    } satisfies Message);

    const repo = redisRepo({ redis: ctx.redis });

    // 2. Load grid and players
    const [gridResult, playersResult] = await Promise.all([
      repo.grid.get(sessionId),
      repo.players.get(sessionId),
    ]);

    if (Result.isError(gridResult) || Result.isError(playersResult)) {
      return;
    }

    const grid = gridResult.value;
    const players = playersResult.value;

    if (!grid) {
      return;
    }

    // 3. Check game over
    if (isGameOver(grid, players)) {
      const scoresResult = await repo.scores.get(sessionId);
      const playersDetailsResult = await getSessionPlayersDetails({ db: ctx.db })(sessionId);
      if (Result.isOk(scoresResult) && Result.isOk(playersDetailsResult)) {
        const sessionPlayers = toSessionPlayers(playersDetailsResult.value);
        const scores = toScoreEntries(scoresResult.value, sessionPlayers);
        await broadcastToSession(sessionId, {
          type: "game_over",
          sessionId,
          scores,
          winnerUserId: scores[0]?.userId ?? null,
        } satisfies Message);
      }
      return;
    }

    // 4. Detect and remove deadlocked players
    const deadlockResult = await deadlockWorkflow({ redis: ctx.redis })({
      sessionId,
      grid,
      activePlayer,
    });

    if (Result.isError(deadlockResult)) {
      return;
    }

    const { deadlockedPlayers, activePlayer: finalActivePlayer, gameOver } = deadlockResult.value;

    if (deadlockedPlayers.length > 0) {
      await broadcastToSession(sessionId, {
        type: "players_deadlocked",
        sessionId,
        userIds: deadlockedPlayers,
      } satisfies Message);
    }

    if (gameOver) {
      const scoresResult = await repo.scores.get(sessionId);
      const playersDetailsResult = await getSessionPlayersDetails({ db: ctx.db })(sessionId);
      if (Result.isOk(scoresResult) && Result.isOk(playersDetailsResult)) {
        const sessionPlayers = toSessionPlayers(playersDetailsResult.value);
        const scores = toScoreEntries(scoresResult.value, sessionPlayers);
        await broadcastToSession(sessionId, {
          type: "game_over",
          sessionId,
          scores,
          winnerUserId: scores[0]?.userId ?? null,
        } satisfies Message);
      }
      return;
    }

    // 5. If active player changed due to deadlock, broadcast again
    if (finalActivePlayer.userId !== activePlayer.userId) {
      await broadcastToSession(sessionId, {
        type: "turn_changed",
        sessionId,
        activePlayer: finalActivePlayer,
      } satisfies Message);
    }
  },
});
