/**
 * Script per aggiornare template Preventivo con design elegante e professionale
 * Versione 2: Layout moderno, dati azienda mittente, tutto in una pagina
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TENANT_ID = 'eddd074c-c202-4700-b4c3-8632d6ea3219'; // Element Medica Default

const templateHTML = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Preventivo {{preventivo.numeroProgressivo}}/{{preventivo.annoProgressivo}}</title>
  <style>
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      font-size: 9.5pt; 
      line-height: 1.5; 
      color: #1a1a1a; 
      background: white;
    }
    
    .container {
      max-width: 750px;
      margin: 0 auto;
      padding: 0;
    }
    
    /* Header azienda mittente */
    .company-header {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 18px 24px;
      border-radius: 8px 8px 0 0;
      margin-bottom: 0;
    }
    
    .company-header h1 {
      font-size: 16pt;
      font-weight: 700;
      margin-bottom: 6px;
      letter-spacing: 0.3px;
    }
    
    .company-header .company-details {
      font-size: 8pt;
      opacity: 0.95;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 8px;
    }
    
    .company-header .company-details span {
      display: inline-flex;
      align-items: center;
    }
    
    /* Header documento */
    .doc-header {
      background: #f8fafc;
      border-left: 4px solid #2563eb;
      padding: 14px 24px;
      margin-bottom: 20px;
    }
    
    .doc-header h2 {
      color: #1e40af;
      font-size: 14pt;
      font-weight: 600;
      margin-bottom: 6px;
    }
    
    .doc-meta {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 8.5pt;
      color: #475569;
    }
    
    /* Sezioni */
    .section {
      margin-bottom: 16px;
      padding: 0 24px;
    }
    
    .section-title {
      font-size: 10pt;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 2px solid #e2e8f0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Griglia informazioni destinatario */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px 16px;
      background: #f9fafb;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .info-label {
      font-weight: 700;
      color: #64748b;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .info-value {
      font-size: 9pt;
      color: #0f172a;
      font-weight: 500;
    }
    
    /* Dettagli corso */
    .course-details {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 12px 14px;
    }
    
    .course-details p {
      margin-bottom: 6px;
      font-size: 9pt;
    }
    
    .course-details strong {
      color: #1e40af;
      font-weight: 700;
      display: inline-block;
      min-width: 110px;
    }
    
    /* Tabella prezzi moderna */
    .price-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 12px 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .price-table thead {
      background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
      color: white;
    }
    
    .price-table th {
      padding: 10px 12px;
      text-align: left;
      font-weight: 700;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .price-table th:last-child {
      text-align: right;
    }
    
    .price-table tbody tr {
      background: white;
      transition: background 0.2s;
    }
    
    .price-table tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .price-table td {
      padding: 9px 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 9pt;
    }
    
    .price-table td.label {
      color: #374151;
      font-weight: 500;
    }
    
    .price-table td.value {
      text-align: right;
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: #0f172a;
    }
    
    .price-table tr.discount {
      background: #ecfdf5 !important;
    }
    
    .price-table tr.discount td {
      color: #059669;
      font-weight: 600;
    }
    
    .price-table tr.total {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%) !important;
      font-weight: 700;
    }
    
    .price-table tr.total td {
      border-top: 3px solid #2563eb;
      border-bottom: none;
      padding: 12px;
      font-size: 10pt;
      color: #1e40af;
    }
    
    .price-table tr.total td.value {
      font-size: 12pt;
      color: #1e40af;
    }
    
    /* Note */
    .notes-section {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 12px 14px;
      border-radius: 4px;
      margin-top: 4px;
    }
    
    .notes-section .section-title {
      color: #b45309;
      border-bottom-color: #fde047;
      margin-bottom: 8px;
      font-size: 9pt;
    }
    
    .notes-section p {
      font-size: 8.5pt;
      color: #78350f;
      line-height: 1.6;
    }
    
    /* Footer */
    .footer {
      margin-top: 24px;
      padding: 14px 24px;
      background: #f1f5f9;
      border-top: 2px solid #cbd5e1;
      font-size: 7.5pt;
      color: #64748b;
    }
    
    .footer p {
      margin-bottom: 3px;
      line-height: 1.4;
    }
    
    .footer strong {
      color: #334155;
    }
    
    /* Badge stato */
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .badge.bozza {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fbbf24;
    }
    
    .badge.inviato {
      background: #dbeafe;
      color: #1e40af;
      border: 1px solid #3b82f6;
    }
    
    .badge.accettato {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #10b981;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header Azienda Mittente -->
    <div class="company-header">
      <h1>Element Medica Training S.r.l.</h1>
      <div class="company-details">
        <span>📍 Via Example 123, 20100 Milano (MI)</span>
        <span>📧 info@elementmedica.it</span>
        <span>📞 +39 02 1234567</span>
        <span>P.IVA: 12345678901</span>
      </div>
    </div>
    
    <!-- Header Documento -->
    <div class="doc-header">
      <h2>Preventivo N° {{preventivo.numeroProgressivo}}/{{preventivo.annoProgressivo}}</h2>
      <div class="doc-meta">
        <span><strong>Data Emissione:</strong> {{preventivo.dataEmissione}}</span>
        <span><strong>Valido fino al:</strong> {{preventivo.dataScadenza}}</span>
        <span class="badge {{preventivo.stato}}">{{preventivo.stato}}</span>
      </div>
    </div>
    
    <!-- Destinatario -->
    <div class="section">
      <div class="section-title">Spett.le Cliente</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Ragione Sociale</span>
          <span class="info-value">{{company.name}}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Partita IVA</span>
          <span class="info-value">{{company.vatNumber}}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Codice Fiscale</span>
          <span class="info-value">{{company.fiscalCode}}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Email</span>
          <span class="info-value">{{company.email}}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Indirizzo</span>
          <span class="info-value">{{company.address.full}}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Telefono</span>
          <span class="info-value">{{company.phone}}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Rappresentante Legale</span>
          <span class="info-value">{{company.legalRepresentative}}</span>
        </div>
        <div class="info-item">
          <span class="info-label">N° Partecipanti</span>
          <span class="info-value">{{preventivo.numPartecipanti}}</span>
        </div>
      </div>
    </div>
    
    <!-- Dettagli Servizio/Corso -->
    <div class="section">
      <div class="section-title">Dettagli Servizio</div>
      <div class="course-details">
        <p><strong>Tipo Servizio:</strong> {{preventivo.tipoServizio}}</p>
        {{#if course.title}}
        <p><strong>Corso:</strong> {{course.title}}</p>
        <p><strong>Codice Corso:</strong> {{course.code}}</p>
        <p><strong>Durata:</strong> {{course.duration}} ore</p>
        <p><strong>Categoria:</strong> {{course.category}}</p>
        <p><strong>Normativa:</strong> {{course.regulation}}</p>
        {{/if}}
      </div>
    </div>
    
    <!-- Riepilogo Economico -->
    <div class="section">
      <div class="section-title">Riepilogo Economico</div>
      <table class="price-table">
        <thead>
          <tr>
            <th>Descrizione</th>
            <th>Importo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="label">Importo Base Servizio</td>
            <td class="value">€ {{preventivo.prezzoTotale}}</td>
          </tr>
          {{#if preventivo.speseAccessorie}}
          <tr>
            <td class="label">Spese Accessorie</td>
            <td class="value">€ {{preventivo.speseAccessorie}}</td>
          </tr>
          {{/if}}
          {{#if preventivo.scontoApplicato}}
          <tr class="discount">
            <td class="label">Sconto Applicato {{#if preventivo.scontoPercentuale}}({{preventivo.scontoPercentuale}}%){{/if}}</td>
            <td class="value">- € {{preventivo.importoSconto}}</td>
          </tr>
          {{/if}}
          <tr>
            <td class="label">Imponibile</td>
            <td class="value">€ {{preventivo.imponibile}}</td>
          </tr>
          <tr>
            <td class="label">IVA ({{preventivo.percentualeIva}}%)</td>
            <td class="value">€ {{preventivo.importoIva}}</td>
          </tr>
          <tr class="total">
            <td class="label">TOTALE PREVENTIVO</td>
            <td class="value">€ {{preventivo.importoFinale}}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Note (solo se presenti) -->
    {{#if preventivo.note}}
    <div class="section">
      <div class="notes-section">
        <div class="section-title">📌 Note Aggiuntive</div>
        <p>{{preventivo.note}}</p>
      </div>
    </div>
    {{/if}}
    
    <!-- Footer -->
    <div class="footer">
      <p><strong>Condizioni di Validità:</strong> Preventivo valido fino al {{preventivo.dataScadenza}}. Prezzi IVA esclusa salvo diversa indicazione.</p>
      <p><strong>Modalità di Pagamento:</strong> Bonifico bancario a ricevimento fattura. IBAN: IT00X0000000000000000000000</p>
      <p><strong>Note Legali:</strong> Il presente preventivo è soggetto alle Condizioni Generali di Vendita disponibili sul sito elementmedica.it</p>
      <p style="margin-top: 8px; color: #94a3b8;"><em>Documento generato automaticamente il {{current.date}} alle ore {{current.time}}</em></p>
    </div>
  </div>
</body>
</html>`;

async function updateTemplate() {
    try {
        console.log('🔍 Verifico tenant...');
        const tenant = await prisma.tenant.findUnique({
            where: { id: TENANT_ID }
        });

        if (!tenant) {
            console.error(`❌ Tenant ${TENANT_ID} non trovato!`);
            process.exit(1);
        }

        console.log(`✅ Tenant trovato: ${tenant.name}`);

        console.log('🔄 Disattivo vecchi template PREVENTIVO...');
        await prisma.templateLink.updateMany({
            where: {
                tenantId: TENANT_ID,
                type: 'PREVENTIVO',
                isActive: true
            },
            data: {
                isActive: false,
                isDefault: false
            }
        });

        console.log('📝 Inserisco nuovo template V2 (Design Professionale)...');
        const template = await prisma.templateLink.create({
            data: {
                tenantId: TENANT_ID,
                name: 'Preventivo Professionale V2',
                url: '',
                content: templateHTML,
                header: '',
                footer: '',
                type: 'PREVENTIVO',
                fileFormat: 'HTML',
                category: 'FINANCIAL',
                description: 'Template preventivo con design moderno, dati azienda mittente, layout elegante tutto in una pagina. Include gestione condizionale Note e Sconto.',
                version: 2,
                isActive: true,
                isDefault: true,
                syncEnabled: false,
                markers: {
                    preventivo: ['numeroProgressivo', 'annoProgressivo', 'dataEmissione', 'dataScadenza', 'stato', 'tipoServizio', 'prezzoTotale', 'speseAccessorie', 'importoSconto', 'scontoApplicato', 'scontoPercentuale', 'imponibile', 'percentualeIva', 'importoIva', 'importoFinale', 'note', 'numPartecipanti'],
                    company: ['name', 'vatNumber', 'fiscalCode', 'email', 'phone', 'address.full', 'legalRepresentative'],
                    course: ['title', 'code', 'duration', 'category', 'regulation'],
                    current: ['date', 'time']
                },
                tags: ['preventivo', 'financial', 'pdf', 'v2', 'professionale']
            }
        });

        console.log('✅ Template V2 inserito con successo!');
        console.log(`   ID: ${template.id}`);
        console.log(`   Nome: ${template.name}`);
        console.log(`   Versione: ${template.version}`);
        console.log(`   Tipo: ${template.type}`);
        console.log(`   Dimensione HTML: ${templateHTML.length} caratteri`);
        console.log('\n📋 Features:');
        console.log('   ✅ Header con dati azienda mittente (Element Medica)');
        console.log('   ✅ Design moderno con colori gradient');
        console.log('   ✅ Tabella prezzi elegante con ombreggiature');
        console.log('   ✅ Dati destinatario completi (8 campi)');
        console.log('   ✅ Dettagli corso arricchiti (durata, categoria, normativa)');
        console.log('   ✅ Note condizionali ({{#if preventivo.note}})');
        console.log('   ✅ Sconto condizionale ({{#if preventivo.scontoApplicato}})');
        console.log('   ✅ Footer con note legali e condizioni');
        console.log('   ✅ Tutto in una pagina A4');

    } catch (error) {
        console.error('❌ Errore:', error.message);
        if (error.code) console.error('   Codice:', error.code);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

updateTemplate().catch((error) => {
    console.error('💥 Script fallito:', error);
    process.exit(1);
});
