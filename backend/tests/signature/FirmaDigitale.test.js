/**
 * P65 - Unit Tests - FirmaDigitaleService
 * 
 * Test completo per firma digitale:
 * - Creazione richiesta firma
 * - Applicazione firma semplice
 * - Applicazione firma grafometrica
 * - Verifica integrità hash
 * - Annullamento firma
 * - Validazione firma
 * 
 * @module tests/signature/FirmaDigitale.test.js
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import crypto from 'crypto';

// Mock PrismaClient
const mockPrismaClient = {
    person: {
        findFirst: jest.fn()
    },
    firmaDigitale: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
    },
    firmaVault: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
    }
};

// Mock logger
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Mock delle dipendenze prima dell'import
jest.unstable_mockModule('@prisma/client', () => ({
    PrismaClient: jest.fn(() => mockPrismaClient)
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
    logger: mockLogger
}));

// Import dinamico dopo i mock
let FirmaDigitaleService;
let FirmaVaultService;

beforeAll(async () => {
    const firmaModule = await import('../../services/signature/FirmaDigitaleService.js');
    FirmaDigitaleService = firmaModule.FirmaDigitaleService;

    const vaultModule = await import('../../services/signature/FirmaVaultService.js');
    FirmaVaultService = vaultModule.FirmaVaultService;
});

// ============================================
// TEST DATA
// ============================================
const TEST_TENANT_ID = 'test-tenant-001';
const TEST_FIRMATARIO_ID = 'test-person-001';
const TEST_FIRMA_ID = 'test-firma-001';
const TEST_VAULT_ID = 'test-vault-001';

const mockPerson = {
    id: TEST_FIRMATARIO_ID,
    firstName: 'Mario',
    lastName: 'Rossi',
    fiscalCode: 'RSSMRA80A01H501Z'
};

const mockFirmaInAttesa = {
    id: TEST_FIRMA_ID,
    tenantId: TEST_TENANT_ID,
    firmatarioId: TEST_FIRMATARIO_ID,
    documentType: 'REFERTO',
    firmatarioRole: 'MEDICO',
    tipoFirma: 'SEMPLICE',
    stato: 'IN_ATTESA',
    hashDocumento: 'abc123hash',
    algoritmo: 'SHA-256',
    deletedAt: null,
    firmatario: mockPerson
};

// ============================================
// HASH GENERATION TESTS
// ============================================
describe('FirmaDigitaleService - Hash Generation', () => {

    test('generateDocumentHash() - genera hash SHA-256 corretto', () => {
        const content = 'Test document content';
        const expectedHash = crypto
            .createHash('sha256')
            .update(content, 'utf8')
            .digest('hex');

        const result = FirmaDigitaleService.generateDocumentHash(content);

        expect(result).toBe(expectedHash);
        expect(result).toHaveLength(64); // SHA-256 hex = 64 chars
    });

    test('generateDocumentHash() - hash diversi per contenuti diversi', () => {
        const hash1 = FirmaDigitaleService.generateDocumentHash('Document A');
        const hash2 = FirmaDigitaleService.generateDocumentHash('Document B');

        expect(hash1).not.toBe(hash2);
    });

    test('generateDocumentHash() - hash identici per contenuti identici', () => {
        const content = 'Same content';
        const hash1 = FirmaDigitaleService.generateDocumentHash(content);
        const hash2 = FirmaDigitaleService.generateDocumentHash(content);

        expect(hash1).toBe(hash2);
    });

    test('generateSignatureHash() - genera hash firma con timestamp', () => {
        const documentHash = 'doc-hash-123';
        const signerId = 'signer-001';
        const timestamp = new Date('2024-01-15T10:30:00Z');

        const result = FirmaDigitaleService.generateSignatureHash(
            documentHash,
            signerId,
            timestamp
        );

        expect(result).toHaveLength(64);
        expect(typeof result).toBe('string');
    });

    test('generateSignatureHash() - hash diversi per timestamp diversi', () => {
        const documentHash = 'doc-hash-123';
        const signerId = 'signer-001';

        const hash1 = FirmaDigitaleService.generateSignatureHash(
            documentHash,
            signerId,
            new Date('2024-01-15T10:30:00Z')
        );

        const hash2 = FirmaDigitaleService.generateSignatureHash(
            documentHash,
            signerId,
            new Date('2024-01-15T10:31:00Z')
        );

        expect(hash1).not.toBe(hash2);
    });
});

// ============================================
// SIGNATURE IMAGE VALIDATION TESTS
// ============================================
describe('FirmaDigitaleService - Image Validation', () => {

    test('validateSignatureImage() - PNG valido', () => {
        const pngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        const result = FirmaDigitaleService.validateSignatureImage(pngBase64);

        expect(result.valid).toBe(true);
        expect(result.type).toBe('image/png');
        expect(result.size).toBeGreaterThan(0);
    });

    test('validateSignatureImage() - JPEG valido', () => {
        const jpegBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

        const result = FirmaDigitaleService.validateSignatureImage(jpegBase64);

        expect(result.valid).toBe(true);
        expect(result.type).toBe('image/jpeg');
    });

    test('validateSignatureImage() - SVG valido', () => {
        const svgBase64 = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';

        const result = FirmaDigitaleService.validateSignatureImage(svgBase64);

        expect(result.valid).toBe(true);
        expect(result.type).toBe('image/svg+xml');
    });

    test('validateSignatureImage() - tipo non valido', () => {
        const invalidBase64 = 'data:application/pdf;base64,JVBERi0x';

        const result = FirmaDigitaleService.validateSignatureImage(invalidBase64);

        expect(result.valid).toBe(false);
    });
});

// ============================================
// CREATE SIGNATURE REQUEST TESTS
// ============================================
describe('FirmaDigitaleService - createSignatureRequest()', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('crea richiesta firma con parametri validi', async () => {
        mockPrismaClient.person.findFirst.mockResolvedValue(mockPerson);
        mockPrismaClient.firmaDigitale.create.mockResolvedValue(mockFirmaInAttesa);

        const result = await FirmaDigitaleService.createSignatureRequest({
            tenantId: TEST_TENANT_ID,
            firmatarioId: TEST_FIRMATARIO_ID,
            documentType: 'REFERTO',
            refertoId: 'referto-001',
            firmatarioRole: 'MEDICO',
            tipoFirma: 'SEMPLICE',
            documentContent: 'Test document content'
        });

        expect(result).toBeDefined();
        expect(result.stato).toBe('IN_ATTESA');
        expect(mockPrismaClient.person.findFirst).toHaveBeenCalled();
        expect(mockPrismaClient.firmaDigitale.create).toHaveBeenCalled();
    });

    test('fallisce senza tenantId', async () => {
        await expect(FirmaDigitaleService.createSignatureRequest({
            firmatarioId: TEST_FIRMATARIO_ID,
            documentType: 'REFERTO',
            firmatarioRole: 'MEDICO',
            tipoFirma: 'SEMPLICE',
            documentContent: 'Content'
        })).rejects.toThrow('tenantId is required');
    });

    test('fallisce senza firmatarioId', async () => {
        await expect(FirmaDigitaleService.createSignatureRequest({
            tenantId: TEST_TENANT_ID,
            documentType: 'REFERTO',
            firmatarioRole: 'MEDICO',
            tipoFirma: 'SEMPLICE',
            documentContent: 'Content'
        })).rejects.toThrow('firmatarioId is required');
    });

    test('fallisce senza documentContent', async () => {
        await expect(FirmaDigitaleService.createSignatureRequest({
            tenantId: TEST_TENANT_ID,
            firmatarioId: TEST_FIRMATARIO_ID,
            documentType: 'REFERTO',
            firmatarioRole: 'MEDICO',
            tipoFirma: 'SEMPLICE'
        })).rejects.toThrow('documentContent is required');
    });

    test('fallisce se firmatario non trovato', async () => {
        mockPrismaClient.person.findFirst.mockResolvedValue(null);

        await expect(FirmaDigitaleService.createSignatureRequest({
            tenantId: TEST_TENANT_ID,
            firmatarioId: 'non-existent-person',
            documentType: 'REFERTO',
            firmatarioRole: 'MEDICO',
            tipoFirma: 'SEMPLICE',
            documentContent: 'Content'
        })).rejects.toThrow('Firmatario not found');
    });
});

// ============================================
// APPLY SIMPLE SIGNATURE TESTS
// ============================================
describe('FirmaDigitaleService - applySimpleSignature()', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('applica firma semplice correttamente', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue(mockFirmaInAttesa);
        mockPrismaClient.firmaDigitale.update.mockResolvedValue({
            ...mockFirmaInAttesa,
            stato: 'FIRMATO',
            hashFirma: 'signature-hash-123'
        });

        const result = await FirmaDigitaleService.applySimpleSignature({
            firmaId: TEST_FIRMA_ID,
            tenantId: TEST_TENANT_ID,
            signerId: TEST_FIRMATARIO_ID,
            metadata: { ipAddress: '192.168.1.1' }
        });

        expect(result.stato).toBe('FIRMATO');
        expect(result.hashFirma).toBeDefined();
    });

    test('fallisce se firma non trovata', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue(null);

        await expect(FirmaDigitaleService.applySimpleSignature({
            firmaId: 'non-existent',
            tenantId: TEST_TENANT_ID,
            signerId: TEST_FIRMATARIO_ID
        })).rejects.toThrow('Signature request not found');
    });

    test('fallisce se stato non è IN_ATTESA', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue({
            ...mockFirmaInAttesa,
            stato: 'FIRMATO'
        });

        await expect(FirmaDigitaleService.applySimpleSignature({
            firmaId: TEST_FIRMA_ID,
            tenantId: TEST_TENANT_ID,
            signerId: TEST_FIRMATARIO_ID
        })).rejects.toThrow('Cannot apply signature: status is FIRMATO');
    });

    test('fallisce se firmatario non corrisponde', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue(mockFirmaInAttesa);

        await expect(FirmaDigitaleService.applySimpleSignature({
            firmaId: TEST_FIRMA_ID,
            tenantId: TEST_TENANT_ID,
            signerId: 'different-person'
        })).rejects.toThrow('Signer does not match');
    });

    test('fallisce se tipo firma non è SEMPLICE', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue({
            ...mockFirmaInAttesa,
            tipoFirma: 'GRAFOMETRICA'
        });

        await expect(FirmaDigitaleService.applySimpleSignature({
            firmaId: TEST_FIRMA_ID,
            tenantId: TEST_TENANT_ID,
            signerId: TEST_FIRMATARIO_ID
        })).rejects.toThrow('Cannot apply simple signature: signature type is GRAFOMETRICA');
    });
});

// ============================================
// APPLY GRAPHOMETRIC SIGNATURE TESTS
// ============================================
describe('FirmaDigitaleService - applyGraphometricSignature()', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockFirmaGrafometrica = {
        ...mockFirmaInAttesa,
        tipoFirma: 'GRAFOMETRICA'
    };

    test('applica firma grafometrica con immagine', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue(mockFirmaGrafometrica);
        mockPrismaClient.firmaDigitale.update.mockResolvedValue({
            ...mockFirmaGrafometrica,
            stato: 'FIRMATO',
            hashFirma: 'grapho-hash-123'
        });

        const result = await FirmaDigitaleService.applyGraphometricSignature({
            firmaId: TEST_FIRMA_ID,
            tenantId: TEST_TENANT_ID,
            signerId: TEST_FIRMATARIO_ID,
            firmaImageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            dispositivo: 'TABLET-001'
        });

        expect(result.stato).toBe('FIRMATO');
    });

    test('fallisce senza immagine firma', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue(mockFirmaGrafometrica);

        await expect(FirmaDigitaleService.applyGraphometricSignature({
            firmaId: TEST_FIRMA_ID,
            tenantId: TEST_TENANT_ID,
            signerId: TEST_FIRMATARIO_ID
        })).rejects.toThrow('Signature image is required');
    });

    test('fallisce se tipo firma non è GRAFOMETRICA', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue(mockFirmaInAttesa);

        await expect(FirmaDigitaleService.applyGraphometricSignature({
            firmaId: TEST_FIRMA_ID,
            tenantId: TEST_TENANT_ID,
            signerId: TEST_FIRMATARIO_ID,
            firmaImageBase64: 'test-image'
        })).rejects.toThrow('Cannot apply graphometric signature: type is SEMPLICE');
    });
});

// ============================================
// VERIFY SIGNATURE TESTS
// ============================================
describe('FirmaDigitaleService - verifySignature()', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('verifica firma valida con hash corretto', async () => {
        const documentContent = 'Test document content';
        const documentHash = FirmaDigitaleService.generateDocumentHash(documentContent);

        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue({
            ...mockFirmaInAttesa,
            stato: 'FIRMATO',
            hashDocumento: documentHash,
            hashFirma: 'signature-hash'
        });

        const result = await FirmaDigitaleService.verifySignature(
            TEST_FIRMA_ID,
            TEST_TENANT_ID,
            documentContent
        );

        expect(result.valid).toBe(true);
        expect(result.verification.documentIntegrity).toBe(true);
        expect(result.verification.hashMatch).toBe(true);
    });

    test('rileva documento modificato (hash diverso)', async () => {
        const originalContent = 'Original document';
        const modifiedContent = 'Modified document';
        const originalHash = FirmaDigitaleService.generateDocumentHash(originalContent);

        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue({
            ...mockFirmaInAttesa,
            stato: 'FIRMATO',
            hashDocumento: originalHash
        });

        const result = await FirmaDigitaleService.verifySignature(
            TEST_FIRMA_ID,
            TEST_TENANT_ID,
            modifiedContent
        );

        expect(result.valid).toBe(false);
        expect(result.verification.documentIntegrity).toBe(false);
        expect(result.verification.hashMatch).toBe(false);
    });

    test('firma non trovata ritorna invalid', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue(null);

        const result = await FirmaDigitaleService.verifySignature(
            'non-existent',
            TEST_TENANT_ID,
            'content'
        );

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Signature not found');
    });

    test('firma non in stato FIRMATO ritorna invalid', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue(mockFirmaInAttesa);

        const result = await FirmaDigitaleService.verifySignature(
            TEST_FIRMA_ID,
            TEST_TENANT_ID,
            'content'
        );

        expect(result.valid).toBe(false);
        expect(result.error).toContain('not in FIRMATO state');
    });
});

// ============================================
// CANCEL SIGNATURE TESTS
// ============================================
describe('FirmaDigitaleService - cancelSignature()', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('annulla firma con motivo valido', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue(mockFirmaInAttesa);
        mockPrismaClient.firmaDigitale.update.mockResolvedValue({
            ...mockFirmaInAttesa,
            stato: 'ANNULLATO',
            motivoRifiuto: 'Documento errato - richiesta annullamento',
            deletedAt: new Date()
        });

        const result = await FirmaDigitaleService.cancelSignature(
            TEST_FIRMA_ID,
            TEST_TENANT_ID,
            'admin-person-001',
            'Documento errato - richiesta annullamento'
        );

        expect(result.stato).toBe('ANNULLATO');
        expect(result.deletedAt).toBeDefined();
    });

    test('fallisce senza motivo annullamento', async () => {
        await expect(FirmaDigitaleService.cancelSignature(
            TEST_FIRMA_ID,
            TEST_TENANT_ID,
            'admin-001',
            ''
        )).rejects.toThrow('Motivo annullamento obbligatorio');
    });

    test('fallisce con motivo troppo corto (GDPR)', async () => {
        await expect(FirmaDigitaleService.cancelSignature(
            TEST_FIRMA_ID,
            TEST_TENANT_ID,
            'admin-001',
            'corto'
        )).rejects.toThrow('minimo 10 caratteri');
    });

    test('fallisce se firma già annullata', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue({
            ...mockFirmaInAttesa,
            stato: 'ANNULLATO'
        });

        await expect(FirmaDigitaleService.cancelSignature(
            TEST_FIRMA_ID,
            TEST_TENANT_ID,
            'admin-001',
            'Motivo valido per annullamento'
        )).rejects.toThrow('Cannot cancel signature in state ANNULLATO');
    });
});

// ============================================
// VALIDATE SIGNATURE TESTS
// ============================================
describe('FirmaDigitaleService - validateSignature()', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('approva firma - stato diventa VERIFICATO', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue({
            ...mockFirmaInAttesa,
            stato: 'FIRMATO'
        });
        mockPrismaClient.firmaDigitale.update.mockResolvedValue({
            ...mockFirmaInAttesa,
            stato: 'VERIFICATO',
            validatoDa: 'validator-001',
            validatoAt: new Date()
        });

        const result = await FirmaDigitaleService.validateSignature(
            TEST_FIRMA_ID,
            TEST_TENANT_ID,
            'validator-001',
            true
        );

        expect(result.stato).toBe('VERIFICATO');
        expect(result.validatoDa).toBe('validator-001');
    });

    test('rifiuta firma - stato diventa RIFIUTATO', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue({
            ...mockFirmaInAttesa,
            stato: 'FIRMATO'
        });
        mockPrismaClient.firmaDigitale.update.mockResolvedValue({
            ...mockFirmaInAttesa,
            stato: 'RIFIUTATO',
            motivoRifiuto: 'Firma non leggibile - ripetere',
            validatoDa: 'validator-001'
        });

        const result = await FirmaDigitaleService.validateSignature(
            TEST_FIRMA_ID,
            TEST_TENANT_ID,
            'validator-001',
            false,
            'Firma non leggibile - ripetere'
        );

        expect(result.stato).toBe('RIFIUTATO');
        expect(result.motivoRifiuto).toBe('Firma non leggibile - ripetere');
    });

    test('fallisce rifiuto senza motivo', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue({
            ...mockFirmaInAttesa,
            stato: 'FIRMATO'
        });

        await expect(FirmaDigitaleService.validateSignature(
            TEST_FIRMA_ID,
            TEST_TENANT_ID,
            'validator-001',
            false
        )).rejects.toThrow('Motivo rifiuto obbligatorio');
    });

    test('fallisce se firma non in stato FIRMATO', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue(mockFirmaInAttesa);

        await expect(FirmaDigitaleService.validateSignature(
            TEST_FIRMA_ID,
            TEST_TENANT_ID,
            'validator-001',
            true
        )).rejects.toThrow('Cannot validate signature in state IN_ATTESA');
    });
});

// ============================================
// GET SIGNATURES BY DOCUMENT TESTS
// ============================================
describe('FirmaDigitaleService - getSignaturesByDocument()', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('ottiene firme per refertoId', async () => {
        const mockFirme = [mockFirmaInAttesa, { ...mockFirmaInAttesa, id: 'firma-002' }];
        mockPrismaClient.firmaDigitale.findMany.mockResolvedValue(mockFirme);

        const result = await FirmaDigitaleService.getSignaturesByDocument({
            tenantId: TEST_TENANT_ID,
            refertoId: 'referto-001'
        });

        expect(result).toHaveLength(2);
        expect(mockPrismaClient.firmaDigitale.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    tenantId: TEST_TENANT_ID,
                    refertoId: 'referto-001',
                    deletedAt: null
                })
            })
        );
    });

    test('filtra per stato', async () => {
        mockPrismaClient.firmaDigitale.findMany.mockResolvedValue([]);

        await FirmaDigitaleService.getSignaturesByDocument({
            tenantId: TEST_TENANT_ID,
            stato: 'FIRMATO'
        });

        expect(mockPrismaClient.firmaDigitale.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    stato: 'FIRMATO'
                })
            })
        );
    });
});

// ============================================
// GET SAVED SIGNATURE IMAGE TESTS
// ============================================
describe('FirmaDigitaleService - getSavedSignatureImage()', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('ritorna immagine firma salvata più recente', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue({
            id: TEST_FIRMA_ID,
            firmaImageUrl: 'data:image/png;base64,test',
            tipoFirma: 'SEMPLICE',
            updatedAt: new Date()
        });

        const result = await FirmaDigitaleService.getSavedSignatureImage(
            TEST_FIRMATARIO_ID,
            TEST_TENANT_ID
        );

        expect(result).toBeDefined();
        expect(result.imageUrl).toBe('data:image/png;base64,test');
        expect(result.firmaId).toBe(TEST_FIRMA_ID);
    });

    test('ritorna null se nessuna firma salvata', async () => {
        mockPrismaClient.firmaDigitale.findFirst.mockResolvedValue(null);

        const result = await FirmaDigitaleService.getSavedSignatureImage(
            'person-without-signature',
            TEST_TENANT_ID
        );

        expect(result).toBeNull();
    });
});
