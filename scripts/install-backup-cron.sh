#!/usr/bin/env bash
# Instala linha de crontab para backup diário + log em /var/log/copilote (SECURITY-GAPS §3.2–3.7).
# Não duplica se já existir a mesma entrada de backup-db.sh.
#
# Uso: APP_DIR=/var/www/copilote bash scripts/install-backup-cron.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/copilote}"
LOG_DIR="${BACKUP_CRON_LOG_DIR:-/var/log/copilote}"
mkdir -p "$LOG_DIR"

MARKER="scripts/backup-db.sh"
CRON_LINE="0 3 * * * cd $APP_DIR && bash scripts/backup-db.sh >> $LOG_DIR/backup.log 2>&1"

tmp="$(mktemp)"
( crontab -l 2>/dev/null | grep -vF "$MARKER" || true; echo "$CRON_LINE" ) >"$tmp"
crontab "$tmp"
rm -f "$tmp"

echo "[install-backup-cron] Crontab atualizado."
echo "[install-backup-cron] Backup diário 03:00 → $LOG_DIR/backup.log"
echo "[install-backup-cron] APP_DIR=$APP_DIR"
