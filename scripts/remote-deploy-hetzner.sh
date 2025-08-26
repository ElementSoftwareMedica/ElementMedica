#!/usr/bin/env bash
set -euo pipefail

# Remote deploy script for Hetzner server
# Usage: ./scripts/remote-deploy-hetzner.sh <HOST> [SSH_USER] [--issue-certs]
# Example: ./scripts/remote-deploy-hetzner.sh 128.140.15.15 root --issue-certs
# You can also set ISSUE_CERTS=1 env var to auto-issue certs without prompt.

HOST=${1:-}
SSH_USER=${2:-root}
FLAG=${3:-}
if [ -z "$HOST" ]; then
  echo "Usage: $0 <HOST> [SSH_USER] [--issue-certs]" >&2
  exit 1
fi

APP_DIR=/opt/elementmedica/app

# 1) Sync project (exclude secrets and heavy dirs)
rsync -avz --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude ".env*" \
  --exclude "backups" \
  --exclude "logs" \
  --exclude "backend/logs" \
  --exclude "backend/uploads" \
  --exclude "ssl" \
  --exclude "letsencrypt-webroot" \
  ./ "$SSH_USER@$HOST:$APP_DIR/"

# 2) Create runtime dirs and copy non-secret runtime assets
ssh "$SSH_USER@$HOST" "mkdir -p $APP_DIR/ssl $APP_DIR/letsencrypt-webroot $APP_DIR/logs/nginx"

# 3) Start Nginx (HTTP only initially)
ssh "$SSH_USER@$HOST" "cd $APP_DIR && docker compose -f docker-compose.production.yml up -d nginx"

echo "Waiting for Nginx HTTP to be up..."
sleep 3

# 4) Issue certificates (requires DNS pointing to server)
ISSUE_NOW=false
if [ "${ISSUE_CERTS:-0}" = "1" ] || [ "$FLAG" = "--issue-certs" ]; then
  ISSUE_NOW=true
fi

if $ISSUE_NOW; then
  echo "Issuing/renewing certificates via webroot..."
  ssh "$SSH_USER@$HOST" "cd $APP_DIR && docker run --rm -v \$PWD/letsencrypt-webroot:/var/www/certbot -v \$PWD/ssl:/etc/letsencrypt certbot/certbot certonly --webroot -w /var/www/certbot -d elementformazione.com -d www.elementformazione.com --email admin@elementformazione.com --agree-tos --non-interactive --no-eff-email"
  ssh "$SSH_USER@$HOST" "cd $APP_DIR && docker compose -f docker-compose.production.yml up -d --force-recreate nginx certbot-renew"
else
  echo "Skipping certificate issuance (run with --issue-certs or ISSUE_CERTS=1 to auto-issue)."
fi

# 5) Health check
echo "Performing health checks..."
curl -fsS http://$HOST/health || echo "WARN: HTTP health check failed"
# HTTPS check if certs are present
ssh "$SSH_USER@$HOST" "test -f $APP_DIR/ssl/live/elementformazione.com/fullchain.pem" && \
  curl -kfsS https://elementformazione.com/health || echo "WARN: HTTPS health check failed"

echo "Deploy process completed."