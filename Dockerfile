# Multi-stage Dockerfile for Next.js (dev + prod)

# Base image
FROM node:20-slim AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable
# Required by Prisma engines
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Dependencies layer
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# Skip lifecycle scripts here to avoid running project's postinstall (prisma generate)
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---------- Development image ----------
FROM deps AS dev
# Copy only what's needed for prisma generate in dev
COPY prisma ./prisma
COPY docker/entrypoint.dev.sh ./docker/entrypoint.dev.sh
# Default port for Next.js
ENV PORT=3000
EXPOSE 3000
# Use shell to run the entrypoint so we don't rely on executable bit
CMD ["sh", "./docker/entrypoint.dev.sh"]

# ---------- Build (production) ----------
FROM deps AS build
COPY . .
# Generate Prisma client and build Next.js
RUN pnpm rebuild bcrypt || true \
 && pnpm prisma generate \
 && pnpm build

# ---------- Production runtime ----------
FROM node:20-slim AS runner
ENV NODE_ENV=production
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy required assets from build and deps
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json

# Next.js default port
ENV PORT=3000
EXPOSE 3000

# Start Next in production
CMD ["pnpm", "start"]
