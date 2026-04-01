# P68 - Sistema Gestione Personale Interno (HR Management)

**Stato**: ✅ Backend e Frontend Completati  
**Priorità**: Alta  
**Effort Stimato**: 80-120 ore  
**Data Inizio**: 2026-02-05  
**Data Ultimo Update**: 2026-02-06  
**Versione**: 1.4.0

---

## Changelog

### 2026-02-06 - v1.4.0 (P69 Session 5.11 v2.4.0 - Turni M+P & UI Fix)

#### Schema Prisma - TurnoAssegnato
- ✅ **Unique constraint M+P**: Cambiato da `@@unique([profiloHRId, data])` a `@@unique([profiloHRId, data, oraInizio])` — ora si possono assegnare turni sia mattina (08:00-13:00) che pomeriggio (14:00-19:00) per stessa persona+data
- ✅ **mansioneInternaId**: Aggiunto campo `mansioneInternaId String?` con relazione a MansioneInterna + `@@index([mansioneInternaId])` — ogni turno è collegato a una specifica mansione
- ✅ Applicato via `prisma db push` (shadow DB issue impedisce `prisma migrate dev`)

#### Backend turni-routes.js
- ✅ **POST**: Accetta `mansioneInternaId`, conflict check include `oraInizio` (non più solo data), soft-delete cleanup per oraInizio specifico
- ✅ **GET**: Response include `mansioneInterna { id, nome, sigla, colore }` per visualizzazione in calendario
- ✅ **409 fix**: Ora il POST non ritorna più 409 quando si crea turno P per stessa data+persona che ha già turno M

#### Frontend DisponibilitaPage.tsx - Rewrite calendario turni
- ✅ **Dual mode**: Toggle Disponibilità/Turni con stato `pageMode`
- ✅ **renderCell turni**: Mostra sigla mansione (es. "RA", "SW", "SG") con colore della mansione al centro della cella; sfondo tenue da disponibilità (opacity-25)
- ✅ **renderCell disponibilità**: Mostra colore pieno + icona preferenza, con sigla turno piccola in angolo se turno assegnato
- ✅ **Toggle non corrompe dati**: Cambio mode pulisce stato drag (`isDragging`, `selectedCells`, `dragStartRef`); `onMouseUp`/`onMouseLeave` attivi solo in modalità disponibilità
- ✅ **Totali dinamici**: Footer row mostra conteggio turni (viola) o disponibilità (blu) in base a `pageMode`
- ✅ **Fabbisogno per modalità**: Righe fabbisogno usano `turniCountsByDayFascia` in modalità turni, `countsByDayFascia` in modalità disponibilità
- ✅ **Per-row summary**: Colonna destra mostra turniM/turniP (viola) o dispM/dispP (emerald) in base a mode
- ✅ **handleTurnoCellClick**: Invia `mansioneInternaId` dal selector, match turno per fascia oraria

#### CRUDButton.tsx
- ✅ **Variant default fix**: Era stringa vuota `''` (bottone invisibile). Ora `border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100` — visibile in tema chiaro e scuro

#### E2E Tests
- ✅ **28 PASS, 0 FAIL, 1 SKIP**
- ✅ Nuovi test: `POST /hr/turni (create MATTINA)`, `POST /hr/turni (create POMERIGGIO same day)`, `GET /hr/turni (verify M+P)`, cleanup entrambi
- ✅ Mansione creata con `sigla: "E2E"` per verificare response include `mansioneInterna.sigla`
- 1 SKIP: timbratura ENTRATA 403 per admin (non ha ProfiloHR abilitato per self-timbratura)

#### DisponibilitaPage.tsx - Refactor completo (6 fix)
- ✅ **Annulla button**: Sempre visibile (disabled se nessuna modifica), non più hidden
- ✅ **Permessi editing**: `canEditCell()` verifica se utente è manager (ADMIN/SUPER_ADMIN/HR_MANAGER) o proprietario del profilo. Celle read-only con stile `opacity-60 cursor-not-allowed`
- ✅ **Data calendario off-by-one**: `formatDateKey()` usa timezone locale (`getFullYear/getMonth/getDate`) invece di `toISOString()` che convertiva in UTC (CET UTC+1 causava giorno indietro)
- ✅ **Salvataggio non persisteva**: Due cause risolte:
  1. **DB**: Unique constraint cambiato da `@@unique([profiloHRId, data])` a `@@unique([profiloHRId, data, fasciaPreferita])` - prima il 2° upsert per stesso giorno sovrascriveva il 1°
  2. **Frontend**: Aggiunto endpoint `/bulk-multi` per salvare multi-profilo in una transazione
  - Migrazione: `20260206_p68_disponibilita_per_fascia`
- ✅ **Duplicate ½ opzioni**: Rimossi `MEZZA_GIORNATA_MATTINA/POMERIGGIO` dal palette (ridondanti con colonne M/P separate)
- ✅ **Conteggi turni**: Footer con riga "Disponibili" + righe per-mansione con fabbisogno `disponibili/richiesti` (verde=OK, rosso=carenza)

#### MansioneInternaDetailPage.tsx - Riscrittura completa
- ✅ **Layout 2 colonne**: Main (info generali, orario, fabbisogno) + Sidebar (ruolo, dipendenti, metadata)
- ✅ **Tutti i campi editabili**: nome, sigla, descrizione, colore (con color picker), areaAziendale, livelloGerarchico, oreMin/Max, fabbisogno M/P/S, defaultRoleId (dropdown ruoli), stato attivo/inattivo
- ✅ **Pulsanti visibili**: Modifica/Elimina in view mode, Salva/Annulla in edit mode, sempre nel header
- ✅ **Tema violet** consistente con modulo HR
- ✅ **Card dipendenti**: Lista dipendenti con questa mansione, navigazione al profilo

#### Backend
- ✅ **bulk-multi endpoint**: `POST /api/v1/hr/disponibilita/bulk-multi` - Accetta entries multi-profilo, salva in transazione con composite key `profiloHRId_data_fasciaPreferita`
- ✅ **Composite key update**: Tutti gli endpoint disponibilità usano `profiloHRId_data_fasciaPreferita`
- ✅ **Schema**: `fasciaPreferita` ora NOT NULL con default `GIORNATA_INTERA`

### 2026-02-07
- ✅ **MansioneInterna + Ruoli**: Aggiunto `defaultRoleId` e `defaultPermissions` per associare ruoli ai mansionari
  - Schema Prisma aggiornato con relazione a CustomRole
  - Backend mansioni-interne-routes.js supporta CRUD dei nuovi campi
  - Frontend MansioniInternePage.tsx con dropdown selezione ruolo
- ✅ **TenantService refactor**: Corretto `createTenant()` per architettura multi-tenant P49
  - Crea automaticamente Company + CompanyTenantProfile per self-company
  - Imposta `selfCompanyProfileId` sul Tenant
- ✅ **ProfiloHR auto-assign company**: Quando si crea un ProfiloHR, il sistema assegna automaticamente
  la persona alla self-company del tenant (se presente)
- ✅ **ActionButton standardizzato**: Tutte le pagine HR usano ActionButton con tema violet
  - ProfiliHRPage, MansioniInternePage, TimbraturaPage, AssenzePage, CartelliniPage
- ✅ **Riorganizzazione navigazione ruoli/permessi**:
  - `/roles` → redirect a `/role-hierarchy`
  - `/tenant-users` → redirect a `/persons`
  - Sidebar e Dashboard aggiornati
- ✅ **File legacy rimossi**:
  - `TenantUsersPage.tsx` - sostituito da redirect a /persons
  - `RolesManagement.tsx` - sostituito da RoleHierarchyPage

### 2026-02-06
- ✅ **DisponibilitaPage.tsx**: Pagina calendario preferenze disponibilità
  - Vista manager: tabella aggregata con tutti i dipendenti per mansione
  - Vista dipendente: calendario interattivo per inserire proprie preferenze
  - Modal per inserimento preferenza con fascia oraria e note
  - Codifica colori per tipo preferenza (DISPONIBILE, NON_DISPONIBILE, ecc.)
  - Navigazione mese con filtri per mansione
- ✅ **TurniPage.tsx**: Pagina gestione turni con calendario
  - Griglia calendario con turni assegnati
  - Modal AssegnaTurnoModal per creazione turni
  - Supporto template turni o orari custom
  - Codifica colori per tipo turno
- ✅ **MansioniInternePage.tsx**: Aggiunto fabbisogno personale per turno
  - Nuovi campi: fabbisognoMattina, fabbisognoPomeriggio, fabbisognoSera
  - Visualizzazione badge M/P/S in tabella
  - Dati salvati in campo JSON requisitiMinimi
- ✅ **HRDashboard.tsx**: Implementata dual view manager/dipendente
  - Vista manager: statistiche team, quick links completi
  - Vista dipendente: TimbraturaBadge, statistiche personali, self-service links
  - Rilevamento ruolo automatico tramite useAuth hook
- ✅ **Backend disponibilita-routes.js**: API calendario disponibilità
  - GET / - Lista manager con filtri
  - GET /mie - Vista dipendente proprie disponibilità
  - GET /calendario - Vista aggregata calendario mensile
  - POST / - Upsert singola disponibilità
  - POST /bulk - Upsert massivo
  - POST /:id/approva - Approvazione manager
  - DELETE /:id - Eliminazione
- ✅ **api.ts**: Esteso con tipi e metodi disponibilità
  - Types: PreferenzaDisponibilita, FasciaOraria, DisponibilitaCalendario
  - API: disponibilitaApi con tutti i metodi CRUD
  - Labels e colori per UI

### 2026-02-05
- ✅ Backend API completato e testato
- ✅ Tutte le route HR registrate: mansioni-interne, profili, turni, timbratura, assenze, cartellini, self-company
- ✅ Schema Prisma allineato con database (48 migrazioni applicate)
- ✅ Frontend pages create senza errori TypeScript
- ✅ Routes frontend registrate in ManagementRouter

---

## 1. Obiettivo del Progetto

Implementare un sistema completo di gestione del personale interno del poliambulatorio/ente di formazione che permetta di:

1. **Gestire la propria azienda come Company** - Il tenant deve avere i propri dati aziendali visibili in `/companies` con DVR, sopralluoghi, corsi interni
2. **Definire mansioni e profili professionali** - Ruoli interni con tipi di contratto (dipendente, libera professione, cococo, occasionale)
3. **Gestire turni e disponibilità** - Preferenze a calendario, ore settimanali, straordinari, ferie, malattie
4. **Gestire timbrature** - Entrata/uscita per dipendenti
5. **Gestire cartellino** - Visualizzazione ore, straordinari, rispetto turni, report gerarchici

---

## 2. Architettura del Sistema

### 2.1 Self-Company Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                         TENANT                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  selfCompanyProfileId ────────▶ CompanyTenantProfile     │  │
│  │                                      │                    │  │
│  │                                      ▼                    │  │
│  │                                   Company                 │  │
│  │                                 (dati azienda)            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  PersonTenantProfile ──────▶ companyTenantProfileId             │
│  (dipendenti interni)        (collega a self-company)           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Modello Dati HR

```
┌────────────────────┐     ┌────────────────────┐
│ PersonTenantProfile│     │   ProfiloHR        │
│ (dati base)        │────▶│ (dati HR estesi)   │
└────────────────────┘     └────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Contratto     │      │  MansionInternaΔ│      │   Turno         │
│ (tipo, date,    │      │ (ruolo interno) │      │ (orari lavoro)  │
│  retribuzione)  │      └─────────────────┘      └─────────────────┘
└─────────────────┘                                       │
                                                          ▼
                                               ┌─────────────────┐
                                               │ Disponibilità   │
                                               │ (preferenze)    │
                                               └─────────────────┘

┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Timbratura    │──────▶│   Cartellino    │◀─────│    Assenza      │
│ (entrata/uscita)│      │ (riepilogo mese)│      │ (ferie/malattia)│
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

---

## 3. Nuove Entità Database

### 3.1 Estensioni a Tenant

```prisma
model Tenant {
  // ... campi esistenti ...
  
  // === P68: SELF-COMPANY ===
  selfCompanyProfileId String? @unique // FK a CompanyTenantProfile (la propria azienda)
  
  // Relazione
  selfCompanyProfile CompanyTenantProfile? @relation("TenantSelfCompany", fields: [selfCompanyProfileId], references: [id])
}
```

### 3.2 Estensioni a PersonTenantProfile

```prisma
model PersonTenantProfile {
  // ... campi esistenti ...
  
  // === P68: DATI CONTRATTO HR ===
  tipoContratto     TipoContratto?  // Tipo contratto lavorativo
  tipoCollaboratore TipoCollaboratore? // Categoria collaboratore
  oreSettimanali    Int?            // Ore contratto settimanale (es. 40)
  
  // Relazione a ProfiloHR (dati estesi)
  profiloHR ProfiloHR?
}

enum TipoContratto {
  DIPENDENTE_INDETERMINATO
  DIPENDENTE_DETERMINATO
  LIBERA_PROFESSIONE
  COCOCO                    // Collaborazione coordinata e continuativa
  PRESTAZIONE_OCCASIONALE
  STAGE_TIROCINIO
  APPRENDISTATO
  SOMMINISTRAZIONE          // Interinale
}

enum TipoCollaboratore {
  AMMINISTRATIVO
  MEDICO
  INFERMIERE
  FORMATORE
  RSPP
  TECNICO
  RECEPTIONIST
  DIREZIONE
  ALTRO
}
```

### 3.3 ProfiloHR (Dati HR Estesi)

```prisma
model ProfiloHR {
  id                      String   @id @default(uuid())
  personTenantProfileId   String   @unique
  tenantId                String
  
  // === MANSIONE INTERNA ===
  mansioneInternaId       String?
  qualifica               String?  @db.VarChar(100) // Qualifica professionale
  livelloInquadramento    String?  @db.VarChar(50)  // es. "D1", "C2", "Quadro"
  ccnl                    String?  @db.VarChar(100) // Contratto collettivo applicato
  
  // === ORARI LAVORO ===
  oreSettimanaliContrattuali Int     @default(40)
  oreGiornaliereStandard     Decimal @default(8) @db.Decimal(4, 2)
  pausaPranzoMinuti          Int     @default(60)
  
  // === PERMESSI E FERIE ===
  giorniFerieAnnuali         Int     @default(26)
  giorniFerieMaturati        Decimal @default(0) @db.Decimal(5, 2)
  giorniFerieUsufruiti       Decimal @default(0) @db.Decimal(5, 2)
  giorniPermessoAnnuali      Int     @default(32)  // ROL
  giorniPermessoMaturati     Decimal @default(0) @db.Decimal(5, 2)
  giorniPermessoUsufruiti    Decimal @default(0) @db.Decimal(5, 2)
  
  // === STRAORDINARI ===
  maxOreStraoMese            Int     @default(40)  // Limite straordinari mensili
  
  // === GESTIONE SPECIALE ===
  inGravidanza               Boolean @default(false)
  dataInizioGravidanza       DateTime? @db.Date
  dataPresuntoParto          DateTime? @db.Date
  dataCongedo                DateTime? @db.Date
  percentualePartTime        Int?    // null = full-time, altrimenti %
  
  // === SMART WORKING ===
  abilitatoSmartWorking      Boolean @default(false)
  maxGiorniSWSettimana       Int     @default(2)
  
  // === BADGE/TIMBRATURA ===
  codiceBadge                String? @unique @db.VarChar(20)
  timbraturaObbligatoria     Boolean @default(true)
  
  // === SUPERVISORE ===
  supervisoreId              String? // FK a Person (responsabile diretto)
  
  // === METADATA ===
  createdAt                  DateTime  @default(now())
  updatedAt                  DateTime  @updatedAt
  deletedAt                  DateTime?
  
  // Relazioni
  personTenantProfile PersonTenantProfile @relation(fields: [personTenantProfileId], references: [id], onDelete: Cascade)
  tenant              Tenant              @relation(fields: [tenantId], references: [id])
  mansioneInterna     MansioneInterna?    @relation(fields: [mansioneInternaId], references: [id])
  supervisore         Person?             @relation("HRSupervisore", fields: [supervisoreId], references: [id])
  
  turniAssegnati      TurnoAssegnato[]
  disponibilita       DisponibilitaCalendario[]
  timbrature          Timbratura[]
  assenze             Assenza[]
  cartellini          Cartellino[]
  
  @@index([tenantId])
  @@index([personTenantProfileId])
  @@index([mansioneInternaId])
  @@index([supervisoreId])
  @@index([deletedAt])
  @@map("profili_hr")
}
```

### 3.4 MansioneInterna (Ruoli Interni)

```prisma
// Mansione interna (diversa da Mansione MDL per lavoratori clienti)
model MansioneInterna {
  id          String  @id @default(uuid())
  tenantId    String
  
  codice      String  @db.VarChar(20)
  nome        String  @db.VarChar(100)
  descrizione String?
  
  // Classificazione
  area        AreaAziendale
  livello     Int     @default(1) // 1=base, 5=direzione
  
  // Abilitazioni richieste
  abilitazioniRichieste String[]
  
  // Orari standard
  orarioStandardInizio  String? @db.VarChar(5) // "09:00"
  orarioStandardFine    String? @db.VarChar(5) // "18:00"
  
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  
  tenant      Tenant      @relation(fields: [tenantId], references: [id])
  profiliHR   ProfiloHR[]
  
  @@unique([tenantId, codice])
  @@index([tenantId])
  @@index([area])
  @@map("mansioni_interne")
}

enum AreaAziendale {
  AMMINISTRAZIONE
  SEGRETERIA
  CLINICA
  FORMAZIONE
  SICUREZZA
  IT
  MARKETING
  DIREZIONE
}
```

### 3.5 TurnoTemplate e TurnoAssegnato

```prisma
// Template turni settimanali riutilizzabili
model TurnoTemplate {
  id          String  @id @default(uuid())
  tenantId    String
  
  nome        String  @db.VarChar(50)  // "Turno Mattina", "Turno Pomeriggio"
  descrizione String?
  
  // Orari
  oraInizio   String  @db.VarChar(5)   // "08:00"
  oraFine     String  @db.VarChar(5)   // "14:00"
  
  // Pausa pranzo inclusa?
  inclPausaPranzo Boolean @default(false)
  pausaInizio     String? @db.VarChar(5) // "12:30"
  pausaFine       String? @db.VarChar(5) // "13:30"
  
  // Giorni applicabili (bitmap: 1=Lun, 2=Mar, 4=Mer, 8=Gio, 16=Ven, 32=Sab, 64=Dom)
  giorniApplicabili Int @default(31) // Default Lun-Ven
  
  colore      String? @db.VarChar(7) // Colore UI
  isActive    Boolean @default(true)
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  
  tenant      Tenant    @relation(fields: [tenantId], references: [id])
  turniAssegnati TurnoAssegnato[]
  
  @@unique([tenantId, nome])
  @@index([tenantId])
  @@map("turni_template")
}

// Turno assegnato a una persona in una data specifica
model TurnoAssegnato {
  id              String   @id @default(uuid())
  profiloHRId     String
  tenantId        String
  
  data            DateTime @db.Date
  turnoTemplateId String?  // null = turno custom
  
  // Orari (override o custom)
  oraInizio       String   @db.VarChar(5)
  oraFine         String   @db.VarChar(5)
  pausaInizio     String?  @db.VarChar(5)
  pausaFine       String?  @db.VarChar(5)
  
  // Tipo turno
  tipo            TipoTurno @default(ORDINARIO)
  
  // Smart working
  isSmartWorking  Boolean  @default(false)
  
  // Ore previste (calcolate)
  orePreviste     Decimal  @db.Decimal(4, 2)
  
  // Stato
  stato           StatoTurno @default(PIANIFICATO)
  
  note            String?
  
  createdBy       String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
  
  profiloHR       ProfiloHR       @relation(fields: [profiloHRId], references: [id], onDelete: Cascade)
  tenant          Tenant          @relation(fields: [tenantId], references: [id])
  turnoTemplate   TurnoTemplate?  @relation(fields: [turnoTemplateId], references: [id])
  
  @@unique([profiloHRId, data])
  @@index([tenantId])
  @@index([profiloHRId])
  @@index([data])
  @@index([tenantId, data])
  @@map("turni_assegnati")
}

enum TipoTurno {
  ORDINARIO
  STRAORDINARIO
  REPERIBILITA
  FORMAZIONE
  TRASFERTA
}

enum StatoTurno {
  PIANIFICATO
  CONFERMATO
  ANNULLATO
  COMPLETATO
}
```

### 3.6 DisponibilitaCalendario

```prisma
// Preferenze disponibilità espresse dal dipendente
model DisponibilitaCalendario {
  id          String   @id @default(uuid())
  profiloHRId String
  tenantId    String
  
  data        DateTime @db.Date
  
  // Preferenza
  preferenza  PreferenzaDisponibilita
  
  // Fasce orarie preferite (se DISPONIBILE o PREFERISCO_NO)
  fasciaPreferita FasciaOraria?
  
  note        String?
  
  // Stato approvazione
  stato       StatoRichiesta @default(IN_ATTESA)
  approvatoDa String?
  approvatoAt DateTime?
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  profiloHR   ProfiloHR @relation(fields: [profiloHRId], references: [id], onDelete: Cascade)
  tenant      Tenant    @relation(fields: [tenantId], references: [id])
  
  @@unique([profiloHRId, data])
  @@index([tenantId])
  @@index([profiloHRId])
  @@index([data])
  @@map("disponibilita_calendario")
}

enum PreferenzaDisponibilita {
  DISPONIBILE           // Disponibile senza preferenze
  PREFERISCO_NO         // Potrei ma preferirei no
  NON_DISPONIBILE       // Non posso
  SMART_WORKING         // Preferisco smart working
  MEZZA_GIORNATA_MATTINA
  MEZZA_GIORNATA_POMERIGGIO
}

enum FasciaOraria {
  MATTINA       // 08:00-14:00
  POMERIGGIO    // 14:00-20:00
  GIORNATA_INTERA
  FLESSIBILE
}

enum StatoRichiesta {
  IN_ATTESA
  APPROVATA
  RIFIUTATA
}
```

### 3.7 Timbratura

```prisma
model Timbratura {
  id          String   @id @default(uuid())
  profiloHRId String
  tenantId    String
  
  dataOra     DateTime @db.Timestamp(6)
  tipo        TipoTimbratura
  
  // Origine timbratura
  origine     OrigineTimbratura @default(WEB)
  codiceBadge String?  @db.VarChar(20)
  ipAddress   String?  @db.VarChar(45)
  userAgent   String?  @db.VarChar(500)
  
  // Geolocalizzazione (opzionale)
  latitudine  Float?
  longitudine Float?
  inSede      Boolean? // Calcolato: è in range della sede?
  
  // Note e giustificativi
  note        String?
  giustificativo String? @db.VarChar(50) // Codice giustificativo
  
  // Stato
  isManuale   Boolean  @default(false) // Inserita manualmente vs timbratura
  isValidata  Boolean  @default(true)
  validataDa  String?
  validataAt  DateTime?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  profiloHR   ProfiloHR @relation(fields: [profiloHRId], references: [id], onDelete: Cascade)
  tenant      Tenant    @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId])
  @@index([profiloHRId])
  @@index([dataOra])
  @@index([tenantId, profiloHRId, dataOra])
  @@map("timbrature")
}

enum TipoTimbratura {
  ENTRATA
  USCITA
  INIZIO_PAUSA
  FINE_PAUSA
  ENTRATA_STRAORDINARIO
  USCITA_STRAORDINARIO
}

enum OrigineTimbratura {
  WEB          // Pulsante su webapp
  APP_MOBILE   // App mobile
  BADGE        // Lettore badge fisico
  MANUALE      // Inserimento manuale da HR
  IMPORT       // Importato da sistema esterno
}
```

### 3.8 Assenza

```prisma
model Assenza {
  id          String   @id @default(uuid())
  profiloHRId String
  tenantId    String
  
  tipo        TipoAssenza
  
  dataInizio  DateTime @db.Date
  dataFine    DateTime @db.Date
  
  // Per assenze parziali
  isGiornataIntera Boolean @default(true)
  oraInizio        String? @db.VarChar(5)
  oraFine          String? @db.VarChar(5)
  
  // Giorni lavorativi (calcolati)
  giorniLavorativi Decimal @db.Decimal(5, 2)
  
  // Documentazione
  motivo           String?
  certificatoId    String?  // FK a documento allegato
  numeroCertificato String? @db.VarChar(50)
  
  // Approvazione
  stato            StatoRichiesta @default(IN_ATTESA)
  richiestoAt      DateTime       @default(now())
  approvatoDa      String?
  approvatoAt      DateTime?
  rifiutatoDa      String?
  rifiutatoAt      DateTime?
  motivoRifiuto    String?
  
  // Specifico per malattia
  prognosi         Int?     // Giorni prognosi
  patologia        String?  // Codice o descrizione generica
  
  // Specifico per maternità/paternità
  tipoCongedo      TipoCongedo?
  
  note             String?
  
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?
  
  profiloHR        ProfiloHR @relation(fields: [profiloHRId], references: [id], onDelete: Cascade)
  tenant           Tenant    @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId])
  @@index([profiloHRId])
  @@index([dataInizio])
  @@index([dataFine])
  @@index([tipo])
  @@index([stato])
  @@index([tenantId, tipo, stato])
  @@map("assenze")
}

enum TipoAssenza {
  FERIE
  PERMESSO_ROL
  PERMESSO_EX_FESTIVITA
  MALATTIA
  INFORTUNIO
  MATERNITA
  PATERNITA
  CONGEDO_PARENTALE
  LUTTO
  MATRIMONIO
  DONAZIONE_SANGUE
  LEGGE_104
  PERMESSO_STUDIO
  ASPETTATIVA_NON_RETRIBUITA
  ALTRO
}

enum TipoCongedo {
  MATERNITA_OBBLIGATORIA      // 5 mesi
  MATERNITA_FACOLTATIVA       // Ulteriori mesi
  PATERNITA_OBBLIGATORIA      // 10 giorni
  PATERNITA_FACOLTATIVA
  PARENTALE                   // Per entrambi i genitori
  ALLATTAMENTO                // Ore riduzione giornaliera
}
```

### 3.9 Cartellino (Riepilogo Mensile)

```prisma
model Cartellino {
  id          String   @id @default(uuid())
  profiloHRId String
  tenantId    String
  
  anno        Int
  mese        Int      // 1-12
  
  // === RIEPILOGO ORE ===
  oreLavoratePreviste    Decimal @db.Decimal(6, 2)  // Da contratto
  oreLavorateEffettive   Decimal @db.Decimal(6, 2)  // Da timbrature
  oreStraordinario       Decimal @db.Decimal(6, 2)
  oreStraordinarioNottNo Decimal @default(0) @db.Decimal(6, 2)
  oreStraordinarioFestivo Decimal @default(0) @db.Decimal(6, 2)
  
  // === DIFFERENZA ===
  differenzaOre          Decimal @db.Decimal(6, 2)  // Positivo=straord, Negativo=deficit
  
  // === ASSENZE ===
  giorniFerie            Decimal @db.Decimal(5, 2)
  giorniPermesso         Decimal @db.Decimal(5, 2)
  giorniMalattia         Decimal @db.Decimal(5, 2)
  giorniAltreAssenze     Decimal @db.Decimal(5, 2)
  
  // === SMART WORKING ===
  giorniSmartWorking     Int     @default(0)
  
  // === ANOMALIE ===
  numeroRitardi          Int     @default(0)
  minutiRitardoTotali    Int     @default(0)
  numeroUsciteAnticipate Int     @default(0)
  timbratureMancanti     Int     @default(0)
  
  // === PERCENTUALI ===
  percentualePresenza    Decimal @default(100) @db.Decimal(5, 2)
  percentualeRispettoTurni Decimal @default(100) @db.Decimal(5, 2)
  
  // === STATO ===
  stato                  StatoCartellino @default(BOZZA)
  validatoDa             String?
  validatoAt             DateTime?
  
  note                   String?
  
  // === DETTAGLIO GIORNALIERO (JSON) ===
  dettaglioGiorni        Json?   // Array di { giorno, orePreviste, oreLavorate, anomalie[] }
  
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  
  profiloHR              ProfiloHR @relation(fields: [profiloHRId], references: [id], onDelete: Cascade)
  tenant                 Tenant    @relation(fields: [tenantId], references: [id])
  
  @@unique([profiloHRId, anno, mese])
  @@index([tenantId])
  @@index([profiloHRId])
  @@index([anno, mese])
  @@index([tenantId, anno, mese])
  @@map("cartellini")
}

enum StatoCartellino {
  BOZZA
  IN_REVISIONE
  VALIDATO
  CHIUSO
}
```

---

## 4. API Endpoints

### 4.1 Self-Company

```
POST   /api/v1/tenant/setup-self-company      # Setup iniziale company del tenant
GET    /api/v1/tenant/self-company            # Dati company propria
PUT    /api/v1/tenant/self-company            # Aggiorna dati
```

### 4.2 Mansioni Interne

```
GET    /api/v1/hr/mansioni                    # Lista mansioni
POST   /api/v1/hr/mansioni                    # Crea mansione
GET    /api/v1/hr/mansioni/:id                # Dettaglio
PUT    /api/v1/hr/mansioni/:id                # Modifica
DELETE /api/v1/hr/mansioni/:id                # Elimina (soft)
```

### 4.3 Profili HR

```
GET    /api/v1/hr/profili                     # Lista personale interno
POST   /api/v1/hr/profili                     # Crea profilo HR
GET    /api/v1/hr/profili/:id                 # Dettaglio
PUT    /api/v1/hr/profili/:id                 # Modifica
DELETE /api/v1/hr/profili/:id                 # Elimina (soft)
GET    /api/v1/hr/profili/:id/cartellino      # Cartellino mensile
GET    /api/v1/hr/profili/:id/assenze         # Storico assenze
```

### 4.4 Turni

```
GET    /api/v1/hr/turni/templates             # Template turni
POST   /api/v1/hr/turni/templates             # Crea template
PUT    /api/v1/hr/turni/templates/:id         # Modifica
DELETE /api/v1/hr/turni/templates/:id         # Elimina

GET    /api/v1/hr/turni                       # Turni assegnati (con filtri data, persona)
POST   /api/v1/hr/turni                       # Assegna turno
POST   /api/v1/hr/turni/bulk                  # Assegnazione massiva
PUT    /api/v1/hr/turni/:id                   # Modifica turno
DELETE /api/v1/hr/turni/:id                   # Elimina turno

GET    /api/v1/hr/turni/calendario            # Vista calendario completo
GET    /api/v1/hr/turni/riepilogo-settimanale # Riepilogo ore per settimana
```

### 4.5 Disponibilità

```
GET    /api/v1/hr/disponibilita               # Lista disponibilità (con filtri)
POST   /api/v1/hr/disponibilita               # Inserisci preferenza
PUT    /api/v1/hr/disponibilita/:id           # Modifica preferenza
DELETE /api/v1/hr/disponibilita/:id           # Elimina preferenza

POST   /api/v1/hr/disponibilita/:id/approva   # Approva (supervisor)
POST   /api/v1/hr/disponibilita/:id/rifiuta   # Rifiuta (supervisor)
```

### 4.6 Timbrature

```
POST   /api/v1/hr/timbrature                  # Timbra (entrata/uscita/pausa)
GET    /api/v1/hr/timbrature                  # Lista timbrature (con filtri)
GET    /api/v1/hr/timbrature/oggi             # Timbrature odierne dell'utente
PUT    /api/v1/hr/timbrature/:id              # Modifica (solo HR/supervisor)
POST   /api/v1/hr/timbrature/:id/valida       # Valida timbratura manuale
DELETE /api/v1/hr/timbrature/:id              # Elimina (solo HR)

GET    /api/v1/hr/timbrature/stato-oggi       # Stato attuale (in/out) per badge UI
```

### 4.7 Assenze

```
GET    /api/v1/hr/assenze                     # Lista assenze (con filtri)
POST   /api/v1/hr/assenze                     # Richiedi assenza
GET    /api/v1/hr/assenze/:id                 # Dettaglio
PUT    /api/v1/hr/assenze/:id                 # Modifica (se ancora in attesa)
DELETE /api/v1/hr/assenze/:id                 # Annulla richiesta

POST   /api/v1/hr/assenze/:id/approva         # Approva (supervisor)
POST   /api/v1/hr/assenze/:id/rifiuta         # Rifiuta (supervisor)

GET    /api/v1/hr/assenze/saldo               # Saldo ferie/permessi per utente
GET    /api/v1/hr/assenze/calendario          # Calendario assenze team
```

### 4.8 Cartellino

```
GET    /api/v1/hr/cartellino                  # Cartellino corrente utente
GET    /api/v1/hr/cartellino/:anno/:mese      # Cartellino specifico
GET    /api/v1/hr/cartellino/:id              # Dettaglio cartellino

POST   /api/v1/hr/cartellino/genera           # Genera/rigenera cartellino mese
POST   /api/v1/hr/cartellino/:id/valida       # Valida cartellino (HR)
POST   /api/v1/hr/cartellino/:id/chiudi       # Chiudi cartellino (blocca modifiche)

GET    /api/v1/hr/cartellino/report           # Report cartellini team (supervisor)
GET    /api/v1/hr/cartellino/anomalie         # Lista anomalie da risolvere
```

### 4.9 Dashboard HR

```
GET    /api/v1/hr/dashboard                   # Dashboard riepilogativa
GET    /api/v1/hr/dashboard/presenze-oggi     # Chi è presente oggi
GET    /api/v1/hr/dashboard/assenze-periodo   # Assenze pianificate periodo
GET    /api/v1/hr/dashboard/straordinari      # Riepilogo straordinari
GET    /api/v1/hr/dashboard/anomalie          # Anomalie da gestire
```

---

## 5. Permessi RBAC

Nuovi permessi da aggiungere:

```javascript
// HR Base (lettura propri dati)
'hr:read:own'           // Vede proprio profilo HR
'hr:timbratura:own'     // Può timbrare
'hr:disponibilita:own'  // Può inserire proprie disponibilità
'hr:assenze:request'    // Può richiedere assenze
'hr:cartellino:own'     // Vede proprio cartellino

// HR Team (supervisore)
'hr:read:team'          // Vede profili del team
'hr:turni:assign'       // Può assegnare turni al team
'hr:assenze:approve'    // Può approvare assenze team
'hr:cartellino:team'    // Vede cartellini team
'hr:timbrature:team'    // Vede timbrature team

// HR Admin (HR manager)
'hr:read:all'           // Vede tutti i profili
'hr:write'              // Crea/modifica profili HR
'hr:turni:manage'       // Gestione completa turni
'hr:assenze:manage'     // Gestione completa assenze
'hr:cartellino:manage'  // Gestione cartellini
'hr:timbrature:manage'  // Gestione timbrature
'hr:mansioni:manage'    // Gestione mansioni interne
'hr:report'             // Accesso report HR
```

---

## 6. Frontend Components

### 6.1 Nuove Pagine

```
/management/hr                        # Dashboard HR (dual view manager/dipendente)
/management/hr/personale              # Lista personale interno (ProfiloHR)
/management/hr/personale/:id          # Dettaglio persona
/management/hr/mansioni               # Gestione mansioni (con fabbisogno/turno)
/management/hr/turni                  # Gestione turni (calendario + assignment)
/management/hr/turni/templates        # Template turni
/management/hr/disponibilita          # Calendario disponibilità preferenze
/management/hr/assenze                # Gestione assenze
/management/hr/timbrature             # Lista timbrature
/management/hr/cartellini             # Cartellini mensili
/management/hr/report                 # Report HR
```

### 6.2 Pagine Implementate (v1.1.0)

#### DisponibilitaPage.tsx
Pagina calendario per gestione preferenze disponibilità dipendenti:

**Vista Manager**:
- Tabella con righe = dipendenti, colonne = giorni del mese
- Celle con badge colorato per preferenza (verde=disponibile, rosso=non disponibile, ecc.)
- Filtro per mansione
- Click su cella per modificare/approvare

**Vista Dipendente**:
- Calendario griglia mensile clickabile
- Modal per inserire preferenza con:
  - PreferenzaDisponibilita (DISPONIBILE, NON_DISPONIBILE, SMART_WORKING, ecc.)
  - FasciaOraria (MATTINA, POMERIGGIO, GIORNATA_INTERA, FLESSIBILE)
  - Note opzionali

#### TurniPage.tsx
Pagina calendario per gestione turni:

- Griglia calendario con visualizzazione turni assegnati
- Modal AssegnaTurnoModal per creazione turni
- Supporto selezione template o orari custom
- Codifica colori per tipo turno (ORDINARIO, STRAORDINARIO, ecc.)

#### MansioniInternePage.tsx (Enhanced)
Gestione mansioni con fabbisogno personale:

- Tabella mansioni con nuova colonna "Fabbisogno/Turno"
- Badge M/P/S che mostrano quante persone servono per fascia
- Form con sezione dedicata:
  - Fabbisogno Mattina (numero persone)
  - Fabbisogno Pomeriggio
  - Fabbisogno Sera
- Dati salvati in campo JSON `requisitiMinimi`

#### HRDashboard.tsx (Dual View)
Dashboard con vista differenziata per ruolo:

**Vista Manager** (role HR o admin):
- Card statistiche: Profili attivi, Assenze pending, Cartellini da validare
- Quick links completi: Turni, Disponibilità, Timbrature, Assenze, ecc.

**Vista Dipendente**:
- TimbraturaBadge componente per timbrata rapida
- Card statistiche personali: Ore lavorate mese, Ferie residue, Prossimo turno
- Quick links self-service: Richiedi ferie, Inserisci disponibilità, Vedi cartellino

### 6.3 Widget Timbratura

Componente visibile nella toolbar/header per dipendenti:

```tsx
<TimbraturaBadge />
// Mostra:
// - Stato attuale (IN SEDE / FUORI SEDE / IN PAUSA)
// - Ora ultima timbratura
// - Pulsante ENTRATA/USCITA/PAUSA
// - Ore lavorate oggi
```

---

## 7. Fasi di Implementazione

### Fase 1: Schema e Self-Company (8h)
1. Estendere schema Prisma con nuove entità
2. Migrazioni database
3. Setup self-company nel tenant
4. API base self-company

### Fase 2: Mansioni e Profili HR (12h)
1. CRUD MansioneInterna
2. CRUD ProfiloHR
3. Collegamento PersonTenantProfile ↔ ProfiloHR
4. UI gestione personale

### Fase 3: Turni e Disponibilità (16h)
1. Template turni
2. Assegnazione turni
3. Calendario turni
4. Gestione disponibilità
5. UI calendario interattivo

### Fase 4: Timbrature (16h)
1. API timbratura
2. Widget timbratura frontend
3. Validazione timbrature
4. Geolocalizzazione (opzionale)

### Fase 5: Assenze (12h)
1. CRUD assenze
2. Workflow approvazione
3. Calendario assenze
4. Calcolo saldi ferie/permessi

### Fase 6: Cartellino (16h)
1. Generazione cartellino mensile
2. Calcolo ore e anomalie
3. Validazione cartellino
4. Report e export

### Fase 7: Dashboard e Report (12h)
1. Dashboard HR
2. Report presenze
3. Report anomalie
4. Export dati

---

## 8. Considerazioni GDPR

- **Audit Log**: Tutte le operazioni HR loggate in GdprAuditLog
- **Soft Delete**: Nessun hard delete su dati personale
- **Retention**: Timbrature conservate per 5 anni (requisito legale)
- **Accesso**: Ogni persona vede solo i propri dati (o del team se supervisor)
- **Export**: Diritto di accesso: export completo dati HR propri
- **Anonymization**: Alla cancellazione, mantenere aggregati anonimizzati

---

## 9. Integrazioni Future

- **Buste Paga**: Export dati per elaborazione paghe
- **Badge Fisico**: Integrazione lettori badge RFID
- **App Mobile**: Timbratura da smartphone con GPS
- **Calendario Google/Outlook**: Sync turni
- **Notifiche**: Reminder turni, scadenze ferie, anomalie

---

## 10. Testing

- Unit test per calcoli ore/cartellino
- Integration test per workflow approvazione
- E2E test per timbratura
- Test GDPR per accesso dati

---

## Appendice A: Collaboratori Esterni

Per medici, formatori, RSPP esterni (liberi professionisti):

- Usano `TipoContratto.LIBERA_PROFESSIONE`
- Non hanno `timbraturaObbligatoria = false`
- Vengono visualizzati in un tab separato "Collaboratori"
- Possono avere mansioni e turni ma senza cartellino/timbrature

---

**Note Implementazione**:
- Rispettare pattern P48/P49 per Person/Company
- Usare `req.person.tenantId` per multi-tenancy
- Implementare CRUDButton per tutti i pulsanti
- Usare showToast per notifiche
- Seguire design system colori (teal per clinica, violet per management)
