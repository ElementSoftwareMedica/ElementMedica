/**
 * Test script per verificare che il template PREVENTIVO v11 stia in una singola pagina A4
 */
const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function generateTestHTML() {
    console.log('🔍 Test Template PREVENTIVO v11 - Elegante Design\n');

    // Recupera template
    const template = await prisma.templateLink.findFirst({
        where: { type: 'PREVENTIVO', deletedAt: null },
        select: { content: true, version: true }
    });

    console.log(`📋 Template versione: v${template.version}`);

    // Sostituisci i placeholder Handlebars
    let html = template.content;

    // Tenant
    html = html.replace(/\{\{tenant\.name\}\}/g, 'Element Medica S.r.l.');
    html = html.replace(/\{\{tenant\.address\}\}/g, 'Via Roma 123');
    html = html.replace(/\{\{tenant\.city\}\}/g, '20100 Milano (MI)');
    html = html.replace(/\{\{tenant\.vatNumber\}\}/g, '12345678901');

    // Rimuovi condizionale logo
    html = html.replace(/\{\{#if tenant\.logoUrl\}\}[\s\S]*?\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');

    // Preventivo
    html = html.replace(/\{\{preventivo\.numero\}\}/g, 'PREV-2025-0010');
    html = html.replace(/\{\{preventivo\.dataEmissione\}\}/g, '02/12/2025');
    html = html.replace(/\{\{preventivo\.dataScadenza\}\}/g, '02/01/2026');
    html = html.replace(/\{\{preventivo\.titoloServizio\}\}/g, 'Corso RSPP Datore di Lavoro - Rischio Medio 32 ore');
    html = html.replace(/\{\{preventivo\.tipoServizio\}\}/g, 'Formazione Sicurezza');
    html = html.replace(/\{\{preventivo\.partecipanti\}\}/g, '5');
    html = html.replace(/\{\{preventivo\.prezzoTotale\}\}/g, '270.00');
    html = html.replace(/\{\{preventivo\.importoSconto\}\}/g, '30.00');
    html = html.replace(/\{\{preventivo\.scontoPercentuale\}\}/g, '10');
    html = html.replace(/\{\{preventivo\.imponibile\}\}/g, '240.00');
    html = html.replace(/\{\{preventivo\.percentualeIva\}\}/g, '22');
    html = html.replace(/\{\{preventivo\.importoIva\}\}/g, '52.80');
    html = html.replace(/\{\{preventivo\.importoFinale\}\}/g, '292.80');
    html = html.replace(/\{\{preventivo\.note\}\}/g, 'Il corso include materiale didattico, attestato finale di certificazione, coffee break e pranzo per tutte le giornate. Minimo 5 partecipanti richiesti.');

    // Cliente
    html = html.replace(/\{\{cliente\.nome\}\}/g, 'Azienda Test S.p.A.');
    html = html.replace(/\{\{cliente\.partitaIva\}\}/g, '98765432109');
    html = html.replace(/\{\{cliente\.codiceFiscale\}\}/g, 'TSTFSC98765432109');
    html = html.replace(/\{\{cliente\.indirizzoCompleto\}\}/g, 'Via Milano 456, 00100 Roma');

    // Corso
    html = html.replace(/\{\{corso\.code\}\}/g, 'RSPP-DL-M32');
    html = html.replace(/\{\{corso\.duration\}\}/g, '32');
    html = html.replace(/\{\{corso\.category\}\}/g, 'Sicurezza');
    html = html.replace(/\{\{corso\.riskLevel\}\}/g, 'Medio');

    // Mostra sconto (rimuovi condizionale #if scontoApplicato)
    html = html.replace(/\{\{#if preventivo\.scontoApplicato\}\}/g, '');
    html = html.replace(/\{\{\/if\}\}/g, '');

    // Rimuovi altri condizionali
    html = html.replace(/\{\{#if [^\}]+\}\}/g, '');
    html = html.replace(/\{\{#if\s+[^\}]+\}\}/g, '');

    // Sostituisci each voci con 4 righe di esempio
    const vociHTML = `
      <tr>
        <td class="num">1</td>
        <td>Corso RSPP - Modulo 1 Giuridico (8h)</td>
        <td class="qty">5</td>
        <td class="price">€ 20.00</td>
        <td class="total">€ 100.00</td>
      </tr>
      <tr>
        <td class="num">2</td>
        <td>Corso RSPP - Modulo 2 Tecnico (8h)</td>
        <td class="qty">5</td>
        <td class="price">€ 20.00</td>
        <td class="total">€ 100.00</td>
      </tr>
      <tr>
        <td class="num">3</td>
        <td>Corso RSPP - Modulo 3 Relazionale (8h)</td>
        <td class="qty">5</td>
        <td class="price">€ 10.00</td>
        <td class="total">€ 50.00</td>
      </tr>
      <tr>
        <td class="num">4</td>
        <td>Materiale didattico e attestati</td>
        <td class="qty">5</td>
        <td class="price">€ 4.00</td>
        <td class="total">€ 20.00</td>
      </tr>`;

    html = html.replace(/\{\{#each voci\}\}[\s\S]*?\{\{\/each\}\}/g, vociHTML);

    // Rimuovi eventuali marker residui
    html = html.replace(/\{\{[^\}]+\}\}/g, '');

    // Aggiungi CSS per simulare stampa A4 nel browser
    const printCSS = `
<style>
  @media screen {
    html {
      background: #e0e0e0;
    }
    body {
      width: 210mm;
      min-height: 297mm;
      margin: 10mm auto;
      padding: 10mm;
      background: white;
      box-shadow: 0 0 10px rgba(0,0,0,0.3);
    }
  }
  @page {
    size: A4;
    margin: 5mm 6mm;
  }
</style>`;

    html = html.replace('</head>', printCSS + '\n</head>');

    // Salva file
    const testFile = path.join(__dirname, 'test-preventivo-v10.html');
    fs.writeFileSync(testFile, html);

    console.log(`\n✅ File HTML generato: ${testFile}`);
    console.log(`📏 Dimensioni: ${html.length} caratteri`);

    // Analisi contenuto
    console.log('\n📊 Analisi contenuto:');
    console.log('  - 4 righe voci nella tabella');
    console.log('  - Note lunghe (stress test)');
    console.log('  - Sconto visualizzato');
    console.log('  - Tutti i campi popolati');

    console.log('\n🧪 Per verificare single-page:');
    console.log('  1. Apri il file HTML nel browser');
    console.log('  2. Stampa (Cmd+P / Ctrl+P)');
    console.log('  3. Verifica che mostri "1 pagina"');
    console.log(`  \n  file://${testFile}`);

    await prisma.$disconnect();
}

generateTestHTML().catch(console.error);
