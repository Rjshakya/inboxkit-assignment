import { zValidator } from "@hono/zod-validator";
import { db, eq } from "@inboxkit-assignment/db";
import { gameSessionTable } from "@inboxkit-assignment/db/schema/game";
import { Hono } from "hono";
import { z } from "zod";
import { Result } from "better-result";
import type { Message } from "@inboxkit-assignment/game-types";

import { createRedisClient } from "@/redis/client";
import {
  createSessionWorkflow,
  startSessionWorkflow,
  getSessionPlayersDetails,
  SessionError,
  UnauthorizedError,
  TURN_DURATION_MS,
} from "@/game/session";
import { createEmptyGrid, ensureSessionGrid, getSessionScore } from "@/game/logic";
import { broadcastToSession } from "@/redis/pubsub";

import type { AppVariables } from "@/types";

const redis = createRedisClient();

const paramsSchema = z.object({
  id: z.string(),
});

export const gameSession = new Hono<{ Variables: AppVariables }>()
  .post("/", async (c) => {
    const user = c.get("user");
    if (!user) {
      throw new UnauthorizedError({ message: "Unauthorized" });
    }

    const result = await createSessionWorkflow({ db, redis })({
      userId: user.id,
    });

    if (Result.isError(result)) {
      throw result.error;
    }

    const value: string = result.value.sessionId;
    return c.json({ sessionId: value }, 201);
  })
  .get("/:id", zValidator("param", paramsSchema), async (c) => {
    const user = c.get("user");
    if (!user) {
      throw new UnauthorizedError({ message: "Unauthorized" });
    }

    const { id } = c.req.valid("param");

    const [session] = await db
      .select()
      .from(gameSessionTable)
      .where(eq(gameSessionTable.id, id))
      .limit(1);

    if (!session) {
      throw new SessionError({ reason: "NotFound", message: "Session not found" });
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
      throw new UnauthorizedError({ message: "Unauthorized" });
    }

    const { id } = c.req.valid("param");

    const result = await startSessionWorkflow({ db, redis })({
      sessionId: id,
      startedBy: user.id,
    });

    if (Result.isError(result)) {
      throw result.error;
    }

    const grid = await ensureSessionGrid(redis)(id);
    if (Result.isError(grid)) {
      throw grid.error;
    }

    const scores = await getSessionScore(redis)(id);
    if (Result.isError(scores)) {
      throw scores.error;
    }

    await broadcastToSession(id, {
      type: "game_started",
      sessionId: id,
      activePlayer: result.value.activePlayer,
    } satisfies Message);

    return c.json({
      activePlayer: result.value.activePlayer,
      players: result.value.players,
      grid: grid.value ?? createEmptyGrid(),
      scores: scores.value,
      turnDurationMs: TURN_DURATION_MS,
    });
  })
  .get("/:id/players", zValidator("param", paramsSchema), async (c) => {
    const user = c.get("user");
    if (!user) {
      throw new UnauthorizedError({ message: "Unauthorized" });
    }

    const { id } = c.req.valid("param");

    const [session] = await db
      .select()
      .from(gameSessionTable)
      .where(eq(gameSessionTable.id, id))
      .limit(1);

    if (!session) {
      throw new SessionError({ reason: "NotFound", message: "Session not found" });
    }

    const result = await getSessionPlayersDetails({ db })(id);

    if (Result.isError(result)) {
      throw result.error;
    }

    return c.json({ players: result.value });
  });
