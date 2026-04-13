#!/usr/bin/env bash
# Verifica se RLS está ligado nas tabelas de dados com user_id (smoke).
# SECURITY-GAPS checklist 1.5 — não substitui testes de API/UI.
#
# Uso: DATABASE_URL=postgresql://... bash scripts/verify-rls.sh
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[verify-rls] DATABASE_URL não definida." >&2
  exit 1
fi

TABLES=(
  rides expenses goals vehicles platforms_used maintenance_items subscriptions
  report_downloads web_push_subscriptions maintenance_push_log
)

missing=()
for t in "${TABLES[@]}"; do
  row=$(psql "$DATABASE_URL" -tAc "SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = '$t' AND c.relkind = 'r';" 2>/dev/null || true)
  if [[ "$row" != "t" ]]; then
    missing+=("$t")
  fi
done

if ((${#missing[@]} > 0)); then
  echo "[verify-rls] RLS ausente ou tabela inexistente: ${missing[*]}" >&2
  exit 1
fi

echo "[verify-rls] RLS ativo nas ${#TABLES[@]} tabelas esperadas."
