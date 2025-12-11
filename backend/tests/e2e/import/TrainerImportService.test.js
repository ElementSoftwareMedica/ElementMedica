/**
 * @file TrainerImportService.test.js
 * @description Test E2E per TrainerImportService e TrainerAccountService
 * Testa validazione, import, creazione account con username nome.cognome e password Password123!
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import TrainerImportService from '../../../services/import/trainer/TrainerImportService.js';
import TrainerAccountService from '../../../services/import/trainer/TrainerAccountService.js';

const prisma = new PrismaClient();
const TEST_TENANT_ID = 'test-tenant-trainer-import';

describe('TrainerImportService E2E Tests', () => {
  beforeAll(async () => {
    await prisma.tenant.upsert({
      where: { id: TEST_TENANT_ID },
      update: {},
      create: {
        id: TEST_TENANT_ID,
        name: 'Test Tenant - Trainer Import',
        domain: 'test-trainer-import.local',
        slug: 'test-trainer-import'
      }
    });
  });

  afterAll(async () => {
    await prisma.personRole.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.person.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.tenant.delete({ where: { id: TEST_TENANT_ID } }).catch(() => {});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.personRole.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.person.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
  });

  describe('validateTrainers', () => {
    it('dovrebbe validare formatori con CF e email corretti', async () => {
      const trainers = [
        {
          firstName: 'Mario',
          lastName: 'Rossi',
          taxCode: 'RSSMRA80A01H501Z', // Test 1a - Mario validation
          email: 'mario.rossi@trainer.com'
        },
        {
          firstName: 'Luigi',
          lastName: 'Verdi',
          taxCode: 'VRDLGU85B02H501Y', // Test 1b - Luigi validation
          email: 'luigi.verdi@trainer.com'
        }
      ];

      const result = await TrainerImportService.validateTrainers(trainers, TEST_TENANT_ID);

      expect(result.valid).toBe(true);
      expect(result.validatedTrainers).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('dovrebbe richiedere email per trainers', async () => {
      const trainers = [
        {
          firstName: 'Paolo',
          lastName: 'Neri',
          taxCode: 'NREPLA75D10H501W' // Test 2 - Paolo email required
          // Manca email (required per trainers)
        }
      ];

      const result = await TrainerImportService.validateTrainers(trainers, TEST_TENANT_ID);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'email')).toBe(true);
    });
  });

  describe('importTrainers with Account Creation', () => {
    it('dovrebbe creare trainer con account automatico', async () => {
      const trainers = [
        {
          firstName: 'Giulia',
          lastName: 'Gialli',
          taxCode: 'GLLGLU88E20H501V', // Test 3 - Giulia account creation
          email: 'giulia.gialli@trainer.com'
        }
      ];

      const result = await TrainerImportService.importTrainers(
        trainers,
        TEST_TENANT_ID,
        [], // No overwrite
        true // Create accounts
      );

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);
      expect(result.credentials).toHaveLength(1);

      // Verifica credenziali
      const creds = result.credentials[0];
      expect(creds.username).toBe('giulia.gialli');
      expect(creds.password).toBe('Password123!');
      expect(creds.email).toBe('giulia.gialli@trainer.com');

      // Verifica Person + Role (NO user relation - username/password on Person)
      const person = await prisma.person.findFirst({
        where: { taxCode: 'GLLGLU88E20H501V' },
        include: { personRoles: true }
      });

      expect(person).toBeDefined();
      expect(person.personRoles.some(r => r.roleType === 'TRAINER')).toBe(true);

      // Verifica username/password su Person (non separate User table)
      expect(person.username).toBe('giulia.gialli');
      expect(person.email).toBe('giulia.gialli@trainer.com');

      // Verifica password hash
      const validPassword = await bcrypt.compare('Password123!', person.password);
      expect(validPassword).toBe(true);
    });

    it('dovrebbe gestire omonimie con contatore (giorgio.verdi1, giorgio.verdi2)', async () => {
      // Crea primo Giorgio Verdi
      await prisma.person.create({
        data: {
          firstName: 'Giorgio',
          lastName: 'Verdi',
          taxCode: 'VRDGRG70B15H501M', // Test 4a - Primo Giorgio
          email: 'giorgio1@test.com',
          username: 'giorgio.verdi',
          password: 'hash123',
          tenantId: TEST_TENANT_ID,
          personRoles: { create: { roleType: 'TRAINER', tenantId: TEST_TENANT_ID } }
        }
      });

      // Importa secondo e terzo Giorgio Verdi
      const trainers = [
        {
          firstName: 'Giorgio',
          lastName: 'Verdi',
          taxCode: 'VRDGRG75C20H501N', // Test 4b - Secondo Giorgio
          email: 'giorgio2@test.com'
        },
        {
          firstName: 'Giorgio',
          lastName: 'Verdi',
          taxCode: 'VRDGRG79D25H501O', // Test 4c - Terzo Giorgio
          email: 'giorgio3@test.com'
        }
      ];

      const result = await TrainerImportService.importTrainers(
        trainers,
        TEST_TENANT_ID,
        [],
        true
      );

      expect(result.success).toBe(true);
      expect(result.created).toBe(2);
      expect(result.credentials).toHaveLength(2);

      // Verifica username con contatore (giorgio.verdi1, giorgio.verdi2)
      const usernames = result.credentials.map(c => c.username).sort();
      expect(usernames).toContain('giorgio.verdi1');
      expect(usernames).toContain('giorgio.verdi2');
    });

    it('dovrebbe normalizzare username (accenti, spazi)', async () => {
      const trainers = [
        {
          firstName: 'José María',
          lastName: 'García López',
          taxCode: 'GRCLSM90A01H501Z',
          email: 'jose@test.com'
        }
      ];

      const result = await TrainerImportService.importTrainers(
        trainers,
        TEST_TENANT_ID,
        [],
        true
      );

      expect(result.success).toBe(true);
      expect(result.credentials[0].username).toBe('josemaria.garcialopez');
    });

    it('dovrebbe importare senza creare account se createAccounts=false', async () => {
      const trainers = [
        {
          firstName: 'Carla',
          lastName: 'Bruni',
          taxCode: 'BRNCRL79F30H501U', // Test 6 - Carla no account
          email: 'carla@test.com'
        }
      ];

      const result = await TrainerImportService.importTrainers(
        trainers,
        TEST_TENANT_ID,
        [],
        false // NO account creation
      );

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);
      expect(result.credentials).toHaveLength(0);

      // Verifica Person creato ma NO username/password
      const person = await prisma.person.findFirst({
        where: { taxCode: 'BRNCRL79F30H501U' }
      });

      expect(person).toBeDefined();
      expect(person.username).toBeNull();
      expect(person.password).toBeNull();
    });
  });

  describe('TrainerAccountService', () => {
    it('dovrebbe generare username univoco', async () => {
      const username = await TrainerAccountService.generateUniqueUsername(
        'test@example.com',
        'Mario',
        'Rossi',
        TEST_TENANT_ID
      );

      expect(username).toBe('mario.rossi');
    });

    it('dovrebbe generare password fissa Password123!', () => {
      const password = TrainerAccountService.generateSecurePassword();
      expect(password).toBe('Password123!');
    });

    it('dovrebbe generare CSV credenziali', () => {
      const credentials = [
        {
          firstName: 'Mario',
          lastName: 'Rossi',
          email: 'mario@test.com',
          username: 'mario.rossi',
          password: 'Password123!'
        },
        {
          firstName: 'Luigi',
          lastName: 'Verdi',
          email: 'luigi@test.com',
          username: 'luigi.verdi',
          password: 'Password123!'
        }
      ];

      const csv = TrainerAccountService.generateCredentialsCSV(credentials);

      expect(csv).toContain('Nome;Cognome;Email;Username;Password');
      expect(csv).toContain('Mario;Rossi;mario@test.com;mario.rossi;Password123!');
      expect(csv).toContain('Luigi;Verdi;luigi@test.com;luigi.verdi;Password123!');
    });
  });

  describe('Conflict Resolution', () => {
    it('dovrebbe saltare conflitto senza overwrite', async () => {
      // Crea trainer esistente
      await prisma.person.create({
        data: {
          firstName: 'Davide',
          lastName: 'Rossi',
          taxCode: 'RSSDVD82G15H501T', // Test 7 - Davide conflict skip
          email: 'old@test.com',
          tenantId: TEST_TENANT_ID,
          personRoles: { create: { roleType: 'TRAINER', tenantId: TEST_TENANT_ID } }
        }
      });

      const trainers = [
        {
          firstName: 'Davide',
          lastName: 'Rossi Updated',
          taxCode: 'RSSDVD82G15H501T',
          email: 'new@test.com'
        }
      ];

      const result = await TrainerImportService.importTrainers(
        trainers,
        TEST_TENANT_ID,
        [], // No overwrite
        false
      );

      expect(result.skipped).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('dovrebbe aggiornare con overwrite e creare account se mancante', async () => {
      const existing = await prisma.person.create({
        data: {
          firstName: 'Elena',
          lastName: 'Ferretti',
          taxCode: 'FRRLNE87H25H501S', // Test 8 - Elena overwrite
          email: 'old@test.com',
          tenantId: TEST_TENANT_ID,
          personRoles: { create: { roleType: 'TRAINER', tenantId: TEST_TENANT_ID } }
          // NO username/password initially
        }
      });

      const trainers = [
        {
          firstName: 'Elena',
          lastName: 'Ferretti',
          taxCode: 'FRRLNE87H25H501S',
          email: 'new@test.com'
        }
      ];

      const result = await TrainerImportService.importTrainers(
        trainers,
        TEST_TENANT_ID,
        [existing.id], // Overwrite
        true // Create account
      );

      expect(result.updated).toBe(1);
      expect(result.credentials).toHaveLength(1);

      // Verifica account creato su Person
      const updated = await prisma.person.findUnique({
        where: { id: existing.id }
      });

      expect(updated.username).toBeDefined();
      expect(updated.username).toBe('elena.ferretti');
    });
  });
});
