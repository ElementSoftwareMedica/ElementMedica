const { PrismaClient } = require('@prisma/client');

async function findExistingUser() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Cercando utenti esistenti nel database...');
    
    const users = await prisma.person.findMany({
      include: {
        personRoles: {
          include: {
            customRole: true
          }
        }
      },
      take: 5
    });
    
    console.log('👥 Utenti trovati:', users.length);
    
    users.forEach((user, index) => {
      console.log(`\n👤 Utente ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Company ID: ${user.companyId}`);
      console.log(`   Tenant ID: ${user.tenantId}`);
      console.log(`   Ruoli: ${user.personRoles.map(pr => pr.roleType || (pr.customRole ? pr.customRole.name : 'N/A')).join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findExistingUser();