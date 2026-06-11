/*
 *
 * session - room  (game room)
 *
 *  - user - click on start session -
 *  - create a session in db,  return session id
 *  - other user joins the session , (creator can accept and reject the request)
 *  - after accepting , user joints  the session ,
 *  - we will store the session's players in db , (when admin accept the req)
 *  - now the admin start the game ,
 *  - when it is started , we will give the admin first turn  ,  we will set the redis key , for session with auto expiry of 15 seconds ,
 *
 *  or
 *
 *  - when a person joins or create a  session we will store it in a set in redis , (unique user's id)
 *  - when admin clicks on start game ,
 *   - if we run the timer of 15 seccond in client side ,
 *   - before run send start turn ; it will set the current turn of session to id ,
 *   - after complete of 15 seconds ; we will send change the turn , it will change to next player .
 *
 *
 *   cell claim
 *    - we claiming the cell ,
 *    - check if user's turn ,
 *    - if yes , then claim the cell , return grid ,
 *
 *    grid's state lives in server side ,
 *     - on start of game , server will return empty grid ,
 *     - but main problem with this is customization and responive ,
 *     - on client side , grid can be responsive ,
 *
 *    best solution is fixed grid size (cells) .
 */

import { Result, TaggedError } from "better-result";
import { eq, NodePgDatabase, and, asc, inArray } from "@inboxkit-assignment/db";
import { user } from "@inboxkit-assignment/db/schema/auth";
import {
  gameSessionPlayersTable,
  gameSessionTable,
  type gameSessionInsert,
  type gameSessionPlayersInsert,
} from "@inboxkit-assignment/db/schema/game";
import type { Message } from "@inboxkit-assignment/game-types";
import type Redis from "ioredis";

export class RedisError extends TaggedError("RedisError")<{
  message: string;
  operation: string;
}>() {}

export class SessionError extends TaggedError("SessionError")<{
  reason:
    | "NotFound"
    | "AdminRequired"
    | "NotEnoughPlayers"
    | "AlreadyStarted"
    | "AlreadyStartedByOther"
    | "NoActivePlayer"
    | "PlayerNotInSession"
    | "SessionFull";
  message: string;
}>() {}

export class DBError extends TaggedError("DBError")<{
  message: string;
  operation: string;
}>() {}

export type CreateSessionWorkflowDeps = {
  db: NodePgDatabase<any>;
  redis: Redis;
};

export type CreateSessionWorkflowInput = {
  userId: string;
  //username: string;
  //user_color: string;
  //isAdmin: boolean;
  //joinedAt: Date;
};

export const addPlayerInSession =
  (deps: { db: NodePgDatabase<any>; redis: Redis }) => (values: gameSessionPlayersInsert) => {
    return Result.gen(async function* () {
      const count = yield* Result.await(
        Result.tryPromise({
          try: () => deps.redis.llen(RedisSessionPlayersKey(values.sessionId)),
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "LLEN",
            }),
        }),
      );

      if (count >= 50) {
        return yield* new SessionError({
          reason: "SessionFull",
          message: "Session is full (max 50 players)",
        });
      }

      yield* Result.await(
        Result.tryPromise({
          try: async () => {
            await deps.redis
              .multi()
              .rpush(RedisSessionPlayersKey(values.sessionId), values.userId)
              .ltrim(RedisSessionPlayersKey(values.sessionId), -50, -1)
              .exec();
          },
          catch: (cause) =>
            new RedisError({
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

      return Result.ok(result);
    });
  };

export const createSessionWorkflow =
  (deps: CreateSessionWorkflowDeps) => (input: CreateSessionWorkflowInput) => {
    const payload: gameSessionInsert = { createdBy: input.userId };
    return Result.gen(async function* () {
      const session = yield* Result.await(
        Result.tryPromise({
          try: () => deps.db.insert(gameSessionTable).values(payload).returning(),
          catch: (cause) =>
            new DBError({
              message: String(cause),
              operation: "INSERT",
            }),
        }),
      );

      if (!session[0]?.id) {
        return yield* new SessionError({
          reason: "NotFound",
          message: "Failed to create session",
        });
      }

      const data = yield* Result.await(
        addPlayerInSession({ db: deps.db, redis: deps.redis })({
          sessionId: session[0].id,
          userId: input.userId,
        }),
      );

      return Result.ok({
        sessionId: data[0]?.id as string,
        userId: input.userId,
      });
    });
  };

export type sendSessionJoinRequestToAdminDeps = { db: NodePgDatabase<any> };
export type sendSessionJoinRequestToAdminInput = {
  sessionId: string;
  userId: string;
  username: string;
};

export const sendSessionJoinRequestToAdmin =
  (deps: sendSessionJoinRequestToAdminDeps) => (input: sendSessionJoinRequestToAdminInput) => {
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

export type acceptRequestToJoinSessionDeps = {
  db: NodePgDatabase<any>;
  redis: Redis;
};
export type acceptRequestToJoinSessionInput = {
  sessionId: string;
  forUser: { userId: string; username: string };
  byUser: { userId: string; username: string };
};

export const acceptRequestToJoinSession =
  (deps: acceptRequestToJoinSessionDeps) => (input: acceptRequestToJoinSessionInput) => {
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

      const sessionPlayers = yield* Result.await(
        addPlayerInSession({ db: deps.db, redis: deps.redis })({
          sessionId,
          userId: forUser.userId,
        }),
      );

      if (!sessionPlayers[0]?.id) {
        return yield* new SessionError({
          reason: "NotFound",
          message: "Failed to accept request to join session " + input.sessionId,
        });
      }

      const players = yield* Result.await(
        Result.tryPromise({
          try: async () => {
            const playersId = sessionPlayers.map((sp) => sp.id);
            const res = await deps.db
              .select({ id: user.id, email: user.email })
              .from(user)
              .where(inArray(user.id, playersId))
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

export type getSessionDeps = {
  db: NodePgDatabase<any>;
};

export const getSessionPlayers = (redis: Redis) => (sessionId: string) => {
  return Result.tryPromise({
    try: () => redis.lrange(RedisSessionPlayersKey(sessionId), 0, -1),
    catch: (cause) =>
      new RedisError({
        message: String(cause),
        operation: "LRANGE",
      }),
  });
};

export const getSessionPlayersDetails = (deps: getSessionDeps) => (sessionId: string) => {
  return Result.tryPromise({
    try: () =>
      deps.db
        .select({ user: { id: user.id, email: user.email } })
        .from(gameSessionPlayersTable)
        .leftJoin(user, eq(gameSessionPlayersTable.userId, user.id))
        .where(eq(gameSessionPlayersTable.sessionId, sessionId))
        .orderBy(asc(gameSessionPlayersTable.joinedAt))
        .then((players) => {
          return players.map((p) => {
            return {
              userId: p.user?.id,
              username: p.user?.email?.split(`@`)[0],
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
  (deps: { redis: Redis }) => (input: { userId: string; sessionId: string }) => {
    const { userId, sessionId } = input;
    return Result.gen(async function* () {
      const players = yield* Result.await(
        Result.tryPromise({
          try: () => {
            return deps.redis.lrange(RedisSessionPlayersKey(sessionId), 0, -1);
          },
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "LRANGE",
            }),
        }),
      );

      return Result.ok(players.includes(userId));
    });
  };

export const RedisSessionStartedAtKey = (sessionId: string) => `session:startedAt:${sessionId}`;
export const RedisSessionStartedByKey = (sessionId: string) => `session:startedBy:${sessionId}`;
export const RedisSessionActivePlayerKey = (sessionId: string) =>
  `session:active_player:${sessionId}`;
export const RedisSessionPlayersKey = (sessionId: string) => `session:${sessionId}:players`;

export type SessionActivePlayer = {
  userId: string;
  expiry: number;
};

export const startSessionWorkflow =
  (deps: { db: NodePgDatabase<any>; redis: Redis }) =>
  (input: { sessionId: string; startedBy: string }) => {
    const { db, redis } = deps;
    const { sessionId, startedBy } = input;

    return Result.gen(async function* () {
      const sessionCreator = yield* Result.await(
        Result.tryPromise({
          try: () => {
            return db
              .select()
              .from(gameSessionTable)
              .where(
                and(eq(gameSessionTable.id, sessionId), eq(gameSessionTable.createdBy, startedBy)),
              )
              .limit(1);
          },
          catch: (e) => {
            return new DBError({
              message: String(e),
              operation: "Get session by sessionId and createdBy",
            });
          },
        }),
      );

      if (!sessionCreator || !sessionCreator.length) {
        return yield* new SessionError({
          reason: "AdminRequired",
          message: "Only Admin can start session",
        });
      }

      const players = yield* Result.await(getSessionPlayersDetails({ db })(sessionId));

      if (!players.length || players.length < 2) {
        return yield* new SessionError({
          reason: "NotEnoughPlayers",
          message: "Not enough players in session",
        });
      }

      const startedAt = yield* Result.await(
        Result.tryPromise({
          try: () => redis.set(RedisSessionStartedAtKey(sessionId), Date.now(), "NX"),
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "SET_STARTED_AT",
            }),
        }),
      );

      if (!startedAt) {
        return yield* new SessionError({
          reason: "AlreadyStarted",
          message: "Session is already started",
        });
      }

      const startedByResult = yield* Result.await(
        Result.tryPromise({
          try: () => redis.set(RedisSessionStartedByKey(sessionId), startedBy, "NX"),
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "SET_STARTED_BY",
            }),
        }),
      );

      if (!startedByResult) {
        return yield* new SessionError({
          reason: "AlreadyStartedByOther",
          message: "Session is already started by someone",
        });
      }

      const activePlayer: SessionActivePlayer = {
        userId: startedBy,
        expiry: Date.now() + 16 * 1000,
      };

      yield* Result.await(
        Result.tryPromise({
          try: () =>
            redis.set(RedisSessionActivePlayerKey(sessionId), JSON.stringify(activePlayer)),
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "SET_ACTIVE_PLAYER",
            }),
        }),
      );

      return Result.ok({
        activePlayer,
        players,
      });
    });
  };

export const getSessionActivePlayer = (redis: Redis) => (sessionId: string) => {
  return Result.tryPromise({
    try: () =>
      redis.get(RedisSessionActivePlayerKey(sessionId)).then((data) => {
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
  });
};

export const changeActivePlayer = (redis: Redis) => (sessionId: string) => {
  return Result.gen(async function* () {
    const players = yield* Result.await(getSessionPlayers(redis)(sessionId));

    if (!players.length) {
      return yield* new SessionError({
        reason: "NoActivePlayer",
        message: "No players in session",
      });
    }

    const activePlayer = yield* Result.await(getSessionActivePlayer(redis)(sessionId));

    const currentUserId = activePlayer?.userId;
    const currentIndex = players.findIndex((p) => p === currentUserId);
    const nextIndex = (currentIndex + 1) % players.length;
    const nextUserId = players[nextIndex]!;

    const nextActivePlayer: SessionActivePlayer = {
      userId: nextUserId,
      expiry: Date.now() + 16 * 1000,
    };

    yield* Result.await(
      Result.tryPromise({
        try: () =>
          redis.set(RedisSessionActivePlayerKey(sessionId), JSON.stringify(nextActivePlayer)),
        catch: (cause) =>
          new RedisError({
            message: String(cause),
            operation: "SET_ACTIVE_PLAYER",
          }),
      }),
    );

    return Result.ok(nextActivePlayer);
  });
};

export const getActivePlayer =
  (deps: { db: NodePgDatabase<any>; redis: Redis }) =>
  (input: { sessionId: string; userId: string }) => {
    const { sessionId, userId } = input;

    return Result.gen(async function* () {
      const activePlayer = yield* Result.await(getSessionActivePlayer(deps.redis)(sessionId));

      if (!activePlayer) {
        return yield* new SessionError({
          reason: "NoActivePlayer",
          message: "No active player found",
        });
      }

      const now = Date.now();
      if (now > activePlayer.expiry) {
        const nextActivePlayer = yield* Result.await(changeActivePlayer(deps.redis)(sessionId));
        return Result.ok({
          userId: nextActivePlayer.userId,
          expiry: nextActivePlayer.expiry,
          isMyTurn: nextActivePlayer.userId === userId,
        });
      }

      return Result.ok({
        userId: activePlayer.userId,
        expiry: activePlayer.expiry,
        isMyTurn: activePlayer.userId === userId,
      });
    });
  };

export const handleActivePlayerExpired =
  (deps: { db: NodePgDatabase<any>; redis: Redis }) => (sessionId: string) => {
    return Result.gen(async function* () {
      const activePlayer = yield* Result.await(getSessionActivePlayer(deps.redis)(sessionId));

      if (!activePlayer) {
        return yield* new SessionError({
          reason: "NoActivePlayer",
          message: "No active player found",
        });
      }

      const now = Date.now();
      if (now > activePlayer.expiry) {
        const nextActivePlayer = yield* Result.await(changeActivePlayer(deps.redis)(sessionId));
        return Result.ok(nextActivePlayer);
      }

      return Result.ok(activePlayer);
    });
  };

export const leaveSession = (redis: Redis) => (input: { sessionId: string; userId: string }) => {
  const { sessionId, userId } = input;

  return Result.gen(async function* () {
    const activePlayer = yield* Result.await(getSessionActivePlayer(redis)(sessionId));

    const removedCount = yield* Result.await(
      Result.tryPromise({
        try: () => redis.lrem(RedisSessionPlayersKey(sessionId), 0, userId),
        catch: (cause) =>
          new RedisError({
            message: String(cause),
            operation: "LREM",
          }),
      }),
    );

    if (!removedCount) {
      return yield* new SessionError({
        reason: "PlayerNotInSession",
        message: "Player not found in session",
      });
    }

    if (activePlayer?.userId === userId) {
      const nextActivePlayer = yield* Result.await(changeActivePlayer(redis)(sessionId));
      return Result.ok(nextActivePlayer);
    }

    return Result.ok(activePlayer);
  });
};
