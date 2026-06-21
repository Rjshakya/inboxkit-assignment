import { motion } from "motion/react";

export function GridPreview() {
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
      <div className="h-full w-full rounded-md bg-[#1c1417] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" />
    );
  }

  const isGreen = type === "g";
  const baseColor = isGreen ? "#064e3b" : "#155e75";
  const faceGradient = isGreen
    ? "linear-gradient(180deg, #34d399 0%, #059669 100%)"
    : "linear-gradient(180deg, #22d3ee 0%, #0891b2 100%)";

  return (
    <div
      className="relative h-full w-full rounded-md shadow-sm"
      style={{ backgroundColor: baseColor }}
    >
      <div
        className="absolute inset-x-0 top-0 rounded-md"
        style={{ height: "88%", background: faceGradient }}
      >
        <div className="absolute inset-x-[5%] top-[5%] h-[40%] rounded-md bg-gradient-to-b from-white/45 to-transparent" />
      </div>
    </div>
  );
}
