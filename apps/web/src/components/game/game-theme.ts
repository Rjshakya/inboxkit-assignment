import { GRID_SIZE } from "@inboxkit-assignment/game-types";

export const CELL_SIZE = 200;
export const CANVAS_WIDTH = CELL_SIZE * GRID_SIZE;
export const CANVAS_HEIGHT = CELL_SIZE * GRID_SIZE;

export const TURN_TOTAL_MS_DEFAULT = 30_000;
export const LOW_TIME_MS = 5_000;

export const crystalColors = {
  // Page / frame
  pageBg: "#1a0b2e",
  pageBgGradient: "radial-gradient(circle at 50% 30%, #2d1b4e 0%, #150821 60%, #0d0418 100%)",
  frameBg: "rgba(35, 18, 66, 0.85)",
  frameBorder: "#7c3aed",
  frameBorderOuter: "#4c1d95",
  frameGlow: "0 0 24px rgba(139, 92, 246, 0.45), inset 0 0 20px rgba(167, 139, 250, 0.15)",

  // Crystal accents
  cyan: "#22d3ee",
  magenta: "#e879f9",
  violet: "#8b5cf6",
  purple: "#a855f7",

  // Board
  boardBg: "#120724",
  gridLine: "rgba(124, 58, 237, 0.25)",
  cellUnclaimed: "#1e1038",
  cellUnclaimedDark: "#150827",
  cellUnclaimedLight: "#2a1550",
  cellHighlight: "#f0abfc",

  // Timer
  timerTrack: "rgba(255, 255, 255, 0.12)",
  timerFill: "#22d3ee",
  timerFillWarning: "#f43f5e",

  // Text
  textPrimary: "#f3e8ff",
  textSecondary: "#c4b5fd",
  textMuted: "#8b7bb5",
} as const;

export function hexToRgb(hex: string) {
  const sanitized = hex.replace("#", "");
  const bigint = Number.parseInt(sanitized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}
