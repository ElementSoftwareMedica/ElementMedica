# Fase 1: Foundation & Cleanup - Detailed Planning

**Durata**: 2 giorni (16 ore)  
**Data Inizio**: 16 Novembre 2025  
**Data Fine**: 18 Novembre 2025  
**Priorità**: Critica  
**Prerequisiti**: Nessuno (fase iniziale)

---

## 🎯 Obiettivi Fase 1

1. **Audit Completo** sistema form esistente
2. **Pulizia duplicati** e consolidamento codice
3. **Estensione Schema Database** per logica condizionale avanzata
4. **Migration Database** senza perdita dati
5. **Test Regression** per garantire backward compatibility

---

## 📦 Task Breakdown

### Task 1.1: Audit Codice Esistente (3h)

#### Subtask 1.1.1: Analisi Backend (1.5h)
**File da analizzare**:
```
backend/routes/form-templates-routes.js
backend/routes/advanced-submissions-routes.js
backend/controllers/formTemplatesController.js
backend/controllers/advancedSubmissionsController.js
backend/services/formTemplatesService.js (se esiste)
backend/services/advancedSubmissionsService.js (se esiste)
```

**Checklist**:
- [ ] Verificare CRUD completo form_templates
- [ ] Verificare CRUD completo submissions
- [ ] Identificare duplicati tra routes/controllers
- [ ] Mappare tutti gli endpoint esistenti
- [ ] Verificare permessi RBAC correttamente implementati
- [ ] Documentare API esistenti (input/output)

**Deliverable**: `docs/10_project_managemnt/35_advanced_forms_system/AUDIT_BACKEND.md`

---

#### Subtask 1.1.2: Analisi Frontend (1.5h)
**File da analizzare**:
```
src/pages/forms/FormTemplatesPage.tsx
src/services/formTemplates.ts
src/components/forms/* (se esistono)
```

**Checklist**:
- [ ] Verificare pagina lista templates funzionante
- [ ] Verificare service TypeScript completo
- [ ] Identificare componenti form riutilizzabili esistenti
- [ ] Mappare stati UI (loading, error, success)
- [ ] Verificare integrazione RBAC nel frontend
- [ ] Documentare gaps UI

**Deliverable**: `docs/10_project_managemnt/35_advanced_forms_system/AUDIT_FRONTEND.md`

---

### Task 1.2: Pulizia e Consolidamento (4h)

#### Subtask 1.2.1: Consolidamento Routes (1h)
**Azione**: Unificare `/api/v1/form-templates` e `/api/v1/submissions/advanced`

**Decisioni architetturali**:
```
OPZIONE A (RACCOMANDATA):
  /api/v1/forms
    GET    /                          → Lista templates
    GET    /:id                       → Dettaglio template
    POST   /                          → Crea template
    PUT    /:id                       → Aggiorna template
    DELETE /:id                       → Elimina template
    POST   /:id/duplicate             → Duplica template
    GET    /:id/submissions           → Submissions per template
    POST   /:id/submit                → Submit form (pubblico)
    
  /api/v1/forms/submissions
    GET    /                          → Lista tutte submissions
    GET    /stats                     → Statistiche
    GET    /:id                       → Dettaglio submission
    PUT    /:id                       → Aggiorna submission
    DELETE /:id                       → Elimina submission
    POST   /bulk-action               → Azioni bulk
    POST   /export                    → Export CSV/Excel

OPZIONE B (BACKWARD COMPATIBLE):
  Mantieni routes esistenti + alias per compatibilità
```

**Decisione**: [DA DEFINIRE]

**Checklist**:
- [ ] Scegliere strategia (A o B)
- [ ] Implementare nuove routes (se OPZIONE A)
- [ ] Aggiornare controllers per nuova struttura
- [ ] Aggiornare frontend service
- [ ] Test endpoint per endpoint

**Deliverable**: Routes consolidate + migration guide

---

#### Subtask 1.2.2: Consolidamento Controllers (1.5h)
**Azione**: Unificare logica controllers duplicati

**File target**:
```
backend/controllers/formTemplatesController.js
backend/controllers/advancedSubmissionsController.js
→ backend/controllers/formsController.js (unified)
```

**Checklist**:
- [ ] Estrarre logica comune in utility functions
- [ ] Unificare validazione input
- [ ] Standardizzare error handling
- [ ] Unificare formato risposta JSON
- [ ] Documentare JSDoc per ogni method
- [ ] Unit tests per ogni controller method

**Deliverable**: Controllers consolidati + tests

---

#### Subtask 1.2.3: Creazione Services Layer (1.5h)
**Azione**: Estrarre business logic da controllers

**Struttura target**:
```javascript
// backend/services/formsService.js
class FormsService {
  // Templates
  async listTemplates(filters, tenantId) { }
  async getTemplate(id, tenantId) { }
  async createTemplate(data, tenantId, userId) { }
  async updateTemplate(id, data, tenantId, userId) { }
  async deleteTemplate(id, tenantId, userId) { }
  async duplicateTemplate(id, newName, tenantId, userId) { }
  
  // Submissions
  async listSubmissions(filters, tenantId) { }
  async getSubmission(id, tenantId) { }
  async createSubmission(templateId, data, metadata) { }
  async updateSubmission(id, data, tenantId, userId) { }
  async deleteSubmission(id, tenantId, userId) { }
  
  // Stats
  async getSubmissionStats(filters, tenantId) { }
}
```

**Checklist**:
- [ ] Creare service con metodi base
- [ ] Migrare logica da controllers
- [ ] Aggiungere transaction management (Prisma)
- [ ] Aggiungere error handling robusto
- [ ] Aggiungere logging strutturato
- [ ] Unit tests per service layer

**Deliverable**: `backend/services/formsService.js` + tests

---

### Task 1.3: Estensione Schema Database (5h)

#### Subtask 1.3.1: Design Schema Condizioni (2h)
**Obiettivo**: Definire struttura JSON per 30 tipi condizioni

**Schema proposto**:
```typescript
interface ConditionalLogic {
  // Condizioni singole
  simple?: {
    field: string;                    // Campo da cui dipende
    operator: ConditionOperator;
    value: any;
  };
  
  // Condizioni complesse (AND/OR/NOT)
  complex?: {
    operator: 'AND' | 'OR' | 'NOT';
    conditions: ConditionalLogic[];   // Ricorsivo per nesting
  };
  
  // Condizioni su entità
  entity?: {
    type: 'Person' | 'Company' | 'CourseSchedule';
    field: string;
    operator: ConditionOperator;
    value: any;
  };
  
  // Condizioni su permessi
  permission?: {
    type: 'role' | 'permission' | 'tenant_attribute';
    key: string;
    operator: 'has' | 'not_has' | 'equals';
    value: any;
  };
  
  // Condizioni su workflow
  workflow?: {
    entity: string;
    status: string;
    phase?: string;
  };
  
  // Condizioni per scoring (test)
  scoring?: {
    correctAnswer: any;              // Risposta corretta
    points: number;                  // Punti assegnati
    maxAttempts?: number;            // Tentativi massimi
    partialCredit?: boolean;         // Punteggio parziale?
  };
}

type ConditionOperator = 
  // Uguaglianza
  | 'equals' | 'not_equals'
  // Testuali
  | 'contains' | 'not_contains' 
  | 'starts_with' | 'ends_with'
  | 'length_equals' | 'length_greater' | 'length_less'
  | 'matches_regex'
  // Numerici
  | 'greater' | 'greater_or_equal'
  | 'less' | 'less_or_equal'
  | 'between' | 'not_between'
  // Date
  | 'date_after' | 'date_before'
  | 'date_between'
  | 'date_relative_days' | 'date_is_today' | 'date_is_past' | 'date_is_future'
  // Booleani
  | 'is_true' | 'is_false'
  // Null/vuoto
  | 'is_null' | 'is_not_null' | 'is_empty' | 'is_not_empty'
  // Array
  | 'in' | 'not_in'
  // Calcoli
  | 'sum_equals' | 'sum_greater' | 'sum_less'
  | 'count_equals' | 'count_greater' | 'count_less';
```

**Checklist**:
- [ ] Definire TypeScript interfaces complete
- [ ] Validare con casi d'uso reali (contatti, test, anagrafica)
- [ ] Peer review design
- [ ] Documentare ogni tipo condizione con esempi

**Deliverable**: `docs/technical/FORM_CONDITIONAL_LOGIC_SCHEMA.md`

---

#### Subtask 1.3.2: Migration Prisma Schema (1.5h)
**Obiettivo**: Estendere `form_fields` e `form_templates`

**Modifiche schema**:
```prisma
model form_fields {
  id             String         @id
  templateId     String
  name           String
  label          String
  type           FormFieldType  // Enum esteso
  required       Boolean        @default(false)
  placeholder    String?
  helpText       String?
  options        Json?
  validation     Json?          // Validazione avanzata
  conditional    Json?          // ✨ NEW: ConditionalLogic schema
  entityMapping  Json?          // ✨ NEW: Entity mapping config
  scoring        Json?          // ✨ NEW: Scoring config per test
  order          Int            @default(0)
  isActive       Boolean        @default(true)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @default(now())
  form_templates form_templates @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([templateId, name])
  @@index([isActive])
  @@index([order])
  @@index([templateId])
}

enum FormFieldType {
  // Esistenti
  TEXT
  EMAIL
  TEL
  TEXTAREA
  SELECT
  CHECKBOX
  RADIO
  FILE
  DATE
  NUMBER
  
  // ✨ NEW per test/scoring
  MULTIPLE_CHOICE      // Quiz: scelta multipla
  SINGLE_CHOICE        // Quiz: scelta singola
  TRUE_FALSE           // Quiz: vero/falso
  FILL_IN_BLANK        // Quiz: completa la frase
  
  // ✨ NEW per anagrafiche
  ADDRESS              // Indirizzo strutturato
  FISCAL_CODE          // Codice fiscale italiano
  VAT_NUMBER           // P.IVA
  PHONE_NUMBER         // Telefono con validazione
  
  // ✨ NEW utility
  SECTION_HEADER       // Titolo sezione
  HTML_CONTENT         // Contenuto HTML statico
  SIGNATURE            // Firma digitale
  RATING               // Rating 1-5 stelle
  SLIDER               // Slider numerico
}

model form_templates {
  id                String         @id
  name              String
  description       String?
  type              FormTemplateType  // ✨ Enum esteso
  schema            Json
  validationRules   Json?
  conditionalFields Json?
  settings          Json?          // ✨ NEW: Template settings (scoring, limits, etc)
  isActive          Boolean        @default(true)
  isPublic          Boolean        @default(false)  // ✨ NEW: Pubblico?
  allowAnonymous    Boolean        @default(false)  // ✨ NEW: Anonimo?
  version           Int            @default(1)
  tenantId          String
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @default(now())
  deletedAt         DateTime?
  createdById       String?
  form_fields       form_fields[]
  persons           Person?        @relation(fields: [createdById], references: [id])
  tenants           Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, name, version])
  @@index([isActive])
  @@index([isPublic])
  @@index([name])
  @@index([tenantId])
  @@index([type])
}

enum FormTemplateType {
  // Esistente
  CONTACT_FORM
  
  // ✨ NEW
  COURSE_TEST           // Test fine corso
  PATIENT_INTAKE        // Anagrafica paziente
  QUOTE_REQUEST         // Richiesta preventivo
  NEWSLETTER_SIGNUP     // Iscrizione newsletter
  JOB_APPLICATION       // Candidatura lavoro
  SURVEY                // Sondaggio
  CUSTOM                // Personalizzato
}
```

**Checklist**:
- [ ] Aggiornare `schema.prisma`
- [ ] Generare migration: `npx prisma migrate dev --name add_advanced_form_features`
- [ ] Testare migration su database locale
- [ ] Verificare nessun data loss
- [ ] Aggiornare seed data (se presente)

**Deliverable**: Migration file + schema aggiornato

---

#### Subtask 1.3.3: Update TypeScript Types (1h)
**Obiettivo**: Allineare types frontend con nuovo schema

**File da aggiornare**:
```
src/services/formTemplates.ts
src/types/forms.ts (NEW)
```

**Checklist**:
- [ ] Creare `src/types/forms.ts` con tutti i types
- [ ] Aggiornare interfaces in `formTemplates.ts`
- [ ] Aggiungere type guards per conditional logic
- [ ] Aggiungere JSDoc con esempi
- [ ] Eseguire TypeScript check

**Deliverable**: Types aggiornati + TypeScript check passing

---

#### Subtask 1.3.4: Seed Data Aggiornato (0.5h)
**Obiettivo**: Creare seed con nuovi campi

**File**: `backend/prisma/seed/forms-seed.js`

**Contenuto minimo**:
```javascript
// 1. Form Contatti (pubblico)
{
  name: "Contatti",
  type: "CONTACT_FORM",
  isPublic: true,
  allowAnonymous: true,
  fields: [
    { name: "name", type: "TEXT", required: true },
    { name: "email", type: "EMAIL", required: true },
    { name: "phone", type: "TEL", required: false },
    { name: "message", type: "TEXTAREA", required: true }
  ]
}

// 2. Test Sicurezza Lavoro (autenticato)
{
  name: "Test Sicurezza Lavoro - Modulo Base",
  type: "COURSE_TEST",
  isPublic: false,
  settings: { passingScore: 18, maxScore: 30 },
  fields: [
    {
      name: "q1",
      type: "SINGLE_CHOICE",
      label: "Cosa significa DPI?",
      options: ["Dispositivo di Protezione Individuale", "Documento Pubblico Italiano", "Direttiva Protezione Industria"],
      scoring: { correctAnswer: "Dispositivo di Protezione Individuale", points: 3 }
    },
    // ... altre 9 domande
  ]
}

// 3. Anagrafica Paziente (autenticato + health context)
{
  name: "Anagrafica Paziente",
  type: "PATIENT_INTAKE",
  isPublic: false,
  fields: [
    { name: "fiscalCode", type: "FISCAL_CODE", required: true, entityMapping: { entity: "Person", field: "codiceFiscale" } },
    { name: "firstName", type: "TEXT", required: true, entityMapping: { entity: "Person", field: "nome" } },
    { name: "lastName", type: "TEXT", required: true, entityMapping: { entity: "Person", field: "cognome" } },
    { name: "birthDate", type: "DATE", required: true, entityMapping: { entity: "Person", field: "dataNascita" } },
    { name: "hasAllergies", type: "RADIO", options: ["Sì", "No"], required: true },
    {
      name: "allergiesDetails",
      type: "TEXTAREA",
      required: true,
      conditional: {
        simple: { field: "hasAllergies", operator: "equals", value: "Sì" }
      }
    }
  ]
}
```

**Checklist**:
- [ ] Creare seed file
- [ ] Eseguire seed su DB locale
- [ ] Verificare dati creati correttamente
- [ ] Testare conditional logic nel seed

**Deliverable**: Seed file + database popolato

---

### Task 1.4: Test Regression (3h)

#### Subtask 1.4.1: Unit Tests Backend (1.5h)
**File**: `backend/tests/forms/forms.service.test.js`

**Test da creare**:
```javascript
describe('FormsService', () => {
  describe('Templates', () => {
    it('should list templates with filters');
    it('should get template by id');
    it('should create template with fields');
    it('should update template');
    it('should delete template (soft)');
    it('should duplicate template with new name');
  });
  
  describe('Submissions', () => {
    it('should create submission for template');
    it('should validate submission data against schema');
    it('should list submissions with filters');
    it('should update submission status');
  });
  
  describe('Conditional Logic', () => {
    it('should evaluate simple condition (equals)');
    it('should evaluate complex condition (AND)');
    it('should show/hide field based on condition');
  });
});
```

**Checklist**:
- [ ] Setup test database
- [ ] Creare fixture data
- [ ] Scrivere test
- [ ] Eseguire test suite
- [ ] Coverage > 80%

**Deliverable**: Test suite passing + coverage report

---

#### Subtask 1.4.2: Integration Tests API (1h)
**File**: `backend/tests/integration/forms-api.test.js`

**Test da creare**:
```javascript
describe('Forms API Integration', () => {
  let authToken;
  let testTemplateId;
  
  beforeAll(async () => {
    // Login admin
    authToken = await getAdminToken();
  });
  
  it('POST /api/v1/forms - creates template', async () => {
    const res = await request(app)
      .post('/api/v1/forms')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Form', type: 'CONTACT_FORM', fields: [] });
    
    expect(res.status).toBe(201);
    testTemplateId = res.body.data.id;
  });
  
  it('GET /api/v1/forms/:id - gets template', async () => {
    // ...
  });
  
  it('POST /api/v1/forms/:id/submit - submits form (public)', async () => {
    // Test submission senza auth per form pubblico
  });
});
```

**Checklist**:
- [ ] Setup test environment
- [ ] Test tutti gli endpoint
- [ ] Test permessi RBAC
- [ ] Test validazione input
- [ ] Test error cases

**Deliverable**: Integration tests passing

---

#### Subtask 1.4.3: Frontend Component Tests (0.5h)
**File**: `src/pages/forms/__tests__/FormTemplatesPage.test.tsx`

**Test minimo**:
```typescript
describe('FormTemplatesPage', () => {
  it('renders templates list');
  it('filters templates by name');
  it('opens delete dialog');
  it('shows permission denied if no access');
});
```

**Checklist**:
- [ ] Setup React Testing Library
- [ ] Mock API calls
- [ ] Test user interactions
- [ ] Test loading/error states

**Deliverable**: Component tests passing

---

### Task 1.5: Documentazione (1h)

#### Subtask 1.5.1: API Documentation (0.5h)
**File**: `docs/api/FORMS_API.md`

**Contenuto**:
- Lista endpoint con metodi, params, responses
- Esempi request/response per ogni endpoint
- Error codes e handling
- Rate limiting
- Authentication requirements

---

#### Subtask 1.5.2: Technical Architecture (0.5h)
**File**: `docs/technical/FORMS_ARCHITECTURE.md`

**Contenuto**:
- Diagramma architettura (frontend ↔ API ↔ service ↔ DB)
- Data flow diagrams
- Conditional logic evaluation flow
- Entity mapping process
- File upload flow

---

## 📊 Definition of Done

### Per ogni task:
- [ ] ✅ Codice scritto e funzionante
- [ ] ✅ Tests passing (unit + integration)
- [ ] ✅ TypeScript check passing (no errors)
- [ ] ✅ ESLint warnings risolti
- [ ] ✅ Documentazione aggiornata
- [ ] ✅ Code review completato
- [ ] ✅ Merge su branch `feature/advanced-forms-system`

### Per la fase:
- [ ] ✅ Tutti i task completati
- [ ] ✅ Migration database eseguita senza errori
- [ ] ✅ Sistema esistente funziona ancora (no regression)
- [ ] ✅ Coverage tests > 80%
- [ ] ✅ Planning Fase 2 pronto

---

## 🚨 Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Migration database fallisce | Bassa | Alto | Backup DB prima di migrare, test su copia locale |
| Regression su funzionalità esistenti | Media | Alto | Test suite completa, test manuale pre-deploy |
| Schema JSON troppo complesso | Media | Medio | Peer review design, esempi concreti, validazione |
| Tempo stimato insufficiente | Media | Medio | Buffer +20% sulle stime, daily standup progress |

---

## 📈 Metriche di Successo Fase 1

- [ ] 0 regression bugs
- [ ] Test coverage > 80%
- [ ] Migration database < 5 minuti
- [ ] Documentazione completa (100%)
- [ ] Code review approval
- [ ] Tempo effettivo <= stima +20%

---

## 🔗 Dependencies

### Blockers (must be done first):
- Nessuno (fase iniziale)

### Blocked by this phase:
- Fase 2: Conditional Logic Engine
- Fase 3: Scoring System
- Fase 4: Form Builder UI

---

## 📝 Note Implementative

### Pattern da seguire:
```javascript
// Service Layer Pattern
class FormsService {
  // Sempre validare input
  validateTemplateData(data) {
    if (!data.name) throw new ValidationError('Name required');
    // ...
  }
  
  // Sempre gestire tenantId
  async createTemplate(data, tenantId, userId) {
    this.validateTemplateData(data);
    return await prisma.form_templates.create({
      data: { ...data, tenantId, createdById: userId }
    });
  }
  
  // Sempre loggare operazioni
  async deleteTemplate(id, tenantId, userId) {
    logger.info('Deleting template', { id, tenantId, userId });
    // ...
    logger.info('Template deleted', { id });
  }
}
```

### Naming Conventions:
- Routes: kebab-case (`/api/v1/forms/submissions`)
- Files: camelCase (`formsService.js`)
- Functions: camelCase (`createTemplate()`)
- Constants: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- Types: PascalCase (`FormTemplate`, `ConditionalLogic`)

---

**Versione**: 1.0  
**Ultima Modifica**: 16 Novembre 2025  
**Status**: ✅ Ready to Start
