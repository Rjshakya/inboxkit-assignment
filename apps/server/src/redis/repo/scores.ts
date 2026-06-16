import { Result } from "better-result";
import type Redis from "ioredis";

import { keys } from "@/redis/keys";
import { RedisError } from "@/services/shared/errors";

export const scoresRepo = ({ redis }: { redis: Redis }) => ({
  get: (sessionId: string) =>
    Result.gen(async function* () {
      const scores = yield* Result.await(
        Result.tryPromise({
          try: () => redis.zrevrange(keys.session.scores(sessionId), 0, -1, "WITHSCORES"),
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "GET_SCORES",
            }),
        }),
      );

      const formattedScores: { userId: string; score: number }[] = [];
      for (let index = 0; index < scores.length; index += 2) {
        const userId = scores[index];
        const score = scores[index + 1];
        if (userId && score) {
          formattedScores.push({
            userId,
            score: Number.parseInt(score, 10),
          });
        }
      }

      return Result.ok(formattedScores);
    }),

  increment: (sessionId: string, userId: string) =>
    Result.tryPromise({
      try: () => redis.zincrby(keys.session.scores(sessionId), 1, userId).then(Number),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "ZINCRBY",
        }),
    }),

  delete: (sessionId: string) =>
    Result.tryPromise({
      try: () => redis.del(keys.session.scores(sessionId)).then(() => true),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "DELETE_SCORES",
        }),
    }),
});
