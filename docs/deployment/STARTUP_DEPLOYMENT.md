# 🚀 ElementMedica 2.0 - Deployment Economico Startup

**Budget Target**: 10-20€/mese per il primo anno  
**Scalabilità**: Preparato per crescita futura  
**Data**: 27 Gennaio 2025

## 💰 Piano Costi Ottimizzato

### 📊 Configurazione Startup (10-15€/mese)

| Servizio | Provider | Configurazione | Costo/mese | Note |
|----------|----------|----------------|------------|------|
| **Server VPS** | Hetzner Cloud | CX11 (1 vCPU, 2GB RAM, 20GB SSD) | €3.29 | Perfetto per startup |
| **Database** | Supabase | Free Tier | €0 | 500MB, 2 progetti |
| **Dominio** | Namecheap | .com | €0.83 | Primo anno scontato |
| **SSL** | Let's Encrypt | Gratuito | €0 | Automatico |
| **CDN/DNS** | Cloudflare | Free Tier | €0 | Illimitato |
| **Backup** | Hetzner Backup | 20% del server | €0.66 | Backup automatici |
| **Monitoring** | UptimeRobot | Free Tier | €0 | 50 monitor |
| **Email** | Brevo (ex Sendinblue) | Free Tier | €0 | 300 email/giorno |
| **Storage** | Cloudflare R2 | Free Tier | €0 | 10GB/mese |

**TOTALE MENSILE: €4.78** 💚

### 📈 Configurazione Crescita (15-20€/mese)

| Servizio | Provider | Configurazione | Costo/mese | Note |
|----------|----------|----------------|------------|------|
| **Server VPS** | Hetzner Cloud | CX21 (2 vCPU, 4GB RAM, 40GB SSD) | €5.83 | Per 50+ utenti |
| **Database** | Supabase | Pro Plan | €25 | 8GB, progetti illimitati |
| **Dominio** | Namecheap | .com | €1.17 | Prezzo normale |
| **SSL** | Let's Encrypt | Gratuito | €0 | Automatico |
| **CDN/DNS** | Cloudflare | Free Tier | €0 | Illimitato |
| **Backup** | Hetzner Backup | 20% del server | €1.17 | Backup automatici |
| **Monitoring** | UptimeRobot | Free Tier | €0 | 50 monitor |
| **Email** | Brevo | Free Tier | €0 | 300 email/giorno |
| **Storage** | Cloudflare R2 | Free Tier | €0 | 10GB/mese |

**TOTALE MENSILE: €33.17** (Quando necessario)

## 🏗️ Architettura Ottimizzata Startup

### Single Server Setup (Fase 1)
```
Hetzner CX11 (2GB RAM)
├── Nginx (Reverse Proxy + SSL)
├── Node.js API Server (Porta 4001)
├── Node.js Proxy Server (Porta 4003)
├── Frontend Build (Servito da Nginx)
├── Redis (Cache locale)
└── PM2 (Process Manager)

Database Esterno:
└── Supabase PostgreSQL (Free Tier)
```

### Vantaggi Configurazione:
- ✅ **Costo minimo**: Solo €4.78/mese
- ✅ **Scalabilità**: Upgrade semplice quando necessario
- ✅ **Affidabilità**: Hetzner 99.9% uptime
- ✅ **Backup automatici**: Inclusi nel prezzo
- ✅ **SSL gratuito**: Let's Encrypt automatico
- ✅ **CDN globale**: Cloudflare gratuito

## 🛠️ Setup Tecnico Dettagliato

### 1. Server Hetzner Cloud (€3.29/mese)

**Specifiche CX11:**
- 1 vCPU AMD
- 2GB RAM DDR4
- 20GB SSD NVMe
- 20TB traffico
- IPv4 + IPv6
- Backup automatici (+€0.66)

**Configurazione Ottimizzata:**
```bash
# Ubuntu 22.04 LTS
# Installazione automatica:
curl -fsSL https://raw.githubusercontent.com/elementmedica/setup/main/startup-setup.sh | bash
```

### 2. Database Supabase (Gratuito)

**Free Tier Include:**
- 500MB database storage
- 2 progetti
- 50,000 monthly active users
- 500MB egress
- 1GB file storage
- Real-time subscriptions
- Edge Functions
- Auth integrato

**Configurazione:**
```env
# .env
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
SUPABASE_URL="https://[project].supabase.co"
SUPABASE_ANON_KEY="[anon-key]"
SUPABASE_SERVICE_KEY="[service-key]"
```

### 3. Nginx + SSL Automatico

**Configurazione Nginx:**
```nginx
server {
    listen 80;
    server_name elementmedica.com www.elementmedica.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name elementmedica.com www.elementmedica.com;
    
    # SSL Let's Encrypt (automatico)
    ssl_certificate /etc/letsencrypt/live/elementmedica.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/elementmedica.com/privkey.pem;
    
    # Frontend statico
    location / {
        root /var/www/elementmedica/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache statico
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API Proxy
    location /api/ {
        proxy_pass http://localhost:4003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
}
```

### 4. Docker Compose Ottimizzato

```yaml
# docker-compose.startup.yml
version: '3.8'

services:
  # API Server
  api-server:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "4001:4001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  # Proxy Server
  proxy-server:
    build:
      context: .
      dockerfile: backend/proxy/Dockerfile
    ports:
      - "4003:4003"
    environment:
      - NODE_ENV=production
      - API_SERVER_URL=http://api-server:4001
    depends_on:
      - api-server
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M

  # Redis Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 128M
```

## 📈 Piano di Scalabilità

### Fase 1: Startup (0-50 utenti) - €4.78/mese
- Hetzner CX11 (2GB RAM)
- Supabase Free Tier
- Single server setup
- Backup automatici

### Fase 2: Crescita (50-200 utenti) - €33.17/mese
- Upgrade a Hetzner CX21 (4GB RAM)
- Supabase Pro Plan
- Separazione servizi
- Monitoring avanzato

### Fase 3: Scale (200+ utenti) - €60-100/mese
- Hetzner CX31 (8GB RAM) o cluster
- Database dedicato
- Load balancer
- CDN premium
- Monitoring professionale

### Fase 4: Enterprise (1000+ utenti) - €200+/mese
- Multi-server setup
- Database cluster
- Auto-scaling
- Disaster recovery
- Support 24/7

## 🚀 Script di Setup Automatico

### startup-setup.sh
```bash
#!/bin/bash
# ElementMedica 2.0 - Setup Automatico Startup

set -e

echo "🚀 ElementMedica 2.0 - Setup Startup"
echo "================================="

# Aggiornamento sistema
echo "📦 Aggiornamento sistema..."
apt update && apt upgrade -y

# Installazione dipendenze
echo "🔧 Installazione dipendenze..."
apt install -y curl wget git nginx certbot python3-certbot-nginx

# Installazione Node.js 18
echo "📦 Installazione Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Installazione PM2
echo "⚙️ Installazione PM2..."
npm install -g pm2

# Installazione Docker
echo "🐳 Installazione Docker..."
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Installazione Docker Compose
echo "🔧 Installazione Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Configurazione firewall
echo "🔒 Configurazione firewall..."
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# Creazione utente applicazione
echo "👤 Creazione utente applicazione..."
useradd -m -s /bin/bash elementmedica
usermod -aG docker elementmedica

# Configurazione Nginx
echo "🌐 Configurazione Nginx..."
systemctl enable nginx
systemctl start nginx

# Setup SSL Let's Encrypt
echo "🔐 Configurazione SSL..."
# Verrà configurato dopo il deploy

echo "✅ Setup completato!"
echo "📋 Prossimi passi:"
echo "1. Configurare dominio DNS"
echo "2. Clonare repository"
echo "3. Configurare variabili ambiente"
echo "4. Eseguire deploy"
```

### deploy-startup.sh
```bash
#!/bin/bash
# ElementMedica 2.0 - Deploy Startup

set -e

echo "🚀 ElementMedica 2.0 - Deploy Startup"
echo "==================================="

# Variabili
APP_DIR="/home/elementmedica/app"
DOMAIN="elementmedica.com"
EMAIL="admin@elementmedica.com"

# Clonazione repository
echo "📥 Clonazione repository..."
su - elementmedica -c "git clone https://github.com/elementmedica/elementmedica-2.0.git $APP_DIR"

# Installazione dipendenze
echo "📦 Installazione dipendenze..."
cd $APP_DIR
su - elementmedica -c "cd $APP_DIR && npm install"
su - elementmedica -c "cd $APP_DIR && npm run build"

# Configurazione Nginx
echo "🌐 Configurazione Nginx..."
cp $APP_DIR/config/nginx/startup.conf /etc/nginx/sites-available/elementmedica
ln -sf /etc/nginx/sites-available/elementmedica /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Configurazione SSL
echo "🔐 Configurazione SSL..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive

# Avvio servizi
echo "🚀 Avvio servizi..."
su - elementmedica -c "cd $APP_DIR && docker-compose -f docker-compose.startup.yml up -d"

# Configurazione PM2
echo "⚙️ Configurazione PM2..."
su - elementmedica -c "cd $APP_DIR && pm2 start ecosystem.startup.config.js"
su - elementmedica -c "pm2 startup"
su - elementmedica -c "pm2 save"

# Test finale
echo "🧪 Test finale..."
sleep 10
curl -f https://$DOMAIN/api/health || echo "❌ Health check fallito"

echo "✅ Deploy completato!"
echo "🌐 Sito disponibile su: https://$DOMAIN"
echo "📊 Monitoraggio: pm2 monit"
echo "📋 Logs: pm2 logs"
```

## 📊 Monitoraggio Economico

### UptimeRobot (Gratuito)
```bash
# Configurazione monitoring
# - https://elementmedica.com (ogni 5 minuti)
# - https://elementmedica.com/api/health (ogni 5 minuti)
# - Alert via email gratuiti
```

### Grafana Cloud (Gratuito)
```yaml
# prometheus.yml
global:
  scrape_interval: 60s

scrape_configs:
  - job_name: 'elementmedica'
    static_configs:
      - targets: ['localhost:4001', 'localhost:4003']
    scrape_interval: 60s
```

## 🔄 Backup Strategy

### Backup Automatico Hetzner
```bash
# Backup giornaliero automatico del server
# Retention: 7 giorni
# Costo: €0.66/mese (20% del server)
```

### Backup Database Supabase
```bash
# Backup automatico incluso nel Free Tier
# Point-in-time recovery: 7 giorni
# Export manuale settimanale raccomandato
```

### Script Backup Personalizzato
```bash
#!/bin/bash
# backup-startup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/elementmedica/backups"

# Backup database
echo "📦 Backup database..."
pg_dump $DATABASE_URL > $BACKUP_DIR/db_$DATE.sql

# Backup file applicazione
echo "📁 Backup file..."
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /home/elementmedica/app

# Upload su Cloudflare R2 (opzionale)
echo "☁️ Upload cloud..."
# aws s3 cp $BACKUP_DIR/db_$DATE.sql s3://elementmedica-backups/

# Pulizia backup vecchi (>30 giorni)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "✅ Backup completato!"
```

## 🎯 Vantaggi Soluzione Startup

### ✅ Vantaggi Economici
- **Costo minimo**: €4.78/mese per iniziare
- **Scalabilità graduale**: Upgrade solo quando necessario
- **No vendor lock-in**: Facile migrazione
- **Backup inclusi**: Nessun costo aggiuntivo

### ✅ Vantaggi Tecnici
- **Performance**: SSD NVMe, CDN globale
- **Affidabilità**: 99.9% uptime garantito
- **Sicurezza**: SSL automatico, firewall
- **Monitoring**: Gratuito e completo

### ✅ Vantaggi Operativi
- **Setup automatico**: Script pronti all'uso
- **Manutenzione minima**: Aggiornamenti automatici
- **Support**: Community + documentazione
- **Compliance**: GDPR ready

## 🚀 Prossimi Passi

### 1. Preparazione (5 minuti)
```bash
# Registrazione account
# - Hetzner Cloud: https://hetzner.cloud
# - Supabase: https://supabase.com
# - Cloudflare: https://cloudflare.com
# - Namecheap: https://namecheap.com
```

### 2. Setup Infrastruttura (30 minuti)
```bash
# Creazione server Hetzner
# Configurazione DNS Cloudflare
# Setup database Supabase
# Registrazione dominio
```

### 3. Deploy Automatico (15 minuti)
```bash
# Esecuzione script setup
# Deploy applicazione
# Test finale
```

### 4. Configurazione Monitoring (10 minuti)
```bash
# Setup UptimeRobot
# Configurazione alert
# Test backup
```

**TOTALE TEMPO SETUP: ~1 ora**

---

## 📞 Supporto

Per assistenza con il deployment startup:
- 📧 Email: support@elementmedica.com
- 📚 Documentazione: `/docs/deployment/`
- 🐛 Issues: GitHub Issues
- 💬 Community: Discord Server

---

**💡 Nota**: Questa configurazione è ottimizzata per startup e piccole aziende. Permette di iniziare con costi minimi mantenendo la possibilità di scalare facilmente quando il business cresce.