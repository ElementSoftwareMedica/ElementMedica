# 📋 Progetto 37: CSV Import Optimization - RIEPILOGO ESECUTIVO

**Data Creazione:** 22 Novembre 2025  
**Stato:** ✅ PLANNING COMPLETO - PRONTO PER IMPLEMENTAZIONE  
**Priorità:** 🔴 ALTA  

---

## 🎯 Obiettivi del Progetto

### Problema da Risolvere
Ottimizzare e consolidare il sistema di importazione massiva CSV per eliminare problemi critici:

1. **Company Import** ✅ Parzialmente funzionante
   - Gestione sedi multiple da migliorare
   - Modal conflitti da ottimizzare

2. **Employee Import** ❌ Non robusto
   - Manca verifica univocità Codice Fiscale
   - Gestione conflitti non implementata
   - Assegnazione azienda non affidabile

3. **Trainer Import** ❌ Incompleto
   - Manca verifica univocità Codice Fiscale + Email
   - Creazione account non automatica
   - Gestione credenziali assente

---

## 📊 Requisiti Chiave

### Company Import
- ✅ Verifica univocità P.IVA (tra batch e DB)
- ✅ Modal conflitti con 3 opzioni: Skip | Overwrite | **Add as New Site** (nuovo!)
- ✅ Gestione sedi multiple (se stessa PIVA ma indirizzo diverso)
- ✅ Preview sedi esistenti per azienda

### Employee Import
- ✅ Verifica univocità Codice Fiscale (normalizzato uppercase+trim)
- ✅ Modal conflitti con opzioni: Skip | Overwrite | Add Role
- ✅ **Bulk Company Assignment** - assegna azienda a N dipendenti contemporaneamente
- ✅ Verifica azienda per nome o P.IVA
- ✅ Creazione Person + PersonRole (EMPLOYEE)
- ❌ NO creazione account (dipendenti non hanno login)

### Trainer Import
- ✅ Verifica univocità CF + Email
- ✅ Modal conflitti con opzioni: Skip | Overwrite | Add Role + Create Account
- ✅ Creazione Person + PersonRole (TRAINER) + **User Account**
- ✅ **Generazione automatica username** (da email o firstName.lastName)
- ✅ **Generazione password sicura** (16 caratteri random)
- ✅ **Invio email credenziali** al formatore
- ✅ **Download CSV credenziali** per admin

---

## 🏗️ Architettura Soluzione

### Backend - Service Layer Pattern
```
Routes (< 100 linee)
  └─> Import Services (business logic)
      └─> Utilities (validazione, normalizzazione)
          └─> Prisma (database)
```

**Nuovi Servizi:**
- `CompanyImportService.js` - Estrae logica da route (1100+ linee → 100)
- `EmployeeImportService.js` - Import dipendenti con CF validation
- `TrainerImportService.js` - Import formatori
- `TrainerAccountService.js` - Creazione account (username, password, email)

**Nuove Route:**
- `POST /api/employees/import` (dedicato)
- `POST /api/trainers/import` (dedicato)

### Frontend - Component Composition
```
Import Modals
  └─> Conflict Resolution Modals
      └─> Common Components (riutilizzabili)
```

**Nuovi Componenti:**
- `EmployeeImportModal.tsx` - Import dipendenti
- `TrainerImportModal.tsx` - Import formatori
- `BulkCompanyAssignmentPanel.tsx` - Assegnazione aziende in batch
- `TrainerCredentialsDisplay.tsx` - Visualizza credenziali generate

**Componenti Migliorati:**
- `CompanyImportConflictModal.tsx` - Aggiunge opzione "Add as Site"
- `ImportConflictResolutionPanel.tsx` - Data diff con highlighting

---

## 📅 Timeline e Fasi

**Durata Totale:** 12 giorni lavorativi (96 ore)

### FASE 1: Analysis & Cleanup (1 giorno)
- ✅ Analisi codice esistente completa
- ✅ Identificazione duplicati
- ⏳ Pulizia file obsoleti
- ⏳ Setup struttura progetto

### FASE 2: Company Import Optimization (2 giorni)
- Backend refactoring (estrarre service)
- Modal conflitti con "Add Site" option
- Data diff display migliorato
- Batch resolution actions
- Testing

### FASE 3: Employee Import Implementation (3 giorni)
- EmployeeImportService backend
- Employee import route
- Frontend modal con bulk company assignment
- Conflict resolution modal
- Testing

### FASE 4: Trainer Import Implementation (3 giorni)
- TrainerAccountService (username, password)
- TrainerImportService backend
- Frontend modal
- Credentials display
- Email template
- Testing

### FASE 5: Testing & Refinement (2 giorni)
- Unit tests (80%+ coverage)
- Integration tests
- E2E tests (Playwright)
- Performance testing
- Bug fixing

### FASE 6: Documentation & Deployment (1 giorno)
- User documentation
- API documentation
- CSV templates
- Deployment guide
- Release notes

---

## 📂 Struttura Progetto

```
docs/10_project_managemnt/37_csv_import_optimization/
├── 00_PROJECT_OVERVIEW.md           ✅ (Requisiti completi)
├── 01_PLANNING_DETTAGLIATO.md       ✅ (Task breakdown, 6 fasi)
├── 02_ARCHITETTURA_TECNICA.md       ✅ (Design, inventario file)
├── 03_IMPLEMENTATION_STATUS.md      ✅ (Tracking progresso)
└── README.md                         ✅ (Questo file)

src/
├── components/import/               (DA CREARE)
│   ├── common/
│   │   ├── BulkCompanyAssignmentPanel.tsx
│   │   └── ImportConflictResolutionPanel.tsx
│   ├── company/
│   │   └── CompanyImportConflictModal.tsx (MIGLIORARE)
│   ├── employee/
│   │   ├── EmployeeImportModal.tsx
│   │   └── EmployeeImportConflictModal.tsx
│   └── trainer/
│       ├── TrainerImportModal.tsx
│       ├── TrainerImportConflictModal.tsx
│       └── TrainerCredentialsDisplay.tsx
└── services/import/                 (DA CREARE)
    ├── employeeImport.ts
    └── trainerImport.ts

backend/
├── routes/
│   ├── employee-import-routes.js    (DA CREARE)
│   └── trainer-import-routes.js     (DA CREARE)
└── services/
    ├── company/
    │   └── CompanyImportService.js  (DA CREARE)
    ├── employee/
    │   └── EmployeeImportService.js (DA CREARE)
    └── trainer/
        ├── TrainerImportService.js  (DA CREARE)
        └── TrainerAccountService.js (DA CREARE)
```

---

## 🎯 Features Chiave da Implementare

### 1. Bulk Company Assignment (Employee Import)
**Problema:** Dipendenti senza azienda valida bloccano import  
**Soluzione:**
```
┌────────────────────────────────────────┐
│  ⚠️ 15 dipendenti senza azienda       │
│  ┌──────────────────────────────────┐ │
│  │ ☑ Mario Rossi - MRSRSS80...     │ │
│  │ ☑ Laura Bianchi - BLNLRA85...   │ │
│  └──────────────────────────────────┘ │
│  Selezionati: 2                        │
│  Assegna a: [Dropdown aziende ▼]      │
│  [Applica]                             │
└────────────────────────────────────────┘
```

### 2. Add as Site (Company Import)
**Problema:** Stessa PIVA ma indirizzo diverso → conflitto  
**Soluzione:** Terza opzione nel modal conflitti
```
○ Salta (mantieni esistente)
○ Sovrascrivi dati azienda
● Aggiungi come nuova sede
  Nome sede: [Via Roma 1_______]
```

### 3. Credentials Generation & Display (Trainer Import)
**Problema:** Formatori devono avere account per accedere  
**Soluzione:**
- Username auto-generato formato **nome.cognome** (con numero progressivo per omonimie)
- Password standard fissa: **"Password123!"** (cambio obbligatorio al primo accesso)
- Email automatica con credenziali
- Download CSV per admin

```
┌─────────────────────────────────────────┐
│  ✅ 15 account creati                   │
│  Email di benvenuto inviate             │
│                                         │
│  ⚠️ Salva credenziali! Non più visibili│
│                                         │
│  Email           Username       Password      │
│  ───────────────────────────────────────────  │
│  m.rossi@..   mario.rossi    Password123!   │
│  l.bianchi@.. laura.bianchi  Password123!   │
│                                         │
│  [📥 Scarica CSV] [Chiudi]             │
└─────────────────────────────────────────┘
```

---

## 🧪 Testing Strategy

### Unit Tests (Target: 80%+ coverage)
- Normalizzazione PIVA/CF
- Validazione email
- Rilevamento duplicati
- Generazione username/password

### Integration Tests
- Import completo Company (nuova, overwrite, add site)
- Import completo Employee (con company assignment)
- Import completo Trainer (con account creation)

### E2E Tests (Playwright)
- Flusso utente: carica CSV → risolvi conflitti → conferma
- Bulk company assignment workflow
- Download credentials CSV

### Performance Tests
- Import 100 aziende < 5s ⚡
- Import 500 dipendenti < 10s ⚡
- Import 50 trainers < 15s ⚡

---

## 📊 Metriche di Successo

### Code Quality
- ✅ 80%+ test coverage
- ✅ 0 TypeScript errors
- ✅ 0 ESLint errors
- ✅ < 5 code smells

### Data Quality
- ✅ 0% duplicati PIVA in production
- ✅ 0% duplicati CF in production
- ✅ 100% dipendenti con azienda valida
- ✅ 100% formatori con account funzionante

### UX
- ✅ Risoluzione 10 conflitti < 2 minuti
- ✅ Bulk assignment 20 dipendenti < 30 secondi
- ✅ Download credenziali < 5 secondi

---

## 🚀 Next Steps

### Immediate Actions (Next 3 giorni)
1. **Task 1.3:** Pulizia file obsoleti (1h)
2. **Task 1.4:** Setup struttura progetto (2h)
3. **Task 2.1:** Backend CompanyImportService (4h)
4. **Task 2.2:** Enhanced conflict modal (4h)

### Week 1 Goals
- ✅ FASE 1 completa (Analysis & Cleanup)
- ✅ FASE 2 completa (Company Import)
- 🎯 Milestone 3 raggiunto (Company Import Complete)

### Week 2-3 Goals
- ✅ FASE 3 completa (Employee Import)
- ✅ FASE 4 completa (Trainer Import)
- 🎯 Milestone 5 raggiunto (Trainer Import Complete)

### Week 4 Goals
- ✅ FASE 5 completa (Testing)
- ✅ FASE 6 completa (Documentation)
- 🎯 Milestone 7 raggiunto (Production Ready)

---

## 📚 Documentazione Completa

### Planning Documents
1. **00_PROJECT_OVERVIEW.md** - Requisiti completi, obiettivi, architettura
2. **01_PLANNING_DETTAGLIATO.md** - Task breakdown, dipendenze, timeline
3. **02_ARCHITETTURA_TECNICA.md** - Design tecnico, inventario file, pattern
4. **03_IMPLEMENTATION_STATUS.md** - Tracking progresso real-time

### Technical Specs
- Database schema (nessuna modifica richiesta)
- API endpoints (3 nuovi, 1 refactored)
- Type definitions (TypeScript interfaces)
- Error handling patterns

### User Guides (da creare in FASE 6)
- CSV import user guide
- Template CSV files
- FAQ & troubleshooting

---

## ⚠️ Rischi e Mitigazioni

### Rischio 1: Refactoring Route Company (1100+ linee)
**Mitigazione:** Estrazione graduale, test ad ogni step, rollback facile

### Rischio 2: Performance con grandi batch
**Mitigazione:** Batch processing, pagination, performance tests

### Rischio 3: Email sending failures
**Mitigazione:** Queue system, retry logic, fallback CSV download

### Rischio 4: Breaking changes per utenti esistenti
**Mitigazione:** Backward compatibility, gradual rollout, feature flags

---

## ✅ Checklist Pre-Implementazione

- [x] Requisiti chiari e documentati
- [x] Architettura progettata
- [x] Task breakdown completo
- [x] Timeline definita
- [x] Metriche di successo stabilite
- [x] Struttura progetto progettata
- [x] Pattern e best practices definiti
- [ ] Branch feature creato
- [ ] Team aligned e pronto

---

## 🎯 Approval Checklist

Prima di procedere con implementazione:

- [ ] **Product Owner** approva requisiti
- [ ] **Tech Lead** approva architettura
- [ ] **Team** conferma timeline realistica
- [ ] **QA** conferma strategia testing
- [ ] **DevOps** conferma deployment plan

---

**Progetto Creato da:** GitHub Copilot  
**Data:** 22 Novembre 2025  
**Status:** 🟢 READY TO START  
**Approval:** ⏳ PENDING REVIEW

---

## 📞 Contatti & Supporto

**Project Owner:** Matteo Michielon  
**Technical Lead:** GitHub Copilot  
**Repository:** ElementMedica  
**Branch:** feature/csv-import-optimization  

Per domande o chiarimenti, consultare i documenti di planning dettagliati nella cartella del progetto.
