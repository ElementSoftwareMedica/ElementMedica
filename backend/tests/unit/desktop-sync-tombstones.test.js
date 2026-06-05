import { describe, expect, jest, test, beforeEach } from '@jest/globals';
import { readFileSync } from 'node:fs';

const mockPrisma = {
  appuntamento: { findMany: jest.fn() },
  person: { findMany: jest.fn() },
  personTenantProfile: { findMany: jest.fn() },
  lavoratoreMansione: { findMany: jest.fn() },
  visita: { findMany: jest.fn() },
  deadlineItem: { findMany: jest.fn() },
  scadenzaPrestazioneProtocollo: { findMany: jest.fn() },
  giudizioIdoneita: { findMany: jest.fn() },
  prestazione: { findMany: jest.fn() },
  ambulatorio: { findMany: jest.fn() },
  slotDisponibilita: { findMany: jest.fn() },
  movimentoContabile: { findMany: jest.fn() },
  mansione: { findMany: jest.fn() },
  lavoratoreRischioAggiuntivo: { findMany: jest.fn() },
  companyTenantProfile: { findMany: jest.fn() },
  protocolloSanitario: { findMany: jest.fn() },
  visitTemplate: { findMany: jest.fn() },
  documentoTemplate: { findMany: jest.fn() },
  documentoCompilato: { findMany: jest.fn() },
  profiloDiSalutePersona: { findMany: jest.fn() },
  documentoClinico: { findMany: jest.fn() },
  personDocument: { findMany: jest.fn() },
  referto: { findMany: jest.fn() },
  visitRevision: { findMany: jest.fn() },
  visitAccessLog: { findMany: jest.fn() },
  firmaDigitale: { findMany: jest.fn() },
  tariffarioAziendale: { findMany: jest.fn() },
  convenzione: { findMany: jest.fn() },
  sopralluogo: { findMany: jest.fn() },
  dVR: { findMany: jest.fn() },
  consulenzaMDL: { findMany: jest.fn() },
  allegato3B: { findMany: jest.fn() }
};

jest.unstable_mockModule('../../config/prisma-optimization.js', () => ({
  default: mockPrisma
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

const {
  DESKTOP_SYNC_ENTITY_TYPES,
  DESKTOP_TOMBSTONE_SOURCES,
  checkConflicts,
  downloadDay,
  downloadFullDb,
  getDesktopTombstones,
  parseDesktopLastSyncAt
} = await import('../../controllers/desktop-sync.controller.js');

function getDesktopSqliteTables() {
  const databaseSource = readFileSync(new URL('../../../desktop-app/src/main/database.ts', import.meta.url), 'utf8');
  return new Set([...databaseSource.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-zA-Z0-9_]+)/g)].map(match => match[1]));
}

describe('desktop sync tombstones', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const model of Object.values(mockPrisma)) {
      if (model.findMany) model.findMany.mockResolvedValue([]);
    }
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
    const validDesktopTables = getDesktopSqliteTables();
    const tables = DESKTOP_TOMBSTONE_SOURCES.map(source => source.table);
    const invalidTables = tables.filter(table => !validDesktopTables.has(table));

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
    expect(DESKTOP_SYNC_ENTITY_TYPES).toEqual(expect.arrayContaining([
      'visita',
      'scadenzaPrestazioneProtocollo',
      'personTenantProfile',
      'companyTenantProfile',
      'mansione',
      'sopralluogo',
      'dVR',
      'consulenzaMDL',
      'allegato3B'
    ]));
  });

  test('downloadDay syncs ScadenzaPrestazioneProtocollo records, not legacy DeadlineItem', async () => {
    const scadenza = {
      id: 'scadenza-protocollo-1',
      tenantId: 'tenant-a',
      personId: 'patient-a',
      mansioneId: 'mansione-a',
      prestazioneId: 'prestazione-a',
      protocolloId: 'protocollo-a',
      dataScadenza: new Date('2026-06-20T00:00:00.000Z'),
      periodicitaMesi: 12,
      isPrimaVisita: false,
      eseguita: false,
      dataEsecuzione: null,
      visitaId: null,
      appuntamentoId: null,
      documentoTemplateId: null,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-05T00:00:00.000Z'),
      deletedAt: null
    };

    mockPrisma.appuntamento.findMany.mockResolvedValue([{
      id: 'appointment-a',
      pazienteId: 'patient-a',
      tenantId: 'tenant-a',
      dataOra: new Date('2026-06-05T08:00:00.000Z'),
      prestazioni: []
    }]);
    mockPrisma.person.findMany
      .mockResolvedValueOnce([{
        id: 'patient-a',
        firstName: 'Paziente',
        lastName: 'Test',
        tenantProfiles: [{ id: 'profile-a', companyTenantProfileId: 'company-a' }]
      }])
      .mockResolvedValueOnce([]);
    mockPrisma.scadenzaPrestazioneProtocollo.findMany.mockResolvedValue([scadenza]);

    const req = {
      person: { id: 'doctor-a', tenantId: 'tenant-a' },
      query: { date: '2026-06-05' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await downloadDay(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      scadenze: [scadenza],
      meta: expect.objectContaining({
        counts: expect.objectContaining({ scadenze: 1 })
      })
    }));
    expect(mockPrisma.deadlineItem.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.scadenzaPrestazioneProtocollo.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        tenantId: 'tenant-a',
        deletedAt: null,
        personId: { in: ['patient-a'] }
      },
      select: expect.objectContaining({
        id: true,
        prestazioneId: true,
        periodicitaMesi: true,
        isPrimaVisita: true
      })
    }));
  });

  test('downloadFullDb incremental includes tenant profile and company master-data changes', async () => {
    const lastSyncAt = '2026-06-05T07:00:00.000Z';
    const req = {
      person: { id: 'doctor-a', tenantId: 'tenant-a' },
      query: { lastSyncAt }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await downloadFullDb(req, res);

    const patientCall = mockPrisma.person.findMany.mock.calls[0][0];
    expect(patientCall.where).toEqual(expect.objectContaining({
      deletedAt: null,
      tenantProfiles: { some: { tenantId: 'tenant-a', deletedAt: null } },
      OR: expect.arrayContaining([
        { updatedAt: { gte: new Date(lastSyncAt) } },
        { tenantProfiles: { some: { tenantId: 'tenant-a', deletedAt: null, updatedAt: { gte: new Date(lastSyncAt) } } } }
      ])
    }));

    const companyCall = mockPrisma.companyTenantProfile.findMany.mock.calls[0][0];
    expect(companyCall.where).toEqual(expect.objectContaining({
      tenantId: 'tenant-a',
      deletedAt: null,
      OR: expect.arrayContaining([
        { updatedAt: { gte: new Date(lastSyncAt) } },
        { company: { is: { deletedAt: null, updatedAt: { gte: new Date(lastSyncAt) } } } }
      ])
    }));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      meta: expect.objectContaining({ isFullSync: false, lastSyncAt })
    }));
  });

  test('downloadFullDb ignores invalid lastSyncAt and falls back to full sync', async () => {
    expect(parseDesktopLastSyncAt('not-a-date')).toBeNull();

    const req = {
      person: { id: 'doctor-a', tenantId: 'tenant-a' },
      query: { lastSyncAt: 'not-a-date' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await downloadFullDb(req, res);

    const patientCall = mockPrisma.person.findMany.mock.calls[0][0];
    expect(patientCall.where).toEqual({
      deletedAt: null,
      tenantProfiles: { some: { tenantId: 'tenant-a', deletedAt: null } }
    });
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      meta: expect.objectContaining({ isFullSync: true, lastSyncAt: null })
    }));
  });

  test('checkConflicts rejects unsupported entity types without dynamic Prisma access', async () => {
    const req = {
      person: { id: 'doctor-a', tenantId: 'tenant-a' },
      body: {
        entities: [
          { entityType: 'person', entityId: 'global-person-a', localUpdatedAt: '2026-06-05T07:00:00.000Z' },
          { entityType: 'visita', entityId: 'visit-a', localUpdatedAt: '2026-06-05T07:00:00.000Z' }
        ]
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockPrisma.visita.findFirst = jest.fn().mockResolvedValue({
      id: 'visit-a',
      updatedAt: new Date('2026-06-05T07:30:00.000Z')
    });

    await checkConflicts(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(mockPrisma.person.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.visita.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'visit-a', tenantId: 'tenant-a', deletedAt: null },
      select: { id: true, updatedAt: true }
    }));
    expect(res.json).toHaveBeenCalledWith({
      hasConflicts: true,
      conflicts: expect.arrayContaining([
        { entityType: 'person', entityId: 'global-person-a', type: 'invalid_entity_type' },
        expect.objectContaining({ entityType: 'visita', entityId: 'visit-a', type: 'modified_on_server' })
      ])
    });
  });
});
