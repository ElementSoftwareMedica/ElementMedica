import bcrypt from 'bcryptjs';
import { logger } from './utils/logger.js';

const prisma = new PrismaClient();

async function createAdminPerson() {
  try {
    // Check if admin person already exists by email or role
    const existingAdmin = await prisma.person.findFirst({
      where: {
        OR: [
          { email: 'admin@example.com' },
          {
            personRoles: {
              some: {
                roleType: 'ADMIN'
              }
            }
          }
        ],
        deletedAt: null
      },
      include: {
        personRoles: {
          where: { deletedAt: null }
        }
      }
    });

    if (existingAdmin) {
      console.log('✅ Admin person already exists!');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Name:', existingAdmin.firstName, existingAdmin.lastName);
      console.log('🔑 Password: Admin123! (if this is the default admin)');
      console.log('⚠️  If you forgot the password, you can reset it manually in the database.');
      return existingAdmin;
    }

    // Admin credentials
    const adminEmail = 'admin@example.com';
    const adminPassword = 'Admin123!';
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Create admin person
    const adminPerson = await prisma.person.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        status: 'ACTIVE'
      }
    });

    // Assign ADMIN role to person
    await prisma.personRole.create({
      data: {
        personId: adminPerson.id,
        roleType: 'ADMIN'
      }
    });

    console.log('🎉 Admin user created successfully!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('⚠️  Please change the password after first login!');

    return adminPerson;

  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Always run when script is executed directly
console.log('🚀 Starting admin person creation...');
createAdminPerson()
  .then(() => {
    console.log('✅ Admin creation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Admin creation failed:', error);
    process.exit(1);
  });

export { createAdminPerson };