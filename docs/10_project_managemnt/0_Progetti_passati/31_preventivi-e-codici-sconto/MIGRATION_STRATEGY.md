# 🔧 Migration Strategy - Preventivi e Codici Sconto

**Data**: 8 Novembre 2025  
**Migration Name**: `add_preventivi_codici_sconto_system`  
**Strategia**: Multi-step safe migration con backward compatibility

---

## ⚠️ Warnings Identificati

### 1. Unique Constraint `[tenantId, numero]`

**Problema**: Dati esistenti nella tabella `preventivi` non hanno il campo `numero`.

**Soluzione**: Migration in 3 step:

```sql
-- Step 1: Aggiungi colonne nullable
ALTER TABLE "preventivi" ADD COLUMN "numero" VARCHAR(50);
ALTER TABLE "preventivi" ADD COLUMN "tipoServizio" "TipoServizio" DEFAULT 'CORSO';
-- ... altri campi

-- Step 2: Popola campo numero per record esistenti
UPDATE "preventivi" 
SET "numero" = CONCAT('PREV-', "annoProgressivo", '-', LPAD("numeroProgressivo"::TEXT, 4, '0'))
WHERE "numero" IS NULL;

-- Step 3: Rendi numero NOT NULL e aggiungi constraint
ALTER TABLE "preventivi" ALTER COLUMN "numero" SET NOT NULL;
CREATE UNIQUE INDEX "preventivi_tenantId_numero_key" ON "preventivi"("tenantId", "numero");
```

---

## 📋 Step di Migrazione Sicura

### OPZIONE A: Migration Automatica (Consigliata per DEV)

**Prerequisiti**:
- ✅ Backup database completo
- ✅ Nessun preventivo in stato critico
- ✅ Sistema in maintenance mode

**Comando**:
```bash
cd backend
npx prisma migrate dev --name add_preventivi_codici_sconto_system
```

**Rischi**: Downtime 2-5 minuti

---

### OPZIONE B: Migration Manuale Controllata (Produzione)

#### Step 1: Backup Pre-Migration

```bash
# Backup completo
pg_dump -h localhost -U postgres -d dev_db \
  -F c -b -v -f backup_pre_preventivi_$(date +%Y%m%d_%H%M%S).dump

# Verifica backup
pg_restore -l backup_pre_preventivi_*.dump | head -n 20
```

#### Step 2: Genera Migration SQL

```bash
# Genera solo SQL senza applicare
cd backend
npx prisma migrate dev --name add_preventivi_codici_sconto_system --create-only
```

#### Step 3: Modifica Migration SQL

**File**: `backend/prisma/migrations/XXXXXX_add_preventivi_codici_sconto_system/migration.sql`

**Modifiche necessarie**:

```sql
-- INIZIO MODIFICHE CUSTOM

-- 1. Crea nuovi ENUM
CREATE TYPE "TipoSconto" AS ENUM ('PERCENTUALE', 'VALORE_ASSOLUTO');
CREATE TYPE "ApplicabilitaSconto" AS ENUM ('TUTTI', 'AZIENDE', 'PERSONE', 'SPECIFICI');
CREATE TYPE "TipoCorsoSconto" AS ENUM ('TUTTI', 'SPECIFICI');
CREATE TYPE "StatoPreventivo" AS ENUM ('BOZZA', 'INVIATO', 'VISUALIZZATO', 'ACCETTATO', 'RIFIUTATO', 'SCADUTO', 'CONVERTITO', 'ANNULLATO');
CREATE TYPE "ClienteType" AS ENUM ('AZIENDA', 'PERSONA');
CREATE TYPE "TipoServizio" AS ENUM ('CORSO', 'DVR', 'RSPP', 'MEDICO_COMPETENTE', 'CONSULENZA', 'ALTRO');
CREATE TYPE "TipoPrezzo" AS ENUM ('PER_PERSONA', 'PER_UNITA', 'FORFAIT', 'MENSILE', 'ORARIO', 'PERSONALIZZATO');

-- 2. Aggiungi colonne a preventivi (NULLABLE inizialmente)
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "numero" VARCHAR(50);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "tipoServizio" "TipoServizio" DEFAULT 'CORSO';
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "tipoPrezzo" "TipoPrezzo" DEFAULT 'PER_PERSONA';
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "dettagliServizio" JSONB DEFAULT '{}';
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "titoloServizio" VARCHAR(500);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "descrizioneServizio" TEXT;
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "quantita" INTEGER DEFAULT 1;
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "prezzoUnitario" DECIMAL(10,2);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "prezzoTotale" DECIMAL(10,2);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "scontoTotale" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "importoFinale" DECIMAL(10,2);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "clienteType" "ClienteType";
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "aziendaId" VARCHAR(50);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "personaId" VARCHAR(50);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "corsoId" VARCHAR(50);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "dataScadenza" TIMESTAMP(3);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "dataInizioServizio" TIMESTAMP(3);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "dataFineServizio" TIMESTAMP(3);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "stato" "StatoPreventivo" DEFAULT 'BOZZA';
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "dataInvio" TIMESTAMP(3);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "dataAccettazione" TIMESTAMP(3);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "dataRifiuto" TIMESTAMP(3);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "motivoRifiuto" TEXT;
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "condizioniPagamento" TEXT;
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "fileUrl" VARCHAR(500);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "fileName" VARCHAR(255);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "generatedBy" VARCHAR(50);

-- 3. Rendi scheduledCourseId NULLABLE
ALTER TABLE "preventivi" ALTER COLUMN "scheduledCourseId" DROP NOT NULL;

-- 4. Popola campi obbligatori per record esistenti
UPDATE "preventivi" 
SET 
  "numero" = CONCAT('PREV-', "annoProgressivo", '-', LPAD("numeroProgressivo"::TEXT, 4, '0')),
  "titoloServizio" = COALESCE("nomeFile", 'Preventivo Corso'),
  "prezzoUnitario" = 0.00,
  "prezzoTotale" = 0.00,
  "importoFinale" = 0.00,
  "clienteType" = 'AZIENDA',
  "dataScadenza" = COALESCE("dataGenerazione" + INTERVAL '30 days', NOW() + INTERVAL '30 days'),
  "dettagliServizio" = '{}'::jsonb
WHERE "numero" IS NULL;

-- 5. Popola aziendaId dal primo record in preventivo_aziende
UPDATE "preventivi" p
SET "aziendaId" = pa."aziendaId"
FROM (
  SELECT DISTINCT ON ("preventivoId") "preventivoId", "aziendaId"
  FROM "preventivo_aziende"
  WHERE "deletedAt" IS NULL
  ORDER BY "preventivoId", "createdAt" ASC
) pa
WHERE p.id = pa."preventivoId" AND p."aziendaId" IS NULL;

-- 6. Rendi campi NOT NULL dove necessario
ALTER TABLE "preventivi" ALTER COLUMN "numero" SET NOT NULL;
ALTER TABLE "preventivi" ALTER COLUMN "titoloServizio" SET NOT NULL;
ALTER TABLE "preventivi" ALTER COLUMN "prezzoUnitario" SET NOT NULL;
ALTER TABLE "preventivi" ALTER COLUMN "prezzoTotale" SET NOT NULL;
ALTER TABLE "preventivi" ALTER COLUMN "importoFinale" SET NOT NULL;
ALTER TABLE "preventivi" ALTER COLUMN "clienteType" SET NOT NULL;
ALTER TABLE "preventivi" ALTER COLUMN "dataScadenza" SET NOT NULL;

-- 7. Crea nuove tabelle
CREATE TABLE "codici_sconto" (
  "id" VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "codice" VARCHAR(50) NOT NULL,
  "nome" VARCHAR(255) NOT NULL,
  "descrizione" TEXT,
  "tipoSconto" "TipoSconto" NOT NULL,
  "valore" DECIMAL(10,2) NOT NULL,
  "dataInizio" TIMESTAMP(3) NOT NULL,
  "dataFine" TIMESTAMP(3) NOT NULL,
  "attivo" BOOLEAN DEFAULT true,
  "utilizzoMassimo" INTEGER,
  "utilizzoCorrente" INTEGER DEFAULT 0,
  "utilizzoPerUtente" INTEGER,
  "cumulabile" BOOLEAN DEFAULT false,
  "minImporto" DECIMAL(10,2),
  "maxImporto" DECIMAL(10,2),
  "applicabileA" "ApplicabilitaSconto" DEFAULT 'TUTTI',
  "applicabileServizi" "TipoServizio"[] DEFAULT ARRAY['CORSO']::"TipoServizio"[],
  "tipoCorso" "TipoCorsoSconto" DEFAULT 'TUTTI',
  "categorieCorso" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "tenantId" VARCHAR(50) NOT NULL,
  "createdBy" VARCHAR(50) NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

CREATE TABLE "preventivi_sconti" (
  "id" VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "preventivoId" VARCHAR(50) NOT NULL,
  "codiceId" VARCHAR(50) NOT NULL,
  "codiceTesto" VARCHAR(50) NOT NULL,
  "nomeCodice" VARCHAR(255) NOT NULL,
  "descrizioneCodice" TEXT,
  "tipoSconto" "TipoSconto" NOT NULL,
  "valoreSconto" DECIMAL(10,2) NOT NULL,
  "importoScontato" DECIMAL(10,2) NOT NULL,
  "applicatoDa" VARCHAR(50) NOT NULL,
  "applicatoIl" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "tenantId" VARCHAR(50) NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

CREATE TABLE "codici_aziende" (
  "id" VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "codiceId" VARCHAR(50) NOT NULL,
  "aziendaId" VARCHAR(50) NOT NULL,
  "tenantId" VARCHAR(50) NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

CREATE TABLE "codici_persone" (
  "id" VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "codiceId" VARCHAR(50) NOT NULL,
  "personaId" VARCHAR(50) NOT NULL,
  "tenantId" VARCHAR(50) NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

CREATE TABLE "codici_corsi" (
  "id" VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "codiceId" VARCHAR(50) NOT NULL,
  "corsoId" VARCHAR(50) NOT NULL,
  "tenantId" VARCHAR(50) NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

-- 8. Crea indici
CREATE UNIQUE INDEX "codici_sconto_codice_tenantId_key" ON "codici_sconto"("codice", "tenantId");
CREATE INDEX "codici_sconto_tenantId_attivo_dataInizio_dataFine_idx" ON "codici_sconto"("tenantId", "attivo", "dataInizio", "dataFine");
CREATE INDEX "codici_sconto_tenantId_tipoSconto_idx" ON "codici_sconto"("tenantId", "tipoSconto");
CREATE INDEX "codici_sconto_codice_idx" ON "codici_sconto"("codice");
CREATE INDEX "codici_sconto_tenantId_attivo_idx" ON "codici_sconto"("tenantId", "attivo");

CREATE UNIQUE INDEX "preventivi_sconti_preventivoId_codiceId_key" ON "preventivi_sconti"("preventivoId", "codiceId");
CREATE INDEX "preventivi_sconti_preventivoId_idx" ON "preventivi_sconti"("preventivoId");
CREATE INDEX "preventivi_sconti_codiceId_idx" ON "preventivi_sconti"("codiceId");
CREATE INDEX "preventivi_sconti_tenantId_idx" ON "preventivi_sconti"("tenantId");

CREATE UNIQUE INDEX "codici_aziende_codiceId_aziendaId_key" ON "codici_aziende"("codiceId", "aziendaId");
CREATE INDEX "codici_aziende_codiceId_idx" ON "codici_aziende"("codiceId");
CREATE INDEX "codici_aziende_aziendaId_idx" ON "codici_aziende"("aziendaId");
CREATE INDEX "codici_aziende_tenantId_idx" ON "codici_aziende"("tenantId");

CREATE UNIQUE INDEX "codici_persone_codiceId_personaId_key" ON "codici_persone"("codiceId", "personaId");
CREATE INDEX "codici_persone_codiceId_idx" ON "codici_persone"("codiceId");
CREATE INDEX "codici_persone_personaId_idx" ON "codici_persone"("personaId");
CREATE INDEX "codici_persone_tenantId_idx" ON "codici_persone"("tenantId");

CREATE UNIQUE INDEX "codici_corsi_codiceId_corsoId_key" ON "codici_corsi"("codiceId", "corsoId");
CREATE INDEX "codici_corsi_codiceId_idx" ON "codici_corsi"("codiceId");
CREATE INDEX "codici_corsi_corsoId_idx" ON "codici_corsi"("corsoId");
CREATE INDEX "codici_corsi_tenantId_idx" ON "codici_corsi"("tenantId");

-- Indici Preventivi
CREATE UNIQUE INDEX "preventivi_tenantId_numero_key" ON "preventivi"("tenantId", "numero");
CREATE INDEX "preventivi_tenantId_stato_dataEmissione_idx" ON "preventivi"("tenantId", "stato", "dataEmissione");
CREATE INDEX "preventivi_tenantId_tipoServizio_idx" ON "preventivi"("tenantId", "tipoServizio");
CREATE INDEX "preventivi_tenantId_clienteType_aziendaId_personaId_idx" ON "preventivi"("tenantId", "clienteType", "aziendaId", "personaId");
CREATE INDEX "preventivi_corsoId_idx" ON "preventivi"("corsoId");

-- 9. Aggiungi Foreign Keys
ALTER TABLE "codici_sconto" ADD CONSTRAINT "codici_sconto_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;

ALTER TABLE "preventivi_sconti" ADD CONSTRAINT "preventivi_sconti_preventivoId_fkey" 
  FOREIGN KEY ("preventivoId") REFERENCES "preventivi"("id") ON DELETE CASCADE;
ALTER TABLE "preventivi_sconti" ADD CONSTRAINT "preventivi_sconti_codiceId_fkey" 
  FOREIGN KEY ("codiceId") REFERENCES "codici_sconto"("id") ON DELETE RESTRICT;
ALTER TABLE "preventivi_sconti" ADD CONSTRAINT "preventivi_sconti_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;

ALTER TABLE "codici_aziende" ADD CONSTRAINT "codici_aziende_codiceId_fkey" 
  FOREIGN KEY ("codiceId") REFERENCES "codici_sconto"("id") ON DELETE CASCADE;
ALTER TABLE "codici_aziende" ADD CONSTRAINT "codici_aziende_aziendaId_fkey" 
  FOREIGN KEY ("aziendaId") REFERENCES "companies"("id") ON DELETE CASCADE;
ALTER TABLE "codici_aziende" ADD CONSTRAINT "codici_aziende_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;

ALTER TABLE "codici_persone" ADD CONSTRAINT "codici_persone_codiceId_fkey" 
  FOREIGN KEY ("codiceId") REFERENCES "codici_sconto"("id") ON DELETE CASCADE;
ALTER TABLE "codici_persone" ADD CONSTRAINT "codici_persone_personaId_fkey" 
  FOREIGN KEY ("personaId") REFERENCES "persons"("id") ON DELETE CASCADE;
ALTER TABLE "codici_persone" ADD CONSTRAINT "codici_persone_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;

ALTER TABLE "codici_corsi" ADD CONSTRAINT "codici_corsi_codiceId_fkey" 
  FOREIGN KEY ("codiceId") REFERENCES "codici_sconto"("id") ON DELETE CASCADE;
ALTER TABLE "codici_corsi" ADD CONSTRAINT "codici_corsi_corsoId_fkey" 
  FOREIGN KEY ("corsoId") REFERENCES "courses"("id") ON DELETE CASCADE;
ALTER TABLE "codici_corsi" ADD CONSTRAINT "codici_corsi_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;

-- FINE MODIFICHE CUSTOM
```

#### Step 4: Test Migration su Clone DB

```bash
# Crea database clone per test
createdb -U postgres -T dev_db dev_db_test_migration

# Applica migration su clone
DATABASE_URL="postgresql://postgres:password@localhost:5432/dev_db_test_migration" \
  npx prisma migrate deploy

# Verifica risultati
psql -U postgres -d dev_db_test_migration -c "\dt"
psql -U postgres -d dev_db_test_migration -c "SELECT COUNT(*) FROM preventivi;"
```

#### Step 5: Applica su Database Reale

```bash
# Solo se test ha successo
cd backend
npx prisma migrate deploy
npx prisma generate
```

---

## 🔄 Rollback Procedure

### Se Migration Fallisce

```sql
-- Rollback completo dal backup
pg_restore -h localhost -U postgres -d dev_db -c backup_pre_preventivi_*.dump

-- Oppure rollback selettivo
BEGIN;

-- Drop nuove tabelle
DROP TABLE IF EXISTS "codici_corsi" CASCADE;
DROP TABLE IF EXISTS "codici_persone" CASCADE;
DROP TABLE IF EXISTS "codici_aziende" CASCADE;
DROP TABLE IF EXISTS "preventivi_sconti" CASCADE;
DROP TABLE IF EXISTS "codici_sconto" CASCADE;

-- Rimuovi colonne da preventivi
ALTER TABLE "preventivi" DROP COLUMN IF EXISTS "numero";
ALTER TABLE "preventivi" DROP COLUMN IF EXISTS "tipoServizio";
-- ... altre colonne

-- Drop enum
DROP TYPE IF EXISTS "TipoPrezzo";
DROP TYPE IF EXISTS "TipoServizio";
DROP TYPE IF EXISTS "ClienteType";
DROP TYPE IF EXISTS "StatoPreventivo";
DROP TYPE IF EXISTS "TipoCorsoSconto";
DROP TYPE IF EXISTS "ApplicabilitaSconto";
DROP TYPE IF EXISTS "TipoSconto";

-- Ripristina scheduledCourseId NOT NULL
ALTER TABLE "preventivi" ALTER COLUMN "scheduledCourseId" SET NOT NULL;

COMMIT;
```

---

## ✅ Checklist Pre-Migration

- [ ] Backup database completo
- [ ] Spazio disco sufficiente (>5GB free)
- [ ] Sistema in maintenance mode
- [ ] Notifica utenti downtime
- [ ] Test migration su database clone
- [ ] Team on standby per rollback
- [ ] Verifica versions: Prisma >= 5.0, PostgreSQL >= 12.0

---

## 📊 Post-Migration Verification

```sql
-- Verifica tabelle create
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'codici%';

-- Verifica enum
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'TipoSconto'::regtype;

-- Verifica dati migrati
SELECT COUNT(*), "tipoServizio", "stato" 
FROM preventivi 
GROUP BY "tipoServizio", "stato";

-- Verifica indici
SELECT indexname FROM pg_indexes 
WHERE tablename = 'preventivi';
```

---

**Tempo Stimato Migration**: 5-10 minuti  
**Downtime Previsto**: 2-5 minuti  
**Risk Level**: 🟡 MEDIO (con backup: 🟢 BASSO)
