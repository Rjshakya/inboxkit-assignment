import { Result } from "better-result";
import type { NodePgDatabase } from "@inboxkit-assignment/db";
import type Redis from "ioredis";

import { redisRepo } from "@/redis/repo";

import { CellClaimingWorkflowError } from "./errors";
import { ensureSessionGrid, isCellInBounds } from "./grid";
import { isGameOver } from "./game-over";
import { getSessionActivePlayer } from "./turn";

export const cellClaimingWorkflow =
  (deps: { db: NodePgDatabase<any>; redis: Redis }) =>
  (input: {
    sessionId: string;
    userId: string;
    userColor: string;
    row: number;
    col: number;
  }) => {
    const { redis } = deps;
    const { sessionId, userId, userColor, row, col } = input;

    return Result.gen(async function* () {
      if (!isCellInBounds(row, col)) {
        return yield* new CellClaimingWorkflowError({
          reason: "OutOfBounds",
          message: "Cell is outside the grid",
        });
      }

      const activePlayer = yield* Result.await(getSessionActivePlayer(redis)(sessionId));

      if (!activePlayer || activePlayer.userId !== userId) {
        return yield* new CellClaimingWorkflowError({
          reason: "NotActivePlayer",
          message: "Not your turn",
        });
      }

      const grid = yield* Result.await(ensureSessionGrid(redis)(sessionId));
      const cell = grid[row]?.[col];
      if (!cell || cell.claimed) {
        return yield* new CellClaimingWorkflowError({
          reason: "CellAlreadyClaimed",
          message: "Cell already claimed",
        });
      }

      const repo = redisRepo({ redis });

      const isNotFirstTimeClaiming = yield* Result.await(
        repo.cell.hasClaimedFirstCell(sessionId, userId),
      );

      if (isNotFirstTimeClaiming) {
        const neighbors: Array<readonly [number, number]> = [
          [row - 1, col],
          [row + 1, col],
          [row, col - 1],
          [row, col + 1],
        ];

        const hasAdjacentClaim = neighbors.some(([nextRow, nextCol]) => {
          if (!isCellInBounds(nextRow, nextCol)) {
            return false;
          }

          const neighborCell = grid[nextRow]?.[nextCol];
          return !!neighborCell?.claimed && neighborCell.userId === userId;
        });

        if (!hasAdjacentClaim) {
          return yield* new CellClaimingWorkflowError({
            reason: "NotAdjacent",
            message: "Cell must be adjacent to your territory",
          });
        }
      }

      const setResult = yield* Result.await(
        repo.cell.set({
          sessionId,
          row,
          col,
          userId,
          userColor,
        }),
      );

      if (setResult !== "OK") {
        return yield* new CellClaimingWorkflowError({
          reason: "CellAlreadyClaimed",
          message: "Cell already claimed",
        });
      }

      const nextGrid = grid.map((gridRow) => [...gridRow]);
      nextGrid[row]![col] = { claimed: true, userId, userColor };

      yield* Result.await(repo.grid.set(sessionId, nextGrid));

      yield* Result.await(repo.cell.markFirstCellClaimed(sessionId, userId));

      const score = yield* Result.await(repo.scores.increment(sessionId, userId));

      return Result.ok({
        row,
        col,
        grid: nextGrid,
        score,
        isGameOver: isGameOver(nextGrid),
      });
    });
  };
