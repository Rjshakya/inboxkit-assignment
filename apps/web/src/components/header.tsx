import { Link, useNavigate } from "@tanstack/react-router";
import { IconMenu, IconHome, IconHelpCircle, IconSwords } from "@tabler/icons-react";

import { Button } from "@inboxkit-assignment/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@inboxkit-assignment/ui/components/dropdown-menu";

import { Logo } from "./logo";

export function Header() {
  const navigate = useNavigate();

  return (
    <header className="w-full bg-background/80 backdrop-blur mx-auto my-2 max-w-2xl">
      <div className="flex h-12 items-center justify-between px-4  rounded-md border">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="rounded-xl">
                <IconMenu className="size-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate({ to: "/" })}>
              <IconHome className="size-4" />
              Home
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/", hash: "how-to-play" })}>
              <IconHelpCircle className="size-4" />
              How to Play
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => navigate({ to: "/game" })}
              className="text-primary focus:text-primary"
            >
              <IconSwords className="size-4" />
              Play
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
