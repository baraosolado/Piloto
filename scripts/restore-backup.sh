#!/usr/bin/env bash
# Restaura um dump `.sql.gz` (ex.: gerado por scripts/backup-db.sh).
# SECURITY-GAPS §3.5 — testar numa base de desenvolvimento antes de produção.
#
# Uso: DATABASE_URL=postgresql://... bash scripts/restore-backup.sh /caminho/copilote_YYYYMMDD.sql.gz
set -euo pipefail

FILE="${1:-}"
if [[ -z "$FILE" || ! -f "$FILE" ]]; then
  echo "Uso: DATABASE_URL=postgresql://... bash scripts/restore-backup.sh <ficheiro.sql.gz>" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[restore-backup] DATABASE_URL não definida." >&2
  exit 1
fi

echo "[restore-backup] A restaurar em $(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:***@/') ..."
gunzip -c "$FILE" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
echo "[restore-backup] Concluído."
