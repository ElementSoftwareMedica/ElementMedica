# 🔧 Configurazione Ambiente

**Versione**: 2.0 Post-Refactoring  
**Data**: 25 Gennaio 2025  
**Sistema**: Architettura Tre Server GDPR-Compliant

## 🎯 Panoramica

Questa guida fornisce istruzioni dettagliate per la configurazione dell'ambiente di sviluppo e produzione del sistema unificato Person.

## 📋 Prerequisiti Sistema

### Software Obbligatorio

#### Node.js e npm
```bash
# Installazione Node.js v18+ (raccomandato v18.19.0)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verifica installazione
node --version  # deve essere >= 18.0.0
npm --version   # deve essere >= 8.0.0
```

#### PostgreSQL
```bash
# Installazione PostgreSQL 14+
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Avvio servizio
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verifica installazione
psql --version  # deve essere >= 14.0
```

#### PM2 (Process Manager)
```bash
# Installazione globale PM2
npm install -g pm2

# Verifica installazione
pm2 --version  # deve essere >= 5.0.0

# Configurazione startup automatico
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

#### Git
```bash
# Installazione Git
sudo apt-get install git

# Configurazione base
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verifica
git --version  # deve essere >= 2.30.0
```

## 🗄️ Configurazione Database

### 1. Creazione Database e Utente
```bash
# Accesso come utente postgres
sudo -u postgres psql

# Creazione database
CREATE DATABASE project_2_0_db;

# Creazione utente dedicato
CREATE USER project_user WITH ENCRYPTED PASSWORD 'secure_password_here';

# Assegnazione privilegi
GRANT ALL PRIVILEGES ON DATABASE project_2_0_db TO project_user;
GRANT ALL ON SCHEMA public TO project_user;

# Uscita da psql
\q
```

### 2. Configurazione PostgreSQL

Modificare `/etc/postgresql/14/main/postgresql.conf`:
```conf
# Connessioni
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB

# Logging per audit GDPR
log_statement = 'mod'  # Log INSERT, UPDATE, DELETE
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
```

Modificare `/etc/postgresql/14/main/pg_hba.conf`:
```conf
# Connessioni locali
local   all             postgres                                peer
local   all             project_user                            md5
host    all             project_user    127.0.0.1/32            md5
host    all             project_user    ::1/128                 md5
```

Riavvio PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 3. Test Connessione Database
```bash
# Test connessione
psql -h localhost -U project_user -d project_2_0_db -c "SELECT version();"

# Test con URL completo
psql "postgresql://project_user:secure_password_here@localhost:5432/project_2_0_db" -c "SELECT 1;"
```

## 📁 Configurazione Progetto

### 1. Clonazione e Setup Iniziale
```bash
# Clonazione repository
git clone <repository-url> project-2.0
cd project-2.0

# Creazione cartelle necessarie
mkdir -p logs
mkdir -p backups
mkdir -p uploads/temp
mkdir -p storage/documents

# Impostazione permessi
chmod 755 logs backups uploads storage
```

### 2. Installazione Dipendenze
```bash
# Dipendenze root
npm install

# Dipendenze server specifici
cd src/api-server && npm install && cd ../..
cd src/documents-server && npm install && cd ../..
cd src/proxy-server && npm install && cd ../..

# Verifica installazioni
npm run deps:check
```

## 🔐 Configurazione Variabili Ambiente

### File .env Principale

Creare `.env` nella root del progetto:

```env
# ===========================================
# CONFIGURAZIONE DATABASE
# ===========================================
DATABASE_URL="postgresql://project_user:secure_password_here@localhost:5432/project_2_0_db"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="project_2_0_db"
DB_USER="project_user"
DB_PASSWORD="secure_password_here"

# ===========================================
# CONFIGURAZIONE SERVER
# ===========================================
API_SERVER_PORT=4001
DOCUMENTS_SERVER_PORT=4002
PROXY_SERVER_PORT=4003

# URL base per comunicazione inter-server
API_BASE_URL="http://localhost:4001"
DOCUMENTS_BASE_URL="http://localhost:4002"
PROXY_BASE_URL="http://localhost:4003"

# ===========================================
# CONFIGURAZIONE JWT E AUTENTICAZIONE
# ===========================================
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"
JWT_EXPIRES_IN="24h"
REFRESH_TOKEN_SECRET="your-refresh-token-secret-different-from-jwt"
REFRESH_TOKEN_EXPIRES_IN="7d"
SESSION_TIMEOUT="30m"

# ===========================================
# CONFIGURAZIONE OAUTH
# ===========================================
OAUTH_CLIENT_ID="your-oauth-client-id"
OAUTH_CLIENT_SECRET="your-oauth-client-secret"
OAUTH_REDIRECT_URI="http://localhost:4003/auth/callback"
OAUTH_SCOPE="openid profile email"

# ===========================================
# CONFIGURAZIONE GDPR
# ===========================================
GDPR_DATA_RETENTION_DAYS=2555
GDPR_AUDIT_RETENTION_DAYS=3650
GDPR_CONSENT_EXPIRY_DAYS=365
GDPR_BREACH_NOTIFICATION_EMAIL="gdpr@company.com"
GDPR_DPO_EMAIL="dpo@company.com"

# ===========================================
# CONFIGURAZIONE AMBIENTE
# ===========================================
NODE_ENV="production"
APP_NAME="Project 2.0 GDPR System"
APP_VERSION="2.0.0"

# ===========================================
# CONFIGURAZIONE LOGGING
# ===========================================
LOG_LEVEL="info"
LOG_FILE_PATH="./logs/application.log"
LOG_MAX_SIZE="10m"
LOG_MAX_FILES="30"
LOG_DATE_PATTERN="YYYY-MM-DD"

# ===========================================
# CONFIGURAZIONE SICUREZZA
# ===========================================
CORS_ORIGIN="http://localhost:3000,http://localhost:4003"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CSRF_SECRET="your-csrf-secret-key"

# ===========================================
# CONFIGURAZIONE FILE E UPLOAD
# ===========================================
UPLOAD_MAX_SIZE="10mb"
UPLOAD_ALLOWED_TYPES="image/jpeg,image/png,application/pdf,text/csv"
UPLOAD_TEMP_DIR="./uploads/temp"
STORAGE_DIR="./storage"

# ===========================================
# CONFIGURAZIONE EMAIL (se necessario)
# ===========================================
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="noreply@company.com"
SMTP_PASS="smtp-password"

# ===========================================
# CONFIGURAZIONE MONITORING
# ===========================================
HEALTH_CHECK_INTERVAL="30000"
METRICS_ENABLED="true"
METRICS_PORT="9090"

# ===========================================
# CREDENZIALI TEST (SOLO SVILUPPO)
# ===========================================
TEST_USER_EMAIL="admin@example.com"
TEST_USER_PASSWORD="Admin123!"
```

### File .env per Sviluppo

Creare `.env.development`:

```env
# Eredita da .env principale e sovrascrive specifiche per sviluppo
NODE_ENV="development"
LOG_LEVEL="debug"
JWT_EXPIRES_IN="1h"
CORS_ORIGIN="*"
RATE_LIMIT_MAX_REQUESTS=1000

# Database di sviluppo (opzionale)
DATABASE_URL="postgresql://project_user:secure_password_here@localhost:5432/project_2_0_dev_db"
```

### File .env per Test

Creare `.env.test`:

```env
# Configurazione per testing
NODE_ENV="test"
DATABASE_URL="postgresql://project_user:secure_password_here@localhost:5432/project_2_0_test_db"
LOG_LEVEL="error"
JWT_SECRET="test-jwt-secret-for-testing-only"
JWT_EXPIRES_IN="1h"
```

## 🔧 Configurazione Prisma

### 1. Inizializzazione Prisma
```bash
# Generazione client Prisma
npx prisma generate

# Verifica schema
npx prisma validate

# Visualizzazione database
npx prisma studio
```

### 2. Migrazioni Database
```bash
# Applicazione migrazioni
npx prisma migrate deploy

# Reset database (SOLO sviluppo)
npx prisma migrate reset

# Creazione nuova migrazione
npx prisma migrate dev --name "migration_name"
```

### 3. Seeding Database
```bash
# Esecuzione seed
npx prisma db seed

# Verifica dati seed
npx prisma studio
```

## 📊 Configurazione Logging

### 1. Struttura Logs
```bash
# Creazione struttura cartelle logs
mkdir -p logs/{api,documents,proxy,audit,security}

# Impostazione permessi
chmod 755 logs
chmod 644 logs/*
```

### 2. Configurazione Logrotate

Creare `/etc/logrotate.d/project-2.0`:
```conf
/path/to/project-2.0/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 user group
    postrotate
        pm2 reloadLogs
    endscript
}
```

## 🔒 Configurazione Sicurezza

### 1. Firewall
```bash
# Configurazione UFW
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 4001/tcp  # API Server
sudo ufw allow 4002/tcp  # Documents Server
sudo ufw allow 4003/tcp  # Proxy Server
sudo ufw allow 5432/tcp  # PostgreSQL (solo se necessario)
```

### 2. SSL/TLS (Produzione)
```bash
# Installazione Certbot
sudo apt-get install certbot

# Generazione certificati
sudo certbot certonly --standalone -d your-domain.com

# Configurazione auto-renewal
sudo crontab -e
# Aggiungere: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Backup Chiavi
```bash
# Backup chiavi e certificati
mkdir -p backups/security
cp .env backups/security/env_backup_$(date +%Y%m%d).txt
# Rimuovere password dal backup manualmente
```

## 🧪 Verifica Configurazione

### Script di Verifica

Creare `scripts/verify-setup.sh`:
```bash
#!/bin/bash

echo "🔍 Verifica Configurazione Sistema..."

# Verifica Node.js
echo "📦 Node.js version:"
node --version

# Verifica npm
echo "📦 npm version:"
npm --version

# Verifica PostgreSQL
echo "🗄️ PostgreSQL version:"
psql --version

# Verifica PM2
echo "⚙️ PM2 version:"
pm2 --version

# Test connessione database
echo "🔗 Test connessione database:"
psql "$DATABASE_URL" -c "SELECT 1;" && echo "✅ Database OK" || echo "❌ Database ERRORE"

# Verifica file .env
echo "📄 Verifica file .env:"
[ -f .env ] && echo "✅ .env presente" || echo "❌ .env mancante"

# Verifica cartelle
echo "📁 Verifica cartelle:"
[ -d logs ] && echo "✅ logs/" || echo "❌ logs/ mancante"
[ -d backups ] && echo "✅ backups/" || echo "❌ backups/ mancante"
[ -d uploads ] && echo "✅ uploads/" || echo "❌ uploads/ mancante"

# Verifica dipendenze
echo "📚 Verifica dipendenze:"
npm list --depth=0 > /dev/null 2>&1 && echo "✅ Dipendenze OK" || echo "❌ Dipendenze mancanti"

# Test Prisma
echo "🔧 Test Prisma:"
npx prisma validate && echo "✅ Schema Prisma OK" || echo "❌ Schema Prisma ERRORE"

echo "✅ Verifica completata!"
```

### Esecuzione Verifica
```bash
# Rendere eseguibile
chmod +x scripts/verify-setup.sh

# Eseguire verifica
./scripts/verify-setup.sh
```

## 🚀 Test Configurazione

### 1. Test Database
```bash
# Test connessione
npm run db:test

# Test migrazioni
npm run db:migrate:test

# Test seed
npm run db:seed:test
```

### 2. Test Server
```bash
# Test avvio singoli server
npm run test:api-server
npm run test:documents-server
npm run test:proxy-server

# Test integrazione
npm run test:integration
```

### 3. Test GDPR
```bash
# Test audit trail
npm run test:audit

# Test data retention
npm run test:retention

# Test consent management
npm run test:consent
```

## 🔄 Manutenzione Ambiente

### Aggiornamenti Regolari
```bash
# Aggiornamento dipendenze
npm update
npm audit fix

# Aggiornamento Prisma
npm install prisma@latest @prisma/client@latest
npx prisma generate

# Aggiornamento PM2
npm install -g pm2@latest
```

### Pulizia Periodica
```bash
# Pulizia logs vecchi
find logs/ -name "*.log" -mtime +30 -delete

# Pulizia backup vecchi
find backups/ -name "*.sql" -mtime +90 -delete

# Pulizia file temporanei
find uploads/temp/ -mtime +1 -delete
```

## 🚫 Regole Critiche Ambiente

### ⚠️ DIVIETI ASSOLUTI
- **🚫 NON modificare** configurazioni server senza autorizzazione
- **🚫 NON riavviare** servizi PostgreSQL senza autorizzazione
- **🚫 NON modificare** credenziali test standard
- **🚫 NON esporre** variabili ambiente sensibili

### ✅ OBBLIGHI
- **✅ UTILIZZARE** sempre credenziali test: `admin@example.com` / `Admin123!`
- **✅ RICHIEDERE** autorizzazione per modifiche critiche
- **✅ EFFETTUARE** backup prima di modifiche importanti
- **✅ VERIFICARE** sempre la configurazione dopo modifiche

---

**⚠️ Importante**: Questa configurazione è critica per il funzionamento del sistema. Ogni modifica deve essere testata accuratamente e documentata. Per interventi su configurazioni di produzione, richiedere sempre autorizzazione al proprietario del progetto.