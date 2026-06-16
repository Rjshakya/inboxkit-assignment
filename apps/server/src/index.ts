import { serve, upgradeWebSocket } from "@hono/node-server";
import { auth } from "@inboxkit-assignment/auth";
import { env } from "@inboxkit-assignment/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Context } from "hono";
import { WebSocketServer } from "ws";
import { db } from "@inboxkit-assignment/db";

import { settings } from "./routes/settings";
import { gameSession } from "./routes/game/session";
import type { AppVariables } from "./types";
import { authMiddleware } from "./middlewares/auth";
import { createRedisClient } from "./redis/client";
import { getColor } from "./services/colors";
import { addConnectedUser, removeConnectedUser } from "./lib/ws";
import {
  BroadcastChannelId,
  DMChannelId,
  subscribeToPubSub,
  unsubscribeToPubSub,
} from "./redis/pubsub";
import { DBError, RedisError, UnauthorizedError } from "./services/shared";
import { SessionError, RemovePlayerFromSessionErrors } from "./services/session";
import { CellClaimingWorkflowError } from "./services/game-state";
import type { Message } from "@inboxkit-assignment/game-types";
import { getHandler } from "./handlers";

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
    upgradeWebSocket(async (c: Context) => {
      const user = c.get("user");
      const sessionId = c.req.query("sessionId");
      if (!user || !sessionId) {
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
      const userColor = await getColor(redis)(sessionId);

      return {
        onOpen: async (_event, ws) => {
          addConnectedUser({
            userId,
            username,
            color: userColor,
            sessionId,
            ws,
          });

          await subscribeToPubSub(DMChannelId(userId));
          await subscribeToPubSub(BroadcastChannelId(sessionId));
        },

        onMessage: async (event, ws) => {
          try {
            const payload = JSON.parse(event.data) as Message;
            if (!payload || !payload.type) return;

            console.log("<----");
            console.log(payload);
            console.log("<----");
            const handler = getHandler(payload.type);
            if (!handler) return;

            await handler({ userId, username, userColor, ws, redis, db }, payload);
          } catch (e) {
            console.error("WS error:", e);
          }
        },

        onClose: async () => {
          removeConnectedUser(userId);
          await unsubscribeToPubSub(DMChannelId(userId));
          await unsubscribeToPubSub(BroadcastChannelId(sessionId));
        },

        onError: async (e) => {
          console.error("web-socker:error:", e);
          removeConnectedUser(userId);
          await unsubscribeToPubSub(DMChannelId(userId));
          await unsubscribeToPubSub(BroadcastChannelId(sessionId));
        },
      };
    }),
  )
  .onError((err, c) => {
    console.error(err);

    if (err instanceof DBError || err instanceof RedisError) {
      return c.json({ error: "Internal server error", message: "Internal server error" }, 500);
    }

    if (err instanceof UnauthorizedError) {
      return c.json({ error: "Unauthorized", message: err.message }, 401);
    }

    if (err instanceof SessionError) {
      return c.json({ error: "SESSION_ERROR", message: err.message, reason: err.reason }, 400);
    }

    if (err instanceof CellClaimingWorkflowError) {
      return c.json({ error: "GAME_ERROR", message: err.message, reason: err.reason }, 400);
    }

    if (err instanceof RemovePlayerFromSessionErrors) {
      return c.json(
        { error: "REMOVE_PLAYER_ERROR", message: err.message, reason: err.reason },
        400,
      );
    }

    return c.json({ error: "Internal server error", message: "Internal server error" }, 500);
  });

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
