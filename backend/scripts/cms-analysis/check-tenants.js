import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTenants() {
  const pages = await prisma.cMSPage.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      tenantId: true,
    },
    take: 10,
  });

  console.log('Pagine CMS attuali:');
  console.log(JSON.stringify(pages, null, 2));

  await prisma.$disconnect();
}

checkTenants();
