#!/bin/bash
# =============================================================================
# Deploy Singolo File Backend - ElementMedica
# =============================================================================
# Uso: ./deploy-backend-file.sh routes/cms-routes.js
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
SERVER="root@178.104.197.134"
REMOTE_BASE="/var/www/elementsicurezza/backend"

# Directory base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

# Verifica argomento
if [ -z "$1" ]; then
    echo -e "${RED}❌ Specificare il file da deployare${NC}"
    echo ""
    echo "Uso: $0 <percorso-relativo-da-backend>"
    echo ""
    echo "Esempi:"
    echo "  $0 routes/cms-routes.js"
    echo "  $0 controllers/cmsController.js"
    echo "  $0 services/mediaService.js"
    echo "  $0 middleware/auth.js"
    exit 1
fi

FILE_PATH="$1"
LOCAL_FILE="backend/$FILE_PATH"

# Verifica esistenza file
if [ ! -f "$LOCAL_FILE" ]; then
    echo -e "${RED}❌ File non trovato: $LOCAL_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Deploy Backend File${NC}"
echo "========================================"
echo "File:   $FILE_PATH"
echo "Server: $SERVER"
echo ""

# Upload file
echo -e "${BLUE}📤 Uploading...${NC}"
scp -i $SSH_KEY "$LOCAL_FILE" "$SERVER:$REMOTE_BASE/$FILE_PATH"

echo -e "${GREEN}✅ File uploaded!${NC}"

# Determina se serve restart
NEEDS_RESTART=false
SERVICE="api-server"

if [[ "$FILE_PATH" == routes/* ]] || \
   [[ "$FILE_PATH" == controllers/* ]] || \
   [[ "$FILE_PATH" == services/* ]] || \
   [[ "$FILE_PATH" == middleware/* ]] || \
   [[ "$FILE_PATH" == config/* ]]; then
    NEEDS_RESTART=true
fi

# Per documents-server
if [[ "$FILE_PATH" == *document* ]] || [[ "$FILE_PATH" == *pdf* ]]; then
    SERVICE="documents-server"
fi

if [ "$NEEDS_RESTART" = true ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Questo file richiede restart di $SERVICE${NC}"
    read -p "Riavviare ora? (Y/n): " RESTART
    
    if [[ ! "$RESTART" =~ ^[Nn]$ ]]; then
        echo -e "${BLUE}🔄 Riavvio $SERVICE...${NC}"
        ssh -i $SSH_KEY $SERVER "pm2 restart $SERVICE"
        echo -e "${GREEN}✅ $SERVICE riavviato!${NC}"
        
        # Mostra ultimi log
        echo ""
        echo -e "${BLUE}📋 Ultimi log:${NC}"
        ssh -i $SSH_KEY $SERVER "pm2 logs $SERVICE --lines 5 --nostream"
    else
        echo -e "${YELLOW}⚠️  Ricorda di riavviare $SERVICE manualmente${NC}"
    fi
else
    echo -e "${BLUE}ℹ️  Questo file non richiede restart${NC}"
fi

echo ""
echo -e "${GREEN}✅ Deploy completato!${NC}"
