/**
 * PREVENTIVO v15 - SINGLE PAGE GARANTITO
 * Font 8pt, margin 5mm, layout ultra-denso
 * USA classi compatibili con _buildMarkerData
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const T = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@page{size:A4;margin:5mm}
*{margin:0;padding:0;box-sizing:border-box}
body{font:8pt/1.2 Arial,sans-serif;color:#333}
.h{display:flex;justify-content:space-between;border-bottom:2px solid #1e40af;padding-bottom:3px;margin-bottom:5px}
.h h1{font-size:11pt;color:#1e40af}
.h .i{font-size:6.5pt;text-align:right;color:#666}
.t{background:#1e40af;color:#fff;padding:3px 6px;margin-bottom:5px;display:flex;justify-content:space-between;font-size:9pt}
.r{display:flex;gap:6px;margin-bottom:5px}
.b{flex:1;background:#f7f8fa;border:1px solid #ddd;padding:4px 6px;font-size:7pt}
.b b{display:block;font-size:6.5pt;color:#1e40af;text-transform:uppercase;border-bottom:1px solid #ddd;margin-bottom:2px;padding-bottom:1px}
.s{background:#eef4ff;border:1px solid #c5d9f7;padding:3px 6px;margin-bottom:5px}
.s h3{font-size:8pt;color:#1e40af}
.service-meta{font-size:6.5pt;color:#555}
.service-meta span{margin-right:8px}
table{width:100%;border-collapse:collapse;margin-bottom:5px}
thead{background:#1e40af;color:#fff}
th,td{padding:2px 4px;text-align:left;font-size:7pt}
th{font-size:6.5pt}
td{border-bottom:1px solid #eee}
td:last-child,th:last-child{text-align:right}
td.num{width:20px;text-align:center}
td.qty{text-align:center;width:30px}
td.price,td.total{text-align:right;width:60px}
.tot{display:flex;justify-content:flex-end;margin-bottom:5px}
.tb{width:150px;font-size:7pt;background:#f7f8fa;border:1px solid #ddd}
.total-row{display:flex;justify-content:space-between;padding:2px 5px;border-bottom:1px solid #eee}
.total-row:last-child{border:none}
.total-row .label{color:#666}
.total-row .value{font-weight:500}
.total-row.original .value{text-decoration:line-through;color:#999}
.total-row.discount{background:#fef9c3;color:#854d0e}
.total-row.final{background:#1e40af;color:#fff;font-weight:700;font-size:8pt;padding:3px 5px}
.c{background:#f7f8fa;border:1px solid #ddd;padding:3px 6px;margin-bottom:5px;font-size:6pt;color:#666}
.c b{font-size:6.5pt;color:#333}
.c ul{margin:1px 0 0 10px;padding:0}
.notes-box{background:#fffbeb;border:1px solid #fcd34d;padding:3px 6px;margin-bottom:5px;font-size:6.5pt}
.notes-box h4{color:#92400e;font-size:6.5pt;margin-bottom:1px}
.notes-box p{margin:0}
.a{border:1px dashed #1e40af;padding:5px;text-align:center}
.a b{font-size:7pt;color:#1e40af}
.a p{font-size:6pt;color:#666;margin:2px 0 6px}
.sg{display:flex;justify-content:space-between;margin-top:12px}
.sg div{width:45%;border-top:1px solid #999;padding-top:1px;font-size:5.5pt;color:#666;text-align:center}
.f{margin-top:3px;font-size:5.5pt;color:#999;text-align:center;border-top:1px solid #eee;padding-top:2px}
</style>
</head>
<body>
<div class="h"><h1>{{tenant.name}}</h1><div class="i">{{tenant.address}}<br>P.IVA {{tenant.vatNumber}}</div></div>
<div class="t"><span>PREVENTIVO</span><span>N.{{preventivo.numero}} - {{preventivo.dataEmissione}}</span></div>
<div class="r">
<div class="b"><b>Cliente</b>{{cliente.nome}}<br>{{cliente.indirizzoCompleto}}<br>P.IVA {{cliente.partitaIva}}</div>
<div class="b"><b>Dettagli</b>Validità: {{preventivo.dataScadenza}}<br>Stato: {{preventivo.stato}}<br>Tipo: {{preventivo.tipoServizio}}</div>
</div>
<div class="s"><h3>{{preventivo.titoloServizio}}</h3>{{corso.metaHtml}}</div>
<table><thead><tr><th>#</th><th>Descrizione</th><th>Qt</th><th>Prezzo</th><th>Tot</th></tr></thead><tbody>{{vociHtml}}</tbody></table>
<div class="tot"><div class="tb">{{totaliHtml}}</div></div>
{{noteHtml}}
<div class="c"><b>Condizioni</b><ul><li>Validità: {{preventivo.dataScadenza}}</li><li>Pagamento: 30gg</li><li>Annullamento +7gg: 50%</li></ul></div>
<div class="a"><b>Accettazione</b><p>Firma = accettazione condizioni</p><div class="sg"><div>Data</div><div>Firma</div></div></div>
<div class="f">{{tenant.name}} | {{tenant.vatNumber}} | {{tenant.email}}</div>
</body>
</html>`;

async function run() {
    console.log('🔄 PREVENTIVO → v15 SINGLE PAGE\\n');
    const tpl = await prisma.templateLink.findFirst({
        where: { type: 'PREVENTIVO', isActive: true }
    });
    if (tpl) {
        await prisma.templateLink.update({
            where: { id: tpl.id },
            data: { content: T, version: 15, updatedAt: new Date() }
        });
        console.log('✅ v15 applicato (ID:', tpl.id + ')');
        console.log('   Content length:', T.length);
    } else {
        console.log('❌ Nessun template trovato');
    }
    await prisma.$disconnect();
}
run();
