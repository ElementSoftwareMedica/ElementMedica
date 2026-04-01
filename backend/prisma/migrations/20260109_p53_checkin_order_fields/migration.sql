-- P53.1: Aggiungi campi per riordinamento arrivi (orderByArrival)
-- Questi campi permettono di riordinare la coda in base all'ordine di arrivo reale
-- anziché all'orario di appuntamento

-- Aggiungi campi per check-in order
ALTER TABLE "numeri_chiamata" ADD COLUMN IF NOT EXISTS "checkInOrder" INTEGER;
ALTER TABLE "numeri_chiamata" ADD COLUMN IF NOT EXISTS "checkInAt" TIMESTAMP(3);
ALTER TABLE "numeri_chiamata" ADD COLUMN IF NOT EXISTS "originalAppointmentOrder" INTEGER;

-- Aggiungi indici per query di riordinamento
CREATE INDEX IF NOT EXISTS "numeri_chiamata_sessionId_checkInOrder_idx" ON "numeri_chiamata"("sessionId", "checkInOrder");
CREATE INDEX IF NOT EXISTS "numeri_chiamata_sessionId_checkInAt_idx" ON "numeri_chiamata"("sessionId", "checkInAt");
