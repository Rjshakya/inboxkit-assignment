import { Result } from "better-result";
import type Redis from "ioredis";

import { keys } from "@/redis/keys";
import { RedisError } from "@/services/shared/errors";

export const colorRepo = ({ redis }: { redis: Redis }) => ({
  getNextToken: (sessionId: string) =>
    Result.tryPromise({
      try: () => redis.incr(keys.colorToken(sessionId)),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "INCR_COLOR_TOKEN",
        }),
    }),

  delete: (sessionId: string) =>
    Result.tryPromise({
      try: () => redis.del(keys.colorToken(sessionId)).then(() => true),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "DELETE_COLOR_TOKEN",
        }),
    }),
});
