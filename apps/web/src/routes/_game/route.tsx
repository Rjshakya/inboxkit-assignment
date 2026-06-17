import { Link, Outlet, createFileRoute } from "@tanstack/react-router";

import { Logo } from "@/components/logo";
import UserMenu from "@/components/user-menu";

export const Route = createFileRoute("/_game")({
  component: GameLayout,
});

function GameLayout() {
  return (
    <div className="grid h-full grid-rows-[auto_1fr]">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/">
            <Logo />
          </Link>
          <UserMenu />
        </div>
      </header>
      <Outlet />
    </div>
  );
}
