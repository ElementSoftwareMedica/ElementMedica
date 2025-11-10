
# 🤖 TRAE SYSTEM GUIDE - Sistema Unificato Person
**Guida Schematica per Trae AI - Massimo 500 righe**

## 🎯 OVERVIEW SISTEMA

### Architettura 3-Server
```
Frontend (5173) → Proxy Server (4003) → API Server (4001)
                                     → Documents Server (4002)
```

### Credenziali Test OBBLIGATORIE
- **Identifier**: `admin@example.com`
- **Password**: `Admin123!`
- **Ruolo**: ADMIN
- **⚠️ MAI MODIFICARE** senza autorizzazione esplicita

## 🚨 REGOLE ASSOLUTE

### 1. Entità Unificata
- ✅ **SOLO Person** (entità unificata utenti)
- ❌ **VIETATO** User, Employee (obsolete)
- ✅ **SOLO PersonRole** (sistema ruoli)
- ❌ **VIETATO** UserRole, Role (obsolete)

### 2. Soft Delete Standard
- ✅ **SOLO deletedAt** (timestamp)
- ❌ **VIETATO** eliminato, isDeleted (obsoleti)

### 3. Porte Server FISSE
- **API Server**: 4001 (NON MODIFICARE MAI)
- **Proxy Server**: 4003 (NON MODIFICARE MAI)
- **Frontend**: 5173
- **Documents**: 4002 (opzionale)

### 4. Component Size Limits (NEW - Nov 2025)
- ✅ **MAX 500 lines** per component/service/route file
- ❌ **God Components VIETATI** (>500L = refactor obbligatorio)
- ✅ Extract hooks, sub-components, utils when approaching limit

## 🔄 SISTEMA ROUTING AVANZATO (Progetto 19)

### RouterMap Centralizzata
```javascript
// File: backend/proxy/config/RouterMap.js
const ROUTER_MAP = {
  versions: ['v1', 'v2'],
  services: {
    api: { host: 'localhost', port: 4001, protocol: 'http' },
    documents: { host: 'localhost', port: 4002, protocol: 'http' },
    auth: { host: 'localhost', port: 4001, protocol: 'http' }
  },
  routes: {
    v1: { /* route v1 */ },
    v2: { /* route v2 */ }
  }
};
```

### Endpoint Principali
- **Frontend**: `http://localhost:4003`
- **API v1**: `http://localhost:4003/api/v1/*`
- **API v2**: `http://localhost:4003/api/v2/*`
- **Diagnostica**: `http://localhost:4003/routes` (solo admin)

### Legacy Redirects Automatici
```
/login → /api/v1/auth/login
/logout → /api/v1/auth/logout
/dashboard → /api/v1/dashboard
```

### Endpoint Diagnostici
```bash
GET /routes/health    # Stato sistema routing
GET /routes/stats     # Statistiche routing
GET /routes/config    # Configurazione completa
GET /routes           # Lista tutte le route
```

## 🛠️ MIDDLEWARE STACK (Ordine Critico)

### Proxy Server (12 middleware)
1. **Request ID** - Tracking richieste
2. **Security Headers** - Helmet, CSP
3. **CORS Dinamico** - Basato su pattern
4. **Rate Limiting** - Dinamico per endpoint
5. **Request Logging** - Audit trail
6. **Body Parser** - JSON/URL-encoded
7. **Static Files** - Servizio file statici
8. **Version Manager** - Header x-api-version
9. **Route Logger** - Logging route specifico
10. **Legacy Redirects** - Redirect automatici
11. **Advanced Routing** - Sistema routing principale
12. **Dynamic Proxy** - Proxy verso backend

### API Server (Ottimizzato)
- **Body Parser V38** - Applicato a router versionati
- **Security** - Helmet, rate limiting
- **Validation** - Input validation centralizzata
- **Versioning** - Supporto v1/v2

## 🧪 TEST OBBLIGATORI

### Test Base (Sempre)
```bash
# Health check server
curl http://localhost:4001/health
curl http://localhost:4003/health

# Test login (CRITICO)
curl -X POST http://localhost:4003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}'
```

### Test Routing Avanzato
```bash
# Sistema routing
curl http://localhost:4003/routes/health
curl http://localhost:4003/routes/stats

# Legacy redirects
curl -I http://localhost:4003/login

# Versioning API
curl -H "x-api-version: v1" http://localhost:4003/api/v1/health
curl -H "x-api-version: v2" http://localhost:4003/api/v2/health

# Body parsing V38
curl -X POST http://localhost:4003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}' -v
```

### Test CORS
```bash
curl -X OPTIONS http://localhost:4003/api/auth/login \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST"
```

## 🚨 PROBLEMI COMUNI E SOLUZIONI

### 1. Login 401 Unauthorized
**Causa**: Body parsing non funziona
**Soluzione**: Verificare Sistema V38 attivo
```bash
pm2 logs api-server | grep "Body parser applied to versioned routers"
```

### 2. Routing Non Funziona
**Causa**: RouterMap non caricata
**Soluzione**: Verificare configurazione
```bash
curl http://localhost:4003/routes/config | jq '.services'
```

### 3. CORS Errors
**Causa**: Configurazione CORS dinamico
**Soluzione**: Verificare pattern CORS
```bash
curl http://localhost:4003/routes/config | jq '.cors'
```

### 4. Rate Limiting Issues
**Causa**: Configurazione rate limiting dinamico
**Soluzione**: Verificare esenzioni
```bash
curl -I http://localhost:4003/routes/health  # Dovrebbe essere esente
```

### 5. Curl Restituisce Solo Path (Trae AI)
**Causa**: Limitazione curl nel terminale Trae AI
**Soluzione**: Usare script Node.js per test diretti
```bash
# ❌ curl può restituire solo il path invece del JSON
curl http://localhost:4001/api/v1/companies/test

# ✅ Usare script Node.js per test affidabili
node -e "
const http = require('http');
const req = http.request('http://localhost:4001/api/v1/companies/test', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.parse(data)));
});
req.end();
"
```

### 6. Permessi Mancanti per ADMIN
**Causa**: Permessi non aggiunti nella sezione admin di auth.js
**Soluzione**: Verificare sezione `if (isAdmin)` in `/verify`
```bash
# Test permessi
node test-simple-login-verify.cjs | grep "persons:"
```

## 🔐 SISTEMA PERMESSI (CRITICO)

### Aggiunta Nuovi Permessi
**File**: `backend/routes/v1/auth.js` - Endpoint `/verify`

#### ⚠️ ERRORI COMUNI IDENTIFICATI
1. **Permessi mancanti in sezione admin** - Aggiungere SEMPRE nella sezione `if (isAdmin)`
2. **Ordine esecuzione switch/admin** - Switch eseguito PRIMA di admin (può sovrascrivere)
3. **Server non riavviato** - Modifiche non attive senza restart

#### ✅ PROCEDURA CORRETTA
```javascript
// 1. Aggiungere nella sezione switch (se necessario)
case 'VIEW_PERSONS':
  permissions['persons:read'] = true;
  permissions['persons:view_employees'] = true;
  permissions['persons:view_trainers'] = true;
  break;

// 2. SEMPRE aggiungere nella sezione admin
if (isAdmin) {
  // ... altri permessi ...
  permissions['persons:read'] = true;
  permissions['persons:manage'] = true;
  permissions['persons:view_employees'] = true;
  permissions['persons:view_trainers'] = true;
  // ... altri permessi ...
}
```

#### 🧪 TEST PERMESSI OBBLIGATORIO
```bash
# Script test permessi
node test-simple-login-verify.cjs

# Verificare output:
# - Login successful: true
# - User role: ADMIN
# - Tutti i permessi richiesti: true
```

#### 🚨 DEBUGGING PERMESSI
```javascript
// Aggiungere debug temporaneo in auth.js
console.log('🔍 Admin section executed:', isAdmin);
console.log('🔍 Persons permissions:', {
  'persons:read': permissions['persons:read'],
  'persons:manage': permissions['persons:manage']
});
```

## 🔍 DEBUGGING AVANZATO

### Log Analysis
```bash
# Proxy server logs
pm2 logs proxy-server | grep -E "(ROUTING|MIDDLEWARE|ERROR)"

# API server logs
pm2 logs api-server | grep -E "(V38|BODY|LOGIN)"

# Routing specifico
pm2 logs proxy-server | grep -E "(RouterMap|VersionManager)"
```

### Diagnostica Sistema
```bash
# Stato processi
pm2 status

# Configurazione routing
curl http://localhost:4003/routes | jq '.'

# Statistiche performance
curl http://localhost:4003/routes/stats | jq '.performance'
```

## 📁 STRUTTURA FILE CRITICI

### Routing System
```
backend/proxy/
├── config/RouterMap.js          # Configurazione centralizzata
├── middleware/
│   ├── advancedRouting.js       # Sistema routing principale
│   ├── versionManager.js        # Gestione versioni API
│   └── proxyManager.js          # Proxy dinamico
├── utils/
│   └── routeLogger.js           # Logging route
└── index.js                     # Entry point proxy
```

### API Server
```
backend/
├── servers/api-server.js        # Server API ottimizzato
├── middleware/
│   └── bodyParsingMiddleware.js # Body parsing V38
└── routes/
    ├── v1/                      # Route API v1
    └── v2/                      # Route API v2
```

## 🚫 COMANDI VIETATI

### Server Management
- `pm2 restart` (senza autorizzazione)
- `kill -9` (sui processi server)
- Modifica porte 4001/4003
- Riavvio server senza planning

### Sviluppo
- Uso entità obsolete (User, Employee)
- Campi obsoleti (eliminato, isDeleted)
- File temporanei in root/backend
- Modifiche senza test login

## ✅ COMANDI PERMESSI

### Diagnostica
- `pm2 status`
- `pm2 logs [server-name]`
- `curl` per health check
- `ps aux | grep node`

### Test
- Tutti i curl di test sopra indicati
- Test login con credenziali standard
- Verifica endpoint diagnostici

## 🎯 IDENTIFICAZIONE PROBLEMI

### Sintomi Comuni
1. **404 su API**: Problema routing → Test `/routes/health`
2. **401 su login**: Problema body parsing → Test V38
3. **CORS errors**: Problema configurazione → Test OPTIONS
4. **429 errors**: Rate limiting → Verificare esenzioni
5. **Timeout**: Middleware performance → Check logs
6. **Curl restituisce path**: Limitazione Trae AI → Usare Node.js
7. **Permessi mancanti ADMIN**: Sezione admin incompleta → Test permessi

### Escalation
- **Body parsing issues**: Sistema V38 non attivo
- **Routing down**: RouterMap non caricata
- **Server down**: Health check fallito
- **Performance**: Middleware timeout

## 📊 METRICHE SISTEMA

### Performance Target
- **Response time**: < 200ms (API)
- **Routing overhead**: < 10ms
- **Memory usage**: < 512MB per server
- **CPU usage**: < 50% normale

### Monitoring
```bash
# Performance routing
curl http://localhost:4003/routes/stats | jq '.performance'

# Memory usage
ps aux | grep node | awk '{print $4, $11}'

# Response times
curl -w "@curl-format.txt" http://localhost:4003/api/v1/health
```

---

## 🔐 SECURITY & GDPR (Analisi 32_pulizia-e-allineamento)

### Security Verification Status ✅

**Password Security**:
- bcrypt salt 12 (verified in authService.js)
- JWT with expiry and refresh tokens
- Centralized via JWTService

**GDPR Compliance**:
- Password NOT included in data export ✅
- Anonymization pattern correct: `deleted_{personId}@anonymized.local` ✅
- Audit logging: GdprAuditLog, SecurityAuditLog, ActivityLog
- Consent management implemented
- Right to be forgotten with soft delete

**Multi-Tenant Isolation**:
- Service-level tenantId filtering (all services)
- ⚠️ No database-level isolation (RLS policies recommended)

### GDPR Checklist (Per Feature)
- [ ] Consent required before data collection
- [ ] Audit log for data access
- [ ] Soft delete with deletedAt (no hard delete)
- [ ] Anonymization for right to be forgotten
- [ ] Data portability export implemented
- [ ] No password/secrets in logs or exports

---

## 🐛 KNOWN ISSUES (Progetto 32)

### High Priority (4)
1. **Preventivo Dual Relations**: Direct + M2M pivot (standardize pattern)
2. **PDF Browser Bottleneck**: Single puppeteer instance (implement pool)
3. **Tenant Isolation**: Service-only, no DB-level (consider RLS)
4. **Person Model Complexity**: 50+ fields, 30+ relations (vertical split?)

### Dead Code (1)
- `PersonServiceOptimized.js` (325 lines, zero imports) → DELETE

### Potential Duplications (3)
- googleDocsImporter + googleSlidesImporter
- virtualEntityPermissions + advanced-permission
- codici-sconto + preventivi-service

**Ref**: `docs/10_project_managemnt/32_pulizia-e-allineamento/`

---

## 📖 QUICK REFERENCE

### Critical Files
- **Prisma Schema**: `backend/prisma/schema.prisma` (52 models, 1,972 lines)
- **Auth Service**: `backend/services/authService.js` (bcrypt verified ✅)
- **GDPR Service**: `backend/services/gdprService.js` (compliance verified ✅)
- **Person Service**: `backend/services/person/PersonService.js` (modular architecture ✅)
- **Routes**: `backend/routes/` (32+ files, RouterMap centralized)

### Quality Scores (Analisi Completa Nov 2025)
- **Prisma Schema**: 7.5/10
- **Backend Services**: 8.1/10 (52/52 analyzed ✅)
- **Backend Routes**: 8.5/10 (security audit complete ✅)
- **Backend Middleware**: 8.7/10 (highest score ✅)
- **Backend Overall**: 8.4/10 (excellent baseline)
- **Frontend**: TBD (689 files inventoried, 8 God Components identified)
- **Security**: 9/10 (excellent, GDPR compliant ✅)
- **Overall Project**: 8.1/10 (solid foundation)

### Known Issues (Nov 2025)
**HIGH Priority (6 issues):**
1. ⚠️ Public forms missing CSRF + rate limiting (SECURITY)
2. ⚠️ Test routes in production (SECURITY)
3. ⚠️ Preventivo dual relation pattern (ARCHITECTURE)
4. ⚠️ PDF browser bottleneck (PERFORMANCE)
5. ⚠️ 8 God Components >700 lines (MAINTAINABILITY)
6. ⚠️ Roles domain complexity 3,100L (ARCHITECTURE)

**Dead Code (DELETE immediately):**
- `backend/services/PersonServiceOptimized.js` (325L, zero imports)
- `backend/routes/template-routes.backup.js` (backup in production)

**Consolidation Opportunities:**
- Google importers (-300L): googleDocsImporter + googleSlidesImporter
- Performance monitoring (-200L): 3 separate files
- Permission services overlap: virtualEntityPermissions + advanced-permission
- Frontend God Components: 13 files >600L (9,500L total)

### Best Practices (From Analysis)
**Backend - Modular Architecture (EXEMPLARY):**
- `person/` folder: 14 files, 5,163L, facade pattern ✅
- Structure: PersonService.js (facade) + core/, utils/, preferences/, stats/, export/, import/
- **Follow this pattern** for new complex domains

**Frontend - Component Size:**
- ✅ Target: <500L per component
- ⚠️ Warning: 500-700L (plan refactoring)
- 🔴 Critical: >700L (refactor immediately)

**Security Checklist:**
- ✅ CSRF protection on public endpoints
- ✅ Rate limiting on auth + public endpoints (5/5min login, 5/15min public)
- ✅ Environment checks for test routes
- ✅ Permission checks enabled (no debug comments)
- ✅ Audit logging on sensitive operations
- ✅ GDPR password exclusion in exports
- ✅ Tenant isolation (verify tenantId in all queries)

---

**🤖 TRAE**: Usa questa guida per comprendere rapidamente il sistema, identificare problemi e implementare nuove funzionalità seguendo i pattern esistenti. Testa SEMPRE con le credenziali standard dopo ogni modifica.

**⚠️ GDPR**: Rispetta SEMPRE le regole GDPR - no bypass, no shortcuts. Privacy by design è fondamentale.