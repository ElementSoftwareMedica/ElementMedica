# 🚪 SPEC_02: Gestione Ambulatori

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Collegato a**: [SPEC_01_POLIAMBULATORIO.md](./SPEC_01_POLIAMBULATORIO.md), [SPEC_04_STRUMENTARIO.md](./SPEC_04_STRUMENTARIO.md)

---

## 1. OVERVIEW

L'Ambulatorio è l'unità operativa dove si svolgono le visite. Ogni ambulatorio appartiene a una Sede, ha orari specifici, strumentario dedicato e può essere associato a specifiche prestazioni.

### 1.1 Caratteristiche Chiave
- Numero identificativo (es. "Ambulatorio 3")
- Piano/Ubicazione nella sede
- Tipologia (Visita, Diagnostica, Chirurgico)
- Strumentario assegnato
- Orari specifici per giorno settimana
- Medici/Infermieri abilitati

---

## 2. ENTITÀ DATABASE

### 2.1 Modello Ambulatorio

```prisma
model Ambulatorio {
  id                    String   @id @default(uuid())
  
  // Identificazione
  nome                  String               // "Ambulatorio 1"
  numero                Int                  // 1, 2, 3...
  codice                String?              // Codice interno
  
  // Ubicazione
  piano                 String?              // "Piano Terra", "1° Piano"
  ala                   String?              // "Ala Nord", "Blocco A"
  stanza                String?              // "Stanza 101"
  indicazioni           String?              // "Seconda porta a destra"
  
  // Tipologia
  tipologia             TipoAmbulatorio      @default(VISITA)
  specializzazione      String?              // "Cardiologia", "Ortopedia"
  
  // Capacità
  capienzaMax           Int      @default(1) // N. persone (paziente + accompagnatori)
  accessoDisabili       Boolean  @default(true)
  
  // Stato
  isAttivo              Boolean  @default(true)
  motivoDisattivazione  String?
  
  // Configurazioni
  durataSlotOverride    Int?                 // Override durata slot
  intervalloSlot        Int      @default(5) // Granularità slot (minuti)
  
  // Relazioni
  sedeId                String
  sede                  Sede     @relation(fields: [sedeId], references: [id])
  
  orari                 OrarioAmbulatorio[]
  strumenti             StrumentoAmbulatorio[]
  prestazioniAmbulatorio PrestazioneAmbulatorio[]
  appuntamenti          Appuntamento[]
  slotDisponibilita     SlotDisponibilita[]
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  deletedAt             DateTime?
  
  @@unique([tenantId, sedeId, numero])
  @@index([tenantId])
  @@index([sedeId])
  @@index([tipologia])
}

enum TipoAmbulatorio {
  VISITA              // Visite specialistiche
  DIAGNOSTICA         // Ecografie, ECG, etc.
  CHIRURGICO          // Day surgery, piccoli interventi
  PRELIEVI            // Prelievi sangue
  MEDICAZIONI         // Medicazioni, iniezioni
  FISIOTERAPIA        // Riabilitazione
  PSICOLOGIA          // Consulenze psicologiche
  ALTRO
}
```

### 2.2 Modello OrarioAmbulatorio

```prisma
model OrarioAmbulatorio {
  id                    String   @id @default(uuid())
  
  // Giorno settimana
  giornoSettimana       Int                  // 1=Lunedì, 7=Domenica
  
  // Orari
  oraInizio             String               // "08:00"
  oraFine               String               // "13:00"
  
  // Pause (es. pranzo)
  pausaInizio           String?              // "13:00"
  pausaFine             String?              // "14:00"
  
  // Configurazioni
  isAttivo              Boolean  @default(true)
  noteOrario            String?              // "Solo visite urgenti"
  
  // Validità temporale
  validoDa              DateTime?            // Inizio validità
  validoA               DateTime?            // Fine validità
  
  // Relazioni
  ambulatorioId         String
  ambulatorio           Ambulatorio @relation(fields: [ambulatorioId], references: [id])
  
  // Multi-tenancy
  tenantId              String
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@unique([ambulatorioId, giornoSettimana, oraInizio])
  @@index([tenantId])
  @@index([ambulatorioId])
}
```

### 2.3 Associazione Strumenti

```prisma
model StrumentoAmbulatorio {
  id                    String   @id @default(uuid())
  
  ambulatorioId         String
  ambulatorio           Ambulatorio @relation(fields: [ambulatorioId], references: [id])
  
  strumentoId           String
  strumento             Strumento @relation(fields: [strumentoId], references: [id])
  
  // Dettagli assegnazione
  isPermanente          Boolean  @default(true)  // Fisso o condiviso
  dataAssegnazione      DateTime @default(now())
  dataFineAssegnazione  DateTime?
  noteAssegnazione      String?
  
  // Multi-tenancy
  tenantId              String
  
  @@unique([ambulatorioId, strumentoId])
  @@index([tenantId])
}
```

---

## 3. FUNZIONALITÀ

### 3.1 CRUD Ambulatori
| Azione | Permesso | Note |
|--------|----------|------|
| Lista ambulatori | `VIEW_AMBULATORI` | Filtro per sede |
| Dettaglio | `VIEW_AMBULATORI` | Include strumentario |
| Crea | `MANAGE_AMBULATORI` | Numero auto-incrementale |
| Modifica | `MANAGE_AMBULATORI` | - |
| Disattiva | `MANAGE_AMBULATORI` | Soft delete |

### 3.2 Gestione Orari
- Configurazione per giorno settimana
- Orari multipli per giorno (mattina + pomeriggio)
- Pause configurabili (pranzo)
- Validità temporale (stagionale)
- Copia orari tra ambulatori

### 3.3 Assegnazione Strumentario
- Strumenti permanenti (fissi)
- Strumenti condivisi (temporanei)
- Verifica disponibilità strumento
- Alert conflitti

---

## 4. API ENDPOINTS

```
# Ambulatori
GET    /api/v1/clinica/ambulatori                    # Lista (filtri: sede, tipo, attivo)
GET    /api/v1/clinica/ambulatori/:id                # Dettaglio
POST   /api/v1/clinica/ambulatori                    # Crea
PUT    /api/v1/clinica/ambulatori/:id                # Modifica
DELETE /api/v1/clinica/ambulatori/:id                # Disattiva

# Orari
GET    /api/v1/clinica/ambulatori/:id/orari          # Lista orari
POST   /api/v1/clinica/ambulatori/:id/orari          # Aggiungi orario
PUT    /api/v1/clinica/ambulatori/:id/orari/:orarioId # Modifica
DELETE /api/v1/clinica/ambulatori/:id/orari/:orarioId # Rimuovi
POST   /api/v1/clinica/ambulatori/:id/orari/copia    # Copia da altro ambulatorio

# Strumentario
GET    /api/v1/clinica/ambulatori/:id/strumenti      # Lista strumenti assegnati
POST   /api/v1/clinica/ambulatori/:id/strumenti      # Assegna strumento
DELETE /api/v1/clinica/ambulatori/:id/strumenti/:strumentoId # Rimuovi

# Disponibilità
GET    /api/v1/clinica/ambulatori/:id/disponibilita  # Slot liberi (query: data, medico)
```

---

## 5. UI COMPONENTS

### 5.1 Pagine
- `AmbulatoriList.tsx` - Lista ambulatori (per sede)
- `AmbulatorioForm.tsx` - Crea/modifica
- `AmbulatorioDetail.tsx` - Dettaglio con tabs

### 5.2 Tab Detail
- **Info**: Dati base, ubicazione
- **Orari**: Griglia settimanale editable
- **Strumentario**: Lista strumenti assegnati
- **Prestazioni**: Prestazioni erogate
- **Calendario**: Mini-calendario disponibilità

### 5.3 Widgets
- `AmbulatorioPicker.tsx` - Selezione ambulatorio
- `OrarioSettimanale.tsx` - Griglia orari drag&drop
- `AmbulatorioStatusBadge.tsx` - Stato (attivo/disattivo)
- `AmbulatorioOccupancy.tsx` - % occupazione giornaliera

---

## 6. REGOLE BUSINESS

| ID | Regola |
|----|--------|
| RB-01 | Numero ambulatorio univoco per sede |
| RB-02 | Disattivare ambulatorio → cancella appuntamenti futuri |
| RB-03 | Orari ambulatorio dentro orari sede |
| RB-04 | Strumento già assegnato → warning (non blocco) |
| RB-05 | Tipologia determina prestazioni associabili |
| RB-06 | Ambulatorio chirurgico richiede strumentario specifico |

---

## 7. ESEMPIO JSON

### Request: Crea Ambulatorio
```json
{
  "nome": "Ambulatorio Cardiologia",
  "numero": 5,
  "sedeId": "sede-uuid",
  "tipologia": "VISITA",
  "specializzazione": "Cardiologia",
  "piano": "1° Piano",
  "stanza": "105",
  "capienzaMax": 2,
  "accessoDisabili": true,
  "orari": [
    { "giornoSettimana": 1, "oraInizio": "08:00", "oraFine": "13:00" },
    { "giornoSettimana": 1, "oraInizio": "14:00", "oraFine": "18:00" },
    { "giornoSettimana": 2, "oraInizio": "08:00", "oraFine": "13:00" }
  ]
}
```

---

## 8. COLLEGAMENTI

- **Precedente**: [SPEC_01_POLIAMBULATORIO.md](./SPEC_01_POLIAMBULATORIO.md)
- **Prossimo**: [SPEC_03_PRESTAZIONI.md](./SPEC_03_PRESTAZIONI.md)
- **Correlato**: [SPEC_04_STRUMENTARIO.md](./SPEC_04_STRUMENTARIO.md)
- **Workflow**: [WF_01_PRENOTAZIONE.md](../workflows/WF_01_PRENOTAZIONE.md)
