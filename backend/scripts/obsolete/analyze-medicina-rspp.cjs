const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeMedicinaAndRspp() {
  console.log('🔍 Deep analysis of medicina-del-lavoro and rspp\n');
  
  // MEDICINA DEL LAVORO
  const medicina = await prisma.cMSPage.findFirst({
    where: { slug: 'medicina-del-lavoro-medica' }
  });
  
  if (medicina) {
    const content = String(medicina.content);
    console.log('📊 MEDICINA-DEL-LAVORO Analysis:');
    console.log('   Length:', content.length, 'chars');
    console.log('   Sections:', (content.match(/<section/g) || []).length);
    console.log('   H2 titles:', (content.match(/<h2/g) || []).length);
    console.log('   Buttons:', (content.match(/<a[^>]*href/g) || []).length);
    console.log('   Background white:', (content.match(/bg-white/g) || []).length);
    console.log('   Text white:', (content.match(/text-white/g) || []).length);
    console.log('\n   First 500 chars:');
    console.log('   ' + content.substring(0, 500).replace(/\n/g, ' '));
  }
  
  // RSPP
  const rspp = await prisma.cMSPage.findFirst({
    where: { slug: 'rspp' }
  });
  
  console.log('\n📊 RSPP Analysis:');
  if (!rspp) {
    console.log('   ❌ Page not found! Checking alternative slugs...');
    
    const allPages = await prisma.cMSPage.findMany({
      where: {
        slug: {
          contains: 'rspp'
        }
      },
      select: { slug: true, title: true }
    });
    
    console.log('   Found pages:', allPages.length);
    allPages.forEach(p => console.log('      -', p.slug, ':', p.title));
  } else {
    const content = String(rspp.content);
    console.log('   Length:', content.length, 'chars');
    console.log('   Sections:', (content.match(/<section/g) || []).length);
    console.log('   H2 titles:', (content.match(/<h2/g) || []).length);
    console.log('\n   First 500 chars:');
    console.log('   ' + content.substring(0, 500).replace(/\n/g, ' '));
  }
  
  await prisma.$disconnect();
}

analyzeMedicinaAndRspp().catch(console.error);
