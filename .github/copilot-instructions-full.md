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
- ✅ Notification: utilizzare il Toast System per tutte le notifiche (P47)
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

### 9.2 P48 PERSON MULTI-TENANT PATTERN (OBBLIGATORIO)
Una Person può operare su più tenant con dati anagrafici condivisi e dati specifici per tenant.

**Architettura 3-Layer**:
```
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER 1: PERSON                             │
│         Dati anagrafici STATICI e IMMUTABILI                    │
│  (taxCode, firstName, lastName, birthDate, gender, username)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LAYER 2: PERSON TENANT PROFILE                 │
│         Dati DINAMICI specifici per ogni tenant                 │
│    (status, title, email, phone, hourlyRate, iban, notes...)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               LAYER 3: DOMAIN-SPECIFIC ENTITIES                 │
│     Dati di dominio (visite, fatture, corsi, attestati...)      │
└─────────────────────────────────────────────────────────────────┘
```

**Campi in Person (globali, immutabili)**:
- `id`, `taxCode`, `vatNumber` (identificatori univoci)
- `firstName`, `lastName`, `birthDate`, `birthPlace`, `gender`
- `username`, `password` (autenticazione)
- `profileImage`, `gdprConsentDate`

**Campi in PersonTenantProfile (per-tenant, dinamici)**:
- `email`, `phone`, `pec` (contatti - possono variare per tenant!)
- `status`, `title`, `hiredDate`, `endDate`
- `hourlyRate`, `monthlyRate`, `iban` (dati finanziari - variano!)
- `residenceAddress`, `residenceCity`, `postalCode`, `province`
- `companyTenantProfileId`, `siteId`, `repartoId`
- `isPrimary` (indica il profilo principale)
- `notes`, `preferences`

**Query Backend Pattern**:
```javascript
// ✅ CORRETTO - P48 Pattern
const persons = await prisma.person.findMany({
  where: { deletedAt: null },
  include: {
    tenantProfiles: {
      where: { tenantId, deletedAt: null, isActive: true },
      select: { email: true, phone: true, status: true, isPrimary: true }
    }
  }
});

// Flatten per backward compatibility
const flattened = persons.map(p => ({
  ...p,
  email: p.tenantProfiles?.[0]?.email || null,
  phone: p.tenantProfiles?.[0]?.phone || null,
  status: p.tenantProfiles?.[0]?.status || 'PENDING'
}));

// ❌ SBAGLIATO - campi non esistono più su Person
const persons = await prisma.person.findMany({
  where: { tenantId, deletedAt: null },  // ❌ tenantId non su Person
  select: { email: true }  // ❌ email non su Person
});
```

**Regole P48/P63**:
- ✅ `email`, `phone`, `status`, `hourlyRate`, `iban` sono in `PersonTenantProfile`
- ✅ SEMPRE usare `tenantProfiles` include quando serve accedere a questi campi
- ✅ Filtrare `tenantProfiles` con `where: { tenantId, deletedAt: null }`
- ✅ Usare `isPrimary: true` per identificare il profilo principale
- ✅ `req.person.tenantId` è GIÀ risolto dal middleware da PersonTenantProfile
- ❌ MAI cercare `email`, `phone` direttamente su Person model
- ❌ `Person.tenantId` è stato RIMOSSO (P63) - usare PersonTenantProfile
- ❌ MAI assumere che Person abbia un solo tenant

### 9.3 P49 COMPANY MULTI-TENANT PATTERN (OBBLIGATORIO)
Una Company può essere cliente di più tenant con dati anagrafici condivisi e dati commerciali specifici.

**Architettura 3-Layer**:
```
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER 1: COMPANY                            │
│         Dati anagrafici STATICI e IMMUTABILI                    │
│  (P.IVA, CF, Ragione Sociale, Sede Legale, Codice ATECO)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                LAYER 2: COMPANY TENANT PROFILE                  │
│         Dati COMMERCIALI specifici per ogni tenant              │
│    (referenteId, contratto, condizioni, pec, note...)           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER 3: COMPANY SITE                       │
│         Sedi operative dell'azienda (per ogni tenant)           │
│    (indirizzo, DVR, RSPP, medico competente, sopralluoghi)      │
└─────────────────────────────────────────────────────────────────┘
```

**Campi in Company (globali, immutabili)**:
- `id`, `piva`, `codiceFiscale` (identificatori univoci)
- `ragioneSociale`, `formaGiuridica`
- `sedeLegaleIndirizzo`, `sedeLegaleCitta`, `sedeLegaleCap`, `sedeLegaleProvincia`
- `codiceAteco`, `settore`, `dimensione`, `sdi`, `pecFatturazione`

**Campi in CompanyTenantProfile (per-tenant, dinamici)**:
- `tenantId`, `referenteId` (FK a Person), `referenteRuolo`
- `emailGenerale`, `telefonoGenerale`, `pec`
- `dataInizioRapporto`, `dataFineRapporto`, `tipoContratto`
- `scontoPercentuale`, `terminiPagamento`, `modalitaPagamento`, `iban`
- `noteCommerciali`, `noteOperative`, `noteInterne`
- `status`, `isActive`, `isPrimary`

**Campi in CompanySite (sedi operative)**:
- `companyTenantProfileId` (FK a CompanyTenantProfile)
- `siteName`, `indirizzo`, `citta`, `cap`, `provincia`
- `rsppId`, `medicoCompetenteId`, `referenteId`
- `dvr`, `ultimoSopralluogo`, `prossimoSopralluogo`

**Query Backend Pattern**:
```javascript
// ✅ CORRETTO - P49 Pattern: getAll
const profiles = await prisma.companyTenantProfile.findMany({
  where: { tenantId, deletedAt: null },
  include: {
    company: true,  // Dati globali
    sites: { where: { deletedAt: null } },  // Sedi operative
    referente: { select: { id: true, firstName: true, lastName: true } }
  }
});

// ✅ CORRETTO - P49 Pattern: create
const { company, profile } = await CompanyTenantProfileService.createCompanyWithProfile(
  companyData,   // { ragioneSociale, piva, codiceFiscale, sedeLegale... }
  profileData,   // { pec, noteCommerciali, referenteId... }
  tenantId
);

// ❌ SBAGLIATO - Company non ha più tenantId
const companies = await prisma.company.findMany({
  where: { tenantId }  // ❌ tenantId non esiste su Company
});
```

**Regole P49**:
- ✅ `Company` contiene SOLO dati globali (P.IVA, ragione sociale, sede legale)
- ✅ `CompanyTenantProfile` contiene dati commerciali per-tenant
- ✅ `CompanySite` ha FK `companyTenantProfileId` (non companyId)
- ✅ SEMPRE usare `CompanyTenantProfileService` per operazioni CRUD
- ✅ API usa `companyTenantProfileId` come identificatore principale
- ❌ MAI usare `Company.tenantId` (campo rimosso)
- ❌ MAI creare Company senza CompanyTenantProfile associato
- ❌ MAI usare `PersonTenantProfile.companyId` (usa `companyTenantProfileId`)

### 9.4 P58 OWNERSHIP CHECK & GDPR DELETE (OBBLIGATORIO)
Ogni operazione DELETE deve verificare ownership e loggare GDPR.

**Pattern Ownership Check (Backend)**:
```javascript
// ✅ CORRETTO - Verifica ownership prima di delete
const entity = await prisma.entity.findUnique({
  where: { id },
  include: { tenantProfile: true } // o relazione equivalente
});

// Verifica: entità appartiene al tenant richiedente
if (entity.tenantId !== req.person.tenantId) {
  return res.status(403).json({
    error: 'Accesso negato: entità non appartiene al tenant'
  });
}

// Solo soft delete con audit GDPR e REVOCA CONSENT cross-tenant
await prisma.$transaction(async (tx) => {
  // 1. Soft delete
  await tx.entity.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
  
  // 2. P58: Revoca automatica TUTTI i consent cross-tenant (owner delete)
  await tx.personDataShareConsent.updateMany({
    where: { personId: id, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date(), revokedBy: req.person.id }
  });
  
  // 3. GDPR Audit Log (campi corretti!)
  await tx.gdprAuditLog.create({
    data: {
      personId: entity.personId || id,
      action: 'DELETE',
      resourceType: 'Person', // NON dataType o entityType!
      resourceId: id,         // NON entityId!
      tenantId: req.person.tenantId,
      dataAccessed: {         // NON metadata!
        deletionReason,
        deletedBy: req.person.id,
        operation: 'SOFT_DELETE',
        crossTenantConsentsRevoked: true
      }
    }
  });
});
```

**Entità con Ownership Check Implementato**:
- ✅ Person (singolo + bulk) - PersonCore.js
- ✅ Company - companies-routes.js
- ✅ CompanySite - company-sites-routes.js
- ✅ CourseSchedule - schedules-routes.js
- ✅ Visita - visita-routes.js

**deletionReason Richiesto**:
```javascript
// Frontend: deve passare reason
await personsService.delete(id, { deletionReason: 'Motivo eliminazione' });

// Backend validation
if (!deletionReason || deletionReason.length < 10) {
  return res.status(400).json({ error: 'deletionReason richiesto (min 10 caratteri)' });
}
```

**Cross-Tenant "Nascondi dalla Vista" (Non-Owner Pattern)**:
```javascript
// POST /api/v1/persons/:id/hide-from-view
// POST /api/v1/companies/:id/hide-from-view
// Revoca il consent senza eliminare i dati originali
await prisma.personDataShareConsent.update({
  where: { id: consentId },
  data: { 
    isRevoked: true, 
    revokedAt: new Date(),
    revokedBy: req.person.id,
    revokedReason: 'Nascosto dalla vista dal tenant'
  }
});
// L'entità non sarà più visibile al tenant importatore
```

**Regole P58**:
- ✅ SEMPRE verificare `entity.tenantId === req.person.tenantId` prima di DELETE
- ✅ SEMPRE usare soft delete (`deletedAt = new Date()`)
- ✅ SEMPRE creare GdprAuditLog per ogni DELETE
- ✅ SEMPRE richiedere `deletionReason` (minimo 10 caratteri)
- ✅ Owner delete REVOCA automaticamente TUTTI i consent cross-tenant
- ✅ Non-owner usa hide-from-view per revocare solo il proprio consent
- ✅ Campi GdprAuditLog corretti: `resourceType`, `resourceId`, `dataAccessed`
- ❌ MAI usare `entityType`, `entityId`, `metadata`, `performedBy` (schema errato)
- ❌ MAI hard delete dati PII
- ❌ MAI eliminare senza verifica ownership
- ❌ MAI eliminare senza audit log

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

### 10.b GIT HYGIENE E MICRO-COMMIT
- ✅ Micro-commit atomici e frequenti dopo ogni modifica completata e verificata.
- ✅ Prima di build, deploy, release o cambio attività il worktree deve essere pulito oppure le modifiche devono essere committate/stashate con messaggio chiaro.
- ✅ File generati, artefatti di build, report test, cache e dipendenze devono essere ignorati in `.gitignore`; se risultano tracciati per errore, rimuoverli dall'indice con `git rm --cached`.
- ✅ Prima del commit controllare sempre `git status --short` e `git diff --cached --stat`.
- ❌ MAI accumulare modifiche valide o file non tracciati tra attività diverse.
- ❌ MAI committare `node_modules`, release binarie, build output, report Playwright o file temporanei.

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
- 🚫 **ASSOLUTO DIVIETO — MAI FARE IN NESSUNA CIRCOSTANZA**:
  - ❌ **MAI creare nuovi server Hetzner** (`hetzner API create_server`, `hcloud server create`, o qualsiasi chiamata API che crei server cloud) — crea costi e superficie d'attacco non autorizzati
  - ❌ **MAI eliminare server Hetzner senza esplicita conferma scritta** dell'utente (chiedere SEMPRE prima)
  - ❌ **MAI modificare firewall Hetzner cloud senza autorizzazione** esplicita
  - ❌ **MAI eseguire script su server di produzione senza autorizzazione**
- 🚫 **SEVERAMENTE VIETATO SENZA AUTORIZZAZIONE**:
  - `pm2 restart/stop/delete [any-process]`
  - `kill -9 [any-pid]`
  - Modificare porte server (4001, 4002)
  - `sudo systemctl restart [any-service]`
  - `sudo reboot`
- ✅ **SEMPRE PERMESSI (Diagnostica)**:
  - `pm2 status`, `pm2 logs [process-name]`, `pm2 monit`
  - Health checks: `/health`, `/healthz`, `/routes/health`
  - Log reading, `ps aux`, `netstat`

> ⚠️ **MOTIVO**: In aprile 2026, l'API key Hetzner fu compromessa. L'attaccante creò un server CPX51 (€92/mese) in Ashburn USA. Aggiungere qualsiasi istruzione che crei server cloud è equivalente a un attacco. MAI, sotto nessuna circostanza, creare infrastruttura cloud senza autorizzazione esplicita e scritta.

### 16. ARCHITETTURA 2 SERVER (P64 - PROXY ELIMINATO)
**PORTE FISSE - NON MODIFICARE MAI:**
- **API Server**: Porta 4001 (Express modular, Prisma, RBAC, GDPR)
- **Documents Server**: Porta 4002 (PDF Puppeteer browser pool)
- **Frontend**: Porta 5173 (Vite dev server)

> **P64**: Proxy server (4003) ELIMINATO - Nginx gestisce routing in produzione, Vite in development

### 17. GDPR ENTITY TEMPLATE (Template Unificato)
Il sistema usa `GDPREntityTemplate` per tutte le entità:
- ✅ ViewModeToggle, AddEntityDropdown, FilterPanel, ColumnSelector
- ✅ Audit trail automatico, data export CSV/JSON
- ✅ Permission control granulare, consent tracking
- ❌ MAI creare pagine entità senza GDPREntityTemplate

### 22. TENANT MODE SYSTEM (OBBLIGATORIO)
Sistema di sicurezza per operazioni CRUD in modalità multi-tenant:

**Concetti Chiave**:
- **viewMode**: `'all'` (visualizza tutti i tenant) o `'single'` (visualizza tenant corrente)
- **operateTenantId**: ID del tenant su cui eseguire operazioni CRUD (quando viewMode='all')
- **canPerformCRUD**: `true` solo se viewMode='single' oppure operateTenantId è impostato

**Componenti Obbligatori**:
- ✅ `CRUDButton`: Sostituisce tutti i Button per operazioni Create/Update/Delete
- ✅ `CRUDPrimaryButton`: Per pulsanti primari (azioni principali)
- ✅ Import: `import { CRUDButton, CRUDPrimaryButton } from '@/components/ui/CRUDButton'`
- ✅ Auto-disable quando viewMode='all' senza operateTenantId

**Pattern Standard CRUDButton**:
```tsx
import { CRUDButton, CRUDPrimaryButton } from '@/components/ui/CRUDButton';
import { Plus, Edit, Trash2 } from 'lucide-react';

// Bottone primario "Nuovo"
<CRUDPrimaryButton onClick={() => setIsCreateModalOpen(true)}>
  <Plus className="w-4 h-4 mr-2" /> Nuovo
</CRUDPrimaryButton>

// Azioni Edit/Delete in tabella (dentro ActionButton)
<ActionButton
  theme="teal"
  actions={[
    { label: 'Modifica', icon: <Edit className="w-4 h-4" />, onClick: () => handleEdit(id) },
    { label: 'Elimina', icon: <Trash2 className="w-4 h-4" />, onClick: () => handleDelete(id), variant: 'danger' },
  ]}
/>
```

**Backend Header**:
- ✅ Header `X-Operate-Tenant-Id` obbligatorio per CRUD quando viewMode='all'
- ✅ Middleware `tenantMode.js` valida header automaticamente
- ✅ Usare `getOperateTenantHeaders()` per aggiungere header alle API calls

**TenantModeContext Hook**:
```tsx
import { useTenantMode } from '@/contexts/TenantModeContext';

const { viewMode, operateTenantId, canPerformCRUD, getOperateTenantHeaders } = useTenantMode();

// Per API calls con tenant mode
const headers = getOperateTenantHeaders();
await apiPost('/api/v1/entities', data, { headers });
```

**Regole**:
- ✅ SEMPRE usare CRUDButton per pulsanti "Nuovo", "Crea", "Salva", "Elimina"
- ✅ SEMPRE disabilitare CRUD quando viewMode='all' e operateTenantId non impostato
- ✅ Tooltip automatico spiega perché il bottone è disabilitato
- ✅ Usare `getOperateTenantHeaders()` per POST/PUT/DELETE quando admin vede tutti i tenant
- ❌ MAI usare Button normale per operazioni CRUD
- ❌ MAI bypassare il controllo canPerformCRUD
- ❌ MAI hardcodare tenantId nelle operazioni CRUD

**Pagine con CRUDButton Integrate (22+)**:
- Clinica: PoliambulatoriPage, CalendarioPage, AgendaCalendar, FatturePage, FatturazioneDashboard, PrestazioniPage, ConvenzioniPage, OfferteBundlePage, VisiteListPage, SediPage, StrumentiPage, AmbulatoriPage, MediciPage, TariffarioMedicoPage
- Management: TariffariAziendePage, UsersManagement, TenantsManagement, RolesManagement, RoleHierarchyPage
- Forms: FormTemplatesPage
- Settings: Templates, DiscountCodes

**Pagine Management con useTenantFilter**:
- ✅ UsersManagement - filtra utenti per tenant selezionato
- ✅ TenantsManagement - filtra lista tenant per accessibilità
- ✅ TariffariAziendePage - filtra tariffari per tenant selezionato
- ❌ RolesManagement - mostra definizioni ruoli globali (non richiede filtro)

### 23. TENANT FILTER PATTERN (OBBLIGATORIO PER PAGINE LISTE)
Tutte le pagine con liste devono supportare il refresh automatico quando cambia il tenant:

**useTenantFilter Hook (Visualizzazione Multi-Tenant)**:
```tsx
import { useTenantFilter } from '@/context/TenantFilterContext';

const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

// Query con refresh automatico quando cambiano i tenant selezionati
const { data, isLoading } = useQuery({
    queryKey: ['entities', tenantFilterKey, { page, limit, search }],  // tenantFilterKey triggera refresh
    queryFn: async () => {
        const tenantParams = getTenantFilterParams();
        return api.getAll({
            page, limit, search,
            ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
            ...(tenantParams.allTenants && { allTenants: 'true' })
        });
    },
    enabled: isReady  // Aspetta che TenantFilter sia pronto
});
```

**⚠️ CRITICO: useMemo/useCallback con tenantFilterKey**:
```tsx
// ✅ CORRETTO - tenantFilterKey nelle dipendenze triggera ricalcolo quando cambia il tenant
const queryParams = useMemo(() => {
    const tenantParams = getTenantFilterParams();
    return {
        page, limit, search,
        ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
        ...(tenantParams.allTenants && { allTenants: 'true' })
    };
}, [page, limit, search, getTenantFilterParams, tenantFilterKey]); // ✅ tenantFilterKey OBBLIGATORIO!

// ❌ SBAGLIATO - senza tenantFilterKey i dati NON si aggiornano quando cambia tenant
const queryParams = useMemo(() => {
    const tenantParams = getTenantFilterParams();
    return { ... };
}, [page, limit, search, getTenantFilterParams]); // ❌ MANCA tenantFilterKey!
```

**Regole**:
- ✅ SEMPRE includere `tenantFilterKey` nella queryKey per refresh automatico
- ✅ SEMPRE includere `tenantFilterKey` nelle dipendenze di `useMemo`/`useCallback` che usano `getTenantFilterParams()`
- ✅ SEMPRE usare `enabled: isReady` per aspettare inizializzazione
- ✅ SEMPRE controllare `if (isReady)` in useEffect se si usa fetch manuale invece di React Query
- ✅ SEMPRE usare `getTenantFilterParams()` per i parametri API
- ✅ SEMPRE spread tenantIds e allTenants separatamente
- ❌ MAI usare stato locale `showAllTenants` - il filtro è gestito dal TenantModeSelector nel header
- ❌ MAI hardcodare filtri tenant nelle pagine
- ❌ MAI usare checkbox "Tutti i tenant" custom - il selector è nel header
- ❌ MAI dimenticare `tenantFilterKey` nelle dipendenze di useMemo/useCallback
- ❌ MAI eseguire fetch senza controllo `isReady` - causa bug al reload pagina

**Sincronizzazione Automatica**:
- `TenantFilterContext` si sincronizza automaticamente con `TenantModeContext`
- Quando l'utente cambia tenant nel `TenantModeSelector`, `tenantFilterKey` cambia
- React Query invalida automaticamente le cache e ricarica i dati
- Al **reload pagina**, `TenantModeContext` carica `viewTenantIds` da localStorage PRIMA di `TenantFilterContext`
- `TenantFilterContext.loadAccessibleTenants` usa `tenantMode?.viewTenantIds` come priorità per inizializzare

**⚠️ CRITICAL: Pattern Fetch Manuale (useEffect)**:
Se la pagina usa fetch manuale invece di React Query, DEVE controllare `isReady`:
```tsx
// ✅ CORRETTO - Pattern fetch manuale con isReady
const fetchData = useCallback(async () => {
    const tenantParams = getTenantFilterParams();
    // ... fetch logic
}, [getTenantFilterParams, tenantFilterKey]);

useEffect(() => {
    if (isReady) {  // OBBLIGATORIO: aspetta inizializzazione tenant
        fetchData();
    }
}, [fetchData, isReady]);

// ❌ SBAGLIATO - fetch senza controllo isReady
useEffect(() => {
    fetchData();  // BUG: esegue PRIMA che il filtro tenant sia pronto!
}, [fetchData]);
```

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
❌ Usare `req.brandTenantId` (rimosso in P57)

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
✅ Health checks passano (4001, 4002)

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
# P64: Solo API e Documents (proxy eliminato)
curl http://localhost:4001/health  # API Server
curl http://localhost:4002/health  # Documents Server
```

**Login Test**:
```bash
curl -X POST http://localhost:4001/api/v1/auth/login \
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

---

## 🔒 LEZIONI R27 — SECURITY (Fasi 81-83)

### 29. AUTENTICAZIONE FRONTEND — BEARER ONLY (NON NEGOZIABILE)

Il backend accetta **SOLO Bearer token** nell'header `Authorization`. Non esiste cookie-based auth.

**Flusso corretto in AuthContext**:
```typescript
// ✅ CORRETTO — skip diretta al refresh token quando non c'è access token
let token = authService.getToken();
if (!token) {
  const refreshed = await authService.refreshAccess();
  if (refreshed) {
    token = refreshed;
  } else {
    setUser(null); // Utente non autenticato
    return;
  }
}
// Poi: verifyToken() con Bearer token in memoria
```

```typescript
// ❌ MAI — tentare verify senza token (genera 401 inutile in console)
try {
  const res = await authService.verifyToken(); // senza token → 401
} catch (e) { /* expected */ }
```

**Regole**:
- ✅ Access token: in-memory (`_accessTokenMemory`) — NON in localStorage (XSS protection)
- ✅ Refresh token: in localStorage (`refreshToken`)
- ✅ Al page reload: subito `refreshAccess()` per exchange del refresh token
- ❌ MAI tentare verify senza access token (genera 401 console spam)
- ❌ MAI assumere che il backend supporti cookie auth

---

### 30. ERROR.MESSAGE — MAI IN RISPOSTE HTTP

```javascript
// ✅ CORRETTO — messaggio generico in HTTP, dettagli SOLO in logger
logger.error({ error: error.message, id: req.params.id }, 'Errore operazione');
return res.status(500).json({ error: 'Operazione non riuscita' });

// ❌ VIETATO — espone stack/dettagli Prisma al client
return res.status(500).json({ error: error.message });

// ❌ VIETATO — dead || pattern (F17 bug): stringa sempre truthy
return res.status(500).json({ error: 'Internal server error' || 'Messaggio italiano' });
// ↑ "Messaggio italiano" non viene mai raggiunto! Usare solo:
return res.status(500).json({ error: 'Messaggio italiano' });
```

**Regole**:
- ✅ HTTP response: messaggi statici italiani/inglesi solo
- ✅ Logger: sempre `logger.error({ error: error.message }, 'Descrizione')`
- ❌ MAI `error: error.message` in `res.json()`  (GDPR leak)
- ❌ MAI `'stringa fissa' || 'fallback'` — la prima stringa è sempre truthy, il fallback è dead code

---

### 31. PRISMA SINGLETON (OBBLIGATORIO)

```javascript
// ✅ CORRETTO — singleton condiviso
import prisma from '../config/prisma-optimization.js';

// ❌ VIETATO — istanza privata bypassa soft-delete middleware + resource leak
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

---

### 32. MIDDLEWARE AUTH — SOLO CATENA A

La Catena B (`auth/middleware.js`) è **obsoleta** e usata SOLO da `documents-server`.

```javascript
// ✅ CORRETTO — Catena A (tutte le route production)
import { authenticate } from '../middleware/auth.js';
import { requirePermissions } from '../middleware/rbac.js';

// ❌ VIETATO — Catena B (legacy)
import middleware from '../auth/middleware.js';
const { authenticate: authenticateToken } = middleware;

// ❌ VIETATO — factory adapter (rimosse in F325b)
const authenticateToken = () => authenticate;
```

---

### 33. FINDFIRST — TENANTID SEMPRE NEL WHERE

```javascript
// ✅ CORRETTO — inline
const item = await prisma.course.findFirst({
  where: { id, tenantId, deletedAt: null }
});

// ✅ CORRETTO — variabile (pattern accepted)
const where = { tenantId, deletedAt: null, ...otherFilters };
const item = await prisma.course.findFirst({ where });

// ❌ VIETATO — mancanza tenantId su modelli tenant-scoped
const item = await prisma.course.findFirst({ where: { id } });
```

**Eccezioni legittime** (modelli globali — P48/P49):
- `person` — entità globale, no tenantId in lookup by email/taxCode
- `company` — entità globale, no tenantId in lookup by piva/codiceFiscale
- Route pubbliche CMS — fallback globale slug intentional
- Validator `uniqueInDatabase` — global uniqueness check intentional

---

### 34. DEAD CODE LEGACY — ELIMINARE SEMPRE

```javascript
// ✅ Se un file ha zero import in produzione: ELIMINARLO
// ✅ Se una funzione/route non è mai chiamata: ELIMINARLA
// ❌ MAI aggiungere "fallback legacy" o "retrocompatibilità"
// ❌ MAI commentare codice invece di eliminarlo
```

---

### 35. DATE PICKER — USARE SEMPRE DatePickerElegante (OBBLIGATORIO)

```tsx
// ✅ SEMPRE usare DatePickerElegante per qualsiasi input di data
import { DatePickerElegante } from '@/components/ui/DatePickerElegante';

<DatePickerElegante
    value={dateValue || null}                               // Date | string (ISO) | null
    onChange={(d) => setDateValue(d ? d.toISOString().split('T')[0] : '')}
    theme="teal"                                            // 'teal' | 'blue' | 'violet'
    size="sm"                                               // 'sm' | 'md' | 'lg'
    compact                                                 // popup più stretto, per spazi ridotti
    placeholder="Seleziona data"
    minDate={new Date()}                                    // opzionale
    maxDate={new Date('2099-12-31')}                        // opzionale
    clearable                                               // mostra pulsante clear
/>

// ❌ MAI usare <input type="date"> nativo (brutto, non uniforme tra browser, non rispetta il design system)
```

### 35.1 SELECT, DATE E TIME PICKER — CONTROLLI ELEGANTI (OBBLIGATORIO)

- ✅ Webapp: usare `DatePickerElegante`, `TimePickerElegante` ed `ElegantSelect` per date, orari e dropdown.
- ✅ Desktop app: usare i controlli equivalenti locali (`ElegantDateInput`, `ElegantTimeInput`, `ElegantSelect`) quando l'import diretto webapp crea conflitti di runtime/tipi Electron.
- ✅ Le date visualizzate all'utente devono usare formato italiano `dd/mm/yyyy`; il valore salvato/API resta ISO `YYYY-MM-DD` o ISO datetime secondo il modello.
- ✅ I calendari devono aprire un mini-calendario/popup coerente con il design system.
- ❌ MAI usare `<select>` nativo per dropdown applicativi.
- ❌ MAI usare `<input type="date">` o `<input type="time">` nativi.
- ❌ MAI introdurre modal generici quando esiste un modal webapp corrispondente.

---

### 36. NAVIGAZIONE INDIETRO — RISPETTARE LA PROVENIENZA

- Le frecce e i link “indietro” devono tornare alla pagina da cui l’utente è arrivato quando disponibile (`location.state.from`, history o equivalente locale).
- Usare fallback contestuali solo se la provenienza non è disponibile, evitando link fissi che portano al branch sbagliato tra `elementmedica` ed `elementsicurezza`.

---

## 📚 RIFERIMENTI

- `.trae/rules/project_rules.md` - Regole progetto complete (535 linee)
- `.trae/TRAE_SYSTEM_GUIDE.md` - Guida sistema completa (763 linee)
- `docs/technical/AI_ASSISTANT_GUIDE.md` - Workflow AI
- `docs/deployment/deployment-guide.md` - Deployment 3 server
- `docs/troubleshooting/common-issues.md` - Problemi comuni

## 🎯 STATO PROGETTO

**Completion**: 95% (Quality Score 9.9/10)
- Security: 9.8/10 (CSRF ✅, rate limiting ✅, test routes ✅, debug routes protected ✅)
- Performance: 9.5/10 (Bundle -77.5%, load time -75%)
- Database: 9.0/10 (100+ indexes, 20+ enums, soft delete, multi-tenancy)
- Test Coverage: 75% (523/549 tests passing, 95% pass rate)
- Code Quality: 9.8/10 (legacy code removed, modern patterns throughout)

**Project 46 Status** (2025-12-31 - VERIFIED):
- ✅ TypeScript: 0 errors (181 → 0 fixed)
- ✅ Build: Passing (10.75s)
- ✅ Health Checks: API (4001) + Documents (4002) healthy
- ✅ Authentication: Login test passing
- ✅ Phase 0-1, 3a, 3b, 6, 7 complete
- ✅ CustomContentRenderer split (2926L → 13 modular files)
- ✅ Notification consistency (52 alert → showToast migrations)
- ✅ req.user → req.person migration (334+ occurrences)
- ✅ console.log → structured logger
- ✅ Legacy URL rewriting removed
- ✅ Legacy routes removed
- ✅ ActionButton standardized (20+ pages)
- ✅ Clickable rows pattern (onRowClick)

### 18. API PATHS (OBBLIGATORIO)
- ✅ SEMPRE usare `/api/v1/...` per tutte le chiamate API
- ✅ Pattern: `apiGet('/api/v1/entities')`, `apiPost('/api/v1/entities', data)`
- ❌ MAI usare path senza prefix (`/courses`, `/employees`, etc.)
- ❌ MAI usare `/api/courses` - usare `/api/v1/courses`
- ❌ Nessuna riscrittura legacy nel frontend (rimossa)
- ❌ Nessun route legacy nel backend (rimosse)

### 19. NOTIFICHE FRONTEND (OBBLIGATORIO)
- ✅ SEMPRE usare `showToast()` da `useToast` hook
- ✅ Pattern: `showToast({ message: 'text', type: 'success|error|warning|info' })`
- ✅ Durata opzionale: `showToast({ message, type, duration: 5000 })`
- ❌ MAI usare `alert()` nel frontend
- ❌ MAI usare `window.alert()` nel frontend
- ❌ MAI usare `react-hot-toast`, `react-toastify`, `sonner` direttamente

### 20. ACTIONBUTTON STANDARD (OBBLIGATORIO)
Il componente `ActionButton` è lo standard per le azioni nelle tabelle/liste:
- ✅ SEMPRE usare `ActionButton` per azioni su righe tabella
- ✅ Import: `import { ActionButton } from '@/components/ui'` o `'../../components/ui'`
- ✅ Temi per brand: `theme="blue"` (ElementSicurezza), `theme="teal"` (ElementMedica), `theme="violet"` (Management)
- ✅ Pattern standard:
```tsx
<ActionButton
  theme="blue"
  actions={[
    { label: 'Visualizza', icon: <Eye className="w-4 h-4" />, onClick: () => handleView(id) },
    { label: 'Modifica', icon: <Edit className="w-4 h-4" />, onClick: () => handleEdit(id) },
    { label: 'Elimina', icon: <Trash2 className="w-4 h-4" />, onClick: () => handleDelete(id), variant: 'danger' },
  ]}
/>
```
- ❌ MAI creare implementazioni custom di DropdownMenu per azioni
- ❌ MAI usare bottoni separati per azioni su righe
- ❌ MAI usare `destructive: true` - usare `variant: 'danger'`

### 21. CLICKABLE ROWS/CARDS (OBBLIGATORIO)
Tutte le righe delle tabelle e le card devono essere cliccabili:
- ✅ SEMPRE aggiungere `onRowClick` a `ResizableTable`
- ✅ Pattern: `onRowClick={(row) => navigate(`/entity/${row.id}`)}`
- ✅ Alternativa modal: `onRowClick={(row) => openDetailModal(row)}`
- ✅ Per documenti/download: `onRowClick={(row) => window.open(row.url, '_blank')}`
- ✅ Le card devono avere `cursor-pointer hover:shadow-lg` e `onClick`
- ❌ MAI usare `tbodyProps.onClick` - usare `onRowClick` nativo
- ❌ MAI lasciare righe/card senza click handler
- ❌ MAI avere righe cliccabili senza feedback visivo (hover)

### 24. ONORIFICO ITALIANO (OBBLIGATORIO)
L'applicazione è per il mercato italiano - usare SEMPRE onorifici italiani corretti:
- ✅ SEMPRE usare "Dott." per medici maschi (gender: 'MALE')
- ✅ SEMPRE usare "Dott.ssa" per mediche femmine (gender: 'FEMALE', 'OTHER', 'NOT_SPECIFIED')
- ✅ SEMPRE usare `formatMedicoName(medico)` da `utils/textFormatters.ts`
- ✅ SEMPRE usare `getMedicoTitle(gender)` per ottenere solo il titolo
- ✅ Output corretto: "Dott. Rossi Mario", "Dott.ssa Bianchi Laura"
- ❌ MAI usare "Dr." (abbreviazione inglese)
- ❌ MAI usare "Dr.ssa" (forma errata)
- ❌ MAI hardcodare il titolo senza verificare il genere
- ❌ MAI omettere il titolo per i medici

**Helper Functions (in `src/utils/textFormatters.ts`)**:
```typescript
// Ottiene titolo basato sul genere
export const getMedicoTitle = (gender?: string): string => {
    return gender === 'MALE' ? 'Dott.' : 'Dott.ssa';
};

// Formatta nome completo con titolo
export const formatMedicoName = (medico: { 
    firstName?: string; 
    lastName?: string; 
    gender?: string 
}): string => {
    const title = getMedicoTitle(medico.gender);
    return `${title} ${medico.lastName || ''} ${medico.firstName || ''}`.trim();
};
```

### 25. DESIGN SYSTEM - COLORI E BRAND (OBBLIGATORIO)
Il progetto utilizza tre brand con colori distintivi. È OBBLIGATORIO mantenere coerenza all'interno di ogni brand.

**Brand Colors**:
| Brand | Primary Color | Hover Color | Tailwind Classes | Hex Values |
|-------|--------------|-------------|------------------|------------|
| **ElementMedica** (Clinica) | teal-600 | teal-700 | `bg-teal-600 hover:bg-teal-700` | `#0d9488` → `#0f766e` |
| **ElementSicurezza** (Formazione) | blue-600 | blue-700 | `bg-blue-600 hover:bg-blue-700` | `#2563eb` → `#1d4ed8` |
| **Management** (Admin) | violet-600 | violet-700 | `bg-violet-600 hover:bg-violet-700` | `#7c3aed` → `#6d28d9` |

**CSS Classes per Clinica** (ElementMedica):
```css
/* Primary Button - in clinica-theme.css */
.btn-clinica-primary,
.clinica-button-primary {
    background-color: #0d9488 !important; /* teal-600 */
    color: white !important;
}
.btn-clinica-primary:hover:not(:disabled),
.clinica-button-primary:hover:not(:disabled) {
    background-color: #0f766e !important; /* teal-700 */
}
```

**Pattern Pulsanti Standard**:
```tsx
// ✅ CORRETTO - ElementMedica/Clinica
<button className="bg-teal-600 text-white hover:bg-teal-700">Azione</button>
<button className="btn-clinica-primary">Crea</button>
<CRUDPrimaryButton>Nuovo</CRUDPrimaryButton> // usa teal-600

// ✅ CORRETTO - ElementSicurezza/Formazione
<button className="bg-blue-600 text-white hover:bg-blue-700">Azione</button>

// ✅ CORRETTO - Management/Admin
<button className="bg-violet-600 text-white hover:bg-violet-700">Azione</button>
```

**Colori Semantici (validi in tutti i brand)**:
- **Edit/Modifica**: `bg-blue-600 hover:bg-blue-700` (semantico per modifiche)
- **Delete/Elimina**: `bg-red-600 hover:bg-red-700` (danger)
- **Success**: `bg-green-600 hover:bg-green-700` (conferme)
- **Warning**: `bg-amber-600 hover:bg-amber-700` (attenzione)

**Badge/Status Colors** (validi in tutti i brand):
- Verde per stati positivi (Attivo, Idoneo, Completato)
- Blu per stati in progress (In Corso, In Attesa)
- Rosso per stati negativi (Annullato, Scaduto)
- Grigio per stati neutri (Bozza, Inattivo)

**Regole**:
- ✅ SEMPRE usare il colore del brand corrente per azioni primarie (Create, Save)
- ✅ SEMPRE usare CRUDPrimaryButton per pulsanti primari nelle pagine clinica
- ✅ SEMPRE usare classi btn-clinica-* nelle pagine clinica
- ✅ I colori semantici (edit=blu, delete=rosso) sono accettati in tutti i brand
- ❌ MAI usare blu per azioni primarie nelle pagine clinica (teal è il brand)
- ❌ MAI mischiare colori di brand diversi nella stessa pagina
- ❌ MAI usare colori random - seguire la palette definita

### 26. FEATURE FLAGS (PROGETTO 57)
Sistema di feature flags per commercializzazione:
- ✅ Usare `requireFeature('FEATURE_KEY')` middleware per proteggere route
- ✅ Import: `import { requireFeature, FEATURE_KEYS } from '../middleware/featureFlags.js'`
- ✅ Pattern backend:
```javascript
router.post('/fatture/invia-sdi', 
  requireFeature('FATTURAZIONE_ELETTRONICA'),
  fatturaController.inviaSdi
);
```
- ✅ Feature keys disponibili: BRANCH_MEDICA, BRANCH_FORMAZIONE, FATTURAZIONE_ELETTRONICA, PEC_INTEGRATION, MDL_BASE, MDL_SORVEGLIANZA, API_ACCESS, WHITE_LABEL
- ✅ Model TenantFeature ha @@unique([tenantId, featureKey])
- ❌ MAI hardcodare controlli feature - usare middleware
- ❌ MAI esporre feature non abilitate

### 27. CROSS-TENANT IMPORT (PROGETTO 57)
Sistema per importare Person/Company già esistenti in altri tenant:
- ✅ Endpoint check-existing: `GET /api/v1/persons/check-existing?taxCode=...`
- ✅ Endpoint import: `POST /api/v1/persons/import-cross-tenant`
- ✅ SEMPRE creare PersonDataShareConsent/CompanyDataShareConsent PRIMA del profile
- ✅ SEMPRE loggare in GdprAuditLog
- ✅ Vincoli unici globali: Person.taxCode, Person.vatNumber, Company.piva, Company.codiceFiscale
- ✅ Vincoli unici per-tenant: Course.slug, CMSPage.slug (@@unique([tenantId, field]))
- ❌ MAI duplicare Person/Company - creare solo nuovo TenantProfile
- ❌ MAI importare senza consenso GDPR

### 28. BRAND/TENANT SEPARATION (PROGETTO 57) ⚠️ CRITICAL
**Brand (dominio) e Tenant sono concetti SEPARATI**:

| Concetto | Determina |
|----------|-----------|
| **Brand** (X-Frontend-Id) | Solo UI: menu, colori, branch visualizzato |
| **Tenant** (JWT person.tenantId) | SEMPRE dati e permessi CRUD |

**Architettura**:
```
X-Frontend-Id: "element-medica"
        │
        ▼
brandDetection middleware
        │
        ├── req.frontendId = "element-medica"
        ├── req.branchType = "MEDICA"
        └── ❌ NON imposta più: req.brandTenantId

JWT Token
        │
        ▼
auth.js middleware
        │
        └── req.person.tenantId ← SEMPRE usato per CRUD
```

**Caso d'Uso Target**:
Un tenant può avere:
- `enabledBranches: [MEDICA, FORMAZIONE]`
- Due domini configurati (medica.cliente.it, corsi.cliente.it)
- Stesso utente accede a entrambi, vede STESSI dati

**Backend Pattern**:
```javascript
// ✅ CORRETTO - tenant SEMPRE da JWT (single-tenant)
const tenantId = req.person.tenantId;

// ✅ Per admin cross-tenant CRUD - usa getEffectiveTenantId (NON req.operateTenantId direttamente!)
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
const tenantId = getEffectiveTenantId(req);
// ⚠️ PERCHÉ: router.use(validateOperateTenant) gira PRIMA di authenticateToken() per-route.
// Quando il middleware gira, req.person è null → salta tutto → req.operateTenantId non viene mai
// impostato per le write ops. getEffectiveTenantId legge il header X-Operate-Tenant-Id direttamente.

// ❌ SBAGLIATO per CRUD cross-tenant in write routes - req.operateTenantId è undefined
const tenantId = req.operateTenantId || req.person.tenantId;

// ❌ SBAGLIATO - req.brandTenantId NON ESISTE PIÙ
const tenantId = req.brandTenantId || req.person.tenantId;
```

**Public Routes Pattern** (CMS, corsi pubblici):
```javascript
import { publicContentMiddleware } from '../middleware/brandDetection.js';

// Usa publicContentMiddleware per route pubbliche
router.get('/pages/slug/:slug', publicContentMiddleware, async (req, res) => {
    // req.publicTenantId disponibile per filtrare contenuto pubblico per brand
    const page = await prisma.cMSPage.findFirst({
        where: { slug, ...(req.publicTenantId && { tenantId: req.publicTenantId }) }
    });
});
```

**Regole**:
- ✅ SEMPRE usare `req.person.tenantId` per CRUD single-tenant
- ✅ Per admin cross-tenant CRUD, usare `getEffectiveTenantId(req)` (NON `req.operateTenantId`)
- ✅ Per route pubbliche, usare `publicContentMiddleware` e `req.publicTenantId`
- ✅ Brand determina SOLO branch UI (MEDICA vs FORMAZIONE)
- ❌ MAI usare `req.operateTenantId || person.tenantId` in write route handlers (middleware order bug)
- ❌ MAI usare `req.brandTenantId` (rimosso)
- ❌ MAI assumere che brand determini tenant
- ❌ MAI mappare brand → tenant direttamente

---

**🚨 ULTIMA REGOLA**: In caso di dubbio, CHIEDERE invece di assumere!
