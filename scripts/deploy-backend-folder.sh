#!/bin/bash
# =============================================================================
# Deploy Cartella Backend - ElementMedica
# =============================================================================
# Uso: ./deploy-backend-folder.sh routes
# =============================================================================

set -e

# Colori
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configurazione
SSH_KEY="$HOME/.ssh/id_ed25519"
SERVER="root@128.140.15.15"
REMOTE_BASE="/var/www/elementformazione/backend"

# Directory base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

# Verifica argomento
if [ -z "$1" ]; then
    echo -e "${RED}❌ Specificare la cartella da deployare${NC}"
    echo ""
    echo "Uso: $0 <nome-cartella>"
    echo ""
    echo "Cartelle disponibili:"
    ls -d backend/*/ | sed 's|backend/||g' | sed 's|/||g' | while read dir; do
        echo "  • $dir"
    done
    exit 1
fi

FOLDER="$1"
LOCAL_FOLDER="backend/$FOLDER"

# Verifica esistenza cartella
if [ ! -d "$LOCAL_FOLDER" ]; then
    echo -e "${RED}❌ Cartella non trovata: $LOCAL_FOLDER${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Deploy Backend Folder${NC}"
echo "========================================"
echo "Folder: $FOLDER/"
echo "Server: $SERVER"
echo ""

# Mostra diff
echo -e "${BLUE}📊 File da sincronizzare:${NC}"
rsync -avzn \
    --exclude 'node_modules' \
    --exclude '*.log' \
    --exclude '.DS_Store' \
    -e "ssh -i $SSH_KEY" \
    "$LOCAL_FOLDER/" \
    "$SERVER:$REMOTE_BASE/$FOLDER/" 2>/dev/null | grep -E "^[<>]|\.js$" | head -20

echo ""
read -p "Procedere? (Y/n): " CONFIRM
if [[ "$CONFIRM" =~ ^[Nn]$ ]]; then
    echo "Deploy annullato."
    exit 0
fi

# Sync
echo ""
echo -e "${BLUE}📤 Sincronizzazione in corso...${NC}"

rsync -avz \
    --exclude 'node_modules' \
    --exclude '*.log' \
    --exclude '.DS_Store' \
    -e "ssh -i $SSH_KEY" \
    "$LOCAL_FOLDER/" \
    "$SERVER:$REMOTE_BASE/$FOLDER/"

echo -e "${GREEN}✅ Folder synced!${NC}"

# Restart
echo ""
echo -e "${YELLOW}⚠️  Riavviare api-server per applicare le modifiche?${NC}"
read -p "(Y/n): " RESTART

if [[ ! "$RESTART" =~ ^[Nn]$ ]]; then
    echo -e "${BLUE}🔄 Riavvio api-server...${NC}"
    ssh -i $SSH_KEY $SERVER "pm2 restart api-server"
    echo -e "${GREEN}✅ api-server riavviato!${NC}"
    
    # Mostra status
    echo ""
    echo -e "${BLUE}📋 PM2 Status:${NC}"
    ssh -i $SSH_KEY $SERVER "pm2 status"
fi

echo ""
echo -e "${GREEN}✅ Deploy completato!${NC}"
