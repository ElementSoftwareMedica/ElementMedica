/**
 * Script per aggiungere il permesso ROLE_MANAGEMENT all'admin
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addRoleManagementPermission() {
  try {
    console.log('🔍 Adding ROLE_MANAGEMENT permission to admin...');
    
    // 1. Trova l'utente admin
    const admin = await prisma.person.findUnique({
      where: { email: 'admin@example.com' },
      include: {
        roles: {
          where: { isActive: true, deletedAt: null },
          include: {
            permissions: true
          }
        }
      }
    });
    
    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('✅ Admin user found:', admin.email);
    
    // 2. Trova il ruolo ADMIN
    let adminRole = admin.roles.find(role => role.roleType === 'ADMIN');
    
    if (!adminRole) {
      console.log('⚠️  Admin role not found, creating one...');
      
      adminRole = await prisma.personRole.create({
        data: {
          personId: admin.id,
          roleType: 'ADMIN',
          tenantId: admin.tenantId,
          isActive: true,
          assignedBy: admin.id,
          assignedAt: new Date()
        },
        include: {
          permissions: true
        }
      });
      
      console.log('✅ Admin role created');
    } else {
      console.log('✅ Admin role found');
    }
    
    // 3. Verifica se ha già il permesso ROLE_MANAGEMENT
    const hasRoleManagement = adminRole.permissions.some(
      perm => perm.permission === 'ROLE_MANAGEMENT' && perm.isGranted
    );
    
    if (hasRoleManagement) {
      console.log('✅ Admin already has ROLE_MANAGEMENT permission');
      return;
    }
    
    // 4. Aggiungi il permesso ROLE_MANAGEMENT
    console.log('🔧 Adding ROLE_MANAGEMENT permission...');
    
    try {
      await prisma.rolePermission.create({
        data: {
          personRoleId: adminRole.id,
          permission: 'ROLE_MANAGEMENT',
          isGranted: true,
          grantedAt: new Date(),
          grantedBy: admin.id
        }
      });
      console.log('✅ ROLE_MANAGEMENT permission added successfully');
    } catch (error) {
      if (error.code === 'P2002') {
        // Permesso già esistente, aggiorna
        await prisma.rolePermission.updateMany({
          where: {
            personRoleId: adminRole.id,
            permission: 'ROLE_MANAGEMENT'
          },
          data: {
            isGranted: true,
            grantedAt: new Date(),
            grantedBy: admin.id
          }
        });
        console.log('✅ ROLE_MANAGEMENT permission updated successfully');
      } else {
        throw error;
      }
    }
    
    // 5. Aggiungi anche altri permessi per i ruoli
    const rolePermissions = [
      'VIEW_ROLES',
      'CREATE_ROLES', 
      'EDIT_ROLES',
      'DELETE_ROLES',
      'ASSIGN_ROLES',
      'REVOKE_ROLES'
    ];
    
    console.log('🔧 Adding additional role permissions...');
    
    for (const permission of rolePermissions) {
      try {
        await prisma.rolePermission.create({
          data: {
            personRoleId: adminRole.id,
            permission: permission,
            isGranted: true,
            grantedAt: new Date(),
            grantedBy: admin.id
          }
        });
        console.log(`  ✅ Added: ${permission}`);
      } catch (error) {
        if (error.code === 'P2002') {
          await prisma.rolePermission.updateMany({
            where: {
              personRoleId: adminRole.id,
              permission: permission
            },
            data: {
              isGranted: true,
              grantedAt: new Date(),
              grantedBy: admin.id
            }
          });
          console.log(`  🔄 Updated: ${permission}`);
        } else {
          console.error(`  ❌ Error adding ${permission}:`, error.message);
        }
      }
    }
    
    // 6. Verifica finale
    const updatedRole = await prisma.personRole.findUnique({
      where: { id: adminRole.id },
      include: {
        permissions: {
          where: { isGranted: true }
        }
      }
    });
    
    const rolePermissionsCount = updatedRole.permissions.filter(
      p => p.permission.includes('ROLE') || p.permission === 'ROLE_MANAGEMENT'
    ).length;
    
    console.log('✅ Role-related permissions count:', rolePermissionsCount);
    console.log('🎉 Role management permissions setup completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui lo script
addRoleManagementPermission();