# 🚀 Guida Completa al Deployment

**Versione**: 2.0 Post-Refactoring  
**Data**: 25 Gennaio 2025  
**Sistema**: Architettura Tre Server GDPR-Compliant

## 🎯 Panoramica

Questa guida fornisce istruzioni complete per il deployment del sistema unificato Person con architettura a tre server e compliance GDPR.

## 📋 Prerequisiti

### Software Richiesto
- **Node.js**: v18.0.0 o superiore
- **npm**: v8.0.0 o superiore
- **PostgreSQL**: v14.0 o superiore
- **PM2**: v5.0.0 o superiore (per gestione processi)
- **Git**: v2.30.0 o superiore

### Hardware Minimo
- **RAM**: 4GB (8GB raccomandati)
- **CPU**: 2 core (4 core raccomandati)
- **Storage**: 20GB liberi
- **Network**: Connessione stabile

## 🔧 Configurazione Ambiente

### 1. Clonazione Repository
```bash
git clone <repository-url>
cd project-2.0
```

### 2. Installazione Dipendenze
```bash
# Installazione dipendenze root
npm install

# Installazione dipendenze per ogni server
cd src/api-server && npm install
cd ../documents-server && npm install
cd ../proxy-server && npm install
```

### 3. Configurazione Database
```bash
# Creazione database PostgreSQL
createdb project_2_0_db

# Esecuzione migrazioni Prisma
npx prisma migrate deploy

# Generazione client Prisma
npx prisma generate
```

### 4. Configurazione Variabili Ambiente

Creare file `.env` nella root del progetto:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/project_2_0_db"

# Server Ports
API_SERVER_PORT=4001
DOCUMENTS_SERVER_PORT=4002
PROXY_SERVER_PORT=4003

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="24h"
REFRESH_TOKEN_EXPIRES_IN="7d"

# OAuth Configuration
OAUTH_CLIENT_ID="your-oauth-client-id"
OAUTH_CLIENT_SECRET="your-oauth-client-secret"
OAUTH_REDIRECT_URI="http://localhost:4003/auth/callback"

# GDPR Configuration
GDPR_DATA_RETENTION_DAYS=2555
GDPR_AUDIT_RETENTION_DAYS=3650

# Environment
NODE_ENV="production"

# Logging
LOG_LEVEL="info"
LOG_FILE_PATH="./logs/application.log"
```

## 🚀 Deployment Processi

### Architettura Tre Server

Il sistema utilizza tre server separati per garantire scalabilità e separazione dei concern:

```
Client → Proxy Server (4003) → API Server (4001) ↔ Database
                            → Documents Server (4002)
```

### 1. API Server (Porta 4001)

**Responsabilità**:
- Gestione autenticazione e autorizzazione
- Business logic e validazione dati
- Interfaccia con database PostgreSQL
- Audit trail GDPR
- Gestione sessioni utente

**Avvio**:
```bash
# Sviluppo
npm run dev:api

# Produzione con PM2
pm2 start ecosystem.config.js --only api-server
```

**Endpoint Principali**:
- `/api/auth/*` - Autenticazione OAuth
- `/api/persons/*` - Gestione persone (sistema unificato)
- `/api/companies/*` - Gestione aziende
- `/api/courses/*` - Gestione corsi
- `/api/admin/*` - Funzioni amministrative

### 2. Documents Server (Porta 4002)

**Responsabilità**:
- Generazione documenti PDF
- Gestione template documenti
- Conversione formati
- Storage temporaneo file

**Avvio**:
```bash
# Sviluppo
npm run dev:documents

# Produzione con PM2
pm2 start ecosystem.config.js --only documents-server
```

**Endpoint Principali**:
- `/generate/pdf` - Generazione PDF
- `/templates/*` - Gestione template
- `/download/*` - Download sicuro documenti

### 3. Proxy Server (Porta 4003) - Sistema Routing Avanzato

**Responsabilità**:
- Entry point per tutte le richieste
- **Sistema routing centralizzato** con versioning API (`/api/v1`, `/api/v2`)
- **Routing dinamico** con parametri e path rewrite intelligente
- **Legacy redirects** automatici (`/login` → `/api/v1/auth/login`)
- Gestione CORS e headers sicurezza dinamici
- Rate limiting differenziato per tipo endpoint
- **Diagnostica avanzata** con endpoint `/routes`
- **Logging unificato** con Request ID tracking

**Avvio**:
```bash
# Sviluppo
npm run dev:proxy

# Produzione con PM2
pm2 start ecosystem.config.js --only proxy-server
```

**Architettura Routing**:
```
Frontend (5173) → Proxy Server (4003) → API Server (4001)
                                     → Documents Server (4002)
```

**Middleware Stack**:
1. Raw Body Preservation
2. Request Logger (con Request ID)
3. Route Validation
4. Dynamic CORS
5. Body Parsing
6. Dynamic Rate Limiting
7. Version Resolution
8. Legacy Redirects
9. Diagnostic Routes
10. Static Routes
11. Dynamic Proxy

**Endpoint Diagnostici**:
- `/routes` - Informazioni complete sistema routing
- `/routes/health` - Health check servizi
- `/routes/stats` - Statistiche real-time
- `/routes/config` - Configurazione attiva

## 📁 Configurazione PM2

File `ecosystem.config.js` per gestione processi:

```javascript
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: './src/api-server/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4001
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true
    },
    {
      name: 'documents-server',
      script: './src/documents-server/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4002
      },
      error_file: './logs/documents-error.log',
      out_file: './logs/documents-out.log',
      log_file: './logs/documents-combined.log',
      time: true
    },
    {
      name: 'proxy-server',
      script: './src/proxy-server/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4003
      },
      error_file: './logs/proxy-error.log',
      out_file: './logs/proxy-out.log',
      log_file: './logs/proxy-combined.log',
      time: true
    }
  ]
};
```

## 🚀 Procedura Deployment Completo

### 1. Preparazione
```bash
# Backup database (se esistente)
pg_dump project_2_0_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Creazione cartelle logs
mkdir -p logs

# Verifica configurazione
npm run config:check
```

### 2. Build e Preparazione
```bash
# Build del progetto
npm run build

# Verifica build
npm run build:check

# Test di connessione database
npm run db:test
```

### 3. Avvio Servizi
```bash
# Avvio tutti i server con PM2
pm2 start ecosystem.config.js

# Verifica stato
pm2 status

# Monitoraggio logs
pm2 logs
```

### 4. Verifica Deployment
```bash
# Health check API Server
curl http://localhost:4001/api/health

# Health check Documents Server
curl http://localhost:4002/health

# Health check Proxy Server
curl http://localhost:4003/health

# Test completo sistema
npm run test:deployment
```

## 🔍 Monitoraggio Post-Deployment

### Comandi PM2 Utili
```bash
# Stato processi
pm2 status

# Logs in tempo reale
pm2 logs

# Logs specifico server
pm2 logs api-server

# Monitoraggio risorse
pm2 monit

# Restart singolo server (SOLO CON AUTORIZZAZIONE)
pm2 restart api-server
```

### Health Checks
```bash
# Script automatico health check
#!/bin/bash
echo "Checking API Server..."
curl -f http://localhost:4001/api/health || echo "API Server DOWN"

echo "Checking Documents Server..."
curl -f http://localhost:4002/health || echo "Documents Server DOWN"

echo "Checking Proxy Server..."
curl -f http://localhost:4003/health || echo "Proxy Server DOWN"
```

## 🚫 Regole Critiche Deployment

### ⚠️ DIVIETO ASSOLUTO GESTIONE SERVER

**🚫 SEVERAMENTE VIETATO**:
- Riavviare server senza autorizzazione esplicita
- Killare processi server (`pm2 stop`, `pm2 restart`, `pm2 delete`)
- Utilizzare comandi `kill`, `pkill`, `systemctl restart`
- Modificare configurazioni PM2 senza autorizzazione
- Fermare servizi in produzione (PostgreSQL, Nginx, Redis)
- Riavviare sistema operativo (`sudo reboot`)

**✅ OBBLIGATORIO**:
- Richiedere autorizzazione esplicita al proprietario per qualsiasi intervento sui server
- Utilizzare SOLO credenziali test standard: `admin@example.com` / `Admin123!`
- Prestare MASSIMA attenzione a modifiche sistema login
- Effettuare backup completo prima di modifiche critiche
- Testare sempre le modifiche al sistema di autenticazione
- Utilizzare solo comandi di monitoring permessi (`pm2 status`, `pm2 logs`, `pm2 monit`)

### 🔑 Credenziali Test Standard (OBBLIGATORIE)
- **Email**: `admin@example.com`
- **Password**: `Admin123!`
- **Utilizzo**: ESCLUSIVAMENTE per testing e sviluppo
- **Permessi**: Accesso amministrativo completo
- **⚠️ DIVIETO ASSOLUTO**: NON modificare queste credenziali senza autorizzazione esplicita
- **⚠️ ATTENZIONE MASSIMA**: Ogni modifica al sistema di autenticazione deve essere testata con queste credenziali

## 🆘 Troubleshooting Deployment

### Problemi Comuni

#### Server non si avvia
```bash
# Verifica porte occupate
netstat -tulpn | grep :4001
netstat -tulpn | grep :4002
netstat -tulpn | grep :4003

# Verifica logs errori
pm2 logs --err

# Verifica configurazione
npm run config:validate
```

#### Database non raggiungibile
```bash
# Test connessione database
psql -h localhost -U username -d project_2_0_db -c "SELECT 1;"

# Verifica variabili ambiente
echo $DATABASE_URL

# Test Prisma
npx prisma db pull
```

#### Errori CORS
```bash
# Verifica configurazione proxy
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:4003/api/health
```

## 📊 Metriche e Performance

### Monitoraggio Risorse
```bash
# Utilizzo CPU e memoria
pm2 monit

# Statistiche dettagliate
pm2 show api-server

# Reset statistiche
pm2 reset api-server
```

### Logs e Audit
```bash
# Rotazione logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# Backup logs
tar -czf logs_backup_$(date +%Y%m%d).tar.gz logs/
```

## 🔄 Aggiornamenti e Manutenzione

### Procedura Aggiornamento
```bash
# 1. Backup completo
./scripts/backup-system.sh

# 2. Pull nuove modifiche
git pull origin main

# 3. Installazione dipendenze
npm install

# 4. Migrazioni database
npx prisma migrate deploy

# 5. Build progetto
npm run build

# 6. Restart servizi (SOLO CON AUTORIZZAZIONE)
# pm2 restart ecosystem.config.js
```

### Backup Automatico
```bash
# Script backup giornaliero
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump project_2_0_db > backups/db_backup_$DATE.sql
tar -czf backups/files_backup_$DATE.tar.gz src/ docs/ package.json

# Ritenzione backup (30 giorni)
find backups/ -name "*.sql" -mtime +30 -delete
find backups/ -name "*.tar.gz" -mtime +30 -delete
```

---

**⚠️ Importante**: Questa guida deve essere seguita rigorosamente. Ogni deviazione dalle procedure può compromettere la stabilità del sistema. Per interventi sui server, richiedere sempre autorizzazione al proprietario del progetto.