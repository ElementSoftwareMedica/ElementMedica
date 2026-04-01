-- P72: Consolidamento Schema Clinico
-- Rimozione campo dead code dalla tabella `visite`.
-- Il campo era sempre NULL in produzione; il sistema usa già `visit_template_id` (FK su VisitTemplate).
-- NOTA: la colonna è stored come "templateUsato" (camelCase) in DB — era stata creata prima dell'adozione
-- della convenzione snake_case di Prisma.

ALTER TABLE "visite" DROP COLUMN IF EXISTS "templateUsato";
