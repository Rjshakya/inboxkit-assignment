export const keys = {
  session: {
    players: (sessionId: string) => `session:${sessionId}:players`,
    grid: (sessionId: string) => `session:${sessionId}:grid`,
    scores: (sessionId: string) => `session:${sessionId}:scores`,
    activePlayer: (sessionId: string) => `session:active_player:${sessionId}`,
    turnLock: (sessionId: string) => `session:${sessionId}:turn_lock`,
    startedAt: (sessionId: string) => `session:startedAt:${sessionId}`,
    startedBy: (sessionId: string) => `session:startedBy:${sessionId}`,
  },
  cell: (sessionId: string, row: number, col: number) => `cell:${row}:${col}:${sessionId}`,
  firstTimeClaiming: (sessionId: string, userId: string) =>
    `session:${sessionId}:user:${userId}:isFirstTimeClaiming`,
  colorToken: (sessionId: string) => `color:token:${sessionId}`,
  broadcastChannel: (sessionId: string) => `session:${sessionId}:broadcast`,
  dmChannel: (toUserId: string) => `user:${toUserId}:dm`,
};
