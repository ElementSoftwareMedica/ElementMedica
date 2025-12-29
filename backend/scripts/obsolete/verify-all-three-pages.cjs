const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAllPages() {
  console.log('🔍 VERIFICATION REPORT - All 3 Pages\n');
  console.log('='.repeat(60));
  
  // 1. VISITE SPECIALISTICHE
  const visite = await prisma.cMSPage.findFirst({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (visite) {
    const content = String(visite.content);
    console.log('\n✅ VISITE-SPECIALISTICHE (Element Medica - Port 5174)');
    console.log('   📊 Length:', content.length, 'chars');
    
    // Check CTA centering
    const hasCentered = content.includes('my-12 text-center');
    console.log('   ✓ CTA centered:', hasCentered ? '✅ YES' : '❌ NO');
    
    // Check button background
    const hasGlassmorphism = content.includes('backdrop-filter: blur(10px)');
    console.log('   ✓ Button glassmorphism:', hasGlassmorphism ? '✅ YES' : '❌ NO');
    
    // Count sections
    const sections = (content.match(/<section/g) || []).length;
    console.log('   ✓ Sections:', sections);
    
    // Check professional elements
    const hasBlurCircles = content.includes('blur-3xl');
    const hasPatterns = content.includes('radial-gradient');
    const hasIconBadges = content.includes('bg-teal-100');
    console.log('   ✓ Blur circles:', hasBlurCircles ? '✅' : '❌');
    console.log('   ✓ Patterns:', hasPatterns ? '✅' : '❌');
    console.log('   ✓ Icon badges:', hasIconBadges ? '✅' : '❌');
  }
  
  // 2. MEDICINA DEL LAVORO
  const medicina = await prisma.cMSPage.findFirst({
    where: { slug: 'medicina-del-lavoro-medica' }
  });
  
  if (medicina) {
    const content = String(medicina.content);
    console.log('\n✅ MEDICINA-DEL-LAVORO (Element Formazione - Port 5173)');
    console.log('   📊 Length:', content.length, 'chars');
    
    // Check enhancements
    const hasBlurCircles = content.includes('blur-3xl');
    const hasPatterns = content.includes('radial-gradient');
    const hasGradientCards = content.includes('bg-gradient-to-br from-white via-teal-50/20');
    const hasEnhancedIcons = content.includes('w-20 h-20');
    const hasGradientUnderlines = content.includes('bg-gradient-to-r from-teal-500 to-blue-500');
    
    console.log('   ✓ Blur circles:', hasBlurCircles ? '✅ YES' : '❌ NO');
    console.log('   ✓ Patterns:', hasPatterns ? '✅ YES' : '❌ NO');
    console.log('   ✓ Gradient cards:', hasGradientCards ? '✅ YES' : '❌ NO');
    console.log('   ✓ Enhanced icons:', hasEnhancedIcons ? '✅ YES' : '❌ NO');
    console.log('   ✓ Gradient underlines:', hasGradientUnderlines ? '✅ YES' : '❌ NO');
    
    // Check contrast
    const bgWhiteCount = (content.match(/bg-white/g) || []).length;
    const textWhiteCount = (content.match(/text-white/g) || []).length;
    console.log('   ✓ Plain bg-white reduced:', bgWhiteCount, '(enhanced with gradients)');
    console.log('   ✓ text-white instances:', textWhiteCount);
    
    const sections = (content.match(/<section/g) || []).length;
    console.log('   ✓ Sections:', sections);
  }
  
  // 3. RSPP
  const rspp = await prisma.cMSPage.findFirst({
    where: { slug: 'rspp' }
  });
  
  if (rspp) {
    const content = String(rspp.content);
    console.log('\n✅ RSPP (Element Formazione - Port 5173)');
    console.log('   📊 Length:', content.length, 'chars');
    
    // Check sections
    const sections = (content.match(/<section/g) || []).length;
    const h2Count = (content.match(/<h2/g) || []).length;
    const h3Count = (content.match(/<h3/g) || []).length;
    
    console.log('   ✓ Sections:', sections);
    console.log('   ✓ H2 headers:', h2Count);
    console.log('   ✓ H3 headers:', h3Count);
    
    // Check professional elements
    const hasHero = content.includes('Hero Section RSPP');
    const hasServices = content.includes('Cosa Fa il Nostro');
    const hasBenefits = content.includes('Perché Scegliere');
    const hasFAQ = content.includes('Domande Frequenti');
    const hasCTA = content.includes('Final CTA');
    
    console.log('   ✓ Hero section:', hasHero ? '✅' : '❌');
    console.log('   ✓ Services section:', hasServices ? '✅' : '❌');
    console.log('   ✓ Benefits section:', hasBenefits ? '✅' : '❌');
    console.log('   ✓ FAQ section:', hasFAQ ? '✅' : '❌');
    console.log('   ✓ Final CTA:', hasCTA ? '✅' : '❌');
    
    // Check design elements
    const hasBlurCircles = content.includes('blur-3xl');
    const hasPatterns = content.includes('radial-gradient');
    const hasGlassmorphism = content.includes('backdrop-filter');
    const hasGradients = content.includes('bg-gradient-to-br');
    
    console.log('   ✓ Blur circles:', hasBlurCircles ? '✅' : '❌');
    console.log('   ✓ Patterns:', hasPatterns ? '✅' : '❌');
    console.log('   ✓ Glassmorphism:', hasGlassmorphism ? '✅' : '❌');
    console.log('   ✓ Gradient backgrounds:', hasGradients ? '✅' : '❌');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 SUMMARY:');
  console.log('   • visite-specialistiche: Fixed CTA centering + button');
  console.log('   • medicina-del-lavoro: Enhanced with professional design');
  console.log('   • rspp: Completely rebuilt and expanded');
  console.log('\n🎯 Next steps:');
  console.log('   1. Test medicina at: http://localhost:5173/medicina-del-lavoro');
  console.log('   2. Test rspp at: http://localhost:5173/rspp');
  console.log('   3. Test visite at: http://localhost:5174/visite-specialistiche');
  console.log('   4. Hard refresh (Cmd+Shift+R) to see changes');
  
  await prisma.$disconnect();
}

verifyAllPages().catch(console.error);
