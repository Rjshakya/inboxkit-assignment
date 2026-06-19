import { createFileRoute } from "@tanstack/react-router";

import GameSession from "@/components/game/GameSession";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/$sessionId")({
  component: SessionGamePage,
});

function SessionGamePage() {
  useSession();
  const { sessionId } = Route.useParams();

  return (
    <div className="size-full bg-[#2d2024] ">
      <GameSession sessionId={sessionId} />
    </div>
  );
}
