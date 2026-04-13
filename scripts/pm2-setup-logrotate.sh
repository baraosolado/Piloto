#!/usr/bin/env bash
# Instala e configura pm2-logrotate (SECURITY-GAPS §2.7).
# Requer PM2 global: npm i -g pm2
#
# Uso: bash scripts/pm2-setup-logrotate.sh
set -euo pipefail

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[pm2-logrotate] PM2 não encontrado no PATH." >&2
  exit 1
fi

pm2 install pm2-logrotate 2>/dev/null || true
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss

echo "[pm2-logrotate] Configuração aplicada. pm2 conf para ver."
