# R22 — Pre-compila Risposte Fix + ProfiloDiSalutePersona D.Lgs 81/08

**Data**: 2025  
**Stato**: ✅ Completato  
**Dipende da**: R21 (QuickActions Allegati, ProfiloDiSalute esteso)

---

## Obiettivi

1. **Fix critico**: Il pulsante "Pre-compila risposte" nei questionari non compilava nulla quando il template non aveva `defaultValue` sui campi.
2. **Conformità D.Lgs 81/08**: `ProfiloDiSalutePersona` esteso con tutti i campi obbligatori per la sorveglianza sanitaria ex art. 37 (formazione, patente, CQC, abilitazioni mezzi, idoneità specifiche, DPI consegne).
3. **Fix syntax error**: `QuickActionsIntegrated.tsx` — Fragment wrapper mancante (errore R21).
4. **Fix struttura**: `types.ts` — interfaccia `DynamicFieldProps` non chiusa.

---

## Modifiche Apportate

### 1. QuickActionsIntegrated.tsx — Fragment Wrapper
**File**: `src/pages/clinica/clinica/components/QuickActionsIntegrated.tsx`  
**Problema**: Le modal (CartellaSanitaria, QuickLook, Editor, Upload) erano sibling JSX root elements senza Fragment wrapper → `Unexpected token, expected ","` a line 1233.  
**Fix**: Aggiunto `<>...</>` Fragment attorno all'intero return value.

### 2. QuestionarioRenderer.tsx — Pre-compila Fix
**File**: `src/components/clinica/questionari/QuestionarioRenderer.tsx`

**Problema**: `PRECOMPILA_PRESETS['da-template'].apply()` faceva fallback a `getDefaultValues(campi)` quando il template non aveva `defaultValue` definiti → restituiva valori vuoti/null identici allo stato iniziale, l'utente non vedeva nessun cambiamento.

**Root cause**: Il 70% dei template del tenant Element SRL non ha `defaultValue` sulle campi.

**Fix**: Estratta funzione helper standalone `applyNormaDefaults(campi)` con logica "nella norma":
- `boolean` → `false` (nessun problema)
- `select` → prima opzione
- `multiselect` → `[]`
- `number`/`scale` → `campo.min ?? 0`
- `text`/`textarea` → `'Nella norma'`
- `date` → oggi

Il preset `'da-template'` usa `applyNormaDefaults` come fallback quando il template non ha default. Il preset `'nella-norma'` è stato semplificato a delegare la stessa funzione.

```typescript
// Prima (bug):
if (!hasDefaults) return getDefaultValues(campi); // ritorna vuoto

// Dopo (fix):
if (!hasDefaults) return applyNormaDefaults(campi); // ritorna valori sensati
```

### 3. schema.prisma — ProfiloDiSalutePersona D.Lgs 81/08
**File**: `backend/prisma/schema.prisma`  
**Migrazione**: `prisma db push --accept-data-loss` ✅

Nuovi campi aggiunti nella sezione `// === MEZZI AZIENDALI ===`:

```prisma
// Patente e CQC
patenteScadenza       DateTime?
patenteSospesa        Boolean   @default(false)
cqc                   Boolean   @default(false)  // D.Lgs 286/05
cqcScadenza           DateTime?
abilitazioniMezzi     Json?     // AbilitazioneMezzo[]

// Formazione obbligatoria D.Lgs 81/08 art. 37
formazioneGenerale          Boolean   @default(false)
formazioneGeneraleData      DateTime?
formazioneGeneraleScadenza  DateTime?
formazioneSpecifica         Boolean   @default(false)
formazioneSpecificaData     DateTime?
formazioneSpecificaScadenza DateTime?
addestramentoCompletato     Boolean   @default(false)

// Idoneità specifiche medicina del lavoro
idoneoLavoroInQuota   Boolean?  // art. 26 + UNI EN ISO 18893
idoneoSpazioConfinato Boolean?  // D.P.R. 177/2011
idoneoGuida           Boolean?  // idoneità guida veicoli aziendali
idoneoVDT             Boolean?  // VDT > 20h/settimana Titolo VII

// DPI consegne registro
dpiConsegne           Json?     // DpiConsegna[]
```

### 4. ProfiloDiSaluteService.js — Upsert aggiornato
**File**: `backend/services/clinical/ProfiloDiSaluteService.js`  
Aggiunti tutti i nuovi campi all'oggetto `payload` dell'upsert.

### 5. clinicaApi.ts — Interfacce TypeScript aggiornate
**File**: `src/services/clinicaApi.ts`

Nuove interfacce:
```typescript
export interface AbilitazioneMezzo {
    tipo: string;       // "carrello_elevatore", "PLE", "gruetta", "trattore"
    ottenuto?: string | null;
    scadenza?: string | null;
    ente?: string | null;
    nota?: string | null;
}

export interface DpiConsegna {
    tipo: string;       // "guanti", "elmetto", "scarpe_antinf"
    data?: string | null;
    misura?: string | null;
    firma?: boolean;
    note?: string | null;
}
```

Tutti i nuovi campi aggiunti all'interfaccia `ProfiloDiSalute`.

### 6. types.ts — Fix interfaccia non chiusa
**File**: `src/pages/clinica/clinica/types.ts`  
`DynamicFieldProps` interface mancava della `}` di chiusura → errore TS1005.

---

## DB Template Status (Element SRL)

| Template | has_defaults | campi |
|----------|-------------|-------|
| Cartella Sanitaria e di Rischio | ❌ | 16 |
| Questionario Anamnestico Lavorativo | ❌ | 13 |
| Scheda Rischi Specifici | ❌ | 11 |
| Questionario Alcol e Sostanze | ❌ | 8 |
| Scheda Sorveglianza Sanitaria | ❌ | 7 |
| Prescrizioni e Limitazioni | ❌ | 7 |
| Comunicazione Esito Visita | ❌ | 4 |
| Consenso Informato | ✅ | 5 |
| Giudizio di Idoneità | ✅ | 6 |
| Richiesta Visita su Istanza | ✅ | 5 |

Grazie al fix, quando si preme "Pre-compila risposte" su un template senza default, tutti i campi vengono ora compilati con valori "nella norma" invece di restare vuoti.

---

## Verifica Finale

- ✅ `QuickActionsIntegrated.tsx` — 0 errori TS
- ✅ `QuestionarioRenderer.tsx` — 0 errori TS
- ✅ `clinicaApi.ts` — 0 errori TS
- ✅ `ProfiloSaluteCard.tsx` — 0 errori TS
- ✅ `VisitaPage.tsx` — 0 errori TS
- ✅ DB sync: `profili_salute_persone` aggiornato con nuove colonne
- ✅ Prisma Client rigenerato (v5.22.0)
- ✅ Legacy cleanup: nessun pattern `req.user`/`req.userId` nelle route backend; nessun legacy allegati prop nel frontend
