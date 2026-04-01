# R28 — Sorveglianza Sanitaria Pre-fill + UI Improvements

**Fase 84** · Data: 2025

---

## Sommario

Sessione multi-task che ha risolto un errore 500 sul PUT `/visite/:id`, migliorato la UX della card scadenza visita con pre-compilazione automatica da sorveglianza sanitaria, migliorato il layout del profilo di salute, fixato la pre-compilazione questionari MDL, e ottimizzato l'upload allegati.

---

## 1. Fix 500 PUT `/visite/:id`

**Root causes identificati e risolti:**

### 1a. Schema Joi `visita.update` incompleto
**File**: `backend/config/validation-clinical.js`

In produzione (`stripUnknown: true`), i campi non dichiarati nello schema venivano eliminati prima di arrivare al service, causando fallimenti silenti o dati persi.

**Campi aggiunti**:
```javascript
prossimoControllo: Joi.date().iso().allow('', null),
noteFollowup: Joi.string().max(5000).allow('', null),
durataEffettiva: Joi.number().integer().min(0).allow(null),
accessControl: Joi.object().allow(null),
confidentiality: Joi.string().valid('NORMAL', 'RESTRICTED', 'HIGHLY_RESTRICTED').allow(null),
isPrimaVisita: Joi.boolean(),
tipoVisitaMDL: Joi.string().allow('', null),
medicoRefertanteId: Joi.string().uuid().allow('', null),
```

### 1b. Error logging hardcoded
**File**: `backend/routes/clinica/visite.routes.js`

```javascript
// PRIMA (nascondeva il vero errore):
logger.error('Failed to update visita', { error: 'Internal server error' });

// DOPO:
logger.error('Failed to update visita', {
    error: error.message,
    stack: error.stack?.split('\n').slice(0, 3).join(' | '),
    ...
});
```

### 1c. `updatedBy` passato nel wrong argument
**File**: `backend/routes/clinica/visite.routes.js`

```javascript
// PRIMA: updatedBy veniva mescolato ai dati della visita (3° arg)
VisitaService.update(id, tenantId, { ...omitSystemFields(req.body), updatedBy })

// DOPO: updatedBy separato nelle options (4° arg)
VisitaService.update(id, tenantId, omitSystemFields(req.body), {
    updatedBy,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
})
```

---

## 2. Sorveglianza Sanitaria Pre-fill (MDL)

### Funzionamento
Per le visite **Medica del Lavoro (MDL)**, la card "Prossima Visita Periodica" si pre-compila automaticamente dal protocollo sanitario della mansione del paziente:

1. **Data prossima visita** → calcolata da `ProtocolloSanitario.periodicitaVisiteMesi` (es. 12 mesi)
2. **Note accertamenti** → lista degli accertamenti previsti dal protocollo, con `✓` per obbligatori e `○` per facoltativi

### Priorità chain (updated)
```
1. template.defaultScadenzaMesi        (admin-configured)
2. prestazione.scadenzaDefaultMesi     (catalog-configured)
3. sorveglianzaStats.periodicitaMesi   ← NUOVO (da protocollo sanitario)
4. MDL_DEFAULT_FOLLOWUP_MESI[tipo]     (hard-coded defaults per tipo)
```

### Implementazione

**VisitaPage.tsx** — nuovi query hooks:
```tsx
// 1. Fetch mansioni del paziente
const { data: workerRisksData } = useQuery({
    queryKey: ['worker-risks', paziente?.id],
    queryFn: () => mansioniApi.getWorkerRisks(paziente!.id),
    enabled: isMDLVisit && !!paziente?.id,
});
const primaryMansioneId = workerRisksData?.data?.mansioni?.[0]?.id ?? null;

// 2. Fetch protocolli per mansione
const { data: protocolliMansione } = useQuery({
    queryKey: ['protocolli-mansione', primaryMansioneId],
    queryFn: () => protocolliSanitariApi.getByMansione(primaryMansioneId!),
    enabled: isMDLVisit && !!primaryMansioneId,
});

// 3. Derive stats
const sorveglianzaStats: SorveglianzaStats | null = useMemo(() => { ... });
```

**VisitaScadenzaCard.tsx** — nuovo export type + prop:
```ts
export interface SorveglianzaStats {
    periodicitaMesi: number;
    accertamenti: { nome: string; isObbligatoria: boolean }[];
    denominazione?: string;
}
// Props: sorveglianzaStats?: SorveglianzaStats | null
```

**Auto-fill effects**:
- `prossimoControllo`: auto-filled dal `suggested.date` (chain aggiornata)
- `noteFollowup`: auto-filled una volta con lista accertamenti formattata

**UI nuova**:
- Riquadro teal con nome protocollo, periodicità e lista accertamenti
- Bottone "Usa nelle note" (visibile solo se `noteFollowup` è vuoto)
- Badge sorgente aggiornato: "🩺 Da protocollo sanitario"

---

## 3. ProfiloSaluteCard — Layout 2 Colonne

**File**: `src/components/clinica/ProfiloSaluteCard.tsx`

La view mode è stata ridisegnata da lista verticale a griglia 2 colonne responsive (`sm:grid-cols-2`).

### Nuovo layout
```
[Alert: Invalidità] [Alert: Allergie farmaci]  ← full-width prioritari
┌──────────────────┬──────────────────────────┐
│  Patologie       │  Abitudini + Sonno       │
├──────────────────┼──────────────────────────┤
│  DPI & Mezzi     │  Patente & Formazione    │
└──────────────────┴──────────────────────────┘
[Note salute]                                   ← full-width
```

### Miglioramenti
- Sezioni visibili solo se hanno dati (conditional rendering invariato)
- Ogni sezione ha sfondo `bg-gray-50 rounded-lg border border-gray-100 p-2.5`
- Allergie farmaci estratte in alert rosso separato (prima erano inline con le patologie)
- Iconografia ridotta a `w-3 h-3` per aree compatte

**Usato in**:
- `CartellaPaziente.tsx` → `/pazienti/:id`
- `EmployeeDetails.tsx` → `/employees/:id`
- `VisitaPage.tsx` → modal Profilo Salute in visita

---

## 4. Pre-compila Questionari MDL

### Problema
Templates `DocumentoTemplate` di tipo MDL non esistevano nel DB per i tenant di produzione.

### Soluzione
Due script eseguiti:
1. `backend/scripts/seed-questionari-mdl.js` → creati 12 templates (6 tipi × 2 tenant)
   - MDL-ANAMNESI-01, MDL-ALCOL-01, MDL-VDT-01, MDL-MMC-01, MDL-RUMORE-01, MDL-STRESS-01
2. `backend/scripts/update-questionari-defaults.mjs` → applicati 170 `defaultValue` sui `campi`

La logica di `buildDefaultDatiCompilati` in `QuestionariModal.tsx` era già corretta.

---

## 5. Allegati Upload Box

**File**: `src/pages/clinica/clinica/components/QuickActionsIntegrated.tsx`

```tsx
// PRIMA: h-9 (36px)
// DOPO: min-h-[72px] flex-col items-center justify-center gap-1.5 px-3 py-4
// Icona: h-4 → h-5, testo su 2 righe: "Clicca o trascina un file" / "Immagini, PDF, documenti"
```

---

## 6. Bottoni Preset + Calendar Integration

**File**: `src/pages/clinica/clinica/components/VisitaScadenzaCard.tsx`

I bottoni 3m/6m/1a/2a e il DatePicker sono ora in un unico contenitore unificato:
```tsx
<div className="rounded-xl border overflow-hidden bg-white shadow-sm">
    {/* Preset strip — bg-gray-50 border-b */}
    <div className="flex gap-1.5 px-2.5 py-2 bg-gray-50 border-b border-gray-200">
        {/* flex-1 rounded-lg buttons */}
    </div>
    {/* DatePicker + reset */}
    <div className="flex gap-2 items-center px-2.5 py-2">
        <DatePickerElegante ... />
        <RotateCcw ... />
    </div>
</div>
```

---

## File Modificati

| File | Tipo |
|------|------|
| `backend/config/validation-clinical.js` | Backend fix |
| `backend/routes/clinica/visite.routes.js` | Backend fix |
| `src/pages/clinica/clinica/VisitaPage.tsx` | Feature |
| `src/pages/clinica/clinica/components/VisitaScadenzaCard.tsx` | Feature + UI |
| `src/components/clinica/ProfiloSaluteCard.tsx` | UI redesign |
| `src/pages/clinica/clinica/components/QuickActionsIntegrated.tsx` | UI fix |

## DB Changes

| Operazione | Dettaglio |
|------------|-----------|
| INSERT DocumentoTemplate | 12 templates MDL (6 × 2 tenant) |
| UPDATE DocumentoTemplate.campi | 170 `defaultValue` applicati |
