const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function checkAdminUser() {
  try {
    console.log('🔍 Checking admin user in database...');
    
    // Trova l'utente admin
    const admin = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com',
        deletedAt: null
      },
      include: {
        personRoles: true
      }
    });
    
    if (!admin) {
      console.log('❌ Admin user not found!');
      return;
    }
    
    console.log('✅ Admin user found:');
    console.log('- ID:', admin.id);
    console.log('- Email:', admin.email);
    console.log('- First Name:', admin.firstName);
    console.log('- Last Name:', admin.lastName);
    console.log('- Password Hash:', admin.password ? 'Present' : 'Missing');
    console.log('- Roles:', admin.personRoles.map(r => r.roleType));
    console.log('- Created:', admin.createdAt);
    console.log('- Updated:', admin.updatedAt);
    
    // Test password
    if (admin.password) {
      const testPasswords = ['admin123', 'password', 'admin', '123456'];
      
      console.log('\n🔐 Testing common passwords...');
      for (const testPassword of testPasswords) {
        try {
          const isValid = await bcrypt.compare(testPassword, admin.password);
          console.log(`- "${testPassword}": ${isValid ? '✅ MATCH' : '❌ No match'}`);
          if (isValid) {
            console.log(`\n🎯 CORRECT PASSWORD FOUND: "${testPassword}"`);
            break;
          }
        } catch (error) {
          console.log(`- "${testPassword}": ❌ Error testing - ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUser();