import type { WebSocketLike } from "@hono/node-server";
import type { WSContext } from "hono/ws";

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

export const buildScoresWithUsernames = (
  rawScores: { userId: string; score: number }[],
): { userId: string; username: string; score: number }[] => {
  return rawScores.map((s) => {
    const user = connectedUsers.get(s.userId);
    return {
      userId: s.userId,
      username: user?.username ?? s.userId.slice(0, 8),
      score: s.score,
    };
  });
};
