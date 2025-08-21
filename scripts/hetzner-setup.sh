#!/bin/bash

# 🔧 Script di Setup Server Hetzner
# Configura ambiente di produzione completo

set -e

# Configurazioni
APP_DIR="/var/www/elementformazione"
DOMAIN="elementformazione.com"
WWW_DOMAIN="www.elementformazione.com"
EMAIL="admin@elementformazione.com"

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Funzioni di utilità
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Installazione dipendenze sistema
install_system_dependencies() {
    log_info "Installazione dipendenze sistema..."
    
    # Aggiorna sistema
    apt update && apt upgrade -y
    
    # Installa pacchetti base
    apt install -y curl wget git unzip software-properties-common
    
    # Installa Node.js LTS
    if ! command -v node &> /dev/null; then
        log_info "Installazione Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
        apt install -y nodejs
    fi
    
    # Installa PM2 globalmente
    if ! command -v pm2 &> /dev/null; then
        log_info "Installazione PM2..."
        npm install -g pm2
        pm2 startup
    fi
    
    # Installa Nginx
    if ! command -v nginx &> /dev/null; then
        log_info "Installazione Nginx..."
        apt install -y nginx
    fi
    
    # Installa Certbot
    if ! command -v certbot &> /dev/null; then
        log_info "Installazione Certbot..."
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Installa UFW
    if ! command -v ufw &> /dev/null; then
        log_info "Installazione UFW..."
        apt install -y ufw
    fi
    
    log_success "Dipendenze sistema installate"
}

# Configurazione firewall
setup_firewall() {
    log_info "Configurazione firewall..."
    
    # Reset UFW
    ufw --force reset
    
    # Regole base
    ufw default deny incoming
    ufw default allow outgoing
    
    # Porte necessarie
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Abilita UFW
    ufw --force enable
    
    log_success "Firewall configurato"
}

# Configurazione Nginx
setup_nginx() {
    log_info "Configurazione Nginx..."
    
    # Backup configurazione esistente
    if [ -f "/etc/nginx/sites-available/$DOMAIN" ]; then
        cp "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-available/$DOMAIN.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Crea configurazione Nginx
    cat > "/etc/nginx/sites-available/$DOMAIN" << EOF
server {
    listen 80;
    server_name $DOMAIN $WWW_DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $WWW_DOMAIN;
    
    # SSL configuration will be added by Certbot
    
    # Redirect www to non-www
    return 301 https://$DOMAIN\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL configuration will be added by Certbot
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Frontend (static files)
    location / {
        root $APP_DIR/frontend;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:4003/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Documents proxy
    location /documents/ {
        proxy_pass http://localhost:4003/documents/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings for file operations
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:4003/health;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    # Abilita sito
    ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
    
    # Rimuovi configurazione default se esiste
    rm -f /etc/nginx/sites-enabled/default
    
    # Test configurazione
    nginx -t
    
    # Riavvia Nginx
    systemctl restart nginx
    systemctl enable nginx
    
    log_success "Nginx configurato"
}

# Configurazione SSL
setup_ssl() {
    log_info "Configurazione SSL con Let's Encrypt..."
    
    # Ottieni certificati SSL
    certbot --nginx -d $DOMAIN -d $WWW_DOMAIN --non-interactive --agree-tos --email $EMAIL
    
    # Setup auto-renewal
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    log_success "SSL configurato"
}

# Installazione applicazione
install_application() {
    log_info "Installazione applicazione..."
    
    # Crea directory applicazione
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    # Installa dipendenze backend
    if [ -d "backend" ]; then
        cd backend
        npm ci --production
        cd ..
    fi
    
    # Crea directory log
    mkdir -p /var/log/pm2
    
    log_success "Applicazione installata"
}

# Aggiornamento applicazione
update_application() {
    log_info "Aggiornamento applicazione..."
    
    cd $APP_DIR
    
    # Installa/aggiorna dipendenze backend
    if [ -d "backend" ]; then
        cd backend
        npm ci --production
        cd ..
    fi
    
    # Riavvia servizi PM2
    if [ -f "backend/ecosystem.config.js" ]; then
        pm2 reload backend/ecosystem.config.js --env production
    fi
    
    log_success "Applicazione aggiornata"
}

# Avvio servizi
start_services() {
    log_info "Avvio servizi..."
    
    cd $APP_DIR
    
    # Avvia applicazione con PM2
    if [ -f "backend/ecosystem.config.js" ]; then
        pm2 start backend/ecosystem.config.js --env production
        pm2 save
    fi
    
    # Verifica stato servizi
    systemctl status nginx --no-pager
    pm2 status
    
    log_success "Servizi avviati"
}

# Verifica stato
check_status() {
    log_info "Verifica stato sistema..."
    
    echo "=== Stato Nginx ==="
    systemctl status nginx --no-pager
    
    echo "\n=== Stato PM2 ==="
    pm2 status
    
    echo "\n=== Stato Firewall ==="
    ufw status
    
    echo "\n=== Certificati SSL ==="
    certbot certificates
    
    echo "\n=== Test Connettività ==="
    if curl -f -s https://$DOMAIN/health > /dev/null; then
        log_success "Sito raggiungibile: https://$DOMAIN"
    else
        log_warning "Sito non raggiungibile: https://$DOMAIN"
    fi
    
    if curl -f -s https://$WWW_DOMAIN > /dev/null; then
        log_success "Redirect www funzionante: https://$WWW_DOMAIN"
    else
        log_warning "Redirect www non funzionante: https://$WWW_DOMAIN"
    fi
}

# Funzione principale
case "${1:-help}" in
    "install")
        log_info "🔧 Installazione completa server Hetzner..."
        install_system_dependencies
        setup_firewall
        setup_nginx
        install_application
        start_services
        setup_ssl
        check_status
        log_success "🎉 Installazione completata!"
        ;;
    "update")
        log_info "🔄 Aggiornamento applicazione..."
        update_application
        log_success "✅ Aggiornamento completato!"
        ;;
    "start")
        start_services
        ;;
    "status")
        check_status
        ;;
    "ssl")
        setup_ssl
        ;;
    "nginx")
        setup_nginx
        systemctl restart nginx
        ;;
    "help")
        echo "Uso: $0 [install|update|start|status|ssl|nginx|help]"
        echo "  install - Installazione completa del server"
        echo "  update  - Aggiornamento applicazione"
        echo "  start   - Avvio servizi"
        echo "  status  - Verifica stato sistema"
        echo "  ssl     - Configurazione SSL"
        echo "  nginx   - Riconfigurazione Nginx"
        echo "  help    - Mostra questo aiuto"
        ;;
    *)
        log_error "Comando non riconosciuto: $1"
        echo "Usa '$0 help' per vedere i comandi disponibili"
        exit 1
        ;;
esac