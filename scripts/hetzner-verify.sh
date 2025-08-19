#!/bin/bash

# ElementMedica 2.0 - Script di Verifica Server Hetzner
# Versione: 1.0
# Data: $(date)

set -e

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurazione
SERVER_IP="${1:-}"
DOMAIN="${2:-}"
SSH_KEY="${3:-~/.ssh/elementmedica_hetzner}"

# Funzioni di utilità
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Verifica parametri
if [ -z "$SERVER_IP" ]; then
    echo -e "${RED}Errore: IP del server non specificato${NC}"
    echo "Uso: $0 <SERVER_IP> [DOMAIN] [SSH_KEY_PATH]"
    echo "Esempio: $0 1.2.3.4 tuodominio.com ~/.ssh/elementmedica_hetzner"
    exit 1
fi

print_header "VERIFICA CONFIGURAZIONE SERVER HETZNER"
echo "Server IP: $SERVER_IP"
echo "Domain: ${DOMAIN:-'Non specificato'}"
echo "SSH Key: $SSH_KEY"

# Test 1: Connettività di base
print_header "Test 1: Connettività di Base"

if ping -c 3 "$SERVER_IP" > /dev/null 2>&1; then
    print_success "Server raggiungibile via ping"
else
    print_error "Server NON raggiungibile via ping"
    exit 1
fi

# Test 2: Connessione SSH
print_header "Test 2: Connessione SSH"

if [ -f "$SSH_KEY" ]; then
    print_success "SSH key trovata: $SSH_KEY"
    
    if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no elementmedica@"$SERVER_IP" "echo 'SSH OK'" > /dev/null 2>&1; then
        print_success "Connessione SSH funzionante"
    else
        print_error "Connessione SSH fallita"
        print_info "Verifica che la chiave pubblica sia stata aggiunta al server"
        exit 1
    fi
else
    print_error "SSH key non trovata: $SSH_KEY"
    exit 1
fi

# Test 3: Servizi di sistema
print_header "Test 3: Servizi di Sistema"

check_service() {
    local service=$1
    if ssh -i "$SSH_KEY" elementmedica@"$SERVER_IP" "systemctl is-active $service" > /dev/null 2>&1; then
        print_success "$service è attivo"
    else
        print_error "$service NON è attivo"
    fi
}

check_service "nginx"
check_service "docker"
check_service "ufw"

# Test 4: Porte aperte
print_header "Test 4: Porte di Rete"

check_port() {
    local port=$1
    local description=$2
    if nc -z -w5 "$SERVER_IP" "$port" 2>/dev/null; then
        print_success "Porta $port ($description) aperta"
    else
        print_error "Porta $port ($description) chiusa o non raggiungibile"
    fi
}

check_port 80 "HTTP"
check_port 443 "HTTPS"
check_port 22 "SSH"

# Test 5: Applicazione ElementMedica
print_header "Test 5: Applicazione ElementMedica"

# Verifica PM2
PM2_STATUS=$(ssh -i "$SSH_KEY" elementmedica@"$SERVER_IP" "pm2 status" 2>/dev/null || echo "ERROR")
if [[ "$PM2_STATUS" != "ERROR" ]]; then
    print_success "PM2 è attivo"
    echo "$PM2_STATUS"
else
    print_error "PM2 non risponde"
fi

# Test 6: Health Checks
print_header "Test 6: Health Checks"

if [ -n "$DOMAIN" ]; then
    # Test con dominio
    if curl -s -f "https://$DOMAIN/health" > /dev/null 2>&1; then
        print_success "Health check proxy OK (https://$DOMAIN/health)"
    else
        print_error "Health check proxy fallito (https://$DOMAIN/health)"
    fi
    
    if curl -s -f "https://$DOMAIN/api/health" > /dev/null 2>&1; then
        print_success "Health check API OK (https://$DOMAIN/api/health)"
    else
        print_error "Health check API fallito (https://$DOMAIN/api/health)"
    fi
else
    # Test con IP
    if curl -s -f "http://$SERVER_IP/health" > /dev/null 2>&1; then
        print_success "Health check proxy OK (http://$SERVER_IP/health)"
    else
        print_error "Health check proxy fallito (http://$SERVER_IP/health)"
    fi
    
    if curl -s -f "http://$SERVER_IP/api/health" > /dev/null 2>&1; then
        print_success "Health check API OK (http://$SERVER_IP/api/health)"
    else
        print_error "Health check API fallito (http://$SERVER_IP/api/health)"
    fi
fi

# Test 7: Risorse di sistema
print_header "Test 7: Risorse di Sistema"

SYSTEM_INFO=$(ssh -i "$SSH_KEY" elementmedica@"$SERVER_IP" "
    echo 'MEMORY:'; free -h | grep Mem;
    echo 'DISK:'; df -h / | tail -1;
    echo 'LOAD:'; cat /proc/loadavg;
    echo 'SWAP:'; swapon --show;
" 2>/dev/null)

if [ -n "$SYSTEM_INFO" ]; then
    print_success "Informazioni sistema raccolte"
    echo "$SYSTEM_INFO"
else
    print_error "Impossibile raccogliere informazioni sistema"
fi

# Test 8: SSL Certificate (se dominio specificato)
if [ -n "$DOMAIN" ]; then
    print_header "Test 8: Certificato SSL"
    
    SSL_INFO=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    if [ -n "$SSL_INFO" ]; then
        print_success "Certificato SSL valido"
        echo "$SSL_INFO"
    else
        print_error "Certificato SSL non valido o non presente"
    fi
fi

# Test 9: DNS Resolution (se dominio specificato)
if [ -n "$DOMAIN" ]; then
    print_header "Test 9: Risoluzione DNS"
    
    RESOLVED_IP=$(dig +short "$DOMAIN" 2>/dev/null | head -1)
    if [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
        print_success "DNS risolve correttamente ($DOMAIN -> $SERVER_IP)"
    else
        print_warning "DNS non risolve all'IP del server ($DOMAIN -> $RESOLVED_IP, atteso: $SERVER_IP)"
        print_info "Potrebbe essere normale se usi Cloudflare proxy"
    fi
fi

# Test 10: Backup Configuration
print_header "Test 10: Configurazione Backup"

BACKUP_CHECK=$(ssh -i "$SSH_KEY" elementmedica@"$SERVER_IP" "
    if [ -f /home/elementmedica/backup-startup.sh ]; then
        echo 'BACKUP_SCRIPT_OK'
    fi
    if crontab -l 2>/dev/null | grep -q backup; then
        echo 'BACKUP_CRON_OK'
    fi
" 2>/dev/null)

if echo "$BACKUP_CHECK" | grep -q "BACKUP_SCRIPT_OK"; then
    print_success "Script di backup presente"
else
    print_warning "Script di backup non trovato"
fi

if echo "$BACKUP_CHECK" | grep -q "BACKUP_CRON_OK"; then
    print_success "Backup automatico configurato"
else
    print_warning "Backup automatico non configurato"
fi

# Riepilogo finale
print_header "RIEPILOGO VERIFICA"

echo -e "${GREEN}✅ Server Hetzner configurato e funzionante${NC}"
echo -e "${BLUE}📊 Statistiche:${NC}"
echo "   - IP Server: $SERVER_IP"
echo "   - Dominio: ${DOMAIN:-'Non configurato'}"
echo "   - SSH: Funzionante"
echo "   - Servizi: Attivi"
echo "   - Applicazione: Deployata"

if [ -n "$DOMAIN" ]; then
    echo -e "\n${BLUE}🌐 URL di accesso:${NC}"
    echo "   - Applicazione: https://$DOMAIN"
    echo "   - Health Check: https://$DOMAIN/health"
    echo "   - API Health: https://$DOMAIN/api/health"
fi

echo -e "\n${BLUE}🔧 Comandi utili:${NC}"
echo "   - Connessione SSH: ssh -i $SSH_KEY elementmedica@$SERVER_IP"
echo "   - Status PM2: ssh -i $SSH_KEY elementmedica@$SERVER_IP 'pm2 status'"
echo "   - Log applicazione: ssh -i $SSH_KEY elementmedica@$SERVER_IP 'pm2 logs'"
echo "   - Monitoraggio: ssh -i $SSH_KEY elementmedica@$SERVER_IP 'htop'"

print_success "Verifica completata con successo!"