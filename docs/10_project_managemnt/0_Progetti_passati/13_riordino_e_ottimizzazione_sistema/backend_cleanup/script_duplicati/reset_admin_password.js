import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    console.log('🔄 Resetting admin password...');
    
    // Hash the new password
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update admin user password
    const updatedUser = await prisma.person.update({
      where: { email: 'admin@example.com' },
      data: {
        password: hashedPassword,
        failedAttempts: 0,
        lockedUntil: null
      }
    });
    
    console.log('✅ Admin password reset successfully');
    console.log('📧 Email:', updatedUser.email);
    console.log('🔑 New password: admin123');
    
  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();