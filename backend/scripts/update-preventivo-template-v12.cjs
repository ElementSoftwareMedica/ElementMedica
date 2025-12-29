/**
 * Script per aggiornare il template PREVENTIVO alla versione v12
 * ELEGANTE con MARKER SEMPLICI (no Handlebars)
 * 
 * Caratteristiche v12:
 * - Font 10pt, margini 10mm, layout arioso
 * - Design elegante con shadow e bordi soft
 * - SOLO marker semplici {{variabile}} (no #if, #each)
 * - Voci renderizzate come HTML statico nel service
 * - Condizioni gestite lato service (non template)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Template v12 - ELEGANTE con SOLO MARKER SEMPLICI
// Le voci vengono iniettate come HTML dal service
// Le condizioni (#if) sono gestite nel service
const TEMPLATE_V12 = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #1f2937;
      background: white;
    }
    
    /* HEADER ELEGANTE */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      margin-bottom: 16px;
      border-bottom: 3px solid #2563eb;
    }
    
    .logo-section img {
      max-height: 45px;
      width: auto;
    }
    
    .company-info {
      text-align: right;
      font-size: 9pt;
      color: #6b7280;
      line-height: 1.3;
    }
    
    .company-info .company-name {
      font-size: 14pt;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 2px;
    }
    
    /* TITOLO DOCUMENTO - ELEGANTE */
    .doc-title {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      padding: 12px 20px;
      margin-bottom: 16px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
    }
    
    .doc-title h1 {
      font-size: 16pt;
      font-weight: 700;
      margin: 0;
      letter-spacing: 1px;
    }
    
    .doc-title .doc-meta {
      font-size: 10pt;
      text-align: right;
      opacity: 0.95;
    }
    
    .doc-title .doc-meta strong {
      font-size: 12pt;
      display: block;
    }
    
    /* SEZIONI INFO (2 COLONNE) */
    .info-grid {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }
    
    .info-box {
      flex: 1;
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    
    .info-box h3 {
      font-size: 8pt;
      font-weight: 700;
      color: #2563eb;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    
    .info-box p {
      margin: 3px 0;
      font-size: 10pt;
      line-height: 1.4;
    }
    
    .info-box .label { 
      color: #6b7280; 
      font-size: 9pt;
    }
    .info-box .value { 
      font-weight: 600; 
      color: #1f2937; 
    }
    .info-box .cliente-nome { 
      font-size: 12pt; 
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    
    /* SERVIZIO - ELEGANTE */
    .service-box {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border: 1px solid #93c5fd;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(59, 130, 246, 0.1);
    }
    
    .service-box h3 {
      font-size: 12pt;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 6px;
    }
    
    .service-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 9pt;
    }
    
    .service-meta span { 
      color: #4b5563;
      background: white;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
    }
    .service-meta strong { color: #1f2937; }
    
    /* TABELLA VOCI - ELEGANTE */
    .items-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 16px;
      font-size: 10pt;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    
    .items-table thead {
      background: linear-gradient(180deg, #1e3a5f 0%, #1e3a8a 100%);
      color: white;
    }
    
    .items-table th {
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .items-table th.num { width: 6%; text-align: center; }
    .items-table th.desc { width: 48%; }
    .items-table th.qty { width: 10%; text-align: center; }
    .items-table th.price { width: 18%; text-align: right; }
    .items-table th.total { width: 18%; text-align: right; }
    
    .items-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
      background: white;
    }
    
    .items-table td.num { text-align: center; color: #6b7280; font-weight: 500; }
    .items-table td.qty { text-align: center; }
    .items-table td.price { text-align: right; color: #4b5563; }
    .items-table td.total { text-align: right; font-weight: 600; color: #1f2937; }
    
    .items-table tbody tr:nth-child(even) td { background: #f9fafb; }
    .items-table tbody tr:last-child td { border-bottom: none; }
    
    /* RIEPILOGO TOTALI - ELEGANTE */
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 16px;
    }
    
    .totals-box {
      width: 240px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      overflow: hidden;
      font-size: 10pt;
      box-shadow: 0 2px 4px rgba(0,0,0,0.06);
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 14px;
      border-bottom: 1px solid #e5e7eb;
      background: white;
    }
    
    .total-row:last-child { border-bottom: none; }
    .total-row .label { color: #6b7280; }
    .total-row .value { font-weight: 600; }
    
    .total-row.original {
      background: #f3f4f6;
    }
    .total-row.original .value {
      text-decoration: line-through;
      color: #9ca3af;
    }
    
    .total-row.discount {
      background: linear-gradient(90deg, #fef3c7 0%, #fde68a 100%);
      color: #92400e;
    }
    .total-row.discount .value {
      font-weight: 700;
    }
    
    .total-row.final {
      background: linear-gradient(135deg, #1e3a5f 0%, #1e3a8a 100%);
      color: white;
      padding: 10px 14px;
    }
    .total-row.final .label {
      color: rgba(255,255,255,0.9);
      font-weight: 600;
    }
    .total-row.final .value {
      font-size: 14pt;
      font-weight: 700;
    }
    
    /* NOTE - ELEGANTE */
    .notes-box {
      background: linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%);
      border: 1px solid #fcd34d;
      border-left: 4px solid #f59e0b;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 12px;
      font-size: 9pt;
    }
    
    .notes-box h4 {
      color: #92400e;
      font-size: 9pt;
      font-weight: 700;
      margin-bottom: 4px;
    }
    
    .notes-box p { 
      color: #78350f;
      line-height: 1.4;
    }
    
    /* CONDIZIONI - ELEGANTE */
    .conditions {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 8pt;
      color: #6b7280;
    }
    
    .conditions-title {
      font-weight: 600;
      color: #4b5563;
      margin-bottom: 4px;
      font-size: 8pt;
    }
    
    .conditions-content {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 20px;
    }
    
    .conditions-content span::before {
      content: "•";
      margin-right: 6px;
      color: #2563eb;
    }
    
    /* FIRMA - ELEGANTE */
    .signature-section {
      display: flex;
      justify-content: space-between;
      padding: 16px;
      border: 2px dashed #93c5fd;
      border-radius: 8px;
      margin-top: 12px;
      background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%);
    }
    
    .sig-box {
      width: 42%;
      text-align: center;
    }
    
    .sig-box .line {
      border-top: 1px solid #64748b;
      margin-top: 30px;
      margin-bottom: 6px;
    }
    
    .sig-box span {
      font-size: 8pt;
      color: #64748b;
      font-weight: 500;
    }
    
    /* FOOTER */
    .footer {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      font-size: 8pt;
      color: #9ca3af;
      text-align: center;
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div class="logo-section">
      {{tenant.logoHtml}}
    </div>
    <div class="company-info">
      <div class="company-name">{{tenant.name}}</div>
      {{tenant.address}} - {{tenant.city}}<br>
      P.IVA: {{tenant.vatNumber}}
    </div>
  </div>
  
  <!-- TITOLO -->
  <div class="doc-title">
    <h1>PREVENTIVO</h1>
    <div class="doc-meta">
      <strong>{{preventivo.numero}}</strong>
      del {{preventivo.dataEmissione}}
    </div>
  </div>
  
  <!-- INFO CLIENTE E PREVENTIVO -->
  <div class="info-grid">
    <div class="info-box">
      <h3>Destinatario</h3>
      <p class="cliente-nome">{{cliente.nome}}</p>
      {{cliente.dettagliHtml}}
    </div>
    <div class="info-box">
      <h3>Dettagli Preventivo</h3>
      <p><span class="label">Valido fino:</span> <span class="value">{{preventivo.dataScadenza}}</span></p>
      <p><span class="label">Tipo:</span> <span class="value">{{preventivo.tipoServizio}}</span></p>
      {{preventivo.partecipantiHtml}}
    </div>
  </div>
  
  <!-- SERVIZIO -->
  <div class="service-box">
    <h3>{{preventivo.titoloServizio}}</h3>
    {{corso.metaHtml}}
  </div>
  
  <!-- TABELLA VOCI -->
  <table class="items-table">
    <thead>
      <tr>
        <th class="num">#</th>
        <th class="desc">Descrizione</th>
        <th class="qty">Qtà</th>
        <th class="price">Prezzo Unit.</th>
        <th class="total">Totale</th>
      </tr>
    </thead>
    <tbody>
      {{vociHtml}}
    </tbody>
  </table>
  
  <!-- TOTALI -->
  <div class="totals-wrapper">
    <div class="totals-box">
      {{totaliHtml}}
    </div>
  </div>
  
  {{noteHtml}}
  
  <!-- CONDIZIONI -->
  <div class="conditions">
    <div class="conditions-title">Termini e Condizioni</div>
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
    console.log('🔄 Aggiornamento template PREVENTIVO a v12 (elegante + marker semplici)...\n');

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
                    content: TEMPLATE_V12,
                    version: 12,
                    updatedAt: new Date()
                }
            });

            console.log('  ✅ Template aggiornato a v12');
        }

        console.log('\n✅ Aggiornamento completato!');
        console.log('\nCaratteristiche v12 (elegante + marker semplici):');
        console.log('  • Font 10pt body');
        console.log('  • Line-height 1.4');
        console.log('  • Shadow e gradienti eleganti');
        console.log('  • SOLO marker semplici {{variabile}} (no #if, #each)');
        console.log('  • Voci/totali renderizzati come HTML dal service');
        console.log('  • Single-page A4 con margini 10mm');

    } catch (error) {
        console.error('❌ Errore:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateTemplates();
