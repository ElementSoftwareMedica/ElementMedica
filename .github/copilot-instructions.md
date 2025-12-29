# GitHub Copilot Instructions - ElementMedica

**CRITICAL**: Queste istruzioni devono essere rispettate ad OGNI richiesta.

## 🚨 PRINCIPI ASSOLUTI

### 1. VERIFICA PRIMA DI MODIFICARE
- ✅ SEMPRE leggere il file COMPLETO prima di modificare
- ✅ Verificare import esistenti (NO duplicati)
- ✅ Controllare TypeScript errors DOPO ogni modifica
- ✅ Test di compilazione prima di dichiarare successo
- ❌ MAI assumere strutture senza verificare
- ❌ MAI confermare senza essere CERTI

### 2. GESTIONE ERRORI
- ✅ Leggere messaggi errore COMPLETI
- ✅ Verificare line numbers esatti
- ✅ Controllare import duplicati
- ✅ Eseguire `get_errors` dopo modifiche
- ❌ MAI ignorare errori "dovrebbero andare via"

### 3. IMPORT PATTERNS
- ✅ Leggere prime 50 righe per vedere import esistenti
- ✅ NO import duplicati (verificare PRIMA)
- ✅ Rispettare path relativi esistenti
- ✅ Services: `backend/services/[domain]/[service].js`
- ✅ Utils: `backend/utils/[util].js`
- ❌ MAI assumere path senza verificare con file_search
- ❌ MAI import da file inesistenti

### 4. MULTI-TENANCY (NON NEGOZIABILE)
- ✅ SEMPRE filtrare per `tenantId` in OGNI query
- ✅ SEMPRE includere `deletedAt: null` (soft delete)
- ✅ Middleware verifica `req.person.tenantId === resource.tenantId`
- ✅ Tests obbligatori per tenant isolation (7/7 passing)
- ✅ Pattern: `where: { tenantId, deletedAt: null }`
- ❌ MAI query senza tenantId (tranne admin global)
- ❌ MAI assumere single-tenant

### 5. GDPR COMPLIANCE (OBBLIGATORIA)
- ✅ Soft delete: `deletedAt DateTime?` su TUTTE le entità
- ✅ Audit trail: GdprAuditLog automatico su modifiche PII
- ✅ Consent tracking: ConsentRecord prima di data collection
- ✅ Pattern anonymization: `deleted_{id}@anonymized.local`
- ✅ Password: bcrypt salt 12, NEVER in logs/exports
- ❌ MAI hard delete dati PII
- ❌ MAI skip consent checks
- ❌ MAI password in plain text/logs/export

### 6. TYPESCRIPT STRICT
- ✅ NO `any` senza giustificazione documentata
- ✅ Prisma schema è source of truth per tipi database
- ✅ TypeScript strict mode obbligatorio
- ✅ Generare types da Prisma: `npx prisma generate`
- ✅ Validazione input con Joi/Zod prima del database
- ✅ Zero errori TypeScript prima di completare
- ❌ MAI ignorare errori TypeScript
- ❌ MAI assumere tipi senza verifica

### 7. SECURITY FIRST
- ✅ CSRF protection su POST pubblici (csrfProtection middleware)
- ✅ Rate limiting: auth 5/15min, forms 5/5min
- ✅ Test routes: 404 in production (NODE_ENV check)
- ✅ Permission checks: requirePermission middleware
- ✅ Input sanitization: escape HTML, validate types
- ✅ SQL injection protection: Prisma parametrizzato
- ✅ No PII in logs/tokens
- ❌ MAI bypass security middleware
- ❌ MAI disable CORS in production
- ❌ MAI esporre stack traces in production

### 8. CODE QUALITY
- ✅ Max 500 lines per file (components/services/routes)
- ✅ Hooks Composition Pattern per componenti >250L
- ✅ Single Responsibility Principle
- ✅ DRY: Extract shared logic in utils/
- ✅ Documentation: JSDoc per funzioni pubbliche
- ✅ Naming: PascalCase componenti, camelCase funzioni
- ❌ MAI God Components/Services >500L
- ❌ MAI duplicazione codice >10L
- ❌ MAI console.log in production (solo development)
- ❌ MAI TODO senza ticket
- ❌ MAI hardcoded credentials

### 9. ENTITÀ UNIFICATA PERSON
- ✅ SOLO Person (entità unificata per tutti gli utenti)
- ❌ MAI User, Employee (entità obsolete)
- ✅ SOLO PersonRole + RoleType enum
- ❌ MAI UserRole, Role (obsoleti)

### 9.1 AUTENTICAZIONE: req.person (OBBLIGATORIO)
- ✅ SEMPRE usare `req.person` per accedere all'utente autenticato
- ✅ Pattern standard: `const { tenantId, id: personId } = req.person`
- ✅ Accesso proprietà: `req.person.tenantId`, `req.person.id`, `req.person.email`
- ✅ SEMPRE usare `req.person.tenantId` per tenantId nelle route autenticate
- ❌ MAI usare `req.user` (obsoleto, rimosso dal middleware)
- ❌ MAI usare `req.tenantId` (obsoleto, rimosso dal middleware auth.js)
- ❌ MAI usare `req.userId` (obsoleto, mai esistito come pattern standard)
- ❌ MAI usare fallback legacy come `req.tenantId || req.person?.tenantId`
- ❌ MAI usare `req.person || req.user` (backward compat rimosso)
- ❌ MAI usare `req.user || req.person` (backward compat rimosso)

### 10. DATABASE MIGRATIONS
- ✅ SOLO migrazioni additive (no DROP column)
- ✅ Backup obbligatorio prima di migration
- ✅ Test in development → staging → production
- ✅ Rollback script preparato PRIMA di deploy
- ✅ Performance benchmark pre/post migration
- ✅ Soft delete mandatory: `deletedAt DateTime?`
- ✅ Multi-tenancy required: `tenantId String` + index
- ✅ Compound indexes: `@@index([tenantId, deletedAt])`
- ✅ 100+ indexes target (FK + composite + optimization)
- ✅ 20+ enums target (status, type, role fields)
- ✅ Explicit relations: `onDelete` behavior obbligatorio
- ❌ MAI migrazioni destructive senza DBA review
- ❌ MAI production migration senza staging test
- ❌ MAI hard delete dati PII
- ❌ MAI implicit relations o missing onDelete

### 11. TESTING OBBLIGATORIO
- ✅ Unit test per business logic critica
- ✅ Integration test per API endpoints
- ✅ E2E test per flussi critici (login, CRUD)
- ✅ Security test per tenant isolation (7/7 passing)
- ✅ Test coverage target: 75%+ (current 75%)
- ✅ SEMPRE test login dopo modifiche auth
- ❌ MAI production deploy senza test passing

### 12. ERROR HANDLING PATTERNS
- ✅ Logger centralizzato: `import logger from '../../utils/logger.js'`
- ✅ NO console.log in production (solo development)
- ✅ Structured logging: `logger.info({ userId, action }, 'message')`
- ✅ Error context: sempre includere userId, tenantId, ipAddress
- ✅ HTTP status codes: 400 client error, 500 server error, 403 forbidden
- ❌ MAI catch vuoti senza log
- ❌ MAI esporre stack traces in production

### 13. API VERSIONING
- ✅ Versioning obbligatorio: `/api/v1/*`, `/api/v2/*`
- ✅ Header automatico: `x-api-version: v1`
- ✅ Backward compatibility: v1 sempre supportata
- ✅ Breaking changes: SOLO in nuova versione
- ✅ Deprecation: min 6 mesi notice
- ❌ MAI rimuovere v1 endpoints senza migration
- ❌ MAI breaking changes in v1

### 14. COMPONENT REFACTORING (Hooks Composition Pattern)
- ✅ Main component <250L (orchestration only)
- ✅ Module avg <100L per file
- ✅ Hook naming: `use*` prefix
- ✅ File structure: types.ts, index.ts, hooks/, components/, utils/, README.md
- ✅ Quality gates: TypeScript 0 errors, build passed, zero breaking changes
- ✅ Backward compatibility: Preserve default export
- ✅ Documentation: Comprehensive README.md
- ❌ MAI breaking API compatibility
- ❌ MAI missing default export
- ❌ MAI undocumented refactoring

### 15. GESTIONE SERVER (CRITICAL)
- 🚫 **SEVERAMENTE VIETATO SENZA AUTORIZZAZIONE**:
  - `pm2 restart/stop/delete [any-process]`
  - `kill -9 [any-pid]`
  - Modificare porte server (4001, 4002, 4003)
  - `sudo systemctl restart [any-service]`
  - `sudo reboot`
- ✅ **SEMPRE PERMESSI (Diagnostica)**:
  - `pm2 status`, `pm2 logs [process-name]`, `pm2 monit`
  - Health checks: `/health`, `/healthz`, `/routes/health`
  - Log reading, `ps aux`, `netstat`

### 16. ARCHITETTURA 3 SERVER
**PORTE FISSE - NON MODIFICARE MAI:**
- **API Server**: Porta 4001 (Express modular, Prisma, RBAC, GDPR)
- **Documents Server**: Porta 4002 (PDF Puppeteer browser pool)
- **Proxy Server**: Porta 4003 (CORS, rate limiting, routing)
- **Frontend**: Porta 5173 (Vite dev server)

### 17. GDPR ENTITY TEMPLATE (Template Unificato)
Il sistema usa `GDPREntityTemplate` per tutte le entità:
- ✅ ViewModeToggle, AddEntityDropdown, FilterPanel, ColumnSelector
- ✅ Audit trail automatico, data export CSV/JSON
- ✅ Permission control granulare, consent tracking
- ❌ MAI creare pagine entità senza GDPREntityTemplate

## 🔧 WORKFLOW STANDARD

**PRIMA di ogni modifica**:
1. `read_file` - Leggere file completo (almeno prime 50 righe per import)
2. `file_search` - Verificare path se non sicuro
3. `grep_search` - Cercare pattern esistenti
4. Pianificare modifiche

**DURANTE la modifica**:
1. `replace_string_in_file` - Modificare con contesto 3-5 righe
2. NO modifiche multiple senza verificare la prima

**DOPO la modifica**:
1. `get_errors` - Verificare errori TypeScript
2. Leggere file modificato per confermare
3. Test di compilazione se necessario
4. SOLO ALLORA dichiarare successo

## 🚫 COMPORTAMENTI VIETATI

❌ "Dovrebbe funzionare" senza verifica
❌ "Ho applicato le modifiche" senza get_errors
❌ Confermare senza essere CERTI al 100%
❌ Ignorare errori "minori"
❌ Assumere path/strutture senza verificare
❌ Import duplicati (verificare PRIMA)
❌ console.log in production (usare logger)
❌ Hard delete dati PII
❌ Query senza tenantId
❌ Password in export/logs
❌ Bypass security middleware
❌ Breaking changes senza migration
❌ Usare `req.user` invece di `req.person`
❌ Usare `req.person || req.user` (backward compat rimosso)
❌ Usare alert() nel frontend (usare showToast)

## 📋 CHECKLIST PRE-COMMIT

✅ TypeScript 0 errors (verificato con get_errors)
✅ Build passa (npm run build)
✅ NO import duplicati
✅ NO breaking changes
✅ Multi-tenancy verificato (tenantId + deletedAt)
✅ GDPR compliance (soft delete, audit trail)
✅ Security checks (CSRF, rate limiting, permissions)
✅ Code quality (max 500L, DRY, SRP)
✅ Tests passing (se modificati)
✅ Health checks passano (4001, 4002, 4003)

## 🎯 CREDENZIALI TEST OBBLIGATORIE

**NON MODIFICARE MAI SENZA AUTORIZZAZIONE**:
```
Email: admin@example.com
Password: Admin123!
Ruolo: ADMIN (accesso completo)
```

## 🧪 TEST OBBLIGATORI

**Health Checks**:
```bash
curl http://localhost:4001/health  # API Server
curl http://localhost:4002/health  # Documents Server
curl http://localhost:4003/health  # Proxy Server
curl http://localhost:4003/routes/health  # Routing system
```

**Login Test**:
```bash
curl -X POST http://localhost:4003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}'
```

**Unit/Integration Tests**:
```bash
npm test  # All tests (75% coverage, 62/62 passing)
```

## 📚 PATTERN COMUNI

**API Call Pattern**:
```typescript
import { createService } from './serviceFactory';
const service = createService<Entity>('/endpoint');
const entities = await service.getAll({ tenantId });
```

**GDPR Audit Pattern**:
```typescript
await prisma.gdprAuditLog.create({
  data: {
    personId, action: 'UPDATE', dataType: 'PERSON',
    oldData, newData, performedBy: req.person.id,
    ipAddress: req.ip, tenantId: req.person.tenantId
  }
});
```

**Multi-tenancy Pattern**:
```typescript
const entities = await prisma.entity.findMany({
  where: { tenantId: req.person.tenantId, deletedAt: null }
});
```

**Permission Check Pattern**:
```typescript
import { requirePermission } from '../middleware/rbac';
router.post('/entities', requirePermission('entities:write'), controller.create);
```

## 📚 RIFERIMENTI

- `.trae/rules/project_rules.md` - Regole progetto complete (535 linee)
- `.trae/TRAE_SYSTEM_GUIDE.md` - Guida sistema completa (763 linee)
- `docs/technical/AI_ASSISTANT_GUIDE.md` - Workflow AI
- `docs/deployment/deployment-guide.md` - Deployment 3 server
- `docs/troubleshooting/common-issues.md` - Problemi comuni

## 🎯 STATO PROGETTO

**Completion**: 92% (Quality Score 9.8/10)
- Security: 9.7/10 (CSRF ✅, rate limiting ✅, test routes ✅, debug routes protected ✅)
- Performance: 9.5/10 (Bundle -77.5%, load time -75%)
- Database: 9.0/10 (100+ indexes, 20+ enums, soft delete, multi-tenancy)
- Test Coverage: 75% (62/62 tests passing, 100% pass rate)
- Code Quality: 9.5/10 (console.log migrated to logger, legacy patterns removed)

**Project 46 Progress** (2025-12-29):
- ✅ Phase 0-1, 3a, 3b, 6, 7 complete
- ✅ Notification consistency (alert → showToast)
- ✅ req.tenantId/req.userId legacy patterns migrated to req.person.tenantId
- ✅ console.log migrated to structured logger
- ✅ Debug routes protected with NODE_ENV check

---

**🚨 ULTIMA REGOLA**: In caso di dubbio, CHIEDERE invece di assumere!
