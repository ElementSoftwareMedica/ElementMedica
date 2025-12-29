const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 ADDITIONAL FIXES FOR REMAINING ISSUES...\n');
  
  // Fix medicina-del-lavoro remaining issues
  const medicina = await prisma.cMSPage.findUnique({
    where: { slug: 'medicina-del-lavoro-medica' }
  });
  
  if (medicina) {
    let content = medicina.content;
    
    console.log('Fixing medicina-del-lavoro remaining gradient issues...\n');
    
    // Fix any remaining gradient text that should be solid color
    // The stats might still have the old gradient
    const beforeLength = content.length;
    
    // Remove any lingering gradient text classes in stats
    content = content.replace(
      /text-3xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent/g,
      'text-3xl font-bold text-teal-300'
    );
    
    // Fix CTA section if not updated
    if (!content.includes('from-cyan-800 via-blue-800 to-cyan-900')) {
      content = content.replace(
        /bg-gradient-to-br from-cyan-700 via-blue-700 to-cyan-600 text-white/g,
        'bg-gradient-to-br from-cyan-800 via-blue-800 to-cyan-900 text-white'
      );
    }
    
    // Fix badges if not updated
    if (!content.includes('bg-cyan-900')) {
      content = content.replace(
        /<span class="bg-cyan-700 px-4 py-2 rounded-full">/g,
        '<span class="bg-cyan-900 px-4 py-2 rounded-full text-white font-medium">'
      );
    }
    
    const afterLength = content.length;
    
    if (beforeLength !== afterLength) {
      await prisma.cMSPage.update({
        where: { slug: 'medicina-del-lavoro-medica' },
        data: { content }
      });
      console.log('✅ medicina-del-lavoro: Additional fixes applied');
    } else {
      console.log('ℹ️  medicina-del-lavoro: Already up to date');
    }
  }
  
  // Fix visite-specialistiche button if needed
  const visite = await prisma.cMSPage.findUnique({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (visite) {
    let content = visite.content;
    
    console.log('\nChecking visite-specialistiche button...');
    
    // Find and fix the final CTA button
    const finalCTAMatch = content.match(/<section class="py-20 bg-gradient-to-r from-teal-600[\s\S]*?<\/section>/);
    
    if (finalCTAMatch) {
      const oldSection = finalCTAMatch[0];
      
      // Fix the button in the final CTA
      const newSection = oldSection.replace(
        /<a href="\/contatti" class="inline-block border-2 border-white !text-white px-8 py-4 rounded-xl font-extrabold hover:bg-white hover:!text-teal-700 transition-all duration-300 shadow-lg" style="[^"]*">\s*📞 Richiedi Informazioni\s*<\/a>/,
        '<a href="/contatti" class="inline-block bg-white/25 backdrop-blur-lg border-2 border-white text-white px-8 py-4 rounded-xl font-extrabold hover:bg-white hover:text-teal-700 transition-all duration-300 shadow-2xl">\n              📞 Richiedi Informazioni\n            </a>'
      );
      
      if (oldSection !== newSection) {
        content = content.replace(oldSection, newSection);
        
        await prisma.cMSPage.update({
          where: { slug: 'visite-specialistiche' },
          data: { content }
        });
        console.log('✅ visite-specialistiche: Button fixed with bg-white/25');
      } else {
        console.log('ℹ️  visite-specialistiche: Button already has good background');
      }
    }
  }
  
  console.log('\n✨ All additional fixes completed!\n');
  
  await prisma.$disconnect();
}

main().catch(console.error);
