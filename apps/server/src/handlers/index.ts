import { gameHandlers } from "./game";
import { lobbyHandlers } from "./lobby";
import { systemHandlers } from "./system";
import type { HandlerContext } from "./types";
import type { Message } from "@inboxkit-assignment/game-types";

type MessageType = Message["type"];

type AnyHandler = (ctx: HandlerContext, payload: Message) => Promise<void> | void;

const allHandlers = {
  ...lobbyHandlers,
  ...gameHandlers,
  ...systemHandlers,
} as unknown as Partial<Record<MessageType, AnyHandler>>;

export function getHandler(type: MessageType): AnyHandler | undefined {
  return allHandlers[type];
}

export type { HandlerContext };
export { createRegistry } from "./types";
