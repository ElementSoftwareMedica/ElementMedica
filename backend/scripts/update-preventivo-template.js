#!/usr/bin/env node
/**
 * Script per aggiornare il template Preventivo nel database
 * Questo è necessario perché il seed non aggiorna template esistenti
 * 
 * Eseguire con: node backend/scripts/update-preventivo-template.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PREVENTIVO_TEMPLATE_V6 = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Preventivo {{preventivo.numeroProgressivo}}/{{preventivo.annoProgressivo}}</title>
  <style>
    /* v6 COMPACT - Print-optimized template */
    @page {
      size: A4;
      margin: 10mm;
    }
    
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .container { page-break-inside: avoid; }
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      font-size: 8pt; 
      line-height: 1.25; 
      color: #1a1a1a; 
      background: white;
    }
    
    .container { max-width: 750px; margin: 0 auto; padding: 0; }
    
    /* Header azienda mittente */
    .company-header {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 8px 14px;
      border-radius: 4px 4px 0 0;
      margin-bottom: 0;
    }
    
    .company-header h1 { font-size: 12pt; font-weight: 700; margin-bottom: 2px; letter-spacing: 0.2px; }
    .company-header .company-details { font-size: 6.5pt; opacity: 0.95; display: flex; flex-wrap: wrap; gap: 6px; margin-top: 3px; }
    .company-header .company-details span { display: inline-flex; align-items: center; }
    
    /* Header documento */
    .doc-header { background: #f8fafc; border-left: 3px solid #2563eb; padding: 6px 14px; margin-bottom: 8px; }
    .doc-header h2 { color: #1e40af; font-size: 10pt; font-weight: 600; margin-bottom: 2px; }
    .doc-meta { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px; font-size: 7pt; color: #475569; }
    
    /* Sezioni */
    .section { margin-bottom: 6px; padding: 0 14px; }
    .section-title { font-size: 8pt; font-weight: 700; color: #1e40af; margin-bottom: 4px; padding-bottom: 1px; border-bottom: 1.5px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.3px; }
    
    /* Griglia destinatario */
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 10px; background: #f9fafb; padding: 6px; border-radius: 3px; border: 1px solid #e5e7eb; }
    .info-item { display: flex; flex-direction: column; gap: 0; }
    .info-label { font-weight: 700; color: #64748b; font-size: 6pt; text-transform: uppercase; letter-spacing: 0.2px; }
    .info-value { font-size: 7.5pt; color: #0f172a; font-weight: 500; }
    
    /* Dettagli corso */
    .course-details { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 3px; padding: 5px 8px; }
    .course-details p { margin-bottom: 2px; font-size: 7.5pt; }
    .course-details strong { color: #1e40af; font-weight: 700; display: inline-block; min-width: 80px; }
    
    /* Tabella prezzi - COMPATTA */
    .price-table { 
      width: 100%; 
      border-collapse: separate; 
      border-spacing: 0; 
      margin: 6px 0; 
      border-radius: 4px; 
      overflow: hidden; 
      border: 1px solid #e2e8f0;
    }
    
    /* Header tabella */
    .price-table thead { 
      background: linear-gradient(to bottom, #3b82f6 0%, #2563eb 100%) !important; 
      color: white !important; 
    }
    .price-table th { 
      padding: 6px 10px; 
      text-align: left; 
      font-weight: 600; 
      font-size: 8pt; 
      text-transform: uppercase; 
      letter-spacing: 0.3px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }
    .price-table th:nth-child(2) { text-align: center; width: 70px; }
    .price-table th:nth-child(3) { text-align: right; width: 90px; }
    .price-table th:last-child { text-align: right; width: 90px; }
    
    /* Righe normali */
    .price-table tbody tr { 
      background: white; 
      transition: background-color 0.2s ease; 
    }
    .price-table tbody tr:hover { 
      background: #f8fafc; 
    }
    
    .price-table td { 
      padding: 6px 10px; 
      border-bottom: 1px solid #f1f5f9; 
      font-size: 7.5pt; 
    }
    .price-table tbody tr:last-child td { border-bottom: none; }
    .price-table td.label { color: #374151; font-weight: 500; }
    .price-table td.qty { text-align: center; font-family: 'Courier New', monospace; font-weight: 600; color: #475569; }
    .price-table td.unit-price { text-align: right; font-family: 'Courier New', monospace; font-weight: 500; color: #64748b; }
    .price-table td.value { text-align: right; font-family: 'Courier New', monospace; font-weight: 600; color: #0f172a; }
    
    /* Riga sconto - VERDE */
    .price-table tr.discount { background: #f0fdf4 !important; }
    .price-table tr.discount td { color: #059669; font-weight: 600; }
    
    /* Riga subtotal */
    .price-table tr.subtotal { 
      background: #eff6ff !important; 
      border-top: 1px solid #bfdbfe; 
    }
    .price-table tr.subtotal td { 
      font-weight: 700; 
      color: #1e40af; 
      padding-top: 6px;
      padding-bottom: 5px;
    }
    
    /* Riga total */
    .price-table tr.total { 
      background: linear-gradient(to right, #2563eb 0%, #1d4ed8 100%) !important; 
    }
    .price-table tr.total td { 
      border-top: none; 
      border-bottom: none; 
      padding: 8px 10px; 
      font-size: 9pt; 
      color: white; 
      font-weight: 700; 
    }
    .price-table tr.total td.value { 
      font-size: 10pt; 
      letter-spacing: 0.2px; 
    }
    
    /* Note */
    .notes-section { background: #fffbeb; border-left: 2px solid #f59e0b; padding: 5px 8px; border-radius: 2px; margin-top: 2px; }
    .notes-section .section-title { color: #b45309; border-bottom-color: #fde047; margin-bottom: 3px; font-size: 7pt; }
    .notes-section p { font-size: 7pt; color: #78350f; line-height: 1.4; }
    
    /* Footer */
    .footer { 
      margin-top: 8px; 
      padding: 6px 14px; 
      background: #f8fafc; 
      border-top: 1px solid #e2e8f0; 
      font-size: 6pt; 
      color: #64748b; 
      border-radius: 0 0 4px 4px;
    }
    .footer p { margin-bottom: 1px; line-height: 1.2; }
    .footer strong { color: #334155; }
    
    /* Badge stato */
    .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
    .badge.bozza { background: #fef3c7; color: #92400e; border: 1px solid #fbbf24; }
    .badge.inviato { background: #dbeafe; color: #1e40af; border: 1px solid #3b82f6; }
    .badge.accettato { background: #d1fae5; color: #065f46; border: 1px solid #10b981; }
  
    /* Fix per garantire stili header tabella */
    thead th,
    .price-table thead th {
      background: linear-gradient(to bottom, #3b82f6 0%, #2563eb 100%) !important;
      color: white !important;
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

async function main() {
    console.log('🔄 Aggiornamento template Preventivo nel database...\n');

    try {
        // Trova tutti i template Preventivo
        const templates = await prisma.templateLink.findMany({
            where: {
                type: 'PREVENTIVO',
                deletedAt: null
            }
        });

        console.log(`📋 Trovati ${templates.length} template PREVENTIVO\n`);

        for (const template of templates) {
            console.log(`📄 Template: ${template.name}`);
            console.log(`   ID: ${template.id}`);
            console.log(`   Versione attuale: ${template.version}`);
            console.log(`   TenantId: ${template.tenantId}`);

            // Aggiorna il template alla versione 6
            await prisma.templateLink.update({
                where: { id: template.id },
                data: {
                    content: PREVENTIVO_TEMPLATE_V6,
                    version: 6,
                    updatedAt: new Date()
                }
            });

            console.log(`   ✅ Aggiornato alla versione 6\n`);
        }

        console.log('✅ Tutti i template PREVENTIVO sono stati aggiornati alla versione 6 (compatto)');

    } catch (error) {
        console.error('❌ Errore durante l\'aggiornamento:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
