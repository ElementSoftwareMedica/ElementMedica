import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addCompanyPermissionsToAdmin() {
  try {
    console.log('🔍 Finding admin user...');
    
    // Find admin user
    const admin = await prisma.person.findFirst({
      where: {
        OR: [
          { email: 'admin@example.com' },
          { username: 'admin' }
        ],
        status: 'ACTIVE',
        deletedAt: null
      },
      include: {
        personRoles: {
          where: {
            isActive: true
          }
        }
      }
    });
    
    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('✅ Admin user found:', admin.email);
    
    // Company permissions to add
    const companyPermissions = [
      'VIEW_COMPANIES',
      'CREATE_COMPANIES', 
      'EDIT_COMPANIES',
      'DELETE_COMPANIES'
    ];
    
    console.log('\n🔑 Adding company permissions to admin roles...');
    
    for (const role of admin.personRoles) {
      console.log(`\n📋 Processing role: ${role.roleType}`);
      
      for (const permission of companyPermissions) {
        try {
          // Check if permission already exists
          const existingPermission = await prisma.rolePermission.findUnique({
            where: {
              personRoleId_permission: {
                personRoleId: role.id,
                permission: permission
              }
            }
          });
          
          if (existingPermission) {
            console.log(`  ⚠️  Permission ${permission} already exists`);
            continue;
          }
          
          // Add the permission
          await prisma.rolePermission.create({
            data: {
              personRoleId: role.id,
              permission: permission,
              isGranted: true,
              grantedAt: new Date()
            }
          });
          
          console.log(`  ✅ Added permission: ${permission}`);
          
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`  ⚠️  Permission ${permission} already exists (duplicate)`);
          } else {
            console.error(`  ❌ Error adding permission ${permission}:`, error.message);
          }
        }
      }
    }
    
    console.log('\n🎉 Company permissions added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding company permissions:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addCompanyPermissionsToAdmin();