/**
 * P65 - Unit Tests - FirmaVaultService
 * 
 * Test per il vault sicuro dei dati biometrici:
 * - Crittografia AES-256-GCM
 * - Decrittografia
 * - Verifica integrità
 * - Key rotation
 * - Data retention / cleanup
 * 
 * @module tests/signature/FirmaVault.test.js
 */

import { describe, test, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import crypto from 'crypto';

// Mock PrismaClient
const mockPrismaClient = {
    firmaVault: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn()
    }
};

// Mock logger
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Mock delle dipendenze
jest.unstable_mockModule('@prisma/client', () => ({
    PrismaClient: jest.fn(() => mockPrismaClient)
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
    logger: mockLogger
}));

// Set development environment for testing
process.env.NODE_ENV = 'test';

// Import dinamico
let FirmaVaultService;

beforeAll(async () => {
    const module = await import('../../services/signature/FirmaVaultService.js');
    FirmaVaultService = module.FirmaVaultService;
});

// ============================================
// TEST DATA
// ============================================
const TEST_VAULT_ID = 'vault-test-001';
const TEST_BIOMETRIC_DATA = JSON.stringify({
    pressure: [0.5, 0.7, 0.8],
    velocity: [10, 15, 12],
    timestamp: Date.now()
});

const mockVaultEntry = {
    id: TEST_VAULT_ID,
    encryptedData: 'encrypted-base64-data',
    iv: 'iv-base64',
    authTag: 'authtag-base64',
    keyVersion: 1,
    dataType: 'BIOMETRICO_BASE',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 anno
    accessCount: 0,
    lastAccessAt: null,
    createdAt: new Date()
};

// ============================================
// ENCRYPT AND STORE TESTS
// ============================================
describe('FirmaVaultService - encryptAndStore()', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('cripta e salva dati biometrici', async () => {
        mockPrismaClient.firmaVault.create.mockResolvedValue({
            id: TEST_VAULT_ID,
            dataType: 'BIOMETRICO_BASE',
            keyVersion: 1,
            expiresAt: expect.any(Date),
            createdAt: new Date()
        });

        const result = await FirmaVaultService.encryptAndStore({
            data: TEST_BIOMETRIC_DATA,
            dataType: 'BIOMETRICO_BASE'
        });

        expect(result).toBeDefined();
        expect(result.id).toBe(TEST_VAULT_ID);
        expect(result.dataType).toBe('BIOMETRICO_BASE');
        expect(mockPrismaClient.firmaVault.create).toHaveBeenCalled();

        // Verifica che i dati criptati siano stati passati
        const createCall = mockPrismaClient.firmaVault.create.mock.calls[0][0];
        expect(createCall.data.encryptedData).toBeDefined();
        expect(createCall.data.iv).toBeDefined();
        expect(createCall.data.authTag).toBeDefined();
    });

    test('usa default dataType IMMAGINE', async () => {
        mockPrismaClient.firmaVault.create.mockResolvedValue({
            ...mockVaultEntry,
            dataType: 'IMMAGINE'
        });

        const result = await FirmaVaultService.encryptAndStore({
            data: 'image-data-base64'
        });

        const createCall = mockPrismaClient.firmaVault.create.mock.calls[0][0];
        expect(createCall.data.dataType).toBe('IMMAGINE');
    });

    test('calcola expiresAt correttamente', async () => {
        const customRetentionDays = 30;
        mockPrismaClient.firmaVault.create.mockResolvedValue(mockVaultEntry);

        await FirmaVaultService.encryptAndStore({
            data: TEST_BIOMETRIC_DATA,
            retentionDays: customRetentionDays
        });

        const createCall = mockPrismaClient.firmaVault.create.mock.calls[0][0];
        const expiresAt = createCall.data.expiresAt;
        const expectedMin = new Date(Date.now() + (customRetentionDays - 1) * 24 * 60 * 60 * 1000);
        const expectedMax = new Date(Date.now() + (customRetentionDays + 1) * 24 * 60 * 60 * 1000);

        expect(expiresAt.getTime()).toBeGreaterThan(expectedMin.getTime());
        expect(expiresAt.getTime()).toBeLessThan(expectedMax.getTime());
    });

    test('fallisce senza data', async () => {
        await expect(FirmaVaultService.encryptAndStore({
            dataType: 'IMMAGINE'
        })).rejects.toThrow('Data is required');
    });

    test('non ritorna dati sensibili', async () => {
        mockPrismaClient.firmaVault.create.mockResolvedValue(mockVaultEntry);

        const result = await FirmaVaultService.encryptAndStore({
            data: TEST_BIOMETRIC_DATA
        });

        // Verifica che encryptedData, iv, authTag NON siano nel risultato
        expect(result.encryptedData).toBeUndefined();
        expect(result.iv).toBeUndefined();
        expect(result.authTag).toBeUndefined();
    });
});

// ============================================
// DECRYPT TESTS
// ============================================
describe('FirmaVaultService - decrypt()', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('decripta dati dal vault', async () => {
        // Prima cripta dati reali
        const testData = 'Test biometric data';
        const iv = crypto.randomBytes(12);
        const key = crypto.scryptSync('dev-key-p65-firma-vault', 'salt', 32);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });

        let encrypted = cipher.update(testData, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        const authTag = cipher.getAuthTag().toString('base64');

        mockPrismaClient.firmaVault.findUnique.mockResolvedValue({
            ...mockVaultEntry,
            encryptedData: encrypted,
            iv: iv.toString('base64'),
            authTag: authTag,
            expiresAt: new Date(Date.now() + 1000000) // Non scaduto
        });

        mockPrismaClient.firmaVault.update.mockResolvedValue({
            accessCount: 1
        });

        const result = await FirmaVaultService.decrypt(TEST_VAULT_ID, 'Test verification');

        expect(result).toBe(testData);
        expect(mockPrismaClient.firmaVault.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: TEST_VAULT_ID },
                data: expect.objectContaining({
                    accessCount: { increment: 1 }
                })
            })
        );
    });

    test('fallisce se vault entry non trovato', async () => {
        mockPrismaClient.firmaVault.findUnique.mockResolvedValue(null);

        await expect(FirmaVaultService.decrypt('non-existent'))
            .rejects.toThrow('Vault entry not found');
    });

    test('fallisce se entry scaduta', async () => {
        mockPrismaClient.firmaVault.findUnique.mockResolvedValue({
            ...mockVaultEntry,
            expiresAt: new Date(Date.now() - 1000) // Scaduto
        });

        await expect(FirmaVaultService.decrypt(TEST_VAULT_ID))
            .rejects.toThrow('Vault entry has expired');
    });
});

// ============================================
// VERIFY INTEGRITY TESTS
// ============================================
describe('FirmaVaultService - verifyIntegrity()', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('verifica integrità entry valida', async () => {
        // Crea dati criptati validi
        const testData = 'Test data';
        const iv = crypto.randomBytes(12);
        const key = crypto.scryptSync('dev-key-p65-firma-vault', 'salt', 32);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });

        let encrypted = cipher.update(testData, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        const authTag = cipher.getAuthTag().toString('base64');

        mockPrismaClient.firmaVault.findUnique.mockResolvedValue({
            ...mockVaultEntry,
            encryptedData: encrypted,
            iv: iv.toString('base64'),
            authTag: authTag,
            expiresAt: new Date(Date.now() + 1000000)
        });

        const result = await FirmaVaultService.verifyIntegrity(TEST_VAULT_ID);

        expect(result.valid).toBe(true);
        expect(result.integrityOk).toBe(true);
        expect(result.isExpired).toBe(false);
    });

    test('rileva entry scaduta', async () => {
        const testData = 'Test data';
        const iv = crypto.randomBytes(12);
        const key = crypto.scryptSync('dev-key-p65-firma-vault', 'salt', 32);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });

        let encrypted = cipher.update(testData, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        const authTag = cipher.getAuthTag().toString('base64');

        mockPrismaClient.firmaVault.findUnique.mockResolvedValue({
            ...mockVaultEntry,
            encryptedData: encrypted,
            iv: iv.toString('base64'),
            authTag: authTag,
            expiresAt: new Date(Date.now() - 1000) // Scaduto
        });

        const result = await FirmaVaultService.verifyIntegrity(TEST_VAULT_ID);

        expect(result.valid).toBe(false);
        expect(result.isExpired).toBe(true);
    });

    test('rileva dati corrotti (authTag non valido)', async () => {
        mockPrismaClient.firmaVault.findUnique.mockResolvedValue({
            ...mockVaultEntry,
            encryptedData: 'corrupted-data',
            iv: crypto.randomBytes(12).toString('base64'),
            authTag: 'invalid-auth-tag',
            expiresAt: new Date(Date.now() + 1000000)
        });

        const result = await FirmaVaultService.verifyIntegrity(TEST_VAULT_ID);

        expect(result.valid).toBe(false);
        expect(result.integrityOk).toBe(false);
    });

    test('ritorna errore se entry non trovata', async () => {
        mockPrismaClient.firmaVault.findUnique.mockResolvedValue(null);

        const result = await FirmaVaultService.verifyIntegrity('non-existent');

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Vault entry not found');
    });
});

// ============================================
// PERMANENT DELETE TESTS
// ============================================
describe('FirmaVaultService - permanentDelete()', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('elimina entry con motivo valido', async () => {
        mockPrismaClient.firmaVault.findUnique.mockResolvedValue(mockVaultEntry);
        mockPrismaClient.firmaVault.delete.mockResolvedValue(mockVaultEntry);

        const result = await FirmaVaultService.permanentDelete(
            TEST_VAULT_ID,
            'GDPR - Richiesta cancellazione dati personali'
        );

        expect(result).toBe(true);
        expect(mockPrismaClient.firmaVault.delete).toHaveBeenCalledWith({
            where: { id: TEST_VAULT_ID }
        });
        expect(mockLogger.info).toHaveBeenCalledWith(
            'Vault entry permanently deleted (GDPR)',
            expect.any(Object)
        );
    });

    test('fallisce senza motivo', async () => {
        await expect(FirmaVaultService.permanentDelete(TEST_VAULT_ID, ''))
            .rejects.toThrow('Deletion reason required');
    });

    test('fallisce con motivo troppo corto', async () => {
        await expect(FirmaVaultService.permanentDelete(TEST_VAULT_ID, 'short'))
            .rejects.toThrow('minimum 10 characters');
    });

    test('fallisce se entry non trovata', async () => {
        mockPrismaClient.firmaVault.findUnique.mockResolvedValue(null);

        await expect(FirmaVaultService.permanentDelete(
            'non-existent',
            'Valid deletion reason for GDPR'
        )).rejects.toThrow('Vault entry not found');
    });
});

// ============================================
// CLEANUP EXPIRED TESTS
// ============================================
describe('FirmaVaultService - cleanupExpired()', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('elimina entry scadute', async () => {
        const expiredEntries = [
            { id: 'expired-1', dataType: 'IMMAGINE', expiresAt: new Date(Date.now() - 1000) },
            { id: 'expired-2', dataType: 'BIOMETRICO_BASE', expiresAt: new Date(Date.now() - 2000) }
        ];

        mockPrismaClient.firmaVault.findMany.mockResolvedValue(expiredEntries);
        mockPrismaClient.firmaVault.deleteMany.mockResolvedValue({ count: 2 });

        const result = await FirmaVaultService.cleanupExpired();

        expect(result.deleted).toBe(2);
        expect(result.entries).toHaveLength(2);
    });

    test('ritorna 0 se nessuna entry scaduta', async () => {
        mockPrismaClient.firmaVault.findMany.mockResolvedValue([]);

        const result = await FirmaVaultService.cleanupExpired();

        expect(result.deleted).toBe(0);
        expect(result.message).toBe('No expired entries');
    });
});

// ============================================
// GET STATS TESTS
// ============================================
describe('FirmaVaultService - getStats()', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('ritorna statistiche vault', async () => {
        mockPrismaClient.firmaVault.count
            .mockResolvedValueOnce(100)  // total
            .mockResolvedValueOnce(5);    // expired

        mockPrismaClient.firmaVault.groupBy.mockResolvedValue([
            { dataType: 'IMMAGINE', _count: { id: 60 } },
            { dataType: 'BIOMETRICO_BASE', _count: { id: 30 } },
            { dataType: 'BIOMETRICO_FULL', _count: { id: 10 } }
        ]);

        const result = await FirmaVaultService.getStats();

        expect(result.total).toBe(100);
        expect(result.expired).toBe(5);
        expect(result.active).toBe(95);
        expect(result.byType.IMMAGINE).toBe(60);
        expect(result.byType.BIOMETRICO_BASE).toBe(30);
    });
});

// ============================================
// CRYPTO TESTS
// ============================================
describe('FirmaVaultService - Crypto Functions', () => {

    test('encryption produce output diversi per stessi dati (IV random)', async () => {
        mockPrismaClient.firmaVault.create
            .mockResolvedValueOnce({ ...mockVaultEntry, id: 'vault-1' })
            .mockResolvedValueOnce({ ...mockVaultEntry, id: 'vault-2' });

        await FirmaVaultService.encryptAndStore({ data: TEST_BIOMETRIC_DATA });
        const call1 = mockPrismaClient.firmaVault.create.mock.calls[0][0].data;

        await FirmaVaultService.encryptAndStore({ data: TEST_BIOMETRIC_DATA });
        const call2 = mockPrismaClient.firmaVault.create.mock.calls[1][0].data;

        // IV dovrebbe essere diverso
        expect(call1.iv).not.toBe(call2.iv);
        // E anche i dati criptati dovrebbero essere diversi
        expect(call1.encryptedData).not.toBe(call2.encryptedData);
    });

    test('authTag ha lunghezza corretta (16 bytes = 24 chars base64)', async () => {
        mockPrismaClient.firmaVault.create.mockResolvedValue(mockVaultEntry);

        await FirmaVaultService.encryptAndStore({ data: TEST_BIOMETRIC_DATA });

        const createCall = mockPrismaClient.firmaVault.create.mock.calls[0][0].data;
        const authTagBuffer = Buffer.from(createCall.authTag, 'base64');

        expect(authTagBuffer.length).toBe(16); // 16 bytes per GCM auth tag
    });

    test('IV ha lunghezza corretta (12 bytes = 16 chars base64)', async () => {
        mockPrismaClient.firmaVault.create.mockResolvedValue(mockVaultEntry);

        await FirmaVaultService.encryptAndStore({ data: TEST_BIOMETRIC_DATA });

        const createCall = mockPrismaClient.firmaVault.create.mock.calls[0][0].data;
        const ivBuffer = Buffer.from(createCall.iv, 'base64');

        expect(ivBuffer.length).toBe(12); // 12 bytes per GCM IV
    });
});
