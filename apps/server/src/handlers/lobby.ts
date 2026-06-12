import { Result } from "better-result";
import type { Message } from "@inboxkit-assignment/game-types";
import { createRegistry } from "./types";
import {
  broadcastToSession,
  sendMessageToUser,
  sendMessage,
} from "../redis/pubsub";
import {
  isPlayerExistInSession,
  sendSessionJoinRequestToAdmin,
  acceptRequestToJoinSession,
  getSessionPlayersDetails,
  removePlayerFromSession,
  RedisSessionPlayersKey,
} from "../game/session";

export const lobbyHandlers = createRegistry({
  get_session_players: async (ctx, payload) => {
    const { sessionId } = payload;

    const result = await getSessionPlayersDetails({ db: ctx.db })(sessionId);
    if (Result.isOk(result)) {
      const players = result.value.map((p) => ({
        userId: p.userId ?? "",
        username: p.username ?? "",
      }));
      sendMessage(ctx.ws)({
        type: "session_players",
        players,
      } as Message);
    }
  },

  check_player_exist_in_session: async (ctx, payload) => {
    const { sessionId } = payload;
    const result = await isPlayerExistInSession({ redis: ctx.redis })({
      userId: ctx.userId,
      sessionId,
    });

    sendMessage(ctx.ws)({
      type: "check_player_exist_in_session_result",
      result: Result.isOk(result) ? result.value : false,
      userId: ctx.userId,
    } as Message);
  },

  request_to_join_session: async (ctx, payload) => {
    const { sessionId } = payload;

    const isInSession = await isPlayerExistInSession({ redis: ctx.redis })({
      userId: ctx.userId,
      sessionId,
    });
    if (Result.isOk(isInSession) && isInSession.value) {
      sendMessage(ctx.ws)({
        type: "error",
        message: "Already in session",
      } as Message);
      return;
    }

    const count = await ctx.redis.llen(RedisSessionPlayersKey(sessionId));
    if (count >= 50) {
      sendMessage(ctx.ws)({
        type: "error",
        message: "Session is full",
      } as Message);
      return;
    }

    const result = await sendSessionJoinRequestToAdmin({ db: ctx.db })({
      sessionId,
      userId: ctx.userId,
      username: ctx.username,
    });

    if (Result.isOk(result)) {
      await sendMessageToUser(result.value.admin, result.value.message);
    }
  },

  accept_request_to_join_session: async (ctx, payload) => {
    const { sessionId, forUser } = payload;
    const result = await acceptRequestToJoinSession({ db: ctx.db, redis: ctx.redis })({
      sessionId,
      forUser,
      byUser: { userId: ctx.userId, username: ctx.username },
    });

    if (Result.isOk(result)) {
      await broadcastToSession(sessionId, result.value.message);
    }
  },

  decline_request_to_join_session: async (_ctx, payload) => {
    const { sessionId, forUser } = payload;
    await sendMessageToUser(forUser.userId, {
      type: "request_declined",
      sessionId,
      message: "Your request to join was declined",
      user: { ...forUser },
    } satisfies Message);
  },

  remove_player_from_session: async (ctx, payload) => {
    const { sessionId, userId } = payload;
    const result = await removePlayerFromSession({ db: ctx.db, redis: ctx.redis })({
      byUserId: ctx.userId,
      userId,
      sessionId,
    });

    if (Result.isError(result)) {
      throw result.error;
    }

    await broadcastToSession(sessionId, {
      type: "player_removed_from_session",
      userId,
    } as Message);
  },
});
