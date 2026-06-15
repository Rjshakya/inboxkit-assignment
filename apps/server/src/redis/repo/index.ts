import { activePlayerRepo } from "./active-player";
import { cellRepo } from "./cell";
import { colorRepo } from "./color";
import { gridRepo } from "./grid";
import { playersRepo } from "./players";
import { scoresRepo } from "./scores";
import { sessionMetaRepo } from "./session-meta";

export const redisRepo = ({ redis }: { redis: import("ioredis").default }) => ({
  grid: gridRepo({ redis }),
  scores: scoresRepo({ redis }),
  players: playersRepo({ redis }),
  activePlayer: activePlayerRepo({ redis }),
  sessionMeta: sessionMetaRepo({ redis }),
  cell: cellRepo({ redis }),
  color: colorRepo({ redis }),
});

export type RedisRepo = ReturnType<typeof redisRepo>;

export * from "./active-player";
export * from "./cell";
export * from "./color";
export * from "./grid";
export * from "./players";
export * from "./scores";
export * from "./session-meta";
