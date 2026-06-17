import { useCallback } from "react";

import { Button } from "@inboxkit-assignment/ui/components/button";
import { Link, useNavigate } from "@tanstack/react-router";
import { IconSparkles } from "@tabler/icons-react";

import { createGameSession } from "@/lib/game";

export function CTASection() {
  const navigate = useNavigate({ from: "/" });

  const handleCreateGame = useCallback(async () => {
    try {
      const id = await createGameSession();
      navigate({ to: "/lobby", search: { session: id } });
    } catch {
      navigate({ to: "/game" });
    }
  }, [navigate]);

  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <h2 className="text-balance text-4xl font-semibold lg:text-5xl">
            Ready to Conquer the Grid?
          </h2>
          <p className="text-muted-foreground mt-4">
            Create your first game room and challenge your friends in under a minute.
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" onClick={handleCreateGame} className="gap-2 px-8">
              <IconSparkles className="size-4" />
              Create a Game
            </Button>
            <Link to="/" hash="how-to-play">
              <Button size="lg" variant="outline" className="px-8">
                How to Play
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
