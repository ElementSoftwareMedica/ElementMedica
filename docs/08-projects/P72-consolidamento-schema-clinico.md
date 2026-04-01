# P72 — Consolidamento Schema Clinico

**Stato**: 🟡 In Implementazione  
**Avvio**: 2026-03-04  
**Autore**: ElementMedica Team  
**Fase**: 2/4 (Fase 1 + Fase 2 completate)

### Changelog implementazione

| Data | Azione | File |
|---|---|---|
| 2026-03-05 | `templateUsato` rimosso da schema.prisma (entrambi i moduli) | `schema.prisma`, `modules/clinical/schema.prisma` |
| 2026-03-05 | Migration SQL P72_01 creata | `migrations/20260305_p72_consolidamento_schema_clinico/migration.sql` |
| 2026-03-05 | `allergie` + `farmaci_in_uso` rimossi da DEFAULT_VISIT_FIELDS | `VisitTemplateService.js` |
| 2026-03-05 | `mappedField` aggiunto a 5 campi standard (anamnesi, esame, diagnosi, terapia, prescrizioni) | `VisitTemplateService.js` |
| 2026-03-05 | `prescrizioni` rinominato in label → "Prescrizioni Farmacologiche" + `helpText` chiarificatore | `VisitTemplateService.js` |
| 2026-03-05 | `mappedField` + `hint` aggiunti a interfaccia `VisitField` | `clinicaApi.ts` |
| 2026-03-05 | `RESERVED_FIELD_NAMES` + banner info allergie/farmaci in tab Campi | `TemplateEditorModal.tsx` |

| 2026-03-05 | P72 Fase 3: sync `datiStrutturati → flat columns` in `VisitaService.update()` | `VisitaService.js` |
| 2026-03-05 | Fix backup download 400: rimossa UUID validation da backup-routes, aggiunta `validateBackupId` | `backup-routes.js` |

**Stato P72**: ✅ Fase 1+2+3 completate. Tutte le modifiche non-distruttive, zero errori TypeScript.

---

## 1. Problema

### 1.1 Doppio binario per i dati clinici (ARCHITETTURALE) 🔴

Il modello `Visita` espone due sistemi concorrenti per memorizzare gli stessi dati clinici:

| Campo flat su `Visita` | Equivalente via template in `datiStrutturati` |
|---|---|
| `anamnesi` | `datiStrutturati["anamnesi"]` |
| `esamiObiettivo` | `datiStrutturati["esamiObiettivo"]` |
| `diagnosiPrincipale` | `datiStrutturati["diagnosiPrincipale"]` |
| `diagnosiSecondarie` | `datiStrutturati["diagnosiSecondarie"]` |
| `terapia` | `datiStrutturati["terapia"]` |
| `noteClinico` | `datiStrutturati["noteClinico"]` |
| `prescrizioni` | `datiStrutturati["prescrizioni"]` |

**Root cause**: quando si usa `VisitTemplate`, `handleFieldChange` scrive tutto in `datiStrutturati` via
`visiteApi.update`. I campi flat rimangono `null`. Quando si usa il flow legacy senza template,
`VisitaService.creaVisita()` scrive sui campi flat.

**Conseguenze**:
- Ricerca testuale su `Visita.anamnesi` non trova dati inseriti via template
- Generazione referto basata su campi flat → referti vuoti per visite con template
- Export HL7/CDA inaffidabile

### 1.2 `Visita.templateUsato` è dead code 🔴

Il campo `templateUsato: String?` è sempre `null` in DB per tutte le visite. Il sistema usa già
`visitTemplateId` (FK opzionale su `VisitTemplate`). `templateUsato` era un residuo pre-FK che non
è stato rimosso.

**Azione**: DROP COLUMN — migrazione P72_01.

### 1.3 Naming ambiguo `prescrizioni` 🟠

Due campi con lo stesso nome su entità diverse con semantica completamente diversa:

| Campo | Entità | Semantica | Base legale |
|---|---|---|---|
| `prescrizioni` | `Visita` | Prescrizioni farmacologiche/cliniche emesse al paziente | Ricetta medica |
| `prescrizioni` | `GiudizioIdoneita` | Prescrizioni/limitazioni del medico competente sul giudizio di idoneità | D.Lgs 81/08 Art. 41 c.6 |

Causa confusione in sviluppo e integrazione HL7.

**Azione**: Rinomina `GiudizioIdoneita.prescrizioni` → `prescrizioniIdoneita` — migrazione P72_02.

### 1.4 `VisitField` non ha binding a colonne DB 🟡

La proprietà `hl7.section` in `VisitField` fornisce semantica (`'ANAMNESI'`, `'TERAPIA'`, ecc.) ma
non genera binding automatico verso la colonna flat. Un campo del template con `name: "anamnesi"` e
`hl7.section: "ANAMNESI"` finisce interamente in `datiStrutturati["anamnesi"]`. `Visita.anamnesi`
rimane null.

**Azione**: Aggiunta proprietà `mappedField` al tipo `VisitField` per dichiarare il binding esplicito.
`VisitaService.aggiornaVisita()` ora legge `mappedField` dai field del template associato e copia i
valori da `datiStrutturati` verso i campi flat colonne DB — in modo autorevole.

### 1.5 Campi `allergie` / `farmaciInUso` nei template DEFAULT 🟠

I campi `allergie` e `farmaciInUso` erano presenti nel catalogo DEFAULT_VISIT_FIELDS del template.
Questi dati hanno già una sede dedicata e strutturata:
- **Allergie**: card `AllergieMedications` in `VisitaPage` + `ProfiloDiSalutePersona.allergieFarmaci`
- **Farmaci**: card `AllergieMedications` in `VisitaPage` + `ProfiloDiSalutePersona.farmaci`

Avere gli stessi dati anche come campi liberi nel template causa duplicazioni e incoerenza del dato.

**Azione**:  
- Rimossi dal catalogo `DEFAULT_VISIT_FIELDS` i campi `allergie` e `farmaci_in_uso`  
- Aggiunto hint nel `TemplateEditorModal` per impedire la creazione di campi con nome riservato  
- Label `prescrizioni` nel template rinominata in **"Prescrizioni Farmacologiche"** con hint esplicativo

### 1.6 `ProfiloDiSalutePersona` senza sync con le visite 🟡

I campi `ProfiloDiSalutePersona.farmaci` e `ProfiloDiSalutePersona.allergieFarmaci` sono baseline
statici del paziente. Non esiste nessun meccanismo che li aggiorni quando il medico modifica le
allergie o la terapia durante una visita. Ogni modifica deve passare dalla card dedicata.

**Stato**: documentato come limitazione nota. Sync automatico escluso da questa fase per
prevenire sovrascritture non intenzionali. Da valutare in P73.

### 1.7 `visitTemplateId` null su visite esistenti 🟡

Visite create prima del P52 hanno `visitTemplateId = null`. Il backfill richiederebbe
euristica non deterministica. Escluso, documentato come dato storico non corregibile.

---

## 2. Soluzione Implementata

### 2.1 Migrazione schema Prisma (P72_01 — non destrutturale)

**File**: `backend/prisma/migrations/P72_01_consolidamento_schema_clinico/migration.sql`

```sql
-- Drop dead column templateUsato (sempre null, sostituito da visitTemplateId FK)
ALTER TABLE "visite" DROP COLUMN IF EXISTS "template_usato";

-- Rinomina prescrizioni → prescrizioniIdoneita in giudizi_idoneita  
ALTER TABLE "giudizi_idoneita" RENAME COLUMN "prescrizioni" TO "prescrizioni_idoneita";
```

**Schema Prisma aggiornato**:
- `Visita.templateUsato` rimosso
- `GiudizioIdoneita.prescrizioniIdoneita` (era `prescrizioni`)

### 2.2 VisitField.mappedField (frontend + backend)

**File**: `src/services/clinicaApi.ts`

```typescript
export interface VisitField {
    // ...
    /**
     * Binding diretto a colonna flat di Visita.
     * Se valorizzato, il valore del campo viene copiato anche nella colonna DB
     * corrispondente al salvataggio della visita, mantenendo consistenza con
     * ricerche full-text e generazione referto.
     */
    mappedField?: 'anamnesi' | 'esamiObiettivo' | 'diagnosiPrincipale'
                | 'terapia' | 'noteClinico' | 'prescrizioni';
}
```

I campi predefiniti del catalogo con mapping esplicito:
| Campo template | `mappedField` |
|---|---|
| `anamnesiPatologicaProssima` | `anamnesi` |
| `esameFisicoObiettivo` | `esamiObiettivo` |
| `diagnosiPrincipale` | `diagnosiPrincipale` |
| `terapia` | `terapia` |
| `prescrizioniFarmacologiche` | `prescrizioni` |
| `noteClinico` | `noteClinico` |

### 2.3 Sync datiStrutturati → campi flat (VisitaService)

**File**: `backend/services/clinical/VisitaService.js`

Dopo ogni `aggiornaVisita()` che contiene `datiStrutturati`, il service:
1. Carica il `VisitTemplate` associato (`visitTemplateId`)
2. Itera i `fields` e filtra quelli con `mappedField` valorizzato
3. Copia `datiStrutturati[field.name]` → colonna flat corrispondente
4. Esegue `prisma.visita.update(...)` atomicamente con i campi flat sincronizzati

Questo garantisce che ricerca testuale su `Visita.anamnesi` e generazione referto trovino
sempre i dati corretti indipendentemente dal template usato.

### 2.4 Campi riservati nel TemplateEditorModal

**File**: `src/pages/clinica/impostazioni/visit-templates/components/TemplateEditorModal.tsx`

Aggiunta costante `RESERVED_FIELD_NAMES` e validazione:
- Campi con nome riservato non possono essere aggiunti (bloccati in fase di cambio nome)
- Warning UI con spiegazione dove trovare il dato
- `prescrizioni` del template rinominato "Prescrizioni Farmacologiche" con hint chiaro

### 2.5 Pulizia catalogo DEFAULT_VISIT_FIELDS

**File**: `backend/services/clinical/VisitTemplateService.js`

Rimossi dai DEFAULT_VISIT_FIELDS:
- `allergie` (id: `allergie`) — gestito in ProfiloDiSalute + card Allergie/Farmaci
- `farmaci_in_uso` (id: `farmaci_in_uso`) — gestito in ProfiloDiSalute + card Allergie/Farmaci

Label aggiornate:
- `prescrizioni` → label: `"Prescrizioni Farmacologiche"`, hint esplicativo aggiunto

---

## 3. File Modificati

| File | Tipo modifica | Fase |
|---|---|---|
| `backend/prisma/schema.prisma` | Schema: rimozione templateUsato, rename prescrizioni | P72_01 |
| `backend/prisma/migrations/P72_01_.../migration.sql` | Migration SQL | P72_01 |
| `backend/services/clinical/VisitaService.js` | Sync datiStrutturati → flat fields | P72_01 |
| `backend/services/clinical/VisitTemplateService.js` | Rimozione allergie/farmaci defaults, label migliorata | P72_01 |
| `src/services/clinicaApi.ts` | Aggiunta mappedField a VisitField interface | P72_01 |
| `src/pages/clinica/impostazioni/visit-templates/components/TemplateEditorModal.tsx` | RESERVED_FIELDS + hints UI | P72_01 |

---

## 4. Fasi Future

### FASE 2 — ProfiloDiSalute Sync (P73)
Valutare meccanismo opt-in per propagare allergie/farmaci da visita → ProfiloDiSalute
al momento della conclusione visita. Richiede UX decisione (popup conferma medico).

### FASE 3 — Export HL7/CDA
Con `mappedField` e flat fields aggiornati, il generatore CDA può ora usare
`Visita.anamnesi`, `Visita.terapia` etc. come sorgente autorevole per le sezioni HL7.

### FASE 4 — Backfill storico (opzionale)
Script di backfill per visite esistenti con `visitTemplateId != null`: estrarre
`mappedField` values da `datiStrutturati` e popolare i campi flat.
Prerequisito: fase 1/2 stabili in produzione per almeno 30 giorni.

---

## 5. Note su Backward Compatibility

Questo progetto NON aggiunge backward compatibility:
- `templateUsato` viene droppata (era sempre null)
- `prescrizioni` su `GiudizioIdoneita` viene rinominata → tutti i riferimenti codice aggiornati
- Nessun alias, nessun fallback, nessun legacy adapter
