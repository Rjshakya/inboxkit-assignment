import { Link } from "@tanstack/react-router";

import { Logo } from "../logo.tsx";

const links = [
  { to: "/", label: "Home" },
  { to: "/game", label: "Play" },
  { to: "/login", label: "Sign In" },
];

export function Footer() {
  return (
    <footer className="py-12  max-w-2xl @container mx-auto w-full  px-6 ">
      <div className="bg-card py-8 ring-1 ring-border rounded-2xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <Logo />

          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            {links.map((link) => (
              <Link key={link.to} to={link.to} className="hover:text-foreground transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8  pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Conquest. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
