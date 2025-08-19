const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAdminPermissions() {
  try {
    console.log('🔍 Testing admin permissions for employees, trainers, and persons...\n');

    // Trova l'utente admin
    const adminPerson = await prisma.person.findFirst({
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

    if (!adminPerson) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('👤 Admin User:', {
      id: adminPerson.id,
      email: adminPerson.email,
      firstName: adminPerson.firstName,
      lastName: adminPerson.lastName
    });

    console.log('\n🔐 Admin Roles and Permissions:');
    adminPerson.personRoles.forEach((personRole, index) => {
      console.log(`\nRole ${index + 1}:`);
      console.log(`  - Role Type: ${personRole.roleType}`);
      console.log(`  - Permissions (${personRole.permissions.length}):`);
      
      const grantedPermissions = personRole.permissions.filter(p => p.isGranted);
      const deniedPermissions = personRole.permissions.filter(p => !p.isGranted);
      
      console.log(`    ✅ Granted (${grantedPermissions.length}):`);
      grantedPermissions.forEach(p => {
        console.log(`      - ${p.permission}`);
      });
      
      if (deniedPermissions.length > 0) {
        console.log(`    ❌ Denied (${deniedPermissions.length}):`);
        deniedPermissions.forEach(p => {
          console.log(`      - ${p.permission}`);
        });
      }
    });

    // Verifica permessi specifici
    const allPermissions = adminPerson.personRoles.flatMap(pr => 
      pr.permissions.filter(p => p.isGranted).map(p => p.permission)
    );

    console.log('\n🎯 Permission Check Results:');
    
    const permissionsToCheck = [
      'VIEW_PERSONS',
      'CREATE_PERSONS', 
      'EDIT_PERSONS',
      'DELETE_PERSONS',
      'VIEW_EMPLOYEES',
      'CREATE_EMPLOYEES',
      'EDIT_EMPLOYEES', 
      'DELETE_EMPLOYEES',
      'VIEW_TRAINERS',
      'CREATE_TRAINERS',
      'EDIT_TRAINERS',
      'DELETE_TRAINERS'
    ];

    permissionsToCheck.forEach(permission => {
      const hasPermission = allPermissions.includes(permission);
      console.log(`  ${hasPermission ? '✅' : '❌'} ${permission}: ${hasPermission ? 'GRANTED' : 'MISSING'}`);
    });

    console.log('\n📊 Summary:');
    console.log(`  - Total roles: ${adminPerson.personRoles.length}`);
    console.log(`  - Total granted permissions: ${allPermissions.length}`);
    console.log(`  - Unique permissions: ${[...new Set(allPermissions)].length}`);

    // Verifica se è admin
    const isAdmin = adminPerson.personRoles.some(pr => pr.roleType === 'ADMIN' || pr.roleType === 'SUPER_ADMIN');
    console.log(`  - Is Admin: ${isAdmin ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error('❌ Error testing admin permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminPermissions();