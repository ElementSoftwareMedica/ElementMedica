import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const mockPrisma = {
  visita: {
    findFirst: jest.fn()
  },
  allegatoVisita: {
    create: jest.fn()
  }
};

const mockAssertUploadedFileIsSafe = jest.fn();

jest.unstable_mockModule('../../config/prisma-optimization.js', () => ({
  default: mockPrisma
}));

jest.unstable_mockModule('../../config/multer.js', () => ({
  createMulterConfig: jest.fn(() => ({
    single: jest.fn(() => (_req, _res, next) => next())
  }))
}));

jest.unstable_mockModule('../../utils/fileSecurity.js', () => ({
  assertUploadedFileIsSafe: mockAssertUploadedFileIsSafe
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

const { uploadAttachment } = await import('../../controllers/desktop-sync.controller.js');

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
}

function createTempUpload() {
  const filePath = path.join(os.tmpdir(), `desktop-sync-attachment-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  fs.writeFileSync(filePath, Buffer.from('%PDF-1.4\n'));
  return filePath;
}

describe('desktop sync attachment upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects cross-tenant visits and removes uploaded temp file', async () => {
    const filePath = createTempUpload();
    mockPrisma.visita.findFirst.mockResolvedValue(null);
    const req = {
      person: { id: 'person-a', tenantId: 'tenant-a' },
      headers: {},
      body: {
        visitaId: 'visit-other-tenant',
        allegatoLocalId: 'local-1',
        nome: 'referto.pdf',
        tipo: 'pdf',
        dimensione: '10',
        mimeType: 'application/pdf'
      },
      file: {
        path: filePath,
        filename: 'stored.pdf',
        originalname: 'referto.pdf',
        size: 10,
        mimetype: 'application/pdf'
      }
    };
    const res = createResponse();

    await uploadAttachment(req, res);

    expect(mockPrisma.visita.findFirst).toHaveBeenCalledWith({
      where: { id: 'visit-other-tenant', tenantId: 'tenant-a', deletedAt: null }
    });
    expect(mockAssertUploadedFileIsSafe).not.toHaveBeenCalled();
    expect(mockPrisma.allegatoVisita.create).not.toHaveBeenCalled();
    expect(fs.existsSync(filePath)).toBe(false);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Visita non trovata' });
  });

  test('creates tenant-scoped attachment after scan for a valid visit', async () => {
    const filePath = createTempUpload();
    mockPrisma.visita.findFirst.mockResolvedValue({ id: 'visit-a', tenantId: 'tenant-a' });
    mockAssertUploadedFileIsSafe.mockResolvedValue({
      sha256: 'a'.repeat(64),
      scan: { scanned: true, status: 'CLEAN' }
    });
    mockPrisma.allegatoVisita.create.mockResolvedValue({ id: 'allegato-a' });
    const req = {
      person: { id: 'person-a', tenantId: 'tenant-a' },
      headers: {},
      body: {
        visitaId: 'visit-a',
        allegatoLocalId: 'local-1',
        nome: 'referto.pdf',
        tipo: 'pdf',
        dimensione: '10',
        mimeType: 'application/pdf'
      },
      file: {
        path: filePath,
        filename: 'stored.pdf',
        originalname: 'referto.pdf',
        size: 10,
        mimetype: 'application/pdf'
      }
    };
    const res = createResponse();

    try {
      await uploadAttachment(req, res);
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    expect(mockAssertUploadedFileIsSafe).toHaveBeenCalledWith(filePath);
    expect(mockPrisma.allegatoVisita.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        visitaId: 'visit-a',
        tenantId: 'tenant-a',
        hashFile: 'a'.repeat(64),
        caricatoDa: 'person-a'
      })
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      allegatoId: 'allegato-a',
      allegatoLocalId: 'local-1',
      serverUrl: '/uploads/allegati-visite/stored.pdf'
    }));
  });
});
