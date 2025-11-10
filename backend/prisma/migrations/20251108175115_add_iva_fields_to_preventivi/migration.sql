/*
  Warnings:

  - Added the required column `imponibile` to the `preventivi` table without a default value. This is not possible if the table is not empty.
  - Added the required column `importoIva` to the `preventivi` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Aggiungi le colonne come nullable inizialmente
ALTER TABLE "preventivi" 
  ADD COLUMN "aliquotaIva" DECIMAL(5,2) DEFAULT 22.00,
  ADD COLUMN "imponibile" DECIMAL(10,2),
  ADD COLUMN "importoIva" DECIMAL(10,2);

-- Step 2: Popola i campi per i preventivi esistenti
-- imponibile = prezzoTotale - scontoTotale (già calcolato come importoFinale attuale)
-- importoIva = imponibile × (aliquotaIva / 100)
-- importoFinale = imponibile + importoIva
UPDATE "preventivi" 
SET 
  "imponibile" = "prezzoTotale" - "scontoTotale",
  "importoIva" = ROUND(("prezzoTotale" - "scontoTotale") * ("aliquotaIva" / 100), 2),
  "importoFinale" = ROUND(("prezzoTotale" - "scontoTotale") * (1 + ("aliquotaIva" / 100)), 2)
WHERE "imponibile" IS NULL;

-- Step 3: Rendi i campi NOT NULL
ALTER TABLE "preventivi"
  ALTER COLUMN "aliquotaIva" SET NOT NULL,
  ALTER COLUMN "imponibile" SET NOT NULL,
  ALTER COLUMN "importoIva" SET NOT NULL;
