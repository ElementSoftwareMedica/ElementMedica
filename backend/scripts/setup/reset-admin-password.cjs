const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function resetAdminPassword() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Resetting admin password...');
    
    // Find admin user
    const adminUser = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com'
      }
    });
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }
    
    console.log('✅ Admin user found:', adminUser.email);
    
    // Hash new password
    const newPassword = 'Admin123!';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    await prisma.person.update({
      where: {
        id: adminUser.id
      },
      data: {
        password: hashedPassword
      }
    });
    
    console.log('✅ Password updated successfully!');
    console.log('📧 Email: admin@example.com');
    console.log('🔑 Password: Admin123!');
    
    // Verify the new password
    const updatedUser = await prisma.person.findUnique({
      where: { id: adminUser.id }
    });
    
    const passwordValid = await bcrypt.compare(newPassword, updatedUser.password);
    console.log('🔍 Password verification:', passwordValid ? '✅ Valid' : '❌ Invalid');
    
  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();