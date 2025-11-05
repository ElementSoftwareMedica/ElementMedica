const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setup() {
  try {
    // Create tenant
    const tenant = await prisma.tenant.upsert({
      where: { slug: 'test-company' },
      update: {},
      create: {
        name: 'Test Company',
        slug: 'test-company',
        domain: 'test.local',
        isActive: true,
      }
    });
    console.log('✓ Tenant:', tenant.name);
    
    // Hash password
    const hashedPassword = await bcrypt.hash('Test123!', 10);
    
    // Create user
    const user = await prisma.person.upsert({
      where: { email: 'test@example.com' },
      update: { password: hashedPassword, status: 'ACTIVE' },
      create: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        username: 'testuser',
        password: hashedPassword,
        status: 'ACTIVE',
        globalRole: 'ADMIN',
        tenantId: tenant.id,
      }
    });
    
    console.log('✓ User created:', user.email);
    console.log('  Username: testuser');
    console.log('  Password: Test123!');
    console.log('\n✓ Setup complete!');
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setup();
