# Common Issues and Troubleshooting Guide

**Versione:** 3.0 Post-Ottimizzazione Server  
**Data:** 27 Gennaio 2025  
**Sistema:** Architettura Ottimizzata GDPR-Compliant (Progetti 16-17)

## 📋 Panoramica

Questa guida fornisce soluzioni per i problemi più comuni che possono verificarsi nel Sistema Unificato Person con architettura a tre server. È organizzata per categoria e livello di gravità per facilitare la risoluzione rapida dei problemi.

## 🛠️ Problemi Risolti (Progetti 16-17)

### ✅ RISOLTO: Errore Login 401 (Progetto 17)
**Problema**: Login falliva con errore 401 Unauthorized
**Causa**: Bug nel middleware di performance dell'API Server
**Soluzione**: Ottimizzazione middleware e correzione timeout
**Prevenzione**: Test health check obbligatori post-modifica

### ✅ RISOLTO: Discrepanza Porte Server (Progetto 17)
**Problema**: Proxy configurato su porta 3000 invece di 4003
**Causa**: Configurazione inconsistente tra file
**Soluzione**: Standardizzazione porte (API: 4001, Proxy: 4003)
**Prevenzione**: Validazione porte in project_rules.md

### ✅ RISOLTO: Body Parsing POST Requests (Sistema V38)
**Problema**: Body delle richieste POST non veniva processato correttamente
**Causa**: Body parser non applicati ai router versionati nell'API server
**Soluzione**: Body parser applicati direttamente a v1Router e v2Router
**Prevenzione**: Test login obbligatorio dopo modifiche routing

### ✅ RISOLTO: Sistema Routing Avanzato Implementato
**Problema**: Routing frammentato e non scalabile
**Causa**: Configurazioni sparse e duplicazioni
**Soluzione**: Sistema routing centralizzato con RouterMap unificata
**Caratteristiche**:
- Versioning API automatico (`/api/v1`, `/api/v2`)
- Legacy redirects trasparenti (`/login` → `/api/v1/auth/login`)
- Endpoint diagnostici (`/routes`, `/routes/health`, `/routes/stats`)
- Rate limiting dinamico per tipo endpoint
- CORS dinamico basato su pattern
- Logging unificato con Request ID tracking

### ✅ RISOLTO: CORS Duplicati (Progetto 16)
**Problema**: 6+ handler OPTIONS duplicati causavano conflitti
**Causa**: CORS configurato in multipli file
**Soluzione**: CORS centralizzato in `proxy/middleware/cors.js`
**Prevenzione**: Architettura modulare con middleware separati

### ✅ RISOLTO: Rate Limiting Inconsistente (Progetto 16)
**Problema**: Rate limiting non applicato uniformemente
**Causa**: Configurazioni sparse e non modulari
**Soluzione**: Rate limiting centralizzato con esenzioni configurabili
**Prevenzione**: Modulo `rateLimiting.js` con test automatici

## 🏗️ Architettura Sistema

```
Proxy Server (4003) → API Server (4001) → Database
                   → Documents Server (4002)
```

**Server Components:**
- **API Server (4001)**: Person CRUD, Auth, GDPR endpoints
- **Documents Server (4002)**: PDF generation, file storage
- **Proxy Server (4003)**: Load balancing, SSL, routing

## ⚠️ REGOLE CRITICHE

### 🚫 **SEVERAMENTE VIETATO SENZA AUTORIZZAZIONE ESPLICITA**
```bash
# ❌ DIVIETO ASSOLUTO - Mai eseguire senza autorizzazione del proprietario:
pm2 restart [any-process]
pm2 stop [any-process]
pm2 delete [any-process]
kill -9 [any-pid]
pkill [any-process]
sudo systemctl restart [any-service]
sudo systemctl stop [any-service]
sudo reboot
sudo shutdown
# ❌ Modificare configurazioni server senza autorizzazione
# ❌ Interrompere PostgreSQL, Nginx, Redis
```

### ✅ **COMANDI PERMESSI PER DIAGNOSTICA**
```bash
# ✅ SEMPRE PERMESSI - Monitoring e diagnostica:
pm2 status
pm2 logs [process-name]
pm2 monit
curl http://localhost:4001/health
curl http://localhost:4002/health
curl http://localhost:4003/health
ps aux | grep node
netstat -tlnp | grep -E ':(4001|4002|4003)'
top -n 1
df -h
free -m
```

### 🔑 **CREDENZIALI TEST OBBLIGATORIE**
```bash
# ✅ SEMPRE utilizzare queste credenziali per test:
# Email: admin@example.com
# Password: Admin123!
# DIVIETO ASSOLUTO di modificare senza autorizzazione
```

## 🚨 Problemi Critici

### Sistema Non Raggiungibile

#### Sintomi
- Impossibile accedere all'applicazione
- Timeout di connessione
- Errore 502/503/504
- Health checks falliscono

#### Diagnosi
```bash
# ✅ PERMESSO - Verifica status PM2
pm2 status
pm2 logs --lines 50

# ✅ PERMESSO - Health checks
curl -f http://localhost:4001/health || echo "API Server DOWN"
curl -f http://localhost:4002/health || echo "Documents Server DOWN"
curl -f http://localhost:4003/health || echo "Proxy Server DOWN"

# ✅ PERMESSO -# Verifica porte
netstat -tlnp | grep -E ':(4001|4002|4003|5432)' ✅ PERMESSO - System status
top -n 1 | head -20
df -h
free -m
```

#### Soluzioni

**🚨 IMPORTANTE: Non riavviare server senza autorizzazione!**

**1. Diagnostica Immediata**
```bash
# ✅ PERMESSO - Esegui diagnostic script
./scripts/health-check.sh
./scripts/full-diagnostic.sh

# ✅ PERMESSO - Verifica logs
pm2 logs api-server --lines 100
pm2 logs documents-server --lines 100
pm2 logs proxy-server --lines 100
```

**2. Escalation Procedure**
```bash
# Se server down, ESCALARE IMMEDIATAMENTE:
echo "$(date): Server down - $(pm2 status)" >> /var/log/incidents.log

# Contattare Tech Lead con:
# - Output di pm2 status
# - Health check results
# - Error logs
```

**3. Temporary Workarounds (Solo se autorizzati)**
```bash
# ✅ PERMESSO - Attivare maintenance mode
./scripts/maintenance-mode.sh enable

# ✅ PERMESSO - Verifica spazio disco
df -h
du -sh /var/log/* | sort -hr | head -10
```

### Database Non Disponibile

#### Sintomi
- Errori di connessione database
- Timeout query
- API Server non risponde
- Errori Prisma connection

#### Diagnosi
```bash
# ✅ PERMESSO - Test connessione database
psql -h localhost -U postgres -d person_system -c "SELECT 1;"

# ✅ PERMESSO - Verifica tabelle Person
psql -d person_system -c "SELECT count(*) FROM \"Person\" WHERE \"deletedAt\" IS NULL;"

# ✅ PERMESSO - Connessioni attive
psql -d person_system -c "SELECT count(*) FROM pg_stat_activity WHERE datname='person_system';"

# ✅ PERMESSO - Verifica performance
psql -d person_system -c "SELECT query, calls, total_exec_time FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 5;"

# ✅ NUOVO - Test health check ottimizzato (Progetto 17)
curl -f http://localhost:4003/healthz || echo "Proxy Server DOWN"
curl -f http://localhost:4001/health || echo "API Server DOWN"

# ✅ NUOVO - Test sistema routing avanzato
curl -f http://localhost:4003/routes/health || echo "Routing System DOWN"
curl -f http://localhost:4003/routes/stats || echo "Routing Stats UNAVAILABLE"
```

## 🔄 Problemi Sistema Routing Avanzato

### Routing Non Funziona

#### Sintomi
- Route API non raggiungibili
- Errori 404 su endpoint esistenti
- Legacy redirects non funzionano
- Header `x-api-version` mancanti

#### Diagnosi
```bash
# ✅ PERMESSO - Verifica sistema routing
curl -f http://localhost:4003/routes || echo "Diagnostic endpoint DOWN"

# ✅ PERMESSO - Test versioning API
curl -H "x-api-version: v1" http://localhost:4003/api/v1/health
curl -H "x-api-version: v2" http://localhost:4003/api/v2/health

# ✅ PERMESSO - Test legacy redirects
curl -I http://localhost:4003/login
curl -I http://localhost:4003/logout

# ✅ PERMESSO - Verifica RouterMap
curl http://localhost:4003/routes/config | jq '.routerMap'
```

#### Soluzioni
```bash
# ✅ PERMESSO - Verifica configurazione RouterMap
curl http://localhost:4003/routes/config | jq '.services'

# ✅ PERMESSO - Test specifico route
curl -v http://localhost:4003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}'

# ✅ PERMESSO - Verifica middleware stack
pm2 logs proxy-server | grep -E "(MIDDLEWARE|ROUTING|VERSION)"
```

### Body Parsing Issues

#### Sintomi
- Errori 400 Bad Request su POST
- Body vuoto nell'API server
- Login fallisce con credenziali corrette

#### Diagnosi
```bash
# ✅ PERMESSO - Test body parsing
curl -X POST http://localhost:4003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}' \
  -v

# ✅ PERMESSO - Verifica logs body parsing
pm2 logs proxy-server | grep -E "(BODY|PARSER|V38)"
pm2 logs api-server | grep -E "(BODY|REQUEST|LOGIN)"
```

#### Soluzioni
```bash
# ✅ PERMESSO - Verifica Sistema V38 attivo
pm2 logs api-server | grep "Body parser applied to versioned routers"

# Se Sistema V38 non attivo, escalare immediatamente
echo "$(date): Body parsing issue - Sistema V38 not active" >> /var/log/incidents.log
```

### Rate Limiting Issues

#### Sintomi
- Errori 429 Too Many Requests
- Rate limiting non applicato
- Esenzioni non funzionano

#### Diagnosi
```bash
# ✅ PERMESSO - Verifica rate limiting
curl -I http://localhost:4003/api/v1/auth/login
curl -I http://localhost:4003/routes/health  # Dovrebbe essere esente

# ✅ PERMESSO - Test rate limiting dinamico
for i in {1..6}; do
  curl -I http://localhost:4003/api/v1/auth/login
  echo "Request $i"
done
```

### CORS Issues

#### Sintomi
- Errori CORS nel browser
- Preflight OPTIONS falliscono
- Headers CORS mancanti

#### Diagnosi
```bash
# ✅ PERMESSO - Test CORS
curl -X OPTIONS http://localhost:4003/api/v1/auth/login \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -v

# ✅ PERMESSO - Verifica configurazione CORS
curl http://localhost:4003/routes/config | jq '.cors'
```

# ✅ NUOVO - Test health check ottimizzato (Progetto 17)
curl -f http://localhost:4003/healthz || echo "Proxy Server DOWN"
curl -f http://localhost:4001/health || echo "API Server DOWN"
```

#### Soluzioni

**🚨 IMPORTANTE: Non riavviare PostgreSQL senza autorizzazione!**

**1. Diagnostica Database**
```bash
# ✅ PERMESSO - Verifica schema Person
psql -d person_system -c "\dt"
psql -d person_system -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"

# ✅ PERMESSO - Verifica integrità dati
psql -d person_system -c "SELECT COUNT(*) as total_persons, COUNT(CASE WHEN \"deletedAt\" IS NULL THEN 1 END) as active_persons FROM \"Person\";"

# ✅ PERMESSO - Verifica audit logs
psql -d person_system -c "SELECT COUNT(*) FROM \"AuditLog\" WHERE \"timestamp\" > NOW() - INTERVAL '1 hour';"
```

**2. Escalation Database Issues**
```bash
# Se problemi persistono, ESCALARE con:
echo "$(date): Database issues detected" >> /var/log/incidents.log

# Raccogliere informazioni per Tech Lead:
# - Output di pg_stat_activity
# - Error logs da PM2
# - Risultati health checks
```

**3. Temporary Database Checks**
```sql
-- ✅ PERMESSO - Solo query di lettura
-- Connetti al database
psql -d person_system

-- Verifica performance query Person
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE tablename = 'Person';

-- Verifica GDPR compliance
SELECT 
  COUNT(*) as total_consents,
  COUNT(CASE WHEN "isGiven" = true THEN 1 END) as active_consents
FROM "ConsentRecord";
```

### Memoria Insufficiente

#### Sintomi
- Applicazione lenta
- Errori "Out of Memory"
- Server non risponde

#### Diagnosi
```bash
# Utilizzo memoria
free -h
top -o %MEM

# Processi che consumano più memoria
ps aux --sort=-%mem | head -10

# Memoria swap
swapon -s
```

#### Soluzioni

**1. Liberare Memoria**
```bash
# Pulisci cache sistema
sudo sync && sudo sysctl vm.drop_caches=3

# Riavvia servizi pesanti
sudo systemctl restart document-system
sudo systemctl restart postgresql
```

**2. Ottimizzazione Configurazione**
```bash
# Riduci worker processes Node.js
# Nel file ecosystem.config.js
instances: 2  # Riduci da 4 a 2

# Ottimizza PostgreSQL
# In postgresql.conf
shared_buffers = 256MB      # Riduci se necessario
work_mem = 4MB             # Riduci da default
maintenance_work_mem = 64MB # Riduci se necessario
```

**3. Aggiungere Swap**
```bash
# Crea file swap da 2GB
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Rendi permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## ⚠️ Problemi Comuni

### Problemi Autenticazione

#### Sintomi
- Login fallisce con credenziali corrette
- Token JWT invalidi
- Errori PKCE
- Session timeout prematuro

#### Diagnosi
```bash
# ✅ PERMESSO - Test login con credenziali standard (AGGIORNATO Progetto 17)
curl -X POST http://localhost:4003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'

# ✅ PERMESSO - Verifica JWT configuration
pm2 logs api-server | grep -i "jwt\|token\|auth"

# ✅ PERMESSO - Verifica Person con ruoli
psql -d person_system -c "SELECT p.email, pr.\"roleType\", pr.\"isActive\" FROM \"Person\" p JOIN \"PersonRole\" pr ON p.id = pr.\"personId\" WHERE p.email = 'admin@example.com';"

# ✅ NUOVO - Test middleware performance (Progetto 17)
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:4003/api/auth/login
```

#### Soluzioni

**1. Verifica Credenziali Test**
```bash
# ✅ SEMPRE usare queste credenziali per test:
# Email: admin@example.com
# Password: Admin123!

# Verifica che esistano nel database
psql -d person_system -c "SELECT id, email, \"firstName\", \"lastName\" FROM \"Person\" WHERE email = 'admin@example.com' AND \"deletedAt\" IS NULL;"
```

**2. Reset Password (Solo se autorizzato)**
```bash
# ⚠️ Solo con autorizzazione Tech Lead
# Eseguire script di reset password
./scripts/reset-test-user.sh
```

**3. Verifica GDPR Audit**
```sql
-- ✅ PERMESSO - Verifica audit logs autenticazione
psql -d person_system -c "SELECT action, \"personId\", \"timestamp\", metadata FROM \"AuditLog\" WHERE action IN ('LOGIN', 'LOGOUT', 'UNAUTHORIZED_ACCESS') ORDER BY \"timestamp\" DESC LIMIT 10;"
```

### Problemi GDPR Compliance

#### Sintomi
- Export dati fallisce
- Cancellazione GDPR non funziona
- Audit logs mancanti
- Consensi non registrati

#### Diagnosi
```bash
# ✅ PERMESSO - Test GDPR endpoints
curl -X GET http://localhost:4001/api/gdpr/export/[person-id] \
  -H "Authorization: Bearer [token]"

# ✅ PERMESSO - Verifica audit logs
psql -d person_system -c "SELECT COUNT(*) as audit_count, action FROM \"AuditLog\" WHERE \"timestamp\" > NOW() - INTERVAL '24 hours' GROUP BY action;"

# ✅ PERMESSO - Verifica consensi
psql -d person_system -c "SELECT \"consentType\", COUNT(*) as total, COUNT(CASE WHEN \"isGiven\" = true THEN 1 END) as active FROM \"ConsentRecord\" GROUP BY \"consentType\";"
```

#### Soluzioni

**1. Verifica Soft Delete**
```sql
-- ✅ PERMESSO - Verifica implementazione soft delete
psql -d person_system -c "SELECT COUNT(*) as total, COUNT(CASE WHEN \"deletedAt\" IS NULL THEN 1 END) as active, COUNT(CASE WHEN \"deletedAt\" IS NOT NULL THEN 1 END) as deleted FROM \"Person\";"
```

**2. Test GDPR Export**
```bash
# ✅ PERMESSO - Test export per utente test
curl -X GET "http://localhost:4001/api/gdpr/export/$(psql -d person_system -t -c "SELECT id FROM \"Person\" WHERE email = 'admin@example.com' LIMIT 1;")" \
  -H "Authorization: Bearer [valid-jwt-token]"
```

**3. Escalation GDPR Issues**
```bash
# 🚨 CRITICO - Problemi GDPR richiedono escalation immediata
echo "$(date): GDPR compliance issue detected" >> /var/log/gdpr-incidents.log
# Contattare immediatamente Tech Lead e Compliance Officer
```

### Problemi Specifici Server

#### API Server (Porto 4001) Issues

**Sintomi:**
- Errori 500 su endpoints Person
- Database connection errors
- JWT validation failures

**Diagnosi:**
```bash
# ✅ PERMESSO - Health check API Server (AGGIORNATO Progetto 17)
curl -v http://localhost:4001/health

# ✅ PERMESSO - Test endpoints Person via Proxy
curl http://localhost:4003/api/persons?limit=1

# ✅ PERMESSO - Verifica logs API
pm2 logs api-server --lines 50 | grep -E "ERROR|WARN|FATAL"

# ✅ NUOVO - Test performance middleware (Progetto 17)
curl -H "X-Performance-Test: true" http://localhost:4003/api/persons/health
```

#### Documents Server (Porto 4002) Issues

**Sintomi:**
- PDF generation fails
- File upload errors
- Template rendering issues

**Diagnosi:**
```bash
# ✅ PERMESSO - Health check Documents Server
curl -v http://localhost:4002/health

# ✅ PERMESSO - Test PDF generation
curl -X POST http://localhost:4002/api/documents/test-pdf

# ✅ PERMESSO - Verifica spazio storage
df -h /var/documents
ls -la /var/documents/ | head -10
```

#### Proxy Server (Porto 4003) Issues

**Sintomi:**
- Routing errors
- SSL certificate issues
- Rate limiting problems

**Diagnosi:**
```bash
# ✅ PERMESSO - Health check Proxy Server (AGGIORNATO Progetto 17)
curl -v http://localhost:4003/healthz

# ✅ PERMESSO - Test routing ottimizzato
curl -v http://localhost:4003/api/persons/health
curl -v http://localhost:4003/api/documents/health

# ✅ PERMESSO - Verifica logs proxy
pm2 logs proxy-server --lines 50 | grep -E "ERROR|WARN|FATAL"

# ✅ NUOVO - Test CORS e Rate Limiting (Progetto 16)
curl -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST" -X OPTIONS http://localhost:4003/api/auth/login
curl -H "X-Rate-Limit-Test: true" http://localhost:4003/api/persons?limit=1
```

### Upload Documenti Fallisce

#### Sintomi
- Upload si blocca al 50-90%
- Errore "File too large"
- Timeout durante upload

#### Diagnosi
```bash
# ✅ PERMESSO - Verifica spazio disco
df -h /var/documents

# ✅ PERMESSO - Verifica permessi cartella upload
ls -la /var/uploads

# Log upload
grep "UPLOAD" /var/log/document-system/app.log | tail -20

# Verifica configurazione Nginx
grep -E "client_max_body_size|proxy_read_timeout" /etc/nginx/sites-available/document-system
```

#### Soluzioni

**1. Aumentare Limiti Upload**
```nginx
# In /etc/nginx/sites-available/document-system
client_max_body_size 50M;
proxy_read_timeout 300s;
proxy_send_timeout 300s;
```

**2. Configurazione Node.js**
```javascript
// Nel server Express
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Timeout multer
const upload = multer({
  dest: '/var/uploads',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});
```

**3. Verifica Spazio e Permessi**
```bash
# Libera spazio se necessario
sudo find /var/uploads -name "*.tmp" -mtime +1 -delete

# Correggi permessi
sudo chown -R www-data:www-data /var/uploads
sudo chmod -R 755 /var/uploads
```

### Ricerca Non Funziona

#### Sintomi
- Nessun risultato per query valide
- Ricerca molto lenta
- Errori di timeout

#### Diagnosi
```bash
# Verifica indici database
psql -d document_system -c "\di"

# Statistiche ricerca
psql -d document_system -c "
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename IN ('documents', 'document_content');"

# Log query lente
grep "slow query" /var/log/postgresql/postgresql-*.log
```

#### Soluzioni

**1. Ricostruzione Indici**
```sql
-- Connetti al database
psql -d document_system

-- Ricostruisci indici full-text
REINDEX INDEX documents_content_search_idx;
REINDEX INDEX documents_title_search_idx;

-- Aggiorna statistiche
ANALYZE documents;
ANALYZE document_content;
```

**2. Ottimizzazione Query**
```sql
-- Verifica piano di esecuzione
EXPLAIN ANALYZE 
SELECT * FROM documents 
WHERE to_tsvector('italian', title || ' ' || content) @@ plainto_tsquery('italian', 'test');

-- Crea indici mancanti se necessario
CREATE INDEX CONCURRENTLY idx_documents_created_at ON documents(created_at);
CREATE INDEX CONCURRENTLY idx_documents_tenant_id ON documents(tenant_id);
```

**3. Cache Ricerca**
```bash
# Pulisci cache Redis
redis-cli FLUSHDB

# Verifica configurazione cache
redis-cli CONFIG GET maxmemory
redis-cli CONFIG GET maxmemory-policy
```

### Login Non Funziona

#### Sintomi
- Credenziali corrette rifiutate
- Redirect loop
- Sessione scade immediatamente

#### Diagnosi
```bash
# Log autenticazione
grep "AUTH" /var/log/document-system/app.log | tail -20

# Verifica JWT secret
grep "JWT_SECRET" /etc/document-system/.env

# Sessioni Redis
redis-cli KEYS "sess:*" | wc -l

# Verifica database utenti
psql -d document_system -c "SELECT id, email, is_active FROM users WHERE email = 'user@example.com';"
```

#### Soluzioni

**1. Reset Password Utente**
```sql
-- Connetti al database
psql -d document_system

-- Reset password (hash per 'password123')
UPDATE users 
SET password_hash = '$2b$10$rQZ8kJQy5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5'
WHERE email = 'user@example.com';

-- Attiva account se disabilitato
UPDATE users SET is_active = true WHERE email = 'user@example.com';
```

**2. Verifica Configurazione JWT**
```bash
# Controlla variabili ambiente
cat /etc/document-system/.env | grep JWT

# Rigenera JWT secret se necessario
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Riavvia servizio dopo modifica
sudo systemctl restart document-system
```

**3. Pulisci Sessioni**
```bash
# Pulisci tutte le sessioni Redis
redis-cli FLUSHDB

# Riavvia Redis
sudo systemctl restart redis
```

### Performance Lente

#### Sintomi
- Caricamento pagine lento
- Timeout operazioni
- Alta latenza API

#### Diagnosi
```bash
# Monitoraggio risorse
top -p $(pgrep -d',' node)
iotop -o

# Connessioni database
psql -d document_system -c "
SELECT count(*), state 
FROM pg_stat_activity 
GROUP BY state;"

# Cache hit rate
redis-cli INFO stats | grep keyspace

# Log performance
grep "slow" /var/log/document-system/app.log
```

#### Soluzioni

**1. Ottimizzazione Database**
```sql
-- Query lente
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 5;

-- Vacuum automatico
SELECT schemaname, tablename, last_vacuum, last_autovacuum
FROM pg_stat_user_tables;

-- Forza vacuum se necessario
VACUUM ANALYZE;
```

**2. Ottimizzazione Cache**
```bash
# Aumenta memoria Redis
# In /etc/redis/redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru

# Riavvia Redis
sudo systemctl restart redis
```

**3. Ottimizzazione Node.js**
```javascript
// Aumenta worker processes
// In ecosystem.config.js
module.exports = {
  apps: [{
    name: 'document-api',
    script: './dist/server.js',
    instances: 'max', // Usa tutti i core CPU
    exec_mode: 'cluster'
  }]
};
```

## 🔧 Problemi di Configurazione

### SSL/TLS Issues

#### Sintomi
- Certificato scaduto
- Errori SSL nel browser
- Mixed content warnings

#### Diagnosi
```bash
# Verifica certificato
openssl x509 -in /etc/ssl/certs/document-system.crt -text -noout

# Test connessione SSL
openssl s_client -connect yourdomain.com:443

# Verifica configurazione Nginx
nginx -t
```

#### Soluzioni

**1. Rinnovo Certificato Let's Encrypt**
```bash
# Rinnovo manuale
sudo certbot renew --nginx

# Verifica auto-renewal
sudo systemctl status certbot.timer

# Test rinnovo
sudo certbot renew --dry-run
```

**2. Configurazione Nginx SSL**
```nginx
# In /etc/nginx/sites-available/document-system
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    add_header Strict-Transport-Security "max-age=63072000" always;
}
```

### Email Non Inviate

#### Sintomi
- Notifiche email non arrivano
- Errori SMTP nei log
- Reset password non funziona

#### Diagnosi
```bash
# Log email
grep "EMAIL" /var/log/document-system/app.log

# Test connessione SMTP
telnet smtp.gmail.com 587

# Verifica configurazione
grep "SMTP" /etc/document-system/.env
```

#### Soluzioni

**1. Configurazione SMTP**
```bash
# Verifica credenziali in .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**2. Test Invio Email**
```javascript
// Script test email
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  }
});

transporter.sendMail({
  from: 'your-email@gmail.com',
  to: 'test@example.com',
  subject: 'Test Email',
  text: 'Test message'
}).then(console.log).catch(console.error);
```

### Backup Falliti

#### Sintomi
- Backup non completati
- Errori di spazio
- File corrotti

#### Diagnosi
```bash
# Log backup
grep "BACKUP" /var/log/document-system/app.log

# Verifica spazio destinazione
df -h /var/backups

# Verifica ultimo backup
ls -la /var/backups/ | head -10

# Test integrità backup
pg_restore --list /var/backups/latest.sql
```

#### Soluzioni

**1. Pulizia Backup Vecchi**
```bash
# Rimuovi backup più vecchi di 30 giorni
find /var/backups -name "*.sql" -mtime +30 -delete
find /var/backups -name "*.tar.gz" -mtime +30 -delete
```

**2. Script Backup Migliorato**
```bash
#!/bin/bash
# /usr/local/bin/backup-system.sh

BACKUP_DIR="/var/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="document_system"

# Backup database
pg_dump $DB_NAME | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup files
tar -czf "$BACKUP_DIR/files_$DATE.tar.gz" /var/uploads

# Verifica integrità
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: $DATE"
else
    echo "Backup failed: $DATE" >&2
    exit 1
fi

# Pulizia backup vecchi
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
```

## 🔍 Strumenti di Diagnostica

### Script Diagnostica Automatica

**📁 Riferimento**: Vedere [monitoring.md](../deployment/monitoring.md) per script completi

```bash
#!/bin/bash
# ✅ PERMESSO - Script diagnostica sistema Person
# Basato su /scripts/health-check.sh

echo "=== Person System Health Check ==="
echo "Date: $(date)"
echo "Architecture: Three-Server GDPR-Compliant"
echo

# Verifica PM2 processes
echo "=== PM2 Status ==="
pm2 status
echo

# Health checks tre server
echo "=== Server Health Checks ==="
for port in 4001 4002 4003; do
    if curl -f http://localhost:$port/health >/dev/null 2>&1; then
        echo "✅ Server $port: Healthy"
    else
        echo "❌ Server $port: Unhealthy"
    fi
done
echo

# Verifica database Person
echo "=== Person Database Status ==="
if psql -d person_system -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Database: Connected"
    ACTIVE_PERSONS=$(psql -d person_system -t -c "SELECT count(*) FROM \"Person\" WHERE \"deletedAt\" IS NULL;" | xargs)
    echo "Active Persons: $ACTIVE_PERSONS"
    AUDIT_LOGS=$(psql -d person_system -t -c "SELECT count(*) FROM \"AuditLog\" WHERE \"timestamp\" > NOW() - INTERVAL '1 hour';" | xargs)
    echo "Audit Logs (1h): $AUDIT_LOGS"
else
    echo "❌ Database: Connection failed"
fi
echo

# Verifica GDPR compliance
echo "=== GDPR Compliance Check ==="
CONSENTS=$(psql -d person_system -t -c "SELECT COUNT(*) FROM \"ConsentRecord\" WHERE \"isGiven\" = true;" 2>/dev/null | xargs || echo "0")
echo "Active Consents: $CONSENTS"
echo

# System resources
echo "=== System Resources ==="
echo "CPU Usage: $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory Usage: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
echo "Disk Usage: $(df -h / | awk 'NR==2{print $5}')"
echo

echo "=== Health Check Complete ==="
echo "📖 For detailed monitoring: see docs/deployment/monitoring.md"
```

### Monitoraggio Continuo

**📁 Riferimento**: Vedere [monitoring.md](../deployment/monitoring.md) per configurazione completa

```bash
#!/bin/bash
# ✅ PERMESSO - Monitoraggio sistema Person
# ⚠️ NON riavvia automaticamente servizi

while true; do
    # System metrics
    CPU=$(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1)
    MEM=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    
    # Alert thresholds
    if (( $(echo "$CPU > 80" | bc -l) )); then
        echo "$(date): HIGH CPU USAGE: ${CPU}%" >> /var/log/person-alerts.log
    fi
    
    if (( $(echo "$MEM > 90" | bc -l) )); then
        echo "$(date): HIGH MEMORY USAGE: ${MEM}%" >> /var/log/person-alerts.log
    fi
    
    # ✅ PERMESSO - Verifica health endpoints (NO RESTART)
    for port in 4001 4002 4003; do
        if ! curl -f http://localhost:$port/health >/dev/null 2>&1; then
            echo "$(date): SERVER DOWN: Port $port" >> /var/log/person-alerts.log
            # 🚨 ESCALATE - Non riavviare automaticamente
        fi
    done
    
    # ✅ PERMESSO - Database connectivity check
    if ! psql -d person_system -c "SELECT 1;" >/dev/null 2>&1; then
        echo "$(date): DATABASE CONNECTION FAILED" >> /var/log/person-alerts.log
        # 🚨 ESCALATE IMMEDIATELY
    fi
    
    # GDPR audit check
    RECENT_AUDITS=$(psql -d person_system -t -c "SELECT COUNT(*) FROM \"AuditLog\" WHERE \"timestamp\" > NOW() - INTERVAL '5 minutes';" 2>/dev/null | xargs || echo "0")
    if [ "$RECENT_AUDITS" -eq 0 ]; then
        echo "$(date): NO RECENT AUDIT LOGS - POTENTIAL GDPR ISSUE" >> /var/log/gdpr-alerts.log
    fi
    
    sleep 60
done
```

## 📞 Escalation Procedures

### 🚨 **Livelli di Escalation**

#### **Livello 1 - Self-Service (5-15 minuti)**
```bash
# ✅ PERMESSO - Diagnostica iniziale
./scripts/health-check.sh
pm2 status
pm2 logs --lines 50

# Consultare documentazione:
# - docs/troubleshooting/common-issues.md (questo file)
# - docs/troubleshooting/faq.md
# - docs/deployment/monitoring.md
```

#### **Livello 2 - Tech Lead (15-30 minuti)**
**Quando escalare:**
- Health checks falliscono
- Database connectivity issues
- GDPR compliance errors
- Performance degradation

**Informazioni da fornire:**
```bash
# Raccogliere queste informazioni:
pm2 status > escalation-report.txt
pm2 logs --lines 100 >> escalation-report.txt
psql -d person_system -c "SELECT COUNT(*) FROM \"Person\" WHERE \"deletedAt\" IS NULL;" >> escalation-report.txt
df -h >> escalation-report.txt
free -m >> escalation-report.txt
```

#### **Livello 3 - Emergency (Immediato)**
**Quando escalare immediatamente:**
- Tutti i server down
- Database corruption
- GDPR data breach
- Security incident

**Azioni immediate:**
```bash
# 1. Attivare maintenance mode
./scripts/maintenance-mode.sh enable

# 2. Documentare incident
echo "$(date): EMERGENCY - [description]" >> /var/log/emergency-incidents.log

# 3. Eseguire emergency diagnostic
./scripts/emergency-response.sh

# 4. Notificare team
./scripts/alert-team.sh "EMERGENCY: [brief description]"
```

## 📚 Riferimenti Documentazione

### 🔗 **Link Rapidi**

- **[Deployment Guide](../deployment/deployment-guide.md)** - Guida deployment completa
- **[Server Management](../deployment/server-management.md)** - Gestione server e PM2
- **[Monitoring](../deployment/monitoring.md)** - Monitoraggio e health checks
- **[Backup/Restore](../deployment/backup-restore.md)** - Procedure backup
- **[Disaster Recovery](../deployment/disaster-recovery.md)** - Procedure emergenza
- **[Project Rules](../project_rules.md)** - Regole critiche sistema

### 📋 **Checklist Rapide**

#### ✅ **Quick Health Check**
```bash
# 1. PM2 Status
pm2 status

# 2. Health Endpoints
curl http://localhost:4001/health
curl http://localhost:4002/health  
curl http://localhost:4003/health

# 3. Database
psql -d person_system -c "SELECT 1;"

# 4. Test User
psql -d person_system -c "SELECT email FROM \"Person\" WHERE email = 'admin@example.com' AND \"deletedAt\" IS NULL;"
```

#### 🚨 **Emergency Checklist**
```bash
# 1. Assess situation
./scripts/health-check.sh

# 2. Enable maintenance mode
./scripts/maintenance-mode.sh enable

# 3. Document incident
echo "$(date): [incident description]" >> /var/log/incidents.log

# 4. Gather diagnostics
./scripts/full-diagnostic.sh > emergency-report.txt

# 5. Escalate with report
# Contact Tech Lead with emergency-report.txt
```

#### 🔒 **GDPR Incident Checklist**
```bash
# 1. Immediate assessment
psql -d person_system -c "SELECT COUNT(*) FROM \"AuditLog\" WHERE action = 'DATA_BREACH';"

# 2. Document potential breach
echo "$(date): Potential GDPR incident" >> /var/log/gdpr-incidents.log

# 3. Preserve evidence
./scripts/backup-audit-logs.sh

# 4. IMMEDIATE escalation
# Contact Tech Lead AND Compliance Officer

# 5. Prepare breach report
./scripts/gdpr-incident-report.sh
```

---

**⚠️ IMPORTANTE**: 
- **Mai riavviare server senza autorizzazione**
- **Sempre usare credenziali test: admin@example.com / Admin123!**
- **Escalare problemi GDPR immediatamente**
- **Documentare tutti gli incident**

**📞 Per emergenze**: Seguire procedure di escalation definite in [server-management.md](../deployment/server-management.md)

**📝 Aggiornamenti**: Consultare sempre la versione più recente della documentazione prima di procedere.

## 📞 Escalation e Supporto

### Quando Escalare

#### Problemi Critici (Escalation Immediata)
- Sistema completamente inaccessibile > 15 minuti
- Perdita di dati
- Violazioni di sicurezza
- Corruzione database

#### Problemi Gravi (Escalation entro 2 ore)
- Performance degradate > 50%
- Funzionalità principali non disponibili
- Errori diffusi per più utenti

#### Problemi Minori (Escalation entro 24 ore)
- Problemi singoli utenti
- Funzionalità secondarie non disponibili
- Performance leggermente degradate

### Informazioni da Raccogliere

#### Per Ogni Segnalazione
1. **Timestamp** esatto del problema
2. **Utenti coinvolti** (numero e dettagli)
3. **Azioni che hanno scatenato** il problema
4. **Messaggi di errore** esatti
5. **Screenshot** se applicabili
6. **Log rilevanti** (ultimi 30 minuti)

#### Comandi Raccolta Log
```bash
# Crea pacchetto diagnostico
mkdir -p /tmp/diagnostic-$(date +%Y%m%d_%H%M%S)
cd /tmp/diagnostic-$(date +%Y%m%d_%H%M%S)

# Copia log
cp /var/log/document-system/*.log .
cp /var/log/nginx/*.log .
cp /var/log/postgresql/*.log .

# Info sistema
systemctl status document-system > system-status.txt
df -h > disk-usage.txt
free -h > memory-usage.txt
top -bn1 > process-list.txt

# Crea archivio
cd ..
tar -czf diagnostic-$(date +%Y%m%d_%H%M%S).tar.gz diagnostic-$(date +%Y%m%d_%H%M%S)/
```

### Contatti Supporto

#### Livello 1 - Supporto Tecnico
- **Email:** support@yourdomain.com
- **Telefono:** +39 02 1234 5678
- **Orari:** Lun-Ven 9:00-18:00

#### Livello 2 - Supporto Avanzato
- **Email:** advanced-support@yourdomain.com
- **Telefono:** +39 02 1234 5679
- **Orari:** Lun-Ven 8:00-20:00

#### Livello 3 - Emergenze
- **Telefono:** +39 333 123 4567
- **Orari:** 24/7
- **Solo per:** Sistemi down, perdita dati, sicurezza

---

**Precedente:** [Admin Manual](../user/admin-manual.md)  
**Prossimo:** [FAQ](faq.md)  
**Correlato:** [Deployment Guide](../deployment/deployment-guide.md)

---

*Questa guida è aggiornata alla versione 1.0 del sistema. Per problemi non coperti, contatta il supporto tecnico.*