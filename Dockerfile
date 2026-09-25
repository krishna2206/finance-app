# syntax=docker/dockerfile:1

ARG BUN_VERSION=1.3.14

# 1. Compilation de l'application web
FROM oven/bun:${BUN_VERSION} AS build
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY web/package.json web/
COPY e2e/package.json e2e/
RUN bun install --frozen-lockfile
COPY shared shared
COPY web web
RUN cd web && bun run build

# 2. Dépendances de production uniquement
FROM oven/bun:${BUN_VERSION} AS prod-deps
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY web/package.json web/
COPY e2e/package.json e2e/
RUN bun install --frozen-lockfile --production

# 3. Image d'exécution
FROM oven/bun:${BUN_VERSION}-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4880 \
    DB_PATH=/data/finance.db \
    BACKUP_DIR=/data/backups

COPY --from=prod-deps /app/node_modules node_modules
COPY --from=prod-deps /app/backend/node_modules backend/node_modules
COPY package.json ./
COPY shared shared
COPY backend/package.json backend/tsconfig.json backend/
COPY backend/src backend/src
COPY backend/drizzle backend/drizzle
COPY --from=build /app/web/dist web/dist

# La base, le jeton généré et les sauvegardes vivent dans un volume persistant.
RUN mkdir -p /data && chown -R bun:bun /data
USER bun
VOLUME ["/data"]
EXPOSE 4880

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4880) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "backend/src/index.ts"]
