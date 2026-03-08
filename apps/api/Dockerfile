FROM node:20-alpine AS builder

WORKDIR /app

# Monorepo: root + workspace package files
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/validation/package.json ./packages/validation/

RUN npm ci --workspace=@ifmio/api --include-workspace-root --ignore-scripts

# Prisma
COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && npx prisma generate

# Source packages (pure TS, no build)
COPY packages/ ./packages/

# Build API
COPY apps/api/ ./apps/api/
RUN cd apps/api && npm run build

# ─── Production ───
FROM node:20-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
