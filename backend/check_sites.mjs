import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

try {
  const personsWithSite = await prisma.person.findMany({
    where: {
      deletedAt: null,
      siteId: { not: null }
    },
    select: {
      firstName: true,
      lastName: true,
      siteId: true,
      site: {
        select: {
          siteName: true,
          citta: true
        }
      }
    },
    take: 5
  });

  console.log(`\n📊 Trovate ${personsWithSite.length} persone con siteId popolato:\n`);
  personsWithSite.forEach(p => {
    console.log(`- ${p.firstName} ${p.lastName}: ${p.site?.siteName || 'NULL'} (${p.site?.citta || 'N/A'})`);
  });
  
  // Conta totale
  const total = await prisma.person.count({
    where: {
      deletedAt: null,
      siteId: { not: null }
    }
  });
  console.log(`\nTotale persone con sede: ${total}`);
  
  await prisma.$disconnect();
} catch (error) {
  console.error('Errore:', error);
  await prisma.$disconnect();
  process.exit(1);
}
