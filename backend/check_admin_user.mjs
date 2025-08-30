import dotenv from 'dotenv';
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const admin = await prisma.person.findFirst({
    where: { email: 'admin@example.com' },
    include: { personRoles: true }
  });
  
  console.log('Admin user found:', !!admin);
  if (admin) {
    console.log('ID:', admin.id);
    console.log('Email:', admin.email);
    console.log('Global Role:', admin.globalRole);
    console.log('Roles:', (admin.personRoles || []).map(r => r.roleType));
    console.log('Tenant ID:', admin.tenantId);
  } else {
    console.log('Admin user not found');
  }
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await prisma.$disconnect();
}