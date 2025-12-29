import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Prendi un sample di trainers per vedere cosa hanno
  const trainers = await prisma.person.findMany({
    where: {
      deletedAt: null,
      OR: [
        { firstName: 'Test' },
        { firstName: 'Full' },
        { firstName: 'Minimal' },
        { firstName: 'Matteo' }
      ]
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      certifications: true
    },
    take: 10
  });

  console.log('=== TRAINERS NEL DATABASE ===\n');
  trainers.forEach(t => {
    console.log(`${t.firstName} ${t.lastName}:`);
    console.log(`  Certifications:`, t.certifications);
    console.log('');
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
