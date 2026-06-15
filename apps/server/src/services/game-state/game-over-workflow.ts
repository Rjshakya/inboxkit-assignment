import { Result } from "better-result";
import { eq, type NodePgDatabase } from "@inboxkit-assignment/db";
import { gameSessionTable, gameStateTable } from "@inboxkit-assignment/db/schema/game";
import type { Grid, ScoreEntry } from "@inboxkit-assignment/game-types";
import type Redis from "ioredis";

import { redisRepo } from "@/redis/repo";
import { DBError, RedisError } from "@/services/shared/errors";
import { getSessionPlayersDetails } from "@/services/session-player/player";

import { GameStateError } from "./errors";

export const gameOverWorkflow =
  (deps: { db: NodePgDatabase<any>; redis: Redis }) => (input: { sessionId: string }) => {
    const { db, redis } = deps;
    const { sessionId } = input;

    return Result.gen(async function* () {
      const repo = redisRepo({ redis });

      const [sessionRow] = yield* Result.await(
        Result.tryPromise({
          try: async () => {
            return await db
              .select({ id: gameSessionTable.id, isExpired: gameSessionTable.isExpired })
              .from(gameSessionTable)
              .where(eq(gameSessionTable.id, sessionId))
              .limit(1);
          },
          catch: (e) => {
            return new DBError({
              operation: "QUERY",
              message: String(e),
            });
          },
        }),
      );

      if (!sessionRow) {
        return yield* new GameStateError({
          reason: "SessionNotFound",
          message: "Session not found",
        });
      }

      if (sessionRow.isExpired) {
        const [existingState] = yield* Result.await(
          Result.tryPromise({
            try: async () => {
              return await db
                .select()
                .from(gameStateTable)
                .where(eq(gameStateTable.sessionId, sessionId))
                .limit(1);
            },
            catch: (e) => {
              return new DBError({
                operation: "QUERY",
                message: String(e),
              });
            },
          }),
        );

        if (existingState) {
          return Result.ok({
            winnerUserId: existingState.winnerUserId ?? null,
            scores: existingState.scores as ScoreEntry[],
            grid: existingState.grid as Grid,
          });
        }
      }

      const [gridResult, scoresResult, playersDetailsResult] = await Promise.all([
        repo.grid.get(sessionId),
        repo.scores.get(sessionId),
        getSessionPlayersDetails({ db })(sessionId),
      ]);

      if (Result.isError(gridResult)) {
        return yield* gridResult;
      }
      if (Result.isError(scoresResult)) {
        return yield* scoresResult;
      }
      if (Result.isError(playersDetailsResult)) {
        return yield* playersDetailsResult;
      }

      const grid = gridResult.value;
      const rawScores = scoresResult.value;
      const players = playersDetailsResult.value;

      if (!grid) {
        return yield* new GameStateError({
          reason: "SessionNotFound",
          message: "No grid found for session",
        });
      }

      const usernameByUserId = new Map(players.map((p) => [p.userId, p.username]));

      const scores: ScoreEntry[] = rawScores.map((s) => ({
        userId: s.userId,
        username: usernameByUserId.get(s.userId) ?? "Unknown",
        score: s.score,
      }));

      const winnerUserId = scores[0]?.userId ?? null;

      const persistedState = yield* Result.await(
        Result.tryPromise({
          try: async () => {
            return await db.transaction(async (tx) => {
              await tx
                .update(gameSessionTable)
                .set({ isExpired: true, expiredAt: new Date() })
                .where(eq(gameSessionTable.id, sessionId));

              const [stateRow] = await tx
                .insert(gameStateTable)
                .values({
                  sessionId,
                  grid,
                  scores,
                  winnerUserId,
                })
                .returning();

              return stateRow;
            });
          },
          catch: (cause) =>
            new DBError({
              message: String(cause),
              operation: "PERSIST_GAME_OVER",
            }),
        }),
      );

      if (!persistedState) {
        return yield* new GameStateError({
          reason: "SessionNotFound",
          message: "Failed to persist game over state",
        });
      }

      // Best-effort Redis cleanup. Failures here are logged but do not fail the workflow
      // because the DB already represents the authoritative finished state.
      const cleanupResults: Result<unknown, RedisError>[] = await Promise.all([
        repo.grid.delete(sessionId),
        repo.scores.delete(sessionId),
        repo.players.delete(sessionId),
        repo.activePlayer.delete(sessionId),
        repo.sessionMeta.delete(sessionId),
        repo.color.delete(sessionId),
        repo.cell.deleteAllForSession(sessionId),
        repo.cell.deleteFirstTimeFlagsForSession(sessionId),
      ]);

      for (const result of cleanupResults) {
        if (Result.isError(result)) {
          console.error("[gameOverWorkflow] Redis cleanup error:", result.error);
        }
      }

      return Result.ok({
        winnerUserId,
        scores,
        grid,
      });
    });
  };
