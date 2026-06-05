import { jest } from '@jest/globals';
import express from 'express';
import fs from 'fs';
import path from 'path';
import request from 'supertest';

const backendRoot = path.resolve(process.cwd());
const documentsRoot = path.join(backendRoot, 'uploads', 'company-mdl-documents');

let currentPerson = {
  id: 'person-a',
  tenantId: 'tenant-a',
  globalRole: 'ADMIN',
  permissions: ['companies:read', 'companies:update']
};

const mockPrisma = {
  companyTenantProfile: {
    findFirst: jest.fn()
  },
  activityLog: {
    create: jest.fn()
  }
};

jest.unstable_mockModule('../../config/prisma-optimization.js', () => ({
  default: mockPrisma
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

jest.unstable_mockModule('../../middleware/auth.js', () => ({
  default: {
    authenticate: (req, _res, next) => {
      req.person = currentPerson;
      next();
    }
  },
  authenticate: (req, _res, next) => {
    req.person = currentPerson;
    next();
  }
}));

jest.unstable_mockModule('../../middleware/advanced-permissions.js', () => ({
  checkAdvancedPermission: () => (_req, _res, next) => next(),
  filterDataByPermissions: () => (_req, _res, next) => next(),
  requireOwnCompany: () => (_req, _res, next) => next()
}));

jest.unstable_mockModule('../../middleware/role-data-filter.js', () => ({
  roleDataFilter: (_req, _res, next) => next(),
  filterResponseFields: (_req, _res, next) => next()
}));

jest.unstable_mockModule('../../services/management/TariffarioAziendaleService.js', () => ({
  default: {}
}));

jest.unstable_mockModule('../../services/clinical/RisultatiAnonimiService.js', () => ({
  default: { generatePdf: jest.fn() }
}));

jest.unstable_mockModule('../../services/clinical/RiunioniPeriodicheService.js', () => ({
  default: { generatePdf: jest.fn() }
}));

jest.unstable_mockModule('../../services/pdfService.js', () => ({
  default: { generatePDF: jest.fn() }
}));

jest.unstable_mockModule('../../services/PersonTenantAccessService.js', () => ({
  AVAILABLE_FEATURES: {},
  personTenantAccessService: { getAccessibleTenants: jest.fn() }
}));

jest.unstable_mockModule('../../utils/trainerAccess.js', () => ({
  isTrainerOnlyAccess: jest.fn(() => false),
  getTrainerCompanyProfileIds: jest.fn(() => [])
}));

const companiesRoutes = (await import('../../routes/companies-routes.js')).default;

describe('company MDL document routes', () => {
  let app;
  const documentDir = path.join(documentsRoot, 'tenant-a', 'profile-a', 'riunione-periodica');
  const documentPath = path.join(documentDir, 'verbale.pdf');

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/companies', companiesRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentPerson = {
      id: 'person-a',
      tenantId: 'tenant-a',
      globalRole: 'ADMIN',
      permissions: ['companies:read', 'companies:update']
    };
    fs.rmSync(path.join(documentsRoot, 'tenant-a'), { recursive: true, force: true });
    fs.rmSync(path.join(documentsRoot, 'tenant-b'), { recursive: true, force: true });
    fs.mkdirSync(documentDir, { recursive: true });
    fs.writeFileSync(documentPath, Buffer.from('%PDF-1.4\n% test\n'));
    fs.writeFileSync(`${documentPath}.json`, JSON.stringify({
      originalName: 'Verbale.pdf',
      sha256: 'hash-atteso',
      scanStatus: 'GENERATED',
      createdAt: '2026-06-05T08:00:00.000Z'
    }));
  });

  afterAll(() => {
    fs.rmSync(path.join(documentsRoot, 'tenant-a'), { recursive: true, force: true });
    fs.rmSync(path.join(documentsRoot, 'tenant-b'), { recursive: true, force: true });
  });

  test('lists only documents resolved inside the authenticated tenant', async () => {
    mockPrisma.companyTenantProfile.findFirst.mockResolvedValue({
      id: 'profile-a',
      tenantId: 'tenant-a',
      company: { ragioneSociale: 'Azienda A' }
    });

    const response = await request(app)
      .get('/api/v1/companies/profile-a/mdl-documents/riunione-periodica/files')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      filename: 'verbale.pdf',
      originalName: 'Verbale.pdf',
      sha256: 'hash-atteso'
    });
    expect(mockPrisma.companyTenantProfile.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-a', deletedAt: null })
    }));
  });

  test('does not expose documents when the company profile is not in the tenant scope', async () => {
    mockPrisma.companyTenantProfile.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/v1/companies/profile-b/mdl-documents/riunione-periodica/files')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Azienda non trovata');
  });

  test('rejects unknown document types before touching the filesystem', async () => {
    const response = await request(app)
      .get('/api/v1/companies/profile-a/mdl-documents/non-previsto/files')
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(mockPrisma.companyTenantProfile.findFirst).not.toHaveBeenCalled();
  });

  test('serves tenant-scoped documents with integrity headers', async () => {
    mockPrisma.companyTenantProfile.findFirst.mockResolvedValue({
      id: 'profile-a',
      tenantId: 'tenant-a',
      company: { ragioneSociale: 'Azienda A' }
    });

    const response = await request(app)
      .get('/api/v1/companies/profile-a/mdl-documents/riunione-periodica/files/verbale.pdf')
      .expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-document-sha256']).toBe('hash-atteso');
    expect(Buffer.from(response.body).toString('utf8')).toContain('%PDF-1.4');
  });
});
