import { Result, TaggedError } from "better-result";
import { getSessionActivePlayer } from "./session";
import type { NodePgDatabase } from "@inboxkit-assignment/db";
import type Redis from "ioredis";
import type { Grid } from "@inboxkit-assignment/game-types";

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
  reason: "NotActivePlayer" | "CellAlreadyClaimed" | "NotAdjacent";
  message: string;
}>() {}

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
      const activePlayer = yield* Result.await(
        getSessionActivePlayer(redis)(sessionId),
      );

      if (!activePlayer || activePlayer.userId !== userId) {
        return yield* new CellClaimingWorkflowError({
          reason: "NotActivePlayer",
          message: "Not your turn",
        });
      }

      const cellValue = yield* Result.await(
        Result.tryPromise({
          try: () => redis.get(CellKey(sessionId, row, col)),
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "GET_CELL",
            }),
        }),
      );

      if (cellValue) {
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
        const adjacentCells = yield* Result.await(
          Result.tryPromise({
            try: () =>
              Promise.all([
                redis.get(CellKey(sessionId, row - 1, col)),
                redis.get(CellKey(sessionId, row + 1, col)),
                redis.get(CellKey(sessionId, row, col - 1)),
                redis.get(CellKey(sessionId, row, col + 1)),
              ]),
            catch: (cause) =>
              new RedisError({
                message: String(cause),
                operation: "GET_ADJACENT_CELLS",
              }),
          }),
        );

        const hasAdjacentClaim = adjacentCells.some((cell) => {
          if (!cell) {
            return false;
          }
          const cellData = JSON.parse(cell) as { userId: string };
          return cellData.userId === userId;
        });

        if (!hasAdjacentClaim) {
          yield* new CellClaimingWorkflowError({
            reason: "NotAdjacent",
            message: "Cell must be adjacent to your territory",
          });
        }
      }

      yield* Result.await(
        Result.tryPromise({
          try: () =>
            redis.set(
              CellKey(sessionId, row, col),
              JSON.stringify({ userId, userColor }),
            ),
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "SET_CELL",
            }),
        }),
      );

      yield* Result.await(
        Result.tryPromise({
          try: () =>
            redis.setnx(IsFirstTimeClaimingKey(sessionId, userId), "1"),
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "SET_FIRST_TIME_CLAIMING",
            }),
        }),
      );

      yield* Result.await(
        Result.tryPromise({
          try: () =>
            redis.zincrby(SessionScoresKey(sessionId), 1, userId),
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "ZINCRBY",
            }),
        }),
      );

      return Result.ok({
        claimSuccess: true,
        claimError: null,
        row,
        col,
      });
    });
  };

export const setSessionGrid =
  (redis: Redis) =>
  (input: { sessionId: string; grid: Grid }) => {
    const { sessionId, grid } = input;

    return Result.gen(async function* () {
      yield* Result.await(
        Result.tryPromise({
          try: () =>
            redis.set(SessionGridKey(sessionId), JSON.stringify(grid)),
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "SET_GRID",
            }),
        }),
      );

      return Result.ok(true);
    });
  };

export const getSessionGrid =
  (redis: Redis) =>
  (sessionId: string) => {
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

export const getSessionScore =
  (redis: Redis) =>
  (sessionId: string) => {
    return Result.gen(async function* () {
      const scores = yield* Result.await(
        Result.tryPromise({
          try: () =>
            redis.zrevrange(
              SessionScoresKey(sessionId),
              0,
              -1,
              "WITHSCORES",
            ),
          catch: (cause) =>
            new RedisError({
              message: String(cause),
              operation: "GET_SCORES",
            }),
        }),
      );

      const formattedScores: { userId: string; score: number }[] = [];
      for (let i = 0; i < scores.length; i += 2) {
        const userId = scores[i];
        const score = scores[i + 1];
        if (userId && score) {
          formattedScores.push({
            userId,
            score: parseInt(score, 10),
          });
        }
      }

      return Result.ok(formattedScores);
    });
  };
