#!/usr/bin/env bash
# ============================================================
# airbnb-india.com — Oracle Cloud Free VPS bootstrap
# Installs Node 20, clones the repo, writes .env, installs a
# systemd service so the bot runs 24/7 and auto-restarts.
#
# Run as root on a fresh Ubuntu 22.04/24.04 Oracle Cloud VM:
#   bash setup-oracle-vps.sh
#
# Before running, create a GitHub Personal Access Token:
#   github.com -> Settings -> Developer settings -> Tokens -> Generate
#   scope: repo  (fine-grained: read+write contents on airbnbindia)
# ============================================================
set -euo pipefail

REPO_URL="https://github.com/ydvkk05-bot/airbnbindia.git"
APP_DIR="/opt/airbnbindia"
SERVICE="airbnb-bot"

echo "==> Installing Node.js 20 + git..."
apt-get update -y
apt-get install -y ca-certificates curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v

echo "==> Cloning repo to $APP_DIR..."
rm -rf "$APP_DIR"
git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"
git checkout main || true
git remote set-url origin "$REPO_URL"

echo ""
echo "==> Configuring the bot"
echo ""

read -rp "BOT_TOKEN (from @BotFather): " BOT_TOKEN
read -rp "ADMIN_ID (your Telegram numeric id): " ADMIN_ID
read -rp "GitHub PAT (repo scope, for git push): " GITHUB_PAT

cat > "$APP_DIR/.env" <<EOF
# airbnb-india.com — Telegram bot config
BOT_TOKEN=${BOT_TOKEN}
ADMIN_ID=${ADMIN_ID}
GIT_AUTOPUSH=1
# GitHub credentials for auto-push (used by git-credential-store below)
GITHUB_PAT=${GITHUB_PAT}
EOF
chmod 600 "$APP_DIR/.env"

echo "==> Storing GitHub credentials (git push will not prompt)..."
git config --global credential.helper store
git config --global user.name "airbnb-india-bot"
git config --global user.email "bot@airbnb-india.com"
if [ -f /root/.git-credentials ]; then
  sed -i "/github.com/d" /root/.git-credentials 2>/dev/null || true
fi
echo "https://ydvkk05-bot:${GITHUB_PAT}@github.com" >> /root/.git-credentials
chmod 600 /root/.git-credentials

echo "==> Installing systemd service..."
cat > /etc/systemd/system/${SERVICE}.service <<EOF
[Unit]
Description=airbnb-india.com Telegram listing bot
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node ${APP_DIR}/bot/bot.js
Restart=always
RestartSec=5
# --wait below so 409 conflict from a stray second instance can't take over
KillSignal=SIGTERM
TimeoutStopSec=15

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ${SERVICE}
systemctl start ${SERVICE}

echo ""
echo "==> Done. Checking status..."
sleep 3
systemctl --no-pager status ${SERVICE} --lines=20 || true

echo ""
echo "Bot logs:    journalctl -u ${SERVICE} -f"
echo "Stop bot:    systemctl stop ${SERVICE}"
echo "Restart bot: systemctl restart ${SERVICE}"
