# syntax=docker/dockerfile:1

# ---- Stage 1: Frontend bauen (React/CRA) ----
FROM node:20-alpine AS frontend-build
WORKDIR /app

# Paketdateien zuerst kopieren für besseres Layer-Caching
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

# ---- Stage 2: Server bauen (TypeScript -> JS) ----
FROM node:20-alpine AS server-build
WORKDIR /app/server

COPY server/package.json server/package-lock.json ./
RUN npm ci

COPY server/tsconfig.json ./
COPY server/src/ ./src/
RUN npm run build

# Produktions-Abhängigkeiten des Servers separat installieren
RUN npm ci --omit=dev

# ---- Stage 3: Runtime-Image ----
FROM node:20-alpine AS runtime
WORKDIR /app

# Nur das Nötigste übernehmen: gebauten Server + seine deps + Frontend-Build
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/package.json ./server/package.json
COPY --from=frontend-build /app/build ./build

# Datenbankverzeichnis (sql.js schreibt hier rein)
RUN mkdir -p /app/data
VOLUME /app/data

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Express starten (server/dist/index.js legt ../build als statischen Ordner an)
CMD ["node", "server/dist/index.js"]