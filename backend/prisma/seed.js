import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create or get default tenant
  let defaultTenant = await prisma.tenant.findUnique({
    where: { slug: 'default-company' }
  });

  if (!defaultTenant) {
    defaultTenant = await prisma.tenant.create({
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
  } else {
    console.log('✅ Default tenant found:', defaultTenant.slug);
  }

  // Create or get admin user
  let adminUser = await prisma.person.findUnique({
    where: { email: 'admin@example.com' }
  });

  if (!adminUser) {
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    adminUser = await prisma.person.create({
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
  } else {
    console.log('✅ Admin user found:', adminUser.email);
  }

  // Create or get test company
  let testCompany = await prisma.company.findFirst({
    where: { 
      codiceFiscale: '12345678901',
      tenantId: defaultTenant.id
    }
  });

  if (!testCompany) {
    testCompany = await prisma.company.create({
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
  } else {
    console.log('✅ Test company found:', testCompany.ragioneSociale);
  }

  // Create or get test course
  let testCourse = await prisma.course.findUnique({
    where: { code: 'SEC001' }
  });

  if (!testCourse) {
    testCourse = await prisma.course.create({
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
  } else {
    console.log('✅ Test course found:', testCourse.title);
  }

  // Create test employees
  const employees = [
    {
      firstName: 'Mario',
      lastName: 'Rossi',
      email: 'mario.rossi@testcompany.com',
      username: 'mario.rossi',
      taxCode: 'RSSMRA80A01H501Z',
      phone: '+39 333 123 4567',
      birthDate: new Date('1980-01-01'),
      residenceAddress: 'Via Roma 123',
      residenceCity: 'Milano',
        province: 'MI',
        postalCode: '20100',
        hiredDate: new Date('2020-01-15'),
        title: 'Impiegato',
      notes: 'Dipendente di test',
      companyId: testCompany.id
    },
    {
      firstName: 'Giulia',
      lastName: 'Bianchi',
      email: 'giulia.bianchi@testcompany.com',
      username: 'giulia.bianchi',
      taxCode: 'BNCGLI85B15F205X',
      phone: '+39 333 765 4321',
      birthDate: new Date('1985-02-15'),
      residenceAddress: 'Via Milano 456',
      residenceCity: 'Milano',
        province: 'MI',
        postalCode: '20121',
        hiredDate: new Date('2021-03-10'),
        title: 'Responsabile',
        notes: 'Dipendente di test',
        companyId: testCompany.id
     },
     {
       firstName: 'Luca',
       lastName: 'Verdi',
       email: 'luca.verdi@testcompany.com',
       username: 'luca.verdi',
       taxCode: 'VRDLCU90C20L219Y',
       phone: '+39 333 987 6543',
       birthDate: new Date('1990-03-20'),
       residenceAddress: 'Via Torino 789',
       residenceCity: 'Milano',
         province: 'MI',
         postalCode: '20122',
         hiredDate: new Date('2022-06-01'),
         title: 'Tecnico',
        notes: 'Dipendente di test',
      companyId: testCompany.id
    }
  ];

  for (const employeeData of employees) {
    const existingEmployee = await prisma.person.findUnique({
      where: { taxCode: employeeData.taxCode }
    });

    if (!existingEmployee) {
      const hashedPassword = await bcrypt.hash('Employee123!', 10);
      
      const employee = await prisma.person.create({
        data: {
          ...employeeData,
          password: hashedPassword,
          status: 'ACTIVE',
          globalRole: 'USER',
          tenantId: defaultTenant.id,
          gdprConsentDate: new Date(),
          gdprConsentVersion: '1.0',
          personRoles: {
            create: {
              roleType: 'EMPLOYEE',
              tenantId: defaultTenant.id,
              isActive: true,
              isPrimary: true
            }
          }
        }
      });
      console.log('✅ Employee created:', employee.firstName, employee.lastName);
    } else {
      console.log('✅ Employee already exists:', employeeData.firstName, employeeData.lastName);
    }
  }

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