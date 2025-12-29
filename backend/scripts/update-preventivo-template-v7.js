#!/usr/bin/env node
/**
 * Script per aggiornare il template Preventivo V7 - ULTRA COMPACT 1 PAGE
 * Eseguire con: node backend/scripts/update-preventivo-template-v7.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PREVENTIVO_TEMPLATE_V7 = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Preventivo {{preventivo.numeroProgressivo}}/{{preventivo.annoProgressivo}}</title>
  <style>
    /* v7 ULTRA COMPACT - 1 PAGE */
    @page { size: A4; margin: 5mm 8mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 7pt; line-height: 1.2; color: #1a1a1a; }
    
    /* Header blu con dati azienda */
    .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 11pt; font-weight: 700; }
    .header-info { font-size: 6pt; text-align: right; opacity: 0.95; }
    .header-info span { display: block; }
    
    /* Titolo documento + stato */
    .doc-title { background: #f8fafc; border-left: 3px solid #2563eb; padding: 4px 10px; display: flex; justify-content: space-between; align-items: center; }
    .doc-title h2 { color: #1e40af; font-size: 9pt; font-weight: 600; }
    .doc-title .meta { font-size: 6pt; color: #64748b; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 6pt; font-weight: 600; text-transform: uppercase; background: #dbeafe; color: #1e40af; }
    
    /* Layout 2 colonne: cliente + servizio */
    .two-col { display: flex; gap: 8px; margin: 4px 0; }
    .col { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 3px; padding: 5px 8px; }
    .col-title { font-size: 6pt; font-weight: 700; color: #2563eb; text-transform: uppercase; margin-bottom: 3px; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px; }
    .row { display: flex; margin-bottom: 1px; }
    .row .label { font-size: 6pt; color: #64748b; width: 70px; flex-shrink: 0; }
    .row .value { font-size: 7pt; color: #0f172a; font-weight: 500; }
    
    /* Tabella prezzi compatta */
    table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 7pt; }
    thead { background: #2563eb; color: white; }
    th { padding: 4px 6px; text-align: left; font-size: 6pt; text-transform: uppercase; font-weight: 600; }
    th:nth-child(2) { text-align: center; width: 50px; }
    th:nth-child(3), th:last-child { text-align: right; width: 70px; }
    td { padding: 4px 6px; border-bottom: 1px solid #f1f5f9; }
    tr:last-child td { border-bottom: none; }
    .qty { text-align: center; }
    .price { text-align: right; font-family: monospace; }
    
    /* Riga sconto verde */
    tr.discount { background: #f0fdf4; }
    tr.discount td { color: #059669; font-weight: 600; }
    
    /* Totali */
    .totals { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 3px; padding: 5px 8px; margin: 4px 0; }
    .totals-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 7pt; }
    .totals-row.final { border-top: 1px solid #2563eb; padding-top: 4px; margin-top: 3px; }
    .totals-row.final .label { font-weight: 700; color: #1e40af; font-size: 8pt; }
    .totals-row.final .value { font-weight: 700; color: #2563eb; font-size: 9pt; }
    
    /* Note */
    .notes { background: #fffbeb; border-left: 2px solid #f59e0b; padding: 4px 8px; margin: 4px 0; font-size: 6pt; color: #78350f; }
    .notes-title { font-weight: 600; color: #b45309; margin-bottom: 2px; }
    
    /* Footer */
    .footer { margin-top: 6px; padding: 4px 8px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 5.5pt; color: #64748b; }
    .footer p { margin-bottom: 1px; }
  </style>
</head>
<body>
  <!-- Header Azienda -->
  <div class="header">
    <h1>Element Medica Training S.r.l.</h1>
    <div class="header-info">
      <span>Via Example 123, 20100 Milano (MI)</span>
      <span>📧 info@elementmedica.it | 📞 +39 02 1234567</span>
      <span>P.IVA: 12345678901</span>
    </div>
  </div>
  
  <!-- Titolo Documento -->
  <div class="doc-title">
    <div>
      <h2>PREVENTIVO N° {{preventivo.numeroProgressivo}}/{{preventivo.annoProgressivo}}</h2>
      <span class="meta">Emesso: {{preventivo.dataEmissione}} | Valido fino: {{preventivo.dataScadenza}}</span>
    </div>
    <span class="badge">{{preventivo.stato}}</span>
  </div>
  
  <!-- 2 Colonne: Cliente + Servizio -->
  <div class="two-col">
    <div class="col">
      <div class="col-title">Cliente</div>
      <div class="row"><span class="label">Ragione Sociale:</span><span class="value">{{cliente.ragioneSociale}}</span></div>
      <div class="row"><span class="label">Indirizzo:</span><span class="value">{{cliente.indirizzo}}, {{cliente.cap}} {{cliente.citta}} ({{cliente.provincia}})</span></div>
      <div class="row"><span class="label">P.IVA/CF:</span><span class="value">{{cliente.partitaIva}}</span></div>
      <div class="row"><span class="label">Email:</span><span class="value">{{cliente.email}}</span></div>
    </div>
    <div class="col">
      <div class="col-title">Servizio</div>
      <div class="row"><span class="label">Tipo:</span><span class="value">{{preventivo.tipoServizio}}</span></div>
      <div class="row"><span class="label">Titolo:</span><span class="value">{{preventivo.titoloServizio}}</span></div>
      {{#if corso}}
      <div class="row"><span class="label">Corso:</span><span class="value">{{corso.titolo}}</span></div>
      <div class="row"><span class="label">Durata:</span><span class="value">{{corso.durata}} ore</span></div>
      {{/if}}
      {{#if preventivo.partecipanti}}
      <div class="row"><span class="label">Partecipanti:</span><span class="value">{{preventivo.partecipanti}}</span></div>
      {{/if}}
    </div>
  </div>
  
  <!-- Tabella Voci -->
  <table>
    <thead>
      <tr>
        <th>Descrizione</th>
        <th>Qtà</th>
        <th>Prezzo Unit.</th>
        <th>Subtotale</th>
      </tr>
    </thead>
    <tbody>
      {{#each voci}}
      <tr>
        <td>{{this.descrizione}}</td>
        <td class="qty">{{this.quantita}}</td>
        <td class="price">€ {{this.prezzoUnitario}}</td>
        <td class="price">€ {{this.subtotale}}</td>
      </tr>
      {{/each}}
      {{#if preventivo.scontoApplicato}}
      <tr class="discount">
        <td colspan="3">Sconto applicato: {{preventivo.codiceSconto}}</td>
        <td class="price">- € {{preventivo.importoSconto}}</td>
      </tr>
      {{/if}}
    </tbody>
  </table>
  
  <!-- Totali -->
  <div class="totals">
    <div class="totals-row">
      <span class="label">Imponibile:</span>
      <span class="value">€ {{preventivo.imponibile}}</span>
    </div>
    <div class="totals-row">
      <span class="label">IVA ({{preventivo.aliquotaIva}}%):</span>
      <span class="value">€ {{preventivo.importoIva}}</span>
    </div>
    <div class="totals-row final">
      <span class="label">TOTALE:</span>
      <span class="value">€ {{preventivo.importoFinale}}</span>
    </div>
  </div>
  
  {{#if preventivo.note}}
  <!-- Note -->
  <div class="notes">
    <div class="notes-title">NOTE</div>
    {{preventivo.note}}
  </div>
  {{/if}}
  
  <!-- Footer -->
  <div class="footer">
    <p><strong>Condizioni:</strong> Pagamento a 30gg data fattura. Preventivo valido 30 giorni dalla data di emissione.</p>
    <p><strong>Dati bancari:</strong> IBAN IT00 X000 0000 0000 0000 0000 000 - BIC: XXXITXX</p>
  </div>
</body>
</html>`;

async function updateTemplate() {
    console.log('🔄 Updating PREVENTIVO template to V7 (ULTRA COMPACT 1 PAGE)...\n');

    try {
        // Find all PREVENTIVO templates
        const templates = await prisma.templateLink.findMany({
            where: { type: 'PREVENTIVO' }
        });

        console.log(`Found ${templates.length} PREVENTIVO templates`);

        for (const template of templates) {
            console.log(`\nUpdating template: ${template.name} (${template.id})`);

            await prisma.templateLink.update({
                where: { id: template.id },
                data: {
                    content: PREVENTIVO_TEMPLATE_V7,
                    version: template.version + 1,
                    updatedAt: new Date()
                }
            });

            console.log(`✅ Updated to version ${template.version + 1}`);
        }

        console.log('\n✅ All PREVENTIVO templates updated to V7 (ULTRA COMPACT 1 PAGE)');

    } catch (error) {
        console.error('❌ Error updating templates:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

updateTemplate();
