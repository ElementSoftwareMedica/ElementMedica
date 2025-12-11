-- Migration: Add Complete Clinical Models
-- Date: 2025-01-31
-- Description: Adds remaining clinical models for ElementMedica poliambulatorio

-- Create new enums
CREATE TYPE "tipo_campo_visita" AS ENUM ('TESTO', 'TEXTAREA', 'NUMERO', 'DECIMALE', 'DATA', 'DATETIME', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'FILE');
CREATE TYPE "tipo_azione_clinica" AS ENUM ('VISUALIZZAZIONE', 'CREAZIONE', 'MODIFICA', 'ELIMINAZIONE', 'FIRMA', 'STAMPA', 'EXPORT', 'ACCESSO_DATI_SENSIBILI');

-- OrarioAmbulatorio table
CREATE TABLE "orari_ambulatorio" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ambulatorioId" TEXT NOT NULL,
    "giornoSettimana" INTEGER NOT NULL,
    "oraInizio" TEXT NOT NULL,
    "oraFine" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "orari_ambulatorio_pkey" PRIMARY KEY ("id")
);

-- ManutenzioneStrumento table
CREATE TABLE "manutenzioni_strumento" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "strumentoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dataEsecuzione" DATE NOT NULL,
    "dataProssima" DATE,
    "esecutore" TEXT,
    "costo" DECIMAL(10,2),
    "note" TEXT,
    "esito" TEXT,
    "certificato" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "manutenzioni_strumento_pkey" PRIMARY KEY ("id")
);

-- Convenzione table
CREATE TABLE "convenzioni" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codice" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descrizione" TEXT,
    "contatto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "indirizzo" TEXT,
    "validoDa" DATE NOT NULL,
    "validoA" DATE,
    "percentualeSconto" DECIMAL(5,2),
    "massimaleAnnuo" DECIMAL(10,2),
    "documentoPath" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "convenzioni_pkey" PRIMARY KEY ("id")
);

-- ConvenzioneListino junction table
CREATE TABLE "convenzione_listino" (
    "id" TEXT NOT NULL,
    "convenzioneId" TEXT NOT NULL,
    "listinoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convenzione_listino_pkey" PRIMARY KEY ("id")
);

-- CodiceScontoClinico table (separate from course discounts)
CREATE TABLE "codici_sconto_clinici" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codice" TEXT NOT NULL,
    "descrizione" TEXT,
    "tipo" TEXT NOT NULL,
    "valore" DECIMAL(10,2) NOT NULL,
    "validoDa" DATE NOT NULL DEFAULT CURRENT_DATE,
    "validoA" DATE,
    "limiteUtilizzi" INTEGER,
    "utilizziAttuali" INTEGER NOT NULL DEFAULT 0,
    "prestazioniIds" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codici_sconto_clinici_pkey" PRIMARY KEY ("id")
);

-- TemplateCampoVisita table
CREATE TABLE "template_campi_visita" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "prestazioneId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "etichetta" TEXT NOT NULL,
    "tipo" "tipo_campo_visita" NOT NULL DEFAULT 'TESTO',
    "obbligatorio" BOOLEAN NOT NULL DEFAULT false,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "opzioni" TEXT,
    "valoreDefault" TEXT,
    "validazione" TEXT,
    "placeholder" TEXT,
    "helpText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "template_campi_visita_pkey" PRIMARY KEY ("id")
);

-- ValoreCampoVisita table
CREATE TABLE "valori_campo_visita" (
    "id" TEXT NOT NULL,
    "visitaId" TEXT NOT NULL,
    "campoId" TEXT NOT NULL,
    "valore" TEXT,
    "valoreJson" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "valori_campo_visita_pkey" PRIMARY KEY ("id")
);

-- VersioneReferto table
CREATE TABLE "versioni_referto" (
    "id" TEXT NOT NULL,
    "refertoId" TEXT NOT NULL,
    "versione" INTEGER NOT NULL,
    "contenuto" TEXT,
    "conclusioni" TEXT,
    "motivoModifica" TEXT,
    "modificatoDa" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versioni_referto_pkey" PRIMARY KEY ("id")
);

-- FirmaDigitale table
CREATE TABLE "firme_digitali" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "refertoId" TEXT,
    "visitaId" TEXT,
    "firmatarioId" TEXT NOT NULL,
    "tipoFirma" TEXT NOT NULL,
    "hashDocumento" TEXT NOT NULL,
    "certificato" TEXT,
    "timestampFirma" TIMESTAMP(6) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "validaFino" TIMESTAMP(6),
    "revocata" BOOLEAN NOT NULL DEFAULT false,
    "dataRevoca" TIMESTAMP(6),
    "motivoRevoca" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "firme_digitali_pkey" PRIMARY KEY ("id")
);

-- SlotDisponibilita table
CREATE TABLE "slots_disponibilita" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "ambulatorioId" TEXT,
    "prestazioneId" TEXT,
    "data" DATE NOT NULL,
    "oraInizio" TEXT NOT NULL,
    "oraFine" TEXT NOT NULL,
    "stato" TEXT NOT NULL DEFAULT 'libero',
    "appuntamentoId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "slots_disponibilita_pkey" PRIMARY KEY ("id")
);

-- NumeroChiamata table
CREATE TABLE "numeri_chiamata" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poliambulatorioId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "numero" INTEGER NOT NULL,
    "appuntamentoId" TEXT,
    "pazienteId" TEXT,
    "stato" TEXT NOT NULL DEFAULT 'attesa',
    "oraRitiro" TIMESTAMP(6),
    "oraChiamata" TIMESTAMP(6),
    "ambulatorioId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "numeri_chiamata_pkey" PRIMARY KEY ("id")
);

-- AuditLogClinico table
CREATE TABLE "audit_log_clinico" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "azione" "tipo_azione_clinica" NOT NULL,
    "entita" TEXT NOT NULL,
    "entitaId" TEXT NOT NULL,
    "pazienteId" TEXT,
    "descrizione" TEXT,
    "datiPrecedenti" TEXT,
    "datiNuovi" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_clinico_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
ALTER TABLE "orari_ambulatorio" ADD CONSTRAINT "orari_ambulatorio_ambulatorioId_giornoSettimana_oraInizio_key" UNIQUE ("ambulatorioId", "giornoSettimana", "oraInizio");
ALTER TABLE "convenzioni" ADD CONSTRAINT "convenzioni_tenantId_codice_key" UNIQUE ("tenantId", "codice");
ALTER TABLE "convenzione_listino" ADD CONSTRAINT "convenzione_listino_convenzioneId_listinoId_key" UNIQUE ("convenzioneId", "listinoId");
ALTER TABLE "codici_sconto_clinici" ADD CONSTRAINT "codici_sconto_clinici_tenantId_codice_key" UNIQUE ("tenantId", "codice");
ALTER TABLE "template_campi_visita" ADD CONSTRAINT "template_campi_visita_prestazioneId_nome_key" UNIQUE ("prestazioneId", "nome");
ALTER TABLE "valori_campo_visita" ADD CONSTRAINT "valori_campo_visita_visitaId_campoId_key" UNIQUE ("visitaId", "campoId");
ALTER TABLE "versioni_referto" ADD CONSTRAINT "versioni_referto_refertoId_versione_key" UNIQUE ("refertoId", "versione");
ALTER TABLE "slots_disponibilita" ADD CONSTRAINT "slots_disponibilita_medicoId_data_oraInizio_key" UNIQUE ("medicoId", "data", "oraInizio");
ALTER TABLE "numeri_chiamata" ADD CONSTRAINT "numeri_chiamata_poliambulatorioId_data_numero_key" UNIQUE ("poliambulatorioId", "data", "numero");

-- Create indexes
CREATE INDEX "orari_ambulatorio_tenantId_deletedAt_idx" ON "orari_ambulatorio"("tenantId", "deletedAt");
CREATE INDEX "orari_ambulatorio_ambulatorioId_idx" ON "orari_ambulatorio"("ambulatorioId");
CREATE INDEX "orari_ambulatorio_giornoSettimana_idx" ON "orari_ambulatorio"("giornoSettimana");

CREATE INDEX "manutenzioni_strumento_tenantId_deletedAt_idx" ON "manutenzioni_strumento"("tenantId", "deletedAt");
CREATE INDEX "manutenzioni_strumento_strumentoId_idx" ON "manutenzioni_strumento"("strumentoId");
CREATE INDEX "manutenzioni_strumento_dataEsecuzione_idx" ON "manutenzioni_strumento"("dataEsecuzione");
CREATE INDEX "manutenzioni_strumento_dataProssima_idx" ON "manutenzioni_strumento"("dataProssima");

CREATE INDEX "convenzioni_tenantId_deletedAt_idx" ON "convenzioni"("tenantId", "deletedAt");
CREATE INDEX "convenzioni_tipo_idx" ON "convenzioni"("tipo");
CREATE INDEX "convenzioni_validoDa_validoA_idx" ON "convenzioni"("validoDa", "validoA");

CREATE INDEX "convenzione_listino_convenzioneId_idx" ON "convenzione_listino"("convenzioneId");
CREATE INDEX "convenzione_listino_listinoId_idx" ON "convenzione_listino"("listinoId");

CREATE INDEX "codici_sconto_clinici_tenantId_deletedAt_idx" ON "codici_sconto_clinici"("tenantId", "deletedAt");
CREATE INDEX "codici_sconto_clinici_codice_idx" ON "codici_sconto_clinici"("codice");
CREATE INDEX "codici_sconto_clinici_validoDa_validoA_idx" ON "codici_sconto_clinici"("validoDa", "validoA");

CREATE INDEX "template_campi_visita_tenantId_deletedAt_idx" ON "template_campi_visita"("tenantId", "deletedAt");
CREATE INDEX "template_campi_visita_prestazioneId_idx" ON "template_campi_visita"("prestazioneId");
CREATE INDEX "template_campi_visita_ordine_idx" ON "template_campi_visita"("ordine");

CREATE INDEX "valori_campo_visita_visitaId_idx" ON "valori_campo_visita"("visitaId");
CREATE INDEX "valori_campo_visita_campoId_idx" ON "valori_campo_visita"("campoId");

CREATE INDEX "versioni_referto_refertoId_idx" ON "versioni_referto"("refertoId");
CREATE INDEX "versioni_referto_createdAt_idx" ON "versioni_referto"("createdAt");

CREATE INDEX "firme_digitali_tenantId_idx" ON "firme_digitali"("tenantId");
CREATE INDEX "firme_digitali_refertoId_idx" ON "firme_digitali"("refertoId");
CREATE INDEX "firme_digitali_visitaId_idx" ON "firme_digitali"("visitaId");
CREATE INDEX "firme_digitali_firmatarioId_idx" ON "firme_digitali"("firmatarioId");
CREATE INDEX "firme_digitali_timestampFirma_idx" ON "firme_digitali"("timestampFirma");

CREATE INDEX "slots_disponibilita_tenantId_deletedAt_idx" ON "slots_disponibilita"("tenantId", "deletedAt");
CREATE INDEX "slots_disponibilita_medicoId_idx" ON "slots_disponibilita"("medicoId");
CREATE INDEX "slots_disponibilita_ambulatorioId_idx" ON "slots_disponibilita"("ambulatorioId");
CREATE INDEX "slots_disponibilita_data_idx" ON "slots_disponibilita"("data");
CREATE INDEX "slots_disponibilita_stato_idx" ON "slots_disponibilita"("stato");
CREATE INDEX "slots_disponibilita_medicoId_data_stato_idx" ON "slots_disponibilita"("medicoId", "data", "stato");

CREATE INDEX "numeri_chiamata_tenantId_idx" ON "numeri_chiamata"("tenantId");
CREATE INDEX "numeri_chiamata_poliambulatorioId_idx" ON "numeri_chiamata"("poliambulatorioId");
CREATE INDEX "numeri_chiamata_data_idx" ON "numeri_chiamata"("data");
CREATE INDEX "numeri_chiamata_stato_idx" ON "numeri_chiamata"("stato");
CREATE INDEX "numeri_chiamata_appuntamentoId_idx" ON "numeri_chiamata"("appuntamentoId");

CREATE INDEX "audit_log_clinico_tenantId_idx" ON "audit_log_clinico"("tenantId");
CREATE INDEX "audit_log_clinico_personId_idx" ON "audit_log_clinico"("personId");
CREATE INDEX "audit_log_clinico_pazienteId_idx" ON "audit_log_clinico"("pazienteId");
CREATE INDEX "audit_log_clinico_entita_entitaId_idx" ON "audit_log_clinico"("entita", "entitaId");
CREATE INDEX "audit_log_clinico_azione_idx" ON "audit_log_clinico"("azione");
CREATE INDEX "audit_log_clinico_createdAt_idx" ON "audit_log_clinico"("createdAt");

-- Add foreign key constraints
-- OrarioAmbulatorio FKs
ALTER TABLE "orari_ambulatorio" ADD CONSTRAINT "orari_ambulatorio_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orari_ambulatorio" ADD CONSTRAINT "orari_ambulatorio_ambulatorioId_fkey" FOREIGN KEY ("ambulatorioId") REFERENCES "ambulatori"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ManutenzioneStrumento FKs
ALTER TABLE "manutenzioni_strumento" ADD CONSTRAINT "manutenzioni_strumento_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "manutenzioni_strumento" ADD CONSTRAINT "manutenzioni_strumento_strumentoId_fkey" FOREIGN KEY ("strumentoId") REFERENCES "strumenti"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Convenzione FKs
ALTER TABLE "convenzioni" ADD CONSTRAINT "convenzioni_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ConvenzioneListino FKs
ALTER TABLE "convenzione_listino" ADD CONSTRAINT "convenzione_listino_convenzioneId_fkey" FOREIGN KEY ("convenzioneId") REFERENCES "convenzioni"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "convenzione_listino" ADD CONSTRAINT "convenzione_listino_listinoId_fkey" FOREIGN KEY ("listinoId") REFERENCES "listino_prezzi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CodiceScontoClinico FKs
ALTER TABLE "codici_sconto_clinici" ADD CONSTRAINT "codici_sconto_clinici_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- TemplateCampoVisita FKs
ALTER TABLE "template_campi_visita" ADD CONSTRAINT "template_campi_visita_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "template_campi_visita" ADD CONSTRAINT "template_campi_visita_prestazioneId_fkey" FOREIGN KEY ("prestazioneId") REFERENCES "prestazioni"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ValoreCampoVisita FKs
ALTER TABLE "valori_campo_visita" ADD CONSTRAINT "valori_campo_visita_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "visite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "valori_campo_visita" ADD CONSTRAINT "valori_campo_visita_campoId_fkey" FOREIGN KEY ("campoId") REFERENCES "template_campi_visita"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- VersioneReferto FKs
ALTER TABLE "versioni_referto" ADD CONSTRAINT "versioni_referto_refertoId_fkey" FOREIGN KEY ("refertoId") REFERENCES "referti"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FirmaDigitale FKs
ALTER TABLE "firme_digitali" ADD CONSTRAINT "firme_digitali_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "firme_digitali" ADD CONSTRAINT "firme_digitali_firmatarioId_fkey" FOREIGN KEY ("firmatarioId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SlotDisponibilita FKs
ALTER TABLE "slots_disponibilita" ADD CONSTRAINT "slots_disponibilita_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "slots_disponibilita" ADD CONSTRAINT "slots_disponibilita_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NumeroChiamata FKs
ALTER TABLE "numeri_chiamata" ADD CONSTRAINT "numeri_chiamata_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "numeri_chiamata" ADD CONSTRAINT "numeri_chiamata_poliambulatorioId_fkey" FOREIGN KEY ("poliambulatorioId") REFERENCES "poliambulatori"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AuditLogClinico FKs
ALTER TABLE "audit_log_clinico" ADD CONSTRAINT "audit_log_clinico_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_log_clinico" ADD CONSTRAINT "audit_log_clinico_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
