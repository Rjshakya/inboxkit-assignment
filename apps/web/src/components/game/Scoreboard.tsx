import type { ScoreEntry } from "@inboxkit-assignment/game-types";
import { Card, CardHeader, CardTitle } from "@inboxkit-assignment/ui/components/ui/card";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemGroup,
} from "@inboxkit-assignment/ui/components/item";

interface ScoreboardProps {
  scores: ScoreEntry[];
  currentUserId: string | undefined;
}

export default function Scoreboard({ scores, currentUserId }: ScoreboardProps) {
  if (scores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scores</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scores</CardTitle>
      </CardHeader>
      <ItemGroup className="p-2 gap-1">
        {scores.map((player) => {
          const isCurrentUser = player.userId === currentUserId;

          return (
            <Item variant="muted" key={player.userId}>
              <ItemContent>
                <ItemTitle>{isCurrentUser ? "You" : player.username}</ItemTitle>
                <ItemDescription>{player.score}</ItemDescription>
              </ItemContent>
            </Item>
          );
        })}
      </ItemGroup>
    </Card>
  );
}
