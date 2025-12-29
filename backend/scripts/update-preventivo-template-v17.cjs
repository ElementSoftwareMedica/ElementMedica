/**
 * Update PREVENTIVO Template v17
 * Design elegante come test-preventivo-v10.html
 * SINGLE PAGE LAYOUT con tutti i marker corretti
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TEMPLATE_V17 = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:10pt;line-height:1.4;color:#1f2937;background:white}
@page{size:A4;margin:5mm 6mm}

.header{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;margin-bottom:14px;border-bottom:3px solid #2563eb}
.logo-section{font-size:14pt;font-weight:700;color:#1e40af}
.company-info{text-align:right;font-size:9pt;color:#6b7280;line-height:1.3}
.company-info .company-name{font-size:14pt;font-weight:700;color:#1e40af;margin-bottom:2px}

.doc-title{background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:white;padding:10px 18px;margin-bottom:14px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px rgba(37,99,235,0.25)}
.doc-title h1{font-size:16pt;font-weight:700;margin:0;letter-spacing:1px}
.doc-title .doc-meta{font-size:10pt;text-align:right;opacity:0.95}
.doc-title .doc-meta strong{font-size:12pt;display:block}

.info-grid{display:flex;gap:14px;margin-bottom:14px}
.info-box{flex:1;background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%);border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
.info-box h3{font-size:8pt;font-weight:700;color:#2563eb;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;padding-bottom:3px}
.info-box p{margin:2px 0;font-size:9pt;line-height:1.3}
.info-box .label{color:#6b7280;font-size:8pt}
.info-box .value{font-weight:600;color:#1f2937}
.info-box .cliente-nome{font-size:11pt;font-weight:700;color:#111827;margin-bottom:3px}

.service-box{background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border:1px solid #93c5fd;border-radius:8px;padding:10px 14px;margin-bottom:14px;box-shadow:0 1px 3px rgba(59,130,246,0.1)}
.service-box h3{font-size:11pt;font-weight:700;color:#1e40af;margin-bottom:5px}
.service-meta{display:flex;flex-wrap:wrap;gap:10px;font-size:8pt}
.service-meta span{color:#4b5563;background:white;padding:2px 6px;border-radius:4px;border:1px solid #e5e7eb}
.service-meta strong{color:#1f2937}

.items-table{width:100%;border-collapse:separate;border-spacing:0;margin-bottom:14px;font-size:9pt;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.items-table thead{background:linear-gradient(180deg,#1e3a5f 0%,#1e3a8a 100%);color:white}
.items-table th{padding:8px 10px;text-align:left;font-weight:600;font-size:8pt;text-transform:uppercase;letter-spacing:0.3px}
.items-table th.num{width:6%;text-align:center}
.items-table th.desc{width:48%}
.items-table th.qty{width:10%;text-align:center}
.items-table th.price{width:18%;text-align:right}
.items-table th.total{width:18%;text-align:right}
.items-table td{padding:8px 10px;border-bottom:1px solid #e5e7eb;background:white}
.items-table td.num{text-align:center;color:#6b7280;font-weight:500}
.items-table td.qty{text-align:center}
.items-table td.price{text-align:right;color:#4b5563}
.items-table td.total{text-align:right;font-weight:600;color:#1f2937}
.items-table tbody tr:nth-child(even) td{background:#f9fafb}
.items-table tbody tr:last-child td{border-bottom:none}

.totals-wrapper{display:flex;justify-content:flex-end;margin-bottom:14px}
.totals-box{width:220px;border:1px solid #d1d5db;border-radius:8px;overflow:hidden;font-size:9pt;box-shadow:0 2px 4px rgba(0,0,0,0.06)}
.total-row{display:flex;justify-content:space-between;padding:6px 12px;border-bottom:1px solid #e5e7eb;background:white}
.total-row:last-child{border-bottom:none}
.total-row .label{color:#6b7280}
.total-row .value{font-weight:600}
.total-row.discount{background:linear-gradient(90deg,#fef3c7 0%,#fde68a 100%);color:#92400e}
.total-row.discount .value{font-weight:700}
.total-row.final{background:linear-gradient(135deg,#1e3a5f 0%,#1e3a8a 100%);color:white;padding:8px 12px}
.total-row.final .label{color:rgba(255,255,255,0.9);font-weight:600}
.total-row.final .value{font-size:13pt;font-weight:700}

.notes-box{background:linear-gradient(180deg,#fffbeb 0%,#fef3c7 100%);border:1px solid #fcd34d;border-left:4px solid #f59e0b;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:8pt}
.notes-box h4{color:#92400e;font-size:8pt;font-weight:700;margin-bottom:3px}
.notes-box p{color:#78350f;line-height:1.3}

.conditions{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:7pt;color:#6b7280}
.conditions-title{font-weight:600;color:#4b5563;margin-bottom:3px;font-size:8pt}
.conditions-content{display:flex;flex-wrap:wrap;gap:4px 16px}
.conditions-content span::before{content:"•";margin-right:4px;color:#2563eb}

.signature-section{display:flex;justify-content:space-between;padding:12px;border:2px dashed #93c5fd;border-radius:8px;background:linear-gradient(180deg,#f0f9ff 0%,#e0f2fe 100%)}
.sig-box{width:42%;text-align:center}
.sig-box .line{border-top:1px solid #64748b;margin-top:25px;margin-bottom:4px}
.sig-box span{font-size:7pt;color:#64748b;font-weight:500}

.footer{margin-top:10px;padding-top:6px;border-top:1px solid #e5e7eb;font-size:7pt;color:#9ca3af;text-align:center}
</style>
</head>
<body>
<div class="header">
<div class="logo-section">{{tenant.name}}</div>
<div class="company-info">
<div class="company-name">{{tenant.name}}</div>
{{tenant.address}} {{tenant.city}}<br>P.IVA: {{tenant.vatNumber}}
</div>
</div>

<div class="doc-title">
<h1>PREVENTIVO</h1>
<div class="doc-meta"><strong>{{preventivo.numero}}</strong>del {{preventivo.dataEmissione}}</div>
</div>

<div class="info-grid">
<div class="info-box">
<h3>Destinatario</h3>
<p class="cliente-nome">{{cliente.nome}}</p>
{{cliente.dettagliHtml}}
</div>
<div class="info-box">
<h3>Dettagli Preventivo</h3>
<p><span class="label">Valido fino:</span> <span class="value">{{preventivo.dataScadenza}}</span></p>
<p><span class="label">Tipo:</span> <span class="value">{{preventivo.tipoServizio}}</span></p>
<p><span class="label">Stato:</span> <span class="value">{{preventivo.stato}}</span></p>
</div>
</div>

<div class="service-box">
<h3>{{preventivo.titoloServizio}}</h3>
{{corso.metaHtml}}
</div>

<table class="items-table">
<thead><tr><th class="num">#</th><th class="desc">Descrizione</th><th class="qty">Qtà</th><th class="price">Prezzo Unit.</th><th class="total">Totale</th></tr></thead>
<tbody>{{vociHtml}}</tbody>
</table>

<div class="totals-wrapper">
<div class="totals-box">{{totaliHtml}}</div>
</div>

{{noteHtml}}

<div class="conditions">
<div class="conditions-title">Termini e Condizioni</div>
<div class="conditions-content">
<span>Validità: {{preventivo.dataScadenza}}</span>
<span>Pagamento: 30gg data fattura</span>
<span>Annullamento &gt;7gg: rimborso 50%</span>
</div>
</div>

<div class="signature-section">
<div class="sig-box"><div class="line"></div><span>Luogo e Data</span></div>
<div class="sig-box"><div class="line"></div><span>Firma per accettazione</span></div>
</div>

<div class="footer">{{tenant.name}} - {{tenant.address}} {{tenant.city}} - P.IVA {{tenant.vatNumber}}</div>
</body>
</html>`;

async function main() {
    console.log('🔄 PREVENTIVO → v17 ELEGANT SINGLE PAGE (marker corretti)\n');

    try {
        // Trova template esistente
        const existing = await prisma.templateLink.findFirst({
            where: { type: 'PREVENTIVO', deletedAt: null },
            orderBy: { version: 'desc' }
        });

        if (existing) {
            // Update esistente
            const updated = await prisma.templateLink.update({
                where: { id: existing.id },
                data: {
                    content: TEMPLATE_V17,
                    version: 17,
                    isActive: true,
                    updatedAt: new Date()
                }
            });
            console.log(`✅ v17 applicato (ID: ${updated.id})`);
            console.log(`   Content length: ${TEMPLATE_V17.length}`);
        } else {
            console.log('❌ Nessun template PREVENTIVO trovato');
        }

    } catch (error) {
        console.error('❌ Errore:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
