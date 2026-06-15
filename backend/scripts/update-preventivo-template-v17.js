/**
 * Update Preventivo template to V17
 * Redesign: professional navy/blue palette, corrected totals alignment
 * Run: node backend/scripts/update-preventivo-template-v17.js
 */

import prisma from '../config/prisma-optimization.js';

const templateV17 = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Preventivo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #1e293b; padding: 40px; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 18px; border-bottom: 2px solid #1d4ed8; }
    .logo-section { flex: 0 0 200px; }
    .logo-section img { max-width: 180px; max-height: 80px; object-fit: contain; }
    .org-info { text-align: right; flex: 1; }
    .org-name { font-size: 16pt; font-weight: 700; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.3px; }
    .org-details { font-size: 9pt; color: #64748b; line-height: 1.6; }

    /* Title */
    .document-title { text-align: center; font-size: 13pt; font-weight: 700; color: #1d4ed8; margin: 20px 0; padding: 10px 20px; background: #eff6ff; border-radius: 6px; border-left: 4px solid #1d4ed8; letter-spacing: 0.5px; }

    /* Sections */
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .section-title { font-size: 10.5pt; font-weight: 700; color: #0f172a; border-bottom: 2px solid #1d4ed8; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.4px; font-size: 8.5pt; }
    .content-box { background: #f8fafc; padding: 12px 14px; border-radius: 6px; border: 1px solid #e2e8f0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .info-row { display: flex; margin-bottom: 5px; }
    .info-label { font-weight: 600; width: 140px; color: #475569; font-size: 9pt; }
    .info-value { flex: 1; font-size: 9pt; color: #1e293b; }
    .label { color: #475569; font-size: 9pt; }
    .value { font-size: 9pt; color: #1e293b; }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th { background: #1e3a5f; color: #f8fafc; padding: 9px 10px; text-align: left; font-size: 9pt; font-weight: 600; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 9pt; }
    td.num { text-align: center; width: 35px; }
    td.qty { text-align: center; width: 45px; }
    td.price, td.total { text-align: right; width: 100px; font-variant-numeric: tabular-nums; }
    tr:nth-child(even) { background: #f8fafc; }

    /* Totals */
    .totals-section { margin-left: auto; margin-top: 12px; width: 300px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 14px; font-size: 9.5pt; background: #ffffff; }
    .total-row + .total-row { border-top: 1px solid #f1f5f9; }
    .total-row .label { color: #475569; flex: 1; }
    .total-row .value { text-align: right; min-width: 90px; font-variant-numeric: tabular-nums; font-weight: 500; }
    .total-row.original { color: #94a3b8; background: #f8fafc; }
    .total-row.original .label, .total-row.original .value { color: #94a3b8; text-decoration: line-through; font-weight: 400; }
    .total-row.discount .label, .total-row.discount .value { color: #16a34a; }
    .total-row.final { background: #1e3a5f; border-top: none !important; }
    .total-row.final .label, .total-row.final .value { color: #ffffff; font-weight: 700; font-size: 10.5pt; }

    /* Notes */
    .notes-box { background: #eff6ff; border-left: 3px solid #1d4ed8; padding: 10px 14px; border-radius: 4px; margin: 10px 0; }
    .notes-box h4 { color: #1e3a5f; margin-bottom: 6px; font-size: 9.5pt; font-weight: 600; }
    .notes-box p { font-size: 9pt; color: #334155; white-space: pre-wrap; }

    /* Signature */
    .signature-section { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .signature-box { text-align: center; width: 45%; }
    .signature-line { border-top: 1px solid #94a3b8; padding-top: 5px; margin-top: 60px; font-size: 8.5pt; color: #64748b; }

    /* Footer */
    .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; text-align: center; }

    /* Conditions list */
    .conditions-list { padding-left: 20px; font-size: 9pt; color: #334155; line-height: 1.7; }

    p { margin-bottom: 4px; }
  </style>
</head>
<body>

  <div class="header">
    <div class="logo-section">{{tenant.logoHtml}}</div>
    <div class="org-info">
      <div class="org-name">{{tenant.name}}</div>
      <div class="org-details">
        {{tenant.address}}<br>
        Tel: {{tenant.phone}} | Email: {{tenant.email}}<br>
        P.IVA: {{tenant.vatNumber}}
      </div>
    </div>
  </div>

  <div class="document-title">PREVENTIVO N&deg; {{preventivo.numero}}</div>

  <div class="section">
    <div class="info-grid">
      <div>
        <div class="section-title">Destinatario</div>
        <div class="content-box">
          <strong>{{cliente.ragioneSociale}}</strong><br>
          {{cliente.dettagliHtml}}
        </div>
      </div>
      <div>
        <div class="section-title">Dettagli Preventivo</div>
        <div class="content-box">
          <div class="info-row"><span class="info-label">N&deg; Preventivo:</span><span class="info-value">{{preventivo.numero}}</span></div>
          <div class="info-row"><span class="info-label">Data emissione:</span><span class="info-value">{{preventivo.dataEmissione}}</span></div>
          <div class="info-row"><span class="info-label">Scadenza:</span><span class="info-value">{{preventivo.dataValidita}}</span></div>
          <div class="info-row"><span class="info-label">Tipo servizio:</span><span class="info-value">{{preventivo.tipoServizio}}</span></div>
          {{preventivo.partecipantiHtml}}
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dettaglio Servizi</div>
    <table>
      <thead>
        <tr>
          <th class="num">#</th>
          <th>Descrizione</th>
          <th class="qty">Qt&agrave;</th>
          <th class="price">Prezzo Unit.</th>
          <th class="total">Totale</th>
        </tr>
      </thead>
      <tbody>{{vociHtml}}</tbody>
    </table>
    <div class="totals-section">{{totaliHtml}}</div>
    <div style="clear:both;"></div>
  </div>

  {{noteHtml}}

  <div class="section">
    <div class="section-title">Condizioni</div>
    <div class="content-box">
      <ul class="conditions-list">
        <li>Il presente preventivo ha validit&agrave; 30 giorni dalla data di emissione</li>
        <li>Pagamento: {{preventivo.metodoPagamento}}</li>
        <li>I prezzi sono da intendersi IVA esclusa, salvo ove diversamente indicato</li>
      </ul>
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line">Per {{tenant.name}}</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Per accettazione</div>
    </div>
  </div>

  <div class="footer">
    Documento generato il {{current.date}} &mdash; {{tenant.name}}<br>
    Preventivo &mdash; Questo documento &egrave; stato generato elettronicamente.
  </div>

</body>
</html>`;

async function main() {
  try {
    const result = await prisma.templateLink.updateMany({
      where: {
        type: 'PREVENTIVO',
        isActive: true
      },
      data: {
        name: 'Preventivo Design System V17',
        content: templateV17,
        version: { increment: 1 }
      }
    });
    console.log(`✅ Updated ${result.count} PREVENTIVO templates to V17`);

    const templates = await prisma.templateLink.findMany({
      where: { type: 'PREVENTIVO', isActive: true },
      select: { id: true, name: true, version: true, tenantId: true }
    });
    console.log('Templates after update:', JSON.stringify(templates, null, 2));
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
