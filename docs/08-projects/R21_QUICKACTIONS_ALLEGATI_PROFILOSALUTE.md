# R21 — Quick Actions, Allegati, Profilo Salute Esteso & Access Control

**Session**: R21  
**Status**: ✅ Completato  
**Date**: 2025  
**Areas**: Clinical, Backend, Frontend, DB Schema  

---

## 📋 Obiettivi R21

1. **Syntax fix** — `QuickActionsIntegrated.tsx:792` Unexpected token corretto ✅
2. **Pre-compila risposte** — Unica azione diretta (no dropdown) dal template ✅
3. **AllegatiUploadModal** — Nome file modificabile + metadati aperti di default ✅
4. **QuickActionsIntegrated** — Area upload inline, QuickLook + Editor su allegati ✅
5. **VisitaPage cleanup** — Legacy handlers/state/modal allegati rimossi ✅
6. **ProfiloDiSalutePersona** — Schema esteso con tutti i campi clinici ✅
7. **ProfiloSaluteCard** — Aggiornato per nuovi campi (invalidità civile/INAIL/INPS) ✅
8. **Access Control enforcement** — Backend middleware `checkAccessControl` ✅
9. **Docs aggiornata** ✅

---

## ✅ Completato

### 1. Syntax Error Fix

**File**: `src/pages/clinica/clinica/components/QuickActionsIntegrated.tsx`  
**Problema**: `<div onClick={...}` mancava chiusura `>` prima dei children nella map allegati  
**Fix**: Aggiunto `>` nella riga 791

---

### 2. QuestionarioRenderer — Pre-compila Singola Azione

**File**: `src/components/clinica/QuestionarioRenderer.tsx`  
**Modifica**:
- Rimosso stato `showPresets` e menu dropdown con 4 opzioni
- Sostituito con `handleApplyTemplatePreset` — applica direttamente `PRECOMPILA_PRESETS.find(p => p.id === 'da-template')`
- Il bottone "Pre-compila risposte" ora compila subito tutti i campi dai default del template senza aprire alcun menu

---

### 3. AllegatiUploadModal — Rinomina + Metadati

**File**: `src/pages/clinica/clinica/components/AllegatiUploadModal.tsx`  
**Modifiche**:
- `FileItem` ha nuovo campo `customName: string`
- Il nome viene inizializzato senza estensione: `file.name.replace(/\.[^.]+$/, '')`
- `metaOpen: true` di default (prima `false`)
- Aggiunto input inline editabile con bordo tratteggiato per cambiare il nome
- Al salvataggio ricostruisce il file con nome personalizzato: `new File([item.file], finalName, { type })`
- L'estensione originale viene sempre preservata

---

### 4. QuickActionsIntegrated — Inline Upload + Editor

**File**: `src/pages/clinica/clinica/components/QuickActionsIntegrated.tsx`  
**Modifiche**:
- **Props rimossi**: `onAttachImage?`, `onAttachDocument?` (legacy)
- **Nuovi import**: `useQueryClient`, `useRef`, `Upload`, `Pencil`, `AllegatoEditorModal`, `AllegatiUploadModal`
- **Nuovo stato**: `editAllegato`, `showUploadModal`, `inlineFileInputRef`
- **Area upload inline**: Zona tratteggiata sempre visibile nella sezione allegati — `onClick={() => setShowUploadModal(true)}`
- **Lista allegati**: Altezza max `max-h-48`, hover `group/allegato` con pulsanti Eye + Pencil che compaiono on hover
- **Pulsante Edit**: Visibile solo per immagini o PDF (`a.tipo === 'immagine' || /\.pdf$/i.test(a.url)`)
- **AllegatoQuickLookModal**: Ha ora `onEdit` prop → chiude quicklook, apre editor
- **AllegatoEditorModal**: Renderizzato inline (era assente)
- **AllegatiUploadModal**: Renderizzato inline, controllato da `showUploadModal`
- **handleInlineUploadComplete**: Invalida query `['allegati-visita', visitaId]`

---

### 5. VisitaPage — Legacy Cleanup

**File**: `src/pages/clinica/clinica/VisitaPage.tsx`  
**Rimosso**:
- `handleAttachImage` / `handleAttachDocument` functions
- `isAllegatiModalOpen` / `allegatiModalType` states
- Standalone `<AllegatiUploadModal>` (ora gestito dentro `QuickActionsIntegrated`)
- `AllegatiUploadModal` dall'import
- Props `onAttachImage` / `onAttachDocument` dalle 3 istanze di `QuickActionsIntegrated`

---

### 6. ProfiloDiSalutePersona — Schema Esteso

**File**: `backend/prisma/schema.prisma`  
**DB Migration**: `prisma db push --accept-data-loss` + `prisma generate` ✅

Nuovi campi aggiunti al modello `ProfiloDiSalutePersona`:

| Sezione | Campi |
|---------|-------|
| **Anagrafica** | `statoCivile`, `numeroFigli`, `professione` |
| **Invalidità** | `gradoInvaliditaCivile`, `gradoInvaliditaInail`, `gradoInvaliditaInps`, `causaDiServizio` (bool), `gradoCausaDiServizio` — sostituiscono il vecchio `gradoInvalidita` generico |
| **Patologie croniche** | `hasDiabete`, `tipoDiabete`, `terapiaInsulina`, `hasIpertensione`, `hasCardiopatie`, `hasAsma`, `hasEpilessia`, `altrePatologie`, `farmaci`, `allergieFarmaci` |
| **Abitudini fumo** | `tipoSigaretta`, `etaInizioFumo` |
| **Sonno** | `qualitaSonno`, `oreSonnoNotte`, `sonnolenzaDiurna`, `scalaEpworth`, `apneaNotturna`, `disturbiSonno` |
| **Diuresi** | `diuresiFrequenza`, `diuresiNocturia`, `diuresiUrgenza`, `diuresiDolore`, `diuresiEmaturia` |
| **Alvo** | `alvoFrequenza`, `alvoFormaBristol`, `alvoDolore`, `alvoSanguinamento` |
| **Salute riproduttiva** | `sesso`, `ciclaMestruale`, `etaMenarca`, `cicloDurata`, `cicloDurataFlusso`, `cicloRegolare`, `ultimaMestruazione`, `menopausa`, `etaMenopausa`, `numeroGravidanze`, `gravidanzeATermine`, `gravidanzePretermine`, `abortiSpontanei`, `abortiVolontari`, `inGravidanza`, `inAllattamento`, `settimanaGestazione` |
| **Vaccinazioni** | `vaccinazioni Json?` (array `VaccinazioneRecord[]`) |
| **Esposizioni lavorative** | `esposizioniLavorative Json?` (array `EsposizioneRecord[]`) |
| **Donazioni** | `donatoreOrgani`, `donatoreSangue`, `donatoreSangueFrequenza` |
| **DPI avanzato** | `datInizioUsoDpiPersonali`, `dataInizioUsoDpiAzienda`, `corsiFormazioneDpi Json?` (array `CorsoFormazioneDpiRecord[]`) |
| **Patente** | `patenteCategorie String[]` |

#### Sub-types aggiunti in `src/services/clinicaApi.ts`
```typescript
export interface VaccinazioneRecord {
    tipo: string; data?: string; scadenza?: string; eseguita: boolean; note?: string;
}
export interface EsposizioneRecord {
    agente: string; periodoInizio?: string; periodoFine?: string; azienda?: string; note?: string;
}
export interface CorsoFormazioneDpiRecord {
    tipo: string; data?: string; scadenza?: string; ente?: string; valido?: boolean;
}
```

---

### 7. ProfiloSaluteCard — Aggiornato

**File**: `src/components/clinica/ProfiloSaluteCard.tsx`  
**Modifiche**:
- `profileToDraft()`: sostituito `gradoInvalidita` con `gradoInvaliditaCivile`, `gradoInvaliditaInail`, `gradoInvaliditaInps`, `causaDiServizio`, `gradoCausaDiServizio`
- **Form edit invalidità**: tre input separati per grado civile / INAIL / INPS + checkbox causa di servizio con grado condizionale
- **Vista read-only**: mostra i gradi come `Civile X% · INAIL Y% · INPS Z%` e "Causa di servizio — X%"

---

### 8. Access Control Backend Enforcement

**Nuovo file**: `backend/utils/accessControl.js`

Esporta:
- `checkAccessControl(accessControl, person, opts?)` — async, verifica con query DB specialità
- `checkAccessControlSync(accessControl, person)` — sync, senza query DB

**Logica**:
1. `null` / nessuna restrizione → accesso libero
2. `SUPER_ADMIN` / `ADMIN` → sempre accesso
3. `denyPersonIds` includes → accesso negato
4. `allowedPersonIds` defined → persona deve essere nell'elenco
5. `allowedRoleTypes` defined → almeno un ruolo match
6. `allowedSpecialties` defined → query `PersonTenantProfile.specialties`, almeno una specialità match

**Applicato in**:
- `backend/routes/clinica/visite.routes.js` — `GET /:id`: controlla `visita.accessControl`
- `backend/routes/clinica/documenti-clinici.routes.js` — `GET /visita/download/:allegatoId`: controlla `allegato.accessControl`
- Risponde `403 Forbidden` con `reason` leggibile in caso di accesso negato

---

## 🏗️ Architettura Aggiornata

```
QuickActionsIntegrated
├── CartellaSanitariaModal         ← "Visite Precedenti" onOpenFull
├── LaboratorioAnalisi section     ← documentiCliniciApi.getAllegatiPaziente
├── Allegati section (inline)
│   ├── Drop area (sempre visibile) → AllegatiUploadModal (interno)
│   ├── AllegatoQuickLookModal     ← Eye hover button
│   └── AllegatoEditorModal        ← Pencil hover button
└── ProfiloSaluteCard              ← profilo salute paziente

Access Control Flow:
  GET /visite/:id
    → checkAccessControl(visita.accessControl, req.person)
    → 403 se non autorizzato

  GET /documenti/visita/download/:id
    → checkAccessControl(allegato.accessControl, req.person)
    → 403 se non autorizzato
```

---

## 📌 Note Tecniche

- `causaDiServizio` è `Boolean` nel schema (non stringa) — causata da refactoring R21
- La query specialità in `checkAccessControl` usa `PersonTenantProfile.specialties String[]`
- Il componente `AllegatiUploadModal` non ha più istanza standalone in `VisitaPage` — è gestito internamente da `QuickActionsIntegrated`
- Il campo `gradoInvalidita` (generico) è stato rimosso dallo schema e sostituito da 3 campi separati — i dati storici sono stati migrati via `db push`
