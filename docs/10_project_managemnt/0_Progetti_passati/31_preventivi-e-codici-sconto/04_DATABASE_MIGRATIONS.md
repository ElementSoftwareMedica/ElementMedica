# 🗄️ Database Migrations - Sistema Preventivi e Codici Sconto

**Progetto**: Database Schema Changes  
**Data**: 8 Novembre 2025  
**Versione**: 1.0  
**Target Database**: PostgreSQL 14+  
**ORM**: Prisma 5.x

---

## 📋 Indice

1. [Overview Modifiche](#overview-modifiche)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Schema Changes](#schema-changes)
4. [Migration Scripts](#migration-scripts)
5. [Seed Data](#seed-data)
6. [Rollback Procedures](#rollback-procedures)
7. [Testing & Validation](#testing--validation)
8. [Post-Migration Tasks](#post-migration-tasks)

---

## 🎯 Overview Modifiche

### Nuove Tabelle
- ✅ `CodiceSconto` - Gestione codici sconto
- ✅ `Preventivo` - Gestione preventivi
- ✅ `PreventivoSconto` - Snapshot sconti applicati
- ✅ `CodiceAzienda` - Join table codici-aziende
- ✅ `CodicePersona` - Join table codici-persone
- ✅ `CodiceCorso` - Join table codici-corsi

### Tabelle Modificate
- 🔧 `CourseSchedule` - Aggiunti campi pricing
- 🔧 `Company` - Relazioni preventivi
- 🔧 `Person` - Relazioni preventivi
- 🔧 `Training` - Campo `prezzoBase`

### Enums
- ✅ `TipoSconto` (PERCENTUALE, VALORE_ASSOLUTO)
- ✅ `ApplicabilitaSconto` (TUTTI, AZIENDE, PERSONE, SPECIFICI)
- ✅ `TipoCorsoSconto` (TUTTI, SPECIFICI)
- ✅ `StatoPreventivo` (BOZZA, INVIATO, ACCETTATO, etc.)
- ✅ `ClienteType` (AZIENDA, PERSONA)

### Indici
- 12 nuovi indici per performance query
- Indici multi-colonna per ricerche complesse
- Indici univoci per codici sconto

---

## ✅ Pre-Migration Checklist

### 1. Backup Database

```bash
# Backup completo database produzione
pg_dump -h localhost -U postgres -d elementmedica_prod \
  -F c -b -v -f backup_pre_preventivi_$(date +%Y%m%d_%H%M%S).dump

# Verifica backup
pg_restore -l backup_pre_preventivi_*.dump | head -n 20

# Backup schema only (per reference)
pg_dump -h localhost -U postgres -d elementmedica_prod \
  --schema-only -f schema_pre_preventivi_$(date +%Y%m%d).sql
```

### 2. Verifica Spazio Disco

```bash
# Verifica spazio disponibile (minimo 5GB free)
df -h | grep '/var/lib/postgresql'

# Stima dimensioni nuove tabelle
# CodiceSconto: ~1000 record × 2KB = 2MB
# Preventivo: ~10000 record × 3KB = 30MB
# Join tables: ~5000 record × 0.5KB = 2.5MB
# TOTALE STIMATO: ~50MB + indici ~20MB = 70MB
```

### 3. Verifica Versioni

```bash
# Prisma CLI version (richiesta >= 5.0.0)
npx prisma --version

# PostgreSQL version (richiesta >= 12.0)
psql -U postgres -c "SELECT version();"

# Node.js version (richiesta >= 18.0.0)
node --version
```

### 4. Environment Preparation

```bash
# Crea branch dedicato
git checkout -b feature/preventivi-codici-sconto
git pull origin main

# Backup .env file
cp backend/.env backend/.env.backup

# Verifica connessione database
cd backend
npx prisma db execute --file test_connection.sql
```

---

## 🛠️ Schema Changes

### File: `backend/prisma/schema.prisma`

#### 1. Definizione Enums

```prisma
// ========================================
// ENUMS - Preventivi e Codici Sconto
// ========================================

enum TipoSconto {
  PERCENTUALE
  VALORE_ASSOLUTO
}

enum ApplicabilitaSconto {
  TUTTI           // Applicabile a tutti
  AZIENDE         // Solo aziende
  PERSONE         // Solo persone fisiche
  SPECIFICI       // Solo aziende/persone/corsi specifici
}

enum TipoCorsoSconto {
  TUTTI           // Tutti i corsi
  SPECIFICI       // Solo corsi nella lista corsiApplicabili
}

enum StatoPreventivo {
  BOZZA           // Appena creato, ancora modificabile
  INVIATO         // Inviato al cliente
  VISUALIZZATO    // Cliente ha aperto il PDF
  ACCETTATO       // Cliente ha accettato
  RIFIUTATO       // Cliente ha rifiutato
  SCADUTO         // Oltre dataScadenza
  CONVERTITO      // Convertito in ordine/fattura
  ANNULLATO       // Annullato manualmente
}

enum ClienteType {
  AZIENDA
  PERSONA
}

enum ModalitaErogazione {
  PRESENZA
  ONLINE
  IBRIDA
}
```

#### 2. Modello CodiceSconto

```prisma
model CodiceSconto {
  id                   String                 @id @default(uuid())
  
  // Identificazione
  codice               String                 // Es: "PROMO2025", "VIP50"
  nome                 String                 // Nome descrittivo
  descrizione          String?                @db.Text
  
  // Tipo e valore sconto
  tipoSconto           TipoSconto
  valore               Decimal                @db.Decimal(10, 2) // Percentuale (0-100) o valore assoluto in €
  
  // Validità temporale
  dataInizio           DateTime
  dataFine             DateTime
  attivo               Boolean                @default(true) // Toggle on/off manuale
  
  // Limitazioni utilizzo
  utilizzoMassimo      Int?                   // Max utilizzi globali (null = illimitato)
  utilizzoCorrente     Int                    @default(0) // Contatore utilizzi
  utilizzoPerUtente    Int?                   // Max utilizzi per singolo utente (null = illimitato)
  
  // Regole applicazione
  cumulabile           Boolean                @default(false) // Può essere combinato con altri sconti
  minImporto           Decimal?               @db.Decimal(10, 2) // Importo minimo richiesto
  maxImporto           Decimal?               @db.Decimal(10, 2) // Sconto massimo applicabile (cap)
  
  // Applicabilità
  applicabileA         ApplicabilitaSconto    @default(TUTTI)
  tipoCorso            TipoCorsoSconto        @default(TUTTI)
  categorieCorso       String[]               // Array categorie corsi (es: ["sicurezza", "formazione"])
  
  // Relazioni
  aziende              CodiceAzienda[]        // Aziende specifiche autorizzate
  persone              CodicePersona[]        // Persone specifiche autorizzate
  corsi                CodiceCorso[]          // Corsi specifici applicabili
  preventivi           PreventivoSconto[]     // Preventivi che usano questo codice
  
  // Multi-tenancy
  tenantId             String
  tenant               Tenant                 @relation(fields: [tenantId], references: [id])
  
  // Audit
  createdBy            String                 // User ID che ha creato
  createdAt            DateTime               @default(now())
  updatedAt            DateTime               @updatedAt
  deletedAt            DateTime?              // Soft delete
  
  // Indexes
  @@unique([codice, tenantId, deletedAt])
  @@index([tenantId, attivo, dataInizio, dataFine])
  @@index([tenantId, tipoSconto])
  @@index([codice])
  @@map("codici_sconto")
}
```

#### 3. Modello Preventivo

```prisma
model Preventivo {
  id                    String                @id @default(uuid())
  
  // Numerazione progressiva
  numero                String                // Formato: "PREV-2025-0001"
  annoProgressivo       Int                   // Anno di riferimento
  numeroProgressivo     Int                   // Numero nell'anno
  
  // Riferimenti
  scheduleId            String?               // Riferimento al corso schedulato (opzionale)
  schedule              CourseSchedule?       @relation(fields: [scheduleId], references: [id])
  
  corsoId               String                // Corso per cui si fa preventivo
  corso                 Training              @relation(fields: [corsoId], references: [id])
  
  // Cliente
  clienteType           ClienteType           // AZIENDA o PERSONA
  aziendaId             String?               // Se clienteType = AZIENDA
  azienda               Company?              @relation(fields: [aziendaId], references: [id])
  personaId             String?               // Se clienteType = PERSONA
  persona               Person?               @relation(fields: [personaId], references: [id])
  
  // Dettagli corso (snapshot al momento creazione)
  titoloCorso           String
  descrizioneCorso      String?               @db.Text
  durataOre             Int
  numeroPartecipanti    Int
  modalitaErogazione    ModalitaErogazione
  
  // Calcoli finanziari
  prezzoUnitario        Decimal               @db.Decimal(10, 2) // Prezzo per partecipante
  prezzoTotale          Decimal               @db.Decimal(10, 2) // prezzoUnitario × numeroPartecipanti
  scontoTotale          Decimal               @db.Decimal(10, 2) @default(0) // Somma tutti gli sconti
  importoFinale         Decimal               @db.Decimal(10, 2) // prezzoTotale - scontoTotale
  
  // Date
  dataEmissione         DateTime              @default(now())
  dataScadenza          DateTime              // Data oltre la quale il preventivo decade
  
  // Workflow
  stato                 StatoPreventivo       @default(BOZZA)
  dataInvio             DateTime?             // Quando è stato inviato
  dataAccettazione      DateTime?             // Quando è stato accettato
  dataRifiuto           DateTime?             // Quando è stato rifiutato
  motivoRifiuto         String?               @db.Text
  
  // Note e condizioni
  note                  String?               @db.Text
  condizioniPagamento   String?               @db.Text // Es: "50% anticipo, saldo a fine corso"
  
  // File PDF
  fileUrl               String?               // Path al PDF generato
  fileName              String?               // Nome file originale
  fileSize              Int?                  // Dimensione in bytes
  
  // Relazioni
  sconti                PreventivoSconto[]    // Sconti applicati
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant                @relation(fields: [tenantId], references: [id])
  
  // Audit
  generatedBy           String                // User ID che ha generato
  generatedAt           DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  deletedAt             DateTime?             // Soft delete
  
  // Constraints
  @@unique([tenantId, numero])
  @@index([tenantId, stato, dataEmissione])
  @@index([tenantId, clienteType, aziendaId, personaId])
  @@index([scheduleId])
  @@index([corsoId])
  @@index([numero])
  @@map("preventivi")
}
```

#### 4. Modello PreventivoSconto (Snapshot)

```prisma
model PreventivoSconto {
  id                String        @id @default(uuid())
  
  // Relazioni
  preventivoId      String
  preventivo        Preventivo    @relation(fields: [preventivoId], references: [id], onDelete: Cascade)
  
  codiceId          String
  codice            CodiceSconto  @relation(fields: [codiceId], references: [id])
  
  // Snapshot dati codice al momento applicazione
  codiceString      String        // Il codice testuale (es: "PROMO2025")
  descrizione       String?
  tipoSconto        TipoSconto
  valore            Decimal       @db.Decimal(10, 2)
  scontoCalcolato   Decimal       @db.Decimal(10, 2) // Sconto effettivo applicato in €
  
  // Audit applicazione
  applicatoAt       DateTime      @default(now())
  applicatoDa       String        // User ID che ha applicato
  
  // Indexes
  @@index([preventivoId])
  @@index([codiceId])
  @@map("preventivi_sconti")
}
```

#### 5. Join Tables

```prisma
// Aziende autorizzate per codice sconto
model CodiceAzienda {
  id            String        @id @default(uuid())
  codiceId      String
  codice        CodiceSconto  @relation(fields: [codiceId], references: [id], onDelete: Cascade)
  aziendaId     String
  azienda       Company       @relation(fields: [aziendaId], references: [id], onDelete: Cascade)
  createdAt     DateTime      @default(now())
  
  @@unique([codiceId, aziendaId])
  @@index([codiceId])
  @@index([aziendaId])
  @@map("codici_aziende")
}

// Persone autorizzate per codice sconto
model CodicePersona {
  id            String        @id @default(uuid())
  codiceId      String
  codice        CodiceSconto  @relation(fields: [codiceId], references: [id], onDelete: Cascade)
  personaId     String
  persona       Person        @relation(fields: [personaId], references: [id], onDelete: Cascade)
  createdAt     DateTime      @default(now())
  
  @@unique([codiceId, personaId])
  @@index([codiceId])
  @@index([personaId])
  @@map("codici_persone")
}

// Corsi applicabili per codice sconto
model CodiceCorso {
  id            String        @id @default(uuid())
  codiceId      String
  codice        CodiceSconto  @relation(fields: [codiceId], references: [id], onDelete: Cascade)
  corsoId       String
  corso         Training      @relation(fields: [corsoId], references: [id], onDelete: Cascade)
  createdAt     DateTime      @default(now())
  
  @@unique([codiceId, corsoId])
  @@index([codiceId])
  @@index([corsoId])
  @@map("codici_corsi")
}
```

#### 6. Modifiche Modelli Esistenti

```prisma
// ========================================
// MODIFICHE AI MODELLI ESISTENTI
// ========================================

model CourseSchedule {
  // ... campi esistenti ...
  
  // NUOVO: Campi pricing
  prezzoUnitario      Decimal?              @db.Decimal(10, 2) // Prezzo per partecipante
  prezzoTotale        Decimal?              @db.Decimal(10, 2) // Prezzo totale calcolato
  modalitaErogazione  ModalitaErogazione?   // Presenza/Online/Ibrida
  
  // NUOVO: Relazioni preventivi
  preventivi          Preventivo[]
  
  // ... resto invariato ...
}

model Company {
  // ... campi esistenti ...
  
  // NUOVO: Relazioni preventivi e codici
  codiciSconto        CodiceAzienda[]
  preventivi          Preventivo[]
  
  // ... resto invariato ...
}

model Person {
  // ... campi esistenti ...
  
  // NUOVO: Relazioni preventivi e codici
  codiciSconto        CodicePersona[]
  preventivi          Preventivo[]
  
  // ... resto invariato ...
}

model Training {
  // ... campi esistenti ...
  
  // NUOVO: Prezzo base e relazioni
  prezzoBase          Decimal?              @db.Decimal(10, 2) // Prezzo base per partecipante
  codiciSconto        CodiceCorso[]
  preventivi          Preventivo[]
  
  // ... resto invariato ...
}

model Tenant {
  // ... campi esistenti ...
  
  // NUOVO: Relazioni preventivi
  codiciSconto        CodiceSconto[]
  preventivi          Preventivo[]
  
  // ... resto invariato ...
}
```

---

## 🚀 Migration Scripts

### Step 1: Generate Migration

```bash
cd backend

# Genera migration da schema
npx prisma migrate dev --name add_preventivi_codici_sconto --create-only

# Questo creerà file: 
# prisma/migrations/YYYYMMDDHHMMSS_add_preventivi_codici_sconto/migration.sql
```

### Step 2: Review Generated SQL

Il file generato sarà simile a:

```sql
-- CreateEnum
CREATE TYPE "TipoSconto" AS ENUM ('PERCENTUALE', 'VALORE_ASSOLUTO');
CREATE TYPE "ApplicabilitaSconto" AS ENUM ('TUTTI', 'AZIENDE', 'PERSONE', 'SPECIFICI');
CREATE TYPE "TipoCorsoSconto" AS ENUM ('TUTTI', 'SPECIFICI');
CREATE TYPE "StatoPreventivo" AS ENUM ('BOZZA', 'INVIATO', 'VISUALIZZATO', 'ACCETTATO', 'RIFIUTATO', 'SCADUTO', 'CONVERTITO', 'ANNULLATO');
CREATE TYPE "ClienteType" AS ENUM ('AZIENDA', 'PERSONA');
CREATE TYPE "ModalitaErogazione" AS ENUM ('PRESENZA', 'ONLINE', 'IBRIDA');

-- CreateTable
CREATE TABLE "codici_sconto" (
    "id" TEXT NOT NULL,
    "codice" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT,
    "tipoSconto" "TipoSconto" NOT NULL,
    "valore" DECIMAL(10,2) NOT NULL,
    "dataInizio" TIMESTAMP(3) NOT NULL,
    "dataFine" TIMESTAMP(3) NOT NULL,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "utilizzoMassimo" INTEGER,
    "utilizzoCorrente" INTEGER NOT NULL DEFAULT 0,
    "utilizzoPerUtente" INTEGER,
    "cumulabile" BOOLEAN NOT NULL DEFAULT false,
    "minImporto" DECIMAL(10,2),
    "maxImporto" DECIMAL(10,2),
    "applicabileA" "ApplicabilitaSconto" NOT NULL DEFAULT 'TUTTI',
    "tipoCorso" "TipoCorsoSconto" NOT NULL DEFAULT 'TUTTI',
    "categorieCorso" TEXT[],
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codici_sconto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preventivi" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "annoProgressivo" INTEGER NOT NULL,
    "numeroProgressivo" INTEGER NOT NULL,
    "scheduleId" TEXT,
    "corsoId" TEXT NOT NULL,
    "clienteType" "ClienteType" NOT NULL,
    "aziendaId" TEXT,
    "personaId" TEXT,
    "titoloCorso" TEXT NOT NULL,
    "descrizioneCorso" TEXT,
    "durataOre" INTEGER NOT NULL,
    "numeroPartecipanti" INTEGER NOT NULL,
    "modalitaErogazione" "ModalitaErogazione" NOT NULL,
    "prezzoUnitario" DECIMAL(10,2) NOT NULL,
    "prezzoTotale" DECIMAL(10,2) NOT NULL,
    "scontoTotale" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "importoFinale" DECIMAL(10,2) NOT NULL,
    "dataEmissione" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataScadenza" TIMESTAMP(3) NOT NULL,
    "stato" "StatoPreventivo" NOT NULL DEFAULT 'BOZZA',
    "dataInvio" TIMESTAMP(3),
    "dataAccettazione" TIMESTAMP(3),
    "dataRifiuto" TIMESTAMP(3),
    "motivoRifiuto" TEXT,
    "note" TEXT,
    "condizioniPagamento" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "tenantId" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "preventivi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preventivi_sconti" (
    "id" TEXT NOT NULL,
    "preventivoId" TEXT NOT NULL,
    "codiceId" TEXT NOT NULL,
    "codiceString" TEXT NOT NULL,
    "descrizione" TEXT,
    "tipoSconto" "TipoSconto" NOT NULL,
    "valore" DECIMAL(10,2) NOT NULL,
    "scontoCalcolato" DECIMAL(10,2) NOT NULL,
    "applicatoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicatoDa" TEXT NOT NULL,

    CONSTRAINT "preventivi_sconti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codici_aziende" (
    "id" TEXT NOT NULL,
    "codiceId" TEXT NOT NULL,
    "aziendaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codici_aziende_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codici_persone" (
    "id" TEXT NOT NULL,
    "codiceId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codici_persone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codici_corsi" (
    "id" TEXT NOT NULL,
    "codiceId" TEXT NOT NULL,
    "corsoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codici_corsi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "codici_sconto_tenantId_attivo_dataInizio_dataFine_idx" ON "codici_sconto"("tenantId", "attivo", "dataInizio", "dataFine");
CREATE INDEX "codici_sconto_tenantId_tipoSconto_idx" ON "codici_sconto"("tenantId", "tipoSconto");
CREATE INDEX "codici_sconto_codice_idx" ON "codici_sconto"("codice");
CREATE UNIQUE INDEX "codici_sconto_codice_tenantId_deletedAt_key" ON "codici_sconto"("codice", "tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "preventivi_tenantId_stato_dataEmissione_idx" ON "preventivi"("tenantId", "stato", "dataEmissione");
CREATE INDEX "preventivi_tenantId_clienteType_aziendaId_personaId_idx" ON "preventivi"("tenantId", "clienteType", "aziendaId", "personaId");
CREATE INDEX "preventivi_scheduleId_idx" ON "preventivi"("scheduleId");
CREATE INDEX "preventivi_corsoId_idx" ON "preventivi"("corsoId");
CREATE INDEX "preventivi_numero_idx" ON "preventivi"("numero");
CREATE UNIQUE INDEX "preventivi_tenantId_numero_key" ON "preventivi"("tenantId", "numero");

-- CreateIndex
CREATE INDEX "preventivi_sconti_preventivoId_idx" ON "preventivi_sconti"("preventivoId");
CREATE INDEX "preventivi_sconti_codiceId_idx" ON "preventivi_sconti"("codiceId");

-- CreateIndex
CREATE INDEX "codici_aziende_codiceId_idx" ON "codici_aziende"("codiceId");
CREATE INDEX "codici_aziende_aziendaId_idx" ON "codici_aziende"("aziendaId");
CREATE UNIQUE INDEX "codici_aziende_codiceId_aziendaId_key" ON "codici_aziende"("codiceId", "aziendaId");

-- CreateIndex
CREATE INDEX "codici_persone_codiceId_idx" ON "codici_persone"("codiceId");
CREATE INDEX "codici_persone_personaId_idx" ON "codici_persone"("personaId");
CREATE UNIQUE INDEX "codici_persone_codiceId_personaId_key" ON "codici_persone"("codiceId", "personaId");

-- CreateIndex
CREATE INDEX "codici_corsi_codiceId_idx" ON "codici_corsi"("codiceId");
CREATE INDEX "codici_corsi_corsoId_idx" ON "codici_corsi"("corsoId");
CREATE UNIQUE INDEX "codici_corsi_codiceId_corsoId_key" ON "codici_corsi"("codiceId", "corsoId");

-- AddForeignKey
ALTER TABLE "codici_sconto" ADD CONSTRAINT "codici_sconto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivi" ADD CONSTRAINT "preventivi_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "CourseSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivi" ADD CONSTRAINT "preventivi_corsoId_fkey" FOREIGN KEY ("corsoId") REFERENCES "Training"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivi" ADD CONSTRAINT "preventivi_aziendaId_fkey" FOREIGN KEY ("aziendaId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivi" ADD CONSTRAINT "preventivi_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivi" ADD CONSTRAINT "preventivi_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivi_sconti" ADD CONSTRAINT "preventivi_sconti_preventivoId_fkey" FOREIGN KEY ("preventivoId") REFERENCES "preventivi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivi_sconti" ADD CONSTRAINT "preventivi_sconti_codiceId_fkey" FOREIGN KEY ("codiceId") REFERENCES "codici_sconto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codici_aziende" ADD CONSTRAINT "codici_aziende_codiceId_fkey" FOREIGN KEY ("codiceId") REFERENCES "codici_sconto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codici_aziende" ADD CONSTRAINT "codici_aziende_aziendaId_fkey" FOREIGN KEY ("aziendaId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codici_persone" ADD CONSTRAINT "codici_persone_codiceId_fkey" FOREIGN KEY ("codiceId") REFERENCES "codici_sconto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codici_persone" ADD CONSTRAINT "codici_persone_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codici_corsi" ADD CONSTRAINT "codici_corsi_codiceId_fkey" FOREIGN KEY ("codiceId") REFERENCES "codici_sconto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codici_corsi" ADD CONSTRAINT "codici_corsi_corsoId_fkey" FOREIGN KEY ("corsoId") REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable CourseSchedule
ALTER TABLE "CourseSchedule" ADD COLUMN "prezzoUnitario" DECIMAL(10,2);
ALTER TABLE "CourseSchedule" ADD COLUMN "prezzoTotale" DECIMAL(10,2);
ALTER TABLE "CourseSchedule" ADD COLUMN "modalitaErogazione" "ModalitaErogazione";

-- AlterTable Training
ALTER TABLE "Training" ADD COLUMN "prezzoBase" DECIMAL(10,2);
```

### Step 3: Apply Migration (Development)

```bash
# Applica migration su database sviluppo
npx prisma migrate dev

# Output atteso:
# ✓ Generated Prisma Client
# ✓ The migration has been applied:
#   └─ 20251108000000_add_preventivi_codici_sconto
```

### Step 4: Verifica Migration

```bash
# Verifica tabelle create
npx prisma db execute --stdin <<EOF
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%codici%' OR table_name LIKE '%preventivi%'
ORDER BY table_name;
EOF

# Output atteso:
# codici_aziende
# codici_corsi
# codici_persone
# codici_sconto
# preventivi
# preventivi_sconti

# Verifica indici creati
npx prisma db execute --stdin <<EOF
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('codici_sconto', 'preventivi', 'preventivi_sconti')
ORDER BY tablename, indexname;
EOF
```

---

## 🌱 Seed Data

### File: `backend/prisma/seeds/seed-preventivi.ts`

```typescript
import { PrismaClient, TipoSconto, ApplicabilitaSconto, TipoCorsoSconto } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCodiciSconto() {
  console.log('🌱 Seeding codici sconto...');
  
  // Recupera tenant default
  const tenant = await prisma.tenant.findFirst({
    where: { nome: 'Default Tenant' }
  });
  
  if (!tenant) {
    throw new Error('No default tenant found');
  }
  
  // Recupera admin user
  const admin = await prisma.person.findFirst({
    where: {
      tenantId: tenant.id,
      email: { contains: 'admin' }
    }
  });
  
  if (!admin) {
    throw new Error('No admin user found');
  }
  
  // 1. Codice sconto percentuale generale
  const codice1 = await prisma.codiceSconto.upsert({
    where: {
      codice_tenantId_deletedAt: {
        codice: 'PROMO2025',
        tenantId: tenant.id,
        deletedAt: null
      }
    },
    update: {},
    create: {
      codice: 'PROMO2025',
      nome: 'Promozione Capodanno 2025',
      descrizione: 'Sconto 10% su tutti i corsi attivato per gennaio 2025',
      tipoSconto: TipoSconto.PERCENTUALE,
      valore: 10,
      dataInizio: new Date('2025-01-01'),
      dataFine: new Date('2025-01-31'),
      attivo: true,
      cumulabile: true,
      applicabileA: ApplicabilitaSconto.TUTTI,
      tipoCorso: TipoCorsoSconto.TUTTI,
      tenantId: tenant.id,
      createdBy: admin.id
    }
  });
  console.log('✅ Created:', codice1.codice);
  
  // 2. Codice sconto valore assoluto VIP
  const codice2 = await prisma.codiceSconto.upsert({
    where: {
      codice_tenantId_deletedAt: {
        codice: 'VIP50',
        tenantId: tenant.id,
        deletedAt: null
      }
    },
    update: {},
    create: {
      codice: 'VIP50',
      nome: 'Sconto VIP 50€',
      descrizione: 'Sconto riservato ai clienti premium',
      tipoSconto: TipoSconto.VALORE_ASSOLUTO,
      valore: 50,
      dataInizio: new Date('2025-01-01'),
      dataFine: new Date('2025-12-31'),
      attivo: true,
      utilizzoMassimo: 100,
      utilizzoCorrente: 0,
      utilizzoPerUtente: 2,
      cumulabile: false,
      minImporto: 200,
      applicabileA: ApplicabilitaSconto.AZIENDE,
      tipoCorso: TipoCorsoSconto.TUTTI,
      tenantId: tenant.id,
      createdBy: admin.id
    }
  });
  console.log('✅ Created:', codice2.codice);
  
  // 3. Codice sconto primo ordine
  const codice3 = await prisma.codiceSconto.upsert({
    where: {
      codice_tenantId_deletedAt: {
        codice: 'PRIMO15',
        tenantId: tenant.id,
        deletedAt: null
      }
    },
    update: {},
    create: {
      codice: 'PRIMO15',
      nome: 'Primo Ordine 15%',
      descrizione: 'Sconto 15% per nuovi clienti',
      tipoSconto: TipoSconto.PERCENTUALE,
      valore: 15,
      dataInizio: new Date('2025-01-01'),
      dataFine: new Date('2025-12-31'),
      attivo: true,
      utilizzoPerUtente: 1,
      cumulabile: false,
      applicabileA: ApplicabilitaSconto.TUTTI,
      tipoCorso: TipoCorsoSconto.TUTTI,
      tenantId: tenant.id,
      createdBy: admin.id
    }
  });
  console.log('✅ Created:', codice3.codice);
  
  // 4. Codice sconto specifico per sicurezza
  const codice4 = await prisma.codiceSconto.upsert({
    where: {
      codice_tenantId_deletedAt: {
        codice: 'SICUREZZA20',
        tenantId: tenant.id,
        deletedAt: null
      }
    },
    update: {},
    create: {
      codice: 'SICUREZZA20',
      nome: 'Sconto Corsi Sicurezza',
      descrizione: 'Sconto 20% su tutti i corsi di sicurezza',
      tipoSconto: TipoSconto.PERCENTUALE,
      valore: 20,
      dataInizio: new Date('2025-01-01'),
      dataFine: new Date('2025-06-30'),
      attivo: true,
      cumulabile: true,
      applicabileA: ApplicabilitaSconto.TUTTI,
      tipoCorso: TipoCorsoSconto.SPECIFICI,
      categorieCorso: ['sicurezza', 'primo_soccorso', 'antincendio'],
      tenantId: tenant.id,
      createdBy: admin.id
    }
  });
  console.log('✅ Created:', codice4.codice);
  
  console.log('✅ Codici sconto seed completed\n');
}

async function seedTemplatePreventivo() {
  console.log('🌱 Seeding template preventivo...');
  
  // Nota: Questo richiede che esista model Template nel tuo schema
  // Se non esiste, puoi saltare questo step o creare la tabella
  
  console.log('ℹ️  Template preventivo seed skipped (implement if needed)\n');
}

async function main() {
  console.log('🚀 Starting seed...\n');
  
  try {
    await seedCodiciSconto();
    await seedTemplatePreventivo();
    
    console.log('✅ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Esecuzione Seed

```bash
# Compila TypeScript
cd backend
npx tsc prisma/seeds/seed-preventivi.ts

# Esegui seed
node prisma/seeds/seed-preventivi.js

# Output atteso:
# 🚀 Starting seed...
# 🌱 Seeding codici sconto...
# ✅ Created: PROMO2025
# ✅ Created: VIP50
# ✅ Created: PRIMO15
# ✅ Created: SICUREZZA20
# ✅ Codici sconto seed completed
# ✅ Seed completed successfully!
```

---

## 🔙 Rollback Procedures

### Rollback Completo (Emergency)

```bash
# 1. Stop servizi
pm2 stop all

# 2. Restore backup database
pg_restore -h localhost -U postgres -d elementmedica_prod \
  --clean --if-exists backup_pre_preventivi_*.dump

# 3. Verifica restore
psql -U postgres -d elementmedica_prod -c "\dt" | grep -E "(codici|preventivi)"
# Non dovrebbe mostrare le nuove tabelle

# 4. Riavvia servizi
pm2 start all
```

### Rollback Migration (Selective)

```bash
cd backend

# Vedi storia migrazioni
npx prisma migrate status

# Rollback ultima migration
npx prisma migrate resolve --rolled-back 20251108000000_add_preventivi_codici_sconto

# Oppure: Rollback e drop schema changes
npx prisma migrate reset --skip-seed

# ATTENZIONE: migrate reset DROP ALL DATA!
# Usa solo in development!
```

### Script Rollback SQL Manuale

```sql
-- rollback_preventivi.sql

BEGIN;

-- Drop foreign keys
ALTER TABLE "preventivi_sconti" DROP CONSTRAINT IF EXISTS "preventivi_sconti_preventivoId_fkey";
ALTER TABLE "preventivi_sconti" DROP CONSTRAINT IF EXISTS "preventivi_sconti_codiceId_fkey";
ALTER TABLE "preventivi" DROP CONSTRAINT IF EXISTS "preventivi_scheduleId_fkey";
ALTER TABLE "preventivi" DROP CONSTRAINT IF EXISTS "preventivi_corsoId_fkey";
ALTER TABLE "preventivi" DROP CONSTRAINT IF EXISTS "preventivi_aziendaId_fkey";
ALTER TABLE "preventivi" DROP CONSTRAINT IF EXISTS "preventivi_personaId_fkey";
ALTER TABLE "preventivi" DROP CONSTRAINT IF EXISTS "preventivi_tenantId_fkey";
ALTER TABLE "codici_sconto" DROP CONSTRAINT IF EXISTS "codici_sconto_tenantId_fkey";
ALTER TABLE "codici_aziende" DROP CONSTRAINT IF EXISTS "codici_aziende_codiceId_fkey";
ALTER TABLE "codici_aziende" DROP CONSTRAINT IF EXISTS "codici_aziende_aziendaId_fkey";
ALTER TABLE "codici_persone" DROP CONSTRAINT IF EXISTS "codici_persone_codiceId_fkey";
ALTER TABLE "codici_persone" DROP CONSTRAINT IF EXISTS "codici_persone_personaId_fkey";
ALTER TABLE "codici_corsi" DROP CONSTRAINT IF EXISTS "codici_corsi_codiceId_fkey";
ALTER TABLE "codici_corsi" DROP CONSTRAINT IF EXISTS "codici_corsi_corsoId_fkey";

-- Drop tables
DROP TABLE IF EXISTS "preventivi_sconti" CASCADE;
DROP TABLE IF EXISTS "codici_aziende" CASCADE;
DROP TABLE IF EXISTS "codici_persone" CASCADE;
DROP TABLE IF EXISTS "codici_corsi" CASCADE;
DROP TABLE IF EXISTS "preventivi" CASCADE;
DROP TABLE IF EXISTS "codici_sconto" CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "TipoSconto" CASCADE;
DROP TYPE IF EXISTS "ApplicabilitaSconto" CASCADE;
DROP TYPE IF EXISTS "TipoCorsoSconto" CASCADE;
DROP TYPE IF EXISTS "StatoPreventivo" CASCADE;
DROP TYPE IF EXISTS "ClienteType" CASCADE;
DROP TYPE IF EXISTS "ModalitaErogazione" CASCADE;

-- Remove columns from existing tables
ALTER TABLE "CourseSchedule" DROP COLUMN IF EXISTS "prezzoUnitario";
ALTER TABLE "CourseSchedule" DROP COLUMN IF EXISTS "prezzoTotale";
ALTER TABLE "CourseSchedule" DROP COLUMN IF EXISTS "modalitaErogazione";
ALTER TABLE "Training" DROP COLUMN IF EXISTS "prezzoBase";

COMMIT;
```

Esecuzione:

```bash
psql -U postgres -d elementmedica_prod -f rollback_preventivi.sql
```

---

## ✅ Testing & Validation

### Test 1: Integrità Schema

```sql
-- Verifica tutte le tabelle esistono
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'codici_sconto', 
    'preventivi', 
    'preventivi_sconti',
    'codici_aziende',
    'codici_persone',
    'codici_corsi'
  )
ORDER BY table_name;

-- Deve restituire 6 righe
```

### Test 2: Foreign Keys

```sql
-- Verifica tutte le foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'codici_sconto',
    'preventivi',
    'preventivi_sconti',
    'codici_aziende',
    'codici_persone',
    'codici_corsi'
  )
ORDER BY tc.table_name, kcu.column_name;

-- Deve restituire ~15 foreign keys
```

### Test 3: Indexes

```sql
-- Verifica performance index
EXPLAIN ANALYZE
SELECT * FROM codici_sconto
WHERE tenantId = 'some-tenant-id'
  AND attivo = true
  AND dataInizio <= CURRENT_DATE
  AND dataFine >= CURRENT_DATE;

-- Deve usare index e completare in < 5ms
```

### Test 4: CRUD Operations

```typescript
// tests/database/preventivi.test.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Preventivi Database Integration', () => {
  test('creates codice sconto with relations', async () => {
    const codice = await prisma.codiceSconto.create({
      data: {
        codice: 'TEST001',
        nome: 'Test Codice',
        tipoSconto: 'PERCENTUALE',
        valore: 10,
        dataInizio: new Date(),
        dataFine: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        attivo: true,
        applicabileA: 'TUTTI',
        tipoCorso: 'TUTTI',
        tenantId: 'test-tenant',
        createdBy: 'test-user',
        aziende: {
          create: [
            { aziendaId: 'company-1' }
          ]
        }
      },
      include: {
        aziende: true
      }
    });
    
    expect(codice).toBeDefined();
    expect(codice.codice).toBe('TEST001');
    expect(codice.aziende).toHaveLength(1);
  });
  
  test('creates preventivo with sconti', async () => {
    const preventivo = await prisma.preventivo.create({
      data: {
        numero: 'PREV-2025-0001',
        annoProgressivo: 2025,
        numeroProgressivo: 1,
        corsoId: 'test-corso-id',
        clienteType: 'AZIENDA',
        aziendaId: 'test-azienda-id',
        titoloCorso: 'Corso Test',
        durataOre: 8,
        numeroPartecipanti: 10,
        modalitaErogazione: 'PRESENZA',
        prezzoUnitario: 100,
        prezzoTotale: 1000,
        scontoTotale: 100,
        importoFinale: 900,
        dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        tenantId: 'test-tenant',
        generatedBy: 'test-user',
        sconti: {
          create: [
            {
              codiceId: 'test-codice-id',
              codiceString: 'PROMO10',
              tipoSconto: 'PERCENTUALE',
              valore: 10,
              scontoCalcolato: 100,
              applicatoDa: 'test-user'
            }
          ]
        }
      },
      include: {
        sconti: true
      }
    });
    
    expect(preventivo).toBeDefined();
    expect(preventivo.sconti).toHaveLength(1);
    expect(preventivo.importoFinale.toNumber()).toBe(900);
  });
});
```

### Test 5: Performance

```bash
# Load test inserts
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function loadTest() {
  console.time('Insert 1000 codici');
  
  const promises = [];
  for (let i = 0; i < 1000; i++) {
    promises.push(prisma.codiceSconto.create({
      data: {
        codice: \`LOAD\${i.toString().padStart(4, '0')}\`,
        nome: \`Load Test \${i}\`,
        tipoSconto: 'PERCENTUALE',
        valore: 10,
        dataInizio: new Date(),
        dataFine: new Date(Date.now() + 30*24*60*60*1000),
        attivo: true,
        applicabileA: 'TUTTI',
        tipoCorso: 'TUTTI',
        tenantId: 'test-tenant',
        createdBy: 'test-user'
      }
    }));
  }
  
  await Promise.all(promises);
  console.timeEnd('Insert 1000 codici');
  
  // Cleanup
  await prisma.codiceSconto.deleteMany({
    where: { codice: { startsWith: 'LOAD' } }
  });
}

loadTest().then(() => process.exit(0));
"

# Target: < 10 secondi
```

---

## 📌 Post-Migration Tasks

### 1. Generazione Prisma Client

```bash
cd backend
npx prisma generate

# Verifica tipi generati
ls -la node_modules/.prisma/client/index.d.ts
```

### 2. Update API Types

```bash
# Regenera tipi TypeScript
npm run generate-types

# Se non esiste, aggiungi a package.json:
# "generate-types": "tsc --declaration --emitDeclarationOnly"
```

### 3. Restart Services

```bash
# Development
npm run dev

# Production
pm2 restart api-server
pm2 restart documents-server
pm2 restart proxy-server
```

### 4. Monitor Logs

```bash
# Watch logs per errori
pm2 logs api-server --lines 100 | grep -i "error\|prisma"

# Verifica health
curl http://localhost:4001/health
```

### 5. Smoke Tests

```bash
# Test API codici sconto
curl -X GET http://localhost:4001/api/v1/codici-sconto \
  -H "Authorization: Bearer YOUR_TOKEN"

# Deve restituire: { data: [], pagination: {...} }

# Test create codice
curl -X POST http://localhost:4001/api/v1/codici-sconto \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "codice": "SMOKE001",
    "nome": "Smoke Test",
    "tipoSconto": "PERCENTUALE",
    "valore": 10,
    "dataInizio": "2025-01-01",
    "dataFine": "2025-12-31",
    "attivo": true,
    "cumulabile": true,
    "applicabileA": "TUTTI",
    "tipoCorso": "TUTTI"
  }'

# Deve restituire: { id: "...", codice: "SMOKE001", ... }
```

---

## 📊 Monitoring & Metrics

### Query Performance

```sql
-- Top 10 query più lente
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%codici_sconto%' OR query LIKE '%preventivi%'
ORDER BY mean_time DESC
LIMIT 10;
```

### Table Statistics

```sql
-- Dimensioni tabelle
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('codici_sconto', 'preventivi', 'preventivi_sconti')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Index Usage

```sql
-- Indici utilizzati
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('codici_sconto', 'preventivi')
ORDER BY idx_scan DESC;
```

---

## ✅ Migration Checklist

### Pre-Migration
- [ ] Backup database completo
- [ ] Verifica spazio disco disponibile
- [ ] Verifica versioni Prisma/PostgreSQL/Node
- [ ] Environment variables configurate
- [ ] Git branch creato
- [ ] Team notificato

### Migration Execution
- [ ] Schema Prisma aggiornato
- [ ] Migration generata
- [ ] SQL migration review
- [ ] Migration applicata (dev)
- [ ] Tests database passano
- [ ] Seed data eseguito
- [ ] Prisma client generato

### Post-Migration
- [ ] Servizi riavviati
- [ ] Health checks OK
- [ ] Smoke tests passano
- [ ] Logs monitorati (30 min)
- [ ] Performance verificata
- [ ] Documentazione aggiornata
- [ ] Team notificato completamento

### Production Deployment
- [ ] Backup produzione
- [ ] Maintenance window comunicato
- [ ] Migration applicata produzione
- [ ] Seed data produzione
- [ ] Monitoring attivo
- [ ] Rollback plan pronto
- [ ] Smoke tests produzione
- [ ] Performance monitoring (24h)

---

**Status**: ✅ MIGRATION GUIDE COMPLETA  
**Pronto per**: Database changes implementation  
**Tempo stimato esecuzione**: 2-3 ore (development), 4-6 ore (production)  

---

**Prossimo documento**: `05_UI_UX_DESIGN.md`
