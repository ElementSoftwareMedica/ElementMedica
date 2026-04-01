-- P72_02: Rename GiudizioIdoneita.prescrizioni → prescrizioniIdoneita
-- This rename disambiguates the field from Visita.prescrizioni (farmacologiche)
ALTER TABLE "giudizi_idoneita" RENAME COLUMN "prescrizioni" TO "prescrizioni_idoneita";
