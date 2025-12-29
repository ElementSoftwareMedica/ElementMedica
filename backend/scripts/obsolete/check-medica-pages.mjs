import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMedicaPages() {
  console.log('🔍 Verificando pagine Element Medica...\n');

  const requiredPages = [
    'homepage-medica',
    'medicina-del-lavoro-medica'
  ];

  for (const slug of requiredPages) {
    const page = await prisma.cMSPage.findFirst({
      where: {
        slug,
        tenantId: 'tenant-id-medica'
      }
    });

    if (page) {
      console.log(`✅ ${slug}: ${page.title} (${page.status})`);
    } else {
      console.log(`❌ ${slug}: MANCANTE`);
    }
  }

  console.log('\n📊 Totale pagine Element Medica:');
  const totalPages = await prisma.cMSPage.count({
    where: {
      tenantId: 'tenant-id-medica'
    }
  });
  console.log(`   ${totalPages} pagine trovate`);
}

checkMedicaPages()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
