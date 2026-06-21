import { useCallback, useEffect, useRef, useState } from "react";

import { CANVAS_HEIGHT, CANVAS_WIDTH, CELL_SIZE, crystalColors } from "./game-theme";

import { GRID_SIZE, type Grid } from "@inboxkit-assignment/game-types";

interface GameCanvasProps {
  grid: Grid;
  userColor: string | null;
  onCellClick: (row: number, col: number) => void;
}

export default function GameCanvas({ grid, userColor, onCellClick }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    // Board panel
    ctx.save();

    ctx.shadowColor = "rgba(0,0,0,.45)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;

    // ctx.fillStyle = "#2d2024";

    ctx.fillStyle = "oklch(0.17 0.025 302.3)"

    ctx.beginPath();
    ctx.roundRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 20);
    ctx.fill();

    ctx.restore();

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = grid[row]?.[col];
        if (!cell) continue;
        drawCell(ctx, row, col, cell.claimed ? cell.userColor : null);
      }
    }

    // Hover highlight
    if (hoverCell) {
      const { row, col } = hoverCell;
      const gap = 6;
      const px = col * CELL_SIZE + gap / 2;
      const py = row * CELL_SIZE + gap / 2;
      const size = CELL_SIZE - gap;
      const radius = size * 0.32;
      ctx.save();
      ctx.shadowColor = crystalColors.cellHighlight;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = crystalColors.cellHighlight;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(px + 1, py + 1, size - 2, size - 2, radius);
      ctx.stroke();
      ctx.restore();
    }
  }, [grid, hoverCell, userColor]);

  const getCellFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const displayedCellSize = rect.width / GRID_SIZE;
    const col = Math.floor((e.clientX - rect.left) / displayedCellSize);
    const row = Math.floor((e.clientY - rect.top) / displayedCellSize);
    if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE) {
      return { row, col };
    }
    return null;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      setHoverCell(getCellFromEvent(e));
    },
    [getCellFromEvent],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverCell(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cell = getCellFromEvent(e);
      if (cell) {
        onCellClick(cell.row, cell.col);
      }
    },
    [getCellFromEvent, onCellClick],
  );

  return (
    <div
      className="relative max-w-full rounded-sm overflow-hidden"
      style={{
        aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        // Optional: swap the flat board fill above for this diamond texture instead —
        // cheaper than redrawing a pattern in canvas every frame.
        // backgroundImage: "repeating-linear-gradient(45deg, #3a2a2e 0 10px, #33252a 10px 20px)",
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="cursor-pointer absolute inset-0 w-full h-full block"
      />
    </div>
  );
}

/**
 * Lightens (positive percent) or darkens (negative percent) a 6-digit hex color.
 * Expects "#rrggbb". Normalize userColor to hex before calling this if it can
 * arrive as rgb(...) or a CSS color name.
 */
function shadeColor(hex: string, percent: number): string {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  r = Math.min(255, Math.max(0, Math.round((r * (100 + percent)) / 100)));
  g = Math.min(255, Math.max(0, Math.round((g * (100 + percent)) / 100)));
  b = Math.min(255, Math.max(0, Math.round((b * (100 + percent)) / 100)));

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  color: string | null,
) {
  const gap = 6; // bigger gap than before — cells read as distinct blocks, no grid lines needed
  const px = col * CELL_SIZE;
  const py = row * CELL_SIZE;

  const x = px + gap / 2;
  const y = py + gap / 2;
  const size = CELL_SIZE - gap;
  const radius = size * 0.32; // proportional radius — squircle, not a barely-rounded square

  ctx.save();

  if (!color) {
    // ==========================================
    // EMPTY SLOT — plain dark void
    // ==========================================
    // ctx.fillStyle = "#1c1417";
    
    ctx.fillStyle = "oklch(0.2795 0.025 302.3)"
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, radius -10);
    ctx.fill();

    ctx.restore();
    return;
  }

  // ==========================================
  // CLAIMED CELL — duotone "candy" block
  // ==========================================
  const lip = size * 0.16; // thickness of the dark rim peeking out at the bottom

  // 1. Base/shadow layer — full cell, darker shade of the color
  ctx.fillStyle = shadeColor(color, -38);
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, radius - 10);
  ctx.fill();

  // 2. Face layer — main color, shorter, so the base layer peeks out as a lip
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size - lip, radius - 10);
  ctx.fill();

  // 3. Gloss highlight on the top portion
  const gloss = ctx.createLinearGradient(x, y, x, y + size * 0.5);
  gloss.addColorStop(0, "rgba(255,255,255,0.5)");
  gloss.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 3, size - 6, size * 0.4, radius - 12);
  ctx.fill();

  ctx.restore();
}
