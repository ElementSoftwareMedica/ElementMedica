# 📦 CSV Import Optimization - Project Overview

**Data Creazione:** 22 Novembre 2025  
**Progetto:** 37_csv_import_optimization  
**Branch:** feature/csv-import-optimization  
**Priorità:** 🔴 ALTA  
**Stato:** 🚀 PLANNING

---

## 🎯 Obiettivi del Progetto

### Obiettivo Primario
Ottimizzare e consolidare il sistema di importazione massiva CSV per le tre principali entità:
1. **Companies** (Aziende)
2. **Employees** (Dipendenti)
3. **Trainers** (Formatori)

### Problemi Identificati
1. **Company Import:**
   - ✅ Sistema già funzionante con gestione PIVA univoca
   - ⚠️ Gestione sedi multiple da migliorare e semplificare
   - ⚠️ UX del modal di conflitti da ottimizzare

2. **Employee Import:**
   - ❌ Manca verifica univocità Codice Fiscale
   - ❌ Gestione conflitti non implementata
   - ❌ Assegnazione azienda non robusta
   - ❌ Creazione Person con ruolo EMPLOYEE non ottimale

3. **Trainer Import:**
   - ❌ Manca verifica univocità Codice Fiscale
   - ❌ Creazione account utente non implementata
   - ❌ Assegnazione ruolo TRAINER non gestita
   - ❌ Sistema di conflitti assente

---

## 📋 Requisiti Funzionali Dettagliati

### 1. Company Import Requirements

#### R1.1: Validazione PIVA Univoca
- **Descrizione:** Verificare univocità P.IVA tra aziende importate e quelle in database
- **Comportamento:**
  - Durante parsing CSV, normalizzare P.IVA (rimuovi spazi, prefisso IT, mantieni solo numeri)
  - Verificare duplicati nel batch CSV stesso
  - Verificare duplicati nel database (incluse aziende eliminate con soft delete)
  - Se duplicato: mostrare nel modal conflitti

#### R1.2: Modal Conflitti PIVA
- **Opzioni per conflitto:**
  1. **Skip:** Ignora riga, mantieni azienda esistente
  2. **Overwrite:** Sovrascrivi dati azienda esistente
  3. **Add Site:** Aggiungi come nuova sede all'azienda esistente
- **Informazioni visualizzate:**
  - Dati azienda da importare (ragioneSociale, piva, indirizzo, città, ecc.)
  - Dati azienda esistente in DB
  - Sedi esistenti dell'azienda
  - Differenze tra i dati

#### R1.3: Gestione Sedi Multiple
- **Logica:**
  - Se PIVA esiste E indirizzo diverso → Proponi creazione nuova sede
  - Se PIVA esiste E indirizzo uguale → Proponi aggiornamento sede esistente o skip
  - Prima sede importata = Sede Principale (se azienda nuova)
  - Sedi successive = Sedi Secondarie

#### R1.4: Campi Sede
```
Sede Principale:
- siteName (default: città o "Sede Principale")
- siteIndirizzo
- siteCitta
- siteProvincia
- siteCap
- sitePersonaRiferimento
- siteTelefono
- siteMail
```

### 2. Employee Import Requirements

#### R2.1: Validazione Codice Fiscale Univoco
- **Descrizione:** Verificare univocità CF tra dipendenti importati e Person in database
- **Comportamento:**
  - Normalizzare CF (uppercase, trim)
  - Verificare duplicati nel batch CSV
  - Verificare duplicati in tabella Person (dove deletedAt IS NULL)
  - Se duplicato: mostrare nel modal conflitti

#### R2.2: Modal Conflitti Employee
- **Opzioni per conflitto:**
  1. **Skip:** Ignora riga, mantieni Person esistente
  2. **Overwrite:** Sovrascrivi dati Person esistente (mantieni ID)
  3. **Add Role:** Se Person esiste ma non ha ruolo EMPLOYEE, aggiungi ruolo
- **Informazioni visualizzate:**
  - Dati employee da importare
  - Dati Person esistente
  - Ruoli attuali Person esistente
  - Differenze dati

#### R2.3: Verifica e Assegnazione Azienda
- **Problemi attuali:**
  - Riconoscimento azienda per nome non affidabile
  - Aziende mancanti causano errori silenti
- **Soluzione proposta:**
  1. **Pre-import validation:**
     - Colonna CSV: `companyName` o `companyPiva`
     - Se company non trovata: flag come "Invalid Company"
  2. **Bulk Company Assignment:**
     - Nel modal import, dropdown con tutte le aziende
     - Possibilità di selezionare N righe e assegnare azienda in batch
     - Filtro per vedere solo righe "Invalid Company"
  3. **Creazione azienda al volo:**
     - Opzione "Crea nuova azienda" nel dropdown
     - Mini-form inline per dati base azienda

#### R2.4: Creazione Person con Ruolo EMPLOYEE
- **Flusso:**
  1. Crea record Person con dati anagrafici
  2. Crea relazione PersonRole (personId, roleType=EMPLOYEE)
  3. Associa companyId alla Person
  4. NON creare account utente (Employee non ha login)

#### R2.5: Campi Employee CSV
```
Obbligatori:
- firstName (Nome)
- lastName (Cognome)
- taxCode (Codice Fiscale) - UNIQUE

Opzionali:
- email
- phone (Telefono)
- birthDate (Data Nascita)
- birthPlace (Luogo Nascita)
- residenceAddress (Indirizzo)
- residenceCity (Città)
- residenceProvince (Provincia)
- residencePostalCode (CAP)
- companyName (Nome Azienda - per matching)
- companyPiva (P.IVA Azienda - per matching più preciso)
- notes (Note)
```

### 3. Trainer Import Requirements

#### R3.1: Validazione Codice Fiscale Univoco
- **Come Employee (R2.1)**
- Stessa logica di normalizzazione e verifica duplicati

#### R3.2: Modal Conflitti Trainer
- **Opzioni per conflitto:**
  1. **Skip:** Ignora riga, mantieni Person esistente
  2. **Overwrite:** Sovrascrivi dati Person esistente
  3. **Add Role + Account:** Se Person esiste, aggiungi ruolo TRAINER e crea account
- **Informazioni visualizzate:**
  - Come Employee (R2.2)
  - Inoltre: stato account esistente (se presente)

#### R3.3: Creazione Person + Account TRAINER
- **Flusso:**
  1. Crea record Person con dati anagrafici
  2. Crea relazione PersonRole (personId, roleType=TRAINER)
  3. Crea User con:
     - username (generato da email o firstName.lastName)
     - password (generata randomicamente, inviata via email)
     - email (obbligatorio per trainer)
     - globalRole=TRAINER
  4. Associa User.personId = Person.id

#### R3.4: Generazione Credenziali
- **Username:**
  - Formato standard: firstName.lastName (es. Mario Rossi → mario.rossi)
  - Normalizzazione: lowercase, rimozione spazi e accenti
  - Verifica univocità con contatore progressivo se esistente:
    - Primo: mario.rossi
    - Secondo omonimo: mario.rossi1
    - Terzo omonimo: mario.rossi2
    - ecc.
- **Password:**
  - Password standard fissa: **"Password123!"**
  - Uguale per tutti i trainer importati
  - Inviata via email al trainer
  - Flag `mustChangePassword=true` per forzare cambio al primo login

#### R3.5: Campi Trainer CSV
```
Obbligatori:
- firstName (Nome)
- lastName (Cognome)
- taxCode (Codice Fiscale) - UNIQUE
- email - OBBLIGATORIO per creazione account

Opzionali:
- phone (Telefono)
- birthDate (Data Nascita)
- birthPlace (Luogo Nascita)
- residenceAddress (Indirizzo)
- residenceCity (Città)
- residenceProvince (Provincia)
- residencePostalCode (CAP)
- username (se non fornito, generato automaticamente)
- notes (Note)
- specializations (Specializzazioni - separati da ;)
```

---

## 🏗️ Architettura Sistema Import

### Componenti Esistenti da Riutilizzare

#### Frontend
```
✅ GenericImport.tsx
   - Hook composition pattern ben strutturato
   - Da mantenere come base

✅ CompanyImportRefactored.tsx
   - Buona gestione conflitti PIVA
   - Da usare come modello

⚠️ PersonImportRefactored.tsx
   - Struttura buona
   - Da estendere per Employee/Trainer

⚠️ CompanyImportConflictModal.tsx
   - UI conflicts da migliorare
   - Aggiungere opzione "Add Site"
```

#### Backend
```
✅ backend/routes/companies-routes.js
   - POST /import endpoint ben strutturato
   - Gestione PIVA e sedi già implementata
   - Da ottimizzare per chiarezza

⚠️ backend/services/person/PersonImportService.js
   - Logica import base esistente
   - Da estendere per Employee/Trainer specifici

⚠️ backend/services/person/import/PersonImport.js
   - CSV parsing e validazione
   - Da consolidare

✅ backend/controllers/personController.js
   - importPersons endpoint esistente
   - Da separare per Employee/Trainer
```

### Componenti da Creare

#### Frontend
```
🆕 EmployeeImportModal.tsx
   - Import specifico per dipendenti
   - Conflict resolution con CF
   - Bulk company assignment

🆕 TrainerImportModal.tsx
   - Import specifico per formatori
   - Account creation preview
   - Credentials display

🆕 ImportConflictResolutionPanel.tsx
   - Componente riutilizzabile per conflicts
   - Parametrizzato per tipo entità

🆕 BulkCompanyAssignmentPanel.tsx
   - Dropdown aziende
   - Selezione multipla righe
   - Assegnazione in batch
```

#### Backend
```
🆕 backend/services/employee/EmployeeImportService.js
   - Import logic specifico Employee
   - CF validation
   - Company assignment

🆕 backend/services/trainer/TrainerImportService.js
   - Import logic specifico Trainer
   - Account creation
   - Credentials generation

🆕 backend/routes/employee-import-routes.js
   - POST /api/employees/import
   - Endpoint dedicato

🆕 backend/routes/trainer-import-routes.js
   - POST /api/trainers/import
   - Endpoint dedicato

🆕 backend/utils/importValidation.js
   - Shared validation utilities
   - CF normalization
   - Duplicate detection
```

---

## 🔄 Flusso Import Ottimizzato

### 1. Company Import Flow
```
[User] Seleziona CSV
   ↓
[Frontend] Parse CSV + Format data
   ↓
[Frontend] Normalize PIVA
   ↓
[Frontend] Detect duplicates in batch
   ↓
[Frontend] Send to API
   ↓
[Backend] Validate PIVA uniqueness vs DB
   ↓
[Backend] Detect existing companies
   ↓
[Backend] Return conflicts
   ↓
[Frontend] Show CompanyImportConflictModal
   ↓
[User] Resolve conflicts:
   - Skip
   - Overwrite
   - Add as new site
   ↓
[Frontend] Send resolved data
   ↓
[Backend] Execute import with resolutions
   ↓
[Backend] Return results
   ↓
[Frontend] Show success/error summary
```

### 2. Employee Import Flow
```
[User] Seleziona CSV
   ↓
[Frontend] Parse CSV + Format data
   ↓
[Frontend] Normalize CF
   ↓
[Frontend] Detect duplicates in batch
   ↓
[Frontend] Match companies (by name/PIVA)
   ↓
[Frontend] Flag "Invalid Company" rows
   ↓
[Frontend] Show preview + company assignment panel
   ↓
[User] Assign companies to flagged rows
   ↓
[Frontend] Send to API
   ↓
[Backend] Validate CF uniqueness vs DB
   ↓
[Backend] Detect existing Persons
   ↓
[Backend] Return conflicts
   ↓
[Frontend] Show EmployeeConflictModal
   ↓
[User] Resolve conflicts:
   - Skip
   - Overwrite
   - Add role (se Person esiste senza ruolo EMPLOYEE)
   ↓
[Frontend] Send resolved data
   ↓
[Backend] Execute import:
   - Create/Update Person
   - Create PersonRole (EMPLOYEE)
   - Link to Company
   ↓
[Backend] Return results
   ↓
[Frontend] Show success/error summary
```

### 3. Trainer Import Flow
```
[User] Seleziona CSV
   ↓
[Frontend] Parse CSV + Format data
   ↓
[Frontend] Normalize CF + Email validation
   ↓
[Frontend] Detect duplicates in batch
   ↓
[Frontend] Send to API
   ↓
[Backend] Validate CF + Email uniqueness
   ↓
[Backend] Detect existing Persons
   ↓
[Backend] Return conflicts
   ↓
[Frontend] Show TrainerConflictModal
   ↓
[User] Resolve conflicts:
   - Skip
   - Overwrite
   - Add role + Create account
   ↓
[Frontend] Send resolved data
   ↓
[Backend] Execute import:
   - Create/Update Person
   - Create PersonRole (TRAINER)
   - Create User account
   - Generate username/password
   - Send welcome email
   ↓
[Backend] Return results + credentials
   ↓
[Frontend] Show success summary + credentials list
   ↓
[User] Download credentials CSV
```

---

## 📊 Database Schema Coinvolti

### Person
```prisma
model Person {
  id                    String   @id @default(uuid())
  firstName             String
  lastName              String
  taxCode               String?  @unique // ⚠️ CRITICAL per Employee/Trainer
  email                 String?
  phone                 String?
  birthDate             DateTime?
  birthPlace            String?
  residenceAddress      String?
  residenceCity         String?
  residenceProvince     String?
  residencePostalCode   String?
  notes                 String?
  
  tenantId              String
  companyId             String?  // Per Employee
  
  personRoles           PersonRole[]
  user                  User?
  
  deletedAt             DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

### PersonRole
```prisma
model PersonRole {
  id         String   @id @default(uuid())
  personId   String
  roleType   RoleType // EMPLOYEE | TRAINER | ADMIN | ...
  
  person     Person   @relation(...)
  
  @@unique([personId, roleType])
}
```

### User
```prisma
model User {
  id                String   @id @default(uuid())
  username          String   @unique
  email             String   @unique
  password          String   // hashed
  globalRole        String   // TRAINER | ADMIN | ...
  
  personId          String?  @unique
  person            Person?  @relation(...)
  
  mustChangePassword Boolean @default(false)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### Company
```prisma
model Company {
  id               String   @id @default(uuid())
  ragioneSociale   String
  piva             String?  @unique // ⚠️ CRITICAL
  codiceFiscale    String?
  
  // ... altri campi sede principale deprecati
  
  sites            CompanySite[]
  persons          Person[]
  
  tenantId         String
  deletedAt        DateTime?
}
```

### CompanySite
```prisma
model CompanySite {
  id                      String   @id @default(uuid())
  companyId               String
  siteName                String
  
  indirizzo               String?
  citta                   String?
  provincia               String?
  cap                     String?
  personaRiferimento      String?
  telefono                String?
  mail                    String?
  
  tenantId                String
  company                 Company  @relation(...)
  
  @@unique([companyId, siteName]) // Evita sedi duplicate
}
```

---

## 🎨 UX/UI Improvements

### Modal Conflitti Migliorato

#### Layout Proposto
```
┌────────────────────────────────────────────────────┐
│  ⚠️  Conflitti rilevati durante importazione      │
│  N conflitti trovati su M righe totali             │
├────────────────────────────────────────────────────┤
│  Filtri: [ Tutti | Solo PIVA | Solo CF | ... ]    │
├────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │ Riga 3: ACME Corporation                     │ │
│  │                                               │ │
│  │ Problema: P.IVA 12345678901 già esistente   │ │
│  │                                               │ │
│  │ ┌─────────────────┬─────────────────────┐   │ │
│  │ │ Da Importare    │ In Database         │   │ │
│  │ ├─────────────────┼─────────────────────┤   │ │
│  │ │ ACME Corp.      │ ACME Corporation    │   │ │
│  │ │ Via Roma 1      │ Via Milano 10       │ ◄─ DIFFERENZE
│  │ │ Milano          │ Milano              │   │ │
│  │ │ 20100           │ 20100               │   │ │
│  │ └─────────────────┴─────────────────────┘   │ │
│  │                                               │ │
│  │ Sedi esistenti: 1                            │ │
│  │   • Sede Principale - Via Milano 10          │ │
│  │                                               │ │
│  │ Risoluzione:                                  │ │
│  │ ○ Salta (mantieni esistente)                 │ │
│  │ ● Sovrascrivi dati azienda                   │ │
│  │ ○ Aggiungi come nuova sede                   │ │
│  │   Nome sede: [Via Roma 1_____________]       │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
│  [Risoluzione rapida ▼]                            │
│    • Salta tutti i conflitti                       │
│    • Sovrascrivi tutti                             │
│    • Aggiungi tutti come nuove sedi                │
│                                                     │
├────────────────────────────────────────────────────┤
│              [Annulla]    [Conferma (N/M)]        │
└────────────────────────────────────────────────────┘
```

### Bulk Company Assignment Panel

```
┌────────────────────────────────────────────────────┐
│  🏢 Assegnazione Aziende                           │
├────────────────────────────────────────────────────┤
│  ⚠️ 15 dipendenti senza azienda valida            │
│                                                     │
│  Filtra per: [ Senza azienda ▼ ]                  │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │ ☑ Mario Rossi - MRSRSS80A01... - ⚠️ ACME    │ │
│  │ ☑ Laura Bianchi - BLNLRA85B... - ⚠️ ACME    │ │
│  │ □ Giuseppe Verdi - VRDGPP90... - ✓ Beta SpA  │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
│  Selezionati: 2                                    │
│  Assegna a: [ Seleziona azienda ▼ ]              │
│              [ Crea nuova azienda... ]             │
│                                                     │
│  [Applica]                                         │
└────────────────────────────────────────────────────┘
```

---

## 🧪 Strategia di Test

### Unit Tests
- [ ] Normalizzazione PIVA (rimuovi IT, spazi, mantieni numeri)
- [ ] Normalizzazione CF (uppercase, trim)
- [ ] Rilevamento duplicati in batch
- [ ] Generazione username unico
- [ ] Generazione password sicura
- [ ] Validazione campi obbligatori

### Integration Tests
- [ ] Company import: creazione azienda nuova
- [ ] Company import: overwrite azienda esistente
- [ ] Company import: aggiunta sede a azienda esistente
- [ ] Employee import: creazione Person + PersonRole
- [ ] Employee import: overwrite Person esistente
- [ ] Employee import: aggiunta ruolo EMPLOYEE a Person esistente
- [ ] Trainer import: creazione Person + PersonRole + User
- [ ] Trainer import: invio email credenziali

### E2E Tests
- [ ] Flusso completo import aziende con conflitti
- [ ] Flusso completo import dipendenti con assegnazione azienda
- [ ] Flusso completo import formatori con generazione credenziali

---

## 📈 Metriche di Successo

### Performance
- Import di 100 aziende < 5 secondi
- Import di 500 dipendenti < 10 secondi
- Import di 50 formatori (con account) < 15 secondi

### Qualità Dati
- 0% duplicati PIVA in database
- 0% duplicati CF in database
- 100% dipendenti con azienda valida
- 100% formatori con account creato

### UX
- Risoluzione conflitti < 2 minuti per 10 conflitti
- Assegnazione azienda batch < 30 secondi per 20 dipendenti
- Download credenziali trainers < 5 secondi

---

## 🗂️ File Structure

```
docs/10_project_managemnt/37_csv_import_optimization/
├── 00_PROJECT_OVERVIEW.md (questo file)
├── 01_PLANNING_DETTAGLIATO.md
├── 02_ARCHITETTURA_TECNICA.md
├── 03_IMPLEMENTATION_STATUS.md
├── 04_TESTING_STRATEGY.md
├── 05_DEPLOYMENT_GUIDE.md
├── analysis/
│   ├── company_import_current_flow.md
│   ├── person_import_current_flow.md
│   └── code_inventory.md
└── templates/
    ├── company_import_template.csv
    ├── employee_import_template.csv
    └── trainer_import_template.csv
```

---

## 📅 Timeline Stimato

### Fase 1: Analysis & Planning (1 giorno)
- Analisi codice esistente completo
- Identificazione punti critici
- Design architettura migliorata

### Fase 2: Company Import Optimization (2 giorni)
- Miglioramento modal conflitti
- Implementazione "Add Site" option
- Test e validazione

### Fase 3: Employee Import Implementation (3 giorni)
- Creazione EmployeeImportService
- Implementazione CF validation
- Bulk company assignment
- Modal conflitti
- Test

### Fase 4: Trainer Import Implementation (3 giorni)
- Creazione TrainerImportService
- Account creation logic
- Username/password generation
- Email sending
- Credentials download
- Test

### Fase 5: Testing & Refinement (2 giorni)
- Unit tests
- Integration tests
- E2E tests
- Bug fixing

### Fase 6: Documentation & Deployment (1 giorno)
- User documentation
- API documentation
- Deployment guide

**TOTALE: 12 giorni lavorativi**

---

## 🔗 Collegamenti

- [Planning Dettagliato](01_PLANNING_DETTAGLIATO.md)
- [Architettura Tecnica](02_ARCHITETTURA_TECNICA.md)
- [Status Implementazione](03_IMPLEMENTATION_STATUS.md)
- [Strategia Testing](04_TESTING_STRATEGY.md)

---

**Ultimo Aggiornamento:** 22 Novembre 2025  
**Responsabile Progetto:** GitHub Copilot  
**Review:** Pending
