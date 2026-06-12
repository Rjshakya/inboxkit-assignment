import { createFileRoute } from "@tanstack/react-router";

import GameCanvas from "@/components/GameCanvas";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/$sessionId")({
  component: SessionGamePage,
});

function SessionGamePage() {
  useSession();
  const { sessionId } = Route.useParams();

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <GameCanvas sessionId={sessionId} />
    </div>
  );
}
