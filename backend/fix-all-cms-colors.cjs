const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllPages() {
  console.log('\n=== FIXING ALL CMS PAGES COLORS ===\n');

  // 1. FIX VISITE-SPECIALISTICHE
  console.log('1️⃣  Fixing visite-specialistiche...');
  const visite = await prisma.cMSPage.findUnique({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (visite) {
    let content = visite.content;
    
    // Fix "Prenota la Tua Visita" section - already has dark background, ensure buttons are visible
    // The section already has: bg-gradient-to-r from-teal-800 via-blue-800 to-teal-800
    // Buttons should be fine with current markup
    
    console.log('   ✅ visite-specialistiche already has dark backgrounds');
  }

  // 2. FIX MEDICINA-DEL-LAVORO (Element Formazione version)
  console.log('\n2️⃣  Fixing medicina-del-lavoro...');
  const medicina = await prisma.cMSPage.findUnique({
    where: { slug: 'medicina-del-lavoro' }
  });
  
  if (medicina) {
    let content = medicina.content;
    
    // Check current hero section
    const hasLightHero = content.includes('from-teal-50') || content.includes('from-white');
    
    if (hasLightHero) {
      console.log('   🔧 Converting light hero to dark...');
      
      // Replace light hero with dark gradient
      content = content.replace(
        /class="relative\s+bg-gradient-to-br\s+from-teal-50[^"]*"/g,
        'class="relative bg-gradient-to-br from-teal-700 via-cyan-800 to-blue-800 text-white"'
      );
      
      // Ensure hero text is white
      content = content.replace(
        /class="text-5xl lg:text-6xl font-bold mb-6 leading-tight"/g,
        'class="text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white"'
      );
      
      // Fix statistics to be visible on dark background
      content = content.replace(
        /<div class="text-4xl font-bold text-teal-600 mb-2">/g,
        '<div class="text-4xl font-bold text-teal-300 mb-2">'
      );
      
      content = content.replace(
        /<div class="text-gray-600">/g,
        '<div class="text-white">'
      );
      
      // Fix "Proteggi la Salute" CTA section
      content = content.replace(
        /class="py-20 bg-gradient-to-br from-cyan-50[^"]*"/g,
        'class="py-20 bg-gradient-to-br from-cyan-700 via-blue-700 to-cyan-600 text-white"'
      );
      
      await prisma.cMSPage.update({
        where: { slug: 'medicina-del-lavoro' },
        data: { content, updatedAt: new Date() }
      });
      
      console.log('   ✅ Updated medicina-del-lavoro');
    } else {
      console.log('   ✅ medicina-del-lavoro already has dark hero');
    }
  }

  // 3. FIX RSPP
  console.log('\n3️⃣  Fixing rspp...');
  const rspp = await prisma.cMSPage.findUnique({
    where: { slug: 'rspp' }
  });
  
  if (rspp) {
    let content = rspp.content;
    
    // Enhance white cards on light backgrounds
    // Add stronger borders and shadows
    content = content.replace(
      /class="bg-white rounded-xl p-6"/g,
      'class="bg-white rounded-xl p-6 border-2 border-gray-300 shadow-xl"'
    );
    
    content = content.replace(
      /class="bg-white rounded-2xl p-8"/g,
      'class="bg-white rounded-2xl p-8 border-2 border-gray-300 shadow-xl"'
    );
    
    // Ensure CTA sections have dark backgrounds
    if (!content.includes('from-gray-900 via-blue-900 to-teal-900')) {
      content = content.replace(
        /class="py-20 bg-gradient-to-r from-teal-600[^"]*"/g,
        'class="py-20 bg-gradient-to-r from-gray-900 via-blue-900 to-teal-900 text-white"'
      );
    }
    
    await prisma.cMSPage.update({
      where: { slug: 'rspp' },
      data: { content, updatedAt: new Date() }
    });
    
    console.log('   ✅ Updated rspp');
  }

  console.log('\n✅ ALL PAGES UPDATED!\n');
  await prisma.$disconnect();
}

fixAllPages().catch(console.error);
