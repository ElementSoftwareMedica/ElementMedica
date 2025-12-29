# 🔍 Analisi Stato Attuale - Sistema Ruoli e Permessi

## 📊 Riepilogo Componenti Analizzati

### Frontend

#### 1. `RolesTab.tsx` (Settings)
**Percorso**: `/src/pages/settings/RolesTab.tsx`
**Linee**: ~280
**Stato**: ✅ Funzionante

**Funzionalità**:
- Selezione ruolo da lista (grid 4 colonne)
- Indicatore modifiche non salvate
- Modale conferma cambio ruolo
- Integrazione con `OptimizedPermissionManager`

**Hooks utilizzati**:
- `useRoles()` - Caricamento ruoli con cache
- `useTenants()` - Lista tenant per scope
- `useAuth()` - Verifica permessi

**Criticità**:
- Nessuna visualizzazione ereditarietà
- Scope limitati a "all/tenant/own"
- Manca preview permessi effettivi

---

#### 2. `HierarchyTab.tsx` (Settings)
**Percorso**: `/src/pages/settings/HierarchyTab.tsx`
**Linee**: ~120
**Stato**: ✅ Funzionante (wrapper)

**Funzionalità**:
- 3 pannelli informativi (Struttura, Gestione, Controllo Accessi)
- Info box su come funziona la gerarchia
- Wrapper per `RoleHierarchy` component

**Note**:
- Component semplice, logica delegata a RoleHierarchy
- Buona documentazione inline

---

#### 3. `RoleHierarchy.tsx` (Component)
**Percorso**: `/src/components/roles/RoleHierarchy.tsx`
**Linee**: ~230 (refactored da 823)
**Stato**: ✅ Refactored, modulare

**Architettura Hooks Composition**:
```
RoleHierarchy/
├── hooks/
│   ├── useHierarchyData.ts      # Fetch dati gerarchia
│   ├── useTreeState.ts          # Stato espansione/selezione
│   ├── useRoleFilters.ts        # Filtri e ricerca
│   └── useRoleOperations.ts     # CRUD operations
├── components/
│   ├── HierarchyHeader.tsx      # Header con controlli
│   ├── RoleLevelSection.tsx     # Sezione per livello
│   └── TreeViewWrapper.tsx      # Vista ad albero
└── types.ts
```

**Funzionalità**:
- Vista Tree/List toggle
- Filtro per ruoli assegnabili
- CRUD ruoli (create, edit, delete, move)
- Modale per ogni operazione

---

#### 4. `OptimizedPermissionManager.tsx` (Component)
**Percorso**: `/src/components/roles/permission-manager/`
**Linee**: ~250 (file principale)
**Stato**: ✅ Refactored, modulare

**Struttura**:
```
permission-manager/
├── OptimizedPermissionManagerRefactored.tsx  # Main
├── PermissionManagerHeader.tsx               # Header
├── RoleInfoSection.tsx                       # Info ruolo
├── EntityList.tsx                            # Lista entità
├── PermissionsSection.tsx                    # Permessi CRUD
├── FieldsSection.tsx                         # Campi per entità
└── utils.ts                                  # Utility
```

**Funzionalità**:
- Layout 4 colonne (Entità | Permessi | Campi | Riepilogo)
- Selezione entità con ricerca
- Toggle permessi CRUD per azione
- Selezione campi per azione
- Modalità bulk per operazioni multiple

**Scope supportati**:
- `all` - Tutti i dati del tenant
- `tenant` - Limitato al tenant
- `own` - Solo propri dati

**Criticità**:
- ❌ Manca scope "relational"
- ❌ Nessuna visualizzazione ereditarietà
- ❌ Nessun preview dati visibili

---

### Backend

#### 1. Sistema Routes Modulare
**Percorso**: `/backend/routes/roles/`
**File**: 12 moduli specializzati

| Modulo | Endpoint Base | Funzionalità |
|--------|---------------|--------------|
| `hierarchy.js` | `/hierarchy` | Gerarchia ruoli |
| `basic-management.js` | `/` | CRUD ruoli base |
| `custom-roles.js` | `/custom` | Ruoli personalizzati |
| `assignment.js` | `/assignment` | Assegna/rimuovi ruoli |
| `advanced-permissions.js` | `/:roleType/advanced-permissions` | Permessi avanzati |
| `permissions.js` | `/:roleType/permissions` | Permessi ruolo |
| `users.js` | `/users` | Utenti per ruolo |
| `analytics.js` | `/analytics` | Statistiche |

#### 2. Middleware Esistenti

**`middleware/auth.js`**:
- `authMiddleware` - Autenticazione base
- `tenantAuth` - Controllo tenant
- `requirePermission(permission)` - Check permesso specifico
- `requireRoleManagement` - Gestione ruoli
- `requireHierarchyManagement` - Gerarchia

**`middleware/validation.js`**:
- Validazione input per tutte le operazioni
- Sanitizzazione dati

---

### Database (Prisma Schema)

#### Modelli Chiave

```prisma
// Ruoli di sistema
enum RoleType {
  EMPLOYEE, MANAGER, HR_MANAGER, DEPARTMENT_HEAD,
  TRAINER, SENIOR_TRAINER, TRAINER_COORDINATOR, EXTERNAL_TRAINER,
  SUPER_ADMIN, ADMIN, COMPANY_ADMIN, TENANT_ADMIN,
  VIEWER, OPERATOR, COORDINATOR, SUPERVISOR, GUEST,
  CONSULTANT, AUDITOR, TRAINING_ADMIN, CLINIC_ADMIN, COMPANY_MANAGER
}

// Associazione persona-ruolo
model PersonRole {
  id                  String
  personId            String
  roleType            RoleType?
  isActive            Boolean
  isPrimary           Boolean
  level               Int                  // Livello gerarchia
  parentRoleId        String?              // Relazione parent
  path                String?              // Path nella gerarchia
  customRoleId        String?              // Se ruolo custom
  advancedPermissions AdvancedPermission[] // Permessi avanzati
}

// Permessi avanzati (granulari)
model AdvancedPermission {
  id            String
  resource      String       // "companies", "persons"
  action        String       // "read", "update"
  scope         String       // "global", "tenant", "own"
  conditions    Json?        // Condizioni custom
  allowedFields Json?        // Campi permessi
  personRoleId  String
  siteAccess    String?      // Accesso per sede
}

// Ruoli personalizzati
model CustomRole {
  id           String
  name         String
  description  String?
  level        Int
  parentRole   String?      // Eredita da
  permissions  CustomRolePermission[]
}
```

---

## 🔄 Flusso Attuale dei Permessi

```
1. Login → Person con PersonRole[]
     ↓
2. PersonRole include:
   - roleType (RoleType enum)
   - customRoleId (se ruolo custom)
   - advancedPermissions[]
     ↓
3. Frontend: useAuth().hasPermission(resource, action)
     ↓
4. Backend: requirePermission middleware
     ↓
5. Query con WHERE { tenantId, deletedAt: null }
     (NO filtro per scope relational)
```

---

## ❌ Gap Identificati

### 1. Scope Relazionale NON IMPLEMENTATO
- Trainer vede TUTTI i dati del tenant, non solo corsi assegnati
- Manager azienda vede TUTTI i dipendenti, non solo propri

### 2. Ereditarietà NON AUTOMATICA
- Permessi non ereditati dalla gerarchia
- Ogni ruolo configurato indipendentemente
- Duplicazione configurazioni

### 3. Filtro Dati NON AUTOMATICO
- Nessun middleware che applica filtri automatici
- Ogni route implementa filtri manualmente
- Inconsistenza nei controlli

### 4. UI Limitata
- Nessun editor per scope relazionale
- Nessuna visualizzazione ereditarietà
- Nessun preview dati visibili per ruolo

---

## ✅ Punti di Forza

1. **Architettura modulare** - Backend e frontend ben organizzati
2. **Schema database flessibile** - AdvancedPermission con JSON per condizioni
3. **Gerarchia esistente** - PersonRole con parentRoleId e level
4. **Multi-tenancy** - tenantId su tutte le entità
5. **GDPR compliance** - deletedAt per soft delete

---

## 🎯 Raccomandazioni

1. **Estendere AdvancedPermission** con `relationType` e `relationPath`
2. **Creare middleware** `roleDataFilter` per filtro automatico
3. **Implementare servizio** `PermissionInheritanceService` 
4. **Aggiornare UI** con editor scope relazionale
5. **Aggiungere cache** per permessi risolti (performance)

---

*Analisi completata il 30 Novembre 2025*
