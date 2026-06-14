import type Redis from "ioredis";

const COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",

  "#dc2626",
  "#ea580c",
  "#d97706",
  "#65a30d",
  "#16a34a",
  "#059669",
  "#0d9488",
  "#0891b2",
  "#0284c7",
  "#2563eb",
  "#4f46e5",
  "#7c3aed",
  "#9333ea",
  "#c026d3",
  "#db2777",
  "#e11d48",

  "#fb7185",
  "#fdba74",
  "#fde047",
  "#bef264",
  "#86efac",
  "#5eead4",
  "#67e8f9",
  "#7dd3fc",
  "#93c5fd",
  "#a5b4fc",
  "#c4b5fd",
  "#d8b4fe",
  "#f0abfc",
  "#f9a8d4",
  "#fca5a5",

  "#b91c1c",
  "#c2410c",
  "#b45309",
  "#4d7c0f",
  "#15803d",
  "#047857",
  "#0f766e",
  "#0e7490",
  "#0369a1",
  "#1d4ed8",
  "#4338ca",
  "#6d28d9",
  "#7e22ce",
  "#a21caf",
  "#be185d",

  "#fca311",
  "#06d6a0",
  "#118ab2",
  "#ef476f",
  "#ffd166",
  "#9d4edd",
  "#ff9f1c",
  "#2ec4b6",
  "#e63946",
];

const RedisColorServiceTokenKey = (sessionId: string) => `color:token:${sessionId}`;

export const getColor = (redis: Redis) => async (sessionId: string) => {
  const token = await redis.incr(RedisColorServiceTokenKey(sessionId));
  const index = (token - 1) % COLORS.length;

  return COLORS[index] ?? "#3b82f6";
};
