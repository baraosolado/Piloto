#!/usr/bin/env bash
# Grava a lista de processos PM2 e lembra o autostart (SECURITY-GAPS §3.6).
#
# Uso: bash scripts/pm2-persist.sh
set -euo pipefail

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[pm2-persist] PM2 não encontrado no PATH." >&2
  exit 1
fi

pm2 save
echo "[pm2-persist] pm2 save OK."
echo "[pm2-persist] Execute uma vez (root): pm2 startup systemd -u SEU_USER --hp /home/SEU_USER"
echo "            e copie/cole o comando systemd que o PM2 mostrar."
