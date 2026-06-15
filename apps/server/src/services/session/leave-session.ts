import { Result } from "better-result";
import type Redis from "ioredis";

import { redisRepo } from "@/redis/repo";
import { changeActivePlayer } from "@/services/game-state/turn";
import { SessionError } from "@/services/session/errors";

export const leaveSession = (redis: Redis) => (input: { sessionId: string; userId: string }) => {
  const { sessionId, userId } = input;

  return Result.gen(async function* () {
    const repo = redisRepo({ redis });

    const activePlayer = yield* Result.await(repo.activePlayer.get(sessionId));

    const removedCount = yield* Result.await(repo.players.remove(sessionId, userId));

    if (!removedCount) {
      return yield* new SessionError({
        reason: "PlayerNotInSession",
        message: "Player not found in session",
      });
    }

    if (activePlayer?.userId === userId) {
      const nextActivePlayer = yield* Result.await(changeActivePlayer(redis)(sessionId));
      return Result.ok(nextActivePlayer);
    }

    return Result.ok(activePlayer);
  });
};
