# 🔧 SPEC_04: Inventario Strumentario

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Collegato a**: [SPEC_02_AMBULATORI.md](./SPEC_02_AMBULATORI.md), [SPEC_03_PRESTAZIONI.md](./SPEC_03_PRESTAZIONI.md)

---

## 1. OVERVIEW

Il sistema di gestione strumentario traccia tutti gli strumenti/apparecchiature medicali del poliambulatorio, inclusi:
- Dati acquisto e ammortamento
- Manutenzioni programmate e straordinarie
- Assegnazione ad ambulatori
- Calcolo ROI e costi operativi

### 1.1 Stati Strumento

| Stato | Descrizione | Azioni Possibili |
|-------|-------------|------------------|
| ATTIVO | Funzionante, disponibile | Usa, Manutenzione |
| IN_MANUTENZIONE | Temporaneamente non disponibile | - |
| GUASTO | Richiede riparazione | Riparazione, Dismissione |
| DISMESSO | Non più utilizzabile | - |
| IN_ORDINE | Ordinato, non ancora arrivato | Ricevi |

---

## 2. ENTITÀ DATABASE

### 2.1 Modello Strumento

```prisma
model Strumento {
  id                    String   @id @default(uuid())
  
  // Identificazione
  nome                  String               // "Ecografo Philips"
  codice                String?              // Codice interno inventario
  codiceFornitore       String?              // Codice fornitore
  seriale               String?              // Numero seriale
  
  // Classificazione
  categoria             String?              // "Diagnostica per immagini"
  sottocategoria        String?              // "Ecografi"
  marca                 String?
  modello               String?
  
  // Stato
  stato                 StatoStrumento       @default(ATTIVO)
  motivoStatoNote       String?              // Note cambio stato
  
  // Acquisto
  dataAcquisto          DateTime?
  prezzoAcquisto        Decimal?  @db.Decimal(10,2)
  fornitore             String?
  numeroFattura         String?
  
  // Garanzia
  dataFineGaranzia      DateTime?
  tipoGaranzia          String?              // "Estesa 3 anni"
  contattoGaranzia      String?
  
  // Ammortamento
  anniAmmortamento      Int       @default(5)
  valoreResiduoPercent  Float     @default(0)    // % valore residuo a fine ammortamento
  
  // Manutenzione programmata
  intervalloManutenzione Int?                    // Giorni tra manutenzioni
  prossimaManutenzioneProgrammata DateTime?
  
  // Costi operativi
  costoOrarioStimato    Decimal?  @db.Decimal(8,2)  // Per calcolo ROI
  
  // Ubicazione
  ubicazioneDefault     String?              // Se non assegnato ad ambulatorio
  
  // Documentazione
  manualeUrl            String?              // Link manuale PDF
  certificazioniUrl     String[]             // Certificazioni CE, etc.
  fotoUrl               String?
  note                  String?   @db.Text
  
  // Relazioni
  ambulatoriStrumento   StrumentoAmbulatorio[]
  manutenzioni          ManutenzioneStrumento[]
  prestazioniStrumento  PrestazioneStrumento[]
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  deletedAt             DateTime?
  
  @@unique([tenantId, codice])
  @@index([tenantId])
  @@index([stato])
  @@index([categoria])
}

enum StatoStrumento {
  ATTIVO
  IN_MANUTENZIONE
  GUASTO
  DISMESSO
  IN_ORDINE
}
```

### 2.2 Modello Manutenzione

```prisma
model ManutenzioneStrumento {
  id                    String   @id @default(uuid())
  
  // Strumento
  strumentoId           String
  strumento             Strumento @relation(fields: [strumentoId], references: [id])
  
  // Tipo manutenzione
  tipo                  TipoManutenzione     @default(PROGRAMMATA)
  descrizione           String
  
  // Timing
  dataProgrammata       DateTime?            // Data prevista
  dataEsecuzione        DateTime?            // Data effettiva
  durataOre             Float?               // Ore di lavoro
  
  // Esecutore
  esecutore             String?              // Nome tecnico/ditta
  contattoEsecutore     String?
  
  // Costi
  costoManodopera       Decimal?  @db.Decimal(8,2)
  costoRicambi          Decimal?  @db.Decimal(8,2)
  costoTotale           Decimal?  @db.Decimal(10,2)
  numeroFatturaManutenzione String?
  
  // Esito
  stato                 StatoManutenzione    @default(PROGRAMMATA)
  esitoNote             String?   @db.Text
  prossimaScadenza      DateTime?            // Prossima manutenzione consigliata
  
  // Documentazione
  rapportoUrl           String?              // Rapporto tecnico PDF
  allegatiUrl           String[]
  
  // Multi-tenancy
  tenantId              String
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@index([tenantId])
  @@index([strumentoId])
  @@index([stato])
  @@index([dataProgrammata])
}

enum TipoManutenzione {
  PROGRAMMATA           // Manutenzione ordinaria schedulata
  STRAORDINARIA         // Riparazione non prevista
  CALIBRAZIONE          // Calibrazione strumento
  VERIFICA_SICUREZZA    // Verifiche sicurezza obbligatorie
  PULIZIA               // Pulizia/sanificazione
  AGGIORNAMENTO         // Aggiornamento software/firmware
}

enum StatoManutenzione {
  PROGRAMMATA           // Schedulata, non ancora eseguita
  IN_CORSO              // In esecuzione
  COMPLETATA            // Eseguita con successo
  ANNULLATA             // Cancellata
  RIMANDATA             // Posticipata
}
```

---

## 3. FUNZIONALITÀ

### 3.1 Gestione Inventario
| Azione | Permesso | Note |
|--------|----------|------|
| Lista strumenti | `VIEW_STRUMENTARIO` | Filtri per stato, categoria |
| Dettaglio | `VIEW_STRUMENTARIO` | Include storico manutenzioni |
| Crea | `MANAGE_STRUMENTARIO` | - |
| Modifica | `MANAGE_STRUMENTARIO` | - |
| Cambia stato | `MANAGE_STRUMENTARIO` | Audit automatico |
| Dismissione | `MANAGE_STRUMENTARIO` | Richiede motivazione |

### 3.2 Manutenzioni
- **Programmazione**: Scheduler automatico basato su intervallo
- **Alert**: Notifica X giorni prima scadenza
- **Registro**: Storico completo con costi
- **Report**: Costi per strumento/periodo

### 3.3 Calcolo ROI
Formula ROI strumento:
```
ROI = (Ricavi_generati - Costi_totali) / Costi_totali * 100

Ricavi_generati = N_prestazioni * Prezzo_medio
Costi_totali = Prezzo_acquisto + Σ(Costi_manutenzione) + (Costo_orario * Ore_utilizzo)
```

### 3.4 Alert Automatici
| Alert | Trigger | Destinatario |
|-------|---------|--------------|
| Manutenzione in scadenza | 7gg prima | ADMIN, SEGRETERIA |
| Garanzia in scadenza | 30gg prima | ADMIN |
| Strumento guasto | Cambio stato | ADMIN |
| Ammortamento completato | Fine periodo | ADMIN |

---

## 4. API ENDPOINTS

```
# CRUD Strumenti
GET    /api/v1/clinica/strumenti                      # Lista (filtri)
GET    /api/v1/clinica/strumenti/:id                  # Dettaglio
POST   /api/v1/clinica/strumenti                      # Crea
PUT    /api/v1/clinica/strumenti/:id                  # Modifica
DELETE /api/v1/clinica/strumenti/:id                  # Soft delete

# Cambio stato
PATCH  /api/v1/clinica/strumenti/:id/stato            # Cambia stato
POST   /api/v1/clinica/strumenti/:id/dismissione      # Dismissione

# Manutenzioni
GET    /api/v1/clinica/strumenti/:id/manutenzioni     # Lista manutenzioni
POST   /api/v1/clinica/strumenti/:id/manutenzioni     # Programma manutenzione
PUT    /api/v1/clinica/strumenti/:id/manutenzioni/:manId
PATCH  /api/v1/clinica/strumenti/:id/manutenzioni/:manId/completa

# Dashboard
GET    /api/v1/clinica/strumenti/dashboard            # Overview
GET    /api/v1/clinica/strumenti/scadenze             # Manutenzioni in scadenza
GET    /api/v1/clinica/strumenti/:id/roi              # Calcolo ROI
GET    /api/v1/clinica/strumenti/report/costi         # Report costi
```

---

## 5. UI COMPONENTS

### 5.1 Pagine
- `StrumentiList.tsx` - Inventario completo
- `StrumentoForm.tsx` - Crea/modifica
- `StrumentoDetail.tsx` - Dettaglio con tabs
- `ManutenzioniCalendar.tsx` - Calendario manutenzioni

### 5.2 Tab Detail Strumento
- **Info**: Dati base, acquisto, garanzia
- **Ubicazione**: Ambulatori assegnati
- **Manutenzioni**: Storico + prossime
- **Prestazioni**: Prestazioni che lo usano
- **ROI**: Grafici ricavi/costi

### 5.3 Dashboard Strumentario
- Card riepilogo per stato
- Alert manutenzioni in scadenza
- Top 5 costi manutenzione
- Grafico ammortamento flotta

### 5.4 Widgets
- `StrumentoPicker.tsx` - Selezione strumento
- `StrumentoStatusBadge.tsx` - Badge stato
- `ManutenzioneAlert.tsx` - Alert scadenza
- `ROIChart.tsx` - Grafico ROI

---

## 6. REGOLE BUSINESS

| ID | Regola |
|----|--------|
| RB-01 | Codice strumento univoco per tenant |
| RB-02 | Strumento IN_MANUTENZIONE → slot con questo strumento non disponibili |
| RB-03 | Strumento GUASTO → alert immediato admin |
| RB-04 | Manutenzione programmata → auto-scheduling se intervallo definito |
| RB-05 | Dismissione richiede motivazione e audit |
| RB-06 | Strumento con prestazioni attive → warning su dismissione |
| RB-07 | Garanzia scaduta → flag su scheda strumento |

---

## 7. ESEMPIO JSON

### Request: Crea Strumento
```json
{
  "nome": "Ecografo Philips EPIQ 7",
  "codice": "ECO-001",
  "categoria": "Diagnostica per immagini",
  "sottocategoria": "Ecografi",
  "marca": "Philips",
  "modello": "EPIQ 7",
  "seriale": "SN-2023-456789",
  "dataAcquisto": "2023-06-15",
  "prezzoAcquisto": 85000.00,
  "fornitore": "Philips Healthcare Italia",
  "dataFineGaranzia": "2026-06-15",
  "tipoGaranzia": "Estesa 3 anni full risk",
  "anniAmmortamento": 5,
  "intervalloManutenzione": 180,
  "costoOrarioStimato": 15.00,
  "manualeUrl": "https://storage.../manuale-epiq7.pdf",
  "certificazioniUrl": ["https://storage.../ce-mark.pdf"]
}
```

### Request: Programma Manutenzione
```json
{
  "tipo": "PROGRAMMATA",
  "descrizione": "Manutenzione semestrale ordinaria",
  "dataProgrammata": "2024-01-15T09:00:00Z",
  "esecutore": "Philips Service",
  "contattoEsecutore": "+39 02 1234567"
}
```

---

## 8. COLLEGAMENTI

- **Precedente**: [SPEC_03_PRESTAZIONI.md](./SPEC_03_PRESTAZIONI.md)
- **Prossimo**: [SPEC_05_AGENDA.md](./SPEC_05_AGENDA.md)
- **Correlato**: [SPEC_02_AMBULATORI.md](./SPEC_02_AMBULATORI.md)
- **Task**: [F1_DATABASE_TASKS.md](../sottofasi/F1_DATABASE_TASKS.md) → F1.3
