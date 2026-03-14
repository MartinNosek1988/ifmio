FROM node:20-alpine AS builder

ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}

WORKDIR /app

# Monorepo: root + workspace package files
COPY package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/validation/package.json ./packages/validation/

RUN npm install --workspace=ifmio-app --include-workspace-root --ignore-scripts

# Source packages (pure TS, no build)
COPY packages/ ./packages/

# Build web
COPY apps/web/ ./apps/web/
RUN cd apps/web && npm run build

# --- Nginx serve (static only — Caddy handles /api/ proxy) ---
FROM nginx:alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
