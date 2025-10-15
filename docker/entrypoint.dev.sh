#!/bin/sh
set -eu

echo "[entrypoint] prisma generate"
pnpm prisma generate

# Optional: run Prisma schema sync (disabled by default)
if [ "${PRISMA_DB_PUSH:-false}" = "true" ]; then
  echo "[entrypoint] prisma db push"
  pnpm prisma db push --accept-data-loss || pnpm prisma db push || true
fi

# some native deps are skipped during deps install in image build
echo "[entrypoint] rebuilding native deps (bcrypt)"
pnpm rebuild bcrypt || true

if [ "${RUN_DB_SEED:-false}" = "true" ] && [ -f prisma/seed.ts ]; then
  echo "[entrypoint] seed database"
  pnpm seed || true
fi

echo "[entrypoint] starting dev server"
pnpm dev
