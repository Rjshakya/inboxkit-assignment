import { useCallback } from "react";

import { Button } from "@inboxkit-assignment/ui/components/button";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";

import { Card, CardContent } from "@inboxkit-assignment/ui/components/ui/card";

import { GridPreview } from "@/components/game/GridPreview";

export function HeroSection() {
  const navigate = useNavigate({ from: "/" });

  const handleCreateGame = useCallback(async () => {
    navigate({ to: "/game" });
  }, [navigate]);

  return (
    <section className="relative @container py-24">
      <div className="mx-auto max-w-2xl px-6 ">
        <div>
          <h1 className="font-heading text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            Conquer the Board.
          </h1>

          <p className="text-muted-foreground mt-6 max-w-xl text-pretty text-sm md:text-lg">
            Conquest is a real-time multiplayer strategy game. Create a room, invite friends, and
            outmaneuver opponents on a game board.
          </p>

          <div className="mt-8 flex items-center justify-start gap-3 sm:flex-row">
            <Button size="lg" onClick={handleCreateGame} className="gap-2 px-8">
              Start now
            </Button>
            <Link to="/" hash="how-to-play">
              <Button size="lg" variant="outline" className="px-8">
                How to Play
              </Button>
            </Link>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" as const }}
          className="mt-20"
        >
          <Card className="relative overflow-hidden border-[#4c1d95] bg-[#1a0b2e] p-3">
            <CardContent className="bg-[#120724] aspect-square rounded-2xl p-4">
              <GridPreview />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}


