import { createFileRoute } from "@tanstack/react-router";

import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const session = useSession();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {session?.user.name}</p>
    </div>
  );
}
