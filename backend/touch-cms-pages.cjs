const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function touchPages() {
  const slugs = ['visite-specialistiche', 'medicina-del-lavoro', 'rspp'];
  
  console.log('\n🔄 TOUCHING CMS PAGES TO INVALIDATE CACHE\n');
  
  for (const slug of slugs) {
    const updated = await prisma.cMSPage.updateMany({
      where: { slug },
      data: {
        updatedAt: new Date()
      }
    });
    
    if (updated.count > 0) {
      console.log(`✅ ${slug}: timestamp updated`);
    } else {
      console.log(`❌ ${slug}: not found`);
    }
  }
  
  // Verify the current content
  console.log('\n📋 CURRENT CONTENT VERIFICATION:\n');
  
  for (const slug of slugs) {
    const page = await prisma.cMSPage.findFirst({
      where: { slug },
      select: {
        slug: true,
        updatedAt: true,
        content: true
      }
    });
    
    if (page) {
      const hasHTML = typeof page.content === 'string';
      const hasDarkHero = page.content.includes('from-teal-700') || 
                         page.content.includes('from-cyan-700') ||
                         page.content.includes('from-gray-900') ||
                         page.content.includes('from-teal-800');
      
      console.log(`${slug}:`);
      console.log(`  - Updated: ${page.updatedAt.toISOString()}`);
      console.log(`  - Format: ${hasHTML ? 'HTML string ✅' : 'JSON object'}`);
      console.log(`  - Has dark hero: ${hasDarkHero ? '✅ YES' : '❌ NO'}`);
      console.log(`  - Content length: ${page.content.length} chars`);
    }
  }
  
  console.log('\n✅ DONE! Now do hard refresh in browser (Cmd+Shift+R)\n');
  
  await prisma.$disconnect();
}

touchPages().catch(console.error);
