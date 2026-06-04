import Redis from "ioredis";

// By default, it will connect to localhost:6379.
export const createRedisClient = () => new Redis();
