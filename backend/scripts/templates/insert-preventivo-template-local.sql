-- Script SQL per inserire template HTML Preventivo in TemplateLink
-- Database: PostgreSQL locale o Supabase
-- Tabella: TemplateLink (non DocumentTemplate)
--
-- SOSTITUZIONE TENANT_ID:
--   Local: 21ec594c-efc3-4300-bfa8-b43307a80c9b
--   Prod: Verificare con: SELECT id, name FROM tenants LIMIT 3;
--
-- ESECUZIONE:
--   psql postgresql://postgres:postgres@localhost:5432/dev_db -f insert-preventivo-template-local.sql

-- Template HTML Preventivo professionale
-- Markers: preventivo.*, azienda.*, corso.*, current.*

INSERT INTO "TemplateLink" (
  id,
  "tenantId",
  name,
  url,
  content,
  header,
  footer,
  type,
  "fileFormat",
  category,
  description,
  version,
  "isActive",
  "isDefault",
  "syncEnabled",
  markers,
  tags,
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  '21ec594c-efc3-4300-bfa8-b43307a80c9b', -- ⚠️ SOSTITUIRE con tenant ID reale
  'Preventivo Standard',
  '', -- URL non necessario per template HTML inline
  '<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preventivo {{preventivo.numeroProgressivo}}/{{preventivo.annoProgressivo}}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #333; padding: 20px 30px; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 18px; }
    .header h1 { color: #2563eb; font-size: 20pt; font-weight: 600; margin-bottom: 6px; }
    .header .subtitle { font-size: 9pt; color: #666; }
    .section { margin-bottom: 15px; }
    .section-title { font-size: 11pt; font-weight: 600; color: #1e40af; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 10px; }
    .info-item { display: flex; flex-direction: column; }
    .info-label { font-weight: 600; color: #666; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; }
    .info-value { font-size: 9pt; color: #111; }
    .price-table { width: 100%; border-collapse: collapse; margin: 10px 0; background: white; }
    .price-table thead { background: #f3f4f6; }
    .price-table th { padding: 8px; text-align: left; font-weight: 600; font-size: 9pt; color: #374151; border-bottom: 1px solid #d1d5db; }
    .price-table td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 9pt; }
    .price-table td.label { font-weight: 500; color: #4b5563; }
    .price-table td.value { text-align: right; font-family: "Courier New", monospace; }
    .price-table tr.subtotal td { border-top: 1px solid #d1d5db; padding-top: 8px; font-weight: 600; }
    .price-table tr.discount td { color: #059669; display: none; } /* Hidden by default */
    .price-table tr.discount.show td { display: table-cell; } /* Show only if has class 'show' */
    .price-table tr.total { background: #eff6ff; font-weight: 700; font-size: 11pt; }
    .price-table tr.total td { border-top: 2px solid #2563eb; border-bottom: 2px solid #2563eb; padding: 10px 8px; }
    .notes-box { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 10px; margin: 12px 0; border-radius: 3px; }
    .notes-title { font-weight: 600; color: #92400e; margin-bottom: 5px; font-size: 9pt; }
    .notes-content { color: #78350f; font-size: 8pt; line-height: 1.4; white-space: pre-wrap; }
    .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 7pt; color: #6b7280; }
    .footer-section { margin-bottom: 8px; }
    .footer-title { font-weight: 600; color: #374151; margin-bottom: 3px; font-size: 8pt; }
    @media print { body { padding: 15px 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>PREVENTIVO N. {{preventivo.numeroProgressivo}}/{{preventivo.annoProgressivo}}</h1>
    <div class="subtitle">Data emissione: {{preventivo.dataCreazione|date:DD/MM/YYYY}} • Valido fino al: {{preventivo.dataValidita|date:DD/MM/YYYY}}</div>
  </div>

  <div class="section">
    <div class="section-title">DATI CLIENTE</div>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Ragione Sociale</span><span class="info-value">{{azienda.name|uppercase}}</span></div>
      <div class="info-item"><span class="info-label">Partita IVA</span><span class="info-value">{{azienda.vatNumber}}</span></div>
      <div class="info-item"><span class="info-label">Indirizzo</span><span class="info-value">{{azienda.address.full}}</span></div>
      <div class="info-item"><span class="info-label">Rappresentante Legale</span><span class="info-value">{{azienda.legalRepresentative|capitalizeWords}}</span></div>
      <div class="info-item"><span class="info-label">Email</span><span class="info-value">{{azienda.email}}</span></div>
      <div class="info-item"><span class="info-label">Telefono</span><span class="info-value">{{azienda.phone|phone}}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">DETTAGLI SERVIZIO</div>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Tipo Servizio</span><span class="info-value">{{preventivo.tipoServizio}}</span></div>
      <div class="info-item"><span class="info-label">Numero Partecipanti</span><span class="info-value">{{preventivo.numPartecipanti}} persone</span></div>
    </div>
    <div class="info-grid" style="margin-top: 15px;">
      <div class="info-item"><span class="info-label">Corso</span><span class="info-value">{{corso.title|default:N/A}}</span></div>
      <div class="info-item"><span class="info-label">Codice Corso</span><span class="info-value">{{corso.code|default:N/A}}</span></div>
      <div class="info-item"><span class="info-label">Durata</span><span class="info-value">{{corso.duration|default:N/A}} ore</span></div>
      <div class="info-item"><span class="info-label">Categoria</span><span class="info-value">{{corso.category|default:N/A}}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">DETTAGLIO ECONOMICO</div>
    <table class="price-table">
      <thead><tr><th style="width: 70%;">Descrizione</th><th style="width: 30%; text-align: right;">Importo</th></tr></thead>
      <tbody>
        <tr><td class="label">Prezzo base servizio</td><td class="value">{{preventivo.prezzoTotale|currency:€}}</td></tr>
        <tr><td class="label">Spese accessorie</td><td class="value">{{preventivo.speseAccessorie|currency:€}}</td></tr>
        {{#if preventivo.scontoApplicato}}
        <tr class="subtotal"><td class="label">Subtotale</td><td class="value">{{preventivo.subtotale|currency:€}}</td></tr>
        <tr class="discount show"><td class="label">Sconto applicato ({{preventivo.scontoCodice|uppercase}} - {{preventivo.scontoPercentuale}}%)</td><td class="value">- {{preventivo.importoSconto|currency:€}}</td></tr>
        {{/if}}
        <tr><td class="label">Imponibile</td><td class="value">{{preventivo.imponibile|currency:€}}</td></tr>
        <tr><td class="label">IVA ({{preventivo.percentualeIva}}%)</td><td class="value">{{preventivo.importoIva|currency:€}}</td></tr>
        <tr class="total"><td class="label">TOTALE FINALE</td><td class="value">{{preventivo.importoFinale|currency:€}}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="notes-box">
      <div class="notes-title">📋 Note</div>
      <div class="notes-content">{{preventivo.note|default:Nessuna nota aggiuntiva.}}</div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-section"><div class="footer-title">Validità Preventivo</div><p>Il presente preventivo è valido fino al <strong>{{preventivo.dataValidita|date:DD/MM/YYYY}}</strong>. Dopo tale data, i prezzi e le condizioni potranno subire variazioni.</p></div>
    <div class="footer-section"><div class="footer-title">Accettazione</div><p>Per accettare il preventivo, utilizzare il seguente link:<br><strong>{{preventivo.linkAccettazione|default:Contattare il nostro ufficio commerciale}}</strong></p></div>
    <div class="footer-section"><div class="footer-title">Condizioni di Pagamento</div><p>Pagamento entro 30 giorni data fattura. Bonifico bancario con indicazione numero fattura.</p></div>
    <div class="footer-section" style="margin-top: 20px; text-align: center; color: #9ca3af;"><p>Preventivo generato elettronicamente il {{current.date|date:DD/MM/YYYY}}</p></div>
  </div>
</body>
</html>',
  NULL, -- header (già integrato in content)
  NULL, -- footer (già integrato in content)
  'PREVENTIVO', -- ⚠️ type enum (non category)
  'HTML', -- ⚠️ format enum
  'PREVENTIVO', -- category per ricerca/filtro
  'Template HTML standard per generazione preventivi aziendali con 33 marker personalizzati',
  1, -- version
  true, -- isActive
  false, -- isDefault
  false, -- syncEnabled (non sincronizza con Google)
  '{"markers": ["preventivo.*", "azienda.*", "corso.*", "current.*"], "count": 33, "categories": ["preventivo", "azienda", "corso", "current"]}'::jsonb,
  ARRAY['preventivo', 'quotazione', 'offerta', 'pricing'], -- tags per ricerca
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verifica inserimento
SELECT 
  id, 
  name, 
  category, 
  version, 
  "isActive",
  LENGTH(content) as content_length,
  "createdAt"
FROM "TemplateLink"
WHERE category = 'PREVENTIVO'
ORDER BY "createdAt" DESC
LIMIT 1;
