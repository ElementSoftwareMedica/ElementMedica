const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const page = await prisma.cMSPage.findUnique({
    where: { slug: 'visite-specialistiche' },
    select: { content: true }
  });
  
  if (!page) {
    console.log('❌ Page not found');
    return;
  }
  
  // Check for test banner
  const hasTestBanner = page.content.includes('TEST MARKER') || page.content.includes('⚠️') || page.content.includes('CACHE');
  console.log('Has test banner:', hasTestBanner);
  
  if (hasTestBanner) {
    const bannerIdx = page.content.search(/<!-- ⚠️|⚠️|TEST MARKER|CACHE/i);
    if (bannerIdx > -1) {
      console.log('\n🔍 Test banner found at position:', bannerIdx);
      console.log('Context:', page.content.substring(bannerIdx, bannerIdx + 300));
    }
  }
  
  // Find the 'Prenota la Tua Visita' section
  const idx = page.content.indexOf('Prenota la Tua Visita');
  if (idx > -1) {
    const section = page.content.substring(Math.max(0, idx - 200), idx + 800);
    console.log('\n📍 PRENOTA SECTION:\n', section);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
