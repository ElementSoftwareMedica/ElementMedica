/**
 * Script per creare i template mancanti
 */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function createTemplates() {
  // Get all tenants and create templates for each
  const tenants = await prisma.tenant.findMany();
  if (tenants.length === 0) {
    console.log('No tenants found');
    return;
  }

  for (const tenant of tenants) {
    console.log('\\nProcessing Tenant:', tenant.name, '(' + tenant.id + ')');

    // Attestato Orizzontale Fullscreen
    const attestatoLandscape = {
      name: 'Attestato Orizzontale Fullscreen',
      type: 'CERTIFICATE',
      isDefault: true,
      version: 1,
      content: `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Attestato</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Georgia', serif;
      font-size: 11pt;
      color: #1a1a1a;
      width: 297mm;
      min-height: 210mm;
    }
    .document-container { display: flex; width: 100%; min-height: 210mm; }
    .sidebar {
      width: 50mm;
      background: linear-gradient(180deg, #1e40af 0%, #3b82f6 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 15mm 5mm;
      position: relative;
    }
    .logo-container {
      width: 35mm; height: 35mm;
      background: white;
      border-radius: 50%;
      padding: 3mm;
      display: flex; align-items: center; justify-content: center;
    }
    .sidebar-text {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      font-size: 18pt;
      font-weight: 700;
      color: white;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-top: 15mm;
    }
    .main-content { flex: 1; padding: 12mm 20mm; display: flex; flex-direction: column; }
    .document-title {
      text-align: center;
      font-size: 32pt;
      font-weight: 700;
      margin-bottom: 8mm;
      letter-spacing: 5px;
      text-transform: uppercase;
    }
    .person-name { font-size: 18pt; font-weight: 700; color: #1e40af; }
    .course-box {
      text-align: center;
      background: #f8fafc;
      border-left: 4px solid #1e40af;
      border-right: 4px solid #1e40af;
      padding: 6mm 15mm;
      margin: 8mm 20mm;
    }
    .course-title { font-size: 16pt; font-weight: 700; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 15mm; margin: 8mm 0; }
    .signatures-section { display: flex; justify-content: space-around; margin-top: auto; padding-top: 10mm; border-top: 1px solid #e2e8f0; }
    .signature-block { text-align: center; width: 40%; }
    .signature-line { border-bottom: 1px solid #1a1a1a; margin: 12mm 20mm 0; }
  </style>
</head>
<body>
  <div class="document-container">
    <div class="sidebar">
      <div class="logo-container"><div>LOGO</div></div>
      <div class="sidebar-text">Certificato</div>
    </div>
    <div class="main-content">
      <h1 class="document-title">Attestato</h1>
      <p style="text-align:center">Si certifica che <span class="person-name">{{person.fullName}}</span> (C.F. {{person.cf}})</p>
      <p style="text-align:center">dipendente di <strong>{{company.name}}</strong> ha frequentato il corso:</p>
      <div class="course-box">
        <div class="course-title">{{course.title}}</div>
        <div style="font-size:10pt;color:#666">{{course.regulation}}</div>
      </div>
      <div class="details-grid">
        <div><strong>Periodo:</strong> dal {{schedule.startDate}} al {{schedule.endDate}}</div>
        <div><strong>Durata:</strong> {{schedule.totalHours}} ore</div>
        <div><strong>Modalità:</strong> {{schedule.deliveryMode}}</div>
        <div><strong>Sede:</strong> {{schedule.location}}</div>
      </div>
      <div class="signatures-section">
        <div class="signature-block">
          <div>Il Responsabile</div>
          <div class="signature-line"></div>
        </div>
        <div class="signature-block">
          <div>Il Docente: {{trainer.fullName}}</div>
          <div class="signature-line"></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
    };

    // Check if exists
    const existingAtt = await prisma.templateLink.findFirst({
      where: { name: attestatoLandscape.name, tenantId: tenant.id, deletedAt: null }
    });

    if (!existingAtt) {
      await prisma.templateLink.create({
        data: {
          id: crypto.randomUUID(),
          name: attestatoLandscape.name,
          type: attestatoLandscape.type,
          content: attestatoLandscape.content,
          isDefault: attestatoLandscape.isDefault,
          version: attestatoLandscape.version,
          tenantId: tenant.id,
          isActive: true,
          url: 'html-template'
        }
      });
      console.log('✅ Created: Attestato Orizzontale Fullscreen');
    } else {
      console.log('⏭️ Already exists: Attestato Orizzontale');
    }

    // Lettera di Incarico
    const letteraIncarico = {
      name: 'Lettera di Incarico Professionale',
      type: 'LETTER_OF_ENGAGEMENT',
      isDefault: true,
      version: 1,
      content: `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Lettera di Incarico</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #1a1a1a; }
    .page { width: 210mm; min-height: 297mm; padding: 15mm 20mm; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 10mm; }
    .header-table td { border: 1px solid #1a1a1a; padding: 5mm; vertical-align: middle; }
    .header-logo { width: 35mm; text-align: center; }
    .header-title { text-align: center; font-size: 14pt; font-weight: 700; }
    .header-info { width: 35mm; font-size: 9pt; text-align: right; }
    .destinatario { margin: 10mm 0; padding-left: 50%; }
    .letter-body { margin: 10mm 0; text-align: justify; line-height: 1.6; }
    .compensation-box { border: 1px solid #1a1a1a; padding: 5mm; margin: 8mm 0; }
    .footer { position: absolute; bottom: 15mm; left: 20mm; right: 20mm; font-size: 8pt; text-align: center; color: #666; border-top: 1px solid #ccc; padding-top: 5mm; }
  </style>
</head>
<body>
  <div class="page">
    <table class="header-table">
      <tr>
        <td class="header-logo"><div style="border:1px dashed #ccc;padding:10mm">LOGO</div></td>
        <td class="header-title">Lettera di Incarico</td>
        <td class="header-info">Pagina 1/3<br/>Rev. n. 01<br/>del {{current.date}}</td>
      </tr>
    </table>
    <div class="destinatario">
      <p><strong>Gent.</strong></p>
      <p>{{trainer.fullName}}</p>
      <p>{{trainer.address}}</p>
    </div>
    <div class="letter-body">
      <p><strong>Oggetto:</strong> Incarico di docenza per il corso "{{course.title}}"</p>
      <p style="margin-top:5mm">Con la presente Le conferiamo l'incarico di docenza per il corso sopra indicato...</p>
      <div class="compensation-box">
        <p><strong>Compenso:</strong> € {{trainer.hourlyRate}}/ora x {{schedule.totalHours}} ore = <strong>€ {{trainer.totalCompensation}}</strong></p>
      </div>
      <p>Periodo: dal {{schedule.startDate}} al {{schedule.endDate}}</p>
      <p>Sede: {{schedule.location}}</p>
    </div>
    <div style="margin-top:20mm">
      <p>Distinti saluti,</p>
      <p style="margin-top:15mm">{{tenant.name}}</p>
      <div style="border-bottom:1px solid #000;width:200px;margin-top:20mm"></div>
    </div>
    <div class="footer">
      {{tenant.name}} - P.IVA: {{company.vatNumber}} - {{company.address.full}}
    </div>
  </div>
</body>
</html>`
    };

    const existingLetter = await prisma.templateLink.findFirst({
      where: { name: letteraIncarico.name, tenantId: tenant.id, deletedAt: null }
    });

    if (!existingLetter) {
      await prisma.templateLink.create({
        data: {
          id: crypto.randomUUID(),
          name: letteraIncarico.name,
          type: letteraIncarico.type,
          content: letteraIncarico.content,
          isDefault: letteraIncarico.isDefault,
          version: letteraIncarico.version,
          tenantId: tenant.id,
          isActive: true,
          url: 'html-template'
        }
      });
      console.log('✅ Created: Lettera di Incarico Professionale for', tenant.name);
    } else {
      console.log('⏭️ Already exists: Lettera di Incarico for', tenant.name);
    }

  } // end for tenants loop

  await prisma.$disconnect();
  console.log('\\nDone!');
}

createTemplates().catch(console.error);
