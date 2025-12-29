import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const admin = await prisma.person.findFirst({
    where: { email: 'admin@example.com' },
    include: { tenant: true }
  });
  
  console.log('Admin user:', {
    id: admin.id,
    email: admin.email,
    tenantId: admin.tenantId,
    tenant: admin.tenant
  });
} catch (err) {
  console.error(err);
} finally {
  await prisma.$disconnect();
}
