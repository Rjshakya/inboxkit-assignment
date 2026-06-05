import Redis from "ioredis";
import { env } from "@inboxkit-assignment/env/server";
// By default, it will connect to localhost:6379.
export const createRedisClient = () => {
  return new Redis(env.REDIS_URL);
};
