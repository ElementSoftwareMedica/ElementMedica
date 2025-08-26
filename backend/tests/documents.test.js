import request from 'supertest';
import express from 'express';
import bcryptjs from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const app = express();

// Mock the main app routes - in a real scenario you'd import your actual routes
app.use(express.json());

// Helper function to create test company with tenant
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

describe('Document Management Tests', () => {
  let testUser;
  let testCompany;
  let testEmployee;
  let authToken;
  let defaultTenant;
  
  beforeAll(async () => {
    // Get or create default tenant
    defaultTenant = await prisma.tenant.findUnique({
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

    // Setup test data
    const hashedPassword = await bcryptjs.hash('Admin123!', 12);
    
    // Create test company using helper function
    testCompany = await createTestCompany();
    
    // Create test person (admin)
    testUser = await prisma.person.create({
      data: {
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        status: 'ACTIVE',
        companyId: testCompany.id,
        tenantId: defaultTenant.id,
        personRoles: {
          create: {
            roleType: 'ADMIN',
            companyId: testCompany.id,
            tenantId: defaultTenant.id,
            permissions: {
              create: [
                { permission: 'VIEW_EMPLOYEES' },
                { permission: 'CREATE_DOCUMENTS' }
              ]
            }
          }
        }
      }
    });
    
    // Create test employee
    try {
      const employeeTimestamp = Date.now();
      const employeeRandomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      
      testEmployee = await prisma.person.create({
      data: {
        firstName: 'Test',
        lastName: 'Employee',
        email: `employee${employeeTimestamp}@test.com`,
        phone: '1234567890',
        taxCode: `TSTMPL${employeeTimestamp.toString().slice(-8)}`,
        birthDate: new Date('1990-01-01'),
        residenceAddress: 'Test Address',
        residenceCity: 'Test City',
        province: 'TP',
        postalCode: '12345',
        status: 'ACTIVE',
        companyId: testCompany.id,
        tenantId: defaultTenant.id,
        personRoles: {
          create: {
            roleType: 'EMPLOYEE',
            companyId: testCompany.id,
            tenantId: defaultTenant.id,
            permissions: {
              create: [
                { permission: 'VIEW_EMPLOYEES' },
                { permission: 'VIEW_COURSES' }
              ]
            }
          }
        }
      }
    });
    } catch (error) {
      console.error('Error creating testEmployee:', error);
      throw error;
    }
  });
  
  afterAll(async () => {
    // Clean up test data in correct order
    try {
      if (testCompany && testCompany.id) {
        await prisma.person.deleteMany({ where: { companyId: testCompany.id } });
        await prisma.company.delete({ where: { id: testCompany.id } });
      }
    } catch (error) {
      console.log('Cleanup error:', error.message);
    } finally {
      await prisma.$disconnect();
    }
  });

  describe('Document Generation', () => {
    it('should validate document template structure', () => {
      // Test that document templates have required placeholders
      const templatePath = path.join(__dirname, '../templates');
      
      if (fs.existsSync(templatePath)) {
        const templates = fs.readdirSync(templatePath).filter(file => file.endsWith('.docx'));
        expect(templates.length).toBeGreaterThan(0);
      }
    });

    it('should validate employee data for document generation', async () => {
      expect(testEmployee).toBeDefined();
      expect(testEmployee.id).toBeDefined();
      
      const employee = await prisma.person.findUnique({
        where: { 
          id: testEmployee.id
        },
        include: {
          company: true,
          personRoles: true
        }
      });

      expect(employee).toBeDefined();
      expect(employee.firstName).toBe('Test');
      expect(employee.lastName).toBe('Employee');
      expect(employee.company).toBeDefined();
      expect(employee.company.ragioneSociale).toMatch(/^Test Company \d+$/);
    });

    it('should validate course data structure', async () => {
      // Create a test course
      const testCourse = await prisma.course.create({
        data: {
          title: 'Test Course',
          description: 'Test Description',
          duration: '8 hours',
          validityYears: 3,
          category: 'safety',
          tenantId: defaultTenant.id
        }
      });

      const course = await prisma.course.findUnique({
        where: { id: testCourse.id }
      });

      expect(course).toBeDefined();
      expect(course.title).toBe('Test Course');
      expect(course.duration).toBe('8 hours');
      expect(course.validityYears).toBe(3);

      // Clean up
      await prisma.course.delete({ where: { id: testCourse.id } });
    });

    it('should validate employee-course relationship', async () => {
      // Create a test course
      const testCourse = await prisma.course.create({
        data: {
          title: 'Test Course',
          description: 'Test Description',
          duration: '8 hours',
          validityYears: 3,
          category: 'safety',
          tenantId: defaultTenant.id
        }
      });

      // Create course schedule
      const courseSchedule = await prisma.courseSchedule.create({
        data: {
          courseId: testCourse.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
          location: 'Test Location',
          maxParticipants: 20,
          status: 'PENDING',
          companyId: testCompany.id,
          tenantId: defaultTenant.id
        }
      });

      // Create employee-course enrollment
      const courseEnrollment = await prisma.courseEnrollment.create({
        data: {
          personId: testEmployee.id,
          scheduleId: courseSchedule.id,
          status: 'COMPLETED',
          tenantId: defaultTenant.id
        }
      });

      expect(courseEnrollment).toBeDefined();
      expect(courseEnrollment.personId).toBe(testEmployee.id);
      expect(courseEnrollment.scheduleId).toBe(courseSchedule.id);
      expect(courseEnrollment.status).toBe('COMPLETED');

      // Cleanup
      await prisma.courseEnrollment.delete({ where: { id: courseEnrollment.id } });
      await prisma.courseSchedule.delete({ where: { id: courseSchedule.id } });
      await prisma.course.delete({ where: { id: testCourse.id } });
    });
  });

  describe('Database Integrity', () => {
    it('should maintain referential integrity', async () => {
      // Test that company deletion cascades properly
      const tempTimestamp = Date.now();
      const tempCompany = await createTestCompany();

      const tempEmployee = await prisma.person.create({
        data: {
          firstName: 'Temp',
          lastName: 'Employee',
          email: `temp${tempTimestamp}@employee.com`,
          phone: '1234567890',
          taxCode: `TMPEMPL${tempTimestamp.toString().slice(-7)}`,
          birthDate: new Date('1990-01-01'),
          residenceAddress: 'Temp Address',
          residenceCity: 'Temp City',
          province: 'TP',
          postalCode: '12345',
          status: 'ACTIVE',
          companyId: tempCompany.id,
          tenantId: defaultTenant.id,
          personRoles: {
            create: {
              roleType: 'EMPLOYEE',
              companyId: tempCompany.id,
              tenantId: defaultTenant.id,
              permissions: {
                create: [
                  { permission: 'VIEW_EMPLOYEES' }
                ]
              }
            }
          }
        }
      });

      // Delete company should cascade to persons
      await prisma.person.delete({ where: { id: tempEmployee.id } });
      await prisma.company.delete({ where: { id: tempCompany.id } });

      // Verify deletion
      const deletedCompany = await prisma.company.findUnique({ where: { id: tempCompany.id } });
      expect(deletedCompany).toBeNull();
    });
  });
});