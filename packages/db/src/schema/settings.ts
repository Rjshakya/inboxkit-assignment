import * as t from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { user } from "./auth";

export const userSettingsTable = t.pgTable(
  "user_setting",
  {
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => randomUUID().toString()),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .unique(),
    color: t.text(),
    createdAt: t.timestamp("created_at").defaultNow().notNull(),
    updatedAt: t
      .timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [t.index("user_setting_userId_idx").on(table.userId)],
);

export type UserSettingInsert = InferInsertModel<typeof userSettingsTable>;
export type UserSettingSelect = InferSelectModel<typeof userSettingsTable>;
