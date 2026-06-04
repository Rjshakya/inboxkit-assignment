import { gameSessionTable, type gameSessionSelect } from "@inboxkit-assignment/db/schema/game";
import { db } from "@inboxkit-assignment/db";
import { Result, TaggedError } from "better-result";
import type { Redis } from "ioredis";
import { checkTurn } from "../lib/session";

/*
 * workflow - game
 *  - start new game session
 *  - user start playing game
 *  - user click on cell ,
 *  - send claiming event , - run cell claiming service
 *  - session ends
 *  - show session results
 *
 *  cell claiming service
 *   - input :
 *     - user id ,
 *     - session id ,
 *     - cell id ,
 *
 *   - output :
 *      - claimed : boolean ;
 *      - cell id
 *
 *   - rules :
 *     - turn by turn , each user can only claim the cell in their turn ,
 *     - each turn will have timeout of 15 seconds .
 *
 * */

class DBError extends TaggedError("DBError")<{
  message: string;
  operation: "INSERT" | "UPDATE" | "SELECT" | "DELETE" | "TRANSACTION";
}>() {}
type SessionStartWorkflowDeps = {
  db: typeof db;
};

type SessionStartWorkflowInput = {
  createdBy: string;
};

type SessionStartWorkflowOutput = Promise<Result<gameSessionSelect[], DBError>>;

export const sessionStartWorkflow =
  (deps: SessionStartWorkflowDeps) =>
  (input: SessionStartWorkflowInput): SessionStartWorkflowOutput => {
    const promise = Result.tryPromise({
      try: async () => {
        const res = await deps.db
          .insert(gameSessionTable)
          .values({ createdBy: input.createdBy })
          .returning();
        return res;
      },
      catch(cause) {
        return new DBError({
          message: String(cause),
          operation: "INSERT",
        });
      },
    });

    return promise;
  };

class RedisError extends TaggedError("RedisError")<{
  message: string;
  operation: string;
}>() {}

type Cell =
  | {
      claimed: false;
    }
  | {
      claimed: true;
      userId: string;
      userColor: string;
    };

export type CellClaimingWorkflowInput = {
  userId: string;
  sessionId: string;
  grid: Cell[][];
  userColor: string;
  row: number;
  col: number;
};

export type CellClaimingWorkflowDeps = {
  redis: Redis;
};

export type CellClaimingWorkflowOutput = Promise<
  Result<
    {
      claimed: boolean;
      row: number;
      col: number;
      sessionId: string;
      userId: string;
      userColor?: string;
      grid: Cell[][];
      error?: string;
    },
    RedisError
  >
>;

export const cellClaimingWorkflow =
  (deps: CellClaimingWorkflowDeps) =>
  (input: CellClaimingWorkflowInput): CellClaimingWorkflowOutput => {
    return Result.tryPromise({
      try: async () => {
        const { userId, sessionId, grid, userColor, row, col } = input;
        const cellId = `${row}:${col}`;
        const cellKey = `${cellId}:${sessionId}`;

        const isTurn = await checkTurn(sessionId, userId);
        if (!isTurn) {
          return {
            claimed: false,
            sessionId,
            row,
            col,
            userId,
            grid,
            error: "Not your turn",
          };
        }

        const claimResult = await deps.redis.set(cellKey, "1", "NX");
        if (claimResult !== "OK") {
          return {
            claimed: false,
            row,
            col,
            sessionId,
            userId,
            grid,
            error: "Cell already claimed",
          };
        }

        if (!grid[row]) {
          grid[row] = [];
        }

        grid[row][col] = {
          claimed: true,
          userId,
          userColor,
        };

        await deps.redis.set(`${sessionId}:grid`, JSON.stringify(grid));

        return {
          claimed: true,
          row,
          col,
          sessionId,
          userId,
          userColor,
          grid,
        };
      },
      catch(cause) {
        return new RedisError({
          message: String(cause),
          operation: "CELL_CLAIM",
        });
      },
    });
  };
