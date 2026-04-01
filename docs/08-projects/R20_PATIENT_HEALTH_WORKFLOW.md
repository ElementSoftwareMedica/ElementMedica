# R20 — Patient Health Profile, Cartella Sanitaria & Allegati Workflow

**Session**: R20  
**Status**: ✅ Completato (R20+R21)  
**Date**: 2025  
**Areas**: Clinical, Backend, Frontend, DB Schema  

---

## 📋 Obiettivi

1. **AllegatiUploadModal fix** — Duplicate declaration error corretto ✅
2. **CartellaSanitariaModal** — Quicklook completo storico visite paziente ✅
3. **LaboratorioAnalisi section** — Sezione esami di laboratorio in QuickActions ✅
4. **AllegatoQuickLookModal** — Anteprima rapida allegati (immagini, PDF) ✅
5. **ProfiloDiSalutePersona** — Entità completa salute paziente (DB → Backend → Frontend) ✅
6. **ProfiloSaluteCard** — Componente UI per visualizzazione/modifica profilo ✅
7. **Access Control** — `accessControl Json?` su `AllegatoVisita` ✅
8. **AllegatoEditorModal** — Editor canvas PDF/immagini (testo, firma, timbro) ✅
9. **Legacy cleanup** — Rimozione file legacy ✅ (R21)
10. **CSV import → ProfiloDiSalute** — Import da Excel/CSV per dati salute 🔄 TODO

---

## ✅ Completato

### DB Schema Changes (`backend/prisma/schema.prisma`)

#### Nuovo modello `ProfiloDiSalutePersona`
```prisma
model ProfiloDiSalutePersona {
    id                    String   @id @default(cuid())
    personId              String
    tenantId              String
    // Invalidità
    hasInvalidita         Boolean  @default(false)
    tipoInvalidita        String?
    gradoInvalidita       Int?
    legge104              Boolean  @default(false)
    legge104Grado         Int?
    // Abitudini
    fumatore              String?  // non_fumatore | ex_fumatore | occasionale | fumatore
    sigaretteGiorno       Int?
    anniFumo              Int?
    alcol                 String?  // non_bevitore | occasionale | moderato | eccessivo
    unitaAlcolSettimana    Int?
    attivitaFisica        String?  // sedentario | leggera | moderata | intensa
    oreAttivitaSettimana   Int?
    alimentazione         String?
    porzioniFruttaVerdure  Int?
    // DPI
    usaDpiPersonali       Boolean  @default(false)
    dpiPersonali          String[]
    dpiAzienda            String[]
    altriDpiAzienda       String?
    usaMezziAziendali     Boolean  @default(false)
    mezziAziendali        String[]
    altriMezziAziendali   String?
    noteSalute            String?
    deletedAt             DateTime?
    createdAt             DateTime @default(now())
    updatedAt             DateTime @updatedAt
    person                Person   @relation(fields: [personId], references: [id])
    @@unique([personId, tenantId])
    @@map("profili_salute_persone")
}
```

#### Modifica `AllegatoVisita`
- Aggiunto `accessControl Json?` per controllo accessi per specialità/ruolo sui singoli allegati

---

### Backend

#### `backend/services/clinical/ProfiloDiSaluteService.js`
- `getByPerson(personId, tenantId)` — findUnique per compound key
- `upsert(personId, tenantId, data)` — upsert con sanitizzazione campi
- `softDelete(personId, tenantId)` — soft delete GDPR-compliant

#### `backend/routes/clinica/profilo-salute.routes.js`
- `GET /api/v1/clinica/profilo-salute/persona/:personId`
- `PUT /api/v1/clinica/profilo-salute/persona/:personId`
- `DELETE /api/v1/clinica/profilo-salute/persona/:personId`

#### `backend/routes/clinica/documenti-clinici.routes.js`
- Aggiunto `GET /api/v1/clinica/documenti/paziente/:personId`
- Query param: `tipologiaClinica` (CSV) per filtrare per tipo
- Restituisce allegati di TUTTE le visite del paziente con nested visita info

---

### Frontend

#### `src/services/clinicaApi.ts`
- Aggiunto `ProfiloDiSalute` interface
- Aggiunto `FUMATORE_LABELS`, `ALCOL_LABELS`, `ATTIVITA_FISICA_LABELS`
- Aggiunto `DPI_PERSONALI_OPTIONS`, `DPI_AZIENDA_OPTIONS`, `MEZZI_AZIENDALI_OPTIONS`
- Aggiunto `profiloDiSaluteApi`: `getByPerson`, `upsert`, `delete`
- Aggiunto `documentiCliniciApi.getAllegatiPaziente(personId, tipologiaClinica?)`

#### `src/pages/clinica/clinica/components/CartellaSanitariaModal.tsx` (NUOVO)
- Modal fullscreen con timeline visite per anno
- Filtro ricerca per prestazione/diagnosi
- Selezione per anno con tab navigation
- Expand singola visita: diagnosi, anamnesi, terapia, note (da `datiStrutturati`)
- Pulsante "Apri visita completa" → `onOpenVisita(visitaId)`
- Integrato in `QuickActionsIntegrated` — sostituisce `onViewHistory` con modal inline

#### `src/pages/clinica/clinica/components/QuickActionsIntegrated.tsx` (MODIFICATO)
- Aggiunta import `CartellaSanitariaModal`
- Aggiunto `patientName?: string` prop
- Integrato `CartellaSanitariaModal` — "Visite Precedenti → Apri Tutto" apre il modal
- Aggiunta sezione **LaboratorioAnalisi** (`id="laboratorio"`, `FlaskConical` icon):
  - Query interna via `documentiCliniciApi.getAllegatiPaziente`
  - Filtra per: ESAMI_SANGUE, ECG, AUDIOMETRIA, SPIROMETRIA, RADIOGRAFIA, ESAMI_URINE
  - Badge con conteggio, tipologiaClinica pill, data esecuzione, link download

#### `src/pages/clinica/clinica/VisitaPage.tsx` (MODIFICATO)
- Aggiunto `patientName={...}` a tutte e 3 le istanze di `QuickActionsIntegrated`

#### `src/components/clinica/AllegatoQuickLookModal.tsx` (NUOVO)
- Anteprima rapida allegati clinici
- Immagini: zoom + rotazione
- PDF: iframe embedded viewer
- Altri file: download + apri in nuova tab
- Toolbar: zoom, rotazione, download, apri, modifica (callback), chiudi
- Props: `isOpen`, `onClose`, `allegato: AllegatoQuickLookItem`, `onEdit?`

#### `src/components/clinica/ProfiloSaluteCard.tsx` (NUOVO)
- Card leggibile per profilo salute paziente/dipendente
- Vista compatta con sezioni: Invalidità, Abitudini, DPI Personali, DPI Azienda, Mezzi Aziendali
- Edit mode: form completo con select, checkbox, CheckboxGroup multi-select
- Salvataggio tramite `profiloDiSaluteApi.upsert`
- Usabile in: EmployeeDetail (tab "Salute & Sicurezza"), VisitaPage (sidebar)
- Props: `personId`, `compact?`, `isReadonly?`

---

## 🔄 In Progress / TODO

### Access Control Enforcement (Backend)
- ✅ Completato in R21 — vedere `docs/08-projects/R21_QUICKACTIONS_ALLEGATI_PROFILOSALUTE.md`

### AllegatoEditorModal
- ✅ Completato in R20/R21 — Canvas HTML5 nativo (no Fabric.js)
- Tools: penna, testo, timbro medico template
- Integrato in `QuickActionsIntegrated` (R21)

### CSV/Excel Import per ProfiloDiSalute
- Import bulk da file HR con dati invalidità, DPI, abitudini
- Mapping colonne CSV → ProfiloDiSalute fields
- Validazione e report errori

### ProfiloSaluteCard in EmployeeDetail
- Aggiungere tab "Salute & Sicurezza" in `src/pages/employees/EmployeeDetail.tsx`
- Include `<ProfiloSaluteCard personId={employee.personId} />`

---

## 🏗️ Architettura

```
QuickActionsIntegrated
├── CartellaSanitariaModal     ← "Visite Precedenti" onOpenFull
│   └── VisitaRow (expand)    ← datiStrutturati.diagnosi/anamnesi/terapia
├── LaboratorioAnalisi section ← documentiCliniciApi.getAllegatiPaziente
│   └── allegati filtered     ← ESAMI_SANGUE, ECG, AUDIOMETRIA, etc.
└── Allegati section           ← (esistente)
    └── AllegatoQuickLookModal ← onClick allegato (TODO: integrazione)

ProfiloSaluteCard
└── profiloDiSaluteApi        ← GET/PUT /clinica/profilo-salute/persona/:id
    └── ProfiloDiSalutePersona ← profili_salute_persone table
```

---

## 🗄️ Database

**Tabella**: `profili_salute_persone`  
**Chiave unica**: `(personId, tenantId)` — un profilo per persona per tenant  
**Soft delete**: `deletedAt DateTime?` — GDPR compliant

**Migration**: Applicata via `prisma db push` (non usa shadow DB)

---

## 📌 Note Tecniche

- `Visita.datiStrutturati` (tipo `Json?`) contiene i dati clinici strutturati del template. Nel `CartellaSanitariaModal` vengono usati i campi `diagnosiPrincipale`, `diagnosi`, `anamnesi`, `terapia`, `noteClinico`, `note` con optional chaining.
- `AllegatoVisita.accessControl` è di tipo `Json?` — struttura analoga a `Visita.accessControl` (`allowedSpecialties`, `allowedPersonIds`, ecc.)
- I componenti `ProfiloSaluteCard` e `AllegatoQuickLookModal` sono esportati dal barrel `src/components/clinica/index.ts`
- `CartellaSanitariaModal` è esportato dal barrel `src/pages/clinica/clinica/components/index.ts`
