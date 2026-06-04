export type GridCell = { claimed: false } | { claimed: true; userId: string; userColor: string };

export type Grid = GridCell[][];

export type ClientMessage =
  | { type: "joinSession"; data: { sessionId: string } }
  | {
      type: "claim";
      data: { sessionId: string; grid: Grid; userColor: string; row: number; col: number };
    }
  | { type: "getTurn"; data: { sessionId: string } }
  | { type: "getGrid"; data: { sessionId: string } }
  | { type: "setGrid"; data: { sessionId: string; grid: Grid } }
  | { type: "getScores"; data: { sessionId: string } }
  | { type: "ping" };

export type ScoreEntry = { userId: string; username: string; score: number };

export type ServerMessage =
  | { type: "init"; userId: string; color: string; username: string }
  | { type: "joined"; success: boolean }
  | { type: "joined_broadcast"; userId: string; color: string; username: string }
  | { type: "cellClaimed"; row: number; col: number; userId: string; userColor: string; grid: Grid }
  | { type: "turnChanged"; userTurn: string }
  | { type: "turnData"; userTurn: string | null; isMyTurn: boolean }
  | { type: "gridData"; grid: Grid | null }
  | { type: "gridSet"; success: boolean }
  | { type: "scoresData"; scores: ScoreEntry[] }
  | { type: "error"; message: string };

export type BroadCastMessage<T> = {
  data: T;
  exceptUserId?: string;
};
