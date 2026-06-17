import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@inboxkit-assignment/ui/components/ui/card";

import { Progress } from "@inboxkit-assignment/ui/components/progress";

interface TurnIndicatorProps {
  isMyTurn: boolean;
  activePlayerName: string;
  timeLeftMs: number;
  turnTotalMs: number;
  gameStatus: "waiting" | "active" | "finished";
  winnerUserId: string | null;
  currentUserId: string | undefined;
}

export default function TurnIndicator({
  isMyTurn: _isMyTurn,
  activePlayerName: _activePlayerName,
  timeLeftMs,
  turnTotalMs,
  gameStatus,
  winnerUserId,
  currentUserId,
}: TurnIndicatorProps) {
  const isWinner = winnerUserId === currentUserId;
  const progress = turnTotalMs > 0 ? Math.max(0, Math.min(1, timeLeftMs / turnTotalMs)) : 0;

  return (
    <Card variant="outline" className="rounded-sm">
      <CardHeader className="py-2">
        <CardTitle>{isWinner ? "You Won" : "Defeated"}</CardTitle>
      </CardHeader>
      {gameStatus === "active" && (
        <CardContent>
          <Progress value={progress} />
        </CardContent>
      )}
    </Card>
  );
}
