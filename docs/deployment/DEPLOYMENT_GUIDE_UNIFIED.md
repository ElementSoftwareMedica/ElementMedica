# 🚀 ElementMedica - Guida Deployment Unificata

**Versione**: 3.1 Multi-Domain  
**Data**: 4 Dicembre 2025  
**Server**: 128.140.15.15 (Hetzner Cloud)  
**Repository**: git@github.com:ElementSoftwareMedica/ElementMedica.git

---

## 🌐 CONFIGURAZIONE DOMINI

| Dominio | Applicazione | Porta Dev | Stato |
|---------|--------------|-----------|-------|
| **elementformazione.com** | CRM/Backoffice (localhost:5173) | 5173 | ✅ DNS configurato |
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

### Architettura Multi-Domain con 3 Server Backend

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    INTERNET                                          │
│         elementformazione.com              elementmedica.com                        │
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
│ elementformazione│  │  elementmedica   │  │   Proxy Server  │
│ Frontend CRM    │   │  Frontend Pub    │  │    (Node.js)    │
│ :5173 → /dist   │   │  :5174 → /dist2  │  │     :4003       │
└─────────────────┘   └─────────────────┘   └────────┬────────┘
                                                      │
                          ┌───────────────────────────┼───────────────────────────┐
                          │                           │                           │
                    ┌─────▼─────┐              ┌──────▼──────┐              ┌──────▼──────┐
                    │API Server │              │ Documents   │              │   Redis     │
                    │ (Express) │              │   Server    │              │   (Cache)   │
                    │   :4001   │              │   :4002     │              │   :6379     │
                    └─────┬─────┘              └─────────────┘              └─────────────┘
                          │
                    ┌─────▼─────┐
                    │ Supabase  │
                    │PostgreSQL │
                    │:5432/6543 │
                    └───────────┘
```

### Mapping Domini → Frontend

| Dominio | Directory Build | Vite Port | Nginx Location |
|---------|-----------------|-----------|----------------|
| **elementformazione.com** | `/var/www/elementmedica/dist` | 5173 | root |
| **elementmedica.com** | `/var/www/elementmedica/dist-public` | 5174 | root |

### Server e Porte (IMMUTABILI)

| Servizio | Porta | Descrizione |
|----------|-------|-------------|
| **API Server** | 4001 | Express, Prisma, RBAC, GDPR |
| **Documents Server** | 4002 | PDF Puppeteer, browser pool |
| **Proxy Server** | 4003 | CORS, rate limiting, routing |
| **Frontend CRM (dev)** | 5173 | Vite dev - elementformazione.com |
| **Frontend Public (dev)** | 5174 | Vite dev - elementmedica.com |
| **Frontend (prod)** | - | Static files via Nginx |
| **PostgreSQL** | 5432/6543 | Supabase (direct/pooled) |
| **Redis** | 6379 | Cache e sessioni |

---

## 🌐 Configurazione Domini (Dettaglio)

### elementformazione.com (CRM/Backoffice)
```
Scopo:          Applicazione gestionale interna (CRM)
DNS:            A record → 128.140.15.15 ✅ GIÀ CONFIGURATO
Localhost:      http://localhost:5173
Produzione:     https://elementformazione.com
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

### Software Richiesto su Hetzner

```bash
# Sistema
- Ubuntu 22.04 LTS o superiore
- RAM: minimo 4GB, raccomandato 8GB
- CPU: 2+ cores
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
# Password: ElementMedica2024!

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

### ⚠️ CREDENZIALI COMPLETE (Gestire con massima sicurezza)

---

### 🖥️ Hetzner Cloud Server

```bash
# Server VPS
IP:         128.140.15.15
Tipo:       Hetzner Cloud VPS
OS:         Ubuntu 22.04 LTS

# Utente Root
User:       root
Password:   Fulmicotone50!

# Utente Applicativo (usare questo per operazioni normali)
User:       elementmedica
Password:   ElementMedica2024!

# API Token Hetzner (per automazioni/CLI)
API_TOKEN:  BFpwGfbfmUbcyOnMqdX5JzfsPOtxWReN3INQveUP9o14Bp38wucgFkhR2vfe3ql0
```

---

### 🔑 SSH Keys

```bash
# Chiave GitHub Deploy (già su server)
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOcpct7JReupVKOQZhXAjbbdBRLOKhyVS1LvekjEE60p
Email: elementmedica-github@elementsoftwaremedica.com

# Chiave locale Matteo (per accesso SSH)
Fingerprint: SHA256:upbHAlzPy1iHbeVU6m6x4fYaZETie1F4McEzZwxwrQQ
Associata a: formazioneperimpresa.com
Passphrase:  Fulmicotone50!

# Path chiave locale
Pubblica:   /Users/matteo.michielon/.ssh/id_ed25519.pub
Privata:    /Users/matteo.michielon/.ssh/id_ed25519
```

---

### 📦 GitHub Repository

```bash
# Repository
URL SSH:    git@github.com:ElementSoftwareMedica/ElementMedica.git
URL HTTPS:  https://github.com/ElementSoftwareMedica/ElementMedica.git
Branch:     main (production), feature/* (development)

# Deploy Key (già configurata)
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOcpct7JReupVKOQZhXAjbbdBRLOKhyVS1LvekjEE60p
```

---

### 🗄️ Supabase PostgreSQL

```bash
# Connection Pooling (per applicazione - PgBouncer)
DATABASE_URL="postgresql://postgres.uywrlfkptcyhzoddsefg:Fulmicotone50!@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct Connection (per migrazioni Prisma)
DIRECT_URL="postgresql://postgres.uywrlfkptcyhzoddsefg:Fulmicotone50!@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"

# Legacy URL (alternativa)
LEGACY_URL="postgresql://postgres:Fulmicotone50!@db.uywrlfkptcyhzoddsefg.supabase.co:5432/postgres"

# Dettagli
Host Pooler: aws-1-eu-central-1.pooler.supabase.com
Port Pooler: 6543 (PgBouncer)
Port Direct: 5432 (per migrazioni)
Username:    postgres.uywrlfkptcyhzoddsefg
Password:    Fulmicotone50!
Database:    postgres
```

---

### 🪣 Hetzner S3 Object Storage

```bash
# Credenziali S3 (compatibile AWS S3)
AWS_ACCESS_KEY_ID="DKLDOG0PF3DSAEKPQUIC"
AWS_SECRET_ACCESS_KEY="wOaXikG57wymcFYK2EFZZedl9jETCyGTabrqQMPB"
AWS_REGION="eu-central-1"
AWS_S3_ENDPOINT="https://s3.eu-central-1.hetzner.com"

# Bucket (da creare)
BUCKET_DOCUMENTS="elementmedica-documents"
BUCKET_UPLOADS="elementmedica-uploads"
BUCKET_BACKUPS="elementmedica-backups"
```

---

### 🔒 JWT Secrets (GitHub Secrets)

```bash
# JWT Access Token Secret
JWT_SECRET="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MjQyNDkzMDAsImV4cCI6MTcyNDI1MDIwMH0.nw0KeMgdZ0tBo2E8Tmy6WfBzUTGtrvlZ8X7G0w9o_gw"

# JWT Refresh Token Secret
JWT_REFRESH_SECRET="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJpYXQiOjE3MjQyNDkzMDAsImV4cCI6MTcyNDg1NDEwMH0.GgXxI4epL7lE3sEXmQb7h3PHXJqydNzzOVYcTkg9jQw"
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
# Password: ElementMedica2024!

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

# Solo localhost per servizi interni
sudo ufw allow from 127.0.0.1 to any port 4001  # API
sudo ufw allow from 127.0.0.1 to any port 4002  # Documents
sudo ufw allow from 127.0.0.1 to any port 4003  # Proxy
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
DATABASE_URL="postgresql://postgres.uywrlfkptcyhzoddsefg:Fulmicotone50!@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.uywrlfkptcyhzoddsefg:Fulmicotone50!@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"

# ===========================================
# SERVER PORTS (NON MODIFICARE!)
# ===========================================
API_SERVER_PORT=4001
DOCUMENTS_SERVER_PORT=4002
PROXY_SERVER_PORT=4003

# URL Base
API_BASE_URL="http://localhost:4001"
DOCUMENTS_BASE_URL="http://localhost:4002"
PROXY_BASE_URL="http://localhost:4003"

# ===========================================
# JWT (OBBLIGATORI - NO FALLBACK)
# ===========================================
JWT_SECRET="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MjQyNDkzMDAsImV4cCI6MTcyNDI1MDIwMH0.nw0KeMgdZ0tBo2E8Tmy6WfBzUTGtrvlZ8X7G0w9o_gw"
JWT_REFRESH_SECRET="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJpYXQiOjE3MjQyNDkzMDAsImV4cCI6MTcyNDg1NDEwMH0.GgXxI4epL7lE3sEXmQb7h3PHXJqydNzzOVYcTkg9jQw"
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
FRONTEND_URL="https://elementformazione.com"
PUBLIC_FRONTEND_URL="https://elementmedica.com"
ALLOWED_ORIGINS="https://elementformazione.com,https://www.elementformazione.com,https://elementmedica.com,https://www.elementmedica.com"

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
AWS_ACCESS_KEY_ID="DKLDOG0PF3DSAEKPQUIC"
AWS_SECRET_ACCESS_KEY="wOaXikG57wymcFYK2EFZZedl9jETCyGTabrqQMPB"
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
VITE_API_URL=https://elementformazione.com/api
VITE_APP_NAME="ElementFormazione"
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
# BUILD 1: Frontend CRM (elementformazione.com)
# ============================================
# Usa .env.production
cp .env.production .env

npm run build

# Output in: dist/ (per elementformazione.com)
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

echo "🔧 Building ElementFormazione (CRM)..."
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
echo "  - elementformazione.com → dist/"
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
    },
    {
      name: 'proxy-server',
      script: './backend/servers/proxy-server.js',
      instances: 1,
      exec_mode: 'fork',
      cwd: '/var/www/elementmedica',
      env: {
        NODE_ENV: 'production',
        PORT: 4003
      },
      error_file: './logs/proxy-error.log',
      out_file: './logs/proxy-out.log',
      log_file: './logs/proxy-combined.log',
      time: true,
      max_memory_restart: '256M',
      restart_delay: 4000,
      max_restarts: 10
    }
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

#### elementformazione.com (CRM) ✅ GIÀ CONFIGURATO
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
# Domini: elementformazione.com (CRM) + elementmedica.com (Pubblico)
# =============================================================================

# Upstream backend servers (condivisi tra i domini)
upstream proxy_backend {
    server 127.0.0.1:4003;
    keepalive 64;
}

# =============================================================================
# DOMINIO 1: elementformazione.com (CRM/Backoffice)
# =============================================================================

# Redirect HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name elementformazione.com www.elementformazione.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server - elementformazione.com
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name elementformazione.com www.elementformazione.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/elementformazione.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/elementformazione.com/privkey.pem;
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
    access_log /var/log/nginx/elementformazione-access.log;
    error_log /var/log/nginx/elementformazione-error.log warn;

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

    # API Proxy
    location /api/ {
        proxy_pass http://proxy_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        client_max_body_size 50M;
    }

    # Health check
    location /health {
        proxy_pass http://proxy_backend/health;
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

    # API Proxy (stessi backend del CRM)
    location /api/ {
        proxy_pass http://proxy_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        client_max_body_size 50M;
    }

    # Health check
    location /health {
        proxy_pass http://proxy_backend/health;
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

# PASSO 1: Certificato per elementformazione.com (già con DNS configurato)
sudo certbot --nginx -d elementformazione.com -d www.elementformazione.com

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
# Certificate Name: elementformazione.com
#   Domains: elementformazione.com www.elementformazione.com
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
# Test tutti i servizi
curl -s http://localhost:4001/health && echo "API: OK"
curl -s http://localhost:4002/health && echo "Docs: OK"
curl -s http://localhost:4003/health && echo "Proxy: OK"

# Test login
curl -X POST http://localhost:4003/api/v1/auth/login \
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

# Test Proxy Server
if curl -sf http://localhost:4003/health > /dev/null; then
    echo "[$TIMESTAMP] ✅ Proxy Server: OK" >> $LOG_FILE
else
    echo "[$TIMESTAMP] ❌ Proxy Server: ERRORE" >> $LOG_FILE
fi

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

# Connessioni attive
netstat -an | grep -E ':4001|:4002|:4003' | wc -l
```

---

## 🔧 Troubleshooting

### Server Non Risponde

```bash
# 1. Verifica stato processi
pm2 status

# 2. Controlla logs
pm2 logs --lines 50

# 3. Verifica porte
sudo netstat -tulpn | grep -E ':4001|:4002|:4003'

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
- [ ] **DNS elementformazione.com** → 128.140.15.15 ✅
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
- [ ] PM2 processi avviati (3 server)
- [ ] Nginx configurato multi-domain
- [ ] SSL elementformazione.com installato
- [ ] SSL elementmedica.com installato

### Dopo il Deploy

- [ ] **Health checks** tutti verdi (4001, 4002, 4003)
- [ ] **elementformazione.com** carica correttamente
- [ ] **elementmedica.com** carica correttamente
- [ ] **Login CRM** funzionante (admin@example.com)
- [ ] **API** endpoint rispondono su entrambi i domini
- [ ] **PDF** generation funzionante
- [ ] **Backup** automatici schedulati

### Verifica Finale Multi-Domain

```bash
# ============================================
# Test Backend Services
# ============================================
curl -sf http://localhost:4001/health && echo "✅ API Server OK"
curl -sf http://localhost:4002/health && echo "✅ Documents Server OK"
curl -sf http://localhost:4003/health && echo "✅ Proxy Server OK"

# ============================================
# Test elementformazione.com (CRM)
# ============================================
curl -sf https://elementformazione.com/health && echo "✅ elementformazione.com OK"
curl -sf https://elementformazione.com/api/v1/auth/login -X OPTIONS && echo "✅ CORS CRM OK"

# Test login CRM
curl -X POST https://elementformazione.com/api/v1/auth/login \
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
# Password: ElementMedica2024!

# Oppure con chiave
ssh -i ~/.ssh/id_ed25519 elementmedica@128.140.15.15

# Check stato servizi
pm2 status

# Check logs
pm2 logs --lines 50

# Health check rapido
curl http://localhost:4001/health && curl http://localhost:4002/health && curl http://localhost:4003/health
```

---

**Documento creato**: 4 Dicembre 2024  
**Ultimo aggiornamento**: 4 Dicembre 2024  
**Versione**: 3.1 Multi-Domain  
**Server**: 128.140.15.15 (Hetzner Cloud)  
**Domini**: elementformazione.com + elementmedica.com  
**Stato**: ✅ Production Ready
