#!/bin/bash

# ===============================================
# ElementMedica 2.0 - Deploy Script
# Versione: 1.0
# Target: Server Hetzner configurato
# ===============================================

set -e  # Exit on any error

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurazione
REPO_URL="https://github.com/tuouser/elementmedica-2.0.git"  # Sostituisci con il tuo repo
APP_DIR="/home/elementmedica/app"
BACKUP_DIR="/home/elementmedica/backups"
LOG_FILE="/var/log/elementmedica/deploy.log"

# Funzioni di utilità
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a $LOG_FILE
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a $LOG_FILE
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
}

# Verifica utente
if [ "$USER" != "elementmedica" ]; then
    log_error "Questo script deve essere eseguito come utente elementmedica"
    log_info "Usa: sudo -u elementmedica $0"
    exit 1
fi

log_info "🚀 Avvio deploy ElementMedica 2.0"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Deploy started" >> $LOG_FILE

# ===============================================
# 1. VERIFICA PREREQUISITI
# ===============================================
log_info "🔍 Verifica prerequisiti..."

# Verifica Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js non installato"
    exit 1
fi

# Verifica PM2
if ! command -v pm2 &> /dev/null; then
    log_error "PM2 non installato"
    exit 1
fi

# Verifica Git
if ! command -v git &> /dev/null; then
    log_error "Git non installato"
    exit 1
fi

node_version=$(node --version)
npm_version=$(npm --version)
pm2_version=$(pm2 --version)

log_success "Node.js: $node_version"
log_success "npm: $npm_version"
log_success "PM2: $pm2_version"

# ===============================================
# 2. BACKUP ESISTENTE (se presente)
# ===============================================
if [ -d "$APP_DIR" ]; then
    log_info "💾 Backup applicazione esistente..."
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p $BACKUP_DIR
    
    # Stop PM2 processes
    pm2 stop all || true
    
    # Backup
    cp -r $APP_DIR "$BACKUP_DIR/$BACKUP_NAME"
    log_success "Backup creato: $BACKUP_DIR/$BACKUP_NAME"
fi

# ===============================================
# 3. CLONE REPOSITORY
# ===============================================
log_info "📦 Clone repository ElementMedica 2.0..."

# Rimuovi directory esistente
if [ -d "$APP_DIR" ]; then
    rm -rf $APP_DIR
fi

# Clone repository
git clone $REPO_URL $APP_DIR
cd $APP_DIR

log_success "Repository clonato in $APP_DIR"

# ===============================================
# 4. CONFIGURAZIONE ENVIRONMENT
# ===============================================
log_info "⚙️ Configurazione environment..."

if [ ! -f ".env" ]; then
    if [ -f ".env.template" ]; then
        cp .env.template .env
        log_warning "File .env creato da template - CONFIGURAZIONE RICHIESTA!"
    else
        log_info "Creazione file .env base..."
        cat > .env << 'EOF'
# ElementMedica 2.0 Production Configuration

# Server Configuration
NODE_ENV=production
PORT_API=4001
PORT_PROXY=4003
HOST=0.0.0.0

# Database (Supabase) - CONFIGURA QUESTI VALORI
DATABASE_URL="postgresql://postgres:PASSWORD@PROJECT.supabase.co:5432/postgres"
SUPABASE_URL="https://PROJECT.supabase.co"
SUPABASE_ANON_KEY="YOUR_ANON_KEY"
SUPABASE_SERVICE_KEY="YOUR_SERVICE_KEY"

# JWT Configuration - GENERA SECRETS SICURI
JWT_SECRET="GENERATE_STRONG_SECRET_32_CHARS_HERE"
JWT_EXPIRES_IN="24h"
REFRESH_TOKEN_SECRET="GENERATE_ANOTHER_STRONG_SECRET_32_CHARS"
REFRESH_TOKEN_EXPIRES_IN="7d"

# CORS Configuration
CORS_ORIGIN="https://tuodominio.com"
CORS_CREDENTIALS=true

# Email Configuration (Brevo) - CONFIGURA SE NECESSARIO
BREVO_API_KEY="YOUR_BREVO_API_KEY"
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
    fi
    
    chmod 600 .env
    log_warning "⚠️ IMPORTANTE: Configura il file .env prima di continuare!"
    log_info "📝 Modifica: nano $APP_DIR/.env"
    
    # Pausa per permettere configurazione
    echo ""
    read -p "Premi ENTER dopo aver configurato il file .env, o 'q' per uscire: " response
    if [ "$response" = "q" ]; then
        log_info "Deploy interrotto per configurazione .env"
        exit 0
    fi
fi

log_success "File .env configurato"

# ===============================================
# 5. INSTALLAZIONE DIPENDENZE
# ===============================================
log_info "📦 Installazione dipendenze..."

# Frontend dependencies
npm install

# Backend dependencies
if [ -d "backend" ]; then
    cd backend
    npm install
    cd ..
fi

log_success "Dipendenze installate"

# ===============================================
# 6. BUILD APPLICAZIONE
# ===============================================
log_info "🔨 Build applicazione..."

# Build frontend
npm run build

log_success "Applicazione buildata"

# ===============================================
# 7. CONFIGURAZIONE PM2
# ===============================================
log_info "⚡ Configurazione PM2..."

# Verifica se esiste ecosystem config
if [ ! -f "ecosystem.startup.config.js" ]; then
    log_info "Creazione configurazione PM2..."
    cat > ecosystem.startup.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'elementmedica-api',
      script: './backend/servers/api-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4001
      },
      max_memory_restart: '400M',
      error_file: '/var/log/elementmedica/api-error.log',
      out_file: '/var/log/elementmedica/api-out.log',
      log_file: '/var/log/elementmedica/api.log',
      time: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'elementmedica-proxy',
      script: './backend/servers/proxy-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4003
      },
      max_memory_restart: '300M',
      error_file: '/var/log/elementmedica/proxy-error.log',
      out_file: '/var/log/elementmedica/proxy-out.log',
      log_file: '/var/log/elementmedica/proxy.log',
      time: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF
fi

log_success "Configurazione PM2 pronta"

# ===============================================
# 8. AVVIO SERVIZI
# ===============================================
log_info "🚀 Avvio servizi PM2..."

# Stop existing processes
pm2 stop all || true
pm2 delete all || true

# Start new processes
pm2 start ecosystem.startup.config.js --env production

# Save PM2 configuration
pm2 save

log_success "Servizi PM2 avviati"

# ===============================================
# 9. VERIFICA HEALTH CHECK
# ===============================================
log_info "🔍 Verifica health check..."

sleep 10  # Attendi avvio servizi

# Test API Health
api_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/health || echo "000")
if [ "$api_health" = "200" ]; then
    log_success "✅ API Server health check OK"
else
    log_error "❌ API Server health check FAILED (HTTP $api_health)"
fi

# Test Proxy Health
proxy_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4003/health || echo "000")
if [ "$proxy_health" = "200" ]; then
    log_success "✅ Proxy Server health check OK"
else
    log_error "❌ Proxy Server health check FAILED (HTTP $proxy_health)"
fi

# ===============================================
# 10. CONFIGURAZIONE NGINX
# ===============================================
log_info "🌐 Aggiornamento configurazione Nginx..."

# Verifica se il sito è già configurato
if [ -f "/etc/nginx/sites-available/elementmedica" ]; then
    log_success "Configurazione Nginx già presente"
else
    log_warning "Configurazione Nginx non trovata - configurazione manuale richiesta"
fi

# Reload Nginx
sudo systemctl reload nginx || log_warning "Impossibile ricaricare Nginx"

# ===============================================
# 11. PULIZIA CACHE
# ===============================================
log_info "🧹 Pulizia cache..."

# Clear npm cache
npm cache clean --force

# Clear PM2 logs older than 7 days
pm2 flush

log_success "Cache pulita"

# ===============================================
# RIEPILOGO FINALE
# ===============================================
echo ""
echo "=============================================="
echo "🎉 DEPLOY ELEMENTMEDICA 2.0 COMPLETATO!"
echo "=============================================="
echo ""

# Status PM2
log_info "📊 Status PM2:"
pm2 status

echo ""
log_success "✅ Repository clonato e aggiornato"
log_success "✅ Dipendenze installate"
log_success "✅ Applicazione buildata"
log_success "✅ Servizi PM2 avviati"

if [ "$api_health" = "200" ] && [ "$proxy_health" = "200" ]; then
    log_success "✅ Health check OK"
else
    log_warning "⚠️ Alcuni health check falliti - verifica logs"
fi

echo ""
echo "📋 VERIFICA FINALE:"
echo "1. 🔍 Status: pm2 status"
echo "2. 📝 Logs: pm2 logs"
echo "3. 🌐 Test: curl http://localhost:4003/health"
echo "4. 🔒 SSL: sudo certbot --nginx -d tuodominio.com"
echo ""
echo "📞 TROUBLESHOOTING:"
echo "   - Logs PM2: pm2 logs"
echo "   - Logs sistema: tail -f /var/log/elementmedica/deploy.log"
echo "   - Restart: pm2 restart all"
echo "   - Status Nginx: sudo systemctl status nginx"
echo ""

if [ "$api_health" = "200" ] && [ "$proxy_health" = "200" ]; then
    log_success "🎯 ElementMedica 2.0 è LIVE e funzionante!"
else
    log_warning "⚠️ Deploy completato ma alcuni servizi potrebbero richiedere attenzione"
    log_info "📝 Controlla i logs: pm2 logs"
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - Deploy completed" >> $LOG_FILE