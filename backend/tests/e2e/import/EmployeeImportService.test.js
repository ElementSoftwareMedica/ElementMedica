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

    // P49/P63: Company non ha più tenantId - creare CompanyTenantProfile separatamente
    const company = await prisma.company.upsert({
      where: { piva: '66666666661' },
      update: {},
      create: {
        ragioneSociale: 'Test Company for Employees',
        piva: '66666666661' // P.IVA valida diversa da quelle usate in CompanyImportService tests
      }
    });
    // Crea il profilo tenant per l'azienda
    await prisma.companyTenantProfile.upsert({
      where: { companyId_tenantId: { companyId: company.id, tenantId: TEST_TENANT_ID } },
      update: {},
      create: {
        companyId: company.id,
        tenantId: TEST_TENANT_ID
      }
    });
    testCompanyId = company.id;
  });

  afterAll(async () => {
    // P63: Person.tenantId RIMOSSO - cleanup tramite PersonTenantProfile
    // Pulisci nella corretta sequenza per evitare foreign key constraints
    await prisma.personRole.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    // Trova le persone tramite i loro profili nel tenant
    const profiles = await prisma.personTenantProfile.findMany({
      where: { tenantId: TEST_TENANT_ID },
      select: { personId: true }
    });
    const personIds = profiles.map(p => p.personId);
    await prisma.personTenantProfile.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    if (personIds.length > 0) {
      await prisma.person.deleteMany({ where: { id: { in: personIds } } });
    }
    await prisma.companySite.deleteMany({
      where: { companyTenantProfile: { tenantId: TEST_TENANT_ID } }
    });
    await prisma.companyTenantProfile.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.company.deleteMany({ where: { piva: '66666666661' } }); // Cleanup by known P.IVA
    await prisma.tenant.delete({ where: { id: TEST_TENANT_ID } }).catch(() => { });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // P63: Person.tenantId RIMOSSO - cleanup tramite PersonTenantProfile
    await prisma.personRole.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    const profiles = await prisma.personTenantProfile.findMany({
      where: { tenantId: TEST_TENANT_ID },
      select: { personId: true }
    });
    const personIds = profiles.map(p => p.personId);
    await prisma.personTenantProfile.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    if (personIds.length > 0) {
      await prisma.person.deleteMany({ where: { id: { in: personIds } } });
    }
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
      // P48: Crea persona esistente con profilo tenant e ruolo EMPLOYEE
      await prisma.person.create({
        data: {
          firstName: 'Giulia',
          lastName: 'Gialli',
          taxCode: 'GLLGLU88E20H501V', // Test 3 - Giulia (conflitto DB)
          tenantProfiles: {
            create: {
              tenantId: TEST_TENANT_ID,
              isPrimary: true
            }
          },
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

      // Verifica nel database - P48: Person non ha tenantId, cercare tramite tenantProfiles
      const imported = await prisma.person.findMany({
        where: {
          taxCode: { in: ['BRNCRL79F30H501U', 'RSSDVD82G15H501T'] },
          tenantProfiles: { some: { tenantId: TEST_TENANT_ID } }
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

      // P48: Verifica relazione con Company tramite PersonTenantProfile.companyTenantProfileId
      const person = await prisma.person.findFirst({
        where: { taxCode: 'FRRLNE87H25H501S' },
        include: { tenantProfiles: { where: { tenantId: TEST_TENANT_ID } } }
      });

      const companyProfile = await prisma.companyTenantProfile.findFirst({
        where: { companyId: testCompanyId, tenantId: TEST_TENANT_ID }
      });
      expect(person.tenantProfiles[0]?.companyTenantProfileId).toBe(companyProfile?.id);
    });

    it('dovrebbe aggiornare dipendente esistente se in overwriteIds', async () => {
      const existing = await prisma.person.create({
        data: {
          firstName: 'Francesco',
          lastName: 'Totti',
          taxCode: 'TTTFNC76M27H501R', // Test 6 - Francesco
          tenantProfiles: {
            create: {
              tenantId: TEST_TENANT_ID,
              email: 'old@test.com',
              isPrimary: true
            }
          },
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

      const updated = await prisma.person.findUnique({
        where: { id: existing.id },
        include: { tenantProfiles: { where: { tenantId: TEST_TENANT_ID } } }
      });
      expect(updated.lastName).toBe('Totti Updated');
      expect(updated.tenantProfiles[0]?.email).toBe('new@test.com');
    });
  });

  describe('bulkAssignToCompany', () => {
    it('dovrebbe assegnare multiple persone ad azienda', async () => {
      // P48: Crea 3 persone con profili tenant
      const persons = await Promise.all([
        prisma.person.create({
          data: {
            firstName: 'Giorgio',
            lastName: 'Armani',
            taxCode: 'RMNGRI68L12H501Q', // Test 7 - Giorgio
            tenantProfiles: { create: { tenantId: TEST_TENANT_ID, isPrimary: true } },
            personRoles: { create: { roleType: 'EMPLOYEE', tenantId: TEST_TENANT_ID } }
          }
        }),
        prisma.person.create({
          data: {
            firstName: 'Silvia',
            lastName: 'Romano',
            taxCode: 'RMNSLV91M50H501P', // Test 7 - Silvia
            tenantProfiles: { create: { tenantId: TEST_TENANT_ID, isPrimary: true } },
            personRoles: { create: { roleType: 'EMPLOYEE', tenantId: TEST_TENANT_ID } }
          }
        }),
        prisma.person.create({
          data: {
            firstName: 'Andrea',
            lastName: 'Bocelli',
            taxCode: 'BCLNDR58P09H501O', // Test 7 - Andrea
            tenantProfiles: { create: { tenantId: TEST_TENANT_ID, isPrimary: true } },
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

      // P48: Verifica che tutte le persone siano assegnate via companyTenantProfileId nel profilo
      const assignedProfiles = await prisma.personTenantProfile.findMany({
        where: {
          personId: { in: personIds },
          tenantId: TEST_TENANT_ID,
          companyTenantProfileId: { not: null }
        }
      });
      expect(assignedProfiles).toHaveLength(3);
    });
  });
});
