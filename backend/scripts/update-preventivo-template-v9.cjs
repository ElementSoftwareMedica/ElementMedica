/**
 * Script per aggiornare il template PREVENTIVO alla versione v9
 * Ottimizzazioni:
 * - Layout ultra-compatto single-page garantito
 * - Font leggibili (9-10pt)
 * - Spazi bianchi minimizzati
 * - Tabella elegante e professionale
 * - Sezione sconto con prezzo originale visibile
 * - Margini ridotti per massimizzare spazio
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TEMPLATE_V9 = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.25;
      color: #1f2937;
      padding: 0;
    }
    
    /* HEADER COMPATTO */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 6px;
      margin-bottom: 8px;
      border-bottom: 2px solid #3b82f6;
    }
    
    .logo-section img {
      max-height: 40px;
      width: auto;
    }
    
    .company-info {
      text-align: right;
      font-size: 7.5pt;
      color: #6b7280;
      line-height: 1.2;
    }
    
    .company-info .company-name {
      font-size: 10pt;
      font-weight: 600;
      color: #1e40af;
    }
    
    /* TITOLO DOCUMENTO */
    .doc-title {
      background: #3b82f6;
      color: white;
      padding: 8px 12px;
      margin-bottom: 8px;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .doc-title h1 {
      font-size: 13pt;
      font-weight: 600;
      margin: 0;
    }
    
    .doc-title .doc-meta {
      font-size: 9pt;
      text-align: right;
    }
    
    /* SEZIONI INFO (2 COLONNE) */
    .info-grid {
      display: flex;
      gap: 10px;
      margin-bottom: 8px;
    }
    
    .info-box {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px 8px;
    }
    
    .info-box h3 {
      font-size: 8pt;
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 3px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .info-box p {
      margin: 1px 0;
      font-size: 8pt;
      line-height: 1.3;
    }
    
    .info-box .label {
      color: #6b7280;
    }
    
    .info-box .value {
      font-weight: 500;
      color: #1f2937;
    }
    
    /* SEZIONE SERVIZIO */
    .service-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 4px;
      padding: 6px 10px;
      margin-bottom: 8px;
    }
    
    .service-box h3 {
      font-size: 9pt;
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 4px;
    }
    
    .service-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 7.5pt;
    }
    
    .service-meta span {
      color: #6b7280;
    }
    
    .service-meta strong {
      color: #1f2937;
    }
    
    /* TABELLA VOCI - ELEGANTE */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 8pt;
    }
    
    .items-table thead {
      background: #1e3a5f;
      color: white;
    }
    
    .items-table th {
      padding: 5px 6px;
      text-align: left;
      font-weight: 500;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .items-table th.num { width: 8%; text-align: center; }
    .items-table th.desc { width: 47%; }
    .items-table th.qty { width: 10%; text-align: center; }
    .items-table th.price { width: 17%; text-align: right; }
    .items-table th.total { width: 18%; text-align: right; }
    
    .items-table td {
      padding: 5px 6px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: middle;
    }
    
    .items-table td.num { text-align: center; color: #6b7280; }
    .items-table td.qty { text-align: center; }
    .items-table td.price { text-align: right; }
    .items-table td.total { text-align: right; font-weight: 500; }
    
    .items-table tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    
    /* RIEPILOGO TOTALI */
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 8px;
    }
    
    .totals-box {
      width: 220px;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
      font-size: 8pt;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .total-row:last-child {
      border-bottom: none;
    }
    
    .total-row .label {
      color: #6b7280;
    }
    
    .total-row .value {
      font-weight: 500;
    }
    
    /* Prezzo originale barrato quando c'è sconto */
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
    
    .total-row.discount .value {
      font-weight: 600;
    }
    
    .total-row.final {
      background: #1e3a5f;
      color: white;
      padding: 6px 8px;
    }
    
    .total-row.final .label {
      color: white;
      font-weight: 500;
    }
    
    .total-row.final .value {
      font-size: 11pt;
      font-weight: 700;
    }
    
    /* NOTE */
    .notes-box {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 4px;
      padding: 5px 8px;
      margin-bottom: 8px;
      font-size: 7.5pt;
    }
    
    .notes-box h4 {
      color: #92400e;
      font-size: 8pt;
      margin-bottom: 2px;
    }
    
    /* CONDIZIONI */
    .conditions {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 5px 8px;
      margin-bottom: 8px;
      font-size: 7pt;
      color: #6b7280;
    }
    
    .conditions h4 {
      font-size: 7.5pt;
      color: #374151;
      margin-bottom: 2px;
    }
    
    .conditions ul {
      margin: 0;
      padding-left: 12px;
    }
    
    .conditions li {
      margin: 1px 0;
    }
    
    /* FIRMA */
    .signature-section {
      border: 1px dashed #3b82f6;
      border-radius: 4px;
      padding: 8px;
      margin-top: 8px;
    }
    
    .signature-section h4 {
      text-align: center;
      color: #1e40af;
      font-size: 8pt;
      margin-bottom: 8px;
    }
    
    .signature-line {
      display: flex;
      justify-content: space-between;
      padding-top: 20px;
    }
    
    .sig-box {
      width: 45%;
      text-align: center;
    }
    
    .sig-box .line {
      border-top: 1px solid #9ca3af;
      margin-bottom: 2px;
    }
    
    .sig-box span {
      font-size: 7pt;
      color: #6b7280;
    }
    
    /* FOOTER */
    .footer {
      margin-top: 6px;
      padding-top: 4px;
      border-top: 1px solid #e5e7eb;
      font-size: 6.5pt;
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
      <span style="font-size: 12pt; font-weight: 600; color: #1e40af;">{{tenant.name}}</span>
      {{/if}}
    </div>
    <div class="company-info">
      <div class="company-name">{{tenant.name}}</div>
      {{tenant.address}} - {{tenant.city}}<br>
      P.IVA: {{tenant.vatNumber}} | {{tenant.email}}
    </div>
  </div>
  
  <!-- TITOLO -->
  <div class="doc-title">
    <h1>PREVENTIVO</h1>
    <div class="doc-meta">
      N. <strong>{{preventivo.numero}}</strong><br>
      Data: {{preventivo.dataEmissione}}
    </div>
  </div>
  
  <!-- INFO CLIENTE E PREVENTIVO -->
  <div class="info-grid">
    <div class="info-box">
      <h3>Cliente</h3>
      <p><span class="value" style="font-size: 9pt;">{{cliente.nome}}</span></p>
      {{#if cliente.partitaIva}}<p><span class="label">P.IVA:</span> <span class="value">{{cliente.partitaIva}}</span></p>{{/if}}
      {{#if cliente.codiceFiscale}}<p><span class="label">C.F.:</span> <span class="value">{{cliente.codiceFiscale}}</span></p>{{/if}}
      {{#if cliente.indirizzoCompleto}}<p><span class="label">Ind.:</span> <span class="value">{{cliente.indirizzoCompleto}}</span></p>{{/if}}
    </div>
    <div class="info-box">
      <h3>Dettagli</h3>
      <p><span class="label">Validità:</span> <span class="value">{{preventivo.dataScadenza}}</span></p>
      <p><span class="label">Tipo:</span> <span class="value">{{preventivo.tipoServizio}}</span></p>
      {{#if preventivo.partecipanti}}<p><span class="label">Partecipanti:</span> <span class="value">{{preventivo.partecipanti}}</span></p>{{/if}}
      <p><span class="label">Stato:</span> <span class="value">{{preventivo.stato}}</span></p>
    </div>
  </div>
  
  <!-- SERVIZIO -->
  <div class="service-box">
    <h3>{{preventivo.titoloServizio}}</h3>
    {{#if corso}}
    <div class="service-meta">
      <span>Codice: <strong>{{corso.code}}</strong></span>
      <span>Durata: <strong>{{corso.duration}}h</strong></span>
      <span>Categoria: <strong>{{corso.category}}</strong></span>
      {{#if corso.riskLevel}}<span>Rischio: <strong>{{corso.riskLevel}}</strong></span>{{/if}}
    </div>
    {{/if}}
  </div>
  
  <!-- TABELLA VOCI -->
  <table class="items-table">
    <thead>
      <tr>
        <th class="num">N.</th>
        <th class="desc">Descrizione</th>
        <th class="qty">Qtà</th>
        <th class="price">Prezzo Unit.</th>
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
        <span class="label">Prezzo originale</span>
        <span class="value">€ {{preventivo.prezzoTotale}}</span>
      </div>
      <div class="total-row discount">
        <span class="label">Sconto {{#if preventivo.scontoCodice}}({{preventivo.scontoCodice}}){{/if}}{{#if preventivo.scontoPercentuale}} {{preventivo.scontoPercentuale}}%{{/if}}</span>
        <span class="value">- € {{preventivo.importoSconto}}</span>
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
  <!-- NOTE -->
  <div class="notes-box">
    <h4>Note</h4>
    <p>{{preventivo.note}}</p>
  </div>
  {{/if}}
  
  <!-- CONDIZIONI -->
  <div class="conditions">
    <h4>Condizioni</h4>
    <ul>
      <li>Preventivo valido fino al {{preventivo.dataScadenza}}</li>
      <li>Pagamento: 30 giorni dalla fattura</li>
      <li>Annullamento oltre 7gg prima: rimborso 50%</li>
    </ul>
  </div>
  
  <!-- FIRMA -->
  <div class="signature-section">
    <h4>Accettazione</h4>
    <div class="signature-line">
      <div class="sig-box">
        <div class="line"></div>
        <span>Luogo e Data</span>
      </div>
      <div class="sig-box">
        <div class="line"></div>
        <span>Firma per accettazione</span>
      </div>
    </div>
  </div>
  
  <!-- FOOTER -->
  <div class="footer">
    {{tenant.name}} - {{tenant.address}}, {{tenant.city}} - P.IVA {{tenant.vatNumber}}
  </div>
</body>
</html>`;

async function updateTemplates() {
    console.log('🔄 Aggiornamento template PREVENTIVO a v9...\n');

    try {
        // Trova tutti i template PREVENTIVO
        const templates = await prisma.templateLink.findMany({
            where: {
                type: 'PREVENTIVO',
                deletedAt: null
            },
            include: {
                tenant: true
            }
        });

        console.log('📋 Trovati ' + templates.length + ' template PREVENTIVO\n');

        for (const template of templates) {
            console.log('  Aggiornamento template per tenant: ' + (template.tenant?.name || template.tenantId));

            await prisma.templateLink.update({
                where: { id: template.id },
                data: {
                    content: TEMPLATE_V9,
                    version: 9,
                    updatedAt: new Date()
                }
            });

            console.log('  ✅ Template aggiornato a v9');
        }

        // Se non esistono template, creane uno di default
        if (templates.length === 0) {
            console.log('⚠️ Nessun template trovato. Creazione template di default...');

            // Trova i tenant attivi
            const tenants = await prisma.tenant.findMany({
                where: { deletedAt: null }
            });

            for (const tenant of tenants) {
                await prisma.templateLink.create({
                    data: {
                        tenantId: tenant.id,
                        type: 'PREVENTIVO',
                        name: 'Template Preventivo v9',
                        content: TEMPLATE_V9,
                        version: 9,
                        isActive: true
                    }
                });
                console.log('  ✅ Template creato per tenant: ' + tenant.name);
            }
        }

        console.log('\n✅ Aggiornamento completato!');
        console.log('\nCaratteristiche v9:');
        console.log('  • Layout ultra-compatto single-page');
        console.log('  • Font leggibili (9pt)');
        console.log('  • Spazi minimizzati');
        console.log('  • Tabella elegante con colori professionali');
        console.log('  • Prezzo originale visibile se scontato');
        console.log('  • Sconto con percentuale e importo');
        console.log('  • Condizioni compatte');

    } catch (error) {
        console.error('❌ Errore durante aggiornamento:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateTemplates();
