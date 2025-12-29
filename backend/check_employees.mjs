import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const persons = await prisma.person.findMany({
    where: { deletedAt: null },
    include: { personRoles: true }
  });

  const employees = persons.filter(p => 
    p.personRoles.some(r => r.roleType === 'EMPLOYEE' && r.deletedAt === null)
  );

  console.log('Total persons:', persons.length);
  console.log('Employees (with EMPLOYEE role):', employees.length);
  
  if (employees[0]) {
    console.log('Sample employee:', {
      id: employees[0].id,
      name: employees[0].firstName + ' ' + employees[0].lastName,
      roles: employees[0].personRoles.map(r => ({ 
        type: r.roleType, 
        deleted: r.deletedAt !== null 
      }))
    });
  }
} catch (err) {
  console.error(err);
} finally {
  await prisma.$disconnect();
}
