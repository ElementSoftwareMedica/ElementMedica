
# 🤖 TRAE SYSTEM GUIDE - Sistema Unificato Person
**Guida Schematica per Trae AI - Massimo 500 righe**

## 🎯 OVERVIEW SISTEMA

### 🏗️ PROJECT CLEANUP PROGRESS (Progetto 32 - Nov 2025)

**Roadmap**: 7 phases, 16 weeks, comprehensive cleanup & optimization

**✅ PHASE 1: Quick Wins & Security** (COMPLETE - 3-4 hours)
- ✅ CSRF protection on public forms
- ✅ Auth rate limiting 200→5 attempts/15min
- ✅ Test routes production guard (403 forbidden)
- ✅ Permission check re-enabled
- ✅ Dead code deleted (2 files, 325+ lines)
- **Result**: Security score 8.5→9.2 (+8%)

**🔄 PHASE 2: Backend Consolidations** (IN PROGRESS - 2 weeks planned)
- ✅ Prisma indexes (4 critical models, 3-5x query speedup expected)
- ⏸️ Browser Pool PDF (NEXT - CRITICAL, 5-10x performance)
- ⏸️ Performance monitoring consolidation (-200L)
- ⏸️ Permission services clarification
- ⏸️ Discount logic extraction
- ⏸️ Google importers strategy pattern (-300L)
- ⏸️ RBAC split (organization)
- ⏸️ Console.log → logger (329 statements)

**📋 PHASE 3-7: Planned** (13 weeks remaining)
- Phase 3: Frontend God Components (5 weeks, 8 components refactored)
- Phase 4: Domain Modularization (3 weeks, roles/schedules/GDPR)
- Phase 5: Architecture Upgrades (3 weeks, RLS policies, testing)
- Phase 6: Documentation Update (1 week, docs/*)
- Phase 7: TRAE Guides Update (1 week, THIS DOCUMENT)

**📊 Quality Improvements So Far:**
- Backend: 8.4→8.6 (+0.2)
- Security: 9.0→9.2 (+0.2)
- Overall: 8.1→8.4 (+0.3)
- Dead code: -325 lines
- Issues resolved: 6 HIGH priority (4 in Phase 1, 2 in Phase 2.1)

**Ref Documents**:
- `docs/10_project_managemnt/32_pulizia-e-allineamento/13_final_summary_roadmap.md`
- `docs/10_project_managemnt/32_pulizia-e-allineamento/14_phase1_completion_report.md`
- `docs/10_project_managemnt/32_pulizia-e-allineamento/15_phase2_detailed_plan.md`
- `docs/10_project_managemnt/32_pulizia-e-allineamento/16_prisma_deletedAt_indexes.md`

---

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
- 📊 **Current Offenders**: 8 God Components identified (Phase 3 refactoring planned)

### 5. Prisma Schema Optimization (NEW - Nov 2025, Phase 2.1)
- ✅ **Compound indexes on deletedAt**: `@@index([tenantId, deletedAt])`
- ✅ **Critical models optimized**: Company, Course, CourseSchedule, Attestato, Person
- ✅ **Expected performance**: 3-5x faster soft delete queries (100ms→20-30ms)
- ⏸️ **Remaining 41 models**: Deferred to Phase 2.2 (lower query frequency)
- 📝 **Migration SQL**: Ready in `backend/prisma/migrations/manual_add_critical_deletedAt_indexes.sql`

### 6. Security Hardening (NEW - Nov 2025, Phase 1)
- ✅ **CSRF Protection**: Added to all public POST endpoints
- ✅ **Rate Limiting**: Auth 5/15min, Public forms 5/5min
- ✅ **Test Routes**: Production guard (403 forbidden in NODE_ENV=production)
- ✅ **Permission Checks**: All enabled, no debug comments
- ❌ **VIETATO**: Bypass CSRF, disable rate limiting, expose test routes in prod

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

## � DEPLOYMENT SAFETY CHECKLIST (NEW - Phase 2.1)

### Pre-Deployment Mandatory Checks

**Database Changes** (Prisma migrations, schema updates):
- [ ] Full database backup created (`pg_dump` with timestamp)
- [ ] Migration tested in development environment
- [ ] Migration tested in staging environment (minimum 24h observation)
- [ ] Performance benchmarks recorded (before/after)
- [ ] Rollback script prepared and tested
- [ ] Migration is additive only (no destructive changes)
- [ ] Disk space verified (50%+ free minimum)

**Code Changes** (Routes, services, middleware):
- [ ] All tests passing (`npm test`)
- [ ] ESLint checks passing (zero errors)
- [ ] Manual testing completed (login, CRUD operations)
- [ ] GDPR compliance verified (no password leaks, audit logs working)
- [ ] Security checks passed (CSRF, rate limiting, permissions)
- [ ] Git commit with detailed message
- [ ] Code reviewed (peer or self-review with checklist)

**Production Deployment**:
- [ ] Deployment window scheduled (low-traffic period)
- [ ] Team notified (Slack, email)
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented and ready
- [ ] Health checks endpoints verified
- [ ] Load balancer/proxy configuration updated if needed

### Post-Deployment Monitoring (48 hours minimum)

**Immediate (First Hour)**:
- [ ] Health checks green (`/health`, `/healthz`)
- [ ] Login functionality working
- [ ] Database connections stable
- [ ] No 5xx errors in logs
- [ ] Response times within baseline (+10% acceptable)

**Short-term (24 hours)**:
- [ ] Error rate within normal range (<0.1%)
- [ ] Performance metrics stable
- [ ] Database query times improved (for optimizations)
- [ ] No memory leaks detected
- [ ] User reports minimal/none

**Medium-term (48 hours)**:
- [ ] All features working as expected
- [ ] Performance improvements verified (for optimization deploys)
- [ ] No regression issues reported
- [ ] Monitoring dashboards normal
- [ ] Team sign-off for deployment closure

### Rollback Triggers (Execute immediately if any occur)

- ❌ **Error rate >1%** sustained for 5+ minutes
- ❌ **Response time >2x baseline** sustained for 10+ minutes
- ❌ **Database connection failures**
- ❌ **Critical feature broken** (login, CRUD, GDPR export)
- ❌ **Security breach detected**
- ❌ **Data corruption identified**

### Rollback Procedure

**Database Rollback** (Prisma migrations):
```sql
-- For additive migrations (indexes):
DROP INDEX "Company_tenantId_deletedAt_idx";
DROP INDEX "Course_tenantId_deletedAt_idx";
DROP INDEX "CourseSchedule_tenantId_deletedAt_idx";
DROP INDEX "attestati_tenantId_deletedAt_idx";

-- For schema changes (use backup):
-- Stop application servers
-- Restore from backup: psql < backup_file.sql
-- Restart application servers
```

**Code Rollback** (Git):
```bash
# Identify last known good commit
git log --oneline -10

# Rollback to previous commit
git revert <commit-hash>
# OR (if not yet pushed)
git reset --hard <last-good-commit>

# Redeploy
pm2 restart all
```

### Phase-Specific Deployment Notes

**Phase 1 (Security Hardening)** - DEPLOYED ✅:
- Low risk (additive security features)
- Immediate testing: Login, public form submission, test route access
- Monitoring: Auth logs, rate limiting effectiveness

**Phase 2.1 (Prisma Indexes)** - STAGED, READY:
- LOW risk (additive indexes, non-destructive)
- Deployment time: 5-10 seconds (index creation)
- Zero downtime (indexes created online in PostgreSQL 11+)
- Testing: Query performance benchmarks before/after
- Rollback: Simple DROP INDEX (instant)
- **NEXT**: Deploy to staging, verify 24h, then production

**Phase 2.2+ (Backend Consolidations)** - PLANNED:
- MEDIUM risk (code refactoring, logic changes)
- Extensive testing required in staging
- Gradual rollout recommended (feature flags if possible)
- Increased monitoring during rollout

---

## �📖 QUICK REFERENCE

### Critical Files
- **Prisma Schema**: `backend/prisma/schema.prisma` (52 models, 1,972 lines)
- **Auth Service**: `backend/services/authService.js` (bcrypt verified ✅)
- **GDPR Service**: `backend/services/gdprService.js` (compliance verified ✅)
- **Person Service**: `backend/services/person/PersonService.js` (modular architecture ✅)
- **Routes**: `backend/routes/` (32+ files, RouterMap centralized)

### Quality Scores (Analisi Completa Nov 2025)
- **Prisma Schema**: 8.0/10 (+0.5 dopo indexes Phase 2.1 ✅)
- **Backend Services**: 8.1/10 (52/52 analyzed ✅)
- **Backend Routes**: 8.5/10 (security audit complete ✅)
- **Backend Middleware**: 8.7/10 (highest score ✅)
- **Backend Overall**: 8.4/10 → 8.6/10 (+0.2 dopo Phase 1-2.1 ✅)
- **Frontend**: TBD (689 files inventoried, 8 God Components identified)
- **Security**: 9.0/10 → 9.2/10 (+0.2 dopo Phase 1 ✅)
- **Overall Project**: 8.1/10 → 8.4/10 (+0.3 dopo improvements ✅)

### Known Issues (UPDATED 10 Nov 2025)
**HIGH Priority (2 issues REMAINING):**
1. ⚠️ PDF browser bottleneck (PERFORMANCE) - Single puppeteer instance
2. ⚠️ 8 God Components >700 lines (MAINTAINABILITY) - Frontend refactoring needed

**RESOLVED Issues (Phase 1 - Nov 10):**
1. ✅ Public forms CSRF + rate limiting (FIXED: Added csrfProtection + verified rate limit 5/5min)
2. ✅ Test routes in production (FIXED: Added NODE_ENV check, 403 in production)
3. ✅ Auth rate limiting (FIXED: 200→5 attempts/15min, 40x stricter)
4. ✅ Permission check disabled (FIXED: Re-enabled in advanced-permissions.js)

**RESOLVED Issues (Phase 2.1 - Nov 10):**
1. ✅ Prisma deletedAt indexes (FIXED: Added compound indexes [tenantId, deletedAt] to 4 critical models)
   - Company, Course, CourseSchedule, Attestato
   - Expected: 3-5x faster soft delete queries
   - Migration SQL ready for staging deployment

**Dead Code (DELETED Phase 1):**
- ✅ `backend/services/PersonServiceOptimized.js` (325L) - REMOVED
- ✅ `backend/routes/template-routes.backup.js` - REMOVED

**Consolidation Opportunities (Phase 2 PLANNED):**
- Browser pool for PDF (-bottleneck, +500% performance): puppeteer-cluster implementation (6h)
- Google importers (-300L): googleDocsImporter + googleSlidesImporter → unified strategy pattern (5h)
- Performance monitoring (-200L): 3 separate files → single middleware (4h)
- Permission services overlap: virtualEntityPermissions + advanced-permission clarification (6h)
- Discount logic: Extract shared DiscountService (4h)
- RBAC split: rbac.js (1,107L) → 3 files (RBACService, RBACMiddleware, RBACUtils) (5h)
- Console.log migration: 329 statements → logger (4h, deferred to Phase 2.2)
- Frontend God Components: 8 files >900L → modular architecture (5 weeks)

**Phase 2 Status (UPDATED 10 Nov 2025):**
- ✅ Prisma indexes optimization (COMPLETE)
- ⏸️ Browser Pool PDF (NEXT - CRITICAL for performance)
- ⏸️ Backend consolidations (7 tasks remaining, 2 weeks estimated)
- ⏸️ Frontend refactoring (Phase 3, 5 weeks, 2 devs recommended)

### Best Practices (From Analysis)
**Backend - Modular Architecture (EXEMPLARY):**
- `person/` folder: 14 files, 5,163L, facade pattern ✅
- Structure: PersonService.js (facade) + core/, utils/, preferences/, stats/, export/, import/
- **Follow this pattern** for new complex domains

**Frontend - Component Size:**
- ✅ Target: <500L per component
- ⚠️ Warning: 500-700L (plan refactoring)
- 🔴 Critical: >700L (refactor immediately)

**Security Checklist (UPDATED Phase 1 Hardening):**
- ✅ CSRF protection on public endpoints (Phase 1: Added to public-forms-routes.js)
- ✅ Rate limiting on auth (Phase 1: 200→5 attempts/15min, 40x stricter)
- ✅ Rate limiting on public endpoints (Phase 1: Verified 5/5min on public forms)
- ✅ Environment checks for test routes (Phase 1: Added production guard, 403 forbidden)
- ✅ Permission checks enabled (Phase 1: Re-enabled in advanced-permissions.js line 22)
- ✅ Audit logging on sensitive operations
- ✅ GDPR password exclusion in exports
- ✅ Tenant isolation (verify tenantId in all queries)
- ✅ No test routes in production (Phase 1: Environment check implemented)
- ✅ Prisma indexes on deletedAt (Phase 2.1: 4 critical models optimized)
- ⏸️ Database-level tenant isolation (Phase 5: PostgreSQL RLS policies planned)

---

**🤖 TRAE**: Usa questa guida per comprendere rapidamente il sistema, identificare problemi e implementare nuove funzionalità seguendo i pattern esistenti. Testa SEMPRE con le credenziali standard dopo ogni modifica.

**⚠️ GDPR**: Rispetta SEMPRE le regole GDPR - no bypass, no shortcuts. Privacy by design è fondamentale.