const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyFinalFixes() {
  console.log('🔧 Applying final fixes to visite-specialistiche\n');
  
  const visite = await prisma.cMSPage.findFirst({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (visite) {
    let content = String(visite.content);
    
    // 1. Fix the INTERMEDIATE "Prenota la Tua Visita" section to be fully centered
    // This is the one in the middle of the page with the simple buttons
    content = content.replace(
      /<div class="bg-gradient-to-r from-teal-900 to-blue-900 text-white p-8 rounded-lg my-12 text-center">([\s\S]*?)<\/div>/,
      function(match, innerContent) {
        // Make sure all buttons are centered
        let fixed = innerContent
          .replace(/class="inline-block bg-white !!text-teal-900/g, 'class="inline-block bg-white !text-teal-900')
          .replace(/<a href="\/contatti"([^>]*?)>/g, '<a href="/contatti"$1 style="display: inline-block;">')
          .replace(/<a href="\/prenota"([^>]*?)>/g, '<a href="/prenota"$1 style="display: inline-block;">');
        
        return '<div class="bg-gradient-to-r from-teal-900 to-blue-900 text-white p-8 rounded-lg my-12 text-center">' + fixed + '</div>';
      }
    );
    
    // 2. Enhance the final CTA section background even more
    content = content.replace(
      /<section class="py-20 bg-gradient-to-r from-teal-600 via-teal-700 to-blue-600 text-white relative overflow-hidden">/,
      '<section class="py-20 bg-gradient-to-r from-teal-600 via-teal-700 to-blue-600 text-white relative overflow-hidden" style="background-size: 400% 400%; animation: gradientShift 15s ease infinite;">'
    );
    
    await prisma.cMSPage.update({
      where: { id: visite.id },
      data: { content }
    });
    
    console.log('✅ visite-specialistiche: Fixed intermediate section centering');
    console.log('✅ visite-specialistiche: Enhanced final CTA background');
  }
  
  await prisma.$disconnect();
}

applyFinalFixes().catch(console.error);
