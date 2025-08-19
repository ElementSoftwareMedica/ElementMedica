#!/bin/bash

# ElementMedica 2.0 - Setup Server Hetzner via Console Web
# Eseguire questo script tramite console web Hetzner
# Login: root / Password: TtnfAHscuFAj

set -e  # Exit on any error

echo "🚀 ElementMedica 2.0 - Setup Server Hetzner"
echo "📅 $(date)"
echo "🖥️  Server: $(hostname)"
echo "👤 Utente: $(whoami)"
echo "📊 Sistema: $(lsb_release -d | cut -f2)"
echo "💾 Memoria: $(free -h | grep Mem | awk '{print $2}')"
echo "💿 Disco: $(df -h / | tail -1 | awk '{print $4}' | sed 's/G/ GB/')"
echo ""

# 1. Aggiornamento Sistema
echo "🔧 1/8 - Aggiornamento sistema..."
apt update -y
apt upgrade -y
echo "✅ Sistema aggiornato"
echo ""

# 2. Installazione Pacchetti Base
echo "📦 2/8 - Installazione pacchetti base..."
apt install -y curl wget git unzip software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release \
    ufw fail2ban nginx htop nano vim
echo "✅ Pacchetti base installati"
echo ""

# 3. Installazione Node.js 20
echo "🟢 3/8 - Installazione Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
echo "✅ Node.js $(node --version) e PM2 $(pm2 --version) installati"
echo ""

# 4. Installazione Docker
echo "🐳 4/8 - Installazione Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo 'deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
    https://download.docker.com/linux/ubuntu '$(lsb_release -cs)' stable' | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io
systemctl enable docker
systemctl start docker
echo "✅ Docker $(docker --version | cut -d' ' -f3 | sed 's/,//') installato"
echo ""

# 5. Configurazione Utenti e SSH
echo "👥 5/8 - Configurazione utenti e SSH..."

# Crea utente elementmedica
useradd -m -s /bin/bash elementmedica
echo 'elementmedica:ElementMedica2024!' | chpasswd
usermod -aG sudo,docker elementmedica

# Configura SSH correttamente
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

# Configura SSH keys
mkdir -p /root/.ssh && chmod 700 /root/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFj/Zfz2eb5eKKvjchGg8i2E5IzeIr4Nx7xLC1UxSnlY formazioneperimpresa@gmail.com' > /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

# Configura SSH per utente elementmedica
mkdir -p /home/elementmedica/.ssh && chmod 700 /home/elementmedica/.ssh
cp /root/.ssh/authorized_keys /home/elementmedica/.ssh/
chown -R elementmedica:elementmedica /home/elementmedica/.ssh

# Riavvia SSH service
systemctl restart ssh
systemctl enable ssh

echo "✅ Utenti configurati - elementmedica creato con password 'ElementMedica2024!'"
echo "✅ SSH configurato - Test: ssh root@128.140.15.15"
echo ""

# 6. Configurazione Sicurezza
echo "🛡️  6/8 - Configurazione sicurezza..."

# UFW Firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Fail2Ban
systemctl enable fail2ban
systemctl start fail2ban

# Swap 2GB
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "✅ UFW attivo - Porte 22, 80, 443 aperte"
echo "✅ Fail2Ban attivo"
echo "✅ Swap 2GB configurato"
echo ""

# 7. Configurazione Directory e Nginx
echo "🌐 7/8 - Configurazione Nginx..."

# Directory applicazione
mkdir -p /var/www/elementmedica
chown -R elementmedica:elementmedica /var/www/elementmedica

# Configurazione Nginx
cat > /etc/nginx/sites-available/elementmedica << 'EOF'
server {
    listen 80;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Proxy to Node.js
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
    }
    
    # Health check
    location /nginx-health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Attiva configurazione
ln -sf /etc/nginx/sites-available/elementmedica /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "✅ Directory /var/www/elementmedica creata"
echo "✅ Nginx configurato come reverse proxy (porta 4003)"
echo ""

# 8. Verifica Finale
echo "🔍 8/8 - Verifica finale..."
echo ""
echo "📊 STATO SERVIZI:"
echo "  🟢 SSH: $(systemctl is-active ssh)"
echo "  🟢 Docker: $(systemctl is-active docker)"
echo "  🟢 Nginx: $(systemctl is-active nginx)"
echo "  🟢 Fail2Ban: $(systemctl is-active fail2ban)"
echo "  🟢 UFW: $(ufw status | head -1 | cut -d':' -f2 | xargs)"
echo ""
echo "📦 VERSIONI INSTALLATE:"
echo "  🟢 Node.js: $(node --version)"
echo "  🟢 NPM: $(npm --version)"
echo "  🟢 PM2: $(pm2 --version)"
echo "  🟢 Docker: $(docker --version | cut -d' ' -f3 | sed 's/,//')"
echo "  🟢 Nginx: $(nginx -v 2>&1 | cut -d'/' -f2)"
echo ""
echo "💾 RISORSE SISTEMA:"
echo "  📊 Memoria: $(free -h | grep Mem | awk '{print $3"/"$2}')"
echo "  💿 Disco: $(df -h / | tail -1 | awk '{print $3"/"$2}')"
echo "  🔄 Swap: $(free -h | grep Swap | awk '{print $2}')"
echo ""
echo "🔑 CREDENZIALI:"
echo "  👤 root: TtnfAHscuFAj"
echo "  👤 elementmedica: ElementMedica2024!"
echo ""
echo "🧪 TEST CONNESSIONI:"
echo "  SSH Root: ssh root@128.140.15.15"
echo "  SSH User: ssh elementmedica@128.140.15.15"
echo "  Nginx: curl http://128.140.15.15/nginx-health"
echo ""
echo "🚀 SETUP COMPLETATO CON SUCCESSO!"
echo "📖 Prossimi passi:"
echo "  1. Test SSH: ssh root@128.140.15.15"
echo "  2. Deploy applicazione in /var/www/elementmedica"
echo "  3. Configurazione dominio e SSL"
echo ""
echo "📅 Setup completato: $(date)"