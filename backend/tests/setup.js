import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.TEST_DATABASE_URL
    }
  },
  log: ['error'] // Only log errors during tests
});

// Global test setup
beforeAll(async () => {
  try {
    // Connect to database
    await prisma.$connect();
    
    // Verify database connection
    await prisma.$queryRaw`SELECT 1`;
    
    console.log('✅ Test database connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error);
    throw error;
  }
});

// Global test teardown
afterAll(async () => {
  try {
    // Only disconnect from database, don't clean up data aggressively
    // Individual tests should handle their own cleanup
    await prisma.$disconnect();
    
    console.log('✅ Test database disconnected successfully');
  } catch (error) {
    console.error('❌ Failed to disconnect from test database:', error);
    throw error;
  }
});

// Helper function to clean up test data (use sparingly)
async function cleanupTestData() {
  try {
    // Delete in correct order to respect foreign key constraints
    await prisma.courseEnrollment.deleteMany({});
    await prisma.courseSchedule.deleteMany({});
    await prisma.person.deleteMany({});
    await prisma.course.deleteMany({});
    // Users are now handled by Person model
    await prisma.company.deleteMany({});
    
    console.log('✅ Test data cleaned up successfully');
  } catch (error) {
    console.error('❌ Failed to clean up test data:', error);
    // Don't throw here as this is cleanup
  }
}

// Helper function to clean up specific test data safely
async function cleanupTestDataSafe(companyId, personIds = []) {
  try {
    // Delete specific person data
    if (personIds.length > 0) {
      await prisma.rolePermission.deleteMany({
        where: {
          personRole: {
            personId: { in: personIds }
          }
        }
      });
      await prisma.personRole.deleteMany({ 
        where: { personId: { in: personIds } } 
      });
      await prisma.person.deleteMany({ 
        where: { id: { in: personIds } } 
      });
    }
    
    // Delete specific company if provided
    if (companyId) {
      await prisma.company.deleteMany({ 
        where: { id: companyId } 
      });
    }
    
    console.log('✅ Specific test data cleaned up successfully');
  } catch (error) {
    console.error('❌ Failed to clean up specific test data:', error);
    // Don't throw here as this is cleanup
  }
}

// Helper function to create test company
async function createTestCompany(data = {}) {
  // Get or create default tenant
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
  }

  // Generate unique values to avoid constraint violations
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const uniqueId = `${timestamp}${randomSuffix}`.slice(-11); // Keep last 11 digits for piva

  const companyData = {
    ragioneSociale: `Test Company ${timestamp}`,
    mail: `test${timestamp}@company.com`,
    telefono: '1234567890',
    sedeAzienda: 'Test Address',
    citta: 'Test City',
    provincia: 'Test Province',
    cap: '12345',
    piva: uniqueId,
    codiceFiscale: `TST${uniqueId.slice(-8)}`,
    isActive: true,
    tenantId: defaultTenant.id,
    ...data
  };

  return await prisma.company.create({
    data: companyData
  });
}

// Helper function to create test person (admin)
async function createTestUser(companyId, data = {}) {
  const hashedPassword = await bcryptjs.hash('Admin123!', 12);
  
  // Verify company exists
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });
  
  if (!company) {
    throw new Error(`Company with id ${companyId} not found`);
  }
  
  // Get default tenant
  const defaultTenant = await prisma.tenant.findUnique({
    where: { slug: 'default-company' }
  });
  
  return await prisma.person.create({
    data: {
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      status: 'ACTIVE',
      companyId,
      tenantId: defaultTenant.id,
      personRoles: {
        create: {
          roleType: 'ADMIN',
          companyId,
          tenantId: defaultTenant.id,
          permissions: {
            create: [
              { permission: 'VIEW_EMPLOYEES' },
                { permission: 'CREATE_EMPLOYEES' },
                { permission: 'EDIT_EMPLOYEES' },
                { permission: 'DELETE_EMPLOYEES' }
            ]
          }
        }
      },
      ...data
    }
  });
}

// Helper function to create test employee
async function createTestEmployee(companyId, data = {}) {
  // Get default tenant
  const defaultTenant = await prisma.tenant.findUnique({
    where: { slug: 'default-company' }
  });

  // Generate unique values to avoid constraint violations
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  return await prisma.person.create({
    data: {
      firstName: 'Test',
      lastName: 'Employee',
      email: `employee${timestamp}@test.com`,
      phone: '1234567890',
      taxCode: `TSTMPL${timestamp.toString().slice(-8)}`,
      birthDate: new Date('1990-01-01'),
      residenceAddress: 'Test Address',
      residenceCity: 'Test City',
      province: 'TP',
      postalCode: '12345',
      status: 'ACTIVE',
      companyId,
      tenantId: defaultTenant.id,
      personRoles: {
        create: {
          roleType: 'EMPLOYEE',
          companyId,
          tenantId: defaultTenant.id,
          permissions: {
            create: [
              { permission: 'VIEW_EMPLOYEES' },
                { permission: 'VIEW_COURSES' }
            ]
          }
        }
      },
      ...data
    }
  });
}

// Helper function to create test course
async function createTestCourse(data = {}) {
  // Get default tenant
  const defaultTenant = await prisma.tenant.findUnique({
    where: { slug: 'default-company' }
  });

  return await prisma.course.create({
    data: {
      title: 'Test Course',
      description: 'Test Description',
      duration: '8 ore',
      validityYears: 3,
      category: 'safety',
      tenantId: defaultTenant.id,
      status: 'ACTIVE',
      ...data
    }
  });
}

// Export all functions and prisma instance for tests
export {
  prisma,
  createTestCompany,
  createTestUser,
  createTestEmployee,
  createTestCourse,
  cleanupTestDataSafe
};

// Mock console methods to reduce test noise
if (process.env.NODE_ENV === 'test') {
  const mockFn = () => {};
  global.console = {
    ...console,
    log: mockFn,
    debug: mockFn,
    info: mockFn,
    warn: mockFn,
    error: console.error // Keep error logging
  };
}