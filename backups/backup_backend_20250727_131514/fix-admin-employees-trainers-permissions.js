const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixAdminPermissions() {
  try {
    console.log('🔧 Fixing admin permissions for employees and trainers...');

    // Trova l'utente admin
    const adminUser = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com'
      },
      include: {
        personRoles: {
          include: {
            role: true,
            permissions: true
          }
        }
      }
    });

    if (!adminUser) {
      console.error('❌ Admin user not found!');
      return;
    }

    console.log(`✅ Found admin user: ${adminUser.email}`);
    console.log(`   Roles: ${adminUser.personRoles.map(pr => pr.role.name).join(', ')}`);

    // Trova il ruolo Admin
    const adminRole = await prisma.role.findFirst({
      where: {
        name: 'Admin'
      }
    });

    if (!adminRole) {
      console.error('❌ Admin role not found!');
      return;
    }

    // Trova la PersonRole dell'admin
    const adminPersonRole = adminUser.personRoles.find(pr => pr.role.name === 'Admin');
    
    if (!adminPersonRole) {
      console.error('❌ Admin PersonRole not found!');
      return;
    }

    console.log(`✅ Found admin PersonRole: ${adminPersonRole.id}`);

    // Permessi da aggiungere
    const requiredPermissions = [
      'VIEW_EMPLOYEES',
      'CREATE_EMPLOYEES', 
      'EDIT_EMPLOYEES',
      'DELETE_EMPLOYEES',
      'VIEW_TRAINERS',
      'CREATE_TRAINERS',
      'EDIT_TRAINERS', 
      'DELETE_TRAINERS',
      'VIEW_COURSES',
      'CREATE_COURSES',
      'EDIT_COURSES',
      'DELETE_COURSES'
    ];

    // Verifica permessi esistenti
    const existingPermissions = adminPersonRole.permissions.map(p => p.permission);
    console.log(`📋 Existing permissions: ${existingPermissions.length}`);
    
    const missingPermissions = requiredPermissions.filter(perm => !existingPermissions.includes(perm));
    
    if (missingPermissions.length === 0) {
      console.log('✅ All required permissions already exist!');
      
      // Verifica comunque i permessi
      console.log('\n📋 Current permissions:');
      requiredPermissions.forEach(perm => {
        const hasPermission = existingPermissions.includes(perm);
        console.log(`   ${perm}: ${hasPermission ? '✅' : '❌'}`);
      });
      
      return;
    }

    console.log(`⚠️  Missing permissions: ${missingPermissions.join(', ')}`);

    // Aggiungi i permessi mancanti
    for (const permission of missingPermissions) {
      try {
        await prisma.personRolePermission.create({
          data: {
            personRoleId: adminPersonRole.id,
            permission: permission,
            isGranted: true,
            grantedBy: adminUser.id
          }
        });
        console.log(`✅ Added permission: ${permission}`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Permission ${permission} already exists (duplicate key)`);
        } else {
          console.error(`❌ Error adding permission ${permission}:`, error.message);
        }
      }
    }

    // Verifica finale
    const updatedPersonRole = await prisma.personRole.findUnique({
      where: { id: adminPersonRole.id },
      include: { permissions: true }
    });

    const finalPermissions = updatedPersonRole.permissions.map(p => p.permission);
    
    console.log('\n📋 Final permissions check:');
    requiredPermissions.forEach(perm => {
      const hasPermission = finalPermissions.includes(perm);
      console.log(`   ${perm}: ${hasPermission ? '✅' : '❌'}`);
    });

    console.log('\n🎉 Admin permissions fix completed!');

  } catch (error) {
    console.error('❌ Error fixing admin permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui lo script
fixAdminPermissions();