/**
 * Test PDF generation for PREVENTIVO template v18
 * Standalone test senza server
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:9pt;line-height:1.2;color:#1f2937;background:white}
@page{size:A4;margin:3mm 5mm}

.header{display:flex;justify-content:space-between;align-items:center;padding-bottom:6px;margin-bottom:10px;border-bottom:2px solid #2563eb}
.logo-section{font-size:12pt;font-weight:700;color:#1e40af}
.company-info{text-align:right;font-size:8pt;color:#6b7280;line-height:1.2}
.company-info .company-name{font-size:12pt;font-weight:700;color:#1e40af;margin-bottom:1px}

.doc-title{background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:white;padding:8px 14px;margin-bottom:10px;border-radius:4px;display:flex;justify-content:space-between;align-items:center}
.doc-title h1{font-size:14pt;font-weight:700;margin:0;letter-spacing:0.5px}
.doc-title .doc-meta{font-size:9pt;text-align:right}
.doc-title .doc-meta strong{font-size:10pt;display:block}

.info-grid{display:flex;gap:10px;margin-bottom:10px}
.info-box{flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:6px 10px}
.info-box h3{font-size:7pt;font-weight:700;color:#2563eb;margin-bottom:4px;text-transform:uppercase;border-bottom:1px solid #e2e8f0;padding-bottom:2px}
.info-box p{margin:1px 0;font-size:8pt;line-height:1.2}
.info-box .label{color:#6b7280;font-size:7pt}
.info-box .value{font-weight:600;color:#1f2937}
.info-box .cliente-nome{font-size:10pt;font-weight:700;color:#111827;margin-bottom:2px}

.service-box{background:#eff6ff;border:1px solid #93c5fd;border-radius:4px;padding:6px 10px;margin-bottom:10px}
.service-box h3{font-size:10pt;font-weight:700;color:#1e40af;margin-bottom:3px}
.service-meta{display:flex;flex-wrap:wrap;gap:6px;font-size:7pt}
.service-meta span{color:#4b5563;background:white;padding:1px 4px;border-radius:2px;border:1px solid #e5e7eb}
.service-meta strong{color:#1f2937}

.items-table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:8pt;border:1px solid #d1d5db}
.items-table thead{background:#1e3a8a;color:white}
.items-table th{padding:5px 6px;text-align:left;font-weight:600;font-size:7pt;text-transform:uppercase}
.items-table th.num{width:5%;text-align:center}
.items-table th.desc{width:50%}
.items-table th.qty{width:8%;text-align:center}
.items-table th.price{width:18%;text-align:right}
.items-table th.total{width:19%;text-align:right}
.items-table td{padding:5px 6px;border-bottom:1px solid #e5e7eb}
.items-table td.num{text-align:center;color:#6b7280}
.items-table td.qty{text-align:center}
.items-table td.price{text-align:right;color:#4b5563}
.items-table td.total{text-align:right;font-weight:600}
.items-table tbody tr:nth-child(even){background:#f9fafb}

.totals-wrapper{display:flex;justify-content:flex-end;margin-bottom:10px}
.totals-box{width:200px;border:1px solid #d1d5db;border-radius:4px;overflow:hidden;font-size:8pt}
.total-row{display:flex;justify-content:space-between;padding:4px 8px;border-bottom:1px solid #e5e7eb;background:white}
.total-row:last-child{border-bottom:none}
.total-row .label{color:#6b7280}
.total-row .value{font-weight:600}
.total-row.discount{background:#fef3c7;color:#92400e}
.total-row.discount .value{font-weight:700}
.total-row.final{background:#1e3a8a;color:white;padding:5px 8px}
.total-row.final .label{color:rgba(255,255,255,0.9);font-weight:600}
.total-row.final .value{font-size:11pt;font-weight:700}

.notes-box{background:#fffbeb;border:1px solid #fcd34d;border-left:3px solid #f59e0b;border-radius:4px;padding:5px 8px;margin-bottom:8px;font-size:7pt}
.notes-box h4{color:#92400e;font-size:7pt;font-weight:700;margin-bottom:2px}
.notes-box p{color:#78350f;line-height:1.2}

.conditions{background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:5px 8px;margin-bottom:8px;font-size:6pt;color:#6b7280}
.conditions-title{font-weight:600;color:#4b5563;margin-bottom:2px;font-size:7pt}
.conditions-content{display:flex;flex-wrap:wrap;gap:3px 12px}
.conditions-content span::before{content:"•";margin-right:3px;color:#2563eb}

.signature-section{display:flex;justify-content:space-between;padding:8px;border:1px dashed #93c5fd;border-radius:4px;background:#f0f9ff}
.sig-box{width:42%;text-align:center}
.sig-box .line{border-top:1px solid #64748b;margin-top:18px;margin-bottom:3px}
.sig-box span{font-size:6pt;color:#64748b}

.footer{margin-top:6px;padding-top:4px;border-top:1px solid #e5e7eb;font-size:6pt;color:#9ca3af;text-align:center}
</style>
</head>
<body>
<div class="header">
<div class="logo-section">Element Medica S.r.l.</div>
<div class="company-info">
<div class="company-name">Element Medica S.r.l.</div>
Via Roma 123 - 20100 Milano (MI)<br>P.IVA: 12345678901
</div>
</div>

<div class="doc-title">
<h1>PREVENTIVO</h1>
<div class="doc-meta"><strong>PREV-2025-0016</strong>del 03/12/2025</div>
</div>

<div class="info-grid">
<div class="info-box">
<h3>Destinatario</h3>
<p class="cliente-nome">Test Company S.r.l.</p>
<p><span class="label">P.IVA:</span> <span class="value">12345678901</span></p>
<p><span class="label">C.F.:</span> <span class="value">12345678901</span></p>
<p style="font-size:7pt;color:#6b7280">Via Test 123, 20100 Milano (MI)</p>
</div>
<div class="info-box">
<h3>Dettagli</h3>
<p><span class="label">Valido fino:</span> <span class="value">02/01/2026</span></p>
<p><span class="label">Tipo:</span> <span class="value">CORSO</span></p>
</div>
</div>

<div class="service-box">
<h3>Corso Sicurezza sul Lavoro</h3>
<div class="service-meta">
<span>Cod. <strong>SEC001</strong></span>
<span>Durata <strong>8h</strong></span>
<span>Sicurezza</span>
</div>
</div>

<table class="items-table">
<thead><tr><th class="num">#</th><th class="desc">Descrizione</th><th class="qty">Qtà</th><th class="price">Prezzo Unit.</th><th class="total">Totale</th></tr></thead>
<tbody>
<tr><td class="num">1</td><td>Preventivo - Corso di Sicurezza sul Lavoro</td><td class="qty">1</td><td class="price">€ 450.00</td><td class="total">€ 450.00</td></tr>
</tbody>
</table>

<div class="totals-wrapper">
<div class="totals-box">
<div class="total-row"><span class="label">Subtotale</span><span class="value">€ 450.00</span></div>
<div class="total-row discount"><span class="label">Sconto 12%</span><span class="value">-€ 54.00</span></div>
<div class="total-row"><span class="label">Imponibile</span><span class="value">€ 396.00</span></div>
<div class="total-row"><span class="label">IVA 22%</span><span class="value">€ 87.12</span></div>
<div class="total-row final"><span class="label">TOTALE</span><span class="value">€ 483.12</span></div>
</div>
</div>

<div class="notes-box">
<h4>Note:</h4>
<p>Corso: Corso di Sicurezza sul Lavoro. Partecipanti: 1. Prezzo unitario: €450.00. Sconto applicato: OLPL-CATE170468887540 (-12%)</p>
</div>

<div class="conditions">
<div class="conditions-title">Condizioni</div>
<div class="conditions-content">
<span>Validità: 02/01/2026</span>
<span>Pagamento: 30gg</span>
<span>Annullamento &gt;7gg: 50%</span>
</div>
</div>

<div class="signature-section">
<div class="sig-box"><div class="line"></div><span>Data</span></div>
<div class="sig-box"><div class="line"></div><span>Firma</span></div>
</div>

<div class="footer">Element Medica S.r.l. - Via Roma 123 - 20100 Milano (MI) - P.IVA 12345678901</div>
</body>
</html>`;

async function generatePDF() {
    console.log('🚀 Generating test PDF...');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(HTML_CONTENT, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true, // Usa @page CSS invece dei margini Puppeteer
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    await browser.close();

    fs.writeFileSync('/tmp/test-preventivo-standalone.pdf', pdfBuffer);
    console.log('✅ PDF saved to /tmp/test-preventivo-standalone.pdf');
    console.log(`   Size: ${pdfBuffer.length} bytes`);
}

generatePDF().catch(console.error);
