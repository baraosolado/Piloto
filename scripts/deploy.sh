#!/bin/bash
# scripts/deploy.sh — deploy no VPS (executar no diretório do app, ex.: /var/www/copilote)
# Fluxo: git pull → npm ci → build → migrations → PM2
# Uso: bash scripts/deploy.sh

set -euo pipefail

APP_NAME="copilote"
APP_DIR="${APP_DIR:-/var/www/copilote}"
BRANCH="${BRANCH:-main}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy] AVISO:${NC} $*"; }
error() { echo -e "${RED}[deploy] ERRO:${NC} $*"; exit 1; }

cd "$APP_DIR" || error "Diretório $APP_DIR não encontrado"
mkdir -p logs

log "Iniciando deploy ($(date -Iseconds)) — branch $BRANCH"

bash scripts/backup-db.sh 2>/dev/null || warn "Backup opcional falhou — seguindo"

log "git pull origin $BRANCH"
git checkout "$BRANCH" 2>/dev/null || true
git pull origin "$BRANCH" || error "git pull falhou"

log "npm ci"
npm ci || error "npm ci falhou"

log "npm run build"
npm run build || error "build falhou"

log "npx drizzle-kit migrate"
npx drizzle-kit migrate || error "migrations falharam"

log "PM2 reload"
if pm2 list 2>/dev/null | grep -q "$APP_NAME"; then
  pm2 reload "$APP_NAME" --update-env
else
  pm2 start ecosystem.config.js --env production
  pm2 save
fi

sleep 3
if pm2 list 2>/dev/null | grep "$APP_NAME" | grep -q "online"; then
  log "PM2: $APP_NAME online"
else
  error "PM2 não está online — pm2 logs $APP_NAME"
fi

CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ || echo "000")
if [[ "$CODE" =~ ^(200|302|307)$ ]]; then
  log "Health local OK (HTTP $CODE)"
else
  warn "Health local HTTP $CODE — verifique a app"
fi

log "Deploy concluído: $(git log -1 --oneline)"
