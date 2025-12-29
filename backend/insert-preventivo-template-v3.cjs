/**
 * Script per aggiornare template Preventivo V3 - COMPATTO E ELEGANTE
 * - Tutto in 1 pagina (ridotti font, padding, margini)
 * - RiskLevel e CourseType invece di Codice/Categoria
 * - Tabella prezzi più elegante con colori migliorati
 * - Prezzo unitario chiaro
 * - Note SOLO se compilato (non mostra dettagli corso)
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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      font-size: 8.5pt; 
      line-height: 1.3; 
      color: #1a1a1a; 
      background: white;
    }
    
    .container { max-width: 750px; margin: 0 auto; padding: 0; }
    
    /* Header azienda mittente - COMPATTO */
    .company-header {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 12px 18px;
      border-radius: 6px 6px 0 0;
      margin-bottom: 0;
    }
    
    .company-header h1 { font-size: 13pt; font-weight: 700; margin-bottom: 4px; letter-spacing: 0.2px; }
    .company-header .company-details { font-size: 7pt; opacity: 0.95; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; }
    .company-header .company-details span { display: inline-flex; align-items: center; }
    
    /* Header documento - COMPATTO */
    .doc-header { background: #f8fafc; border-left: 3px solid #2563eb; padding: 10px 18px; margin-bottom: 12px; }
    .doc-header h2 { color: #1e40af; font-size: 11pt; font-weight: 600; margin-bottom: 4px; }
    .doc-meta { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; font-size: 7.5pt; color: #475569; }
    
    /* Sezioni - COMPATTE */
    .section { margin-bottom: 10px; padding: 0 18px; }
    .section-title { font-size: 9pt; font-weight: 700; color: #1e40af; margin-bottom: 6px; padding-bottom: 2px; border-bottom: 1.5px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.4px; }
    
    /* Griglia destinatario - COMPATTA */
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 12px; background: #f9fafb; padding: 8px; border-radius: 4px; border: 1px solid #e5e7eb; }
    .info-item { display: flex; flex-direction: column; gap: 1px; }
    .info-label { font-weight: 700; color: #64748b; font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.2px; }
    .info-value { font-size: 8pt; color: #0f172a; font-weight: 500; }
    
    /* Dettagli corso - COMPATTI */
    .course-details { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 8px 10px; }
    .course-details p { margin-bottom: 4px; font-size: 8pt; }
    .course-details strong { color: #1e40af; font-weight: 700; display: inline-block; min-width: 90px; }
    
    /* Tabella prezzi - ELEGANTE E COMPATTA */
    .price-table { 
      width: 100%; 
      border-collapse: separate; 
      border-spacing: 0; 
      margin: 8px 0; 
      box-shadow: 0 8px 16px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1); 
      border-radius: 12px; 
      overflow: hidden; 
      border: none;
    }
    .price-table thead { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; }
    .price-table th { padding: 7px 10px; text-align: left; font-weight: 700; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.3px; }
    .price-table th:nth-child(2) { text-align: center; width: 80px; }
    .price-table th:nth-child(3) { text-align: right; width: 90px; }
    .price-table th:last-child { text-align: right; }
    
    .price-table tbody tr { background: white; transition: all 0.2s ease; }
    .price-table tbody tr:hover { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); transform: translateX(2px); box-shadow: inset 3px 0 0 #3b82f6; }
    
    .price-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 8pt; }
    .price-table tbody tr:last-child td { border-bottom: none; }
    .price-table td.label { color: #374151; font-weight: 500; }
    .price-table td.qty { text-align: center; font-family: 'Courier New', monospace; font-weight: 600; color: #475569; }
    .price-table td.unit-price { text-align: right; font-family: 'Courier New', monospace; font-weight: 500; color: #64748b; font-size: 7.5pt; }
    .price-table td.value { text-align: right; font-family: 'Courier New', monospace; font-weight: 600; color: #0f172a; }
    
    .price-table tr.discount { background: #ecfdf5 !important; }
    .price-table tr.discount td { color: #059669; font-weight: 600; }
    
    .price-table tr.subtotal { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%) !important; border-top: 2px solid #cbd5e1; }
    .price-table tr.subtotal td { font-weight: 700; color: #1e40af; padding-top: 8px; }
    
    .price-table tr.total { background: linear-gradient(135deg, #dbeafe 0%, #93c5fd 50%, #dbeafe 100%) !important; }
    .price-table tr.total td { border-top: 3px solid #2563eb; border-bottom: none; padding: 8px 10px; font-size: 9pt; color: #1e3a8a; font-weight: 700; text-shadow: 0 1px 2px rgba(255,255,255,0.5); }
    .price-table tr.total td.value { font-size: 10pt; }
    
    /* Note - COMPATTE */
    .notes-section { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 8px 10px; border-radius: 3px; margin-top: 3px; }
    .notes-section .section-title { color: #b45309; border-bottom-color: #fde047; margin-bottom: 5px; font-size: 8pt; }
    .notes-section p { font-size: 7.5pt; color: #78350f; line-height: 1.5; }
    
    /* Footer - COMPATTO */
    .footer { margin-top: 14px; padding: 10px 18px; background: #f1f5f9; border-top: 2px solid #cbd5e1; font-size: 6.5pt; color: #64748b; }
    .footer p { margin-bottom: 2px; line-height: 1.3; }
    .footer strong { color: #334155; }
    
    /* Badge stato */
    .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
    .badge.bozza { background: #fef3c7; color: #92400e; border: 1px solid #fbbf24; }
    .badge.inviato { background: #dbeafe; color: #1e40af; border: 1px solid #3b82f6; }
    .badge.accettato { background: #d1fae5; color: #065f46; border: 1px solid #10b981; }
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
          <span class="info-label">Indirizzo</span>
          <span class="info-value">{{company.address.full}}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Email</span>
          <span class="info-value">{{company.email}}</span>
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
        <p><strong>Durata:</strong> {{course.duration}} ore</p>
        <p><strong>Livello Rischio:</strong> {{course.riskLevel}}</p>
        <p><strong>Tipo Corso:</strong> {{course.courseType}}</p>
        <p><strong>Normativa:</strong> {{course.regulation}}</p>
        {{/if}}
        <p><strong>N° Partecipanti:</strong> {{preventivo.numPartecipanti}}</p>
      </div>
    </div>
    
    <!-- Riepilogo Economico - ELEGANTE -->
    <div class="section">
      <div class="section-title">Riepilogo Economico</div>
      <table class="price-table">
        <thead>
          <tr>
            <th>Descrizione</th>
            <th>Q.tà</th>
            <th>Prezzo Unit.</th>
            <th>Importo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="label">{{preventivo.tipoServizio}}{{#if course.title}} - {{course.title}}{{/if}}</td>
            <td class="qty">{{preventivo.numPartecipanti}}</td>
            <td class="unit-price">€ {{preventivo.prezzoUnitario}}</td>
            <td class="value">€ {{preventivo.prezzoTotale}}</td>
          </tr>
          {{#if preventivo.speseAccessorie}}
          <tr>
            <td class="label">Spese Accessorie</td>
            <td class="qty">1</td>
            <td class="unit-price">€ {{preventivo.speseAccessorie}}</td>
            <td class="value">€ {{preventivo.speseAccessorie}}</td>
          </tr>
          {{/if}}
          {{#if preventivo.scontoApplicato}}
          <tr class="discount">
            <td class="label">Sconto Applicato {{#if preventivo.scontoPercentuale}}({{preventivo.scontoPercentuale}}%){{/if}}</td>
            <td class="qty">-</td>
            <td class="unit-price">-</td>
            <td class="value">- € {{preventivo.importoSconto}}</td>
          </tr>
          {{/if}}
          <tr class="subtotal">
            <td class="label">Imponibile</td>
            <td class="qty"></td>
            <td class="unit-price"></td>
            <td class="value">€ {{preventivo.imponibile}}</td>
          </tr>
          <tr>
            <td class="label">IVA ({{preventivo.percentualeIva}}%)</td>
            <td class="qty"></td>
            <td class="unit-price"></td>
            <td class="value">€ {{preventivo.importoIva}}</td>
          </tr>
          <tr class="total">
            <td class="label">TOTALE PREVENTIVO</td>
            <td class="qty"></td>
            <td class="unit-price"></td>
            <td class="value">€ {{preventivo.importoFinale}}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Note (solo se COMPILATE dall'utente) -->
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
      <p><strong>Condizioni:</strong> Preventivo valido fino al {{preventivo.dataScadenza}}. Prezzi IVA esclusa. Pagamento: bonifico a ricevimento fattura. IBAN: IT00X0000000000000000000000</p>
      <p><em>Documento generato il {{current.date}} alle {{current.time}}</em></p>
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

        console.log('📝 Inserisco nuovo template V3 (COMPATTO)...');
        const template = await prisma.templateLink.create({
            data: {
                tenantId: TENANT_ID,
                name: 'Preventivo Compatto V3',
                url: '',
                content: templateHTML,
                header: '',
                footer: '',
                type: 'PREVENTIVO',
                fileFormat: 'HTML',
                category: 'FINANCIAL',
                description: 'Template preventivo V3: compatto (tutto in 1 pagina), tabella elegante con prezzo unitario, riskLevel e courseType, Note solo se compilate.',
                version: 3,
                isActive: true,
                isDefault: true,
                syncEnabled: false,
                markers: {
                    preventivo: ['numeroProgressivo', 'annoProgressivo', 'dataEmissione', 'dataScadenza', 'stato', 'tipoServizio', 'prezzoTotale', 'prezzoUnitario', 'speseAccessorie', 'importoSconto', 'scontoApplicato', 'scontoPercentuale', 'imponibile', 'percentualeIva', 'importoIva', 'importoFinale', 'note', 'numPartecipanti'],
                    company: ['name', 'vatNumber', 'fiscalCode', 'email', 'phone', 'address.full', 'legalRepresentative'],
                    course: ['title', 'duration', 'riskLevel', 'courseType', 'regulation'],
                    current: ['date', 'time']
                },
                tags: ['preventivo', 'financial', 'pdf', 'v3', 'compatto', 'elegante']
            }
        });

        console.log('✅ Template V3 inserito con successo!');
        console.log(`   ID: ${template.id}`);
        console.log(`   Nome: ${template.name}`);
        console.log(`   Versione: ${template.version}`);
        console.log(`   Dimensione HTML: ${templateHTML.length} caratteri`);
        console.log('\n📋 Features V3:');
        console.log('   ✅ COMPATTO: tutto in 1 pagina (font 8-8.5pt, padding ridotti)');
        console.log('   ✅ Tabella 4 colonne: Descrizione, Q.tà, Prezzo Unit., Importo');
        console.log('   ✅ Prezzo unitario chiaro in colonna dedicata');
        console.log('   ✅ Colori eleganti: header blu scuro, subtotal grigio, total gradient azzurro');
        console.log('   ✅ RiskLevel + CourseType (NO Codice/Categoria)');
        console.log('   ✅ Note SOLO se preventivo.note compilato');
        console.log('   ✅ Destinatario compatto 4 campi (Ragione, P.IVA, Indirizzo, Email)');

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
