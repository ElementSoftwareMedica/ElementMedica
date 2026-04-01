# GitHub Copilot Instructions - ElementMedica (Compatto)

**CRITICAL**: Rispettare ad OGNI richiesta. Versione completa: `copilot-instructions-full.md`

---

## 🚨 REGOLE ASSOLUTE (NON NEGOZIABILI)

### 1. Workflow Modifiche
```
PRIMA: read_file (50+ righe) → file_search → grep_search → pianifica
DURANTE: replace_string_in_file (3-5 righe contesto)
DOPO: get_errors → verifica → SOLO ALLORA conferma
```
❌ MAI "dovrebbe funzionare" senza verifica | ❌ MAI confermare senza `get_errors`

### 2. Multi-Tenancy
- ✅ OGNI query: `where: { tenantId, deletedAt: null }`
- ✅ Auth: `req.person.tenantId` (MAI `req.user`, MAI `req.tenantId`)
- 📚 `docs/02-backend/multi-tenancy.md`

### 3. GDPR
- ✅ Soft delete SEMPRE (`deletedAt DateTime?`)
- ✅ GdprAuditLog su DELETE (campi: `resourceType`, `resourceId`, `dataAccessed`)
- ✅ deletionReason obbligatorio (min 10 char)
- 📚 `docs/04-features/gdpr-compliance.md`

### 4. TypeScript & Security
- ✅ Zero errori prima di completare | ✅ NO `any` senza giustificazione
- ✅ `requirePermission()` middleware su route protette
- ❌ MAI bypass middleware | ❌ MAI PII in logs

---

## 📐 ARCHITETTURA

### Server (Porte Fisse - NON MODIFICARE)
| Server | Porta | Scopo |
|--------|-------|-------|
| API | 4001 | Express, Prisma, RBAC |
| Documents | 4002 | PDF Puppeteer |
| Frontend | 5173 | Vite dev |

> **P64**: Proxy server (4003) ELIMINATO - Nginx gestisce routing in produzione

### Data Models (P48/P49)
```
Person (globale) → PersonTenantProfile (per-tenant) → Domain Entities
Company (globale) → CompanyTenantProfile (per-tenant) → CompanySite
```
- `email`, `phone`, `status` sono in **TenantProfile**, NON in Person/Company
- 📚 Dettagli: `docs/02-backend/data-models.md`

---

## 🎨 FRONTEND PATTERNS

### Componenti Obbligatori
| Uso | Componente |
|-----|------------|
| CRUD buttons | `CRUDButton`, `CRUDPrimaryButton` da `@/components/ui/CRUDButton` |
| Azioni tabella | `ActionButton` da `@/components/ui` |
| Notifiche | `showToast()` da `useToast` hook (MAI `alert()`) |
| Righe cliccabili | `onRowClick` prop su `ResizableTable` |

### Tenant Filter (Liste)
```tsx
const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();
useQuery({
    queryKey: ['entities', tenantFilterKey], // ← OBBLIGATORIO
    queryFn: () => api.getAll(getTenantFilterParams()),
    enabled: isReady
});
```

### Brand Colors
| Brand | Tailwind |
|-------|----------|
| Clinica (ElementMedica) | `bg-teal-600 hover:bg-teal-700` |
| Formazione (ElementSicurezza) | `bg-blue-600 hover:bg-blue-700` |
| Management | `bg-violet-600 hover:bg-violet-700` |

### Onorifici Medici
```tsx
import { formatMedicoName } from '@/utils/textFormatters';
// "Dott." (MALE) / "Dott.ssa" (altri) - MAI "Dr."
```

---

## 🔌 BACKEND PATTERNS

### API Paths
```javascript
// ✅ SEMPRE /api/v1/...
apiGet('/api/v1/entities');
```

### Route Protection
```javascript
import { requirePermission } from '../middleware/rbac';
import { requireFeature } from '../middleware/featureFlags.js';
router.post('/entities', requirePermission('entities:write'), requireFeature('FEATURE_KEY'), controller);
```

### Brand vs Tenant
```javascript
// Brand (X-Frontend-Id) = solo UI | Tenant (JWT) = SEMPRE per dati CRUD
const tenantId = req.person.tenantId; // ✅ CORRETTO
// Per admin cross-tenant: req.headers['x-operate-tenant-id']
```

---

## ❌ DIVIETI RAPIDI

| ❌ MAI | ✅ USA |
|--------|--------|
| `req.user`, `req.tenantId`, `req.brandTenantId` | `req.person.tenantId` |
| `alert()` | `showToast()` |
| Hard delete PII | Soft delete + GdprAuditLog |
| Query senza tenantId | `where: { tenantId, deletedAt: null }` |
| `console.log` in prod | `logger.info()` |
| Button per CRUD | `CRUDButton` |
| `error: error.message` in `res.json()` | Messaggio italiano statico + `logger.error()` |
| `new PrismaClient()` nei file | `import prisma from '../config/prisma-optimization.js'` |
| `import { authenticate } from '../../auth/middleware.js'` (Catena B) | `import { authenticate } from '../../middleware/auth.js'` (Catena A) |
| `'stringa fissa' \|\| 'fallback'` — dead code | Solo `'fallback'` (la prima stringa è sempre truthy) |
| Tentare `verifyToken()` senza access token (→ 401 spam) | `refreshAccess()` prima, poi `verifyToken()` |
| `<input type="date">` nativo | `<DatePickerElegante>` da `@/components/ui/DatePickerElegante` |

---

## 🧪 VERIFICA RAPIDA

```bash
# P64: Solo API e Documents - Proxy eliminato
curl http://localhost:4001/health && curl http://localhost:4002/health
# Login: admin@example.com / Admin123!
```

---

## 📚 DOCUMENTAZIONE

| Area | Path |
|------|------|
| Architettura | `docs/01-architecture/` |
| Backend | `docs/02-backend/` |
| Frontend | `docs/03-frontend/` |
| Features | `docs/04-features/` |
| Projects | `docs/08-projects/` |
| **Istruzioni complete** | `.github/copilot-instructions-full.md` |

---

**🚨 REGOLA FINALE**: In caso di dubbio, CHIEDERE invece di assumere!
