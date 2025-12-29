# 👥 SPEC_11: Ruoli e Permessi Clinici

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Collegato a**: [SPEC_12_AUDIT_GDPR.md](./SPEC_12_AUDIT_GDPR.md)

---

## 1. OVERVIEW

Il sistema RBAC clinico estende il sistema esistente con ruoli e permessi specifici per il contesto medico.

### 1.1 Nuovi RoleType

```typescript
enum RoleType {
  // Esistenti
  SUPER_ADMIN,
  ADMIN,
  MANAGER,
  EDITOR,
  VIEWER,
  
  // Nuovi clinici
  MEDICO,
  INFERMIERE,
  SEGRETERIA_MEDICA,
  PAZIENTE,
  AMMINISTRATIVO_CLINICO,
  DIRETTORE_SANITARIO
}
```

### 1.2 Gerarchia Ruoli Clinici

```
DIRETTORE_SANITARIO
    │
    ├── MEDICO
    │     └── (può delegare a INFERMIERE)
    │
    ├── AMMINISTRATIVO_CLINICO
    │
    └── SEGRETERIA_MEDICA
          │
          └── PAZIENTE (accesso limitato ai propri dati)
```

---

## 2. DEFINIZIONE RUOLI

### 2.1 DIRETTORE_SANITARIO

| Area | Permessi |
|------|----------|
| Struttura | CRUD completo poliambulatorio, sedi, ambulatori |
| Personale | Gestione medici, infermieri |
| Clinica | Visualizza tutte le visite/referti |
| Report | Accesso completo statistiche |
| Audit | Visualizza audit trail completo |

### 2.2 MEDICO

| Area | Permessi |
|------|----------|
| Agenda | Visualizza/gestisce propria agenda |
| Appuntamenti | Visualizza propri appuntamenti |
| Visite | CRUD visite proprie |
| Referti | Crea, modifica, firma propri referti |
| Pazienti | Visualizza dati pazienti in cura |

### 2.3 INFERMIERE

| Area | Permessi |
|------|----------|
| Agenda | Visualizza agenda ambulatori assegnati |
| Visite | Assiste, compila campi delegati |
| Referti | Visualizza (no modifica/firma) |
| Pazienti | Dati base, no storia completa |

### 2.4 SEGRETERIA_MEDICA

| Area | Permessi |
|------|----------|
| Agenda | CRUD completo |
| Appuntamenti | CRUD completo |
| Accettazione | Check-in, chiamata |
| Pazienti | CRUD anagrafica |
| Fatturazione | Gestione pagamenti |
| Referti | Solo visualizza |

### 2.5 PAZIENTE

| Area | Permessi |
|------|----------|
| Profilo | Visualizza/modifica propri dati |
| Appuntamenti | Prenota online, visualizza propri |
| Referti | Download propri referti |
| Documenti | Upload documenti personali |

### 2.6 AMMINISTRATIVO_CLINICO

| Area | Permessi |
|------|----------|
| Listini | CRUD prezzi e convenzioni |
| Fatturazione | Report finanziari |
| Struttura | Visualizza, no modifica |
| Strumentario | Gestione inventario |

---

## 3. PERMESSI GRANULARI

### 3.1 Nuovi PersonPermission

```typescript
enum PersonPermission {
  // === STRUTTURA ===
  VIEW_POLIAMBULATORIO = 'VIEW_POLIAMBULATORIO',
  MANAGE_POLIAMBULATORIO = 'MANAGE_POLIAMBULATORIO',
  VIEW_AMBULATORI = 'VIEW_AMBULATORI',
  MANAGE_AMBULATORI = 'MANAGE_AMBULATORI',
  VIEW_STRUMENTARIO = 'VIEW_STRUMENTARIO',
  MANAGE_STRUMENTARIO = 'MANAGE_STRUMENTARIO',
  
  // === CATALOGO ===
  VIEW_PRESTAZIONI = 'VIEW_PRESTAZIONI',
  MANAGE_PRESTAZIONI = 'MANAGE_PRESTAZIONI',
  VIEW_LISTINI = 'VIEW_LISTINI',
  MANAGE_LISTINI = 'MANAGE_LISTINI',
  VIEW_CONVENZIONI = 'VIEW_CONVENZIONI',
  MANAGE_CONVENZIONI = 'MANAGE_CONVENZIONI',
  
  // === AGENDA ===
  VIEW_AGENDA = 'VIEW_AGENDA',
  MANAGE_AGENDA = 'MANAGE_AGENDA',
  MANAGE_OWN_SCHEDULE = 'MANAGE_OWN_SCHEDULE',
  VIEW_TEAM_SCHEDULE = 'VIEW_TEAM_SCHEDULE',
  
  // === APPUNTAMENTI ===
  BOOK_APPOINTMENTS = 'BOOK_APPOINTMENTS',
  CANCEL_APPOINTMENTS = 'CANCEL_APPOINTMENTS',
  VIEW_ALL_APPOINTMENTS = 'VIEW_ALL_APPOINTMENTS',
  
  // === VISITE ===
  VIEW_VISITS = 'VIEW_VISITS',
  CREATE_VISITS = 'CREATE_VISITS',
  EDIT_VISITS = 'EDIT_VISITS',
  START_VISITS = 'START_VISITS',
  COMPLETE_VISITS = 'COMPLETE_VISITS',
  CANCEL_VISITS = 'CANCEL_VISITS',
  
  // === REFERTI ===
  VIEW_CLINICAL_REPORTS = 'VIEW_CLINICAL_REPORTS',
  CREATE_CLINICAL_REPORTS = 'CREATE_CLINICAL_REPORTS',
  EDIT_CLINICAL_REPORTS = 'EDIT_CLINICAL_REPORTS',
  SIGN_CLINICAL = 'SIGN_CLINICAL',           // Solo MEDICO
  EXPORT_CLINICAL_REPORTS = 'EXPORT_CLINICAL_REPORTS',
  
  // === PAZIENTI ===
  VIEW_PATIENTS = 'VIEW_PATIENTS',
  MANAGE_PATIENTS = 'MANAGE_PATIENTS',
  VIEW_PATIENT_HISTORY = 'VIEW_PATIENT_HISTORY',
  EXPORT_PATIENT_DATA = 'EXPORT_PATIENT_DATA',  // GDPR
  
  // === FATTURAZIONE ===
  VIEW_INVOICES = 'VIEW_INVOICES',
  CREATE_INVOICES = 'CREATE_INVOICES',
  MANAGE_PAYMENTS = 'MANAGE_PAYMENTS',
  VIEW_FINANCIAL_REPORTS = 'VIEW_FINANCIAL_REPORTS',
  
  // === FERIE ===
  REQUEST_LEAVE = 'REQUEST_LEAVE',
  APPROVE_LEAVE = 'APPROVE_LEAVE',
  
  // === AUDIT ===
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',
  EXPORT_AUDIT_LOGS = 'EXPORT_AUDIT_LOGS',
  
  // === SCONTI ===
  VIEW_SCONTI = 'VIEW_SCONTI',
  MANAGE_SCONTI = 'MANAGE_SCONTI',
}
```

### 3.2 Matrice Ruoli-Permessi

| Permesso | DIR_SAN | MEDICO | INFERM | SEGRET | PAZIENTE | AMM_CLI |
|----------|---------|--------|--------|--------|----------|---------|
| VIEW_AMBULATORI | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| MANAGE_AMBULATORI | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| VIEW_AGENDA | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| MANAGE_AGENDA | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| BOOK_APPOINTMENTS | ✅ | ✅ | ❌ | ✅ | ✅* | ❌ |
| START_VISITS | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| SIGN_CLINICAL | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| VIEW_CLINICAL_REPORTS | ✅ | ✅ | ✅ | ✅ | ✅* | ❌ |
| MANAGE_LISTINI | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| VIEW_AUDIT_LOGS | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Solo propri dati

---

## 4. MIDDLEWARE AUTORIZZAZIONE

### 4.1 requirePermission (esistente)

```javascript
// Già presente nel sistema
router.get('/visite', 
  requireAuth,
  requirePermission('VIEW_VISITS'),
  controller.getAll
);
```

### 4.2 requireOwnership (nuovo)

```javascript
// Verifica che la risorsa appartenga all'utente
export const requireOwnership = (resourceType) => {
  return async (req, res, next) => {
    const resourceId = req.params.id;
    const userId = req.person.id;
    
    const resource = await getResource(resourceType, resourceId);
    
    // Medico può vedere solo proprie visite
    if (resourceType === 'visita') {
      if (resource.medicoEsecutoreId !== userId) {
        // A meno che non sia DIRETTORE_SANITARIO
        if (!hasRole(req.person, 'DIRETTORE_SANITARIO')) {
          return res.status(403).json({ error: 'Non autorizzato' });
        }
      }
    }
    
    // Paziente può vedere solo propri dati
    if (resourceType === 'paziente') {
      if (resource.id !== userId && !hasPermission(req.person, 'VIEW_ALL_PATIENTS')) {
        return res.status(403).json({ error: 'Non autorizzato' });
      }
    }
    
    next();
  };
};
```

### 4.3 requireRole (nuovo)

```javascript
// Richiede ruolo specifico
export const requireRole = (...roles) => {
  return (req, res, next) => {
    const userRoles = req.person.personRoles.map(pr => pr.role.type);
    
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return res.status(403).json({ 
        error: 'Ruolo non autorizzato',
        required: roles,
        current: userRoles
      });
    }
    
    next();
  };
};

// Uso
router.post('/referti/:id/firma',
  requireAuth,
  requireRole('MEDICO', 'DIRETTORE_SANITARIO'),
  requirePermission('SIGN_CLINICAL'),
  controller.firma
);
```

---

## 5. FRONTEND - PERMISSION GUARDS

### 5.1 Hook usePermissions

```typescript
export function usePermissions() {
  const { user } = useAuth();
  
  const hasPermission = useCallback((permission: PersonPermission) => {
    return user?.permissions?.includes(permission) ?? false;
  }, [user]);
  
  const hasRole = useCallback((role: RoleType) => {
    return user?.roles?.includes(role) ?? false;
  }, [user]);
  
  const hasAnyPermission = useCallback((permissions: PersonPermission[]) => {
    return permissions.some(p => hasPermission(p));
  }, [hasPermission]);
  
  return { hasPermission, hasRole, hasAnyPermission };
}
```

### 5.2 Component PermissionGate

```tsx
interface PermissionGateProps {
  permission?: PersonPermission;
  permissions?: PersonPermission[];
  role?: RoleType;
  roles?: RoleType[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  permission,
  permissions,
  role,
  roles,
  fallback = null,
  children
}: PermissionGateProps) {
  const { hasPermission, hasRole, hasAnyPermission } = usePermissions();
  
  let authorized = true;
  
  if (permission) authorized = hasPermission(permission);
  if (permissions) authorized = hasAnyPermission(permissions);
  if (role) authorized = hasRole(role);
  if (roles) authorized = roles.some(r => hasRole(r));
  
  return authorized ? <>{children}</> : <>{fallback}</>;
}

// Uso
<PermissionGate permission="SIGN_CLINICAL">
  <Button onClick={handleFirma}>Firma Referto</Button>
</PermissionGate>
```

---

## 6. CONFIGURAZIONE RUOLI DEFAULT

```javascript
// backend/config/defaultRoles.js

export const defaultClinicalRoles = {
  MEDICO: {
    permissions: [
      'VIEW_AGENDA',
      'MANAGE_OWN_SCHEDULE',
      'BOOK_APPOINTMENTS',
      'VIEW_VISITS',
      'CREATE_VISITS',
      'EDIT_VISITS',
      'START_VISITS',
      'COMPLETE_VISITS',
      'VIEW_CLINICAL_REPORTS',
      'CREATE_CLINICAL_REPORTS',
      'EDIT_CLINICAL_REPORTS',
      'SIGN_CLINICAL',
      'VIEW_PATIENTS',
      'VIEW_PATIENT_HISTORY',
      'REQUEST_LEAVE'
    ]
  },
  
  INFERMIERE: {
    permissions: [
      'VIEW_AGENDA',
      'VIEW_VISITS',
      'EDIT_VISITS',  // Solo campi delegati
      'VIEW_CLINICAL_REPORTS',
      'VIEW_PATIENTS',
      'REQUEST_LEAVE'
    ]
  },
  
  SEGRETERIA_MEDICA: {
    permissions: [
      'VIEW_AGENDA',
      'MANAGE_AGENDA',
      'BOOK_APPOINTMENTS',
      'CANCEL_APPOINTMENTS',
      'VIEW_ALL_APPOINTMENTS',
      'VIEW_PATIENTS',
      'MANAGE_PATIENTS',
      'VIEW_CLINICAL_REPORTS',
      'VIEW_INVOICES',
      'CREATE_INVOICES',
      'MANAGE_PAYMENTS',
      'REQUEST_LEAVE'
    ]
  },
  
  PAZIENTE: {
    permissions: [
      'BOOK_APPOINTMENTS',  // Solo propri
      'VIEW_CLINICAL_REPORTS',  // Solo propri
      'EXPORT_PATIENT_DATA'  // Solo propri - GDPR
    ]
  }
};
```

---

## 7. REGOLE BUSINESS

| ID | Regola |
|----|--------|
| RB-01 | SIGN_CLINICAL solo per MEDICO e DIRETTORE_SANITARIO |
| RB-02 | Paziente accede solo ai propri dati |
| RB-03 | Medico vede solo propri appuntamenti/visite (default) |
| RB-04 | DIRETTORE_SANITARIO ha accesso globale |
| RB-05 | Permessi ereditati da ruolo, override possibile |
| RB-06 | Audit log per ogni accesso PHI |

---

## 8. COLLEGAMENTI

- **Precedente**: [SPEC_10_REFERTI.md](./SPEC_10_REFERTI.md)
- **Prossimo**: [SPEC_12_AUDIT_GDPR.md](./SPEC_12_AUDIT_GDPR.md)
- **Task**: [F2_BACKEND_TASKS.md](../sottofasi/F2_BACKEND_TASKS.md)
