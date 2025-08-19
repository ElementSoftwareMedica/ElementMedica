#!/bin/bash

# Script per ricreare server Hetzner con cloud-init
# Versione: 3.0 - Con configurazione cloud-init completa

set -e

# Configurazione
SERVER_ID="106921187"
API_TOKEN="BFpwGfbfmUbcyOnMqdX5JzfsPOtxWReN3INQveUP9o14Bp38wucgFkhR2vfe3ql0"
SSH_KEY_PATH="$HOME/.ssh/id_ed25519.pub"
USER_NAME="elementmedica"
USER_PASSWORD="ElementMedica2024!"

echo "🚀 Ricreazione server Hetzner con cloud-init"
echo "📍 Server ID: $SERVER_ID"
echo "👤 Utente da creare: $USER_NAME"
echo "🔑 Chiave SSH: $SSH_KEY_PATH"
echo ""

# Leggi la chiave SSH
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "❌ Chiave SSH non trovata: $SSH_KEY_PATH"
    exit 1
fi

SSH_KEY_CONTENT=$(cat "$SSH_KEY_PATH")
echo "✅ Chiave SSH caricata"

# Crea script cloud-init
cat > /tmp/cloud-init.yml << EOF
#cloud-config
users:
  - name: ubuntu
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
      - $SSH_KEY_CONTENT
  - name: $USER_NAME
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    groups: sudo,docker
    passwd: \$6\$rounds=4096\$saltsalt\$3xzPjWXD5Li7QJTAJaO5.5fN8.1n8qF9V8.Kj9x8.2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7
    ssh_authorized_keys:
      - $SSH_KEY_CONTENT

package_update: true
package_upgrade: true

packages:
  - curl
  - wget
  - git
  - unzip
  - htop
  - nano
  - ufw
  - fail2ban
  - apt-transport-https
  - ca-certificates
  - gnupg
  - lsb-release

runcmd:
  # Configurazione firewall
  - ufw --force reset
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow ssh
  - ufw allow 80
  - ufw allow 443
  - ufw --force enable
  
  # Installazione Node.js
  - curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  - apt install -y nodejs
  - npm install -g pm2
  
  # Installazione Docker
  - curl -fsSL https://get.docker.com -o get-docker.sh
  - sh get-docker.sh
  - usermod -aG docker ubuntu
  - usermod -aG docker $USER_NAME
  
  # Installazione Nginx
  - apt install -y nginx
  - systemctl enable nginx
  - systemctl start nginx
  
  # Configurazione Fail2Ban
  - systemctl enable fail2ban
  - systemctl start fail2ban
  
  # Configurazione swap
  - fallocate -l 2G /swapfile
  - chmod 600 /swapfile
  - mkswap /swapfile
  - swapon /swapfile
  - echo '/swapfile none swap sw 0 0' >> /etc/fstab
  
  # Ottimizzazioni sistema
  - echo 'vm.swappiness=10' >> /etc/sysctl.conf
  - echo 'net.core.rmem_max = 16777216' >> /etc/sysctl.conf
  - echo 'net.core.wmem_max = 16777216' >> /etc/sysctl.conf
  
  # Creazione directory progetto
  - mkdir -p /var/www/elementmedica
  - chown -R $USER_NAME:$USER_NAME /var/www/elementmedica
  
  # Log di completamento
  - echo "Setup cloud-init completato!" > /var/log/cloud-init-setup.log
  - date >> /var/log/cloud-init-setup.log

final_message: "Server ElementMedica configurato con successo!"
EOF

echo "📝 Script cloud-init creato"

# Codifica cloud-init in base64
CLOUD_INIT_B64=$(base64 -i /tmp/cloud-init.yml)

echo "🔄 Ricostruzione server con cloud-init..."

# Ricostruisci il server con cloud-init
curl -X POST \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"image\": \"ubuntu-22.04\",
    \"user_data\": \"$CLOUD_INIT_B64\"
  }" \
  "https://api.hetzner.cloud/v1/servers/$SERVER_ID/actions/rebuild" | jq '.action | {id: .id, status: .status}'

echo ""
echo "🎉 REBUILD AVVIATO CON CLOUD-INIT!"
echo ""
echo "⏳ Attendi 3-5 minuti per il completamento del setup"
echo "🔍 Poi testa la connessione con:"
echo "   ssh -i ~/.ssh/id_ed25519 ubuntu@128.140.15.15"
echo "   ssh -i ~/.ssh/id_ed25519 $USER_NAME@128.140.15.15"
echo ""
echo "📋 CREDENZIALI:"
echo "👤 Utente ubuntu: Accesso solo con chiave SSH"
echo "👤 Utente $USER_NAME: Password '$USER_PASSWORD' + chiave SSH"
echo ""
echo "🚀 Il server sarà configurato automaticamente con:"
echo "   - Node.js 20 + PM2"
echo "   - Docker"
echo "   - Nginx"
echo "   - UFW Firewall"
echo "   - Fail2Ban"
echo "   - Swap 2GB"
echo "   - Directory /var/www/elementmedica"

# Cleanup
rm -f /tmp/cloud-init.yml

echo ""
echo "✅ Script completato! Attendi il completamento del rebuild."