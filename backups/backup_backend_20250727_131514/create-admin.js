import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  console.log('🔧 Creating admin user...');

  try {
    // Get the default tenant
    const defaultTenant = await prisma.tenant.findFirst({
      where: { slug: 'default-company' }
    });

    if (!defaultTenant) {
      console.error('❌ Default tenant not found');
      return;
    }

    // Check if admin already exists
    const existingAdmin = await prisma.person.findUnique({
      where: { email: 'admin@example.com' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    const adminUser = await prisma.person.create({
      data: {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        username: 'admin',
        password: hashedPassword,
        status: 'ACTIVE',
        globalRole: 'ADMIN',
        tenantId: defaultTenant.id,
        gdprConsentDate: new Date(),
        gdprConsentVersion: '1.0',
        personRoles: {
          create: {
            roleType: 'ADMIN',
            tenantId: defaultTenant.id,
            isActive: true,
            isPrimary: true
          }
        }
      }
    });

    console.log('✅ Admin user created:', adminUser.email);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();