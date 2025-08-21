#!/bin/bash

# 🚀 Script di Deployment su Server Hetzner
# Gestisce build locale e sincronizzazione con server di produzione

set -e

# Configurazioni
SERVER_HOST="128.140.15.15"
SERVER_USER="root"
APP_DIR="/var/www/elementformazione"
LOCAL_FRONTEND_DIR="./frontend"
LOCAL_BACKEND_DIR="./backend"
LOCAL_SCRIPTS_DIR="./scripts"

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

# Verifica prerequisiti
check_prerequisites() {
    log_info "Verifica prerequisiti..."
    
    # Verifica Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js non trovato. Installare Node.js LTS."
        exit 1
    fi
    
    # Verifica npm
    if ! command -v npm &> /dev/null; then
        log_error "npm non trovato. Installare npm."
        exit 1
    fi
    
    # Verifica rsync
    if ! command -v rsync &> /dev/null; then
        log_error "rsync non trovato. Installare rsync."
        exit 1
    fi
    
    # Verifica SSH
    if ! ssh -o BatchMode=yes -o ConnectTimeout=5 $SERVER_USER@$SERVER_HOST exit 2>/dev/null; then
        log_error "Impossibile connettersi al server $SERVER_HOST. Verificare chiavi SSH."
        exit 1
    fi
    
    log_success "Prerequisiti verificati"
}

# Build frontend
build_frontend() {
    log_info "Build frontend per produzione..."
    
    cd $LOCAL_FRONTEND_DIR
    
    # Installa dipendenze se necessario
    if [ ! -d "node_modules" ]; then
        log_info "Installazione dipendenze frontend..."
        npm ci
    fi
    
    # Crea file .env.production se non esiste
    if [ ! -f ".env.production" ]; then
        log_info "Creazione .env.production..."
        cat > .env.production << EOF
VITE_API_BASE_URL=https://elementformazione.com
VITE_DOCUMENTS_BASE_URL=https://elementformazione.com/documents
VITE_ENVIRONMENT=production
EOF
    fi
    
    # Build
    npm run build
    
    cd ..
    log_success "Frontend buildato"
}

# Prepara backend
prepare_backend() {
    log_info "Preparazione backend..."
    
    cd $LOCAL_BACKEND_DIR
    
    # Verifica che ecosystem.config.js esista
    if [ ! -f "ecosystem.config.js" ]; then
        log_error "File ecosystem.config.js non trovato in $LOCAL_BACKEND_DIR"
        exit 1
    fi
    
    # Crea .env.production se non esiste
    if [ ! -f ".env.production" ]; then
        log_warning "File .env.production non trovato. Assicurarsi che sia presente sul server."
    fi
    
    cd ..
    log_success "Backend preparato"
}

# Sincronizzazione file
sync_files() {
    log_info "Sincronizzazione file con server..."
    
    # Sync frontend build
    log_info "Sincronizzazione frontend..."
    rsync -avz --delete $LOCAL_FRONTEND_DIR/dist/ $SERVER_USER@$SERVER_HOST:$APP_DIR/frontend/
    
    # Sync backend (escludendo node_modules e .env)
    log_info "Sincronizzazione backend..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.env' \
        --exclude '.env.local' \
        --exclude '.env.development' \
        --exclude 'logs/' \
        $LOCAL_BACKEND_DIR/ $SERVER_USER@$SERVER_HOST:$APP_DIR/backend/
    
    # Sync scripts
    log_info "Sincronizzazione script..."
    rsync -avz $LOCAL_SCRIPTS_DIR/ $SERVER_USER@$SERVER_HOST:$APP_DIR/scripts/
    
    # Sync configurazioni
    log_info "Sincronizzazione configurazioni..."
    if [ -f ".env.example" ]; then
        rsync -avz .env.example $SERVER_USER@$SERVER_HOST:$APP_DIR/
    fi
    
    if [ -f "package.json" ]; then
        rsync -avz package.json $SERVER_USER@$SERVER_HOST:$APP_DIR/
    fi
    
    log_success "File sincronizzati"
}

# Deploy sul server
deploy_on_server() {
    log_info "Deployment sul server..."
    
    ssh $SERVER_USER@$SERVER_HOST "cd $APP_DIR && ./scripts/hetzner-setup.sh update"
    
    log_success "Deployment completato"
}

# Health check
health_check() {
    log_info "Health check..."
    
    # Attendi che i servizi si avviino
    sleep 30
    
    # Test API
    if curl -f -s https://elementformazione.com/api/health > /dev/null; then
        log_success "API raggiungibile"
    else
        log_warning "API non raggiungibile"
    fi
    
    # Test frontend
    if curl -f -s https://elementformazione.com > /dev/null; then
        log_success "Frontend raggiungibile"
    else
        log_warning "Frontend non raggiungibile"
    fi
    
    # Test redirect www
    if curl -I -s https://www.elementformazione.com | grep -q "301\|302"; then
        log_success "Redirect www funzionante"
    else
        log_warning "Redirect www non funzionante"
    fi
}

# Funzione principale
case "${1:-deploy}" in
    "deploy")
        log_info "🚀 Avvio deployment completo..."
        check_prerequisites
        build_frontend
        prepare_backend
        sync_files
        deploy_on_server
        health_check
        log_success "🎉 Deployment completato con successo!"
        echo "🌐 Sito disponibile su: https://elementformazione.com"
        ;;
    "build")
        log_info "🔨 Build locale..."
        check_prerequisites
        build_frontend
        prepare_backend
        log_success "✅ Build completato!"
        ;;
    "sync")
        log_info "🔄 Sincronizzazione file..."
        check_prerequisites
        sync_files
        log_success "✅ Sincronizzazione completata!"
        ;;
    "health")
        health_check
        ;;
    "help")
        echo "Uso: $0 [deploy|build|sync|health|help]"
        echo "  deploy - Deployment completo (build + sync + deploy)"
        echo "  build  - Solo build locale"
        echo "  sync   - Solo sincronizzazione file"
        echo "  health - Health check del sito"
        echo "  help   - Mostra questo aiuto"
        ;;
    *)
        log_error "Comando non riconosciuto: $1"
        echo "Usa '$0 help' per vedere i comandi disponibili"
        exit 1
        ;;
esac