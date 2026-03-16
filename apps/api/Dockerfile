FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/validation/package.json ./packages/validation/
RUN npm install --workspace=@ifmio/api --include-workspace-root --ignore-scripts
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN cd apps/api && npx prisma generate && npx tsc -p tsconfig.build.json --noEmit && npm run build

FROM node:20-alpine
RUN apk add --no-cache icu-libs
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/validation/package.json ./packages/validation/
RUN npm install --workspace=@ifmio/api --include-workspace-root --omit=dev
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["docker-entrypoint.sh"]
