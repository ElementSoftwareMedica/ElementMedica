# R32 — MDL Scadenze Reconciliation & Visualizza Visita Fix

**Data**: Marzo 2026  
**Stato**: ✅ Completato  
**Files modificati**: 9

---

## Obiettivo

Sessione multi-task alla continuazione di R31. Obiettivi principali:
1. Fix "Visualizza visita" nel calendario (ancora mostrando "Modifica accettazione" per visite refertate)
2. Nuova logica Ultima/Prossima visita MDL basata su `ScadenzaPrestazioneProtocollo` (vs visite array precedente)
3. Fix duplicato "Visita Medica del Lavoro" nel panel prestazioni protocollo
4. Piano di sorveglianza sanitaria completo nella card `VisitaScadenzaCard` di `/visite/:id`
5. Fix JSX error in `VisitaPage.tsx` (commento non chiuso)
6. Fix `ScadenzeMDLStatistiche` con `perUrgenza:` wrapper mancante in `clinicaApi.ts`

---

## 1. Visualizza Visita nel Calendario

### Problema
Il bottone "Visualizza visita" nel tooltip dell'`AppuntamentoBlock` era già condizionato correttamente (`COMPLETATO/FATTURATO + event.visitaId + onViewVisita`), ma per **appuntamenti storici** la `visita.appuntamentoId` era `null` — creati prima del collegamento bidirezionale. Risultato: `event.visitaId = undefined` → il bottone non compariva.

### Soluzione
**File**: `backend/services/clinical/AppuntamentoService.js` (metodo `getAll`, ~linea 923)

Dopo aver costruito `visitaMap` (keyed by `appuntamentoId`), aggiunto un **fallback lookup** per dati storici:

```javascript
// Per appuntamenti COMPLETATO/FATTURATO senza visita nel visitaMap,
// cerca visite orfane (appuntamentoId null) per stesso pazienteId nello stesso giorno.
const unmatchedCompletato = appuntamenti.filter(a =>
    ['COMPLETATO', 'FATTURATO'].includes(a.stato) && !visitaMap.has(a.id) && a.pazienteId
);
if (unmatchedCompletato.length > 0) {
    const orphanVisite = await prisma.visita.findMany({
        where: { tenantId, deletedAt: null, appuntamentoId: null,
                 pazienteId: { in: orphanPazienteIds } },
        select: { id, stato, pazienteId, dataOra, dataInizio }
    });
    // Match per pazienteId + stesso giorno
    for (const app of unmatchedCompletato) {
        const matched = orphanVisite.find(v => 
            v.pazienteId === app.pazienteId && sameDay(v.dataOra ?? v.dataInizio, app.dataOra)
        );
        if (matched) visitaMap.set(app.id, matched);
    }
}
```

**Comportamento risultante**:
- Tutti i COMPLETATO/FATTURATO con visita nello stesso giorno mostrano "Visualizza visita"
- "Modifica Accettazione" appare solo se non c'è nessuna visita collegabile

---

## 2. Ultima/Prossima Visita MDL — ScadenzaPrestazioneProtocollo

### Cambio di approccio
Precedentemente: calcolato filtrando l'array `visite` del paziente.  
Ora: calcolato direttamente su `ScadenzaPrestazioneProtocollo`.

### Backend — PazienteService.js
Tre nuove query in `getStoricoPaziente`:

```javascript
// Query 1: ultima eseguita con visita MDL
const ultimaScadenzaMDLRaw = await prisma.scadenzaPrestazioneProtocollo.findFirst({
    where: { personId, tenantId, deletedAt: null, eseguita: true,
             visitaId: { not: null }, visita: { tipoVisitaMDL: { in: ['PRIMA_VISITA', 'PERIODICA'] } } },
    orderBy: { dataEsecuzione: 'desc' },
    include: { visita: { select: { dataOra, tipoVisitaMDL, giudizioIdoneita: { ... } } } }
});

// Query 2: prossima con appuntamento attivo (non annullato)
const prossimaScadenzaPrenotataRaw = await prisma.scadenzaPrestazioneProtocollo.findFirst({
    where: { ..., eseguita: false, appuntamentoId: { not: null },
             appuntamento: { tipoVisitaMDL: { in: ['PRIMA_VISITA', 'PERIODICA'] }, stato: { notIn: [...] } } },
    orderBy: { dataScadenza: 'asc' },
    include: { appuntamento: { select: { dataOra, tipoVisitaMDL } } }
});

// Query 3: prossime scadenze aperte senza appuntamento (invariata)
```

Nuovi campi nel return: `ultimaScadenzaMDL`, `prossimaScadenzaPrenotata`.

### AppuntamentoService.js
- **Create**: `dataEsecuzione: appuntamento.dataOra` prefill nella reconciliazione scadenze
- **Cancel (ANNULLATO)** + **Delete**: clear `dataEsecuzione: null` + `appuntamentoId: null`

### Frontend — useAppointmentForm.ts
- `lastMDLVisit`: legge da `storicoMDLData?.ultimaScadenzaMDL`
- `prossimaVisitaData`: Priority 1 = `prossimaScadenzaPrenotata?.dataOra` → Priority 2 = scadenza aperta → Priority 3 = targetDate + periodicità

---

## 3. Fix Doppio "Visita Medica del Lavoro"

**File**: `src/pages/clinica/agenda/components/modals/AppointmentBookingModal/MDLSorveglianzaPanel.tsx`

Nella lista prestazioni del protocollo, skip della prestazione già selezionata come principale:

```tsx
if (selectedPrestazione && pp.prestazioneId === selectedPrestazione.id) return null;
```

---

## 4. Piano di Sorveglianza Sanitaria in VisitaScadenzaCard

### Backend — scadenze-mdl.routes.js
Nuovo endpoint `GET /api/v1/clinica/scadenze-mdl/persona/:personId`:
- Autentica via `authenticate` + `requirePermission('visite:read')`
- Queries all `ScadenzaPrestazioneProtocollo` per personId + tenantId
- Include: `prestazione (id, nome, codice)`, `visita (id, dataOra, tipoVisitaMDL)`, `appuntamento (id, dataOra, stato, tipoVisitaMDL)`
- Raggruppa per `prestazioneId` → `ScadenzaProtocolloGruppo[]`

### Frontend — clinicaApi.ts
```typescript
export interface ScadenzaProtocolloItem { id, dataScadenza, dataEsecuzione, eseguita, isPrimaVisita, appuntamento, visita }
export interface ScadenzaProtocolloGruppo { prestazioneId, prestazioneName, prestazioneCodice, periodicitaMesi, scadenze }
// getScadenzePersona: (personId) => ScadenzaProtocolloGruppo[]
```

### Frontend — VisitaPage.tsx
```tsx
const { data: scadenzePersona } = useQuery<ScadenzaProtocolloGruppo[]>({
    queryKey: ['scadenze-persona', paziente?.id],
    queryFn: () => scadenzeMDLApi.getScadenzePersona(paziente!.id),
    enabled: isMDLVisit && !!paziente?.id,
    staleTime: 30_000,
});
// Passato come personaScadenze={scadenzePersona ?? null} a tutte e 3 le istanze di VisitaScadenzaCard
```

### Frontend — VisitaScadenzaCard.tsx
- Props: `personaScadenze?: ScadenzaProtocolloGruppo[] | null`
- Collapsible panel "Piano di sorveglianza sanitaria" (default expanded)
- `computeGruppoStatus(gruppo)` helper: classifica stato per ogni prestazione
  - `scaduta` → badge rosso (`AlertTriangle`)
  - `urgente` (<30gg) → badge ambra
  - `prenotata` (ha appuntamento attivo) → badge blu (`Calendar`)
  - `in_regola` (>30gg) → badge teal (`CheckCircle2`)
  - `eseguita` → badge grigio
- Mostra data scadenza / ultima esecuzione / data appuntamento accanto al badge

---

## 5. Fix JSX Error VisitaPage

**File**: `src/pages/clinica/clinica/VisitaPage.tsx`

Commento JSX non chiuso (`{/*...*/` senza `}`) nel layout tabs mode:

```tsx
// PRIMA (malformato):
{/* ========== CENTER: FORM ... ========== */
<div className="lg:col-span-4 space-y-6">

// DOPO:
{/* ========== CENTER: FORM ... ========== */}
<div className="lg:col-span-4 space-y-6">
```

---

## 6. Fix ScadenzeMDLStatistiche

**File**: `src/services/clinicaApi.ts`

Fix della struttura `interface ScadenzeMDLStatistiche`: mancava il wrapper `perUrgenza: { ... }` che conteneva i campi numerici.

---

## Analisi: ScadenzaPrestazioneProtocollo + DocumentoCompilato + Movimenti?

### Domanda
Deve `ScadenzaPrestazioneProtocollo` linkare direttamente `DocumentoCompilato`, `VoceTariffarioAziendale` e `MovimentoContabile`?

### Analisi

**Stato corrente**: `ScadenzaPrestazioneProtocollo` linka già `Person`, `Visita`, `Appuntamento`.  
`DocumentoCompilato` è raggiungibile via `ScadenzaPrestazioneProtocollo → Visita → DocumentoCompilato` (già esistente).  
`MovimentoContabile` è raggiungibile via `ScadenzaPrestazioneProtocollo → Appuntamento → MovimentoContabile`.

**Conclusione:**

| Link diretto | Necessità | Raccomandazione |
|---|---|---|
| `documentoCompilatoId` | Bassa — già raggiungibile via Visita/Appuntamento | Non implementare |
| `voceTariffarioId` | Nessuna — billing già gestito su Appuntamento | Non implementare |
| `movimentoContabileId` | Media — chiude l'audit loop (quale fattura ha confermato questa scadenza?) | ✅ Da valutare in una sessione dedicata |

**Auto-creazione scadenza + movimento BOZZA anno successivo**:
- Non richiede schema change su ScadenzaPrestazioneProtocollo
- Va implementato come trigger nel servizio di fatturazione: quando un `MovimentoContabile` ENTRATA per appuntamento MDL passa a `EMESSA/INCASSATO`, creare la scadenza successiva e un `MovimentoContabile` in `BOZZA`
- Logica da aggiungere in `MovimentoContabileService` o come hook post-fatturazione
- **Sessione dedicata richiesta** per design completo

---

## Prisma Schema

### Modifica in R29 (sessione precedente)
```prisma
// ScadenzaPrestazioneProtocollo
visita Visita? @relation("ScadenzeVisita", fields: [visitaId], references: [id], onDelete: SetNull)
@@index([visitaId])
// Visita model
scadenzePrestazioni ScadenzaPrestazioneProtocollo[] @relation("ScadenzeVisita")
```
DB sincronizzato con `prisma db push`.

---

## File Modificati

| File | Tipo |
|------|------|
| `backend/services/clinical/AppuntamentoService.js` | Fix fallback visitaId + dataEsecuzione lifecycle |
| `backend/services/clinical/PazienteService.js` | Nuove query ultimaScadenzaMDL + prossimaScadenzaPrenotata |
| `backend/routes/clinica/scadenze-mdl.routes.js` | Nuovo endpoint GET /persona/:personId |
| `backend/prisma/schema.prisma` | visita relation su ScadenzaPrestazioneProtocollo (R29) |
| `src/pages/clinica/clinica/VisitaPage.tsx` | JSX fix + scadenzePersona query + prop passthrough ×3 |
| `src/pages/clinica/clinica/components/VisitaScadenzaCard.tsx` | personaScadenze prop + piano sorveglianza panel |
| `src/pages/clinica/agenda/components/modals/AppointmentBookingModal/MDLSorveglianzaPanel.tsx` | Skip duplicato VML |
| `src/pages/clinica/agenda/components/modals/AppointmentBookingModal/useAppointmentForm.ts` | lastMDLVisit + prossimaVisitaData rewrite |
| `src/services/clinicaApi.ts` | ScadenzaProtocolloGruppo types + getScadenzePersona + ScadenzeMDLStatistiche fix |
