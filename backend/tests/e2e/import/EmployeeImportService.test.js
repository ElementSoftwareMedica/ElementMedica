/**
 * @file EmployeeImportService.test.js
 * @description Test E2E per EmployeeImportService
 * Testa validazione CF, bulk company assignment, conflict resolution
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import EmployeeImportService from '../../../services/import/employee/EmployeeImportService.js';

const prisma = new PrismaClient();
const TEST_TENANT_ID = 'test-tenant-employee-import';

describe('EmployeeImportService E2E Tests', () => {
  let testCompanyId;

  beforeAll(async () => {
    // Crea tenant di test
    await prisma.tenant.upsert({
      where: { id: TEST_TENANT_ID },
      update: {},
      create: {
        id: TEST_TENANT_ID,
        name: 'Test Tenant - Employee Import',
        domain: 'test-employee-import.local',
        slug: 'test-employee-import'
      }
    });

    // Crea azienda per test bulk assignment (usa upsert per evitare conflitti)
    const company = await prisma.company.upsert({
      where: { piva: '66666666661' },
      update: {},
      create: {
        ragioneSociale: 'Test Company for Employees',
        piva: '66666666661', // P.IVA valida diversa da quelle usate in CompanyImportService tests
        tenantId: TEST_TENANT_ID
      }
    });
    testCompanyId = company.id;
  });

  afterAll(async () => {
    // Pulisci nella corretta sequenza per evitare foreign key constraints
    await prisma.personRole.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.person.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.companySite.deleteMany({
      where: { company: { tenantId: TEST_TENANT_ID } }
    });
    await prisma.company.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.tenant.delete({ where: { id: TEST_TENANT_ID } }).catch(() => {});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Pulisci persone e relazioni prima di ogni test
    await prisma.personRole.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.person.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
  });

  describe('validateEmployees', () => {
    it('dovrebbe validare dipendenti con CF corretti', async () => {
      const employees = [
        {
          firstName: 'Mario',
          lastName: 'Rossi',
          taxCode: 'RSSMRA80A01H501Z', // Test 1 - Mario
          email: 'mario.rossi@test.com'
        },
        {
          firstName: 'Luigi',
          lastName: 'Verdi',
          taxCode: 'VRDLGU85B02H501Y', // Test 1 - Luigi
          email: 'luigi.verdi@test.com'
        }
      ];

      const result = await EmployeeImportService.validateEmployees(employees, TEST_TENANT_ID);

      expect(result.valid).toBe(true);
      expect(result.validatedEmployees).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      // Verifica normalizzazione CF
      expect(result.validatedEmployees[0].taxCode).toBe('RSSMRA80A01H501Z');
    });

    it('dovrebbe rilevare CF non validi', async () => {
      const employees = [
        {
          firstName: 'Mario',
          lastName: 'Rossi',
          taxCode: '123', // CF troppo corto
          email: 'mario@test.com'
        },
        {
          firstName: 'Luigi',
          lastName: 'Verdi',
          taxCode: 'INVALID_CF_FORMAT', // CF non valido
          email: 'luigi@test.com'
        }
      ];

      const result = await EmployeeImportService.validateEmployees(employees, TEST_TENANT_ID);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('dovrebbe validare email se presenti', async () => {
      const employees = [
        {
          firstName: 'Mario',
          lastName: 'Rossi',
          taxCode: 'RSSMRA80A01H501Z',
          email: 'invalid-email' // Email non valida
        }
      ];

      const result = await EmployeeImportService.validateEmployees(employees, TEST_TENANT_ID);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'email')).toBe(true);
    });
  });

  describe('detectDuplicatesAndConflicts', () => {
    it('dovrebbe rilevare duplicati CF nel CSV', async () => {
      const employees = [
        { firstName: 'Paolo', lastName: 'Neri', taxCode: 'NREPLA75D10H501W' }, // Test 2 - Paolo (duplicato)
        { firstName: 'Paolo', lastName: 'Neri', taxCode: 'NREPLA75D10H501W' } // Duplicato
      ];

      const { duplicates } = await EmployeeImportService.detectDuplicatesAndConflicts(
        employees,
        TEST_TENANT_ID
      );

      expect(duplicates).toHaveLength(1);
    });

    it('dovrebbe rilevare conflitti con database', async () => {
      // Crea persona esistente con ruolo EMPLOYEE
      await prisma.person.create({
        data: {
          firstName: 'Giulia',
          lastName: 'Gialli',
          taxCode: 'GLLGLU88E20H501V', // Test 3 - Giulia (conflitto DB)
          tenantId: TEST_TENANT_ID,
          personRoles: {
            create: {
              roleType: 'EMPLOYEE',
              tenantId: TEST_TENANT_ID
            }
          }
        }
      });

      const employees = [
        { firstName: 'Giulia', lastName: 'Bianchi', taxCode: 'GLLGLU88E20H501V' } // Conflitto con DB
      ];

      const { conflicts } = await EmployeeImportService.detectDuplicatesAndConflicts(
        employees,
        TEST_TENANT_ID
      );

      expect(conflicts.size).toBe(1);
    });
  });

  describe('importEmployees', () => {
    it('dovrebbe importare nuovi dipendenti', async () => {
      const employees = [
        {
          firstName: 'Carla',
          lastName: 'Bruni',
          taxCode: 'BRNCRL79F30H501U', // Test 4 - Carla
          email: 'carla@test.com'
        },
        {
          firstName: 'Davide',
          lastName: 'Rossi',
          taxCode: 'RSSDVD82G15H501T', // Test 4 - Davide
          email: 'davide@test.com'
        }
      ];

      const result = await EmployeeImportService.importEmployees(
        employees,
        TEST_TENANT_ID
      );

      expect(result.success).toBe(true);
      expect(result.created).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);

      // Verifica nel database
      const imported = await prisma.person.findMany({
        where: { 
          tenantId: TEST_TENANT_ID,
          taxCode: { in: ['BRNCRL79F30H501U', 'RSSDVD82G15H501T'] }
        },
        include: { personRoles: true }
      });
      expect(imported).toHaveLength(2);
      expect(imported.every(p => p.personRoles.some(r => r.roleType === 'EMPLOYEE'))).toBe(true);
    });

    it('dovrebbe assegnare dipendenti ad azienda (bulk)', async () => {
      const employees = [
        {
          firstName: 'Elena',
          lastName: 'Ferretti',
          taxCode: 'FRRLNE87H25H501S', // Test 5 - Elena
          email: 'elena@test.com'
        }
      ];

      const result = await EmployeeImportService.importEmployees(
        employees,
        TEST_TENANT_ID,
        testCompanyId // Bulk company assignment
      );

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);

      // Verifica relazione con Company tramite companyId
      const person = await prisma.person.findFirst({
        where: { taxCode: 'FRRLNE87H25H501S' }
      });

      expect(person.companyId).toBe(testCompanyId);
    });

    it('dovrebbe aggiornare dipendente esistente se in overwriteIds', async () => {
      const existing = await prisma.person.create({
        data: {
          firstName: 'Francesco',
          lastName: 'Totti',
          taxCode: 'TTTFNC76M27H501R', // Test 6 - Francesco
          email: 'old@test.com',
          tenantId: TEST_TENANT_ID,
          personRoles: {
            create: { roleType: 'EMPLOYEE', tenantId: TEST_TENANT_ID }
          }
        }
      });

      const employees = [
        {
          firstName: 'Francesco',
          lastName: 'Totti Updated',
          taxCode: 'TTTFNC76M27H501R',
          email: 'new@test.com'
        }
      ];

      const result = await EmployeeImportService.importEmployees(
        employees,
        TEST_TENANT_ID,
        null,
        [existing.id] // Overwrite
      );

      expect(result.updated).toBe(1);

      const updated = await prisma.person.findUnique({ where: { id: existing.id } });
      expect(updated.lastName).toBe('Totti Updated');
      expect(updated.email).toBe('new@test.com');
    });
  });

  describe('bulkAssignToCompany', () => {
    it('dovrebbe assegnare multiple persone ad azienda', async () => {
      // Crea 3 persone con CF unici per questo test
      const persons = await Promise.all([
        prisma.person.create({
          data: {
            firstName: 'Giorgio',
            lastName: 'Armani',
            taxCode: 'RMNGRI68L12H501Q', // Test 7 - Giorgio
            tenantId: TEST_TENANT_ID,
            personRoles: { create: { roleType: 'EMPLOYEE', tenantId: TEST_TENANT_ID } }
          }
        }),
        prisma.person.create({
          data: {
            firstName: 'Silvia',
            lastName: 'Romano',
            taxCode: 'RMNSLV91M50H501P', // Test 7 - Silvia
            tenantId: TEST_TENANT_ID,
            personRoles: { create: { roleType: 'EMPLOYEE', tenantId: TEST_TENANT_ID } }
          }
        }),
        prisma.person.create({
          data: {
            firstName: 'Andrea',
            lastName: 'Bocelli',
            taxCode: 'BCLNDR58P09H501O', // Test 7 - Andrea
            tenantId: TEST_TENANT_ID,
            personRoles: { create: { roleType: 'EMPLOYEE', tenantId: TEST_TENANT_ID } }
          }
        })
      ]);

      const personIds = persons.map(p => p.id);

      const result = await EmployeeImportService.bulkAssignToCompany(
        personIds,
        testCompanyId
      );

      expect(result.success).toBe(true);
      expect(result.assigned).toBe(3);

      // Verifica che tutte le persone siano assegnate via companyId
      const assignedPersons = await prisma.person.findMany({
        where: { 
          id: { in: personIds },
          companyId: testCompanyId
        }
      });
      expect(assignedPersons).toHaveLength(3);
    });
  });
});
