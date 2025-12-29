# 📅 SPEC_05: Agenda e Disponibilità

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Collegato a**: [SPEC_02_AMBULATORI.md](./SPEC_02_AMBULATORI.md), [SPEC_07_APPUNTAMENTI.md](./SPEC_07_APPUNTAMENTI.md)

---

## 1. OVERVIEW

L'Agenda gestisce la disponibilità di medici e ambulatori per le prenotazioni. Il sistema calcola gli slot disponibili incrociando:
- Orari ambulatorio
- Disponibilità medico
- Ferie/assenze
- Appuntamenti esistenti
- Strumentario disponibile

### 1.1 Concetti Chiave

| Concetto | Descrizione |
|----------|-------------|
| **Slot** | Unità minima prenotabile (es. 15 min) |
| **Disponibilità Medico** | Pattern ricorrente settimanale |
| **Eccezione** | Override singola data (ferie, straordinari) |
| **Conflitto** | Sovrapposizione non consentita |

---

## 2. ENTITÀ DATABASE

### 2.1 Disponibilità Medico (Pattern Ricorrente)

```prisma
model DisponibilitaMedico {
  id                    String   @id @default(uuid())
  
  // Medico
  medicoId              String
  medico                Person   @relation("MedicoDisponibilita", fields: [medicoId], references: [id])
  
  // Ambulatorio (opzionale - se null, qualsiasi ambulatorio)
  ambulatorioId         String?
  ambulatorio           Ambulatorio? @relation(fields: [ambulatorioId], references: [id])
  
  // Pattern settimanale
  giornoSettimana       Int                  // 1=Lunedì, 7=Domenica
  oraInizio             String               // "09:00"
  oraFine               String               // "13:00"
  
  // Configurazioni
  durataSlot            Int      @default(30)    // Minuti per slot
  maxAppuntamenti       Int?                     // Limite appuntamenti per fascia
  
  // Validità
  validoDa              DateTime?
  validoA               DateTime?
  isAttivo              Boolean  @default(true)
  
  // Note
  note                  String?
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@index([tenantId])
  @@index([medicoId])
  @@index([ambulatorioId])
  @@index([giornoSettimana])
}
```

### 2.2 Ferie e Assenze

```prisma
model FerieAssenza {
  id                    String   @id @default(uuid())
  
  // Persona (medico, infermiere, etc.)
  personaId             String
  persona               Person   @relation("PersonaFerie", fields: [personaId], references: [id])
  
  // Periodo
  dataInizio            DateTime
  dataFine              DateTime
  isTuttoIlGiorno       Boolean  @default(true)
  oraInizio             String?              // Se non tutto il giorno
  oraFine               String?
  
  // Tipo
  tipo                  TipoAssenza          @default(FERIE)
  motivo                String?
  
  // Stato
  stato                 StatoAssenza         @default(APPROVATA)
  approvataDaId         String?
  approvataDa           Person?  @relation("ApprovatoreFerie", fields: [approvataDaId], references: [id])
  dataApprovazione      DateTime?
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@index([tenantId])
  @@index([personaId])
  @@index([dataInizio, dataFine])
}

enum TipoAssenza {
  FERIE
  MALATTIA
  PERMESSO
  CONGEDO
  FORMAZIONE
  ALTRO
}

enum StatoAssenza {
  RICHIESTA
  APPROVATA
  RIFIUTATA
  ANNULLATA
}
```

### 2.3 Slot Disponibilità (Cache Calcolata)

```prisma
model SlotDisponibilita {
  id                    String   @id @default(uuid())
  
  // Coordinate temporali
  data                  DateTime @db.Date
  oraInizio             String               // "09:00"
  oraFine               String               // "09:30"
  
  // Risorse
  medicoId              String
  medico                Person   @relation("MedicoSlot", fields: [medicoId], references: [id])
  
  ambulatorioId         String
  ambulatorio           Ambulatorio @relation(fields: [ambulatorioId], references: [id])
  
  // Stato slot
  isDisponibile         Boolean  @default(true)
  motivoBlocco          String?              // "Ferie", "Manutenzione ambulatorio"
  
  // Appuntamento associato (se prenotato)
  appuntamentoId        String?  @unique
  appuntamento          Appuntamento? @relation(fields: [appuntamentoId], references: [id])
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@unique([tenantId, data, oraInizio, medicoId, ambulatorioId])
  @@index([tenantId])
  @@index([data])
  @@index([medicoId])
  @@index([ambulatorioId])
  @@index([isDisponibile])
}
```

---

## 3. ALGORITMO CALCOLO DISPONIBILITÀ

### 3.1 Pseudocodice

```javascript
function calcolaSlotDisponibili(data, medicoId?, ambulatorioId?, prestazioneId) {
  // 1. Ottieni pattern disponibilità medici
  const disponibilita = await getDisponibilitaMedici(data, medicoId);
  
  // 2. Filtra per ferie/assenze
  const assenze = await getAssenze(data, medicoId);
  const dispFiltrata = filtraPerAssenze(disponibilita, assenze);
  
  // 3. Filtra per orari ambulatorio
  const orariAmb = await getOrariAmbulatorio(data, ambulatorioId);
  const dispAmbulatorio = interseziona(dispFiltrata, orariAmb);
  
  // 4. Se prestazione specificata, filtra medici abilitati
  if (prestazioneId) {
    const mediciAbilitati = await getMediciPrestazione(prestazioneId);
    dispAmbulatorio = filtraPerMedici(dispAmbulatorio, mediciAbilitati);
  }
  
  // 5. Sottrai appuntamenti esistenti
  const appuntamenti = await getAppuntamentiGiorno(data, medicoId, ambulatorioId);
  const slotLiberi = sottraiOccupati(dispAmbulatorio, appuntamenti);
  
  // 6. Verifica strumentario (se prestazione richiede strumenti)
  if (prestazioneId) {
    const strumentiNecessari = await getStrumentiPrestazione(prestazioneId);
    slotLiberi = verificaStrumenti(slotLiberi, strumentiNecessari);
  }
  
  return slotLiberi;
}
```

### 3.2 Diagramma Flusso

```
┌─────────────────────┐
│ Pattern Disponibilità│
│      Medico         │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Filtra Ferie/      │
│     Assenze         │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Interseca Orari     │
│   Ambulatorio       │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Filtra Medici       │
│  Prestazione        │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Sottrai Appuntamenti│
│     Esistenti       │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Verifica Strumenti  │
│    Disponibili      │
└─────────┬───────────┘
          │
          ▼
    ┌───────────┐
    │  SLOT     │
    │ DISPONIBILI│
    └───────────┘
```

---

## 4. FUNZIONALITÀ

### 4.1 Gestione Disponibilità Medico
| Azione | Permesso | Note |
|--------|----------|------|
| Visualizza | `VIEW_AGENDA` | - |
| Configura propria | `MANAGE_OWN_SCHEDULE` | Solo medico stesso |
| Configura altri | `MANAGE_AGENDA` | Admin/Segreteria |
| Copia pattern | `MANAGE_AGENDA` | Da altro medico/settimana |

### 4.2 Gestione Ferie
| Azione | Permesso | Note |
|--------|----------|------|
| Richiedi ferie | `REQUEST_LEAVE` | Tutti |
| Approva ferie | `APPROVE_LEAVE` | Admin |
| Visualizza team | `VIEW_TEAM_SCHEDULE` | Vede ferie colleghi |

### 4.3 Viste Calendario
- **Vista Giorno**: Timeline verticale per medico/ambulatorio
- **Vista Settimana**: Griglia 7 giorni
- **Vista Mese**: Overview occupazione
- **Vista Risorse**: Confronto medici side-by-side

---

## 5. API ENDPOINTS

```
# Disponibilità Medico
GET    /api/v1/clinica/disponibilita/medici              # Lista pattern
GET    /api/v1/clinica/disponibilita/medici/:medicoId    # Pattern singolo medico
POST   /api/v1/clinica/disponibilita/medici              # Crea pattern
PUT    /api/v1/clinica/disponibilita/medici/:id          # Modifica
DELETE /api/v1/clinica/disponibilita/medici/:id          # Elimina

# Ferie/Assenze
GET    /api/v1/clinica/ferie                             # Lista (filtri)
POST   /api/v1/clinica/ferie                             # Richiedi ferie
PUT    /api/v1/clinica/ferie/:id                         # Modifica
DELETE /api/v1/clinica/ferie/:id                         # Annulla
PATCH  /api/v1/clinica/ferie/:id/approva                 # Approva
PATCH  /api/v1/clinica/ferie/:id/rifiuta                 # Rifiuta

# Calcolo Slot
GET    /api/v1/clinica/slot-disponibili                  # Calcola slot
       ?data=2024-01-15
       &medicoId=xxx
       &ambulatorioId=xxx
       &prestazioneId=xxx
       &durataMinuti=30

GET    /api/v1/clinica/calendario                        # Vista calendario
       ?dataInizio=2024-01-01
       &dataFine=2024-01-31
       &vista=settimana
       &medicoId=xxx
```

---

## 6. UI COMPONENTS

### 6.1 Pagine
- `AgendaCalendar.tsx` - Calendario principale
- `DisponibilitaSetup.tsx` - Configurazione pattern
- `FerieList.tsx` - Gestione ferie
- `FerieApproval.tsx` - Approvazione richieste

### 6.2 Calendario
- `CalendarDayView.tsx` - Vista giorno
- `CalendarWeekView.tsx` - Vista settimana
- `CalendarMonthView.tsx` - Vista mese
- `CalendarResourceView.tsx` - Vista risorse

### 6.3 Widgets
- `SlotPicker.tsx` - Selezione slot per booking
- `MiniCalendar.tsx` - Calendario piccolo navigazione
- `DisponibilitaGrid.tsx` - Griglia settimanale editable
- `OccupancyBar.tsx` - Barra % occupazione

---

## 7. REGOLE BUSINESS

| ID | Regola |
|----|--------|
| RB-01 | Slot minimo 5 minuti, massimo 480 minuti |
| RB-02 | Disponibilità medico dentro orari ambulatorio |
| RB-03 | Ferie approvate → appuntamenti esistenti warning |
| RB-04 | Doppia prenotazione stesso slot → errore |
| RB-05 | Buffer tra appuntamenti configurabile |
| RB-06 | Prenotazione max X giorni in anticipo |

---

## 8. COLLEGAMENTI

- **Precedente**: [SPEC_04_STRUMENTARIO.md](./SPEC_04_STRUMENTARIO.md)
- **Prossimo**: [SPEC_06_LISTINI.md](./SPEC_06_LISTINI.md)
- **Correlato**: [SPEC_07_APPUNTAMENTI.md](./SPEC_07_APPUNTAMENTI.md)
- **Workflow**: [WF_01_PRENOTAZIONE.md](../workflows/WF_01_PRENOTAZIONE.md)
