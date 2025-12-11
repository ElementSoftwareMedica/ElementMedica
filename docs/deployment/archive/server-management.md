# 🖥️ Gestione Server e Processi

**Versione**: 3.0 Post-Ottimizzazione Server  
**Data**: 27 Gennaio 2025  
**Sistema**: Architettura Ottimizzata GDPR-Compliant (Progetti 16-17)

## 🚨 REGOLE CRITICHE - LEGGERE PRIMA DI PROCEDERE

### ⚠️ DIVIETO ASSOLUTO GESTIONE SERVER

**🚫 SEVERAMENTE VIETATO**:
- ❌ Riavviare server senza autorizzazione esplicita
- ❌ Killare processi server (`kill`, `pkill`, `killall`)
- ❌ Fermare servizi PM2 (`pm2 stop`, `pm2 delete`)
- ❌ Modificare configurazioni PM2 senza autorizzazione
- ❌ **NUOVO**: Modificare porte server (4001/4003 FISSE)
- ❌ **NUOVO**: Modificare configurazioni proxy senza test
- ❌ Riavviare servizi di sistema (PostgreSQL, nginx, etc.)
- ❌ Modificare configurazioni di rete o firewall

**✅ OBBLIGATORIO**:
- ✅ **RICHIEDERE AUTORIZZAZIONE** al proprietario per qualsiasi intervento sui server
- ✅ **UTILIZZARE CREDENZIALI TEST**: `admin@example.com` / `Admin123!`
- ✅ **PRESTARE MASSIMA ATTENZIONE** a modifiche sistema login
- ✅ **EFFETTUARE BACKUP** prima di modifiche critiche
- ✅ **DOCUMENTARE** ogni intervento autorizzato
- ✅ **NUOVO**: Test health check completo dopo modifiche
- ✅ **NUOVO**: Verifica CORS e rate limiting se modificati

## 🏗️ Architettura Sistema Ottimizzata

### Panoramica Server Ottimizzati (Progetti 16-17)

Il sistema utilizza un'architettura a tre server ottimizzata per garantire:
- **Modularità**: Middleware e configurazioni separate
- **Performance**: Riduzione codice del 63% (API Server)
- **Sicurezza**: CORS centralizzato, rate limiting modulare
- **Manutenibilità**: Architettura completamente modulare
- **Resilienza**: Health check avanzati e graceful shutdown

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Proxy Server  │    │   API Server    │    │Documents Server │
│   Porta: 4003   │◄──►│   Porta: 4001   │◄──►│   Porta: 4002   │
│   OTTIMIZZATO   │    │   OTTIMIZZATO   │    │                 │
│                 │    │                 │    │                 │
│ • CORS Unificato│    │ • Modulare      │    │ • PDF Generation│
│ • Rate Limiting │    │ • 195 righe     │    │ • Templates     │
│ • Middleware    │    │ • Performance   │    │ • File Storage  │
│ • Health /healthz│   │ • Lifecycle Mgr │    │ • Conversions   │
│ • Graceful Stop │    │ • API Versioning│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   Porta: 5432   │
                    │                 │
                    │ • Person Entity │
                    │ • GDPR Audit    │
                    │ • Soft Delete   │
                    └─────────────────┘
```

### 🔧 Ottimizzazioni Implementate

#### ✅ Proxy Server (Progetto 16)
- **CORS Centralizzato**: Eliminati 6+ handler OPTIONS duplicati
- **Rate Limiting Modulare**: Con esenzioni configurabili
- **Middleware Separati**: Security, logging, body parsing
- **Health Check Avanzato**: `/healthz` con controlli multipli
- **Graceful Shutdown**: Gestione unificata SIGTERM/SIGINT
- **Testing**: Supertest, ESLint, Prettier integrati

#### ✅ API Server (Progetto 17)
- **Riduzione Codice**: Da 527 a 195 righe (-63%)
- **ServiceLifecycleManager**: Gestione inizializzazione servizi
- **MiddlewareManager**: Middleware centralizzati
- **APIVersionManager**: Supporto v1/v2
- **Performance Monitoring**: Condizionale e ottimizzato
- **Input Validation**: Centralizzata con Joi/Zod

## 🔧 Gestione Processi PM2

### Configurazione PM2

File `ecosystem.config.js`:
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
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
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
      time: true,
      max_memory_restart: '512M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
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
      time: true,
      max_memory_restart: '256M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
```

### Comandi PM2 Consentiti (Solo Monitoraggio)

#### ✅ Comandi di Monitoraggio (SICURI)
```bash
# Stato processi
pm2 status
pm2 list

# Informazioni dettagliate
pm2 show api-server
pm2 show documents-server
pm2 show proxy-server

# Monitoraggio in tempo reale
pm2 monit

# Visualizzazione logs
pm2 logs
pm2 logs api-server
pm2 logs documents-server
pm2 logs proxy-server

# Logs con filtri
pm2 logs --lines 100
pm2 logs api-server --lines 50

# Informazioni sistema
pm2 info api-server
pm2 env 0

# Statistiche
pm2 web  # Dashboard web su porta 9615
```

#### 🔍 Test Health Check Obbligatori (Post-Ottimizzazione)

**NUOVO**: Test completi per architettura ottimizzata:

```bash
# Test Health Check Proxy (OBBLIGATORIO)
curl -X GET http://localhost:4003/healthz
# Risposta attesa: {"status":"healthy","timestamp":"...","checks":{...}}

# Test Health Check API (OBBLIGATORIO)
curl -X GET http://localhost:4001/health
# Risposta attesa: {"status":"ok","timestamp":"..."}

# Test Login (OBBLIGATORIO dopo modifiche auth)
curl -X POST http://localhost:4003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'

# Test CORS (OBBLIGATORIO se modificato)
curl -X OPTIONS http://localhost:4003/api/auth/login \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST"

# Test Rate Limiting (se modificato)
for i in {1..10}; do curl -X GET http://localhost:4003/api/health; done
```

#### 🚫 Comandi VIETATI (Richiedono Autorizzazione)
```bash
# VIETATO - Gestione processi
pm2 start
pm2 stop
pm2 restart
pm2 reload
pm2 delete
pm2 kill

# VIETATO - Modifiche configurazione
pm2 save
pm2 resurrect
pm2 dump
pm2 startup
pm2 unstartup

# VIETATO - Reset e pulizia
pm2 reset
pm2 flush
pm2 reloadLogs
```

## 📊 Monitoraggio Server

### 1. Health Checks Automatici

Script `scripts/health-check.sh`:
```bash
#!/bin/bash

# Configurazione
API_URL="http://localhost:4001"
DOCS_URL="http://localhost:4002"
PROXY_URL="http://localhost:4003"
LOG_FILE="./logs/health-check.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Avvio health check..." >> $LOG_FILE

# Funzione per test endpoint
test_endpoint() {
    local url=$1
    local name=$2
    
    if curl -f -s --max-time 10 "$url/health" > /dev/null 2>&1; then
        echo "[$TIMESTAMP] ✅ $name: OK" >> $LOG_FILE
        return 0
    else
        echo "[$TIMESTAMP] ❌ $name: ERRORE" >> $LOG_FILE
        return 1
    fi
}

# Test server
api_status=0
docs_status=0
proxy_status=0

test_endpoint $API_URL "API Server" || api_status=1
test_endpoint $DOCS_URL "Documents Server" || docs_status=1
test_endpoint $PROXY_URL "Proxy Server" || proxy_status=1

# Test database
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "[$TIMESTAMP] ✅ Database: OK" >> $LOG_FILE
    db_status=0
else
    echo "[$TIMESTAMP] ❌ Database: ERRORE" >> $LOG_FILE
    db_status=1
fi

# Riepilogo
total_errors=$((api_status + docs_status + proxy_status + db_status))
echo "[$TIMESTAMP] Health check completato. Errori: $total_errors" >> $LOG_FILE

# Notifica se ci sono errori critici
if [ $total_errors -gt 0 ]; then
    echo "[$TIMESTAMP] ⚠️ ATTENZIONE: Rilevati $total_errors errori nel sistema" >> $LOG_FILE
    # Qui si potrebbe aggiungere notifica email/Slack
fi

exit $total_errors
```

### 2. Monitoraggio Risorse

Script `scripts/resource-monitor.sh`:
```bash
#!/bin/bash

# Monitoraggio utilizzo risorse
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="./logs/resource-monitor.log"

echo "[$TIMESTAMP] === MONITORAGGIO RISORSE ===" >> $LOG_FILE

# CPU e Memoria sistema
echo "[$TIMESTAMP] CPU Usage:" >> $LOG_FILE
top -bn1 | grep "Cpu(s)" >> $LOG_FILE

echo "[$TIMESTAMP] Memory Usage:" >> $LOG_FILE
free -h >> $LOG_FILE

# Spazio disco
echo "[$TIMESTAMP] Disk Usage:" >> $LOG_FILE
df -h / >> $LOG_FILE

# Processi PM2
echo "[$TIMESTAMP] PM2 Processes:" >> $LOG_FILE
pm2 jlist | jq -r '.[] | "\(.name): CPU \(.monit.cpu)% | Memory \(.monit.memory / 1024 / 1024 | floor)MB"' >> $LOG_FILE

# Connessioni database
echo "[$TIMESTAMP] Database Connections:" >> $LOG_FILE
psql "$DATABASE_URL" -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';" >> $LOG_FILE

# Dimensione logs
echo "[$TIMESTAMP] Log Files Size:" >> $LOG_FILE
du -sh logs/* >> $LOG_FILE

echo "[$TIMESTAMP] === FINE MONITORAGGIO ===" >> $LOG_FILE
```

### 3. Configurazione Cron per Monitoraggio

```bash
# Aggiungere a crontab (crontab -e)

# Health check ogni 5 minuti
*/5 * * * * /path/to/project/scripts/health-check.sh

# Monitoraggio risorse ogni 15 minuti
*/15 * * * * /path/to/project/scripts/resource-monitor.sh

# Backup logs giornaliero
0 2 * * * /path/to/project/scripts/backup-logs.sh

# Pulizia logs vecchi (settimanale)
0 3 * * 0 find /path/to/project/logs -name "*.log" -mtime +30 -delete
```

## 🔍 Diagnostica e Troubleshooting

### 1. Verifica Stato Sistema

Script `scripts/system-status.sh`:
```bash
#!/bin/bash

echo "🔍 === STATO SISTEMA ==="

# Verifica PM2
echo "📊 Stato PM2:"
pm2 status

# Verifica porte
echo "🔌 Porte in ascolto:"
netstat -tulpn | grep -E ':(4001|4002|4003|5432)'

# Verifica spazio disco
echo "💾 Spazio disco:"
df -h /

# Verifica memoria
echo "🧠 Utilizzo memoria:"
free -h

# Verifica carico sistema
echo "⚡ Carico sistema:"
uptime

# Verifica logs recenti
echo "📝 Ultimi errori nei logs:"
tail -n 20 logs/*error.log 2>/dev/null || echo "Nessun errore recente"

# Test connettività database
echo "🗄️ Test database:"
psql "$DATABASE_URL" -c "SELECT 'Database OK' as status;" 2>/dev/null || echo "❌ Errore connessione database"

# Test endpoint
echo "🌐 Test endpoint:"
curl -s http://localhost:4003/health && echo " - Proxy OK" || echo " - Proxy ERRORE"
curl -s http://localhost:4001/api/health && echo " - API OK" || echo " - API ERRORE"
curl -s http://localhost:4002/health && echo " - Documents OK" || echo " - Documents ERRORE"

echo "✅ Verifica completata"
```

### 2. Analisi Logs

```bash
# Ricerca errori specifici
grep -r "ERROR" logs/ --include="*.log" | tail -20

# Analisi performance
grep -r "slow query" logs/ --include="*.log"

# Verifica autenticazione
grep -r "authentication" logs/ --include="*.log" | tail -10

# Monitoraggio GDPR audit
grep -r "GDPR_AUDIT" logs/ --include="*.log" | tail -10
```

### 3. Verifica Configurazione

```bash
# Verifica variabili ambiente
echo "Verifica configurazione:"
echo "NODE_ENV: $NODE_ENV"
echo "API_SERVER_PORT: $API_SERVER_PORT"
echo "DOCUMENTS_SERVER_PORT: $DOCUMENTS_SERVER_PORT"
echo "PROXY_SERVER_PORT: $PROXY_SERVER_PORT"

# Test connessione database
echo "Test database:"
psql "$DATABASE_URL" -c "\l" > /dev/null && echo "✅ Database OK" || echo "❌ Database ERRORE"

# Verifica Prisma
echo "Test Prisma:"
npx prisma validate && echo "✅ Schema OK" || echo "❌ Schema ERRORE"
```

## 📈 Performance e Ottimizzazione

### 1. Monitoraggio Performance

```bash
# Statistiche PM2
pm2 show api-server

# Monitoraggio real-time
pm2 monit

# Analisi memoria
pm2 show api-server | grep -E "(memory|cpu)"

# Log performance
grep -r "performance" logs/ --include="*.log" | tail -20
```

### 2. Ottimizzazioni Consentite (Senza Riavvio)

```bash
# Pulizia cache applicazione (se implementata)
curl -X POST http://localhost:4001/api/admin/cache/clear

# Ottimizzazione database (solo query)
psql "$DATABASE_URL" -c "ANALYZE;"
psql "$DATABASE_URL" -c "VACUUM ANALYZE;"

# Rotazione logs manuale
pm2 reloadLogs  # SOLO SE AUTORIZZATO
```

## 🚨 Procedure di Emergenza

### 1. Server Non Risponde

**⚠️ IMPORTANTE**: NON riavviare server senza autorizzazione

```bash
# 1. Verifica stato processo
pm2 status

# 2. Verifica logs per errori
pm2 logs api-server --lines 50

# 3. Verifica risorse sistema
top -p $(pgrep -f "api-server")

# 4. Test connettività
curl -v http://localhost:4001/api/health

# 5. CONTATTARE PROPRIETARIO per autorizzazione riavvio
echo "Server non risponde - richiedere autorizzazione riavvio"
```

### 2. Database Non Raggiungibile

```bash
# 1. Test connessione
psql "$DATABASE_URL" -c "SELECT 1;"

# 2. Verifica processo PostgreSQL
sudo systemctl status postgresql

# 3. Verifica logs PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log

# 4. CONTATTARE PROPRIETARIO per interventi
echo "Database non raggiungibile - richiedere autorizzazione intervento"
```

### 3. Errori GDPR Audit

```bash
# 1. Verifica logs audit
grep "GDPR_AUDIT_ERROR" logs/api-combined.log

# 2. Verifica tabelle audit
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '1 hour';"

# 3. Backup immediato se necessario
pg_dump "$DATABASE_URL" > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# 4. CONTATTARE PROPRIETARIO immediatamente
echo "Errore GDPR rilevato - contatto immediato richiesto"
```

## 📋 Checklist Manutenzione

### Controlli Giornalieri
- [ ] Verifica stato PM2: `pm2 status`
- [ ] Controllo logs errori: `tail -f logs/*error.log`
- [ ] Test health endpoints
- [ ] Verifica spazio disco: `df -h`
- [ ] Controllo backup automatici

### Controlli Settimanali
- [ ] Analisi performance: `pm2 monit`
- [ ] Verifica logs audit GDPR
- [ ] Controllo dimensione database
- [ ] Pulizia logs vecchi
- [ ] Verifica certificati SSL (se applicabile)

### Controlli Mensili
- [ ] Aggiornamento dipendenze (con autorizzazione)
- [ ] Verifica backup e restore
- [ ] Analisi metriche performance
- [ ] Controllo sicurezza e vulnerabilità
- [ ] Documentazione modifiche

## 📞 Contatti e Escalation

### Livelli di Escalation

1. **Livello 1 - Monitoraggio**: Controlli di routine, logs, metriche
2. **Livello 2 - Diagnostica**: Analisi errori, troubleshooting
3. **Livello 3 - Intervento**: **RICHIEDERE AUTORIZZAZIONE** al proprietario

### Quando Contattare il Proprietario

**🚨 CONTATTO IMMEDIATO**:
- Server completamente non raggiungibili
- Errori GDPR audit critici
- Perdita dati o corruzione database
- Violazioni sicurezza
- Necessità riavvio server

**📞 CONTATTO PROGRAMMATO**:
- Aggiornamenti sistema
- Modifiche configurazione
- Manutenzione programmata
- Ottimizzazioni performance

---

**⚠️ PROMEMORIA CRITICO**: Questo documento definisce le regole assolute per la gestione dei server. Ogni violazione di queste regole può compromettere la stabilità del sistema e la compliance GDPR. In caso di dubbi, contattare sempre il proprietario del progetto prima di procedere con qualsiasi intervento.