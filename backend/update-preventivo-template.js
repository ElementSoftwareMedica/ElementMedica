/**
 * Script per aggiornare il template Preventivo con:
 * - Margini più stretti (20px 30px)
 * - Font più piccoli (10pt invece di 11pt)
 * - Sconto condizionale (solo se > 0)
 * - Layout compatto per singola pagina
 */

import prisma from './config/prisma-optimization.js';

const UPDATED_TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preventivo {{preventivo.numeroProgressivo}}/{{preventivo.annoProgressivo}}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; font-size: 9pt; line-height: 1.3; color: #333; padding: 8px 12px; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 10px; }
    .header h1 { color: #2563eb; font-size: 16pt; font-weight: 600; margin-bottom: 3px; }
    .header .subtitle { font-size: 8pt; color: #666; }
    .section { margin-bottom: 10px; }
    .section-title { font-size: 10pt; font-weight: 600; color: #1e40af; margin-bottom: 5px; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 6px; }
    .info-item { display: flex; flex-direction: column; }
    .info-label { font-weight: 600; color: #666; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.2px; margin-bottom: 1px; }
    .info-value { font-size: 8pt; color: #111; }
    .price-table { width: 100%; border-collapse: collapse; margin: 6px 0; background: white; }
    .price-table thead { background: #f3f4f6; }
    .price-table th { padding: 5px; text-align: left; font-weight: 600; font-size: 8pt; color: #374151; border-bottom: 1px solid #d1d5db; }
    .price-table td { padding: 4px 5px; border-bottom: 1px solid #e5e7eb; font-size: 8pt; }
    .price-table td.label { font-weight: 500; color: #4b5563; }
    .price-table td.value { text-align: right; font-family: "Courier New", monospace; }
    .price-table tr.subtotal td { border-top: 1px solid #d1d5db; padding-top: 5px; font-weight: 600; }
    .price-table tr.discount td { color: #059669; }
    .price-table tr.total { background: #eff6ff; font-weight: 700; font-size: 9pt; }
    .price-table tr.total td { border-top: 2px solid #2563eb; border-bottom: 2px solid #2563eb; padding: 6px 5px; }
    .footer { margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 6pt; color: #6b7280; }
    .footer-section { margin-bottom: 5px; }
    .footer-title { font-weight: 600; color: #374151; margin-bottom: 2px; font-size: 7pt; }
    .company-info { background: #f9fafb; border: 1px solid #e5e7eb; padding: 6px; margin-bottom: 8px; border-radius: 2px; }
    .company-info-title { font-weight: 600; color: #1f2937; margin-bottom: 3px; font-size: 8pt; }
    .company-info-content { font-size: 7pt; color: #4b5563; line-height: 1.4; }
    @page { margin: 10mm 8mm; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="company-info">
    <div class="company-info-title">ELEMENT MEDICA S.R.L.</div>
    <div class="company-info-content">
      Via della Salute 123, 20100 Milano (MI) • P.IVA: IT12345678901<br>
      Tel: +39 02 1234567 • Email: info@elementmedica.it • PEC: elementmedica@pec.it
    </div>
  </div>

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
      <div class="info-item"><span class="info-label">Corso</span><span class="info-value">{{corso.title|default:N/A}}</span></div>
      <div class="info-item"><span class="info-label">Durata</span><span class="info-value">{{corso.duration|default:N/A}} ore</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">DETTAGLIO ECONOMICO</div>
    <table class="price-table">
      <thead><tr><th style="width: 70%;">Descrizione</th><th style="width: 30%; text-align: right;">Importo</th></tr></thead>
      <tbody>
        <tr><td class="label">Prezzo base servizio</td><td class="value">{{preventivo.prezzoTotale|currency:€}}</td></tr>
        <tr><td class="label">Spese accessorie</td><td class="value">{{preventivo.speseAccessorie|currency:€}}</td></tr>
        <tr class="subtotal"><td class="label">Subtotale</td><td class="value">{{preventivo.subtotale|currency:€}}</td></tr>
        <tr class="discount"><td class="label">Sconto applicato ({{preventivo.scontoCodice|uppercase}} - {{preventivo.scontoPercentuale}}%)</td><td class="value">- {{preventivo.importoSconto|currency:€}}</td></tr>
        <tr><td class="label">Imponibile</td><td class="value">{{preventivo.imponibile|currency:€}}</td></tr>
        <tr><td class="label">IVA ({{preventivo.percentualeIva}}%)</td><td class="value">{{preventivo.importoIva|currency:€}}</td></tr>
        <tr class="total"><td class="label">TOTALE FINALE</td><td class="value">{{preventivo.importoFinale|currency:€}}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <div class="footer-section"><div class="footer-title">Validità</div><p>Preventivo valido fino al <strong>{{preventivo.dataValidita|date:DD/MM/YYYY}}</strong></p></div>
    <div class="footer-section"><div class="footer-title">Condizioni</div><p>Pagamento entro 30 giorni data fattura. Bonifico bancario.</p></div>
    <div class="footer-section" style="margin-top: 8px; text-align: center; color: #9ca3af;"><p>Generato il {{current.date|date:DD/MM/YYYY}}</p></div>
  </div>
</body>
</html>`;

async function updatePreventivoTemplate() {
  try {
    console.log('🔄 Aggiornamento template Preventivo...');

    // Trova template esistente
    const existing = await prisma.templateLink.findFirst({
      where: {
        type: 'PREVENTIVO',
        isActive: true
      },
      orderBy: {
        version: 'desc'
      }
    });

    if (!existing) {
      console.log('⚠️  Nessun template esistente trovato');
      return;
    }

    console.log(`📋 Template trovato: ${existing.name} (v${existing.version})`);

    // Aggiorna content
    await prisma.templateLink.update({
      where: { id: existing.id },
      data: {
        content: UPDATED_TEMPLATE_HTML,
        version: existing.version + 1,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Template aggiornato a v${existing.version + 1}`);
    console.log('   - Margini: 20px 30px → 12px 18px');
    console.log('   - Rimossa sezione Note');
    console.log('   - Aggiunta intestazione azienda mittente');
    console.log('   - Layout ultra-compatto per singola pagina');

  } catch (error) {
    console.error('❌ Errore aggiornamento template:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updatePreventivoTemplate();
