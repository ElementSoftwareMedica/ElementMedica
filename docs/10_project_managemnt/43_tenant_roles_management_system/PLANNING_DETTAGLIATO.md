# 🏢 Progetto 43 - Sistema Avanzato Tenant, Ruoli e Management

**Data Inizio**: 15 dicembre 2025  
**Stato**: 🚧 IN CORSO  
**Priorità**: CRITICA

---

## 📋 Executive Summary

Questo progetto riorganizza completamente il sistema di **multi-tenancy**, **ruoli** e **permessi** per supportare:

1. **Admin globale** che vede tutti i tenant
2. **Account multi-tenant** con accesso a specifici "appartamenti" (tenant)
3. **Permessi granulari** per tenant/funzionalità
4. **Tab Management** per funzionalità trasversali
5. **UI elegante** per gestione ruoli e tenant

---

## 📊 Analisi Stato Attuale

### Database Schema Esistente

```
┌─────────────────────────────────────────────────────────────┐
│                      TENANT SYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│  Tenant                                                     │
│  ├── id, name, slug, domain                                │
│  ├── settings (JSON)                                       │
│  ├── billingPlan, maxUsers, maxCompanies                   │
│  ├── isActive, deletedAt                                   │
│  └── Relazioni: Companies, Persons, PersonRoles...         │
├─────────────────────────────────────────────────────────────┤
│  Person                                                     │
│  ├── id, email, firstName, lastName                        │
│  ├── globalRole (ADMIN | USER | null)                      │
│  ├── tenantId (FK → Tenant)                                │
│  └── personRoles[] → Per tenant-specific roles             │
├─────────────────────────────────────────────────────────────┤
│  PersonRole                                                 │
│  ├── id, personId, roleType                                │
│  ├── tenantId (FK → Tenant)                                │
│  ├── companyId (optional, per company scope)               │
│  ├── isActive, isPrimary                                   │
│  ├── parentRoleId (gerarchia)                              │
│  ├── level, path (gerarchia)                               │
│  └── permissions[] → RolePermission                        │
├─────────────────────────────────────────────────────────────┤
│  RoleType (Enum)                                           │
│  └── EMPLOYEE, MANAGER, TRAINER, ADMIN, SUPER_ADMIN...     │
├─────────────────────────────────────────────────────────────┤
│  AdvancedPermission                                         │
│  ├── resource, action, scope                               │
│  ├── conditions (JSON), allowedFields (JSON)               │
│  └── siteAccess, relationType                              │
└─────────────────────────────────────────────────────────────┘
```

### Problemi Identificati

| # | Problema | Impatto | Priorità |
|---|----------|---------|----------|
| 1 | Admin vede solo brandTenantId, non TUTTI i tenant | CRITICO | P0 |
| 2 | PersonRole legato a UN solo tenant | ALTO | P1 |
| 3 | No UI per assegnare tenant multipli a un utente | ALTO | P1 |
| 4 | Funzionalità trasversali sparse in Settings | MEDIO | P2 |
| 5 | No separazione chiara Formazione/Medica/Management | MEDIO | P2 |

---

## 🎯 Obiettivi del Progetto

### OBJ-1: Multi-Tenant Access System
> **Admin vede TUTTO, altri vedono solo i tenant assegnati**

```
┌─────────────────────────────────────────────────────────────┐
│                   NUOVO MODELLO DI ACCESSO                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  globalRole=SUPER_ADMIN  →  Vede TUTTI i tenant + config    │
│                                                             │
│  globalRole=ADMIN        →  Vede TUTTI i tenant (operativo) │
│                                                             │
│  globalRole=null         →  Vede solo tenant assegnati      │
│   + PersonTenantAccess                                      │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  NUOVO: PersonTenantAccess                         │    │
│  │  ├── personId                                      │    │
│  │  ├── tenantId                                      │    │
│  │  ├── accessLevel (READ | WRITE | ADMIN)            │    │
│  │  ├── features[] (corsi, medicina, poliambulatorio) │    │
│  │  └── validFrom, validUntil                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### OBJ-2: Management Tab (Nuovo!)
> **Area dedicata per funzionalità trasversali**

```
┌─────────────────────────────────────────────────────────────┐
│  NUOVO TAB: MANAGEMENT (Porta 5175 o Tab in entrambi)       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📂 Management                                              │
│  ├── 👥 Utenti e Account                                   │
│  │   ├── Lista utenti (tutti i tenant)                     │
│  │   ├── Creazione/Modifica utenti                         │
│  │   └── Assegnazione tenant                               │
│  │                                                          │
│  ├── 🔐 Ruoli e Permessi                                   │
│  │   ├── Definizione ruoli (per tenant)                    │
│  │   ├── Gerarchia ruoli                                   │
│  │   └── Matrice permessi                                  │
│  │                                                          │
│  ├── 🏢 Tenant Management                                  │
│  │   ├── Lista tenant                                      │
│  │   ├── Configurazione tenant                             │
│  │   └── Feature toggle per tenant                         │
│  │                                                          │
│  ├── 📄 CMS                                                │
│  │   ├── Pagine (multi-brand)                              │
│  │   ├── Media Library                                     │
│  │   └── SEO                                               │
│  │                                                          │
│  ├── 🛡️ GDPR & Compliance                                 │
│  │   ├── Audit Log                                         │
│  │   ├── Data Export                                       │
│  │   └── Consent Management                                │
│  │                                                          │
│  └── ⚙️ Impostazioni Sistema                               │
│      ├── Backup & Restore                                  │
│      ├── Log Attività                                      │
│      └── Configurazioni globali                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### OBJ-3: UI per Gestione Ruoli/Tenant
> **Interfaccia elegante per assegnare permessi e tenant**

```
┌─────────────────────────────────────────────────────────────┐
│  PAGINA: Gestione Utente                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌──────────────────────────────┐     │
│  │ 👤 Info Utente  │  │  🏢 Tenant Assegnati         │     │
│  │                 │  │                              │     │
│  │ Nome: Mario R.  │  │  ☑ Element Formazione       │     │
│  │ Email: m@x.com  │  │    └── Features: Corsi, MDL │     │
│  │ globalRole: -   │  │                              │     │
│  │                 │  │  ☑ Element Medica           │     │
│  │ [Modifica]      │  │    └── Features: Poli, MDL  │     │
│  │                 │  │                              │     │
│  └─────────────────┘  │  ☐ Altro Tenant (acquista)  │     │
│                       │                              │     │
│                       │  [+ Aggiungi Tenant]         │     │
│                       └──────────────────────────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🔐 Permessi per Tenant                              │  │
│  │                                                      │  │
│  │  Tenant: [Element Formazione ▼]                      │  │
│  │                                                      │  │
│  │  Ruolo: [MANAGER ▼]          [+ Ruolo personalizzato]│  │
│  │                                                      │  │
│  │  ┌────────────────┬────────────────────────────────┐│  │
│  │  │ Entità         │ 👁 📝 ➕ 🗑 │  Scope          ││  │
│  │  ├────────────────┼────────────────────────────────┤│  │
│  │  │ Corsi          │ ✓  ✓  ✓  ✗ │  Tutti          ││  │
│  │  │ Dipendenti     │ ✓  ✓  ✗  ✗ │  Propria azienda││  │
│  │  │ Schedules      │ ✓  ✓  ✓  ✓ │  Tutti          ││  │
│  │  │ Report         │ ✓  ✗  ✗  ✗ │  Solo propri    ││  │
│  │  └────────────────┴────────────────────────────────┘│  │
│  │                                                      │  │
│  │  [Salva Permessi]                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗓️ Piano di Implementazione

### FASE 1: Database Schema (Giorno 1-2)
**Obiettivo**: Aggiungere supporto multi-tenant per utenti

#### 1.1 Nuovo Modello PersonTenantAccess
```prisma
model PersonTenantAccess {
  id          String   @id @default(uuid())
  personId    String
  tenantId    String
  accessLevel AccessLevel @default(READ)
  features    String[]    @default([])  // ["corsi", "medicina", "poliambulatorio"]
  isActive    Boolean     @default(true)
  validFrom   DateTime    @default(now())
  validUntil  DateTime?
  grantedBy   String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  deletedAt   DateTime?

  person      Person      @relation(fields: [personId], references: [id], onDelete: Cascade)
  tenant      Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  grantedByPerson Person? @relation("TenantAccessGrantedBy", fields: [grantedBy], references: [id])

  @@unique([personId, tenantId])
  @@index([personId])
  @@index([tenantId])
  @@index([isActive])
  @@map("person_tenant_access")
}

enum AccessLevel {
  READ        // Solo lettura
  WRITE       // Lettura + scrittura
  ADMIN       // Full control nel tenant
  
  @@map("access_level")
}
```

#### 1.2 Aggiornamento Person
```prisma
model Person {
  // ... campi esistenti ...
  
  // NUOVO: Accessi multi-tenant
  tenantAccess     PersonTenantAccess[]
  grantedAccesses  PersonTenantAccess[] @relation("TenantAccessGrantedBy")
}
```

#### 1.3 Aggiornamento Tenant
```prisma
model Tenant {
  // ... campi esistenti ...
  
  // NUOVO: Feature flags
  enabledFeatures String[] @default(["all"])  // ["corsi", "medicina", "poliambulatorio", "rspp"]
  
  // NUOVO: Accessi persona
  personAccess    PersonTenantAccess[]
}
```

### FASE 2: Backend Services (Giorno 2-3)
**Obiettivo**: Nuova logica per accesso multi-tenant

#### 2.1 PersonTenantAccessService
```javascript
// backend/services/PersonTenantAccessService.js
class PersonTenantAccessService {
  // Ottieni tutti i tenant accessibili da un utente
  async getAccessibleTenants(personId) {}
  
  // Verifica se utente può accedere a un tenant
  async canAccessTenant(personId, tenantId, requiredLevel = 'READ') {}
  
  // Assegna accesso a un tenant
  async grantTenantAccess(personId, tenantId, accessLevel, features, grantedBy) {}
  
  // Revoca accesso
  async revokeTenantAccess(personId, tenantId) {}
  
  // Aggiorna features per un accesso
  async updateTenantFeatures(personId, tenantId, features) {}
}
```

#### 2.2 Aggiornamento tenantHelper.js
```javascript
// backend/utils/tenantHelper.js
export async function getAccessibleTenants(req) {
  const globalRole = req.person?.globalRole;
  const personId = req.person?.id;
  
  // SUPER_ADMIN/ADMIN: accesso a tutti i tenant
  if (['SUPER_ADMIN', 'ADMIN'].includes(globalRole)) {
    return await prisma.tenant.findMany({
      where: { isActive: true, deletedAt: null }
    });
  }
  
  // Altri utenti: solo tenant assegnati via PersonTenantAccess
  const accesses = await prisma.personTenantAccess.findMany({
    where: {
      personId,
      isActive: true,
      deletedAt: null,
      OR: [
        { validUntil: null },
        { validUntil: { gte: new Date() } }
      ]
    },
    include: { tenant: true }
  });
  
  return accesses.map(a => a.tenant);
}

export function getEffectiveTenantId(req) {
  const globalRole = req.person?.globalRole;
  const brandTenantId = req.brandTenantId;
  const personTenantId = req.person?.tenantId;
  
  // ADMIN: usa brandTenantId se presente
  if (['SUPER_ADMIN', 'ADMIN'].includes(globalRole)) {
    return brandTenantId || personTenantId;
  }
  
  // Altri: verifica che abbiano accesso al brand tenant
  // (questo sarà validato dal middleware)
  return brandTenantId || personTenantId;
}
```

#### 2.3 Nuovo Middleware: validateTenantAccess
```javascript
// backend/middleware/tenantAccess.js
export const validateTenantAccess = (requiredLevel = 'READ') => {
  return async (req, res, next) => {
    const personId = req.person?.id;
    const targetTenantId = req.effectiveTenantId || req.brandTenantId;
    
    // Skip per SUPER_ADMIN/ADMIN
    if (['SUPER_ADMIN', 'ADMIN'].includes(req.person?.globalRole)) {
      return next();
    }
    
    // Verifica accesso tramite PersonTenantAccess
    const access = await prisma.personTenantAccess.findFirst({
      where: {
        personId,
        tenantId: targetTenantId,
        isActive: true,
        deletedAt: null
      }
    });
    
    if (!access) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this tenant'
      });
    }
    
    // Verifica livello di accesso
    const levels = { READ: 1, WRITE: 2, ADMIN: 3 };
    if (levels[access.accessLevel] < levels[requiredLevel]) {
      return res.status(403).json({
        error: 'Insufficient access level',
        message: `This action requires ${requiredLevel} access`
      });
    }
    
    // Aggiungi info all'oggetto request
    req.tenantAccess = access;
    next();
  };
};
```

### FASE 3: API Routes (Giorno 3-4)
**Obiettivo**: Nuove API per gestione tenant access

#### 3.1 Routes PersonTenantAccess
```javascript
// backend/routes/v1/person-tenant-access.js

// GET /api/v1/persons/:personId/tenant-access
// Lista tutti i tenant accessibili da una persona

// POST /api/v1/persons/:personId/tenant-access
// Assegna nuovo tenant a una persona

// PUT /api/v1/persons/:personId/tenant-access/:tenantId
// Aggiorna accesso (level, features)

// DELETE /api/v1/persons/:personId/tenant-access/:tenantId
// Revoca accesso a un tenant

// GET /api/v1/tenants/:tenantId/persons-with-access
// Lista tutte le persone che hanno accesso a un tenant
```

### FASE 4: Frontend - Management Tab (Giorno 4-6)
**Obiettivo**: Nuova area Management con UI completa

#### 4.1 Struttura Componenti
```
src/pages/management/
├── ManagementDashboard.tsx      # Dashboard principale
├── users/
│   ├── UsersManagement.tsx      # Lista utenti (tutti i tenant)
│   ├── UserDetail.tsx           # Dettaglio utente con tenant
│   └── TenantAccessCard.tsx     # Card per assegnare tenant
├── roles/
│   ├── RolesManagement.tsx      # Gestione ruoli
│   ├── RoleEditor.tsx           # Editor ruolo singolo
│   └── PermissionMatrix.tsx     # Matrice permessi
├── tenants/
│   ├── TenantsManagement.tsx    # Lista tenant
│   ├── TenantDetail.tsx         # Dettaglio tenant
│   └── FeatureToggle.tsx        # Abilitazione features
├── cms/
│   └── CMSManagement.tsx        # CMS multi-brand
├── gdpr/
│   └── GDPRDashboard.tsx        # GDPR e compliance
└── system/
    ├── BackupRestore.tsx        # Backup
    └── ActivityLogs.tsx         # Log attività
```

#### 4.2 Navigation Update
```tsx
// src/config/brands.config.ts
// Aggiungere Management come area trasversale

// src/components/layouts/ManagementLayout.tsx
// Layout specifico per area Management

// src/App.tsx
// Aggiungere routes /management/*
```

### FASE 5: UI/UX Polish (Giorno 6-7)
**Obiettivo**: Design elegante e user-friendly

#### 5.1 Design System Updates
- Colori: Palette dedicata per Management (grigio/blu professionale)
- Componenti: Card, Tables, Modals specifici
- Iconografia: Set icone per tenant, ruoli, permessi

#### 5.2 User Experience
- Drag & drop per assegnare tenant
- Visual feedback per permessi
- Filtri e ricerca avanzata
- Responsive design

### FASE 6: Testing & Documentation (Giorno 7-8)
**Obiettivo**: Qualità e documentazione

#### 6.1 Testing
- Unit test services
- Integration test API
- E2E test UI flows

#### 6.2 Documentation
- Aggiornamento TENANT_GUIDE.md
- Guida utente Management
- API documentation

---

## 📁 File da Creare/Modificare

### Nuovi File

| Tipo | Path | Descrizione |
|------|------|-------------|
| Schema | `backend/prisma/schema.prisma` | Aggiungere PersonTenantAccess |
| Service | `backend/services/PersonTenantAccessService.js` | CRUD tenant access |
| Middleware | `backend/middleware/tenantAccess.js` | Validazione accesso |
| Routes | `backend/routes/v1/person-tenant-access.js` | API routes |
| Component | `src/pages/management/ManagementDashboard.tsx` | Dashboard |
| Component | `src/pages/management/users/UsersManagement.tsx` | Lista utenti |
| Component | `src/pages/management/users/TenantAccessCard.tsx` | Card tenant |
| Component | `src/components/layouts/ManagementLayout.tsx` | Layout |

### File da Modificare

| Path | Modifica |
|------|----------|
| `backend/utils/tenantHelper.js` | Nuova logica multi-tenant |
| `backend/middleware/brandDetection.js` | Supporto multi-tenant |
| `backend/services/RBACService.js` | Integrazione tenant access |
| `src/App.tsx` | Routes Management |
| `src/config/brands.config.ts` | Area Management |

---

## ✅ Checklist Pre-Implementazione

- [ ] Backup database corrente
- [ ] Backup schema.prisma
- [ ] Test ambiente development funzionante
- [ ] Branch Git creato: `feature/43-tenant-roles-management`

## 🧪 Criteri di Accettazione

1. [ ] Admin può vedere e operare su tutti i tenant
2. [ ] Utente normale vede solo tenant assegnati
3. [ ] UI permette di assegnare/revocare accessi tenant
4. [ ] Permessi variano per tenant (stesso utente, permessi diversi)
5. [ ] Tab Management funzionante con tutte le sezioni
6. [ ] Test coverage ≥ 75%
7. [ ] Documentazione aggiornata
8. [ ] Zero errori TypeScript
9. [ ] Design responsive e user-friendly

---

## 📈 Metriche di Successo

| Metrica | Target | Attuale |
|---------|--------|---------|
| Test Coverage | ≥ 75% | - |
| Errori TypeScript | 0 | - |
| API Response Time | < 200ms | - |
| User Satisfaction | ≥ 4/5 | - |

---

*Documento creato il 15/12/2025 - Progetto 43*
