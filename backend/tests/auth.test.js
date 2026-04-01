import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { prisma, createTestCompany, createTestUser } from './setup.js';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

describe('Authentication Tests', () => {
  let testCompany;
  let testUser;

  beforeEach(async () => {
    // Create test company using helper function
    testCompany = await createTestCompany({
      ragioneSociale: 'Test Company'
    });

    // Create test user using helper function
    testUser = await createTestUser(testCompany.id, {
      firstName: 'Admin',
      lastName: 'User',
      email: 'testadmin@example.com',
      username: 'testadmin'
    });
  });

  afterEach(async () => {
    // Clean up test data in correct order
    try {
      if (testUser) {
        // Delete role permissions first
        await prisma.rolePermission.deleteMany({
          where: {
            personRole: {
              personId: testUser.id
            }
          }
        });
        // Delete person roles
        await prisma.personRole.deleteMany({ where: { personId: testUser.id } });
        // Delete person tenant profiles then person
        await prisma.personTenantProfile.deleteMany({ where: { personId: testUser.id } });
        await prisma.person.deleteMany({ where: { id: testUser.id } });
      }
      if (testCompany) {
        await prisma.company.deleteMany({ where: { id: testCompany.id } });
      }
    } catch (error) {
      console.log('Cleanup error:', error.message);
    }
  });

  describe('Password Validation', () => {
    it('should hash password correctly', async () => {
      const password = 'Admin123!';
      const hashedPassword = await bcrypt.hash(password, 12);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    it('should validate correct password', async () => {
      const password = 'Admin123!';
      const hashedPassword = await bcrypt.hash(password, 12);
      const isValid = await bcrypt.compare(password, hashedPassword);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'Admin123!';
      const wrongPassword = 'WrongPassword';
      const hashedPassword = await bcrypt.hash(password, 12);
      const isValid = await bcrypt.compare(wrongPassword, hashedPassword);

      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token Operations', () => {
    it('should generate JWT token', () => {
      const payload = { personId: 1, email: 'admin@example.com', role: 'admin' };
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET non configurato per i test (.env.test)');
      }

      const token = jwt.sign(payload, secret, { expiresIn: '1h' });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should verify valid JWT token', () => {
      const payload = { personId: 1, email: 'admin@example.com', role: 'admin' };
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET non configurato per i test (.env.test)');
      }

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

      const isValid = await bcrypt.compare('Admin123!', user.password);
      expect(isValid).toBe(true);
    });
  });
});