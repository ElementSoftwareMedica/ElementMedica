const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllThreePages() {
  console.log('🔧 Fixing 3 pages: visite-specialistiche, medicina-del-lavoro, rspp\n');
  
  // PAGE 1: Fix visite-specialistiche CTA alignment and button
  console.log('1️⃣ Fixing visite-specialistiche...');
  const visite = await prisma.cMSPage.findFirst({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (visite) {
    let visiteContent = String(visite.content);
    
    // Fix: Center the CTA section
    visiteContent = visiteContent.replace(
      /<div class="bg-gradient-to-r from-teal-900 to-blue-900 text-white p-8 rounded-lg my-12">/g,
      '<div class="bg-gradient-to-r from-teal-900 to-blue-900 text-white p-8 rounded-lg my-12 text-center">'
    );
    
    // Fix: Add proper white background to "Richiedi Informazioni" button on hover
    visiteContent = visiteContent.replace(
      /class="inline-block border-3 border-white !text-white bg-teal-700\/20 px-8 py-4 rounded-xl font-extrabold hover:bg-white hover:!text-teal-700 transition-all duration-300 shadow-lg"/g,
      'class="inline-block border-2 border-white !text-white px-8 py-4 rounded-xl font-extrabold hover:bg-white hover:!text-teal-700 transition-all duration-300 shadow-lg" style="background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px);"'
    );
    
    await prisma.cMSPage.update({
      where: { id: visite.id },
      data: { content: visiteContent }
    });
    console.log('   ✅ CTA centered + button background fixed');
  }
  
  // PAGE 2: Get medicina-del-lavoro for analysis
  console.log('\n2️⃣ Analyzing medicina-del-lavoro...');
  const medicina = await prisma.cMSPage.findFirst({
    where: { slug: 'medicina-del-lavoro-medica' }
  });
  
  if (medicina) {
    console.log('   📄 Page found, length:', medicina.content.length, 'chars');
    const content = String(medicina.content);
    
    // Check for white-on-white issues
    const whiteOnWhite = content.match(/bg-white[^>]*text-white/g) || [];
    console.log('   ⚠️  White-on-white instances:', whiteOnWhite.length);
    
    // Save for detailed fix
    require('fs').writeFileSync('/tmp/medicina-content.html', content);
    console.log('   💾 Content saved to /tmp/medicina-content.html');
  }
  
  // PAGE 3: Get rspp for analysis
  console.log('\n3️⃣ Analyzing rspp...');
  const rspp = await prisma.cMSPage.findFirst({
    where: { slug: 'rspp' }
  });
  
  if (rspp) {
    console.log('   📄 Page found, length:', rspp.content.length, 'chars');
    require('fs').writeFileSync('/tmp/rspp-content.html', rspp.content);
    console.log('   💾 Content saved to /tmp/rspp-content.html');
  }
  
  await prisma.$disconnect();
  console.log('\n✅ Phase 1 complete. Now analyzing other pages...');
}

fixAllThreePages().catch(console.error);
