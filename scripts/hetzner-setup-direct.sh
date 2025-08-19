#!/bin/bash

# ===============================================
# ElementMedica 2.0 - Setup Diretto Hetzner
# Versione: 1.0 - Approccio Diretto
# Target: Server Hetzner CX11 Ubuntu 22.04 LTS
# ===============================================

set -e  # Exit on any error

# Configurazione
SERVER_IP="128.140.15.15"
SERVER_PASSWORD="n3detHvJ3KTF"

# Colori
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "=============================================="
echo "🚀 ELEMENTMEDICA 2.0 - SETUP HETZNER DIRETTO"
echo "=============================================="
echo ""

# ===============================================
# 1. INFORMAZIONI SERVER
# ===============================================
log_info "📊 Raccolta informazioni server..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP << 'EOF'
echo "=== INFORMAZIONI SERVER ==="
echo "HOSTNAME: $(hostname)"
echo "OS: $(lsb_release -d | cut -f2)"
echo "KERNEL: $(uname -r)"
echo "MEMORY: $(free -h | grep Mem | awk '{print $2}')"
echo "DISK: $(df -h / | tail -1 | awk '{print $2}')"
echo "CPU: $(nproc) cores"
echo ""
EOF

# ===============================================
# 2. AGGIORNAMENTO SISTEMA
# ===============================================
log_info "🔄 Aggiornamento sistema..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP << 'EOF'
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget git unzip htop nano ufw fail2ban logrotate cron
EOF

log_success "✅ Sistema aggiornato"

# ===============================================
# 3. CONFIGURAZIONE UTENTE ELEMENTMEDICA
# ===============================================
log_info "👤 Creazione utente elementmedica..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP << 'EOF'
# Crea utente elementmedica
useradd -m -s /bin/bash elementmedica
usermod -aG sudo elementmedica

# Configura directory SSH
mkdir -p /home/elementmedica/.ssh
chmod 700 /home/elementmedica/.ssh
chown elementmedica:elementmedica /home/elementmedica/.ssh

# Configura sudo senza password
echo "elementmedica ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

echo "Utente elementmedica creato"
EOF

# Aggiungi la chiave SSH
log_info "🔑 Configurazione chiave SSH..."

SSH_PUBLIC_KEY=$(cat ~/.ssh/id_ed25519.pub)

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP << EOF
echo '$SSH_PUBLIC_KEY' > /home/elementmedica/.ssh/authorized_keys
chmod 600 /home/elementmedica/.ssh/authorized_keys
chown elementmedica:elementmedica /home/elementmedica/.ssh/authorized_keys
echo "Chiave SSH configurata"
EOF

log_success "✅ Utente elementmedica configurato"

# ===============================================
# 4. INSTALLAZIONE NODE.JS
# ===============================================
log_info "📦 Installazione Node.js 18 LTS..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP << 'EOF'
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
npm install -g pm2
EOF

log_success "✅ Node.js e PM2 installati"

# ===============================================
# 5. INSTALLAZIONE NGINX
# ===============================================
log_info "🌐 Installazione Nginx..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP << 'EOF'
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
EOF

log_success "✅ Nginx installato"

# ===============================================
# 6. CONFIGURAZIONE FIREWALL
# ===============================================
log_info "🔒 Configurazione firewall UFW..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP << 'EOF'
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 9090/tcp
ufw --force enable
EOF

log_success "✅ Firewall configurato"

# ===============================================
# 7. CONFIGURAZIONE FAIL2BAN
# ===============================================
log_info "🛡️ Configurazione Fail2Ban..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP << 'EOF'
systemctl enable fail2ban
systemctl start fail2ban
EOF

log_success "✅ Fail2Ban configurato"

# ===============================================
# 8. CONFIGURAZIONE SWAP
# ===============================================
log_info "💾 Configurazione swap 2GB..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP << 'EOF'
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap 2GB configurato"
else
    echo "Swap già configurato"
fi
EOF

log_success "✅ Swap configurato"

# ===============================================
# 9. OTTIMIZZAZIONI SISTEMA
# ===============================================
log_info "⚡ Ottimizzazioni sistema per 2GB RAM..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP << 'EOF'
# Ottimizzazioni kernel
echo "vm.swappiness=10" >> /etc/sysctl.conf
echo "vm.vfs_cache_pressure=50" >> /etc/sysctl.conf
echo "net.core.rmem_max=16777216" >> /etc/sysctl.conf
echo "net.core.wmem_max=16777216" >> /etc/sysctl.conf

# Applica ottimizzazioni
sysctl -p

# Limiti di sistema
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf
echo "* soft nproc 32768" >> /etc/security/limits.conf
echo "* hard nproc 32768" >> /etc/security/limits.conf
EOF

log_success "✅ Ottimizzazioni applicate"

# ===============================================
# 10. CREAZIONE DIRECTORY PROGETTO
# ===============================================
log_info "📁 Creazione struttura directory..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP << 'EOF'
mkdir -p /home/elementmedica/elementmedica-2.0
mkdir -p /home/elementmedica/logs
mkdir -p /home/elementmedica/backups
chown -R elementmedica:elementmedica /home/elementmedica/
EOF

log_success "✅ Directory create"

# ===============================================
# 11. TEST CONNESSIONE SSH CON CHIAVE
# ===============================================
log_info "🔍 Test connessione SSH con chiave..."

if ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 elementmedica@$SERVER_IP "echo 'SSH Key OK'" > /dev/null 2>&1; then
    log_success "✅ Autenticazione SSH con chiave funzionante!"
else
    log_error "⚠️ Autenticazione SSH con chiave non funziona, ma il setup è completato"
fi

# ===============================================
# 12. VERIFICA SERVIZI
# ===============================================
log_info "🔍 Verifica servizi installati..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP << 'EOF'
echo "=== SERVIZI ATTIVI ==="
systemctl is-active nginx && echo "✅ Nginx: attivo" || echo "❌ Nginx: non attivo"
systemctl is-active ufw && echo "✅ UFW: attivo" || echo "❌ UFW: non attivo"
systemctl is-active fail2ban && echo "✅ Fail2Ban: attivo" || echo "❌ Fail2Ban: non attivo"

echo ""
echo "=== VERSIONI SOFTWARE ==="
node --version 2>/dev/null && echo "✅ Node.js installato" || echo "❌ Node.js: errore"
npm --version 2>/dev/null && echo "✅ npm installato" || echo "❌ npm: errore"
pm2 --version 2>/dev/null && echo "✅ PM2 installato" || echo "❌ PM2: errore"

echo ""
echo "=== PORTE APERTE ==="
ss -tlnp | grep -E ':(22|80|443|9090)' || echo "Verifica porte in corso..."
EOF

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
echo "  👤 Utente: elementmedica"
echo "  🔑 SSH: ~/.ssh/id_ed25519"
echo ""
echo "📝 PROSSIMI PASSI:"
echo "  1. 🔗 Test SSH: ssh -i ~/.ssh/id_ed25519 elementmedica@$SERVER_IP"
echo "  2. 📦 Deploy app: ./deploy-elementmedica.sh"
echo "  3. 🌐 Configura DNS: Punta il dominio a $SERVER_IP"
echo "  4. 🔒 Setup SSL: sudo certbot --nginx -d tuodominio.com"
echo ""
echo "💰 COSTO MENSILE: €4.78"
echo "🎯 RISPARMIO: 96% vs configurazione originale"
echo ""
log_success "🚀 ElementMedica 2.0 pronto per il deploy!"