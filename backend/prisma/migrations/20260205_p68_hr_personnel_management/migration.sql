-- P68: HR Personnel Management
-- Adds enums, models and fields for internal personnel management

-- =====================================================
-- ENUMS
-- =====================================================

-- TipoContratto: Types of employment contracts
CREATE TYPE "TipoContratto" AS ENUM (
    'DIPENDENTE_INDETERMINATO',
    'DIPENDENTE_DETERMINATO',
    'LIBERA_PROFESSIONE',
    'COCOCO',
    'PRESTAZIONE_OCCASIONALE',
    'TIROCINIO',
    'APPRENDISTATO',
    'COLLABORAZIONE'
);

-- TipoCollaboratore: Types of collaborators
CREATE TYPE "TipoCollaboratore" AS ENUM (
    'AMMINISTRATIVO',
    'MEDICO',
    'INFERMIERE',
    'TECNICO_SANITARIO',
    'FORMATORE',
    'SEGRETERIA',
    'DIRIGENTE',
    'CONSULENTE',
    'ALTRO'
);

-- AreaAziendale: Company areas/departments
CREATE TYPE "AreaAziendale" AS ENUM (
    'DIREZIONE',
    'AMMINISTRAZIONE',
    'CLINICA',
    'FORMAZIONE',
    'MEDICINA_LAVORO',
    'SEGRETERIA',
    'MARKETING',
    'ALTRO'
);

-- TipoTurno: Types of shifts
CREATE TYPE "TipoTurno" AS ENUM (
    'MATTINA',
    'POMERIGGIO',
    'GIORNATA',
    'NOTTURNO',
    'SPEZZATO',
    'REPERIBILITA',
    'STRAORDINARIO'
);

-- StatoTurno: Shift status
CREATE TYPE "StatoTurno" AS ENUM (
    'PROGRAMMATO',
    'CONFERMATO',
    'IN_CORSO',
    'COMPLETATO',
    'ANNULLATO'
);

-- PreferenzaDisponibilita: Availability preferences
CREATE TYPE "PreferenzaDisponibilita" AS ENUM (
    'DISPONIBILE',
    'PREFERITO',
    'NON_DISPONIBILE',
    'FERIE_RICHIESTE',
    'PERMESSO_RICHIESTO'
);

-- FasciaOraria: Time slots
CREATE TYPE "FasciaOraria" AS ENUM (
    'MATTINA_PRESTO',
    'MATTINA',
    'PRANZO',
    'POMERIGGIO',
    'SERA',
    'NOTTE'
);

-- StatoRichiestaHR: HR request status
CREATE TYPE "StatoRichiestaHR" AS ENUM (
    'BOZZA',
    'INVIATA',
    'IN_VALUTAZIONE',
    'APPROVATA',
    'RIFIUTATA',
    'ANNULLATA'
);

-- TipoTimbratura: Clock in/out types
CREATE TYPE "TipoTimbratura" AS ENUM (
    'ENTRATA',
    'USCITA',
    'INIZIO_PAUSA',
    'FINE_PAUSA',
    'ENTRATA_STRAORDINARIO',
    'USCITA_STRAORDINARIO'
);

-- OrigineTimbratura: Clock origin
CREATE TYPE "OrigineTimbratura" AS ENUM (
    'BADGE_FISICO',
    'APP_WEB',
    'APP_MOBILE',
    'MANUALE',
    'SISTEMA'
);

-- TipoAssenza: Absence types
-- Check if old tipo_assenza exists and rename it to avoid conflict
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_assenza') THEN
        -- Rename old enum to TipoAssenzaMedico (snake_case: tipo_assenza_medico)
        ALTER TYPE "tipo_assenza" RENAME TO "TipoAssenzaMedico";
        
        -- Update FerieAssenza table to use new enum name
        ALTER TABLE "ferie_assenze" ALTER COLUMN "tipo" TYPE "TipoAssenzaMedico" USING tipo::text::"TipoAssenzaMedico";
    END IF;
END $$;

-- Now create the new comprehensive TipoAssenza for HR
CREATE TYPE "TipoAssenza" AS ENUM (
    'FERIE',
    'PERMESSO_ROL',
    'PERMESSO_EX_FESTIVITA',
    'MALATTIA',
    'INFORTUNIO',
    'MATERNITA',
    'PATERNITA',
    'CONGEDO_PARENTALE',
    'LUTTO',
    'MATRIMONIO',
    'DONAZIONE_SANGUE',
    'VISITA_MEDICA',
    'PERMESSO_STUDIO',
    'ASPETTATIVA',
    'ALTRO'
);

-- TipoCongedo: Leave types
CREATE TYPE "TipoCongedo" AS ENUM (
    'OBBLIGATORIO',
    'FACOLTATIVO',
    'STRAORDINARIO',
    'NON_RETRIBUITO',
    'STUDIO',
    'ALTRO'
);

-- StatoCartellino: Timesheet status
CREATE TYPE "StatoCartellino" AS ENUM (
    'BOZZA',
    'VALIDATO',
    'CHIUSO',
    'CONTESTATO'
);

-- =====================================================
-- MODIFY EXISTING TABLES
-- =====================================================

-- Add HR fields to PersonTenantProfile
ALTER TABLE "person_tenant_profiles" 
ADD COLUMN IF NOT EXISTS "tipoContratto" "TipoContratto",
ADD COLUMN IF NOT EXISTS "tipoCollaboratore" "TipoCollaboratore",
ADD COLUMN IF NOT EXISTS "oreSettimanali" DECIMAL(4,1);

-- Add selfCompanyProfileId to Tenant
ALTER TABLE "tenants" 
ADD COLUMN IF NOT EXISTS "selfCompanyProfileId" TEXT;

-- Create unique constraint
ALTER TABLE "tenants" 
ADD CONSTRAINT "tenants_selfCompanyProfileId_key" UNIQUE ("selfCompanyProfileId");

-- Add foreign key constraint
ALTER TABLE "tenants" 
ADD CONSTRAINT "tenants_selfCompanyProfileId_fkey" 
FOREIGN KEY ("selfCompanyProfileId") REFERENCES "company_tenant_profiles"("id") 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Add isSelfCompany flag to CompanyTenantProfile
ALTER TABLE "company_tenant_profiles"
ADD COLUMN IF NOT EXISTS "isSelfCompany" BOOLEAN DEFAULT false;

-- =====================================================
-- NEW TABLES
-- =====================================================

-- MansioneInterna: Internal job roles
CREATE TABLE "mansioni_interne" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT,
    "areaAziendale" "AreaAziendale" NOT NULL DEFAULT 'ALTRO',
    "livelloGerarchico" INTEGER NOT NULL DEFAULT 1,
    "requisitiMinimi" JSONB,
    "competenzeRichieste" JSONB,
    "responsabilita" JSONB,
    "oreMinimeSettimanali" DECIMAL(4,1),
    "oreMassimeSettimanali" DECIMAL(4,1),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "mansioni_interne_pkey" PRIMARY KEY ("id")
);

-- ProfiloHR: HR Profile for personnel
CREATE TABLE "profili_hr" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "personTenantProfileId" TEXT NOT NULL,
    "mansioneInternaId" TEXT,
    "supervisoreId" TEXT,
    "dataAssunzione" TIMESTAMP(3),
    "dataFineContratto" TIMESTAMP(3),
    "matricola" TEXT,
    "oreGiornaliereStandard" DECIMAL(4,2) NOT NULL DEFAULT 8.00,
    "oreSettimanaliContrattuali" DECIMAL(5,2) NOT NULL DEFAULT 40.00,
    "pausaPranzoMinuti" INTEGER NOT NULL DEFAULT 60,
    "flexibilityMinuti" INTEGER NOT NULL DEFAULT 15,
    "saldoFerie" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "saldoPermessi" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "saldoROL" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "configurazioneOrario" JSONB,
    "noteContrattuali" TEXT,
    "isTimbraturaPbligatoria" BOOLEAN NOT NULL DEFAULT false,
    "canAccessTimbratura" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "profili_hr_pkey" PRIMARY KEY ("id")
);

-- TurnoTemplate: Shift templates
CREATE TABLE "turni_template" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT,
    "tipoTurno" "TipoTurno" NOT NULL,
    "oraInizio" TEXT NOT NULL,
    "oraFine" TEXT NOT NULL,
    "pausaPranzoInizio" TEXT,
    "pausaPranzoFine" TEXT,
    "oreTotali" DECIMAL(4,2) NOT NULL,
    "colore" TEXT NOT NULL DEFAULT '#3B82F6',
    "giorniSettimana" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "turni_template_pkey" PRIMARY KEY ("id")
);

-- TurnoAssegnato: Assigned shifts
CREATE TABLE "turni_assegnati" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "profiloHRId" TEXT NOT NULL,
    "turnoTemplateId" TEXT,
    "data" DATE NOT NULL,
    "oraInizio" TEXT NOT NULL,
    "oraFine" TEXT NOT NULL,
    "pausaPranzoInizio" TEXT,
    "pausaPranzoFine" TEXT,
    "stato" "StatoTurno" NOT NULL DEFAULT 'PROGRAMMATO',
    "orePreviste" DECIMAL(4,2) NOT NULL,
    "oreEffettive" DECIMAL(4,2),
    "note" TEXT,
    "isSmartWorking" BOOLEAN NOT NULL DEFAULT false,
    "sedeId" TEXT,
    "assegnatoDa" TEXT,
    "confermatoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "turni_assegnati_pkey" PRIMARY KEY ("id")
);

-- DisponibilitaCalendario: Calendar availability
CREATE TABLE "disponibilita_calendario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "profiloHRId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "fasciaOraria" "FasciaOraria" NOT NULL,
    "preferenza" "PreferenzaDisponibilita" NOT NULL,
    "oraInizioCustom" TEXT,
    "oraFineCustom" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disponibilita_calendario_pkey" PRIMARY KEY ("id")
);

-- Timbratura: Clock in/out records
CREATE TABLE "timbrature" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "profiloHRId" TEXT NOT NULL,
    "turnoAssegnatoId" TEXT,
    "dataOra" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoTimbratura" NOT NULL,
    "origine" "OrigineTimbratura" NOT NULL DEFAULT 'APP_WEB',
    "deviceInfo" JSONB,
    "posizioneGPS" JSONB,
    "ipAddress" TEXT,
    "isValidata" BOOLEAN NOT NULL DEFAULT false,
    "validataDa" TEXT,
    "validataAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "timbrature_pkey" PRIMARY KEY ("id")
);

-- Assenza: Absence requests
CREATE TABLE "assenze" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "profiloHRId" TEXT NOT NULL,
    "tipo" "TipoAssenza" NOT NULL,
    "tipoCongedo" "TipoCongedo",
    "dataInizio" DATE NOT NULL,
    "dataFine" DATE NOT NULL,
    "isGiornataIntera" BOOLEAN NOT NULL DEFAULT true,
    "oraInizio" TEXT,
    "oraFine" TEXT,
    "giorniTotali" DECIMAL(5,2) NOT NULL,
    "oreTotali" DECIMAL(5,2),
    "stato" "StatoRichiestaHR" NOT NULL DEFAULT 'BOZZA',
    "motivazione" TEXT,
    "certificatoMedico" TEXT,
    "approvatoDa" TEXT,
    "approvatoAt" TIMESTAMP(3),
    "noteApprovatore" TEXT,
    "protocolloINPS" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "assenze_pkey" PRIMARY KEY ("id")
);

-- Cartellino: Monthly timesheet
CREATE TABLE "cartellini" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "profiloHRId" TEXT NOT NULL,
    "anno" INTEGER NOT NULL,
    "mese" INTEGER NOT NULL,
    "oreLavoratePreviste" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "oreLavorateEffettive" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "oreStraordinario" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "oreStraordinarioNotturno" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "oreStraordinarioFestivo" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "differenzaOre" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "giorniFerie" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "giorniPermesso" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "giorniMalattia" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "giorniAltreAssenze" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "giorniSmartWorking" INTEGER NOT NULL DEFAULT 0,
    "numeroRitardi" INTEGER NOT NULL DEFAULT 0,
    "minutiRitardoTotali" INTEGER NOT NULL DEFAULT 0,
    "numeroUsciteAnticipate" INTEGER NOT NULL DEFAULT 0,
    "timbratureMancanti" INTEGER NOT NULL DEFAULT 0,
    "percentualePresenza" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "percentualeRispettoTurni" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "stato" "StatoCartellino" NOT NULL DEFAULT 'BOZZA',
    "validatoDa" TEXT,
    "validatoAt" TIMESTAMP(3),
    "noteValidazione" TEXT,
    "dettaglioGiorni" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cartellini_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- INDEXES
-- =====================================================

-- MansioneInterna indexes
CREATE INDEX "mansioni_interne_tenantId_idx" ON "mansioni_interne"("tenantId");
CREATE INDEX "mansioni_interne_areaAziendale_idx" ON "mansioni_interne"("areaAziendale");

-- ProfiloHR indexes
CREATE UNIQUE INDEX "profili_hr_personTenantProfileId_key" ON "profili_hr"("personTenantProfileId");
CREATE INDEX "profili_hr_tenantId_idx" ON "profili_hr"("tenantId");
CREATE INDEX "profili_hr_mansioneInternaId_idx" ON "profili_hr"("mansioneInternaId");
CREATE INDEX "profili_hr_supervisoreId_idx" ON "profili_hr"("supervisoreId");

-- TurnoTemplate indexes
CREATE INDEX "turni_template_tenantId_idx" ON "turni_template"("tenantId");
CREATE INDEX "turni_template_tipoTurno_idx" ON "turni_template"("tipoTurno");

-- TurnoAssegnato indexes
CREATE INDEX "turni_assegnati_tenantId_idx" ON "turni_assegnati"("tenantId");
CREATE INDEX "turni_assegnati_profiloHRId_idx" ON "turni_assegnati"("profiloHRId");
CREATE INDEX "turni_assegnati_data_idx" ON "turni_assegnati"("data");
CREATE INDEX "turni_assegnati_stato_idx" ON "turni_assegnati"("stato");

-- DisponibilitaCalendario indexes
CREATE UNIQUE INDEX "disponibilita_calendario_profiloHRId_data_fasciaOraria_key" ON "disponibilita_calendario"("profiloHRId", "data", "fasciaOraria");
CREATE INDEX "disponibilita_calendario_tenantId_idx" ON "disponibilita_calendario"("tenantId");
CREATE INDEX "disponibilita_calendario_data_idx" ON "disponibilita_calendario"("data");

-- Timbratura indexes
CREATE INDEX "timbrature_tenantId_idx" ON "timbrature"("tenantId");
CREATE INDEX "timbrature_profiloHRId_idx" ON "timbrature"("profiloHRId");
CREATE INDEX "timbrature_dataOra_idx" ON "timbrature"("dataOra");
CREATE INDEX "timbrature_tipo_idx" ON "timbrature"("tipo");

-- Assenza indexes
CREATE INDEX "assenze_tenantId_idx" ON "assenze"("tenantId");
CREATE INDEX "assenze_profiloHRId_idx" ON "assenze"("profiloHRId");
CREATE INDEX "assenze_stato_idx" ON "assenze"("stato");
CREATE INDEX "assenze_dataInizio_dataFine_idx" ON "assenze"("dataInizio", "dataFine");

-- Cartellino indexes
CREATE UNIQUE INDEX "cartellini_profiloHRId_anno_mese_key" ON "cartellini"("profiloHRId", "anno", "mese");
CREATE INDEX "cartellini_tenantId_idx" ON "cartellini"("tenantId");
CREATE INDEX "cartellini_anno_mese_idx" ON "cartellini"("anno", "mese");
CREATE INDEX "cartellini_stato_idx" ON "cartellini"("stato");

-- =====================================================
-- FOREIGN KEYS
-- =====================================================

-- MansioneInterna foreign keys
ALTER TABLE "mansioni_interne" ADD CONSTRAINT "mansioni_interne_tenantId_fkey" 
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProfiloHR foreign keys
ALTER TABLE "profili_hr" ADD CONSTRAINT "profili_hr_tenantId_fkey" 
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "profili_hr" ADD CONSTRAINT "profili_hr_personTenantProfileId_fkey" 
FOREIGN KEY ("personTenantProfileId") REFERENCES "person_tenant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "profili_hr" ADD CONSTRAINT "profili_hr_mansioneInternaId_fkey" 
FOREIGN KEY ("mansioneInternaId") REFERENCES "mansioni_interne"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "profili_hr" ADD CONSTRAINT "profili_hr_supervisoreId_fkey" 
FOREIGN KEY ("supervisoreId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- TurnoTemplate foreign keys
ALTER TABLE "turni_template" ADD CONSTRAINT "turni_template_tenantId_fkey" 
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TurnoAssegnato foreign keys
ALTER TABLE "turni_assegnati" ADD CONSTRAINT "turni_assegnati_tenantId_fkey" 
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "turni_assegnati" ADD CONSTRAINT "turni_assegnati_profiloHRId_fkey" 
FOREIGN KEY ("profiloHRId") REFERENCES "profili_hr"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "turni_assegnati" ADD CONSTRAINT "turni_assegnati_turnoTemplateId_fkey" 
FOREIGN KEY ("turnoTemplateId") REFERENCES "turni_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "turni_assegnati" ADD CONSTRAINT "turni_assegnati_sedeId_fkey" 
FOREIGN KEY ("sedeId") REFERENCES "company_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DisponibilitaCalendario foreign keys
ALTER TABLE "disponibilita_calendario" ADD CONSTRAINT "disponibilita_calendario_tenantId_fkey" 
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "disponibilita_calendario" ADD CONSTRAINT "disponibilita_calendario_profiloHRId_fkey" 
FOREIGN KEY ("profiloHRId") REFERENCES "profili_hr"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Timbratura foreign keys
ALTER TABLE "timbrature" ADD CONSTRAINT "timbrature_tenantId_fkey" 
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "timbrature" ADD CONSTRAINT "timbrature_profiloHRId_fkey" 
FOREIGN KEY ("profiloHRId") REFERENCES "profili_hr"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "timbrature" ADD CONSTRAINT "timbrature_turnoAssegnatoId_fkey" 
FOREIGN KEY ("turnoAssegnatoId") REFERENCES "turni_assegnati"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Assenza foreign keys
ALTER TABLE "assenze" ADD CONSTRAINT "assenze_tenantId_fkey" 
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assenze" ADD CONSTRAINT "assenze_profiloHRId_fkey" 
FOREIGN KEY ("profiloHRId") REFERENCES "profili_hr"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cartellino foreign keys
ALTER TABLE "cartellini" ADD CONSTRAINT "cartellini_tenantId_fkey" 
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cartellini" ADD CONSTRAINT "cartellini_profiloHRId_fkey" 
FOREIGN KEY ("profiloHRId") REFERENCES "profili_hr"("id") ON DELETE CASCADE ON UPDATE CASCADE;
