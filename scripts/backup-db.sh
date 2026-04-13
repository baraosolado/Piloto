#!/bin/bash
# scripts/backup-db.sh — backup PostgreSQL (pg_dump)
# Autenticação: defina DATABASE_URL no ambiente ou export PGPASSWORD antes de rodar.
# Uso: bash scripts/backup-db.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

DB_NAME="${DB_NAME:-copilote_db}"
DB_USER="${DB_USER:-copilote_user}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/copilote-db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/copilote_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%H:%M:%S')] Iniciando backup do banco $DB_NAME..."

if [ -n "${DATABASE_URL:-}" ]; then
  pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"
else
  # Conexão local por TCP (exige trust ou senha em ~/.pgpass ou PGPASSWORD)
  pg_dump -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"
fi

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date '+%H:%M:%S')] Backup criado: $BACKUP_FILE ($BACKUP_SIZE)"

echo "[$(date '+%H:%M:%S')] Removendo backups com mais de $RETENTION_DAYS dias..."
find "$BACKUP_DIR" -name "copilote_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
BACKUP_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name "copilote_*.sql.gz" 2>/dev/null | wc -l)
echo "[$(date '+%H:%M:%S')] Backups mantidos: $BACKUP_COUNT arquivo(s)"

echo "[$(date '+%H:%M:%S')] Backup concluído"
