import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const persons = await prisma.person.findMany({
    where: {
      deletedAt: null,
      certifications: { isEmpty: false }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      certifications: true,
      specialties: true
    },
    take: 3
  });
  
  console.log('Persons with certifications:', JSON.stringify(persons, null, 2));
} catch (err) {
  console.error(err);
} finally {
  await prisma.$disconnect();
}
