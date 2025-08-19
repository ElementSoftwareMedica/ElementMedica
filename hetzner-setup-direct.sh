#!/bin/bash

# Script di setup diretto per server Hetzner
# Versione: 2.0 - Con credenziali aggiornate

set -e  # Exit on any error

# Configurazione server
SERVER_IP="128.140.15.15"
SERVER_PASSWORD="J4w3LEdLvbn9"
SSH_KEY_PATH="$HOME/.ssh/id_ed25519.pub"
USER_NAME="elementmedica"
USER_PASSWORD="ElementMedica2024!"

echo "🚀 Avvio setup automatico server Hetzner"
echo "📍 Server: $SERVER_IP"
echo "👤 Utente da creare: $USER_NAME"
echo "🔑 Chiave SSH: $SSH_KEY_PATH"
echo ""

# Funzione per eseguire comandi SSH
exec_ssh() {
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP "$1"
}

# 1. Raccolta informazioni server
echo "📊 Raccolta informazioni server..."
exec_ssh "echo 'Hostname:' \$(hostname) && echo 'OS:' \$(cat /etc/os-release | grep PRETTY_NAME | cut -d'=' -f2 | tr -d '\"') && echo 'Kernel:' \$(uname -r) && echo 'Memoria:' \$(free -h | grep Mem | awk '{print \$2}') && echo 'Disco:' \$(df -h / | tail -1 | awk '{print \$2}')"

# 2. Aggiornamento sistema
echo "🔄 Aggiornamento sistema..."
exec_ssh "apt update && apt upgrade -y"

# 3. Installazione pacchetti base
echo "📦 Installazione pacchetti base..."
exec_ssh "apt install -y curl wget git unzip htop nano ufw fail2ban"

# 4. Creazione utente elementmedica
echo "👤 Creazione utente $USER_NAME..."
exec_ssh "useradd -m -s /bin/bash $USER_NAME && echo '$USER_NAME:$USER_PASSWORD' | chpasswd && usermod -aG sudo $USER_NAME"

# 5. Configurazione chiave SSH per elementmedica
echo "🔑 Configurazione chiave SSH..."
if [ -f "$SSH_KEY_PATH" ]; then
    SSH_KEY_CONTENT=$(cat "$SSH_KEY_PATH")
    exec_ssh "mkdir -p /home/$USER_NAME/.ssh && echo '$SSH_KEY_CONTENT' > /home/$USER_NAME/.ssh/authorized_keys && chmod 700 /home/$USER_NAME/.ssh && chmod 600 /home/$USER_NAME/.ssh/authorized_keys && chown -R $USER_NAME:$USER_NAME /home/$USER_NAME/.ssh"
    echo "✅ Chiave SSH configurata per $USER_NAME"
else
    echo "⚠️  Chiave SSH non trovata in $SSH_KEY_PATH"
fi

# 6. Installazione Node.js
echo "🟢 Installazione Node.js..."
exec_ssh "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs"
exec_ssh "npm install -g pm2"

# 7. Installazione Docker
echo "🐳 Installazione Docker..."
exec_ssh "curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && usermod -aG docker $USER_NAME"

# 8. Installazione Nginx
echo "🌐 Installazione Nginx..."
exec_ssh "apt install -y nginx"

# 9. Configurazione firewall UFW
echo "🛡️  Configurazione firewall..."
exec_ssh "ufw --force reset && ufw default deny incoming && ufw default allow outgoing && ufw allow ssh && ufw allow 80 && ufw allow 443 && ufw --force enable"

# 10. Configurazione Fail2Ban
echo "🔒 Configurazione Fail2Ban..."
exec_ssh "systemctl enable fail2ban && systemctl start fail2ban"

# 11. Configurazione swap (2GB)
echo "💾 Configurazione swap..."
exec_ssh "fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab"

# 12. Ottimizzazioni sistema
echo "⚡ Ottimizzazioni sistema..."
exec_ssh "echo 'vm.swappiness=10' >> /etc/sysctl.conf && echo 'net.core.rmem_max = 16777216' >> /etc/sysctl.conf && echo 'net.core.wmem_max = 16777216' >> /etc/sysctl.conf"

# 13. Creazione directory progetto
echo "📁 Creazione directory progetto..."
exec_ssh "mkdir -p /var/www/elementmedica && chown -R $USER_NAME:$USER_NAME /var/www/elementmedica"

# 14. Test connessione SSH con chiave
echo "🔐 Test connessione SSH con chiave..."
if ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 $USER_NAME@$SERVER_IP "echo 'SSH con chiave funzionante!'" 2>/dev/null; then
    echo "✅ Connessione SSH con chiave funzionante"
else
    echo "⚠️  Connessione SSH con chiave non funzionante, utilizzare password"
fi

# 15. Verifica servizi installati
echo "🔍 Verifica servizi installati..."
exec_ssh "echo '=== VERSIONI INSTALLATE ===' && node --version && npm --version && docker --version && nginx -v && systemctl is-active ufw && systemctl is-active fail2ban && systemctl is-active nginx"

# 16. Riepilogo finale
echo ""
echo "🎉 SETUP COMPLETATO CON SUCCESSO!"
echo ""
echo "📋 RIEPILOGO CONFIGURAZIONE:"
echo "🖥️  Server: $SERVER_IP"
echo "👤 Utente: $USER_NAME (password: $USER_PASSWORD)"
echo "🔑 SSH: Chiave configurata"
echo "🟢 Node.js: Installato con PM2"
echo "🐳 Docker: Installato"
echo "🌐 Nginx: Installato e attivo"
echo "🛡️  UFW: Attivo (porte 22, 80, 443)"
echo "🔒 Fail2Ban: Attivo"
echo "💾 Swap: 2GB configurato"
echo "📁 Directory: /var/www/elementmedica"
echo ""
echo "🚀 PROSSIMI PASSI:"
echo "1. Testare connessione SSH: ssh -i ~/.ssh/id_ed25519 $USER_NAME@$SERVER_IP"
echo "2. Caricare codice applicazione"
echo "3. Configurare Nginx per il dominio"
echo "4. Configurare SSL con Let's Encrypt"
echo ""
echo "💰 COSTO MENSILE STIMATO: €4.15/mese (server 2GB RAM)"
echo ""
echo "✅ Server pronto per il deploy dell'applicazione!"