/**
 * Script per creare template Preventivo V5 - ULTRA ELEGANTE E LEGGIBILE
 * 
 * MIGLIORAMENTI V5 vs V4:
 * - Header tabella: font 9pt (vs 8pt), colore più chiaro per leggibilità
 * - Shadow: sottile e discreta (vs pesante)
 * - Layout: più pulito, spaziatura migliorata
 * - Bordi: più sottili e raffinati
 * - Total: background più sofisticato con sfumatura delicata
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
    
    /* Header azienda mittente */
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
    
    /* Header documento */
    .doc-header { background: #f8fafc; border-left: 3px solid #2563eb; padding: 10px 18px; margin-bottom: 12px; }
    .doc-header h2 { color: #1e40af; font-size: 11pt; font-weight: 600; margin-bottom: 4px; }
    .doc-meta { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; font-size: 7.5pt; color: #475569; }
    
    /* Sezioni */
    .section { margin-bottom: 10px; padding: 0 18px; }
    .section-title { font-size: 9pt; font-weight: 700; color: #1e40af; margin-bottom: 6px; padding-bottom: 2px; border-bottom: 1.5px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.4px; }
    
    /* Griglia destinatario */
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 12px; background: #f9fafb; padding: 8px; border-radius: 4px; border: 1px solid #e5e7eb; }
    .info-item { display: flex; flex-direction: column; gap: 1px; }
    .info-label { font-weight: 700; color: #64748b; font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.2px; }
    .info-value { font-size: 8pt; color: #0f172a; font-weight: 500; }
    
    /* Dettagli corso */
    .course-details { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 8px 10px; }
    .course-details p { margin-bottom: 4px; font-size: 8pt; }
    .course-details strong { color: #1e40af; font-weight: 700; display: inline-block; min-width: 90px; }
    
    /* Tabella prezzi - ULTRA ELEGANTE E LEGGIBILE */
    .price-table { 
      width: 100%; 
      border-collapse: separate; 
      border-spacing: 0; 
      margin: 10px 0; 
      border-radius: 8px; 
      overflow: hidden; 
      border: 1px solid #e2e8f0;
    }
    
    /* Header tabella - PIÙ LEGGIBILE */
    .price-table thead { 
      background: linear-gradient(to bottom, #3b82f6 0%, #2563eb 100%); 
      color: white; 
    }
    .price-table th { 
      padding: 10px 12px; 
      text-align: left; 
      font-weight: 600; 
      font-size: 9pt; 
      text-transform: uppercase; 
      letter-spacing: 0.5px;
      border-bottom: 2px solid rgba(255, 255, 255, 0.2);
    }
    .price-table th:nth-child(2) { text-align: center; width: 80px; }
    .price-table th:nth-child(3) { text-align: right; width: 100px; }
    .price-table th:last-child { text-align: right; width: 100px; }
    
    /* Righe normali - BIANCO PURO */
    .price-table tbody tr { 
      background: white; 
      transition: background-color 0.2s ease; 
    }
    .price-table tbody tr:hover { 
      background: #f8fafc; 
    }
    
    .price-table td { 
      padding: 10px 12px; 
      border-bottom: 1px solid #f1f5f9; 
      font-size: 8.5pt; 
    }
    .price-table tbody tr:last-child td { border-bottom: none; }
    .price-table td.label { color: #374151; font-weight: 500; }
    .price-table td.qty { text-align: center; font-family: 'Courier New', monospace; font-weight: 600; color: #475569; }
    .price-table td.unit-price { text-align: right; font-family: 'Courier New', monospace; font-weight: 500; color: #64748b; }
    .price-table td.value { text-align: right; font-family: 'Courier New', monospace; font-weight: 600; color: #0f172a; }
    
    /* Riga sconto - VERDE */
    .price-table tr.discount { background: #f0fdf4 !important; }
    .price-table tr.discount td { color: #059669; font-weight: 600; }
    
    /* Riga subtotal - AZZURRO CHIARO */
    .price-table tr.subtotal { 
      background: #eff6ff !important; 
      border-top: 2px solid #bfdbfe; 
    }
    .price-table tr.subtotal td { 
      font-weight: 700; 
      color: #1e40af; 
      padding-top: 10px;
      padding-bottom: 8px;
    }
    
    /* Riga total - BLU ELEGANTE */
    .price-table tr.total { 
      background: linear-gradient(to right, #2563eb 0%, #1d4ed8 100%) !important; 
    }
    .price-table tr.total td { 
      border-top: none; 
      border-bottom: none; 
      padding: 12px 12px; 
      font-size: 10pt; 
      color: white; 
      font-weight: 700; 
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); 
    }
    .price-table tr.total td.value { 
      font-size: 11pt; 
      letter-spacing: 0.3px; 
    }
    
    /* Note */
    .notes-section { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 8px 10px; border-radius: 3px; margin-top: 3px; }
    .notes-section .section-title { color: #b45309; border-bottom-color: #fde047; margin-bottom: 5px; font-size: 8pt; }
    .notes-section p { font-size: 7.5pt; color: #78350f; line-height: 1.5; }
    
    /* Footer */
    .footer { 
      margin-top: 14px; 
      padding: 10px 18px; 
      background: #f8fafc; 
      border-top: 1px solid #e2e8f0; 
      font-size: 6.5pt; 
      color: #64748b; 
      border-radius: 0 0 6px 6px;
    }
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
        console.log('📝 CREAZIONE TEMPLATE PREVENTIVO V5 - ULTRA ELEGANTE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 1. Disattiva template V4 precedente
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

        console.log(`✅ Disattivati ${updated.count} template precedenti\n`);

        // 2. Crea template V5
        const template = await prisma.templateLink.create({
            data: {
                name: 'Preventivo Ultra Elegante V5',
                type: 'PREVENTIVO',
                content: templateHTML,
                url: '/templates/preventivo-v5.html',
                version: 5,
                isActive: true,
                isDefault: true,
                fileFormat: 'HTML',
                description: 'Template preventivo ultra elegante - header leggibile 9pt, shadow sottile, layout pulito, total blu sofisticato',
                category: 'COMMERCIALE',
                tags: ['preventivo', 'commerciale', 'elegante', 'v5', 'leggibile'],
                tenantId: TENANT_ID
            }
        });

        console.log('✅ Template V5 creato con successo!\n');
        console.log(`ID: ${template.id}`);
        console.log(`Nome: ${template.name}`);
        console.log(`Versione: ${template.version}`);
        console.log(`isActive: ${template.isActive}`);
        console.log(`isDefault: ${template.isDefault}`);
        console.log(`Content: ${template.content.length} caratteri\n`);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎨 MIGLIORAMENTI V5:\n');
        console.log('✅ Header tabella: font-size 9pt (vs 8pt V4) - PIÙ LEGGIBILE');
        console.log('✅ Header: padding 10px (vs 7px) - PIÙ SPAZIATO');
        console.log('✅ Shadow: RIMOSSA - Layout PULITO');
        console.log('✅ Bordi: 1px solid #e2e8f0 - SOTTILI E RAFFINATI');
        console.log('✅ Border-radius: 8px (vs 12px) - PIÙ SOBRIO');
        console.log('✅ Total: linear-gradient orizzontale - PIÙ ELEGANTE');
        console.log('✅ Footer: background #f8fafc - NEUTRO E LEGGERO\n');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ TEMPLATE V5 ATTIVO E PRONTO ALL\'USO');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        await prisma.$disconnect();
    } catch (error) {
        console.error('\n❌ ERRORE:', error.message);
        console.error(error.stack);
        await prisma.$disconnect();
        process.exit(1);
    }
})();
