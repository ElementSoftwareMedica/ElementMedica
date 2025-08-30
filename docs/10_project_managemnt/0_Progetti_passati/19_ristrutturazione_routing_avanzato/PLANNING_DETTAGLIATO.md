# 📋 PLANNING DETTAGLIATO - Ristrutturazione Routing Avanzato
**Progetto 19 - Sistema Routing Centralizzato e Ottimizzato**  
**Data Inizio**: 14 Gennaio 2025  
**Durata Stimata**: 4-6 ore  
**Priorità**: ALTA - Architettura Critica

## 🎯 OBIETTIVI PRINCIPALI

### 1. **Centralizzazione Routing per Versione API**
- Separazione chiara `/api/v1`, `/api/v2`, ecc.
- Retrocompatibilità garantita
- Facilità aggiunta nuove versioni

### 2. **Riscrittura Path nel Proxy**
- Endpoint legacy `/login` → `/api/v1/auth/login`
- Nessuna modifica frontend richiesta
- Compatibilità backward completa

### 3. **Mappa Router Centralizzata**
- File unico `routerMap.js` per tutti i path → target
- Manutenzione semplificata
- Configurazione dichiarativa

### 4. **Routing Dinamico con Parametri**
- Route automatiche `/api/:version/*`
- Gestione automatica nuove versioni
- Scalabilità garantita

### 5. **Redirect e Alias Route Pubbliche**
- URL noti mantenuti (`/login`, `/auth/login`)
- Esperienza utente fluida
- SEO-friendly

### 6. **Header x-api-version**
- Tracciamento versione richiesta
- Logging e debug migliorati
- Fallback intelligenti

### 7. **Priorità Route Corretta**
- Proxy route caricate per prime
- Prevenzione intercettazioni errate
- Ordine logico garantito

### 8. **Logging Avanzato**
- Tracciamento completo richieste
- Target finale sempre visibile
- Debug facilitato

### 9. **Endpoint /routes Diagnostico**
- Vista live route attive
- Documentazione automatica
- Debug real-time

### 10. **Prevenzione Duplicazione Path**
- Eliminazione `/api/api/...`
- Path rewrite puliti
- Regole chiare e consistenti

## 🔍 FASE 1: ANALISI STATO ATTUALE (45 min)

### 1.1 Mappatura Architettura Corrente
**Durata**: 15 min  
**Obiettivo**: Comprendere stato attuale routing

**Attività**:
- [ ] Analizzare `proxy-server.js` attuale
- [ ] Mappare route esistenti in `api-server.js`
- [ ] Identificare endpoint frontend utilizzati
- [ ] Documentare flussi di routing attuali
- [ ] Identificare problemi e inefficienze

**Output**:
- Mappa completa routing attuale
- Lista problemi identificati
- Documentazione flussi esistenti

### 1.2 Analisi Configurazioni Proxy
**Durata**: 15 min  
**Obiettivo**: Comprendere configurazioni attuali

**Attività**:
- [ ] Esaminare middleware proxy esistenti
- [ ] Analizzare configurazioni CORS
- [ ] Verificare rate limiting attuale
- [ ] Mappare target server (4001, 4002, 4003)
- [ ] Identificare path rewrite esistenti

**Output**:
- Documentazione configurazioni attuali
- Lista middleware utilizzati
- Mappa target server

### 1.3 Test Funzionalità Esistenti
**Durata**: 15 min  
**Obiettivo**: Baseline funzionamento attuale

**Attività**:
- [ ] Test login standard
- [ ] Test endpoint API principali
- [ ] Verifica health check
- [ ] Test CORS e preflight
- [ ] Documentare comportamenti attuali

**Output**:
- Report funzionamento baseline
- Lista endpoint critici
- Comportamenti da preservare

## 🏗️ FASE 2: PROGETTAZIONE ARCHITETTURA TARGET (60 min)

### 2.1 Design Router Map Centralizzato
**Durata**: 20 min  
**Obiettivo**: Progettare sistema centralizzato

**Struttura Target**:
```javascript
// routerMap.js
const ROUTER_MAP = {
  // API Versioning
  '/api/v1': {
    target: 'http://localhost:4001',
    pathRewrite: { '^/api/v1': '' },
    version: 'v1',
    priority: 1
  },
  '/api/v2': {
    target: 'http://localhost:4001',
    pathRewrite: { '^/api/v2': '/v2' },
    version: 'v2',
    priority: 1
  },
  
  // Legacy Redirects
  '/login': {
    redirect: '/api/v1/auth/login',
    type: 'legacy'
  },
  '/auth/login': {
    redirect: '/api/v1/auth/login',
    type: 'legacy'
  },
  
  // Documents Server
  '/documents': {
    target: 'http://localhost:4002',
    pathRewrite: { '^/documents': '' },
    priority: 2
  },
  
  // Static Routes
  '/health': {
    type: 'local',
    handler: 'healthCheck'
  },
  '/routes': {
    type: 'local',
    handler: 'routesList'
  }
};
```

### 2.2 Design Middleware Stack
**Durata**: 20 min  
**Obiettivo**: Progettare stack middleware ottimizzato

**Stack Target**:
```javascript
// middleware-stack.js
const MIDDLEWARE_STACK = [
  'requestLogger',      // Log tutte le richieste
  'corsHandler',        // CORS centralizzato
  'versionInjector',    // Inject x-api-version header
  'rateLimiter',        // Rate limiting
  'routeResolver',      // Risoluzione route dinamica
  'pathRewriter',       // Riscrittura path
  'proxyHandler',       // Gestione proxy
  'errorHandler'        // Gestione errori
];
```

### 2.3 Design Sistema Versioning
**Durata**: 20 min  
**Obiettivo**: Progettare gestione versioni API

**Versioning Strategy**:
- **v1**: Versione attuale (default)
- **v2**: Versione futura (preparazione)
- **legacy**: Route di compatibilità
- **latest**: Alias per ultima versione

## 🔧 FASE 3: IMPLEMENTAZIONE CORE (90 min)

### 3.1 Creazione Router Map Centralizzato
**Durata**: 30 min  
**Obiettivo**: Implementare sistema centralizzato

**File da Creare**:
- `backend/proxy/config/routerMap.js`
- `backend/proxy/config/versionConfig.js`
- `backend/proxy/utils/routeResolver.js`

**Attività**:
- [ ] Creare struttura routerMap completa
- [ ] Implementare configurazione versioning
- [ ] Creare utility risoluzione route
- [ ] Aggiungere validazione configurazione
- [ ] Test configurazione base

### 3.2 Implementazione Middleware Versioning
**Durata**: 30 min  
**Obiettivo**: Gestione versioni API

**File da Creare**:
- `backend/proxy/middleware/versionInjector.js`
- `backend/proxy/middleware/pathRewriter.js`
- `backend/proxy/middleware/routeResolver.js`

**Attività**:
- [ ] Middleware injection header x-api-version
- [ ] Middleware riscrittura path dinamica
- [ ] Middleware risoluzione route
- [ ] Gestione fallback versioni
- [ ] Test middleware isolati

### 3.3 Implementazione Sistema Logging
**Durata**: 30 min  
**Obiettivo**: Logging avanzato routing

**File da Creare**:
- `backend/proxy/middleware/requestLogger.js`
- `backend/proxy/utils/routeTracker.js`

**Attività**:
- [ ] Logger richieste con target finale
- [ ] Tracker route utilizzate
- [ ] Metriche performance routing
- [ ] Debug info strutturate
- [ ] Test logging completo

## 🛠️ FASE 4: IMPLEMENTAZIONE AVANZATA (75 min)

### 4.1 Endpoint Diagnostico /routes
**Durata**: 25 min  
**Obiettivo**: Sistema diagnostico live

**Funzionalità**:
```javascript
// GET /routes
{
  "activeRoutes": [...],
  "routeStats": {...},
  "versionInfo": {...},
  "healthStatus": {...}
}
```

**Attività**:
- [ ] Endpoint lista route attive
- [ ] Statistiche utilizzo route
- [ ] Info versioni disponibili
- [ ] Status health routing
- [ ] Test endpoint diagnostico

### 4.2 Sistema Redirect Legacy
**Durata**: 25 min  
**Obiettivo**: Compatibilità backward

**Route Legacy**:
- `/login` → `/api/v1/auth/login`
- `/auth/login` → `/api/v1/auth/login`
- `/auth/logout` → `/api/v1/auth/logout`
- `/api/auth/*` → `/api/v1/auth/*`

**Attività**:
- [ ] Middleware redirect intelligenti
- [ ] Preservazione query parameters
- [ ] Gestione POST/PUT/DELETE
- [ ] Test compatibilità completa
- [ ] Documentazione redirect

### 4.3 Ottimizzazione Performance
**Durata**: 25 min  
**Obiettivo**: Performance e scalabilità

**Ottimizzazioni**:
- Cache risoluzione route
- Pool connessioni ottimizzato
- Compression response
- Keep-alive connections
- Circuit breaker pattern

**Attività**:
- [ ] Implementare cache route
- [ ] Ottimizzare pool connessioni
- [ ] Aggiungere compression
- [ ] Configurare keep-alive
- [ ] Test performance

## 🧪 FASE 5: TESTING E VALIDAZIONE (60 min)

### 5.1 Test Funzionalità Core
**Durata**: 20 min  
**Obiettivo**: Validare funzionamento base

**Test Suite**:
- [ ] Test login con route legacy
- [ ] Test API v1 endpoints
- [ ] Test redirect automatici
- [ ] Test header x-api-version
- [ ] Test endpoint diagnostico

### 5.2 Test Compatibilità
**Durata**: 20 min  
**Obiettivo**: Garantire zero breaking changes

**Test Compatibilità**:
- [ ] Frontend esistente funzionante
- [ ] Tutti gli endpoint API attivi
- [ ] CORS funzionante
- [ ] Rate limiting attivo
- [ ] Performance mantenute

### 5.3 Test Stress e Edge Cases
**Durata**: 20 min  
**Obiettivo**: Robustezza sistema

**Test Avanzati**:
- [ ] Load testing routing
- [ ] Test failover server
- [ ] Test malformed requests
- [ ] Test concurrent requests
- [ ] Test memory leaks

## 📚 FASE 6: DOCUMENTAZIONE E CLEANUP (45 min)

### 6.1 Documentazione Tecnica
**Durata**: 20 min  
**Obiettivo**: Documentare architettura

**Documenti da Creare**:
- `docs/technical/routing-architecture.md`
- `docs/technical/api-versioning.md`
- `docs/troubleshooting/routing-debug.md`

### 6.2 Guide Operative
**Durata**: 15 min  
**Obiettivo**: Guide per sviluppatori

**Guide da Creare**:
- Come aggiungere nuova versione API
- Come debuggare problemi routing
- Come aggiungere nuovi endpoint
- Come gestire breaking changes

### 6.3 Cleanup e Ottimizzazione
**Durata**: 10 min  
**Obiettivo**: Pulizia finale

**Attività**:
- [ ] Rimuovere codice obsoleto
- [ ] Ottimizzare import/export
- [ ] Verificare no file temporanei
- [ ] Aggiornare package.json
- [ ] Commit finale con tag

## 🚨 RISCHI E MITIGAZIONI

### Rischi Alti
1. **Breaking Changes Frontend**
   - **Mitigazione**: Test compatibilità estensivi
   - **Fallback**: Rollback immediato

2. **Performance Degradation**
   - **Mitigazione**: Benchmark prima/dopo
   - **Fallback**: Ottimizzazioni incrementali

3. **Complessità Eccessiva**
   - **Mitigazione**: Implementazione graduale
   - **Fallback**: Semplificazione architettura

### Rischi Medi
1. **Configurazione Errata**
   - **Mitigazione**: Validazione automatica
   - **Fallback**: Configurazione di default

2. **Memory Leaks**
   - **Mitigazione**: Monitoring memoria
   - **Fallback**: Restart automatico

## 📋 CHECKLIST FINALE

### Pre-Implementazione
- [ ] Backup configurazioni attuali
- [ ] Test baseline funzionamento
- [ ] Preparazione ambiente test
- [ ] Verifica dipendenze

### Durante Implementazione
- [ ] Test incrementali ogni fase
- [ ] Documentazione real-time
- [ ] Backup prima modifiche critiche
- [ ] Monitoring performance

### Post-Implementazione
- [ ] Test completo funzionalità
- [ ] Verifica performance
- [ ] Documentazione aggiornata
- [ ] Training team se necessario

## 🎯 DELIVERABLE FINALI

1. **Sistema Routing Centralizzato** - RouterMap unificato
2. **API Versioning Completo** - Supporto v1/v2/future
3. **Compatibilità Legacy** - Zero breaking changes
4. **Sistema Diagnostico** - Endpoint /routes live
5. **Logging Avanzato** - Tracciamento completo
6. **Documentazione Completa** - Guide tecniche e operative
7. **Performance Ottimizzate** - Miglioramenti misurabili
8. **Manutenibilità Massima** - Codice pulito e modulare

---

**Prossimo Step**: Iniziare Fase 1 - Analisi Stato Attuale  
**Responsabile**: AI Assistant  
**Timeline**: 4-6 ore totali  
**Success Criteria**: Sistema routing 100% funzionante con architettura ottimizzata