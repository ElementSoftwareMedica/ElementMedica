#!/bin/bash
# =============================================================================
# Check Diff - Verifica differenze locale/server
# =============================================================================
# Mostra cosa è diverso tra locale e server senza modificare nulla
# =============================================================================

set -e

# Colori
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Directory base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"
source "$BASE_DIR/scripts/deploy-config.sh"

echo -e "${BLUE}📊 Verifica Differenze Locale ↔ Server${NC}"
echo "=================================================="
echo ""

# Frontend
echo -e "${BLUE}=== FRONTEND (dist/) ===${NC}"
if [ -d "dist" ]; then
    FRONTEND_DIFF=$(rsync -avzn --delete \
        -e "ssh -i $DEPLOY_SSH_KEY" \
        dist/ \
        $DEPLOY_SERVER:$DEPLOY_DIST_PATH/ 2>/dev/null | grep -E "^[<>]|deleting" | wc -l)
    
    if [ "$FRONTEND_DIFF" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $FRONTEND_DIFF file differenti${NC}"
        rsync -avzn --delete \
            -e "ssh -i $DEPLOY_SSH_KEY" \
            dist/ \
            $DEPLOY_SERVER:$DEPLOY_DIST_PATH/ 2>/dev/null | grep -E "^[<>]|deleting" | head -10
    else
        echo -e "${GREEN}✅ Sincronizzato${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  dist/ non trovato (esegui npm run build)${NC}"
fi

echo ""

# Backend Routes
echo -e "${BLUE}=== BACKEND routes/ ===${NC}"
ROUTES_DIFF=$(rsync -avzn \
    -e "ssh -i $DEPLOY_SSH_KEY" \
    backend/routes/ \
    $DEPLOY_SERVER:$DEPLOY_BACKEND_PATH/routes/ 2>/dev/null | grep "\.js$" | wc -l)

if [ "$ROUTES_DIFF" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $ROUTES_DIFF file differenti${NC}"
    rsync -avzn \
        -e "ssh -i $DEPLOY_SSH_KEY" \
        backend/routes/ \
        $DEPLOY_SERVER:$DEPLOY_BACKEND_PATH/routes/ 2>/dev/null | grep "\.js$" | head -10
else
    echo -e "${GREEN}✅ Sincronizzato${NC}"
fi

echo ""

# Backend Controllers
echo -e "${BLUE}=== BACKEND controllers/ ===${NC}"
CTRL_DIFF=$(rsync -avzn \
    -e "ssh -i $DEPLOY_SSH_KEY" \
    backend/controllers/ \
    $DEPLOY_SERVER:$DEPLOY_BACKEND_PATH/controllers/ 2>/dev/null | grep "\.js$" | wc -l)

if [ "$CTRL_DIFF" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $CTRL_DIFF file differenti${NC}"
    rsync -avzn \
        -e "ssh -i $DEPLOY_SSH_KEY" \
        backend/controllers/ \
        $DEPLOY_SERVER:$DEPLOY_BACKEND_PATH/controllers/ 2>/dev/null | grep "\.js$" | head -10
else
    echo -e "${GREEN}✅ Sincronizzato${NC}"
fi

echo ""

# Backend Services
echo -e "${BLUE}=== BACKEND services/ ===${NC}"
SVC_DIFF=$(rsync -avzn \
    -e "ssh -i $DEPLOY_SSH_KEY" \
    backend/services/ \
    $DEPLOY_SERVER:$DEPLOY_BACKEND_PATH/services/ 2>/dev/null | grep "\.js$" | wc -l)

if [ "$SVC_DIFF" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $SVC_DIFF file differenti${NC}"
    rsync -avzn \
        -e "ssh -i $DEPLOY_SSH_KEY" \
        backend/services/ \
        $DEPLOY_SERVER:$DEPLOY_BACKEND_PATH/services/ 2>/dev/null | grep "\.js$" | head -10
else
    echo -e "${GREEN}✅ Sincronizzato${NC}"
fi

echo ""
echo "=================================================="
echo ""
echo "Comandi utili:"
echo "  • Deploy frontend:      ./scripts/deploy-frontend.sh"
echo "  • Deploy file singolo:  ./scripts/deploy-backend-file.sh routes/xyz.js"
echo "  • Deploy cartella:      ./scripts/deploy-backend-folder.sh routes"
echo ""
