import type { Grid } from "@inboxkit-assignment/game-types";

export const isGridFull = (grid: Grid) => grid.every((row) => row.every((cell) => cell.claimed));

export const isGameOver = (grid: Grid, players?: string[]) =>
  isGridFull(grid) || (players !== undefined && players.length === 0);
