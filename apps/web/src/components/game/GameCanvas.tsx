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

    // Board background
    ctx.fillStyle = crystalColors.boardBg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = grid[row]?.[col];
        if (!cell) continue;
        drawCrystalCell(ctx, row, col, cell.claimed ? cell.userColor : null);
      }
    }

    // Hover highlight
    if (hoverCell) {
      const { row, col } = hoverCell;
      const px = col * CELL_SIZE;
      const py = row * CELL_SIZE;
      ctx.save();
      ctx.shadowColor = crystalColors.cellHighlight;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = crystalColors.cellHighlight;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      ctx.restore();
    }

    // Grid lines
    ctx.strokeStyle = crystalColors.gridLine;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(CANVAS_WIDTH, pos);
      ctx.stroke();
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
      className="relative  max-w-full rounded-sm overflow-hidden"
      style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
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

function drawCrystalCell(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  color: string | null,
) {
  const px = col * CELL_SIZE;
  const py = row * CELL_SIZE;

  // Keycap geometry
  const gap = 3;
  const borderWidth = 2;
  const radius = 7;
  const x = px + gap;
  const y = py + gap;
  const w = CELL_SIZE - gap * 2;
  const h = CELL_SIZE - gap * 2;
  const innerX = x + borderWidth;
  const innerY = y + borderWidth;
  const innerW = w - borderWidth * 2;
  const innerH = h - borderWidth * 2;
  const innerRadius = Math.max(0, radius - borderWidth);

  ctx.save();

  // 1. Thick dark outline around the keycap
  ctx.fillStyle = "#13131a";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();

  // 2. Keycap face base color
  if (color) {
    ctx.fillStyle = color;
  } else {
    const baseGrad = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerH);
    baseGrad.addColorStop(0, "#4b4b5c");
    baseGrad.addColorStop(1, "#2c2c38");
    ctx.fillStyle = baseGrad;
  }
  ctx.beginPath();
  ctx.roundRect(innerX, innerY, innerW, innerH, innerRadius);
  ctx.fill();

  // 3. Soft top glossy highlight (makes the key look puffy/rounded)
  const highlightGrad = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerH * 0.6);
  highlightGrad.addColorStop(0, "rgba(255, 255, 255, 0.55)");
  highlightGrad.addColorStop(0.3, "rgba(255, 255, 255, 0.18)");
  highlightGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = highlightGrad;
  ctx.beginPath();
  ctx.roundRect(innerX, innerY, innerW, innerH, innerRadius);
  ctx.fill();

  // 4. Bottom shadow gradient for depth
  const bottomShadowGrad = ctx.createLinearGradient(
    innerX,
    innerY + innerH * 0.4,
    innerX,
    innerY + innerH,
  );
  bottomShadowGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
  bottomShadowGrad.addColorStop(0.6, "rgba(0, 0, 0, 0.25)");
  bottomShadowGrad.addColorStop(1, "rgba(0, 0, 0, 0.45)");
  ctx.fillStyle = bottomShadowGrad;
  ctx.beginPath();
  ctx.roundRect(innerX, innerY, innerW, innerH, innerRadius);
  ctx.fill();

  // 5. Thin bright specular strip at the top
  ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
  ctx.beginPath();
  ctx.roundRect(innerX + 2, innerY + 2, innerW - 4, innerH * 0.2, innerRadius * 0.5);
  ctx.fill();

  ctx.restore();
}
