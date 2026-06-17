import { Result } from "better-result";
import { GRID_SIZE, type Grid } from "@inboxkit-assignment/game-types";
import type Redis from "ioredis";

import { redisRepo } from "@/redis/repo";

export const createEmptyGrid = (): Grid =>
  Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ claimed: false }) as const),
  );

export const isCellInBounds = (row: number, col: number) =>
  row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;

export const ensureSessionGrid = (redis: Redis) => (sessionId: string) => {
  return Result.gen(async function* () {
    const repo = redisRepo({ redis });
    const existingGrid = yield* Result.await(repo.grid.get(sessionId));
    if (existingGrid) {
      return Result.ok(existingGrid);
    }

    const grid = createEmptyGrid();
    yield* Result.await(repo.grid.set(sessionId, grid));
    return Result.ok(grid);
  });
};
