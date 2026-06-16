import { Result } from "better-result";
import type Redis from "ioredis";

import { RedisError } from "@/services/shared/errors";

export const scanDelete = (redis: Redis, pattern: string) =>
  Result.tryPromise({
    try: async () => {
      let cursor = "0";
      let deleted = 0;

      do {
        const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
        cursor = nextCursor;

        if (keys.length > 0) {
          await redis.unlink(...keys);
          deleted += keys.length;
        }
      } while (cursor !== "0");

      return deleted;
    },
    catch: (cause) =>
      new RedisError({
        message: String(cause),
        operation: "SCAN_DELETE",
      }),
  });
