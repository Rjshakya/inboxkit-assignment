# syntax=docker/dockerfile:1

# --------------------------------------------------------
# Stage 1: Builder
# --------------------------------------------------------
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

WORKDIR /inboxkit-assignment

# Copy workspace manifests first for better Docker layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/env/package.json ./packages/env/
COPY packages/game-types/package.json ./packages/game-types/
COPY packages/config/package.json ./packages/config/

# Install deps using the locked versions (deterministic)
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm --filter=server build

# --------------------------------------------------------
# Stage 2: Runner - only the bundle, nothing else
# --------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 server

# Copy ONLY the bundled files from builder
COPY --from=builder --chown=server:nodejs /inboxkit-assignment/apps/server/dist ./dist

USER server

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r => r.status === 200 ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.mjs"]
