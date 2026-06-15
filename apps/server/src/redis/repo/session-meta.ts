import { Result } from "better-result";
import type Redis from "ioredis";

import { keys } from "@/redis/keys";
import { RedisError } from "@/services/shared/errors";

export const sessionMetaRepo = ({ redis }: { redis: Redis }) => ({
  setStartedAt: (sessionId: string, timestamp: number) =>
    Result.tryPromise({
      try: () =>
        redis.set(keys.session.startedAt(sessionId), timestamp, "NX").then((res) => res === "OK"),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "SET_STARTED_AT",
        }),
    }),

  setStartedBy: (sessionId: string, startedBy: string) =>
    Result.tryPromise({
      try: () =>
        redis.set(keys.session.startedBy(sessionId), startedBy, "NX").then((res) => res === "OK"),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "SET_STARTED_BY",
        }),
    }),

  getStartedAt: (sessionId: string) =>
    Result.tryPromise({
      try: () => redis.get(keys.session.startedAt(sessionId)),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "GET_STARTED_AT",
        }),
    }),
});
