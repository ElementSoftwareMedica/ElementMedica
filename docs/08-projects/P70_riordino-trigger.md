# P70 — Riordino Trigger: Workflow Completo Appuntamenti & Contabilità

> **Stato**: ✅ Implementato completamente  
> **Data completamento**: 2025  

---

## 1. Panoramica

P70 definisce la logica completa di trigger per tutti gli eventi del ciclo di vita di un appuntamento.

| Evento | Trigger |
|--------|---------|
| Creazione appuntamento MDL | BOZZA MovimentoContabile + link ScadenzaPrestazioneProtocollo |
| Accettazione paziente non-MDL | BOZZA MovimentoContabile paziente + medico |
| Aggiunta/rimozione prestazioni in visita | Crea/aggiorna BOZZA MovimentoContabile |
| Completamento visita | DA_FATTURARE + aggiorna ScadenzaPrestazioneProtocollo + crea prossima scadenza |
| Spostamento/modifica appuntamento MDL | Re-link scadenze + invalida e rigenera BOZZA |
| NO_SHOW / RINVIATO | Annulla BOZZA + libera scadenze MDL |
| Eliminazione appuntamento | Annulla tutti i movimenti + libera scadenze |
| Eliminazione visita | Annulla movimenti visitaId + appuntamentoId + libera scadenze |
| **Coda**: Generazione sessione | Numeri univoci per slot, walk-in progressivi |
| **Coda**: Auto-generazione | Cron 6:30 mattina / 13:30 pomeriggio |
| **Coda**: PDF sessione | Lista pazienti con numero coda, ora, prestazione |

---

## 2. Gestione Coda

### 2.1 Numero di Coda

- Ogni paziente prenotato in uno slot riceve un **numero univoco fisso** al momento della generazione della sessione
- Il numero **non cambia** anche se il paziente non si presenta
- I pazienti walk-in (non prenotati) ricevono un numero **progressivo successivo** a quelli assegnati in sessione

### 2.2 Generazione Sessione (manuale)

**Endpoint**: `POST /api/v1/clinica/queue/sessions/bulk-day`

```json
{
  "date": "2025-06-15",
  "fascia": "MATTINA"
}
```

Valori `fascia`: `"MATTINA"` | `"POMERIGGIO"` | `"TUTTO"`

Crea sessioni coda per tutti gli slot disponibilità del giorno. Se una sessione esiste già per uno slot, viene saltata.

**Service**: `backend/services/queue/QueueAutoGeneratorService.js`

### 2.3 Auto-Generazione (cron)

Configurato in `backend/servers/api-server.js`:

```javascript
// Slot mattina — ogni giorno alle 6:30 ora di Roma
cron.schedule('30 6 * * *', () => QueueAutoGeneratorService.generateMorningSlots(), {
    timezone: 'Europe/Rome'
});

// Slot pomeriggio — ogni giorno alle 13:30 ora di Roma
cron.schedule('30 13 * * *', () => QueueAutoGeneratorService.generateAfternoonSlots(), {
    timezone: 'Europe/Rome'
});
```

### 2.4 PDF Sessione

**Endpoint**: `GET /api/v1/clinica/queue/sessions/:id/pdf`

Genera un PDF A4 con banner teal, lista medici e tabella N° coda / Paziente / Ora / Prestazione / Stato.

**Service**: `backend/services/queue/QueueSessionPdfService.js`

> **Nota tecnica**: `NumeroChiamata` non ha relazione Prisma verso `Appuntamento` (solo `appuntamentoId: String?`). Il service usa batch query separate su `appuntamento` e `person`.

---

## 3. Trigger di Creazione

### 3.1 Booking Appuntamento MDL

**Condizione**: `tipoVisitaMDL` presente E `companyTenantProfileId` valorizzato

**Trigger** (non-blocking via `setImmediate`):

1. **ScadenzaPrestazioneProtocollo**: cerca scadenze `eseguita: false` nei ±60 giorni dalla `dataOra` per il paziente; colleghiamo `appuntamentoId` e `dataEsecuzione`
2. **BOZZA ENTRATA** (`tipo: VISITA_MDL`, `tipoSoggetto: AZIENDA`): importo da voce tariffario → fallback prezzoBase prestazione
3. **BOZZA USCITA** (`tipo: VISITA_MDL`, `tipoSoggetto: MEDICO`): compenso da configurazione professionista

**File**: `AppuntamentoService.create()` → `MovimentoContabileGenerator.generaPerAppuntamentoMDL()`

**Idempotenza**: skip se esiste già `ENTRATA` con `{appuntamentoId, tenantId, deletedAt: null}`.

### 3.2 Pulsante "Accetta e Visita" (frontend)

Visibile in `AppuntamentoBlock` solo se: stato ∈ `['PRENOTATO', 'CONFERMATO']` + `tipoVisitaMDL` + `pazienteAnagraficaCompleta`.

**Flusso**: `PATCH stato=IN_ATTESA` → `GET /visite/by-appuntamento/:id` → naviga a `/visite/:id`

**File**: `src/pages/clinica/agenda/components/blocks/AppuntamentoBlock.tsx`

---

## 4. Trigger di Accettazione (non-MDL)

**Condizione**: `updateStato()` con stato `IN_ATTESA`/`ARRIVATO` E `!tipoVisitaMDL`

**Trigger** (non-blocking): BOZZA ENTRATA (paziente/azienda) + BOZZA USCITA (medico)

**File**: `AppuntamentoService.updateStato()` → `MovimentoContabileGenerator.generaPerAccettazionePaziente()`

---

## 5. Trigger Durante la Visita

### 5.1 Aggiunta prestazione

**Endpoint**: `POST /api/v1/clinica/visite/:id/prestazioni`

Crea BOZZA MovimentoContabile per la prestazione aggiuntiva (stato BOZZA; finalizzato al termine visita).

**File**: `MovimentoContabileGenerator.generaPerAppuntamentoPrestazione()`

### 5.2 Rimozione prestazione

**Endpoint**: `DELETE /api/v1/clinica/visite/:id/prestazioni/:appPrestazioneId`

Annulla movimenti BOZZA/DA_FATTURARE collegati all'`appPrestazioneId`.

**File**: `MovimentoContabileGenerator.annullaPerAppuntamentoPrestazione()`

---

## 6. Trigger a Fine Visita (termina)

**Endpoint**: `POST /api/v1/clinica/visite/:id/termina`

### 6.1 MDL — Billing

Invalida BOZZA collegati a `visitaId` + `appuntamentoId` → rigenera `DA_FATTURARE`.

**File**: `MovimentoContabileGenerator.aggiornaPerVisitaMDL()`

### 6.2 Non-MDL — Billing

BOZZA collegati all'`appuntamentoId` → `DA_FATTURARE`.

**File**: `MovimentoContabileGenerator.finalizzaMovimentiAppuntamento()`

### 6.3 MDL — ScadenzaPrestazioneProtocollo

1. Marca `eseguita: true`, imposta `dataEsecuzione`
2. Verifica `neiTempi` (±60 giorni dalla `dataScadenza`)
3. Se `periodicitaMesi > 0` e non esiste scadenza futura → crea scadenza successiva

**File**: `backend/routes/clinica/visite.routes.js` — blocco P70 post-billing

---

## 7. Trigger di Modifica

### 7.1 Reschedule (spostamento data) — solo MDL

**File**: `AppuntamentoService.update()` — blocco P70 `isRescheduled`

1. Rilascia vecchio link ScadenzaPrestazioneProtocollo
2. Cerca e collega scadenze nei ±60 giorni dalla nuova data
3. Invalida BOZZA (`stato: ANNULLATO`, `deletedAt: new Date()`)
4. Rigenera BOZZA con dati aggiornati

### 7.2 Cambio prestazione / medico — solo MDL

**File**: `AppuntamentoService.update()` — blocco P70 `needsBillingUpdate`

1. Invalida BOZZA (soft-delete + ANNULLATO)
2. Rigenera BOZZA con dati aggiornati

> ⚠️ Il `deletedAt` nella invalidazione è **obbligatorio**. `esisteMovimento()` filtra su `deletedAt: null`: senza soft-delete il record annullato blocca la rigenerazione.

### 7.3 NO_SHOW

**File**: `AppuntamentoService.updateStato()` — blocco P70 `NO_SHOW || RINVIATO`

1. Cancella movimenti BOZZA/PREVENTIVO/DA_FATTURARE (soft-delete + ANNULLATO)
2. Libera ScadenzaPrestazioneProtocollo collegate

### 7.4 RINVIATO

Identico a NO_SHOW.

### 7.5 ANNULLATO

**File**: `AppuntamentoService.updateStato()` — blocco P59 aggiornato P70

1. Cancella movimenti BOZZA/PREVENTIVO/DA_FATTURARE (soft-delete + ANNULLATO)
2. Libera ScadenzaPrestazioneProtocollo collegate

---

## 8. Trigger di Eliminazione

### 8.1 Eliminazione Appuntamento

**File**: `AppuntamentoService.delete()`

1. Soft-delete appuntamento
2. Cancella movimenti BOZZA/PREVENTIVO/DA_FATTURARE (soft-delete + ANNULLATO)
3. Libera ScadenzaPrestazioneProtocollo collegate

### 8.2 Eliminazione Visita

**Route**: `DELETE /api/v1/clinica/visite/:id`

1. `VisitaService.delete()` — soft-delete + libera ScadenzaPrestazioneProtocollo per `appuntamentoId`; restituisce `{ id, appuntamentoId }`
2. `annullaMovimentiSorgente({ visitaId: id })` — movimenti generati durante la visita
3. `annullaMovimentiSorgente({ appuntamentoId })` (setImmediate) — BOZZA creati al booking MDL

---

## 9. Architettura Tecnica

### 9.1 Files Principali P70

| File | Ruolo |
|------|-------|
| `backend/services/clinical/AppuntamentoService.js` | Trigger create, accept, update, updateStato, delete |
| `backend/services/management/MovimentoContabileGenerator.js` | Motore generazione/annullamento movimenti |
| `backend/services/clinical/VisitaService.js` | delete() → appuntamentoId + libera scadenze |
| `backend/routes/clinica/visite.routes.js` | termina endpoint + DELETE doppio annullamento |
| `backend/routes/clinica/queue.routes.js` | bulk-day + PDF |
| `backend/services/queue/QueueAutoGeneratorService.js` | Generazione automatica sessioni |
| `backend/services/queue/QueueSessionPdfService.js` | PDF sessioni coda |
| `backend/servers/api-server.js` | Cron 6:30 / 13:30 |
| `src/pages/clinica/agenda/components/blocks/AppuntamentoBlock.tsx` | Pulsante "Accetta e Visita" |
| `src/services/queueApi.ts` | API client: `generateBulkDay()`, `getSessionPdf()` |
| `src/hooks/clinica/useQueue.ts` | Hook mutations: `generateBulkDay`, `downloadSessionPdf` |
| `src/pages/clinica/coda/QueueManagementPage.tsx` | UI: bottone "Genera Giornata" + "PDF Lista" |
| `backend/tests/integration/queue-api.test.js` | Test di integrazione P70 (8 suite) |

### 9.2 Metodi MovimentoContabileGenerator (P70)

| Metodo | Trigger |
|--------|---------|
| `generaPerAppuntamentoMDL` | Booking/reschedule/cambio MDL |
| `generaPerAccettazionePaziente` | Accettazione non-MDL |
| `finalizzaMovimentiAppuntamento` | termina non-MDL |
| `aggiornaPerVisitaMDL` | termina MDL (invalida → DA_FATTURARE) |
| `generaPerAppuntamentoPrestazione` | Aggiunta prestazione in visita |
| `annullaPerAppuntamentoPrestazione` | Rimozione prestazione in visita |
| `annullaMovimentiSorgente` | Eliminazione visita/appuntamento |
| `_invalidaMovimentiBozza` | Helper: soft-delete BOZZA per source-filter |

### 9.3 Pattern Idempotenza

```javascript
// esisteMovimento filtra SOLO su deletedAt: null
const existing = await esisteMovimento({ appuntamentoId, direzione: 'ENTRATA', tenantId });
if (existing) return; // skip se già presente e non eliminato
```

**Regola critica**: l'invalidazione BOZZA deve sempre includere `deletedAt: new Date()` oltre a `stato: 'ANNULLATO'`.

### 9.4 Ciclo di Vita ScadenzaPrestazioneProtocollo

```
[Protocollo creato]
      ↓ crea ScadenzaPrestazioneProtocollo (eseguita: false, appuntamentoId: null)

[Booking MDL ±60d]
      ↓ link: { appuntamentoId: X, dataEsecuzione: dataAppuntamento }

[Reschedule / NO_SHOW / RINVIATO / Elimina]
      ↓ rilascio: { appuntamentoId: null, dataEsecuzione: null }

[Visita MDL completata]
      ↓ { eseguita: true, dataEsecuzione: dataVisita, neiTempi: bool }
      ↓ se periodicitaMesi > 0 && !scadenzaFuturaPending:
      └→ nuova ScadenzaPrestazioneProtocollo (dataScadenza + periodicitaMesi)
```

---

## 10. Bug Risolti

### Bug critico: invalidazione BOZZA senza soft-delete

`esisteMovimento()` filtra su `deletedAt: null`. Se si imposta solo `stato: ANNULLATO` senza `deletedAt`, il record rimane visibile e blocca la rigenerazione.

**Fix applicato a** (tutti e 4 i blocchi):
- `AppuntamentoService.update()` — `needsBillingUpdate`
- `AppuntamentoService.updateStato()` — `NO_SHOW || RINVIATO`
- `AppuntamentoService.updateStato()` — `ANNULLATO` (P59)
- `AppuntamentoService.delete()` — cancellazione movimenti

**Pattern corretto**:
```javascript
data: {
    stato: 'ANNULLATO',
    deletedAt: new Date(),      // ← obbligatorio
    note: 'Motivo...',
}
```

### Bug: QueueSessionPdfService relazione Prisma inesistente

`NumeroChiamata` non ha relazione `appuntamento` in Prisma. Fix: batch query separate.

---

## 11. Mapping Completo Requisiti

| Requisito | ✅ |
|-----------|---|
| Numero coda univoco per slot | ✅ |
| Numero fisso (indipendente presenza) | ✅ |
| Walk-in = progressivo | ✅ |
| Generazione bulk giornata | ✅ |
| PDF sessione | ✅ |
| Auto-generazione 6:30 / 13:30 | ✅ |
| Booking MDL → BOZZA movimenti | ✅ |
| Booking MDL → link ScadenzaPrestazioneProtocollo ±60d | ✅ |
| "Accetta e Visita" MDL + anagrafica completa | ✅ |
| Accettazione non-MDL → BOZZA paziente + medico | ✅ |
| Aggiunta prestazioni → BOZZA | ✅ |
| Rimozione prestazioni → annulla BOZZA | ✅ |
| MDL in visita → movimenti per azienda | ✅ |
| Fine visita → DA_FATTURARE | ✅ |
| Fine visita MDL → aggiorna ScadenzaPrestazioneProtocollo | ✅ |
| Fine visita MDL → crea prossima scadenza | ✅ |
| Reschedule MDL → re-link scadenze + rigenera BOZZA | ✅ |
| Cambio prestazione/medico MDL → rigenera BOZZA | ✅ |
| NO_SHOW → annulla BOZZA + libera scadenze | ✅ |
| RINVIATO → annulla BOZZA + libera scadenze | ✅ |
| Eliminazione appuntamento → annulla movimenti + scadenze | ✅ |
| Eliminazione visita → annulla movimenti visitaId + appuntamentoId | ✅ |
