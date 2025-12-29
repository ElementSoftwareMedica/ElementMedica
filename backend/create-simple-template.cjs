const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const simpleTemplateHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Attestato</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .certificate { border: 2px solid #333; padding: 40px; text-align: center; }
    h1 { color: #2c3e50; }
    .info { margin: 20px 0; }
  </style>
</head>
<body>
  <div class="certificate">
    <h1>ATTESTATO DI FORMAZIONE</h1>
    
    <div class="info">
      <p><strong>Si certifica che</strong></p>
      <p style="font-size: 20px;"><strong>{{person.firstName}} {{person.lastName}}</strong></p>
      <p>Codice Fiscale: {{person.cf}}</p>
    </div>
    
    <div class="info">
      <p>ha partecipato al corso:</p>
      <p style="font-size: 18px;"><strong>{{course.title}}</strong></p>
      <p>Codice corso: {{course.code}}</p>
      <p>Durata: {{course.duration}} ore</p>
    </div>
    
    <div class="info">
      <p>Edizione: {{schedule.code}}</p>
      <p>Dal {{schedule.startDate|date:DD/MM/YYYY}} al {{schedule.endDate|date:DD/MM/YYYY}}</p>
      <p>Sede: {{schedule.location}}</p>
    </div>
    
    <div class="info">
      <p>Docente: {{trainer.fullName}}</p>
    </div>
    
    <div class="info">
      <p>Data emissione: {{current.date|date:DD/MM/YYYY}}</p>
      <p>Numero attestato: {{certificate.registrationNumber}}</p>
    </div>
  </div>
</body>
</html>`;

async function createTemplate() {
  try {
    // Check if version exists
    let version = await prisma.templateVersion.findFirst({
      where: { templateId: '55f7d543-81d4-4c2c-a90a-e7a2d0d67fe1' }
    });

    if (version) {
      // Update existing
      version = await prisma.templateVersion.update({
        where: { id: version.id },
        data: { content: simpleTemplateHTML }
      });
      console.log('✅ Template version updated');
    } else {
      // Create new
      version = await prisma.templateVersion.create({
        data: {
          templateId: '55f7d543-81d4-4c2c-a90a-e7a2d0d67fe1',
          version: 1,
          content: simpleTemplateHTML,
          createdBy: '0b2d012b-b86b-40fa-829b-527ac5323d6a', // admin user
          changelog: 'Initial template creation'
        }
      });
      console.log('✅ Template version created');
    }
    
    console.log('Content length:', version.content.length);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createTemplate();
