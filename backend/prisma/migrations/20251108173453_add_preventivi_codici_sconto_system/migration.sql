-- CreateEnum
CREATE TYPE "TipoSconto" AS ENUM ('PERCENTUALE', 'VALORE_ASSOLUTO');

-- CreateEnum
CREATE TYPE "ApplicabilitaSconto" AS ENUM ('TUTTI', 'AZIENDE', 'PERSONE', 'SPECIFICI');

-- CreateEnum
CREATE TYPE "TipoCorsoSconto" AS ENUM ('TUTTI', 'SPECIFICI');

-- CreateEnum
CREATE TYPE "StatoPreventivo" AS ENUM ('BOZZA', 'INVIATO', 'VISUALIZZATO', 'ACCETTATO', 'RIFIUTATO', 'SCADUTO', 'CONVERTITO', 'ANNULLATO');

-- CreateEnum
CREATE TYPE "ClienteType" AS ENUM ('AZIENDA', 'PERSONA');

-- CreateEnum
CREATE TYPE "TipoServizio" AS ENUM ('CORSO', 'DVR', 'RSPP', 'MEDICO_COMPETENTE', 'CONSULENZA', 'ALTRO');

-- CreateEnum
CREATE TYPE "TipoPrezzo" AS ENUM ('PER_PERSONA', 'PER_UNITA', 'FORFAIT', 'MENSILE', 'ORARIO', 'PERSONALIZZATO');

-- DropForeignKey
ALTER TABLE "preventivi" DROP CONSTRAINT "preventivi_scheduledCourseId_fkey";

-- DropIndex
DROP INDEX "preventivi_tenantId_idx";

-- AlterTable - Step 1: Aggiungi colonne come NULLABLE
ALTER TABLE "preventivi" ADD COLUMN     "aziendaId" TEXT,
ADD COLUMN     "clienteType" "ClienteType",
ADD COLUMN     "condizioniPagamento" TEXT,
ADD COLUMN     "corsoId" TEXT,
ADD COLUMN     "dataAccettazione" TIMESTAMP(3),
ADD COLUMN     "dataEmissione" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dataFineServizio" TIMESTAMP(3),
ADD COLUMN     "dataInizioServizio" TIMESTAMP(3),
ADD COLUMN     "dataInvio" TIMESTAMP(3),
ADD COLUMN     "dataRifiuto" TIMESTAMP(3),
ADD COLUMN     "dataScadenza" TIMESTAMP(3),
ADD COLUMN     "descrizioneServizio" TEXT,
ADD COLUMN     "dettagliServizio" JSONB DEFAULT '{}',
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "generatedBy" TEXT,
ADD COLUMN     "importoFinale" DECIMAL(10,2),
ADD COLUMN     "motivoRifiuto" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "personaId" TEXT,
ADD COLUMN     "prezzoTotale" DECIMAL(10,2),
ADD COLUMN     "prezzoUnitario" DECIMAL(10,2),
ADD COLUMN     "quantita" INTEGER DEFAULT 1,
ADD COLUMN     "scontoTotale" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "stato" "StatoPreventivo" DEFAULT 'BOZZA',
ADD COLUMN     "tipoPrezzo" "TipoPrezzo" DEFAULT 'PER_PERSONA',
ADD COLUMN     "tipoServizio" "TipoServizio" DEFAULT 'CORSO',
ADD COLUMN     "titoloServizio" TEXT,
ALTER COLUMN "scheduledCourseId" DROP NOT NULL,
ALTER COLUMN "nomeFile" DROP NOT NULL,
ALTER COLUMN "url" DROP NOT NULL,
ALTER COLUMN "dataGenerazione" DROP NOT NULL,
ALTER COLUMN "dataGenerazione" DROP DEFAULT;

-- Data Migration: Popola campi obbligatori per record esistenti
UPDATE "preventivi" 
SET 
  "numero" = CONCAT('PREV-', "annoProgressivo", '-', LPAD("numeroProgressivo"::TEXT, 4, '0')),
  "titoloServizio" = COALESCE("nomeFile", 'Preventivo Corso'),
  "prezzoUnitario" = 0.00,
  "prezzoTotale" = 0.00,
  "importoFinale" = 0.00,
  "clienteType" = 'AZIENDA',
  "dataEmissione" = COALESCE("createdAt", CURRENT_TIMESTAMP),
  "dataScadenza" = COALESCE("dataGenerazione" + INTERVAL '30 days', CURRENT_TIMESTAMP + INTERVAL '30 days')
WHERE "numero" IS NULL;

-- Popola aziendaId dal primo record in preventivo_aziende (se esiste)
UPDATE "preventivi" p
SET "aziendaId" = pa."aziendaId"
FROM (
  SELECT DISTINCT ON ("preventivoId") "preventivoId", "aziendaId"
  FROM "preventivo_aziende"
  WHERE "deletedAt" IS NULL
  ORDER BY "preventivoId", "createdAt" ASC
) pa
WHERE p.id = pa."preventivoId" AND p."aziendaId" IS NULL;

-- AlterTable - Step 2: Rendi campi NOT NULL dove necessario
ALTER TABLE "preventivi"
  ALTER COLUMN "numero" SET NOT NULL,
  ALTER COLUMN "titoloServizio" SET NOT NULL,
  ALTER COLUMN "prezzoUnitario" SET NOT NULL,
  ALTER COLUMN "prezzoTotale" SET NOT NULL,
  ALTER COLUMN "importoFinale" SET NOT NULL,
  ALTER COLUMN "clienteType" SET NOT NULL,
  ALTER COLUMN "dataEmissione" SET NOT NULL,
  ALTER COLUMN "dataScadenza" SET NOT NULL,
  ALTER COLUMN "quantita" SET NOT NULL,
  ALTER COLUMN "scontoTotale" SET NOT NULL,
  ALTER COLUMN "stato" SET NOT NULL,
  ALTER COLUMN "tipoPrezzo" SET NOT NULL,
  ALTER COLUMN "tipoServizio" SET NOT NULL,
  ALTER COLUMN "dettagliServizio" SET NOT NULL;

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
    "applicabileServizi" "TipoServizio"[] DEFAULT ARRAY['CORSO']::"TipoServizio"[],
    "tipoCorso" "TipoCorsoSconto" DEFAULT 'TUTTI',
    "categorieCorso" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codici_sconto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preventivi_sconti" (
    "id" TEXT NOT NULL,
    "preventivoId" TEXT NOT NULL,
    "codiceId" TEXT NOT NULL,
    "codiceTesto" TEXT NOT NULL,
    "nomeCodice" TEXT NOT NULL,
    "descrizioneCodice" TEXT,
    "tipoSconto" "TipoSconto" NOT NULL,
    "valoreSconto" DECIMAL(10,2) NOT NULL,
    "importoScontato" DECIMAL(10,2) NOT NULL,
    "applicatoDa" TEXT NOT NULL,
    "applicatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "preventivi_sconti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codici_aziende" (
    "id" TEXT NOT NULL,
    "codiceId" TEXT NOT NULL,
    "aziendaId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codici_aziende_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codici_persone" (
    "id" TEXT NOT NULL,
    "codiceId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codici_persone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codici_corsi" (
    "id" TEXT NOT NULL,
    "codiceId" TEXT NOT NULL,
    "corsoId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codici_corsi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "codici_sconto_tenantId_attivo_dataInizio_dataFine_idx" ON "codici_sconto"("tenantId", "attivo", "dataInizio", "dataFine");

-- CreateIndex
CREATE INDEX "codici_sconto_tenantId_tipoSconto_idx" ON "codici_sconto"("tenantId", "tipoSconto");

-- CreateIndex
CREATE INDEX "codici_sconto_codice_idx" ON "codici_sconto"("codice");

-- CreateIndex
CREATE INDEX "codici_sconto_tenantId_attivo_idx" ON "codici_sconto"("tenantId", "attivo");

-- CreateIndex
CREATE UNIQUE INDEX "codici_sconto_codice_tenantId_key" ON "codici_sconto"("codice", "tenantId");

-- CreateIndex
CREATE INDEX "preventivi_sconti_preventivoId_idx" ON "preventivi_sconti"("preventivoId");

-- CreateIndex
CREATE INDEX "preventivi_sconti_codiceId_idx" ON "preventivi_sconti"("codiceId");

-- CreateIndex
CREATE INDEX "preventivi_sconti_tenantId_idx" ON "preventivi_sconti"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "preventivi_sconti_preventivoId_codiceId_key" ON "preventivi_sconti"("preventivoId", "codiceId");

-- CreateIndex
CREATE INDEX "codici_aziende_codiceId_idx" ON "codici_aziende"("codiceId");

-- CreateIndex
CREATE INDEX "codici_aziende_aziendaId_idx" ON "codici_aziende"("aziendaId");

-- CreateIndex
CREATE INDEX "codici_aziende_tenantId_idx" ON "codici_aziende"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "codici_aziende_codiceId_aziendaId_key" ON "codici_aziende"("codiceId", "aziendaId");

-- CreateIndex
CREATE INDEX "codici_persone_codiceId_idx" ON "codici_persone"("codiceId");

-- CreateIndex
CREATE INDEX "codici_persone_personaId_idx" ON "codici_persone"("personaId");

-- CreateIndex
CREATE INDEX "codici_persone_tenantId_idx" ON "codici_persone"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "codici_persone_codiceId_personaId_key" ON "codici_persone"("codiceId", "personaId");

-- CreateIndex
CREATE INDEX "codici_corsi_codiceId_idx" ON "codici_corsi"("codiceId");

-- CreateIndex
CREATE INDEX "codici_corsi_corsoId_idx" ON "codici_corsi"("corsoId");

-- CreateIndex
CREATE INDEX "codici_corsi_tenantId_idx" ON "codici_corsi"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "codici_corsi_codiceId_corsoId_key" ON "codici_corsi"("codiceId", "corsoId");

-- CreateIndex
CREATE INDEX "preventivi_tenantId_stato_dataEmissione_idx" ON "preventivi"("tenantId", "stato", "dataEmissione");

-- CreateIndex
CREATE INDEX "preventivi_tenantId_tipoServizio_idx" ON "preventivi"("tenantId", "tipoServizio");

-- CreateIndex
CREATE INDEX "preventivi_tenantId_clienteType_aziendaId_personaId_idx" ON "preventivi"("tenantId", "clienteType", "aziendaId", "personaId");

-- CreateIndex
CREATE INDEX "preventivi_corsoId_idx" ON "preventivi"("corsoId");

-- CreateIndex
CREATE UNIQUE INDEX "preventivi_tenantId_numero_key" ON "preventivi"("tenantId", "numero");

-- AddForeignKey
ALTER TABLE "preventivi" ADD CONSTRAINT "preventivi_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES "CourseSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codici_sconto" ADD CONSTRAINT "codici_sconto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivi_sconti" ADD CONSTRAINT "preventivi_sconti_preventivoId_fkey" FOREIGN KEY ("preventivoId") REFERENCES "preventivi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivi_sconti" ADD CONSTRAINT "preventivi_sconti_codiceId_fkey" FOREIGN KEY ("codiceId") REFERENCES "codici_sconto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivi_sconti" ADD CONSTRAINT "preventivi_sconti_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codici_aziende" ADD CONSTRAINT "codici_aziende_codiceId_fkey" FOREIGN KEY ("codiceId") REFERENCES "codici_sconto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codici_aziende" ADD CONSTRAINT "codici_aziende_aziendaId_fkey" FOREIGN KEY ("aziendaId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codici_aziende" ADD CONSTRAINT "codici_aziende_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codici_persone" ADD CONSTRAINT "codici_persone_codiceId_fkey" FOREIGN KEY ("codiceId") REFERENCES "codici_sconto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codici_persone" ADD CONSTRAINT "codici_persone_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codici_persone" ADD CONSTRAINT "codici_persone_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codici_corsi" ADD CONSTRAINT "codici_corsi_codiceId_fkey" FOREIGN KEY ("codiceId") REFERENCES "codici_sconto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codici_corsi" ADD CONSTRAINT "codici_corsi_corsoId_fkey" FOREIGN KEY ("corsoId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codici_corsi" ADD CONSTRAINT "codici_corsi_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

