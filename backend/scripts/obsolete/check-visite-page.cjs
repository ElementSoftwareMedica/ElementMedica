const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function checkPage() {
  const page = await prisma.cMSPage.findFirst({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (!page) {
    console.log('Page not found!');
    return;
  }
  
  // Save to file for inspection
  fs.writeFileSync('/tmp/visite-content.html', page.content);
  console.log('Content saved to /tmp/visite-content.html');
  console.log('Length:', page.content.length, 'chars');
  
  // Show last 500 chars to see structure
  console.log('\n=== LAST 500 CHARS ===');
  console.log(page.content.substring(page.content.length - 500));
  
  await prisma.$disconnect();
}

checkPage().catch(console.error);
