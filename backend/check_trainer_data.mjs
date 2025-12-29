import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

try {
  // Cerca trainers con dati popolati
  const trainers = await prisma.person.findMany({
    where: {
      personRoles: {
        some: {
          roleType: 'EMPLOYEE',
          deletedAt: null
        }
      },
      deletedAt: null,
      OR: [
        { residenceCity: { not: null } },
        { city: { not: null } },
        { hourlyRate: { not: null } }
      ]
    },
    select: {
      firstName: true,
      lastName: true,
      title: true,
      residenceCity: true,
      city: true,
      hourlyRate: true
    },
    take: 5
  });

  console.log(`\n📊 Trovati ${trainers.length} persons con dati popolati:\n`);
  trainers.forEach(t => {
    console.log(`- ${t.firstName} ${t.lastName}:`);
    console.log(`  title: ${t.title || 'NULL'}`);
    console.log(`  residenceCity: ${t.residenceCity || 'NULL'}`);
    console.log(`  city: ${t.city || 'NULL'}`);
    console.log(`  hourlyRate: ${t.hourlyRate || 'NULL'}`);
    console.log('');
  });
  
  await prisma.$disconnect();
} catch (error) {
  console.error('Errore:', error);
  await prisma.$disconnect();
  process.exit(1);
}
