#!/usr/bin/env bash
# Démarre le serveur de production sur une base neuve et isolée, pour les tests end-to-end.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DATA_DIR="$ROOT/e2e/.tmp"

rm -rf "$DATA_DIR"
mkdir -p "$DATA_DIR"

if [ ! -f "$ROOT/web/dist/index.html" ]; then
  (cd "$ROOT/web" && bun run build)
fi

cd "$ROOT/backend"
exec env \
  NODE_ENV=production \
  PORT="${E2E_PORT:-4999}" \
  HOST=127.0.0.1 \
  DB_PATH="$DATA_DIR/e2e.db" \
  BACKUP_DIR="$DATA_DIR/backups" \
  APP_ACCESS_TOKEN="${E2E_ACCESS_TOKEN:-e2e-access-token}" \
  bun src/index.ts
