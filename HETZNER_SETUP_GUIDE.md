# 🚀 Guida Setup Server Hetzner per ElementMedica 2.0

## 📋 Configurazione Server Raccomandata

### 🖥️ Specifiche Server Hetzner CX11
```
Tipo Server: CX11 (Shared vCPU)
CPU: 1 vCPU AMD EPYC
RAM: 2 GB
Storage: 20 GB SSD
Traffico: 20 TB/mese
Rete: 1 Gbit/s
IPv4: 1 indirizzo incluso
IPv6: /64 subnet incluso
Prezzo: €3.29/mese (€39.48/anno)
```

### 🐧 Sistema Operativo Raccomandato
**Ubuntu 22.04 LTS (Jammy Jellyfish)**
- ✅ Supporto a lungo termine (fino ad aprile 2027)
- ✅ Compatibilità ottimale con Node.js 18+
- ✅ Repository aggiornati per Docker, Nginx, PostgreSQL
- ✅ Sicurezza e stabilità enterprise
- ✅ Documentazione estesa e community support

### 🔑 SSH Key per Accesso Sicuro

**Genera la tua SSH Key (sul tuo Mac):**
```bash
# Genera nuova SSH key
ssh-keygen -t ed25519 -C "elementmedica-hetzner-$(date +%Y%m%d)" -f ~/.ssh/elementmedica_hetzner

# Visualizza la chiave pubblica da copiare su Hetzner
cat ~/.ssh/elementmedica_hetzner.pub
```

**SSH Key pubblica (da aggiungere su Hetzner):**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHDerOFtboDYfJ9OrGzX5NOKgPsdFXxEN6aIoQ+hWat/ elementmedica-hetzner-20250818
```

## 🛠️ Procedura Setup Completa

### 1. 🏗️ Creazione Server su Hetzner Cloud

#### Accesso Console Hetzner
1. Vai su https://console.hetzner.cloud/
2. Crea account o accedi
3. Crea nuovo progetto "ElementMedica-Production"

#### Configurazione Server
```yaml
Nome Server: elementmedica-prod-01
Tipo: CX11 (€3.29/mese)
Immagine: Ubuntu 22.04 LTS
Datacenter: Nuremberg (nbg1) o Helsinki (hel1)
SSH Key: [Aggiungi la tua chiave pubblica]
Firewall: [Crea nuovo - vedi configurazione sotto]
Backup: Abilitato (€0.66/mese - 20% del costo server)
```

#### Configurazione Firewall Hetzner
```yaml
Nome Firewall: elementmedica-firewall
Regole Inbound:
  - SSH: Porta 22, Sorgente: La tua IP pubblica
  - HTTP: Porta 80, Sorgente: 0.0.0.0/0
  - HTTPS: Porta 443, Sorgente: 0.0.0.0/0
  - Monitoring: Porta 9090, Sorgente: La tua IP pubblica
Regole Outbound:
  - Tutto: Permesso (per aggiornamenti e connessioni esterne)
```

### 2. 🔐 Primo Accesso e Configurazione Base

#### Connessione SSH
```bash
# Connessione al server (sostituisci con il tuo IP)
ssh -i ~/.ssh/elementmedica_hetzner root@YOUR_SERVER_IP

# Aggiungi al file ~/.ssh/config per facilità
cat >> ~/.ssh/config << EOF
Host elementmedica-prod
    HostName YOUR_SERVER_IP
    User root
    IdentityFile ~/.ssh/elementmedica_hetzner
    ServerAliveInterval 60
EOF

# Connessione semplificata
ssh elementmedica-prod
```

#### Configurazione Iniziale Sistema
```bash
# Aggiorna sistema
apt update && apt upgrade -y

# Configura timezone
timedatectl set-timezone Europe/Rome

# Configura hostname
hostnamectl set-hostname elementmedica-prod

# Crea utente non-root
useradd -m -s /bin/bash elementmedica
usermod -aG sudo elementmedica

# Configura SSH per utente elementmedica
mkdir -p /home/elementmedica/.ssh
cp /root/.ssh/authorized_keys /home/elementmedica/.ssh/
chown -R elementmedica:elementmedica /home/elementmedica/.ssh
chmod 700 /home/elementmedica/.ssh
chmod 600 /home/elementmedica/.ssh/authorized_keys
```

### 3. 🔒 Configurazione Sicurezza Avanzata

#### Hardening SSH
```bash
# Backup configurazione SSH
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Configurazione SSH sicura
cat > /etc/ssh/sshd_config << 'EOF'
# ElementMedica SSH Configuration
Port 22
Protocol 2

# Authentication
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

# Security
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*

# Connection settings
ClientAliveInterval 300
ClientAliveCountMax 2
MaxAuthTries 3
MaxSessions 10

# Subsystem
Subsystem sftp /usr/lib/openssh/sftp-server
EOF

# Riavvia SSH
systemctl restart sshd
```

#### Configurazione UFW Firewall
```bash
# Installa e configura UFW
apt install ufw -y

# Regole base
ufw default deny incoming
ufw default allow outgoing

# Porte necessarie
ufw allow from YOUR_IP_ADDRESS to any port 22  # SSH solo dal tuo IP
ufw allow 80/tcp                               # HTTP
ufw allow 443/tcp                              # HTTPS
ufw allow from YOUR_IP_ADDRESS to any port 9090  # Monitoring

# Abilita firewall
ufw --force enable
```

### 4. 📦 Installazione Stack Applicativo

#### Script di Setup Automatico
```bash
# Scarica e esegui script di setup
wget https://raw.githubusercontent.com/elementmedica/elementmedica-2.0/main/scripts/startup-setup.sh
chmod +x startup-setup.sh
sudo ./startup-setup.sh
```

#### Setup Manuale (alternativo)
```bash
# Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# PM2 Process Manager
npm install -g pm2

# Docker e Docker Compose
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Nginx
apt-get install -y nginx

# Certbot per SSL
apt-get install -y certbot python3-certbot-nginx

# Monitoring tools
apt-get install -y htop iotop nethogs
```

### 5. 🗂️ Struttura Directory e Permessi

```bash
# Crea struttura directory
mkdir -p /home/elementmedica/{app,logs,backups,ssl}
mkdir -p /var/log/elementmedica

# Imposta permessi
chown -R elementmedica:elementmedica /home/elementmedica
chown -R elementmedica:elementmedica /var/log/elementmedica

# Aggiungi elementmedica al gruppo docker
usermod -aG docker elementmedica
```

### 6. 🔧 Configurazione Swap (Importante per 2GB RAM)

```bash
# Crea file swap da 2GB
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Rendi permanente
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Ottimizza parametri swap
echo 'vm.swappiness=10' >> /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
sysctl -p
```

## 🌐 Configurazione DNS e Dominio

### Cloudflare DNS Setup
```yaml
Tipo Record: A
Nome: @
Contenuto: YOUR_SERVER_IP
TTL: Auto
Proxy: Abilitato (nuvola arancione)

Tipo Record: A  
Nome: www
Contenuto: YOUR_SERVER_IP
TTL: Auto
Proxy: Abilitato (nuvola arancione)
```

### Verifica DNS
```bash
# Verifica risoluzione DNS
nslookup tuodominio.com
dig tuodominio.com

# Test connettività
ping tuodominio.com
```

## 📊 Monitoraggio e Manutenzione

### Configurazione UptimeRobot
```yaml
Monitor 1:
  Tipo: HTTP(s)
  URL: https://tuodominio.com/health
  Nome: ElementMedica API Health
  Intervallo: 5 minuti

Monitor 2:
  Tipo: HTTP(s)  
  URL: https://tuodominio.com/api/health
  Nome: ElementMedica Proxy Health
  Intervallo: 5 minuti

Monitor 3:
  Tipo: Ping
  Target: YOUR_SERVER_IP
  Nome: ElementMedica Server Ping
  Intervallo: 5 minuti
```

### Script di Monitoraggio Locale
```bash
# Crea script di monitoraggio
cat > /home/elementmedica/monitor.sh << 'EOF'
#!/bin/bash
# ElementMedica Server Monitor

echo "=== ElementMedica Server Status $(date) ==="
echo "Uptime: $(uptime)"
echo "Memory: $(free -h | grep Mem)"
echo "Disk: $(df -h / | tail -1)"
echo "Load: $(cat /proc/loadavg)"
echo "PM2 Status:"
pm2 status
echo "Docker Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "=== End Status ==="
EOF

chmod +x /home/elementmedica/monitor.sh

# Aggiungi a crontab per esecuzione ogni 5 minuti
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/elementmedica/monitor.sh >> /var/log/elementmedica/monitor.log") | crontab -
```

## 🔐 Variabili Ambiente e Configurazione

### File .env Template
```bash
# Crea file .env per ElementMedica
cat > /home/elementmedica/app/.env << 'EOF'
# ElementMedica 2.0 Production Configuration

# Server Configuration
NODE_ENV=production
PORT_API=4001
PORT_PROXY=4003
HOST=0.0.0.0

# Database (Supabase)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres"
SUPABASE_URL="https://[PROJECT].supabase.co"
SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"
SUPABASE_SERVICE_KEY="[YOUR_SERVICE_KEY]"

# JWT Configuration
JWT_SECRET="[GENERATE_STRONG_SECRET]"
JWT_EXPIRES_IN="24h"
REFRESH_TOKEN_SECRET="[GENERATE_STRONG_SECRET]"
REFRESH_TOKEN_EXPIRES_IN="7d"

# CORS Configuration
CORS_ORIGIN="https://tuodominio.com"
CORS_CREDENTIALS=true

# File Storage (Cloudflare R2)
R2_ACCOUNT_ID="[YOUR_ACCOUNT_ID]"
R2_ACCESS_KEY_ID="[YOUR_ACCESS_KEY]"
R2_SECRET_ACCESS_KEY="[YOUR_SECRET_KEY]"
R2_BUCKET_NAME="elementmedica-storage"
R2_PUBLIC_URL="https://storage.tuodominio.com"

# Email Configuration (Brevo)
BREVO_API_KEY="[YOUR_BREVO_API_KEY]"
FROM_EMAIL="noreply@tuodominio.com"
FROM_NAME="ElementMedica"

# Monitoring
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/elementmedica/app.log
EOF

# Imposta permessi sicuri
chmod 600 /home/elementmedica/app/.env
chown elementmedica:elementmedica /home/elementmedica/app/.env
```

## 🚀 Deploy e Avvio Applicazione

### Clone Repository e Setup
```bash
# Cambia utente
su - elementmedica

# NOTA: Repository GitHub vuota - Deploy da codice locale
# Crea directory applicazione
mkdir -p /home/elementmedica/app
cd /home/elementmedica/app

# Copia codice da locale (eseguire dal computer locale):
# scp -r ./project-2.0/* elementmedica@128.140.15.15:/home/elementmedica/app/

echo "⚠️ Repository GitHub vuota - Codice deve essere copiato manualmente"
echo "📁 Directory pronta: /home/elementmedica/app"

# Installa dipendenze
npm install
cd backend && npm install && cd ..

# Build applicazione
npm run build

# Configura PM2
pm2 start ecosystem.startup.config.js --env production
pm2 save
pm2 startup
```

### Configurazione SSL con Let's Encrypt
```bash
# Ottieni certificato SSL
sudo certbot --nginx -d tuodominio.com -d www.tuodominio.com

# Verifica auto-renewal
sudo certbot renew --dry-run

# Configura auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## 📋 Checklist Post-Setup

### ✅ Verifica Sistema
- [ ] Server accessibile via SSH
- [ ] Firewall configurato correttamente
- [ ] Swap attivo e configurato
- [ ] DNS risolve correttamente
- [ ] SSL certificato installato

### ✅ Verifica Applicazione
- [ ] PM2 processi attivi: `pm2 status`
- [ ] API Health: `curl https://tuodominio.com/api/health`
- [ ] Proxy Health: `curl https://tuodominio.com/health`
- [ ] Login funzionante
- [ ] Database connesso

### ✅ Verifica Sicurezza
- [ ] SSH solo con chiave
- [ ] Root login disabilitato
- [ ] UFW firewall attivo
- [ ] Fail2Ban configurato
- [ ] SSL/TLS attivo

### ✅ Verifica Monitoraggio
- [ ] UptimeRobot configurato
- [ ] Prometheus metriche disponibili
- [ ] Log rotation attivo
- [ ] Backup automatici configurati

## 🆘 Troubleshooting Comune

### Problemi SSH
```bash
# Verifica configurazione SSH
sudo sshd -T | grep -E "(permitrootlogin|passwordauthentication|pubkeyauthentication)"

# Test connessione SSH
ssh -vvv elementmedica-prod
```

### Problemi Memoria
```bash
# Verifica utilizzo memoria
free -h
htop

# Verifica swap
swapon --show
cat /proc/swaps
```

### Problemi Rete
```bash
# Verifica porte aperte
netstat -tlnp
ss -tlnp

# Test connettività
curl -I https://tuodominio.com
```

## 📞 Informazioni di Supporto

### 🔑 Credenziali e Accessi
```yaml
Server IP: [DA_CONFIGURARE]
SSH User: elementmedica
SSH Key: ~/.ssh/elementmedica_hetzner
Domain: tuodominio.com

Hetzner Console: https://console.hetzner.cloud/
Cloudflare Dashboard: https://dash.cloudflare.com/
Supabase Dashboard: https://app.supabase.com/
UptimeRobot Dashboard: https://uptimerobot.com/dashboard
```

### 📚 Documentazione Utile
- **Hetzner Cloud Docs**: https://docs.hetzner.com/cloud/
- **Ubuntu 22.04 Guide**: https://ubuntu.com/server/docs
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Nginx Configuration**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/docs/

---

## 🎯 Riepilogo Configurazione

**Server Hetzner CX11:**
- ✅ Ubuntu 22.04 LTS
- ✅ 2GB RAM + 2GB Swap
- ✅ SSH Key authentication
- ✅ UFW Firewall configurato
- ✅ SSL/TLS con Let's Encrypt
- ✅ Monitoring con UptimeRobot
- ✅ Backup automatici Hetzner

**Costo Totale: €4.78/mese**
- Server CX11: €3.29/mese
- Backup: €0.66/mese  
- Domain: €0.83/mese
- Altri servizi: €0.00/mese (tier gratuiti)

**ElementMedica 2.0 è pronto per il deployment!** 🚀

---

*Guida creata il: $(date)*  
*Versione: 1.0*  
*Target: Hetzner CX11 + Ubuntu 22.04 LTS*  
*Budget: €4.78/mese*