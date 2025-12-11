const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing isPublic field for public courses...');

  // Trova tutti i corsi che dovrebbero essere pubblici (hanno slug)
  const coursesWithSlug = await prisma.course.findMany({
    where: {
      slug: {
        not: null
      }
    },
    select: {
      id: true,
      title: true,
      slug: true,
      isPublic: true
    }
  });

  console.log(`📊 Found ${coursesWithSlug.length} courses with slug`);

  // Aggiorna tutti i corsi con slug per renderli pubblici
  for (const course of coursesWithSlug) {
    if (course.isPublic !== true) {
      const updated = await prisma.course.update({
        where: { id: course.id },
        data: { isPublic: true }
      });
      console.log(`✅ Updated course: ${course.title} - isPublic: ${course.isPublic} → true`);
    } else {
      console.log(`✓ Course already public: ${course.title}`);
    }
  }

  // Verifica finale
  const publicCourses = await prisma.course.findMany({
    where: { isPublic: true },
    select: {
      title: true,
      slug: true,
      isPublic: true
    }
  });

  console.log(`🎉 Fix completed! ${publicCourses.length} courses are now public:`);
  publicCourses.forEach(course => {
    console.log(`  - ${course.title} (${course.slug}) - isPublic: ${course.isPublic}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Fix failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });