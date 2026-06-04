import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockPrisma = {
  companyTenantProfile: {
    findFirst: jest.fn()
  }
};

jest.unstable_mockModule('../../config/prisma-optimization.js', () => ({
  default: mockPrisma
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

const {
  resolveCompanyTenantProfile,
  safeDocumentType,
  sanitizeStoredFilename
} = await import('../../routes/companies-routes.js');

describe('company MDL document helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('resolves company profile only inside the requested tenant and active scope', async () => {
    mockPrisma.companyTenantProfile.findFirst.mockResolvedValue({ id: 'profile-a', tenantId: 'tenant-a' });

    await expect(resolveCompanyTenantProfile('profile-a', 'tenant-a')).resolves.toEqual({ id: 'profile-a', tenantId: 'tenant-a' });

    expect(mockPrisma.companyTenantProfile.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        tenantId: 'tenant-a',
        deletedAt: null,
        OR: [
          { id: 'profile-a' },
          { companyId: 'profile-a' }
        ]
      }
    }));
  });

  test('returns null when another tenant profile is not resolved by scoped query', async () => {
    mockPrisma.companyTenantProfile.findFirst.mockResolvedValue(null);

    await expect(resolveCompanyTenantProfile('profile-b', 'tenant-a')).resolves.toBeNull();
  });

  test('accepts only known document types and sanitizes stored filenames', () => {
    expect(safeDocumentType('riunione-periodica')).toBe('riunione-periodica');
    expect(safeDocumentType('../nomine')).toBeNull();
    expect(safeDocumentType('unknown')).toBeNull();

    expect(sanitizeStoredFilename('../cartella/verbale firmato?.pdf')).toBe('verbale_firmato_.pdf');
  });
});
