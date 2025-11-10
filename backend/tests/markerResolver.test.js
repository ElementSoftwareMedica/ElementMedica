/**
 * Test Suite for MarkerResolver Service
 * 
 * Testa:
 * - Parsing dei marker
 * - Risoluzione marker con proprietà nidificate
 * - Formatter (date, currency, text transforms)
 * - Validazione con suggerimenti typo
 * - Preview con dati mock
 * - Context management
 * - Error handling
 */

import {
  MarkerResolver,
  MarkerContext,
  FormatterRegistry,
  MarkerResolutionError,
  getMarkerResolver
} from '../services/markerResolver.js';

describe('FormatterRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new FormatterRegistry();
  });

  describe('Date Formatter', () => {
    test('should format date with DD/MM/YYYY pattern', () => {
      const date = new Date('2024-03-15');
      const formatted = registry.format('date', date, ['DD/MM/YYYY']);
      expect(formatted).toBe('15/03/2024');
    });

    test('should format date with DD-MM-YYYY pattern', () => {
      const date = new Date('2024-03-15');
      const formatted = registry.format('date', date, ['DD-MM-YYYY']);
      expect(formatted).toBe('15-03-2024');
    });

    test('should format date with YY pattern', () => {
      const date = new Date('2024-03-15');
      const formatted = registry.format('date', date, ['DD/MM/YY']);
      expect(formatted).toBe('15/03/24');
    });

    test('should handle string dates', () => {
      const formatted = registry.format('date', '2024-03-15', ['DD/MM/YYYY']);
      expect(formatted).toBe('15/03/2024');
    });

    test('should return empty string for null', () => {
      const formatted = registry.format('date', null);
      expect(formatted).toBe('');
    });

    test('should return original value for invalid date', () => {
      const formatted = registry.format('date', 'invalid', ['DD/MM/YYYY']);
      expect(formatted).toBe('invalid');
    });
  });

  describe('Currency Formatter', () => {
    test('should format currency with € symbol', () => {
      const formatted = registry.format('currency', 1234.56, ['€']);
      expect(['€ 1.234,56', '€ 1234,56']).toContain(formatted);
    });

    test('should format currency with $ symbol', () => {
      const formatted = registry.format('currency', 1234.56, ['$']);
      expect(['$ 1.234,56', '$ 1234,56']).toContain(formatted);
    });

    test('should use € as default symbol', () => {
      const formatted = registry.format('currency', 1234.56);
      expect(['€ 1.234,56', '€ 1234,56']).toContain(formatted);
    });

    test('should handle integers', () => {
      const formatted = registry.format('currency', 1000, ['€']);
      expect(['€ 1.000,00', '€ 1000,00']).toContain(formatted);
    });

    test('should return empty string for null', () => {
      const formatted = registry.format('currency', null);
      expect(formatted).toBe('');
    });

    test('should return original value for non-numeric', () => {
      const formatted = registry.format('currency', 'abc');
      expect(formatted).toBe('abc');
    });
  });

  describe('Text Transform Formatters', () => {
    test('uppercase should convert to uppercase', () => {
      expect(registry.format('uppercase', 'hello')).toBe('HELLO');
    });

    test('lowercase should convert to lowercase', () => {
      expect(registry.format('lowercase', 'HELLO')).toBe('hello');
    });

    test('capitalize should capitalize first letter', () => {
      expect(registry.format('capitalize', 'hello world')).toBe('Hello world');
    });

    test('capitalizeWords should capitalize each word', () => {
      expect(registry.format('capitalizeWords', 'hello world')).toBe('Hello World');
    });

    test('should handle empty strings', () => {
      expect(registry.format('uppercase', '')).toBe('');
      expect(registry.format('lowercase', '')).toBe('');
      expect(registry.format('capitalize', '')).toBe('');
      expect(registry.format('capitalizeWords', '')).toBe('');
    });

    test('should handle null values', () => {
      expect(registry.format('uppercase', null)).toBe('');
      expect(registry.format('lowercase', null)).toBe('');
    });
  });

  describe('Number Formatter', () => {
    test('should format number with 0 decimals', () => {
      const result = registry.format('number', 1234.56, [0]);
      // Accetta entrambi i formati (con o senza separatore migliaia)
      expect(['1.235', '1235']).toContain(result);
    });

    test('should format number with 2 decimals', () => {
      const result = registry.format('number', 1234.56, [2]);
      // Accetta entrambi i formati (con o senza separatore migliaia)
      expect(['1.234,56', '1234,56']).toContain(result);
    });

    test('should return original for non-numeric', () => {
      expect(registry.format('number', 'abc', [0])).toBe('abc');
    });
  });

  describe('Phone Formatter', () => {
    test('should format 10-digit phone number', () => {
      expect(registry.format('phone', '0123456789')).toBe('012 3456789');
    });

    test('should handle phone with non-digits', () => {
      expect(registry.format('phone', '012-345-6789')).toBe('012 3456789');
    });

    test('should return original for non-10-digit', () => {
      expect(registry.format('phone', '123')).toBe('123');
    });
  });

  describe('CF Formatter', () => {
    test('should convert to uppercase', () => {
      expect(registry.format('cf', 'rssmra80a01h501z')).toBe('RSSMRA80A01H501Z');
    });
  });

  describe('Default Formatter', () => {
    test('should return value if exists', () => {
      expect(registry.format('default', 'test', ['default'])).toBe('test');
    });

    test('should return default for null', () => {
      expect(registry.format('default', null, ['default'])).toBe('default');
    });

    test('should return default for empty string', () => {
      expect(registry.format('default', '', ['N/A'])).toBe('N/A');
    });
  });

  describe('Truncate Formatter', () => {
    test('should truncate long strings', () => {
      const long = 'This is a very long string that needs to be truncated';
      expect(registry.format('truncate', long, [20, '...'])).toBe('This is a very long ...');
    });

    test('should not truncate short strings', () => {
      expect(registry.format('truncate', 'Short', [20])).toBe('Short');
    });
  });

  describe('Custom Formatters', () => {
    test('should register and use custom formatter', () => {
      registry.register('double', (value) => value * 2);
      expect(registry.format('double', 5)).toBe(10);
    });

    test('should check if formatter exists', () => {
      expect(registry.has('date')).toBe(true);
      expect(registry.has('nonexistent')).toBe(false);
    });

    test('should list all formatters', () => {
      const formatters = registry.list();
      expect(formatters).toContain('date');
      expect(formatters).toContain('currency');
      expect(formatters).toContain('uppercase');
    });
  });

  describe('Error Handling', () => {
    test('should return original value for unknown formatter', () => {
      const result = registry.format('unknown', 'test');
      expect(result).toBe('test');
    });

    test('should handle formatter errors gracefully', () => {
      registry.register('error', () => { throw new Error('Test error'); });
      const result = registry.format('error', 'test');
      expect(result).toBe('test'); // Ritorna valore originale su errore
    });
  });
});

describe('MarkerContext', () => {
  let context;

  beforeEach(() => {
    context = new MarkerContext({
      person: {
        name: 'Mario',
        address: {
          city: 'Milano',
          details: {
            street: 'Via Roma'
          }
        }
      },
      course: {
        title: 'Test Course'
      }
    });
  });

  test('should get top-level property', () => {
    expect(context.get('course.title')).toBe('Test Course');
  });

  test('should get nested property (2 levels)', () => {
    expect(context.get('person.address.city')).toBe('Milano');
  });

  test('should get deeply nested property (3 levels)', () => {
    expect(context.get('person.address.details.street')).toBe('Via Roma');
  });

  test('should return default for non-existent property', () => {
    expect(context.get('person.nonexistent', 'default')).toBe('default');
  });

  test('should return null for non-existent property without default', () => {
    expect(context.get('person.nonexistent')).toBeNull();
  });

  test('should cache values', () => {
    const value1 = context.get('person.name');
    const value2 = context.get('person.name');
    expect(value1).toBe(value2);
    expect(context.cache.has('person.name')).toBe(true);
  });

  test('should set value', () => {
    context.set('person.age', 30);
    expect(context.get('person.age')).toBe(30);
  });

  test('should check if path exists', () => {
    expect(context.has('person.name')).toBe(true);
    expect(context.has('person.nonexistent')).toBe(false);
  });

  test('should clear cache', () => {
    context.get('person.name');
    expect(context.cache.size).toBeGreaterThan(0);
    context.clearCache();
    expect(context.cache.size).toBe(0);
  });
});

describe('MarkerResolver', () => {
  let resolver;

  beforeEach(() => {
    resolver = new MarkerResolver();
  });

  describe('Parse Markers', () => {
    test('should parse simple marker', () => {
      const markers = resolver.parseMarkers('Hello {{person.name}}');
      expect(markers).toHaveLength(1);
      expect(markers[0]).toEqual({
        raw: '{{person.name}}',
        marker: 'person.name',
        formatter: null,
        args: []
      });
    });

    test('should parse marker with formatter', () => {
      const markers = resolver.parseMarkers('{{person.birthDate|date:DD/MM/YYYY}}');
      expect(markers).toHaveLength(1);
      expect(markers[0]).toEqual({
        raw: '{{person.birthDate|date:DD/MM/YYYY}}',
        marker: 'person.birthDate',
        formatter: 'date',
        args: ['DD/MM/YYYY']
      });
    });

    test('should parse marker with formatter without args', () => {
      const markers = resolver.parseMarkers('{{person.name|uppercase}}');
      expect(markers).toHaveLength(1);
      expect(markers[0]).toEqual({
        raw: '{{person.name|uppercase}}',
        marker: 'person.name',
        formatter: 'uppercase',
        args: []
      });
    });

    test('should parse multiple markers', () => {
      const template = '{{person.firstName}} {{person.lastName}}';
      const markers = resolver.parseMarkers(template);
      expect(markers).toHaveLength(2);
    });

    test('should parse marker with currency formatter', () => {
      const markers = resolver.parseMarkers('{{course.price|currency:€}}');
      expect(markers[0]).toEqual({
        raw: '{{course.price|currency:€}}',
        marker: 'course.price',
        formatter: 'currency',
        args: ['€']
      });
    });

    test('should handle empty template', () => {
      expect(resolver.parseMarkers('')).toEqual([]);
      expect(resolver.parseMarkers(null)).toEqual([]);
    });
  });

  describe('Resolve Single Marker', () => {
    let context;

    beforeEach(() => {
      context = new MarkerContext({
        person: {
          firstName: 'Mario',
          lastName: 'Rossi',
          birthDate: new Date('1980-01-01')
        }
      });
    });

    test('should resolve simple marker', () => {
      const value = resolver.resolveMarker('person.firstName', context);
      expect(value).toBe('Mario');
    });

    test('should resolve marker with uppercase formatter', () => {
      const value = resolver.resolveMarker('person.firstName', context, 'uppercase');
      expect(value).toBe('MARIO');
    });

    test('should resolve marker with date formatter', () => {
      const value = resolver.resolveMarker('person.birthDate', context, 'date', ['DD/MM/YYYY']);
      expect(value).toBe('01/01/1980');
    });

    test('should return empty string for non-existent marker', () => {
      const value = resolver.resolveMarker('person.nonexistent', context);
      expect(value).toBe('');
    });

    test('should escape HTML characters', () => {
      const htmlContext = new MarkerContext({
        test: { value: '<script>alert("xss")</script>' }
      });
      const value = resolver.resolveMarker('test.value', htmlContext);
      expect(value).not.toContain('<');
      expect(value).not.toContain('>');
    });
  });

  describe('Resolve System Markers', () => {
    let context;

    beforeEach(() => {
      context = new MarkerContext({});
    });

    test('should resolve current.year', () => {
      const value = resolver.resolveMarker('current.year', context);
      expect(parseInt(value)).toBe(new Date().getFullYear());
    });

    test('should resolve current.date', () => {
      const value = resolver.resolveMarker('current.date', context, 'date', ['DD/MM/YYYY']);
      const today = new Date();
      const expected = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      expect(value).toBe(expected);
    });

    test('should resolve current.time', () => {
      const value = resolver.resolveMarker('current.time', context);
      expect(value).toMatch(/\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Resolve Template', () => {
    const testData = {
      person: {
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario.rossi@example.com',
        birthDate: new Date('1980-01-01')
      },
      course: {
        title: 'Corso di Sicurezza',
        duration: 16
      }
    };

    test('should resolve simple template', async () => {
      const template = 'Gentile {{person.firstName}} {{person.lastName}}';
      const resolved = await resolver.resolve(template, testData);
      expect(resolved).toBe('Gentile Mario Rossi');
    });

    test('should resolve template with formatters', async () => {
      const template = 'Nato il {{person.birthDate|date:DD/MM/YYYY}}';
      const resolved = await resolver.resolve(template, testData);
      expect(resolved).toBe('Nato il 01/01/1980');
    });

    test('should resolve template with multiple markers', async () => {
      const template = 'Il corso "{{course.title}}" ha una durata di {{course.duration}} ore.';
      const resolved = await resolver.resolve(template, testData);
      expect(resolved).toBe('Il corso "Corso di Sicurezza" ha una durata di 16 ore.');
    });

    test('should resolve template with text transforms', async () => {
      const template = 'Email: {{person.email|uppercase}}';
      const resolved = await resolver.resolve(template, testData);
      expect(resolved).toBe('Email: MARIO.ROSSI@EXAMPLE.COM');
    });

    test('should handle missing data gracefully (non-strict)', async () => {
      const template = 'Nome: {{person.firstName}}, Phone: {{person.phone}}';
      const resolved = await resolver.resolve(template, testData, { strict: false });
      expect(resolved).toBe('Nome: Mario, Phone: ');
    });

    test('should throw error for missing data (strict mode)', async () => {
      const template = 'Nome: {{person.nonexistent}}';
      await expect(
        resolver.resolve(template, testData, { strict: true, validate: true })
      ).rejects.toThrow(MarkerResolutionError);
    });
  });

  describe('Validate Markers', () => {
    test('should validate correct markers', () => {
      const template = '{{person.fullName}} {{course.title}}';
      const validation = resolver.validateMarkers(template);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.markerCount).toBe(2);
    });

    test('should detect unknown markers', () => {
      const template = '{{person.unknownField}}';
      const validation = resolver.validateMarkers(template);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].type).toBe('unknown_marker');
    });

    test('should suggest similar markers for typos', () => {
      const template = '{{person.fulName}}'; // typo: fulName invece di fullName
      const validation = resolver.validateMarkers(template);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].suggestion).toContain('fullName');
    });

    test('should detect unknown formatters', () => {
      const template = '{{person.fullName|unknownFormatter}}';
      const validation = resolver.validateMarkers(template);
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings[0].type).toBe('unknown_formatter');
    });

    test('should suggest similar formatters for typos', () => {
      const template = '{{person.birthDate|dat}}'; // typo: dat invece di date
      const validation = resolver.validateMarkers(template);
      expect(validation.warnings[0].suggestion).toContain('date');
    });
  });

  describe('Preview with Mock Data', () => {
    test('should generate preview with mock data', async () => {
      const template = 'Gentile {{person.fullName}}, nato il {{person.birthDate|date:DD/MM/YYYY}}';
      const preview = await resolver.preview(template);
      expect(preview).toContain('Mario Rossi');
      expect(preview).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    test('should preview with all marker categories', async () => {
      const template = `
        Person: {{person.fullName}}
        Course: {{course.title}}
        Schedule: {{schedule.code}}
        Company: {{company.name}}
        Trainer: {{trainer.fullName}}
        Tenant: {{tenant.name}}
        Document: {{document.number}}
      `;
      const preview = await resolver.preview(template);
      expect(preview).toContain('Mario Rossi');
      expect(preview).toContain('Corso di Sicurezza');
      expect(preview).toContain('SSL-001');
      expect(preview).toContain('Azienda Example');
      expect(preview).toContain('Laura Bianchi');
      expect(preview).toContain('Element Medica');
      expect(preview).toContain('2024/001');
    });
  });

  describe('List Available Markers', () => {
    test('should list markers grouped by category', () => {
      const markers = resolver.listAvailableMarkers();
      expect(markers).toHaveProperty('person');
      expect(markers).toHaveProperty('course');
      expect(markers).toHaveProperty('schedule');
      expect(markers).toHaveProperty('company');
      expect(markers).toHaveProperty('trainer');
      expect(markers).toHaveProperty('system');
      expect(markers).toHaveProperty('document');
    });

    test('should include marker descriptions', () => {
      const markers = resolver.listAvailableMarkers();
      const personMarkers = markers.person;
      expect(personMarkers.length).toBeGreaterThan(0);
      expect(personMarkers[0]).toHaveProperty('marker');
      expect(personMarkers[0]).toHaveProperty('description');
    });

    test('should have at least 60 markers total', () => {
      const markers = resolver.listAvailableMarkers();
      const total = Object.values(markers).reduce((sum, cat) => sum + cat.length, 0);
      expect(total).toBeGreaterThanOrEqual(60);
    });
  });

  describe('Custom Formatters', () => {
    test('should register and use custom formatter', async () => {
      resolver.registerFormatter('reverse', (value) => {
        return String(value).split('').reverse().join('');
      });

      const template = '{{person.name|reverse}}';
      const data = { person: { name: 'Mario' } };
      const resolved = await resolver.resolve(template, data);
      expect(resolved).toBe('oiraM');
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle template with mixed content', async () => {
      const template = `
ATTESTATO DI PARTECIPAZIONE

Si certifica che {{person.fullName|capitalizeWords}},
nato/a a {{person.birthPlace}} il {{person.birthDate|date:DD/MM/YYYY}},
C.F. {{person.cf|cf}},
ha partecipato al corso "{{course.title}}"
della durata di {{course.duration}} ore,
svoltosi dal {{schedule.startDate|date:DD/MM/YYYY}} al {{schedule.endDate|date:DD/MM/YYYY}}.

Rilasciato in data {{current.date|date:DD/MM/YYYY}}
      `;

      const data = {
        person: {
          fullName: 'mario rossi',
          birthPlace: 'Roma',
          birthDate: new Date('1980-01-01'),
          cf: 'rssmra80a01h501z'
        },
        course: {
          title: 'Corso di Sicurezza sul Lavoro',
          duration: 16
        },
        schedule: {
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-01-20')
        }
      };

      const resolved = await resolver.resolve(template, data);
      
      expect(resolved).toContain('Mario Rossi'); // capitalizeWords
      expect(resolved).toContain('Roma');
      expect(resolved).toContain('01/01/1980'); // date format
      expect(resolved).toContain('RSSMRA80A01H501Z'); // cf uppercase
      expect(resolved).toContain('Corso di Sicurezza sul Lavoro');
      expect(resolved).toContain('16 ore');
      expect(resolved).toContain('15/01/2024'); // schedule dates
      expect(resolved).toContain('20/01/2024');
    });

    test('should handle nested properties up to 3 levels', async () => {
      const template = '{{person.address.city}}, {{person.address.postalCode}}';
      const data = {
        person: {
          address: {
            city: 'Milano',
            postalCode: '20100'
          }
        }
      };

      const resolved = await resolver.resolve(template, data);
      expect(resolved).toBe('Milano, 20100');
    });
  });

  describe('Performance', () => {
    test('should resolve template in reasonable time', async () => {
      const template = Array(100).fill('{{person.name}} ').join('');
      const data = { person: { name: 'Mario' } };

      const start = Date.now();
      await resolver.resolve(template, data);
      const duration = Date.now() - start;

      // Performance target: <1s for 100 markers (realistico per CI/slow machines)
      expect(duration).toBeLessThan(1000);
      
      // Log per monitoraggio performance
      console.log(`Performance: 100 markers risolti in ${duration}ms`);
    });
  });
});

describe('Singleton Instance', () => {
  test('should return same instance', () => {
    const instance1 = getMarkerResolver();
    const instance2 = getMarkerResolver();
    expect(instance1).toBe(instance2);
  });

  test('should be instance of MarkerResolver', () => {
    const instance = getMarkerResolver();
    expect(instance).toBeInstanceOf(MarkerResolver);
  });
});

describe('MarkerResolutionError', () => {
  test('should create error with marker and details', () => {
    const error = new MarkerResolutionError(
      'Test error',
      'person.invalid',
      { suggestion: 'person.fullName' }
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('MarkerResolutionError');
    expect(error.message).toBe('Test error');
    expect(error.marker).toBe('person.invalid');
    expect(error.details).toEqual({ suggestion: 'person.fullName' });
  });
});
