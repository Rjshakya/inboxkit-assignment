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
          <Card className="relative overflow-hidden border-[#4c1d95] bg-[#1a0b2e] p-3">
            <CardContent className="bg-[#120724] aspect-square rounded-2xl p-4">
              <GridPreview2 />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

function GridPreview2() {
  const size = 8;
  const cells = Array.from({ length: size * size }, (_, i) => i);

  // 8×8 wave pattern: green (g), cyan (c), empty (null)
  const pattern: ("g" | "c" | null)[][] = [
    ["g", "g", null, null, null, null, null, null],
    ["g", "g", null, null, null, null, null, null],
    ["g", "g", "g", "g", "g", "g", "g", "g"],
    ["g", "g", "g", "g", "c", "c", "c", "c"],
    ["g", "g", "g", "c", "c", "c", "c", "c"],
    [null, "g", "g", "c", "c", "c", "c", "c"],
    [null, null, "g", "g", "c", "c", "c", "c"],
    [null, null, "g", "g", "c", "c", "c", "c"],
  ];

  const getCell = (index: number) => {
    const x = index % size;
    const y = Math.floor(index / size);
    return pattern[y]?.[x] ?? null;
  };

  return (
    <div className="grid h-full w-full grid-cols-8 gap-1.5">
      {cells.map((i) => {
        const x = i % size;
        const y = Math.floor(i / size);
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.4,
              delay: 0.2 + x * 0.04 + y * 0.04,
            }}
            className="aspect-square"
          >
            <CandyCell type={getCell(i)} />
          </motion.div>
        );
      })}
    </div>
  );
}

function CandyCell({ type }: { type: "g" | "c" | null }) {
  if (!type) {
    return (
      <div className="h-full w-full rounded-2xl bg-[#1c1417] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" />
    );
  }

  const isGreen = type === "g";
  const baseColor = isGreen ? "#064e3b" : "#155e75";
  const faceGradient = isGreen
    ? "linear-gradient(180deg, #34d399 0%, #059669 100%)"
    : "linear-gradient(180deg, #22d3ee 0%, #0891b2 100%)";

  return (
    <div
      className="relative h-full w-full rounded-2xl shadow-sm"
      style={{ backgroundColor: baseColor }}
    >
      <div
        className="absolute inset-x-0 top-0 rounded-2xl"
        style={{ height: "88%", background: faceGradient }}
      >
        <div className="absolute inset-x-[12%] top-[10%] h-[32%] rounded-lg bg-gradient-to-b from-white/45 to-transparent" />
      </div>
    </div>
  );
}

export function GridPreview() {
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
