import { createRedisClient } from "@/redis/client";
import { connectedUsers } from "./ws";
import type { BroadCastMessage, ServerMessage } from "@inboxkit-assignment/game-types";

const redisPublisher = createRedisClient();
const redisSubscriber = createRedisClient();

const subscribedSessions = new Set<string>();

redisSubscriber.on("message", (channel, message) => {
  const sessionId = channel.replace("session:", "").replace(":broadcast", "").trim();

  const data: BroadCastMessage<ServerMessage> = JSON.parse(message);

  console.log("received message on redis sub");
  connectedUsers.forEach((user) => {
    if (user.sessionId === sessionId && user?.userId !== data?.exceptUserId) {
      try {
        user.ws.send(JSON.stringify(data.data));
      } catch {
        // Socket might be closing; ignore
      }
    }
  });
});

export function subscribeToRedisPubSub(sessionId: string) {
  const channel = `session:${sessionId}:broadcast`;
  if (!subscribedSessions.has(sessionId)) {
    redisSubscriber.subscribe(channel);
    subscribedSessions.add(sessionId);
  }
}

export function maybeUnsubscribe(sessionId: string) {
  const channel = `session:${sessionId}:broadcast`;
  if (subscribedSessions.has(sessionId)) {
    redisSubscriber.unsubscribe(channel);
    subscribedSessions.delete(sessionId);
  }
}

export function broadcastToSession<T extends ServerMessage>(
  sessionId: string,
  msg: T,
  exceptUserId?: string,
) {
  redisPublisher.publish(
    `session:${sessionId}:broadcast`,
    JSON.stringify({ data: msg, exceptUserId }),
  );
}
