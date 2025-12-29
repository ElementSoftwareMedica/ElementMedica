const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllCMSPages() {
  const pages = await prisma.cMSPage.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      isPublished: true,
      tenant: {
        select: { name: true }
      }
    },
    orderBy: [
      { tenant: { name: 'asc' } },
      { slug: 'asc' }
    ]
  });
  
  console.log('\n📄 TUTTE LE PAGINE CMS NEL DATABASE:\n');
  
  const byTenant = {};
  pages.forEach(page => {
    const tenantName = page.tenant?.name || 'No Tenant';
    if (!byTenant[tenantName]) byTenant[tenantName] = [];
    byTenant[tenantName].push(page);
  });
  
  Object.entries(byTenant).forEach(([tenant, pages]) => {
    console.log(`\n🏢 ${tenant} (${pages.length} pagine):`);
    pages.forEach(page => {
      const status = page.isPublished ? '✅' : '❌';
      console.log(`   ${status} ${page.slug.padEnd(35)} - ${page.title}`);
    });
  });
  
  console.log(`\n📊 TOTALE: ${pages.length} pagine\n`);
  
  await prisma.$disconnect();
}

listAllCMSPages();
