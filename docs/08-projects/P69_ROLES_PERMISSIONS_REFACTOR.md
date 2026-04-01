# P69 - Refactoring Completo Ruoli e Permessi

**Stato**: ✅ Completato  
**Priorità**: Alta  
**Effort Stimato**: 60-80 ore  
**Data Inizio**: 2026-02-05  
**Data Completamento**: 2026-02-05  
**Versione**: 2.4.0

---

## 📊 Analisi Stato Attuale

### Modelli Esistenti (Prisma)

| Modello | Scopo | Stato |
|---------|-------|-------|
| `PersonRole` | Ruoli assegnati a persone per tenant | ✅ Funzionante |
| `RolePermission` | Permessi per PersonRole | ✅ Funzionante |
| `CustomRole` | Ruoli personalizzati per tenant | ✅ Funzionante |
| `CustomRolePermission` | Permessi per CustomRole | ✅ Funzionante |
| `AdvancedPermission` | Permessi granulari con condizioni | ✅ Funzionante |
| `Permission` (model) | **Inutilizzato** - tabella vuota | ⚠️ Da rimuovere |
| `PersonTenantAccess` | Accesso cross-tenant | ✅ Funzionante |

### Gerarchia Attuale (22 RoleType)

```
Livello 0: SUPER_ADMIN
Livello 1: ADMIN
Livello 2: COMPANY_ADMIN, TENANT_ADMIN
Livello 3: TRAINING_ADMIN, CLINIC_ADMIN
Livello 4: HR_MANAGER, MANAGER, DEPARTMENT_HEAD
Livello 5: TRAINER_COORDINATOR, COMPANY_MANAGER, SUPERVISOR, AUDITOR
Livello 6: SENIOR_TRAINER, COORDINATOR
Livello 7: TRAINER, EXTERNAL_TRAINER, OPERATOR, CONSULTANT
Livello 8: EMPLOYEE
Livello 9: VIEWER
Livello 10: GUEST
```

### Gap Identificati

| # | Gap | Severità | Soluzione |
|---|-----|----------|-----------|
| 1 | Gerarchia non corretta (ADMIN sopra TENANT_ADMIN) | 🔴 Alta | Ridefinire livelli |
| 2 | Permessi relazionali non implementati | 🔴 Alta | Aggiungere scope "relational" |
| 3 | Drag & drop non intuitivo | 🟡 Media | Migliorare UX con feedback visivo |
| 4 | Self-company non visibile in /companies | 🔴 Alta | Aggiungere flag isSelfCompany |
| 5 | Sync dipendenti HR/employees mancante | 🔴 Alta | Auto-sync bidirezionale |
| 6 | Mansionario senza ruoli granulari | 🟡 Media | Aggiungere defaultRoleId + override |
| 7 | Pagine permessi frammentate | 🟡 Media | Consolidare navigazione |
| 8 | Documentazione mancante | 🟡 Media | Creare docs/02-backend/rbac.md |
| 9 | Model Permission inutilizzato | 🟢 Bassa | Rimuovere da schema |

---

## 📋 Piano di Lavoro

### Fase 1: Pulizia e Fondamenta ✅

#### 1.1 Rimozione Legacy
- [x] Rimuovere file RolesManagement.tsx (già fatto in P68)
- [x] Rimuovere file TenantUsersPage.tsx (già fatto in P68)
- [x] Verificare e rimuovere altri file legacy (nessun file .backup trovato)
- [x] Aggiornare README per rimuovere riferimenti a file legacy inesistenti

#### 1.2 Correzione Gerarchia Ruoli ✅
Nuova gerarchia implementata:
```
Livello 0: SUPER_ADMIN (accesso globale, tutti i tenant)
Livello 1: ADMIN (admin del sistema, tutti i tenant assegnati)
Livello 2: TENANT_ADMIN (admin del proprio tenant)
Livello 3: COMPANY_ADMIN (admin della propria azienda nel tenant)
Livello 4: TRAINING_ADMIN, CLINIC_ADMIN, HR_MANAGER
Livello 5: MANAGER, DEPARTMENT_HEAD
Livello 6: TRAINER_COORDINATOR, COMPANY_MANAGER, SUPERVISOR, AUDITOR
Livello 7: SENIOR_TRAINER, COORDINATOR
Livello 8: TRAINER, EXTERNAL_TRAINER, OPERATOR, CONSULTANT
Livello 9: EMPLOYEE
Livello 10: VIEWER
Livello 11: GUEST
```

#### 1.3 Creazione Documentazione RBAC
- [ ] Creare `docs/02-backend/rbac.md`
- [ ] Documentare gerarchia, permessi, scope
- [ ] Documentare permessi relazionali

---

### Fase 2: Permessi Relazionali ✅

#### 2.1 Implementazione Completata
- [x] Campo `allowCrossTenant` aggiunto a AdvancedPermission (schema.prisma)
- [x] Migrazione `20260205_p69_allow_cross_tenant` applicata
- [x] Metodo `getAccessibleTenantIds()` in relation-resolver.js
- [x] Metodo `buildCrossTenantRelationalFilter()` in relation-resolver.js
- [x] Middleware role-data-filter.js aggiornato per supportare cross-tenant
- [x] Checkbox "Cross-tenant" in PermissionsSection.tsx

#### 2.2 Scope Cross-Tenant
Un **formatore** che lavora per due aziende con tenant diversi:
- ✅ Con `allowCrossTenant: true`, può vedere dati di tutti i tenant accessibili
- ✅ PersonTenantAccess gestisce gli accessi multi-tenant
- ✅ Il filtro relazionale include OR per tutti i tenant accessibili

```typescript
// AdvancedPermission con cross-tenant
{
  scope: 'relational',
  allowCrossTenant: true,  // P69: Nuovo campo
  relationType: 'trainer_courses'
}
```

---

### Fase 3: Self-Company ✅

#### 3.1 Self-Company Visibile in /companies
- [x] Badge "La tua azienda" mostrato nella lista companies (CompaniesPage.tsx)
- [x] Usa `selfCompanyApi` per identificare la propria azienda
- [ ] Creare self-company automaticamente alla creazione tenant (già fatto parziale in P68)

#### 3.2 Sync Bidirezionale HR ↔ Employees
Quando aggiungo dipendente a self-company → compare in /hr/profili
Quando creo profilo HR da /hr/profili → compare in employees

```
┌─────────────────┐     ┌──────────────────────┐     ┌────────────────┐
│    /employees   │◄───►│ PersonTenantProfile  │◄───►│  /hr/profili   │
│  (dipendenti    │     │ companyTenantProfile │     │   (ProfiloHR)  │
│   azienda)      │     │      = selfCompany   │     │                │
└─────────────────┘     └──────────────────────┘     └────────────────┘
```

---

### Fase 4: Mansionario con Ruoli Granulari (Priorità Media)

#### 4.1 Schema (già parziale in P68)
```prisma
model MansioneInterna {
  // ... campi esistenti ...
  defaultRoleId       String?   // Ruolo di default per questa mansione
  defaultPermissions  Json?     // Permessi base
  defaultRole         CustomRole?
}
```

#### 4.2 Pagina Override Permessi
Creare sezione in /hr/mansioni dove:
- Assegno ruolo di default alla mansione
- Posso specificare override permessi aggiuntivi
- Quando assegno mansione a persona, eredita permessi

---

### Fase 5: Riorganizzazione Pagine ✅

#### 5.1 Struttura Completata

| Route Attuale | Route Nuova | Nome Pagina | Descrizione |
|---------------|-------------|-------------|-------------|
| /roles | REDIRECT → /role-hierarchy | - | Redirect |
| /role-hierarchy | /role-hierarchy | Ruoli e Gerarchia | Tree/list ruoli + colonna utenti |
| /roles/:id | /roles/:id | Dettaglio Ruolo | Dettaglio singolo ruolo + assegnazione utenti |
| /permissions | /permissions | Permessi | Pagina consolidata con 3 tab |
| /permissions/advanced | REDIRECT → /permissions | - | Redirect (legacy) |
| /permissions/matrix | REDIRECT → /permissions?tab=matrix | - | Redirect (legacy) |
| /tenant-users | REDIRECT → /persons | - | Redirect |

#### 5.2 Tab nella Pagina Permessi Consolidata ✅
```
/permissions (PermissionsPage.tsx)
├── Tab 1: Gestione Permessi (gestione granulare per ruolo - PermissionManagementTab.tsx)
├── Tab 2: Matrice Permessi (visione complessiva - PermissionMatrixTab.tsx)
└── Tab 3: Per Persona (override per singola persona - PersonPermissionsTab.tsx)
```

#### 5.3 File Legacy Rimossi
- ❌ AdvancedPermissionsPage.tsx → Consolidato in PermissionManagementTab.tsx
- ❌ PermissionMatrixPage.tsx → Consolidato in PermissionMatrixTab.tsx

#### 5.4 Navigazione Aggiornata
- ManagementLayout.tsx: Menu semplificato con "Permessi" → /permissions
- RoleDetailPage.tsx: Button "Gestisci Permessi" → /permissions?roleType=X

---

### Fase 6: Miglioramento Drag & Drop ✅

#### 6.1 UX Improvements
- [x] Solo ADMIN/SUPER_ADMIN può modificare gerarchia (canEditHierarchy)
- [x] Ruoli di sistema non spostabili (SUPER_ADMIN)
- [ ] Feedback visivo migliorato durante drag (opzionale futuro)
- [ ] Preview della nuova posizione (opzionale futuro)

#### 6.2 Implementazione Completata
```tsx
// RoleHierarchyPage.tsx
const { userRole } = useAuth();
const canEditHierarchy = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
const canDrag = canEditHierarchy && (!node.isSystemRole || node.roleType !== 'SUPER_ADMIN');
```

---

### Fase 7: Verifica Completezza Permessi (Priorità Alta)

#### 7.1 Principio Accesso Minimo
Ogni ruolo deve avere accesso SOLO ai dati necessari:

| Ruolo | Accesso Permesso | Accesso Negato |
|-------|------------------|----------------|
| TRAINER | Corsi assegnati, partecipanti corsi | Altri corsi, altri dipendenti |
| COMPANY_ADMIN | Dati propria azienda | Dati altre aziende |
| HR_MANAGER | Dipendenti propria azienda | Dipendenti altre aziende |
| EMPLOYEE | Propri dati | Dati altri dipendenti |

#### 7.2 Audit Permessi
- [ ] Verificare ogni route ha `requirePermission()`
- [ ] Verificare filtri tenantId su tutte le query
- [ ] Verificare scope relazionale implementato
- [ ] Test di penetrazione: utente tenta accesso non autorizzato

---

## 📅 Timeline Stimata

| Fase | Durata | Dipendenze |
|------|--------|------------|
| Fase 1: Pulizia | 4h | Nessuna |
| Fase 2: Permessi Relazionali | 16h | Fase 1 |
| Fase 3: Self-Company Sync | 8h | Fase 1 |
| Fase 4: Mansionario | 8h | Fase 2 |
| Fase 5: Riorganizzazione | 12h | Fase 3, 4 |
| Fase 6: Drag & Drop | 6h | Fase 5 |
| Fase 7: Verifica | 8h | Tutte |

**Totale: ~62 ore**

---

## 🔄 Changelog

### 2026-02-05 - v2.4.0 (Session 5 - Bug Fixes & Navigation Improvements)
**Backend Fixes:**
- ✅ Backend 500 error on /roles/hierarchy/move: Added missing `canMoveRole()` and `moveRoleInHierarchy()` methods to DatabaseOperations.js
- ✅ Backend roleHierarchy/index.js: Updated exports for new methods

**Frontend Fixes:**
- ✅ ManagementLayout: Fixed sidebar double selection for dashboard items (exact match for parent menu items)
- ✅ RoleHierarchyPage: Row click now navigates to role detail page (/management/roles/:roleType)
- ✅ PermissionManagementTab: Auto-select role from URL parameter `?roleType=:id`
- ✅ MansioniInternePage: Fixed API path from `/api/v1/roles/custom` to `/api/roles/custom` (401 error)
- ✅ MansioniInternePage: Fixed initials column width to prevent layout shift
- ✅ TenantsManagement: Fixed slug only copying first letter (useRef for slugManuallyEdited to avoid stale closure)
- ✅ PersonPermissionsTab: Enhanced 3rd column to show role permissions + granular permissions with statistics
- ✅ PermissionsPage: Fixed flex layout for proper height management
- ✅ PermissionManagementTab: Removed nested scroll wrapper to fix OptimizedPermissionManager scroll

**New Features:**
- ✅ MansioneInternaDetailPage: Created new detail page for mansione interna with edit/view mode
- ✅ ManagementRouter: Added route for /management/hr/mansioni/:id

**File modificati:**
- `backend/services/roleHierarchy/DatabaseOperations.js`
- `backend/services/roleHierarchy/index.js`
- `src/components/layouts/ManagementLayout.tsx`
- `src/pages/management/roles/RoleHierarchyPage.tsx`
- `src/pages/management/permissions/PermissionManagementTab.tsx`
- `src/pages/management/permissions/PermissionsPage.tsx`
- `src/pages/management/permissions/PersonPermissionsTab.tsx`
- `src/pages/management/hr/MansioniInternePage.tsx`
- `src/pages/management/hr/MansioneInternaDetailPage.tsx` (NEW)
- `src/pages/management/ManagementRouter.tsx`
- `src/pages/management/tenants/TenantsManagement.tsx`

### 2026-02-06 - v2.4.0 (Session 5.11 - Clinical Entities & UX)

**Bug Fixes:**
- ✅ PersonPermissionsTab: Bottone "Gestione Permessi Avanzata" non appariva — root cause: `userRole === 'ADMIN'` confrontava display name, fix: `userRoles?.includes('ADMIN')` con array backend
- ✅ `/auth/me` endpoint: `include: { role: true }` riferiva relazione inesistente su PersonRole, fix: `include: { customRole: true }` + `roles = personRoles.map(pr => pr.roleType)`
- ✅ useAuth hook: Esposti `userRoleType` (backend role type) e `userRoles` (array backend roles)

**EntityList Scroll Fix:**
- ✅ PermissionsPage: `h-full min-h-[calc(100vh-12rem)]` → `h-[calc(100vh-7rem)]` (altezza viewport-relativa esplicita)
- ✅ OptimizedPermissionManagerRefactored: Rimosso `max-h-[calc(100vh-20rem)]` fragile dal grid, ora l'altezza propaga correttamente via flex

**Advanced Modal Redesign (3-colonne):**
- ✅ Creato `PersonAdvancedPermissionManager.tsx` — layout a 3 colonne identico a OptimizedPermissionManagerRefactored
  - Colonna 1: EntityList (riuso componente esistente) con ricerca
  - Colonna 2: Override permessi CRUD per entity con indicatori ruolo base + override persona
  - Colonna 3: Riepilogo override attivi raggruppati per entity con statistiche
- ✅ Scope selector (All/Tenant/Own/Relational) nel modal
- ✅ Effetto visivo: badge "Ruolo: ✓/✗" + "Concesso/Revocato" per ogni azione

**Clinical Entities & Relational Permissions (Poliambulatorio):**
- ✅ Aggiunte 20 entità cliniche in `entityDefinitions.ts`
- ✅ Aggiunti 6 RelationType clinici in `types.ts`: MEDICO_AMBULATORIO, MEDICO_PAZIENTI, MEDICO_PRESTAZIONI, CLINIC_ADMIN_POLIAMBULATORIO, AMBULATORIO_STRUMENTI, CONVENZIONE_AZIENDA
- ✅ Aggiornati `constants.ts` con relation types + icone cliniche
- ✅ Aggiornati `conversionUtils.ts` con mappature frontend↔backend

**Legacy Cleanup (1756 righe rimosse):**
- ✅ `AdvancedPermissionManager.tsx`, `VirtualEntityPermissionManager.tsx`, `PermissionAssignment.tsx`
- ✅ `PermissionsGrid.tsx`, `RoleList.tsx`, `usePermissions.ts`

**File modificati:**
- `src/hooks/auth/useAuth.ts`, `src/pages/management/permissions/PersonPermissionsTab.tsx`
- `src/pages/management/permissions/PermissionsPage.tsx`, `src/components/roles/permission-manager/OptimizedPermissionManagerRefactored.tsx`
- `src/components/roles/permission-manager/PersonAdvancedPermissionManager.tsx` (nuovo)
- `src/components/roles/permission-manager/constants.ts`
- `src/services/advanced-permissions/entityDefinitions.ts`, `types.ts`, `conversionUtils.ts`, `index.ts`
- `backend/auth/routes.js`

### 2026-02-05 - v2.3.0 (Session 4 - UI Improvements & Bug Fixes)
**Improvements:**
- ✅ PersonPermissionsTab: Nuovo layout a 3 colonne (persona, ruolo, permessi)
- ✅ PersonPermissionsTab: Modal "Gestione Permessi Avanzata" per override granulari
- ✅ PersonPermissionsTab: Cambio ruolo inline dalla colonna centrale
- ✅ RoleHierarchyPage: Bottone "Gestisci Permessi" aggiunto (→ /permissions?roleType=:id)
- ✅ RoleHierarchyPage: ActionButton nella lista include opzione permessi
- ✅ OptimizedPermissionManagerRefactored: Fix scroll indipendente per ogni colonna
- ✅ TenantsManagement: Wizard 2-step con dati Company (name, vatNumber, fiscalCode, address)
- ✅ TenantsManagement: Slug auto-generation corretto con tracking manuale

**Bug Fixes:**
- ✅ POST /api/v1/roles 400 error: Aggiunto description di default quando mancante
- ✅ MansioniInternePage: Carica tutti i ruoli (system + custom) tramite Promise.all
- ✅ ProfiloHRFormPage: Filtro dipendenti per tenant selector (useTenantFilter)
- ✅ ManagementLayout: Rimossa voce "Persone" dalla sidebar
- ✅ ManagementRouter: /persons ora reindirizza a /management/hr/profili

**File modificati:**
- `src/pages/management/permissions/PersonPermissionsTab.tsx` (redesign completo)
- `src/pages/management/roles/RoleHierarchyPage.tsx`
- `src/pages/management/tenants/TenantsManagement.tsx`
- `src/pages/management/hr/MansioniInternePage.tsx`
- `src/pages/management/hr/ProfiloHRFormPage.tsx`
- `src/components/layouts/ManagementLayout.tsx`
- `src/pages/management/ManagementRouter.tsx`
- `src/App.tsx`
- `src/components/roles/permission-manager/OptimizedPermissionManagerRefactored.tsx`

### 2026-02-05 - v2.2.0 (Session 3 - Bug Fixes)
**Fixes applicati:**
- ✅ RoleHierarchyPage: ActionButton aggiunto al TreeNode (primo tab) per azioni consistenti
- ✅ PermissionMatrixTab: Aggiunti tutti i 22 ruoli (prima solo 7)
- ✅ PersonPermissionsTab: Fix permission check (da 'write' a 'read' per visualizzazione)
- ✅ MansioniInternePage: Fix API path da `/api/v1/roles/custom` a `/api/roles/custom` (401 error)
- ✅ RoleDetailPage: Aggiunto DEFAULT_SYSTEM_PERMISSIONS per mostrare permessi ruoli di sistema
- ✅ TenantModal: Aggiunti endpoint backend validate-slug e validate-domain
- ✅ tenants.ts: Fix API path per validazione slug/domain
- ✅ tenantService.js: updateTenant ora sincronizza tenant.settings con Company collegata (piva, address, etc.)

**File modificati:**
- `src/pages/management/roles/RoleHierarchyPage.tsx`
- `src/pages/management/roles/RoleDetailPage.tsx`
- `src/pages/management/permissions/PermissionMatrixTab.tsx`
- `src/pages/management/permissions/PersonPermissionsTab.tsx`
- `src/pages/management/hr/MansioniInternePage.tsx`
- `src/services/tenants.ts`
- `backend/routes/tenants.js`
- `backend/services/tenantService.js`

### 2026-02-05 - v2.1.0 (Session 2)
- ✅ Fase 5 completata: Riorganizzazione pagine permessi
- ✅ Creata PermissionsPage.tsx con 3 tab consolidate
- ✅ Creato PermissionManagementTab.tsx (ex AdvancedPermissionsPage)
- ✅ Creato PermissionMatrixTab.tsx (ex PermissionMatrixPage)
- ✅ Creato PersonPermissionsTab.tsx (nuova funzionalità per-person)
- ✅ RoleHierarchyPage: Table layout migliorato con overflow-x-auto e fixed widths
- ✅ RoleHierarchyPage: Drag & drop con visual feedback (ring, shadow, scale)
- ✅ RoleDetailPage: Modal assegnazione utenti funzionante
- ✅ RoleDetailPage: Button rimozione utenti da ruolo
- ✅ TenantModal: Wizard 2-step con dati Company completi
- ✅ HR profili/nuovo: DatePickerElegante con tema violet
- ✅ HR mansioni: Page refresh dopo CRUD (refetch())
- ✅ ManagementLayout: Navigazione semplificata
- ✅ ManagementRouter: Route /permissions consolidata, legacy redirect
- ✅ File legacy rimossi: AdvancedPermissionsPage.tsx, PermissionMatrixPage.tsx

### 2026-02-05 - v2.0.0
- ✅ Migrazione database `allowCrossTenant` applicata
- ✅ Gerarchia corretta: TENANT_ADMIN level 2, COMPANY_ADMIN level 3
- ✅ Backend: `buildCrossTenantRelationalFilter()` implementato
- ✅ Frontend: Checkbox "Cross-tenant" aggiunto a PermissionsSection
- ✅ Frontend: Badge "La tua azienda" in CompaniesPage
- ✅ Frontend: Drag & Drop limitato a ADMIN/SUPER_ADMIN
- ✅ Pulizia README: rimossi riferimenti a file .backup inesistenti
- ✅ Verificato zero errori TypeScript
- ✅ API server health check passato

### 2026-02-05 - v1.0.0
- Creazione documento planning
- Analisi stato attuale completata
- Piano di lavoro definito

---

## 📚 Riferimenti

- [P68 - HR Personnel Management](./P68_HR_PERSONNEL_MANAGEMENT.md)
- [P48 - Person Multi-Tenant](./P48_PERSON_MULTI_TENANT.md)
- [P49 - Company Multi-Tenant](./P49_COMPANY_MULTI_TENANT.md)
- [Multi-Tenancy Guide](../02-backend/multi-tenancy.md)
