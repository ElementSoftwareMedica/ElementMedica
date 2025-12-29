/**
 * Script per inserire template Preventivo in TemplateLink
 * Usa Prisma per evitare problemi di escape SQL
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
    body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #333; padding: 20px 30px; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 18px; }
    .header h1 { color: #2563eb; font-size: 20pt; font-weight: 600; }
    .section { margin-bottom: 15px; }
    .section-title { font-size: 11pt; font-weight: 600; color: #1e40af; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .info-label { font-weight: 600; color: #666; font-size: 8pt; text-transform: uppercase; }
    .info-value { font-size: 9pt; color: #111; }
    .price-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .price-table th { padding: 8px; text-align: left; font-weight: 600; background: #f3f4f6; }
    .price-table td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
    .price-table td.value { text-align: right; font-family: monospace; }
    .price-table tr.discount { color: #059669; }
    .price-table tr.total { background: #eff6ff; font-weight: 700; }
    .price-table tr.total td { border-top: 2px solid #2563eb; padding: 10px 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>PREVENTIVO N° {{preventivo.numeroProgressivo}}/{{preventivo.annoProgressivo}}</h1>
    <div class="subtitle">Data: {{preventivo.dataEmissione}}</div>
  </div>

  <div class="section">
    <div class="section-title">Destinatario</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Ragione Sociale</span>
        <span class="info-value">{{azienda.ragioneSociale}}</span>
      </div>
      <div class="info-item">
        <span class="info-label">P.IVA</span>
        <span class="info-value">{{azienda.piva}}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Indirizzo</span>
        <span class="info-value">{{azienda.indirizzo}}, {{azienda.citta}}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Email</span>
        <span class="info-value">{{azienda.email}}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dettagli Corso</div>
    <p><strong>Corso:</strong> {{corso.title}}</p>
    <p><strong>Tipo Servizio:</strong> {{preventivo.tipoServizio}}</p>
  </div>

  <div class="section">
    <div class="section-title">Riepilogo Economico</div>
    <table class="price-table">
      <thead>
        <tr>
          <th>Descrizione</th>
          <th style="text-align: right">Importo</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="label">Imponibile</td>
          <td class="value">€ {{preventivo.imponibile}}</td>
        </tr>
        <tr>
          <td class="label">IVA ({{preventivo.percentualeIva}}%)</td>
          <td class="value">€ {{preventivo.importoIva}}</td>
        </tr>
        {{#if preventivo.scontoApplicato}}
        <tr class="discount">
          <td class="label">Sconto ({{preventivo.scontoApplicato.percentuale}}%)</td>
          <td class="value">- € {{preventivo.importoSconto}}</td>
        </tr>
        {{/if}}
        <tr class="total">
          <td class="label">TOTALE</td>
          <td class="value">€ {{preventivo.importoFinale}}</td>
        </tr>
      </tbody>
    </table>
  </div>

  {{#if preventivo.note}}
  <div class="section">
    <div class="section-title">Note</div>
    <p>{{preventivo.note}}</p>
  </div>
  {{/if}}

  <div class="section" style="margin-top: 30px; font-size: 8pt; color: #666;">
    <p>Preventivo valido fino al: {{preventivo.dataScadenza}}</p>
    <p>Documento generato il {{current.date}} alle {{current.time}}</p>
  </div>
</body>
</html>`;

async function insertTemplate() {
  try {
    console.log('🔍 Verifico tenant...');
    const tenant = await prisma.tenant.findUnique({
      where: { id: TENANT_ID }
    });

    if (!tenant) {
      console.error(`❌ Tenant ${TENANT_ID} non trovato!`);
      console.log('   Verifica tenant con: SELECT id, name FROM tenants LIMIT 3;');
      process.exit(1);
    }

    console.log(`✅ Tenant trovato: ${tenant.name}`);

    console.log('🗑️  Elimino vecchi template PREVENTIVO se esistono...');
    await prisma.templateLink.deleteMany({
      where: {
        tenantId: TENANT_ID,
        type: 'PREVENTIVO'
      }
    });

    console.log('📝 Inserisco nuovo template...');
    const template = await prisma.templateLink.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Preventivo Standard',
        url: '',
        content: templateHTML,
        header: '',
        footer: '',
        type: 'PREVENTIVO',
        fileFormat: 'HTML',
        category: 'FINANCIAL',
        description: 'Template standard per preventivi corsi. Mostra sconto solo se applicato.',
        version: 1,
        isActive: true,
        isDefault: true,
        syncEnabled: false,
        markers: {
          preventivo: ['numeroProgressivo', 'annoProgressivo', 'dataEmissione', 'dataScadenza', 'tipoServizio', 'imponibile', 'percentualeIva', 'importoIva', 'importoSconto', 'importoFinale', 'note', 'scontoApplicato'],
          azienda: ['ragioneSociale', 'piva', 'indirizzo', 'citta', 'email'],
          corso: ['title'],
          current: ['date', 'time']
        },
        tags: ['preventivo', 'financial', 'pdf']
      }
    });

    console.log('✅ Template inserito con successo!');
    console.log(`   ID: ${template.id}`);
    console.log(`   Nome: ${template.name}`);
    console.log(`   Tipo: ${template.type}`);
    console.log(`   Attivo: ${template.isActive}`);
    console.log(`   Dimensione HTML: ${templateHTML.length} caratteri`);

  } catch (error) {
    console.error('❌ Errore:', error.message);
    if (error.code) console.error('   Codice:', error.code);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

insertTemplate().catch((error) => {
  console.error('💥 Script fallito:', error);
  process.exit(1);
});
