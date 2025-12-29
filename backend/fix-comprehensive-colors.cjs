const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllColorIssues() {
  console.log('\n🎨 COMPREHENSIVE CMS COLOR FIX\n');

  // 1. VISITE-SPECIALISTICHE
  console.log('1️⃣  VISITE-SPECIALISTICHE');
  const visite = await prisma.cMSPage.findUnique({ where: { slug: 'visite-specialistiche' } });
  if (visite) {
    let content = visite.content;
    
    // Section 2: from-gray-50 via-teal-50 → dark gradient
    content = content.replace(
      /class="py-20 bg-gradient-to-br from-gray-50 via-teal-50\/20 to-blue-50\/20 relative overflow-hidden"/g,
      'class="py-20 bg-gradient-to-br from-teal-700 via-cyan-800 to-blue-800 text-white relative overflow-hidden"'
    );
    
    // Section 3: from-white via-teal-50 → dark gradient
    content = content.replace(
      /class="py-16 bg-gradient-to-br from-white via-teal-50\/30 to-blue-50\/30"/g,
      'class="py-16 bg-gradient-to-br from-blue-900 via-teal-800 to-cyan-800 text-white"'
    );
    
    // Section 4: from-teal-100 → darker
    content = content.replace(
      /class="py-20 bg-gradient-to-br from-teal-100\/40 via-blue-50\/30 to-teal-50\/40 relative"/g,
      'class="py-20 bg-gradient-to-br from-teal-800 via-blue-900 to-teal-900 text-white relative"'
    );
    
    // Section 5: from-blue-100 via-white → dark
    content = content.replace(
      /class="py-20 bg-gradient-to-br from-blue-100\/30 via-white to-teal-100\/30 relative"/g,
      'class="py-20 bg-gradient-to-br from-blue-900 via-teal-800 to-cyan-900 text-white relative"'
    );
    
    // Fix text colors in these sections - change dark text to white
    content = content.replace(/text-gray-900/g, 'text-white');
    content = content.replace(/text-gray-800/g, 'text-white');
    content = content.replace(/text-gray-700/g, 'text-gray-100');
    content = content.replace(/text-teal-600/g, 'text-teal-300');
    content = content.replace(/text-cyan-600/g, 'text-cyan-300');
    content = content.replace(/text-blue-600/g, 'text-blue-300');
    
    await prisma.cMSPage.update({
      where: { slug: 'visite-specialistiche' },
      data: { content, updatedAt: new Date() }
    });
    console.log('   ✅ Fixed all light backgrounds → dark gradients');
  }

  // 2. MEDICINA-DEL-LAVORO
  console.log('\n2️⃣  MEDICINA-DEL-LAVORO');
  const medicina = await prisma.cMSPage.findUnique({ where: { slug: 'medicina-del-lavoro' } });
  if (medicina) {
    let content = medicina.content;
    
    // Check if hero is still light
    if (content.includes('from-teal-50') || content.includes('from-white via-teal')) {
      // Fix hero section
      content = content.replace(
        /class="relative bg-gradient-to-br from-teal-50[^"]*"/g,
        'class="relative bg-gradient-to-br from-teal-700 via-cyan-800 to-blue-800 text-white"'
      );
      
      content = content.replace(
        /class="relative bg-gradient-to-br from-white via-teal-50[^"]*"/g,
        'class="relative bg-gradient-to-br from-teal-700 via-cyan-800 to-blue-800 text-white"'
      );
    }
    
    // Section 2: from-gray-50 to-gray-100 → darker
    content = content.replace(
      /class="py-20 bg-gradient-to-br from-gray-50 to-gray-100"/g,
      'class="py-20 bg-gradient-to-br from-gray-800 to-gray-900 text-white"'
    );
    
    // Fix all bg-white sections to have better contrast
    content = content.replace(
      /class="py-20 bg-white"/g,
      'class="py-20 bg-gradient-to-br from-gray-50 to-white"'
    );
    
    // Ensure statistics are visible
    content = content.replace(
      /<div class="text-4xl font-bold text-teal-600 mb-2">/g,
      '<div class="text-4xl font-bold text-teal-300 mb-2">'
    );
    
    content = content.replace(
      /<div class="text-gray-600">/g,
      '<div class="text-gray-100">'
    );
    
    await prisma.cMSPage.update({
      where: { slug: 'medicina-del-lavoro' },
      data: { content, updatedAt: new Date() }
    });
    console.log('   ✅ Fixed hero and all sections');
  }

  // 3. RSPP
  console.log('\n3️⃣  RSPP');
  const rspp = await prisma.cMSPage.findUnique({ where: { slug: 'rspp' } });
  if (rspp) {
    let content = rspp.content;
    
    // Section 2: from-gray-100 via-teal-50 → dark
    content = content.replace(
      /class="py-20 bg-gradient-to-br from-gray-100 via-teal-50 to-blue-50 relative overflow-hidden"/g,
      'class="py-20 bg-gradient-to-br from-gray-800 via-teal-900 to-blue-900 text-white relative overflow-hidden"'
    );
    
    // Section 4: from-gray-100 via-blue-100 → dark
    content = content.replace(
      /class="py-20 bg-gradient-to-br from-gray-100 via-blue-100\/50 to-teal-100\/50"/g,
      'class="py-20 bg-gradient-to-br from-gray-800 via-blue-900 to-teal-900 text-white"'
    );
    
    // Enhance white cards with strong borders
    content = content.replace(
      /class="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"/g,
      'class="bg-white rounded-xl p-6 border-2 border-gray-300 hover:shadow-2xl transition-all"'
    );
    
    content = content.replace(
      /class="bg-white rounded-2xl p-8 hover:shadow-xl transition-shadow"/g,
      'class="bg-white rounded-2xl p-8 border-2 border-gray-300 hover:shadow-2xl transition-all"'
    );
    
    // Fix text in dark sections
    content = content.replace(
      /<h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">/g,
      '<h2 class="text-3xl lg:text-4xl font-bold text-white mb-4">'
    );
    
    content = content.replace(
      /<h3 class="text-xl font-semibold text-gray-900 mb-2">/g,
      '<h3 class="text-xl font-semibold text-white mb-2">'
    );
    
    content = content.replace(
      /<p class="text-gray-600">/g,
      '<p class="text-gray-200">'
    );
    
    await prisma.cMSPage.update({
      where: { slug: 'rspp' },
      data: { content, updatedAt: new Date() }
    });
    console.log('   ✅ Fixed all light sections and enhanced borders');
  }

  console.log('\n✅ ALL PAGES UPDATED WITH PROPER CONTRAST!\n');
  await prisma.$disconnect();
}

fixAllColorIssues().catch(console.error);
