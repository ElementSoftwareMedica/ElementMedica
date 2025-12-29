const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function extendVisite() {
  console.log('🔧 Extending visite-specialistiche page...\n');
  
  const page = await prisma.cMSPage.findFirst({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (!page) {
    console.log('❌ Page not found!');
    return;
  }
  
  let content = String(page.content);
  const oldLength = content.length;
  
  // Fix CTA section - change bg-white to gradient
  content = content.replace(
    /<div class="([^"]*)(bg-white|text-center)([^"]*)">\s*<h2 class="[^"]*mb-4[^"]*">Prenota la Tua Visita/g,
    '<div class="bg-gradient-to-r from-teal-900 to-blue-900 text-white p-8 rounded-lg my-12">\n              <h2 class="text-3xl font-bold text-white mb-4">Prenota la Tua Visita'
  );
  
  // Ensure buttons have !text-teal or !text-white
  content = content.replace(
    /class="([^"]*bg-white[^"]*)text-teal-([0-9]+)([^"]*)"/g,
    'class="$1!text-teal-$2$3"'
  );
  
  // Read additional sections from file
  const additionalContent = fs.readFileSync(__dirname + '/visite-sections.html', 'utf-8');
  
  // Find insertion point - before the final closing div
  const insertIndex = content.lastIndexOf('</div>');
  
  if (insertIndex === -1) {
    console.log('❌ Could not find insertion point');
    return;
  }
  
  content = content.substring(0, insertIndex) + '\n' + additionalContent + '\n          ' + content.substring(insertIndex);
  
  await prisma.cMSPage.update({
    where: { id: page.id },
    data: { content }
  });
  
  const newLength = content.length;
  console.log(`✅ visite-specialistiche updated!`);
  console.log(`📊 ${oldLength} → ${newLength} chars (+${newLength - oldLength})`);
  
  await prisma.$disconnect();
}

extendVisite().catch(console.error);
