# P66 - MDL Visit Workflow Completo

**Stato**: 🔄 In Corso  
**Data inizio**: 28 Febbraio 2026  
**Versione**: v1.0  
**Dipendenze**: P52 (Clinical Visits), P56 (MDL Schema), P65 (HL7/FSE)

---

## 📋 Obiettivo

Completare il flusso operativo delle **visite di Medicina del Lavoro (MDL)** armonizzando il processo clinico con i requisiti del **D.Lgs 81/08**:
- Acquisizione strutturata del **Giudizio di Idoneità** nella visita
- **Automazioni post-salvataggio** (agenda, sub-visita, contabilità, allegato 3A, PDF, giudizio DB)
- **Pagina Giudizi** con filtri avanzati e raggruppamento per giorno
- **Servizio email EOD** — invio giornaliero automatico al paziente (PDF singolo protetto da psw o zip con psw + psw in seconda mail o whatsapp) e all'azienda (ZIP con password contenente tutti i giudizi della giornata). Opzione per rendere la cosa automatica e impostare dopo quanti giorni (es. giorno stesso, giorno successivo ecc) e l'ora di invio. Invio di seconda mail con psw o whatsapp (fare impostazioni)
- **PDF template** formale per Giudizio di Idoneità (D.Lgs 81/08 Art. 41 c.6)
- **Fix bug** — campoId null, React crash oggetti in options, allegato-3A stats 500

---

## ✅ Completato (Round 14-15)

### Bug Fix

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| `PUT /visite/:id` 500 `campoId: null` | Campi MDL da `mdlNormativaTemplates.js` usavano `key:` invece di `name:` + tipo uppercase | `normalizeCampo()` + filter pre-`createMany` + fallback in `QuestionarioRenderer.tsx` |
| FirmaVisitaCard "Firma salvata" falso positivo | `GET /signatures/saved/:id` → `{data: null}` HTTP 200 = truthy | Normalizzazione `result?.firmaId ? result : null` |
| React crash `Objects not valid as React child` | `DEFAULT_VISIT_FIELDS` MDL con `options: [{value, label}]` renderizzati direttamente in `DynamicField.tsx` | Aggiunto `normalizeOpt()` in `DynamicField.tsx`; fix DROPDOWN + MULTI_CHOICE render; `options?.join('\n')` → map+extract `.label` in `FieldLayoutGrid.tsx` + `TemplateEditorModal.tsx` |
| `GET /allegato-3a/stats/:id` 500 | `prisma.mansione.count` usava `isAttiva: true` (campo inesistente in `Mansione`) + return object con field names diversi dal frontend | Fix query + allineamento return fields (`totaleWorkers`, `withActiveGiudizio`, `withExpiredGiudizio`, `pendingVisits`) |
| `branchTypes: ['MDL']` enum invalido | Enum `BranchType` non ha `MDL` | Sostituito con `'MEDICA'` in tutti i 10 template |

### Campi MDL in `VisitTemplateService.DEFAULT_VISIT_FIELDS`

Aggiunti 4 campi alla sezione `followup` (tutti `enabled: false`):

| Campo ID | Tipo | Opzioni |
|----------|------|---------|
| `giudizio_idoneita_mdl` | `DROPDOWN` | Idoneo / con prescrizioni / con limitazioni / Temp. non idoneo / Non idoneo |
| `periodicita_sorveglianza_mdl` | `DROPDOWN` | 3/6/12/24/60 mesi / Personalizzata |
| `prescrizioni_normativa_mdl` | `TEXTAREA` | — |
| `limitazioni_mansione_mdl` | `TEXTAREA` | — |

> **Nota**: `VisitField.options` aggiornato in `clinicaApi.ts` a `(string | { value: string; label: string })[]` per supportare entrambi i formati.

### PDF Template — Giudizio di Idoneità MDL

- `DefaultTemplateService.js`: nuovo template `GIUDIZIO_IDONEITA` con layout istituzionale
- `VisitaRefertoService._buildPrintContext()`: oggetto `result.mdl` con label mappate + flag booleani

### Rename Sidebar

- `'Follow-up'` → `'Conclusione e Follow-Up'` in 4 file
- (`VisitTemplateDetailPage.tsx`, `FieldLayoutGrid.tsx`, `TemplateEditorModal.tsx`, `VisitTemplateService.js`)

---

## 🔴 Da Fare

### TASK 1 — Automazioni Post-Salvataggio Visita MDL

**Trigger**: `PUT /api/v1/clinica/visite/:id` con `referto = true` E tipo visita MDL  
**File principali**: `backend/routes/clinica/visite.routes.js`, `VisitaRefertoService.js`

#### 1.1 Aggiornamento Appuntamento

```javascript
// Quando una visita MDL viene refertata, aggiornare l'appuntamento:
await prisma.appuntamento.update({
    where: { id: visita.appuntamentoId },
    data: {
        stato: 'COMPLETATO',
        dataOraFine: new Date(),
        durataEffettiva: /* calcolo da dataOraInizio */
    }
});
```

#### 1.2 Creazione GiudizioIdoneita

```javascript
// Se datiStrutturati.giudizioIdoneitaMdl è presente:
const giudizio = await prisma.giudizioIdoneita.upsert({
    where: { visitaId: visita.id },
    create: {
        personId: visita.pazienteId,
        visitaId: visita.id,
        medicoCompetenteId: visita.medicoId,
        mansioneId: /* da appuntamento o visita */,
        tenantId: visita.tenantId,
        tipoGiudizio: mapGiudizioToEnum(datiStrutturati.giudizioIdoneitaMdl),
        prescrizioni: datiStrutturati.prescrizioniNormativaMdl,
        limitazioni: datiStrutturati.limitazioniMansioneMdl,
        dataScadenza: calcDataScadenza(datiStrutturati.periodicitaSorveglianzaMdl)
    },
    update: { /* stessi campi */ }
});
```

#### 1.3 Aggiornamento/Creazione MovimentoContabile

```javascript
// Spostare stato da BOZZA → DA_FATTURARE
// Creare se non esiste
await prisma.movimentoContabile.upsert({
    where: { visitaId: visita.id },
    create: {
        tenantId, tipo: 'ENTRATA',
        stato: 'DA_FATTURARE',
        importoNetto: /* da prestazioni visita */,
        ...
    },
    update: { stato: 'DA_FATTURARE' }
});
```

#### 1.4 Aggiornamento Allegato 3A Worker

```javascript
// Aggiornare il campo `ultimoAccertamento` del lavoratore
// Richiamare Allegato3AService.updateWorkerRecord(personId, tenantId, giudizioId)
```

#### 1.5 Generazione PDF Automatica

```javascript
// Invocare documentsServer per generare PDF referto
// Salvo come allegato della visita
```

---

### TASK 2 — Pagina GiudiziIdoneita con Filtri Avanzati

**File**: `src/pages/clinica/mdl/GiudiziIdoneitaPage.tsx`  
**Route**: `/poliambulatorio/mdl/giudizi-idoneita`

#### Filtri richiesti (simili a `/poliambulatorio/appuntamenti`)

| Filtro | Tipo |
|--------|------|
| Date range (da/a) | DatePicker |
| Medico Competente | Select multipla |
| Azienda | Select con search |
| Tipo Giudizio | Multi-select (IDONEO, NON_IDONEO, …) |
| Stato | VALIDO / SCADUTO / REVOCATO |
| Mansione | Select con search |

#### Layout — Raggruppamento per Giorno

```
── 28 Febbraio 2026 (5 giudizi) ──────────────────
  [card]  Mario Rossi · Operatore CNC · IDONEO          ✓ verde
  [card]  Anna Bianchi · Magazziniere · IDONEO prescrizioni  ⚠️ ambra
── 27 Febbraio 2026 (3 giudizi) ──────────────────
  ...
```

#### Azioni per Giudizio

- Stampa PDF (apre `GIUDIZIO_IDONEITA` template)
- Invia PEC al lavoratore
- Invia PEC all'azienda
- Segna come notificato

---

### TASK 3 — Servizio Email EOD Giudizi

**Nuovo file**: `backend/services/clinical/GiudizioEmailService.js`  
**Nuovo cron**: `backend/cron/giudizioEmailCron.js`  
**Trigger**: cron ogni giorno alle **22:00**

#### Flusso per il Paziente

```
Per ogni GiudizioIdoneita emesso OGGI:
  1. Generare PDF giudizio (documentsServer)
  2. Inviare email al paziente (se ha email valida + consenso)
  3. Allegato: PDF singolo (NON zippato, no password)
  4. Log in GdprAuditLog (resourceType: 'GiudizioIdoneita')
```

#### Flusso per l'Azienda

```
Per ogni CompanyTenantProfile con giudizi emessi OGGI:
  1. Raccogliere tutti i PDF giudizi della giornata per i dipendenti
  2. Creare ZIP con password (password casuale 12 char alfanumerico)
  3. Inviare password via SMS/email separata
  4. Inviare ZIP via email/PEC all'azienda
  5. Log in GdprAuditLog
```

#### Requisiti GDPR

- `deletionReason` obbligatorio per eliminazione
- Email solo se `consensoMailMarketing = true` O `consensoRefertiEmail = true`  
- PII non in log (`logger.info({ giudizioId })` — no `{ email, nome }`)
- ZIP protetto da password → conformità NIS2 per dati sanitari

#### Schema API

```javascript
// Nuovi endpoints
POST /api/v1/clinica/giudizi/:id/send-email-paziente
POST /api/v1/clinica/giudizi/:id/send-email-azienda
POST /api/v1/clinica/giudizi/send-eod-batch  // Admin trigger manuale
GET  /api/v1/clinica/giudizi/email-log
```

---

### TASK 4 — Prescrizioni MDL come MULTISELECT

Convertire `prescrizioni_normativa_mdl` e `limitazioni_mansione_mdl` da `TEXTAREA` → `MULTI_CHOICE` con opzioni pre-compilate D.Lgs 81/08:

**Prescrizioni standard:**
- `uso_dpi_antirumore` — Uso obbligatorio DPI antirumore
- `uso_dpi_guanti` — Uso obbligatorio guanti protettivi  
- `uso_dpi_mascherina` — Uso obbligatorio mascherina FFP2/FFP3
- `no_mmc_oltre_25kg` — Divieto movimentazione carichi > 25 kg (uomini)
- `no_mmc_oltre_15kg` — Divieto movimentazione carichi > 15 kg (donne)
- `no_turni_notturni` — Esonero turni notturni
- `no_esposizione_cmr` — Divieto esposizione agenti CMR
- `sorveglianza_rinforzata` — Sorveglianza sanitaria rinforzata
- `visita_rientro_malattia` — Visita al rientro da malattia > 60 giorni

**Limitazioni mansione standard:**
- `no_lavoro_in_quota` — Non può lavorare su piattaforme elevabili
- `lavoro_seduto` — Solo mansioni in posizione seduta
- `no_vibrazioni` — Evitare esposizione a vibrazioni mano-braccio
- `no_polveri` — Evitare ambienti con polveri / aerosol

---

## 📁 File da Creare/Modificare

### Nuovi file

| File | Scopo |
|------|-------|
| `backend/services/clinical/GiudizioEmailService.js` | Email EOD giudizi |
| `backend/cron/giudizioEmailCron.js` | Scheduling 22:00 nightly |
| `backend/routes/clinica/giudizi-email.routes.js` | API email manuale |

### File esistenti da modificare

| File | Modifica |
|------|---------|
| `backend/routes/clinica/visite.routes.js` | Aggiungere automazioni post-referto MDL |
| `backend/services/clinical/VisitaRefertoService.js` | Helper `_runMDLPostRefertaAutomations()` |
| `src/pages/clinica/mdl/GiudiziIdoneitaPage.tsx` | Filtri avanzati + raggruppamento per giorno |
| `backend/services/clinical/VisitTemplateService.js` | Converti TEXTAREA → MULTI_CHOICE per prescrizioni/limitazioni |

---

## 🔑 Note Architetturali

### Pattern salvataggio automazioni

```javascript
// In visite.routes.js — PUT /:id
// Dopo salvataggio principale:
if (isReferto && visita.tipoVisita && MDL_TYPES.includes(visita.tipoVisita)) {
    // Fire-and-forget con error logging (non bloccare response)
    setImmediate(async () => {
        try {
            await VisitaRefertoService._runMDLPostRefertaAutomations(updatedVisita, req.person.tenantId);
        } catch (err) {
            logger.error({ err, visitaId: updatedVisita.id }, 'Errore automazioni MDL post-referto');
        }
    });
}
```

### Mapping TipoGiudizioIdoneita

| `datiStrutturati.giudizioIdoneitaMdl` | `TipoGiudizioIdoneita` enum |
|---------------------------------------|----------------------------|
| `idoneo` | `IDONEO` |
| `idoneo_prescrizioni` | `IDONEO_CON_PRESCRIZIONI` |
| `idoneo_limitazioni` | `IDONEO_CON_LIMITAZIONI` |
| `temporaneamente_non_idoneo` | `NON_IDONEO_TEMPORANEO` |
| `non_idoneo` | `NON_IDONEO_PERMANENTE` |

### Colori badge Giudizio (Tailwind)

| Tipo | Classe CSS |
|------|-----------|
| IDONEO | `bg-green-100 text-green-800 border-green-300` |
| IDONEO_CON_PRESCRIZIONI | `bg-yellow-100 text-yellow-800 border-yellow-300` |
| IDONEO_CON_LIMITAZIONI | `bg-amber-100 text-amber-800 border-amber-300` |
| NON_IDONEO_TEMPORANEO | `bg-orange-100 text-orange-800 border-orange-300` |
| NON_IDONEO_PERMANENTE | `bg-red-100 text-red-800 border-red-300` |

---

## 📊 Stato Avanzamento

| Task | Stato | Completato |
|------|-------|-----------|
| Bug fix campoId null | ✅ | R14 |
| Bug fix FirmaVisitaCard | ✅ | R14 |
| Rename "Follow-up" | ✅ | R14 |
| Campi MDL Conclusioni | ✅ | R14 |
| PDF template Giudizio MDL | ✅ | R14 |
| React crash objects-in-options | ✅ | R15 |
| Allegato-3A stats 500 | ✅ | R15 |
| Automazioni post-referto MDL | ✅ | R16 |
| GiudiziIdoneita filtri/raggruppamento | ✅ | R16 |
| Email EOD service | ✅ | R16 |
| Prescrizioni MULTI_CHOICE | ✅ | R16 |
| Toolbar RichText in basso | ✅ | R19 |
| MULTI_CHOICE arrow + sfondo fix | ✅ | R19 |
| allowCustom MULTI_CHOICE su template abe0dd1d | ✅ | R19 |
| QuestionariModal rename "Pre-compila risposte" | ✅ | R19 |
| AllegatoVisita schema: tipologiaClinica + dataEsecuzione | ✅ | R19 |
| Allegati backend: upload + PATCH metadata | ✅ | R19 |
| Allegati frontend: AllegatiUploadModal con metadati per-file | ✅ | R19 |
| Allegati QuickActions: badge Documento blu + metadati in lista | ✅ | R19 |
