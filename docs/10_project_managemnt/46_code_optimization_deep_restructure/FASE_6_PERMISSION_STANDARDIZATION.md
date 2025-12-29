# 📋 Fase 6: Standardizzazione Permessi - Analisi Dettagliata

**Progetto**: 46 - Ottimizzazione Profonda  
**Fase**: 6 (Consolidamento Permessi)  
**Data Analisi**: 29 dicembre 2025  
**Priorità**: ALTA  
**Rischio**: MEDIO

---

## 🔍 Analisi Stato Attuale

### Problema Identificato

Il sistema attualmente usa **4 formati diversi** di permessi, causando:
- Complessità nel middleware di mappatura
- Difficoltà di manutenzione
- Performance degradata (mappatura runtime)
- Rischio di inconsistenze

### Formati Attuali (260+ chiamate totali)

| Formato | Esempio | Files | Count |
|---------|---------|-------|-------|
| `SCREAMING_SNAKE_CASE` | `VIEW_TEMPLATES`, `USER_MANAGEMENT` | cms-routes, template-routes, advanced-permissions | ~80 |
| `resource:action` | `persons:read`, `tariffari:write` | person-routes, tariffario-routes, notification-routes | ~70 |
| `action:resource` | `read:documents`, `create:schedules` | document-routes, schedules-routes, attestati-routes | ~60 |
| `resource.action` | `roles.read`, `system.admin` | advanced-permissions, google-docs-routes | ~20 |

### Files Più Critici (per numero di permessi)

| File | Permessi | Formato Usato |
|------|----------|---------------|
| person-routes.js | 17 | `resource:action` |
| cms-routes.js | 17 | `SCREAMING_SNAKE_CASE` |
| tariffario-aziendale-routes.js | 16 | `resource:action` |
| notification-routes.js | 16 | `resource:action` |
| preventivi-routes.js | 12 | Misto |
| template-routes.js | 11 | `SCREAMING_SNAKE_CASE` |
| attestati-routes.js | 10 | `action:resource` |
| schedules-routes.js | 9 | `action:resource` |

### Problema nel RBACService.mapPermission()

Il metodo `mapPermission()` in [RBACService.js](backend/services/RBACService.js) contiene **~500 linee** di switch/case che mappano ogni permesso database a molteplici formati:

```javascript
case 'VIEW_EMPLOYEES':
    permissions['employees:read'] = true;
    permissions['read:employees'] = true;  // Duplicato inverso!
    permissions['companies:read'] = true;
    break;
```

**Problemi**:
1. **Duplicazione**: Ogni permesso genera 2-5 varianti
2. **Performance**: Esecuzione a runtime per ogni request
3. **Manutenzione**: Aggiungere un permesso richiede modifiche in 3+ posti
4. **Inconsistenza**: Alcuni permessi hanno mapping, altri no

---

## 🎯 Formato Standard Proposto

### Formato Unificato: `resource:action`

Propongo di standardizzare su **`resource:action`** perché:

1. **Leggibilità**: `companies:read` è più chiaro di `READ_COMPANIES`
2. **Scalabilità**: Facile aggiungere nuove risorse/azioni
3. **Wildcard Support**: Già implementato (`companies:*`)
4. **Consistenza**: Segue pattern comuni (AWS IAM, OAuth scopes)

### Convenzioni

```
resource:action

Dove:
- resource: nome entità in lowercase (companies, persons, courses, cms)
- action: operazione in lowercase (read, create, update, delete, manage, export)
```

### Azioni Standard

| Azione | Descrizione |
|--------|-------------|
| `read` | Visualizzare/leggere |
| `create` | Creare nuovo |
| `update` | Modificare esistente |
| `delete` | Eliminare |
| `manage` | Tutte le operazioni + admin |
| `export` | Esportare dati |
| `import` | Importare dati |
| `*` | Wildcard (tutte le azioni) |

### Risorse Standard

| Risorsa | Descrizione |
|---------|-------------|
| `companies` | Aziende |
| `persons` | Persone (utenti, dipendenti, formatori) |
| `employees` | Dipendenti (sotto-risorsa di persons) |
| `trainers` | Formatori (sotto-risorsa di persons) |
| `courses` | Corsi |
| `schedules` | Programmazioni |
| `documents` | Documenti |
| `templates` | Template |
| `cms` | Content Management System |
| `cms.pages` | Pagine CMS |
| `cms.media` | Media CMS |
| `preventivi` | Preventivi |
| `invoices` | Fatture |
| `notifications` | Notifiche |
| `settings` | Impostazioni |
| `roles` | Ruoli |
| `gdpr` | GDPR/Privacy |
| `audit` | Audit logs |
| `clinica` | Modulo clinico |
| `clinica.ambulatori` | Ambulatori |
| `clinica.prestazioni` | Prestazioni |
| `clinica.visite` | Visite |
| `clinica.referti` | Referti |
| `tariffari` | Tariffari |

---

## 📊 Mappatura Migrazione

### Da SCREAMING_SNAKE_CASE a resource:action

| Vecchio | Nuovo |
|---------|-------|
| `VIEW_COMPANIES` | `companies:read` |
| `CREATE_COMPANIES` | `companies:create` |
| `EDIT_COMPANIES` | `companies:update` |
| `DELETE_COMPANIES` | `companies:delete` |
| `VIEW_CMS_PAGES` | `cms.pages:read` |
| `CREATE_CMS_PAGES` | `cms.pages:create` |
| `EDIT_CMS_PAGES` | `cms.pages:update` |
| `DELETE_CMS_PAGES` | `cms.pages:delete` |
| `PUBLISH_CMS_PAGES` | `cms.pages:publish` |
| `VIEW_CMS_MEDIA` | `cms.media:read` |
| `MANAGE_CMS_MEDIA` | `cms.media:manage` |
| `VIEW_TEMPLATES` | `templates:read` |
| `CREATE_TEMPLATES` | `templates:create` |
| `EDIT_TEMPLATES` | `templates:update` |
| `DELETE_TEMPLATES` | `templates:delete` |
| `USER_MANAGEMENT` | `users:manage` |
| `ROLE_MANAGEMENT` | `roles:manage` |
| `SYSTEM_SETTINGS` | `system:manage` |
| `ADMIN_PANEL` | `admin:access` |

### Da action:resource a resource:action

| Vecchio | Nuovo |
|---------|-------|
| `read:documents` | `documents:read` |
| `create:documents` | `documents:create` |
| `delete:documents` | `documents:delete` |
| `send:documents` | `documents:send` |
| `read:schedules` | `schedules:read` |
| `create:schedules` | `schedules:create` |
| `update:schedules` | `schedules:update` |
| `delete:schedules` | `schedules:delete` |
| `read:templates` | `templates:read` |

### Da resource.action a resource:action

| Vecchio | Nuovo |
|---------|-------|
| `roles.read` | `roles:read` |
| `roles.manage` | `roles:manage` |
| `system.admin` | `system:manage` |
| `users.manage_roles` | `users:manage_roles` |

---

## 🔧 Piano di Implementazione

### Step 1: Creare PermissionConstants.js

File centralizzato con tutte le costanti dei permessi:

```javascript
// backend/constants/permissions.js

export const PERMISSIONS = {
  // Companies
  COMPANIES_READ: 'companies:read',
  COMPANIES_CREATE: 'companies:create',
  COMPANIES_UPDATE: 'companies:update',
  COMPANIES_DELETE: 'companies:delete',
  COMPANIES_MANAGE: 'companies:manage',
  COMPANIES_IMPORT: 'companies:import',
  
  // Persons
  PERSONS_READ: 'persons:read',
  PERSONS_CREATE: 'persons:create',
  PERSONS_UPDATE: 'persons:update',
  PERSONS_DELETE: 'persons:delete',
  PERSONS_MANAGE: 'persons:manage',
  PERSONS_IMPORT: 'persons:import',
  PERSONS_EXPORT: 'persons:export',
  
  // ... etc
};

// Per backward compatibility
export const PERMISSION_ALIASES = {
  'VIEW_COMPANIES': PERMISSIONS.COMPANIES_READ,
  'CREATE_COMPANIES': PERMISSIONS.COMPANIES_CREATE,
  'read:documents': PERMISSIONS.DOCUMENTS_READ,
  'roles.read': PERMISSIONS.ROLES_READ,
  // ... mappatura completa
};
```

### Step 2: Aggiornare RBACService

Semplificare il metodo `hasPermission()` per supportare:
1. Formato standard diretto
2. Backward compatibility con alias
3. Wildcards (`resource:*`)

```javascript
static async hasPermission(personId, permission) {
    // Normalizza il permesso (gestisce alias)
    const normalizedPermission = this.normalizePermission(permission);
    
    // Get permissions from cache or DB
    const permissions = await this.getPersonPermissions(personId);
    
    // Direct match
    if (permissions[normalizedPermission]) return true;
    
    // Wildcard match (resource:*)
    const [resource] = normalizedPermission.split(':');
    if (permissions[`${resource}:*`] || permissions['*:*']) return true;
    
    return false;
}

static normalizePermission(permission) {
    // Se è già nel formato corretto, restituiscilo
    if (permission.includes(':') && !permission.includes('.')) {
        return permission.toLowerCase();
    }
    
    // Converti da alias
    if (PERMISSION_ALIASES[permission]) {
        return PERMISSION_ALIASES[permission];
    }
    
    // Converti da SCREAMING_SNAKE_CASE
    if (permission.match(/^[A-Z_]+$/)) {
        return this.convertFromScreamingSnakeCase(permission);
    }
    
    // Converti da resource.action
    if (permission.includes('.')) {
        return permission.replace('.', ':');
    }
    
    return permission.toLowerCase();
}
```

### Step 3: Migrazione Graduale Routes

Migrare ogni file routes usando le costanti:

```javascript
// PRIMA
router.get('/', requirePermissions('VIEW_COMPANIES'), controller.list);

// DOPO
import { PERMISSIONS } from '../constants/permissions.js';
router.get('/', requirePermissions(PERMISSIONS.COMPANIES_READ), controller.list);
```

### Step 4: Aggiornare Seed

Usare i permessi standardizzati nel seed:

```javascript
const STANDARD_PERMISSIONS = [
  'companies:read', 'companies:create', 'companies:update', 'companies:delete',
  'persons:read', 'persons:create', 'persons:update', 'persons:delete',
  // ...
];
```

### Step 5: Eliminare Mappatura Duplicata

Rimuovere la funzione `mapPermission()` da RBACService dopo la migrazione.

---

## 📋 Files da Modificare

### Alta Priorità (>10 permessi)

1. `backend/routes/person-routes.js` (17)
2. `backend/routes/cms-routes.js` (17)
3. `backend/routes/tariffario-aziendale-routes.js` (16)
4. `backend/routes/notification-routes.js` (16)
5. `backend/routes/preventivi-routes.js` (12)
6. `backend/routes/template-routes.js` (11)

### Media Priorità (5-10 permessi)

7. `backend/routes/attestati-routes.js` (10)
8. `backend/routes/import-routes.js` (10)
9. `backend/routes/cms-media-routes.js` (10)
10. `backend/routes/template-routes-enhanced.js` (9)
11. `backend/routes/schedules-routes.js` (9)
12. `backend/routes/document-routes.js` (8)
13. `backend/routes/advanced-permissions.js` (8)

### Bassa Priorità (<5 permessi)

14-30. Rimanenti files

---

## ⚠️ Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Breaking changes auth | Alta | Critico | Backward compatibility con alias |
| Dimenticare una route | Media | Alto | Script di verifica automatico |
| Performance regressione | Bassa | Medio | Caching normalizzazione |

---

## ✅ Checklist Implementazione

- [ ] Creare `backend/constants/permissions.js`
- [ ] Creare `backend/constants/permission-aliases.js` (backward compat)
- [ ] Aggiornare `RBACService.normalizePermission()`
- [ ] Migrare routes alta priorità (6 files)
- [ ] Migrare routes media priorità (7 files)
- [ ] Migrare routes bassa priorità (~15 files)
- [ ] Aggiornare seed.js con permessi standard
- [ ] Eliminare `mapPermission()` duplicato
- [ ] Test E2E tutti i permessi
- [ ] Documentare formato standard

---

## 📊 Metriche di Successo

| Metrica | Attuale | Target |
|---------|---------|--------|
| Formati permessi | 4 | 1 |
| Linee in mapPermission() | ~500 | 0 |
| Files con formato inconsistente | 30+ | 0 |
| Complessità ciclomatica RBAC | Alta | Media |

---

*Documento creato il 29/12/2025 - Progetto 46 Phase 6*
