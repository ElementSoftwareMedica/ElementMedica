const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addFinalTouches() {
  console.log('✨ Adding final professional touches...\n');
  
  const page = await prisma.cMSPage.findFirst({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (!page) {
    console.log('❌ Page not found!');
    return;
  }
  
  let content = String(page.content);
  
  // Add icon decorations to section titles
  content = content.replace(
    /<h2 class="text-4xl font-extrabold text-center text-teal-900 mb-4">I Nostri Specialisti<\/h2>/g,
    '<div class="text-center mb-8">\n          <div class="inline-block bg-teal-100 p-3 rounded-full mb-4">\n            <svg class="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>\n            </svg>\n          </div>\n          <h2 class="text-4xl font-extrabold text-teal-900 mb-3">I Nostri Specialisti</h2>\n          <div class="w-24 h-1 bg-gradient-to-r from-teal-500 to-blue-500 mx-auto rounded-full"></div>\n        </div>'
  );
  
  content = content.replace(
    /<h2 class="text-3xl font-bold text-center text-teal-900 mb-4">Come Prenotare una Visita<\/h2>/g,
    '<div class="text-center mb-8">\n          <div class="inline-block bg-teal-100 p-3 rounded-full mb-4">\n            <svg class="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>\n            </svg>\n          </div>\n          <h2 class="text-4xl font-extrabold text-teal-900 mb-3">Come Prenotare una Visita</h2>\n          <div class="w-24 h-1 bg-gradient-to-r from-teal-500 to-blue-500 mx-auto rounded-full"></div>\n        </div>'
  );
  
  content = content.replace(
    /<h2 class="text-3xl font-bold text-center text-gray-900 mb-4">Convenzioni e Tariffe<\/h2>/g,
    '<div class="text-center mb-8">\n          <div class="inline-block bg-teal-100 p-3 rounded-full mb-4">\n            <svg class="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>\n            </svg>\n          </div>\n          <h2 class="text-4xl font-extrabold text-teal-900 mb-3">Convenzioni e Tariffe</h2>\n          <div class="w-24 h-1 bg-gradient-to-r from-teal-500 to-blue-500 mx-auto rounded-full"></div>\n        </div>'
  );
  
  content = content.replace(
    /<h2 class="text-3xl font-bold text-center text-teal-900 mb-4">Domande Frequenti<\/h2>/g,
    '<div class="text-center mb-8">\n          <div class="inline-block bg-teal-100 p-3 rounded-full mb-4">\n            <svg class="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>\n            </svg>\n          </div>\n          <h2 class="text-4xl font-extrabold text-teal-900 mb-3">Domande Frequenti</h2>\n          <div class="w-24 h-1 bg-gradient-to-r from-teal-500 to-blue-500 mx-auto rounded-full"></div>\n        </div>'
  );
  
  // Add subtle animation classes and better spacing to hero section
  content = content.replace(
    /<h1 class="text-4xl font-bold text-teal-900 mb-8">Visite Specialistiche<\/h1>/g,
    '<h1 class="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-700 to-blue-700 mb-6">Visite Specialistiche</h1>'
  );
  
  // Improve subtitle styling
  content = content.replace(
    /<p class="text-xl text-gray-700 mb-12">/g,
    '<p class="text-xl text-gray-600 mb-12 leading-relaxed">'
  );
  
  // Add gradient overlay pattern to final CTA for depth
  content = content.replace(
    /<h2 class="text-4xl font-extrabold mb-4 text-white" style="text-shadow: 0 2px 4px rgba\(0,0,0,0\.3\);">Prenota Subito la Tua Visita Specialistica<\/h2>/g,
    '<h2 class="text-5xl font-extrabold mb-6 text-white" style="text-shadow: 0 3px 8px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.2);">Prenota Subito la Tua Visita Specialistica</h2>'
  );
  
  await prisma.cMSPage.update({
    where: { id: page.id },
    data: { content }
  });
  
  console.log('✅ Final professional touches added!');
  console.log('\n✨ Enhancements:');
  console.log('   • Icon badges for all section headers');
  console.log('   • Decorative underlines (gradient)');
  console.log('   • Hero title with gradient text');
  console.log('   • Enhanced final CTA with double text-shadow');
  console.log('   • Consistent 4xl font-extrabold for all sections');
  console.log('   • Better spacing and visual hierarchy');
  
  await prisma.$disconnect();
}

addFinalTouches().catch(console.error);
