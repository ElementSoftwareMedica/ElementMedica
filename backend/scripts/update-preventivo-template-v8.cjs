/**
 * Script per aggiornare il template PREVENTIVO alla versione v8
 * Ottimizzazioni:
 * - Layout compatto single-page
 * - Font aumentato (9-10pt)
 * - Spazi bianchi ridotti
 * - Tabella voci professionale
 * - Sezione sconto condizionale
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TEMPLATE_V8 = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.3;
      color: #333;
      padding: 0;
    }
    
    .container {
      max-width: 100%;
      padding: 0;
    }
    
    /* HEADER */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    
    .logo-section {
      flex: 1;
    }
    
    .logo-section img {
      max-height: 45px;
      max-width: 150px;
    }
    
    .company-info {
      flex: 1;
      text-align: right;
      font-size: 8pt;
      color: #555;
    }
    
    .company-info strong {
      font-size: 10pt;
      color: #1e40af;
      display: block;
      margin-bottom: 2px;
    }
    
    /* TITLE */
    .document-title {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 10px 15px;
      margin-bottom: 12px;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .document-title h1 {
      font-size: 14pt;
      font-weight: 600;
      margin: 0;
    }
    
    .document-number {
      font-size: 10pt;
      opacity: 0.9;
    }
    
    /* TWO COLUMNS */
    .two-columns {
      display: flex;
      gap: 15px;
      margin-bottom: 12px;
    }
    
    .column {
      flex: 1;
    }
    
    /* INFO BOX */
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 8px 10px;
      margin-bottom: 8px;
    }
    
    .info-box h3 {
      font-size: 9pt;
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .info-box p {
      margin: 2px 0;
      font-size: 8.5pt;
    }
    
    .info-box p strong {
      color: #374151;
    }
    
    /* SERVICE SECTION */
    .service-section {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 4px;
      padding: 10px;
      margin-bottom: 12px;
    }
    
    .service-section h3 {
      font-size: 10pt;
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 6px;
    }
    
    .service-details {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .service-detail {
      flex: 1;
      min-width: 120px;
      font-size: 8.5pt;
    }
    
    .service-detail label {
      color: #6b7280;
      display: block;
      font-size: 7.5pt;
      text-transform: uppercase;
    }
    
    .service-detail span {
      font-weight: 500;
      color: #111827;
    }
    
    /* TABLE */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 8.5pt;
    }
    
    .items-table thead {
      background: #1e40af;
      color: white;
    }
    
    .items-table th {
      padding: 6px 8px;
      text-align: left;
      font-weight: 500;
      font-size: 8pt;
    }
    
    .items-table th:last-child,
    .items-table td:last-child {
      text-align: right;
    }
    
    .items-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .items-table tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    
    /* TOTALS */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 12px;
    }
    
    .totals-box {
      width: 240px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 10px;
      font-size: 8.5pt;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .total-row:last-child {
      border-bottom: none;
    }
    
    .total-row.discount {
      background: #fef3c7;
      color: #92400e;
    }
    
    .total-row.final {
      background: #1e40af;
      color: white;
      font-weight: 600;
      font-size: 10pt;
      padding: 8px 10px;
    }
    
    .total-row span:last-child {
      font-weight: 500;
    }
    
    /* CONDITIONS */
    .conditions {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 7.5pt;
      color: #6b7280;
    }
    
    .conditions h4 {
      font-size: 8pt;
      color: #374151;
      margin-bottom: 4px;
    }
    
    .conditions ul {
      margin: 0;
      padding-left: 15px;
    }
    
    .conditions li {
      margin: 2px 0;
    }
    
    /* NOTES */
    .notes {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 4px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 8pt;
    }
    
    .notes h4 {
      color: #92400e;
      margin-bottom: 3px;
      font-size: 8.5pt;
    }
    
    /* ACCEPTANCE */
    .acceptance {
      border: 2px dashed #2563eb;
      border-radius: 4px;
      padding: 10px;
      margin-bottom: 12px;
      text-align: center;
    }
    
    .acceptance h4 {
      color: #1e40af;
      margin-bottom: 4px;
      font-size: 9pt;
    }
    
    .acceptance p {
      font-size: 8pt;
      color: #6b7280;
      margin-bottom: 8px;
    }
    
    .signature-line {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
      padding-top: 20px;
    }
    
    .signature-box {
      width: 45%;
      text-align: center;
    }
    
    .signature-box .line {
      border-top: 1px solid #9ca3af;
      margin-bottom: 3px;
    }
    
    .signature-box span {
      font-size: 7.5pt;
      color: #6b7280;
    }
    
    /* FOOTER */
    .footer {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      font-size: 7pt;
      color: #9ca3af;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- HEADER -->
    <div class="header">
      <div class="logo-section">
        {{#if tenant.logoUrl}}
        <img src="{{tenant.logoUrl}}" alt="{{tenant.name}}">
        {{else}}
        <strong style="font-size: 14pt; color: #1e40af;">{{tenant.name}}</strong>
        {{/if}}
      </div>
      <div class="company-info">
        <strong>{{tenant.name}}</strong>
        {{tenant.address}}<br>
        {{tenant.city}} ({{tenant.province}})<br>
        P.IVA: {{tenant.vatNumber}}<br>
        {{tenant.email}} | {{tenant.phone}}
      </div>
    </div>
    
    <!-- TITLE -->
    <div class="document-title">
      <h1>PREVENTIVO</h1>
      <div class="document-number">
        N. {{preventivo.numero}}<br>
        <small>Data: {{preventivo.dataEmissione}}</small>
      </div>
    </div>
    
    <!-- CLIENT INFO -->
    <div class="two-columns">
      <div class="column">
        <div class="info-box">
          <h3>Destinatario</h3>
          <p><strong>{{cliente.nome}}</strong></p>
          {{#if cliente.partitaIva}}<p>P.IVA: {{cliente.partitaIva}}</p>{{/if}}
          {{#if cliente.codiceFiscale}}<p>C.F.: {{cliente.codiceFiscale}}</p>{{/if}}
          {{#if cliente.indirizzoCompleto}}<p>{{cliente.indirizzoCompleto}}</p>{{/if}}
          {{#if cliente.email}}<p>Email: {{cliente.email}}</p>{{/if}}
          {{#if cliente.telefono}}<p>Tel: {{cliente.telefono}}</p>{{/if}}
        </div>
      </div>
      <div class="column">
        <div class="info-box">
          <h3>Dettagli Preventivo</h3>
          <p><strong>Validità:</strong> {{preventivo.dataScadenza}}</p>
          <p><strong>Stato:</strong> {{preventivo.stato}}</p>
          <p><strong>Tipo Servizio:</strong> {{preventivo.tipoServizio}}</p>
          {{#if preventivo.partecipanti}}<p><strong>N. Partecipanti:</strong> {{preventivo.partecipanti}}</p>{{/if}}
        </div>
      </div>
    </div>
    
    <!-- SERVICE -->
    <div class="service-section">
      <h3>{{preventivo.titoloServizio}}</h3>
      {{#if corso}}
      <div class="service-details">
        <div class="service-detail">
          <label>Codice Corso</label>
          <span>{{corso.code}}</span>
        </div>
        <div class="service-detail">
          <label>Durata</label>
          <span>{{corso.duration}} ore</span>
        </div>
        <div class="service-detail">
          <label>Categoria</label>
          <span>{{corso.category}}</span>
        </div>
        {{#if corso.riskLevel}}
        <div class="service-detail">
          <label>Livello Rischio</label>
          <span>{{corso.riskLevel}}</span>
        </div>
        {{/if}}
      </div>
      {{/if}}
    </div>
    
    <!-- ITEMS TABLE -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%">Descrizione</th>
          <th style="width: 15%">Qtà</th>
          <th style="width: 17%">Prezzo Unit.</th>
          <th style="width: 18%">Totale</th>
        </tr>
      </thead>
      <tbody>
        {{#each voci}}
        <tr>
          <td>{{descrizione}}</td>
          <td>{{quantita}}</td>
          <td>€ {{prezzoUnitario}}</td>
          <td>€ {{subtotale}}</td>
        </tr>
        {{/each}}
        {{#if preventivo.speseAccessorie}}
        {{#unless (eq preventivo.speseAccessorie "0.00")}}
        <tr>
          <td>Spese accessorie</td>
          <td>1</td>
          <td>€ {{preventivo.speseAccessorie}}</td>
          <td>€ {{preventivo.speseAccessorie}}</td>
        </tr>
        {{/unless}}
        {{/if}}
      </tbody>
    </table>
    
    <!-- TOTALS -->
    <div class="totals-section">
      <div class="totals-box">
        <div class="total-row">
          <span>Subtotale</span>
          <span>€ {{preventivo.subtotale}}</span>
        </div>
        {{#if preventivo.scontoApplicato}}
        <div class="total-row discount">
          <span>Sconto {{#if preventivo.scontoCodice}}({{preventivo.scontoCodice}}){{/if}}</span>
          <span>- € {{preventivo.importoSconto}}</span>
        </div>
        {{/if}}
        <div class="total-row">
          <span>Imponibile</span>
          <span>€ {{preventivo.imponibile}}</span>
        </div>
        <div class="total-row">
          <span>IVA ({{preventivo.percentualeIva}}%)</span>
          <span>€ {{preventivo.importoIva}}</span>
        </div>
        <div class="total-row final">
          <span>TOTALE</span>
          <span>€ {{preventivo.importoFinale}}</span>
        </div>
      </div>
    </div>
    
    {{#if preventivo.note}}
    <!-- NOTES -->
    <div class="notes">
      <h4>Note</h4>
      <p>{{preventivo.note}}</p>
    </div>
    {{/if}}
    
    <!-- CONDITIONS -->
    <div class="conditions">
      <h4>Condizioni</h4>
      <ul>
        <li>Il presente preventivo ha validità fino al {{preventivo.dataScadenza}}</li>
        <li>I prezzi indicati sono espressi in Euro</li>
        <li>Pagamento: entro 30 giorni dalla data della fattura</li>
        <li>In caso di annullamento oltre 7 giorni prima, rimborso del 50%</li>
      </ul>
    </div>
    
    <!-- ACCEPTANCE -->
    <div class="acceptance">
      <h4>Accettazione Preventivo</h4>
      <p>Con la firma del presente documento si accettano integralmente le condizioni sopra riportate.</p>
      <div class="signature-line">
        <div class="signature-box">
          <div class="line"></div>
          <span>Luogo e Data</span>
        </div>
        <div class="signature-box">
          <div class="line"></div>
          <span>Firma per accettazione</span>
        </div>
      </div>
    </div>
    
    <!-- FOOTER -->
    <div class="footer">
      {{tenant.name}} - {{tenant.address}}, {{tenant.city}} - P.IVA {{tenant.vatNumber}} - {{tenant.email}}
    </div>
  </div>
</body>
</html>`;

async function updateTemplates() {
    console.log('🔄 Aggiornamento template PREVENTIVO a v8...\n');

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
                    content: TEMPLATE_V8,
                    version: 8,
                    updatedAt: new Date()
                }
            });

            console.log('  ✅ Template aggiornato a v8');
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
                        name: 'Template Preventivo v8',
                        content: TEMPLATE_V8,
                        version: 8,
                        isActive: true
                    }
                });
                console.log('  ✅ Template creato per tenant: ' + tenant.name);
            }
        }

        console.log('\n✅ Aggiornamento completato!');
        console.log('\nCaratteristiche v8:');
        console.log('  • Layout compatto single-page');
        console.log('  • Font aumentato (9-10pt)');
        console.log('  • Spazi bianchi ridotti');
        console.log('  • Tabella voci professionale');
        console.log('  • Sezione sconto condizionale');
        console.log('  • Supporto alias cliente');

    } catch (error) {
        console.error('❌ Errore durante aggiornamento:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateTemplates();
