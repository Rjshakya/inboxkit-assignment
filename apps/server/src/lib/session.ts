import type { Grid } from "@inboxkit-assignment/game-types";

import { createRedisClient } from "@/redis/client";
import { broadcastToSession } from "./ws";

export const redis = createRedisClient();
const timers = new Map<string, NodeJS.Timeout>();

export async function joinSession(sessionId: string, userId: string) {
  const key = `session:${sessionId}:players`;
  const exists = await redis.exists(key);

  await redis.rpush(key, userId);

  if (!exists) {
    await redis.set(
      `session:${sessionId}:turnData`,
      JSON.stringify({ currentIndex: 0, lastTurnAt: Date.now() }),
    );
    await redis.set(`${userId}:${sessionId}:turn`, "1", "EX", 15);
    startTimer(sessionId);
    broadcastToSession(sessionId, JSON.stringify({ type: "turnChanged", userTurn: userId }));
  }
}

export async function advanceTurn(sessionId: string) {
  const players = await redis.lrange(`session:${sessionId}:players`, 0, -1);
  if (players.length === 0) {
    timers.delete(sessionId);
    return;
  }

  const turnDataStr = await redis.get(`session:${sessionId}:turnData`);
  const turnData = JSON.parse(turnDataStr ?? '{"currentIndex":-1}');
  const nextIndex = (turnData.currentIndex + 1) % players.length;
  const nextUserId = players[nextIndex]!;

  await redis.set(
    `session:${sessionId}:turnData`,
    JSON.stringify({ currentIndex: nextIndex, lastTurnAt: Date.now() }),
  );
  await redis.set(`${nextUserId}:${sessionId}:turn`, "1", "EX", 15);

  broadcastToSession(sessionId, JSON.stringify({ type: "turnChanged", userTurn: nextUserId }));
  startTimer(sessionId);
}

export async function getTurn(sessionId: string, myUserId: string) {
  const players = await redis.lrange(`session:${sessionId}:players`, 0, -1);
  const turnDataStr = await redis.get(`session:${sessionId}:turnData`);
  const turnData = JSON.parse(turnDataStr ?? '{"currentIndex":0,"lastTurnAt":0}');
  const elapsed = Date.now() - turnData.lastTurnAt;

  if (elapsed >= 15000) {
    await advanceTurn(sessionId);
    const newTurnData = JSON.parse(
      (await redis.get(`session:${sessionId}:turnData`)) ?? '{"currentIndex":0}',
    );
    const currentUserId = players[newTurnData.currentIndex];
    return { userTurn: currentUserId, isMyTurn: currentUserId === myUserId };
  }

  const currentUserId = players[turnData.currentIndex];
  return { userTurn: currentUserId, isMyTurn: currentUserId === myUserId };
}

export async function setGrid(sessionId: string, grid: Grid) {
  await redis.set(`${sessionId}:grid`, JSON.stringify(grid));
  return true;
}

export async function getGrid(sessionId: string): Promise<Grid | null> {
  const data = await redis.get(`${sessionId}:grid`);
  return data ? (JSON.parse(data) as Grid) : null;
}

export async function incrementScore(sessionId: string, userId: string) {
  await redis.hincrby(`session:${sessionId}:scores`, userId, 1);
}

export async function getScores(sessionId: string) {
  const raw = await redis.hgetall(`session:${sessionId}:scores`);
  const players = await redis.lrange(`session:${sessionId}:players`, 0, -1);

  return players
    .map((userId) => ({ userId, score: parseInt(raw[userId] ?? "0", 10) }))
    .sort((a, b) => b.score - a.score);
}

function startTimer(sessionId: string) {
  clearTimer(sessionId);
  const timer = setTimeout(() => {
    advanceTurn(sessionId).catch(console.error);
  }, 15000);
  timers.set(sessionId, timer);
}

function clearTimer(sessionId: string) {
  const existing = timers.get(sessionId);
  if (existing) {
    clearTimeout(existing);
    timers.delete(sessionId);
  }
}

export async function checkTurn(sessionId: string, userId: string) {
  const turnValue = await redis.get(`${userId}:${sessionId}:turn`);
  return turnValue === "1";
}
