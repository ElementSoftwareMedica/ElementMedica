-- P71: Invio Referto Mail + Secure Delivery Idoneita
-- Adds:
--   Visita.invio_referto_mail            (toggle send referto to patient on completion)
--   GiudizioIdoneita.invio_sicuro_paziente_at (timestamp secure ZIP sent to worker)
--   GiudizioIdoneita.invio_sicuro_azienda_at  (timestamp secure ZIP sent to company)

-- =====================
-- Visita: invio_referto_mail
-- =====================
ALTER TABLE "visite"
  ADD COLUMN IF NOT EXISTS "invio_referto_mail" BOOLEAN NOT NULL DEFAULT FALSE;

-- =====================
-- GiudizioIdoneita: audit timestamps for secure delivery (ZIP + password via WhatsApp)
-- =====================
ALTER TABLE "giudizi_idoneita"
  ADD COLUMN IF NOT EXISTS "invio_sicuro_paziente_at" TIMESTAMP(3);

ALTER TABLE "giudizi_idoneita"
  ADD COLUMN IF NOT EXISTS "invio_sicuro_azienda_at" TIMESTAMP(3);

-- Index for cron job: find giudizi where secure delivery is pending
CREATE INDEX IF NOT EXISTS "giudizi_idoneita_invio_sicuro_paziente_idx"
  ON "giudizi_idoneita"("invio_sicuro_paziente_at");
