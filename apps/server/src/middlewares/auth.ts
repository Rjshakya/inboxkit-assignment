import type { AppUser } from "@/types";
import { auth } from "@inboxkit-assignment/auth";
import { db, eq } from "@inboxkit-assignment/db";
import { userSettingsTable } from "@inboxkit-assignment/db/schema/settings";
import type { MiddlewareHandler } from "hono";

export const authMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
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
  };
};
