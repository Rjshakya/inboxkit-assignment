import { zValidator } from "@hono/zod-validator";
import { db, eq } from "@inboxkit-assignment/db";
import { userSettingsTable } from "@inboxkit-assignment/db/schema/settings";
import { Hono } from "hono";
import { z } from "zod";

import { UnauthorizedError } from "@/services/shared";
import type { AppVariables } from "../types";

const updateSchema = z.object({
  color: z.string().min(1),
});

export const settings = new Hono<{ Variables: AppVariables }>()
  .get("/", async (c) => {
    const user = c.get("user");
    if (!user) {
      throw new UnauthorizedError({ message: "Unauthorized" });
    }

    const existing = c.get("user_settings");
    if (existing) {
      return c.json({ settings: existing });
    }

    return c.json({ settings: null });
  })
  .post("/", zValidator("json", updateSchema), async (c) => {
    const user = c.get("user");
    if (!user) {
      throw new UnauthorizedError({ message: "Unauthorized" });
    }

    const { color } = c.req.valid("json");
    const existing = c.get("user_settings");

    if (existing) {
      const [updated] = await db
        .update(userSettingsTable)
        .set({ color })
        .where(eq(userSettingsTable.id, existing.id))
        .returning();
      return c.json({ settings: updated });
    }

    const [inserted] = await db
      .insert(userSettingsTable)
      .values({ userId: user.id, color })
      .returning();
    return c.json({ settings: inserted });
  });
