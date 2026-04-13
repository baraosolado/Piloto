#!/usr/bin/env bash
# Chama os crons da app (push de manutenção + retenção LGPD) com CRON_SECRET.
# Uso no Easypanel: "Scheduled job" mensal/diário → bash scripts/run-cron-tasks.sh
# Requer no ambiente: CRON_SECRET, e CRON_BASE_URL ou NEXT_PUBLIC_APP_URL (URL pública https).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

BASE="${CRON_BASE_URL:-${NEXT_PUBLIC_APP_URL:-}}"
SECRET="${CRON_SECRET:-}"

if [ -z "$BASE" ]; then
  echo "[run-cron-tasks] Defina CRON_BASE_URL ou NEXT_PUBLIC_APP_URL (URL pública da app)." >&2
  exit 1
fi
if [ -z "$SECRET" ]; then
  echo "[run-cron-tasks] Defina CRON_SECRET (igual ao da app)." >&2
  exit 1
fi

BASE="${BASE%/}"

run_one() {
  local path="$1"
  echo "[run-cron-tasks] POST ${BASE}${path}"
  curl -fsS -X POST \
    -H "Authorization: Bearer ${SECRET}" \
    -H "Content-Type: application/json" \
    "${BASE}${path}"
  echo ""
}

run_one "/api/cron/maintenance-push"
run_one "/api/cron/data-retention"

echo "[run-cron-tasks] Concluído."
