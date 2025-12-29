const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('🧪 Testing attestati query...');
    
    const result = await prisma.attestato.findMany({
      where: {
        scheduledCourseId: '109d7f93-3680-4751-92e7-5588cccf6bba',
        deletedAt: null
      },
      take: 1
    });
    
    console.log('✅ Basic query works:', result.length, 'records');
    
    // Test con include person
    const withPerson = await prisma.attestato.findMany({
      where: {
        scheduledCourseId: '109d7f93-3680-4751-92e7-5588cccf6bba',
        deletedAt: null
      },
      include: {
        person: true
      },
      take: 1
    });
    
    console.log('✅ Query with person works');
    
    // Test con include scheduledCourse
    const withSchedule = await prisma.attestato.findMany({
      where: {
        scheduledCourseId: '109d7f93-3680-4751-92e7-5588cccf6bba',
        deletedAt: null
      },
      include: {
        scheduledCourse: true
      },
      take: 1
    });
    
    console.log('✅ Query with scheduledCourse works');
    
    // Test completo
    const full = await prisma.attestato.findMany({
      where: {
        scheduledCourseId: '109d7f93-3680-4751-92e7-5588cccf6bba',
        deletedAt: null
      },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        scheduledCourse: {
          include: {
            course: true,
            trainer: true
          }
        }
      },
      take: 1
    });
    
    console.log('✅ Full query works');
    console.log('📊 Result:', JSON.stringify(full, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

test();
