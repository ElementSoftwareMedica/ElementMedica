/**
 * P65 Fase 4 - Test HL7CDAService
 * 
 * Test per generazione documenti CDA
 */

import { jest } from '@jest/globals';
import HL7CDAService from '../../../services/cda/HL7CDAService.js';

// Mock Prisma
const mockPrismaClient = {
    referto: {
        findUnique: jest.fn()
    },
    giudizioIdoneita: {
        findUnique: jest.fn()
    },
    cDADocument: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn()
    },
    hL7Mapping: {
        findFirst: jest.fn()
    }
};

// Mock del modulo getPrismaClient
jest.unstable_mockModule('../../../config/database.js', () => ({
    getPrismaClient: () => mockPrismaClient
}));

describe('HL7CDAService', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ============================================
    // TEST: OID Registry
    // ============================================

    describe('OID_REGISTRY', () => {
        it('should contain valid OID patterns', () => {
            const oidRegex = /^2\.16\.\d+(\.\d+)*$/;

            expect(HL7CDAService.OID_REGISTRY.ROOT).toMatch(oidRegex);
            expect(HL7CDAService.OID_REGISTRY.LOINC).toMatch(oidRegex);
            expect(HL7CDAService.OID_REGISTRY.SNOMED).toMatch(oidRegex);
        });

        it('should have all required OIDs for Italian FSE', () => {
            expect(HL7CDAService.OID_REGISTRY.MINISTERO_SALUTE_IT).toBeDefined();
            expect(HL7CDAService.OID_REGISTRY.CODICE_FISCALE_IT).toBeDefined();
            expect(HL7CDAService.OID_REGISTRY.REGIONE_LOMBARDIA).toBeDefined();
        });
    });

    // ============================================
    // TEST: LOINC Sections
    // ============================================

    describe('LOINC_SECTIONS', () => {
        it('should have essential medical sections', () => {
            const sections = HL7CDAService.LOINC_SECTIONS;

            expect(sections.HISTORY_ILLNESS).toBeDefined();
            expect(sections.HISTORY_ILLNESS.code).toBe('11348-0');

            expect(sections.PHYSICAL_EXAM).toBeDefined();
            expect(sections.ASSESSMENT).toBeDefined();
            expect(sections.PLAN).toBeDefined();
        });

        it('should have MDL-specific sections', () => {
            const sections = HL7CDAService.LOINC_SECTIONS;

            expect(sections.OCCUPATIONAL_ASSESSMENT).toBeDefined();
            expect(sections.FITNESS_JUDGMENT).toBeDefined();
        });
    });

    // ============================================
    // TEST: generateFromReferto
    // ============================================

    describe('generateFromReferto', () => {
        const mockReferto = {
            id: 'ref-123',
            datReferto: new Date('2024-01-15'),
            stato: 'FIRMATO',
            contenuto: 'Contenuto del referto',
            diagnosiPrincipale: 'Diagnosi test',
            noteAggiuntive: 'Note test',
            visita: {
                id: 'vis-123',
                dataVisita: new Date('2024-01-15'),
                paziente: {
                    id: 'paz-123',
                    firstName: 'Mario',
                    lastName: 'Rossi',
                    codiceFiscale: 'RSSMRA80A01H501Z',
                    birthDate: new Date('1980-01-01'),
                    gender: 'MALE'
                },
                medico: {
                    id: 'med-123',
                    firstName: 'Giuseppe',
                    lastName: 'Verdi',
                    codiceFiscale: 'VRDGPP70B01H501X',
                    nomeStudioMedico: 'Studio Verdi'
                }
            },
            tenant: {
                id: 'ten-123',
                name: 'Clinica Test',
                partitaIva: '12345678901'
            }
        };

        it('should generate valid CDA XML from referto', async () => {
            mockPrismaClient.referto.findUnique.mockResolvedValue(mockReferto);
            mockPrismaClient.cDADocument.create.mockResolvedValue({
                id: 'cda-123',
                sourceType: 'REFERTO',
                sourceId: 'ref-123',
                cdaXml: '<ClinicalDocument></ClinicalDocument>',
                hashXml: 'abc123'
            });

            const result = await HL7CDAService.generateFromReferto('ref-123', 'ten-123');

            expect(result).toBeDefined();
            expect(result.cdaDocumentId).toBe('cda-123');
            expect(result.hash).toBeDefined();
            expect(result.xml).toContain('<?xml version="1.0"');
            expect(result.xml).toContain('<ClinicalDocument');
        });

        it('should throw error if referto not found', async () => {
            mockPrismaClient.referto.findUnique.mockResolvedValue(null);

            await expect(HL7CDAService.generateFromReferto('invalid-id', 'ten-123'))
                .rejects.toThrow('Referto non trovato');
        });

        it('should include patient information in CDA', async () => {
            mockPrismaClient.referto.findUnique.mockResolvedValue(mockReferto);
            mockPrismaClient.cDADocument.create.mockImplementation(async (args) => ({
                id: 'cda-123',
                ...args.data
            }));

            const result = await HL7CDAService.generateFromReferto('ref-123', 'ten-123');

            expect(result.xml).toContain('recordTarget');
            expect(result.xml).toContain('Mario');
            expect(result.xml).toContain('Rossi');
            expect(result.xml).toContain('RSSMRA80A01H501Z');
        });

        it('should include author (medico) in CDA', async () => {
            mockPrismaClient.referto.findUnique.mockResolvedValue(mockReferto);
            mockPrismaClient.cDADocument.create.mockImplementation(async (args) => ({
                id: 'cda-123',
                ...args.data
            }));

            const result = await HL7CDAService.generateFromReferto('ref-123', 'ten-123');

            expect(result.xml).toContain('author');
            expect(result.xml).toContain('Giuseppe');
            expect(result.xml).toContain('Verdi');
        });
    });

    // ============================================
    // TEST: generateFromGiudizio
    // ============================================

    describe('generateFromGiudizio', () => {
        const mockGiudizio = {
            id: 'giu-123',
            dataGiudizio: new Date('2024-01-20'),
            esito: 'IDONEO',
            prescrizioni: 'Nessuna prescrizione',
            limitazioni: null,
            scadenzaRivisita: new Date('2025-01-20'),
            lavoratore: {
                id: 'lav-123',
                firstName: 'Anna',
                lastName: 'Bianchi',
                codiceFiscale: 'BNCNNA85C41H501Y',
                birthDate: new Date('1985-03-01'),
                gender: 'FEMALE',
                company: {
                    businessName: 'Azienda Test',
                    partitaIva: '98765432109'
                }
            },
            medicoCompetente: {
                id: 'mc-123',
                firstName: 'Paolo',
                lastName: 'Neri',
                codiceFiscale: 'NRIPLA65D01H501W',
                numeroAlboMC: 'MC-LOM-12345'
            },
            tenant: {
                id: 'ten-123',
                name: 'Centro MDL',
                partitaIva: '11111111111'
            }
        };

        it('should generate valid CDA XML from giudizio idoneità', async () => {
            mockPrismaClient.giudizioIdoneita.findUnique.mockResolvedValue(mockGiudizio);
            mockPrismaClient.cDADocument.create.mockResolvedValue({
                id: 'cda-456',
                sourceType: 'GIUDIZIO_IDONEITA',
                sourceId: 'giu-123',
                cdaXml: '<ClinicalDocument></ClinicalDocument>',
                hashXml: 'def456'
            });

            const result = await HL7CDAService.generateFromGiudizio('giu-123', 'ten-123');

            expect(result).toBeDefined();
            expect(result.cdaDocumentId).toBe('cda-456');
            expect(result.xml).toContain('Giudizio di Idoneità');
        });

        it('should throw error if giudizio not found', async () => {
            mockPrismaClient.giudizioIdoneita.findUnique.mockResolvedValue(null);

            await expect(HL7CDAService.generateFromGiudizio('invalid-id', 'ten-123'))
                .rejects.toThrow('Giudizio idoneità non trovato');
        });

        it('should include esito in structured body', async () => {
            mockPrismaClient.giudizioIdoneita.findUnique.mockResolvedValue(mockGiudizio);
            mockPrismaClient.cDADocument.create.mockImplementation(async (args) => ({
                id: 'cda-456',
                ...args.data
            }));

            const result = await HL7CDAService.generateFromGiudizio('giu-123', 'ten-123');

            expect(result.xml).toContain('IDONEO');
            expect(result.xml).toContain('structuredBody');
        });
    });

    // ============================================
    // TEST: getCDADocument
    // ============================================

    describe('getCDADocument', () => {
        it('should return CDA document if exists', async () => {
            const mockDoc = {
                id: 'cda-123',
                sourceType: 'REFERTO',
                sourceId: 'ref-123',
                cdaXml: '<ClinicalDocument/>',
                validato: true
            };

            mockPrismaClient.cDADocument.findFirst.mockResolvedValue(mockDoc);

            const result = await HL7CDAService.getCDADocument('REFERTO', 'ref-123', 'ten-123');

            expect(result).toEqual(mockDoc);
            expect(mockPrismaClient.cDADocument.findFirst).toHaveBeenCalledWith({
                where: {
                    sourceType: 'REFERTO',
                    sourceId: 'ref-123',
                    tenantId: 'ten-123'
                }
            });
        });

        it('should return null if not found', async () => {
            mockPrismaClient.cDADocument.findFirst.mockResolvedValue(null);

            const result = await HL7CDAService.getCDADocument('REFERTO', 'invalid-id', 'ten-123');

            expect(result).toBeNull();
        });
    });

    // ============================================
    // TEST: validateCDA
    // ============================================

    describe('validateCDA', () => {
        it('should return valid for well-formed CDA', async () => {
            const validCDA = `<?xml version="1.0"?>
        <ClinicalDocument xmlns="urn:hl7-org:v3">
          <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
          <id root="2.16.840.1.113883.2.9.2" extension="doc-123"/>
          <effectiveTime value="20240115"/>
        </ClinicalDocument>`;

            mockPrismaClient.cDADocument.findFirst.mockResolvedValue({
                id: 'cda-123',
                cdaXml: validCDA
            });
            mockPrismaClient.cDADocument.update.mockResolvedValue({});

            const result = await HL7CDAService.validateCDA('cda-123', 'ten-123');

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return errors for malformed XML', async () => {
            mockPrismaClient.cDADocument.findFirst.mockResolvedValue({
                id: 'cda-123',
                cdaXml: '<invalid>not closed'
            });

            const result = await HL7CDAService.validateCDA('cda-123', 'ten-123');

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should throw error if document not found', async () => {
            mockPrismaClient.cDADocument.findFirst.mockResolvedValue(null);

            await expect(HL7CDAService.validateCDA('invalid-id', 'ten-123'))
                .rejects.toThrow('Documento CDA non trovato');
        });
    });

    // ============================================
    // TEST: getHL7Mapping
    // ============================================

    describe('getHL7Mapping', () => {
        it('should return mapping if exists', async () => {
            const mockMapping = {
                id: 'map-123',
                entityType: 'Referto',
                fieldPath: 'diagnosiPrincipale',
                codeSystem: 'LOINC',
                code: '29299-5',
                displayName: 'Diagnosis'
            };

            mockPrismaClient.hL7Mapping.findFirst.mockResolvedValue(mockMapping);

            const result = await HL7CDAService.getHL7Mapping('Referto', 'diagnosiPrincipale');

            expect(result).toEqual(mockMapping);
        });

        it('should return null if mapping not found', async () => {
            mockPrismaClient.hL7Mapping.findFirst.mockResolvedValue(null);

            const result = await HL7CDAService.getHL7Mapping('Unknown', 'field');

            expect(result).toBeNull();
        });
    });

    // ============================================
    // TEST: getPatientCDADocuments
    // ============================================

    describe('getPatientCDADocuments', () => {
        it('should return all CDA documents for patient', async () => {
            const mockDocs = [
                { id: 'cda-1', sourceType: 'REFERTO', pazienteId: 'paz-123' },
                { id: 'cda-2', sourceType: 'GIUDIZIO_IDONEITA', pazienteId: 'paz-123' }
            ];

            // Mock query that filters by pazienteId
            mockPrismaClient.cDADocument.findMany = jest.fn().mockResolvedValue(mockDocs);

            const result = await HL7CDAService.getPatientCDADocuments('paz-123', 'ten-123');

            expect(result).toHaveLength(2);
            expect(result[0].pazienteId).toBe('paz-123');
        });
    });

    // ============================================
    // TEST: XML Escaping
    // ============================================

    describe('_escapeXml (private)', () => {
        it('should escape XML special characters', () => {
            // Access private method for testing
            const escapeXml = HL7CDAService._escapeXml || ((str) => {
                if (!str) return '';
                return str
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&apos;');
            });

            expect(escapeXml('<test>')).toBe('&lt;test&gt;');
            expect(escapeXml('Tom & Jerry')).toBe('Tom &amp; Jerry');
            expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;');
        });

        it('should handle null/undefined', () => {
            const escapeXml = HL7CDAService._escapeXml || ((str) => str || '');

            expect(escapeXml(null)).toBe('');
            expect(escapeXml(undefined)).toBe('');
        });
    });
});
