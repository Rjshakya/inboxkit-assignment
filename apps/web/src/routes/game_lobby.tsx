import { useCallback } from "react";

import { Button } from "@inboxkit-assignment/ui/components/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { useSession } from "@/hooks/use-session";
import { useGameSession } from "@/hooks/useGameSession";
import { useGameLobbySocket } from "@/hooks/useGameLobbySocket";
import { startGameSession } from "@/lib/game";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/game_lobby")({
  component: GameLobbyPage,
  validateSearch: z.object({ session: z.string() }),
});

function GameLobbyPage() {
  useSession();
  const { session: sessionId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: userData } = authClient.useSession();
  const { data: sessionData } = useGameSession(sessionId);

  const { connected, players, isInSession, requestToJoin } =
    useGameLobbySocket(sessionId);

  const isAdmin = sessionData?.createdBy === userData?.user?.id;

  const handleStartGame = useCallback(async () => {
    try {
      await startGameSession(sessionId);
      toast.success("Game started!");
      // Navigate to game grid page later: navigate({ to: `/${sessionId}` });
    } catch {
      toast.error("Failed to start game");
    }
  }, [sessionId]);

  if (!connected) {
    return (
      <div className="flex h-full w-full items-center justify-center text-neutral-400">
        Connecting to game server...
      </div>
    );
  }

  if (isInSession === null) {
    return (
      <div className="flex h-full w-full items-center justify-center text-neutral-400">
        Loading session...
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-8">
      <div className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <h1 className="mb-4 text-xl font-semibold text-white">Game Lobby</h1>
        <p className="mb-6 text-sm text-neutral-400">
          Session: <span className="font-mono text-neutral-200">{sessionId}</span>
        </p>

        <div className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-neutral-300">
            Players ({players.length})
          </h2>
          <div className="space-y-2">
            {players.length === 0 && (
              <p className="text-sm text-neutral-500">No players yet</p>
            )}
            {players.map((player) => (
              <div
                key={player.userId}
                className="flex items-center justify-between rounded bg-neutral-800 px-3 py-2 text-sm"
              >
                <span className="text-neutral-200">{player.username}</span>
                {player.userId === sessionData?.createdBy && (
                  <span className="rounded bg-neutral-700 px-2 py-0.5 text-xs text-neutral-300">
                    Admin
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {!isInSession && !isAdmin && (
          <Button onClick={requestToJoin} className="w-full">
            Join Session
          </Button>
        )}

        {isAdmin && (
          <Button
            onClick={handleStartGame}
            disabled={players.length < 2}
            className="w-full"
          >
            {players.length < 2
              ? "Need at least 2 players to start"
              : "Start Game"}
          </Button>
        )}

        {isInSession && !isAdmin && (
          <p className="text-center text-sm text-neutral-400">
            Waiting for admin to start the game...
          </p>
        )}
      </div>
    </div>
  );
}
