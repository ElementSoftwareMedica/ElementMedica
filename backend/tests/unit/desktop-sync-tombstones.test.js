import { describe, expect, jest, test, beforeEach } from '@jest/globals';

const mockPrisma = {
  person: { findMany: jest.fn() },
  personTenantProfile: { findMany: jest.fn() },
  scadenzaPrestazioneProtocollo: { findMany: jest.fn() }
};

jest.unstable_mockModule('../../config/prisma-optimization.js', () => ({
  default: mockPrisma
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

const { getDesktopTombstones } = await import('../../controllers/desktop-sync.controller.js');

describe('desktop sync tombstones', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.person.findMany.mockResolvedValue([]);
    mockPrisma.personTenantProfile.findMany.mockResolvedValue([]);
    mockPrisma.scadenzaPrestazioneProtocollo.findMany.mockResolvedValue([]);
  });

  test('does not query tombstones during initial full sync', async () => {
    await expect(getDesktopTombstones('tenant-a', null)).resolves.toEqual([]);

    expect(mockPrisma.person.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.personTenantProfile.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.scadenzaPrestazioneProtocollo.findMany).not.toHaveBeenCalled();
  });

  test('maps tenant-scoped deleted records to local desktop tables', async () => {
    const deletedAt = new Date('2026-06-04T08:00:00.000Z');
    const updatedAt = new Date('2026-06-04T08:01:00.000Z');
    const lastSyncAt = new Date('2026-06-04T07:00:00.000Z');

    mockPrisma.person.findMany.mockResolvedValue([{ id: 'person-deleted', deletedAt, updatedAt }]);
    mockPrisma.personTenantProfile.findMany.mockResolvedValue([{ id: 'profile-deleted', personId: 'person-profile-deleted', deletedAt, updatedAt }]);
    mockPrisma.scadenzaPrestazioneProtocollo.findMany.mockResolvedValue([{ id: 'deadline-deleted', deletedAt, updatedAt }]);

    const tombstones = await getDesktopTombstones('tenant-a', lastSyncAt);

    expect(tombstones).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: 'patients', id: 'person-deleted', tenantId: 'tenant-a', deletedAt }),
      expect.objectContaining({ table: 'patients', id: 'person-profile-deleted', tenantId: 'tenant-a', deletedAt }),
      expect.objectContaining({ table: 'scadenze', id: 'deadline-deleted', tenantId: 'tenant-a', deletedAt })
    ]));
    expect(mockPrisma.person.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        tenantProfiles: { some: { tenantId: 'tenant-a' } },
        deletedAt: { gte: lastSyncAt }
      }
    }));
    expect(mockPrisma.personTenantProfile.findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({ personId: true }),
      where: {
        tenantId: 'tenant-a',
        deletedAt: { gte: lastSyncAt }
      }
    }));
  });
});
