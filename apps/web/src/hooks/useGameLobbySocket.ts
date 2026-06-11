import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";
import { env } from "@inboxkit-assignment/env/web";
import type { Message } from "@inboxkit-assignment/game-types";
import { authClient } from "@/lib/auth-client";

const WS_URL = env.VITE_SERVER_URL.replace(/^http/, "ws");

export function useGameLobbySocket(sessionId: string) {
  const [connected, setConnected] = useState(false);
  const [players, setPlayers] = useState<{ userId: string; username: string }[]>([]);
  const [isInSession, setIsInSession] = useState<boolean | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: userData } = authClient.useSession();
  const currentUserId = userData?.user?.id ?? null;

  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(`${WS_URL}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(
        JSON.stringify({
          type: "get_session_players",
          sessionId,
        } as Message),
      );
      ws.send(
        JSON.stringify({
          type: "check_player_exist_in_session",
          sessionId,
        } as Message),
      );
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as Message;
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case "session_players": {
          setPlayers(msg.players);
          break;
        }

        case "check_player_exist_in_session_result": {
          if (msg.userId === currentUserId) {
            setIsInSession(msg.result);
          }
          break;
        }

        case "session_joined": {
          toast.success(msg.msg);
          setPlayers(msg.players);
          setIsInSession(msg.user?.userId === currentUserId);
          break;
        }

        case "request_to_join_session_dm": {
          if (msg.toUser.userId === currentUserId) {
            toast(`${msg.fromUser.username} wants to join`, {
              action: {
                label: "Accept",
                onClick: () => {
                  ws.send(
                    JSON.stringify({
                      type: "accept_request_to_join_session",
                      sessionId,
                      forUser: msg.fromUser,
                    } as Message),
                  );
                },
              },
              cancel: {
                label: "Decline",
                onClick: () => {
                  ws.send(
                    JSON.stringify({
                      type: "decline_request_to_join_session",
                      sessionId,
                      forUser: msg.fromUser,
                    } as Message),
                  );
                },
              },
            });
          }
          break;
        }

        case "request_declined": {
          toast.error("Your request to join was declined");
          break;
        }
        case "player_left":
        case "player_removed_from_session": {
          setPlayers((prev) => prev.filter((p) => p.userId !== msg.userId));
          break;
        }

        case "error": {
          toast.error(msg.message);
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
    };
  }, [sessionId, currentUserId]);

  const requestToJoin = useCallback(() => {
    if (!wsRef.current || !sessionId) return;
    wsRef.current.send(
      JSON.stringify({
        type: "request_to_join_session",
        sessionId,
      } as Message),
    );
  }, [sessionId]);

  return {
    connected,
    players,
    isInSession,
    requestToJoin,
  };
}
