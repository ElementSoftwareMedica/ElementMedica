import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

const prisma = new PrismaClient();

describe('Authentication Tests', () => {
  let testCompany;
  let testUser;

  beforeEach(async () => {
    // Create test company first
    testCompany = await prisma.company.create({
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
        is_active: true
      }
    });

    // Create test person (admin)
    const hashedPassword = await bcryptjs.hash('Admin123!', 12);
    
    // First try to create a minimal person
    testUser = await prisma.person.create({
      data: {
        firstName: 'Admin',
        lastName: 'User',
        email: 'testadmin@example.com',
        username: 'testadmin',
        password: hashedPassword,
        companyId: testCompany.id
      }
    });

    // Create PersonRole separately
    const personRole = await prisma.personRole.create({
      data: {
        personId: testUser.id,
        roleType: 'ADMIN',
        companyId: testCompany.id
      }
    });

    // Create permissions for the role
    await prisma.rolePermission.createMany({
      data: [
        {
          personRoleId: personRole.id,
          permission: 'VIEW_EMPLOYEES'
        },
        {
          personRoleId: personRole.id,
          permission: 'CREATE_EMPLOYEES'
        }
      ]
    });
  });

  afterEach(async () => {
    // Clean up test data in correct order
    try {
      // Delete role permissions first
      if (testUser) {
        await prisma.rolePermission.deleteMany({
          where: {
            personRole: {
              personId: testUser.id
            }
          }
        });
        // Delete person roles
        await prisma.personRole.deleteMany({ where: { personId: testUser.id } });
        // Delete person
        await prisma.person.deleteMany({ where: { email: 'testadmin@example.com' } });
      }
      await prisma.company.deleteMany({ where: { ragioneSociale: 'Test Company' } });
    } catch (error) {
      console.log('Cleanup error:', error.message);
    }
  });

  describe('Password Validation', () => {
    it('should hash password correctly', async () => {
      const password = 'Admin123!';
      const hashedPassword = await bcryptjs.hash(password, 12);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    it('should validate correct password', async () => {
      const password = 'Admin123!';
      const hashedPassword = await bcryptjs.hash(password, 12);
      const isValid = await bcryptjs.compare(password, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'Admin123!';
      const wrongPassword = 'WrongPassword';
      const hashedPassword = await bcryptjs.hash(password, 12);
      const isValid = await bcryptjs.compare(wrongPassword, hashedPassword);
      
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token Operations', () => {
    it('should generate JWT token', () => {
      const payload = { personId: 1, email: 'admin@example.com', role: 'admin' };
      const secret = process.env.JWT_SECRET || 'test-secret';
      
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should verify valid JWT token', () => {
      const payload = { personId: 1, email: 'admin@example.com', role: 'admin' };
      const secret = process.env.JWT_SECRET || 'test-secret';
      
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });
      const decoded = jwt.verify(token, secret);
      
      expect(decoded.personId).toBe(payload.personId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });
  });

  describe('Database Operations', () => {
    it('should create and retrieve user', async () => {
      const user = await prisma.person.findUnique({
        where: { id: testUser.id, deletedAt: null }
      });
      
      expect(user).toBeDefined();
      expect(user.email).toBe('testadmin@example.com');
      expect(user.firstName).toBe('Admin');
      expect(user.lastName).toBe('User');
    });

    it('should verify user password hash', async () => {
      const user = await prisma.person.findUnique({
        where: { id: testUser.id, deletedAt: null }
      });
      
      const isValid = await bcryptjs.compare('Admin123!', user.password);
      expect(isValid).toBe(true);
    });
  });
});