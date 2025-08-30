# Planning Dettagliato: Risoluzione Timeout Login

## 🎯 Strategia di Intervento

### Approccio Metodico
1. **Bottom-Up Analysis**: Database → API → Proxy → Frontend
2. **Isolamento Componenti**: Test singoli prima dell'integrazione
3. **Logging Granulare**: Tracciamento ogni step del flusso
4. **Eliminazione Sistematica**: Rimozione cause una per volta

## 📋 FASE 1: Pulizia e Inventario Sistema

### 1.1 Terminazione Processi Attivi
```bash
# Identificare tutti i processi Node.js
ps aux | grep node
lsof -i :4001,4002,4003,5173

# Terminare processi duplicati
kill -9 [PID]
```

**Checklist**:
- [ ] Identificare tutti i processi server attivi
- [ ] Terminare processi duplicati
- [ ] Verificare porte libere
- [ ] Documentare configurazione pulita

### 1.2 Inventario File Backend
```bash
# Struttura file server
find backend/ -name "*server*.js" -o -name "*proxy*.js"
find backend/ -name "*.env*"
find backend/ -name "package*.json"
```

**File da Analizzare**:
- [ ] `api-server.js` - Server API principale
- [ ] `proxy-server.js` - Server proxy
- [ ] `documents-server.js` - Server documenti
- [ ] `simple-proxy.js` - Proxy semplificato
- [ ] `minimal-proxy.js` - Proxy minimale
- [ ] File di configurazione `.env`

### 1.3 Pulizia File Temporanei
```bash
# Rimozione file temporanei
rm -rf backend/node_modules/.cache
rm -rf backend/logs/*.log
npm cache clean --force
```

**Azioni**:
- [ ] Pulire cache npm
- [ ] Rimuovere log obsoleti
- [ ] Verificare spazio disco
- [ ] Reset configurazioni temporanee

## 📋 FASE 2: Analisi Database e Connettività

### 2.1 Verifica Stato Database
```sql
-- Test connessione PostgreSQL
psql -h localhost -U postgres -d projectdb -c "SELECT version();"

-- Verifica tabelle critiche
psql -h localhost -U postgres -d projectdb -c "\dt"

-- Test utente admin
psql -h localhost -U postgres -d projectdb -c "SELECT id, email, \"isActive\" FROM \"User\" WHERE email = 'admin@example.com';"

-- Verifica sessioni attive
psql -h localhost -U postgres -d projectdb -c "SELECT COUNT(*) FROM \"UserSession\" WHERE \"isActive\" = true;"
```

**Verifiche**:
- [ ] Database raggiungibile
- [ ] Utente admin presente
- [ ] Password hash corretta
- [ ] Tabelle integrità OK
- [ ] Connection pool disponibile

### 2.2 Test Prisma ORM
```bash
# Verifica schema Prisma
npx prisma validate

# Test generazione client
npx prisma generate

# Verifica migrazioni
npx prisma migrate status
```

**Checklist**:
- [ ] Schema Prisma valido
- [ ] Client generato correttamente
- [ ] Migrazioni applicate
- [ ] Connessione ORM funzionante

## 📋 FASE 3: Analisi Server API (Porta 4001)

### 3.1 Analisi Codice API Server
**File**: `backend/api-server.js`

**Punti di Controllo**:
- [ ] **Import e dipendenze**: Verificare tutti i require/import
- [ ] **Configurazione porta**: Confermare porta 4001
- [ ] **Middleware chain**: Ordine e configurazione
- [ ] **Route di autenticazione**: `/api/auth/login`
- [ ] **Error handling**: Gestione errori e timeout
- [ ] **Database connection**: Pool e configurazione
- [ ] **CORS configuration**: Headers e origini
- [ ] **Body parsing**: JSON e form data
- [ ] **Logging setup**: Winston o console
- [ ] **Health check**: Endpoint `/health`

### 3.2 Test Isolato API Server
```bash
# Avvio server API isolato
cd backend
node api-server.js

# Test in altra shell
curl -X GET http://localhost:4001/health
curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'
```

**Verifiche**:
- [ ] Server si avvia senza errori
- [ ] Health check risponde
- [ ] Endpoint login raggiungibile
- [ ] Response time < 5 secondi
- [ ] Log mostrano richieste

### 3.3 Analisi Middleware Autenticazione
**File**: `backend/auth/`

**Componenti da Verificare**:
- [ ] **JWT Service** (`jwt.js`): Generazione e verifica token
- [ ] **Password Service**: Hash e verifica password
- [ ] **User Controller** (`userController.js`): Logica login
- [ ] **Auth Routes** (`routes.js`): Routing autenticazione
- [ ] **Auth Middleware** (`middleware.js`): Protezione endpoint

**Test Specifici**:
```javascript
// Test password verification
const bcrypt = require('bcryptjs');
const hash = '$2a$12$Sw3C1ldg3JBDo8Re02IZhej8S6JuDuaAlj4B6bn4GwcRFatumuU..';
const result = await bcrypt.compare('Admin123!', hash);
console.log('Password match:', result);

// Test JWT generation
const jwt = require('jsonwebtoken');
const token = jwt.sign({userId: 1}, process.env.JWT_SECRET);
console.log('Token generated:', !!token);
```

## 📋 FASE 4: Analisi Server Proxy (Porta 4003)

### 4.1 Analisi Codice Proxy Server
**File**: `backend/proxy-server.js`

**Punti di Controllo**:
- [ ] **Configurazione porte**: Input 4003, output 4001/4002
- [ ] **Routing logic**: Regole di instradamento
- [ ] **Timeout configuration**: Valori timeout request
- [ ] **Error handling**: Gestione errori proxy
- [ ] **Health checks**: Monitoraggio server target
- [ ] **CORS handling**: Propagazione headers
- [ ] **Request/Response logging**: Debug visibility
- [ ] **Connection pooling**: Gestione connessioni
- [ ] **Retry logic**: Tentativi fallimenti
- [ ] **Circuit breaker**: Protezione overload

### 4.2 Test Isolato Proxy Server
```bash
# Avvio proxy isolato (con API server già attivo)
node proxy-server.js

# Test routing
curl -X GET http://localhost:4003/health
curl -X POST http://localhost:4003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'
```

**Verifiche**:
- [ ] Proxy si avvia correttamente
- [ ] Routing verso API server funziona
- [ ] Timeout configurati appropriatamente
- [ ] Headers CORS corretti
- [ ] Log mostrano traffico

### 4.3 Analisi Alternative Proxy
**File**: `simple-proxy.js`, `minimal-proxy.js`

**Confronto**:
- [ ] Differenze configurazione
- [ ] Performance relative
- [ ] Stabilità comparata
- [ ] Complessità implementazione

## 📋 FASE 5: Analisi Frontend (Porta 5173)

### 5.1 Analisi Servizi API Frontend
**File**: `src/services/api.ts`, `src/services/auth.ts`

**Punti di Controllo**:
- [ ] **Base URL**: Configurazione endpoint
- [ ] **Timeout values**: 60 secondi troppo alti?
- [ ] **Request interceptors**: Modifiche headers
- [ ] **Response interceptors**: Gestione errori
- [ ] **Error handling**: Retry logic
- [ ] **Authentication headers**: Bearer token
- [ ] **CORS configuration**: Credenziali e headers

### 5.2 Analisi Context Autenticazione
**File**: `src/context/AuthContext.tsx`

**Verifiche**:
- [ ] **Login function**: Implementazione corretta
- [ ] **Error handling**: Gestione timeout
- [ ] **State management**: Aggiornamento stato
- [ ] **Token storage**: LocalStorage/SessionStorage
- [ ] **Logout logic**: Pulizia stato

### 5.3 Test Frontend Isolato
```bash
# Test con server mock
npm run dev

# Verifica in browser console
# Network tab per vedere richieste
# Console per errori JavaScript
```

## 📋 FASE 6: Test Integrazione End-to-End

### 6.1 Sequenza Avvio Corretta
```bash
# 1. Database
psql -h localhost -U postgres -d projectdb -c "SELECT 1;"

# 2. API Server
cd backend && node api-server.js &
API_PID=$!

# 3. Proxy Server
node proxy-server.js &
PROXY_PID=$!

# 4. Frontend
cd .. && npm run dev &
FRONTEND_PID=$!

# Verifica tutti attivi
ps -p $API_PID,$PROXY_PID,$FRONTEND_PID
```

### 6.2 Test Flusso Completo
```bash
# Test health checks
curl http://localhost:4001/health
curl http://localhost:4003/health
curl http://localhost:5173

# Test login via proxy
curl -X POST http://localhost:4003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}' \
  -w "Time: %{time_total}s\n"
```

### 6.3 Monitoring Continuo
```bash
# Monitor processi
watch "ps aux | grep node"

# Monitor porte
watch "lsof -i :4001,4003,5173"

# Monitor log
tail -f backend/logs/app.log
```

## 📋 FASE 7: Debugging Granulare

### 7.1 Logging Dettagliato
**Implementare in ogni componente**:
```javascript
// API Server
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Proxy Server
proxy.on('proxyReq', (proxyReq, req, res) => {
  console.log(`[PROXY] ${req.method} ${req.url} -> ${proxyReq.path}`);
});

proxy.on('proxyRes', (proxyRes, req, res) => {
  console.log(`[PROXY] Response: ${proxyRes.statusCode}`);
});
```

### 7.2 Performance Profiling
```bash
# Memory usage
node --inspect api-server.js

# CPU profiling
node --prof api-server.js

# Network analysis
tcpdump -i lo0 port 4001
```

### 7.3 Load Testing
```bash
# Test carico login
ab -n 100 -c 10 -p login.json -T application/json http://localhost:4003/api/auth/login

# Monitor durante test
top -p $(pgrep node)
```

## 🎯 Criteri di Successo per Fase

### Fase 1-2: Pulizia e Database
- [ ] Zero processi duplicati
- [ ] Database risponde < 100ms
- [ ] Utente admin verificato

### Fase 3: API Server
- [ ] Server stabile > 30 minuti
- [ ] Login diretto < 2 secondi
- [ ] Zero memory leaks

### Fase 4: Proxy Server
- [ ] Routing corretto 100% richieste
- [ ] Timeout appropriati
- [ ] Gestione errori robusta

### Fase 5-6: Frontend e Integrazione
- [ ] Login UI < 3 secondi
- [ ] Zero timeout errors
- [ ] Gestione errori user-friendly

### Fase 7: Ottimizzazione
- [ ] Performance baseline stabilita
- [ ] Monitoring implementato
- [ ] Documentazione aggiornata

## 📊 Metriche di Monitoraggio

### Performance
- **Response Time**: < 2s per login
- **Memory Usage**: < 200MB per server
- **CPU Usage**: < 50% durante operazioni
- **Error Rate**: < 1% richieste

### Stabilità
- **Uptime**: > 99% per sessione
- **Crash Rate**: Zero crash/ora
- **Recovery Time**: < 30s restart

## 🚨 Escalation Plan

Se il problema persiste dopo tutte le fasi:

1. **Analisi Infrastruttura**: Docker, networking, OS
2. **Profiling Avanzato**: Memory dumps, CPU traces
3. **Architettura Review**: Riprogettazione componenti
4. **External Dependencies**: Node.js, npm, system libraries

---

**Tempo Stimato**: 4-6 ore
**Priorità**: CRITICA
**Risorse**: 1 sviluppatore senior
**Milestone**: Login funzionante e stabile