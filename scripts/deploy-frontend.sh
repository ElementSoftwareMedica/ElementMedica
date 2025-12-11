#!/bin/bash
# =============================================================================
# Deploy Frontend Incrementale - ElementMedica
# =============================================================================
# Usa rsync per sincronizzare SOLO i file modificati
# Molto più veloce del full deploy!
# =============================================================================

set -e

# Colori
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configurazione
SSH_KEY="$HOME/.ssh/id_ed25519"
SERVER="root@128.140.15.15"
REMOTE_PATH="/var/www/elementmedica/dist"

# Directory base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

echo -e "${BLUE}🚀 Deploy Frontend Incrementale${NC}"
echo "========================================"

# Verifica build
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo -e "${YELLOW}⚠️  dist/ non trovato. Eseguo build...${NC}"
    npm run build
fi

# Mostra cosa verrà sincronizzato
echo ""
echo -e "${BLUE}📊 File da sincronizzare:${NC}"
rsync -avzn --delete \
    --exclude '.DS_Store' \
    --exclude '*.map' \
    -e "ssh -i $SSH_KEY" \
    dist/ \
    $SERVER:$REMOTE_PATH/ 2>/dev/null | grep -E "^[<>]|deleting" | head -20

echo ""
read -p "Procedere con il deploy? (Y/n): " CONFIRM
if [[ "$CONFIRM" =~ ^[Nn]$ ]]; then
    echo "Deploy annullato."
    exit 0
fi

# Deploy
echo ""
echo -e "${BLUE}📤 Sincronizzazione in corso...${NC}"

rsync -avz --delete \
    --exclude '.DS_Store' \
    -e "ssh -i $SSH_KEY" \
    dist/ \
    $SERVER:$REMOTE_PATH/

echo ""
echo -e "${GREEN}✅ Frontend deployed!${NC}"
echo ""
echo "🌐 Verifica: https://www.elementformazione.com"
echo "🔄 Cache: Ctrl+Shift+R nel browser per forzare refresh"
