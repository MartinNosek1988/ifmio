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
LABEL org.opencontainers.image.source="https://github.com/ifmio/ifmio"
LABEL org.opencontainers.image.description="ifmio API — property management platform"
RUN apk add --no-cache icu-libs icu-data-full wget \
    && addgroup -g 1001 -S ifmio && adduser -S ifmio -u 1001
ENV NODE_ICU_DATA=/usr/share/icu
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/validation/package.json ./packages/validation/
RUN npm install --workspace=@ifmio/api --include-workspace-root --omit=dev --ignore-scripts
COPY --from=builder --chown=ifmio:ifmio /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=ifmio:ifmio /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=ifmio:ifmio /app/node_modules/.prisma ./node_modules/.prisma
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER ifmio
WORKDIR /app/apps/api
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=60s \
  CMD wget -q --spider http://localhost:3000/api/v1/health || exit 1
CMD ["docker-entrypoint.sh"]
