#!/usr/bin/env bash
set -euo pipefail

# Provisioning script for Hetzner Ubuntu server
# Usage: ./scripts/provision-hetzner.sh <HOST> [SSH_USER]
# Example: ./scripts/provision-hetzner.sh 128.140.15.15 root

HOST=${1:-}
SSH_USER=${2:-root}
if [ -z "${HOST}" ]; then
  echo "Usage: $0 <HOST> [SSH_USER]" >&2
  exit 1
fi

ssh -o StrictHostKeyChecking=no "${SSH_USER}@${HOST}" bash -s <<'REMOTE_EOF'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# Update packages
apt-get update -y
apt-get upgrade -y

# Install dependencies
apt-get install -y ca-certificates curl gnupg ufw

# Docker engine repo setup
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor --batch --yes -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

. /etc/os-release

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $VERSION_CODENAME stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable docker
systemctl enable docker
systemctl start docker

# Create directories
mkdir -p /opt/elementmedica/app
mkdir -p /opt/elementmedica/logs/nginx
mkdir -p /opt/elementmedica/ssl
mkdir -p /opt/elementmedica/letsencrypt-webroot

# Firewall: allow SSH/HTTP/HTTPS; deny others by default
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true

ufw --force enable || true

# Show docker version
docker --version || true
REMOTE_EOF

echo "Provisioning completed on ${HOST}"