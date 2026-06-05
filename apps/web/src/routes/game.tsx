import { Button } from "@inboxkit-assignment/ui/components/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";
import { z } from "zod";

import GameCanvas from "@/components/GameCanvas";
import { useSession } from "@/hooks/use-session";
import { createGameSession } from "@/lib/game";

export const Route = createFileRoute("/game")({
  component: GamePage,
  validateSearch: z.object({ sessionId: z.string().optional() }),
});

function GamePage() {
  useSession();
  const { sessionId } = Route.useSearch();
  const navigate = useNavigate({ from: "/game" });

  const handleStartNewGame = useCallback(async () => {
    try {
      const id = await createGameSession();
      navigate({ to: "/game", search: { sessionId: id } });
    } catch {
      toast.error("Failed to create game session");
    }
  }, [navigate]);

  if (!sessionId) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a]">
        <Button onClick={handleStartNewGame} size="lg">
          Start New Game
        </Button>
      </div>
    );
  }

  return (
    <div className="p-5 flex h-full w-full items-center justify-center bg-[#0a0a0a] ">
      <GameCanvas sessionId={sessionId} />
    </div>
  );
}
