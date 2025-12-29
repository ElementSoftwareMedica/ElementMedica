const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const page = await prisma.cMSPage.findUnique({
    where: { slug: 'medicina-del-lavoro' }
  });
  
  if (!page) {
    console.log('❌ Pagina non trovata!');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`\n=== MEDICINA-DEL-LAVORO (Element Formazione) ===`);
  console.log(`Title: ${page.title}`);
  console.log(`Content length: ${page.content.length} chars`);
  console.log(`Updated: ${page.updatedAt}`);
  
  // Check for color issues
  const hasLightHero = page.content.includes('bg-gradient-to-br from-teal-50') || 
                       page.content.includes('from-white');
  const hasDarkHero = page.content.includes('bg-gradient-to-br from-teal-700');
  
  console.log(`\n=== COLOR ANALYSIS ===`);
  console.log(`Has light hero: ${hasLightHero ? '❌ YES - NEEDS FIX' : '✅ NO'}`);
  console.log(`Has dark hero: ${hasDarkHero ? '✅ YES' : '❌ NO - NEEDS FIX'}`);
  
  // Extract first section
  const heroIdx = page.content.indexOf('<section');
  if (heroIdx !== -1) {
    const heroSection = page.content.substring(heroIdx, heroIdx + 600);
    console.log(`\n=== FIRST SECTION (600 chars) ===`);
    console.log(heroSection);
  }
  
  await prisma.$disconnect();
})();
