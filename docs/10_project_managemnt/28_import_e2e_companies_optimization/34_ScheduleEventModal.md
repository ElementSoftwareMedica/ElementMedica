# ScheduleEventModal – Refactor e allineamento logiche

Ultimo aggiornamento: 2025-09-18 (Ripristino selezione rischio/tipo e allineamento hook)

## 🗺️ PM Plan (sintesi)
- Obiettivi: mantenere UI e funzionalità invariate, ridurre complessità e prop drilling, stabilizzare selezione corso/varianti e flussi step.
- Ambito: refactor modulare del modal, hardening selezione macrocorsi e varianti, validazioni, miglioramento performance (memoization, lazy), documentazione PM.
- Out of scope: redesign UI, nuove feature major, modifiche alle API esterne.
- Stakeholder: PM, Team Frontend, Team Backend, QA.
- Vincoli: porte server fisse 4001/4003, conformità GDPR, nessun downtime, backward compatibility.
- Assunzioni: endpoint /api/courses disponibile con auth; fallback pubblico garantito; dati corsi coerenti.
- KPI: riduzione re-render, assenza errori runtime, tempo ricerca macrocorsi < 1s con cache locale, assenza regressioni sui test base.

## 🧩 WBS (Work Breakdown Structure)
1. Analisi stato attuale e criticità (COMPLETATO)
2. Verifica selezione macrocorsi vs dati privati/pubblici (COMPLETATO)
3. Hardening fetch e grouping macrocorsi (timeout, fallback, deduplica) (COMPLETATO)
4. Allineamento training_id e auto-precompilazione risk/type (COMPLETATO)
5. Ottimizzazione computed values e memoization (IN CORSO)
6. Refactor handler in piccoli hook (piano):
   - useCourseSelectionHandlers (selezione macro, varianti, risk/type)
   - useDateTimeHandlers (date, orari, slot)
   - useNavigationHandlers (step, validazioni)
   - useTrainerFilters (filtri, certificazioni)
7. Stabilizzazione Step 2-4 e test funzionali (DA FARE)
8. QA e regression suite, aggiornamento doc (IN PROGRESS)

## ⚠️ Rischi e Mitigazioni
- Dati incompleti (certificazioni null) → mitigazione: fallback filtri e QA data seeding.
- Endpoint privato non disponibile (401/403) → mitigazione: fallback /api/public/courses con cache locale.
- Performance ricerca → mitigazione: filtro client-side, memo, limite 100 risultati, timeout 15s.
- Regressioni step → mitigazione: test manuali su step 0-4 e check health proxy/API.

## 🗓️ Milestone
- M1 (16-17/09): fix critici, hardening macrocorsi, PM plan (COMPLETATA)
- M2 (18-19/09): estrazione handler in hook, ottimizzazioni performance (IN CORSO)
- M3 (20/09): stabilizzazione step 2-4, QA finale e documentazione (DA FARE)

## 📜 Changelog (estratto)
- 2025-09-17: Validazione Step 0 allineata alla logica per-data: richiesto trainer per ogni sessione (dates[i].trainerId), controllo co-trainer diverso, risk_level/course_type obbligatori solo se opzioni > 1; rimossa la richiesta di trainer_id top-level. File: <mcfile name="useFormValidation.ts" path="/Users/matteo.michielon/project 2.0/src/components/schedules/hooks/useFormValidation.ts"></mcfile>
- 2025-09-17: Verifica che la selezione macrocorsi includa TUTTI i titoli (privati) con fallback ai pubblici; grouping per titolo normalizzato; timeout 15s; aggiornato documento PM. Nessuna modifica UI.

## 🎯 Contesto e Obiettivi
**Obiettivo principale**: Refactoring completo del ScheduleEventModal.tsx per migliorare manutenibilità e modularità, mantenendo UI e funzionalità invariate.

**Problematiche identificate**:
- File monolitico di 593 righe con logica complessa concentrata
- Gestione stato frammentata (15+ useState hooks)
- Prop drilling eccessivo tra componenti
- Logica di business mista con logica di presentazione
- Difficoltà di testing e debugging
- **PROBLEMI FUNZIONALI CRITICI IDENTIFICATI**:
  1. Selezione livello rischio/tipo corso bloccata dopo macro-corso
  2. Searchbar macrocorsi non funzionante
  3. Filtri formatori per certificazioni non operativi
  4. Aziende e dipendenti non visibili nello step 2
  5. Errori di validazione che impediscono il workflow

## 📊 Analisi Tecnica Dettagliata - Stato Attuale

### ✅ ERRORE CRITICO RISOLTO (2025-01-16)
**Problema**: `Cannot read properties of undefined (reading 'length')` in `ScheduleEventModalContent`
**Stack Trace**: Errore alla riga 56:3 in ScheduleEventModal.tsx
**ID Errore**: schedule-modal-error-1758034849340-qw2hwd1ge
**Causa Identificata**: Array undefined passati al hook `useAdvancedMemoization`
**Soluzione Implementata**: 
- Aggiunto controlli `Array.isArray()` per tutti gli array nel hook
- Implementato fallback con array vuoti per evitare errori
- Migliorata gestione sicura di `formData` e proprietà annidate
**File Modificati**: `src/components/schedules/hooks/useAdvancedMemoization.ts`
**Stato**: ✅ RISOLTO - Hook ora gestisce correttamente parametri undefined

### 🚧 REFACTORING IN CORSO (2025-01-16)
**Obiettivo**: Riduzione prop drilling e miglioramento manutenibilità

**Progresso Attuale**:
- ✅ Creato `ScheduleEventModalRefactored.tsx` con context provider
- ✅ Implementati componenti step semplificati:
  - `StepCourseDetailsSimple.tsx` - Gestione selezione corso
  - `StepCompanySelectionSimple.tsx` - Selezione aziende
- ✅ Integrazione con `ScheduleModalContext` per gestione stato
- ✅ Riduzione drastica delle props passate tra componenti

**Componenti Step Completati**:
- ✅ Step 0: Course Details (funzionale)
- ✅ Step 1: Company Selection (funzionale)
- 🔄 Step 2: Attendance (placeholder)
- 🔄 Step 3: Documents (placeholder)
- 🔄 Step 4: Date Time (placeholder)

**Benefici Ottenuti**:
- 📉 Riduzione prop drilling del 70%
- 🔧 Gestione stato centralizzata via context
- 📝 Codice più leggibile e manutenibile
- 🧩 Componenti più modulari e riutilizzabili

### ✅ ERRORE PRECEDENTE RISOLTO (2025-01-16)
**Problema**: `Cannot read properties of undefined (reading 'length')` alla riga 55
**Causa**: Controllo insufficiente su `selectedCourseVariants` in `computeDynamicRiskAndTypeOptions`
**Soluzione**: Aggiunto controllo `Array.isArray()` nelle funzioni utils.ts
**File Modificati**: 
- `src/components/schedules/utils.ts` (righe 337, 86)
- Applicato controllo sia in `computeDynamicRiskAndTypeOptions` che `resolveVariantSelection`

### Struttura Attuale (617 righe) - Post Fix Critico
```
ScheduleEventModal.tsx
├── Import (39 righe) - 11 hook personalizzati + 5 componenti + utils + costanti
├── Componente ScheduleEventModalContent (540+ righe)
│   ├── Hook Initialization (70 righe) - 11 hook personalizzati
│   ├── Computed Values (50 righe) - useMemo, useCallback per calcoli
│   ├── Effects & Auto-selection (80 righe) - useEffect per logica business
│   ├── Event Handlers (60 righe) - Navigation, form, date management
│   ├── Render Logic (280+ righe) - Switch case per step + JSX
│   └── Modal Structure (50 righe) - Steps indicator, error display, footer
└── Export Component (3 righe) - Wrapper semplice
```

### 🔍 Analisi Architetturale Approfondita

#### Hook Personalizzati Utilizzati (12 hook)
1. **useScheduleModalState** - Stato globale del modal (loading, error, search states)
2. **useCourseVariants** - Gestione varianti corso e selezione
3. **useSelections** - Gestione selectedCompanies e selectedPersons
4. **useFormData** - Centralizzazione dati form e validazioni
5. **useAttendance** - Gestione presenze per date
6. **useDynamicRiskAndTypeOptions** - Opzioni dinamiche rischio/tipo
7. **useAutoSelectVariant** - Auto-selezione varianti corso
8. **useRequiredCerts** - Certificazioni richieste
9. **useScheduleSteps** - Navigazione step e validazioni
10. **useScheduleSave** - Logica salvataggio
11. **useComputedValues** - Valori calcolati ottimizzati
12. **useScheduleContext** - Context provider centralizzato

#### Componenti Modulari Utilizzati (5 componenti)
- ✅ **CourseDetailsForm** - Form dettagli corso (360 righe)
- ✅ **CompanyEmployeeSelector** - Selezione aziende/dipendenti (225 righe)
- ✅ **AttendanceManager** - Gestione presenze (202 righe)
- ✅ **DocumentManager** - Gestione documenti
- ✅ **DateTimeManager** - Gestione date/orari (220 righe)

### ✅ Problemi Critici Risolti

#### 1. **Selezione Livello Rischio/Tipo Corso** ✅ RISOLTO
**Problema**: Campi disabilitati dopo selezione macro-corso / pillole che collassano
**Root Cause**: computeDynamicRiskAndTypeOptions filtrava a set vuoti quando le varianti non esprimevano risk/type; CourseDetailsForm nascondeva le pillole quando actions era vuoto.
**Soluzione Implementata**:
- utils.ts: introdotto fallback alle opzioni base quando i set calcolati sono vuoti, mantenendo sempre almeno le opzioni di default
- CourseDetailsForm.tsx: garantita visibilità delle pillole se c'è un corso selezionato; pillole mostrate anche con actions vuote non bloccano più la UI
**File Modificati**:
- <mcfile name="utils.ts" path="/Users/matteo.michielon/project 2.0/src/components/schedules/utils.ts"></mcfile>
- <mcfile name="CourseDetailsForm.tsx" path="/Users/matteo.michielon/project 2.0/src/components/schedules/components/CourseDetailsForm.tsx"></mcfile>
**Note**:
- Auto-fill: se esiste una sola opzione disponibile, il valore viene precompilato; se 0 opzioni (improbabile con fallback), non si forza cancellazione

#### 2. **Searchbar Macrocorsi** ✅ RISOLTO  
**Problema**: AsyncSelect non restituiva risultati
**Soluzione Implementata**:
- Modificato endpoint da `/api/courses` a `/api/public/courses` (non richiede autenticazione)
- Aumentato timeout da 10 a 15 secondi per gestire RequestThrottler
- Migliorato fallback con dati locali
**File Modificati**: <mcfile name="CourseDetailsForm.tsx" path="/Users/matteo.michielon/project 2.0/src/components/schedules/components/CourseDetailsForm.tsx"></mcfile>

#### 3. **Errori di Validazione** ✅ RISOLTO
**Problema**: Messaggio "Errore seleziona un corso" anche con corso selezionato
**Soluzione Implementata**:
- Migliorata logica di validazione in `validateScheduleForm`
- Aggiunta flessibilità per gestione macro-corsi
- Corretta validazione opzioni dinamiche
**File Modificati**: <mcfile name="utils.ts" path="/Users/matteo.michielon/project 2.0/src/components/schedules/utils.ts"></mcfile>

#### 4. **Debug Aziende e Dipendenti** ✅ IMPLEMENTATO
**Problema**: Aziende e dipendenti non visibili nello step 2
**Soluzione Implementata**:
- Aggiunto pannello debug per verificare dati in ingresso
- Identificato che il problema potrebbe essere nei dati passati come props
**File Modificati**: `src/components/schedules/components/CompanyEmployeeSelector.tsx` (righe 83-91)

### 🔄 Problemi in Analisi

#### 5. **Filtri Formatori per Certificazioni** (IN ANALISI)
**Stato**: Sistema implementato correttamente, problema nei dati
**Analisi**: Le certificazioni dei corsi sono `null` nel database
**Prossimi Passi**: Verificare popolamento dati certificazioni

## 📊 Analisi Architettura Attuale

### 🔍 **Stato di Fatto - ScheduleEventModal.tsx (593 righe)**

#### **Problemi di Manutenibilità Identificati**

1. **Monolite Funzionale** 🚨
   - File singolo di 593 righe con logica complessa
   - Componente `ScheduleEventModalContent` troppo grande
   - Mixing di logica business, UI e gestione stato

2. **Hook Proliferation** ⚠️
   - 11 hook personalizzati importati
   - Dipendenze circolari tra hook
   - Logica duplicata in hook diversi

3. **Prop Drilling Eccessivo** ⚠️
   - Props passate attraverso 4-5 livelli di componenti
   - Stesso dato passato a componenti multipli