# Ruoli e Permessi — Architettura RBAC

## Formato Permessi

Tutti i permessi usano il formato **`resource:action`** (es. `companies:read`, `clinica.visite:create`).

```
resource:action
├── resource      → entità (companies, courses, clinica.visite, hr.turni)
├── action        → operazione (read, create, update, delete, manage, export, download)
└── sub-resource  → notazione con punto (clinica.visite, cms.pages, hr.turni)
```

### Wildcards

| Pattern | Significato |
|---------|-------------|
| `*:*` | Accesso completo a tutto (solo SUPER_ADMIN) |
| `resource:*` | Tutte le azioni su una risorsa |
| `clinica:*` | Tutte le azioni su tutte le sotto-risorse clinica.* |

### Azione `manage`

L'azione `manage` implica `read + create + update + delete` sulla risorsa.

### Action Aliases (matchPermission)

| Azione Utente | Implica |
|---------------|---------|
| `manage` | Tutte le azioni (read, create, update, delete, write, ...) |
| `write` | `create` e `update` |
| `create` / `update` | `write` |
| `*` | Qualsiasi azione |

### Matching Sub-Risorse

| Permesso Utente | Permesso Route | Match? |
|-----------------|----------------|--------|
| `clinica:*` | `clinica.visite:read` | ✅ (parent wildcard) |
| `clinica:read` | `clinica.visite:read` | ✅ (parent action) |
| `clinica.visite:read` | `visite:read` | ✅ (reverse sub-resource) |
| `clinica.visite:write` | `visite:create` | ✅ (reverse + action alias) |

---

## I 31 Ruoli

### Admin
| Ruolo | Scope | Descrizione |
|-------|-------|-------------|
| SUPER_ADMIN | global | `*:*` — accesso totale al sistema |
| ADMIN | tenant | Tutte le risorse del tenant |
| TENANT_ADMIN | tenant | Come ADMIN senza system/admin management |
| CLINIC_ADMIN | tenant | Full clinica + gestione utenti/aziende |
| TRAINING_ADMIN | tenant | Full formazione + gestione utenti/aziende |
| COMPANY_ADMIN | company | Gestione aziendale completa |

### Management
| Ruolo | Scope | Descrizione |
|-------|-------|-------------|
| MANAGER | company | Dipendenti + corsi + documenti (no modifica aziendale) |
| HR_MANAGER | tenant | HR completo + dipendenti + corsi + documenti |
| DEPARTMENT_HEAD | department | Reparto: dipendenti + corsi + schedules |
| COMPANY_MANAGER | company | Company + dipendenti + documenti (read) |
| COORDINATOR | tenant | Coordinamento corsi + schedules + partecipanti |
| SUPERVISOR | tenant | Supervisione formazione + report |

### Formazione
| Ruolo | Scope | Descrizione |
|-------|-------|-------------|
| TRAINER | tenant | Propri corsi + schedules + partecipanti |
| SENIOR_TRAINER | tenant | Come TRAINER + gestione altri formatori |
| TRAINER_COORDINATOR | tenant | Coordinamento formatori + schedules |
| EXTERNAL_TRAINER | tenant | Solo propri corsi/schedules (accesso limitato) |

### Base
| Ruolo | Scope | Descrizione |
|-------|-------|-------------|
| EMPLOYEE | company | Solo propri corsi, attestati, documenti, notifiche |
| VIEWER | tenant | Sola lettura su aziende, dipendenti, corsi |
| OPERATOR | tenant | Lettura + creazione documenti/schedules |
| GUEST | tenant | Solo notifiche e contenuti pubblici |

### Clinica
| Ruolo | Scope | Descrizione |
|-------|-------|-------------|
| MEDICO | ambulatorio | Visite, referti, appuntamenti del proprio ambulatorio |
| PAZIENTE | self | Solo propri referti, appuntamenti, documenti |
| INFERMIERE | ambulatorio | Supporto visite, lettura pazienti |
| SEGRETERIA_CLINICA | clinica | Gestione pazienti, appuntamenti, calendario |

### Sicurezza sul Lavoro
| Ruolo | Scope | Descrizione |
|-------|-------|-------------|
| MEDICO_COMPETENTE | aziende | Sorveglianza sanitaria, visite mediche lavoro |
| RSPP | aziende | DVR, valutazione rischi, formazione sicurezza |
| ASPP | aziende | Supporto RSPP, ispezioni, report |
| TECNICO_SICUREZZA | aziende | Ispezioni, verifiche impianti, report |
| CONSULENTE_SICUREZZA | aziende | Consulenza esterna DVR, documenti, report |

### Special
| Ruolo | Scope | Descrizione |
|-------|-------|-------------|
| CONSULTANT | assigned | Aziende assegnate: documenti, report |
| AUDITOR | tenant | Sola lettura: audit log, GDPR, report |

---

## File di Riferimento

| File | Scopo |
|------|-------|
| `backend/services/enhancedRole/utils/RoleTypes.js` | **Fonte di verità** — `getDefaultPermissions(roleType)` |
| `backend/constants/permissions.js` | Costanti PERMISSIONS, utility (matchPermission, isValidPermission) |
| `backend/services/RBACService.js` | Logica RBAC: hasPermission, getPersonPermissions |
| `backend/middleware/rbac.js` | Middleware `requirePermission()` per le route |
| `src/utils/permissionMapping.ts` | Normalizzazione permessi backend → frontend |
| `src/context/AuthContext.tsx` | `hasPermission(resource, action)` nel frontend |

---

## Tre Fonti di Permessi (Merge in RBACService)

```
getPersonPermissions(personId, tenantId)
├── 1. RolePermission (DB)         → permessi assegnati espliciti
├── 2. AdvancedPermission (DB)     → permessi con scope/condizioni (resource + action)
└── 3. getDefaultPermissions()     → permessi di default per roleType
```

Risultato: unione di tutte e tre le fonti, senza duplicati.

---

## Frontend: hasPermission()

```tsx
// Due parametri (raccomandato)
hasPermission('companies', 'read')    // → controlla permissions['companies:read']

// Un parametro
hasPermission('companies:read')       // → controlla permissions['companies:read']
```

### Logica di matching nel frontend (AuthContext):
1. Controlla `*:*` o `all:*` (permesso universale SUPER_ADMIN)
2. Controlla `{resource}:*` (tutte le azioni per la risorsa)
3. Controlla permesso esatto `{resource}:{action}`
4. Per `read`: se ha QUALSIASI permesso su quella risorsa, concede `read`

### Normalizzazione (permissionMapping.ts):
- `read` ↔ `view` (alias bidirezionale)
- `edit` ↔ `update` (alias bidirezionale)
- `manage` → espande a `read/view/create/update/edit/delete/write`
- `write` → espande a `create/update/edit`
- Sub-risorse (`cms.pages:read`) → genera parent (`cms:read`) e child flat (`pages:read`)
- `*:*` → `all:*`

---

## Seed Scripts

```bash
# Seed permessi di default per TUTTI i ruoli (+ pulizia legacy SCREAMING_SNAKE)
node backend/scripts/seed-role-default-permissions.js

# Seed solo permessi ADMIN/SUPER_ADMIN
node backend/scripts/seed-admin-permissions.js
```

I seed script usano `getDefaultPermissions()` come unica fonte di verità.
Rimuovono automaticamente permessi legacy in formato SCREAMING_SNAKE dal DB.

---

## Aggiungere un Nuovo Permesso

1. Aggiungi la costante in `backend/constants/permissions.js` → sezione PERMISSIONS
2. Aggiungi il permesso ai ruoli appropriati in `getDefaultPermissions()` → `RoleTypes.js`
3. Usa `requirePermission('resource:action')` nelle route
4. Frontend: `hasPermission('resource', 'action')` — nessuna modifica necessaria a permissionMapping.ts

---

## Aggiungere un Nuovo Ruolo

1. Aggiungi il RoleType nel Prisma schema → `enum RoleType`
2. Aggiungi in `ROLE_TYPES` → `RoleTypes.js`
3. Aggiungi il case in `getDefaultPermissions()` con i permessi appropriati
4. Esegui `npx prisma generate` e la migration
5. Esegui `node backend/scripts/seed-role-default-permissions.js`
