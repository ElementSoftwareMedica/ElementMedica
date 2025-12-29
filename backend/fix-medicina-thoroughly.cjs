const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 FIXING MEDICINA-DEL-LAVORO PAGE...\n');
  
  let page = await prisma.cMSPage.findUnique({
    where: { slug: 'medicina-del-lavoro-medica' }
  });
  
  if (!page) {
    console.log('❌ Page not found');
    return;
  }
  
  let content = page.content;
  
  console.log(`Original size: ${content.length} chars`);
  
  // 1. Add text shadows to statistics in hero section
  content = content.replace(
    /<div class="text-4xl font-bold text-white mb-2">(\d+\+?)<\/div>/g,
    '<div class="text-4xl font-bold text-white mb-2" style="text-shadow: 0 2px 8px rgba(0,0,0,0.4);">$1</div>'
  );
  
  content = content.replace(
    /<div class="text-white">([^<]+)<\/div>/g,
    function(match, text) {
      // Only add shadow to short text (labels), not long paragraphs
      if (text.length < 30 && !text.includes('class=')) {
        return `<div class="text-white" style="text-shadow: 0 1px 4px rgba(0,0,0,0.3);">${text}</div>`;
      }
      return match;
    }
  );
  
  // 2. Enhance trust badges
  content = content.replace(
    /<span class="font-semibold">([^<]+)<\/span>/g,
    '<span class="font-semibold" style="text-shadow: 0 1px 3px rgba(0,0,0,0.2);">$1</span>'
  );
  
  // 3. Fix partner badges - make them darker
  content = content.replace(
    /<span class="bg-cyan-700 px-4 py-2 rounded-full">/g,
    '<span class="bg-cyan-800 px-4 py-2 rounded-full text-white font-medium" style="box-shadow: 0 2px 8px rgba(0,0,0,0.3);">'
  );
  
  // 4. Enhance white cards with gradients - more aggressive replacement
  content = content.replace(
    /<div class="bg-white rounded-xl p-8 shadow-xl"/g,
    '<div class="bg-gradient-to-br from-white via-gray-50 to-teal-50/30 rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-200"'
  );
  
  content = content.replace(
    /<div class="bg-white rounded-xl p-6 shadow-xl"/g,
    '<div class="bg-gradient-to-br from-white via-gray-50 to-teal-50/30 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-200"'
  );
  
  content = content.replace(
    /<div class="bg-white rounded-lg p-8 shadow-xl"/g,
    '<div class="bg-gradient-to-br from-white via-gray-50 to-teal-50/30 rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-200"'
  );
  
  // General bg-white cards
  content = content.replace(
    /<div class="bg-white rounded/g,
    '<div class="bg-gradient-to-br from-white via-gray-50 to-teal-50/30 rounded'
  );
  
  // 5. Darken text throughout
  content = content.replace(
    /<p class="text-gray-600 leading-relaxed">/g,
    '<p class="text-gray-700 leading-relaxed">'
  );
  
  content = content.replace(
    /<p class="text-gray-600 mb-/g,
    '<p class="text-gray-700 mb-'
  );
  
  // 6. Enhance section backgrounds
  content = content.replace(
    /<section class="py-20 bg-white">/g,
    '<section class="py-20 bg-gradient-to-br from-white via-gray-50/50 to-teal-50/20">'
  );
  
  content = content.replace(
    /<section class="py-16 bg-gray-50">/g,
    '<section class="py-16 bg-gradient-to-br from-gray-50 via-teal-50/30 to-blue-50/20">'
  );
  
  // 7. Enhance icon badges
  content = content.replace(
    /<div class="w-14 h-14 bg-gradient-to-br from-cyan-500/g,
    '<div class="w-16 h-16 bg-gradient-to-br from-cyan-500'
  );
  
  content = content.replace(
    /<div class="w-14 h-14 bg-cyan-100/g,
    '<div class="w-16 h-16 bg-gradient-to-br from-cyan-100 to-teal-100'
  );
  
  console.log(`New size: ${content.length} chars`);
  console.log(`Change: ${content.length - page.content.length} chars\n`);
  
  // Count changes
  const textShadows = (content.match(/text-shadow/g) || []).length;
  const gradients = (content.match(/bg-gradient-to-br from-white/g) || []).length;
  const gray700 = (content.match(/text-gray-700/g) || []).length;
  const cyan800 = (content.match(/bg-cyan-800/g) || []).length;
  
  console.log('Changes applied:');
  console.log(`  ✅ Text shadows: ${textShadows} instances`);
  console.log(`  ✅ Gradient backgrounds: ${gradients} cards`);
  console.log(`  ✅ Darkened text: ${gray700} instances`);
  console.log(`  ✅ Enhanced badges: ${cyan800} badges`);
  
  await prisma.cMSPage.update({
    where: { slug: 'medicina-del-lavoro-medica' },
    data: { content }
  });
  
  console.log('\n✅ medicina-del-lavoro-medica: All improvements applied successfully!\n');
  
  await prisma.$disconnect();
}

main().catch(console.error);
