import { Toaster } from "@inboxkit-assignment/ui/components/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import appCss from "../index.css?url";
const queryClient = new QueryClient();

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Conquest — Real-Time Multiplayer Strategy Game" },
      {
        name: "description",
        content:
          "Create a room, invite friends, and outmaneuver opponents on a shared battle grid. Real-time multiplayer strategy with 15-second turns.",
      },

      // Open Graph
      { property: "og:title", content: "Conquest — Conquer the Board" },
      {
        property: "og:description",
        content:
          "Real-time multiplayer strategy game. Create a room, invite friends, and battle for territory on a shared grid.",
      },
      { property: "og:image", content: "https://conquest.rajshakya.xyz/conquest-og.webp" },
      { property: "og:url", content: "https://conquest.rajshakya.xyz" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Conquest" },

      // Twitter Card
      { name: "twitter:card", content: "summary_large_image" },
      // { name: "twitter:title", content: "Conquest — Conquer the Board" },
      {
        name: "twitter:description",
        content:
          "Real-time multiplayer strategy game. Create a room, invite friends, and battle for territory on a shared grid.",
      },
      { name: "twitter:image", content: "https://conquest.rajshakya.xyz/conquest-og.webp" },

      // Keywords (optional — low SEO value today, but harmless)
      {
        name: "keywords",
        content:
          "multiplayer strategy game, real-time grid game, online board game, territory control game, browser multiplayer game",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/icon.png",
      },
    ],
  }),

  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <div className="grid h-svh grid-rows-[auto_1fr]">
            <Outlet />
          </div>
          <Toaster richColors position="top-center" />
          <TanStackRouterDevtools position="bottom-left" />
          <Scripts />
        </QueryClientProvider>
      </body>
    </html>
  );
}
