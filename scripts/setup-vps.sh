#!/bin/bash
# Setup inicial do VPS (Ubuntu 24.04 LTS) — executar UMA VEZ como root
# Uso: sudo bash scripts/setup-vps.sh
#
# Inclui: sistema, Node 22 (nvm), PM2, PostgreSQL 17, Nginx, Certbot, UFW.

set -euo pipefail

echo "=== Setup VPS — Copilote ==="

export DEBIAN_FRONTEND=noninteractive

echo "[1/10] apt update && apt upgrade"
apt-get update -y
apt-get upgrade -y

echo "[2/10] Pacotes base (curl, git, build, firewall, nginx, certbot)"
apt-get install -y \
  curl \
  git \
  ca-certificates \
  gnupg \
  lsb-release \
  build-essential \
  ufw \
  nginx \
  certbot \
  python3-certbot-nginx

echo "[3/10] Node.js 22 via nvm (usuário que invocou sudo, normalmente root — veja nota no final)"
export NVM_DIR="${NVM_DIR:-/root/.nvm}"
if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
# shellcheck source=/dev/null
[[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh"
nvm install 22
nvm alias default 22
echo "Node: $(node --version) | npm: $(npm --version)"

echo "[4/10] PM2 global"
npm install -g pm2@5.4.3
pm2 startup systemd -u root --hp /root || true

echo "[5/10] Repositório PostgreSQL 17"
install -d /usr/share/postgresql-common/pgdg
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  | gpg --dearmor -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.gpg
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.gpg] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list
apt-get update -y
apt-get install -y postgresql-17

echo "[6/10] Usuário e banco (execute manualmente se quiser outro nome/senha):"
echo "  sudo -u postgres psql -c \"CREATE USER copilote_user WITH PASSWORD 'ALTERE_ESTA_SENHA';\""
echo "  sudo -u postgres psql -c \"CREATE DATABASE copilote_db OWNER copilote_user;\""
echo "  sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE copilote_db TO copilote_user;\""

echo "[7/10] UFW — SSH, 80, 443"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose

echo "[8/10] Diretórios da app, backup e log de cron (SECURITY-GAPS §3)"
mkdir -p /var/www/copilote/logs
mkdir -p /var/backups/copilote-db
mkdir -p /var/log/copilote

echo "[9/10] Crontab backup diário (3h) → /var/log/copilote/backup.log"
CRON_LINE="0 3 * * * cd /var/www/copilote && bash scripts/backup-db.sh >> /var/log/copilote/backup.log 2>&1"
( crontab -l 2>/dev/null | grep -vF "scripts/backup-db.sh" || true; echo "$CRON_LINE" ) | crontab -

echo "[10/10] PM2 logrotate + persistência (executar após primeiro pm2 start)"
echo "  bash scripts/pm2-setup-logrotate.sh"
echo "  bash scripts/pm2-persist.sh && pm2 startup ...  (ver mensagem do script)"

echo ""
echo "=== Concluído ==="
echo "Próximos passos:"
echo "  1) Criar usuário/DB PostgreSQL (comandos acima)"
echo "  2) Clonar o repo em /var/www/copilote e configurar dono (ex.: deploy user)"
echo "  3) .env.local no servidor (DATABASE_URL, BETTER_AUTH_*, Stripe, etc.)"
echo "  4) sudo cp nginx/copilote.conf /etc/nginx/sites-available/copilote && habilitar site + nginx -t"
echo "  4b) Agendar crons (push + retenção): ver docs/deploy-easypanel.md — CRON_SECRET + bash scripts/run-cron-tasks.sh"
echo "  5) sudo certbot --nginx -d seudominio.com.br"
echo "  6) bash scripts/deploy.sh"
echo ""
echo "Nota: Node/nvm foi instalado para o usuário atual ($USER). Para deploy com usuário não-root,"
echo "      instale nvm nesse usuário ou use Node via NodeSource/binary."
