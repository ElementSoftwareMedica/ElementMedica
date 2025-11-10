import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany({
    where: {
      title: {
        contains: 'Antincendio',
        mode: 'insensitive'
      },
      deletedAt: null
    },
    select: {
      id: true,
      title: true,
      certifications: true,
      riskLevel: true,
      courseType: true
    }
  });

  console.log(JSON.stringify(courses, null, 2));
  
  // Aggiorna tutti i corsi antincendio con la certificazione corretta
  for (const course of courses) {
    if (!course.certifications || course.certifications === '') {
      await prisma.course.update({
        where: { id: course.id },
        data: { certifications: 'Antincendio' }
      });
      console.log(`✓ Aggiornato: ${course.title}`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
