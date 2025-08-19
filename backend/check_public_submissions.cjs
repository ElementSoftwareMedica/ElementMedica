const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPublicSubmissions() {
  try {
    console.log('🔍 Verifica submissions pubbliche...\n');

    // 1. Verifica tutte le submissions
    const allSubmissions = await prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`📊 Totale submissions: ${allSubmissions.length}`);
    
    if (allSubmissions.length > 0) {
      console.log('\n📝 Ultime 10 submissions:');
      allSubmissions.forEach((submission, index) => {
        console.log(`${index + 1}. ID: ${submission.id.slice(-8)}`);
        console.log(`   Type: ${submission.type}`);
        console.log(`   Source: ${submission.source}`);
        console.log(`   Status: ${submission.status}`);
        console.log(`   Email: ${submission.email || 'N/A'}`);
        console.log(`   TenantId: ${submission.tenantId}`);
        console.log(`   Data: ${submission.createdAt.toISOString()}`);
        console.log('');
      });
    }

    // 2. Verifica submissions per tipo
    const submissionsByType = await prisma.contactSubmission.groupBy({
      by: ['type'],
      _count: {
        id: true
      }
    });

    console.log('\n📊 Submissions per tipo:');
    submissionsByType.forEach(group => {
      console.log(`   ${group.type}: ${group._count.id}`);
    });

    // 3. Verifica submissions per source
    const submissionsBySource = await prisma.contactSubmission.groupBy({
      by: ['source'],
      _count: {
        id: true
      }
    });

    console.log('\n📊 Submissions per source:');
    submissionsBySource.forEach(group => {
      console.log(`   ${group.source}: ${group._count.id}`);
    });

    // 4. Verifica admin tenantId
    const admin = await prisma.person.findFirst({
      where: { email: 'admin@example.com' }
    });

    if (admin) {
      console.log(`\n👤 Admin tenantId: ${admin.tenantId}`);
      
      // Verifica submissions dell'admin
      const adminSubmissions = await prisma.contactSubmission.findMany({
        where: { tenantId: admin.tenantId },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`📋 Submissions del tenant admin: ${adminSubmissions.length}`);
      
      if (adminSubmissions.length > 0) {
        console.log('\n📝 Submissions del tenant admin:');
        adminSubmissions.slice(0, 5).forEach((submission, index) => {
          console.log(`${index + 1}. Type: ${submission.type}, Source: ${submission.source}, Status: ${submission.status}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPublicSubmissions();