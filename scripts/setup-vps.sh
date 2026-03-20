#!/bin/bash
# Setup inicial do VPS (Ubuntu 24.04 LTS) — executar UMA VEZ como root
# Uso: sudo bash scripts/setup-vps.sh
#
# Inclui: sistema, Node 22 (nvm), PM2, PostgreSQL 17, Nginx, Certbot, UFW.

set -euo pipefail

echo "=== Setup VPS — Piloto ==="

export DEBIAN_FRONTEND=noninteractive

echo "[1/9] apt update && apt upgrade"
apt-get update -y
apt-get upgrade -y

echo "[2/9] Pacotes base (curl, git, build, firewall, nginx, certbot)"
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

echo "[3/9] Node.js 22 via nvm (usuário que invocou sudo, normalmente root — veja nota no final)"
export NVM_DIR="${NVM_DIR:-/root/.nvm}"
if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
# shellcheck source=/dev/null
[[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh"
nvm install 22
nvm alias default 22
echo "Node: $(node --version) | npm: $(npm --version)"

echo "[4/9] PM2 global"
npm install -g pm2@5.4.3
pm2 startup systemd -u root --hp /root || true

echo "[5/9] Repositório PostgreSQL 17"
install -d /usr/share/postgresql-common/pgdg
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  | gpg --dearmor -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.gpg
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.gpg] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list
apt-get update -y
apt-get install -y postgresql-17

echo "[6/9] Usuário e banco (execute manualmente se quiser outro nome/senha):"
echo "  sudo -u postgres psql -c \"CREATE USER piloto_user WITH PASSWORD 'ALTERE_ESTA_SENHA';\""
echo "  sudo -u postgres psql -c \"CREATE DATABASE piloto_db OWNER piloto_user;\""
echo "  sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE piloto_db TO piloto_user;\""

echo "[7/9] UFW — SSH, 80, 443"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose

echo "[8/9] Diretórios da app e backup"
mkdir -p /var/www/piloto/logs
mkdir -p /var/backups/piloto-db

echo "[9/9] Crontab backup diário (3h) — ajuste o path se necessário"
CRON_LINE="0 3 * * * cd /var/www/piloto && bash scripts/backup-db.sh >> logs/backup.log 2>&1"
( crontab -l 2>/dev/null | grep -vF "scripts/backup-db.sh" || true; echo "$CRON_LINE" ) | crontab -

echo ""
echo "=== Concluído ==="
echo "Próximos passos:"
echo "  1) Criar usuário/DB PostgreSQL (comandos acima)"
echo "  2) Clonar o repo em /var/www/piloto e configurar dono (ex.: deploy user)"
echo "  3) .env.local no servidor (DATABASE_URL, BETTER_AUTH_*, Stripe, etc.)"
echo "  4) sudo cp nginx.conf /etc/nginx/sites-available/piloto && habilitar site + nginx -t"
echo "  5) sudo certbot --nginx -d seudominio.com.br"
echo "  6) bash scripts/deploy.sh"
echo ""
echo "Nota: Node/nvm foi instalado para o usuário atual ($USER). Para deploy com usuário não-root,"
echo "      instale nvm nesse usuário ou use Node via NodeSource/binary."
