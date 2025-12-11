-- ElementMedica Clinical Models Migration
-- Created: 2025-01-31
-- Description: Adds clinical entities for poliambulatorio management

-- ============================================
-- ENUMS
-- ============================================

-- Add new values to RoleType enum
ALTER TYPE "role_types" ADD VALUE IF NOT EXISTS 'MEDICO';
ALTER TYPE "role_types" ADD VALUE IF NOT EXISTS 'MEDICO_SPECIALISTA';
ALTER TYPE "role_types" ADD VALUE IF NOT EXISTS 'DIRETTORE_SANITARIO';
ALTER TYPE "role_types" ADD VALUE IF NOT EXISTS 'INFERMIERE';
ALTER TYPE "role_types" ADD VALUE IF NOT EXISTS 'INFERMIERE_CAPO';
ALTER TYPE "role_types" ADD VALUE IF NOT EXISTS 'TECNICO_SANITARIO';
ALTER TYPE "role_types" ADD VALUE IF NOT EXISTS 'SEGRETERIA_MEDICA';
ALTER TYPE "role_types" ADD VALUE IF NOT EXISTS 'RECEPTIONIST_MEDICO';
ALTER TYPE "role_types" ADD VALUE IF NOT EXISTS 'PAZIENTE';

-- Create AppType enum
DO $$ BEGIN
    CREATE TYPE "app_types" AS ENUM ('FORMAZIONE', 'MEDICA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create clinical enums
DO $$ BEGIN
    CREATE TYPE "tipo_prestazione" AS ENUM ('VISITA', 'ESAME', 'TERAPIA', 'INTERVENTO', 'CONSULTO', 'ALTRO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "stato_strumento" AS ENUM ('DISPONIBILE', 'IN_USO', 'MANUTENZIONE', 'GUASTO', 'DISMESSO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "tipo_listino" AS ENUM ('PRIVATO', 'SSN', 'CONVENZIONATO', 'ASSICURAZIONE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "stato_appuntamento" AS ENUM ('PRENOTATO', 'CONFERMATO', 'IN_ATTESA', 'IN_CORSO', 'COMPLETATO', 'ANNULLATO', 'NO_SHOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "stato_visita" AS ENUM ('INIZIATA', 'IN_CORSO', 'SOSPESA', 'COMPLETATA', 'ANNULLATA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "stato_referto" AS ENUM ('BOZZA', 'IN_REVISIONE', 'FIRMATO', 'CONSEGNATO', 'ARCHIVIATO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new clinical permissions to PersonPermission enum
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'VIEW_PATIENTS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CREATE_PATIENTS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'EDIT_PATIENTS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'DELETE_PATIENTS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'MANAGE_PATIENTS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'EXPORT_PATIENTS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'VIEW_PATIENT_HISTORY';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'VIEW_APPOINTMENTS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CREATE_APPOINTMENTS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'EDIT_APPOINTMENTS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'DELETE_APPOINTMENTS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'MANAGE_APPOINTMENTS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CONFIRM_APPOINTMENTS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CANCEL_APPOINTMENTS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'VIEW_VISITS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CREATE_VISITS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'EDIT_VISITS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'DELETE_VISITS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'MANAGE_VISITS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'SIGN_VISITS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'COMPLETE_VISITS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'VIEW_REFERTI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CREATE_REFERTI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'EDIT_REFERTI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'DELETE_REFERTI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'SIGN_REFERTI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'EXPORT_REFERTI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'VIEW_PRESTAZIONI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CREATE_PRESTAZIONI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'EDIT_PRESTAZIONI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'DELETE_PRESTAZIONI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'MANAGE_PRESTAZIONI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'VIEW_AMBULATORI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CREATE_AMBULATORI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'EDIT_AMBULATORI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'DELETE_AMBULATORI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'MANAGE_AMBULATORI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'VIEW_POLIAMBULATORIO';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CREATE_POLIAMBULATORIO';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'EDIT_POLIAMBULATORIO';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'DELETE_POLIAMBULATORIO';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'MANAGE_POLIAMBULATORIO';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'VIEW_LISTINO';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CREATE_LISTINO';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'EDIT_LISTINO';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'DELETE_LISTINO';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'MANAGE_LISTINO';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'VIEW_STRUMENTI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CREATE_STRUMENTI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'EDIT_STRUMENTI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'DELETE_STRUMENTI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'MANAGE_STRUMENTI';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'VIEW_AGENDA';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'MANAGE_AGENDA';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CONFIGURE_AGENDA';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'VIEW_FATTURE_SANITARIE';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CREATE_FATTURE_SANITARIE';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'EDIT_FATTURE_SANITARIE';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'DELETE_FATTURE_SANITARIE';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'SEND_FATTURE_SANITARIE';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CLINICAL_ADMIN_PANEL';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CLINICAL_SETTINGS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CLINICAL_REPORTS';

-- ============================================
-- TABLES
-- ============================================

-- Poliambulatorio
CREATE TABLE IF NOT EXISTS "poliambulatori" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codice" TEXT NOT NULL,
    "indirizzo" TEXT,
    "citta" TEXT,
    "cap" TEXT,
    "provincia" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "pec" TEXT,
    "partitaIva" TEXT,
    "codiceFiscale" TEXT,
    "codiceRegionale" TEXT,
    "direttoreSanitarioId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "poliambulatori_pkey" PRIMARY KEY ("id")
);

-- Ambulatorio
CREATE TABLE IF NOT EXISTS "ambulatori" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poliambulatorioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codice" TEXT NOT NULL,
    "specializzazione" TEXT,
    "piano" TEXT,
    "stanza" TEXT,
    "capienzaMax" INTEGER NOT NULL DEFAULT 1,
    "attrezzature" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ambulatori_pkey" PRIMARY KEY ("id")
);

-- Prestazione
CREATE TABLE IF NOT EXISTS "prestazioni" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codice" TEXT NOT NULL,
    "codiceNazionale" TEXT,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT,
    "tipo" "tipo_prestazione" NOT NULL DEFAULT 'VISITA',
    "durataPrevista" INTEGER NOT NULL DEFAULT 30,
    "richiedeReferto" BOOLEAN NOT NULL DEFAULT true,
    "richiedeConsenso" BOOLEAN NOT NULL DEFAULT false,
    "preparazioneRichiesta" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "prestazioni_pkey" PRIMARY KEY ("id")
);

-- PrestazioneAmbulatorio (junction)
CREATE TABLE IF NOT EXISTS "prestazione_ambulatorio" (
    "id" TEXT NOT NULL,
    "prestazioneId" TEXT NOT NULL,
    "ambulatorioId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prestazione_ambulatorio_pkey" PRIMARY KEY ("id")
);

-- Strumento
CREATE TABLE IF NOT EXISTS "strumenti" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codice" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT,
    "marca" TEXT,
    "modello" TEXT,
    "numeroSerie" TEXT,
    "dataAcquisto" DATE,
    "dataScadenzaGaranzia" DATE,
    "dataUltimaManutenz" DATE,
    "dataProssimaManutenz" DATE,
    "stato" "stato_strumento" NOT NULL DEFAULT 'DISPONIBILE',
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "strumenti_pkey" PRIMARY KEY ("id")
);

-- StrumentoAmbulatorio (junction)
CREATE TABLE IF NOT EXISTS "strumento_ambulatorio" (
    "id" TEXT NOT NULL,
    "strumentoId" TEXT NOT NULL,
    "ambulatorioId" TEXT NOT NULL,
    "dataAssegnazione" DATE NOT NULL DEFAULT CURRENT_DATE,
    "dataFineAssegnazione" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "strumento_ambulatorio_pkey" PRIMARY KEY ("id")
);

-- ListinoPrezzo
CREATE TABLE IF NOT EXISTS "listino_prezzi" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "prestazioneId" TEXT NOT NULL,
    "tipo" "tipo_listino" NOT NULL DEFAULT 'PRIVATO',
    "prezzo" DECIMAL(10,2) NOT NULL,
    "prezzoMinimo" DECIMAL(10,2),
    "prezzoMassimo" DECIMAL(10,2),
    "codiceConvenzione" TEXT,
    "nomeConvenzione" TEXT,
    "validoDa" DATE NOT NULL DEFAULT CURRENT_DATE,
    "validoA" DATE,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "listino_prezzi_pkey" PRIMARY KEY ("id")
);

-- Appuntamento
CREATE TABLE IF NOT EXISTS "appuntamenti" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "pazienteId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "ambulatorioId" TEXT NOT NULL,
    "prestazioneId" TEXT,
    "dataOra" TIMESTAMP(6) NOT NULL,
    "durataPrevista" INTEGER NOT NULL DEFAULT 30,
    "stato" "stato_appuntamento" NOT NULL DEFAULT 'PRENOTATO',
    "note" TEXT,
    "noteInterne" TEXT,
    "promemoria" BOOLEAN NOT NULL DEFAULT true,
    "promemoriaInviato" BOOLEAN NOT NULL DEFAULT false,
    "dataConferma" TIMESTAMP(6),
    "dataAnnullamento" TIMESTAMP(6),
    "motivoAnnullamento" TEXT,
    "numeroCoda" INTEGER,
    "oraArrivo" TIMESTAMP(6),
    "oraInizio" TIMESTAMP(6),
    "oraFine" TIMESTAMP(6),
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPattern" TEXT,
    "parentAppuntamentoId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "appuntamenti_pkey" PRIMARY KEY ("id")
);

-- Visita
CREATE TABLE IF NOT EXISTS "visite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appuntamentoId" TEXT,
    "pazienteId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "prestazioneId" TEXT NOT NULL,
    "dataOra" TIMESTAMP(6) NOT NULL,
    "stato" "stato_visita" NOT NULL DEFAULT 'INIZIATA',
    "anamnesi" TEXT,
    "esamObiettivo" TEXT,
    "diagnosi" TEXT,
    "diagnosiIcd10" TEXT,
    "terapia" TEXT,
    "prescrizioni" TEXT,
    "noteClinic" TEXT,
    "followUpRichiesto" BOOLEAN NOT NULL DEFAULT false,
    "followUpData" DATE,
    "followUpNote" TEXT,
    "firmaMedico" TEXT,
    "dataFirma" TIMESTAMP(6),
    "consensoInformato" BOOLEAN NOT NULL DEFAULT false,
    "consensoTrattamento" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "visite_pkey" PRIMARY KEY ("id")
);

-- Referto
CREATE TABLE IF NOT EXISTS "referti" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "visitaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "codice" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "contenuto" TEXT,
    "conclusioni" TEXT,
    "valoriRiferimento" TEXT,
    "stato" "stato_referto" NOT NULL DEFAULT 'BOZZA',
    "dataEmissione" TIMESTAMP(6),
    "firmaMedico" TEXT,
    "dataFirma" TIMESTAMP(6),
    "firmaValidata" BOOLEAN NOT NULL DEFAULT false,
    "consegnatoIl" TIMESTAMP(6),
    "consegnatoA" TEXT,
    "metodiConsegna" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "referti_pkey" PRIMARY KEY ("id")
);

-- AllegatoVisita
CREATE TABLE IF NOT EXISTS "allegati_visita" (
    "id" TEXT NOT NULL,
    "visitaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "dimensione" INTEGER NOT NULL,
    "uploadatoBy" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "allegati_visita_pkey" PRIMARY KEY ("id")
);

-- AllegatoReferto
CREATE TABLE IF NOT EXISTS "allegati_referto" (
    "id" TEXT NOT NULL,
    "refertoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "dimensione" INTEGER NOT NULL,
    "uploadatoBy" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "allegati_referto_pkey" PRIMARY KEY ("id")
);

-- DisponibilitaMedico
CREATE TABLE IF NOT EXISTS "disponibilita_medico" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "ambulatorioId" TEXT,
    "giornoSettimana" INTEGER NOT NULL,
    "oraInizio" TEXT NOT NULL,
    "oraFine" TEXT NOT NULL,
    "validoDa" DATE NOT NULL DEFAULT CURRENT_DATE,
    "validoA" DATE,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "disponibilita_medico_pkey" PRIMARY KEY ("id")
);

-- FerieAssenza
CREATE TABLE IF NOT EXISTS "ferie_assenze" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "dataInizio" DATE NOT NULL,
    "dataFine" DATE NOT NULL,
    "motivo" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ferie_assenze_pkey" PRIMARY KEY ("id")
);

-- FatturaSanitaria
CREATE TABLE IF NOT EXISTS "fatture_sanitarie" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "dataEmissione" DATE NOT NULL,
    "pazienteId" TEXT NOT NULL,
    "visitaId" TEXT,
    "imponibile" DECIMAL(10,2) NOT NULL,
    "aliquotaIva" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "importoIva" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totale" DECIMAL(10,2) NOT NULL,
    "metodoPagamento" TEXT,
    "dataPagamento" DATE,
    "stato" TEXT NOT NULL DEFAULT 'emessa',
    "note" TEXT,
    "inviatoTS" BOOLEAN NOT NULL DEFAULT false,
    "dataInvioTS" TIMESTAMP(6),
    "codiceDocumentoTS" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "fatture_sanitarie_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- UNIQUE CONSTRAINTS
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS "poliambulatori_tenantId_codice_key" ON "poliambulatori"("tenantId", "codice");
CREATE UNIQUE INDEX IF NOT EXISTS "ambulatori_poliambulatorioId_codice_key" ON "ambulatori"("poliambulatorioId", "codice");
CREATE UNIQUE INDEX IF NOT EXISTS "prestazioni_tenantId_codice_key" ON "prestazioni"("tenantId", "codice");
CREATE UNIQUE INDEX IF NOT EXISTS "prestazione_ambulatorio_unique" ON "prestazione_ambulatorio"("prestazioneId", "ambulatorioId");
CREATE UNIQUE INDEX IF NOT EXISTS "strumenti_tenantId_codice_key" ON "strumenti"("tenantId", "codice");
CREATE UNIQUE INDEX IF NOT EXISTS "strumento_ambulatorio_unique" ON "strumento_ambulatorio"("strumentoId", "ambulatorioId", "dataAssegnazione");
CREATE UNIQUE INDEX IF NOT EXISTS "listino_prezzi_unique" ON "listino_prezzi"("tenantId", "prestazioneId", "tipo", "codiceConvenzione", "validoDa");
CREATE UNIQUE INDEX IF NOT EXISTS "appuntamenti_tenantId_numero_dataOra_key" ON "appuntamenti"("tenantId", "numero", "dataOra");
CREATE UNIQUE INDEX IF NOT EXISTS "referti_tenantId_codice_key" ON "referti"("tenantId", "codice");
CREATE UNIQUE INDEX IF NOT EXISTS "fatture_sanitarie_tenantId_numero_key" ON "fatture_sanitarie"("tenantId", "numero");

-- ============================================
-- INDEXES
-- ============================================

-- Poliambulatorio indexes
CREATE INDEX IF NOT EXISTS "poliambulatori_tenantId_deletedAt_idx" ON "poliambulatori"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "poliambulatori_codiceRegionale_idx" ON "poliambulatori"("codiceRegionale");
CREATE INDEX IF NOT EXISTS "poliambulatori_direttoreSanitarioId_idx" ON "poliambulatori"("direttoreSanitarioId");

-- Ambulatorio indexes
CREATE INDEX IF NOT EXISTS "ambulatori_tenantId_deletedAt_idx" ON "ambulatori"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "ambulatori_poliambulatorioId_idx" ON "ambulatori"("poliambulatorioId");
CREATE INDEX IF NOT EXISTS "ambulatori_specializzazione_idx" ON "ambulatori"("specializzazione");

-- Prestazione indexes
CREATE INDEX IF NOT EXISTS "prestazioni_tenantId_deletedAt_idx" ON "prestazioni"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "prestazioni_codiceNazionale_idx" ON "prestazioni"("codiceNazionale");
CREATE INDEX IF NOT EXISTS "prestazioni_tipo_idx" ON "prestazioni"("tipo");

-- Junction table indexes
CREATE INDEX IF NOT EXISTS "prestazione_ambulatorio_prestazioneId_idx" ON "prestazione_ambulatorio"("prestazioneId");
CREATE INDEX IF NOT EXISTS "prestazione_ambulatorio_ambulatorioId_idx" ON "prestazione_ambulatorio"("ambulatorioId");

-- Strumento indexes
CREATE INDEX IF NOT EXISTS "strumenti_tenantId_deletedAt_idx" ON "strumenti"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "strumenti_stato_idx" ON "strumenti"("stato");
CREATE INDEX IF NOT EXISTS "strumenti_dataProssimaManutenz_idx" ON "strumenti"("dataProssimaManutenz");

-- StrumentoAmbulatorio indexes
CREATE INDEX IF NOT EXISTS "strumento_ambulatorio_strumentoId_idx" ON "strumento_ambulatorio"("strumentoId");
CREATE INDEX IF NOT EXISTS "strumento_ambulatorio_ambulatorioId_idx" ON "strumento_ambulatorio"("ambulatorioId");

-- ListinoPrezzo indexes
CREATE INDEX IF NOT EXISTS "listino_prezzi_tenantId_deletedAt_idx" ON "listino_prezzi"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "listino_prezzi_prestazioneId_idx" ON "listino_prezzi"("prestazioneId");
CREATE INDEX IF NOT EXISTS "listino_prezzi_tipo_idx" ON "listino_prezzi"("tipo");
CREATE INDEX IF NOT EXISTS "listino_prezzi_validoDa_validoA_idx" ON "listino_prezzi"("validoDa", "validoA");

-- Appuntamento indexes
CREATE INDEX IF NOT EXISTS "appuntamenti_tenantId_deletedAt_idx" ON "appuntamenti"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "appuntamenti_pazienteId_idx" ON "appuntamenti"("pazienteId");
CREATE INDEX IF NOT EXISTS "appuntamenti_medicoId_idx" ON "appuntamenti"("medicoId");
CREATE INDEX IF NOT EXISTS "appuntamenti_ambulatorioId_idx" ON "appuntamenti"("ambulatorioId");
CREATE INDEX IF NOT EXISTS "appuntamenti_dataOra_idx" ON "appuntamenti"("dataOra");
CREATE INDEX IF NOT EXISTS "appuntamenti_stato_idx" ON "appuntamenti"("stato");
CREATE INDEX IF NOT EXISTS "appuntamenti_tenantId_dataOra_stato_idx" ON "appuntamenti"("tenantId", "dataOra", "stato");
CREATE INDEX IF NOT EXISTS "appuntamenti_medicoId_dataOra_idx" ON "appuntamenti"("medicoId", "dataOra");
CREATE INDEX IF NOT EXISTS "appuntamenti_ambulatorioId_dataOra_idx" ON "appuntamenti"("ambulatorioId", "dataOra");

-- Visita indexes
CREATE INDEX IF NOT EXISTS "visite_tenantId_deletedAt_idx" ON "visite"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "visite_pazienteId_idx" ON "visite"("pazienteId");
CREATE INDEX IF NOT EXISTS "visite_medicoId_idx" ON "visite"("medicoId");
CREATE INDEX IF NOT EXISTS "visite_appuntamentoId_idx" ON "visite"("appuntamentoId");
CREATE INDEX IF NOT EXISTS "visite_prestazioneId_idx" ON "visite"("prestazioneId");
CREATE INDEX IF NOT EXISTS "visite_dataOra_idx" ON "visite"("dataOra");
CREATE INDEX IF NOT EXISTS "visite_stato_idx" ON "visite"("stato");
CREATE INDEX IF NOT EXISTS "visite_tenantId_dataOra_stato_idx" ON "visite"("tenantId", "dataOra", "stato");

-- Referto indexes
CREATE INDEX IF NOT EXISTS "referti_tenantId_deletedAt_idx" ON "referti"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "referti_visitaId_idx" ON "referti"("visitaId");
CREATE INDEX IF NOT EXISTS "referti_stato_idx" ON "referti"("stato");
CREATE INDEX IF NOT EXISTS "referti_dataEmissione_idx" ON "referti"("dataEmissione");

-- Allegati indexes
CREATE INDEX IF NOT EXISTS "allegati_visita_visitaId_idx" ON "allegati_visita"("visitaId");
CREATE INDEX IF NOT EXISTS "allegati_referto_refertoId_idx" ON "allegati_referto"("refertoId");

-- DisponibilitaMedico indexes
CREATE INDEX IF NOT EXISTS "disponibilita_medico_tenantId_deletedAt_idx" ON "disponibilita_medico"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "disponibilita_medico_medicoId_idx" ON "disponibilita_medico"("medicoId");
CREATE INDEX IF NOT EXISTS "disponibilita_medico_ambulatorioId_idx" ON "disponibilita_medico"("ambulatorioId");
CREATE INDEX IF NOT EXISTS "disponibilita_medico_giornoSettimana_idx" ON "disponibilita_medico"("giornoSettimana");

-- FerieAssenza indexes
CREATE INDEX IF NOT EXISTS "ferie_assenze_tenantId_deletedAt_idx" ON "ferie_assenze"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "ferie_assenze_medicoId_idx" ON "ferie_assenze"("medicoId");
CREATE INDEX IF NOT EXISTS "ferie_assenze_dataInizio_dataFine_idx" ON "ferie_assenze"("dataInizio", "dataFine");

-- FatturaSanitaria indexes
CREATE INDEX IF NOT EXISTS "fatture_sanitarie_tenantId_deletedAt_idx" ON "fatture_sanitarie"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "fatture_sanitarie_pazienteId_idx" ON "fatture_sanitarie"("pazienteId");
CREATE INDEX IF NOT EXISTS "fatture_sanitarie_dataEmissione_idx" ON "fatture_sanitarie"("dataEmissione");
CREATE INDEX IF NOT EXISTS "fatture_sanitarie_stato_idx" ON "fatture_sanitarie"("stato");

-- ============================================
-- FOREIGN KEYS
-- ============================================

-- Poliambulatorio FKs
ALTER TABLE "poliambulatori" ADD CONSTRAINT "poliambulatori_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "poliambulatori" ADD CONSTRAINT "poliambulatori_direttoreSanitarioId_fkey" FOREIGN KEY ("direttoreSanitarioId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ambulatorio FKs
ALTER TABLE "ambulatori" ADD CONSTRAINT "ambulatori_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ambulatori" ADD CONSTRAINT "ambulatori_poliambulatorioId_fkey" FOREIGN KEY ("poliambulatorioId") REFERENCES "poliambulatori"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prestazione FKs
ALTER TABLE "prestazioni" ADD CONSTRAINT "prestazioni_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PrestazioneAmbulatorio FKs
ALTER TABLE "prestazione_ambulatorio" ADD CONSTRAINT "prestazione_ambulatorio_prestazioneId_fkey" FOREIGN KEY ("prestazioneId") REFERENCES "prestazioni"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prestazione_ambulatorio" ADD CONSTRAINT "prestazione_ambulatorio_ambulatorioId_fkey" FOREIGN KEY ("ambulatorioId") REFERENCES "ambulatori"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Strumento FKs
ALTER TABLE "strumenti" ADD CONSTRAINT "strumenti_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- StrumentoAmbulatorio FKs
ALTER TABLE "strumento_ambulatorio" ADD CONSTRAINT "strumento_ambulatorio_strumentoId_fkey" FOREIGN KEY ("strumentoId") REFERENCES "strumenti"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strumento_ambulatorio" ADD CONSTRAINT "strumento_ambulatorio_ambulatorioId_fkey" FOREIGN KEY ("ambulatorioId") REFERENCES "ambulatori"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ListinoPrezzo FKs
ALTER TABLE "listino_prezzi" ADD CONSTRAINT "listino_prezzi_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listino_prezzi" ADD CONSTRAINT "listino_prezzi_prestazioneId_fkey" FOREIGN KEY ("prestazioneId") REFERENCES "prestazioni"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Appuntamento FKs
ALTER TABLE "appuntamenti" ADD CONSTRAINT "appuntamenti_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appuntamenti" ADD CONSTRAINT "appuntamenti_pazienteId_fkey" FOREIGN KEY ("pazienteId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appuntamenti" ADD CONSTRAINT "appuntamenti_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appuntamenti" ADD CONSTRAINT "appuntamenti_ambulatorioId_fkey" FOREIGN KEY ("ambulatorioId") REFERENCES "ambulatori"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appuntamenti" ADD CONSTRAINT "appuntamenti_parentAppuntamentoId_fkey" FOREIGN KEY ("parentAppuntamentoId") REFERENCES "appuntamenti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Visita FKs
ALTER TABLE "visite" ADD CONSTRAINT "visite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "visite" ADD CONSTRAINT "visite_appuntamentoId_fkey" FOREIGN KEY ("appuntamentoId") REFERENCES "appuntamenti"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "visite" ADD CONSTRAINT "visite_pazienteId_fkey" FOREIGN KEY ("pazienteId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "visite" ADD CONSTRAINT "visite_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "visite" ADD CONSTRAINT "visite_prestazioneId_fkey" FOREIGN KEY ("prestazioneId") REFERENCES "prestazioni"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Referto FKs
ALTER TABLE "referti" ADD CONSTRAINT "referti_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "referti" ADD CONSTRAINT "referti_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "visite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AllegatoVisita FKs
ALTER TABLE "allegati_visita" ADD CONSTRAINT "allegati_visita_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "visite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AllegatoReferto FKs
ALTER TABLE "allegati_referto" ADD CONSTRAINT "allegati_referto_refertoId_fkey" FOREIGN KEY ("refertoId") REFERENCES "referti"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DisponibilitaMedico FKs
ALTER TABLE "disponibilita_medico" ADD CONSTRAINT "disponibilita_medico_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "disponibilita_medico" ADD CONSTRAINT "disponibilita_medico_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FerieAssenza FKs
ALTER TABLE "ferie_assenze" ADD CONSTRAINT "ferie_assenze_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ferie_assenze" ADD CONSTRAINT "ferie_assenze_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FatturaSanitaria FKs
ALTER TABLE "fatture_sanitarie" ADD CONSTRAINT "fatture_sanitarie_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fatture_sanitarie" ADD CONSTRAINT "fatture_sanitarie_pazienteId_fkey" FOREIGN KEY ("pazienteId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
