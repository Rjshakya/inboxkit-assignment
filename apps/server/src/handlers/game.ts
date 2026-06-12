import { Result } from "better-result";
import type { Message, ScoreEntry, SessionPlayer } from "@inboxkit-assignment/game-types";

import {
  CellClaimingWorkflowError,
  cellClaimingWorkflow,
  ensureSessionGrid,
  getSessionScore,
} from "../game/logic";
import { getSessionPlayersDetails, handleActivePlayerExpired } from "../game/session";
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

    const [gridResult, playersResult, scoresResult, activePlayerResult] = await Promise.all([
      ensureSessionGrid(ctx.redis)(sessionId),
      getSessionPlayersDetails({ db: ctx.db })(sessionId),
      getSessionScore(ctx.redis)(sessionId),
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
      gridResult.value.every((row) => row.every((cell) => cell.claimed)) && scores[0]
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
    const scoresResult = await getSessionScore(ctx.redis)(sessionId);

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

    if (claimResult.value.isGameOver) {
      await broadcastToSession(sessionId, {
        type: "game_over",
        sessionId,
        scores,
        winnerUserId: scores[0]?.userId ?? null,
      } satisfies Message);
    }
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
    if (changed) {
      await broadcastToSession(sessionId, {
        type: "turn_changed",
        sessionId,
        activePlayer,
      } satisfies Message);
    }
  },
});
