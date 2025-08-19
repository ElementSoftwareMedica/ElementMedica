import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create default tenant first
  const defaultTenant = await prisma.tenant.create({
    data: {
      name: 'Default Company',
      slug: 'default-company',
      domain: 'localhost',
      settings: {},
      billingPlan: 'enterprise',
      maxUsers: 1000,
      maxCompanies: 100,
      isActive: true
    }
  });

  console.log('✅ Default tenant created:', defaultTenant.slug);

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

  // Create a test company
  const testCompany = await prisma.company.create({
    data: {
      ragioneSociale: 'Test Company S.r.l.',
      codiceFiscale: '12345678901',
      piva: '12345678901',
      mail: 'info@testcompany.com',
      telefono: '+39 123 456 7890',
      sedeAzienda: 'Via Test 123, Milano',
      cap: '20100',
      citta: 'Milano',
      provincia: 'MI',
      personaRiferimento: 'Mario Rossi',
      isActive: true,
      tenantId: defaultTenant.id
    }
  });

  console.log('✅ Test company created:', testCompany.ragioneSociale);

  // Create a test course
  const testCourse = await prisma.course.create({
    data: {
      title: 'Corso di Sicurezza sul Lavoro',
      category: 'Sicurezza',
      description: 'Corso base sulla sicurezza nei luoghi di lavoro',
      duration: '8 ore',
      status: 'ACTIVE',
      code: 'SEC001',
      maxPeople: 20,
      pricePerPerson: 150.00,
      validityYears: 5,
      tenantId: defaultTenant.id
    }
  });

  console.log('✅ Test course created:', testCourse.title);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Database seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });