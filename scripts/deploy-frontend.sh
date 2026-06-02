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
SERVER="root@178.104.197.134"
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
    --no-perms \
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
    --no-perms \
    --exclude '.DS_Store' \
    -e "ssh -i $SSH_KEY" \
    dist/ \
    $SERVER:$REMOTE_PATH/

# Fix permessi dopo rsync (macOS rsync non supporta --chmod=D755,F644)
echo -e "${BLUE}🔧 Correzione permessi...${NC}"
ssh -i "$SSH_KEY" "$SERVER" "find $REMOTE_PATH -type f | xargs chmod 644 && find $REMOTE_PATH -type d | xargs chmod 755"

echo ""
echo -e "${GREEN}✅ Frontend deployed! (permessi corretti: file=644, dirs=755)${NC}"
echo ""
echo "🌐 Verifica: https://www.elementsicurezza.com"
echo "🔄 Cache: Ctrl+Shift+R nel browser per forzare refresh"
