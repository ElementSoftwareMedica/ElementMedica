# 🏢 Multi-Tenant Architecture

**Versione**: 3.0.0  
**Data**: 31 Gennaio 2026  
**Progetti**: P48 (Person), P49 (Company), P57 (Brand/Tenant Separation), P63 (Codebase Cleanup)

---

## 📋 Panoramica

Il sistema implementa un'architettura multi-tenant dove:
- **Tenant** = Cliente/Organizzazione (isolamento dati completo, fatturazione)
- **Brand** = Frontend/Dominio (SOLO UI: logo, colori, menu - NON dati)
- **Branch** = Funzionalità abilitate per tenant (MEDICA, FORMAZIONE)

---

## 🏛️ Modello Customer-as-Tenant

```
1 Cliente = 1 Tenant = 1 Fattura

Struttura:
├── Tenant (es: "Studio Medico Rossi")
│   ├── enabledBranches: [MEDICA, FORMAZIONE]
│   ├── primaryBranch: MEDICA
│   ├── billingPlan: "professional"
│   │
│   ├── Persons (via PersonTenantProfile)
│   ├── Companies (via CompanyTenantProfile)
│   └── Domain Entities (Visite, Corsi, etc.)
```

---

## 🔐 P48: Person Multi-Tenant

### Architettura 3-Layer

```
┌─────────────────────────────────────────────────────────────┐
│                     LAYER 1: PERSON                         │
│         Dati anagrafici STATICI e IMMUTABILI                │
│  taxCode, firstName, lastName, birthDate, gender, username  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  LAYER 2: PERSON TENANT PROFILE             │
│         Dati DINAMICI specifici per ogni tenant             │
│    status, email, phone, hourlyRate, iban, notes...         │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               LAYER 3: DOMAIN-SPECIFIC ENTITIES             │
│     Dati di dominio (visite, corsi, attestati...)           │
└─────────────────────────────────────────────────────────────┘
```

### Campi in Person (globali)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | UUID | Identificatore univoco |
| `taxCode` | String? | Codice Fiscale (unique globale) |
| `vatNumber` | String? | Partita IVA (unique globale) |
| `firstName` | String | Nome |
| `lastName` | String | Cognome |
| `birthDate` | DateTime? | Data nascita |
| `birthPlace` | String? | Luogo nascita |
| `gender` | String? | Genere |
| `username` | String? | Username login (unique globale) |
| `password` | String? | Password hash |

### Campi in PersonTenantProfile (per-tenant)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `email` | String? | Email (può variare per tenant) |
| `phone` | String? | Telefono |
| `status` | String | ACTIVE, INACTIVE, PENDING |
| `hourlyRate` | Decimal? | Tariffa oraria |
| `iban` | String? | IBAN |
| `companyTenantProfileId` | UUID? | Azienda associata |
| `isPrimary` | Boolean | Profilo principale |

### Query Pattern

```javascript
// ✅ CORRETTO - P48 Pattern
const persons = await prisma.person.findMany({
  where: { deletedAt: null },
  include: {
    tenantProfiles: {
      where: { tenantId, deletedAt: null, isActive: true },
      select: { email: true, phone: true, status: true }
    }
  }
});

// Flatten per backward compatibility
const flattened = persons.map(p => ({
  ...p,
  email: p.tenantProfiles?.[0]?.email || null,
  status: p.tenantProfiles?.[0]?.status || 'PENDING'
}));

// ❌ SBAGLIATO - campi non esistono più su Person
const persons = await prisma.person.findMany({
  where: { tenantId, email: 'test@example.com' }  // ❌
});
```

---

## 🏢 P49: Company Multi-Tenant

### Architettura 3-Layer

```
┌─────────────────────────────────────────────────────────────┐
│                     LAYER 1: COMPANY                        │
│         Dati anagrafici STATICI e IMMUTABILI                │
│  piva, codiceFiscale, ragioneSociale, sedeLegale, ATECO     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                LAYER 2: COMPANY TENANT PROFILE              │
│         Dati COMMERCIALI specifici per ogni tenant          │
│    referenteId, contratto, condizioni, pec, note...         │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     LAYER 3: COMPANY SITE                   │
│         Sedi operative dell'azienda (per ogni tenant)       │
│    indirizzo, DVR, RSPP, medico competente, sopralluoghi    │
└─────────────────────────────────────────────────────────────┘
```

### Campi in Company (globali)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `piva` | String | Partita IVA (unique globale) |
| `codiceFiscale` | String? | Codice Fiscale |
| `ragioneSociale` | String | Ragione Sociale |
| `formaGiuridica` | String? | SRL, SPA, etc. |
| `sedeLegaleIndirizzo` | String? | Indirizzo sede legale |
| `codiceAteco` | String? | Codice ATECO |

### Campi in CompanyTenantProfile (per-tenant)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `referenteId` | UUID? | Referente aziendale |
| `pec` | String? | PEC aziendale |
| `tipoContratto` | String? | Tipo contratto |
| `scontoPercentuale` | Decimal? | Sconto applicato |
| `terminiPagamento` | String? | Es. "30 gg DFFM" |
| `noteCommerciali` | String? | Note commerciali |

### Query Pattern

```javascript
// ✅ CORRETTO - P49 Pattern
const profiles = await prisma.companyTenantProfile.findMany({
  where: { tenantId, deletedAt: null },
  include: {
    company: true,  // Dati globali
    sites: { where: { deletedAt: null } },
    referente: { select: { firstName: true, lastName: true } }
  }
});
```

---

## 🔄 P57: Brand/Tenant Separation

### Concetti Separati

| Concetto | Determina | Header/Campo |
|----------|-----------|--------------|
| **Brand** | Solo UI (menu, colori) | `X-Frontend-Id` |
| **Tenant** | Dati e permessi CRUD | `req.person.tenantId` |

### Flusso

```
X-Frontend-Id: "element-medica"
        │
        ▼
brandDetection middleware
        │
        ├── req.frontendId = "element-medica"
        ├── req.branchType = "MEDICA"
        └── ❌ NON imposta più: req.brandTenantId (rimosso)

JWT Token
        │
        ▼
auth.js middleware
        │
        └── req.person.tenantId ← SEMPRE usato per CRUD
```

### Pattern Backend

```javascript
// ✅ CORRETTO - tenant SEMPRE da JWT
const tenantId = req.person.tenantId;

// ✅ Per admin cross-tenant, usa header specifico
const operateTenantId = req.headers['x-operate-tenant-id'] || req.person.tenantId;

// ❌ SBAGLIATO - rimosso in P57
const tenantId = req.brandTenantId || req.person.tenantId;
```

---

## 🔀 Cross-Tenant Import

### Auto-Import Person (P57)

Quando si crea una Person con `taxCode` già esistente in altro tenant:

1. **Check existing**: Verifica se esiste globalmente
2. **Auto-import**: 
   - Crea `PersonDataShareConsent` (ANAGRAFICA)
   - Crea `PersonTenantProfile` per nuovo tenant
   - Log in `GdprAuditLog`

### Dati Auto-Importati

| Campo | Import |
|-------|--------|
| firstName, lastName | ✅ Auto |
| taxCode, vatNumber | ✅ Auto |
| birthDate, birthPlace | ✅ Auto |
| gender | ✅ Auto |
| email, phone | ❌ Richiede consenso |
| Clinical data | ❌ Richiede consenso |

### Endpoints

```
GET  /api/v1/persons/check-existing?taxCode=...
POST /api/v1/persons/import-cross-tenant

GET  /api/v1/companies/check-existing?piva=...
POST /api/v1/companies/import-cross-tenant
```

---

## 🌿 Branch Type System (P45)

### Enum BranchType

```prisma
enum BranchType {
  MEDICA      // Poliambulatorio, visite, prestazioni
  FORMAZIONE  // Corsi, schedules, attestati
}
```

### Configurazione Tenant

```prisma
model Tenant {
  enabledBranches BranchType[] @default([MEDICA, FORMAZIONE])
  primaryBranch   BranchType?
}

model PersonTenantAccess {
  enabledBranches BranchType[] @default([])
  // Accesso effettivo = intersezione con Tenant.enabledBranches
}
```

### Entità per Branch

| Branch | Entità |
|--------|--------|
| **MEDICA** | Prestazione, Visita, Appuntamento, Referto, DisponibilitaMedico |
| **FORMAZIONE** | Course, CourseSchedule, Attestato, RegistroPresenze |
| **SHARED** | Person, Company, Fattura, Preventivo |

---

## 📋 Vincoli Unique

### Globali (cross-tenant)

| Entità | Campo |
|--------|-------|
| Person | taxCode |
| Person | vatNumber |
| Person | username |
| Company | piva |
| Company | codiceFiscale |
| Tenant | slug |
| Tenant | domain |

### Per-Tenant

| Entità | Vincolo |
|--------|---------|
| Course | `@@unique([tenantId, code])` |
| Course | `@@unique([tenantId, slug])` |
| CMSPage | `@@unique([tenantId, slug])` |
| CustomRole | `@@unique([tenantId, name])` |

---

## 🔑 Tenant Mode (Frontend)

### TenantModeContext

```tsx
const { 
  viewMode,           // 'all' | 'single'
  operateTenantId,    // ID tenant per CRUD quando viewMode='all'
  canPerformCRUD,     // true se viewMode='single' o operateTenantId set
  getOperateTenantHeaders 
} = useTenantMode();
```

### Importante: Brand ≠ Tenant

Il **Brand** (`VITE_BRAND_ID`) determina SOLO la UI:
- Logo, favicon, colori
- Menu items visibili
- Testi, SEO

Il **Tenant** viene SEMPRE dal JWT dell'utente (`req.person.tenantId`).

Un cliente può avere un unico tenant ma navigare su entrambi i brand (element-medica.com e element-sicurezza.com) vedendo UI diverse ma accedendo agli stessi dati.

### CRUDButton

```tsx
// Disabilita automaticamente quando !canPerformCRUD
<CRUDPrimaryButton onClick={handleCreate}>
  <Plus /> Nuovo
</CRUDPrimaryButton>
```

### X-Operate-Tenant-Id Header

```tsx
const headers = getOperateTenantHeaders();
await apiPost('/api/v1/entities', data, { headers });
// Invia header X-Operate-Tenant-Id quando viewMode='all'
```

---

## ✅ Person.tenantId RIMOSSO (P63)

Il campo `Person.tenantId` è stato **RIMOSSO** dal progetto P63.

### Come Funziona Ora

- Il tenant viene SEMPRE determinato da `PersonTenantProfile.tenantId`
- Il middleware `auth.js` popola `req.person.tenantId` dal profilo primario
- Il JWT include il `tenantId` risolto da `PersonTenantProfile`
- Tutti i file che usano `req.person.tenantId` continuano a funzionare

### Pattern da Usare

```javascript
// ✅ CORRETTO - req.person.tenantId è GIÀ risolto da PersonTenantProfile
const tenantId = req.person.tenantId;

// ✅ CORRETTO - usa operateTenantId per operazioni admin cross-tenant
const tenantId = req.operateTenantId || req.person.tenantId;

// ✅ CORRETTO - per query che richiedono il tenant
const profiles = await prisma.personTenantProfile.findMany({
  where: { tenantId, deletedAt: null }
});
```

### Test e Cleanup

I test devono usare `PersonTenantProfile` per trovare persone:

```javascript
// ✅ CORRETTO - trova persona tramite profilo tenant
const profile = await prisma.personTenantProfile.findFirst({ 
  where: { tenantId, deletedAt: null },
  include: { person: true }
});
const persona = profile?.person;

// ❌ SBAGLIATO - Person.tenantId non esiste più
const persona = await prisma.person.findFirst({ where: { tenantId } });
```

---

*Documento aggiornato il 31 Gennaio 2026 - v3.1.0*
