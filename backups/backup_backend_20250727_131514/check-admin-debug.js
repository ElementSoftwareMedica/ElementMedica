import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    console.log('🔍 Verifica utente admin@example.com...');
    
    const admin = await prisma.person.findFirst({
      where: { email: 'admin@example.com' },
      include: {
        personRoles: {
          include: {
            permissions: true
          }
        }
      }
    });
    
    if (!admin) {
      console.log('❌ Utente admin NON TROVATO!');
      return;
    }
    
    console.log('✅ Utente admin trovato:');
    console.log('ID:', admin.id);
    console.log('Email:', admin.email);
    console.log('Status:', admin.status);
    console.log('Ruoli:', admin.personRoles.length);
    
    console.log('\n🎭 User roles:');
    console.log('Person Roles:', admin.personRoles);
    
    const activeRoles = admin.personRoles.filter(pr => pr.isActive);
    console.log('Active Roles:', activeRoles);
    
    const isAdmin = admin.personRoles.some(pr => pr.roleType === 'ADMIN' || pr.roleType === 'SUPER_ADMIN');
    console.log('Is Admin:', isAdmin);
    
    // Check each role individually
    admin.personRoles.forEach((role, index) => {
      console.log(`Role ${index + 1}:`, {
        roleType: role.roleType,
        isActive: role.isActive,
        isAdminType: role.roleType === 'ADMIN' || role.roleType === 'SUPER_ADMIN'
      });
    });
    
    for (const role of admin.personRoles) {
      console.log('\n📋 Ruolo:', role.roleType);
      console.log('Attivo:', role.isActive);
      console.log('Permessi:', role.permissions ? role.permissions.length : 0);
      
      if (role.permissions) {
        const viewUsersPermission = role.permissions.find(p => p.permission === 'VIEW_USERS');
        console.log('VIEW_USERS:', viewUsersPermission ? 'PRESENTE' : 'ASSENTE');
        
        // Mostra tutti i permessi
        console.log('Tutti i permessi:');
        role.permissions.forEach(p => {
          console.log(`  - ${p.permission}: ${p.isGranted}`);
        });
      } else {
        console.log('Nessun permesso trovato per questo ruolo');
      }
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();