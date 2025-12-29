import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const updated = await prisma.tenant.update({
    where: { id: 'eddd074c-c202-4700-b4c3-8632d6ea3219' },
    data: { 
      isActive: true,
      name: 'Element Medica Default' // Rinomino per chiarezza
    }
  });
  
  console.log('Tenant updated:', updated);
} catch (err) {
  console.error(err);
} finally {
  await prisma.$disconnect();
}
