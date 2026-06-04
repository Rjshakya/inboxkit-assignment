import { useCallback, useEffect, useRef, useState } from "react";

import { useGameSocket } from "@/hooks/useGameSocket";
import { authClient } from "@/lib/auth-client";

const CELL_SIZE = 25;
const GRID_SIZE = 20;
const CANVAS_WIDTH = CELL_SIZE * GRID_SIZE;
const CANVAS_HEIGHT = CELL_SIZE * GRID_SIZE;

interface GameCanvasProps {
  sessionId: string;
}

export default function GameCanvas({ sessionId }: GameCanvasProps) {
  const { data } = authClient.useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { grid, userColor, connected, currentTurnUser, scores, claimCell } =
    useGameSocket(sessionId);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#0f0f0f";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Cells
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = grid[row][col];
        const px = col * CELL_SIZE;
        const py = row * CELL_SIZE;

        if (cell.claimed) {
          ctx.fillStyle = cell.userColor;
          ctx.fillRect(px + 0.5, py + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
        } else {
          ctx.fillStyle = "#1a1a1a";
          ctx.fillRect(px + 0.5, py + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
        }
      }
    }

    // Hover highlight
    if (hoverCell) {
      ctx.strokeStyle = userColor || "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(hoverCell.col * CELL_SIZE, hoverCell.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    // Grid lines
    ctx.strokeStyle = "#0a0a0a";
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
  }, [grid, userColor, hoverCell]);

  const getCellFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const row = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE) {
      return { row, col };
    }
    return null;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cell = getCellFromEvent(e);
      setHoverCell(cell);
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
        claimCell(cell.row, cell.col);
      }
    },
    [getCellFromEvent, claimCell],
  );

  if (!connected) {
    return (
      <div className="flex items-center justify-center text-sm text-neutral-400">
        Connecting to game server...
      </div>
    );
  }

  if (!grid) {
    return (
      <div className="flex items-center justify-center text-sm text-neutral-400">
        Loading grid...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full flex items-start justify-between gap-2">
        <div
          className={` px-4 py-2 rounded-lg text-sm font-medium ${
            currentTurnUser === data?.user?.id
              ? "bg-green-600 text-white"
              : "bg-neutral-800 text-neutral-300"
          }`}
        >
          {currentTurnUser === data?.user?.id ? "Your turn! (15 seconds)" : `Wait`}
        </div>

        {scores.length > 0 && (
          <div className="bg-neutral-900 rounded-lg p-3 text-sm min-w-[200px]">
            <h3 className="font-semibold text-white mb-2">Scores</h3>
            {scores.map((s, i) => (
              <div key={s.userId} className="flex justify-between py-1 text-neutral-300">
                <span>
                  {i + 1}. {s.username}
                </span>
                <span className="font-mono">{s.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className=" cursor-pointer rounded border border-[#222]"
      />
    </div>
  );
}
