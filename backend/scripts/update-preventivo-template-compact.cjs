/**
 * Script per aggiornare il template PREVENTIVO con layout compatto
 * - Tutto su 1 pagina
 * - Meno spazi vuoti tra sezioni
 * - Header tabella con colore giallo/oro come nel riferimento
 * - Font size ridotto per compattezza
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COMPACT_PREVENTIVO_HTML = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.3;
      color: #1f2937;
      background: white;
    }
    
    /* HEADER COMPATTO */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      margin-bottom: 10px;
      border-bottom: 3px solid #2563eb;
    }
    
    .logo-section img {
      max-height: 35px;
      width: auto;
    }
    
    .company-info {
      text-align: right;
      font-size: 8pt;
      color: #6b7280;
      line-height: 1.2;
    }
    
    .company-info .company-name {
      font-size: 12pt;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 1px;
    }
    
    /* TITOLO DOCUMENTO - PIÙ COMPATTO */
    .doc-title {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      padding: 8px 16px;
      margin-bottom: 10px;
      border-radius: 5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .doc-title h1 {
      font-size: 14pt;
      font-weight: 700;
      margin: 0;
      letter-spacing: 0.5px;
    }
    
    .doc-title .doc-meta {
      font-size: 9pt;
      text-align: right;
    }
    
    .doc-title .doc-meta strong {
      font-size: 11pt;
      display: block;
    }
    
    /* SEZIONI INFO (2 COLONNE) - COMPATTE */
    .info-grid {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }
    
    .info-box {
      flex: 1;
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
    }
    
    .info-box h3 {
      font-size: 7pt;
      font-weight: 700;
      color: #2563eb;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
    }
    
    .info-box p {
      margin: 2px 0;
      font-size: 9pt;
      line-height: 1.3;
    }
    
    .info-box .label { color: #6b7280; font-size: 8pt; }
    .info-box .value { font-weight: 600; color: #1f2937; }
    .info-box .cliente-nome { 
      font-size: 11pt; 
      font-weight: 700;
      color: #111827;
      margin-bottom: 2px;
    }
    
    /* SERVIZIO - COMPATTO */
    .service-box {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border: 1px solid #93c5fd;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 10px;
    }
    
    .service-box h3 {
      font-size: 10pt;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 4px;
    }
    
    .service-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      font-size: 8pt;
    }
    
    .service-meta span { 
      color: #4b5563;
      background: white;
      padding: 2px 6px;
      border-radius: 3px;
      border: 1px solid #e5e7eb;
    }
    .service-meta strong { color: #1f2937; }
    
    /* TABELLA VOCI - HEADER GIALLO/ORO */
    .items-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 10px;
      font-size: 9pt;
      border-radius: 6px;
      overflow: hidden;
    }
    
    .items-table thead {
      /* COLORE GIALLO/ORO COME NEL RIFERIMENTO */
      background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%);
      color: #1f2937;
    }
    
    .items-table th {
      padding: 6px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    
    .items-table th.num { width: 5%; text-align: center; }
    .items-table th.desc { width: 50%; }
    .items-table th.qty { width: 10%; text-align: center; }
    .items-table th.price { width: 17%; text-align: right; }
    .items-table th.total { width: 18%; text-align: right; }
    
    .items-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #e5e7eb;
      background: white;
    }
    
    .items-table td.num { text-align: center; color: #6b7280; font-weight: 500; }
    .items-table td.qty { text-align: center; }
    .items-table td.price { text-align: right; color: #4b5563; }
    .items-table td.total { text-align: right; font-weight: 600; color: #1f2937; }
    
    .items-table tbody tr:nth-child(even) td { background: #f9fafb; }
    .items-table tbody tr:last-child td { border-bottom: none; }
    
    /* LAYOUT INFERIORE: TOTALI + NOTE AFFIANCATI */
    .bottom-section {
      display: flex;
      gap: 12px;
      margin-bottom: 10px;
    }
    
    /* NOTE - OCCUPA PIÙ SPAZIO */
    .notes-box {
      flex: 1.2;
      background: linear-gradient(180deg, #fef3c7 0%, #fde68a 100%);
      border: 1px solid #f59e0b;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 8pt;
    }
    
    .notes-box h4 {
      font-size: 8pt;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 4px;
    }
    
    .notes-box p {
      color: #78350f;
      line-height: 1.3;
      font-size: 8pt;
    }
    
    /* TOTALI - COMPATTI */
    .totals-section {
      flex: 0.8;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 10px;
      background: #f8fafc;
      border-radius: 4px;
      font-size: 9pt;
    }
    
    .total-row .label { color: #6b7280; }
    .total-row .value { font-weight: 600; color: #1f2937; }
    
    .total-row.original .value { 
      text-decoration: line-through; 
      color: #9ca3af; 
    }
    
    .total-row.discount {
      background: #fef2f2;
    }
    .total-row.discount .value { color: #dc2626; }
    
    .total-row.final {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      padding: 6px 10px;
      margin-top: 2px;
    }
    .total-row.final .label { color: white; font-weight: 600; }
    .total-row.final .value { 
      font-size: 12pt; 
      font-weight: 700; 
      color: white; 
    }
    
    /* TERMINI E CONDIZIONI - COMPATTI */
    .terms-section {
      background: #f8fafc;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 10px;
    }
    
    .terms-section h4 {
      font-size: 8pt;
      font-weight: 700;
      color: #374151;
      margin-bottom: 4px;
    }
    
    .terms-list {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 8pt;
      color: #6b7280;
    }
    
    .terms-list span { display: inline-flex; align-items: center; gap: 4px; }
    .terms-list strong { color: #374151; }
    
    /* FIRMA - COMPATTA */
    .signature-section {
      display: flex;
      gap: 30px;
      margin-bottom: 10px;
      padding: 10px;
      background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 1px solid #7dd3fc;
      border-radius: 6px;
    }
    
    .signature-box {
      flex: 1;
      text-align: center;
    }
    
    .signature-box .signature-line {
      border-bottom: 1px solid #374151;
      height: 30px;
      margin-bottom: 4px;
    }
    
    .signature-box .signature-label {
      font-size: 8pt;
      color: #6b7280;
    }
    
    /* FOOTER - COMPATTO */
    .footer-section {
      text-align: center;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      font-size: 7pt;
      color: #9ca3af;
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
      <div>{{tenant.address}}</div>
      <div>P.IVA: {{tenant.vatNumber}}</div>
    </div>
  </div>

  <!-- TITOLO DOCUMENTO -->
  <div class="doc-title">
    <h1>PREVENTIVO</h1>
    <div class="doc-meta">
      <strong>{{preventivo.numero}}</strong>
      <span>del {{preventivo.dataEmissione}}</span>
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
      <p><span class="label">Valido fino:</span> <span class="value">{{preventivo.dataValidita}}</span></p>
      <p><span class="label">Tipo:</span> <span class="value">{{preventivo.tipoServizio}}</span></p>
      {{preventivo.partecipantiHtml}}
    </div>
  </div>

  <!-- BOX SERVIZIO/CORSO -->
  {{corso.boxHtml}}

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

  <!-- SEZIONE INFERIORE: NOTE + TOTALI AFFIANCATI -->
  <div class="bottom-section">
    <!-- NOTE -->
    {{noteHtml}}
    
    <!-- TOTALI -->
    <div class="totals-section">
      {{totaliHtml}}
    </div>
  </div>

  <!-- TERMINI E CONDIZIONI -->
  <div class="terms-section">
    <h4>Termini e Condizioni</h4>
    <div class="terms-list">
      <span>• Validità: <strong>{{preventivo.dataValidita}}</strong></span>
      <span>• Pagamento: <strong>{{preventivo.metodoPagamento}}</strong></span>
      <span>• Annullamento &gt;7gg: <strong>rimborso 50%</strong></span>
    </div>
  </div>

  <!-- FIRMA -->
  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-label">Luogo e Data</div>
    </div>
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-label">Firma per accettazione</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer-section">
    {{tenant.name}} - {{tenant.address}} - P.IVA {{tenant.vatNumber}}
  </div>
</body>
</html>`;

async function updateTemplate() {
  try {
    // Trova il template esistente
    const existingTemplate = await prisma.templateLink.findFirst({
      where: { type: 'PREVENTIVO', deletedAt: null },
      orderBy: { version: 'desc' }
    });

    if (!existingTemplate) {
      console.log('❌ Template PREVENTIVO non trovato');
      return;
    }

    const newVersion = existingTemplate.version + 1;
    console.log(`📝 Aggiornamento template da v${existingTemplate.version} a v${newVersion}`);

    // Crea il nuovo contenuto JSON
    const newContent = JSON.stringify({
      __htmlEditor: true,
      version: `${newVersion}.0`,
      rawHtml: COMPACT_PREVENTIVO_HTML,
      lastModified: new Date().toISOString()
    });

    // Aggiorna il template
    await prisma.templateLink.update({
      where: { id: existingTemplate.id },
      data: {
        content: newContent,
        version: newVersion,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Template PREVENTIVO aggiornato a v${newVersion}`);
    console.log('   - Layout compatto su 1 pagina');
    console.log('   - Header tabella giallo/oro');
    console.log('   - Spaziature ridotte');
    console.log('   - Note e totali affiancati');

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTemplate();
