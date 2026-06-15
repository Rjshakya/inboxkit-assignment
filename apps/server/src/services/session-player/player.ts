import { Result } from "better-result";
import { and, asc, eq, type NodePgDatabase } from "@inboxkit-assignment/db";
import { gameSessionPlayersTable, gameSessionTable } from "@inboxkit-assignment/db/schema/game";
import { user } from "@inboxkit-assignment/db/schema/auth";
import type Redis from "ioredis";

import { keys } from "@/redis/keys";
import { redisRepo } from "@/redis/repo";
import { DBError } from "@/services/shared/errors";
import { RemovePlayerFromSessionErrors, SessionError } from "@/services/session/errors";

export type SessionPlayerDeps = {
  db: NodePgDatabase<any>;
  redis: Redis;
};

export const addPlayerInSession =
  (deps: SessionPlayerDeps) =>
  (values: { sessionId: string; userId: string; username?: string }) => {
    return Result.gen(async function* () {
      const repo = redisRepo({ redis: deps.redis });

      const count = yield* Result.await(repo.players.count(values.sessionId));
      if (count >= 50) {
        return yield* new SessionError({
          reason: "SessionFull",
          message: "Session is full (max 50 players)",
        });
      }

      const isExist = yield* Result.await(
        repo.players.exists({
          userId: values.userId,
          sessionId: values.sessionId,
        }),
      );

      if (isExist) {
        console.log("player already exist");
        return Result.ok(true);
      }

      const playersKey = keys.session.players(values.sessionId);

      yield* Result.await(
        Result.tryPromise({
          try: async () => {
            console.log("Inserting player in redis list");
            return await deps.redis
              .multi()
              .rpush(playersKey, values.userId)
              .ltrim(playersKey, -50, -1)
              .exec();
          },
          catch: (cause) =>
            new DBError({
              message: String(cause),
              operation: "RPUSH",
            }),
        }),
      );

      const result = yield* Result.await(
        Result.tryPromise({
          try: () => deps.db.insert(gameSessionPlayersTable).values(values).returning(),
          catch: (cause) =>
            new DBError({
              message: String(cause),
              operation: "INSERT",
            }),
        }),
      );

      return Result.ok(result[0]?.userId === values.userId);
    });
  };

export const getSessionPlayers = (redis: Redis) => (sessionId: string) =>
  redisRepo({ redis }).players.get(sessionId);

export const getSessionPlayersDetails =
  (deps: { db: NodePgDatabase<any> }) => (sessionId: string) => {
    return Result.tryPromise({
      try: () =>
        deps.db
          .select({ user: { id: user.id, email: user.email } })
          .from(gameSessionPlayersTable)
          .leftJoin(user, eq(gameSessionPlayersTable.userId, user.id))
          .where(eq(gameSessionPlayersTable.sessionId, sessionId))
          .orderBy(asc(gameSessionPlayersTable.joinedAt))
          .limit(50)
          .then((players) => {
            return players.map((p) => {
              return {
                userId: p.user?.id as string,
                username: p.user?.email?.split(`@`)[0] as string,
              };
            });
          }),
      catch: (cause) =>
        new DBError({
          message: String(cause),
          operation: "SELECT",
        }),
    });
  };

export const isPlayerExistInSession =
  (deps: { redis: Redis }) => (input: { userId: string; sessionId: string }) =>
    redisRepo({ redis: deps.redis }).players.exists(input);

export const removePlayerFromSession =
  (deps: SessionPlayerDeps) => (input: { byUserId: string; userId: string; sessionId: string }) => {
    const { db, redis } = deps;
    const { byUserId, userId, sessionId } = input;

    return Result.gen(async function* () {
      const isAdmin = yield* Result.await(
        Result.tryPromise({
          try: async () => {
            const result = await db
              .select({ id: gameSessionTable.id })
              .from(gameSessionTable)
              .where(
                and(eq(gameSessionTable.createdBy, byUserId), eq(gameSessionTable.id, sessionId)),
              )
              .limit(1);

            return !!result[0]?.id;
          },
          catch(cause) {
            return new DBError({
              message: String(cause),
              operation: "Select game session table",
            });
          },
        }),
      );

      if (!isAdmin) {
        return yield* new RemovePlayerFromSessionErrors({
          message: "Only admin can remove players",
          reason: "ONLY ADMIN CAN REMOVE",
        });
      }

      const isPlayerInSession = yield* Result.await(
        isPlayerExistInSession({ redis })({ userId, sessionId }),
      );

      if (!isPlayerInSession) {
        return Result.ok(true);
      }

      yield* Result.await(
        Result.tryPromise({
          try: () => {
            return db.transaction(async (tx) => {
              await tx
                .delete(gameSessionPlayersTable)
                .where(
                  and(
                    eq(gameSessionPlayersTable.sessionId, sessionId),
                    eq(gameSessionPlayersTable.userId, userId),
                  ),
                );

              await redis.lrem(keys.session.players(sessionId), 1, userId);
            });
          },
          catch(cause) {
            return new DBError({
              operation: "TRANSACTION",
              message: String(cause),
            });
          },
        }),
      );

      return Result.ok(true);
    });
  };
