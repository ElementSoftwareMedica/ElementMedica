const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function exportAllCMSPages() {
  console.log('\n🔍 ESPORTAZIONE COMPLETA PAGINE CMS\n');
  
  const pages = await prisma.cMSPage.findMany({
    include: {
      tenant: {
        select: { name: true, slug: true }
      }
    },
    orderBy: [
      { tenant: { name: 'asc' } },
      { slug: 'asc' }
    ]
  });
  
  console.log(`📄 Trovate ${pages.length} pagine totali\n`);
  
  // Separa per tenant
  const elementFormazione = pages.filter(p => p.tenant?.name === 'Element Formazione');
  const elementMedica = pages.filter(p => p.tenant?.name === 'Element Medica');
  
  console.log(`🏢 Element Formazione: ${elementFormazione.length} pagine`);
  console.log(`🏥 Element Medica: ${elementMedica.length} pagine\n`);
  
  // Export completo in JSON
  const exportData = {
    exportDate: new Date().toISOString(),
    totalPages: pages.length,
    byTenant: {
      'element-formazione': elementFormazione.map(p => ({
        slug: p.slug,
        title: p.title,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        status: p.status,
        layout: p.layout,
        isPublished: p.isPublished,
        content: p.content,
        tenantSlug: p.tenant?.slug
      })),
      'element-medica': elementMedica.map(p => ({
        slug: p.slug,
        title: p.title,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        status: p.status,
        layout: p.layout,
        isPublished: p.isPublished,
        content: p.content,
        tenantSlug: p.tenant?.slug
      }))
    }
  };
  
  // Salva il file JSON
  const outputPath = '/Users/matteo.michielon/project 2.0/backend/cms-pages-export.json';
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
  
  console.log(`✅ Export salvato in: ${outputPath}\n`);
  
  // Analizza quali pagine sono nel seed
  const seedPath = '/Users/matteo.michielon/project 2.0/backend/prisma/seed.js';
  const seedContent = fs.readFileSync(seedPath, 'utf-8');
  
  console.log('📋 PAGINE NEL SEED vs DATABASE:\n');
  
  console.log('Element Formazione:');
  elementFormazione.forEach(page => {
    const inSeed = seedContent.includes(`slug: '${page.slug}'`);
    const status = inSeed ? '✅' : '❌';
    console.log(`   ${status} ${page.slug.padEnd(30)} ${inSeed ? '(in seed)' : '(MANCA NEL SEED!)'}`);
  });
  
  console.log('\nElement Medica:');
  elementMedica.forEach(page => {
    const inSeed = seedContent.includes(`slug: '${page.slug}'`);
    const status = inSeed ? '✅' : '❌';
    console.log(`   ${status} ${page.slug.padEnd(30)} ${inSeed ? '(in seed)' : '(MANCA NEL SEED!)'}`);
  });
  
  // Conta pagine mancanti
  const missingFormazione = elementFormazione.filter(p => !seedContent.includes(`slug: '${p.slug}'`));
  const missingMedica = elementMedica.filter(p => !seedContent.includes(`slug: '${p.slug}'`));
  
  console.log('\n📊 RIEPILOGO:');
  console.log(`   Element Formazione: ${elementFormazione.length - missingFormazione.length}/${elementFormazione.length} nel seed`);
  console.log(`   Element Medica: ${elementMedica.length - missingMedica.length}/${elementMedica.length} nel seed`);
  console.log(`   TOTALE MANCANTI: ${missingFormazione.length + missingMedica.length}\n`);
  
  if (missingFormazione.length > 0 || missingMedica.length > 0) {
    console.log('⚠️  ATTENZIONE: Alcune pagine NON sono nel seed!\n');
    console.log('Pagine mancanti da aggiungere al seed:\n');
    
    if (missingFormazione.length > 0) {
      console.log('Element Formazione:');
      missingFormazione.forEach(p => console.log(`   - ${p.slug}`));
      console.log('');
    }
    
    if (missingMedica.length > 0) {
      console.log('Element Medica:');
      missingMedica.forEach(p => console.log(`   - ${p.slug}`));
      console.log('');
    }
  } else {
    console.log('✅ Tutte le pagine sono presenti nel seed!\n');
  }
  
  await prisma.$disconnect();
}

exportAllCMSPages();
