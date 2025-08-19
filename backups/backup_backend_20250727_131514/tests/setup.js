import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import { jest } from '@jest/globals';

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
    // Clean up all test data
    await cleanupTestData();
    
    // Disconnect from database
    await prisma.$disconnect();
    
    console.log('✅ Test database disconnected successfully');
  } catch (error) {
    console.error('❌ Failed to disconnect from test database:', error);
    throw error;
  }
});

// Helper function to clean up test data
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

// Helper function to create test company
async function createTestCompany(data = {}) {
  return await prisma.company.create({
    data: {
      ragioneSociale: 'Test Company',
      mail: 'test@company.com',
      telefono: '1234567890',
      sede_azienda: 'Test Address',
      citta: 'Test City',
      provincia: 'Test Province',
      cap: '12345',
      piva: '12345678901',
      codice_fiscale: 'TSTCMP12345678',
      is_active: true,
      ...data
    }
  });
}

// Helper function to create test person (admin)
async function createTestUser(companyId, data = {}) {
  const hashedPassword = await bcryptjs.hash('Admin123!', 12);
  
  return await prisma.person.create({
    data: {
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      status: 'ACTIVE',
      companyId,
      personRoles: {
        create: {
          roleType: 'ADMIN',
          companyId,
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
  return await prisma.person.create({
    data: {
      firstName: 'Test',
      lastName: 'Employee',
      email: 'employee@test.com',
      phone: '1234567890',
      taxCode: 'TSTMPL12345678',
      birthDate: new Date('1990-01-01'),
      residenceAddress: 'Test Address',
      residenceCity: 'Test City',
      province: 'TP',
      postalCode: '12345',
      status: 'ACTIVE',
      isActive: true,
      companyId,
      personRoles: {
        create: {
          roleType: 'EMPLOYEE',
          companyId,
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
async function createTestCourse(companyId, data = {}) {
  return await prisma.course.create({
    data: {
      name: 'Test Course',
      description: 'Test Description',
      duration: 8,
      validityYears: 3,
      category: 'safety',
      companyId,
      isActive: true,
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
  createTestCourse
};

// Mock console methods to reduce test noise
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: console.error // Keep error logging
  };
}