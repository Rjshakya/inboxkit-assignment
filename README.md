# Grid Lock

A real-time, turn-based multiplayer grid-claiming game built with a modern TypeScript stack. Players join game sessions, take turns claiming cells on a shared 20x20 grid, and compete for the highest score — all synchronized live via WebSockets.

> This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript monorepo starter.

## Overview

Grid Lock is a full-stack application demonstrating real-time multiplayer game state management using **WebSockets**, **Redis** (for ephemeral game state and pub/sub broadcasting), and a **PostgreSQL** database (for persistent user data, authentication, and session records). It uses a monorepo architecture powered by **Turborepo** and **pnpm workspaces**.

### Game Flow

1. **Authenticate** — Sign up or sign in via email/password or Google OAuth. Only authenticated users can create or join game sessions.
2. **Create a Session** — Click **"Start New Game"** on the home page to create a unique game session. The app generates a session ID and navigates to `/game?sessionId=<id>`.
3. **Invite Others** — Share the game URL with other authenticated users. When they open the link, they automatically join the same session via WebSocket.
4. **Play Turn-by-Turn** — Players take turns claiming cells on a shared 20×20 grid. Each turn lasts **15 seconds** — click an unclaimed cell to mark it with your color.
5. **Live Scoreboard** — View real-time scores and turn status as the game progresses. The server broadcasts every claim and turn change instantly to all connected players.

## Demo

<video src="https://raw.githubusercontent.com/Rjshakya/inboxkit-assignment/main/assets/demo.mp4" controls width="100%"></video>

## Tech Stack

### Frontend (`apps/web`)
- **React 19** + **TypeScript**
- **TanStack Start** — SSR/meta-framework with file-based routing
- **TanStack Router** — Type-safe, file-based routing
- **TanStack Query** — Server-state management
- **TanStack Form** — Form handling and validation
- **Tailwind CSS v4** — Utility-first styling
- **shadcn/ui** — Accessible UI primitives (shared via `packages/ui`)
- **Vite** — Build tooling
- **Cloudflare** — Deployment target (`wrangler` + `@cloudflare/vite-plugin`)

### Backend (`apps/server`)
- **Hono** — Lightweight, fast web framework
- **@hono/node-server** — Node.js server with native WebSocket support
- **WebSocketServer (`ws`)** — Real-time bidirectional communication
- **Zod** + **@hono/zod-validator** — Runtime request validation

### Database & State (`packages/db`)
- **PostgreSQL** — Primary relational database
- **Drizzle ORM** — Type-safe SQL-like query builder
- **Drizzle-Zod** — Schema-derived Zod validators
- **Redis (ioredis)** — Ephemeral game state (grid, scores, turns, player lists) and pub/sub broadcasting

### Authentication (`packages/auth`)
- **Better-Auth** — Authentication framework with Drizzle adapter
- Email & password login
- Google OAuth 2.0 social login
- Cookie-based sessions (`sameSite: none`, `secure`, `httpOnly`)

### Shared Packages
- **`packages/ui`** — Shared shadcn/ui components, Tailwind theme tokens, and global styles
- **`packages/game-types`** — Shared TypeScript types for WebSocket message contracts
- **`packages/env`** — T3-style environment variable validation (Zod) split by `server` and `web`
- **`packages/config`** — Shared TypeScript base configuration

### Tooling
- **Turborepo** — Monorepo task orchestration
- **pnpm** — Package manager (v11.1.2)
- **Oxlint + Oxfmt** — Linting and formatting
- **TypeScript 6** — Strict type safety across all packages

## Project Structure

```
inboxkit-assignment/
├── apps/
│   ├── web/              # Frontend (React + TanStack Start + Vite)
│   │   ├── src/routes/   # File-based routes (TanStack Router)
│   │   ├── src/components/ # GameCanvas, Header, Forms, etc.
│   │   ├── src/hooks/    # useSession, useGameSocket, useSettings
│   │   └── src/lib/      # API client, auth client, game helpers
│   └── server/           # Backend API (Hono + WebSockets)
│       ├── src/game/     # Game logic (colors, workflows)
│       ├── src/lib/      # Session manager, WebSocket helpers, Redis pub/sub
│       ├── src/redis/    # Redis client factory
│       ├── src/routes/   # Hono route modules (settings)
│       └── src/index.ts  # Main Hono app & WebSocket upgrade handler
├── packages/
│   ├── ui/               # Shared shadcn/ui primitives & Tailwind styles
│   ├── auth/             # Better-Auth configuration & Drizzle adapter setup
│   ├── db/               # Drizzle ORM, PostgreSQL schema, migrations
│   ├── env/              # Environment variable schemas (server.ts / web.ts)
│   ├── game-types/       # Shared WS message types (ClientMessage, ServerMessage)
│   └── config/           # Shared tsconfig.base.json
├── package.json          # Root workspace manifest & Turborepo scripts
├── turbo.json            # Turborepo pipeline configuration
└── pnpm-workspace.yaml   # Workspace definitions
```

## Architecture Deep Dive

### Real-Time Game Engine

The server uses **Hono's `upgradeWebSocket`** combined with a raw **`ws` WebSocketServer** to handle persistent connections. Each authenticated user gets a WebSocket connection identified by their user ID.

**Key Libraries:**
- `src/lib/ws.ts` — In-memory map of connected users (`connectedUsers`) holding username, color, session, and socket reference.
- `src/lib/session.ts` — Redis-backed game state manager:
  - `session:{id}:players` — Redis list of joined players.
  - `session:{id}:turnData` — JSON blob tracking current player index and last turn timestamp.
  - `{userId}:{sessionId}:turn` — Redis key with 15-second TTL indicating whose turn it is.
  - `session:{id}:grid` — JSON serialized grid state.
  - `session:{id}:scores` — Redis hash of userId -> score.
- `src/lib/redis-pubsub.ts` — Redis pub/sub for horizontal scalability. When a cell is claimed, the server publishes to `session:{id}:broadcast`, and all subscribed server instances forward the event to their local connected clients.
- `src/game/workflow.ts` — **Cell Claiming Workflow** enforces game rules:
  1. Verify it is the player's turn via Redis TTL key.
  2. Atomically claim the cell using `SET NX` (prevents race conditions).
  3. Update the grid in Redis.
  4. Broadcast the `cellClaimed` event and updated scores.

### Turn System

- Turns are enforced server-side via a Redis key with a **15-second expiration** (`EX 15`).
- A Node.js timer (`setTimeout`) auto-advances the turn if the player does not act within the window.
- Turn data is stored as JSON in Redis (`session:{id}:turnData`) with the current player index modulo the player list length.

### Authentication & Authorization

- **Better-Auth** handles registration, login, sessions, and OAuth.
- Every API request and WebSocket upgrade attempts to resolve the session from cookies.
- Unauthenticated WebSocket connections are immediately closed with code `1008`.
- The `user_settings` context is injected into every request by querying PostgreSQL for the user's saved color preference.

### Color Assignment

Players are assigned a color in this priority:
1. **User-defined color** from `user_setting.color` (saved in DB).
2. **Hashed fallback** (`hashToColor`) derived deterministically from their user ID using a predefined Tailwind palette.

## Database Schema

### Auth Tables (Better-Auth)
- `user` — id, name, email, emailVerified, image
- `session` — id, token, expiresAt, userId, ipAddress, userAgent
- `account` — OAuth account linkage (provider, tokens, etc.)
- `verification` — Email verification codes

### App Tables
- `user_setting` — Per-user preferences (favorite `color`), linked to `user.id`.
- `game_sessions` — Session metadata (`createdBy`, `isExpired`, timestamps).
- `game_sessions_results` — Final scores per player per session.

## Environment Variables

Create `apps/server/.env` with the following:

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/inboxkit

# Redis
REDIS_URL=redis://localhost:6379

# Auth
BETTER_AUTH_SECRET=your-random-secret-min-32-chars
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_AUTH_CLIENT_ID=your-google-client-id
GOOGLE_AUTH_CLIENT_SECRET=your-google-client-secret

# CORS
CORS_ORIGIN=http://localhost:3001
```

Create `apps/web/.env` with the following:

```bash
VITE_SERVER_URL=http://localhost:3000
VITE_HOST_URL=http://localhost:3001
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [pnpm](https://pnpm.io/) (v11.1.2)
- [PostgreSQL](https://www.postgresql.org/) running locally (or use the provided Docker Compose)
- [Redis](https://redis.io/) running locally

### Install Dependencies

```bash
pnpm install
```

### Database Setup

1. Ensure PostgreSQL is running.
2. Update `apps/server/.env` with your `DATABASE_URL`.
3. Push the Drizzle schema to your database:

```bash
pnpm run db:push
```

Alternatively, start the provided PostgreSQL container:

```bash
pnpm run db:start
```

### Run Development Servers

Start all apps in parallel:

```bash
pnpm run dev
```

- **Web app**: [http://localhost:3001](http://localhost:3001)
- **API server**: [http://localhost:3000](http://localhost:3000)

You can also start them independently:

```bash
pnpm run dev:web     # Frontend only
pnpm run dev:server  # Backend only
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm run dev` | Start all apps in development mode |
| `pnpm run build` | Build all apps for production |
| `pnpm run dev:web` | Start only the web frontend |
| `pnpm run dev:server` | Start only the API server |
| `pnpm run check-types` | Check TypeScript types across all packages |
| `pnpm run check` | Run Oxlint and auto-format with Oxfmt |
| `pnpm run db:push` | Push Drizzle schema changes to PostgreSQL |
| `pnpm run db:generate` | Generate Drizzle migration files |
| `pnpm run db:migrate` | Run pending Drizzle migrations |
| `pnpm run db:studio` | Open Drizzle Kit Studio (DB GUI) |
| `pnpm run db:start` | Start PostgreSQL via Docker Compose |
| `pnpm run db:stop` | Stop PostgreSQL container |
| `pnpm run db:down` | Remove PostgreSQL container |

## UI Customization

Shared shadcn/ui primitives live in `packages/ui`.

- **Global styles & tokens**: `packages/ui/src/styles/globals.css`
- **Shared components**: `packages/ui/src/components/*`
- **Config**: `packages/ui/components.json` and `apps/web/components.json`

### Add Shared Components

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import them in any app:

```tsx
import { Button } from "@inboxkit-assignment/ui/components/button";
```

## API & WebSocket Protocol

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/*` | Better-Auth authentication handlers |
| `POST` | `/api/game/session` | Create a new game session (authenticated) |
| `GET`  | `/api/user/settings` | Get current user's settings |
| `POST` | `/api/user/settings` | Update current user's settings (body: `{ color: string }`) |
| `GET`  | `/ws` | Upgrade to WebSocket connection (authenticated) |

### WebSocket Messages

**Client → Server (`ClientMessage`)**
- `joinSession` — Join a game session by ID.
- `claim` — Attempt to claim a grid cell (row, col).
- `getTurn` / `getGrid` / `getScores` / `setGrid` — Query or mutate game state.

**Server → Client (`ServerMessage`)**
- `init` — Connection handshake with userId, color, username.
- `joined` / `joined_broadcast` — Player joined events.
- `cellClaimed` — A cell was successfully claimed; includes updated grid.
- `turnChanged` / `turnData` — Turn rotation updates.
- `scoresData` — Live scoreboard.
- `error` — Validation or server errors.

## Deployment

### Frontend (Cloudflare)

The web app is pre-configured for Cloudflare Pages/Workers deployment via Wrangler:

```bash
cd apps/web
pnpm run deploy
```

Make sure your `wrangler.toml` and `apps/web/.env.production` secrets are configured.

### Backend

The server is a standard Node.js application. Build and start:

```bash
cd apps/server
pnpm run build
pnpm run start
```

Or compile to a standalone binary with Bun:

```bash
pnpm run compile
```

## License

MIT
