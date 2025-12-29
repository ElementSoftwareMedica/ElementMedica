const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 FORCING DATABASE REFRESH (updating timestamps)...\n');
  
  const slugs = ['visite-specialistiche', 'medicina-del-lavoro-medica', 'rspp'];
  
  for (const slug of slugs) {
    const page = await prisma.cMSPage.findUnique({
      where: { slug }
    });
    
    if (page) {
      // Update with same content but force updatedAt to change
      await prisma.cMSPage.update({
        where: { slug },
        data: {
          content: page.content,
          updatedAt: new Date()
        }
      });
      
      console.log(`✅ ${slug}: timestamp updated to NOW`);
    }
  }
  
  console.log('\n✨ All pages "touched" - timestamps refreshed');
  console.log('⚠️  Now try hard refresh again: Cmd+Shift+R\n');
  
  await prisma.$disconnect();
}

main().catch(console.error);
