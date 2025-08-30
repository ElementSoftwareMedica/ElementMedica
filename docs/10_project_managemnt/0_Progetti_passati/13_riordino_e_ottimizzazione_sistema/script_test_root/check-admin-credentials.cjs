const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdminCredentials() {
  console.log('🔍 Verifica credenziali admin nel database');
  console.log('=' .repeat(50));
  
  try {
    // Trova l'utente admin
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin@example.com' },
          { role: 'Admin' },
          { role: 'Administrator' }
        ]
      },
      include: {
        userPermissions: {
          include: {
            permission: true
          }
        }
      }
    });
    
    if (!adminUser) {
      console.log('❌ Nessun utente admin trovato');
      return;
    }
    
    console.log('👤 Utente admin trovato:');
    console.log('   ID:', adminUser.id);
    console.log('   Email:', adminUser.email);
    console.log('   Username:', adminUser.username);
    console.log('   Nome:', adminUser.name);
    console.log('   Ruolo:', adminUser.role);
    console.log('   Password hash:', adminUser.password?.substring(0, 20) + '...');
    console.log('   Attivo:', adminUser.is_active);
    console.log('   Creato:', adminUser.created_at);
    
    console.log('\n💡 Per testare le password, usa il backend direttamente.');
    console.log('   Le password sono hashate con bcrypt.');
    
    // Verifica permessi
    console.log('\n🔐 Permessi utente:');
    const permissions = adminUser.userPermissions.map(up => up.permission.name);
    const companiesPermissions = permissions.filter(p => p.includes('COMPANIES'));
    
    console.log(`   Totale permessi: ${permissions.length}`);
    console.log(`   Permessi companies: ${companiesPermissions.length}`);
    companiesPermissions.forEach(p => console.log(`     - ${p}`));
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminCredentials();