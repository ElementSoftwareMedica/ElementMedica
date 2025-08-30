# 🗺️ Roadmap Implementazione - Proxy Server Optimization

**Data**: 2025-01-27  
**Progetto**: Ottimizzazione e Modularizzazione Proxy Server  
**Versione**: 1.0  
**Durata Stimata**: 4-6 ore  

## 🎯 Strategia di Implementazione

### Principi Guida
- **Incrementale**: Implementazione graduale senza interruzioni
- **Test-Driven**: Validazione continua delle funzionalità
- **Backward Compatible**: Mantenimento compatibilità esistente
- **Zero Downtime**: Nessuna interruzione dei servizi

## 📋 Fasi di Implementazione

### 🔧 **FASE 1: Preparazione e Setup** (30 min)

#### 1.1 Creazione Struttura Directory
```bash
# Creazione struttura moduli
mkdir -p backend/proxy/{config,middleware,handlers,routes,utils}
```

#### 1.2 Backup e Versioning
```bash
# Backup del file originale
cp backend/proxy-server.js backend/proxy-server.js.backup
```

#### 1.3 Environment Variables Setup
```bash
# Aggiunta variabili debug al .env
DEBUG_PROXY=false
DEBUG_CORS=false
DEBUG_RATE_LIMIT=false
DEBUG_PATH=false
DEBUG_HEADERS=false
DEBUG_ALL=false
```

#### ✅ Criteri di Accettazione Fase 1
- [ ] Struttura directory creata
- [ ] Backup originale salvato
- [ ] Environment variables configurate
- [ ] Git commit con stato iniziale

---

### 🏗️ **FASE 2: Modularizzazione Core** (90 min)

#### 2.1 Configurazione CORS (20 min)
**File**: `backend/proxy/config/cors.js`

**Obiettivo**: Eliminare 6+ handler OPTIONS duplicati

**Implementazione**:
- Configurazione CORS centralizzata
- Factory per OPTIONS handlers
- Supporto configurazioni custom

**Test**: Verificare CORS su tutti gli endpoint

#### 2.2 Rate Limiting Centralizzato (25 min)
**File**: `backend/proxy/middleware/rateLimiting.js`

**Obiettivo**: Unificare logica rate limiting

**Implementazione**:
- Rate limiter configurabile
- Esenzioni centralizzate
- Limiter specifici (login, API)

**Test**: Verificare rate limiting e esenzioni

#### 2.3 Logging Condizionale (20 min)
**File**: `backend/proxy/middleware/logging.js`

**Obiettivo**: Eliminare console.log fissi

**Implementazione**:
- Debug namespaces
- Logging condizionale
- Performance tracking

**Test**: Verificare logging con/senza debug flags

#### 2.4 Body Parser Riutilizzabile (15 min)
**File**: `backend/proxy/middleware/bodyParser.js`

**Obiettivo**: Eliminare duplicazione body parser

**Implementazione**:
- Factory per JSON/URL-encoded parsers
- Configurazioni predefinite
- Parser per grandi upload

**Test**: Verificare parsing su endpoint locali

#### 2.5 Security Middleware (10 min)
**File**: `backend/proxy/middleware/security.js`

**Obiettivo**: CSP esteso e HSTS

**Implementazione**:
- Helmet configurazione avanzata
- CSP policies estese
- HSTS headers

**Test**: Verificare security headers

#### ✅ Criteri di Accettazione Fase 2
- [ ] CORS centralizzato funzionante
- [ ] Rate limiting unificato
- [ ] Logging condizionale attivo
- [ ] Body parser modulare
- [ ] Security headers configurati
- [ ] Tutti i test passano
- [ ] Login funziona correttamente

---

### 🔄 **FASE 3: Refactoring Middleware** (60 min)

#### 3.1 Proxy Factory (25 min)
**File**: `backend/proxy/handlers/proxyFactory.js`

**Obiettivo**: Eliminare duplicazione proxy middleware

**Implementazione**:
- Factory standardizzato per proxy
- Error handling unificato
- Logging strutturato
- Configurazioni per API/Documents

**Test**: Verificare tutti i proxy endpoint

#### 3.2 Health Check Avanzato (20 min)
**File**: `backend/proxy/handlers/healthCheck.js`

**Obiettivo**: Endpoint /healthz con controlli multipli

**Implementazione**:
- Check API server
- Check database
- Check auth system
- Check documents server (opzionale)
- Metriche performance

**Test**: Verificare /health e /healthz

#### 3.3 Graceful Shutdown DRY (15 min)
**File**: `backend/proxy/utils/gracefulShutdown.js`

**Obiettivo**: Eliminare duplicazione SIGTERM/SIGINT

**Implementazione**:
- Handler unificato
- Cleanup risorse
- Comportamento dev/production

**Test**: Verificare shutdown graceful

#### ✅ Criteri di Accettazione Fase 3
- [ ] Proxy factory funzionante
- [ ] Health check avanzato attivo
- [ ] Graceful shutdown unificato
- [ ] Error handling standardizzato
- [ ] Performance metrics disponibili

---

### 🔗 **FASE 4: Integrazione e Route Setup** (45 min)

#### 4.1 Route Configuration (20 min)
**File**: `backend/proxy/config/routes.js`

**Obiettivo**: Centralizzare configurazione route

**Implementazione**:
- Mapping route centralizzato
- PathRewrite configurations
- Target server definitions

#### 4.2 Local Routes Refactoring (15 min)
**File**: `backend/proxy/routes/localRoutes.js`

**Obiettivo**: Separare endpoint locali

**Implementazione**:
- Courses CRUD
- Templates/Attestati
- Health checks

#### 4.3 Proxy Routes Setup (10 min)
**File**: `backend/proxy/routes/proxyRoutes.js`

**Obiettivo**: Configurazione proxy routes

**Implementazione**:
- API routes
- Documents routes
- Test routes

#### ✅ Criteri di Accettazione Fase 4
- [ ] Route configuration centralizzata
- [ ] Local routes separate
- [ ] Proxy routes configurate
- [ ] Tutti gli endpoint funzionanti

---

### 🧪 **FASE 5: Testing e Validazione** (30 min)

#### 5.1 Test Funzionali (15 min)

**Login Test**:
```bash
curl -X POST http://localhost:4003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}'
```

**API Endpoints Test**:
```bash
# Test roles
curl -H "Authorization: Bearer <token>" http://localhost:4003/api/roles

# Test companies
curl -H "Authorization: Bearer <token>" http://localhost:4003/api/companies

# Test tenants
curl -H "Authorization: Bearer <token>" http://localhost:4003/api/tenants
```

**Health Checks Test**:
```bash
# Health check semplice
curl http://localhost:4003/health

# Health check avanzato
curl http://localhost:4003/healthz
```

#### 5.2 Performance Test (10 min)

**Load Test**:
```bash
# Test rate limiting
for i in {1..10}; do curl http://localhost:4003/api/roles & done

# Test CORS
curl -X OPTIONS http://localhost:4003/api/auth/login \
  -H "Origin: http://localhost:5173"
```

#### 5.3 Debug Test (5 min)

**Debug Flags Test**:
```bash
# Attivare debug
DEBUG_PROXY=true npm start

# Verificare logging condizionale
DEBUG_ALL=true npm start
```

#### ✅ Criteri di Accettazione Fase 5
- [ ] Login funziona correttamente
- [ ] Tutti gli endpoint API rispondono
- [ ] Health checks funzionanti
- [ ] Rate limiting attivo
- [ ] CORS configurato correttamente
- [ ] Debug logging funzionante
- [ ] Performance accettabile

---

### 📚 **FASE 6: Documentazione e Cleanup** (45 min)

#### 6.1 Refactoring File Principale (20 min)
**File**: `backend/proxy-server.js`

**Obiettivo**: Ridurre a <200 righe

**Implementazione**:
- Import dei moduli
- Configurazione base
- Inizializzazione server
- Cleanup codice obsoleto

#### 6.2 Documentazione Tecnica (15 min)

**Files da aggiornare**:
- `docs/technical/proxy-server.md`
- `docs/technical/api/proxy-endpoints.md`
- `docs/deployment/proxy-configuration.md`

#### 6.3 Environment Documentation (10 min)

**File**: `docs/technical/environment-variables.md`

**Contenuto**:
- Nuove variabili debug
- Configurazioni proxy
- Security settings

#### ✅ Criteri di Accettazione Fase 6
- [ ] File principale <200 righe
- [ ] Documentazione aggiornata
- [ ] Environment variables documentate
- [ ] README aggiornato
- [ ] Codice obsoleto rimosso

---

## 🧪 Test Suite Completa

### Test Automatizzati
```javascript
// tests/proxy-server.test.js
describe('Proxy Server', () => {
  test('Login functionality', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'admin@example.com',
        password: 'Admin123!'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
  
  test('CORS headers', async () => {
    const response = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:5173');
    
    expect(response.headers['access-control-allow-origin'])
      .toBe('http://localhost:5173');
  });
  
  test('Rate limiting', async () => {
    // Test rate limiting logic
  });
  
  test('Health checks', async () => {
    const response = await request(app).get('/healthz');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });
});
```

### Test Manuali Checklist

#### Frontend Integration
- [ ] Login da frontend funziona
- [ ] Navigazione tra pagine
- [ ] CRUD operations
- [ ] File upload/download
- [ ] Logout corretto

#### API Endpoints
- [ ] `/api/auth/*` - Autenticazione
- [ ] `/api/roles` - Gestione ruoli
- [ ] `/api/companies` - Gestione aziende
- [ ] `/api/tenants` - Gestione tenant
- [ ] `/api/persons` - Gestione persone
- [ ] `/api/users` - Compatibilità legacy

#### Local Endpoints
- [ ] `/courses` - CRUD corsi
- [ ] `/templates` - Gestione template
- [ ] `/attestati` - Gestione attestati
- [ ] `/health` - Health check semplice
- [ ] `/healthz` - Health check avanzato

## 🚨 Risk Mitigation

### Rollback Plan
```bash
# In caso di problemi critici
cp backend/proxy-server.js.backup backend/proxy-server.js
pm2 restart proxy-server
```

### Monitoring
- **Logs**: Monitorare logs per errori
- **Performance**: Verificare response times
- **Memory**: Controllare memory usage
- **CPU**: Monitorare CPU utilization

### Troubleshooting

#### Problema: Login non funziona
**Soluzione**:
1. Verificare CORS headers
2. Controllare rate limiting
3. Validare proxy configuration

#### Problema: Endpoint non risponde
**Soluzione**:
1. Verificare route configuration
2. Controllare proxy target
3. Validare pathRewrite

#### Problema: Performance degradata
**Soluzione**:
1. Disabilitare debug logging
2. Ottimizzare rate limiting
3. Verificare memory leaks

## 📊 Success Metrics

### Quantitative
- **Code Reduction**: -42% righe di codice
- **Modularity**: 15+ file modulari
- **Performance**: <1s startup time
- **Memory**: <120MB usage
- **Test Coverage**: >80%

### Qualitative
- **Maintainability**: Codice più leggibile
- **Reusability**: Componenti riutilizzabili
- **Security**: Headers sicurezza migliorati
- **Debugging**: Logging strutturato

## 🎯 Post-Implementation

### Immediate Actions
- Monitoraggio 24h per stabilità
- Performance baseline recording
- User acceptance testing

### Future Enhancements
- ESLint/Prettier integration
- Automated testing CI/CD
- Performance monitoring
- Security scanning

---

**Inizio Implementazione**: Fase 1 - Preparazione e Setup  
**Responsabile**: AI Assistant  
**Validazione**: Test continui + Login verification