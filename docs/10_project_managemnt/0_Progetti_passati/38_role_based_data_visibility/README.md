# 🔐 Progetto 38: Sistema Avanzato di Visibilità Dati Basato sui Ruoli

## 📋 Panoramica

Questo progetto implementa un sistema sofisticato per gestire la **visibilità granulare dei dati** in base ai ruoli assegnati agli utenti, con particolare attenzione alla **compliance GDPR** e alla **scalabilità**.

**Data creazione**: 30 Novembre 2025  
**Priorità**: Alta  
**Complessità**: Media-Alta  
**Stima tempo**: 3-5 giorni  
**Stato**: 🟢 **SPRINT 3 COMPLETATO** (02/12/2025)

---

## ✅ SPRINT 3 - COMPLETATO (02/12/2025)

### Frontend - Dashboard Role-Based
- ✅ `useRoleBasedData.ts`: Hook per filtraggio automatico basato sul ruolo
  - Supporta ADMIN, TRAINING_ADMIN, TRAINER, EMPLOYEE, COMPANY_MANAGER, SITE_MANAGER
  - Funzioni: filterSchedules, filterCourses, filterPersons, filterCompanies
  - API params builder: getScheduleApiParams, getCourseApiParams, getPersonApiParams
  - Visibility check: canViewSchedule, canViewCourse, canViewPerson

- ✅ `Dashboard.tsx`: Integrazione filtri role-based
  - Import useRoleBasedData hook
  - Calendar events filtrati automaticamente per ruolo
  - TRAINER: vede solo corsi come formatore/co-formatore
  - EMPLOYEE: vede solo corsi a cui è iscritto
  - ADMIN/TRAINING_ADMIN: vedono tutto

- ✅ Dashboard Stats Cards differenziate per ruolo:
  - ADMIN/TRAINING_ADMIN: Totale Aziende, Totale Dipendenti, Corsi Programmati, Corsi in Scadenza
  - TRAINER: I Miei Corsi da Formatore, Corsi in Scadenza, Prossima Sessione
  - EMPLOYEE: I Miei Corsi Iscritti, Le Mie Scadenze, Prossima Sessione

- ✅ Welcome message dinamico per ruolo

### Backend - Default Permissions Seed
- ✅ `seed-role-default-permissions.js`: Script per assegnare permessi di default
  - ADMIN: 200+ permessi (accesso completo)
  - TRAINING_ADMIN: 90+ permessi (tutto tranne gestione ruoli/gerarchia)
  - TRAINER: 25+ permessi (corsi assegnati, partecipanti, documenti)
  - EMPLOYEE: 20+ permessi (corsi iscritti, documenti personali, profilo)
  - COMPANY_MANAGER: 30+ permessi (eredita EMPLOYEE + vista colleghi azienda)
  - SITE_MANAGER: 28+ permessi (eredita EMPLOYEE + vista colleghi sede)
  - HR_MANAGER: 35+ permessi (tutti dipendenti, no finanza)
  - CONSULTANT: 25+ permessi (aziende assegnate)
  - AUDITOR: 15+ permessi (solo lettura audit/log)

- ✅ RelationType associato ai permessi:
  - TRAINER → trainer_courses
  - EMPLOYEE → course_participant
  - COMPANY_MANAGER → company_manager
  - SITE_MANAGER → site_manager

### Verifica Build
- ✅ TypeScript 0 errori
- ✅ Build completato senza errori

---

## ✅ SPRINT 1 - COMPLETATO (30/11/2025)

### Modifiche Schema Prisma
- ✅ `AdvancedPermission`: Aggiunti `relationType`, `relationConfig`, `deniedFields`, `priority`, `isInherited`, `sourceRoleId`
- ✅ `RelationDefinition`: Nuovo modello per definire catene relazionali
- ✅ `RelationType` enum: 8 tipi di relazione (TRAINER_COURSES, COMPANY_MANAGER, etc.)
- ✅ Database sincronizzato con `prisma db push`

### Seed System Relations
- ✅ 10 definizioni di relazione di sistema create
- ✅ Script: `backend/prisma/seeds/seed-relation-definitions.js`

### Backend Services
- ✅ `relation-resolver.js`: Risolve ID correlati per ogni tipo di relazione
- ✅ `permission-inheritance.js`: Gerarchia ruoli con ereditarietà permessi
- ✅ `role-data-filter.js`: Middleware per filtraggio automatico dati

### Frontend Components
- ✅ `RelationTypeSelector.tsx`: Selezione tipo relazione per scope "relational"
- ✅ `DeniedFieldsSelector.tsx`: Gestione campi permessi/negati
- ✅ `types.ts`: Aggiornato con `RelationType`, `PermissionScope`
- ✅ `constants.ts`: Aggiunto scope "relational" e RELATION_TYPES

### Verifica TypeScript
- ✅ 0 errori TypeScript

---

## ✅ SPRINT 2 - COMPLETATO (01/12/2025)

### API Endpoints
- ✅ `GET /api/v1/roles/relation-definitions`: Lista definizioni relazioni
- ✅ `POST /api/v1/roles/test-data-filter`: Test filtro dati (solo dev)
- ✅ Route order fix: endpoint statici prima di :roleType dinamico

### Middleware Integration
- ✅ `person-routes.js`: roleDataFilter su GET /employees, /trainers, /users, /, /stats
- ✅ `companies-routes.js`: roleDataFilter su GET /, GET /:id
- ✅ `schedules-routes.js`: roleDataFilter su tutti GET routes
- ✅ `courses-routes.js`: roleDataFilter su GET /, GET /:id, GET /variants

### Frontend Service
- ✅ `AdvancedPermissionsService.ts`: getRelationDefinitions(), testDataFilter()
- ✅ `types.ts`: RelationDefinition, RelationChainLink, DataFilterTestResult
- ✅ `index.ts`: Export nuovi tipi

### UI Integration
- ✅ `PermissionsSection.tsx`: RelationTypeSelector integrato per scope "relational"
- ✅ `FieldsSection.tsx`: DeniedFieldsSelector integrato
- ✅ `AdvancedPermissionManager.tsx`: updatePermission supporta PermissionScope
- ✅ `OptimizedPermissionManagerRefactored.tsx`: handleRelationTypeChange implementato

### Build & Verification
- ✅ Build completato senza errori (13.90s)
- ✅ TypeScript 0 errori su permission-manager folder
- ✅ Tutti i componenti esportati correttamente

---

## 🎯 Obiettivi del Progetto

### Obiettivo 1: Ottimizzazione Gestione Permessi per Ruolo
- Centralizzare e semplificare l'assegnazione dei permessi
- Implementare ereditarietà dei permessi nella gerarchia
- UI intuitiva per gestione permessi CRUD + scope

### Obiettivo 2: Gerarchia dei Ruoli con Ereditarietà
- Ruoli superiori ereditano automaticamente i permessi dei ruoli inferiori
- Possibilità di override/negazione permessi ereditati
- Visualizzazione chiara della catena ereditaria

### Obiettivo 3: Visibilità Dati Granulare e Relazionale
- **Scope "relational"**: Vedere solo dati in relazione con l'utente
- Esempio: Formatore vede solo aziende/dipendenti dei corsi assegnati
- Filtri automatici a livello di query database

### Obiettivo 4: Scalabilità e GDPR Compliance
- Audit trail per ogni accesso ai dati
- Rispetto multi-tenancy (tenantId sempre presente)
- Pattern di estensione per nuove entità/relazioni

---

## 📊 Stato Attuale del Sistema

### ✅ Funzionalità Esistenti

#### 1. Sistema di Ruoli (RoleType enum - 23 ruoli)
```prisma
enum RoleType {
  EMPLOYEE, MANAGER, HR_MANAGER, DEPARTMENT_HEAD,
  TRAINER, SENIOR_TRAINER, TRAINER_COORDINATOR, EXTERNAL_TRAINER,
  SUPER_ADMIN, ADMIN, COMPANY_ADMIN, TENANT_ADMIN,
  VIEWER, OPERATOR, COORDINATOR, SUPERVISOR, GUEST,
  CONSULTANT, AUDITOR, TRAINING_ADMIN, CLINIC_ADMIN, COMPANY_MANAGER
}
```

#### 2. Struttura Database Permessi
| Modello | Descrizione |
|---------|-------------|
| `PersonRole` | Associa Person a RoleType/CustomRole con gerarchia |
| `RolePermission` | Permessi specifici per PersonRole |
| `AdvancedPermission` | Permessi avanzati con scope, conditions, allowedFields |
| `CustomRole` | Ruoli personalizzati per tenant |
| `CustomRolePermission` | Permessi per ruoli custom |

#### 3. Scope Esistenti
- `all`: Accesso a tutti i dati del tenant
- `tenant`: Accesso limitato al tenant
- `own`: Accesso solo ai propri dati
- `global`: Accesso cross-tenant (solo admin)

#### 4. Frontend Implementato
- `RolesTab`: Gestione ruoli con OptimizedPermissionManager
- `HierarchyTab`: Visualizzazione gerarchia con RoleHierarchy
- `OptimizedPermissionManagerRefactored`: UI 4-colonne per permessi

#### 5. Backend Modulare
```
backend/routes/roles/
├── hierarchy.js          # GET /hierarchy, /current-user, /visible
├── basic-management.js   # CRUD ruoli base
├── custom-roles.js       # Gestione ruoli custom
├── assignment.js         # Assegnazione ruoli
├── advanced-permissions.js # Permessi avanzati
├── permissions.js        # GET/PUT permessi
├── users.js              # Utenti per ruolo
└── analytics.js          # Statistiche
```

### ❌ Funzionalità Mancanti

1. **Scope "relational"** per visibilità basata su relazioni
2. **Ereditarietà automatica** dei permessi nella gerarchia
3. **Middleware di filtraggio dati** automatico
4. **UI per gestione scope relazionale**
5. **Definizione relazioni** tra entità per filtering

---

## 🏗️ Architettura Proposta

### Livello 1: Nuovo Scope "relational"

```prisma
// Estensione AdvancedPermission
model AdvancedPermission {
  id              String       @id @default(uuid())
  resource        String       // Es: "companies", "persons"
  action          String       // Es: "read", "update"
  scope           String       // "all" | "tenant" | "own" | "relational" | "none"
  
  // Nuovo: Definizione relazione per scope relational
  relationType    String?      // Es: "trainer_courses", "company_employees"
  relationPath    Json?        // Es: ["CourseSchedule", "trainerId"]
  
  conditions      Json?        // Condizioni aggiuntive
  allowedFields   Json?        // Campi visibili
  deniedFields    Json?        // Campi nascosti (nuovo)
  ...
}
```

### Livello 2: Definizione Relazioni

```typescript
// Configurazione relazioni per scope relational
const RELATION_DEFINITIONS = {
  // Formatore → può vedere aziende/persone dei corsi dove è trainer
  trainer_courses: {
    baseEntity: 'Person',
    targetEntities: ['Company', 'Person', 'CourseSchedule'],
    relationChain: [
      { from: 'Person', to: 'CourseSchedule', via: 'trainerId' },
      { from: 'CourseSchedule', to: 'Company', via: 'companyId' },
      { from: 'CourseSchedule', to: 'CourseEnrollment', via: 'scheduledCourseId' },
      { from: 'CourseEnrollment', to: 'Person', via: 'personId' }
    ]
  },
  
  // Manager azienda → vede solo dipendenti della propria azienda
  company_manager: {
    baseEntity: 'Person',
    targetEntities: ['Person', 'CompanySite', 'Reparto'],
    relationChain: [
      { from: 'Person', to: 'Company', via: 'companyId' },
      { from: 'Company', to: 'Person', via: 'companyId' }
    ]
  },
  
  // HR Manager → vede tutti i dipendenti del tenant
  hr_tenant: {
    baseEntity: 'Person',
    targetEntities: ['Person', 'Company'],
    relationChain: [] // Nessun filtro aggiuntivo oltre tenantId
  }
};
```

### Livello 3: Middleware di Filtraggio Automatico

```javascript
// backend/middleware/role-data-filter.js
export const roleDataFilter = async (req, res, next) => {
  const { person, tenant } = req;
  
  // Carica permessi avanzati dell'utente
  const permissions = await getPersonAdvancedPermissions(person.id);
  
  // Costruisci filtro per la risorsa richiesta
  const resource = extractResourceFromPath(req.path);
  const permission = permissions.find(p => p.resource === resource);
  
  if (!permission) {
    req.dataFilter = { allowed: false };
    return next();
  }
  
  switch (permission.scope) {
    case 'all':
      req.dataFilter = { tenantId: tenant.id, deletedAt: null };
      break;
      
    case 'own':
      req.dataFilter = { 
        tenantId: tenant.id, 
        deletedAt: null,
        id: person.id 
      };
      break;
      
    case 'relational':
      req.dataFilter = await buildRelationalFilter(
        person.id,
        tenant.id,
        permission.relationType,
        permission.relationPath
      );
      break;
      
    case 'none':
      req.dataFilter = { allowed: false };
      break;
  }
  
  // Aggiungi field filtering
  req.allowedFields = permission.allowedFields;
  req.deniedFields = permission.deniedFields;
  
  next();
};
```

### Livello 4: Ereditarietà Permessi nella Gerarchia

```javascript
// backend/services/permission-inheritance.js
export const resolveEffectivePermissions = async (personId, tenantId) => {
  // 1. Carica ruoli della persona con gerarchia
  const personRoles = await prisma.personRole.findMany({
    where: { personId, tenantId, isActive: true },
    include: { 
      parentRole: true,
      advancedPermissions: true,
      customRole: { include: { permissions: true } }
    }
  });
  
  // 2. Costruisci mappa permessi con ereditarietà
  const permissionMap = new Map();
  
  for (const role of personRoles) {
    // Permessi diretti del ruolo
    for (const perm of role.advancedPermissions) {
      const key = `${perm.resource}:${perm.action}`;
      const existing = permissionMap.get(key);
      
      // Il permesso più permissivo vince (o override esplicito)
      if (!existing || perm.priority > existing.priority) {
        permissionMap.set(key, perm);
      }
    }
    
    // Permessi ereditati dalla gerarchia (parentRole)
    if (role.parentRoleId) {
      const inheritedPerms = await getInheritedPermissions(role.parentRoleId);
      for (const perm of inheritedPerms) {
        const key = `${perm.resource}:${perm.action}`;
        if (!permissionMap.has(key)) {
          permissionMap.set(key, { ...perm, inherited: true });
        }
      }
    }
  }
  
  return Array.from(permissionMap.values());
};
```

---

## 📁 Struttura File da Creare/Modificare

### Nuovi File

```
backend/
├── middleware/
│   └── role-data-filter.js              # Middleware filtraggio dati
├── services/
│   ├── permission-inheritance.js        # Logica ereditarietà
│   └── relation-resolver.js             # Risoluzione relazioni
├── config/
│   └── relation-definitions.js          # Definizioni relazioni
└── routes/roles/
    └── relation-scopes.js               # API per scope relazionali

src/
├── components/roles/
│   ├── RelationalScopeEditor.tsx        # UI per scope relational
│   └── PermissionInheritanceView.tsx    # Vista ereditarietà
├── services/
│   └── advanced-permissions/
│       └── relationalScopes.ts          # Client API scope relazionali
└── pages/settings/
    └── DataVisibilityTab.tsx            # Nuova tab per visibilità dati
```

### File da Modificare

```
backend/
├── prisma/schema.prisma                 # Aggiungere campi a AdvancedPermission
├── routes/roles/advanced-permissions.js # Supporto scope relational
└── middleware/auth-advanced.js          # Integrazione filtro dati

src/
├── components/roles/permission-manager/ # Aggiungere selector scope relational
├── hooks/useRoles.ts                    # Supporto ereditarietà
└── services/advanced-permissions/types.ts # Nuovi tipi
```

---

## 🔄 Fasi di Implementazione

### Fase 1: Schema Database (2h)
- [ ] Aggiungere campi `relationType`, `relationPath`, `deniedFields` a AdvancedPermission
- [ ] Creare tabella `RelationDefinition` per configurazione relazioni
- [ ] Migration Prisma

### Fase 2: Backend - Logica Core (4h)
- [ ] `permission-inheritance.js`: Logica ereditarietà permessi
- [ ] `relation-resolver.js`: Risoluzione query per scope relational
- [ ] `role-data-filter.js`: Middleware filtraggio automatico

### Fase 3: Backend - API (3h)
- [ ] `relation-scopes.js`: CRUD per definizioni relazioni
- [ ] Modificare `advanced-permissions.js` per scope relational
- [ ] Endpoint per test/preview filtri

### Fase 4: Frontend - UI Gestione (4h)
- [ ] `RelationalScopeEditor.tsx`: Selezione tipo relazione
- [ ] `PermissionInheritanceView.tsx`: Visualizzazione ereditarietà
- [ ] Integrazione in OptimizedPermissionManager

### Fase 5: Frontend - Tab Visibilità (3h)
- [ ] `DataVisibilityTab.tsx`: Nuova sezione settings
- [ ] Preview dati visibili per ruolo
- [ ] Test di configurazione

### Fase 6: Testing & Documentazione (2h)
- [ ] Unit test middleware filtraggio
- [ ] Integration test scope relational
- [ ] Documentazione API

---

## 🧪 Casi d'Uso Specifici

### Caso 1: Formatore
```typescript
// Configurazione per ruolo TRAINER
{
  roleType: 'TRAINER',
  permissions: [
    {
      resource: 'companies',
      action: 'read',
      scope: 'relational',
      relationType: 'trainer_courses',
      allowedFields: ['id', 'ragioneSociale', 'citta', 'telefono']
      // Esclusi: iban, pec, sdi, codiceFiscale (dati sensibili)
    },
    {
      resource: 'persons',
      action: 'read',
      scope: 'relational',
      relationType: 'trainer_courses',
      allowedFields: ['id', 'firstName', 'lastName', 'email']
      // Esclusi: fiscalCode, salary, birthDate (dati sensibili)
    },
    {
      resource: 'courses',
      action: 'read',
      scope: 'relational',
      relationType: 'trainer_courses',
      allowedFields: ['*'] // Tutti i campi
    },
    {
      resource: 'schedules',
      action: 'update',
      scope: 'relational',
      relationType: 'trainer_courses',
      allowedFields: ['attendance', 'notes'] // Solo questi campi modificabili
    }
  ]
}
```

### Caso 2: Manager Azienda
```typescript
{
  roleType: 'COMPANY_MANAGER',
  permissions: [
    {
      resource: 'persons',
      action: 'read',
      scope: 'relational',
      relationType: 'company_manager',
      allowedFields: ['*'],
      deniedFields: ['salary'] // Tutti tranne stipendio
    },
    {
      resource: 'companySites',
      action: 'update',
      scope: 'relational',
      relationType: 'company_manager'
    }
  ]
}
```

### Caso 3: Admin (Ereditarietà)
```typescript
{
  roleType: 'ADMIN',
  level: 2, // Livello alto nella gerarchia
  inheritsFrom: ['MANAGER', 'HR_MANAGER', 'TRAINER_COORDINATOR'],
  permissions: [
    // Eredita tutti i permessi dei ruoli inferiori
    // Può avere override per permessi specifici
    {
      resource: '*', // Tutti le risorse
      action: '*',   // Tutte le azioni
      scope: 'all',  // Override: accesso completo
      allowedFields: ['*']
    }
  ]
}
```

---

## 📐 Diagramma Architettura

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  RolesTab    │  │ HierarchyTab │  │ DataVisibilityTab    │  │
│  │  (Permessi)  │  │ (Gerarchia)  │  │ (Scope Relazionali)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                  │                      │              │
│  ┌──────┴───────────────────┴──────────────────────┴───────────┐│
│  │              OptimizedPermissionManager                     ││
│  │  + RelationalScopeEditor + PermissionInheritanceView        ││
│  └──────────────────────────┬──────────────────────────────────┘│
└─────────────────────────────┼───────────────────────────────────┘
                              │ API Calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    API Routes                             │   │
│  │  /roles/hierarchy  /roles/permissions  /roles/relations   │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────┴───────────────────────────────┐   │
│  │              MIDDLEWARE STACK                             │   │
│  │  ┌────────────┐  ┌─────────────┐  ┌─────────────────┐    │   │
│  │  │ auth.js    │→ │ validation  │→ │ roleDataFilter  │    │   │
│  │  │            │  │             │  │ (NEW)           │    │   │
│  │  └────────────┘  └─────────────┘  └────────┬────────┘    │   │
│  └─────────────────────────────────────────────┼────────────┘   │
│                                                 │                │
│  ┌─────────────────────────────────────────────┴────────────┐   │
│  │                    SERVICES                               │   │
│  │  ┌────────────────────┐  ┌─────────────────────────────┐ │   │
│  │  │ permission-        │  │ relation-resolver.js        │ │   │
│  │  │ inheritance.js     │  │ (Build relational queries)  │ │   │
│  │  │ (Inherit perms)    │  │                             │ │   │
│  │  └────────────────────┘  └─────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    DATABASE (Prisma)                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │ PersonRole   │  │ Advanced     │  │ Relation       │  │   │
│  │  │ + hierarchy  │  │ Permission   │  │ Definition     │  │   │
│  │  │              │  │ + relational │  │ (NEW)          │  │   │
│  │  └──────────────┘  └──────────────┘  └────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist Conformità

### GDPR
- [ ] Audit log per ogni accesso ai dati filtrati
- [ ] Campo `deniedFields` per nascondere dati sensibili
- [ ] Soft delete rispettato in tutti i filtri
- [ ] Consenso verificato prima dell'accesso a dati PII

### Multi-Tenancy
- [ ] `tenantId` sempre presente nei filtri
- [ ] Isolamento completo tra tenant
- [ ] Relazioni sempre validate per stesso tenant

### Sicurezza
- [ ] Nessun bypass per admin (filtri sempre applicati)
- [ ] Validazione input su tutti gli endpoint
- [ ] Rate limiting sulle query pesanti

### Performance
- [ ] Index su campi usati nei filtri relazionali
- [ ] Cache per permessi risolti (TTL 5 min)
- [ ] Query ottimizzate con Prisma select

---

## 📚 Riferimenti

- `docs/10_project_managemnt/0_Progetti_passati/18_gerarchia_ruoli_avanzata/`
- `docs/10_project_managemnt/0_Progetti_passati/23_ottimizzazione_gestione_ruoli/`
- `backend/routes/roles/README.md`
- `.github/copilot-instructions.md` - Regole progetto

---

## 🚀 Prossimi Passi

1. **Review architettura** con team
2. **Prototipo middleware** `roleDataFilter`
3. **Test con caso d'uso Formatore**
4. **Estensione a tutti i ruoli**
5. **UI per configurazione**

---

*Documento creato il 30 Novembre 2025*
*Autore: GitHub Copilot + Team ElementMedica*
