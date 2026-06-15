import { Result } from "better-result";
import type { Grid } from "@inboxkit-assignment/game-types";
import type Redis from "ioredis";

import { redisRepo } from "@/redis/repo";
import { isCellInBounds } from "./grid";

export const isPlayerDeadlocked = (grid: Grid, userId: string) => {
  let hasCell = false;

  for (let row = 0; row < grid.length; row++) {
    const gridRow = grid[row];
    if (!gridRow) continue;

    for (let col = 0; col < gridRow.length; col++) {
      const cell = gridRow[col];
      if (!cell || !cell.claimed || cell.userId !== userId) {
        continue;
      }

      hasCell = true;
      const neighbors: Array<readonly [number, number]> = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ];

      for (const [nRow, nCol] of neighbors) {
        if (isCellInBounds(nRow, nCol)) {
          const neighbor = grid[nRow]?.[nCol];
          if (neighbor && !neighbor.claimed) {
            return false;
          }
        }
      }
    }
  }

  return hasCell;
};

export const deadlockWorkflow =
  ({ redis }: { redis: Redis }) =>
  (input: {
    sessionId: string;
    grid: Grid;
    activePlayer: { userId: string; expiry: number };
    players: string[];
  }) => {
    const { sessionId, grid, players } = input;
    const repo = redisRepo({ redis });

    return Result.gen(async function* () {
      const deadlockedPlayers: string[] = [];
      for (const userId of players) {
        if (isPlayerDeadlocked(grid, userId)) {
          yield* Result.await(repo.players.remove(sessionId, userId));
          deadlockedPlayers.push(userId);
        }
      }

      return Result.ok({
        deadlockedPlayers,
        playersLeft: players.length - deadlockedPlayers.length,
      });
    });
  };
