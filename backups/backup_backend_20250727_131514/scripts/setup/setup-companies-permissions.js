import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function setupCompaniesPermissions() {
  try {
    console.log('🚀 Setting up companies permissions...');

    // Define companies-related permissions
    const companiesPermissions = [
      {
        name: 'VIEW_COMPANIES',
        description: 'View companies list and details',
        resource: 'companies',
        action: 'view'
      },
      {
        name: 'CREATE_COMPANIES',
        description: 'Create new companies',
        resource: 'companies',
        action: 'create'
      },
      {
        name: 'EDIT_COMPANIES',
        description: 'Edit existing companies',
        resource: 'companies',
        action: 'edit'
      },
      {
        name: 'DELETE_COMPANIES',
        description: 'Delete companies',
        resource: 'companies',
        action: 'delete'
      },
      {
        name: 'MANAGE_COMPANY_USERS',
        description: 'Manage users within companies',
        resource: 'companies',
        action: 'manage_users'
      },
      {
        name: 'VIEW_COMPANY_REPORTS',
        description: 'View company reports and analytics',
        resource: 'companies',
        action: 'view_reports'
      },
      {
        name: 'companies:read',
        description: 'Read access to companies (frontend permission)',
        resource: 'companies',
        action: 'read'
      },
      {
        name: 'companies:write',
        description: 'Write access to companies (frontend permission)',
        resource: 'companies',
        action: 'write'
      },
      {
        name: 'companies:delete',
        description: 'Delete access to companies (frontend permission)',
        resource: 'companies',
        action: 'delete'
      },
      {
        name: 'companies:all',
        description: 'Full access to companies (frontend permission)',
        resource: 'companies',
        action: 'all'
      }
    ];

    // Create permissions if they don't exist
    for (const permissionData of companiesPermissions) {
      const existingPermission = await prisma.permission.findFirst({
        where: { name: permissionData.name }
      });

      if (!existingPermission) {
        await prisma.permission.create({
          data: permissionData
        });
        console.log(`✅ Created permission: ${permissionData.name}`);
      } else {
        console.log(`ℹ️ Permission already exists: ${permissionData.name}`);
      }
    }

    // Get all created permissions
    const permissions = await prisma.permission.findMany({
      where: {
        name: {
          in: companiesPermissions.map(p => p.name)
        }
      }
    });

    // Assign all companies permissions to ADMIN role
    console.log('\n🔐 Assigning permissions to ADMIN role...');
    
    for (const permission of permissions) {
      const existingRolePermission = await prisma.rolePermission.findFirst({
        where: {
          roleType: 'ADMIN',
          permissionId: permission.id
        }
      });

      if (!existingRolePermission) {
        await prisma.rolePermission.create({
          data: {
            roleType: 'ADMIN',
            permissionId: permission.id
          }
        });
        console.log(`✅ Assigned ${permission.name} to ADMIN role`);
      } else {
        console.log(`ℹ️ Permission ${permission.name} already assigned to ADMIN role`);
      }
    }

    // Also assign to SUPER_ADMIN role
    console.log('\n🔐 Assigning permissions to SUPER_ADMIN role...');
    
    for (const permission of permissions) {
      const existingRolePermission = await prisma.rolePermission.findFirst({
        where: {
          roleType: 'SUPER_ADMIN',
          permissionId: permission.id
        }
      });

      if (!existingRolePermission) {
        await prisma.rolePermission.create({
          data: {
            roleType: 'SUPER_ADMIN',
            permissionId: permission.id
          }
        });
        console.log(`✅ Assigned ${permission.name} to SUPER_ADMIN role`);
      } else {
        console.log(`ℹ️ Permission ${permission.name} already assigned to SUPER_ADMIN role`);
      }
    }

    console.log('\n🎉 Companies permissions setup completed successfully!');
    
    // Show summary
    const adminPermissions = await prisma.rolePermission.findMany({
      where: { roleType: 'ADMIN' },
      select: { permission: true, isGranted: true }
    });
    
    console.log(`\n📊 Summary: ADMIN role now has ${adminPermissions.length} permissions`);
    console.log('Companies-related permissions:');
    adminPermissions
      .filter(rp => rp.permission.name.toLowerCase().includes('companies') || rp.permission.name.toLowerCase().includes('company'))
      .forEach(rp => {
        console.log(`  - ${rp.permission.name}`);
      });

  } catch (error) {
    console.error('❌ Error setting up companies permissions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
setupCompaniesPermissions()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });