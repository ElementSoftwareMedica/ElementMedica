import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

try {
  // Aggiorna il primo employee con dati di test
  const updated = await prisma.person.updateMany({
    where: {
      personRoles: {
        some: {
          roleType: 'EMPLOYEE',
          deletedAt: null
        }
      },
      deletedAt: null
    },
    data: {
      residenceCity: 'Milano',
      hourlyRate: 25.50
    }
  });

  console.log(`✅ Aggiornati ${updated.count} employees con dati test`);
  
  await prisma.$disconnect();
} catch (error) {
  console.error('Errore:', error);
  await prisma.$disconnect();
  process.exit(1);
}
