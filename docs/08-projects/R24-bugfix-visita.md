# R24 — Bug Fix: VisitaPage, Questionari, Allergie, Allegati, ProfiloSaluteCard

**Data:** 27 Feb 2026  
**Tipo:** Bug Fix + Enhancement  
**Stato:** ✅ Completato

---

## 1. Problemi Risolti

### 1.1 VisitaViewModal z-index troppo basso
**File:** `src/pages/clinica/clinica/components/VisitaViewModal.tsx`  
**Bug:** Il modale "Visita Precedente" aveva `z-50`, stesso livello di `CartellaSanitariaModal`, causando la visualizzazione dietro di esso.  
**Fix:** Cambiato da `z-50` a `z-[60]`.

---

### 1.2 Pre-compila risposte: campi select non mostravano il valore (2 fix)

#### Fix A — `key` prop mancante su QuestionarioRenderer
**File:** `src/pages/clinica/clinica/components/QuestionariModal.tsx`  
**Bug:** `<QuestionarioRenderer>` nel view `fill` non aveva il prop `key`, quindi non si rimontava quando cambiava il template selezionato, mantenendo lo stato dei campi vuoti.  
**Fix:** Aggiunto `key={selectedTemplate.id}` per forzare rimontaggio al cambio template.

#### Fix B — Radix UI SelectValue non mostra label con valore impostato programmaticamente
**File:** `src/components/clinica/questionari/QuestionarioRenderer.tsx`  
**Bug:** Quando `handleApplyTemplatePreset` chiama `setFormValues(newValues)`, il toast "8 campi pre-compilati" scattava correttamente ma le Select Radix restavano visivamente vuote. Questo è un comportamento noto di Radix UI: `SelectValue` mostra la label dell'item selezionato basandosi su un context interno che viene popolato solo quando il `SelectContent` viene montato (aperto). Con valore impostato programmaticamente senza mai aprire il dropdown, la label non viene visualizzata.  
**Fix:** Nel componente `SelectField`, si recupera la label corrispondente al valore corrente dall'array `opts` e la si passa come `children` di `SelectValue`:
```tsx
const selectedLabel = opts.find(o => o.value === valueStr)?.label;
<SelectValue placeholder="...">
    {selectedLabel || undefined}
</SelectValue>
```

---

### 1.3 Allergie: salvataggio immediato con feedback
**File:** `src/pages/clinica/clinica/VisitaPage.tsx`  
**Bug:** `handleSaveAllergie` chiamava solo `handleFieldChange('_allergie', ...)` che aggiornava il form e triggerava l'auto-save con 3 secondi di ritardo, senza feedback visivo immediato all'utente.  
**Fix:** Aggiunto `saveAllergieMutation` (pattern uguale a `saveNoteInterneMutation`) che:
1. Chiama `visiteApi.update(visitaId, { datiStrutturati: { ...currentDati, _allergie: allergieText } })` immediatamente
2. Mostra toast "Allergie salvate" in caso di successo
3. Invalida la query `['visita', visitaId]`
`handleSaveAllergie` ora chiama sia `handleFieldChange` (per tenere in sync il form state e resettare il debounce dell'auto-save) sia `saveAllergieMutation.mutate()`.  
Propagato `isAllergieSaving={saveAllergieMutation.isPending}` su tutti e 3 i render di `QuickActionsIntegrated`.

---

### 1.4 Allegati: drag & drop nella zona "Carica allegati"
**Files:**
- `src/pages/clinica/clinica/components/QuickActionsIntegrated.tsx`
- `src/pages/clinica/clinica/components/AllegatiUploadModal.tsx`

**Bug:** Il riquadro "Carica allegato" nella sezione Allegati accettava solo click, non drag & drop di file.  
**Fix:**
- In `QuickActionsIntegrated`: aggiunto stato `isInlineDragging` e `inlineDroppedFiles`, handler `handleInlineDragOver/DragLeave/Drop`. Il box "Carica allegato" ora:
  - Mostra feedback visivo quando si trascina file sopra (bordo rosa più scuro, testo "Rilascia per caricare")
  - All'onDrop: salva i file droppati e apre `AllegatiUploadModal`
- In `AllegatiUploadModal`: aggiunto prop `initialFiles?: File[]` che pre-carica i file nell'elenco quando il modale si apre, inizializzando `files` state con questi file tramite lazy initializer `useState()`
- In `QuickActionsIntegrated`: al `onClose` del modale, si resetta `inlineDroppedFiles` a `[]`

---

### 1.5 ProfiloSaluteCard: aggiornata con tutti i campi del modello R21/R22
**File:** `src/components/clinica/ProfiloSaluteCard.tsx`  
**Bug:** La card mostrava solo le sezioni base (Invalidità, Abitudini, DPI Personali/Azienda, Mezzi Aziendali) ma non i nuovi campi aggiunti in R21/R22 al modello `ProfiloDiSalutePersona`.

**Sezioni aggiunte (sia in modalità edit che read):**

| Sezione | Campi |
|---------|-------|
| **Patologie Croniche** | hasDiabete, hasIpertensione, hasCardiopatie, hasAsma, hasEpilessia, altrePatologie, farmaci, allergieFarmaci |
| **Sonno e Vigilanza** | qualitaSonno, oreSonnoNotte, sonnolenzaDiurna, scalaEpworth (0-24), apneaNotturna |
| **Patente & CQC** | patenteCategorie (tag list), patenteScadenza, patenteSospesa, cqc, cqcScadenza |
| **Formazione D.Lgs 81/08 & Idoneità** | formazioneGenerale (+data), formazioneSpecifica (+data), addestramentoCompletato, idoneoLavoroInQuota, idoneoSpazioConfinato, idoneoGuida, idoneoVDT |

**Aggiornati anche:**
- `profileToDraft()`: include tutti i nuovi campi
- `emptyDraft()`: default values per boolean/array fields
- `hasSomething`: controlla anche i nuovi campi per l'empty state

**Ordine sezioni nel read view:**
1. Invalidità (alert box ambra se presente)
2. Patologie Croniche (badge colorati per patologia + testo farmaci/allergie)
3. Abitudini (fumo, alcol, attività fisica)
4. Sonno e Vigilanza
5. DPI Personali
6. DPI Azienda
7. Mezzi Aziendali
8. Patente & CQC
9. Formazione & Idoneità (badge verdi per completate, badge verde/rosso per idoneità)
10. Note salute

---

### 1.6 Backend 500 su GET /documenti/paziente/:id (verificato)
**Status:** ✅ Fix applicato in R23 già attivo  
`backend/routes/clinica/documenti-clinici.routes.js` ora importa `prisma` a top-level (non più dinamicamente). Il server è stato riavviato dopo R23 e il log mostra nessun errore recente.

---

## 2. File Modificati

| File | Modifica |
|------|----------|
| `src/pages/clinica/clinica/components/VisitaViewModal.tsx` | `z-50` → `z-[60]` |
| `src/pages/clinica/clinica/components/QuestionariModal.tsx` | `key={selectedTemplate.id}` su QuestionarioRenderer fill |
| `src/components/clinica/questionari/QuestionarioRenderer.tsx` | SelectField mostra label esplicita per valori impostati programmaticamente |
| `src/pages/clinica/clinica/VisitaPage.tsx` | `saveAllergieMutation` + `handleSaveAllergie` con mutate + `isAllergieSaving` su 3 render |
| `src/pages/clinica/clinica/components/QuickActionsIntegrated.tsx` | Drag & drop sul box upload allegati |
| `src/pages/clinica/clinica/components/AllegatiUploadModal.tsx` | Prop `initialFiles?: File[]` con lazy state init |
| `src/components/clinica/ProfiloSaluteCard.tsx` | 4 nuove sezioni (Patologie, Sonno, Patente/CQC, Formazione/Idoneità) |

---

## 3. Note Tecniche

### Radix Select con valore controllato
Radix UI v1 `SelectValue` non mostra la label dell'item selezionato quando:
- Il `SelectContent` non è mai stato aperto (items non registrati nel context)
- Il valore viene impostato programmaticamente via setState mentre il dropdown è chiuso

**Pattern corretto** per evitare il problema:
```tsx
const selectedLabel = opts.find(o => o.value === valueStr)?.label;
<SelectValue>
    {selectedLabel || undefined}
</SelectValue>
```

### Auto-save vs mutation correlazione
`handleFieldChange` resetta il debounce auto-save (AUTOSAVE_DELAY=3000ms). Chiamando `handleFieldChange('_allergie', ...)` + `saveAllergieMutation.mutate()` in sequenza:
1. La mutation salva immediatamente (con toast)
2. L'auto-save si resetta e fuoco 3 secondi, ma include già `_allergie` aggiornato in `values`
→ Nessun conflitto, salvataggio consistente.
