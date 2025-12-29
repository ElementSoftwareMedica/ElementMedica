import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function check() {
  const admin = await prisma.person.findUnique({
    where: { email: 'admin@example.com' },
    select: {
      id: true,
      email: true,
      globalRole: true,
      tenantId: true,
      tenant: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
  
  console.log(JSON.stringify(admin, null, 2));
  await prisma.$disconnect();
}

check();
