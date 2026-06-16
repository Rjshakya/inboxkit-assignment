import { useCallback } from "react";

import { Button } from "@inboxkit-assignment/ui/components/button";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";

import { Card, CardContent } from "@inboxkit-assignment/ui/components/ui/card";

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
            outmaneuver opponents on a shared 20×20 grid.
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
          <Card className="relative overflow-hidden p-2">
            <CardContent className="aspect-square ring-1 ring-border rounded-2xl">
              <GridPreview />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

function GridPreview() {
  const rows = 12;
  const cols = 20;
  const cells = Array.from({ length: rows * cols }, (_, i) => i);
  const colors = ["bg-chart-1", "bg-chart-3", "bg-chart-5", "bg-primary"];

  // Deterministic pseudo-random pattern to avoid SSR hydration mismatch
  const getCellColor = (index: number) => {
    const x = index % cols;
    const y = Math.floor(index / cols);
    const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const normalized = value - Math.floor(value);
    if (normalized > 0.65) {
      return colors[index % colors.length];
    }
    return "bg-muted";
  };

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div
        className="grid gap-0.5"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          width: "100%",
          maxWidth: "560px",
        }}
      >
        {cells.map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.4,
              delay: 0.2 + (i % cols) * 0.02 + Math.floor(i / cols) * 0.02,
            }}
            className={`aspect-square rounded-[1px] ${getCellColor(i)}`}
          />
        ))}
      </div>
    </div>
  );
}
