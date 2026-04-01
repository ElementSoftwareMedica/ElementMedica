# P97 - Fatturazione Elettronica & SistemaTS

**Progetto:** Integrazione API di fatturazione elettronica (SDI) e sincronizzazione al Sistema Tessera Sanitaria MEF  
**Sessioni:** P97 (Schema + Servizi) + P97-bis (Route + Frontend)  
**Stato:** ✅ Completato

---

## Panoramica

Integrazione completa del ciclo di fatturazione elettronica italiana tramite **AcubeAPI** (SDI) e del sistema di trasmissione spese sanitarie al **Sistema Tessera Sanitaria (MEF)**.

### Casi d'uso coperti
- Fatture per privati (visite mediche, preventivi)
- Fatture per aziende (MDL, DVR, RSPP, corsi sicurezza)
- Acconti (TD02)
- Note di credito (TD04)
- Fattura a terzo pagante (genitore, azienda, altro)
- Più enti emittenti per tenant (Element SRL, professionisti, etc.)

---

## Architettura

```
[Frontend pagine] → [Hook useFatturazione] → [API /billing/*]
                                                  ↓
                                    [FatturazioneService]
                                    /                  \
                            [AcubeApiService]    [SistemaTSService]
                                    ↓                  ↓
                              AcubeAPI (SDI)    SistemaTS MEF
```

---

## Database (Prisma)

### Nuovi modelli

#### `EnteEmittente`
Soggetto giuridico che emette fatture per conto del tenant.
- Campi fiscali: `codiceFiscale`, `piva`, `regimeFiscale`, `codiceAteco`
- Credenziali AcubeAPI: `acubeApiKey`, `acubePassword` (cifrate, mai esposte nelle API)
- Credenziali SistemaTS: `sistemaTsPinCode`, `sistemaTsUsername`, `sistemaTsPassword`
- Flag: `isDefault`, `isActive`, `sistemaTsAbilitato`
- Contatori: `annoNumFattura`, `progressivoFatt`

#### `FatturaElettronica`
Fattura elettronica nel formato FatturaPA.
- Tipo: `TipoDocumentoFattura` (FATTURA/ACCONTO/NOTA_CREDITO/NOTA_DEBITO → TD01/TD02/TD04/TD05)
- Stato interno: `StatoFatturaElettronica` (BOZZA → EMESSA → PAGATA/ANNULLATA/STORNATA)
- Stato SDI: `AcubeInvoiceStatus` (WAITING → SENT → DELIVERED/NOT_DELIVERED/REJECTED)
- Relazioni: `enteEmittente`, `linee`, `sistemaTsSyncLogs`, `fatturaOrigine`, `noteCreditoEmesse`
- Terzo pagante: `terzoPaganteTipo`, `terzoPersonaId`, `terzoAziendaId`

#### `FatturaElettronicaLinea`
Righe dettaglio con quantità, prezzo unitario, aliquota IVA, natura esenzione.

#### `SistemaTSSyncLog`
Log di ogni invio al MEF con `outcome` (0=OK, 1=errore bloccante, 2=warning), `protocol` (17 cifre), messaggi di errore.

### Enum rimossi / legacy
- `model Fattura` — rimosso
- `model FatturaAzienda` — rimosso

---

## Backend

### Servizi (`backend/services/billing/`)

#### `AcubeApiService.js`
| Funzione | Descrizione |
|----------|-------------|
| `buildFatturaPA(fattura, linee)` | Costruisce il payload JSON FatturaPA per AcubeAPI |
| `inviaFatturaSDI(fattura, ente)` | `POST /invoices` → ritorna `{ uuid }` |
| `getStatoFattura(acubeUuid, ente)` | `GET /invoices/{uuid}` → stato corrente SDI |
| `testConnessioneAcube(ente)` | Verifica token AcubeAPI |

Mapping tipi documento:
```js
FATTURA → TD01 | ACCONTO → TD02 | NOTA_CREDITO → TD04 | NOTA_DEBITO → TD05
```

#### `SistemaTSService.js`
| Funzione | Descrizione |
|----------|-------------|
| `buildSistemaTSPayload(fattura, persona)` | Costruisce il payload per `/sistema-ts/expenses` |
| `inviaSpesaSanitaria(fattura, ente)` | `POST /sistema-ts/expenses` → `{ uuid, outcome, protocol }` |
| `sincronizzaSistemaTS(fatturaId)` | Orchestrazione completa: verifica flag opposizione, invia, salva log |
| `testConnessioneSistemaTS(ente)` | Test credenziali SistemaTS |

Campi obbligatori: `cf_proprietario` (CF ente), `cf_cittadino` (CF paziente), `spesa[]`

#### `FatturazioneService.js`
| Funzione | Descrizione |
|----------|-------------|
| `generaNumeroFattura(tenantId, enteId)` | Genera numero progressivo `ANNO/NNNN` con lock atomico |
| `creaFatturaBozza(tenantId, input)` | Crea bozza con calcolo totali, resolve cessionario |
| `emettiFattura(fatturaId, tenantId)` | Assegna numero, chiama AcubeAPI, aggiorna stato |
| `aggiornaStatoFatturaSDI(acubeUuid, nuovoStatus)` | Callback webhook per aggiornamento stato SDI |
| `creaNataCredito(fatturaOrigineId, tenantId, note)` | Crea bozza TD04 collegata alla fattura origine |

### Route API

#### `GET /api/v1/billing/enti-emittenti`
Lista enti emittenti del tenant (senza credenziali raw).

#### `POST /api/v1/billing/enti-emittenti`
Crea nuovo ente (richiede `billing:write`).

#### `POST /api/v1/billing/enti-emittenti/:id/test-acube`
Test connessione AcubeAPI per l'ente specificato.

#### `POST /api/v1/billing/enti-emittenti/:id/test-sistema-ts`
Test connessione SistemaTS per l'ente specificato.

#### `GET /api/v1/billing/fatture?stato=&tipoDocumento=&from=&to=&search=&page=`
Lista fatture con filtri multipli. Paginata (50/pagina).

#### `GET /api/v1/billing/fatture/stats?from=&to=`
Dashboard stats: contatori per stato, totali emesso/incassato, breakdown SDI.

#### `POST /api/v1/billing/fatture`
Crea bozza fattura.

#### `POST /api/v1/billing/fatture/:id/emetti`
Invia a SDI tramite AcubeAPI. Genera numero fattura, aggiorna stato → EMESSA.

#### `POST /api/v1/billing/fatture/:id/nota-credito`
Crea bozza nota di credito TD04 collegata.

#### `POST /api/v1/billing/fatture/:id/segna-pagata`
Riconciliazione manuale → stato PAGATA.

#### `POST /api/v1/billing/fatture/webhook/acube`
Webhook non autenticato per aggiornamenti stato SDI da AcubeAPI.

#### `GET /api/v1/billing/sistema-ts/dashboard`
Dashboard per-ente: stats 30 giorni, ultima sync, fatture pending.

#### `POST /api/v1/billing/sistema-ts/sincronizza`
Invia singola fattura al SistemaTS MEF.

#### `POST /api/v1/billing/sistema-ts/sincronizza-batch`
Batch sync tutte le fatture cliniche pending (max 50).

---

## Frontend

### Hook: `useFatturazione`
Path: `src/hooks/finance/useFatturazione.ts`

Esporta tutti i tipi TypeScript: `FatturaElettronica`, `EnteEmittente`, `FattureStats`, `StatoFattura`, `AcubeInvoiceStatus`, `TipoEnteEmittente`, `CreaBozzaInput`.

### Pagine

| Pagina | Path | Route |
|--------|------|-------|
| `FatturazioneElettronicaPage` | `src/pages/finance/billing/FatturazioneElettronicaPage.tsx` | `/management/billing/fatture` |
| `EntiEmittentiPage` | `src/pages/finance/billing/EntiEmittentiPage.tsx` | `/management/billing/enti-emittenti` |
| `SistemaTSPage` | `src/pages/finance/billing/SistemaTSPage.tsx` | `/management/billing/sistema-ts` |

### Navigazione sidebar
Sezione **Fatturazione** in `ManagementLayout.tsx` con icona `Receipt`, colore `bg-violet-600` (Management brand), permesso `billing`.

---

## Sicurezza

### Credenziali
- Le credenziali AcubeAPI (`acubeApiKey`, `acubePassword`) e SistemaTS (`sistemaTsPinCode`, `sistemaTsPassword`) non vengono mai incluse nelle response delle API.
- Le response espongono solo flag booleani: `acubeConfigurato`, `sistemaTsConfigurato`.
- I DELETE di enti con fatture attive (stato EMESSA/PAGATA) vengono bloccati.

### Multi-tenancy
- Tutte le query usano `where: { tenantId, deletedAt: null }`.
- Auth via `req.person.tenantId`.

### GDPR
- Soft delete su `FatturaElettronica` e `EnteEmittente` (campo `deletedAt`).
- `GdprAuditLog` su ogni DELETE con `resourceType`, `resourceId`, `dataAccessed`.
- `deletionReason` richiesta (min 10 char).

---

## AcubeAPI Reference

- **Base URL:** `https://api.acubeapi.com`
- **Auth:** Bearer JWT
- **Sandbox SistemaTS:** PinCode=`3489543096`, Username=`MTOMRA66A41F224M`, Password=`Salve123`
- **Fatture (SDI):**
  - `POST /invoices` → `202 { uuid }`
  - A-Cube auto-fills: `IdTrasmittente`, `ProgressivoInvio`, `FormatoTrasmissione`
  - Statuses: `WAITING → SENT → DELIVERED / NOT_DELIVERED / REJECTED`
- **SistemaTS:**
  - `POST /sistema-ts/expenses`
  - Headers: `X-SistemaTS-PinCode`, `X-SistemaTS-Username`, `X-SistemaTS-Password`
  - `outcome`: 0=accepted, 1=blocking error, 2=accepted with warnings
  - `protocol`: identificativo MEF a 17 cifre

---

## Limitazioni note / TODO futuri

1. **Webhook AcubeAPI non verificato** — manca verifica firma HMAC sull'endpoint `/webhook/acube`. Da implementare come security hardening.
2. **`prisma migrate dev` bloccato** — shadow DB con conflitto su `TemplateType already exists`. In dev si usa `db push`. Per produzione, generare migration manuale.
3. **Pagina creazione fattura** — `FatturazioneElettronicaPage` ha link verso `/management/billing/fatture/nuova` ma la pagina di form non è ancora stata creata (P98).
4. **Firma digitale XML** — AcubeAPI gestisce la firma del file XML FatturaPA. Non è richiesta firma lato nostro.
5. **Conservazione digitale** — AcubeAPI include conservazione 10 anni. SistemaTS gestisce scadenza 30/09 anno successivo.
