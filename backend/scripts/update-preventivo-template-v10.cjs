/**
 * Script per aggiornare il template PREVENTIVO alla versione v10
 * Ultra-compatto: GARANTISCE single-page
 * 
 * Ottimizzazioni v10:
 * - Font 7.5-8pt (da 9pt)
 * - Line-height 1.15 (da 1.25)
 * - Padding ridotti del 40%
 * - Margini sezioni ridotti
 * - Condizioni minimali inline
 * - Firma compatta
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TEMPLATE_V10 = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 7.5pt;
      line-height: 1.15;
      color: #1f2937;
    }
    
    /* HEADER ULTRA-COMPATTO */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 4px;
      margin-bottom: 6px;
      border-bottom: 2px solid #2563eb;
    }
    
    .logo-section img {
      max-height: 32px;
      width: auto;
    }
    
    .company-info {
      text-align: right;
      font-size: 6.5pt;
      color: #6b7280;
      line-height: 1.1;
    }
    
    .company-info .company-name {
      font-size: 9pt;
      font-weight: 600;
      color: #1e40af;
    }
    
    /* TITOLO DOCUMENTO */
    .doc-title {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      padding: 5px 10px;
      margin-bottom: 6px;
      border-radius: 3px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .doc-title h1 {
      font-size: 11pt;
      font-weight: 600;
      margin: 0;
    }
    
    .doc-title .doc-meta {
      font-size: 7.5pt;
      text-align: right;
    }
    
    /* SEZIONI INFO (2 COLONNE) */
    .info-grid {
      display: flex;
      gap: 6px;
      margin-bottom: 6px;
    }
    
    .info-box {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      padding: 4px 6px;
    }
    
    .info-box h3 {
      font-size: 6.5pt;
      font-weight: 600;
      color: #2563eb;
      margin-bottom: 2px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .info-box p {
      margin: 0;
      font-size: 7pt;
      line-height: 1.2;
    }
    
    .info-box .label { color: #6b7280; }
    .info-box .value { font-weight: 500; color: #1f2937; }
    .info-box .cliente-nome { font-size: 8pt; font-weight: 600; }
    
    /* SERVIZIO */
    .service-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 3px;
      padding: 4px 8px;
      margin-bottom: 6px;
    }
    
    .service-box h3 {
      font-size: 8pt;
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 2px;
    }
    
    .service-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 6.5pt;
    }
    
    .service-meta span { color: #6b7280; }
    .service-meta strong { color: #1f2937; }
    
    /* TABELLA VOCI - SUPER COMPATTA */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 7pt;
    }
    
    .items-table thead {
      background: #1e3a5f;
      color: white;
    }
    
    .items-table th {
      padding: 3px 4px;
      text-align: left;
      font-weight: 500;
      font-size: 6.5pt;
      text-transform: uppercase;
    }
    
    .items-table th.num { width: 6%; text-align: center; }
    .items-table th.desc { width: 50%; }
    .items-table th.qty { width: 8%; text-align: center; }
    .items-table th.price { width: 18%; text-align: right; }
    .items-table th.total { width: 18%; text-align: right; }
    
    .items-table td {
      padding: 3px 4px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .items-table td.num { text-align: center; color: #6b7280; }
    .items-table td.qty { text-align: center; }
    .items-table td.price { text-align: right; }
    .items-table td.total { text-align: right; font-weight: 500; }
    
    .items-table tbody tr:nth-child(even) { background: #f9fafb; }
    
    /* RIEPILOGO TOTALI */
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 6px;
    }
    
    .totals-box {
      width: 180px;
      border: 1px solid #d1d5db;
      border-radius: 3px;
      overflow: hidden;
      font-size: 7pt;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 6px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .total-row:last-child { border-bottom: none; }
    .total-row .label { color: #6b7280; }
    .total-row .value { font-weight: 500; }
    
    .total-row.original {
      background: #f3f4f6;
    }
    .total-row.original .value {
      text-decoration: line-through;
      color: #9ca3af;
    }
    
    .total-row.discount {
      background: #fef3c7;
      color: #92400e;
    }
    
    .total-row.final {
      background: #1e3a5f;
      color: white;
      padding: 4px 6px;
    }
    .total-row.final .value {
      font-size: 9pt;
      font-weight: 700;
    }
    
    /* NOTE - COMPATTE */
    .notes-box {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 3px;
      padding: 3px 6px;
      margin-bottom: 4px;
      font-size: 6.5pt;
    }
    
    .notes-box h4 {
      color: #92400e;
      font-size: 7pt;
      display: inline;
      margin-right: 4px;
    }
    
    .notes-box p { display: inline; }
    
    /* CONDIZIONI - INLINE */
    .conditions {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      padding: 3px 6px;
      margin-bottom: 4px;
      font-size: 6pt;
      color: #6b7280;
    }
    
    .conditions-content {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 12px;
    }
    
    .conditions-content span::before {
      content: "•";
      margin-right: 3px;
      color: #9ca3af;
    }
    
    /* FIRMA - COMPATTA */
    .signature-section {
      display: flex;
      justify-content: space-between;
      padding: 4px;
      border: 1px dashed #93c5fd;
      border-radius: 3px;
      margin-top: 4px;
    }
    
    .sig-box {
      width: 45%;
      text-align: center;
    }
    
    .sig-box .line {
      border-top: 1px solid #9ca3af;
      margin-top: 16px;
      margin-bottom: 2px;
    }
    
    .sig-box span {
      font-size: 6pt;
      color: #6b7280;
    }
    
    /* FOOTER */
    .footer {
      margin-top: 4px;
      padding-top: 2px;
      border-top: 1px solid #e5e7eb;
      font-size: 6pt;
      color: #9ca3af;
      text-align: center;
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div class="logo-section">
      {{#if tenant.logoUrl}}
      <img src="{{tenant.logoUrl}}" alt="{{tenant.name}}">
      {{else}}
      <span style="font-size: 10pt; font-weight: 600; color: #1e40af;">{{tenant.name}}</span>
      {{/if}}
    </div>
    <div class="company-info">
      <div class="company-name">{{tenant.name}}</div>
      {{tenant.address}} - {{tenant.city}} | P.IVA: {{tenant.vatNumber}}
    </div>
  </div>
  
  <!-- TITOLO -->
  <div class="doc-title">
    <h1>PREVENTIVO</h1>
    <div class="doc-meta">
      <strong>{{preventivo.numero}}</strong> del {{preventivo.dataEmissione}}
    </div>
  </div>
  
  <!-- INFO CLIENTE E PREVENTIVO -->
  <div class="info-grid">
    <div class="info-box">
      <h3>Destinatario</h3>
      <p class="cliente-nome">{{cliente.nome}}</p>
      {{#if cliente.partitaIva}}<p><span class="label">P.IVA:</span> <span class="value">{{cliente.partitaIva}}</span></p>{{/if}}
      {{#if cliente.codiceFiscale}}<p><span class="label">C.F.:</span> <span class="value">{{cliente.codiceFiscale}}</span></p>{{/if}}
      {{#if cliente.indirizzoCompleto}}<p>{{cliente.indirizzoCompleto}}</p>{{/if}}
    </div>
    <div class="info-box">
      <h3>Riferimenti</h3>
      <p><span class="label">Valido fino:</span> <span class="value">{{preventivo.dataScadenza}}</span></p>
      <p><span class="label">Tipo:</span> <span class="value">{{preventivo.tipoServizio}}</span></p>
      {{#if preventivo.partecipanti}}<p><span class="label">Partecipanti:</span> <span class="value">{{preventivo.partecipanti}}</span></p>{{/if}}
    </div>
  </div>
  
  <!-- SERVIZIO -->
  <div class="service-box">
    <h3>{{preventivo.titoloServizio}}</h3>
    {{#if corso}}
    <div class="service-meta">
      <span>Cod. <strong>{{corso.code}}</strong></span>
      <span>Durata <strong>{{corso.duration}}h</strong></span>
      {{#if corso.category}}<span>Cat. <strong>{{corso.category}}</strong></span>{{/if}}
      {{#if corso.riskLevel}}<span>Rischio <strong>{{corso.riskLevel}}</strong></span>{{/if}}
    </div>
    {{/if}}
  </div>
  
  <!-- TABELLA VOCI -->
  <table class="items-table">
    <thead>
      <tr>
        <th class="num">#</th>
        <th class="desc">Descrizione</th>
        <th class="qty">Qtà</th>
        <th class="price">Prezzo</th>
        <th class="total">Totale</th>
      </tr>
    </thead>
    <tbody>
      {{#each voci}}
      <tr>
        <td class="num">{{numero}}</td>
        <td>{{descrizione}}</td>
        <td class="qty">{{quantita}}</td>
        <td class="price">€ {{prezzoUnitario}}</td>
        <td class="total">€ {{subtotale}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  
  <!-- TOTALI -->
  <div class="totals-wrapper">
    <div class="totals-box">
      {{#if preventivo.scontoApplicato}}
      <div class="total-row original">
        <span class="label">Subtotale</span>
        <span class="value">€ {{preventivo.prezzoTotale}}</span>
      </div>
      <div class="total-row discount">
        <span class="label">Sconto{{#if preventivo.scontoPercentuale}} {{preventivo.scontoPercentuale}}%{{/if}}</span>
        <span class="value">-€ {{preventivo.importoSconto}}</span>
      </div>
      {{/if}}
      <div class="total-row">
        <span class="label">Imponibile</span>
        <span class="value">€ {{preventivo.imponibile}}</span>
      </div>
      <div class="total-row">
        <span class="label">IVA {{preventivo.percentualeIva}}%</span>
        <span class="value">€ {{preventivo.importoIva}}</span>
      </div>
      <div class="total-row final">
        <span class="label">TOTALE</span>
        <span class="value">€ {{preventivo.importoFinale}}</span>
      </div>
    </div>
  </div>
  
  {{#if preventivo.note}}
  <div class="notes-box">
    <h4>Note:</h4>
    <p>{{preventivo.note}}</p>
  </div>
  {{/if}}
  
  <!-- CONDIZIONI INLINE -->
  <div class="conditions">
    <div class="conditions-content">
      <span>Validità: {{preventivo.dataScadenza}}</span>
      <span>Pagamento: 30gg data fattura</span>
      <span>Annullamento &gt;7gg: rimborso 50%</span>
    </div>
  </div>
  
  <!-- FIRMA -->
  <div class="signature-section">
    <div class="sig-box">
      <div class="line"></div>
      <span>Luogo e Data</span>
    </div>
    <div class="sig-box">
      <div class="line"></div>
      <span>Firma per accettazione</span>
    </div>
  </div>
  
  <div class="footer">
    {{tenant.name}} - {{tenant.address}}, {{tenant.city}} - P.IVA {{tenant.vatNumber}}
  </div>
</body>
</html>`;

async function updateTemplates() {
    console.log('🔄 Aggiornamento template PREVENTIVO a v10 (ultra-compatto)...\n');

    try {
        const templates = await prisma.templateLink.findMany({
            where: { type: 'PREVENTIVO', deletedAt: null },
            include: { tenant: true }
        });

        console.log('📋 Trovati ' + templates.length + ' template PREVENTIVO\n');

        for (const template of templates) {
            console.log('  Aggiornamento: ' + (template.tenant?.name || template.tenantId));

            await prisma.templateLink.update({
                where: { id: template.id },
                data: {
                    content: TEMPLATE_V10,
                    version: 10,
                    updatedAt: new Date()
                }
            });

            console.log('  ✅ Template aggiornato a v10');
        }

        console.log('\n✅ Aggiornamento completato!');
        console.log('\nCaratteristiche v10 (ultra-compatto):');
        console.log('  • Font 7.5pt body, 6-7pt labels');
        console.log('  • Line-height 1.15');
        console.log('  • Padding ridotti 40%');
        console.log('  • Condizioni inline');
        console.log('  • Firma compatta');
        console.log('  • GARANTITO single-page A4');

    } catch (error) {
        console.error('❌ Errore:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateTemplates();
