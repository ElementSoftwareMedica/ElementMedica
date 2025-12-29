const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function fixVisiteContrastAndDesign() {
  console.log('🎨 Fixing visite-specialistiche contrast and design...\n');
  
  const page = await prisma.cMSPage.findFirst({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (!page) {
    console.log('❌ Page not found!');
    return;
  }
  
  let content = String(page.content);
  
  // PROBLEM 1: H2 title "Prenota Subito..." is white on gradient but hard to read
  // FIX: Make it bolder and add text-shadow
  content = content.replace(
    /<h2 class="text-4xl font-bold mb-4">Prenota Subito la Tua Visita Specialistica<\/h2>/g,
    '<h2 class="text-4xl font-extrabold mb-4 text-white" style="text-shadow: 0 2px 4px rgba(0,0,0,0.3);">Prenota Subito la Tua Visita Specialistica</h2>'
  );
  
  // PROBLEM 2: Border button "Richiedi Informazioni" has poor contrast
  // FIX: Add solid white background on hover, make border thicker
  content = content.replace(
    /class="inline-block border-2 border-white !text-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:!text-teal-700 transition-all duration-300"/g,
    'class="inline-block border-3 border-white !text-white bg-teal-700/20 px-8 py-4 rounded-xl font-extrabold hover:bg-white hover:!text-teal-700 transition-all duration-300 shadow-lg"'
  );
  
  // PROBLEM 3: Too much white space - add background patterns and colors
  // Add background to "Come Prenotare" section
  content = content.replace(
    /<section class="py-16 bg-white">\s*<div class="container mx-auto px-4">\s*<h2 class="text-3xl font-bold text-center text-gray-900 mb-4">Come Prenotare una Visita<\/h2>/g,
    '<section class="py-16 bg-gradient-to-br from-white via-teal-50/30 to-blue-50/30">\n        <div class="container mx-auto px-4">\n          <h2 class="text-3xl font-bold text-center text-teal-900 mb-4">Come Prenotare una Visita</h2>'
  );
  
  // PROBLEM 4: FAQ section too plain white
  content = content.replace(
    /<section class="py-16 bg-white">\s*<div class="container mx-auto px-4 max-w-4xl">\s*<h2 class="text-3xl font-bold text-center text-gray-900 mb-4">Domande Frequenti<\/h2>/g,
    '<section class="py-16 bg-gradient-to-br from-blue-50/40 via-white to-teal-50/40">\n        <div class="container mx-auto px-4 max-w-4xl">\n          <h2 class="text-3xl font-bold text-center text-teal-900 mb-4">Domande Frequenti</h2>'
  );
  
  // PROBLEM 5: Enhance specialist cards with better shadows and hover effects
  content = content.replace(
    /class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"/g,
    'class="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-gray-100"'
  );
  
  // PROBLEM 6: Make step numbers more prominent
  content = content.replace(
    /<div class="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">\s*<span class="text-2xl font-bold text-teal-600">([1-4])<\/span>/g,
    '<div class="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">\n                <span class="text-3xl font-extrabold text-white">$1</span>'
  );
  
  // PROBLEM 7: Improve CTA button in "Come Prenotare"
  content = content.replace(
    /<a href="\/prenota" class="inline-block bg-teal-600 !text-white px-8 py-4 rounded-xl font-bold hover:bg-teal-700 shadow-xl transition-all duration-300">/g,
    '<a href="/prenota" class="inline-block bg-gradient-to-r from-teal-600 to-teal-700 !text-white px-10 py-5 rounded-xl font-extrabold hover:from-teal-700 hover:to-teal-800 shadow-2xl hover:shadow-teal-500/50 transition-all duration-300 transform hover:scale-105">'
  );
  
  // PROBLEM 8: Enhance convenzioni cards
  content = content.replace(
    /<div class="bg-white p-8 rounded-xl shadow-lg">/g,
    '<div class="bg-white p-8 rounded-xl shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-gray-100">'
  );
  
  // PROBLEM 9: Make FAQ items more visible
  content = content.replace(
    /class="bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors group"/g,
    'class="bg-white rounded-lg p-6 hover:bg-teal-50 transition-all duration-300 group shadow-md hover:shadow-lg border border-gray-200"'
  );
  
  // PROBLEM 10: Add decorative elements to section headers
  const enhancedSections = content.replace(
    /<h2 class="text-3xl font-bold text-center text-gray-900 mb-4">I Nostri Specialisti<\/h2>/g,
    '<h2 class="text-4xl font-extrabold text-center text-teal-900 mb-4">I Nostri Specialisti</h2>'
  );
  
  content = enhancedSections;
  
  // PROBLEM 11: Add visual separator before final CTA
  content = content.replace(
    /<!-- Final CTA -->\s*<section class="py-16 bg-gradient-to-r from-teal-600 to-blue-600 text-white">/g,
    '<!-- Final CTA -->\n      <section class="py-20 bg-gradient-to-r from-teal-600 via-teal-700 to-blue-600 text-white relative overflow-hidden">\n        <div class="absolute inset-0 bg-black/10"></div>\n        <div class="relative z-10">'
  );
  
  // Close the relative wrapper
  content = content.replace(
    /<\/div>\s*<\/section>\s*<\/div>/g,
    '</div>\n        </div>\n      </section>\n</div>'
  );
  
  await prisma.cMSPage.update({
    where: { id: page.id },
    data: { content }
  });
  
  console.log('✅ All contrast and design issues fixed!');
  console.log('\n🎨 Changes applied:');
  console.log('   1. ✅ Final CTA title: Added text-shadow and font-extrabold');
  console.log('   2. ✅ Border button: Thicker border + semi-transparent bg');
  console.log('   3. ✅ Come Prenotare: Gradient background (white→teal→blue)');
  console.log('   4. ✅ FAQ section: Gradient background + white cards');
  console.log('   5. ✅ Specialist cards: Enhanced shadows + hover lift effect');
  console.log('   6. ✅ Step numbers: Gradient bg + larger + white text');
  console.log('   7. ✅ CTA buttons: Gradient + scale on hover');
  console.log('   8. ✅ Convenzioni cards: Better shadows + borders');
  console.log('   9. ✅ FAQ items: White bg + teal hover + borders');
  console.log('   10. ✅ Section headers: Larger + extrabold + teal-900');
  console.log('   11. ✅ Final CTA: Darker overlay + extended gradient');
  
  await prisma.$disconnect();
}

fixVisiteContrastAndDesign().catch(console.error);
