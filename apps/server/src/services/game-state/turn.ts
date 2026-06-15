import { Result } from "better-result";
import type { NodePgDatabase } from "@inboxkit-assignment/db";
import type Redis from "ioredis";

import { redisRepo } from "@/redis/repo";
import { SessionError } from "@/services/session/errors";
import { getSessionPlayers } from "@/services/session-player/player";

export const TURN_DURATION_MS = 15 * 1000;

export const getSessionActivePlayer = (redis: Redis) => (sessionId: string) =>
  redisRepo({ redis }).activePlayer.get(sessionId);

export const setSessionActivePlayer =
  (redis: Redis) => (sessionId: string, activePlayer: { userId: string; expiry: number }) =>
    redisRepo({ redis }).activePlayer.set(sessionId, activePlayer);

export const changeActivePlayer = (redis: Redis) => (sessionId: string) => {
  return Result.gen(async function* () {
    const players = yield* Result.await(getSessionPlayers(redis)(sessionId));

    if (!players.length) {
      return yield* new SessionError({
        reason: "NoActivePlayer",
        message: "No players in session",
      });
    }

    const activePlayer = yield* Result.await(getSessionActivePlayer(redis)(sessionId));

    const currentUserId = activePlayer?.userId;
    const currentIndex = players.findIndex((p) => p === currentUserId);
    const nextIndex = (currentIndex + 1) % players.length;
    const nextUserId = players[nextIndex]!;

    const nextActivePlayer = {
      userId: nextUserId,
      expiry: Date.now() + TURN_DURATION_MS,
    };

    yield* Result.await(setSessionActivePlayer(redis)(sessionId, nextActivePlayer));

    return Result.ok(nextActivePlayer);
  });
};

export const getActivePlayer =
  (deps: { db: NodePgDatabase<any>; redis: Redis }) =>
  (input: { sessionId: string; userId: string }) => {
    const { sessionId, userId } = input;

    return Result.gen(async function* () {
      const activePlayer = yield* Result.await(getSessionActivePlayer(deps.redis)(sessionId));

      if (!activePlayer) {
        return yield* new SessionError({
          reason: "NoActivePlayer",
          message: "No active player found",
        });
      }

      const now = Date.now();
      if (now > activePlayer.expiry) {
        const nextActivePlayer = yield* Result.await(changeActivePlayer(deps.redis)(sessionId));
        return Result.ok({
          userId: nextActivePlayer.userId,
          expiry: nextActivePlayer.expiry,
          isMyTurn: nextActivePlayer.userId === userId,
        });
      }

      return Result.ok({
        userId: activePlayer.userId,
        expiry: activePlayer.expiry,
        isMyTurn: activePlayer.userId === userId,
      });
    });
  };

export const handleActivePlayerExpired =
  (deps: { db: NodePgDatabase<any>; redis: Redis }) => (sessionId: string) => {
    return Result.gen(async function* () {
      const repo = redisRepo({ redis: deps.redis });

      const activePlayer = yield* Result.await(repo.activePlayer.get(sessionId));

      if (!activePlayer) {
        return yield* new SessionError({
          reason: "NoActivePlayer",
          message: "No active player found",
        });
      }

      const now = Date.now();
      if (now > activePlayer.expiry) {
        const lockAcquired = yield* Result.await(repo.activePlayer.acquireTurnLock(sessionId));

        if (lockAcquired !== "OK") {
          return yield* new SessionError({
            reason: "NoActivePlayer",
            message: "Failed to change active player",
          });
        }

        const nextActivePlayer = yield* Result.await(changeActivePlayer(deps.redis)(sessionId));
        yield* Result.await(repo.activePlayer.releaseTurnLock(sessionId));
        return Result.ok({ activePlayer: nextActivePlayer, changed: true });
      }

      return Result.ok({ activePlayer, changed: false });
    });
  };
