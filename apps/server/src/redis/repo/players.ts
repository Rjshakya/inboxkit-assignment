import { Result } from "better-result";
import type Redis from "ioredis";

import { keys } from "@/redis/keys";
import { RedisError } from "@/services/shared/errors";

export const playersRepo = ({ redis }: { redis: Redis }) => ({
  get: (sessionId: string) =>
    Result.tryPromise({
      try: () => redis.lrange(keys.session.players(sessionId), 0, -1),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "LRANGE",
        }),
    }),

  add: (sessionId: string, userId: string) =>
    Result.tryPromise({
      try: () =>
        redis.rpush(keys.session.players(sessionId), userId).then(() => true),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "RPUSH",
        }),
    }),

  remove: (sessionId: string, userId: string) =>
    Result.tryPromise({
      try: () =>
        redis.lrem(keys.session.players(sessionId), 0, userId).then(() => true),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "LREM",
        }),
    }),

  count: (sessionId: string) =>
    Result.tryPromise({
      try: () => redis.llen(keys.session.players(sessionId)),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "LLEN",
        }),
    }),

  exists: (input: { sessionId: string; userId: string }) =>
    Result.gen(async function* () {
      const { sessionId, userId } = input;
      const isExist = yield* Result.await(
        Result.tryPromise({
          try: () => redis.lpos(keys.session.players(sessionId), userId),
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "LPOS",
            }),
        }),
      );

      return Result.ok(isExist === null ? false : true);
    }),
});
