const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserRoles() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
      include: {
        person: {
          include: {
            personRoles: true
          }
        }
      }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('📧 User:', user.email);
    console.log('👤 Person ID:', user.person.id);
    console.log('🎭 Person Roles:', user.person.personRoles);
    
    const activeRoles = user.person.personRoles.filter(pr => pr.isActive);
    console.log('✅ Active Roles:', activeRoles);
    
    const isAdmin = user.person.personRoles.some(pr => pr.roleType === 'ADMIN' || pr.roleType === 'SUPER_ADMIN');
    console.log('🔐 Is Admin:', isAdmin);
    
    // Check each role individually
    user.person.personRoles.forEach((role, index) => {
      console.log(`Role ${index + 1}:`, {
        roleType: role.roleType,
        isActive: role.isActive,
        isAdminType: role.roleType === 'ADMIN' || role.roleType === 'SUPER_ADMIN'
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRoles();