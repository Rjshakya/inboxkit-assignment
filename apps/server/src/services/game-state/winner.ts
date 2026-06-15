import { redisRepo } from "@/redis/repo";
import { Result } from "better-result";
import type Redis from "ioredis";
import { DBError } from "../shared";
import { eq, type NodePgDatabase } from "@inboxkit-assignment/db";
import { user } from "@inboxkit-assignment/db/schema/auth";

export const declareWinner =
  (deps: { redis: Redis; db: NodePgDatabase<any> }) => (input: { sessionId: string }) => {
    const { redis, db } = deps;
    const { sessionId } = input;
    const repo = redisRepo({ redis });

    return Result.gen(async function* () {
      const scores = yield* Result.await(repo.scores.get(sessionId));
      const winnerId = scores[0]?.userId;

      if (!winnerId) return Result.ok(null);

      const winnerDetails = yield* Result.await(
        Result.tryPromise({
          try: async () => {
            return await db
              .select({
                id: user.id,
                email: user.email,
                image: user.image,
              })
              .from(user)
              .where(eq(user.id, winnerId));
          },
          catch: (e) => {
            return new DBError({ operation: "QUERY", message: String(e) });
          },
        }),
      );
      return Result.ok(winnerDetails);
    });
  };
