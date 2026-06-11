import { useQuery } from "@tanstack/react-query";
import { getGameSession } from "@/lib/game";

export const useGameSession = (sessionId: string) => {
  return useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => getGameSession(sessionId),
    enabled: !!sessionId,
  });
};
