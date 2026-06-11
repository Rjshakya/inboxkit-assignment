import { Button } from "@inboxkit-assignment/ui/components/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";

import { useSession } from "@/hooks/use-session";
import { createGameSession } from "@/lib/game";

export const Route = createFileRoute("/game")({
  component: GamePage,
});

function GamePage() {
  useSession();
  const navigate = useNavigate({ from: "/game" });

  const handleCreateRoom = useCallback(async () => {
    try {
      const id = await createGameSession();
      navigate({ to: "/game_lobby", search: { session: id } });
    } catch {
      toast.error("Failed to create game session");
    }
  }, [navigate]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Button onClick={handleCreateRoom} size="lg">
        Create a room
      </Button>
    </div>
  );
}
