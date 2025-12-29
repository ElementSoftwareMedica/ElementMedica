import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPages() {
  const pages = await prisma.cMSPage.findMany({
    where: { tenantId: 'd2bbc5b0-344c-47c7-8ef5-f57755293372' },
    select: { slug: true, title: true },
    orderBy: { slug: 'asc' }
  });
  
  console.log('\n📄 ELEMENT FORMAZIONE PAGES:\n');
  pages.forEach(p => console.log(`  ${p.slug.padEnd(35)} → ${p.title}`));
  console.log(`\n📊 Total: ${pages.length} pages\n`);
  
  await prisma.$disconnect();
}

checkPages().catch(console.error);
