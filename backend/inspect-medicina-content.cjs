const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const page = await prisma.cMSPage.findUnique({
    where: { slug: 'medicina-del-lavoro-medica' }
  });
  
  if (!page) {
    console.log('❌ Page not found');
    return;
  }
  
  // Show first 3000 chars to see the structure
  console.log('FIRST 3000 CHARS:\n');
  console.log(page.content.substring(0, 3000));
  console.log('\n\n...\n\n');
  
  // Show last 1500 chars
  console.log('LAST 1500 CHARS:\n');
  console.log(page.content.substring(page.content.length - 1500));
  
  await prisma.$disconnect();
}

main().catch(console.error);
