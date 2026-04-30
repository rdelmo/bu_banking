# ── Lion Kings Bank — React frontend ──────────────────────────────────────────

# Stage 1: build the Vite production bundle
FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build


# Stage 2: serve with nginx
FROM nginx:1.27-alpine

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx config: serve the SPA and proxy /api/* to the backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
