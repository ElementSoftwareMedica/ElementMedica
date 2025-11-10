# DocumentManager Module

Modulo per la gestione completa dei documenti associati ai calendari di formazione.

## 📁 Struttura

```
DocumentManager/
├── types.ts                    # Type definitions (150L)
├── documentHelpers.ts          # Helper utilities (140L)
├── documentValidators.ts       # Validation functions (150L)
├── hooks/                      # Custom hooks (TBD)
├── components/                 # UI components (TBD)
└── DocumentManager.tsx         # Main component (TBD)
```

## 🎯 Responsabilità

Questo modulo gestisce 4 tipi di documenti:
1. **Lettere di Incarico** - Lettere per formatori
2. **Registri Presenze** - Registri per sessioni
3. **Attestati** - Certificati di partecipazione
4. **Preventivi** - Preventivi per aziende

## 📦 Types (types.ts)

### Principali Interfacce

**DocumentManagerProps**: Props del componente principale
- Gestisce status, selezioni, attendance, dates
- Props opzionali: scheduleId, trainers, persons, companies

**DocumentState**: Stato dei documenti
- lettereList, registriList, attestatiList, preventiviList

**LoadingState**: Stati di caricamento
- lettere, registri, attestati

**UIState**: Stato UI
- refreshKey, showRegenerateModal, showPreventiviModal, editingPreventivo

### Enum

**DocumentType**: Tipi di documento
- LETTERA_INCARICO
- REGISTRO_PRESENZE
- ATTESTATO
- PREVENTIVO

## 🔧 Utils

### documentHelpers.ts

Funzioni di utilità per formattazione e gestione:
- `hasAttendanceData()` - Verifica presenza dati attendance
- `getStatusInfo()` - Ottiene info status con colore/descrizione
- `getPreventivoStatusColor()` - Colori badge preventivo
- `formatDocumentNumber()` - Formatta numero documento
- `getDocumentTypeColor()` - Colori per tipo documento
- `getDocumentTypeLabel()` - Label italiano per tipo
- `formatCurrency()` - Formatta valuta EUR
- `formatDate()` - Formatta data italiano
- `getPersonFullName()` - Nome completo persona
- `getCompanyName()` - Nome azienda
- `getTrainingTitle()` - Titolo corso
- `getTrainingPrice()` - Prezzo corso

### documentValidators.ts

Funzioni di validazione per operazioni:
- `canGenerateLettere()` - Valida generazione lettere
- `canGenerateRegistri()` - Valida generazione registri
- `canGenerateAttestati()` - Valida generazione attestati
- `canGeneratePreventivi()` - Valida generazione preventivi
- `getValidationWarning()` - Messaggio warning specifico
- `hasRequiredData()` - Verifica dati minimi richiesti
- `isValidTrainer()` - Valida dati formatore
- `isValidPerson()` - Valida dati persona
- `isValidCompany()` - Valida dati azienda
- `isValidTraining()` - Valida dati corso

## ✅ GDPR & Security Compliance

Questo modulo rispetta le seguenti regole di sicurezza:

### 🔒 Tenant Isolation
- Tutti i documenti sono filtrati per `scheduleId`
- Nessun accesso cross-tenant possibile
- Validazione obbligatoria `scheduleId` prima di ogni operazione

### 🗑️ Soft Delete
- Tutte le eliminazioni usano soft delete (`deletedAt`)
- Nessuna eliminazione permanente senza autorizzazione
- Preservazione dati per audit trail

### 🔐 Cache Management
- `clearCache()` chiamato prima di ogni fetch (evita dati stale)
- `invalidateCache()` dopo ogni modifica
- Nessun caching di dati sensibili

### 📋 Data Minimization
- Fetch solo documenti necessari per `scheduleId` specifico
- Nessun caricamento batch di tutti i documenti tenant
- Lazy loading per preventivi pending

## 🧪 Testing

### Test Coverage Required
- [ ] Unit tests per validators (>90% coverage)
- [ ] Unit tests per helpers (>90% coverage)
- [ ] Integration tests per hooks (quando implementati)
- [ ] Component tests per UI (quando implementati)

### Manual Test Cases
1. Generate Lettere di Incarico
2. Generate Registri Presenze
3. Generate Attestati (con/senza regenerate)
4. Generate Preventivi
5. Download documents
6. Delete documents (verifica soft delete)
7. Edit preventivo
8. Status change workflow

## 📊 Metrics

**Current Progress** (Phase 3.6 Day 1):
- ✅ types.ts (150L)
- ✅ documentHelpers.ts (140L)
- ✅ documentValidators.ts (150L)
- ⏳ hooks/ (4 hooks, ~400L)
- ⏳ components/ (5 components, ~370L)
- ⏳ DocumentManager.tsx refactored (~250L target)

**Target Reduction**: 761L → 250L main component (-67%)

## 🚀 Next Steps

**Day 2**: Extract hooks layer
- useDocumentData.ts (120L)
- useDocumentGeneration.ts (140L)
- useDocumentActions.ts (80L)
- useDocumentUI.ts (60L)

**Day 3**: Extract components layer
- DocumentStatusSelector.tsx (60L)
- DocumentSummaryCards.tsx (50L)
- DocumentSection.tsx (120L)
- DocumentList.tsx (80L)
- DocumentItem.tsx (60L)

**Day 4**: Main component refactor
- Compose hooks
- Render components
- Integration testing

**Day 5**: Validation & deployment
- Manual testing
- Build verification
- Production deployment

## 📝 Notes

- Pattern seguita: Hooks Composition (proven in 5 previous God components)
- Build success rate: 100% (5/5 previous refactorings)
- Breaking changes: 0 (all previous refactorings)
- TypeScript errors: 0 (strict mode compliant)
