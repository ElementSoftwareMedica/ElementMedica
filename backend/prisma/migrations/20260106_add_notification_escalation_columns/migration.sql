-- Add escalation columns to notifications table
-- Project 47 - Advanced Notification System

-- Add escalation level column
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "currentEscalationLevel" INTEGER DEFAULT 0 NOT NULL;

-- Add last escalated timestamp column
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "lastEscalatedAt" TIMESTAMP(3);

-- Create index for escalation queries
CREATE INDEX IF NOT EXISTS "notifications_currentEscalationLevel_idx" ON "notifications"("currentEscalationLevel");
CREATE INDEX IF NOT EXISTS "notifications_lastEscalatedAt_idx" ON "notifications"("lastEscalatedAt");
