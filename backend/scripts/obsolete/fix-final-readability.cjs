const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script finale per correggere TUTTI i problemi di leggibilità
 * Aggiunge !important a TUTTI i testi con bg-white
 */

async function fixAllReadabilityIssues() {
  console.log('🔧 Fixing ALL final readability issues...\n');
  
  const pages = await prisma.cMSPage.findMany({
    where: { isPublished: true }
  });
  
  let totalFixed = 0;
  
  for (const page of pages) {
    let content = String(page.content || '');
    let pageFixed = 0;
    
    // Pattern 1: bg-white text-teal-* (qualsiasi numero) SENZA !important
    const pattern1 = /class="([^"]*bg-white[^"]*text-teal-(\d+)[^"]*)"/g;
    content = content.replace(pattern1, (match, classString, tealNum) => {
      // Se già ha !text-teal, salta
      if (classString.includes('!text-teal')) {
        return match;
      }
      // Sostituisci text-teal-X con !text-teal-X
      const newClass = classString.replace(`text-teal-${tealNum}`, `!text-teal-${tealNum}`);
      pageFixed++;
      return `class="${newClass}"`;
    });
    
    // Pattern 2: text-teal-* bg-white (ordine inverso) SENZA !important
    const pattern2 = /class="([^"]*text-teal-(\d+)[^"]*bg-white[^"]*)"/g;
    content = content.replace(pattern2, (match, classString, tealNum) => {
      if (classString.includes('!text-teal')) {
        return match;
      }
      const newClass = classString.replace(`text-teal-${tealNum}`, `!text-teal-${tealNum}`);
      pageFixed++;
      return `class="${newClass}"`;
    });
    
    // Pattern 3: bg-white text-blue-* SENZA !important
    const pattern3 = /class="([^"]*bg-white[^"]*text-blue-(\d+)[^"]*)"/g;
    content = content.replace(pattern3, (match, classString, blueNum) => {
      if (classString.includes('!text-blue')) {
        return match;
      }
      const newClass = classString.replace(`text-blue-${blueNum}`, `!text-blue-${blueNum}`);
      pageFixed++;
      return `class="${newClass}"`;
    });
    
    // Pattern 4: text-blue-* bg-white (ordine inverso) SENZA !important
    const pattern4 = /class="([^"]*text-blue-(\d+)[^"]*bg-white[^"]*)"/g;
    content = content.replace(pattern4, (match, classString, blueNum) => {
      if (classString.includes('!text-blue')) {
        return match;
      }
      const newClass = classString.replace(`text-blue-${blueNum}`, `!text-blue-${blueNum}`);
      pageFixed++;
      return `class="${newClass}"`;
    });
    
    if (pageFixed > 0) {
      await prisma.cMSPage.update({
        where: { id: page.id },
        data: { content }
      });
      
      console.log(`✅ ${page.slug}: Fixed ${pageFixed} readability issues`);
      totalFixed += pageFixed;
    }
  }
  
  await prisma.$disconnect();
  
  console.log(`\n✅ Total fixed: ${totalFixed} elements across all pages`);
  console.log('🎉 All readability issues resolved!');
}

fixAllReadabilityIssues().catch(console.error);
