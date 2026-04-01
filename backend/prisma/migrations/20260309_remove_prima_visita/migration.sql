-- ============================================================
-- Migration: remove PRIMA_VISITA from TipoVisitaMDL and
--            CategoriaVisitaMDL enum types
-- PRIMA_VISITA is semantically identical to PREVENTIVA
-- (Art. 41 c.2a D.Lgs 81/08 – visita preventiva pre-assunzione)
-- All existing data is migrated to PREVENTIVA first.
-- ============================================================

-- ============================================================
-- STEP 1: Data migration – replace PRIMA_VISITA with PREVENTIVA
-- ============================================================

-- appuntamenti.tipoVisitaMDL
UPDATE appuntamenti
SET "tipoVisitaMDL" = 'PREVENTIVA'::tipo_visita_mdl
WHERE "tipoVisitaMDL" = 'PRIMA_VISITA'::tipo_visita_mdl;

-- visite.tipoVisitaMDL
UPDATE visite
SET "tipoVisitaMDL" = 'PREVENTIVA'::tipo_visita_mdl
WHERE "tipoVisitaMDL" = 'PRIMA_VISITA'::tipo_visita_mdl;

-- questionari_medici_config.tipiVisitaMDL (array column)
-- Replace 'PRIMA_VISITA' with 'PREVENTIVA' inside the arrays
UPDATE questionari_medici_config
SET "tipiVisitaMDL" = array_replace(
    "tipiVisitaMDL",
    'PRIMA_VISITA'::tipo_visita_mdl,
    'PREVENTIVA'::tipo_visita_mdl
)
WHERE 'PRIMA_VISITA'::tipo_visita_mdl = ANY("tipiVisitaMDL");

-- voci_tariffario.categoriaVisita (CategoriaVisitaMDL enum)
UPDATE voci_tariffario
SET "categoriaVisita" = 'PREVENTIVA'::"CategoriaVisitaMDL"
WHERE "categoriaVisita" = 'PRIMA_VISITA'::"CategoriaVisitaMDL";

-- ============================================================
-- STEP 2: Recreate tipo_visita_mdl without PRIMA_VISITA
-- ============================================================

-- Create new enum type without PRIMA_VISITA
CREATE TYPE tipo_visita_mdl_new AS ENUM (
    'PREVENTIVA',
    'PREVENTIVA_PREASSUNTIVA',
    'PERIODICA',
    'CAMBIO_MANSIONE',
    'CESSAZIONE_RAPPORTO',
    'PRECEDENTE_ASSENZA',
    'SU_RICHIESTA_LAVORATORE',
    'STRAORDINARIA',
    'VERIFICA_IDONEITA',
    'RIENTRO_MATERNITA'
);

-- Migrate appuntamenti column
ALTER TABLE appuntamenti
    ALTER COLUMN "tipoVisitaMDL" TYPE tipo_visita_mdl_new
    USING "tipoVisitaMDL"::text::tipo_visita_mdl_new;

-- Migrate visite column
ALTER TABLE visite
    ALTER COLUMN "tipoVisitaMDL" TYPE tipo_visita_mdl_new
    USING "tipoVisitaMDL"::text::tipo_visita_mdl_new;

-- Migrate array column in questionari_medici_config
ALTER TABLE questionari_medici_config
    ALTER COLUMN "tipiVisitaMDL" TYPE tipo_visita_mdl_new[]
    USING "tipiVisitaMDL"::text[]::tipo_visita_mdl_new[];

-- Drop old type and rename new
DROP TYPE tipo_visita_mdl;
ALTER TYPE tipo_visita_mdl_new RENAME TO tipo_visita_mdl;

-- ============================================================
-- STEP 3: Recreate CategoriaVisitaMDL without PRIMA_VISITA
-- ============================================================

-- Create new enum type without PRIMA_VISITA
CREATE TYPE "CategoriaVisitaMDL_new" AS ENUM (
    'PREVENTIVA',
    'PREVENTIVA_PREASSUNTIVA',
    'PERIODICA',
    'CAMBIO_MANSIONE',
    'CESSAZIONE_RAPPORTO',
    'PRECEDENTE_ASSENZA',
    'SU_RICHIESTA_LAVORATORE',
    'STRAORDINARIA',
    'VERIFICA_IDONEITA',
    'RIENTRO_MATERNITA'
);

-- Migrate voci_tariffario column
ALTER TABLE voci_tariffario
    ALTER COLUMN "categoriaVisita" TYPE "CategoriaVisitaMDL_new"
    USING "categoriaVisita"::text::"CategoriaVisitaMDL_new";

-- Drop old type and rename new
DROP TYPE "CategoriaVisitaMDL";
ALTER TYPE "CategoriaVisitaMDL_new" RENAME TO "CategoriaVisitaMDL";
