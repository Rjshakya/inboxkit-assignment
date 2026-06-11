export type GridCell = { claimed: false } | { claimed: true; userId: string; userColor: string };

export type Grid = GridCell[][];

export type ScoreEntry = { userId: string; username: string; score: number };

/**
 * Unified message protocol for client-server communication.
 * Direction is implicit by context (who sends vs who receives).
 */
export type Message =
  // Client → Server
  | { type: "joinSession"; sessionId: string }
  | { type: "claim"; sessionId: string; grid: Grid; userColor: string; row: number; col: number }
  | { type: "getTurn"; sessionId: string }
  | { type: "getGrid"; sessionId: string }
  | { type: "setGrid"; sessionId: string; grid: Grid }
  | { type: "getScores"; sessionId: string }
  | { type: "get_session_players"; sessionId: string }
  | { type: "check_player_exist_in_session"; sessionId: string }
  | { type: "request_to_join_session"; sessionId: string }
  | {
      type: "accept_request_to_join_session";
      sessionId: string;
      forUser: { userId: string; username: string };
    }
  | {
      type: "decline_request_to_join_session";
      sessionId: string;
      forUser: { userId: string; username: string };
    }
  | { type: "ping" }

  // Server → Client
  | { type: "init"; userId: string; color: string; username: string }
  | { type: "joined"; success: boolean }
  | { type: "joined_broadcast"; userId: string; color: string; username: string }
  | { type: "cellClaimed"; row: number; col: number; userId: string; userColor: string; grid: Grid }
  | { type: "turnChanged"; userTurn: string }
  | { type: "turnData"; userTurn: string | null; isMyTurn: boolean }
  | { type: "gridData"; grid: Grid | null }
  | { type: "gridSet"; success: boolean }
  | { type: "scoresData"; scores: ScoreEntry[] }
  | { type: "session_players"; players: { userId: string; username: string }[] }
  | { type: "check_player_exist_in_session_result"; result: boolean; userId: string }
  | { type: "request_declined"; sessionId: string; message: string }
  | { type: "error"; message: string }

  // Bidirectional (server forwards/broadcasts)
  | {
      type: "request_to_join_session_dm";
      fromUser: { userId: string; username: string };
      toUser: { userId: string };
    }
  | {
      type: "session_joined";
      user: { userId: string; username: string };
      players: { userId: string; username: string }[];
      msg: string;
    }
  | { type: "player_left"; userId: string }
  | { type: "player_removed_from_session"; userId: string }
  | { type: "activePlayerChanged"; userId: string; expiry: number };

export type BroadCastMessage<T> = {
  data: T;
  exceptUserId?: string;
};

export type DMMessage<T> = {
  data: T;
};
