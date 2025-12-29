# Backend Audit - Forms System

**Data**: 16 Novembre 2025  
**Fase**: Task 1.1.1 - Analisi Backend  
**Durata Analisi**: 1.5h  
**Status**: ✅ Completato

---

## 📋 Executive Summary

### Stato Attuale
- ✅ **Routes**: 2 file separati (`form-templates-routes.js`, `advanced-submissions-routes.js`)
- ✅ **Controllers**: 2 file separati con logica completa
- ❌ **Services**: Nessun service layer (logica in controllers)
- ✅ **Permessi RBAC**: Correttamente implementati
- ⚠️ **Validazione**: Presente ma schema base (da estendere)

### Raccomandazioni Prioritarie
1. **CRITICO**: Creare service layer per estrarre business logic
2. **ALTO**: Consolidare routes in struttura unificata `/api/v1/forms/*`
3. **MEDIO**: Estendere validazione schema per nuovi field types
4. **BASSO**: Migliorare error handling e logging

---

## 🗂️ Struttura File Esistenti

### Routes

#### 1. `/backend/routes/form-templates-routes.js` (72 righe)
```javascript
✅ Endpoint implementati:
  GET    /api/v1/form-templates              → getFormTemplates()
  GET    /api/v1/form-templates/:id          → getFormTemplate()
  POST   /api/v1/form-templates              → createFormTemplate()
  PUT    /api/v1/form-templates/:id          → updateFormTemplate()
  DELETE /api/v1/form-templates/:id          → deleteFormTemplate()
  POST   /api/v1/form-templates/:id/duplicate → duplicateFormTemplate()

✅ Autenticazione: router.use(authenticate)
✅ Permessi RBAC: checkPermissions(['VIEW_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES'])
```

**Dettagli Implementazione**:
- **Auth**: Tutti gli endpoint richiedono autenticazione
- **Permissions**: 
  - `VIEW_FORM_TEMPLATES` | `MANAGE_FORM_TEMPLATES` → GET operations
  - `CREATE_FORM_TEMPLATES` | `MANAGE_FORM_TEMPLATES` → POST/duplicate
  - `EDIT_FORM_TEMPLATES` | `MANAGE_FORM_TEMPLATES` → PUT
  - `DELETE_FORM_TEMPLATES` | `MANAGE_FORM_TEMPLATES` → DELETE

---

#### 2. `/backend/routes/advanced-submissions-routes.js` (91 righe)
```javascript
✅ Endpoint implementati:
  GET    /api/v1/submissions/advanced         → getAdvancedSubmissions()
  GET    /api/v1/submissions/advanced/stats   → getAdvancedSubmissionStats()
  GET    /api/v1/submissions/advanced/:id     → getAdvancedSubmission()
  POST   /api/v1/submissions/advanced         → createAdvancedSubmission() (PUBLIC!)
  PUT    /api/v1/submissions/advanced/:id     → updateAdvancedSubmission()
  DELETE /api/v1/submissions/advanced/:id     → deleteAdvancedSubmission()
  POST   /api/v1/submissions/advanced/bulk-action → bulkActionSubmissions()

⚠️ Autenticazione mista:
  - POST / (create) → NO AUTH (pubblico per form contatti)
  - Altri endpoint → authenticate + checkPermissions
```

**Dettagli Implementazione**:
- **Auth**: 
  - ❌ `POST /` → Nessuna auth (pubblico)
  - ✅ Altri → `authenticate` middleware
- **Permissions**:
  - `VIEW_FORM_SUBMISSIONS` → GET operations
  - `MANAGE_FORM_SUBMISSIONS` → PUT/DELETE/bulk-action

**⚠️ Issue Potenziale**: 
- `POST /` pubblico senza rate limiting visibile
- Nessuna validazione honeypot o CAPTCHA menzionata
- Rischio spam/abuse

---

### Controllers

#### 1. `/backend/controllers/formTemplatesController.js` (573 righe)

**Imports**:
```javascript
import { z } from 'zod';              // ✅ Validazione schema
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';          // ✅ UUID generation
import logger from '../utils/logger.js';  // ✅ Logging strutturato
```

**Schema Validazione**:
```javascript
const formTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum([
    'CONTACT',
    'JOB_APPLICATION',
    'QUOTE_REQUEST',
    'CONSULTATION',
    'COURSE_TEST',                    // ✅ Già previsto!
    'COURSE_EVALUATION',
    'PERSON_DATA_COLLECTION',
    'COURSE_ENROLLMENT',
    'CUSTOM_FORM'
  ]),
  schema: z.object({}).passthrough(),
  validationRules: z.object({}).optional(),
  conditionalFields: z.object({}).optional(),  // ⚠️ Definito ma non validato
  isActive: z.boolean().default(true)
});

const formFieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'email', 'tel', 'textarea', 'select', 'checkbox', 'radio', 'date', 'number', 'file']),
  // ⚠️ MANCANO: multiple_choice, single_choice, true_false, fill_in_blank, address, fiscal_code, rating, slider
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  options: z.array(z.object({
    value: z.string(),
    label: z.string()
  })).optional(),
  validation: z.object({}).optional(),    // ⚠️ Non tipizzato
  conditional: z.object({}).optional(),   // ⚠️ Non tipizzato
  order: z.number().default(0)
});
```

**Funzioni Implementate**:

| Funzione | Input | Output | Logica | Issues |
|----------|-------|--------|--------|--------|
| `getFormTemplates` | `tenantId, type?, isActive?, page?, limit?` | `{ data: templates[], pagination }` | Query con filtri + include form_fields + creator person | ✅ OK |
| `getFormTemplate` | `id, tenantId` | `{ data: template }` | FindFirst con include | ✅ OK |
| `createFormTemplate` | `templateData, fields[]` | `{ data: newTemplate }` | Validazione → Create template → Create fields (transaction) | ⚠️ No service layer |
| `updateFormTemplate` | `id, templateData, fields[]` | `{ data: updatedTemplate }` | Update template + upsert fields (complex logic) | ⚠️ 150+ righe nel controller |
| `deleteFormTemplate` | `id, tenantId` | `{ success: true }` | Soft delete (deletedAt) | ✅ OK |
| `duplicateFormTemplate` | `id, newName, tenantId` | `{ data: duplicatedTemplate }` | Copy template + fields con nuovo UUID | ✅ OK |

**❌ Code Smells**:
```javascript
// createFormTemplate() - Lines 160-258 (98 righe)
// Logica di business nel controller:
- Validazione input (OK)
- Generate UUID
- Prisma transaction create template + fields
- Error handling
→ DOVREBBE essere nel service layer

// updateFormTemplate() - Lines 264-385 (121 righe)  
// Ancora più complessa:
- Validazione
- Update template
- Delete old fields
- Create new fields
- Update existing fields  
→ CRITICAMENTE needs service refactoring
```

**✅ Punti Positivi**:
- Validazione input con Zod
- Logging strutturato
- Error handling completo
- Soft delete implementato
- Transaction per operazioni atomiche

---

#### 2. `/backend/controllers/advancedSubmissionsController.js` (734 righe)

**Imports**:
```javascript
import { z } from 'zod';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';
```

**Schema Validazione**:
```javascript
const advancedSubmissionSchema = z.object({
  type: z.enum([...]),  // Same as template types
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  subject: z.string().min(1),
  message: z.string().min(1),
  courseScheduleId: z.string().uuid().optional(),
  relatedPersonId: z.string().uuid().optional(),
  formSchema: z.object({}).optional(),
  formData: z.object({}).optional(),        // ⚠️ Non validato strutturalmente
  validationRules: z.object({}).optional(),
  conditionalFields: z.object({}).optional(),
  autoCreatePerson: z.boolean().default(false),  // ✅ Feature interessante
  formVersion: z.number().default(1),
  templateName: z.string().optional(),
  source: z.string().default('public_website'),
  metadata: z.object({}).optional()
});
```

**Funzioni Implementate**:

| Funzione | Input | Output | Logica | Issues |
|----------|-------|--------|--------|--------|
| `getAdvancedSubmissions` | `filters, pagination` | `{ data: submissions[], pagination }` | Query complessa con 8+ filtri + search | ⚠️ 134 righe |
| `getAdvancedSubmission` | `id, tenantId` | `{ data: submission }` | FindFirst con include relations | ✅ OK |
| `createAdvancedSubmission` | `submissionData` | `{ data: newSubmission }` | Validazione → Create (+ optional autoCreatePerson) | ⚠️ 140+ righe |
| `updateAdvancedSubmission` | `id, updateData` | `{ data: updated }` | Update with partial data | ✅ OK |
| `deleteAdvancedSubmission` | `id, tenantId` | `{ success: true }` | Hard delete (non soft!) | ⚠️ Should be soft? |
| `getAdvancedSubmissionStats` | `tenantId, filters` | `{ data: stats }` | Aggregate queries (count by type, status, source) | ⚠️ 150+ righe |
| `bulkActionSubmissions` | `ids[], action, data` | `{ success: true, updated: count }` | Batch update status/assignedTo | ✅ Utile |

**❌ Code Smells**:
```javascript
// getAdvancedSubmissions() - Lines 33-147 (114 righe)
// Troppi filtri inline:
- 8+ where conditions
- Complex OR search
- Date range filters
→ DOVREBBE essere in service con query builder

// createAdvancedSubmission() - Lines 229-369 (140 righe)
// Logica di business complessa:
- Validazione
- Auto-create Person (se autoCreatePerson=true)
  → Check if Person exists by email
  → Create Person
  → Link to submission
- Create submission
- Send notifications (implicito?)
→ CRITICAMENTE needs service

// getAdvancedSubmissionStats() - Lines 510-660 (150 righe)
// Query aggregate pesanti:
- Count by type (9 queries)
- Count by status (5 queries)
- Count by source
- Count by date range
→ DOVREBBE essere ottimizzato + cached
```

**⚠️ Issues Critici**:
1. **Hard Delete**: `deleteAdvancedSubmission` fa hard delete, non soft
   - Nessun `deletedAt`
   - Perdita dati irreversibile
   - Audit log problem

2. **Auto-Create Person**: Logica complessa nel controller
   - Duplicazione codice (stesso logic in persona controller?)
   - Transaction non atomica
   - Conflict resolution non gestito

3. **Stats Performance**: 9+ query separate per stats
   - Dovrebbe essere 1 query aggregata
   - Nessuna cache

---

## 🔍 Service Layer Analysis

### ❌ Status: NON ESISTE

**Conseguenze**:
1. **Duplicazione Codice**: Logica di validazione Person ripetuta
2. **Testing Difficile**: Cannot unit test business logic senza controller
3. **Manutenibilità**: Controllers troppo grandi (500+ righe)
4. **Riutilizzo**: Cannot riutilizzare logica in altri contesti (CLI, jobs, etc)

**Esempio Necessità Service**:
```javascript
// Attualmente nel controller (linea 300-350):
const existingPerson = await prisma.Person.findFirst({
  where: { email: data.email, tenantId }
});

if (!existingPerson && autoCreatePerson) {
  newPerson = await prisma.Person.create({
    data: { email, firstName, lastName, tenantId }
  });
}

// DOVREBBE essere:
// backend/services/personsService.js
async findOrCreatePersonByEmail(email, data, tenantId) {
  // Reusable logic
}

// Nel controller:
const person = await personsService.findOrCreatePersonByEmail(
  submission.email, 
  { firstName: submission.name.split(' ')[0], ... },
  tenantId
);
```

---

## 📊 API Endpoints Matrix

### Form Templates

| Metodo | Endpoint | Auth | Permission | Input | Output | Status |
|--------|----------|------|------------|-------|--------|--------|
| GET | `/api/v1/form-templates` | ✅ | VIEW_FORM_TEMPLATES | Query params: type, isActive, page, limit | List + pagination | ✅ |
| GET | `/api/v1/form-templates/:id` | ✅ | VIEW_FORM_TEMPLATES | Param: id | Single template + fields | ✅ |
| POST | `/api/v1/form-templates` | ✅ | CREATE_FORM_TEMPLATES | Body: template data + fields[] | Created template | ✅ |
| PUT | `/api/v1/form-templates/:id` | ✅ | EDIT_FORM_TEMPLATES | Body: template data + fields[] | Updated template | ✅ |
| DELETE | `/api/v1/form-templates/:id` | ✅ | DELETE_FORM_TEMPLATES | Param: id | Success message | ✅ |
| POST | `/api/v1/form-templates/:id/duplicate` | ✅ | CREATE_FORM_TEMPLATES | Body: { name } | Duplicated template | ✅ |

**Missing Endpoints**:
- ❌ `POST /api/v1/form-templates/:id/publish` → Toggle isActive
- ❌ `GET /api/v1/form-templates/:id/submissions` → Get submissions for template
- ❌ `POST /api/v1/form-templates/:id/submit` → Public submit (alias for advanced-submissions?)

---

### Submissions

| Metodo | Endpoint | Auth | Permission | Input | Output | Status |
|--------|----------|------|------------|-------|--------|--------|
| GET | `/api/v1/submissions/advanced` | ✅ | VIEW_FORM_SUBMISSIONS | Query: 10+ filters | List + pagination | ✅ |
| GET | `/api/v1/submissions/advanced/stats` | ✅ | VIEW_FORM_SUBMISSIONS | Query: filters | Stats object | ✅ |
| GET | `/api/v1/submissions/advanced/:id` | ✅ | VIEW_FORM_SUBMISSIONS | Param: id | Single submission | ✅ |
| POST | `/api/v1/submissions/advanced` | ❌ | NONE (Public) | Body: submission data | Created submission | ⚠️ |
| PUT | `/api/v1/submissions/advanced/:id` | ✅ | MANAGE_FORM_SUBMISSIONS | Body: update data | Updated submission | ✅ |
| DELETE | `/api/v1/submissions/advanced/:id` | ✅ | MANAGE_FORM_SUBMISSIONS | Param: id | Success message | ⚠️ Hard delete |
| POST | `/api/v1/submissions/advanced/bulk-action` | ✅ | MANAGE_FORM_SUBMISSIONS | Body: { ids[], action, data } | Updated count | ✅ |

**Missing Endpoints**:
- ❌ `POST /api/v1/submissions/advanced/export` → Export CSV/Excel
- ❌ `GET /api/v1/submissions/advanced/:id/audit-log` → View changes history

---

## ⚠️ Issues Identificati

### Critici (Blockers)

#### 1. **Nessun Service Layer**
**Impact**: Alto  
**Effort**: Medio (1-2 giorni)  
**Descrizione**: Tutta la business logic nei controllers (500-700 righe)  
**Soluzione**: Creare `backend/services/formsService.js` e `backend/services/submissionsService.js`

#### 2. **Hard Delete Submissions**
**Impact**: Alto  
**Effort**: Basso (2h)  
**Descrizione**: `deleteAdvancedSubmission` elimina definitivamente record  
**Soluzione**: Implementare soft delete con `deletedAt` come form_templates

#### 3. **No Rate Limiting su POST Pubblico**
**Impact**: Alto (Security)  
**Effort**: Basso (3h)  
**Descrizione**: `/api/v1/submissions/advanced POST` è pubblico senza protezioni  
**Soluzione**: Aggiungere rate limiting (10 req/hour per IP) + honeypot field + CAPTCHA optional

---

### Importanti (Should Fix)

#### 4. **Schema Validazione Incompleto**
**Impact**: Medio  
**Effort**: Medio (1 giorno)  
**Descrizione**: 
- `conditional`, `validation`, `formData` sono `z.object({}).optional()` (non tipizzati)
- Mancano field types per scoring (multiple_choice, single_choice, true_false)
**Soluzione**: Estendere schema Zod con strutture tipizzate (Task 1.3)

#### 5. **Stats Performance Issue**
**Impact**: Medio  
**Effort**: Medio (4h)  
**Descrizione**: `getAdvancedSubmissionStats` fa 15+ query separate  
**Soluzione**: Refactoring con query aggregate unica + Redis cache

#### 6. **Controller Methods Troppo Grandi**
**Impact**: Medio  
**Effort**: Incluso in refactor service layer  
**Descrizione**: 
- `updateFormTemplate`: 121 righe
- `createAdvancedSubmission`: 140 righe
- `getAdvancedSubmissions`: 114 righe
- `getAdvancedSubmissionStats`: 150 righe
**Soluzione**: Estrarre in service methods + helper functions

---

### Minori (Nice to Have)

#### 7. **Inconsistent Error Messages**
**Impact**: Basso  
**Effort**: Basso (2h)  
**Descrizione**: Alcuni errori in italiano, altri in inglese  
**Soluzione**: Standardizzare su italiano (user-facing) + log in inglese (technical)

#### 8. **No JSDoc per Parametri**
**Impact**: Basso  
**Effort**: Basso (1h)  
**Descrizione**: Funzioni senza JSDoc completo  
**Soluzione**: Aggiungere JSDoc con `@param`, `@returns`, `@throws`

---

## 🔄 Duplicazioni Identificate

### 1. **Validazione Zod Type Enum**
**Duplicato in**:
- `formTemplatesController.js` line 13
- `advancedSubmissionsController.js` line 10

**Soluzione**: Creare `backend/constants/formTypes.js`:
```javascript
export const FORM_TYPES = [
  'CONTACT',
  'JOB_APPLICATION',
  'QUOTE_REQUEST',
  'CONSULTATION',
  'COURSE_TEST',
  'COURSE_EVALUATION',
  'PERSON_DATA_COLLECTION',
  'COURSE_ENROLLMENT',
  'CUSTOM_FORM'
] as const;
```

### 2. **Field Type Enum**
**Duplicato in**:
- `formTemplatesController.js` line 23
- Potenzialmente in altri validatori

**Soluzione**: Creare `backend/constants/formFieldTypes.js`

### 3. **Pagination Logic**
**Duplicato in**:
- `getFormTemplates` line 48-49
- `getAdvancedSubmissions` line 90-91

**Soluzione**: Utility function `backend/utils/pagination.js`:
```javascript
export function calculatePagination(page, limit, total) {
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    pages: Math.ceil(total / parseInt(limit))
  };
}
```

---

## 📋 Checklist Task 1.1.1

- [x] Verificare CRUD completo form_templates → ✅ Completo
- [x] Verificare CRUD completo submissions → ✅ Completo (ma hard delete)
- [x] Identificare duplicati tra routes/controllers → ✅ 3 duplicazioni trovate
- [x] Mappare tutti gli endpoint esistenti → ✅ 13 endpoint mappati
- [x] Verificare permessi RBAC correttamente implementati → ✅ Corretti
- [x] Documentare API esistenti (input/output) → ✅ Matrici complete

---

## 🎯 Raccomandazioni per Task 1.2

### Opzione A (RACCOMANDATA): Unificazione Completa

**Struttura Target**:
```
/api/v1/forms
  GET    /                     → List templates
  POST   /                     → Create template
  GET    /:id                  → Get template
  PUT    /:id                  → Update template
  DELETE /:id                  → Delete template (soft)
  POST   /:id/duplicate        → Duplicate template
  POST   /:id/submit           → Submit form (public)
  GET    /:id/submissions      → Get submissions for template

/api/v1/forms/submissions
  GET    /                     → List all submissions
  GET    /stats                → Get statistics
  GET    /:id                  → Get submission
  PUT    /:id                  → Update submission
  DELETE /:id                  → Delete submission (soft!)
  POST   /bulk-action          → Bulk actions
  POST   /export               → Export CSV/Excel
```

**Vantaggi**:
- URL semantico e RESTful
- Facile da capire: forms (templates) e forms/submissions (dati)
- Unifica logica in 1 controller + 1 service

**Svantaggi**:
- Breaking change per frontend esistente
- Serve migration guide per API consumers

---

### Opzione B (BACKWARD COMPATIBLE): Alias + Deprecation

**Strategia**:
1. Creare nuove routes `/api/v1/forms/*`
2. Mantenere vecchie routes con `@deprecated` tag
3. Vecchie routes fanno proxy a nuove
4. Frontend può migrare gradualmente
5. Dopo 6 mesi, rimuovere vecchie routes

**Vantaggi**:
- No breaking changes
- Migrazione graduale
- Safe rollback

**Svantaggi**:
- Duplicazione codice routes (temporanea)
- Più complesso da mantenere

---

## 📊 Metriche Finali

| Metrica | Valore | Target | Status |
|---------|--------|--------|--------|
| Routes files | 2 | 1 | ⚠️ |
| Controller files | 2 | 1 | ⚠️ |
| Service files | 0 | 2 | ❌ |
| Avg controller size | 653 righe | <300 | ❌ |
| Endpoints | 13 | 16 (with new) | ⚠️ |
| RBAC coverage | 100% | 100% | ✅ |
| Soft delete | 50% (solo templates) | 100% | ⚠️ |
| Code duplications | 3 | 0 | ⚠️ |

---

## ✅ Next Steps

1. **Immediate** (Task 1.2.1): Decidere Opzione A o B per routes
2. **Priority** (Task 1.2.3): Creare service layer
3. **Quick Win** (Task 1.2.1): Fix hard delete submissions → soft delete
4. **Refactoring** (Task 1.2.2): Consolidare controllers

---

**Versione**: 1.0  
**Completato**: 16 Novembre 2025 19:30  
**Next**: Task 1.1.2 - Analisi Frontend
