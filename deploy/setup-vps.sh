#!/usr/bin/env bash
# ==============================================================================
# LUCKYDROP VIP — AUTOMATED UBUNTU 24.04 LTS PRODUCTION VPS SETUP SCRIPT
# ==============================================================================
# Usage on Ubuntu 24.04 VPS:
#   chmod +x deploy/setup-vps.sh
#   sudo ./deploy/setup-vps.sh yourdomain.com admin@yourdomain.com
# ==============================================================================

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-admin@${DOMAIN}}"
APP_DIR="/var/www/luckydrop"

if [ -z "$DOMAIN" ]; then
  echo "❌ Usage: sudo ./deploy/setup-vps.sh <your-domain.com> [ssl-email]"
  exit 1
fi

echo "🚀 [1/7] Updating Ubuntu 24.04 packages & installing Nginx, Certbot, UFW, Git..."
apt-get update -y
apt-get install -y curl git ufw nginx certbot python3-certbot-nginx build-essential

echo "🟢 [2/7] Installing Node.js 22 LTS & PM2..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
npm install -g pm2

echo "🛡️ [3/7] Configuring UFW Firewall (Allow SSH, HTTP 80, HTTPS 443)..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "📂 [4/7] Preparing application directory at ${APP_DIR}..."
mkdir -p "${APP_DIR}" "${APP_DIR}/data" "${APP_DIR}/logs" /var/www/certbot
if [ ! -f "${APP_DIR}/.env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example "${APP_DIR}/.env"
    chmod 600 "${APP_DIR}/.env"
    echo "⚠️ Created ${APP_DIR}/.env from .env.example (chmod 600). Fill in TELEGRAM_BOT_TOKEN before going live!"
  fi
fi

echo "📦 [5/7] Installing dependencies & building production bundle..."
npm ci
npm run build
mkdir -p logs data
pm2 start ecosystem.config.cjs --env production || pm2 restart luckydrop-tma
pm2 save
pm2 startup systemd -u root --hp /root || true

echo "🌐 [6/7] Configuring Nginx Reverse Proxy & Let's Encrypt SSL for ${DOMAIN}..."
sed "s/YOUR_DOMAIN_HERE/${DOMAIN}/g" deploy/nginx.conf > "/etc/nginx/sites-available/luckydrop.conf"
ln -sf "/etc/nginx/sites-available/luckydrop.conf" "/etc/nginx/sites-enabled/luckydrop.conf"
rm -f /etc/nginx/sites-enabled/default

# Obtain Let's Encrypt SSL certificate via Certbot
certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect || true
nginx -t && systemctl reload nginx

echo "🤖 [7/7] Registering Official Telegram Bot Webhook (if TELEGRAM_BOT_TOKEN is set in .env)..."
if [ -f ".env" ]; then
  # shellcheck disable=SC1091
  source .env
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ]; then
    WEBHOOK_URL="https://${DOMAIN}/api/telegram/webhook"
    SECRET_PARAM=""
    if [ -n "${TELEGRAM_WEBHOOK_SECRET:-}" ]; then
      SECRET_PARAM="&secret_token=${TELEGRAM_WEBHOOK_SECRET}"
    fi
    curl -fsSL "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}${SECRET_PARAM}"
    echo ""
    echo "✅ Telegram Webhook registered at: ${WEBHOOK_URL}"
  else
    echo "ℹ️ TELEGRAM_BOT_TOKEN is empty in .env. Once you add it, run:"
    echo "   curl \"https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://${DOMAIN}/api/telegram/webhook\""
  fi
fi

echo "=============================================================================="
echo "✅ LUCKYDROP VIP PRODUCTION DEPLOYMENT COMPLETE!"
echo "🔗 Mini App URL: https://${DOMAIN}"
echo "🔗 Webhook URL:  https://${DOMAIN}/api/telegram/webhook"
echo "=============================================================================="
