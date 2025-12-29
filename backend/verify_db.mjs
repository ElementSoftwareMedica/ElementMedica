import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

try {
  const persons = await prisma.person.findMany({
    where: {
      deletedAt: null,
      residenceCity: { not: null }
    },
    select: {
      firstName: true,
      lastName: true,
      title: true,
      residenceCity: true,
      hourlyRate: true
    },
    take: 3
  });

  console.log(`\n📊 Trovate ${persons.length} persone con residenceCity popolato:\n`);
  persons.forEach(p => {
    console.log(`${p.firstName} ${p.lastName}: residenceCity=${p.residenceCity}, hourlyRate=${p.hourlyRate}, title=${p.title || 'NULL'}`);
  });
  
  await prisma.$disconnect();
} catch (error) {
  console.error('Errore:', error);
  await prisma.$disconnect();
  process.exit(1);
}
