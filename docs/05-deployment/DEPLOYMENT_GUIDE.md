# 🚀 ElementMedica - Guida Deployment Unificata

**Versione**: 3.1 Multi-Domain  
**Data**: 4 Dicembre 2025  
**Server**: 128.140.15.15 (Hetzner Cloud)  
**Repository**: git@github.com:ElementSoftwareMedica/ElementMedica.git

---

## 🌐 CONFIGURAZIONE DOMINI

| Dominio | Applicazione | Porta Dev | Stato |
|---------|--------------|-----------|-------|
| **elementsicurezza.com** | CRM/Backoffice (localhost:5173) | 5173 | ✅ DNS configurato |
| **elementmedica.com** | Frontend Pubblico (localhost:5174) | 5174 | 🔄 Da configurare |

**IP Server Hetzner**: `128.140.15.15`

---

## 📋 Indice

1. [Panoramica Architettura](#panoramica-architettura)
2. [Configurazione Domini](#configurazione-domini-dettaglio)
3. [Prerequisiti](#prerequisiti)
4. [Credenziali e Accessi](#credenziali-e-accessi)
5. [Configurazione Server Hetzner](#configurazione-server-hetzner)
6. [Database Supabase](#database-supabase)
7. [Deployment Step-by-Step](#deployment-step-by-step)
8. [Configurazione DNS e Domini](#configurazione-dns-e-domini)
9. [SSL/TLS con Let's Encrypt](#ssltls-con-lets-encrypt)
10. [PM2 e Gestione Processi](#pm2-e-gestione-processi)
11. [Backup e Disaster Recovery](#backup-e-disaster-recovery)
12. [Monitoring e Health Checks](#monitoring-e-health-checks)
13. [Troubleshooting](#troubleshooting)
14. [Checklist Pre-Deploy](#checklist-pre-deploy)

---

## 🏗️ Panoramica Architettura

### Architettura Multi-Domain con 2 Server Backend

> **P64**: Proxy server (4003) ELIMINATO - Nginx routes directly to API and Documents servers.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    INTERNET                                          │
│         elementsicurezza.com              elementmedica.com                        │
│         (CRM/Backoffice)                   (Frontend Pubblico)                      │
└───────────────┬────────────────────────────────────┬────────────────────────────────┘
                │                                    │
                └──────────────┬─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Hetzner Cloud VPS  │
                    │    128.140.15.15    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │       NGINX         │
                    │  (Reverse Proxy)    │
                    │    :80, :443        │
                    └──────────┬──────────┘
                               │
    ┌──────────────────────────┼──────────────────────────┐
    │                          │                          │
    ▼                          ▼                          ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ elementsicurezza│  │  elementmedica   │  │   API Server    │
│ Frontend CRM    │   │  Frontend Pub    │  │    (Node.js)    │
│ :5173 → /dist   │   │  :5174 → /dist2  │  │     :4001       │
└─────────────────┘   └─────────────────┘   └────────┬────────┘
                                                      │
                          ┌───────────────────────────┼───────────────────────────┐
                          │                           │                           │
                    ┌─────▼─────┐              ┌──────▼──────┐              ┌──────▼──────┐
                    │ Documents │              │   Redis     │              │ Supabase    │
                    │  Server   │              │   (Cache)   │              │ PostgreSQL  │
                    │   :4002   │              │   :6379     │              │ :5432/6543  │
                    └───────────┘              └─────────────┘              └─────────────┘
```
```

### Mapping Domini → Frontend

| Dominio | Directory Build | Vite Port | Nginx Location |
|---------|-----------------|-----------|----------------|
| **elementsicurezza.com** | `/var/www/elementmedica/dist` | 5173 | root |
| **elementmedica.com** | `/var/www/elementmedica/dist-public` | 5174 | root |

### Server e Porte (IMMUTABILI)

> **P64**: Proxy Server (4003) ELIMINATO

| Servizio | Porta | Descrizione |
|----------|-------|-------------|
| **API Server** | 4001 | Express, Prisma, RBAC, GDPR, CORS |
| **Documents Server** | 4002 | PDF Puppeteer, browser pool |
| **Frontend CRM (dev)** | 5173 | Vite dev - elementsicurezza.com |
| **Frontend Public (dev)** | 5174 | Vite dev - elementmedica.com |
| **Frontend (prod)** | - | Static files via Nginx |
| **PostgreSQL** | 5432/6543 | Supabase (direct/pooled) |
| **Redis** | 6379 | Cache e sessioni |

---

## 🌐 Configurazione Domini (Dettaglio)

### elementsicurezza.com (CRM/Backoffice)
```
Scopo:          Applicazione gestionale interna (CRM)
DNS:            A record → 128.140.15.15 ✅ GIÀ CONFIGURATO
Localhost:      http://localhost:5173
Produzione:     https://elementsicurezza.com
Directory:      /var/www/elementmedica/dist
Funzionalità:   Login, Dashboard, Gestione Corsi, Clienti, Preventivi, etc.
```

### elementmedica.com (Frontend Pubblico)
```
Scopo:          Sito pubblico per visitatori/clienti
DNS:            A record → 128.140.15.15 🔄 DA CONFIGURARE
Localhost:      http://localhost:5174
Produzione:     https://elementmedica.com
Directory:      /var/www/elementmedica/dist-public
Funzionalità:   CMS pubblico, Landing pages, Form contatto, Catalogo corsi
```

---

## 📋 Prerequisiti

### 🖥️ Specifiche Server Hetzner Raccomandate

**Scenario di riferimento**: ~100 pazienti/giorno, 10 utenze contemporanee, generazione PDF con Puppeteer.

| Componente | Consumo stimato |
|------------|----------------|
| **API Server** (Express + Prisma) | ~200-400MB RAM |
| **Documents Server** (Express) | ~150-300MB RAM |
| **Puppeteer/Chrome** (1-3 istanze) | ~200-400MB × istanza → max ~1.2GB |
| **Nginx** | ~50MB RAM |
| **PM2** | ~50MB RAM |
| **Redis** (opzionale, per cache) | ~50-100MB RAM |
| **OS + overhead** | ~500MB RAM |
| **Totale stimato** | ~2.5-3.5GB sotto carico medio |

#### Server Raccomandato: **Hetzner CPX21**

| Specifica | Valore | Motivazione |
|-----------|--------|-------------|
| **CPU** | 3 vCPU (AMD) | 1 per API, 1 per Documents/Puppeteer, 1 per Nginx/OS |
| **RAM** | 4GB | Copertura picchi Puppeteer (3 browser simultanei) + headroom |
| **Storage** | 80GB NVMe SSD | PDF generati, uploads, logs (~50GB dati + 30GB margine) |
| **Traffico** | 20TB/mese incluso | Abbondante per ~100 pazienti/giorno |
| **Prezzo** | ~€7.49/mese | Rapporto qualità/prezzo ottimale |

#### Alternative

| Scenario | Server | CPU | RAM | Storage | Prezzo |
|----------|--------|-----|-----|---------|--------|
| **Minimo** (MVP/staging) | CX22 | 2 vCPU | 4GB | 40GB | ~€5.49/mese |
| **Raccomandato** | CPX21 | 3 vCPU (AMD) | 4GB | 80GB | ~€7.49/mese |
| **Crescita** (>200 pz/giorno, >20 utenti) | CPX31 | 4 vCPU (AMD) | 8GB | 160GB | ~€14.49/mese |

> **Nota**: Il DB è su Supabase (PostgreSQL managed), quindi NON serve RAM/CPU per PostgreSQL locale.
> Puppeteer è il componente più esigente: ogni istanza Chrome consuma ~200-400MB. Con `MAX_BROWSERS=3` servono almeno 4GB RAM totali per gestire i picchi.

#### Ottimizzazioni PM2 Consigliate

```javascript
// ecosystem.config.js - produzione
{
  name: 'api-server',
  instances: 1,          // Fork mode (Prisma non supporta cluster bene)
  max_memory_restart: '1G',
  env_production: {
    NODE_ENV: 'production',
    PUPPETEER_MIN_BROWSERS: 1,
    PUPPETEER_MAX_BROWSERS: 3
  }
}
```

### Software Richiesto su Hetzner

```bash
# Sistema
- Ubuntu 22.04 LTS o superiore
- RAM: minimo 4GB, raccomandato 4-8GB
- CPU: 2-3+ vCPU (AMD preferito per rapporto prezzo/prestazioni)
- Storage: 50GB+ SSD

# Software
- Node.js: v18.x LTS o v20.x LTS
- npm: v8.x o superiore
- PostgreSQL client: v14+
- Nginx: v1.18+
- PM2: v5.x
- Git: v2.30+
- Certbot (Let's Encrypt)
- Redis: v7.x (opzionale per cache)
```

### Installazione Software Base

```bash
# Connessione SSH
ssh elementmedica@<IP_SERVER>

# Aggiornamento sistema
sudo apt update && sudo apt upgrade -y

# Installazione dipendenze base
sudo apt install -y curl git build-essential postgresql-client nginx certbot python3-certbot-nginx

# Installazione Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Installazione PM2 globalmente
sudo npm install -g pm2

# Verifica installazioni
node --version   # v20.x.x
npm --version    # 10.x.x
pm2 --version    # 5.x.x
nginx -v         # nginx/1.18.x+
```

---

## 🔐 Credenziali e Accessi

> **🚨 SICUREZZA**: Tutte le credenziali di produzione sono gestite tramite variabili d'ambiente sul server e GitHub Secrets. NON inserire mai credenziali reali in questo file.

---

### 🖥️ Hetzner Cloud Server

```bash
# Server VPS
IP:         128.140.15.15
Tipo:       Hetzner Cloud VPS
OS:         Ubuntu 22.04 LTS

# Utente Applicativo
User:       elementmedica
Password:   <VEDI_SECRETS_MANAGER>

# API Token Hetzner (per automazioni/CLI)
API_TOKEN:  <VEDI_GITHUB_SECRETS>
```

---

### 🔑 SSH Keys

```bash
# Chiave GitHub Deploy (già su server)
# Fingerprint e chiave pubblica configurati su GitHub → Settings → Deploy Keys
Email: elementmedica-github@elementsoftwaremedica.com

# Configurazione SSH: solo autenticazione a chiave pubblica
# Le chiavi private NON vanno mai condivise o documentate
```

---

### 📦 GitHub Repository

```bash
# Repository
URL SSH:    git@github.com:ElementSoftwareMedica/ElementMedica.git
URL HTTPS:  https://github.com/ElementSoftwareMedica/ElementMedica.git
Branch:     main (production), feature/* (development)
```

---

### 🗄️ Supabase PostgreSQL

```bash
# Connection Pooling (per applicazione - PgBouncer)
DATABASE_URL="postgresql://<USERNAME>:<PASSWORD>@<HOST>:6543/postgres?pgbouncer=true"

# Direct Connection (per migrazioni Prisma)
DIRECT_URL="postgresql://<USERNAME>:<PASSWORD>@<HOST>:5432/postgres"

# Configurazione
Host Pooler: aws-1-eu-central-1.pooler.supabase.com
Port Pooler: 6543 (PgBouncer)
Port Direct: 5432 (per migrazioni)
Database:    postgres
# Credenziali: vedi .env sul server o GitHub Secrets
```

---

### 🪣 Hetzner S3 Object Storage

```bash
# Credenziali S3 (compatibile AWS S3) — vedi .env sul server
AWS_ACCESS_KEY_ID=<VEDI_ENV_SERVER>
AWS_SECRET_ACCESS_KEY=<VEDI_ENV_SERVER>
AWS_REGION="eu-central-1"
AWS_S3_ENDPOINT="https://s3.eu-central-1.hetzner.com"

# Bucket
BUCKET_DOCUMENTS="elementmedica-documents"
BUCKET_UPLOADS="elementmedica-uploads"
BUCKET_BACKUPS="elementmedica-backups"
```

---

### 🔒 JWT Secrets (GitHub Secrets)

```bash
# JWT Access Token Secret — generare con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<VEDI_GITHUB_SECRETS>

# JWT Refresh Token Secret — generare con lo stesso metodo
JWT_REFRESH_SECRET=<VEDI_GITHUB_SECRETS>
```

---

### 🧪 Credenziali Test Standard

```bash
# DA USARE SOLO IN SVILUPPO/TEST
Email:    admin@example.com
Password: Admin123!
Ruolo:    ADMIN (accesso completo)
```

---

## 🖥️ Configurazione Server Hetzner

### 1. Setup Utente Applicativo

```bash
# Come root
ssh root@<IP_SERVER>

# Crea utente applicativo
adduser elementmedica
# Impostare password sicura (NON documentarla qui)

# Aggiungi ai gruppi necessari
usermod -aG sudo elementmedica
usermod -aG www-data elementmedica

# Configura SSH key per deploy
su - elementmedica
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Aggiungi chiave pubblica per deploy automatico
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOcpct7JReupVKOQZhXAjbbdBRLOKhyVS1LvekjEE60p elementmedica-github@elementsoftwaremedica.com" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 2. Sicurezza SSH

```bash
# Configura SSH (come root)
sudo nano /etc/ssh/sshd_config

# Modifica:
PermitRootLogin no
PasswordAuthentication no  # Solo dopo aver configurato le chiavi
PubkeyAuthentication yes
AllowUsers elementmedica

# Riavvia SSH
sudo systemctl restart sshd
```

### 3. Firewall (UFW)

```bash
# Abilita firewall
sudo ufw enable

# Regole base
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS

# Solo localhost per servizi interni (P64: Proxy 4003 rimosso)
sudo ufw allow from 127.0.0.1 to any port 4001  # API
sudo ufw allow from 127.0.0.1 to any port 4002  # Documents
sudo ufw allow from 127.0.0.1 to any port 6379  # Redis

# Verifica
sudo ufw status
```

### 4. Crea Struttura Directory

```bash
# Come elementmedica
sudo mkdir -p /var/www/elementmedica
sudo chown elementmedica:elementmedica /var/www/elementmedica
cd /var/www/elementmedica

# Directory necessarie
mkdir -p logs backups uploads storage temp scripts
mkdir -p dist dist-public  # Due frontend separati
chmod 755 logs backups uploads storage temp dist dist-public scripts
```

---

## 🗄️ Database Supabase

### Configurazione Prisma

Il database è già configurato su Supabase. Le connessioni sono:

- **Pooled** (porta 6543): Per l'applicazione, con PgBouncer
- **Direct** (porta 5432): Per le migrazioni Prisma

### Test Connessione

```bash
# Test connessione pooled
psql "postgresql://postgres.uywrlfkptcyhzoddsefg:[PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT 1;"

# Test connessione diretta
psql "postgresql://postgres.uywrlfkptcyhzoddsefg:[PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:5432/postgres" -c "SELECT version();"
```

### Migrazioni Database

```bash
cd /var/www/elementmedica/backend

# Applica migrazioni (usa DIRECT_URL automaticamente)
npx prisma migrate deploy

# Genera client
npx prisma generate

# Verifica schema
npx prisma validate
```

---

## 🚀 Deployment Step-by-Step

### 1. Clone Repository

```bash
cd /var/www/elementmedica

# Clone da GitHub
git clone git@github.com:ElementSoftwareMedica/ElementMedica.git .

# Oppure se già clonato
git fetch origin
git checkout main  # o production branch
git pull origin main
```

### 2. Configurazione Environment

Crea `/var/www/elementmedica/backend/.env`:

```bash
nano /var/www/elementmedica/backend/.env
```

```env
# ===========================================
# DATABASE (Supabase)
# ===========================================
DATABASE_URL="postgresql://<USERNAME>:<PASSWORD>@<HOST>:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://<USERNAME>:<PASSWORD>@<HOST>:5432/postgres"

# ===========================================
# SERVER PORTS (NON MODIFICARE!) - P64: Proxy eliminato
# ===========================================
API_SERVER_PORT=4001
DOCUMENTS_SERVER_PORT=4002

# URL Base
API_BASE_URL="http://localhost:4001"
DOCUMENTS_BASE_URL="http://localhost:4002"

# ===========================================
# JWT (OBBLIGATORI - NO FALLBACK)
# ===========================================
JWT_SECRET="<GENERARE_CON_crypto.randomBytes(64).toString('hex')>"
JWT_REFRESH_SECRET="<GENERARE_CON_crypto.randomBytes(64).toString('hex')>"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# ===========================================
# AMBIENTE
# ===========================================
NODE_ENV="production"
APP_NAME="ElementMedica"
APP_VERSION="2.0.0"

# ===========================================
# FRONTEND E CORS (MULTI-DOMAIN)
# ===========================================
FRONTEND_URL="https://elementsicurezza.com"
PUBLIC_FRONTEND_URL="https://elementmedica.com"
ALLOWED_ORIGINS="https://elementsicurezza.com,https://www.elementsicurezza.com,https://elementmedica.com,https://www.elementmedica.com"

# ===========================================
# GDPR
# ===========================================
GDPR_DATA_RETENTION_DAYS=2555
GDPR_AUDIT_RETENTION_DAYS=3650
GDPR_CONSENT_EXPIRY_DAYS=365

# ===========================================
# LOGGING
# ===========================================
LOG_LEVEL="info"
LOG_FILE_PATH="./logs/application.log"

# ===========================================
# RATE LIMITING
# ===========================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===========================================
# FILE STORAGE (Hetzner S3)
# ===========================================
STORAGE_MODE="s3"
AWS_ACCESS_KEY_ID=<VEDI_ENV_SERVER>
AWS_SECRET_ACCESS_KEY=<VEDI_ENV_SERVER>
AWS_REGION="eu-central-1"
AWS_S3_ENDPOINT="https://s3.eu-central-1.hetzner.com"
AWS_S3_BUCKET="elementmedica-documents"

# Local fallback
UPLOAD_DIR="/var/www/elementmedica/uploads"
UPLOAD_MAX_SIZE="10mb"

# ===========================================
# PDF GENERATION
# ===========================================
PUPPETEER_MIN_BROWSERS=2
PUPPETEER_MAX_BROWSERS=10
PUPPETEER_ACQUIRE_TIMEOUT=10000

# ===========================================
# REDIS (opzionale)
# ===========================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=""
REDIS_DB=0
```

Crea `/var/www/elementmedica/.env.production` per il frontend CRM:

```bash
nano /var/www/elementmedica/.env.production
```

```env
VITE_API_URL=https://elementsicurezza.com/api
VITE_APP_NAME="ElementSicurezza"
VITE_APP_VERSION="2.0.0"
```

Crea `/var/www/elementmedica/.env.production.public` per il frontend pubblico:

```bash
nano /var/www/elementmedica/.env.production.public
```

```env
VITE_API_URL=https://elementmedica.com/api
VITE_APP_NAME="ElementMedica"
VITE_APP_VERSION="2.0.0"
VITE_PUBLIC_MODE=true
```

### 3. Installazione Dipendenze

```bash
cd /var/www/elementmedica

# Backend
cd backend
npm ci --production

# Frontend
cd ..
npm ci --production
```

### 4. Build Frontend (ENTRAMBI i Domini)

```bash
cd /var/www/elementmedica

# ============================================
# BUILD 1: Frontend CRM (elementsicurezza.com)
# ============================================
# Usa .env.production
cp .env.production .env

npm run build

# Output in: dist/ (per elementsicurezza.com)
ls -lh dist/

# ============================================
# BUILD 2: Frontend Pubblico (elementmedica.com)
# ============================================
# Cambia env per build pubblica
cp .env.production.public .env

# Build con output diverso
npm run build -- --outDir dist-public

# Output in: dist-public/ (per elementmedica.com)
ls -lh dist-public/

# Ripristina .env originale
cp .env.production .env
```

### Script Build Automatico

Crea `/var/www/elementmedica/scripts/build-all.sh`:

```bash
#!/bin/bash
# Build script per entrambi i frontend
# Usage: ./scripts/build-all.sh

set -e
cd /var/www/elementmedica

echo "🔧 Building ElementSicurezza (CRM)..."
cp .env.production .env
npm run build
echo "✅ CRM build completato → dist/"

echo "🔧 Building ElementMedica (Pubblico)..."
cp .env.production.public .env
npm run build -- --outDir dist-public
echo "✅ Pubblico build completato → dist-public/"

# Ripristina
cp .env.production .env

echo ""
echo "📦 Build Summary:"
echo "  - elementsicurezza.com → dist/"
echo "  - elementmedica.com → dist-public/"
du -sh dist dist-public
```

### 5. Migrazioni Database

```bash
cd /var/www/elementmedica/backend

# Applica migrazioni
npx prisma migrate deploy

# Genera client Prisma
npx prisma generate

# Verifica
npx prisma validate
```

### 6. Setup PM2

Crea `/var/www/elementmedica/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: './backend/servers/api-server.js',
      instances: 1,
      exec_mode: 'fork',
      cwd: '/var/www/elementmedica',
      env: {
        NODE_ENV: 'production',
        PORT: 4001
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'documents-server',
      script: './backend/servers/documents-server.js',
      instances: 1,
      exec_mode: 'fork',
      cwd: '/var/www/elementmedica',
      env: {
        NODE_ENV: 'production',
        PORT: 4002
      },
      error_file: './logs/documents-error.log',
      out_file: './logs/documents-out.log',
      log_file: './logs/documents-combined.log',
      time: true,
      max_memory_restart: '512M',
      restart_delay: 4000,
      max_restarts: 10
    }
    // P64: proxy-server rimosso - Nginx gestisce routing in produzione
  ]
};
```

### 7. Avvio Servizi

```bash
cd /var/www/elementmedica

# Avvia tutti i servizi
pm2 start ecosystem.config.js

# Verifica stato
pm2 status

# Salva configurazione per auto-restart
pm2 save

# Setup startup automatico
pm2 startup
# Esegui il comando suggerito con sudo
```

---

## 🌐 Configurazione DNS e Domini

### Record DNS Richiesti

#### elementsicurezza.com (CRM) ✅ GIÀ CONFIGURATO
```
@       A       128.140.15.15
www     A       128.140.15.15
```

#### elementmedica.com (Pubblico) 🔄 DA CONFIGURARE
```
@       A       128.140.15.15
www     A       128.140.15.15
```

### Configurazione Nginx Multi-Domain

Crea `/etc/nginx/sites-available/elementmedica-multi`:

```nginx
# =============================================================================
# ElementMedica Multi-Domain Configuration
# Server: 128.140.15.15
# Domini: elementsicurezza.com (CRM) + elementmedica.com (Pubblico)
# P64: Proxy eliminato - Nginx routing diretto a API Server
# =============================================================================

# Upstream backend servers (P64: diretto ad API, proxy rimosso)
upstream api_backend {
    server 127.0.0.1:4001;
    keepalive 64;
}

# =============================================================================
# DOMINIO 1: elementsicurezza.com (CRM/Backoffice)
# =============================================================================

# Redirect HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name elementsicurezza.com www.elementsicurezza.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server - elementsicurezza.com
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name elementsicurezza.com www.elementsicurezza.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/elementsicurezza.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/elementsicurezza.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/elementsicurezza-access.log;
    error_log /var/log/nginx/elementsicurezza-error.log warn;

    # Root per frontend CRM (build da localhost:5173)
    root /var/www/elementmedica/dist;
    index index.html;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # Frontend SPA
    location / {
        try_files $uri $uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Proxy (P64: diretto a api_backend, proxy eliminato)
    location /api/ {
        proxy_pass http://api_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        client_max_body_size 50M;
    }

    # Documents server for PDF generation
    location /docs/ {
        proxy_pass http://127.0.0.1:4002/docs/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 600s;
    }

    # Health check
    location /health {
        proxy_pass http://api_backend/health;
        access_log off;
    }

    # Uploads
    location /uploads/ {
        alias /var/www/elementmedica/uploads/;
        expires 1h;
    }
}

# =============================================================================
# DOMINIO 2: elementmedica.com (Frontend Pubblico)
# =============================================================================

# Redirect HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name elementmedica.com www.elementmedica.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server - elementmedica.com
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name elementmedica.com www.elementmedica.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/elementmedica.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/elementmedica.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/elementmedica-access.log;
    error_log /var/log/nginx/elementmedica-error.log warn;

    # Root per frontend PUBBLICO (build da localhost:5174)
    root /var/www/elementmedica/dist-public;
    index index.html;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # Frontend SPA Pubblico
    location / {
        try_files $uri $uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Proxy (P64: diretto a api_backend, proxy eliminato)
    location /api/ {
        proxy_pass http://api_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        client_max_body_size 50M;
    }

    # Documents server for PDF generation
    location /docs/ {
        proxy_pass http://127.0.0.1:4002/docs/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 600s;
    }

    # Health check
    location /health {
        proxy_pass http://api_backend/health;
        access_log off;
    }

    # Uploads (condivisi)
    location /uploads/ {
        alias /var/www/elementmedica/uploads/;
        expires 1h;
    }
}
```

### Attivazione Configurazione

```bash
# Come elementmedica con sudo

# Rimuovi configurazioni vecchie
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-enabled/elementmedica

# Crea nuovo symlink
sudo ln -sf /etc/nginx/sites-available/elementmedica-multi /etc/nginx/sites-enabled/

# Test configurazione
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## 🔒 SSL/TLS con Let's Encrypt

### Installazione Certificati per Entrambi i Domini

```bash
# Installa certbot se non già installato
sudo apt install certbot python3-certbot-nginx

# PASSO 1: Certificato per elementsicurezza.com (già con DNS configurato)
sudo certbot --nginx -d elementsicurezza.com -d www.elementsicurezza.com

# PASSO 2: Certificato per elementmedica.com (dopo configurazione DNS)
sudo certbot --nginx -d elementmedica.com -d www.elementmedica.com

# Verifica auto-renewal
sudo certbot renew --dry-run
```

### Verifica Certificati Installati

```bash
# Lista tutti i certificati
sudo certbot certificates

# Output atteso:
# Certificate Name: elementsicurezza.com
#   Domains: elementsicurezza.com www.elementsicurezza.com
#   Expiry Date: 2025-03-XX
#
# Certificate Name: elementmedica.com
#   Domains: elementmedica.com www.elementmedica.com
#   Expiry Date: 2025-03-XX
```

### Cron Auto-Renewal

Il certbot crea automaticamente un cron/timer. Verifica:

```bash
# Verifica timer systemd
sudo systemctl status certbot.timer

# Oppure verifica crontab
sudo crontab -l | grep certbot
```

---

## ⚙️ PM2 e Gestione Processi

### Comandi Permessi (Solo Monitoraggio)

```bash
# Stato processi
pm2 status
pm2 list

# Logs
pm2 logs
pm2 logs api-server --lines 50

# Monitoraggio real-time
pm2 monit

# Informazioni dettagliate
pm2 show api-server
```

### ⚠️ Comandi VIETATI (Richiedono Autorizzazione)

```bash
# VIETATO senza autorizzazione:
pm2 restart [any]
pm2 stop [any]
pm2 delete [any]
pm2 kill
```

### Health Checks

```bash
# Test tutti i servizi (P64: solo API e Documents)
curl -s http://localhost:4001/health && echo "API: OK"
curl -s http://localhost:4002/health && echo "Docs: OK"

# Test login (diretto su API)
curl -X POST http://localhost:4001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}'
```

---

## 💾 Backup e Disaster Recovery

### Backup Automatici

Il sistema include un modulo di backup integrato accessibile da:
- **Frontend**: Impostazioni → Backup & Restore
- **API**: `/api/v1/backup/*`

### Script Backup Database

Crea `/var/www/elementmedica/scripts/backup-database.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/www/elementmedica/backups/database"
LOG_FILE="/var/www/elementmedica/logs/backup.log"

mkdir -p $BACKUP_DIR

echo "[$DATE] Avvio backup database..." >> $LOG_FILE

# Backup via pg_dump (connessione diretta Supabase)
PGPASSWORD='[PASSWORD]' pg_dump \
  -h aws-1-eu-central-1.pooler.supabase.com \
  -p 5432 \
  -U postgres.uywrlfkptcyhzoddsefg \
  -d postgres \
  -F c \
  -b \
  -v \
  -f "$BACKUP_DIR/db_$DATE.dump" 2>> $LOG_FILE

if [ $? -eq 0 ]; then
    # Comprimi
    gzip "$BACKUP_DIR/db_$DATE.dump"
    echo "[$DATE] Backup completato: db_$DATE.dump.gz" >> $LOG_FILE
    
    # Rimuovi backup vecchi (mantieni 30 giorni)
    find $BACKUP_DIR -name "db_*.dump.gz" -mtime +30 -delete
else
    echo "[$DATE] ERRORE backup database!" >> $LOG_FILE
fi
```

### Cron Backup

```bash
# Aggiungi a crontab
crontab -e

# Backup giornaliero alle 2:00
0 2 * * * /var/www/elementmedica/scripts/backup-database.sh

# Backup files settimanale
0 3 * * 0 tar -czf /var/www/elementmedica/backups/files/uploads_$(date +\%Y\%m\%d).tar.gz /var/www/elementmedica/uploads
```

### Restore da Backup

```bash
# Restore database
gunzip -c backup_file.dump.gz | PGPASSWORD='[PASSWORD]' pg_restore \
  -h aws-1-eu-central-1.pooler.supabase.com \
  -p 5432 \
  -U postgres.uywrlfkptcyhzoddsefg \
  -d postgres \
  --clean \
  --if-exists
```

---

## 📊 Monitoring e Health Checks

### Script Health Check Automatico

Crea `/var/www/elementmedica/scripts/health-check.sh`:

```bash
#!/bin/bash
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="/var/www/elementmedica/logs/health-check.log"

echo "[$TIMESTAMP] === Health Check ===" >> $LOG_FILE

# Test API Server
if curl -sf http://localhost:4001/health > /dev/null; then
    echo "[$TIMESTAMP] ✅ API Server: OK" >> $LOG_FILE
else
    echo "[$TIMESTAMP] ❌ API Server: ERRORE" >> $LOG_FILE
fi

# Test Documents Server
if curl -sf http://localhost:4002/health > /dev/null; then
    echo "[$TIMESTAMP] ✅ Documents Server: OK" >> $LOG_FILE
else
    echo "[$TIMESTAMP] ❌ Documents Server: ERRORE" >> $LOG_FILE
fi

# P64: Proxy Server (4003) rimosso - Non più necessario testare

# Test Database (query semplice)
if PGPASSWORD='[PASSWORD]' psql \
  -h aws-1-eu-central-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.uywrlfkptcyhzoddsefg \
  -d postgres \
  -c "SELECT 1;" > /dev/null 2>&1; then
    echo "[$TIMESTAMP] ✅ Database: OK" >> $LOG_FILE
else
    echo "[$TIMESTAMP] ❌ Database: ERRORE" >> $LOG_FILE
fi
```

### Cron Health Checks

```bash
# Health check ogni 5 minuti
*/5 * * * * /var/www/elementmedica/scripts/health-check.sh
```

### Monitoring Risorse

```bash
# Utilizzo CPU/RAM
pm2 monit

# Spazio disco
df -h

# Connessioni attive (P64: solo 4001 e 4002)
netstat -an | grep -E ':4001|:4002' | wc -l
```

---

## 🔧 Troubleshooting

### Server Non Risponde

```bash
# 1. Verifica stato processi
pm2 status

# 2. Controlla logs
pm2 logs --lines 50

# 3. Verifica porte (P64: solo 4001 e 4002)
sudo netstat -tulpn | grep -E ':4001|:4002'

# 4. Test health
curl -v http://localhost:4001/health
```

### Errori Database

```bash
# Test connessione
psql "postgresql://postgres.uywrlfkptcyhzoddsefg:[PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT 1;"

# Verifica variabili
grep DATABASE_URL /var/www/elementmedica/backend/.env
```

### Errori CORS

```bash
# Test CORS
curl -X OPTIONS https://elementmedica.com/api/v1/auth/login \
  -H "Origin: https://elementmedica.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Verifica ALLOWED_ORIGINS in .env
```

### Errori SSL

```bash
# Test certificato
openssl s_client -connect elementmedica.com:443 -servername elementmedica.com

# Rinnovo manuale
sudo certbot renew --force-renewal

# Verifica scadenza
sudo certbot certificates
```

### Errori PM2

```bash
# Reset processi
pm2 delete all
pm2 start ecosystem.config.js

# Flush logs
pm2 flush

# Ricarica configurazione
pm2 reload ecosystem.config.js
```

---

## ✅ Checklist Pre-Deploy

### Prima del Deploy

- [ ] **Server Hetzner** VPS attivo su 128.140.15.15
- [ ] **DNS elementsicurezza.com** → 128.140.15.15 ✅
- [ ] **DNS elementmedica.com** → 128.140.15.15 🔄
- [ ] **SSH** accesso verificato con chiave
- [ ] **Database Supabase** connessione testata
- [ ] **GitHub** accesso al repository verificato
- [ ] **Backup** database esistente eseguito

### Durante il Deploy

- [ ] `npm ci --production` backend completato
- [ ] `npm ci --production` frontend completato
- [ ] Build CRM → `dist/` completato
- [ ] Build Pubblico → `dist-public/` completato
- [ ] `npx prisma migrate deploy` completato
- [ ] `npx prisma generate` completato
- [ ] PM2 processi avviati (2 server: API + Documents)
- [ ] Nginx configurato multi-domain
- [ ] SSL elementsicurezza.com installato
- [ ] SSL elementmedica.com installato

### Dopo il Deploy

- [ ] **Health checks** tutti verdi (4001, 4002) - P64: Proxy 4003 eliminato
- [ ] **elementsicurezza.com** carica correttamente
- [ ] **elementmedica.com** carica correttamente
- [ ] **Login CRM** funzionante (admin@example.com)
- [ ] **API** endpoint rispondono su entrambi i domini
- [ ] **PDF** generation funzionante
- [ ] **Backup** automatici schedulati

### Verifica Finale Multi-Domain

```bash
# ============================================
# Test Backend Services (P64: Proxy eliminato)
# ============================================
curl -sf http://localhost:4001/health && echo "✅ API Server OK"
curl -sf http://localhost:4002/health && echo "✅ Documents Server OK"

# ============================================
# Test elementsicurezza.com (CRM)
# ============================================
curl -sf https://elementsicurezza.com/health && echo "✅ elementsicurezza.com OK"
curl -sf https://elementsicurezza.com/api/v1/auth/login -X OPTIONS && echo "✅ CORS CRM OK"

# Test login CRM
curl -X POST https://elementsicurezza.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}' \
  && echo "✅ Auth CRM OK"

# ============================================
# Test elementmedica.com (Pubblico)
# ============================================
curl -sf https://elementmedica.com/health && echo "✅ elementmedica.com OK"
curl -sf https://elementmedica.com/api/v1/auth/login -X OPTIONS && echo "✅ CORS Pubblico OK"

# Test API pubblica
curl -sf https://elementmedica.com/api/v1/public/courses && echo "✅ API Pubblica OK"
```

---

## 📚 Riferimenti Documentazione

- **Archive**: `docs/deployment/archive/` - Documenti storici consolidati
- **Troubleshooting**: `docs/troubleshooting/` - Guide risoluzione problemi
- **Project Management**: `docs/10_project_management/` - Planning progetti

---

## 📞 Contatti Emergenza

Per problemi critici in produzione:
1. Verificare health checks su entrambi i domini
2. Controllare logs PM2
3. **NON riavviare server senza autorizzazione**
4. Documentare il problema
5. Contattare il responsabile tecnico

---

## 🚀 QUICK DEPLOY COMMANDS

```bash
# SSH al server
ssh elementmedica@128.140.15.15

# Oppure con chiave
ssh -i ~/.ssh/id_ed25519 elementmedica@128.140.15.15

# Check stato servizi
pm2 status

# Check logs
pm2 logs --lines 50

# Health check rapido (P64: solo API e Documents)
curl http://localhost:4001/health && curl http://localhost:4002/health
```

---

**Documento creato**: 4 Dicembre 2024  
**Ultimo aggiornamento**: 4 Dicembre 2024  
**Versione**: 3.1 Multi-Domain  
**Server**: 128.140.15.15 (Hetzner Cloud)  
**Domini**: elementsicurezza.com + elementmedica.com  
**Stato**: ✅ Production Ready
