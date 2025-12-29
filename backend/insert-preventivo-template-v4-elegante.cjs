/**
 * Script per creare template Preventivo V4 - ELEGANTE SENZA GRIGIO
 * 
 * MIGLIORAMENTI V4:
 * - Rimosso completamente #f1f5f9 (grigio)
 * - Bordi arrotondati 12px sulla tabella
 * - Subtotal: gradient azzurro chiaro elegante
 * - Total: gradient blu vibrante più evidente
 * - Footer: azzurro chiaro invece di grigio
 * - Hover effect più raffinato
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
    
    /* Tabella prezzi - ELEGANTE SENZA GRIGIO */
    .price-table { 
      width: 100%; 
      border-collapse: separate; 
      border-spacing: 0; 
      margin: 8px 0; 
      box-shadow: 0 10px 25px rgba(37, 99, 235, 0.15), 0 4px 10px rgba(0, 0, 0, 0.08); 
      border-radius: 12px; 
      overflow: hidden; 
      border: none;
    }
    
    .price-table thead { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; }
    .price-table th { padding: 7px 10px; text-align: left; font-weight: 700; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.3px; }
    .price-table th:nth-child(2) { text-align: center; width: 80px; }
    .price-table th:nth-child(3) { text-align: right; width: 90px; }
    .price-table th:last-child { text-align: right; }
    
    /* Righe normali - BIANCO PURO */
    .price-table tbody tr { 
      background: white; 
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
    }
    .price-table tbody tr:hover { 
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); 
      transform: translateX(3px); 
      box-shadow: inset 4px 0 0 #3b82f6; 
    }
    
    .price-table td { padding: 8px 12px; border-bottom: 1px solid #e0e7ff; font-size: 8pt; }
    .price-table tbody tr:last-child td { border-bottom: none; }
    .price-table td.label { color: #374151; font-weight: 500; }
    .price-table td.qty { text-align: center; font-family: 'Courier New', monospace; font-weight: 600; color: #475569; }
    .price-table td.unit-price { text-align: right; font-family: 'Courier New', monospace; font-weight: 500; color: #64748b; font-size: 7.5pt; }
    .price-table td.value { text-align: right; font-family: 'Courier New', monospace; font-weight: 600; color: #0f172a; }
    
    /* Riga sconto - VERDE */
    .price-table tr.discount { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%) !important; }
    .price-table tr.discount td { color: #059669; font-weight: 600; }
    
    /* Riga subtotal - AZZURRO CHIARO ELEGANTE (NO GRIGIO) */
    .price-table tr.subtotal { 
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #eff6ff 100%) !important; 
      border-top: 2px solid #93c5fd; 
    }
    .price-table tr.subtotal td { font-weight: 700; color: #1e40af; padding-top: 8px; }
    
    /* Riga total - BLU VIBRANTE */
    .price-table tr.total { 
      background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #1e40af 100%) !important; 
    }
    .price-table tr.total td { 
      border-top: none; 
      border-bottom: none; 
      padding: 10px 12px; 
      font-size: 9.5pt; 
      color: white; 
      font-weight: 700; 
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); 
    }
    .price-table tr.total td.value { font-size: 11pt; letter-spacing: 0.3px; }
    
    /* Note - COMPATTE */
    .notes-section { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 8px 10px; border-radius: 3px; margin-top: 3px; }
    .notes-section .section-title { color: #b45309; border-bottom-color: #fde047; margin-bottom: 5px; font-size: 8pt; }
    .notes-section p { font-size: 7.5pt; color: #78350f; line-height: 1.5; }
    
    /* Footer - AZZURRO CHIARO (NO GRIGIO) */
    .footer { 
      margin-top: 14px; 
      padding: 10px 18px; 
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); 
      border-top: 2px solid #93c5fd; 
      font-size: 6.5pt; 
      color: #0c4a6e; 
      border-radius: 0 0 6px 6px;
    }
    .footer p { margin-bottom: 2px; line-height: 1.3; }
    .footer strong { color: #075985; }
    
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
          <span class="info-label">P.IVA / C.F.</span>
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
    
    <!-- Dettagli Corso (se servizio CORSO) -->
    <div class="section">
      <div class="section-title">Dettagli Servizio</div>
      <div class="course-details">
        <p><strong>Tipologia:</strong> {{preventivo.tipoServizio}}</p>
        {{#if course.title}}
        <p><strong>Corso:</strong> {{course.title}}</p>
        <p><strong>Durata:</strong> {{course.duration}} ore</p>
        <p><strong>Livello Rischio:</strong> {{course.riskLevel}}</p>
        <p><strong>Tipo Corso:</strong> {{course.courseType}}</p>
        <p><strong>Normativa:</strong> {{course.regulation}}</p>
        {{/if}}
        <p><strong>Partecipanti:</strong> {{preventivo.numPartecipanti}}</p>
      </div>
    </div>
    
    <!-- Riepilogo Economico -->
    <div class="section">
      <div class="section-title">Riepilogo Economico</div>
      <table class="price-table">
        <thead>
          <tr>
            <th>Descrizione</th>
            <th>Quantità</th>
            <th>Prezzo Unit.</th>
            <th>Totale</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="label">{{preventivo.tipoServizio}} - {{#if course.title}}{{course.title}}{{/if}}</td>
            <td class="qty">{{preventivo.numPartecipanti}}</td>
            <td class="unit-price">€ {{preventivo.prezzoUnitario}}</td>
            <td class="value">€ {{preventivo.prezzoTotale}}</td>
          </tr>
          {{#if preventivo.speseAccessorie}}
          <tr>
            <td class="label">Spese accessorie</td>
            <td class="qty">-</td>
            <td class="unit-price">-</td>
            <td class="value">€ {{preventivo.speseAccessorie}}</td>
          </tr>
          {{/if}}
          {{#if preventivo.scontoApplicato}}
          <tr class="discount">
            <td class="label">Sconto applicato</td>
            <td class="qty">-</td>
            <td class="unit-price">-</td>
            <td class="value">- € {{preventivo.importoSconto}}</td>
          </tr>
          {{/if}}
          <tr class="subtotal">
            <td colspan="3" class="label">Imponibile</td>
            <td class="value">€ {{preventivo.imponibile}}</td>
          </tr>
          <tr class="subtotal">
            <td colspan="3" class="label">IVA ({{preventivo.percentualeIva}}%)</td>
            <td class="value">€ {{preventivo.importoIva}}</td>
          </tr>
          <tr class="total">
            <td colspan="3" class="label">TOTALE PREVENTIVO</td>
            <td class="value">€ {{preventivo.importoFinale}}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Note (SOLO se compilato) -->
    {{#if preventivo.note}}
    <div class="section">
      <div class="notes-section">
        <div class="section-title">Note</div>
        <p>{{preventivo.note}}</p>
      </div>
    </div>
    {{/if}}
    
    <!-- Footer -->
    <div class="footer">
      <p><strong>Validità Offerta:</strong> Il presente preventivo è valido fino al {{preventivo.dataScadenza}}</p>
      <p><strong>Condizioni di Pagamento:</strong> Da concordare</p>
      <p><strong>Documento generato il:</strong> {{current.date}} alle ore {{current.time}}</p>
    </div>
  </div>
</body>
</html>`;

(async () => {
    try {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 CREAZIONE TEMPLATE PREVENTIVO V4 - ELEGANTE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 1. Disattiva template V3 precedente
        const updated = await prisma.templateLink.updateMany({
            where: {
                type: 'PREVENTIVO',
                tenantId: TENANT_ID,
                isActive: true,
                deletedAt: null
            },
            data: {
                isActive: false,
                isDefault: false
            }
        });

        console.log(`✅ Disattivati ${updated.count} template V3 precedenti\n`);

        // 2. Crea template V4
        const template = await prisma.templateLink.create({
            data: {
                name: 'Preventivo Elegante V4',
                type: 'PREVENTIVO',
                content: templateHTML,
                url: '/templates/preventivo-v4.html',
                version: 4,
                isActive: true,
                isDefault: true,
                fileFormat: 'HTML',
                description: 'Template preventivo elegante senza grigio - bordi arrotondati, gradient azzurri, footer azzurro chiaro',
                category: 'COMMERCIALE',
                tags: ['preventivo', 'commerciale', 'elegante', 'v4'],
                tenantId: TENANT_ID
            }
        });

        console.log('✅ Template V4 creato con successo!\n');
        console.log(`ID: ${template.id}`);
        console.log(`Nome: ${template.name}`);
        console.log(`Versione: ${template.version}`);
        console.log(`isActive: ${template.isActive}`);
        console.log(`isDefault: ${template.isDefault}`);
        console.log(`Content: ${template.content.length} caratteri\n`);

        // 3. Verifica CSS
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 VERIFICA CSS (ricerca #f1f5f9):');

        const grayCount = (template.content.match(/f1f5f9/gi) || []).length;
        console.log(`\nRisultato: ${grayCount === 0 ? '✅ NESSUN GRIGIO #f1f5f9' : '❌ Trovato ' + grayCount + ' occorrenze'}\n`);

        // 4. Verifica gradient eleganti
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎨 CSS APPLICATO:\n');
        console.log('Subtotal: linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #eff6ff 100%)');
        console.log('Total: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #1e40af 100%) + white text');
        console.log('Footer: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)\n');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ TEMPLATE V4 ATTIVO E PRONTO ALL\'USO');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        await prisma.$disconnect();
    } catch (error) {
        console.error('\n❌ ERRORE:', error.message);
        console.error(error.stack);
        await prisma.$disconnect();
        process.exit(1);
    }
})();
