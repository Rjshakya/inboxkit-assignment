import { createRedisClient } from "@/redis/client";
import { connectedUsers } from "../lib/ws";
import type { BroadCastMessage, DMMessage, Message } from "@inboxkit-assignment/game-types";

const redisPublisher = createRedisClient();
const redisSubscriber = createRedisClient();

redisSubscriber.on("message", (channel, message) => {
  if (channel.includes("user")) {
    // send dm message

    const payload: DMMessage<Message> = JSON.parse(message);

    if (payload.data?.type === "request_to_join_session_dm") {
      const data = payload.data;
      const toUser = connectedUsers.get(data.toUser.userId);
      if (toUser) {
        toUser.ws.send(JSON.stringify(payload.data));
      }
    }
  } else {
    const sessionId = channel.replace("session:", "").replace(":broadcast", "").trim();

    const payload: BroadCastMessage<Message> = JSON.parse(message);

    connectedUsers.forEach((user) => {
      if (user.sessionId === sessionId && user?.userId !== payload?.exceptUserId) {
        try {
          user.ws.send(JSON.stringify(payload.data));
        } catch {
          // Socket might be closing; ignore
        }
      }
    });
  }
});

export const BroadcastChannelId = (sessionId: string) => `session:${sessionId}:broadcast`;
export const DMChannelId = (toUserId: string) => `user:${toUserId}:dm`;

export function subscribeToPubSub(channelId: string) {
  redisSubscriber.subscribe(channelId);
}
export function unsubscribeToPubSub(channelId: string) {
  redisSubscriber.unsubscribe(channelId);
}

export function broadcastToSession(sessionId: string, msg: Message, exceptUserId?: string) {
  const payload: BroadCastMessage<Message> = { data: msg, exceptUserId };
  return redisPublisher.publish(BroadcastChannelId(sessionId), JSON.stringify(payload));
}

export function sendMessageToUser(toUserId: string, msg: Message) {
  const payload: DMMessage<Message> = { data: msg };
  return redisPublisher.publish(DMChannelId(toUserId), JSON.stringify(payload));
}
