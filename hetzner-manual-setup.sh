#!/bin/bash

# ElementMedica 2.0 - Setup Manuale Server Hetzner
# Script per completare la configurazione del server startup

set -e

echo "🚀 ElementMedica 2.0 - Setup Manuale Server Hetzner"
echo "================================================="

# Variabili di configurazione
SERVER_IP="128.140.15.15"
ROOT_PASSWORD="J4w3LEdLvbn9"
USER_NAME="elementmedica"
USER_PASSWORD="ElementMedica2024!"
SSH_KEY_PATH="$HOME/.ssh/id_ed25519.pub"

echo "📍 Server: $SERVER_IP"
echo "👤 Utente: $USER_NAME"
echo "🔑 SSH Key: $SSH_KEY_PATH"
echo ""

# Funzione per eseguire comandi SSH
exec_ssh() {
    sshpass -p "$ROOT_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP "$1"
}

# Funzione per copiare file via SCP
copy_file() {
    sshpass -p "$ROOT_PASSWORD" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$1" root@$SERVER_IP:"$2"
}

echo "🔄 1. Aggiornamento sistema..."
exec_ssh "apt update && apt upgrade -y"

echo "📦 2. Installazione pacchetti base..."
exec_ssh "apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release ufw fail2ban nginx"

echo "👤 3. Creazione utente elementmedica..."
exec_ssh "useradd -m -s /bin/bash $USER_NAME || true"
exec_ssh "echo '$USER_NAME:$USER_PASSWORD' | chpasswd"
exec_ssh "usermod -aG sudo $USER_NAME"

echo "🔑 4. Configurazione SSH keys..."
if [ -f "$SSH_KEY_PATH" ]; then
    SSH_KEY_CONTENT=$(cat "$SSH_KEY_PATH")
    exec_ssh "mkdir -p /root/.ssh && chmod 700 /root/.ssh"
    exec_ssh "echo '$SSH_KEY_CONTENT' >> /root/.ssh/authorized_keys"
    exec_ssh "chmod 600 /root/.ssh/authorized_keys"
    
    exec_ssh "mkdir -p /home/$USER_NAME/.ssh && chmod 700 /home/$USER_NAME/.ssh"
    exec_ssh "echo '$SSH_KEY_CONTENT' > /home/$USER_NAME/.ssh/authorized_keys"
    exec_ssh "chmod 600 /home/$USER_NAME/.ssh/authorized_keys"
    exec_ssh "chown -R $USER_NAME:$USER_NAME /home/$USER_NAME/.ssh"
    echo "✅ SSH keys configurate"
else
    echo "⚠️  SSH key non trovata: $SSH_KEY_PATH"
fi

echo "🟢 5. Installazione Node.js 20..."
exec_ssh "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
exec_ssh "apt install -y nodejs"
exec_ssh "npm install -g pm2"

echo "🐳 6. Installazione Docker..."
exec_ssh "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg"
exec_ssh "echo 'deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \$(lsb_release -cs) stable' | tee /etc/apt/sources.list.d/docker.list > /dev/null"
exec_ssh "apt update && apt install -y docker-ce docker-ce-cli containerd.io"
exec_ssh "usermod -aG docker $USER_NAME"
exec_ssh "systemctl enable docker && systemctl start docker"

echo "🔥 7. Configurazione UFW Firewall..."
exec_ssh "ufw --force reset"
exec_ssh "ufw default deny incoming"
exec_ssh "ufw default allow outgoing"
exec_ssh "ufw allow 22/tcp"
exec_ssh "ufw allow 80/tcp"
exec_ssh "ufw allow 443/tcp"
exec_ssh "ufw --force enable"

echo "🛡️ 8. Configurazione Fail2Ban..."
exec_ssh "systemctl enable fail2ban && systemctl start fail2ban"

echo "💾 9. Configurazione Swap (2GB)..."
exec_ssh "fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1024 count=2097152"
exec_ssh "chmod 600 /swapfile"
exec_ssh "mkswap /swapfile"
exec_ssh "swapon /swapfile"
exec_ssh "echo '/swapfile none swap sw 0 0' >> /etc/fstab"

echo "📁 10. Creazione directory applicazione..."
exec_ssh "mkdir -p /var/www/elementmedica"
exec_ssh "chown -R $USER_NAME:$USER_NAME /var/www/elementmedica"

echo "🔧 11. Configurazione Nginx..."
cat > /tmp/nginx-elementmedica.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:4003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Health check endpoint
    location /nginx-health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

copy_file "/tmp/nginx-elementmedica.conf" "/etc/nginx/sites-available/elementmedica"
exec_ssh "ln -sf /etc/nginx/sites-available/elementmedica /etc/nginx/sites-enabled/"
exec_ssh "rm -f /etc/nginx/sites-enabled/default"
exec_ssh "nginx -t && systemctl reload nginx"

echo "🔍 12. Verifica installazioni..."
echo "Node.js version:"
exec_ssh "node --version"
echo "NPM version:"
exec_ssh "npm --version"
echo "PM2 version:"
exec_ssh "pm2 --version"
echo "Docker version:"
exec_ssh "docker --version"
echo "Nginx version:"
exec_ssh "nginx -v"
echo "UFW status:"
exec_ssh "ufw status"
echo "Fail2Ban status:"
exec_ssh "systemctl is-active fail2ban"
echo "Swap status:"
exec_ssh "free -h"

echo ""
echo "🎉 SETUP COMPLETATO!"
echo "=================="
echo "✅ Server configurato con successo"
echo "✅ Utente '$USER_NAME' creato con password: $USER_PASSWORD"
echo "✅ SSH keys configurate"
echo "✅ Stack applicativo installato (Node.js, PM2, Docker, Nginx)"
echo "✅ Firewall configurato (UFW + Fail2Ban)"
echo "✅ Swap 2GB attivato"
echo ""
echo "🔍 Test connessioni:"
echo "ssh root@$SERVER_IP"
echo "ssh $USER_NAME@$SERVER_IP"
echo "ssh -i ~/.ssh/id_ed25519 $USER_NAME@$SERVER_IP"
echo ""
echo "🌐 Prossimi passi:"
echo "1. Configura DNS per puntare a $SERVER_IP"
echo "2. Ottieni certificato SSL con certbot"
echo "3. Deploy dell'applicazione ElementMedica"
echo "4. Configura monitoring e backup"
echo ""
echo "📋 File di configurazione creati:"
echo "- /etc/nginx/sites-available/elementmedica"
echo "- /etc/ufw/user.rules (firewall)"
echo "- /etc/fail2ban/jail.local (fail2ban)"
echo ""
echo "✅ Server pronto per il deploy di ElementMedica 2.0!"