#!/bin/bash

# Script per build completo Docker del progetto
# Versione: 1.0
# Data: Gennaio 2025

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

# Configurazione
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENVIRONMENT=${1:-staging}  # Default: staging
VERSION=${2:-latest}      # Default: latest

log_info "🐳 Avvio build Docker per ambiente: $ENVIRONMENT"
log_info "📁 Directory progetto: $PROJECT_ROOT"
log_info "🏷️  Versione: $VERSION"

cd "$PROJECT_ROOT"

# Verifica prerequisiti
log_info "🔍 Verifica prerequisiti..."

if ! command -v docker &> /dev/null; then
    log_error "Docker non è installato!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose non è installato!"
    exit 1
fi

# Verifica file necessari
required_files=(
    "Dockerfile.frontend"
    "backend/Dockerfile.api"
    "backend/Dockerfile.proxy"
    "backend/Dockerfile.docs"
    "backend/Dockerfile.main"
    "docker-compose.$ENVIRONMENT.yml"
)

for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        log_error "File mancante: $file"
        exit 1
    fi
done

log_success "✅ Tutti i prerequisiti sono soddisfatti"

# Pulizia immagini precedenti (opzionale)
read -p "🗑️  Vuoi rimuovere le immagini Docker precedenti? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "🧹 Pulizia immagini precedenti..."
    docker-compose -f "docker-compose.$ENVIRONMENT.yml" down --rmi all --volumes --remove-orphans || true
    docker system prune -f || true
fi

# Build delle immagini
log_info "🔨 Avvio build delle immagini Docker..."

# Build Frontend
log_info "📦 Build Frontend..."
docker build -f Dockerfile.frontend -t "project-frontend:$VERSION" --target "$ENVIRONMENT" .
log_success "✅ Frontend build completato"

# Build Backend Services
log_info "📦 Build Backend Services..."

# API Server
log_info "🔧 Build API Server..."
docker build -f backend/Dockerfile.api -t "project-api:$VERSION" --target production backend/
log_success "✅ API Server build completato"

# Proxy Server
log_info "🔧 Build Proxy Server..."
docker build -f backend/Dockerfile.proxy -t "project-proxy:$VERSION" --target production backend/
log_success "✅ Proxy Server build completato"

# Documents Server
log_info "🔧 Build Documents Server..."
docker build -f backend/Dockerfile.docs -t "project-docs:$VERSION" --target production backend/
log_success "✅ Documents Server build completato"

# Main Server
log_info "🔧 Build Main Server..."
docker build -f backend/Dockerfile.main -t "project-main:$VERSION" --target production backend/
log_success "✅ Main Server build completato"

# Verifica immagini create
log_info "🔍 Verifica immagini create..."
docker images | grep "project-"

# Test di base delle immagini
log_info "🧪 Test di base delle immagini..."

# Test Frontend
log_info "Testing Frontend image..."
docker run --rm "project-frontend:$VERSION" nginx -t
log_success "✅ Frontend image OK"

# Test Backend Services (health check)
for service in api proxy docs main; do
    log_info "Testing $service image..."
    # Test che l'immagine si avvii correttamente
    container_id=$(docker run -d "project-$service:$VERSION")
    sleep 5
    if docker ps | grep -q "$container_id"; then
        log_success "✅ $service image OK"
    else
        log_error "❌ $service image failed to start"
        docker logs "$container_id"
    fi
    docker stop "$container_id" > /dev/null 2>&1 || true
    docker rm "$container_id" > /dev/null 2>&1 || true
done

# Statistiche finali
log_info "📊 Statistiche build:"
echo "Environment: $ENVIRONMENT"
echo "Version: $VERSION"
echo "Images created:"
docker images | grep "project-" | wc -l | xargs echo "  - Total images:"
docker images | grep "project-" | awk '{sum += $7} END {print "  - Total size: " sum " (approx)"}'

log_success "🎉 Build Docker completato con successo!"
log_info "💡 Per avviare i servizi: docker-compose -f docker-compose.$ENVIRONMENT.yml up -d"
log_info "💡 Per vedere i logs: docker-compose -f docker-compose.$ENVIRONMENT.yml logs -f"
log_info "💡 Per fermare i servizi: docker-compose -f docker-compose.$ENVIRONMENT.yml down"

echo
log_info "🚀 Prossimi passi:"
echo "  1. Configura le variabili d'ambiente in .env.$ENVIRONMENT"
echo "  2. Avvia i servizi con docker-compose"
echo "  3. Verifica i health check degli endpoint"
echo "  4. Testa il login e le funzionalità principali"

exit 0