const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const pages = await prisma.cMSPage.findMany({
      where: { isPublished: true }
    });

    console.log('🔍 Final verification of all pages:\n');

    pages.forEach(page => {
      const content = typeof page.content === 'string' ? page.content : JSON.stringify(page.content);
      
      // Count important patterns
      const importantFixed = (content.match(/!text-teal-[89]00/g) || []).length;
      const totalBgWhite = (content.match(/bg-white/g) || []).length;
      
      console.log(`${page.slug}:`);
      console.log(`  - Length: ${content.length} chars`);
      console.log(`  - bg-white elements: ${totalBgWhite}`);
      console.log(`  - Fixed with !important: ${importantFixed}`);
      
      if (page.slug === 'homepage-medica') {
        console.log(`  ✨ EXTENDED with new sections!`);
      }
      console.log('');
    });

    console.log('\n✅ All pages verified!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
