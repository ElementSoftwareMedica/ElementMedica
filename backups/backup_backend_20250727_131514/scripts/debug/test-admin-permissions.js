import { PrismaClient } from '@prisma/client';
import enhancedRoleService from '../../services/enhancedRoleService.js';

const prisma = new PrismaClient();

async function testAdminPermissions() {
  try {
    console.log('🔍 Testing admin permissions...');
    console.log('=' .repeat(60));

    // Find admin user
    const admin = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com',
        status: 'ACTIVE',
        deletedAt: null
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
      console.log('❌ Admin user not found!');
      return;
    }

    console.log('✅ Admin user found:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   GlobalRole: ${admin.globalRole}`);
    console.log(`   TenantId: ${admin.tenantId}`);
    console.log(`   PersonRoles:`, admin.personRoles);

    // Test getUserRoles
    console.log('\n🔍 Testing getUserRoles...');
    const userRoles = await enhancedRoleService.getUserRoles(admin.id, admin.tenantId);
    console.log('UserRoles result:', userRoles);

    // Test hasPermission for roles.manage
    console.log('\n🔍 Testing hasPermission for roles.manage...');
    const hasPermission = await enhancedRoleService.hasPermission(
      admin.id, 
      'roles.manage', 
      { tenantId: admin.tenantId }
    );
    console.log(`HasPermission result: ${hasPermission}`);

    // Test getUserPermissions
    console.log('\n🔍 Testing getUserPermissions...');
    const userPermissions = await enhancedRoleService.getUserPermissions(admin.id, admin.tenantId);
    console.log('UserPermissions result:', userPermissions);

    console.log('\n🎉 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminPermissions();