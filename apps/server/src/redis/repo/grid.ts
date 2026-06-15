import { Result } from "better-result";
import type Redis from "ioredis";
import type { Grid } from "@inboxkit-assignment/game-types";

import { keys } from "@/redis/keys";
import { RedisError } from "@/services/shared/errors";

export const gridRepo = ({ redis }: { redis: Redis }) => ({
  get: (sessionId: string) =>
    Result.gen(async function* () {
      const gridData = yield* Result.await(
        Result.tryPromise({
          try: () => redis.get(keys.session.grid(sessionId)),
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "GET_GRID",
            }),
        }),
      );

      if (!gridData) {
        return Result.ok(null);
      }

      return Result.ok(JSON.parse(gridData) as Grid);
    }),

  set: (sessionId: string, grid: Grid) =>
    Result.tryPromise({
      try: () =>
        redis.set(keys.session.grid(sessionId), JSON.stringify(grid)).then(() => true),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "SET_GRID",
        }),
    }),

  delete: (sessionId: string) =>
    Result.tryPromise({
      try: () => redis.del(keys.session.grid(sessionId)).then(() => true),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "DELETE_GRID",
        }),
    }),
});
