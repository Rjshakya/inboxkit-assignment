import { Result } from "better-result";
import { and, eq, type NodePgDatabase } from "@inboxkit-assignment/db";
import { gameSessionTable } from "@inboxkit-assignment/db/schema/game";
import type Redis from "ioredis";

import { redisRepo } from "@/redis/repo";
import { DBError } from "@/services/shared/errors";
import { getSessionPlayersDetails } from "@/services/session-player/player";

import { SessionError } from "./errors";

export const TURN_DURATION_MS = 15 * 1000;

export const startSessionWorkflow =
  (deps: { db: NodePgDatabase<any>; redis: Redis }) =>
  (input: { sessionId: string; startedBy: string }) => {
    const { db, redis } = deps;
    const { sessionId, startedBy } = input;

    return Result.gen(async function* () {
      const sessionCreator = yield* Result.await(
        Result.tryPromise({
          try: () => {
            return db
              .select()
              .from(gameSessionTable)
              .where(
                and(eq(gameSessionTable.id, sessionId), eq(gameSessionTable.createdBy, startedBy)),
              )
              .limit(1);
          },
          catch: (e) => {
            return new DBError({
              message: String(e),
              operation: "Get session by sessionId and createdBy",
            });
          },
        }),
      );

      if (!sessionCreator || !sessionCreator.length) {
        return yield* new SessionError({
          reason: "AdminRequired",
          message: "Only Admin can start session",
        });
      }

      const players = yield* Result.await(getSessionPlayersDetails({ db })(sessionId));

      if (!players.length || players.length < 2) {
        return yield* new SessionError({
          reason: "NotEnoughPlayers",
          message: "Not enough players in session",
        });
      }

      const repo = redisRepo({ redis });

      const startedAt = yield* Result.await(repo.sessionMeta.setStartedAt(sessionId, Date.now()));
      console.log("startedAt", startedAt);
      if (!startedAt) {
        return yield* new SessionError({
          reason: "AlreadyStarted",
          message: "Session is already started",
        });
      }

      const startedByResult = yield* Result.await(
        repo.sessionMeta.setStartedBy(sessionId, startedBy),
      );
      if (!startedByResult) {
        return yield* new SessionError({
          reason: "AlreadyStartedByOther",
          message: "Session is already started by someone",
        });
      }

      const activePlayer = {
        userId: startedBy,
        expiry: Date.now() + TURN_DURATION_MS,
      };

      yield* Result.await(repo.activePlayer.set(sessionId, activePlayer));

      return Result.ok({
        activePlayer,
        players,
      });
    });
  };
