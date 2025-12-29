const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function exportElementMedicaToJSON() {
  console.log('\n🏥 ESPORTAZIONE ELEMENT MEDICA IN FORMATO JSON\n');
  
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'element-medica' }
  });
  
  if (!tenant) {
    console.log('❌ Tenant Element Medica non trovato');
    await prisma.$disconnect();
    return;
  }
  
  const pages = await prisma.cMSPage.findMany({
    where: { tenantId: tenant.id },
    orderBy: { slug: 'asc' },
    select: {
      slug: true,
      title: true,
      seoTitle: true,
      seoDescription: true,
      status: true,
      layout: true,
      content: true,
      isPublished: true
    }
  });
  
  console.log(`📄 Trovate ${pages.length} pagine per Element Medica\n`);
  
  const exportData = {
    _meta: {
      exportDate: new Date().toISOString(),
      tenant: 'element-medica',
      totalPages: pages.length,
      description: 'CMS Pages seed data for Element Medica'
    },
    pages: pages
  };
  
  // Salva il file JSON
  const outputPath = '/Users/matteo.michielon/project 2.0/backend/prisma/seed-element-medica-pages.json';
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
  
  console.log(`✅ Export salvato in: ${outputPath}\n`);
  console.log('📋 Pagine esportate:');
  pages.forEach(p => console.log(`   - ${p.slug}`));
  console.log('');
  
  await prisma.$disconnect();
}

exportElementMedicaToJSON();
