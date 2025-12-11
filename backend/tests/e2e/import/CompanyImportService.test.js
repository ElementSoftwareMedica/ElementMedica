/**
 * @file CompanyImportService.test.js
 * @description Test E2E per CompanyImportService
 * Testa validazione P.IVA, duplicate detection, conflict resolution, import
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import CompanyImportService from '../../../services/import/company/CompanyImportService.js';

const prisma = new PrismaClient();
const TEST_TENANT_ID = 'test-tenant-company-import';

describe('CompanyImportService E2E Tests', () => {
  // Setup: crea tenant di test
  beforeAll(async () => {
    await prisma.tenant.upsert({
      where: { id: TEST_TENANT_ID },
      update: {},
      create: {
        id: TEST_TENANT_ID,
        name: 'Test Tenant - Company Import',
        domain: 'test-company-import.local',
        slug: 'test-company-import'
      }
    });
  });

  // Cleanup: rimuovi dati di test
  afterAll(async () => {
    await prisma.company.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.tenant.deleteMany({ where: { id: TEST_TENANT_ID } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Pulisci companies prima di ogni test
    await prisma.company.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
  });

  describe('validateCompanies', () => {
    it('dovrebbe validare aziende con P.IVA corrette', async () => {
      const companies = [
        {
          businessName: 'Acme Corp',
          vatNumber: '12345678903' // P.IVA valida
        },
        {
          businessName: 'Beta Inc',
          vatNumber: '01234567897' // P.IVA valida
        }
      ];

      const result = await CompanyImportService.validateCompanies(companies, TEST_TENANT_ID);

      expect(result.valid).toBe(true);
      expect(result.validatedCompanies).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('dovrebbe rilevare P.IVA non valide', async () => {
      const companies = [
        {
          businessName: 'Invalid Corp',
          vatNumber: '123' // P.IVA troppo corta
        },
        {
          businessName: 'Another Invalid',
          vatNumber: 'ABCDEFGHIJK' // P.IVA non numerica
        }
      ];

      const result = await CompanyImportService.validateCompanies(companies, TEST_TENANT_ID);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.validatedCompanies).toHaveLength(0);
    });

    it('dovrebbe rilevare campi mancanti', async () => {
      const companies = [
        {
          vatNumber: '12345678903' // Manca businessName
        },
        {
          businessName: 'Test SRL' // Manca vatNumber
        }
      ];

      const result = await CompanyImportService.validateCompanies(companies, TEST_TENANT_ID);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('detectDuplicatesAndConflicts', () => {
    it('dovrebbe rilevare duplicati interni al CSV', async () => {
      const companies = [
        { businessName: 'Acme Corp', vatNumber: '12345678903' },
        { businessName: 'Acme Corp 2', vatNumber: '12345678903' } // Duplicato
      ];

      const { duplicates } = await CompanyImportService.detectDuplicatesAndConflicts(
        companies,
        TEST_TENANT_ID
      );

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].value).toBe('12345678903');
    });

    it('dovrebbe rilevare conflitti con database', async () => {
      // Crea azienda esistente
      await prisma.company.create({
        data: {
          ragioneSociale: 'Existing Company',
          piva: '11111111115',
          tenantId: TEST_TENANT_ID
        }
      });

      const companies = [
        { businessName: 'New Company', vatNumber: '11111111115' } // Conflitto
      ];

      const { conflicts } = await CompanyImportService.detectDuplicatesAndConflicts(
        companies,
        TEST_TENANT_ID
      );

      expect(conflicts.size).toBe(1);
      expect(conflicts.get(0)).toBeDefined();
      expect(conflicts.get(0).existingItem.piva).toBe('11111111115');
    });

    it('NON dovrebbe rilevare conflitti se P.IVA diverse', async () => {
      // Crea azienda esistente
      await prisma.company.create({
        data: {
          ragioneSociale: 'Existing Company',
          piva: '22222222220',
          tenantId: TEST_TENANT_ID
        }
      });

      const companies = [
        { businessName: 'New Company', vatNumber: '98765432109' } // P.IVA diversa
      ];

      const { conflicts } = await CompanyImportService.detectDuplicatesAndConflicts(
        companies,
        TEST_TENANT_ID
      );

      expect(conflicts.size).toBe(0);
    });
  });

  describe('importCompanies', () => {
    it('dovrebbe importare nuove aziende', async () => {
      const companies = [
        {
          businessName: 'Acme Corp',
          vatNumber: '12345678903',
          email: 'info@acme.com',
          phone: '0123456789'
        },
        {
          businessName: 'Beta Inc',
          vatNumber: '98765432109',
          email: 'info@beta.com'
        }
      ];

      const result = await CompanyImportService.importCompanies(
        companies,
        TEST_TENANT_ID
      );

      expect(result.success).toBe(true);
      expect(result.created).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);

      // Verifica nel database
      const imported = await prisma.company.findMany({
        where: { tenantId: TEST_TENANT_ID }
      });
      expect(imported).toHaveLength(2);
    });

    it('dovrebbe rilevare conflitti con database', async () => {
      // Crea azienda esistente
      await prisma.company.create({
        data: {
          ragioneSociale: 'Existing Company',
          piva: '33333333335',
          tenantId: TEST_TENANT_ID
        }
      });

      const companies = [
        { businessName: 'Updated Company', vatNumber: '33333333335' }
      ];

      const result = await CompanyImportService.importCompanies(
        companies,
        TEST_TENANT_ID,
        [] // No overwrite
      );

      expect(result.success).toBe(true);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('dovrebbe sovrascrivere con overwriteIds', async () => {
      // Crea azienda esistente
      const existing = await prisma.company.create({
        data: {
          ragioneSociale: 'Existing Company',
          piva: '44444444440',
          mail: 'old@email.com',
          tenantId: TEST_TENANT_ID
        }
      });

      const companies = [
        {
          businessName: 'Updated Company',
          vatNumber: '44444444440',
          email: 'new@email.com'
        }
      ];

      const result = await CompanyImportService.importCompanies(
        companies,
        TEST_TENANT_ID,
        [existing.id] // Overwrite this ID
      );

      expect(result.success).toBe(true);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(1);
      expect(result.skipped).toBe(0);

      // Verifica update
      const updated = await prisma.company.findUnique({
        where: { id: existing.id }
      });
      expect(updated.ragioneSociale).toBe('Updated Company');
      expect(updated.mail).toBe('new@email.com');
    });
  });

  describe('createCompanySite', () => {
    it('dovrebbe creare una sede per azienda', async () => {
      const company = await prisma.company.create({
        data: {
          ragioneSociale: 'Test Company',
          piva: '55555555550',
          tenantId: TEST_TENANT_ID
        }
      });

      const siteData = {
        name: 'Sede Principale',
        address: 'Via Test 123',
        city: 'Milano',
        province: 'MI',
        postalCode: '20100'
      };

      const site = await CompanyImportService.createCompanySite(company.id, siteData, TEST_TENANT_ID);

      expect(site).toBeDefined();
      expect(site.siteName).toBe('Sede Principale');
      expect(site.citta).toBe('Milano');
      expect(site.companyId).toBe(company.id);

      // Verifica nel database
      const dbSite = await prisma.companySite.findUnique({
        where: { id: site.id }
      });
      expect(dbSite).toBeDefined();
    });
  });
});
