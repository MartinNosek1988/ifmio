#!/bin/sh

echo "[entrypoint] Running Prisma migrate deploy..."
if npx prisma migrate deploy --schema=prisma/schema.prisma 2>&1; then
  echo "[entrypoint] Migrations applied successfully."
else
  echo "[entrypoint] WARNING: prisma migrate deploy exited with code $?."
  echo "[entrypoint] This may be expected if migrations were already applied."
  echo "[entrypoint] Continuing with app startup..."
fi

echo "[entrypoint] Starting Node.js application..."
exec node /app/apps/api/dist/apps/api/src/main.js
