# P59 - MovimentoContabile: Modello Unificato COSTI e RICAVI

**Data Implementazione**: 24 Gennaio 2026  
**Sprint**: P59 Sprint 11.2  
**Autore**: GitHub Copilot  

---

## 📋 Executive Summary

È stato implementato il modello **MovimentoContabile** per unificare il tracking finanziario di:

- **ENTRATA (Ricavi)**: Fatture da emettere verso pazienti/aziende
- **USCITA (Costi)**: Compensi da pagare a MC, RSPP, formatori, fornitori

### 🎯 Vantaggi

1. **Coda di fatturazione unificata** per tutte le attività
2. **Tracciamento compensi professionisti** centralizzato
3. **Dashboard finanziaria** consolidata COSTI vs RICAVI
4. **Aging report** per scadenze pagamenti
5. **Nessuna modifica** alle entità sorgente (solo relazioni aggiuntive)

---

## 📊 Struttura del Modello

### 1. Enum di Classificazione

#### DirezioneMovimento
```prisma
enum DirezioneMovimento {
  ENTRATA  // Ricavo: da incassare da cliente/paziente/azienda
  USCITA   // Costo: da pagare a professionista/fornitore/collaboratore
}
```

#### TipoAttivitaMovimento (20+ tipi)
```prisma
enum TipoAttivitaMovimento {
  // CLINICA
  VISITA_MEDICA, PRESTAZIONE_CLINICA, REFERTO
  
  // MEDICINA DEL LAVORO
  VISITA_MDL, SOPRALLUOGO_MC, SOPRALLUOGO_RSPP
  DVR_STESURA, DVR_AGGIORNAMENTO
  NOMINA_MC, NOMINA_RSPP
  GIUDIZIO_IDONEITA, ALLEGATO_3B
  
  // FORMAZIONE
  CORSO_FORMAZIONE, DOCENZA, ATTESTATO
  
  // COMMERCIALE
  BUNDLE, CONVENZIONE, CONSULENZA
  
  // SPESE
  SPESA_FISSA, SPESA_RICORRENTE, RIMBORSO
}
```

#### StatoMovimento
```prisma
enum StatoMovimento {
  BOZZA        // Creato ma non confermato
  CONFERMATO   // Attività eseguita, pronto per fatturazione
  FATTURATO    // Fattura emessa (ENTRATA) o ricevuta (USCITA)
  PAGATO       // Pagamento completato
  ANNULLATO    // Movimento annullato
  STORNATO     // Movimento stornato (nota di credito)
}
```

#### TipoSoggettoMovimento
```prisma
enum TipoSoggettoMovimento {
  PAZIENTE, AZIENDA, DIPENDENTE
  MEDICO, FORMATORE, RSPP, FORNITORE
}
```

---

### 2. Struttura del Modello

```prisma
model MovimentoContabile {
  id String @id @default(uuid())

  // === CLASSIFICAZIONE ===
  direzione DirezioneMovimento     // ENTRATA o USCITA
  tipo      TipoAttivitaMovimento  // Tipo attività
  stato     StatoMovimento @default(BOZZA)

  // === RIFERIMENTO ATTIVITÀ SORGENTE (Polimorfismo) ===
  visitaId          String?  // FK a Visita
  appuntamentoId    String?  // FK a Appuntamento
  appPrestazioneId  String?  // FK a AppuntamentoPrestazione
  sopralluogoId     String?  // FK a Sopralluogo
  dvrId             String?  // FK a DVR
  nominaRuoloId     String?  // FK a NominaRuolo
  courseScheduleId  String?  // FK a CourseSchedule
  bundleId          String?  // FK a OffertaBundle
  giudizioIdoneitaId String? // FK a GiudizioIdoneita
  allegato3bId      String?  // FK a Allegato3B
  refertoId         String?  // FK a Referto

  // === SOGGETTO ===
  tipoSoggetto TipoSoggettoMovimento
  personId               String?  // FK a Person
  companyTenantProfileId String?  // FK a CompanyTenantProfile
  siteId                 String?  // FK a CompanySite

  // === CONTROPARTE (collegamento ENTRATA ↔ USCITA) ===
  movimentoCollegatoId String? @unique

  // === IMPORTI ===
  importoLordo    Decimal  @db.Decimal(10, 2)
  aliquotaIva     Decimal  @default(22) @db.Decimal(5, 2)
  importoIva      Decimal  @default(0) @db.Decimal(10, 2)
  importoNetto    Decimal  @db.Decimal(10, 2)
  ritenutaAcconto Decimal? @db.Decimal(10, 2)  // Per USCITA
  importoDaPagare Decimal? @db.Decimal(10, 2)  // Netto post-ritenute
  scontoApplicato Decimal? @db.Decimal(10, 2)  // Per ENTRATA

  // === CALCOLO COMPENSO (per USCITA) ===
  compensoTipo       TipoCompensoMedico?
  compensoValore     Decimal?  // Percentuale o valore fisso
  importoRiferimento Decimal?  // Base calcolo

  // === DATE ===
  dataEsecuzione    DateTime   // Data attività
  dataRegistrazione DateTime @default(now())
  dataScadenza      DateTime?  // Scadenza pagamento
  dataFatturazione  DateTime?
  dataPagamento     DateTime?

  // === DOCUMENTI ===
  fatturaSanitariaId    String?  // Per ENTRATA pazienti
  fatturaId             String?  // Per ENTRATA aziende corsi
  preventivoId          String?
  numeroFatturaRicevuta String?  // Per USCITA
  fileFatturaRicevuta   String?

  // === PRICING SOURCE ===
  voceTariffarioId   String?  // FK a VoceTariffario
  tariffarioMedicoId String?  // FK a TariffarioMedico
  listinoId          String?  // FK a ListinoPrezzo

  // === PAGAMENTO ===
  metodoPagamento      String?
  riferimentoPagamento String?

  // === METADATA ===
  descrizione String?
  note        String?
  branchType  BranchType @default(MEDICA)
  tenantId    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?  // GDPR soft delete
  createdBy   String?
  updatedBy   String?
}
```

---

## 🔗 Relazioni Implementate

### Entità Sorgente (18 relazioni)

| Entità | Relazione | Tipo Movimento |
|--------|-----------|----------------|
| `Visita` | `MovimentoVisita` | VISITA_MEDICA, VISITA_MDL |
| `Appuntamento` | `MovimentoAppuntamento` | VISITA_MEDICA |
| `AppuntamentoPrestazione` | `MovimentoAppPrestazione` | PRESTAZIONE_CLINICA |
| `Sopralluogo` | `MovimentoSopralluogo` | SOPRALLUOGO_MC/RSPP |
| `DVR` | `MovimentoDvr` | DVR_STESURA/AGGIORNAMENTO |
| `NominaRuolo` | `MovimentoNomina` | NOMINA_MC/RSPP |
| `CourseSchedule` | `MovimentoCourse` | CORSO_FORMAZIONE, DOCENZA |
| `OffertaBundle` | `MovimentoBundle` | BUNDLE |
| `GiudizioIdoneita` | `MovimentoGiudizio` | GIUDIZIO_IDONEITA |
| `Allegato3B` | `MovimentoAllegato3B` | ALLEGATO_3B |
| `Referto` | `MovimentoReferto` | REFERTO |

### Soggetti

| Entità | Relazione | Uso |
|--------|-----------|-----|
| `Person` | `MovimentoPerson` | Paziente/Medico/Formatore/RSPP |
| `CompanyTenantProfile` | `MovimentoCompany` | Azienda cliente |
| `CompanySite` | `MovimentoSite` | Sede per attività MDL |

### Pricing e Fatturazione

| Entità | Relazione | Uso |
|--------|-----------|-----|
| `VoceTariffario` | `MovimentoVoce` | Pricing da tariffario aziendale |
| `TariffarioMedico` | `MovimentoTariffario` | Compensi personalizzati |
| `ListinoPrezzo` | `MovimentoListino` | Pricing da listino |
| `FatturaSanitaria` | `MovimentoFatturaSan` | Fattura verso paziente |
| `Fattura` | `MovimentoFattura` | Fattura verso azienda corsi |
| `Preventivo` | `MovimentoPreventivo` | Preventivo collegato |

---

## 📈 Casi d'Uso

### 1. Visita MDL con Compenso Medico

Quando viene eseguita una visita MDL per un dipendente di un'azienda:

```javascript
// ENTRATA: Fattura ad azienda
{
  direzione: 'ENTRATA',
  tipo: 'VISITA_MDL',
  tipoSoggetto: 'AZIENDA',
  companyTenantProfileId: 'company-uuid',
  visitaId: 'visita-uuid',
  importoNetto: 80.00,
  stato: 'CONFERMATO'
}

// USCITA: Compenso al medico (collegato)
{
  direzione: 'USCITA',
  tipo: 'VISITA_MDL',
  tipoSoggetto: 'MEDICO',
  personId: 'medico-uuid',
  visitaId: 'visita-uuid',
  movimentoCollegatoId: 'entrata-uuid',
  importoNetto: 24.00,  // 30% di 80€
  compensoTipo: 'PERCENTUALE',
  compensoValore: 30,
  importoRiferimento: 80.00,
  stato: 'CONFERMATO'
}
```

### 2. Corso di Formazione con Compenso Formatore

```javascript
// ENTRATA: Fattura ad azienda per corso
{
  direzione: 'ENTRATA',
  tipo: 'CORSO_FORMAZIONE',
  tipoSoggetto: 'AZIENDA',
  companyTenantProfileId: 'company-uuid',
  courseScheduleId: 'schedule-uuid',
  importoNetto: 2000.00,
  stato: 'FATTURATO'
}

// USCITA: Compenso al formatore
{
  direzione: 'USCITA',
  tipo: 'DOCENZA',
  tipoSoggetto: 'FORMATORE',
  personId: 'formatore-uuid',
  courseScheduleId: 'schedule-uuid',
  movimentoCollegatoId: 'entrata-uuid',
  importoNetto: 600.00,
  ritenutaAcconto: 120.00,  // 20%
  importoDaPagare: 480.00,
  stato: 'CONFERMATO'
}
```

### 3. Sopralluogo MC

```javascript
// ENTRATA: Fattura ad azienda
{
  direzione: 'ENTRATA',
  tipo: 'SOPRALLUOGO_MC',
  tipoSoggetto: 'AZIENDA',
  companyTenantProfileId: 'company-uuid',
  sopralluogoId: 'sopralluogo-uuid',
  voceTariffarioId: 'voce-uuid',
  importoNetto: 200.00,
  stato: 'CONFERMATO'
}

// USCITA: Compenso al MC
{
  direzione: 'USCITA',
  tipo: 'SOPRALLUOGO_MC',
  tipoSoggetto: 'MEDICO',
  personId: 'mc-uuid',
  sopralluogoId: 'sopralluogo-uuid',
  tariffarioMedicoId: 'tariffario-uuid',
  importoNetto: 140.00,  // 70% del prezzo
  stato: 'CONFERMATO'
}
```

---

## 🔍 Query di Esempio

### Dashboard Finanziaria

```sql
-- Totale ENTRATE vs USCITE per mese
SELECT 
  DATE_TRUNC('month', data_esecuzione) AS mese,
  direzione,
  SUM(importo_netto) AS totale
FROM movimenti_contabili
WHERE tenant_id = ? 
  AND deleted_at IS NULL
  AND stato NOT IN ('ANNULLATO', 'BOZZA')
GROUP BY mese, direzione
ORDER BY mese DESC;
```

### Aging Report Pagamenti

```sql
-- Movimenti con scadenza superata non ancora pagati
SELECT 
  mc.*,
  p.first_name || ' ' || p.last_name AS soggetto,
  CURRENT_DATE - data_scadenza AS giorni_ritardo
FROM movimenti_contabili mc
LEFT JOIN persons p ON mc.person_id = p.id
WHERE mc.tenant_id = ?
  AND mc.stato = 'CONFERMATO'
  AND mc.data_scadenza < CURRENT_DATE
ORDER BY giorni_ritardo DESC;
```

### Compensi Professionista

```sql
-- Report compensi per medico/formatore
SELECT 
  p.first_name || ' ' || p.last_name AS professionista,
  mc.tipo,
  COUNT(*) AS num_attivita,
  SUM(mc.importo_netto) AS totale_compensi,
  SUM(CASE WHEN mc.stato = 'PAGATO' THEN mc.importo_netto ELSE 0 END) AS pagato,
  SUM(CASE WHEN mc.stato != 'PAGATO' THEN mc.importo_netto ELSE 0 END) AS da_pagare
FROM movimenti_contabili mc
JOIN persons p ON mc.person_id = p.id
WHERE mc.tenant_id = ?
  AND mc.direzione = 'USCITA'
  AND mc.tipo_soggetto IN ('MEDICO', 'FORMATORE', 'RSPP')
GROUP BY p.id, mc.tipo
ORDER BY totale_compensi DESC;
```

---

## 🔐 GDPR Compliance

- ✅ **Soft delete**: Campo `deletedAt` per cancellazione logica
- ✅ **Audit trail**: Campi `createdBy`, `updatedBy`, `createdAt`, `updatedAt`
- ✅ **Multi-tenancy**: Campo `tenantId` obbligatorio con indice
- ✅ **Cascade delete**: Relazioni con `onDelete: SetNull` per sicurezza

---

## 📊 Indici Ottimizzati

```prisma
@@index([tenantId])
@@index([tenantId, direzione])
@@index([tenantId, tipo])
@@index([tenantId, stato])
@@index([tenantId, branchType])
@@index([tenantId, dataEsecuzione])
@@index([tenantId, dataScadenza])
@@index([personId])
@@index([companyTenantProfileId])
@@index([visitaId])
@@index([sopralluogoId])
@@index([dvrId])
@@index([nominaRuoloId])
@@index([courseScheduleId])
@@index([stato, dataScadenza])      // Per aging report
@@index([direzione, stato])          // Per dashboard COSTI vs RICAVI
```

---

## � API Endpoints

**Base URL**: `/api/v1/movimenti-contabili`

### Endpoint Pubblici (no auth)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/health` | Health check del modulo |

### Endpoint Autenticati

| Metodo | Endpoint | Permessi | Descrizione |
|--------|----------|----------|-------------|
| GET | `/enums` | `movimenti_contabili:read` | Ottieni enums per dropdown |
| GET | `/` | `movimenti_contabili:read` | Lista con filtri e paginazione |
| GET | `/:id` | `movimenti_contabili:read` | Dettaglio singolo movimento |
| POST | `/` | `movimenti_contabili:write` | Crea nuovo movimento |
| POST | `/pair` | `movimenti_contabili:write` | Crea coppia ENTRATA/USCITA |
| PUT | `/:id` | `movimenti_contabili:write` | Aggiorna (solo BOZZA) |
| PATCH | `/:id/stato` | `movimenti_contabili:write` | Cambia stato |
| DELETE | `/:id` | `movimenti_contabili:delete` | Soft delete (GDPR) |

### Report

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/reports/totali` | Report totali per periodo |
| GET | `/reports/aging` | Aging scadenze pagamenti |
| GET | `/reports/compensi` | Compensi professionisti |
| POST | `/calcola-compenso` | Calcola compenso da tariffario |

### Query Parameters (GET `/`)

| Param | Tipo | Descrizione |
|-------|------|-------------|
| `direzione` | string | `ENTRATA` o `USCITA` |
| `tipo` | string | Tipo attività |
| `stato` | string | Stato movimento |
| `tipoSoggetto` | string | Tipo soggetto |
| `personId` | uuid | ID persona |
| `companyTenantProfileId` | uuid | ID azienda |
| `branchType` | string | `MEDICA` o `FORMAZIONE` |
| `dataEsecuzioneDa` | ISO8601 | Filtro data da |
| `dataEsecuzioneA` | ISO8601 | Filtro data a |
| `page` | number | Pagina (default: 1) |
| `pageSize` | number | Elementi per pagina (max 100) |

### Esempio: Creazione Movimento

```bash
curl -X POST "/api/v1/movimenti-contabili" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "direzione": "ENTRATA",
    "tipo": "VISITA_MEDICA",
    "tipoSoggetto": "PAZIENTE",
    "importoLordo": "100.00",
    "importoNetto": "81.97",
    "aliquotaIva": "22.00",
    "importoIva": "18.03",
    "dataEsecuzione": "2026-01-25T10:00:00Z",
    "descrizione": "Visita specialistica",
    "branchType": "MEDICA"
  }'
```

### Esempio: Creazione Coppia ENTRATA/USCITA

```bash
curl -X POST "/api/v1/movimenti-contabili/pair" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entrata": {
      "direzione": "ENTRATA",
      "tipo": "VISITA_MDL",
      "tipoSoggetto": "AZIENDA",
      "companyTenantProfileId": "uuid-azienda",
      "importoLordo": "100.00",
      "importoNetto": "81.97",
      "dataEsecuzione": "2026-01-25T10:00:00Z"
    },
    "uscita": {
      "direzione": "USCITA",
      "tipo": "VISITA_MDL",
      "tipoSoggetto": "MEDICO",
      "personId": "uuid-medico",
      "importoNetto": "24.00",
      "compensoTipo": "PERCENTUALE",
      "compensoValore": 30,
      "dataEsecuzione": "2026-01-25T10:00:00Z"
    }
  }'
```

---

## ✅ Test Completati

| Test | Stato | Note |
|------|-------|------|
| Health Check | ✅ | No auth required |
| CREATE movimento | ✅ | Prisma test OK |
| READ by ID | ✅ | Prisma test OK |
| UPDATE movimento | ✅ | Prisma test OK |
| LIST con filtri | ✅ | Prisma test OK |
| Aggregazioni (report) | ✅ | Sum, count OK |
| Soft Delete GDPR | ✅ | deletedAt populated |
| Esclusione soft-deleted | ✅ | Excluded from queries |

**Script di test**: 
- `backend/scripts/test-movimento-contabile.sh` - Test API endpoints
- `backend/scripts/test-movimento-service.js` - Test Prisma diretto

---

## �️ UI Components Implementati

### Routes (`/management/movimenti-contabili`)

| Route | Componente | Descrizione |
|-------|------------|-------------|
| `/movimenti-contabili` | `MovimentiContabiliPage` | Lista movimenti con filtri e paginazione |
| `/movimenti-contabili/dashboard` | `MovimentiContabiliDashboard` | Dashboard KPIs e widgets |
| `/movimenti-contabili/nuovo` | `MovimentoContabileForm` | Form creazione |
| `/movimenti-contabili/:id` | `MovimentoContabileDetails` | Dettaglio movimento |
| `/movimenti-contabili/:id/modifica` | `MovimentoContabileForm` | Form modifica |
| `/movimenti-contabili/aging` | `AgingReportPage` | Report scadenze |

### Componenti

#### MovimentiContabiliDashboard
- KPI cards (totali ENTRATA/USCITA, saldo, scaduti)
- Aging report widget
- Liste scaduti e in scadenza
- Quick actions

#### MovimentiContabiliPage
- Filtri: direzione, stato, tipo, branch, ricerca
- Tabella con azioni bulk
- Export Excel/PDF
- Paginazione

#### MovimentoContabileForm
- Calcolo automatico IVA
- Selezione soggetto
- Gestione compensi professionisti
- Validazione client-side

#### MovimentoContabileDetails
- Visualizzazione importi
- Timeline stato
- Azioni: modifica, elimina, registra pagamento
- Link a entità correlate

#### AgingReportPage
- Report per fascia temporale (1-30, 31-60, 61-90, 90+)
- Filtri branch/direzione
- Export Excel
- Stampa

### Services e Hooks

| File | Descrizione |
|------|-------------|
| `src/services/movimentiContabiliService.ts` | API client completo |
| `src/hooks/management/useMovimentiContabili.ts` | React Query hooks |

---

## 🚀 Prossimi Passi

1. ~~**Migrazione DB**: Creare migration per il nuovo modello~~ ✅
2. ~~**Service Layer**: Implementare `MovimentoContabileService`~~ ✅
3. ~~**API Routes**: Endpoint CRUD per movimenti~~ ✅
4. ~~**UI Components**: Dashboard finanziaria, aging report~~ ✅
5. **Automazione**: Trigger per generare movimenti da attività eseguite

---

## 📚 Riferimenti

- [schema.prisma - MovimentoContabile](../../backend/prisma/schema.prisma#L7000)
- [TariffarioMedico](../../backend/prisma/schema.prisma#L4690)
- [VoceTariffario](../../backend/prisma/schema.prisma#L5910)
- [D.Lgs 81/08 - Testo Unico Sicurezza](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2008-04-09;81)

---

## 📝 Changelog

| Data | Versione | Modifica |
|------|----------|----------|
| 28/01/2026 | 1.3 | **Fix modal companies/:id**: 1) DVR/Sopralluogo upload error 500 (rimozione campo `documento` da updateData), 2) Dropdown stato sopralluogo (PROGRAMMATO/ESEGUITO/CONFORME/CON_PRESCRIZIONI/NON_CONFORME), 3) Fix apiGet call signatures per edit mode, 4) Pulsante Eye quick look PDF in MDLServicesCard |
| 26/01/2026 | 1.2 | UI Components: Dashboard, Lista, Form, Dettaglio, AgingReport |
| 25/01/2026 | 1.1 | Aggiunta sezione API, test completati |
| 24/01/2026 | 1.0 | Implementazione modello MovimentoContabile |
