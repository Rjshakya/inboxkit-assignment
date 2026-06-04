import { serve, upgradeWebSocket } from "@hono/node-server";
import { auth } from "@inboxkit-assignment/auth";
import { db, eq } from "@inboxkit-assignment/db";
import { userSettingsTable } from "@inboxkit-assignment/db/schema/settings";
import { env } from "@inboxkit-assignment/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Context } from "hono";
import { WebSocketServer } from "ws";

import { hashToColor } from "./game/colors";
import { cellClaimingWorkflow } from "./game/workflow";
import { sessionStartWorkflow } from "./game/workflow";
import {
  addConnectedUser,
  connectedUsers,
  removeConnectedUser,
  buildScoresWithUsernames,
} from "./lib/ws";
import {
  getGrid,
  getScores as getSessionScores,
  getTurn,
  incrementScore,
  joinSession,
  setGrid,
  redis,
} from "./lib/session";
import { broadcastToSession, maybeUnsubscribe } from "./lib/redis-pubsub";
import { settings } from "./routes/settings";
import type { AppUser, AppVariables } from "./types";
import type { ClientMessage, ServerMessage } from "@inboxkit-assignment/game-types";

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
  .use("*", async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      c.set("user", null);
      c.set("session", null);
      c.set("user_settings", null);
      await next();
      return;
    }
    c.set("user", session.user as AppUser);
    c.set("session", session.session);

    const [setting] = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, session.user.id))
      .limit(1);
    c.set("user_settings", setting ?? null);

    await next();
  })
  .route("/api/user/settings", settings)
  .post("/api/game/session", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const result = await sessionStartWorkflow({ db })({ createdBy: user.id });
    if (!result.isOk()) {
      return c.json({ error: "Failed to create session" }, 500);
    }

    return c.json({ sessionId: result.value[0]!.id }, 201);
  })
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
            userId: user.id,
            username,
            color: userColor,
            sessionId: null,
            ws,
          });

          ws.send(
            JSON.stringify({
              type: "init",
              userId,
              color: userColor,
              username,
            } as ServerMessage),
          );
        },
        onMessage: async (event, ws) => {
          try {
            const payload = JSON.parse(String(event.data)) as ClientMessage;
            if (!payload || !payload.type) return;

            console.log(payload);

            if (payload.type === "joinSession") {
              const { sessionId } = payload.data;
              await joinSession(sessionId, userId);
              ws.send(JSON.stringify({ type: "joined", success: true } as ServerMessage));
              return;
            }

            if (payload.type === "claim") {
              const { sessionId, grid, row, col } = payload.data;
              const result = await cellClaimingWorkflow({ redis })({
                userId,
                sessionId,
                grid,
                userColor,
                row,
                col,
              });

              if (!result.isOk()) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: "Internal server error",
                  } as ServerMessage),
                );
                return;
              }

              const output = result.value;
              if (!output.claimed) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: output.error ?? "Claim failed",
                  } as ServerMessage),
                );
                return;
              }

              broadcastToSession(sessionId, {
                type: "cellClaimed",
                row: output.row,
                col: output.col,
                userId: output.userId,
                userColor: output.userColor ?? "",
                grid: output.grid,
              });

              await incrementScore(sessionId, userId);
              const rawScores = await getSessionScores(sessionId);
              const enrichedScores = buildScoresWithUsernames(rawScores);
              broadcastToSession(sessionId, {
                type: "scoresData",
                scores: enrichedScores,
              });
              return;
            }

            if (payload.type === "getTurn") {
              const { sessionId } = payload.data;
              const turn = await getTurn(sessionId, userId);
              ws.send(JSON.stringify({ type: "turnData", ...turn } as ServerMessage));
              return;
            }

            if (payload.type === "getGrid") {
              const { sessionId } = payload.data;
              const grid = await getGrid(sessionId);
              ws.send(JSON.stringify({ type: "gridData", grid } as ServerMessage));
              return;
            }

            if (payload.type === "setGrid") {
              const { sessionId, grid } = payload.data;
              const success = await setGrid(sessionId, grid);
              ws.send(JSON.stringify({ type: "gridSet", success } as ServerMessage));
              return;
            }

            if (payload.type === "getScores") {
              const { sessionId } = payload.data;
              const rawScores = await getSessionScores(sessionId);
              const enrichedScores = buildScoresWithUsernames(rawScores);
              ws.send(
                JSON.stringify({ type: "scoresData", scores: enrichedScores } as ServerMessage),
              );
              return;
            }
          } catch {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Invalid message",
              } as ServerMessage),
            );
          }
        },
        onClose: () => {
          const { user } = removeConnectedUser(userId);
          if (user?.sessionId) {
            const hasOthersInSession = Array.from(connectedUsers.values()).some(
              (u) => u.sessionId === user.sessionId,
            );
            if (!hasOthersInSession) {
              maybeUnsubscribe(user.sessionId);
            }
          }
        },
        onError(evt) {
          console.error("error", evt);
          removeConnectedUser(userId);
        },
      };
    }),
  );

const wss = new WebSocketServer({ noServer: true });

serve(
  {
    fetch: app.fetch,
    port: 3000,
    websocket: { server: wss },
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);

export type AppType = typeof app;
