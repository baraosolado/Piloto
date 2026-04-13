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

# Primeiro super_admin em BD vazia (produção). Ver docs/deploy-easypanel.md
if [ "${BOOTSTRAP_SUPER_ADMIN:-0}" = "1" ] && [ -n "${DATABASE_URL:-}" ]; then
  echo "[docker-entrypoint] Bootstrap super_admin (idempotente)..."
  node scripts/bootstrap-super-admin.mjs
fi

exec "$@"
