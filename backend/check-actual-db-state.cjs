const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 VERIFYING ACTUAL DATABASE STATE...\n');
  
  const pages = await prisma.cMSPage.findMany({
    where: {
      slug: {
        in: ['visite-specialistiche', 'medicina-del-lavoro-medica', 'rspp']
      }
    },
    select: {
      slug: true,
      content: true,
      updatedAt: true
    }
  });
  
  for (const page of pages) {
    console.log('═══════════════════════════════════════════════════════');
    console.log(`PAGE: ${page.slug}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Last updated: ${page.updatedAt}`);
    console.log(`Content length: ${page.content.length} chars\n`);
    
    if (page.slug === 'visite-specialistiche') {
      // Check "Prenota" section
      const hasOldAbsoluteBg = page.content.includes('<div class="absolute inset-0 bg-gradient-to-r from-teal-900');
      const hasNewDirectBg = page.content.includes('py-16 bg-gradient-to-r from-teal-800');
      
      console.log('📍 "Prenota la Tua Visita" section:');
      console.log(`  Has OLD absolute bg (should be NO): ${hasOldAbsoluteBg ? '❌ YES - NOT FIXED!' : '✅ NO'}`);
      console.log(`  Has NEW direct bg (should be YES): ${hasNewDirectBg ? '✅ YES' : '❌ NO - NOT FIXED!'}`);
      
      // Show actual section
      const prenotaIdx = page.content.indexOf('Prenota la Tua Visita');
      if (prenotaIdx > -1) {
        const snippet = page.content.substring(Math.max(0, prenotaIdx - 300), prenotaIdx + 500);
        console.log('\nActual content:\n', snippet);
      }
    }
    
    if (page.slug === 'medicina-del-lavoro-medica') {
      const hasOldLightBg = page.content.includes('from-teal-50/30 via-white to-blue-50/30');
      const hasNewDarkBg = page.content.includes('from-teal-700 via-cyan-800 to-blue-800');
      
      console.log('📍 Hero section:');
      console.log(`  Has OLD light bg (should be NO): ${hasOldLightBg ? '❌ YES - NOT FIXED!' : '✅ NO'}`);
      console.log(`  Has NEW dark bg (should be YES): ${hasNewDarkBg ? '✅ YES' : '❌ NO - NOT FIXED!'}`);
      
      // Show hero section
      const heroIdx = page.content.indexOf('Medicina del Lavoro');
      if (heroIdx > -1) {
        const snippet = page.content.substring(Math.max(0, heroIdx - 200), heroIdx + 300);
        console.log('\nActual hero section:\n', snippet);
      }
    }
    
    console.log('\n');
  }
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('CONCLUSION:');
  console.log('═══════════════════════════════════════════════════════');
  console.log('If "NOT FIXED" appears above, the database was NOT updated.');
  console.log('The scripts may have failed silently or used wrong slug names.\n');
  
  await prisma.$disconnect();
}

main().catch(console.error);
