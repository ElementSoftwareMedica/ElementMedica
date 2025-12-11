# 🏥 IMPLEMENTATION QUEUE - ElementMedica Poliambulatorio

## 📋 CURRENT STATUS

| Campo | Valore |
|-------|--------|
| **Start Date** | 2025-01-31 |
| **Current Phase** | FASE 1.4 - Migration & Seed |
| **Current Task** | F1.4.1 - Create Migration |
| **Blockers** | None |

---

## 🎯 NEXT 10 TASKS (Priorità Immediata)

### Task Queue (In Order)

| # | Task ID | Description | Est. | File/Location | Status |
|---|---------|-------------|------|---------------|--------|
| 1 | F1.4.1 | Create database migration | 10m | `prisma migrate` | ⏳ |
| 2 | F1.4.2 | Apply migration to dev | 5m | `prisma migrate dev` | ⏳ |
| 3 | F1.4.3 | Generate Prisma client | 3m | `prisma generate` | ⏳ |
| 4 | F1.5.1 | Update RBACService permissions | 30m | `RBACService.js` | ⏳ |
| 5 | F2.1.1 | Create Poliambulatorio service | 45m | `backend/services/clinical/` | ⏳ |
| 6 | F2.1.2 | Create Ambulatorio service | 45m | `backend/services/clinical/` | ⏳ |
| 7 | F2.1.3 | Create Prestazione service | 45m | `backend/services/clinical/` | ⏳ |
| 8 | F2.2.1 | Create Appuntamento service | 60m | `backend/services/clinical/` | ⏳ |
| 9 | F2.2.2 | Create Visita service | 60m | `backend/services/clinical/` | ⏳ |
| 10 | F2.2.3 | Create Referto service | 45m | `backend/services/clinical/` | ⏳ |

---

## ✅ COMPLETED TASKS (FASE 1.1-1.3)

| Task ID | Description | Duration | Notes |
|---------|-------------|----------|-------|
| F1.1.1 | Add clinical RoleTypes | 5m | Added 9 new roles |
| F1.1.2 | Add clinical PersonPermissions | 10m | Added 55+ permissions |
| F1.1.3 | Add AppType enum | 3m | FORMAZIONE, MEDICA |
| F1.2.1 | Create Poliambulatorio model | 8m | With relations |
| F1.2.2 | Create Ambulatorio model | 8m | With junction tables |
| F1.2.3 | Create Prestazione model | 10m | + PrestazioneAmbulatorio |
| F1.2.4 | Create Strumento model | 8m | + StrumentoAmbulatorio |
| F1.2.5 | Create ListinoPrezzo model | 8m | Multi-tipo pricing |
| F1.3.1 | Create Appuntamento model | 10m | Queue system included |
| F1.3.2 | Create Visita model | 12m | Full clinical fields |
| F1.3.3 | Create Referto model | 10m | Digital signature |
| F1.3.4 | Create Allegati models | 8m | AllegatoVisita, AllegatoReferto |
| F1.3.5 | Create DisponibilitaMedico | 6m | Agenda availability |
| F1.3.6 | Create FerieAssenza model | 5m | Vacation/absence tracking |
| F1.3.7 | Create FatturaSanitaria model | 8m | Medical invoicing |
| F1.3.8 | Add Person relations | 5m | 8 clinical relations |
| F1.3.9 | Add Tenant relations | 5m | 11 clinical relations |
| F1.3.10 | Validate schema | 2m | ✅ Schema valid |

---

## 📝 DETAILED TASK SPECS

### F1.1.1 - Add Clinical RoleTypes

**Location**: `backend/prisma/schema.prisma` line 1641 (enum RoleType)

**Add Values** (camelCase per naming convention):
```prisma
// Medical Staff
MEDICO
INFERMIERE
MEDICO_SPECIALISTA
DIRETTORE_SANITARIO
SEGRETERIA_MEDICA
TECNICO_SANITARIO

// Patient
PAZIENTE
```

**Validation**:
- [ ] No duplicate values
- [ ] camelCase naming respected (SCREAMING_SNAKE_CASE per enum values OK)
- [ ] `npx prisma validate` passes

---

### F1.1.2 - Add Clinical PersonPermissions

**Location**: `backend/prisma/schema.prisma` line 1679 (enum PersonPermission)

**Add Values**:
```prisma
// Pazienti
VIEW_PATIENTS
CREATE_PATIENTS
EDIT_PATIENTS
DELETE_PATIENTS
MANAGE_PATIENTS

// Appuntamenti
VIEW_APPOINTMENTS
CREATE_APPOINTMENTS
EDIT_APPOINTMENTS
DELETE_APPOINTMENTS
MANAGE_APPOINTMENTS

// Visite
VIEW_VISITS
CREATE_VISITS
EDIT_VISITS
DELETE_VISITS
MANAGE_VISITS
SIGN_VISITS

// Referti
VIEW_REPORTS_MEDICAL
CREATE_REPORTS_MEDICAL
EDIT_REPORTS_MEDICAL
DELETE_REPORTS_MEDICAL
SIGN_REPORTS_MEDICAL

// Prestazioni
VIEW_SERVICES_MEDICAL
CREATE_SERVICES_MEDICAL
EDIT_SERVICES_MEDICAL
DELETE_SERVICES_MEDICAL
MANAGE_SERVICES_MEDICAL

// Ambulatori
VIEW_AMBULATORI
CREATE_AMBULATORI
EDIT_AMBULATORI
DELETE_AMBULATORI
MANAGE_AMBULATORI

// Poliambulatorio
VIEW_POLIAMBULATORIO
CREATE_POLIAMBULATORIO
EDIT_POLIAMBULATORIO
DELETE_POLIAMBULATORIO
MANAGE_POLIAMBULATORIO

// Listino
VIEW_LISTINO
CREATE_LISTINO
EDIT_LISTINO
DELETE_LISTINO
MANAGE_LISTINO

// Agenda
VIEW_AGENDA
MANAGE_AGENDA

// Fatturazione Sanitaria
VIEW_INVOICES_MEDICAL
CREATE_INVOICES_MEDICAL
EDIT_INVOICES_MEDICAL
DELETE_INVOICES_MEDICAL

// Clinical Admin
CLINICAL_ADMIN_PANEL
CLINICAL_SETTINGS
```

---

### F1.1.3 - Add AppType Enum

**Location**: `backend/prisma/schema.prisma` (after RoleType)

**Code**:
```prisma
enum AppType {
  FORMAZIONE
  MEDICA
  
  @@map("app_types")
}
```

---

### F1.2.1 - Create Poliambulatorio Model

**Code**:
```prisma
model Poliambulatorio {
  id                    String        @id @default(uuid())
  tenantId              String
  nome                  String
  codice                String
  indirizzo             String?
  citta                 String?
  cap                   String?
  provincia             String?
  telefono              String?
  email                 String?
  pec                   String?
  partitaIva            String?
  codiceFiscale         String?
  codiceRegionale       String?
  direttoreSanitarioId  String?
  isActive              Boolean       @default(true)
  createdAt             DateTime      @default(now()) @db.Timestamp(6)
  updatedAt             DateTime      @updatedAt @db.Timestamp(6)
  deletedAt             DateTime?
  
  // Relations
  tenant                Tenant        @relation(fields: [tenantId], references: [id])
  direttoreSanitario    Person?       @relation("DirettoreSanitario", fields: [direttoreSanitarioId], references: [id], onDelete: SetNull)
  ambulatori            Ambulatorio[]
  
  @@unique([tenantId, codice])
  @@index([tenantId, deletedAt])
  @@index([codiceRegionale])
  @@index([direttoreSanitarioId])
  @@map("poliambulatori")
}
```

---

### F1.2.2 - Create Ambulatorio Model

**Code**:
```prisma
model Ambulatorio {
  id                    String            @id @default(uuid())
  tenantId              String
  poliambulatorioId     String
  nome                  String
  codice                String
  specializzazione      String?
  piano                 String?
  stanza                String?
  capienzaMax           Int               @default(1)
  attrezzature          String?           // JSON array of equipment
  isActive              Boolean           @default(true)
  createdAt             DateTime          @default(now()) @db.Timestamp(6)
  updatedAt             DateTime          @updatedAt @db.Timestamp(6)
  deletedAt             DateTime?
  
  // Relations
  tenant                Tenant            @relation(fields: [tenantId], references: [id])
  poliambulatorio       Poliambulatorio   @relation(fields: [poliambulatorioId], references: [id], onDelete: Cascade)
  strumenti             StrumentoAmbulatorio[]
  appuntamenti          Appuntamento[]
  prestazioni           PrestazioneAmbulatorio[]
  
  @@unique([poliambulatorioId, codice])
  @@index([tenantId, deletedAt])
  @@index([poliambulatorioId])
  @@index([specializzazione])
  @@map("ambulatori")
}
```

---

### F1.2.3 - Create Prestazione Model

**Code**:
```prisma
enum TipoPrestazione {
  VISITA
  ESAME
  TERAPIA
  INTERVENTO
  CONSULTO
  ALTRO
  
  @@map("tipo_prestazione")
}

model Prestazione {
  id                    String                  @id @default(uuid())
  tenantId              String
  codice                String                  // Internal code
  codiceNazionale       String?                 // National nomenclator code
  nome                  String
  descrizione           String?
  tipo                  TipoPrestazione         @default(VISITA)
  durataPrevista        Int                     @default(30) // minutes
  richiedeReferto       Boolean                 @default(true)
  richiedeConsenso      Boolean                 @default(false)
  preparazioneRichiesta String?                 // Patient preparation instructions
  note                  String?
  isActive              Boolean                 @default(true)
  createdAt             DateTime                @default(now()) @db.Timestamp(6)
  updatedAt             DateTime                @updatedAt @db.Timestamp(6)
  deletedAt             DateTime?
  
  // Relations
  tenant                Tenant                  @relation(fields: [tenantId], references: [id])
  listinoPrezzi         ListinoPrezzo[]
  ambulatoriAbilitati   PrestazioneAmbulatorio[]
  visite                Visita[]
  
  @@unique([tenantId, codice])
  @@index([tenantId, deletedAt])
  @@index([codiceNazionale])
  @@index([tipo])
  @@map("prestazioni")
}

model PrestazioneAmbulatorio {
  id                    String        @id @default(uuid())
  prestazioneId         String
  ambulatorioId         String
  isActive              Boolean       @default(true)
  createdAt             DateTime      @default(now()) @db.Timestamp(6)
  
  prestazione           Prestazione   @relation(fields: [prestazioneId], references: [id], onDelete: Cascade)
  ambulatorio           Ambulatorio   @relation(fields: [ambulatorioId], references: [id], onDelete: Cascade)
  
  @@unique([prestazioneId, ambulatorioId])
  @@index([prestazioneId])
  @@index([ambulatorioId])
  @@map("prestazione_ambulatorio")
}
```

---

### F1.2.4 - Create Strumento Model

**Code**:
```prisma
enum StatoStrumento {
  DISPONIBILE
  IN_USO
  MANUTENZIONE
  GUASTO
  DISMESSO
  
  @@map("stato_strumento")
}

model Strumento {
  id                    String                @id @default(uuid())
  tenantId              String
  codice                String
  nome                  String
  descrizione           String?
  marca                 String?
  modello               String?
  numeroSerie           String?
  dataAcquisto          DateTime?             @db.Date
  dataScadenzaGaranzia  DateTime?             @db.Date
  dataUltimaManutenz    DateTime?             @db.Date
  dataProssimaManutenz  DateTime?             @db.Date
  stato                 StatoStrumento        @default(DISPONIBILE)
  note                  String?
  isActive              Boolean               @default(true)
  createdAt             DateTime              @default(now()) @db.Timestamp(6)
  updatedAt             DateTime              @updatedAt @db.Timestamp(6)
  deletedAt             DateTime?
  
  // Relations
  tenant                Tenant                @relation(fields: [tenantId], references: [id])
  ambulatoriAssegnati   StrumentoAmbulatorio[]
  
  @@unique([tenantId, codice])
  @@index([tenantId, deletedAt])
  @@index([stato])
  @@index([dataProssimaManutenz])
  @@map("strumenti")
}

model StrumentoAmbulatorio {
  id                    String        @id @default(uuid())
  strumentoId           String
  ambulatorioId         String
  dataAssegnazione      DateTime      @default(now()) @db.Date
  dataFineAssegnazione  DateTime?     @db.Date
  isActive              Boolean       @default(true)
  
  strumento             Strumento     @relation(fields: [strumentoId], references: [id], onDelete: Cascade)
  ambulatorio           Ambulatorio   @relation(fields: [ambulatorioId], references: [id], onDelete: Cascade)
  
  @@unique([strumentoId, ambulatorioId, dataAssegnazione])
  @@index([strumentoId])
  @@index([ambulatorioId])
  @@map("strumento_ambulatorio")
}
```

---

### F1.2.5 - Create ListinoPrezzo Model

**Code**:
```prisma
enum TipoListino {
  PRIVATO
  SSN
  CONVENZIONATO
  ASSICURAZIONE
  
  @@map("tipo_listino")
}

model ListinoPrezzo {
  id                    String          @id @default(uuid())
  tenantId              String
  prestazioneId         String
  tipo                  TipoListino     @default(PRIVATO)
  prezzo                Decimal         @db.Decimal(10, 2)
  prezzoMinimo          Decimal?        @db.Decimal(10, 2)
  prezzoMassimo         Decimal?        @db.Decimal(10, 2)
  codiceConvenzione     String?
  nomeConvenzione       String?
  validoDa              DateTime        @default(now()) @db.Date
  validoA               DateTime?       @db.Date
  note                  String?
  isActive              Boolean         @default(true)
  createdAt             DateTime        @default(now()) @db.Timestamp(6)
  updatedAt             DateTime        @updatedAt @db.Timestamp(6)
  deletedAt             DateTime?
  
  // Relations
  tenant                Tenant          @relation(fields: [tenantId], references: [id])
  prestazione           Prestazione     @relation(fields: [prestazioneId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, prestazioneId, tipo, codiceConvenzione, validoDa])
  @@index([tenantId, deletedAt])
  @@index([prestazioneId])
  @@index([tipo])
  @@index([validoDa, validoA])
  @@map("listino_prezzi")
}
```

---

### F1.3.1 - Create Appuntamento Model

**Code**:
```prisma
enum StatoAppuntamento {
  PRENOTATO
  CONFERMATO
  IN_ATTESA
  IN_CORSO
  COMPLETATO
  ANNULLATO
  NO_SHOW
  
  @@map("stato_appuntamento")
}

model Appuntamento {
  id                    String            @id @default(uuid())
  tenantId              String
  numero                String            // Progressive number per day
  pazienteId            String
  medicoId              String
  ambulatorioId         String
  prestazioneId         String?
  dataOra               DateTime          @db.Timestamp(6)
  durataPrevista        Int               @default(30) // minutes
  stato                 StatoAppuntamento @default(PRENOTATO)
  note                  String?
  noteInterne           String?           // Staff only notes
  promemoria            Boolean           @default(true)
  promemoriaInviato     Boolean           @default(false)
  dataConferma          DateTime?         @db.Timestamp(6)
  dataAnnullamento      DateTime?         @db.Timestamp(6)
  motivoAnnullamento    String?
  numeroCoda            Int?              // Queue number for waiting room
  oraArrivo             DateTime?         @db.Timestamp(6)
  oraInizio             DateTime?         @db.Timestamp(6)
  oraFine               DateTime?         @db.Timestamp(6)
  isRecurring           Boolean           @default(false)
  recurringPattern      String?           // JSON with recurrence rules
  parentAppuntamentoId  String?
  createdBy             String?
  createdAt             DateTime          @default(now()) @db.Timestamp(6)
  updatedAt             DateTime          @updatedAt @db.Timestamp(6)
  deletedAt             DateTime?
  
  // Relations
  tenant                Tenant            @relation(fields: [tenantId], references: [id])
  paziente              Person            @relation("AppuntamentiPaziente", fields: [pazienteId], references: [id], onDelete: Restrict)
  medico                Person            @relation("AppuntamentiMedico", fields: [medicoId], references: [id], onDelete: Restrict)
  ambulatorio           Ambulatorio       @relation(fields: [ambulatorioId], references: [id], onDelete: Restrict)
  parentAppuntamento    Appuntamento?     @relation("RecurringAppuntamenti", fields: [parentAppuntamentoId], references: [id], onDelete: SetNull)
  childAppuntamenti     Appuntamento[]    @relation("RecurringAppuntamenti")
  visite                Visita[]
  
  @@unique([tenantId, numero, dataOra])
  @@index([tenantId, deletedAt])
  @@index([pazienteId])
  @@index([medicoId])
  @@index([ambulatorioId])
  @@index([dataOra])
  @@index([stato])
  @@index([tenantId, dataOra, stato])
  @@index([medicoId, dataOra])
  @@index([ambulatorioId, dataOra])
  @@map("appuntamenti")
}
```

---

### F1.3.2 - Create Visita Model

**Code**:
```prisma
enum StatoVisita {
  INIZIATA
  IN_CORSO
  SOSPESA
  COMPLETATA
  ANNULLATA
  
  @@map("stato_visita")
}

model Visita {
  id                    String        @id @default(uuid())
  tenantId              String
  appuntamentoId        String?
  pazienteId            String
  medicoId              String
  prestazioneId         String
  dataOra               DateTime      @db.Timestamp(6)
  stato                 StatoVisita   @default(INIZIATA)
  
  // Dati clinici
  anamnesi              String?       // Patient history
  esamObiettivo         String?       // Physical examination
  diagnosi              String?
  diagnosiIcd10         String?       // ICD-10 code
  terapia               String?
  prescrizioni          String?       // JSON array of prescriptions
  noteClinic            String?       // Clinical notes (encrypted)
  
  // Follow-up
  followUpRichiesto     Boolean       @default(false)
  followUpData          DateTime?     @db.Date
  followUpNote          String?
  
  // Firma
  firmaMedico           String?       // Digital signature reference
  dataFirma             DateTime?     @db.Timestamp(6)
  
  // Consensi
  consensoInformato     Boolean       @default(false)
  consensoTrattamento   Boolean       @default(false)
  
  createdBy             String?
  createdAt             DateTime      @default(now()) @db.Timestamp(6)
  updatedAt             DateTime      @updatedAt @db.Timestamp(6)
  deletedAt             DateTime?
  
  // Relations
  tenant                Tenant        @relation(fields: [tenantId], references: [id])
  appuntamento          Appuntamento? @relation(fields: [appuntamentoId], references: [id], onDelete: SetNull)
  paziente              Person        @relation("VisitePaziente", fields: [pazienteId], references: [id], onDelete: Restrict)
  medico                Person        @relation("VisiteMedico", fields: [medicoId], references: [id], onDelete: Restrict)
  prestazione           Prestazione   @relation(fields: [prestazioneId], references: [id], onDelete: Restrict)
  referti               Referto[]
  allegati              AllegatoVisita[]
  
  @@index([tenantId, deletedAt])
  @@index([pazienteId])
  @@index([medicoId])
  @@index([appuntamentoId])
  @@index([prestazioneId])
  @@index([dataOra])
  @@index([stato])
  @@index([tenantId, dataOra, stato])
  @@map("visite")
}
```

---

## 📊 PROGRESS TRACKER

### FASE 1 - Database (Target: 35 tasks)
```
[████████░░░░░░░░░░░░] 18/35 (51%)
```

### Overall Project
```
[█░░░░░░░░░░░░░░░░░░░] 18/237 (8%)
```
```

---

## 🔄 COMPLETED TASKS LOG

| Date | Task ID | Description | Duration | Notes |
|------|---------|-------------|----------|-------|
| - | - | - | - | - |

---

## ⚠️ BLOCKERS & ISSUES

| Issue ID | Description | Status | Resolution |
|----------|-------------|--------|------------|
| - | None currently | - | - |

---

## 📚 QUICK REFERENCE

### Schema Locations
- RoleType: Line 1641
- PersonPermission: Line 1679
- Person model: Line 1017
- PersonRole: Line 1112

### Commands
```bash
# Validate schema
cd backend && npx prisma validate

# Generate client
cd backend && npx prisma generate

# Create migration (DRY RUN first!)
cd backend && npx prisma migrate dev --create-only --name clinical_entities

# Apply migration
cd backend && npx prisma migrate dev

# Check TypeScript errors
npx tsc --noEmit
```

### Naming Conventions
- Models: PascalCase (`Poliambulatorio`)
- Fields: camelCase (`tenantId`, `dataOra`)
- Enums: SCREAMING_SNAKE_CASE (`MEDICO`, `IN_CORSO`)
- Tables: snake_case via `@@map("table_name")`

---

*Last Updated: 2025-01-31*
