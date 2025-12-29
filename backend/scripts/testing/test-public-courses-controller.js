const prisma = new PrismaClient();

async function testPublicCoursesQuery() {
  console.log('🧪 Testing public courses query...');

  try {
    // Simula la stessa query del controller
    const where = {
      isPublic: true,
      deletedAt: null
    };

    const courses = await prisma.course.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        subcategory: true,
        shortDescription: true,
        fullDescription: true,
        image1Url: true,
        image2Url: true,
        riskLevel: true,
        courseType: true,
        duration: true,
        pricePerPerson: true,
        slug: true,
        seoTitle: true,
        seoDescription: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      take: 3
    });

    console.log(`📊 Found ${courses.length} public courses:`);
    courses.forEach(course => {
      console.log(`  - ${course.title}`);
      console.log(`    isPublic: ${course.isPublic}`);
      console.log(`    slug: ${course.slug}`);
      console.log(`    riskLevel: ${course.riskLevel}`);
      console.log('');
    });

    // Test anche la query per slug specifico
    const courseBySlug = await prisma.course.findFirst({
      where: {
        slug: 'aggiornamento-coordinatore-sicurezza',
        isPublic: true,
        deletedAt: null
      },
      select: {
        id: true,
        title: true,
        category: true,
        subcategory: true,
        shortDescription: true,
        fullDescription: true,
        image1Url: true,
        image2Url: true,
        riskLevel: true,
        courseType: true,
        duration: true,
        pricePerPerson: true,
        slug: true,
        seoTitle: true,
        seoDescription: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('🎯 Course by slug test:');
    if (courseBySlug) {
      console.log(`  Title: ${courseBySlug.title}`);
      console.log(`  isPublic: ${courseBySlug.isPublic}`);
      console.log(`  slug: ${courseBySlug.slug}`);
    } else {
      console.log('  Course not found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPublicCoursesQuery();