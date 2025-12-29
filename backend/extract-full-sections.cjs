const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 EXTRACTING FULL SECTION HTML...\n');
  
  const visite = await prisma.cMSPage.findUnique({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (visite) {
    // Find the "Prenota" section - look for the section tag before it
    const prenotaIdx = visite.content.indexOf('Prenota la Tua Visita');
    
    // Go back to find the opening <section> tag
    let sectionStart = visite.content.lastIndexOf('<section', prenotaIdx);
    
    // Find the closing </section>
    let sectionEnd = visite.content.indexOf('</section>', prenotaIdx);
    
    if (sectionStart > -1 && sectionEnd > -1) {
      const fullSection = visite.content.substring(sectionStart, sectionEnd + 10);
      
      console.log('FULL "PRENOTA LA TUA VISITA" SECTION:');
      console.log('═══════════════════════════════════════════════════════\n');
      console.log(fullSection.substring(0, 1500));
      console.log('\n... (truncated) ...\n');
    }
  }
  
  const medicina = await prisma.cMSPage.findUnique({
    where: { slug: 'medicina-del-lavoro-medica' }
  });
  
  if (medicina) {
    console.log('\n\n');
    console.log('MEDICINA-DEL-LAVORO HERO SECTION:');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Find hero section
    const heroIdx = medicina.content.indexOf('Medicina del Lavoro');
    let sectionStart = medicina.content.lastIndexOf('<section', heroIdx);
    let sectionEnd = medicina.content.indexOf('</section>', heroIdx);
    
    if (sectionStart > -1) {
      const sectionTag = medicina.content.substring(sectionStart, sectionStart + 200);
      console.log('Section opening tag:');
      console.log(sectionTag);
    }
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
