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

# â”€â”€â”€ Nginx serve (static only â€” Caddy handles /api/ proxy) â”€â”€â”€
FROM nginx:alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    location /assets/ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
