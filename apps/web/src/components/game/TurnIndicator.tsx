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
  gameStatus,
  winnerUserId,
  currentUserId,
}: TurnIndicatorProps) {
  const isWinner = winnerUserId === currentUserId;
 
  return (
    <Card variant="outline" className="rounded-sm ">
      <CardHeader className="py-2">
        <CardTitle>{gameStatus !== "active" ? isWinner ? "You Won" : "Defeated" : _isMyTurn ? "Your turn" : "Other's turn"}</CardTitle>
      </CardHeader>
      {gameStatus === "active" && _isMyTurn &&  (
        <CardContent>
          <Progress value={timeLeftMs} max={15000} />
        </CardContent>
      )}
    </Card>
  );
}
