/**
 * P65 Fase 4 - Test CDA Routes
 * 
 * Integration tests per API CDA
 */

import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Mock services
jest.unstable_mockModule('../../../services/cda/HL7CDAService.js', () => ({
    default: {
        OID_REGISTRY: { ROOT: '2.16.840.1.113883.2.9' },
        LOINC_SECTIONS: { HISTORY_ILLNESS: { code: '11348-0', display: 'History' } },
        generateFromReferto: jest.fn(),
        generateFromGiudizio: jest.fn(),
        getCDADocument: jest.fn(),
        validateCDA: jest.fn(),
        getPatientCDADocuments: jest.fn(),
        getHL7Mapping: jest.fn()
    }
}));

// Mock auth middleware
jest.unstable_mockModule('../../../middleware/auth.js', () => ({
    authenticateToken: (req, res, next) => {
        req.person = {
            id: 'user-123',
            tenantId: 'tenant-123',
            role: 'MEDICO'
        };
        next();
    }
}));

jest.unstable_mockModule('../../../middleware/rbac.js', () => ({
    requirePermission: () => (req, res, next) => next()
}));

// Import mocked modules
const { default: HL7CDAService } = await import('../../../services/cda/HL7CDAService.js');

describe('CDA Routes', () => {
    let app;

    beforeAll(async () => {
        // Setup Express app with CDA routes
        const cdaRoutes = (await import('../../../routes/cda-routes.js')).default;

        app = express();
        app.use(express.json());
        app.use('/api/v1/cda', cdaRoutes);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ============================================
    // GET /config
    // ============================================

    describe('GET /config', () => {
        it('should return CDA configuration', async () => {
            const response = await request(app)
                .get('/api/v1/cda/config')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.oidRegistry).toBeDefined();
            expect(response.body.data.loincSections).toBeDefined();
        });
    });

    // ============================================
    // POST /referto/:refertoId
    // ============================================

    describe('POST /referto/:refertoId', () => {
        it('should generate CDA from referto', async () => {
            HL7CDAService.generateFromReferto.mockResolvedValue({
                cdaDocumentId: 'cda-123',
                hash: 'abc123',
                xml: '<ClinicalDocument/>'
            });

            const response = await request(app)
                .post('/api/v1/cda/referto/ref-123')
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.cdaDocumentId).toBe('cda-123');
            expect(HL7CDAService.generateFromReferto).toHaveBeenCalledWith(
                'ref-123',
                'tenant-123'
            );
        });

        it('should handle errors', async () => {
            HL7CDAService.generateFromReferto.mockRejectedValue(
                new Error('Referto non trovato')
            );

            const response = await request(app)
                .post('/api/v1/cda/referto/invalid-id')
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Referto non trovato');
        });
    });

    // ============================================
    // POST /giudizio/:giudizioId
    // ============================================

    describe('POST /giudizio/:giudizioId', () => {
        it('should generate CDA from giudizio', async () => {
            HL7CDAService.generateFromGiudizio.mockResolvedValue({
                cdaDocumentId: 'cda-456',
                hash: 'def456',
                xml: '<ClinicalDocument/>'
            });

            const response = await request(app)
                .post('/api/v1/cda/giudizio/giu-123')
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.cdaDocumentId).toBe('cda-456');
        });
    });

    // ============================================
    // GET /:sourceType/:sourceId
    // ============================================

    describe('GET /:sourceType/:sourceId', () => {
        it('should get CDA document', async () => {
            HL7CDAService.getCDADocument.mockResolvedValue({
                id: 'cda-123',
                sourceType: 'REFERTO',
                sourceId: 'ref-123',
                cdaXml: '<ClinicalDocument/>',
                validato: true
            });

            const response = await request(app)
                .get('/api/v1/cda/REFERTO/ref-123')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe('cda-123');
        });

        it('should return 404 if not found', async () => {
            HL7CDAService.getCDADocument.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/v1/cda/REFERTO/invalid-id')
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });

    // ============================================
    // GET /:sourceType/:sourceId/xml
    // ============================================

    describe('GET /:sourceType/:sourceId/xml', () => {
        it('should return raw XML with correct content-type', async () => {
            HL7CDAService.getCDADocument.mockResolvedValue({
                id: 'cda-123',
                cdaXml: '<?xml version="1.0"?><ClinicalDocument/>'
            });

            const response = await request(app)
                .get('/api/v1/cda/REFERTO/ref-123/xml')
                .expect(200)
                .expect('Content-Type', /application\/xml/);

            expect(response.text).toContain('<?xml');
            expect(response.text).toContain('<ClinicalDocument');
        });
    });

    // ============================================
    // POST /:cdaDocumentId/validate
    // ============================================

    describe('POST /:cdaDocumentId/validate', () => {
        it('should validate CDA document', async () => {
            HL7CDAService.validateCDA.mockResolvedValue({
                valid: true,
                errors: [],
                warnings: ['Minor warning']
            });

            const response = await request(app)
                .post('/api/v1/cda/cda-123/validate')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.valid).toBe(true);
            expect(response.body.data.warnings).toContain('Minor warning');
        });

        it('should return validation errors', async () => {
            HL7CDAService.validateCDA.mockResolvedValue({
                valid: false,
                errors: ['Missing required element: typeId'],
                warnings: []
            });

            const response = await request(app)
                .post('/api/v1/cda/cda-invalid/validate')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.valid).toBe(false);
            expect(response.body.data.errors).toHaveLength(1);
        });
    });

    // ============================================
    // GET /patient/:pazienteId
    // ============================================

    describe('GET /patient/:pazienteId', () => {
        it('should return all CDA documents for patient', async () => {
            HL7CDAService.getPatientCDADocuments.mockResolvedValue([
                { id: 'cda-1', sourceType: 'REFERTO' },
                { id: 'cda-2', sourceType: 'GIUDIZIO_IDONEITA' }
            ]);

            const response = await request(app)
                .get('/api/v1/cda/patient/paz-123')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
        });
    });

    // ============================================
    // GET /mapping/:entityType/:fieldPath
    // ============================================

    describe('GET /mapping/:entityType/:fieldPath', () => {
        it('should return HL7 mapping', async () => {
            HL7CDAService.getHL7Mapping.mockResolvedValue({
                id: 'map-123',
                entityType: 'Referto',
                fieldPath: 'diagnosiPrincipale',
                codeSystem: 'LOINC',
                code: '29299-5'
            });

            const response = await request(app)
                .get('/api/v1/cda/mapping/Referto/diagnosiPrincipale')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.code).toBe('29299-5');
        });

        it('should return 404 if mapping not found', async () => {
            HL7CDAService.getHL7Mapping.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/v1/cda/mapping/Unknown/field')
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });
});
