const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeBannerAndCheckContent() {
  console.log('🔧 Removing test banner and verifying content\n');
  
  const visite = await prisma.cMSPage.findFirst({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (visite) {
    let content = String(visite.content);
    
    // Remove the test banner
    content = content.replace(/<!-- ⚠️ TEST MARKER[\s\S]*?<\/div>\s*/g, '');
    
    // Find the "Prenota la Tua Visita" section
    const prenotaIdx = content.indexOf('Prenota la Tua Visita');
    if (prenotaIdx > -1) {
      const sectionStart = content.lastIndexOf('<', prenotaIdx - 200);
      const snippet = content.substring(sectionStart, prenotaIdx + 500);
      
      console.log('📍 Found "Prenota la Tua Visita" section:\n');
      console.log(snippet.substring(0, 600));
      console.log('\n...\n');
    }
    
    // Check if section is centered
    const hasTextCenter = content.includes('Prenota la Tua Visita') && 
                          content.substring(
                            content.lastIndexOf('Prenota la Tua Visita') - 500,
                            content.lastIndexOf('Prenota la Tua Visita') + 100
                          ).includes('text-center');
    
    console.log('\n✓ Section has text-center:', hasTextCenter ? '✅' : '❌');
    
    // Update without test banner
    await prisma.cMSPage.update({
      where: { id: visite.id },
      data: { content }
    });
    
    console.log('✅ Test banner removed');
  }
  
  await prisma.$disconnect();
}

removeBannerAndCheckContent().catch(console.error);
