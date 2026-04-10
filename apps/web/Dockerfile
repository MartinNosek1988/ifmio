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
LABEL org.opencontainers.image.source="https://github.com/ifmio/ifmio"
LABEL org.opencontainers.image.description="ifmio Web — property management frontend"

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
# Add .mjs MIME type for ES module workers (pdf.js)
RUN sed -i '/application\/javascript/s/js;/js mjs;/' /etc/nginx/mime.types

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost:80/index.html || exit 1
CMD ["nginx", "-g", "daemon off;"]
