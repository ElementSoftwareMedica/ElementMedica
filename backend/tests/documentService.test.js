/**
 * Test Suite for DocumentService
 * 
 * Testa funzionalità core senza dipendenze dal database.
 * I test di integrazione completi richiederebbero setup DB dedicato.
 * 
 * Focus su:
 * - Logica di business
 * - Generazione filename
 * - Build HTML
 * - PDF options
 * - Error handling
 */

import {
  DocumentService,
  DocumentGenerationError,
  getDocumentService
} from '../services/documentService.js';
import { getMarkerResolver } from '../services/markerResolver.js';

// Mock data
const mockTemplate = {
  id: 1,
  tenantId: 1,
  type: 'CERTIFICATE',
  version: 1,
  isActive: true,
  deletedAt: null,
  content: `
    <h1>ATTESTATO DI PARTECIPAZIONE</h1>
    <p>Si certifica che {{person.fullName}}</p>
    <p>ha partecipato al corso "{{course.title}}"</p>
    <p>dal {{schedule.startDate|date:DD/MM/YYYY}} al {{schedule.endDate|date:DD/MM/YYYY}}</p>
  `,
  header: null,
  footer: null,
  styles: { fontFamily: 'Arial' },
  layout: { pageSize: 'A4', orientation: 'portrait' }
};

const mockSchedule = {
  id: 1,
  code: 'TEST-001',
  startDate: new Date('2024-01-15'),
  endDate: new Date('2024-01-20'),
  tenantId: 1,
  maxParticipants: 15,
  deletedAt: null,
  course: {
    id: 1,
    title: 'Corso Test',
    code: 'CT-001',
    duration: 16,
    validityYears: 5,
    category: 'Test',
    regulation: 'Test Regulation'
  },
  locations: [
    { name: 'Aula 1', address: 'Via Test 1' }
  ],
  sessions: [
    {
      id: 1,
      duration: 4,
      trainer: {
        id: 1,
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario.rossi@test.com'
      }
    }
  ],
  persons: []
};

const mockPerson = {
  id: 1,
  firstName: 'Giovanni',
  lastName: 'Verdi',
  email: 'giovanni.verdi@test.com',
  cf: 'VRDGNN80A01H501Z',
  phone: '333 1234567',
  birthDate: new Date('1980-01-01'),
  birthPlace: 'Roma',
  address: 'Via Roma 123',
  city: 'Milano',
  province: 'MI',
  postalCode: '20100',
  country: 'Italia',
  tenantId: 1,
  deletedAt: null
};

describe('DocumentService', () => {
  let service;

  beforeEach(() => {
    service = new DocumentService();
  });

  describe('Constructor', () => {
    test('should initialize with MarkerResolver', () => {
      expect(service.markerResolver).toBeDefined();
      expect(service.markerResolver).toBe(getMarkerResolver());
    });
  });

  // Test database-dependent functions richiederebbero setup completo
  // Per ora testiamo solo le funzioni pure

  describe('Private Methods', () => {
    describe('_buildContext', () => {
      test('should build complete context from entity data', () => {
        const entityData = {
          person: mockPerson,
          course: mockSchedule.course,
          schedule: mockSchedule
        };

        const context = service._buildContext(entityData, mockTemplate, {
          tenantName: 'Test Tenant',
          tenantLogo: '/logo.png'
        });

        expect(context.person).toBeDefined();
        expect(context.course).toBeDefined();
        expect(context.schedule).toBeDefined();
        expect(context.tenant).toBeDefined();
        expect(context.tenant.name).toBe('Test Tenant');
        expect(context.current).toBeDefined();
        expect(context.current.year).toBe(new Date().getFullYear());
        expect(context.document).toBeDefined();
      });
    });

    describe('_generateFilename', () => {
      test('should generate filename with all components', () => {
        const filename = service._generateFilename(
          'CERTIFICATE',
          1,
          123,
          '2024/001'
        );

        expect(filename).toMatch(/^attestato_1_person123_2024-001_\d+\.pdf$/);
      });

      test('should generate filename without person', () => {
        const filename = service._generateFilename(
          'LETTER_OF_ENGAGEMENT',
          1,
          null,
          '2024/002'
        );

        expect(filename).toMatch(/^lettera_1_2024-002_\d+\.pdf$/);
        expect(filename).not.toContain('person');
      });

      test('should use correct prefix for each document type', () => {
        expect(service._generateFilename('CERTIFICATE', 1, null, null))
          .toMatch(/^attestato_/);
        expect(service._generateFilename('LETTER_OF_ENGAGEMENT', 1, null, null))
          .toMatch(/^lettera_/);
        expect(service._generateFilename('ATTENDANCE_REGISTER', 1, null, null))
          .toMatch(/^registro_/);
      });
    });

    describe('_buildPdfOptions', () => {
      test('should build PDF options from template layout', () => {
        const options = service._buildPdfOptions({
          layout: {
            pageSize: 'A3',
            orientation: 'landscape',
            margins: {
              top: '3cm',
              right: '2cm',
              bottom: '3cm',
              left: '2cm'
            }
          }
        });

        expect(options.format).toBe('A3');
        expect(options.landscape).toBe(true);
        expect(options.margin.top).toBe('3cm');
      });

      test('should use defaults if layout not specified', () => {
        const options = service._buildPdfOptions({});

        expect(options.format).toBe('A4');
        expect(options.landscape).toBe(false);
        expect(options.margin.top).toBe('2cm');
      });
    });
  });

  describe('Singleton Instance', () => {
    test('should return same instance', () => {
      const instance1 = getDocumentService();
      const instance2 = getDocumentService();
      expect(instance1).toBe(instance2);
    });

    test('should be instance of DocumentService', () => {
      const instance = getDocumentService();
      expect(instance).toBeInstanceOf(DocumentService);
    });
  });

  describe('Error Classes', () => {
    test('DocumentGenerationError should have correct properties', () => {
      const error = new DocumentGenerationError('Test error', { code: 'TEST' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('DocumentGenerationError');
      expect(error.message).toBe('Test error');
      expect(error.details).toEqual({ code: 'TEST' });
    });
  });
});
