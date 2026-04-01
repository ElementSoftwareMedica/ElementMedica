-- P72_19: Add documentoTemplateId to ListinoPrezzo for questionario-specific medico compensation
ALTER TABLE "ListinoPrezzo" ADD COLUMN IF NOT EXISTS "documentoTemplateId" TEXT;
ALTER TABLE "ListinoPrezzo" ADD CONSTRAINT "ListinoPrezzo_documentoTemplateId_fkey" 
    FOREIGN KEY ("documentoTemplateId") REFERENCES "documenti_template"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "ListinoPrezzo_documentoTemplateId_idx" ON "ListinoPrezzo"("documentoTemplateId");
