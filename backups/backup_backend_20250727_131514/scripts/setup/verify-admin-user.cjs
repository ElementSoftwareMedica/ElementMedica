const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function verifyAdminUser() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verifying admin user...');
    
    // Find admin user
    const adminUser = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com'
      },
      include: {
        personRoles: {
          where: {
            isActive: true
          }
        }
      }
    });
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }
    
    console.log('✅ Admin user found:', {
      id: adminUser.id,
      email: adminUser.email,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      isActive: adminUser.isActive,
      deletedAt: adminUser.deletedAt
    });
    
    // Verify password
    const passwordValid = await bcrypt.compare('Admin123!', adminUser.password);
    console.log('🔑 Password valid:', passwordValid);
    
    // Check roles
    console.log('👤 User roles:');
    adminUser.personRoles.forEach(role => {
      console.log(`  - ${role.roleType} (active: ${role.isActive})`);
    });
    
    // Check if user has SUPER_ADMIN or ADMIN role
    const hasAdminRole = adminUser.personRoles.some(role => 
      (role.roleType === 'SUPER_ADMIN' || role.roleType === 'ADMIN') && role.isActive
    );
    
    console.log('🛡️ Has admin privileges:', hasAdminRole);
    
    if (!hasAdminRole) {
      console.log('⚠️ User does not have admin privileges!');
      
      // Add SUPER_ADMIN role
      console.log('🔧 Adding SUPER_ADMIN role...');
      await prisma.personRole.create({
        data: {
          personId: adminUser.id,
          roleType: 'SUPER_ADMIN',
          isActive: true,
          tenantId: adminUser.tenantId,
          assignedAt: new Date()
        }
      });
      console.log('✅ SUPER_ADMIN role added!');
    }
    
  } catch (error) {
    console.error('❌ Error verifying admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAdminUser();