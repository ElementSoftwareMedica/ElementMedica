const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showActualContent() {
  const page = await prisma.cMSPage.findUnique({
    where: { slug: 'medicina-del-lavoro' }
  });
  
  if (!page) {
    console.log('Page not found!');
    return;
  }
  
  console.log('\n=== MEDICINA-DEL-LAVORO ACTUAL CONTENT ===\n');
  console.log('Type of content:', typeof page.content);
  console.log('Content length:', page.content.length);
  console.log('\nFirst 2000 chars:\n');
  console.log(page.content.substring(0, 2000));
  console.log('\n...\n');
  console.log('\nLast 500 chars:\n');
  console.log(page.content.substring(page.content.length - 500));
  
  await prisma.$disconnect();
}

showActualContent().catch(console.error);
