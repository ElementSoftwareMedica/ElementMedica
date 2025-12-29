const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function optimizeAllPages() {
  console.log('\n🎨 OPTIMIZING CMS PAGES WITH BALANCED COLORS\n');

  // 1. VISITE-SPECIALISTICHE - Mantieni solo sezioni CTA scure
  console.log('1️⃣  Optimizing visite-specialistiche...');
  const visite = await prisma.cMSPage.findUnique({ where: { slug: 'visite-specialistiche' } });
  if (visite) {
    let content = visite.content;
    
    // Mantieni sezione "Prenota la Tua Visita" con sfondo scuro (già ok)
    // Ma alleggerisci le altre sezioni - usa sfondi chiari con bordi e ombre
    
    // Sezione servizi: sfondo bianco -> sfondo molto chiaro con sfumatura
    content = content.replace(
      /class="py-20 bg-gradient-to-br from-teal-700 via-cyan-800 to-blue-800 text-white relative overflow-hidden"/g,
      'class="py-20 bg-gradient-to-br from-teal-50 via-white to-cyan-50 relative overflow-hidden"'
    );
    
    content = content.replace(
      /class="py-16 bg-gradient-to-br from-blue-900 via-teal-800 to-cyan-800 text-white"/g,
      'class="py-16 bg-gradient-to-br from-blue-50 via-white to-teal-50"'
    );
    
    content = content.replace(
      /class="py-20 bg-gradient-to-br from-teal-800 via-blue-900 to-teal-900 text-white relative"/g,
      'class="py-20 bg-gradient-to-br from-teal-50 via-cyan-50 to-white relative"'
    );
    
    content = content.replace(
      /class="py-20 bg-gradient-to-br from-blue-900 via-teal-800 to-cyan-900 text-white relative"/g,
      'class="py-20 bg-gradient-to-br from-blue-50 via-white to-cyan-50 relative"'
    );
    
    // Ripristina text-gray per sezioni chiare
    content = content.replace(
      /<h2 class="text-3xl lg:text-4xl font-bold text-white mb-4">/g,
      '<h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">'
    );
    
    content = content.replace(
      /<h3 class="text-xl font-semibold text-white mb-2">/g,
      '<h3 class="text-xl font-semibold text-gray-900 mb-2">'
    );
    
    content = content.replace(
      /<p class="text-gray-100">/g,
      '<p class="text-gray-600">'
    );
    
    // Mantieni solo le sezioni CTA con sfondo scuro
    // (già presenti: "Prenota la Tua Visita" e CTA finale)
    
    await prisma.cMSPage.update({
      where: { slug: 'visite-specialistiche' },
      data: { content, updatedAt: new Date() }
    });
    console.log('   ✅ Balanced light/dark sections');
  }

  // 2. MEDICINA-DEL-LAVORO - Hero scuro + sezioni chiare
  console.log('\n2️⃣  Optimizing medicina-del-lavoro...');
  const medicina = await prisma.cMSPage.findUnique({ where: { slug: 'medicina-del-lavoro' } });
  if (medicina) {
    let content = medicina.content;
    
    // Hero: mantieni sfondo scuro ma più bilanciato (teal/cyan invece di troppo blu)
    content = content.replace(
      /class="relative bg-gradient-to-br from-cyan-700 via-blue-700 to-cyan-600 text-white py-24 overflow-hidden"/g,
      'class="relative bg-gradient-to-br from-teal-600 via-cyan-600 to-teal-700 text-white py-24 overflow-hidden"'
    );
    
    // Sezione contenuti: sfondo chiaro
    content = content.replace(
      /class="py-20 bg-gradient-to-br from-gray-800 to-gray-900 text-white"/g,
      'class="py-20 bg-gradient-to-br from-gray-50 to-white"'
    );
    
    // Ripristina text colors per sezioni chiare
    content = content.replace(
      /<div class="text-4xl font-bold text-teal-300 mb-2">/g,
      '<div class="text-4xl font-bold text-teal-600 mb-2">'
    );
    
    content = content.replace(
      /<div class="text-gray-100">/g,
      '<div class="text-gray-600">'
    );
    
    // Sezione CTA finale: mantieni scura ma più bilanciata
    content = content.replace(
      /class="py-20 bg-gradient-to-br from-cyan-700 via-blue-700 to-cyan-600 text-white relative overflow-hidden"/g,
      'class="py-20 bg-gradient-to-br from-teal-600 via-cyan-700 to-blue-600 text-white relative overflow-hidden"'
    );
    
    await prisma.cMSPage.update({
      where: { slug: 'medicina-del-lavoro' },
      data: { content, updatedAt: new Date() }
    });
    console.log('   ✅ Hero dark + light sections + CTA dark');
  }

  // 3. RSPP - Approccio bilanciato
  console.log('\n3️⃣  Optimizing rspp...');
  const rspp = await prisma.cMSPage.findUnique({ where: { slug: 'rspp' } });
  if (rspp) {
    let content = rspp.content;
    
    // Hero: mantieni scuro ma più moderno
    // Sezioni intermedie: alleggerisci
    content = content.replace(
      /class="py-20 bg-gradient-to-br from-gray-800 via-teal-900 to-blue-900 text-white relative overflow-hidden"/g,
      'class="py-20 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 relative overflow-hidden"'
    );
    
    content = content.replace(
      /class="py-20 bg-gradient-to-br from-gray-800 via-blue-900 to-teal-900 text-white"/g,
      'class="py-20 bg-gradient-to-br from-gray-50 via-teal-50 to-cyan-50"'
    );
    
    // Ripristina text per sezioni chiare
    content = content.replace(
      /<h2 class="text-3xl lg:text-4xl font-bold text-white mb-4">/g,
      '<h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">'
    );
    
    content = content.replace(
      /<h3 class="text-xl font-semibold text-white mb-2">/g,
      '<h3 class="text-xl font-semibold text-gray-900 mb-2">'
    );
    
    content = content.replace(
      /<p class="text-gray-200">/g,
      '<p class="text-gray-600">'
    );
    
    // Migliora contrasto card bianche su sfondo chiaro
    content = content.replace(
      /class="bg-white rounded-xl p-6 border-2 border-gray-300 hover:shadow-2xl transition-all"/g,
      'class="bg-white rounded-xl p-6 border border-gray-200 shadow-md hover:shadow-xl hover:border-teal-200 transition-all"'
    );
    
    await prisma.cMSPage.update({
      where: { slug: 'rspp' },
      data: { content, updatedAt: new Date() }
    });
    console.log('   ✅ Balanced with enhanced cards');
  }

  console.log('\n✅ ALL PAGES OPTIMIZED WITH BALANCED APPROACH!\n');
  console.log('Strategy:');
  console.log('  - Hero sections: Dark gradients (teal/cyan) for impact');
  console.log('  - Content sections: Light backgrounds (50 shades) for readability');
  console.log('  - CTA sections: Dark backgrounds for conversion');
  console.log('  - Cards: White with subtle borders and hover effects');
  console.log('\nDo hard refresh to see changes!\n');
  
  await prisma.$disconnect();
}

optimizeAllPages().catch(console.error);
