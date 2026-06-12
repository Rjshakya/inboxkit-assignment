export type GridCell = { claimed: false } | { claimed: true; userId: string; userColor: string };

export type Grid = GridCell[][];

export type ScoreEntry = { userId: string; username: string; score: number };

export type SessionPlayer = {
  userId: string;
  username: string;
  color?: string;
};

export type ActivePlayer = {
  userId: string;
  expiry: number;
};

export type GameState = {
  sessionId: string;
  grid: Grid;
  activePlayer: ActivePlayer | null;
  scores: ScoreEntry[];
  players: SessionPlayer[];
  status: "waiting" | "active" | "finished";
  winnerUserId: string | null;
};

/**
 * Unified message protocol for client-server communication.
 * Direction is implicit by context.
 */
export type Message =
  // Client to Server
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
  | { type: "remove_player_from_session"; sessionId: string; userId: string }
  | { type: "get_game_state"; sessionId: string }
  | { type: "claim_cell"; sessionId: string; row: number; col: number }
  | { type: "turn_expired"; sessionId: string }
  | { type: "ping" }

  // Server to Client
  | { type: "session_players"; players: SessionPlayer[] }
  | { type: "check_player_exist_in_session_result"; result: boolean; userId: string }
  | {
      type: "request_declined";
      sessionId: string;
      message: string;
      user: { userId: string; username: string };
    }
  | { type: "game_started"; sessionId: string; activePlayer: ActivePlayer }
  | { type: "game_state"; state: GameState }
  | {
      type: "cell_claimed";
      sessionId: string;
      row: number;
      col: number;
      userId: string;
      userColor: string;
    }
  | { type: "turn_changed"; sessionId: string; activePlayer: ActivePlayer }
  | { type: "score_updated"; sessionId: string; scores: ScoreEntry[] }
  | {
      type: "claim_rejected";
      reason: "NotActivePlayer" | "CellAlreadyClaimed" | "NotAdjacent" | "OutOfBounds";
      message: string;
    }
  | {
      type: "game_over";
      sessionId: string;
      scores: ScoreEntry[];
      winnerUserId: string | null;
    }
  | { type: "error"; message: string }

  // Bidirectional broadcasts and direct messages
  | {
      type: "request_to_join_session_dm";
      fromUser: { userId: string; username: string };
      toUser: { userId: string };
    }
  | {
      type: "session_joined";
      user: { userId: string; username: string };
      players: SessionPlayer[];
      msg: string;
    }
  | { type: "player_left"; userId: string }
  | { type: "player_removed_from_session"; userId: string };

export type BroadCastMessage<T> = {
  data: T;
  exceptUserId?: string;
};

export type DMMessage<T> = {
  data: T;
};
