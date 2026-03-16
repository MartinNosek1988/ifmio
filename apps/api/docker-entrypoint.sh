#!/bin/sh

# Migrations are handled by the dedicated CI/CD job (deploy.yml → migrate step)
# using DIRECT_DATABASE_URL (port 5432, direct Postgres connection).
# Do NOT run prisma migrate here — DATABASE_URL in the container points to
# Supabase pooler (port 6543/PgBouncer) which does not support migration locks.

echo "[entrypoint] Starting Node.js application..."
exec node /app/apps/api/dist/apps/api/src/main.js
