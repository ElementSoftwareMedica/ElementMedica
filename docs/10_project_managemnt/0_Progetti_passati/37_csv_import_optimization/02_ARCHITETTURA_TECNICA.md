# 🏗️ CSV Import Optimization - Architettura Tecnica

**Progetto:** 37_csv_import_optimization  
**Data:** 22 Novembre 2025  
**Versione:** 1.0

---

## 📑 Indice

1. [Overview Architetturale](#overview-architetturale)
2. [Inventario Codice Esistente](#inventario-codice-esistente)
3. [Componenti da Creare](#componenti-da-creare)
4. [Componenti da Modificare](#componenti-da-modificare)
5. [Componenti da Eliminare](#componenti-da-eliminare)
6. [Pattern e Best Practices](#pattern-e-best-practices)
7. [Database Schema Changes](#database-schema-changes)
8. [API Endpoints](#api-endpoints)

---

## 🎯 Overview Architetturale

### Architettura a Livelli

```
┌─────────────────────────────────────────────────────┐
│                  PRESENTATION LAYER                  │
│                     (Frontend)                       │
├─────────────────────────────────────────────────────┤
│  Import Modals                                       │
│  ├─ CompanyImportModal                              │
│  ├─ EmployeeImportModal (NEW)                       │
│  └─ TrainerImportModal (NEW)                        │
│                                                       │
│  Conflict Resolution                                 │
│  ├─ CompanyImportConflictModal (ENHANCED)           │
│  ├─ EmployeeImportConflictModal (NEW)               │
│  └─ TrainerImportConflictModal (NEW)                │
│                                                       │
│  Common Components                                   │
│  ├─ ImportConflictResolutionPanel (NEW)             │
│  ├─ BulkCompanyAssignmentPanel (NEW)                │
│  ├─ ImportPreviewTable (REFACTORED)                 │
│  └─ TrainerCredentialsDisplay (NEW)                 │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│                   SERVICE LAYER                      │
│                     (Frontend)                       │
├─────────────────────────────────────────────────────┤
│  Import Services                                     │
│  ├─ companyImport.ts (REFACTORED)                   │
│  ├─ employeeImport.ts (NEW)                         │
│  └─ trainerImport.ts (NEW)                          │
│                                                       │
│  Utilities                                           │
│  ├─ importHelpers.ts (NEW)                          │
│  ├─ importValidation.ts (NEW)                       │
│  └─ csvHelpers.ts (EXISTING)                        │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│                     API LAYER                        │
│                     (Backend)                        │
├─────────────────────────────────────────────────────┤
│  Routes                                              │
│  ├─ POST /api/companies/import (REFACTORED)         │
│  ├─ POST /api/employees/import (NEW)                │
│  └─ POST /api/trainers/import (NEW)                 │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                │
│                     (Backend)                        │
├─────────────────────────────────────────────────────┤
│  Import Services                                     │
│  ├─ CompanyImportService.js (NEW)                   │
│  ├─ EmployeeImportService.js (NEW)                  │
│  ├─ TrainerImportService.js (NEW)                   │
│  └─ TrainerAccountService.js (NEW)                  │
│                                                       │
│  Utilities                                           │
│  ├─ importValidation.js (NEW)                       │
│  ├─ credentialsGenerator.js (NEW)                   │
│  └─ emailService.js (EXISTING)                      │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│                   DATA ACCESS LAYER                  │
│                     (Prisma ORM)                     │
├─────────────────────────────────────────────────────┤
│  Models                                              │
│  ├─ Company                                          │
│  ├─ CompanySite                                      │
│  ├─ Person                                           │
│  ├─ PersonRole                                       │
│  └─ User                                             │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│                   DATABASE LAYER                     │
│                     (PostgreSQL)                     │
└─────────────────────────────────────────────────────┘
```

---

## 📦 Inventario Codice Esistente

### Frontend - Company Import

#### ✅ File da Mantenere e Refactorare

**1. `src/components/companies/company-import/CompanyImportRefactored.tsx`**
- **Stato attuale:** 284 linee, ben strutturato
- **Modifiche necessarie:**
  - Estrarre logica CSV processing in service
  - Migliorare gestione sedi multiple
  - Aggiungere preview sedi esistenti
- **Priorità:** 🟡 MEDIA

**2. `src/components/companies/CompanyImportConflictModal.tsx`**
- **Stato attuale:** 200 linee, funzionale ma basico
- **Modifiche necessarie:**
  - Aggiungere opzione "Add as Site"
  - Migliorare data diff display
  - Aggiungere batch resolution actions
  - Mostrare sedi esistenti per azienda
- **Priorità:** 🔴 ALTA

**3. `src/components/shared/GenericImport.tsx`**
- **Stato attuale:** 217 linee, hooks composition pattern
- **Modifiche necessarie:**
  - Aggiungere supporto bulk company assignment
  - Migliorare conflict resolution UI
  - Estendere per Employee/Trainer specifici
- **Priorità:** 🟡 MEDIA

**4. `src/components/shared/GenericImport/utils/csvHelpers.ts`**
- **Stato attuale:** Funzioni utility per CSV parsing
- **Modifiche necessarie:**
  - Aggiungere normalizzazione CF
  - Aggiungere normalizzazione PIVA
  - Aggiungere validazione email
- **Priorità:** 🟢 BASSA

#### ⚠️ File da Valutare

**1. `src/components/companies/CompanyImport.tsx`**
- **Stato attuale:** 5 linee, wrapper legacy
```tsx
// Componente legacy - ora utilizza la versione refactorizzata
import { CompanyImportRefactored } from './company-import';
export default CompanyImportRefactored;
```
- **Decisione:** ✅ Mantenere come wrapper per compatibilità

**2. `src/components/persons/person-import/PersonImportRefactored.tsx`**
- **Stato attuale:** 197 linee, già refactorizzato
- **Modifiche necessarie:**
  - Separare in EmployeeImport e TrainerImport
  - O parametrizzare per tipo ruolo
- **Decisione:** 🔄 Usare come base per Employee/Trainer

**3. `src/components/trainers/TrainerImport.tsx`**
- **Stato attuale:** Da analizzare
- **Decisione:** 🔄 Sostituire con nuovo TrainerImportModal

---

### Backend - Company Import

#### ✅ File da Mantenere e Refactorare

**1. `backend/routes/companies-routes.js` (POST /import)**
- **Stato attuale:** 1100+ linee, molto complesso
- **Problemi:**
  - Logica business mista con routing
  - Codice molto annidato
  - Difficile da testare
- **Soluzione:**
  - Estrarre in CompanyImportService.js
  - Route diventa solo orchestrator (< 100 linee)
  - Separare validazione, conflict detection, import logic
- **Priorità:** 🔴 ALTA

**2. `backend/services/person/PersonImportService.js`**
- **Stato attuale:** 647 linee, già strutturato
- **Modifiche necessarie:**
  - Separare logica Employee-specific
  - Separare logica Trainer-specific
  - Mantenere solo logica comune Person
- **Priorità:** 🟡 MEDIA

**3. `backend/services/person/import/PersonImport.js`**
- **Stato attuale:** 138+ linee, utility functions
- **Modifiche necessarie:**
  - Consolidare con PersonImportService
  - O estrarre in utils/importValidation.js
- **Priorità:** 🟢 BASSA

**4. `backend/controllers/personController.js` (importPersons)**
- **Stato attuale:** Controller method
- **Modifiche necessarie:**
  - Mantenere per compatibilità
  - Delegare a specifici services (Employee/Trainer)
- **Priorità:** 🟡 MEDIA

---

### Shared Utilities

#### ✅ File da Mantenere

**1. `src/utils/csvExport.ts`**
- **Stato attuale:** Utility per export CSV
- **Utilizzo:** Download template, export results
- **Modifiche:** Nessuna necessaria

**2. `backend/utils/logger.js`**
- **Stato attuale:** Winston logger
- **Utilizzo:** Logging import operations
- **Modifiche:** Nessuna necessaria

---

## 🆕 Componenti da Creare

### Frontend Components

#### 1. Import Modals

**`src/components/import/employee/EmployeeImportModal.tsx`**
```tsx
interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingCompanies: Company[];
}

// Features:
// - CSV upload & preview
// - CF validation & duplicate detection
// - Bulk company assignment panel
// - Conflict resolution
// - Import confirmation
```

**`src/components/import/trainer/TrainerImportModal.tsx`**
```tsx
interface TrainerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Features:
// - CSV upload & preview
// - CF + Email validation
// - Username generation preview
// - Conflict resolution
// - Credentials display after import
```

#### 2. Conflict Modals

**`src/components/import/employee/EmployeeImportConflictModal.tsx`**
```tsx
interface EmployeeImportConflictModalProps {
  isOpen: boolean;
  conflicts: EmployeeConflict[];
  onResolve: (resolutions: ConflictResolution[]) => void;
  onClose: () => void;
}

// Resolution options:
// - Skip
// - Overwrite
// - Add Role (se Person esiste con altro ruolo)
```

**`src/components/import/trainer/TrainerImportConflictModal.tsx`**
```tsx
interface TrainerImportConflictModalProps {
  isOpen: boolean;
  conflicts: TrainerConflict[];
  onResolve: (resolutions: ConflictResolution[]) => void;
  onClose: () => void;
}

// Resolution options:
// - Skip
// - Overwrite
// - Add Role + Create Account
```

#### 3. Common Components

**`src/components/import/common/ImportConflictResolutionPanel.tsx`**
```tsx
interface ImportConflictResolutionPanelProps<T> {
  newData: T;
  existingData: T;
  resolutionOptions: ResolutionOption[];
  selectedResolution: string;
  onResolutionChange: (resolution: string) => void;
}

// Generic reusable component for conflict resolution
// Shows side-by-side comparison with highlighted differences
```

**`src/components/import/common/BulkCompanyAssignmentPanel.tsx`**
```tsx
interface BulkCompanyAssignmentPanelProps {
  employees: EmployeeData[];
  invalidIndices: number[];
  companies: Company[];
  onAssign: (indices: number[], companyId: string) => void;
}

// Features:
// - Multi-select employees
// - Company dropdown
// - Bulk assign action
// - Filter by invalid company
```

**`src/components/import/trainer/TrainerCredentialsDisplay.tsx`**
```tsx
interface TrainerCredentialsDisplayProps {
  credentials: Credential[];
  onClose: () => void;
}

// Features:
// - Table with credentials
// - Copy to clipboard
// - Download CSV
// - Warning about saving credentials
```

---

### Backend Services

#### 1. Import Services

**`backend/services/company/CompanyImportService.js`**
```javascript
class CompanyImportService {
  // Validation
  async validateBatch(companies, tenantId)
  async validateCompanyData(companyData)
  
  // Conflict Detection
  async detectPivaConflicts(companies, tenantId)
  async detectCodiceFiscaleConflicts(companies, tenantId)
  
  // Import Operations
  async importBatch(companies, resolutions, tenantId)
  async importCompany(companyData, tenantId)
  async updateCompany(companyId, companyData)
  
  // Site Management
  async createCompanySite(companyId, siteData, tenantId)
  async findExistingSite(companyId, siteData)
  
  // Utilities
  normalizePiva(piva)
  normalizeCodiceFiscale(cf)
}
```

**`backend/services/employee/EmployeeImportService.js`**
```javascript
class EmployeeImportService {
  // Validation
  async validateBatch(employees, tenantId)
  async validateEmployeeData(employeeData)
  
  // Conflict Detection
  async detectTaxCodeConflicts(employees, tenantId)
  
  // Company Resolution
  async resolveCompany(companyNameOrPiva, tenantId)
  async validateCompanyAssignments(employees, tenantId)
  
  // Import Operations
  async importBatch(employees, resolutions, tenantId)
  async createEmployee(employeeData, companyId, tenantId)
  async updatePerson(personId, employeeData, companyId)
  async addEmployeeRole(personId, companyId)
  
  // Utilities
  normalizeTaxCode(taxCode)
  normalizePiva(piva)
}
```

**`backend/services/trainer/TrainerImportService.js`**
```javascript
class TrainerImportService {
  constructor() {
    this.accountService = new TrainerAccountService();
  }
  
  // Validation
  async validateBatch(trainers, tenantId)
  async validateTrainerData(trainerData)
  
  // Conflict Detection
  async detectTaxCodeConflicts(trainers, tenantId)
  async detectEmailConflicts(trainers, tenantId)
  
  // Import Operations
  async importBatch(trainers, resolutions, tenantId)
  async createTrainer(trainerData, tenantId) // Person + Role + User
  async updateTrainer(personId, trainerData)
  async addTrainerRole(personId, trainerData, tenantId) // Role + User
  
  // Utilities
  normalizeTaxCode(taxCode)
}
```

**`backend/services/trainer/TrainerAccountService.js`**
```javascript
class TrainerAccountService {
  // Username Generation
  async generateUniqueUsername(email, firstName, lastName, tenantId)
  async usernameExists(username, tenantId)
  
  // Password Generation
  generateSecurePassword()
  
  // Account Creation
  async createTrainerAccount(personId, email, username, tenantId)
  
  // Email
  async sendWelcomeEmail(email, username, password)
}
```

#### 2. Utilities

**`backend/utils/importValidation.js`**
```javascript
// Normalization
export function normalizePiva(piva)
export function normalizeTaxCode(taxCode)
export function normalizeEmail(email)

// Validation
export function isValidEmail(email)
export function isValidPiva(piva)
export function isValidTaxCode(taxCode)

// Duplicate Detection
export function findDuplicatesInBatch(items, uniqueField, normalizer)

// Error Formatting
export function formatValidationErrors(errors)
export function formatConflicts(conflicts)
```

**`backend/utils/credentialsGenerator.js`**
```javascript
// Username
export function generateUsername(firstName, lastName)
export function sanitizeUsername(username)
export async function ensureUniqueUsername(baseUsername, tenantId)

// Password
export function getStandardPassword() // Returns "Password123!"
export function validatePasswordStrength(password)
```

---

### Frontend Services

**`src/services/import/employeeImport.ts`**
```typescript
export class EmployeeImportService {
  static async importEmployees(
    employees: EmployeeData[], 
    resolutions?: Record<number, ConflictResolution>
  ): Promise<ImportResult>
  
  static async matchCompanies(
    employees: EmployeeData[], 
    companies: Company[]
  ): Promise<EmployeeData[]>
  
  static async detectConflicts(
    employees: EmployeeData[]
  ): Promise<EmployeeConflict[]>
}
```

**`src/services/import/trainerImport.ts`**
```typescript
export class TrainerImportService {
  static async importTrainers(
    trainers: TrainerData[], 
    resolutions?: Record<number, ConflictResolution>
  ): Promise<ImportResultWithCredentials>
  
  static async detectConflicts(
    trainers: TrainerData[]
  ): Promise<TrainerConflict[]>
}
```

**`src/utils/importValidation.ts`**
```typescript
// Normalization
export function normalizeTaxCode(taxCode: string): string
export function normalizePiva(piva: string): string
export function normalizeEmail(email: string): string

// Validation
export function isValidEmail(email: string): boolean
export function isValidTaxCode(taxCode: string): boolean
export function isValidPiva(piva: string): boolean

// CSV Processing
export function parseCSV<T>(
  file: File, 
  headerMap: Record<string, string>
): Promise<T[]>
```

---

## ♻️ Componenti da Modificare

### Frontend

#### 1. Enhanced Conflict Modal (Company)

**File:** `src/components/companies/CompanyImportConflictModal.tsx`

**Modifiche:**
```tsx
// BEFORE
type ConflictResolution = 
  | { action: 'skip' }
  | { action: 'overwrite', companyId: string }

// AFTER
type ConflictResolution = 
  | { action: 'skip' }
  | { action: 'overwrite', companyId: string }
  | { action: 'add_site', companyId: string, siteName: string }  // NEW

// NEW: Show existing sites
{conflict.existingCompany.sites && (
  <div className="existing-sites">
    <h5>Sedi esistenti ({conflict.existingCompany.sites.length}):</h5>
    <ul>
      {conflict.existingCompany.sites.map(site => (
        <li key={site.id}>
          {site.siteName} - {site.citta} - {site.indirizzo}
        </li>
      ))}
    </ul>
  </div>
)}

// NEW: Third resolution option
<label>
  <input
    type="radio"
    name={`resolution-${conflict.index}`}
    checked={resolution.action === 'add_site'}
    onChange={() => updateResolution(conflict.index, { 
      action: 'add_site',
      companyId: conflict.existingCompany.id
    })}
  />
  Aggiungi come nuova sede
  {resolution.action === 'add_site' && (
    <input
      type="text"
      placeholder="Nome sede (es. Sede Milano)"
      value={resolution.siteName || ''}
      onChange={(e) => updateResolution(conflict.index, { 
        siteName: e.target.value 
      })}
      className="ml-2"
    />
  )}
</label>

// NEW: Batch resolution actions
<div className="batch-actions">
  <button onClick={() => resolveAll('skip')}>Salta tutti</button>
  <button onClick={() => resolveAll('overwrite')}>Sovrascrivi tutti</button>
  <button onClick={() => resolveAll('add_site')}>Aggiungi tutti come sedi</button>
</div>
```

#### 2. Generic Import Enhancement

**File:** `src/components/shared/GenericImport.tsx`

**Modifiche:**
```tsx
// Aggiungere props per company assignment
interface GenericImportProps<T> {
  // ... existing props
  
  // NEW: For employee import
  enableCompanyAssignment?: boolean;
  availableCompanies?: Company[];
  onCompanyChange?: (rowIndices: number[], companyId: string) => void;
}

// NEW: Company assignment panel integration
{enableCompanyAssignment && invalidCompanies.length > 0 && (
  <BulkCompanyAssignmentPanel
    employees={previewData}
    invalidIndices={invalidCompanies}
    companies={availableCompanies}
    onAssign={handleCompanyAssign}
  />
)}
```

---

### Backend

#### 1. Company Import Route Refactoring

**File:** `backend/routes/companies-routes.js`

**BEFORE (1100+ lines):**
```javascript
router.post('/import', authenticateToken(), async (req, res) => {
  // 1100+ lines of nested logic
  // - Validation
  // - PIVA normalization
  // - Duplicate detection
  // - Site creation
  // - Error handling
  // All mixed together
});
```

**AFTER (< 100 lines):**
```javascript
router.post('/import', authenticateToken(), async (req, res) => {
  try {
    const { companies, overwriteIds = [] } = req.body;
    const tenantId = req.person.tenantId;
    
    // Delegate to service
    const validation = await companyImportService.validateBatch(companies, tenantId);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }
    
    const conflicts = await companyImportService.detectConflicts(companies, tenantId);
    if (conflicts.length > 0 && overwriteIds.length === 0) {
      return res.status(409).json({ conflicts });
    }
    
    const results = await companyImportService.importBatch(
      companies, 
      overwriteIds, 
      tenantId
    );
    
    res.json(results);
  } catch (error) {
    logger.error('Company import failed:', error);
    res.status(500).json({ error: 'Import failed' });
  }
});
```

#### 2. Person Import Service Refactoring

**File:** `backend/services/person/PersonImportService.js`

**Modifiche:**
- Rimuovere logica specifica Employee/Trainer
- Mantenere solo metodi comuni Person
- Estrarre in EmployeeImportService e TrainerImportService

**Metodi da mantenere:**
```javascript
// Generic person operations
async validatePersonData(personData)
async checkForDuplicates(personData, tenantId)
async preparePersonData(personData)
async updateExistingPerson(personId, personData)

// Utilities
normalizeTaxCode(taxCode)
isValidEmail(email)
parseDate(dateString)
toTitleCase(str)
```

**Metodi da spostare in EmployeeImportService:**
```javascript
async resolveCompanyId(companyNameOrPiva, tenantId)
async createEmployee(employeeData, companyId, tenantId)
```

**Metodi da spostare in TrainerImportService:**
```javascript
async createTrainer(trainerData, tenantId)
// + tutto ciò che riguarda account creation
```

---

## 🗑️ Componenti da Eliminare

### File Obsoleti da Rimuovere

**1. `src/components/trainers/TrainerImport.tsx` (se esiste)**
- **Motivo:** Sostituito da nuovo TrainerImportModal
- **Azione:** Spostare in `/cleanup-temp/37_removed/`

**2. `src/components/shared/ImportModal.tsx` (se duplicato)**
- **Valutare:** Se è solo un wrapper generico, potrebbe essere utile
- **Azione:** Da decidere dopo analisi

**3. `backend/services/person/import/PersonImport.js` (potenzialmente)**
- **Motivo:** Funzionalità duplicate con PersonImportService
- **Azione:** Consolidare in PersonImportService o utils/importValidation.js

---

## 🎨 Pattern e Best Practices

### 1. Service Layer Pattern

**Separazione responsabilità:**
```
Route (Controller) 
  → Validazione input
  → Orchestrazione
  → Response formatting

Service (Business Logic)
  → Validazione business rules
  → Conflict detection
  → Import operations
  → Database transactions

Utilities
  → Normalizzazione dati
  → Validazione formati
  → Helper functions
```

### 2. Transaction Pattern

**Sempre usare transazioni per operazioni atomiche:**
```javascript
// Employee: Person + PersonRole
await prisma.$transaction(async (tx) => {
  const person = await tx.person.create({ ... });
  await tx.personRole.create({ personId: person.id, roleType: 'EMPLOYEE' });
  return person;
});

// Trainer: Person + PersonRole + User
await prisma.$transaction(async (tx) => {
  const person = await tx.person.create({ ... });
  await tx.personRole.create({ personId: person.id, roleType: 'TRAINER' });
  const user = await tx.user.create({ personId: person.id, ... });
  return { person, user };
});
```

### 3. Error Handling Pattern

**Consistent error responses:**
```javascript
// Success
{
  success: true,
  results: { created: [], updated: [], errors: [] },
  summary: { total, created, updated, errors }
}

// Validation Error
{
  success: false,
  errors: [{ index, field, message }]
}

// Conflicts
{
  success: false,
  conflicts: [{ index, type, data, existingData }]
}
```

### 4. Normalization Pattern

**Sempre normalizzare prima di comparare:**
```javascript
// PIVA
const normalizePiva = (piva) => 
  piva.replace(/\s+/g, '')
      .replace(/^IT/, '')
      .replace(/\D/g, '');

// CF
const normalizeTaxCode = (cf) => 
  cf.toUpperCase().trim();

// Email
const normalizeEmail = (email) => 
  email.toLowerCase().trim();
```

### 5. Conflict Resolution Pattern

**Frontend:**
```tsx
interface ConflictResolution {
  index: number;
  action: 'skip' | 'overwrite' | 'add_site' | 'add_role';
  targetId?: string; // Company/Person ID
  metadata?: Record<string, any>; // Extra data (siteName, etc.)
}

const resolutions: Record<number, ConflictResolution> = {};
```

**Backend:**
```javascript
for (const item of items) {
  const resolution = resolutions[item.index];
  
  if (!resolution || resolution.action === 'skip') continue;
  
  switch (resolution.action) {
    case 'overwrite':
      await updateExisting(resolution.targetId, item);
      break;
    case 'add_site':
      await createSite(resolution.targetId, item, resolution.metadata.siteName);
      break;
    // ...
  }
}
```

---

## 🗄️ Database Schema Changes

### Modifiche Necessarie

**Nessuna modifica allo schema richiesta!**

Lo schema esistente già supporta tutti i requisiti:
- ✅ `Person.taxCode` con UNIQUE constraint
- ✅ `Company.piva` con UNIQUE constraint
- ✅ `PersonRole` per gestione ruoli multipli
- ✅ `User.personId` per link account
- ✅ `CompanySite` per sedi multiple

### Indici da Verificare

**Performance optimization:**
```sql
-- Verifica indici esistenti
CREATE INDEX IF NOT EXISTS idx_person_taxcode ON "Person"("taxCode");
CREATE INDEX IF NOT EXISTS idx_person_email ON "Person"("email");
CREATE INDEX IF NOT EXISTS idx_company_piva ON "Company"("piva");
CREATE INDEX IF NOT EXISTS idx_user_username ON "User"("username");
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"("email");
```

---

## 🌐 API Endpoints

### Existing (da refactorare)

**POST /api/companies/import**
```javascript
// Request
{
  companies: CompanyData[],
  overwriteIds?: string[]
}

// Response (success)
{
  success: true,
  results: {
    created: Company[],
    updated: Company[],
    errors: ImportError[],
    sitesCreated: CompanySite[]
  },
  summary: {
    total: number,
    created: number,
    updated: number,
    sitesCreated: number,
    errors: number,
    conflicts: number
  }
}

// Response (conflicts)
{
  success: false,
  conflicts: CompanyConflict[]
}
```

### New Endpoints

**POST /api/employees/import**
```javascript
// Request
{
  employees: EmployeeData[],
  resolutions?: Record<number, ConflictResolution>
}

// Response
{
  success: true,
  results: {
    created: Person[],
    updated: Person[],
    errors: ImportError[]
  },
  summary: {
    total: number,
    created: number,
    updated: number,
    errors: number
  }
}
```

**POST /api/trainers/import**
```javascript
// Request
{
  trainers: TrainerData[],
  resolutions?: Record<number, ConflictResolution>
}

// Response
{
  success: true,
  results: {
    created: Person[],
    updated: Person[],
    errors: ImportError[],
    credentials: Credential[] // Email, username, password
  },
  summary: {
    total: number,
    created: number,
    updated: number,
    errors: number,
    credentialsGenerated: number
  }
}
```

---

## 📚 Type Definitions

### Frontend Types

```typescript
// Company Import
interface CompanyData {
  ragioneSociale: string;
  piva?: string;
  codiceFiscale?: string;
  citta?: string;
  indirizzo?: string;
  // ... other fields
  
  // Site data (if different from main)
  siteName?: string;
  siteIndirizzo?: string;
  siteCitta?: string;
  // ...
}

interface CompanyConflict {
  index: number;
  error: string;
  data: CompanyData;
  existingCompany?: {
    id: string;
    ragioneSociale: string;
    piva?: string;
    sites: CompanySite[];
  };
}

// Employee Import
interface EmployeeData {
  firstName: string;
  lastName: string;
  taxCode: string; // REQUIRED
  email?: string;
  phone?: string;
  birthDate?: string;
  // ...
  companyName?: string; // For matching
  companyPiva?: string; // For better matching
  companyId?: string; // Resolved ID
}

interface EmployeeConflict {
  index: number;
  type: 'duplicate_employee' | 'person_exists_different_role';
  employee: EmployeeData;
  existingPerson: Person & { personRoles: PersonRole[] };
}

// Trainer Import
interface TrainerData {
  firstName: string;
  lastName: string;
  taxCode: string; // REQUIRED
  email: string; // REQUIRED
  phone?: string;
  birthDate?: string;
  username?: string; // Optional, auto-generated if missing
  // ...
}

interface TrainerConflict {
  index: number;
  type: 'duplicate_trainer' | 'person_exists_different_role' | 'duplicate_email';
  trainer: TrainerData;
  existingPerson?: Person & { personRoles: PersonRole[], user?: User };
  existingUser?: User;
}

interface Credential {
  email: string;
  username: string;
  password: string; // Plain text, for display/email only
}

// Conflict Resolution
type ConflictResolutionAction = 
  | 'skip' 
  | 'overwrite' 
  | 'add_site'    // Company only
  | 'add_role';   // Employee/Trainer only

interface ConflictResolution {
  action: ConflictResolutionAction;
  targetId?: string; // Company/Person ID
  metadata?: {
    siteName?: string;  // For add_site
    [key: string]: any;
  };
}

// Import Results
interface ImportResult {
  created: any[];
  updated: any[];
  errors: ImportError[];
}

interface ImportResultWithCredentials extends ImportResult {
  credentials: Credential[];
}

interface ImportError {
  index: number;
  error: string;
  field?: string;
}
```

---

**Ultimo Aggiornamento:** 22 Novembre 2025  
**Status:** ✅ COMPLETE
