import { Result } from "better-result";
import type { Grid } from "@inboxkit-assignment/game-types";
import type Redis from "ioredis";

import { redisRepo } from "@/redis/repo";
import { changeActivePlayer } from "./turn";
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
  (input: { sessionId: string; grid: Grid; activePlayer: { userId: string; expiry: number } }) => {
    const { sessionId, grid, activePlayer } = input;

    return Result.gen(async function* () {
      const repo = redisRepo({ redis });

      const players = yield* Result.await(repo.players.get(sessionId));
      if (!players.length) {
        return Result.ok({
          deadlockedPlayers: [] as string[],
          activePlayer,
          gameOver: true,
        });
      }

      const deadlockedPlayers: string[] = [];
      for (const userId of players) {
        if (isPlayerDeadlocked(grid, userId)) {
          yield* Result.await(repo.players.remove(sessionId, userId));
          deadlockedPlayers.push(userId);
        }
      }

      const activePlayerRemoved = deadlockedPlayers.includes(activePlayer.userId);

      if (!activePlayerRemoved) {
        return Result.ok({
          deadlockedPlayers,
          activePlayer,
          gameOver: false,
        });
      }

      const nextActivePlayer = yield* Result.await(changeActivePlayer(redis)(sessionId));

      return Result.ok({
        deadlockedPlayers,
        activePlayer: nextActivePlayer,
        gameOver: false,
      });
    });
  };
