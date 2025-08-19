#!/bin/bash

# ===============================================
# ElementMedica 2.0 - Setup Completo Server Hetzner
# Versione: 1.0
# Target: Ubuntu 22.04 LTS su Hetzner CX11
# Budget: €4.78/mese
# ===============================================

set -e  # Exit on any error

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzioni di utilità
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verifica se siamo root
if [[ $EUID -ne 0 ]]; then
   log_error "Questo script deve essere eseguito come root"
   exit 1
fi

log_info "🚀 Avvio setup completo ElementMedica 2.0 su Hetzner CX11"
log_info "Target: Ubuntu 22.04 LTS - Budget: €4.78/mese"

# ===============================================
# 1. AGGIORNAMENTO SISTEMA
# ===============================================
log_info "📦 Aggiornamento sistema Ubuntu 22.04..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get autoremove -y
apt-get autoclean

# ===============================================
# 2. CONFIGURAZIONE TIMEZONE E HOSTNAME
# ===============================================
log_info "🕐 Configurazione timezone e hostname..."
timedatectl set-timezone Europe/Rome
hostnamectl set-hostname elementmedica-prod

# ===============================================
# 3. INSTALLAZIONE PACCHETTI BASE
# ===============================================
log_info "📦 Installazione pacchetti base..."
apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    htop \
    iotop \
    nethogs \
    nano \
    vim \
    ufw \
    fail2ban \
    logrotate \
    cron

# ===============================================
# 4. CREAZIONE UTENTE ELEMENTMEDICA
# ===============================================
log_info "👤 Creazione utente elementmedica..."
if ! id "elementmedica" &>/dev/null; then
    useradd -m -s /bin/bash elementmedica
    usermod -aG sudo elementmedica
    log_success "Utente elementmedica creato"
else
    log_warning "Utente elementmedica già esistente"
fi

# Configurazione SSH per utente elementmedica
mkdir -p /home/elementmedica/.ssh
if [ -f /root/.ssh/authorized_keys ]; then
    cp /root/.ssh/authorized_keys /home/elementmedica/.ssh/
    chown -R elementmedica:elementmedica /home/elementmedica/.ssh
    chmod 700 /home/elementmedica/.ssh
    chmod 600 /home/elementmedica/.ssh/authorized_keys
    log_success "SSH key configurata per utente elementmedica"
fi

# ===============================================
# 5. INSTALLAZIONE NODE.JS 18 LTS
# ===============================================
log_info "🟢 Installazione Node.js 18 LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
node_version=$(node --version)
npm_version=$(npm --version)
log_success "Node.js installato: $node_version, npm: $npm_version"

# ===============================================
# 6. INSTALLAZIONE PM2
# ===============================================
log_info "⚡ Installazione PM2 Process Manager..."
npm install -g pm2@latest
pm2_version=$(pm2 --version)
log_success "PM2 installato: $pm2_version"

# ===============================================
# 7. INSTALLAZIONE DOCKER
# ===============================================
log_info "🐳 Installazione Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Aggiungi elementmedica al gruppo docker
usermod -aG docker elementmedica

docker_version=$(docker --version)
compose_version=$(docker compose version)
log_success "Docker installato: $docker_version"
log_success "Docker Compose: $compose_version"

# ===============================================
# 8. INSTALLAZIONE NGINX
# ===============================================
log_info "🌐 Installazione Nginx..."
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
nginx_version=$(nginx -v 2>&1)
log_success "Nginx installato: $nginx_version"

# ===============================================
# 9. INSTALLAZIONE CERTBOT
# ===============================================
log_info "🔒 Installazione Certbot per SSL..."
apt-get install -y certbot python3-certbot-nginx
certbot_version=$(certbot --version)
log_success "Certbot installato: $certbot_version"

# ===============================================
# 10. CONFIGURAZIONE UFW FIREWALL
# ===============================================
log_info "🔥 Configurazione UFW Firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Porte necessarie
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 9090/tcp  # Monitoring (solo per admin)

ufw --force enable
log_success "UFW Firewall configurato e attivato"

# ===============================================
# 11. CONFIGURAZIONE FAIL2BAN
# ===============================================
log_info "🛡️ Configurazione Fail2Ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600
EOF

systemctl enable fail2ban
systemctl start fail2ban
log_success "Fail2Ban configurato e attivato"

# ===============================================
# 12. CONFIGURAZIONE SWAP (2GB)
# ===============================================
log_info "💾 Configurazione Swap 2GB..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # Rendi permanente
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    
    # Ottimizza parametri swap
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
    sysctl -p
    
    log_success "Swap 2GB configurato e attivato"
else
    log_warning "Swap file già esistente"
fi

# ===============================================
# 13. CONFIGURAZIONE SSH SICURA
# ===============================================
log_info "🔐 Configurazione SSH sicura..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

cat > /etc/ssh/sshd_config << 'EOF'
# ElementMedica SSH Configuration
Port 22
Protocol 2

# Authentication
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

# Security
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*

# Connection settings
ClientAliveInterval 300
ClientAliveCountMax 2
MaxAuthTries 3
MaxSessions 10

# Subsystem
Subsystem sftp /usr/lib/openssh/sftp-server
EOF

# Non riavviare SSH ora per non perdere la connessione
log_success "SSH configurato (riavvio posticipato)"

# ===============================================
# 14. CREAZIONE STRUTTURA DIRECTORY
# ===============================================
log_info "📁 Creazione struttura directory..."
mkdir -p /home/elementmedica/{app,logs,backups,ssl}
mkdir -p /var/log/elementmedica
mkdir -p /opt/elementmedica/{config,scripts}

# Imposta permessi
chown -R elementmedica:elementmedica /home/elementmedica
chown -R elementmedica:elementmedica /var/log/elementmedica
chown -R elementmedica:elementmedica /opt/elementmedica

log_success "Struttura directory creata"

# ===============================================
# 15. CONFIGURAZIONE NGINX OTTIMIZZATA
# ===============================================
log_info "⚙️ Configurazione Nginx ottimizzata..."
cat > /etc/nginx/nginx.conf << 'EOF'
# ElementMedica Nginx Configuration - Ottimizzato per 2GB RAM
user www-data;
worker_processes 1;
pid /run/nginx.pid;
worker_rlimit_nofile 2048;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;
    
    # Buffer sizes (ottimizzato per 2GB RAM)
    client_body_buffer_size 16K;
    client_header_buffer_size 1k;
    client_max_body_size 50m;
    large_client_header_buffers 4 16k;
    
    # Timeouts
    client_body_timeout 12;
    client_header_timeout 12;
    send_timeout 10;
    
    # MIME
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    # Include server configs
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

# Rimuovi configurazione default
rm -f /etc/nginx/sites-enabled/default

# Crea configurazione ElementMedica
cat > /etc/nginx/sites-available/elementmedica << 'EOF'
# ElementMedica Server Configuration
upstream api_backend {
    server 127.0.0.1:4001;
    keepalive 32;
}

upstream proxy_backend {
    server 127.0.0.1:4003;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name _;
    
    # SSL Configuration (sarà aggiornata da Certbot)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # API Proxy
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://proxy_backend;
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
    
    # Health checks
    location /health {
        proxy_pass http://proxy_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }
    
    # Static files
    location / {
        root /home/elementmedica/app/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Assets with long cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /home/elementmedica/app/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Abilita sito
ln -sf /etc/nginx/sites-available/elementmedica /etc/nginx/sites-enabled/

# Test configurazione
nginx -t
systemctl reload nginx

log_success "Nginx configurato e ricaricato"

# ===============================================
# 16. CONFIGURAZIONE LOG ROTATION
# ===============================================
log_info "📝 Configurazione log rotation..."
cat > /etc/logrotate.d/elementmedica << 'EOF'
/var/log/elementmedica/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 elementmedica elementmedica
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}

/home/elementmedica/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 elementmedica elementmedica
    su elementmedica elementmedica
}
EOF

log_success "Log rotation configurato"

# ===============================================
# 17. SCRIPT DI MONITORAGGIO
# ===============================================
log_info "📊 Creazione script di monitoraggio..."
cat > /opt/elementmedica/scripts/monitor.sh << 'EOF'
#!/bin/bash
# ElementMedica Server Monitor

LOGFILE="/var/log/elementmedica/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "=== ElementMedica Server Status $DATE ===" >> $LOGFILE
echo "Uptime: $(uptime)" >> $LOGFILE
echo "Memory: $(free -h | grep Mem)" >> $LOGFILE
echo "Disk: $(df -h / | tail -1)" >> $LOGFILE
echo "Load: $(cat /proc/loadavg)" >> $LOGFILE

# PM2 Status (se disponibile)
if command -v pm2 &> /dev/null; then
    echo "PM2 Status:" >> $LOGFILE
    sudo -u elementmedica pm2 status >> $LOGFILE 2>&1
fi

# Docker Status (se disponibile)
if command -v docker &> /dev/null; then
    echo "Docker Status:" >> $LOGFILE
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" >> $LOGFILE 2>&1
fi

echo "=== End Status ===" >> $LOGFILE
echo "" >> $LOGFILE
EOF

chmod +x /opt/elementmedica/scripts/monitor.sh

# Aggiungi a crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/elementmedica/scripts/monitor.sh") | crontab -

log_success "Script di monitoraggio configurato"

# ===============================================
# 18. TEMPLATE ENVIRONMENT
# ===============================================
log_info "🔧 Creazione template environment..."
cat > /home/elementmedica/app/.env.template << 'EOF'
# ElementMedica 2.0 Production Configuration

# Server Configuration
NODE_ENV=production
PORT_API=4001
PORT_PROXY=4003
HOST=0.0.0.0

# Database (Supabase)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres"
SUPABASE_URL="https://[PROJECT].supabase.co"
SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"
SUPABASE_SERVICE_KEY="[YOUR_SERVICE_KEY]"

# JWT Configuration
JWT_SECRET="[GENERATE_STRONG_SECRET_32_CHARS]"
JWT_EXPIRES_IN="24h"
REFRESH_TOKEN_SECRET="[GENERATE_STRONG_SECRET_32_CHARS]"
REFRESH_TOKEN_EXPIRES_IN="7d"

# CORS Configuration
CORS_ORIGIN="https://tuodominio.com"
CORS_CREDENTIALS=true

# File Storage (Cloudflare R2)
R2_ACCOUNT_ID="[YOUR_ACCOUNT_ID]"
R2_ACCESS_KEY_ID="[YOUR_ACCESS_KEY]"
R2_SECRET_ACCESS_KEY="[YOUR_SECRET_KEY]"
R2_BUCKET_NAME="elementmedica-storage"
R2_PUBLIC_URL="https://storage.tuodominio.com"

# Email Configuration (Brevo)
BREVO_API_KEY="[YOUR_BREVO_API_KEY]"
FROM_EMAIL="noreply@tuodominio.com"
FROM_NAME="ElementMedica"

# Monitoring
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/elementmedica/app.log
EOF

chown elementmedica:elementmedica /home/elementmedica/app/.env.template

log_success "Template environment creato"

# ===============================================
# 19. SCRIPT DI AVVIO
# ===============================================
log_info "🚀 Creazione script di avvio..."
cat > /opt/elementmedica/scripts/start-elementmedica.sh << 'EOF'
#!/bin/bash
# ElementMedica Startup Script

set -e

USER="elementmedica"
APP_DIR="/home/elementmedica/app"
LOG_FILE="/var/log/elementmedica/startup.log"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

log_message "🚀 Avvio ElementMedica 2.0..."

# Verifica utente
if [ "$EUID" -eq 0 ]; then
    log_message "Cambio utente a $USER..."
    exec sudo -u $USER $0 "$@"
fi

# Verifica directory applicazione
if [ ! -d "$APP_DIR" ]; then
    log_message "❌ Directory applicazione non trovata: $APP_DIR"
    exit 1
fi

cd $APP_DIR

# Verifica file .env
if [ ! -f ".env" ]; then
    log_message "⚠️ File .env non trovato, copio template..."
    cp .env.template .env
    log_message "📝 Configura il file .env prima di continuare!"
    exit 1
fi

# Avvia con PM2
log_message "⚡ Avvio servizi con PM2..."
pm2 start ecosystem.startup.config.js --env production
pm2 save

log_message "✅ ElementMedica 2.0 avviato con successo!"
log_message "📊 Status: pm2 status"
pm2 status
EOF

chmod +x /opt/elementmedica/scripts/start-elementmedica.sh

log_success "Script di avvio creato"

# ===============================================
# 20. SERVIZIO SYSTEMD
# ===============================================
log_info "⚙️ Configurazione servizio systemd..."
cat > /etc/systemd/system/elementmedica.service << 'EOF'
[Unit]
Description=ElementMedica 2.0 Application
After=network.target
Wants=network.target

[Service]
Type=forking
User=elementmedica
Group=elementmedica
WorkingDirectory=/home/elementmedica/app
ExecStart=/opt/elementmedica/scripts/start-elementmedica.sh
ExecReload=/bin/kill -USR2 $MAINPID
KillMode=mixed
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable elementmedica

log_success "Servizio systemd configurato"

# ===============================================
# 21. OTTIMIZZAZIONI SISTEMA
# ===============================================
log_info "⚡ Applicazione ottimizzazioni sistema..."

# Limiti sistema
cat >> /etc/security/limits.conf << 'EOF'
# ElementMedica optimizations
elementmedica soft nofile 65536
elementmedica hard nofile 65536
elementmedica soft nproc 32768
elementmedica hard nproc 32768
EOF

# Parametri kernel
cat >> /etc/sysctl.conf << 'EOF'
# ElementMedica network optimizations
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr
EOF

sysctl -p

log_success "Ottimizzazioni sistema applicate"

# ===============================================
# 22. PULIZIA FINALE
# ===============================================
log_info "🧹 Pulizia finale..."
apt-get autoremove -y
apt-get autoclean
updatedb

# ===============================================
# RIEPILOGO FINALE
# ===============================================
echo ""
echo "=============================================="
echo "🎉 SETUP ELEMENTMEDICA 2.0 COMPLETATO!"
echo "=============================================="
echo ""
log_success "✅ Sistema Ubuntu 22.04 LTS aggiornato"
log_success "✅ Node.js 18 LTS installato"
log_success "✅ PM2 Process Manager installato"
log_success "✅ Docker e Docker Compose installati"
log_success "✅ Nginx configurato e ottimizzato"
log_success "✅ Certbot per SSL installato"
log_success "✅ UFW Firewall configurato"
log_success "✅ Fail2Ban configurato"
log_success "✅ Swap 2GB configurato"
log_success "✅ Utente elementmedica creato"
log_success "✅ Struttura directory creata"
log_success "✅ Script di monitoraggio configurato"
log_success "✅ Servizio systemd configurato"
log_success "✅ Ottimizzazioni sistema applicate"

echo ""
echo "📋 PROSSIMI PASSI:"
echo "1. 🌐 Configura DNS: punta il dominio a questo server"
echo "2. 🔒 Ottieni SSL: sudo certbot --nginx -d tuodominio.com"
echo "3. 📦 Deploy app: clona repository in /home/elementmedica/app"
echo "4. ⚙️ Configura .env: copia da .env.template e personalizza"
echo "5. 🚀 Avvia app: /opt/elementmedica/scripts/start-elementmedica.sh"
echo ""
echo "💰 COSTO TOTALE: €4.78/mese"
echo "   - Hetzner CX11: €3.29/mese"
echo "   - Backup: €0.66/mese"
echo "   - Dominio: €0.83/mese"
echo ""
echo "📞 SUPPORTO:"
echo "   - Logs: /var/log/elementmedica/"
echo "   - Monitor: /opt/elementmedica/scripts/monitor.sh"
echo "   - Status: systemctl status elementmedica"
echo ""
log_success "🎯 ElementMedica 2.0 è pronto per il deploy!"

# Nota importante per SSH
echo ""
log_warning "⚠️ IMPORTANTE: SSH è stato configurato per maggiore sicurezza"
log_warning "   - Root login disabilitato"
log_warning "   - Password authentication disabilitato"
log_warning "   - Usa: ssh -i ~/.ssh/elementmedica_hetzner elementmedica@SERVER_IP"
echo ""
log_info "🔄 Riavvio SSH tra 10 secondi per applicare configurazioni..."
sleep 10
systemctl restart sshd
log_success "SSH riavviato con nuove configurazioni"