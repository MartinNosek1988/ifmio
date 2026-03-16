#!/bin/sh
set -e

echo "[entrypoint] Running Prisma migrate deploy..."
npx prisma migrate deploy --schema=prisma/schema.prisma 2>&1 || {
  echo "[entrypoint] WARNING: prisma migrate deploy failed (exit $?). This may be expected if migrations were already applied via another method."
  echo "[entrypoint] Continuing with app startup..."
}

echo "[entrypoint] Starting Node.js application..."
exec node /app/apps/api/dist/apps/api/src/main.js
