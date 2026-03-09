FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/validation/package.json ./packages/validation/
RUN npm install --workspace=@ifmio/api --include-workspace-root --ignore-scripts
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN cd apps/api && npx prisma generate && npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/validation/package.json ./packages/validation/
RUN npm install --workspace=@ifmio/api --include-workspace-root --omit=dev
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
WORKDIR /app/apps/api
RUN wget -q -O /usr/local/bin/wait-for-it https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh && chmod +x /usr/local/bin/wait-for-it
EXPOSE 3000
CMD ["node", "/app/apps/api/dist/apps/api/src/main.js"]
