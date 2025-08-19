const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    console.log('🔍 Resetting admin password...');
    
    // Find admin user
    const admin = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com'
      }
    });
    
    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('✅ Found admin user:', admin.email);
    
    // Hash new password
    const newPassword = 'admin123';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await prisma.person.update({
      where: {
        id: admin.id
      },
      data: {
        password: hashedPassword
      }
    });
    
    console.log('✅ Admin password reset successfully');
    console.log('📋 New credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Error resetting admin password:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();