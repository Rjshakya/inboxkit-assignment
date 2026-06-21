import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { useGameSocket } from "@/hooks/useGameSocket";

import GameCanvas from "./GameCanvas";
import Scoreboard from "./Scoreboard";
import TurnIndicator from "./TurnIndicator";
import { TURN_TOTAL_MS_DEFAULT } from "./game-theme";
import { cn } from "@inboxkit-assignment/ui/lib/utils";

interface GameSessionProps {
  sessionId: string;
}

export default function GameSession({ sessionId }: GameSessionProps) {
  const { data } = authClient.useSession();
  const {
    grid,
    userColor,
    connected,
    currentTurnUser,
    scores,
    claimCell,
    timeLeftMs,
    gameStatus,
    winnerUserId,
    shake,
  } = useGameSocket(sessionId);

  const [turnTotalMs, setTurnTotalMs] = useState(TURN_TOTAL_MS_DEFAULT);

  // Update total turn duration whenever the server sets a new expiry.
  useEffect(() => {
    if (gameStatus !== "active" || timeLeftMs <= 0) return;
    setTurnTotalMs((prev) => Math.max(prev, timeLeftMs));
  }, [gameStatus, timeLeftMs]);

  const isMyTurn = currentTurnUser === data?.user?.id;
  const activePlayerName = scores.find((s) => s.userId === currentTurnUser)?.username ?? "Opponent";

  if (!connected) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#c4b5fd]">
        Connecting to game server...
      </div>
    );
  }

  if (!grid) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#c4b5fd]">
        Loading grid...
      </div>
    );
  }

  return (
    <div className={cn("w-full grid max-w-2xl mx-auto  gap-4 @container py-12  px-6")}>
      <TurnIndicator
        isMyTurn={isMyTurn}
        activePlayerName={activePlayerName}
        timeLeftMs={timeLeftMs}
        turnTotalMs={turnTotalMs}
        gameStatus={gameStatus}
        winnerUserId={winnerUserId}
        currentUserId={data?.user?.id}
      />

      <div className={shake ? "animate-[shake-crystal_400ms_ease-in-out]" : ""}>
        <GameCanvas grid={grid} userColor={userColor} onCellClick={claimCell} />
      </div>
      <Scoreboard scores={scores} currentUserId={data?.user?.id} />
    </div>
  );
}
