import { Result } from "better-result";
import { and, eq, inArray, type NodePgDatabase } from "@inboxkit-assignment/db";
import { gameSessionTable } from "@inboxkit-assignment/db/schema/game";
import { user } from "@inboxkit-assignment/db/schema/auth";
import type { Message } from "@inboxkit-assignment/game-types";
import type Redis from "ioredis";

import { DBError } from "@/services/shared/errors";
import { addPlayerInSession, getSessionPlayers } from "@/services/session-player/player";

import { SessionError } from "./errors";

export const sendSessionJoinRequestToAdmin =
  (deps: { db: NodePgDatabase<any> }) =>
  (input: { sessionId: string; userId: string; username: string }) => {
    return Result.gen(async function* () {
      const session = yield* Result.await(
        Result.tryPromise({
          try: () =>
            deps.db.select().from(gameSessionTable).where(eq(gameSessionTable.id, input.sessionId)),
          catch: (cause) =>
            new DBError({
              message: String(cause),
              operation: "SELECT",
            }),
        }),
      );

      if (!session[0]?.id) {
        return yield* new SessionError({
          reason: "NotFound",
          message: "No session exist " + input.sessionId,
        });
      }

      const { createdBy } = session[0];

      const message: Message = {
        type: "request_to_join_session_dm",
        toUser: { userId: createdBy },
        fromUser: { userId: input.userId, username: input.username },
      };

      return Result.ok({ admin: createdBy, message });
    });
  };

export const acceptRequestToJoinSession =
  (deps: { db: NodePgDatabase<any>; redis: Redis }) =>
  (input: {
    sessionId: string;
    forUser: { userId: string; username: string };
    byUser: { userId: string; username: string };
  }) => {
    const { sessionId, byUser, forUser } = input;
    return Result.gen(async function* () {
      const session = yield* Result.await(
        Result.tryPromise({
          try: () =>
            deps.db
              .select()
              .from(gameSessionTable)
              .where(
                and(
                  eq(gameSessionTable.id, sessionId),
                  eq(gameSessionTable.createdBy, byUser.userId),
                ),
              ),
          catch: (cause) =>
            new DBError({
              message: String(cause),
              operation: "SELECT",
            }),
        }),
      );

      if (!session[0]?.id) {
        return yield* new SessionError({
          reason: "NotFound",
          message: "No session exist Or your not admin " + input.sessionId,
        });
      }

      yield* Result.await(
        addPlayerInSession({ db: deps.db, redis: deps.redis })({
          sessionId,
          userId: forUser.userId,
        }),
      );

      const playersIds = yield* Result.await(getSessionPlayers(deps.redis)(sessionId));
      const players = yield* Result.await(
        Result.tryPromise({
          try: async () => {
            const res = await deps.db
              .select({ id: user.id, email: user.email })
              .from(user)
              .where(inArray(user.id, playersIds))
              .limit(50);

            return res.map((user) => {
              return { userId: user.id, username: user.email.split(`@`)[0] ?? "" };
            });
          },
          catch(cause) {
            return new DBError({
              message: String(cause),
              operation: "Select user info of session players",
            });
          },
        }),
      );

      const message: Message = {
        type: "session_joined",
        user: forUser,
        players,
        msg: `${forUser.username} has joined the session`,
      };

      return Result.ok({ sessionId, forUser, message });
    });
  };
