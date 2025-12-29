import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  // Trova tutti i tenant
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, isActive: true }
  });
  
  console.log('Tenants:', tenants);
  
  // Per ogni tenant conta persons e personRoles
  for (const tenant of tenants) {
    const persons = await prisma.person.count({
      where: { tenantId: tenant.id, deletedAt: null }
    });
    
    const employees = await prisma.personRole.count({
      where: {
        tenantId: tenant.id,
        roleType: 'EMPLOYEE',
        deletedAt: null,
        person: { deletedAt: null }
      }
    });
    
    console.log(`\nTenant ${tenant.name} (${tenant.id}):`);
    console.log(`  Persons: ${persons}`);
    console.log(`  Employees: ${employees}`);
  }
} catch (err) {
  console.error(err);
} finally {
  await prisma.$disconnect();
}
