-- AddColumn
ALTER TABLE "persons" ADD COLUMN IF NOT EXISTS "pushSubscription" JSONB;
COMMENT ON COLUMN "persons"."pushSubscription" IS 'Web Push subscription: { endpoint, keys: { auth, p256dh } }';
