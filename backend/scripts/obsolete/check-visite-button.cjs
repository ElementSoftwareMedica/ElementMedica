const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function checkVisiteButton() {
  const visite = await prisma.cMSPage.findFirst({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (visite) {
    const content = String(visite.content);
    
    // Find the "Richiedi Informazioni" button
    const buttonMatch = content.match(/📞 Richiedi Informazioni[\s\S]{0,300}/);
    
    console.log('🔍 Current button HTML:\n');
    if (buttonMatch) {
      console.log(buttonMatch[0]);
    } else {
      console.log('Button not found with emoji, searching alternative...');
      const altMatch = content.match(/Richiedi Informazioni[\s\S]{0,200}/);
      if (altMatch) {
        console.log(altMatch[0]);
      }
    }
    
    // Check if inline style is present
    const hasInlineStyle = content.includes('backdrop-filter: blur(10px)');
    console.log('\n✓ Has inline style with backdrop-filter:', hasInlineStyle ? '✅ YES' : '❌ NO');
    
    // Check if text-center is present in CTA section
    const hasCentered = content.includes('my-12 text-center');
    console.log('✓ CTA section centered:', hasCentered ? '✅ YES' : '❌ NO');
    
    // Save a snippet for review
    const ctaSection = content.match(/Prenota la [Tt]ua [Vv]isita[\s\S]{0,800}/);
    if (ctaSection) {
      fs.writeFileSync('/tmp/visite-cta-section.html', ctaSection[0]);
      console.log('\n💾 CTA section saved to /tmp/visite-cta-section.html');
    }
  }
  
  await prisma.$disconnect();
}

checkVisiteButton().catch(console.error);
