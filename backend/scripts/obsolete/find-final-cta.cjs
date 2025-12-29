const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function findFinalCTA() {
  const visite = await prisma.cMSPage.findFirst({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (visite) {
    const content = String(visite.content);
    
    // Find the gradient CTA section with "Richiedi Informazioni"
    const matches = content.match(/bg-gradient-to-r from-teal-\d+ to-blue-\d+[\s\S]{0,1000}Richiedi Informazioni[\s\S]{0,200}/g);
    
    if (matches) {
      console.log('🔍 Found', matches.length, 'gradient CTA sections\n');
      matches.forEach((match, idx) => {
        console.log(`\n=== CTA Section ${idx + 1} ===`);
        console.log(match.substring(0, 500));
        console.log('\n');
      });
    } else {
      console.log('❌ No gradient CTA sections found');
    }
    
    // Also check for the exact pattern from the fix
    const hasMyPattern = content.includes('my-12 text-center');
    const hasBackdrop = content.includes('backdrop-filter: blur(10px)');
    
    console.log('\n✓ Has "my-12 text-center":', hasMyPattern ? '✅' : '❌');
    console.log('✓ Has backdrop-filter:', hasBackdrop ? '✅' : '❌');
  }
  
  await prisma.$disconnect();
}

findFinalCTA().catch(console.error);
