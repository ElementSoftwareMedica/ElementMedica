# R23 — QuickActions End-to-End Fix + ProfiloDiSalute in Visite/Pazienti/Dipendenti

**Data**: 2025  
**Stato**: ✅ Completato  
**Dipende da**: R22 (Pre-compila Risposte, ProfiloDiSalutePersona D.Lgs 81/08)

---

## Obiettivi

1. **Fix bug critici** nella card "Azioni Rapide" di VisitaPage: allergie cursor jumping, laboratorio vuoto, esami microbiologici che naviga via, pulsanti CRUD mancanti.
2. **Fix UI** in CartellaSanitariaModal (button nesting) e AllegatoQuickLookModal (z-index).
3. **Fix backend 500** su `GET /api/v1/clinica/documenti/paziente/:id`.
4. **Miglioramento Pre-compila risposte**: tipo `radio` ora supportato, feedback toast all'utente.
5. **ProfiloDiSalute** ora accessibile da `employees/:id`, `pazienti/:id` e `visite/:id`.

---

## Modifiche Apportate

### 1. Backend 500 — documenti-clinici.routes.js
**File**: `backend/routes/clinica/documenti-clinici.routes.js`

**Problema**: Route `GET /paziente/:id` aveva `const { prisma } = await import('../../database/client.js')` dentro il handler — file inesistente → 500 a ogni richiesta.

**Fix**: Rimossa la riga di import dinamico. Il `prisma` top-level da `'../../config/prisma-optimization.js'` (già importato a riga 28) è sufficiente.

---

### 2. QuickActionsIntegrated.tsx — MenuItem estratto a module scope
**File**: `src/pages/clinica/clinica/components/QuickActionsIntegrated.tsx`

**Problema**: Il componente `MenuItem` era definito *dentro* il corpo di `QuickActionsIntegrated`. Ogni render del parent ricreava la fn → React unmount/remount di tutti i figli → le textarea di allergie perdevano focus al primo carattere digitato (cursor jumping).

**Fix**: Estratto `const MenuItem = React.memo(...)` a livello di modulo (prima dell'export). Aggiunte props esplicite `isExpanded: boolean` e `onToggle: () => void` per eliminare la dipendenza da closure. Tutti e 8 i `<MenuItem>` nell'uso aggiornati con le due nuove prop.

---

### 3. QuickActionsIntegrated.tsx — Laboratorio select bug
**File**: `src/pages/clinica/clinica/components/QuickActionsIntegrated.tsx`

**Problema**: La query allegati-laboratorio usava `select: (data) => data?.allegati ?? []` ma `extractData()` nell'interceptor Axios restituisce già l'array diretto, non `{ success, allegati }`.

**Fix**: `select: (data) => (data as unknown as AllegatoRiepilogo[]) ?? []`

---

### 4. QuickActionsIntegrated.tsx — Carica esami laboratorio + esami microbiologici
**File**: `src/pages/clinica/clinica/components/QuickActionsIntegrated.tsx`

**Aggiunte**:
- Stato `showLabUploadModal` + pulsante "Carica esami" sopra la lista allegati laboratorio
- La sezione "Esami Microbiologici" sostituisce il comportamento di navigazione (`onViewEsamiMicrobio` → `navigate()`) con un pulsante per aprire `showLabUploadModal` → nessuna uscita dalla visita
- Nuova istanza `<AllegatiUploadModal>` per lab con `defaultTipologiaClinica="ESAMI_SANGUE"`, invalida sia `allegati-laboratorio` che `allegati-visita` on upload

---

### 5. AllegatiUploadModal.tsx — defaultTipologiaClinica
**File**: `src/pages/clinica/clinica/components/AllegatiUploadModal.tsx`

**Aggiunta**: Nuova prop opzionale `defaultTipologiaClinica?: TipologiaClinicaAllegato`. Se fornita, viene applicata come tipologia predefinita ai file aggiunti (evita che l'utente debba selezionarla manualmente).

---

### 6. CartellaSanitariaModal.tsx — Button nesting fix
**File**: `src/pages/clinica/clinica/components/CartellaSanitariaModal.tsx`

**Problema**: `<VisitaRow>` usava `<button>` come wrapper esterno, ma conteneva un `<button>` per l'icona ExternalLink → console warning `<button> cannot appear as descendant of <button>` + comportamento non definito.

**Fix**: Wrapper cambiato in `<div role="button" tabIndex={0} onClick=... onKeyDown=...>`.

---

### 7. AllegatoQuickLookModal.tsx — Z-index
**File**: `src/components/clinica/AllegatoQuickLookModal.tsx`

**Problema**: `z-50` non sufficiente quando il modal viene aperto da CartellaSanitariaModal (z-50) → il quick-look spariva dietro la cartella.

**Fix**: `z-[70]` nel div radice del modal.

---

### 8. QuestionarioRenderer.tsx — Radio type + toast feedback
**File**: `src/components/clinica/questionari/QuestionarioRenderer.tsx`

**Aggiunte**:
- Tipo `radio` aggiunto a `applyNormaDefaults` (stessa logica di `select`: seleziona prima opzione)
- Toast `info` se nessun campo da compilare
- Toast `success` dopo Pre-compila con conteggio campi pre-compilati

---

### 9. ProfiloSaluteCard in employees/:id
**File**: `src/pages/employees/EmployeeDetails.tsx`

**Aggiunta**: Sezione `<ProfiloSaluteCard personId={id} />` prima della "Sezione aggiuntiva per compatibilità".

---

### 10. ProfiloSaluteCard in pazienti/:id (CartellaPaziente)
**File**: `src/pages/clinica/clinica/CartellaPaziente.tsx`

**Aggiunta**: Nella tab overview, dopo `ConsentFSESummary`, una card a piena larghezza con `<ProfiloSaluteCard personId={id} />`.

---

### 11. ProfiloSaluteCard in visite/:id (VisitaPage)
**File**: `src/pages/clinica/clinica/VisitaPage.tsx`

**Aggiunta**: `<ProfiloSaluteCard personId={paziente.id} compact isReadonly={isReadonly} />` nel sidebar sinistro in tutti e tre i layout supportati:
- **Tabs layout**: dopo `EsamiStrumentaliCard`, prima del `VisitSidebar` sticky
- **Sections layout**: dopo `EsamiStrumentaliCard`, prima del `VisitSidebar` sticky
- **Continuous layout**: dopo `FirmaVisitaCard`, prima di `PrestazioniCard`

---

## Bug Risolti

| Bug | File | Fix |
|-----|------|-----|
| GET /documenti/paziente/:id → 500 | `documenti-clinici.routes.js` | Rimosso import dinamico inesistente |
| Allergie: cursor jumping a ogni keystroke | `QuickActionsIntegrated.tsx` | MenuItem estratto a module scope |
| Laboratorio allegati sempre vuoti | `QuickActionsIntegrated.tsx` | Corretto data selector (extractData già unwrappa) |
| `<button>` dentro `<button>` in CartellaSanitaria | `CartellaSanitariaModal.tsx` | Wrapper → `<div role="button">` |
| AllegatoQuickLookModal sparisce dietro CartellaSanitaria | `AllegatoQuickLookModal.tsx` | z-50 → z-[70] |
| Esami microbiologici: click naviga fuori dalla visita | `QuickActionsIntegrated.tsx` | Removed navigate, apre upload modal |
| Pre-compila non compilava campi radio | `QuestionarioRenderer.tsx` | Aggiunto case `radio` in applyNormaDefaults |
| Pre-compila senza feedback visivo | `QuestionarioRenderer.tsx` | Toast success/info |

## Feature Aggiunte

| Feature | File |
|---------|------|
| Pulsante "Carica esami" in sezione Laboratorio | `QuickActionsIntegrated.tsx` |
| Upload esami microbiologici inline (no navigazione) | `QuickActionsIntegrated.tsx` |
| defaultTipologiaClinica prop in AllegatiUploadModal | `AllegatiUploadModal.tsx` |
| ProfiloDiSalute in employees/:id | `EmployeeDetails.tsx` |
| ProfiloDiSalute in pazienti/:id | `CartellaPaziente.tsx` |
| ProfiloDiSalute in visite/:id (tutti i layout) | `VisitaPage.tsx` |
