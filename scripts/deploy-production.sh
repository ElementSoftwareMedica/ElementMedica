#!/bin/bash
# scripts/deploy-production.sh
# =============================================================================
# Deploy Script per PRODUCTION - ElementMedica Multi-Domain
# =============================================================================
# Deploy su Hetzner VPS: 128.140.15.15
# - elementformazione.com (CRM)
# - elementmedica.com (Frontend Pubblico)
# =============================================================================

set -e  # Exit on error

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configurazione Hetzner
SERVER_IP="128.140.15.15"
SERVER_USER="elementmedica"
SERVER_PATH="/var/www/elementmedica"
SSH_KEY="$HOME/.ssh/id_ed25519"

# Directory base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

# Functions
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

log_deploy() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🚀 ElementMedica Production Deploy${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""
echo "📡 Server: $SERVER_USER@$SERVER_IP"
echo "📁 Remote path: $SERVER_PATH"
echo "🔑 SSH Key: $SSH_KEY"
echo ""

# =============================================================================
# PRE-FLIGHT CHECKS
# =============================================================================
log_info "Running pre-flight checks..."

# Verifica build directories
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    log_error "dist/ non trovato! Esegui prima: ./scripts/build-production.sh"
    exit 1
fi

if [ ! -d "dist-public" ] || [ ! -f "dist-public/index.html" ]; then
    log_error "dist-public/ non trovato! Esegui prima: ./scripts/build-production.sh"
    exit 1
fi

log_success "Build directories OK"
echo "   • dist/: $(du -sh dist | cut -f1)"
echo "   • dist-public/: $(du -sh dist-public | cut -f1)"

# Test connessione SSH
log_info "Testing SSH connection..."
if ssh -i $SSH_KEY -o ConnectTimeout=10 -o BatchMode=yes $SERVER_USER@$SERVER_IP "echo 'SSH OK'" 2>/dev/null; then
    log_success "SSH connection OK"
else
    log_warning "SSH requires passphrase. Please enter when prompted."
fi

# =============================================================================
# BACKUP REMOTO
# =============================================================================
echo ""
log_deploy "Creating remote backup..."

ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "
    cd $SERVER_PATH
    mkdir -p backups/frontend
    BACKUP_DATE=\$(date +%Y%m%d_%H%M%S)
    if [ -d dist ]; then
        tar -czf backups/frontend/dist_\$BACKUP_DATE.tar.gz dist 2>/dev/null || true
    fi
    if [ -d dist-public ]; then
        tar -czf backups/frontend/dist-public_\$BACKUP_DATE.tar.gz dist-public 2>/dev/null || true
    fi
    echo 'Backup completato'
" || log_warning "Backup skipped (directories may not exist yet)"

# =============================================================================
# UPLOAD FRONTEND CRM (elementformazione.com)
# =============================================================================
echo ""
log_deploy "Uploading Element Formazione (CRM)..."

rsync -avz --delete \
    -e "ssh -i $SSH_KEY" \
    dist/ \
    $SERVER_USER@$SERVER_IP:$SERVER_PATH/dist/

log_success "Element Formazione uploaded → elementformazione.com"

# =============================================================================
# UPLOAD FRONTEND PUBBLICO (elementmedica.com)
# =============================================================================
echo ""
log_deploy "Uploading Element Medica (Pubblico)..."

rsync -avz --delete \
    -e "ssh -i $SSH_KEY" \
    dist-public/ \
    $SERVER_USER@$SERVER_IP:$SERVER_PATH/dist-public/

log_success "Element Medica uploaded → elementmedica.com"

# =============================================================================
# UPLOAD BACKEND (opzionale)
# =============================================================================
echo ""
read -p "Vuoi aggiornare anche il backend? (y/N): " UPDATE_BACKEND

if [[ "$UPDATE_BACKEND" =~ ^[Yy]$ ]]; then
    log_deploy "Uploading Backend..."
    
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'logs/*' \
        --exclude '*.log' \
        -e "ssh -i $SSH_KEY" \
        backend/ \
        $SERVER_USER@$SERVER_IP:$SERVER_PATH/backend/
    
    log_info "Installing backend dependencies..."
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "
        cd $SERVER_PATH/backend
        npm ci --production
        npx prisma generate
    "
    
    log_success "Backend updated"
    
    # Riavvio PM2 (con autorizzazione)
    read -p "Vuoi riavviare i servizi PM2? (y/N): " RESTART_PM2
    if [[ "$RESTART_PM2" =~ ^[Yy]$ ]]; then
        ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "pm2 restart all"
        log_success "PM2 services restarted"
    fi
fi

# =============================================================================
# RELOAD NGINX
# =============================================================================
echo ""
log_info "Reloading Nginx..."

ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "sudo nginx -t && sudo systemctl reload nginx"

log_success "Nginx reloaded"

# =============================================================================
# HEALTH CHECKS
# =============================================================================
echo ""
log_info "Running health checks..."

# Test backend
if curl -sf http://$SERVER_IP/health > /dev/null; then
    log_success "Backend health: OK"
else
    log_warning "Backend health: Check required"
fi

# Test elementformazione.com
if curl -sf --max-time 10 http://elementformazione.com > /dev/null 2>&1; then
    log_success "elementformazione.com: OK"
elif curl -sf --max-time 10 https://elementformazione.com > /dev/null 2>&1; then
    log_success "elementformazione.com (HTTPS): OK"
else
    log_warning "elementformazione.com: Check DNS/SSL configuration"
fi

# Test elementmedica.com
if curl -sf --max-time 10 http://elementmedica.com > /dev/null 2>&1; then
    log_success "elementmedica.com: OK"
elif curl -sf --max-time 10 https://elementmedica.com > /dev/null 2>&1; then
    log_success "elementmedica.com (HTTPS): OK"
else
    log_warning "elementmedica.com: DNS not yet configured (128.140.15.15)"
fi

# =============================================================================
# PM2 STATUS
# =============================================================================
echo ""
log_info "PM2 Status:"
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "pm2 status" 2>/dev/null || log_warning "PM2 status non disponibile"

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}✅ DEPLOY COMPLETATO${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "🌐 Domains:"
echo "   • https://elementformazione.com (CRM)"
echo "   • https://elementmedica.com (Pubblico)"
echo ""
echo "📋 Prossimi passi:"
echo "   1. Verifica i siti nel browser"
echo "   2. Testa il login: admin@example.com / Admin123!"
echo "   3. Controlla i logs: ssh $SERVER_USER@$SERVER_IP 'pm2 logs'"
echo ""
echo "📞 Per problemi:"
echo "   • Logs: ssh $SERVER_USER@$SERVER_IP 'pm2 logs --lines 100'"
echo "   • Health: curl http://$SERVER_IP/health"
echo ""

log_success "Production deployment completed! 🎉"