import { serve, upgradeWebSocket } from "@hono/node-server";
import { auth } from "@inboxkit-assignment/auth";
import { env } from "@inboxkit-assignment/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Context } from "hono";
import { WebSocketServer } from "ws";
import { Result } from "better-result";
import { db } from "@inboxkit-assignment/db";

import { settings } from "./routes/settings";
import { gameSession } from "./routes/game/session";
import type { AppVariables } from "./types";
import { authMiddleware } from "./middlewares/auth";
import { createRedisClient } from "./redis/client";
import { hashToColor } from "./game/colors";
import {
  addConnectedUser,
  removeConnectedUser,
  addSessionIdToConnectedUser,
} from "./lib/ws";
import {
  broadcastToSession,
  sendMessageToUser,
  BroadcastChannelId,
  subscribeToPubSub,
  unsubscribeToPubSub,
} from "./redis/pubsub";
import {
  isPlayerExistInSession,
  sendSessionJoinRequestToAdmin,
  acceptRequestToJoinSession,
  leaveSession,
  getSessionPlayersDetails,
  RedisSessionPlayersKey,
} from "./game/session";
import type { Message } from "@inboxkit-assignment/game-types";

const redis = createRedisClient();

const app = new Hono<{
  Variables: AppVariables;
}>()
  .use(logger())
  .use(
    "/api/*",
    cors({
      origin: env.CORS_ORIGIN,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  )
  .on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .get("/", (c) => {
    return c.text("OK");
  })
  .use("*", authMiddleware())
  .route("/api/user/settings", settings)
  .route("/api/game/session", gameSession)
  .get(
    "/ws",
    upgradeWebSocket((c: Context) => {
      const user = c.get("user");
      if (!user) {
        return {
          onOpen: (_event: unknown, ws: any) => {
            ws.close(1008, "Unauthorized");
          },
          onMessage: () => {},
          onClose: () => {},
        };
      }

      const userId = user.id;
      const username = user.email.split("@")[0];
      const userColor = c.get("user_settings")?.color ?? hashToColor(user.id);

      return {
        onOpen: (_event, ws) => {
          addConnectedUser({
            userId,
            username,
            color: userColor,
            sessionId: null,
            ws,
          });
        },

        onMessage: async (event, ws) => {
          try {
            const payload = JSON.parse(String(event.data)) as Message;
            if (!payload || !payload.type) return;

            switch (payload.type) {
              case "get_session_players": {
                const { sessionId } = payload;
                addSessionIdToConnectedUser(userId, sessionId);
                subscribeToPubSub(BroadcastChannelId(sessionId));

                const result = await getSessionPlayersDetails({ db })(sessionId);
                if (Result.isOk(result)) {
                  const players = result.value.map((p) => ({
                    userId: p.userId ?? "",
                    username: p.username ?? "",
                  }));
                  ws.send(
                    JSON.stringify({
                      type: "session_players",
                      players,
                    } as Message),
                  );
                }
                break;
              }

              case "check_player_exist_in_session": {
                const { sessionId } = payload;
                const result = await isPlayerExistInSession({ redis })({
                  userId,
                  sessionId,
                });
                ws.send(
                  JSON.stringify({
                    type: "check_player_exist_in_session_result",
                    result: Result.isOk(result) ? result.value : false,
                    userId,
                  } as Message),
                );
                break;
              }

              case "request_to_join_session": {
                const { sessionId } = payload;

                const isInSession = await isPlayerExistInSession({ redis })({
                  userId,
                  sessionId,
                });
                if (Result.isOk(isInSession) && isInSession.value) {
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message: "Already in session",
                    } as Message),
                  );
                  break;
                }

                const count = await redis.llen(RedisSessionPlayersKey(sessionId));
                if (count >= 50) {
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message: "Session is full",
                    } as Message),
                  );
                  break;
                }

                const result = await sendSessionJoinRequestToAdmin({ db })({
                  sessionId,
                  userId,
                  username,
                });

                if (Result.isOk(result)) {
                  await sendMessageToUser(result.value.admin, result.value.message);
                }
                break;
              }

              case "accept_request_to_join_session": {
                const { sessionId, forUser } = payload;
                const result = await acceptRequestToJoinSession({ db, redis })({
                  sessionId,
                  forUser,
                  byUser: { userId, username },
                });

                if (Result.isOk(result)) {
                  await broadcastToSession(sessionId, result.value.message);
                }
                break;
              }

              case "decline_request_to_join_session": {
                const { sessionId, forUser } = payload;
                await sendMessageToUser(forUser.userId, {
                  type: "request_declined",
                  sessionId,
                  message: "Your request to join was declined",
                } as Message);
                break;
              }

              default: {
                break;
              }
            }
          } catch (e) {
            console.error("WS error:", e);
          }
        },

        onClose: () => {
          const { user } = removeConnectedUser(userId);
          if (user?.sessionId) {
            leaveSession(redis)({ sessionId: user.sessionId, userId });
            broadcastToSession(user.sessionId, {
              type: "player_left",
              userId,
            } as Message);
            unsubscribeToPubSub(BroadcastChannelId(user.sessionId));
          }
        },

        onError: () => {},
      };
    }),
  );

const wss = new WebSocketServer({ noServer: true });

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
    websocket: { server: wss },
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);

export type AppType = typeof app;
