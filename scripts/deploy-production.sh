#!/bin/bash
# scripts/deploy-production.sh
# =============================================================================
# Deploy Script per PRODUCTION - ElementMedica Multi-Domain
# =============================================================================
# Deploy su Hetzner VPS: 178.104.197.134
# - elementsicurezza.com (CRM)
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

# Directory base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"
source "$BASE_DIR/scripts/deploy-config.sh"
deploy_parse_common_flags "$@"

SERVER_IP="$DEPLOY_SERVER_IP"
SERVER_USER="$DEPLOY_SERVER_USER"
SERVER_PATH="$DEPLOY_BASE_PATH"
SSH_KEY="$DEPLOY_SSH_KEY"
UPDATE_BACKEND="${UPDATE_BACKEND:-false}"
RESTART_PM2="${RESTART_PM2:-false}"
RUN_CMS_SEED="${RUN_CMS_SEED:-false}"
UPDATE_NGINX="${UPDATE_NGINX:-false}"
RELOAD_NGINX="${RELOAD_NGINX:-true}"

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

# =============================================================================
# SSH CONTROLMASTER (richiede passphrase 1 sola volta)
# =============================================================================
CONTROL_SOCKET="/tmp/ssh-elementmedica-$$"

log_info "Apertura connessione SSH (passphrase richiesta 1 sola volta)..."
ssh -i $SSH_KEY \
    -M -S "$CONTROL_SOCKET" \
    -o ControlPersist=300 \
    -o StrictHostKeyChecking=accept-new \
    -f -N \
    $SERVER_USER@$SERVER_IP

if [ $? -eq 0 ]; then
    log_success "SSH ControlMaster attivo"
else
    log_warning "SSH ControlMaster non disponibile, uso connessione standard"
    CONTROL_SOCKET=""
fi

# Helper SSH con socket condiviso
SSH_CMD() {
    if [ -n "$CONTROL_SOCKET" ] && [ -S "$CONTROL_SOCKET" ]; then
        ssh -S "$CONTROL_SOCKET" $SERVER_USER@$SERVER_IP "$@"
    else
        ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "$@"
    fi
}

# Helper rsync con socket condiviso
# --no-perms --chmod: forza permessi corretti su Linux (evita problemi macOS quarantine 700)
RSYNC_CMD() {
    if [ -n "$CONTROL_SOCKET" ] && [ -S "$CONTROL_SOCKET" ]; then
        rsync -avz --delete \
            --no-perms \
            --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
            --exclude '.DS_Store' \
            --exclude '*.DS_Store' \
            --exclude 'Thumbs.db' \
            -e "ssh -S $CONTROL_SOCKET" \
            "$@"
    else
        rsync -avz --delete \
            --no-perms \
            --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
            --exclude '.DS_Store' \
            --exclude '*.DS_Store' \
            --exclude 'Thumbs.db' \
            -e "ssh -i $SSH_KEY" \
            "$@"
    fi
}

# Cleanup socket on exit
trap 'ssh -S "$CONTROL_SOCKET" -O exit '$SERVER_USER'@'$SERVER_IP' 2>/dev/null || true' EXIT

# =============================================================================
# BACKUP REMOTO
# =============================================================================
echo ""
log_deploy "Creating remote backup (lightweight) + cleanup old backups..."

SSH_CMD "cd $SERVER_PATH && mkdir -p backups/frontend && BACKUP_COUNT=\$(ls backups/frontend/*.html 2>/dev/null | wc -l) && if [ \$BACKUP_COUNT -gt 4 ]; then ls -t backups/frontend/ 2>/dev/null | tail -n +5 | xargs -I{} rm -f backups/frontend/{}; fi && find $SERVER_PATH/backend/logs -name '*.log' -mtime +3 -delete 2>/dev/null || true && BACKUP_DATE=\$(date +%Y%m%d_%H%M%S) && [ -f dist/index.html ] && cp dist/index.html backups/frontend/dist-index_\${BACKUP_DATE}.html || true && [ -f dist-public/index.html ] && cp dist-public/index.html backups/frontend/dist-public-index_\${BACKUP_DATE}.html || true && echo 'Backup leggero completato'" || log_warning "Backup skipped (directories may not exist yet)"

# =============================================================================
# UPLOAD FRONTEND CRM (elementsicurezza.com)
# =============================================================================
echo ""
log_deploy "Uploading Element Sicurezza (CRM)..."

RSYNC_CMD dist/ $SERVER_USER@$SERVER_IP:$SERVER_PATH/dist/

log_success "Element Sicurezza uploaded → elementsicurezza.com"

# =============================================================================
# UPLOAD FRONTEND PUBBLICO (elementmedica.com)
# =============================================================================
echo ""
log_deploy "Uploading Element Medica (Pubblico)..."

RSYNC_CMD dist-public/ $SERVER_USER@$SERVER_IP:$SERVER_PATH/dist-public/

log_success "Element Medica uploaded → elementmedica.com"

# =============================================================================
# FIX PERMISSIONS (prevenire 403 Forbidden su asset statici)
# rsync --chmod non è sempre rispettato su macOS → forziamo chmod esplicito
# =============================================================================
log_info "Fixing file permissions (prevenire 403 su logo/assets)..."
SSH_CMD "find $SERVER_PATH/dist -type f -exec chmod 644 {} + ; find $SERVER_PATH/dist -type d -exec chmod 755 {} + ; find $SERVER_PATH/dist-public -type f -exec chmod 644 {} + ; find $SERVER_PATH/dist-public -type d -exec chmod 755 {} +"
log_success "Permissions OK (files=644, dirs=755)"

# =============================================================================
# UPLOAD BACKEND (opzionale)
# =============================================================================
echo ""
if [ "$UPDATE_BACKEND" != "true" ] && [ "$DEPLOY_YES" != "true" ] && deploy_confirm "Aggiornare anche il backend?"; then
    UPDATE_BACKEND="true"
fi

if [ "$UPDATE_BACKEND" = "true" ]; then
    log_deploy "Uploading Backend..."
    
    if [ -n "$CONTROL_SOCKET" ] && [ -S "$CONTROL_SOCKET" ]; then
        rsync -avz --delete \
            --exclude 'node_modules' \
            --exclude '.git' \
            --exclude '.env' \
            --exclude 'logs/*' \
            --exclude '*.log' \
            --exclude 'uploads/' \
            -e "ssh -S $CONTROL_SOCKET" \
            backend/ \
            $SERVER_USER@$SERVER_IP:$SERVER_PATH/backend/
    else
        rsync -avz --delete \
            --exclude 'node_modules' \
            --exclude '.git' \
            --exclude '.env' \
            --exclude 'logs/*' \
            --exclude '*.log' \
            --exclude 'uploads/' \
            -e "ssh -i $SSH_KEY" \
            backend/ \
            $SERVER_USER@$SERVER_IP:$SERVER_PATH/backend/
    fi
    
    log_info "Installing backend dependencies..."
    SSH_CMD "cd $SERVER_PATH/backend && npm ci --production && npx prisma generate"
    
    log_success "Backend updated"
    
    # Riavvio PM2 (con autorizzazione)
    if [ "$RESTART_PM2" != "true" ] && [ "$DEPLOY_YES" != "true" ] && deploy_confirm "Riavviare i servizi PM2?"; then
        RESTART_PM2="true"
    fi
    if [ "$RESTART_PM2" = "true" ]; then
        SSH_CMD "pm2 restart all"
        log_success "PM2 services restarted"
    fi

    # Seed CMS pages (idempotente - upsert, sicuro da ripetere)
    if [ "$RUN_CMS_SEED" != "true" ] && [ "$DEPLOY_YES" != "true" ] && deploy_confirm "Eseguire il seed CMS pages?"; then
        RUN_CMS_SEED="true"
    fi
    if [ "$RUN_CMS_SEED" = "true" ]; then
        log_info "Running CMS pages seed (idempotent upsert)..."
        SSH_CMD "cd $SERVER_PATH/backend && node scripts/seeds/seed-cms-pages-production.js"
        log_success "CMS pages seed completed"
    fi
fi

# =============================================================================
# RELOAD NGINX
# =============================================================================
echo ""
if [ "$UPDATE_NGINX" != "true" ] && [ "$DEPLOY_YES" != "true" ] && deploy_confirm "Aggiornare anche la configurazione Nginx?"; then
    UPDATE_NGINX="true"
fi

if [ "$UPDATE_NGINX" = "true" ]; then
    log_deploy "Deploying Nginx config..."
    
    if [ -n "$CONTROL_SOCKET" ] && [ -S "$CONTROL_SOCKET" ]; then
        scp -o "ControlPath=$CONTROL_SOCKET" \
            nginx/elementmedica-multi.conf \
            $SERVER_USER@$SERVER_IP:/etc/nginx/sites-available/elementmedica-multi.conf
    else
        scp -i $SSH_KEY \
            nginx/elementmedica-multi.conf \
            $SERVER_USER@$SERVER_IP:/etc/nginx/sites-available/elementmedica-multi.conf
    fi
    
    # Test Nginx config before enabling
    SSH_CMD "nginx -t"
    log_success "Nginx config valid"
fi

if [ "$RELOAD_NGINX" = "true" ]; then
    log_info "Reloading Nginx..."
    SSH_CMD "sudo nginx -t && sudo systemctl reload nginx"
    log_success "Nginx ricaricato"
fi

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

# Test elementsicurezza.com
if curl -sf --max-time 10 http://elementsicurezza.com > /dev/null 2>&1; then
    log_success "elementsicurezza.com: OK"
elif curl -sf --max-time 10 https://elementsicurezza.com > /dev/null 2>&1; then
    log_success "elementsicurezza.com (HTTPS): OK"
else
    log_warning "elementsicurezza.com: Check DNS/SSL configuration"
fi

# Test elementmedica.com
if curl -sf --max-time 10 http://elementmedica.com > /dev/null 2>&1; then
    log_success "elementmedica.com: OK"
elif curl -sf --max-time 10 https://elementmedica.com > /dev/null 2>&1; then
    log_success "elementmedica.com (HTTPS): OK"
else
    log_warning "elementmedica.com: DNS not yet configured (178.104.197.134)"
fi

# =============================================================================
# PM2 STATUS
# =============================================================================
echo ""
log_info "PM2 Status:"
SSH_CMD "pm2 status" 2>/dev/null || log_warning "PM2 status non disponibile"

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}✅ DEPLOY COMPLETATO${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "🌐 Domains:"
echo "   • https://elementsicurezza.com (CRM)"
echo "   • https://elementmedica.com (Pubblico)"
echo ""
echo "📋 Prossimi passi:"
echo "   1. Verifica i siti nel browser"
echo "   2. Testa il login con le credenziali salvate in modo sicuro"
echo "   3. Controlla i log mirati: ssh $SERVER_USER@$SERVER_IP 'pm2 logs --lines 20 --nostream'"
echo ""
echo "📞 Per problemi:"
echo "   • Logs: ssh $SERVER_USER@$SERVER_IP 'pm2 logs --lines 20 --nostream'"
echo "   • Health: curl http://$SERVER_IP/health"
echo ""

log_success "Production deployment completed! 🎉"
