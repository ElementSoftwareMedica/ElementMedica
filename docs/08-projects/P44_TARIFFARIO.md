# P44 - Tariffario Prestazioni Avanzato

**Stato**: ✅ Completato + ✅ Miglioramenti Gennaio 2025 + ✅ Fix Rischio-Prestazioni + ✅ OT23 INAIL + ✅ **P44 Enhancement - Frequenza e Numerosità**  
**Data**: Novembre 2024 → Gennaio 2025

---

## 📋 Obiettivo

Implementare sistema tariffario avanzato con pricing differenziato per Medicina del Lavoro.

---

## ✅ Feature Implementate

### Modelli

- `TariffarioMedico` - Prezzi per medico
- `TariffarioAziendale` - Prezzi per azienda cliente
- `ListinoPrezzo` - Listino base
- `OffertaBundle` - Pacchetti prestazioni
- `VoceTariffario` - Voci del tariffario
- `FasciaDipendentiPrezzo` - Fasce prezzo per numero dipendenti

### TipoVoceTariffario (Enum)

```
PRESTAZIONE        - Collegata a Prestazione MDL
SPESA_FISSA        - Costo fisso una tantum
SPESA_RICORRENTE   - Costo periodico
SOPRALLUOGO_MC     - Sopralluogo Medico Competente
SOPRALLUOGO_RSPP   - Sopralluogo RSPP
DVR_STESURA        - Stesura DVR
DVR_AGGIORNAMENTO  - Aggiornamento DVR
NOMINA_MC          - Nomina Medico Competente
NOMINA_RSPP        - Nomina RSPP
```

### Logica Pricing

```
Priorità:
1. TariffarioAziendale (se azienda)
2. TariffarioMedico (se medico specifico)
3. Convenzione (se applicabile)
4. ListinoPrezzo (default)
```

### API

- `GET /api/v1/clinica/tariffari-aziende`
- `GET /api/v1/clinica/tariffari-medico`
- `GET /api/v1/clinica/bundles`
- `GET /api/v1/clinica/listino`

### Frontend

- `/management/tariffari-aziende` - Gestione tariffari per aziende
- `/poliambulatorio/tariffari` - Tariffario medici
- `/poliambulatorio/bundles` - Pacchetti prestazioni

---

## ✅ Miglioramenti Gennaio 2025

### 1. Navigazione Sidebar
- ✅ Aggiunta voce "Tariffari MDL" nel menu Management
- ✅ Path: `/management/tariffari-aziende`
- ✅ Icona: Euro

### 2. Filtro Prestazioni MDL Esteso
- ✅ `getPrestazioniMDL()` include tutti i tipi MDL:
  - VISITA_MEDICINA_LAVORO
  - ESAME_STRUMENTALE (audiometria, spirometria, ecc.)
  - ESAME_LABORATORIO
  - VACCINAZIONE
  - VISITA_SPECIALISTICA
  - CONSULENZA
- ✅ Dropdown mostra tipo prestazione: `[Esame Strumentale] Audiometria Tonale`

### 3. Nuovi Tipi Voce Tariffario
- ✅ SOPRALLUOGO_MC, SOPRALLUOGO_RSPP
- ✅ DVR_STESURA, DVR_AGGIORNAMENTO  
- ✅ NOMINA_MC, NOMINA_RSPP
- ✅ Migrazione Prisma applicata

### 4. Import Automatico Prezzo e IVA
- ✅ Selezione prestazione importa `prezzoBase` + `aliquotaIva`
- ✅ IVA editabile manualmente dopo l'import

### 5. UI Fasce Dipendenti
- ✅ Switch "Usa fasce dipendenti" nel form
- ✅ Griglia fasce: min dipendenti, max dipendenti, prezzo, descrizione
- ✅ Preset automatico con 3 fasce quando attivato
- ✅ Pulsante "Aggiungi fascia" per fasce aggiuntive
- ✅ **FIX Gennaio 2025**: Pulsante "Aggiungi" disabilitato se tipo PRESTAZIONE ma nessuna prestazione MDL disponibile
- ✅ **FIX Gennaio 2025**: Tipo default cambiato a SPESA_FISSA quando non ci sono prestazioni MDL

---

## ✅ Fix Rischio-Prestazioni Gennaio 2025

### 1. Fix Export Duplicato
- ✅ Rimosso export duplicato `TIPO_VOCE_LABELS` in tariffarioAziendaleApi.ts
- ✅ Mantenuta versione completa con 9 valori

### 2. Schema Prisma - RischioPrestazione
- ✅ Aggiunti campi:
  - `obbligatoria Boolean @default(true)`
  - `riferimentoNormativo String? @db.VarChar(100)`
- ✅ Database sincronizzato con `prisma db push`

### 3. Riferimenti Normativi D.Lgs 81/08
- ✅ Tutti i 21 codici rischio ora includono riferimento normativo:
  - RUM: D.Lgs 81/08 Art. 196
  - VIB_MB/VIB_WBV: D.Lgs 81/08 Art. 204
  - CHI/CAN/AMI: D.Lgs 81/08 Art. 229, 242, 254
  - BIO: D.Lgs 81/08 Art. 279
  - MMC/MOV_RIP/POS: D.Lgs 81/08 Art. 168
  - VDT: D.Lgs 81/08 Art. 176
  - QUO: D.Lgs 81/08 Art. 111
  - ELE: D.Lgs 81/08 Art. 82
  - RAD_ION: D.Lgs 101/2020
  - NOT: D.Lgs 66/2003
  - SPA_CON: DPR 177/2011
  - ALC: Provv. 16/03/2006, Provv. 30/10/2007

### 4. UI Indicatore Esami Obbligatori
- ✅ Icona ShieldAlert (rossa) per esami obbligatori
- ✅ Icona Check (verde) per esami consigliati
- ✅ Badge "⚠️ Obbligatoria" (rosso) e "Consigliata" (blu)

### 5. Modifica Associazioni Mapping
- ✅ Pulsante Edit in vista catalogo e tabella mapping
- ✅ Modal modifica con:
  - Dropdown periodicità
  - Toggle obbligatoria
  - Input riferimento normativo
  - Textarea note
- ✅ updateMutation con clinicaApi.rischioPrestazioni.update

---

## 📁 File Modificati

```
backend/prisma/schema.prisma
  - Enum TipoVoceTariffario: +6 nuovi valori

backend/services/management/TariffarioAziendaleService.js
  - getPrestazioniMDL: filtro esteso per 6 tipi prestazione
  - addVoce: supporto fasceDipendenti

src/services/tariffarioAziendaleApi.ts
  - TipoVoceTariffario: +6 nuovi valori
  - TIPO_VOCE_LABELS: labels per dropdown
  - PrestazioneMDL: +tipo, +aliquotaIva

src/pages/management/tariffari-aziende/TariffarioAziendaleForm.tsx
  - Dropdown prestazioni con tipo label
  - Import IVA automatico
  - UI fasce dipendenti completa

src/components/layouts/ManagementLayout.tsx
  - Voce menu "Tariffari MDL" in sidebar
```

---

## 🔗 Riferimenti

- P59: ElementSicurezza Improvements
- Schema: `backend/prisma/schema.prisma`
---

## ✅ OT23 INAIL Management - Gennaio 2025

### 1. Backend

#### Database (Prisma Schema)
- ✅ Nuovo modello `OT23` con campi completi:
  - `companyTenantProfileId`, `anno`, `tenantId`, `stato` (enum StatoOT23)
  - `pat`, `codiceVoce`, `classificazioneRischio`
  - `interventiA`, `interventiB` (JSON arrays)
  - `punteggioSezioneA`, `punteggioSezioneB`, `punteggioTotale`
  - `haRequisitiBeneficio` (boolean - >= 100 punti)
  - `premioAnnuale`, `percentualeRiduzione`, `risparmioStimato`
  - `dataInvio`, `protocolloInail`, `dataEsito`, `esito`
- ✅ Nuovo enum `StatoOT23`: BOZZA, PRONTO, INVIATO, IN_VALUTAZIONE, APPROVATO, RESPINTO, INTEGRAZIONI_RICHIESTE, SCADUTO

#### Service (`OT23Service.js` ~500 righe)
- ✅ Catalogo completo interventi INAIL:
  - Sezione A: 3 interventi partecipazione INAIL
  - Sezione B: 6 categorie con ~20 interventi totali
- ✅ Tabella riduzioni per fasce dipendenti:
  - 0-10: 28%
  - 11-50: 18%
  - 51-200: 10%
  - 200+: 5%
- ✅ Funzioni business logic:
  - `addIntervento()`, `removeIntervento()`
  - `calcolaPunteggioSezione()`, `getPercentualeRiduzione()`
  - `calcolaRisparmioStimato()`, `updateStato()`
  - `generateXmlPreview()` (preview XML formato INAIL)
  - `getDashboard()`, `getCatalogoInterventi()`

#### Routes (`ot23.routes.js` ~350 righe)
- ✅ CRUD completo domande OT23
- ✅ `GET /api/v1/sicurezza/ot23/catalogo` - Catalogo interventi
- ✅ `POST /api/v1/sicurezza/ot23/calcola-risparmio` - Calcolatore risparmio
- ✅ `GET /api/v1/sicurezza/ot23/dashboard/:anno` - Dashboard anno
- ✅ `POST/DELETE /api/v1/sicurezza/ot23/:id/interventi` - Gestione interventi
- ✅ `PUT /api/v1/sicurezza/ot23/:id/stato` - Workflow stati
- ✅ `GET /api/v1/sicurezza/ot23/:id/xml` - Download XML preview

### 2. Frontend

#### API Client (`sicurezzaApi.ts` ~330 righe)
- ✅ Client tipizzato per tutte le API OT23
- ✅ Funzioni helper: `getOT23StatoColor()`, `getOT23StatoLabel()`, `canEditOT23()`, `canSubmitOT23()`

#### Pagine
- ✅ `OT23Page.tsx` - Lista domande con:
  - Dashboard cards (totali, approvate, in attesa, risparmio)
  - Filtri (anno, stato, ricerca)
  - Tabella con azioni (view, download XML, delete)
  - Pulsante "Nuova Domanda" e "Calcolatore Risparmio"

- ✅ `OT23DetailPage.tsx` - Dettaglio domanda con:
  - Info azienda e stato
  - Visualizzazione punteggio con progress bar
  - Gestione interventi Sezione A e B
  - Catalogo interventi espandibile per categorie
  - Pulsanti aggiungi/rimuovi intervento
  - Download XML, cambio stato

- ✅ `OT23CreateModal.tsx` - Modal creazione nuova domanda:
  - Selezione azienda
  - Anno di riferimento
  - PAT, codice voce, classificazione rischio

- ✅ `OT23RisparmioCalculator.tsx` - Calcolatore risparmio:
  - Input premio annuale e numero dipendenti
  - Calcolo automatico percentuale riduzione
  - Tabella riduzioni per fasce

### 3. Routing
- ✅ `/sicurezza/ot23` - Lista domande OT23
- ✅ `/sicurezza/ot23/:id` - Dettaglio domanda

### 4. File Creati/Modificati

```
backend/prisma/schema.prisma
  - Nuovo modello OT23
  - Nuovo enum StatoOT23
  - Relazioni CompanyTenantProfile, Tenant

backend/services/clinical/OT23Service.js (NEW)
backend/routes/sicurezza/ot23.routes.js (NEW)
backend/routes/sicurezza/index.js (NEW)
backend/servers/api-server.js (MODIFIED - route registration)

src/services/sicurezzaApi.ts (NEW)
src/pages/sicurezza/OT23Page.tsx (NEW)
src/pages/sicurezza/OT23DetailPage.tsx (NEW)
src/pages/sicurezza/components/OT23CreateModal.tsx (NEW)
src/pages/sicurezza/components/OT23RisparmioCalculator.tsx (NEW)
src/pages/sicurezza/index.lazy.tsx (NEW)
src/utils/formatters.ts (NEW - formatCurrency, formatDate)
src/App.tsx (MODIFIED - route registration)
