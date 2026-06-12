import type { Message } from "@inboxkit-assignment/game-types";
import type { NodePgDatabase } from "@inboxkit-assignment/db";
import type Redis from "ioredis";

export type HandlerContext = {
  userId: string;
  username: string;
  userColor: string;
  ws: any;
  redis: Redis;
  db: NodePgDatabase<any>;
};

type MessageType = Message["type"];

export type HandlerFor<T extends MessageType> = (
  ctx: HandlerContext,
  payload: Extract<Message, { type: T }>,
) => Promise<void> | void;

/**
 * Creates a strictly typed handler registry.
 * Each key must be a valid Message type, and the handler function
 * automatically receives the correctly narrowed payload for that type.
 */
export const createRegistry = <
  T extends { [K in keyof T]: K extends MessageType ? HandlerFor<K> : never },
>(
  r: T,
) => r;
