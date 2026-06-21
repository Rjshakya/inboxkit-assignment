import { useCallback, useState } from "react";

import { Button } from "@inboxkit-assignment/ui/components/button";
import { Input } from "@inboxkit-assignment/ui/components/input";
import { Card, CardContent } from "@inboxkit-assignment/ui/components/ui/card";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { toast } from "sonner";

import { GridPreview } from "@/components/game/GridPreview";
import { useSession } from "@/hooks/use-session";
import { createGameSession } from "@/lib/game";

export const Route = createFileRoute("/_game/game")({
  component: GamePage,
});

const AVATARS = ["/68.png", "/67.png", "/66.png", "/65.png"];

function GamePage() {
  useSession();
  const navigate = useNavigate({ from: "/game" });
  const [roomCode, setRoomCode] = useState("");

  const handleCreateRoom = useCallback(async () => {
    try {
      const id = await createGameSession();
      navigate({ to: "/lobby", search: { session: id } });
    } catch {
      toast.error("Failed to create game session");
    }
  }, [navigate]);

  const handleJoinRoom = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const code = roomCode.trim();
      if (!code) return;
      navigate({ to: "/lobby", search: { session: code } });
    },
    [navigate, roomCode],
  );

  return (
    <section className="flex min-h-full w-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className=" w-full"
        >
          <Card className="overflow-hidden border-[#4c1d95] bg-[#1a0b2e] p-2">
            <CardContent className="aspect-square rounded-xl bg-[#120724] p-3">
              <GridPreview />
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-2 text-center">
          <h1 className="font-heading text-5xl  font-semibold tracking-tight">
            Start a Conquest
          </h1>
          <p className="text-muted-foreground text-sm">
            Create a room or join one with a code.
          </p>
        </div>

        <div className="space-y-4">
          <Button onClick={handleCreateRoom} size="lg" className="w-full">
            Create a room
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-muted-foreground text-xs uppercase">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleJoinRoom} className="flex gap-2">
            <Input
              placeholder="Enter room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline">
              Join
            </Button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-3">
          <div className="flex -space-x-2">
            {AVATARS.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                className="size-8 rounded-full object-cover ring-2 ring-background"
              />
            ))}
          </div>
          <span className="text-muted-foreground text-xs">Play with friends</span>
        </div>
      </div>
    </section>
  );
}
