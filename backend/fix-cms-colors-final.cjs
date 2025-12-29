const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 FIXING ALL CMS COLOR ISSUES...\n');
  
  // ========================================
  // 1. FIX VISITE-SPECIALISTICHE
  // ========================================
  
  let visitePage = await prisma.cMSPage.findUnique({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (visitePage) {
    let content = visitePage.content;
    
    console.log('1️⃣ Fixing visite-specialistiche...\n');
    
    // PROBLEM: The background gradient is in an absolute positioned div
    // but it may not be rendering properly. Need to ensure the section itself
    // has the background color applied directly to it.
    
    // Replace the problematic "Prenota la Tua Visita" section structure
    // Old: section with absolute bg div + content div
    // New: section with direct background and simplified structure
    
    content = content.replace(
      /<!-- Prenota Section with Enhanced Design -->[\s\S]*?<section class="py-16 relative overflow-hidden">[\s\S]*?<div class="absolute inset-0 bg-gradient-to-r from-teal-900 via-blue-900 to-teal-900"[^>]*><\/div>[\s\S]*?<!-- Decorative elements -->[\s\S]*?<div class="absolute top-0 right-0[^>]*><\/div>[\s\S]*?<div class="absolute bottom-0 left-0[^>]*><\/div>[\s\S]*?<!-- Pattern overlay -->[\s\S]*?<div class="absolute inset-0 opacity-5"[^>]*><\/div>[\s\S]*?<div class="container mx-auto px-4 relative z-10">([\s\S]*?)<\/div>[\s\S]*?<\/section>/,
      function(match, innerContent) {
        return `
        <!-- Prenota Section - Fixed Colors -->
        <section class="py-16 bg-gradient-to-r from-teal-800 via-blue-800 to-teal-800 text-white relative overflow-hidden">
          <!-- Pattern overlay -->
          <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"></div>
          
          <!-- Decorative blur circles -->
          <div class="absolute top-0 right-0 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl"></div>
          <div class="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
          
          <div class="container mx-auto px-4 relative z-10">${innerContent}</div>
        </section>`;
      }
    );
    
    // Fix the "Richiedi Informazioni" button at the bottom
    // The button in the final CTA section needs a more visible background
    content = content.replace(
      /<a href="\/contatti" class="inline-block border-2 border-white !text-white px-8 py-4 rounded-xl font-extrabold hover:bg-white hover:!text-teal-700 transition-all duration-300 shadow-lg" style="background: rgba\(255, 255, 255, 0\.15\); backdrop-filter: blur\(10px\); animation: pulse 2s infinite;">\s*📞 Richiedi Informazioni\s*<\/a>/,
      `<a href="/contatti" class="inline-block border-2 border-white text-white px-8 py-4 rounded-xl font-extrabold hover:bg-white hover:text-teal-700 transition-all duration-300 shadow-2xl" style="background: rgba(255, 255, 255, 0.25); backdrop-filter: blur(10px);">
              📞 Richiedi Informazioni
            </a>`
    );
    
    await prisma.cMSPage.update({
      where: { slug: 'visite-specialistiche' },
      data: { content }
    });
    
    console.log('✅ visite-specialistiche:');
    console.log('   - Fixed "Prenota" section: background now directly on section (not absolute div)');
    console.log('   - Changed colors: from-teal-800 via-blue-800 (darker for better contrast)');
    console.log('   - Enhanced "Richiedi Informazioni" button: increased opacity to 0.25');
    console.log('');
  }
  
  // ========================================
  // 2. FIX MEDICINA-DEL-LAVORO-MEDICA
  // ========================================
  
  let medicinaPage = await prisma.cMSPage.findUnique({
    where: { slug: 'medicina-del-lavoro-medica' }
  });
  
  if (medicinaPage) {
    let content = medicinaPage.content;
    
    console.log('2️⃣ Fixing medicina-del-lavoro-medica...\n');
    
    // The hero section has a light gradient background which causes issues
    // Need to ensure it's darker or has better contrast
    
    // Fix hero section - make background darker
    content = content.replace(
      /<section class="relative bg-gradient-to-br from-teal-50\/30 via-white to-blue-50\/30 py-16 md:py-20">/g,
      '<section class="relative bg-gradient-to-br from-teal-700 via-cyan-800 to-blue-800 py-16 md:py-20 text-white">'
    );
    
    // Update the badge to work on dark background
    content = content.replace(
      /<div class="inline-flex items-center space-x-2 bg-teal-50 text-teal-900 border border-teal-200/g,
      '<div class="inline-flex items-center space-x-2 bg-white/20 text-white border border-white/30 backdrop-blur-sm'
    );
    
    // Update heading gradient for dark background
    content = content.replace(
      /<span class="bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">Completa<\/span>/,
      '<span class="text-teal-300">Completa</span>'
    );
    
    // Update description text
    content = content.replace(
      /<p class="text-lg md:text-xl text-gray-700 leading-relaxed max-w-2xl">/g,
      '<p class="text-lg md:text-xl text-white/90 leading-relaxed max-w-2xl">'
    );
    
    // Fix stats - they should be lighter on dark background
    content = content.replace(
      /<div class="text-3xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">/g,
      '<div class="text-3xl font-bold text-teal-300">'
    );
    
    content = content.replace(
      /<div class="text-sm text-gray-700 mt-1">/g,
      '<div class="text-sm text-white/80 mt-1">'
    );
    
    // Fix the CTA section at the bottom - ensure good contrast
    content = content.replace(
      /<section class="py-20 bg-gradient-to-br from-cyan-700 via-blue-700 to-cyan-600 text-white relative overflow-hidden">/g,
      '<section class="py-20 bg-gradient-to-br from-cyan-800 via-blue-800 to-cyan-900 text-white relative overflow-hidden">'
    );
    
    // Fix badges at bottom
    content = content.replace(
      /<span class="bg-cyan-700 px-4 py-2 rounded-full">/g,
      '<span class="bg-cyan-900 px-4 py-2 rounded-full text-white font-medium">'
    );
    
    await prisma.cMSPage.update({
      where: { slug: 'medicina-del-lavoro-medica' },
      data: { content }
    });
    
    console.log('✅ medicina-del-lavoro-medica:');
    console.log('   - Hero section: changed to dark gradient (from-teal-700 via-cyan-800)');
    console.log('   - All text adjusted for dark background');
    console.log('   - Stats and badges updated with proper contrast');
    console.log('   - CTA section darkened for better visibility');
    console.log('');
  }
  
  // ========================================
  // 3. FIX RSPP
  // ========================================
  
  let rsppPage = await prisma.cMSPage.findUnique({
    where: { slug: 'rspp' }
  });
  
  if (rsppPage) {
    let content = rsppPage.content;
    
    console.log('3️⃣ Fixing rspp...\n');
    
    // RSPP already has good dark backgrounds in hero and final CTA
    // But need to ensure the service cards section has better contrast
    
    // Service cards section - ensure it's not too light
    content = content.replace(
      /<section id="servizi" class="py-20 bg-gradient-to-br from-gray-50 via-teal-50\/30 to-blue-50\/30 relative overflow-hidden">/g,
      '<section id="servizi" class="py-20 bg-gradient-to-br from-gray-100 via-teal-50 to-blue-50 relative overflow-hidden">'
    );
    
    // Ensure cards have good borders and shadows
    content = content.replace(
      /<div class="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-gray-200">/g,
      '<div class="bg-white rounded-xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 border-2 border-gray-300">'
    );
    
    // Enhance service card headings for better visibility
    content = content.replace(
      /<h3 class="text-2xl font-bold mb-4 text-gray-900">/g,
      '<h3 class="text-2xl font-bold mb-4 text-gray-900" style="color: #111827;">'
    );
    
    // FAQ section - ensure good contrast
    content = content.replace(
      /<section class="py-20 bg-gradient-to-br from-gray-50 via-blue-50\/30 to-teal-50\/30">/g,
      '<section class="py-20 bg-gradient-to-br from-gray-100 via-blue-100/50 to-teal-100/50">'
    );
    
    // FAQ cards - stronger borders
    content = content.replace(
      /<div class="bg-white rounded-xl p-8 shadow-lg border border-gray-200">/g,
      '<div class="bg-white rounded-xl p-8 shadow-xl border-2 border-gray-300">'
    );
    
    await prisma.cMSPage.update({
      where: { slug: 'rspp' },
      data: { content }
    });
    
    console.log('✅ rspp:');
    console.log('   - Service cards section: background slightly darkened');
    console.log('   - All cards: stronger borders (border-2 border-gray-300)');
    console.log('   - Card shadows enhanced (shadow-xl)');
    console.log('   - FAQ section: better background contrast');
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('✨ ALL COLOR FIXES APPLIED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Changes summary:');
  console.log('• visite-specialistiche: Dark background directly on section');
  console.log('• medicina-del-lavoro: Hero changed to dark gradient');
  console.log('• rspp: Enhanced card borders and section backgrounds');
  console.log('\n⚠️ Hard refresh required: Cmd+Shift+R\n');
  
  await prisma.$disconnect();
}

main().catch(console.error);
