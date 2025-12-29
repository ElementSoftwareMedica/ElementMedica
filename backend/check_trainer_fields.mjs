import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

try {
  const trainers = await prisma.person.findMany({
    where: {
      personRoles: {
        some: {
          roleType: { in: ['TRAINER', 'TRAINING_COORDINATOR'] },
          deletedAt: null
        }
      },
      deletedAt: null
    },
    select: {
      firstName: true,
      lastName: true,
      residenceCity: true,
      hourlyRate: true,
      city: true
    },
    take: 5
  });

  console.log('\n📊 CAMPI TRAINERS NEL DB:\n');
  trainers.forEach(t => {
    console.log(`- ${t.firstName} ${t.lastName}:`);
    console.log(`  residenceCity: ${t.residenceCity || 'NULL'}`);
    console.log(`  city: ${t.city || 'NULL'}`);
    console.log(`  hourlyRate: ${t.hourlyRate || 'NULL'}`);
  });
  
  await prisma.$disconnect();
} catch (error) {
  console.error('Errore:', error);
  await prisma.$disconnect();
  process.exit(1);
}
