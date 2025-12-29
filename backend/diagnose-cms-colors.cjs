const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 DIAGNOSING CMS PAGE COLOR ISSUES...\n');
  
  // 1. Check visite-specialistiche
  const visite = await prisma.cMSPage.findUnique({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (visite) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('1️⃣  VISITE-SPECIALISTICHE ANALYSIS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Check for the "Prenota la Tua Visita" section with white-on-white issue
    const prenotaMatch = visite.content.match(/<section class="py-16[^>]*?>[\s\S]{0,2000}Prenota la Tua Visita[\s\S]{0,2000}<\/section>/);
    
    if (prenotaMatch) {
      const section = prenotaMatch[0];
      console.log('📍 Found "Prenota la Tua Visita" section:\n');
      
      // Check background color
      const hasDarkBg = section.includes('from-teal-900') || section.includes('via-blue-900');
      const hasWhiteText = section.includes('text-white');
      
      console.log('Background:', hasDarkBg ? '✅ Dark gradient' : '❌ Light/white background');
      console.log('Text color:', hasWhiteText ? '✅ White text' : '❌ No white text');
      console.log('Issue:', !hasDarkBg && hasWhiteText ? '⚠️ WHITE ON WHITE!' : '✅ OK');
      
      // Show actual section snippet
      const lines = section.substring(0, 500);
      console.log('\nSection preview:\n', lines, '...\n');
    }
    
    // Check for the button without white background
    const buttonMatch = visite.content.match(/<a[^>]*📞 Richiedi Informazioni[^>]*>/);
    if (buttonMatch) {
      console.log('📍 Found "Richiedi Informazioni" button:');
      console.log(buttonMatch[0]);
      
      const hasBgWhite = buttonMatch[0].includes('bg-white');
      const hasBackdropOnly = buttonMatch[0].includes('backdrop-filter') && !buttonMatch[0].includes('bg-white');
      
      console.log('Has bg-white:', hasBgWhite ? '✅ Yes' : '❌ No');
      console.log('Issue:', hasBackdropOnly ? '⚠️ Only backdrop-filter, no solid bg!' : '✅ OK');
      console.log('\n');
    }
  }
  
  // 2. Check medicina-del-lavoro-medica
  const medicina = await prisma.cMSPage.findUnique({
    where: { slug: 'medicina-del-lavoro-medica' }
  });
  
  if (medicina) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('2️⃣  MEDICINA-DEL-LAVORO ANALYSIS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Check hero section background
    const heroMatch = medicina.content.match(/<section[^>]*bg-gradient[^>]*>[\s\S]{0,1000}Medicina del Lavoro/);
    if (heroMatch) {
      const section = heroMatch[0];
      const bgColor = section.match(/bg-gradient-to-br from-[^\s"]+/)?.[0];
      
      console.log('Hero section background:', bgColor || '❌ Not found');
      
      // Check if it's too light
      const isLightBg = bgColor && (bgColor.includes('white') || bgColor.includes('50') || bgColor.includes('100'));
      console.log('Background type:', isLightBg ? '⚠️ LIGHT (may cause white-on-white)' : '✅ Dark/colored');
    }
    
    // Count white-on-white risks
    const whiteTextCount = (medicina.content.match(/text-white/g) || []).length;
    const lightBgCount = (medicina.content.match(/bg-white|bg-gray-50|bg-teal-50/g) || []).length;
    
    console.log('\nColor statistics:');
    console.log('  text-white instances:', whiteTextCount);
    console.log('  Light backgrounds:', lightBgCount);
    console.log('  Risk level:', whiteTextCount > 20 && lightBgCount > 10 ? '⚠️ HIGH' : '✅ LOW');
    console.log('\n');
  }
  
  // 3. Check rspp
  const rspp = await prisma.cMSPage.findUnique({
    where: { slug: 'rspp' }
  });
  
  if (rspp) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('3️⃣  RSPP ANALYSIS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Check hero section
    const heroMatch = rspp.content.match(/<section[^>]*from-gray-900[\s\S]{0,800}/);
    if (heroMatch) {
      console.log('✅ Hero section has dark gradient (from-gray-900)');
    }
    
    // Check for white-on-light issues in cards
    const cardMatches = rspp.content.match(/<div class="bg-white rounded-xl/g);
    console.log('White cards found:', cardMatches ? cardMatches.length : 0);
    
    // Check if cards have proper text colors
    const hasGrayText = rspp.content.includes('text-gray-700') || rspp.content.includes('text-gray-900');
    console.log('Cards have dark text:', hasGrayText ? '✅ Yes' : '⚠️ May have issues');
    console.log('\n');
  }
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Issues to fix:');
  console.log('1. visite-specialistiche: Check section background vs text color');
  console.log('2. medicina-del-lavoro: Verify no white-on-white in hero/sections');
  console.log('3. rspp: Ensure all cards have proper contrast');
  console.log('\n');
  
  await prisma.$disconnect();
}

main().catch(console.error);
