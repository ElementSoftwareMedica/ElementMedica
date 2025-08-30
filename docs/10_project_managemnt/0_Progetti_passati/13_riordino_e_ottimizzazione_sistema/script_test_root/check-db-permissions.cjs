const { PrismaClient } = require('./backend/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function checkDatabasePermissions() {
  try {
    console.log('🔍 Controllo permessi nel database...');
    console.log('============================================================');
    
    // 1. Trova l'admin
    const admin = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com'
      },
      include: {
        personRoles: {
          include: {
            permissions: true
          }
        }
      }
    });
    
    if (!admin) {
      console.log('❌ Admin non trovato');
      return;
    }
    
    console.log('✅ Admin trovato:', admin.email);
    console.log('📋 Ruoli admin:', admin.personRoles.length);
    
    // 2. Controlla tutti i permessi dell'admin
    const allPermissions = [];
    for (const role of admin.personRoles) {
      console.log(`\n🎭 Ruolo: ${role.roleType}`);
      console.log(`📊 Permessi nel ruolo: ${role.permissions.length}`);
      
      for (const perm of role.permissions) {
        if (perm.isGranted) {
          allPermissions.push(perm.permission);
          console.log(`  ✅ ${perm.permission}`);
        } else {
          console.log(`  ❌ ${perm.permission} (non concesso)`);
        }
      }
    }
    
    // 3. Filtra permessi companies
    const companyPermissions = allPermissions.filter(p => 
      p.toLowerCase().includes('companies') || 
      p.toLowerCase().includes('company')
    );
    
    console.log('\n🏢 Permessi companies trovati:');
    console.log('============================================================');
    companyPermissions.forEach(perm => {
      console.log(`✅ ${perm}`);
    });
    
    // 4. Controlla se esistono aziende nel database
    const companiesCount = await prisma.company.count();
    console.log(`\n🏢 Numero aziende nel database: ${companiesCount}`);
    
    if (companiesCount === 0) {
      console.log('⚠️  Nessuna azienda presente nel database');
    }
    
  } catch (error) {
    console.error('🚨 Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabasePermissions();