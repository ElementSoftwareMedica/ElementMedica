/**
 * Script per verificare e correggere i permessi dell'utente admin
 * Verifica se l'admin ha tutti i permessi necessari e li aggiunge se mancanti
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Permessi che l'admin dovrebbe avere (dal RoleTypes.js)
const ADMIN_PERMISSIONS = [
  'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
  'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
  'VIEW_PERSONS', 'CREATE_PERSONS', 'EDIT_PERSONS', 'DELETE_PERSONS',
  'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
  'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
  'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
  'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS', 'DOWNLOAD_DOCUMENTS',
  'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES', 'DELETE_SCHEDULES',
  'VIEW_GDPR', 'CREATE_GDPR', 'EDIT_GDPR', 'DELETE_GDPR', 'MANAGE_GDPR',
  'ROLE_MANAGEMENT', 'VIEW_ROLES', 'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES',
  'MANAGE_USERS', 'ASSIGN_ROLES', 'REVOKE_ROLES',
  'VIEW_REPORTS', 'CREATE_REPORTS', 'EDIT_REPORTS', 'EXPORT_REPORTS',
  'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'EDIT_HIERARCHY', 'DELETE_HIERARCHY', 'MANAGE_HIERARCHY'
];

async function checkAndFixAdminPermissions() {
  try {
    console.log('🔍 Checking admin permissions...');
    
    // 1. Trova l'utente admin
    const admin = await prisma.person.findUnique({
      where: { email: 'admin@example.com' },
      include: {
        roles: {
          where: { isActive: true, deletedAt: null },
          include: {
            permissions: true,
            customRole: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });
    
    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('✅ Admin user found:', admin.email);
    console.log('📋 Current roles count:', admin.roles.length);
    
    // 2. Verifica se ha un ruolo ADMIN
    let adminRole = admin.roles.find(role => role.roleType === 'ADMIN');
    
    if (!adminRole) {
      console.log('⚠️  Admin role not found, creating one...');
      
      // Crea un ruolo ADMIN per l'utente
      adminRole = await prisma.personRole.create({
        data: {
          personId: admin.id,
          roleType: 'ADMIN',
          tenantId: admin.tenantId,
          isActive: true,
          assignedBy: admin.id, // Auto-assegnato
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
    
    // 3. Verifica i permessi attuali
    const currentPermissions = new Set();
    
    adminRole.permissions.forEach(perm => {
      if (perm.isGranted) {
        currentPermissions.add(perm.permission);
      }
    });
    
    console.log('📊 Current permissions count:', currentPermissions.size);
    console.log('📊 Expected permissions count:', ADMIN_PERMISSIONS.length);
    
    // 4. Trova i permessi mancanti
    const missingPermissions = ADMIN_PERMISSIONS.filter(perm => !currentPermissions.has(perm));
    
    if (missingPermissions.length === 0) {
      console.log('✅ All permissions are already assigned');
      return;
    }
    
    console.log('⚠️  Missing permissions:', missingPermissions.length);
    console.log('Missing:', missingPermissions);
    
    // 5. Aggiungi i permessi mancanti
    console.log('🔧 Adding missing permissions...');
    
    for (const permission of missingPermissions) {
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
          // Permesso già esistente, aggiorna se necessario
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
    
    console.log('✅ Final permissions count:', updatedRole.permissions.length);
    console.log('🎉 Admin permissions check and fix completed!');
    
    // 7. Mostra un riepilogo dei permessi per categoria
    const permissionsByCategory = {
      companies: updatedRole.permissions.filter(p => p.permission.includes('COMPANIES')),
      employees: updatedRole.permissions.filter(p => p.permission.includes('EMPLOYEES')),
      users: updatedRole.permissions.filter(p => p.permission.includes('USERS')),
      courses: updatedRole.permissions.filter(p => p.permission.includes('COURSES')),
      roles: updatedRole.permissions.filter(p => p.permission.includes('ROLES') || p.permission === 'ROLE_MANAGEMENT'),
      reports: updatedRole.permissions.filter(p => p.permission.includes('REPORTS')),
      system: updatedRole.permissions.filter(p => ['ADMIN_PANEL', 'SYSTEM_SETTINGS', 'USER_MANAGEMENT'].includes(p.permission))
    };
    
    console.log('\n📊 Permissions by category:');
    Object.entries(permissionsByCategory).forEach(([category, perms]) => {
      console.log(`  ${category}: ${perms.length} permissions`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui lo script
checkAndFixAdminPermissions();