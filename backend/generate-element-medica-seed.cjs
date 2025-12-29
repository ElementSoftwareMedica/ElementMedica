const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function generateElementMedicaSeed() {
  console.log('\n🏥 GENERAZIONE SEED ELEMENT MEDICA\n');
  
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
    orderBy: { slug: 'asc' }
  });
  
  console.log(`📄 Trovate ${pages.length} pagine per Element Medica\n`);
  
  // Genera il codice JavaScript per il seed
  let seedCode = `
// ==============================================
// ELEMENT MEDICA CMS PAGES SEED
// ==============================================
// Generated on: ${new Date().toISOString()}
// Total pages: ${pages.length}
// ==============================================

async function seedElementMedicaCmsPages() {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'element-medica' }
  });

  if (!tenant) {
    console.log('⚠️  Tenant Element Medica non trovato, skip CMS pages');
    return;
  }

  const elementMedicaPages = [
`;

  pages.forEach((page, index) => {
    // Converti il content in formato appropriato
    let contentStr;
    if (typeof page.content === 'string') {
      // HTML string - escape properly
      contentStr = JSON.stringify(page.content);
    } else {
      // JSON object - stringify with proper formatting
      contentStr = JSON.stringify(page.content, null, 6);
    }
    
    seedCode += `    // ${index + 1}. ${page.title.toUpperCase()}\n`;
    seedCode += `    {\n`;
    seedCode += `      slug: '${page.slug}',\n`;
    seedCode += `      title: '${page.title.replace(/'/g, "\\'")}',\n`;
    if (page.seoTitle) seedCode += `      seoTitle: '${page.seoTitle.replace(/'/g, "\\'")}',\n`;
    if (page.seoDescription) seedCode += `      seoDescription: '${page.seoDescription.replace(/'/g, "\\'")}',\n`;
    seedCode += `      status: '${page.status}',\n`;
    if (page.layout) seedCode += `      layout: '${page.layout}',\n`;
    seedCode += `      content: ${contentStr},\n`;
    seedCode += `      isPublished: ${page.isPublished},\n`;
    seedCode += `      publishedAt: ${page.publishedAt ? `new Date('${page.publishedAt.toISOString()}')` : 'new Date()'},\n`;
    seedCode += `      tenantId: tenant.id\n`;
    seedCode += `    }${index < pages.length - 1 ? ',' : ''}\n`;
    if (index < pages.length - 1) seedCode += `\n`;
  });

  seedCode += `  ];\n\n`;
  seedCode += `  console.log('\\n🏥 Seeding Element Medica CMS Pages...\\n');\n\n`;
  seedCode += `  for (const pageData of elementMedicaPages) {\n`;
  seedCode += `    const existing = await prisma.cMSPage.findFirst({\n`;
  seedCode += `      where: { slug: pageData.slug, tenantId: tenant.id }\n`;
  seedCode += `    });\n\n`;
  seedCode += `    if (existing) {\n`;
  seedCode += `      await prisma.cMSPage.update({\n`;
  seedCode += `        where: { id: existing.id },\n`;
  seedCode += `        data: pageData\n`;
  seedCode += `      });\n`;
  seedCode += `      console.log('   ✅ Updated:', pageData.slug);\n`;
  seedCode += `    } else {\n`;
  seedCode += `      await prisma.cMSPage.create({ data: pageData });\n`;
  seedCode += `      console.log('   ✅ Created:', pageData.slug);\n`;
  seedCode += `    }\n`;
  seedCode += `  }\n\n`;
  seedCode += `  console.log('\\n✅ Element Medica CMS pages seeded successfully!\\n');\n`;
  seedCode += `}\n\n`;
  seedCode += `// Call this function in your main seed:\n`;
  seedCode += `// await seedElementMedicaCmsPages();\n`;

  // Salva il file
  const outputPath = '/Users/matteo.michielon/project 2.0/backend/prisma/seed-element-medica-cms.js';
  fs.writeFileSync(outputPath, seedCode);
  
  console.log(`✅ Seed generato in: ${outputPath}\n`);
  console.log('📋 Pagine incluse:');
  pages.forEach(p => console.log(`   - ${p.slug}`));
  console.log('');
  
  // Genera anche un summary per verificare
  console.log('📊 SUMMARY:');
  console.log(`   Totale pagine: ${pages.length}`);
  console.log(`   Pubblicate: ${pages.filter(p => p.isPublished).length}`);
  console.log(`   HTML pages: ${pages.filter(p => typeof p.content === 'string').length}`);
  console.log(`   JSON pages: ${pages.filter(p => typeof p.content === 'object').length}`);
  console.log('');
  
  await prisma.$disconnect();
}

generateElementMedicaSeed();
