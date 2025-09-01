#!/usr/bin/env bash
set -euo pipefail

# Remote deploy script for Hetzner server
# Usage: ./scripts/remote-deploy-hetzner.sh <HOST> [SSH_USER] [--issue-certs]
# Example: ./scripts/remote-deploy-hetzner.sh 128.140.15.15 root --issue-certs
# You can also set ISSUE_CERTS=1 env var to auto-issue certs without prompt.
# Optionally set AUTO_PUSH_ENV=1 to upload local ./backend/.env.production to the server if missing.

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
ssh "$SSH_USER@$HOST" "mkdir -p $APP_DIR/ssl $APP_DIR/letsencrypt-webroot $APP_DIR/logs/nginx $APP_DIR/backend"

# 2.5) Ensure backend env file exists on remote BEFORE any docker compose command
# Compose validates env_file existence at parse time, even if service is not started
echo "Checking backend env file (.env.production) on remote..."
if [ "${AUTO_PUSH_ENV:-0}" = "1" ] && [ -f "./backend/.env.production" ]; then
  echo "AUTO_PUSH_ENV=1: uploading ./backend/.env.production to remote (with backup if exists)..."
  # Backup existing remote env if present, then upload
  ssh "$SSH_USER@$HOST" "if [ -f $APP_DIR/backend/.env.production ]; then cp $APP_DIR/backend/.env.production $APP_DIR/backend/.env.production.bak_$(date +%Y%m%d%H%M%S); fi"
  scp ./backend/.env.production "$SSH_USER@$HOST:$APP_DIR/backend/.env.production"
  echo "Remote $APP_DIR/backend/.env.production updated."
else
  if ssh "$SSH_USER@$HOST" "test -f $APP_DIR/backend/.env.production"; then
    echo "Remote $APP_DIR/backend/.env.production found."
  else
    echo "Remote $APP_DIR/backend/.env.production NOT found."
    echo "ERROR: Missing $APP_DIR/backend/.env.production on remote and no AUTO_PUSH_ENV=1 with local ./backend/.env.production provided." >&2
    echo "Please create the file on the server, or set AUTO_PUSH_ENV=1 and provide a local ./backend/.env.production to upload." >&2
    echo "Minimal variables commonly required include (example):" >&2
    echo "  NODE_ENV=production" >&2
    echo "  API_PORT=4001" >&2
    echo "  DOCUMENTS_PORT=4002" >&2
    echo "  PROXY_PORT=4003" >&2
    echo "  FRONTEND_URL=https://elementformazione.com" >&2
    echo "  CORS_ALLOWED_ORIGINS=https://elementformazione.com,https://www.elementformazione.com" >&2
    echo "  JWT_SECRET=change-me" >&2
    echo "  JWT_REFRESH_SECRET=change-me-too" >&2
    echo "  DATABASE_URL=postgres://user:pass@host:5432/dbname (required by API)" >&2
    exit 1
  fi
fi

# 3) Build and start backend services (api, documents, proxy)
echo "Building and starting backend services (api, documents, proxy)..."
ssh "$SSH_USER@$HOST" "cd $APP_DIR && docker compose -f docker-compose.production.yml build api documents proxy && docker compose -f docker-compose.production.yml up -d --force-recreate api documents proxy"

# 4) Start Nginx (HTTP only initially, using frontend.conf) without deps
echo "Starting Nginx with frontend (HTTP) config..."
ssh "$SSH_USER@$HOST" "cd $APP_DIR && export NGINX_CONF=./nginx/frontend.conf && docker compose -f docker-compose.production.yml up -d --no-deps --force-recreate nginx"

echo "Waiting for Nginx HTTP to be up..."
sleep 3

# 4.5) Ensure SFTP is enabled and reload sshd safely (idempotent)
# Notes:
# - Avoid systemctl/service due to environment restrictions; use HUP signal after config validation
# - Uses internal-sftp for compatibility; does not alter authentication method
ssh "$SSH_USER@$HOST" bash -lc 'set -euo pipefail; 
  CFG=/etc/ssh/sshd_config; 
  if grep -qE "^\s*Subsystem\s+sftp\b" "$CFG"; then 
    sed -i "s|^\s*Subsystem\s\+sftp.*|Subsystem sftp internal-sftp|" "$CFG"; 
  else 
    echo "Subsystem sftp internal-sftp" >> "$CFG"; 
  fi; 
  # validate and reload via HUP
  if sshd -t; then 
    PID=$(pidof sshd || pgrep -x sshd || true); 
    if [ -n "$PID" ]; then kill -HUP "$PID"; fi; 
  fi'

# 5) Wait for backend health (internal ports) using retries from inside Nginx container
echo "Checking internal health endpoints from Nginx container..."
ssh "$SSH_USER@$HOST" bash -lc "set -euo pipefail; \
  if ! docker ps --format '{{.Names}}' | grep -q em-nginx; then exit 0; fi; \
  docker exec em-nginx sh -lc 'apk add --no-cache curl >/dev/null 2>&1 || true; \
    echo Checking api:4001/health...; curl --retry 30 --retry-delay 2 --retry-connrefused -fsS http://api:4001/health >/dev/null; \
    echo Checking documents:4002/health...; curl --retry 30 --retry-delay 2 --retry-connrefused -fsS http://documents:4002/health >/dev/null; \
    echo Checking proxy:4003/health...; curl --retry 30 --retry-delay 2 --retry-connrefused -fsS http://proxy:4003/health >/dev/null'"

# 6) Issue certificates (requires DNS pointing to server)
ISSUE_NOW=false
if [ "${ISSUE_CERTS:-0}" = "1" ] || [ "$FLAG" = "--issue-certs" ]; then
  ISSUE_NOW=true
fi

if $ISSUE_NOW; then
  echo "Issuing/renewing certificates via webroot..."
  # Explicitly set entrypoint to certbot to avoid shell wrapper from service definition
  ssh "$SSH_USER@$HOST" "cd $APP_DIR && docker compose -f docker-compose.production.yml run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot --agree-tos --register-unsafely-without-email --non-interactive -d elementformazione.com -d www.elementformazione.com"
  echo "Switching Nginx to production (HTTPS) config..."
  ssh "$SSH_USER@$HOST" "cd $APP_DIR && export NGINX_CONF=./nginx/production.conf && docker compose -f docker-compose.production.yml up -d --no-deps --force-recreate nginx"
else
  echo "Skipping certificate issuance (run with --issue-certs or ISSUE_CERTS=1 to auto-issue)."
fi

# 7) Health checks
echo "Performing health checks..."
if curl -fsS http://$HOST/health >/dev/null 2>&1; then
  echo "HTTP health OK"
else
  echo "WARN: HTTP health check failed"
fi

# Check /api/health via HTTP (should be proxied to proxy service)
if curl -fsS http://$HOST/api/health >/dev/null 2>&1; then
  echo "/api/health over HTTP OK"
else
  echo "WARN: /api/health over HTTP failed"
fi

# HTTPS check if certs are present
if ssh "$SSH_USER@$HOST" "test -f $APP_DIR/ssl/live/elementformazione.com/fullchain.pem"; then
  if curl -kfsS https://elementformazione.com/health >/dev/null 2>&1; then
    echo "HTTPS health OK"
  else
    echo "WARN: HTTPS health check failed"
  fi
  if curl -kfsS https://elementformazione.com/api/health >/dev/null 2>&1; then
    echo "/api/health over HTTPS OK"
  else
    echo "WARN: /api/health over HTTPS failed"
  fi
fi

echo "Deploy process completed."