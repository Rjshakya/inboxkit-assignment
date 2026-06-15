import { Result } from "better-result";
import { eq, type NodePgDatabase } from "@inboxkit-assignment/db";
import { gameSessionTable } from "@inboxkit-assignment/db/schema/game";
import type Redis from "ioredis";

import { DBError } from "@/services/shared/errors";
import { addPlayerInSession } from "@/services/session-player/player";

import { SessionError } from "./errors";

export type CreateSessionWorkflowDeps = {
  db: NodePgDatabase<any>;
  redis: Redis;
};

export type CreateSessionWorkflowInput = {
  userId: string;
};

export const createSessionWorkflow =
  (deps: CreateSessionWorkflowDeps) => (input: CreateSessionWorkflowInput) => {
    const payload = { createdBy: input.userId };
    return Result.gen(async function* () {
      const session = yield* Result.await(
        Result.tryPromise({
          try: () => deps.db.insert(gameSessionTable).values(payload).returning(),
          catch: (cause) =>
            new DBError({
              message: String(cause),
              operation: "INSERT",
            }),
        }),
      );

      if (!session[0]?.id) {
        return yield* new SessionError({
          reason: "NotFound",
          message: "Failed to create session",
        });
      }

      yield* Result.await(
        addPlayerInSession({ db: deps.db, redis: deps.redis })({
          sessionId: session[0].id,
          userId: input.userId,
        }),
      );

      return Result.ok({
        sessionId: session[0].id,
        userId: input.userId,
      });
    });
  };

export const getGameSession = (db: CreateSessionWorkflowDeps["db"]) => (sessionId: string) => {
  return Result.tryPromise({
    try: async () => {
      const res = await db
        .select()
        .from(gameSessionTable)
        .where(eq(gameSessionTable.id, sessionId));
      return res;
    },
    catch: (e) => {
      return new DBError({
        message: "QUERY",
        operation: String(e),
      });
    },
  });
};
