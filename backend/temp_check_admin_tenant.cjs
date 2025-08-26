const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdminTenant() {
  try {
    console.log('🔍 Verificando tenantId dell\'admin...');
    
    const admin = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com'
      },
      select: {
        id: true,
        email: true,
        tenantId: true
      }
    });
    
    if (admin) {
      console.log('👤 Admin trovato:');
      console.log(`   ID: ${admin.id}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   TenantId: ${admin.tenantId}`);
      
      // Verifica submissions con questo tenantId
      const submissionsCount = await prisma.contactSubmission.count({
        where: {
          tenantId: admin.tenantId,
          source: 'public_website'
        }
      });
      
      console.log(`📊 Submissions pubbliche con tenantId admin: ${submissionsCount}`);
      
      // Verifica tutte le submissions pubbliche
      const allPublicSubmissions = await prisma.contactSubmission.count({
        where: {
          source: 'public_website'
        }
      });
      
      console.log(`📊 Totale submissions pubbliche: ${allPublicSubmissions}`);
      
    } else {
      console.log('❌ Admin non trovato');
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminTenant();