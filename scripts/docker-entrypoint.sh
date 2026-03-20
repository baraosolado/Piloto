#!/bin/sh
# Roda migrations antes do Next (idempotente). Desative: SKIP_DB_MIGRATE=1
set -e
cd /app

if [ "${SKIP_DB_MIGRATE:-0}" != "1" ]; then
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "[docker-entrypoint] AVISO: DATABASE_URL vazio — pulando migrate."
  else
    echo "[docker-entrypoint] Aplicando migrations (drizzle-kit)..."
    ./node_modules/.bin/drizzle-kit migrate
  fi
fi

exec "$@"
