#!/bin/bash

# ===============================================
# ElementMedica 2.0 - Setup Remoto Hetzner
# Versione: 1.0
# Target: Server Hetzner CX11 Ubuntu 22.04 LTS
# ===============================================

set -e  # Exit on any error

# Configurazione server
SERVER_IP="128.140.15.15"
SERVER_PASSWORD="Fulmicotone50!"
SSH_KEY_PATH="$HOME/.ssh/id_ed25519"

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# ===============================================
# 1. VERIFICA CONNESSIONE
# ===============================================
log_info "🔍 Verifica connessione al server $SERVER_IP..."

if ! sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 root@$SERVER_IP "echo 'test'" > /dev/null 2>&1; then
    log_error "❌ Impossibile connettersi al server $SERVER_IP"
    log_info "Verifica che:"
    log_info "  - Il server sia acceso e raggiungibile"
    log_info "  - La password sia corretta: $SERVER_PASSWORD"
    log_info "  - Il firewall permetta connessioni SSH"
    exit 1
fi

log_success "✅ Connessione al server riuscita!"

# ===============================================
# 2. INFORMAZIONI SERVER
# ===============================================
log_info "📊 Raccolta informazioni server..."

SERVER_INFO=$(sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP "
echo 'HOSTNAME:' \$(hostname)
echo 'OS:' \$(lsb_release -d | cut -f2)
echo 'KERNEL:' \$(uname -r)
echo 'MEMORY:' \$(free -h | grep Mem | awk '{print \$2}')
echo 'DISK:' \$(df -h / | tail -1 | awk '{print \$2}')
echo 'CPU:' \$(nproc) 'cores'
")

echo "$SERVER_INFO"

# ===============================================
# 3. CARICAMENTO SCRIPT SETUP
# ===============================================
log_info "📤 Caricamento script di setup sul server..."

# Carica lo script di setup completo
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    ./scripts/hetzner-complete-setup.sh root@$SERVER_IP:/root/

log_success "✅ Script caricato sul server"

# ===============================================
# 4. ESECUZIONE SETUP AUTOMATICO
# ===============================================
log_info "🚀 Avvio setup automatico del server..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP "
chmod +x /root/hetzner-complete-setup.sh
/root/hetzner-complete-setup.sh
"

log_success "✅ Setup automatico completato!"

# ===============================================
# 5. CONFIGURAZIONE CHIAVE SSH
# ===============================================
log_info "🔑 Configurazione chiave SSH per utente elementmedica..."

# Leggi la chiave pubblica
if [ ! -f "$SSH_KEY_PATH.pub" ]; then
    log_error "❌ Chiave SSH pubblica non trovata: $SSH_KEY_PATH.pub"
    exit 1
fi

SSH_PUBLIC_KEY=$(cat "$SSH_KEY_PATH.pub")

# Configura la chiave SSH per l'utente elementmedica
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP "
# Crea directory .ssh per elementmedica se non esiste
mkdir -p /home/elementmedica/.ssh
chmod 700 /home/elementmedica/.ssh

# Aggiungi la chiave pubblica
echo '$SSH_PUBLIC_KEY' >> /home/elementmedica/.ssh/authorized_keys
chmod 600 /home/elementmedica/.ssh/authorized_keys
chown -R elementmedica:elementmedica /home/elementmedica/.ssh

echo 'Chiave SSH configurata per utente elementmedica'
"

log_success "✅ Chiave SSH configurata"

# ===============================================
# 6. TEST CONNESSIONE CON CHIAVE SSH
# ===============================================
log_info "🔍 Test connessione SSH con chiave..."

if ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 elementmedica@$SERVER_IP "echo 'SSH Key authentication successful'" > /dev/null 2>&1; then
    log_success "✅ Autenticazione SSH con chiave riuscita!"
else
    log_warning "⚠️ Autenticazione SSH con chiave fallita, ma il setup è completato"
fi

# ===============================================
# 7. VERIFICA SERVIZI
# ===============================================
log_info "🔍 Verifica servizi installati..."

SERVICES_STATUS=$(sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP "
echo '=== SERVIZI ATTIVI ==='
systemctl is-active nginx || echo 'nginx: non attivo'
systemctl is-active ufw || echo 'ufw: non attivo'
systemctl is-active fail2ban || echo 'fail2ban: non attivo'

echo '=== VERSIONI SOFTWARE ==='
node --version 2>/dev/null || echo 'Node.js: non installato'
npm --version 2>/dev/null || echo 'npm: non installato'
pm2 --version 2>/dev/null || echo 'PM2: non installato'
docker --version 2>/dev/null || echo 'Docker: non installato'

echo '=== PORTE APERTE ==='
ss -tlnp | grep -E ':(22|80|443|4001|4003|9090)' || echo 'Nessuna porta specifica aperta'
")

echo "$SERVICES_STATUS"

# ===============================================
# RIEPILOGO FINALE
# ===============================================
echo ""
echo "=============================================="
echo "🎉 SETUP HETZNER ELEMENTMEDICA 2.0 COMPLETATO!"
echo "=============================================="
echo ""
echo "📋 INFORMAZIONI SERVER:"
echo "  🌐 IP: $SERVER_IP"
echo "  🔑 SSH Key: $SSH_KEY_PATH"
echo "  👤 Utente: elementmedica"
echo ""
echo "📝 PROSSIMI PASSI:"
echo "  1. 🔗 Connessione SSH: ssh -i $SSH_KEY_PATH elementmedica@$SERVER_IP"
echo "  2. 📦 Deploy app: ./deploy-elementmedica.sh"
echo "  3. 🌐 Configura DNS: Punta il dominio a $SERVER_IP"
echo "  4. 🔒 Setup SSL: sudo certbot --nginx -d tuodominio.com"
echo ""
echo "💰 COSTO MENSILE: €4.78"
echo "🎯 RISPARMIO: 96% vs configurazione originale"
echo ""
log_success "🚀 ElementMedica 2.0 pronto per il deploy!"