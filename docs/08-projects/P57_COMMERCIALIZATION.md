# P57 - Commercialization E2E

**Stato**: ✅ Core Complete  
**Data**: 21 Gennaio 2026  
**Versione**: v1.1.0

---

## 📋 Obiettivo

Completare il sistema multi-tenant/multi-branch per la commercializzazione:
- Cross-Tenant Import (Person e Company)
- Feature Flags per moduli
- Brand/Tenant Separation

---

## ✅ Feature Implementate

### 1. Cross-Tenant Import

**Person Import**:
- `GET /api/v1/persons/check-existing?taxCode=...`
- `POST /api/v1/persons/import-cross-tenant`
- Auto-import anagrafica quando taxCode esiste già
- PersonDataShareConsent automatico
- GDPR logging

**Company Import**:
- `GET /api/v1/companies/check-existing?piva=...`
- `POST /api/v1/companies/import-cross-tenant`
- CompanyDataShareConsent automatico

### 2. Feature Flags

**Middleware**: `requireFeature(key)`

**Feature Keys**:
- `BRANCH_MEDICA`
- `BRANCH_FORMAZIONE`
- `FATTURAZIONE_ELETTRONICA`
- `PEC_INTEGRATION`
- `MDL_BASE`
- `MDL_SORVEGLIANZA`
- `API_ACCESS`
- `WHITE_LABEL`

**Model**: `TenantFeature` con `@@unique([tenantId, featureKey])`

### 3. Brand/Tenant Separation

**Cambiamento chiave**: Brand ≠ Tenant

| Before | After |
|--------|-------|
| `req.brandTenantId` (rimosso) | `req.person.tenantId` (sempre) |
| Brand → Tenant mapping | Brand → Solo UI |

**Pattern**:
```javascript
// ✅ CORRETTO
const tenantId = req.person.tenantId;

// ❌ RIMOSSO
const tenantId = req.brandTenantId || req.person.tenantId;
```

### 4. Schema Unique Constraints

| Entità | Prima | Dopo |
|--------|-------|------|
| Course.code | `@unique` | `@@unique([tenantId, code])` |
| Course.slug | `@unique` | `@@unique([tenantId, slug])` |
| CMSPage.slug | `@unique` | `@@unique([tenantId, slug])` |

---

## 📁 File Modificati/Creati

### Backend
- `backend/middleware/featureFlags.js` - Feature flags middleware
- `backend/routes/api/v1/persons.routes.js` - Cross-tenant endpoints
- `backend/routes/api/v1/companies.routes.js` - Cross-tenant endpoints
- `backend/services/person/core/PersonCore.js` - Auto-import logic
- `backend/middleware/brandDetection.js` - Rimosso brandTenantId

### Frontend
- `src/hooks/useCheckCrossTenant.ts`
- `src/components/modals/ImportCrossTenantModal.tsx`

---

## 🔗 Dipendenze

- **P48**: Person Multi-Tenant
- **P49**: Company Multi-Tenant
- **P51**: Tenant Isolation (CRUDButton, operateTenantId)

---

## 📊 Stato Test

| Test | Risultato |
|------|-----------|
| TypeScript | 0 errors |
| Build | ✅ Passing |
| Cross-tenant import Person | ✅ |
| Cross-tenant import Company | ✅ |
| Feature flags middleware | ✅ |
