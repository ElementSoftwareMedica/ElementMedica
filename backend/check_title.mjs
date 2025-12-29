import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const persons = await prisma.person.findMany({
    where: { 
      deletedAt: null,
      personRoles: {
        some: { roleType: 'EMPLOYEE', deletedAt: null }
      }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      title: true,
      email: true
    },
    take: 5
  });
  
  console.log('Sample employees with title field:');
  persons.forEach(p => {
    console.log(`- ${p.firstName} ${p.lastName}: title="${p.title}"`);
  });
} catch (err) {
  console.error(err);
} finally {
  await prisma.$disconnect();
}
