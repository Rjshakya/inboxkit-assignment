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
    <div className="size-full bg-[oklch(0.17 0.025 302.3)] ">
      <GameSession sessionId={sessionId} />
    </div>
  );
}
