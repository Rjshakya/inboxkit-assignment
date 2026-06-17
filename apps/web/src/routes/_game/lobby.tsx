import { useCallback } from "react";

import { Button } from "@inboxkit-assignment/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@inboxkit-assignment/ui/components/ui/card";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { useSession } from "@/hooks/use-session";
import { useGameLobbySocket } from "@/hooks/useGameLobbySocket";
import { useGameSession } from "@/hooks/useGameSession";
import { authClient } from "@/lib/auth-client";
import { startGameSession } from "@/lib/game";

export const Route = createFileRoute("/_game/lobby")({
  component: LobbyPage,
  validateSearch: z.object({ session: z.string() }),
});

function LobbyPage() {
  useSession();
  const navigate = useNavigate();
  const { session: sessionId } = Route.useSearch();
  const { data: userData } = authClient.useSession();
  const { data: sessionData, error, isFetching } = useGameSession(sessionId);

  const { connected, players, isInSession, requestToJoin, removePlayerFromSession } =
    useGameLobbySocket(sessionId);

  const isAdmin = sessionData?.createdBy === userData?.user?.id;

  const handleStartGame = useCallback(async () => {
    try {
      await startGameSession(sessionId);
      toast.success("Game started!");
      navigate({ to: "/$sessionId", params: { sessionId } });
    } catch {
      toast.error("Failed to start game");
    }
  }, [navigate, sessionId]);

  if (isFetching) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        {error?.message}
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        Connecting to game server...
      </div>
    );
  }

  if (isInSession === null) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        Loading session...
      </div>
    );
  }

  return (
    <div className="mt-14 flex h-full w-full ">
      <Card variant="outline" className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Game Lobby</CardTitle>
          <CardDescription>
            Session: <span className="font-mono text-foreground">{sessionId}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-medium">Players ({players.length})</h2>
            <div className="space-y-2">
              {players.length === 0 && (
                <p className="text-sm text-muted-foreground">No players yet</p>
              )}
              {players.map((player) => (
                <div
                  key={player.userId}
                  className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"
                >
                  <span className="text-foreground">{player.username}</span>
                  <div className="flex items-center gap-2">
                    {player.userId === sessionData?.createdBy && (
                      <span className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                        Admin
                      </span>
                    )}
                    {isAdmin && player.userId !== userData?.user?.id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removePlayerFromSession(player.userId)}
                        className="h-6 px-2 text-xs"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
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
            <Button onClick={handleStartGame} disabled={players.length < 2} className="w-full">
              {players.length < 2 ? "Need at least 2 players to start" : "Start Game"}
            </Button>
          )}

          {isInSession && !isAdmin && (
            <p className="text-center text-sm text-muted-foreground">
              Waiting for admin to start the game...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
