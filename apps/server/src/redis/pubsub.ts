import { createRedisClient } from "@/redis/client";
import { connectedUsers } from "../lib/ws";
import type { BroadCastMessage, DMMessage, Message } from "@inboxkit-assignment/game-types";

const redisPublisher = createRedisClient();
const redisSubscriber = createRedisClient();

redisSubscriber.on("message", (channel, message) => {
  console.log(`redis ${channel} receive a msg`);

  if (channel.includes("user")) {
    // send dm message

    const payload: DMMessage<Message> = JSON.parse(message);
    console.log("redis:dm:payload", payload);
    if (payload.data?.type === "request_to_join_session_dm") {
      const data = payload.data;
      const toUser = connectedUsers.get(data.toUser.userId);
      if (toUser) {
        sendMessage(toUser.ws)(payload.data);
      }
    }

    if (payload.data.type === "request_declined") {
      const data = payload.data;
      const user = connectedUsers.get(data.user.userId);
      if (user) {
        sendMessage(user.ws)(payload.data);
      }
    }
  } else {
    const sessionId = channel.replace("session:", "").replace(":broadcast", "").trim();

    const payload: BroadCastMessage<Message> = JSON.parse(message);
    console.log("redis:broadcast:payload", payload);
    connectedUsers.forEach((user) => {
      if (user.sessionId === sessionId && user?.userId !== payload?.exceptUserId) {
        sendMessage(user.ws)(payload.data);
      }
    });
  }
});

export const BroadcastChannelId = (sessionId: string) => `session:${sessionId}:broadcast`;
export const DMChannelId = (toUserId: string) => `user:${toUserId}:dm`;

export function subscribeToPubSub(channelId: string) {
  return redisSubscriber.subscribe(channelId);
}
export function unsubscribeToPubSub(channelId: string) {
  return redisSubscriber.unsubscribe(channelId);
}

export function broadcastToSession(sessionId: string, msg: Message, exceptUserId?: string) {
  const payload: BroadCastMessage<Message> = { data: msg, exceptUserId };
  console.log("---->");
  console.log(payload);
  console.log("---->");
  return redisPublisher.publish(BroadcastChannelId(sessionId), JSON.stringify(payload));
}

export function sendMessageToUser(toUserId: string, msg: Message) {
  const payload: DMMessage<Message> = { data: msg };
  console.log("---->");
  console.log(payload);
  console.log("---->");
  return redisPublisher.publish(DMChannelId(toUserId), JSON.stringify(payload));
}

export const sendMessage = (ws: any) => (message: Message) => {
  try {
    console.log("---->");
    console.log(message);
    console.log("---->");
    ws.send(JSON.stringify(message));
  } catch (e) {
    console.error("[WS OUT] Failed to send message:", e);
  }
};
