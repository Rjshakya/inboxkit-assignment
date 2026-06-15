import * as t from "drizzle-orm/pg-core";
import { user } from "./auth";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const gameSessionTable = t.pgTable("game_sessions", {
  id: t
    .text()
    .primaryKey()
    .$defaultFn(() => randomUUID().toString()),
  createdBy: t
    .text()
    .notNull()
    .references(() => user.id),
  isExpired: t.boolean().default(false),
  expiredAt: t.timestamp("expired_at"),
  createdAt: t.timestamp("created_at").defaultNow().notNull(),
  updatedAt: t
    .timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const gameSessionResultTable = t.pgTable("game_sessions_results", {
  id: t
    .text()
    .primaryKey()
    .$defaultFn(() => randomUUID().toString()),

  score: t.integer().default(0),
  userId: t
    .text()
    .notNull()
    .references(() => user.id),
  sessionId: t
    .text()
    .notNull()
    .references(() => gameSessionTable.id),
  createdAt: t.timestamp("created_at").defaultNow().notNull(),
  updatedAt: t
    .timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const gameSessionPlayersTable = t.pgTable("game_session_players", {
  id: t
    .text()
    .primaryKey()
    .$defaultFn(() => randomUUID().toString()),
  sessionId: t
    .text()
    .notNull()
    .references(() => gameSessionTable.id),
  userId: t
    .text()
    .notNull()
    .references(() => user.id),
  joinedAt: t.timestamp("joined_at").defaultNow().notNull(),
  updatedAt: t
    .timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type gameSessionInsert = InferInsertModel<typeof gameSessionTable>;
export type gameSessionSelect = InferSelectModel<typeof gameSessionTable>;

export type gameSessionResultInsert = InferInsertModel<typeof gameSessionResultTable>;
export type gameSessionResultSelect = InferSelectModel<typeof gameSessionResultTable>;

export type gameSessionPlayersInsert = InferInsertModel<typeof gameSessionPlayersTable>;
export type gameSessionPlayersSelect = InferSelectModel<typeof gameSessionPlayersTable>;

export const gameSessionInsertSchema = createInsertSchema(gameSessionTable);
export const gameSessionSelectSchema = createSelectSchema(gameSessionTable);
export const gameSessionUpdateSchema = createUpdateSchema(gameSessionTable);

export const gameSessionResultInsertSchema = createInsertSchema(gameSessionResultTable);
export const gameSessionResultSelectSchema = createSelectSchema(gameSessionResultTable);
export const gameSessionResultUpdateSchema = createUpdateSchema(gameSessionResultTable);

export const gameStateTable = t.pgTable("game_state", {
  id: t
    .text()
    .primaryKey()
    .$defaultFn(() => randomUUID().toString()),
  sessionId: t
    .text()
    .notNull()
    .references(() => gameSessionTable.id)
    .unique(),
  grid: t.jsonb().notNull(),
  scores: t.jsonb().notNull(),
  winnerUserId: t.text(),
  finishedAt: t.timestamp("finished_at").defaultNow().notNull(),
  createdAt: t.timestamp("created_at").defaultNow().notNull(),
  updatedAt: t
    .timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type gameStateInsert = InferInsertModel<typeof gameStateTable>;
export type gameStateSelect = InferSelectModel<typeof gameStateTable>;

export const gameStateInsertSchema = createInsertSchema(gameStateTable);
export const gameStateSelectSchema = createSelectSchema(gameStateTable);
export const gameStateUpdateSchema = createUpdateSchema(gameStateTable);

export const gameSessionPlayersInsertSchema = createInsertSchema(gameSessionPlayersTable);
export const gameSessionPlayersSelectSchema = createSelectSchema(gameSessionPlayersTable);
export const gameSessionPlayersUpdateSchema = createUpdateSchema(gameSessionPlayersTable);
