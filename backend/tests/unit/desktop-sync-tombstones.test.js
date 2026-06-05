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

const { DESKTOP_TOMBSTONE_SOURCES, getDesktopTombstones } = await import('../../controllers/desktop-sync.controller.js');

const VALID_DESKTOP_TABLES = new Set([
  'visits', 'appointments', 'appointment_prestazioni',
  'patients', 'companies', 'company_sites', 'nomine_ruolo',
  'mansioni', 'mansione_rischi', 'lavoratore_mansioni', 'protocolli', 'protocollo_prestazioni',
  'scadenze', 'giudizi_idoneita', 'movimenti_contabili',
  'prestazioni', 'tariffari', 'convenzioni', 'ambulatori', 'slot_disponibilita', 'medici',
  'visit_templates', 'document_templates', 'questionari_medici_config', 'esami_strumentali', 'allegati',
  'documenti_compilati', 'questionari_risposte',
  'profili_salute', 'documenti_clinici', 'person_documents', 'referti',
  'visit_revisions', 'visit_access_logs', 'firme_digitali',
  'lavoratore_rischi_aggiuntivi',
  'tariffario_voci', 'tariffario_company_associations', 'sopralluoghi', 'dvr', 'consulenze_mdl', 'allegati_3b'
]);

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

  test('keeps tombstone source tables aligned with desktop SQLite tables', () => {
    const tables = DESKTOP_TOMBSTONE_SOURCES.map(source => source.table);
    const invalidTables = tables.filter(table => !VALID_DESKTOP_TABLES.has(table));

    expect(invalidTables).toEqual([]);
    const sourceKeys = DESKTOP_TOMBSTONE_SOURCES.map(source => `${source.model}:${source.table}:${source.idField || 'id'}`);
    expect(new Set(sourceKeys).size).toBe(sourceKeys.length);
    expect(tables).toEqual(expect.arrayContaining([
      'patients',
      'companies',
      'appointments',
      'visits',
      'scadenze',
      'documenti_compilati',
      'documenti_clinici',
      'person_documents',
      'referti',
      'firme_digitali',
      'movimenti_contabili',
      'sopralluoghi',
      'dvr',
      'consulenze_mdl',
      'allegati_3b'
    ]));
  });
});
