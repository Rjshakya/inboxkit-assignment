import { Result } from "better-result";
import type Redis from "ioredis";

import { keys } from "@/redis/keys";
import { RedisError } from "@/services/shared/errors";

export const cellRepo = ({ redis }: { redis: Redis }) => ({
  set: (input: {
    sessionId: string;
    row: number;
    col: number;
    userId: string;
    userColor: string;
  }) =>
    Result.tryPromise({
      try: () =>
        redis.set(
          keys.cell(input.sessionId, input.row, input.col),
          JSON.stringify({ userId: input.userId, userColor: input.userColor }),
          "NX",
        ),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "SET_CELL",
        }),
    }),

  hasClaimedFirstCell: (sessionId: string, userId: string) =>
    Result.tryPromise({
      try: () => redis.get(keys.firstTimeClaiming(sessionId, userId)),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "GET_FIRST_TIME_CLAIMING",
        }),
    }),

  markFirstCellClaimed: (sessionId: string, userId: string) =>
    Result.tryPromise({
      try: () => redis.setnx(keys.firstTimeClaiming(sessionId, userId), "1"),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "SET_FIRST_TIME_CLAIMING",
        }),
    }),
});
