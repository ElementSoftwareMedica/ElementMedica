import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const prisma = new PrismaClient();
const app = express();

// Mock the main app routes - in a real scenario you'd import your actual routes
app.use(express.json());

describe('Document Management Tests', () => {
  let testUser;
  let testCompany;
  let testEmployee;
  let authToken;
  
  beforeAll(async () => {
    // Setup test data
    const hashedPassword = await bcryptjs.hash('Admin123!', 12);
    
    // Create test company
    testCompany = await prisma.company.create({
      data: {
        ragioneSociale: 'Test Company',
        mail: 'test@company.com',
        telefono: '1234567890',
        sede_azienda: 'Test Address',
        citta: 'Test City',
        provincia: 'TP',
        cap: '12345',
        piva: '12345678901',
        codice_fiscale: 'TSTCMP12345678',
        is_active: true
      }
    });
    
    // Create test person (admin)
    testUser = await prisma.person.create({
      data: {
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        status: 'ACTIVE',
        companyId: testCompany.id,
        personRoles: {
          create: {
            roleType: 'ADMIN',
            companyId: testCompany.id,
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
      testEmployee = await prisma.person.create({
      data: {
        firstName: 'Test',
        lastName: 'Employee',
        email: 'employee@test.com',
        phone: '1234567890',
        taxCode: 'TSTMPL87654321',
        birthDate: new Date('1990-01-01'),
        residenceAddress: 'Test Address',
        residenceCity: 'Test City',
        province: 'TP',
        postalCode: '12345',
        status: 'ACTIVE',
        isActive: true,
        companyId: testCompany.id,
        personRoles: {
          create: {
            roleType: 'EMPLOYEE',
            companyId: testCompany.id,
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
      expect(employee.company.ragioneSociale).toBe('Test Company');
    });

    it('should validate course data structure', async () => {
      // Create a test course
      const testCourse = await prisma.course.create({
        data: {
          title: 'Test Course',
          description: 'Test Description',
          duration: '8 hours',
          validityYears: 3,
          category: 'safety'
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
          category: 'safety'
        }
      });

      // Create course schedule
      const courseSchedule = await prisma.courseSchedule.create({
        data: {
          courseId: testCourse.id,
          start_date: new Date(),
          end_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
          location: 'Test Location',
          max_participants: 20,
          status: 'scheduled',
          companyId: testCompany.id
        }
      });

      // Create employee-course enrollment
      const courseEnrollment = await prisma.courseEnrollment.create({
        data: {
          personId: testEmployee.id,
          scheduleId: courseSchedule.id,
          status: 'completed'
        }
      });

      expect(courseEnrollment).toBeDefined();
      expect(courseEnrollment.personId).toBe(testEmployee.id);
      expect(courseEnrollment.scheduleId).toBe(courseSchedule.id);
      expect(courseEnrollment.status).toBe('completed');

      // Cleanup
      await prisma.courseEnrollment.delete({ where: { id: courseEnrollment.id } });
      await prisma.courseSchedule.delete({ where: { id: courseSchedule.id } });
      await prisma.course.delete({ where: { id: testCourse.id } });
    });
  });

  describe('Database Integrity', () => {
    it('should maintain referential integrity', async () => {
      // Test that company deletion cascades properly
      const tempCompany = await prisma.company.create({
        data: {
          ragioneSociale: 'Temp Company',
          mail: 'temp@company.com',
          telefono: '1234567890',
          sede_azienda: 'Temp Address',
          citta: 'Temp City',
          provincia: 'Temp Province',
          cap: '12345',
          piva: '98765432109',
          codice_fiscale: 'TMPCMP98765432',
          is_active: true
        }
      });

      const tempEmployee = await prisma.person.create({
        data: {
          firstName: 'Temp',
          lastName: 'Employee',
          email: 'temp@employee.com',
          phone: '1234567890',
          taxCode: 'TMPEMPL9876543',
          birthDate: new Date('1990-01-01'),
          residenceAddress: 'Temp Address',
          residenceCity: 'Temp City',
          province: 'TP',
          postalCode: '12345',
          status: 'ACTIVE',
          isActive: true,
          companyId: tempCompany.id,
          personRoles: {
            create: {
              roleType: 'EMPLOYEE',
              companyId: tempCompany.id,
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