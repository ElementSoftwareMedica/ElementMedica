const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdminPermissions() {
  try {
    console.log('🔍 Verifica permessi utente admin@example.com...\n');

    // Trova l'utente admin
    const adminUser = await prisma.person.findUnique({
      where: { email: 'admin@example.com' },
      include: {
        personRoles: {
          include: {
            permissions: true
          }
        }
      }
    });

    if (!adminUser) {
      console.log('❌ Utente admin@example.com non trovato!');
      return;
    }

    console.log(`✅ Utente trovato: ${adminUser.firstName} ${adminUser.lastName}`);
    console.log(`📧 Email: ${adminUser.email}`);
    console.log(`🏢 Company ID: ${adminUser.companyId}`);
    console.log(`🏠 Tenant ID: ${adminUser.tenantId}`);
    console.log(`🌐 Global Role: ${adminUser.globalRole}\n`);

    console.log('🎭 Ruoli assegnati:');
    for (const personRole of adminUser.personRoles) {
      console.log(`  - Tipo Ruolo: ${personRole.roleType}`);
      console.log(`    Custom Role ID: ${personRole.customRoleId}`);
      console.log(`    Attivo: ${personRole.isActive}`);
      console.log(`    Primario: ${personRole.isPrimary}`);
      console.log(`    Company ID: ${personRole.companyId}`);
      console.log(`    Tenant ID: ${personRole.tenantId}`);
      
      console.log(`    Permessi (${personRole.permissions.length}):`);
      for (const permission of personRole.permissions) {
        console.log(`      - ${permission.permission} (granted: ${permission.isGranted})`);
      }
      console.log('');
    }

    // Verifica permessi specifici
    console.log('🔍 Verifica permessi richiesti:');
    const allPermissions = adminUser.personRoles.flatMap(pr => 
      pr.permissions.filter(p => p.isGranted).map(rp => rp.permission)
    );

    const requiredPermissions = [
      'READ_EMPLOYEES',
      'CREATE_EMPLOYEES', 
      'UPDATE_EMPLOYEES',
      'DELETE_EMPLOYEES',
      'READ_TRAINERS',
      'CREATE_TRAINERS',
      'UPDATE_TRAINERS', 
      'DELETE_TRAINERS',
      'READ_COURSES',
      'CREATE_COURSES',
      'UPDATE_COURSES',
      'DELETE_COURSES'
    ];

    for (const permission of requiredPermissions) {
      const hasPermission = allPermissions.includes(permission);
      console.log(`  ${hasPermission ? '✅' : '❌'} ${permission}`);
    }

  } catch (error) {
    console.error('❌ Errore durante la verifica:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminPermissions();