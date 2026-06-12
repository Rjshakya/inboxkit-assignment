import { Result, TaggedError } from "better-result";
import type { NodePgDatabase } from "@inboxkit-assignment/db";
import type { Grid } from "@inboxkit-assignment/game-types";
import type Redis from "ioredis";

import { getSessionActivePlayer } from "./session";

export const GRID_SIZE = 20;

export const CellKey = (sessionId: string, row: number, col: number) =>
  `cell:${row}:${col}:${sessionId}`;

export const IsFirstTimeClaimingKey = (sessionId: string, userId: string) =>
  `session:${sessionId}:user:${userId}:isFirstTimeClaiming`;

export const SessionScoresKey = (sessionId: string) => `session:${sessionId}:scores`;
export const SessionGridKey = (sessionId: string) => `session:${sessionId}:grid`;

export class RedisError extends TaggedError("RedisError")<{
  message: string;
  operation: string;
}>() {}

export class CellClaimingWorkflowError extends TaggedError("CellClaimingWorkflowError")<{
  reason: "NotActivePlayer" | "CellAlreadyClaimed" | "NotAdjacent" | "OutOfBounds";
  message: string;
}>() {}

export const createEmptyGrid = () =>
  Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ claimed: false } as const)),
  );

export const isCellInBounds = (row: number, col: number) =>
  row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;

export const isGridFull = (grid: Grid) =>
  grid.every((row) => row.every((cell) => cell.claimed));

export const setSessionGrid =
  (redis: Redis) =>
  (input: { sessionId: string; grid: Grid }) => {
    const { sessionId, grid } = input;

    return Result.tryPromise({
      try: () => redis.set(SessionGridKey(sessionId), JSON.stringify(grid)).then(() => true),
      catch: (cause) =>
        new RedisError({
          message: String(cause),
          operation: "SET_GRID",
        }),
    });
  };

export const getSessionGrid = (redis: Redis) => (sessionId: string) => {
  return Result.gen(async function* () {
    const gridData = yield* Result.await(
      Result.tryPromise({
        try: () => redis.get(SessionGridKey(sessionId)),
        catch: (cause) =>
          new RedisError({
            message: String(cause),
            operation: "GET_GRID",
          }),
      }),
    );

    if (!gridData) {
      return Result.ok(null);
    }

    return Result.ok(JSON.parse(gridData) as Grid);
  });
};

export const ensureSessionGrid = (redis: Redis) => (sessionId: string) => {
  return Result.gen(async function* () {
    const existingGrid = yield* Result.await(getSessionGrid(redis)(sessionId));
    if (existingGrid) {
      return Result.ok(existingGrid);
    }

    const grid = createEmptyGrid();
    yield* Result.await(setSessionGrid(redis)({ sessionId, grid }));
    return Result.ok(grid);
  });
};

export const getSessionScore = (redis: Redis) => (sessionId: string) => {
  return Result.gen(async function* () {
    const scores = yield* Result.await(
      Result.tryPromise({
        try: () => redis.zrevrange(SessionScoresKey(sessionId), 0, -1, "WITHSCORES"),
        catch: (cause) =>
          new RedisError({
            message: String(cause),
            operation: "GET_SCORES",
          }),
      }),
    );

    const formattedScores: { userId: string; score: number }[] = [];
    for (let index = 0; index < scores.length; index += 2) {
      const userId = scores[index];
      const score = scores[index + 1];
      if (userId && score) {
        formattedScores.push({
          userId,
          score: Number.parseInt(score, 10),
        });
      }
    }

    return Result.ok(formattedScores);
  });
};

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

      const isNotFirstTimeClaiming = yield* Result.await(
        Result.tryPromise({
          try: () => redis.get(IsFirstTimeClaimingKey(sessionId, userId)),
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "GET_FIRST_TIME_CLAIMING",
            }),
        }),
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
        Result.tryPromise({
          try: () =>
            redis.set(CellKey(sessionId, row, col), JSON.stringify({ userId, userColor }), "NX"),
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "SET_CELL",
            }),
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

      yield* Result.await(setSessionGrid(redis)({ sessionId, grid: nextGrid }));

      yield* Result.await(
        Result.tryPromise({
          try: () => redis.setnx(IsFirstTimeClaimingKey(sessionId, userId), "1"),
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "SET_FIRST_TIME_CLAIMING",
            }),
        }),
      );

      const score = yield* Result.await(
        Result.tryPromise({
          try: () => redis.zincrby(SessionScoresKey(sessionId), 1, userId).then(Number),
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "ZINCRBY",
            }),
        }),
      );

      return Result.ok({
        row,
        col,
        grid: nextGrid,
        score,
        isGameOver: isGridFull(nextGrid),
      });
    });
  };
