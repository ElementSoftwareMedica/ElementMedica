-- P68: Change DisponibilitaCalendario unique constraint to include fasciaPreferita
-- This enables per-shift (MATTINA/POMERIGGIO) availability tracking per day

-- Step 1: Update existing NULL fasciaPreferita to GIORNATA_INTERA
UPDATE "disponibilita_calendario" SET "fasciaPreferita" = 'GIORNATA_INTERA' WHERE "fasciaPreferita" IS NULL;

-- Step 2: Make fasciaPreferita NOT NULL with default
ALTER TABLE "disponibilita_calendario" ALTER COLUMN "fasciaPreferita" SET NOT NULL;
ALTER TABLE "disponibilita_calendario" ALTER COLUMN "fasciaPreferita" SET DEFAULT 'GIORNATA_INTERA';

-- Step 3: Drop old unique constraint
DROP INDEX IF EXISTS "disponibilita_calendario_profiloHRId_data_key";

-- Step 4: Create new unique constraint including fasciaPreferita
CREATE UNIQUE INDEX "disponibilita_calendario_profiloHRId_data_fasciaPreferita_key" ON "disponibilita_calendario"("profiloHRId", "data", "fasciaPreferita");
