import { zValidator } from "@hono/zod-validator";
import { db, eq } from "@inboxkit-assignment/db";
import { gameSessionTable } from "@inboxkit-assignment/db/schema/game";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { Result } from "better-result";

import { createRedisClient } from "@/redis/client";
import {
  createSessionWorkflow,
  startSessionWorkflow,
  getSessionPlayersDetails,
} from "@/game/session";

import type { AppVariables } from "@/types";

const redis = createRedisClient();

const paramsSchema = z.object({
  id: z.string(),
});

export const gameSession = new Hono<{ Variables: AppVariables }>()
  .post("/", async (c) => {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const result = await createSessionWorkflow({ db, redis })({
      userId: user.id,
    });

    if (Result.isError(result)) {
      const error = result.error;
      if (error._tag === "SessionError") {
        throw new HTTPException(422, { message: error.message });
      }
      if (error._tag === "DBError") {
        throw new HTTPException(500, { message: error.message });
      }
      if (error._tag === "RedisError") {
        throw new HTTPException(500, { message: error.message });
      }
      throw new HTTPException(500, { message: "Failed to create session" });
    }

    const value: string = result.value.sessionId;
    return c.json({ sessionId: value }, 201);
  })
  .get("/:id", zValidator("param", paramsSchema), async (c) => {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const { id } = c.req.valid("param");

    const [session] = await db
      .select()
      .from(gameSessionTable)
      .where(eq(gameSessionTable.id, id))
      .limit(1);

    if (!session) {
      throw new HTTPException(404, { message: "Session not found" });
    }

    return c.json({
      id: session.id,
      createdBy: session.createdBy,
      createdAt: session.createdAt,
      isExpired: session.isExpired,
      expiredAt: session.expiredAt,
    });
  })
  .post("/:id/start", zValidator("param", paramsSchema), async (c) => {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const { id } = c.req.valid("param");

    const result = await startSessionWorkflow({ db, redis })({
      sessionId: id,
      startedBy: user.id,
    });

    if (Result.isError(result)) {
      const error = result.error;
      if (error._tag === "SessionError") {
        if (error.reason === "AdminRequired") {
          throw new HTTPException(409, { message: error.message });
        }

        if (error.reason === "NotEnoughPlayers") {
          throw new HTTPException(422, { message: error.message });
        }
        if (error.reason === "AlreadyStarted" || error.reason === "AlreadyStartedByOther") {
          throw new HTTPException(409, { message: error.message });
        }
        throw new HTTPException(422, { message: error.message });
      }
      if (error._tag === "DBError") {
        throw new HTTPException(500, { message: error.message });
      }
      if (error._tag === "RedisError") {
        throw new HTTPException(500, { message: error.message });
      }
      throw new HTTPException(500, { message: "Failed to start session" });
    }

    return c.json({
      activePlayer: result.value.activePlayer,
      players: result.value.players,
    });
  })
  .get("/:id/players", zValidator("param", paramsSchema), async (c) => {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const { id } = c.req.valid("param");

    const [session] = await db
      .select()
      .from(gameSessionTable)
      .where(eq(gameSessionTable.id, id))
      .limit(1);

    if (!session) {
      throw new HTTPException(404, { message: "Session not found" });
    }

    const result = await getSessionPlayersDetails({ db })(id);

    if (Result.isError(result)) {
      const error = result.error;
      if (error._tag === "DBError") {
        throw new HTTPException(500, { message: error.message });
      }
      throw new HTTPException(500, { message: "Failed to get players" });
    }

    return c.json({ players: result.value });
  });
