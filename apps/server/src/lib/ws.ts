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
  const deleted = connectedUsers.delete(userId);
  return { connectedUsers, deleted };
};

export const updateUserSession = (userId: string, sessionId: string) => {
  const user = connectedUsers.get(userId);
  if (user) {
    user.sessionId = sessionId;
  }
};

export const broadcastToSession = <T extends string>(sessionId: string, msg: T) => {
  connectedUsers.forEach((user) => {
    if (user.sessionId === sessionId) {
      user.ws.send(msg);
    }
  });
};

export const broadcast = <T extends string>(msg: T, except?: { userId: string }) => {
  connectedUsers.forEach((user, userId) => {
    if (except && except?.userId === userId) {
      return;
    }
    user.ws.send(msg);
  });
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
