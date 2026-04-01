#!/bin/bash
# =============================================================================
# Deploy Script with Disk Cleanup - ElementMedica
# =============================================================================
# Soluzione: usa SSH ControlMaster per condividere connessione
# - 1 sola richiesta passphrase
# - Cleanup spazio disco + deploy in unica sessione
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER="elementmedica@178.104.44.177"
SSH_KEY="$HOME/.ssh/id_ed25519"
SERVER_PATH="/var/www/elementmedica"
CONTROL_SOCKET="/tmp/ssh-elementmedica-$$"

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🚀 ElementMedica Deploy + Disk Cleanup${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Verifica build
if [ ! -f "dist/index.html" ] || [ ! -f "dist-public/index.html" ]; then
    echo -e "${RED}❌ Build directories mancanti. Esegui prima: ./scripts/build-production.sh${NC}"
    exit 1
fi

echo -e "${BLUE}ℹ️  Apertura connessione SSH (inserisci passphrase una volta sola)...${NC}"

# Apri connessione master (passphrase richiesta 1 sola volta)
ssh -i "$SSH_KEY" \
    -M -S "$CONTROL_SOCKET" \
    -o ControlPersist=120 \
    -o StrictHostKeyChecking=accept-new \
    -f -N \
    "$SERVER"

echo -e "${GREEN}✅ Connessione SSH stabilita${NC}"

# Helper: esegui comando remoto senza ri-autenticarsi
remote() {
    ssh -S "$CONTROL_SOCKET" "$SERVER" "$@"
}

# Helper: rsync usando il socket condiviso
remote_rsync() {
    rsync -avz --delete \
        --no-perms \
        --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
        --exclude '.DS_Store' \
        --exclude '*.DS_Store' \
        --exclude 'Thumbs.db' \
        -e "ssh -S $CONTROL_SOCKET" \
        "$@"
}

# =============================================================================
# STEP 1: DIAGNOSI DISCO
# =============================================================================
echo ""
echo -e "${BLUE}📊 Stato disco attuale:${NC}"
remote "df -h / | tail -1"

echo ""
echo -e "${BLUE}📦 Utilizzo /var/www/elementmedica:${NC}"
remote "du -sh $SERVER_PATH/* 2>/dev/null | sort -rh | head -15" || true

# =============================================================================
# STEP 2: PULIZIA AGGRESSIVA
# =============================================================================
echo ""
echo -e "${YELLOW}🧹 Avvio pulizia disco...${NC}"

remote bash << 'REMOTE_CLEANUP'
set -e

SERVER_PATH="/var/www/elementmedica"

echo "--- Pulizia backup frontend (mantieni ultimi 2) ---"
if [ -d "$SERVER_PATH/backups/frontend" ]; then
    cd "$SERVER_PATH/backups/frontend"
    # Lista file per data, rimuovi tutti tranne ultimi 2
    COUNT=$(ls -t 2>/dev/null | wc -l)
    if [ "$COUNT" -gt 2 ]; then
        ls -t | tail -n +3 | xargs rm -f
        echo "Rimossi $((COUNT-2)) backup vecchi"
    else
        echo "Solo $COUNT backup presenti, niente da rimuovere"
    fi
else
    echo "Cartella backup non trovata (OK per primo deploy)"
fi

echo "--- Pulizia log applicazione (mantieni ultimi 3 giorni) ---"
find "$SERVER_PATH/backend/logs" -name "*.log" -mtime +3 -delete 2>/dev/null || true
find "$SERVER_PATH/backend/logs" -name "*.log.*" -mtime +3 -delete 2>/dev/null || true
echo "Log vecchi rimossi"

echo "--- Pulizia upload temporanei (>30 giorni) ---"
find "$SERVER_PATH/backend/temp" -type f -mtime +30 -delete 2>/dev/null || true
find "$SERVER_PATH/uploads" -name "tmp_*" -mtime +7 -delete 2>/dev/null || true

echo "--- Pulizia npm cache ---"
npm cache clean --force 2>/dev/null || true

echo "--- Pulizia journal systemd (mantieni 100MB) ---"
sudo journalctl --vacuum-size=100M 2>/dev/null || true

echo "--- Pulizia apt cache ---"
sudo apt-get clean 2>/dev/null || true

echo "--- Pulizia /tmp vecchi ---"
find /tmp -maxdepth 1 -mtime +1 -type f -delete 2>/dev/null || true

echo "--- Stato disco dopo pulizia ---"
df -h /
REMOTE_CLEANUP

echo -e "${GREEN}✅ Pulizia completata${NC}"

# Verifica spazio disponibile
AVAIL=$(remote "df / | tail -1 | awk '{print \$4}'")
echo -e "${BLUE}ℹ️  Spazio disponibile: ${AVAIL}KB ($(( AVAIL / 1024 ))MB)${NC}"

if [ "$AVAIL" -lt 524288 ]; then  # < 512MB
    echo -e "${RED}❌ Spazio insufficiente (< 512MB). Pulizia manuale necessaria.${NC}"
    ssh -S "$CONTROL_SOCKET" -O exit "$SERVER" 2>/dev/null || true
    exit 1
fi

# =============================================================================
# STEP 3: BACKUP REMOTO (leggero - solo index.html per rollback rapido)
# =============================================================================
echo ""
echo -e "${YELLOW}💾 Creazione backup minimale per rollback...${NC}"

remote bash << 'REMOTE_BACKUP'
SERVER_PATH="/var/www/elementmedica"
mkdir -p "$SERVER_PATH/backups/frontend"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

# Backup leggero: solo index.html files + versione hash
if [ -f "$SERVER_PATH/dist/index.html" ]; then
    cp "$SERVER_PATH/dist/index.html" "$SERVER_PATH/backups/frontend/dist-index_${BACKUP_DATE}.html"
fi
if [ -f "$SERVER_PATH/dist-public/index.html" ]; then
    cp "$SERVER_PATH/dist-public/index.html" "$SERVER_PATH/backups/frontend/dist-public-index_${BACKUP_DATE}.html"
fi
echo "Backup minimale creato: $BACKUP_DATE"
REMOTE_BACKUP

# =============================================================================
# STEP 4: DEPLOY CRM (elementsicurezza.com → dist/)
# =============================================================================
echo ""
echo -e "${YELLOW}🚀 Upload Element Sicurezza CRM (dist/)...${NC}"

remote_rsync dist/ "$SERVER:$SERVER_PATH/dist/"
echo -e "${GREEN}✅ Element Sicurezza CRM → dist/ caricato${NC}"

# =============================================================================
# STEP 5: DEPLOY PUBBLICO (elementmedica.com → dist-public/)
# =============================================================================
echo ""
echo -e "${YELLOW}🚀 Upload Element Medica Pubblico (dist-public/)...${NC}"

remote_rsync dist-public/ "$SERVER:$SERVER_PATH/dist-public/"
echo -e "${GREEN}✅ Element Medica Pubblico → dist-public/ caricato${NC}"

# =============================================================================
# STEP 6: RELOAD NGINX
# =============================================================================
echo ""
echo -e "${YELLOW}🔄 Reload Nginx...${NC}"

remote "sudo nginx -t && sudo systemctl reload nginx"
echo -e "${GREEN}✅ Nginx ricaricato${NC}"

# =============================================================================
# STEP 7: HEALTH CHECKS
# =============================================================================
echo ""
echo -e "${BLUE}🔍 Health checks...${NC}"

# Backend
if remote "curl -sf http://localhost:4001/health > /dev/null 2>&1"; then
    echo -e "${GREEN}✅ API server (4001): OK${NC}"
else
    echo -e "${YELLOW}⚠️  API server (4001): verifica richiesta${NC}"
fi

# Favicon check
FAVICON_SICUREZZA=$(remote "grep -o 'element-sicurezza-favicon' /var/www/elementmedica/dist/index.html 2>/dev/null | head -1")
FAVICON_MEDICA=$(remote "grep -o 'element-medica-favicon' /var/www/elementmedica/dist-public/index.html 2>/dev/null | head -1")

if [ -n "$FAVICON_SICUREZZA" ]; then
    echo -e "${GREEN}✅ Favicon Sicurezza: corretto (element-sicurezza-favicon.ico)${NC}"
else
    echo -e "${YELLOW}⚠️  Favicon Sicurezza: verifica richiesta${NC}"
fi

if [ -n "$FAVICON_MEDICA" ]; then
    echo -e "${GREEN}✅ Favicon Medica: corretto (element-medica-favicon.ico)${NC}"
else
    echo -e "${YELLOW}⚠️  Favicon Medica: verifica richiesta${NC}"
fi

# Stato disco finale
echo ""
echo -e "${BLUE}📊 Stato disco finale:${NC}"
remote "df -h /"

# =============================================================================
# CHIUSURA CONNESSIONE
# =============================================================================
ssh -S "$CONTROL_SOCKET" -O exit "$SERVER" 2>/dev/null || true

echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}✅ DEPLOY COMPLETATO CON SUCCESSO${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "🌐 Siti aggiornati:"
echo "   • https://elementsicurezza.com (CRM + favicon Sicurezza)"
echo "   • https://elementmedica.com (Pubblico + favicon Medica)"
echo ""
echo "📋 Verifica nel browser:"
echo "   1. Controlla favicon nella tab del browser"
echo "   2. Testa login CRM: admin@example.com / Admin123!"
echo "   3. Controlla intestazione pubblica e loghi"
echo ""
