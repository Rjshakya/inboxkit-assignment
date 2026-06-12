import { useCallback, useEffect, useRef, useState } from "react";

import type { GameState, Grid, Message, ScoreEntry } from "@inboxkit-assignment/game-types";
import { env } from "@inboxkit-assignment/env/web";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

const WS_URL = env.VITE_SERVER_URL.replace(/^http/, "ws");
type ClaimedCell = Extract<Grid[number][number], { claimed: true }>;

export function useGameSocket(sessionId: string) {
  const { data } = authClient.useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [grid, setGrid] = useState<Grid | null>(null);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [currentTurnUser, setCurrentTurnUser] = useState<string | null>(null);
  const [turnExpiresAt, setTurnExpiresAt] = useState<number | null>(null);
  const [userColor, setUserColor] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<GameState["status"]>("waiting");
  const [winnerUserId, setWinnerUserId] = useState<string | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const ws = new WebSocket(`${WS_URL}/ws?sessionId=${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: "get_game_state", sessionId } satisfies Message));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as Message;
      if (!message || !message.type) {
        return;
      }

      switch (message.type) {
        case "game_state": {
          setGrid(message.state.grid);
          setScores(message.state.scores);
          setCurrentTurnUser(message.state.activePlayer?.userId ?? null);
          setTurnExpiresAt(message.state.activePlayer?.expiry ?? null);
          setGameStatus(message.state.status);
          setWinnerUserId(message.state.winnerUserId);
          const currentUserId = data?.user?.id;
          // TODO: server should return user color
          // rather than computing here
          if (currentUserId) {
            const ownedCell = message.state.grid
              .flat()
              .find((cell): cell is ClaimedCell => cell.claimed && cell.userId === currentUserId);
            setUserColor(ownedCell?.userColor ?? null);
          }
          break;
        }

        case "cell_claimed": {
          setGrid((currentGrid) => {
            if (!currentGrid) {
              return currentGrid;
            }

            const nextGrid = currentGrid.map((row) => [...row]);
            nextGrid[message.row]![message.col] = {
              claimed: true,
              userId: message.userId,
              userColor: message.userColor,
            };
            return nextGrid;
          });

          break;
        }

        case "turn_changed":
        case "game_started": {
          setCurrentTurnUser(message.activePlayer.userId);
          setTurnExpiresAt(message.activePlayer.expiry);
          setGameStatus("active");
          break;
        }

        case "score_updated": {
          setScores(message.scores);
          break;
        }

        // TODO: implement game over
        // when all blocks are over
        // also very important identify deadlocks ,
        // when a user cannot claim cell ,because it locked by opponent.

        case "game_over": {
          setScores(message.scores);
          setWinnerUserId(message.winnerUserId);
          setGameStatus("finished");
          setTurnExpiresAt(null);
          toast.success("Game over");
          break;
        }

        case "claim_rejected": {
          toast.error(message.message);
          break;
        }

        case "error": {
          toast.error(message.message);
          break;
        }

        default: {
          break;
        }
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
      wsRef.current = null;
      setConnected(false);
      setGrid(null);
      setScores([]);
      setCurrentTurnUser(null);
      setTurnExpiresAt(null);
      setGameStatus("waiting");
      setWinnerUserId(null);
      setTimeLeftMs(0);
      setUserColor(null);
    };
  }, [data?.user?.id, sessionId]);

  useEffect(() => {
    if (!turnExpiresAt || !wsRef.current || gameStatus !== "active") {
      setTimeLeftMs(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      const remainingTime = Math.max(0, turnExpiresAt - Date.now());
      setTimeLeftMs(remainingTime);

      if (remainingTime <= 0) {
        wsRef.current?.send(JSON.stringify({ type: "turn_expired", sessionId } satisfies Message));
        window.clearInterval(intervalId);
      }
    }, 250);

    setTimeLeftMs(Math.max(0, turnExpiresAt - Date.now()));

    return () => {
      window.clearInterval(intervalId);
    };
  }, [gameStatus, sessionId, turnExpiresAt]);

  const claimCell = useCallback(
    (row: number, col: number) => {
      if (!wsRef.current || gameStatus !== "active") {
        return;
      }

      wsRef.current.send(
        JSON.stringify({ type: "claim_cell", sessionId, row, col } satisfies Message),
      );
    },
    [gameStatus, sessionId],
  );

  return {
    connected,
    grid,
    scores,
    currentTurnUser,
    turnExpiresAt,
    timeLeftMs,
    userColor,
    gameStatus,
    winnerUserId,
    claimCell,
  };
}
