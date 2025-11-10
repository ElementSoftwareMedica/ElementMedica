const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addPermissions() {
  try {
    const user = await prisma.person.findFirst({
      where: { email: 'test@example.com' }
    });
    
    if (!user) {
      console.log('✗ User not found');
      process.exit(1);
    }

    // Get or create ADMIN custom role
    let adminRole = await prisma.customRole.findFirst({
      where: {
        name: 'ADMIN',
        tenantId: user.tenantId
      }
    });

    if (!adminRole) {
      adminRole = await prisma.customRole.create({
        data: {
          name: 'ADMIN',
          description: 'Administrator with all permissions',
          isActive: true,
          level: 1,
          tenantId: user.tenantId,
          createdBy: user.id,
        }
      });
      
      // Add permissions
      const permissionsToAdd = [
        // Template permissions
        'VIEW_TEMPLATES',
        'CREATE_TEMPLATES',
        'EDIT_TEMPLATES',
        'DELETE_TEMPLATES',
        'MANAGE_TEMPLATES',
        // Document permissions
        'VIEW_DOCUMENTS',
        'CREATE_DOCUMENTS',
        'EDIT_DOCUMENTS',
        'DELETE_DOCUMENTS',
        // Admin permissions
        'ADMIN_PANEL',
        'SYSTEM_SETTINGS',
        'USER_MANAGEMENT',
        'ROLE_MANAGEMENT',
      ];
      
      for (const perm of permissionsToAdd) {
        await prisma.customRolePermission.create({
          data: {
            customRoleId: adminRole.id,
            permission: perm,
          }
        });
      }
      
      console.log('✓ Admin role created with permissions');
    }

    // Assign role to user
    await prisma.personRole.upsert({
      where: {
        id: `${user.id}-admin`
      },
      update: {
        isActive: true,
      },
      create: {
        id: `${user.id}-admin`,
        personId: user.id,
        customRoleId: adminRole.id,
        isActive: true,
        isPrimary: true,
        tenantId: user.tenantId,
        assignedBy: user.id,
      }
    });

    console.log('✓ Permissions assigned to user');
    console.log('✓ User can now access templates API');
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addPermissions();
