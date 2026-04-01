/**
 * Update Preventivo template to V16
 * Fixes marker names to use correct markerResolver syntax
 * Run: node backend/scripts/update-preventivo-template-v16.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templateV16 = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Preventivo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #333; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #E9BA49; }
    .logo-section { flex: 0 0 200px; }
    .logo-section img { max-width: 180px; max-height: 80px; }
    .org-info { text-align: right; flex: 1; }
    .org-name { font-size: 16pt; font-weight: bold; color: #283646; margin-bottom: 4px; }
    .org-details { font-size: 9pt; color: #666; line-height: 1.4; }
    .document-title { text-align: center; font-size: 14pt; font-weight: bold; color: #283646; margin: 20px 0; padding: 10px 15px; background: #fefce8; border-radius: 5px; border-left: 4px solid #E9BA49; }
    .section { margin-bottom: 18px; page-break-inside: avoid; }
    .section-title { font-size: 11pt; font-weight: bold; color: #283646; border-bottom: 2px solid #E9BA49; padding-bottom: 4px; margin-bottom: 8px; }
    .content-box { background: #f8fafc; padding: 12px; border-radius: 5px; margin-bottom: 10px; border: 1px solid #e2e8f0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .info-row { display: flex; margin-bottom: 4px; }
    .info-label { font-weight: bold; width: 140px; color: #64748b; font-size: 9pt; }
    .info-value { flex: 1; font-size: 9pt; }
    .label { color: #64748b; font-size: 9pt; }
    .value { font-size: 9pt; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th { background: #283646; color: white; padding: 8px 10px; text-align: left; font-size: 9pt; }
    td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 9pt; }
    td.num { text-align: center; width: 35px; }
    td.qty { text-align: center; width: 45px; }
    td.price, td.total { text-align: right; width: 100px; }
    tr:nth-child(even) { background: #f8fafc; }
    .totals-section { margin-left: auto; margin-top: 10px; width: fit-content; min-width: 280px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 10px; font-size: 10pt; gap: 30px; }
    .total-row .label { color: #64748b; }
    .total-row .value { text-align: right; min-width: 80px; }
    .total-row.original { color: #94a3b8; text-decoration: line-through; }
    .total-row.discount { color: #16a34a; }
    .total-row.final { font-weight: bold; font-size: 11pt; color: #283646; border-top: 2px solid #E9BA49; padding-top: 8px; margin-top: 4px; }
    .notes-box { background: #fefce8; border-left: 3px solid #E9BA49; padding: 10px 14px; border-radius: 3px; margin: 10px 0; }
    .notes-box h4 { color: #283646; margin-bottom: 6px; font-size: 10pt; }
    .notes-box p { font-size: 9pt; color: #555; white-space: pre-wrap; }
    .signature-section { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .signature-box { text-align: center; width: 45%; }
    .signature-line { border-top: 1px solid #333; padding-top: 5px; margin-top: 60px; font-size: 9pt; color: #64748b; }
    .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; text-align: center; }
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
  </div>

  {{noteHtml}}

  <div class="section">
    <div class="section-title">Condizioni</div>
    <div class="content-box">
      <ul style="padding-left: 20px; font-size: 9pt;">
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
                name: 'Preventivo Design System V16',
                content: templateV16,
                version: { increment: 1 }
            }
        });
        console.log(`✅ Updated ${result.count} PREVENTIVO templates to V16`);

        // Verify
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
