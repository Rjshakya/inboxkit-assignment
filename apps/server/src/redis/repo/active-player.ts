import { Result } from "better-result";
import type Redis from "ioredis";

import { keys } from "@/redis/keys";
import { RedisError } from "@/services/shared/errors";

export type SessionActivePlayer = {
  userId: string;
  expiry: number;
};

export const activePlayerRepo = ({ redis }: { redis: Redis }) => ({
  get: (sessionId: string) =>
    Result.tryPromise({
      try: () =>
        redis.get(keys.session.activePlayer(sessionId)).then((data) => {
          if (!data) {
            return null;
          }
          return JSON.parse(data) as SessionActivePlayer;
        }),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "GET_ACTIVE_PLAYER",
        }),
    }),

  set: (sessionId: string, activePlayer: SessionActivePlayer) =>
    Result.tryPromise({
      try: () =>
        redis
          .set(keys.session.activePlayer(sessionId), JSON.stringify(activePlayer))
          .then(() => true),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "SET_ACTIVE_PLAYER",
        }),
    }),

  acquireTurnLock: (sessionId: string) =>
    Result.tryPromise({
      try: () =>
        redis.set(keys.session.turnLock(sessionId), "1", "PX", 2000, "NX"),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "SET_TURN_LOCK",
        }),
    }),

  releaseTurnLock: (sessionId: string) =>
    Result.tryPromise({
      try: () =>
        redis.del(keys.session.turnLock(sessionId)).then(() => true),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "DEL_TURN_LOCK",
        }),
    }),

  delete: (sessionId: string) =>
    Result.tryPromise({
      try: () =>
        redis
          .del(keys.session.activePlayer(sessionId), keys.session.turnLock(sessionId))
          .then(() => true),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "DELETE_ACTIVE_PLAYER",
        }),
    }),
});
