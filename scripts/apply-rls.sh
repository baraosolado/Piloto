#!/usr/bin/env bash
# Aplica `docs/postgres/rls-pending-manual.sql` na base atual (DATABASE_URL).
# SECURITY-GAPS (RLS) — staging/prod: confirmar leitura do guia antes de aplicar.
#
# Uso: CONFIRM_RLS_APPLY=1 DATABASE_URL=postgresql://... bash scripts/apply-rls.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SQL_FILE="$ROOT/src/db/migrations/0008_enable_row_level_security.sql"

if [[ "${CONFIRM_RLS_APPLY:-}" != "1" ]]; then
  echo "[apply-rls] Recusa: defina CONFIRM_RLS_APPLY=1 (confirma leitura do SECURITY-GAPS.md, RLS)." >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[apply-rls] DATABASE_URL não definida." >&2
  exit 1
fi

if [[ ! -f "$SQL_FILE" ]]; then
  echo "[apply-rls] Ficheiro em falta: $SQL_FILE" >&2
  exit 1
fi

echo "[apply-rls] A aplicar $SQL_FILE ..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
echo "[apply-rls] Concluído."
