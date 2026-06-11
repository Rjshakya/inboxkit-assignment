import type { WebSocketLike } from "@hono/node-server";
import type { WSContext } from "hono/ws";

// In memory state
type ConnectedUser = {
  userId: string;
  username: string;
  color: string;
  sessionId: string | null;
  ws: WSContext<WebSocketLike>;
};

export const connectedUsers = new Map<ConnectedUser["userId"], ConnectedUser>();

export const addConnectedUser = (user: ConnectedUser) => {
  connectedUsers.set(user.userId, user);
  return connectedUsers;
};

export const removeConnectedUser = (userId: string) => {
  const user = connectedUsers.get(userId);
  const deleted = connectedUsers.delete(userId);
  return { connectedUsers, deleted, user };
};

export const addSessionIdToConnectedUser = (userId: string, sessionId: string) => {
  const user = connectedUsers.get(userId);
  if (user) {
    user.sessionId = sessionId;
  }
};
