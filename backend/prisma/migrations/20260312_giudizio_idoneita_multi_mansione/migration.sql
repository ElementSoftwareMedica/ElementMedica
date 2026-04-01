-- GiudizioIdoneita: da singola mansione a multi-mansione (M2M)
-- Supporta D.Lgs 81/08 Art. 41: un giudizio copre tutte le mansioni del lavoratore

-- 1. Crea la junction table
CREATE TABLE "giudizio_idoneita_mansioni" (
    "id" TEXT NOT NULL,
    "giudizioId" TEXT NOT NULL,
    "mansioneId" TEXT NOT NULL,
    CONSTRAINT "giudizio_idoneita_mansioni_pkey" PRIMARY KEY ("id")
);

-- 2. Indici
CREATE INDEX "giudizio_idoneita_mansioni_giudizioId_idx" ON "giudizio_idoneita_mansioni"("giudizioId");
CREATE INDEX "giudizio_idoneita_mansioni_mansioneId_idx" ON "giudizio_idoneita_mansioni"("mansioneId");
CREATE UNIQUE INDEX "giudizio_idoneita_mansioni_giudizioId_mansioneId_key" ON "giudizio_idoneita_mansioni"("giudizioId", "mansioneId");

-- 3. Foreign keys
ALTER TABLE "giudizio_idoneita_mansioni" ADD CONSTRAINT "giudizio_idoneita_mansioni_giudizioId_fkey" FOREIGN KEY ("giudizioId") REFERENCES "giudizi_idoneita"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "giudizio_idoneita_mansioni" ADD CONSTRAINT "giudizio_idoneita_mansioni_mansioneId_fkey" FOREIGN KEY ("mansioneId") REFERENCES "mansioni"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Migra dati esistenti: copia mansioneId nella junction table
INSERT INTO "giudizio_idoneita_mansioni" ("id", "giudizioId", "mansioneId")
SELECT gen_random_uuid(), "id", "mansioneId"
FROM "giudizi_idoneita"
WHERE "mansioneId" IS NOT NULL;

-- 5. Rimuovi FK e colonna legacy
ALTER TABLE "giudizi_idoneita" DROP CONSTRAINT IF EXISTS "giudizi_idoneita_mansioneId_fkey";
ALTER TABLE "giudizi_idoneita" DROP COLUMN "mansioneId";
