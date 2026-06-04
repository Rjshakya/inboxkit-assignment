import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";
import { env } from "@inboxkit-assignment/env/web";
import type { Grid, ClientMessage, ServerMessage } from "@inboxkit-assignment/game-types";

const GRID_SIZE = 25;

function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ claimed: false })),
  );
}

export function useGameSocket(sessionId: string | null) {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userColor, setUserColor] = useState<string | null>(null);
  const [currentTurnUser, setCurrentTurnUser] = useState<string | null>(null);
  const [scores, setScores] = useState<{ userId: string; username: string; score: number }[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const serverUrl = env.VITE_SERVER_URL.replace(/^http/, "ws");
    const ws = new WebSocket(`${serverUrl}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(
        JSON.stringify({
          type: "joinSession",
          data: { sessionId },
        } as ClientMessage),
      );
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as ServerMessage;

      if (msg.type === "init") {
        setUserId(msg.userId);
        setUserColor(msg.color);
        ws.send(
          JSON.stringify({
            type: "getGrid",
            data: { sessionId },
          } as ClientMessage),
        );
      } else if (msg.type === "joined_broadcast") {
        toast.success(`${msg.username} joined session`);
      } else if (msg.type === "gridData") {
        setGrid(msg.grid ?? createEmptyGrid());
      } else if (msg.type === "cellClaimed") {
        setGrid(msg.grid);
      } else if (msg.type === "turnChanged") {
        setCurrentTurnUser(msg.userTurn);
      } else if (msg.type === "turnData") {
        setCurrentTurnUser(msg.userTurn);
      } else if (msg.type === "scoresData") {
        setScores(msg.scores);
      } else if (msg.type === "error") {
        toast.error(msg.message);
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [sessionId]);

  const claimCell = useCallback(
    (row: number, col: number) => {
      if (!wsRef.current || !sessionId || !grid || !userColor) return;

      const msg: ClientMessage = {
        type: "claim",
        data: { sessionId, grid, userColor, row, col },
      };
      wsRef.current.send(JSON.stringify(msg));
    },
    [sessionId, grid, userColor],
  );

  const getTurn = useCallback(() => {
    if (!wsRef.current || !sessionId) return;
    const msg: ClientMessage = {
      type: "getTurn",
      data: { sessionId },
    };
    wsRef.current.send(JSON.stringify(msg));
  }, [sessionId]);

  return {
    grid,
    userId,
    userColor,
    currentTurnUser,
    scores,
    connected,
    claimCell,
    getTurn,
  };
}
