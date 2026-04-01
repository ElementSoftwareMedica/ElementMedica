import bcrypt from 'bcrypt';

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

    // P48: Check if admin already exists via PersonTenantProfile
    const existingProfile = await prisma.personTenantProfile.findFirst({
      where: { email: 'admin@example.com', tenantId: defaultTenant.id, deletedAt: null }
    });

    if (existingProfile) {
      console.log('✅ Admin user already exists');
      return;
    }

    // P48: Create admin user with PersonTenantProfile
    const hashedPassword = await bcrypt.hash('Admin123!', 10);

    const adminUser = await prisma.person.create({
      data: {
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        password: hashedPassword,
        gdprConsentDate: new Date(),
        gdprConsentVersion: '1.0',
        tenantProfiles: {
          create: {
            tenantId: defaultTenant.id,
            email: 'admin@example.com',
            status: 'ACTIVE',
            isPrimary: true
          }
        },
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

    console.log('✅ Admin user created:', adminUser.id);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();