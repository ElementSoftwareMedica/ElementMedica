# Architettura Sistema Template Management

**Data**: 4 Novembre 2025  
**Versione**: 1.0  
**Status**: ✅ DESIGN REVIEW

---

## 📋 Indice

1. [Architettura Generale](#architettura-generale)
2. [Marker Resolution Engine](#marker-resolution-engine)
3. [Template Processing Pipeline](#template-processing-pipeline)
4. [Document Generation Flow](#document-generation-flow)
5. [Database Architecture](#database-architecture)
6. [API Architecture](#api-architecture)
7. [Frontend Architecture](#frontend-architecture)
8. [Security & Multi-Tenancy](#security--multi-tenancy)
9. [Performance & Scalability](#performance--scalability)
10. [Integration Points](#integration-points)

---

## 🏗️ Architettura Generale

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React 18)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Template Editor  │  │ Document Gen UI  │  │ Marker Picker    │  │
│  │   (Tiptap)       │  │   (Modal)        │  │  (Autocomplete)  │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                     │                      │             │
│           └─────────────────────┼──────────────────────┘             │
│                                 │                                    │
└─────────────────────────────────┼────────────────────────────────────┘
                                  │
                                  │ HTTPS/REST
                                  │
┌─────────────────────────────────┼────────────────────────────────────┐
│                          API LAYER                                    │
├─────────────────────────────────┴────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ Template API    │  │ Document API    │  │ Marker API      │     │
│  │   (Port 4001)   │  │   (Port 4002)   │  │   (Port 4001)   │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
│           │                    │                     │              │
│           └────────────────────┼─────────────────────┘              │
│                                │                                    │
└────────────────────────────────┼───────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
         ┌──────────▼──────────┐   ┌─────────▼─────────┐
         │  BUSINESS LOGIC     │   │   QUEUE SYSTEM    │
         ├─────────────────────┤   ├───────────────────┤
         │                     │   │                   │
         │ • MarkerResolver    │   │ • Bull Queue      │
         │ • TemplateValidator │   │ • Redis           │
         │ • PDFGenerator      │   │ • Job Processing  │
         │ • BatchProcessor    │   │                   │
         │                     │   │                   │
         └──────────┬──────────┘   └─────────┬─────────┘
                    │                        │
                    └────────────┬───────────┘
                                 │
         ┌───────────────────────▼───────────────────────┐
         │              DATA LAYER                        │
         ├────────────────────────────────────────────────┤
         │                                                │
         │  ┌─────────────┐  ┌──────────────┐            │
         │  │ PostgreSQL  │  │ File Storage │            │
         │  │   (Prisma)  │  │   (S3/Local) │            │
         │  └─────────────┘  └──────────────┘            │
         │                                                │
         └────────────────────────────────────────────────┘
```

### Component Responsibilities

| Layer | Components | Responsabilità |
|-------|------------|----------------|
| **Frontend** | TemplateEditor, DocumentGenUI, MarkerPicker | UI/UX, Form validation, Real-time preview |
| **API** | Template routes, Document routes, Marker routes | Request handling, Auth, Validation |
| **Business Logic** | MarkerResolver, TemplateValidator, PDFGenerator | Core logic, Marker resolution, PDF generation |
| **Queue** | Bull Queue, Job processors | Async processing, Batch operations |
| **Data** | Prisma ORM, PostgreSQL, File Storage | Data persistence, File management |

---

## 🔧 Marker Resolution Engine

### Architecture Overview

Il **Marker Resolution Engine** è il cuore del sistema template. Responsabile di:
1. Parsing markers nel template
2. Risoluzione valori da database entities
3. Formatting output (date, currency, etc.)
4. Validazione markers

### Class Diagram

```typescript
┌─────────────────────────────────────────────────────────┐
│                   MarkerResolver                         │
├─────────────────────────────────────────────────────────┤
│ - context: MarkerContext                                │
│ - formatters: FormatterRegistry                         │
│ - validators: ValidatorRegistry                         │
├─────────────────────────────────────────────────────────┤
│ + resolve(template: string): string                     │
│ + validate(template: string): ValidationResult          │
│ + preview(template: string, mockData): string           │
│ - parseMarkers(template: string): Marker[]              │
│ - resolveMarker(marker: Marker): any                    │
│ - applyFormatter(value: any, formatter: string): string │
└─────────────────────────────────────────────────────────┘
                           │
                           │ uses
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   MarkerContext                          │
├─────────────────────────────────────────────────────────┤
│ + person?: Person                                       │
│ + course?: Course                                       │
│ + schedule?: CourseSchedule                             │
│ + sessions?: CourseSession[]                            │
│ + company?: Company                                     │
│ + trainer?: Person                                      │
│ + tenant?: Tenant                                       │
│ + customData?: Record<string, any>                      │
├─────────────────────────────────────────────────────────┤
│ + get(path: string): any                                │
│ + has(path: string): boolean                            │
│ + set(path: string, value: any): void                   │
└─────────────────────────────────────────────────────────┘
```

### Implementation Details

**File**: `backend/services/markerResolver.js`

```javascript
/**
 * Marker Resolution Engine
 * 
 * Responsible for parsing and resolving template markers with data from context.
 * Supports nested properties, conditionals, loops, and formatters.
 * 
 * @example
 * const resolver = new MarkerResolver({
 *   person: { firstName: 'Mario', lastName: 'Rossi' },
 *   course: { title: 'Corso Antincendio' }
 * });
 * 
 * const result = resolver.resolve('{{person.firstName}} {{person.lastName}} - {{course.title}}');
 * // Output: "Mario Rossi - Corso Antincendio"
 */
class MarkerResolver {
  constructor(context, options = {}) {
    this.context = new MarkerContext(context);
    this.formatters = new FormatterRegistry();
    this.validators = new ValidatorRegistry();
    this.options = {
      strict: options.strict ?? true,          // Throw on missing markers
      escapeHtml: options.escapeHtml ?? true,  // XSS protection
      maxDepth: options.maxDepth ?? 3,         // Max nesting for properties
      cacheResults: options.cacheResults ?? true
    };
    this.cache = new Map();
  }

  /**
   * Resolve all markers in template
   * 
   * @param {string} template - Template with markers
   * @returns {string} - Resolved template
   */
  resolve(template) {
    if (!template || typeof template !== 'string') {
      throw new Error('Template must be a non-empty string');
    }

    // Parse markers
    const markers = this.parseMarkers(template);
    
    // Resolve each marker
    let result = template;
    for (const marker of markers) {
      const value = this.resolveMarker(marker);
      result = result.replace(marker.raw, value);
    }

    return result;
  }

  /**
   * Parse markers from template
   * 
   * Supports:
   * - Simple: {{marker}}
   * - Nested: {{marker.property.nested}}
   * - Formatted: {{marker|format:pattern}}
   * - Conditional: {{#if condition}}...{{/if}}
   * - Loop: {{#each array}}...{{/each}}
   * 
   * @param {string} template
   * @returns {Marker[]}
   */
  parseMarkers(template) {
    const markers = [];
    
    // Regex for Handlebars-like syntax
    const markerRegex = /\{\{([^}]+)\}\}/g;
    
    let match;
    while ((match = markerRegex.exec(template)) !== null) {
      const raw = match[0];       // {{person.firstName}}
      const content = match[1].trim(); // person.firstName
      
      // Parse marker components
      const [path, formatterStr] = content.split('|').map(s => s.trim());
      
      markers.push({
        raw,
        path,
        formatter: formatterStr || null,
        type: this.detectMarkerType(path)
      });
    }
    
    return markers;
  }

  /**
   * Resolve single marker
   * 
   * @param {Marker} marker
   * @returns {string}
   */
  resolveMarker(marker) {
    // Check cache
    if (this.options.cacheResults && this.cache.has(marker.raw)) {
      return this.cache.get(marker.raw);
    }

    // Get value from context
    let value = this.context.get(marker.path);
    
    // Handle missing value
    if (value === undefined || value === null) {
      if (this.options.strict) {
        throw new MarkerResolutionError(`Marker not found: ${marker.path}`);
      }
      value = '';
    }

    // Apply formatter if present
    if (marker.formatter) {
      value = this.applyFormatter(value, marker.formatter);
    }

    // Escape HTML if enabled
    if (this.options.escapeHtml && typeof value === 'string') {
      value = this.escapeHtml(value);
    }

    // Convert to string
    const result = String(value);

    // Cache result
    if (this.options.cacheResults) {
      this.cache.set(marker.raw, result);
    }

    return result;
  }

  /**
   * Apply formatter to value
   * 
   * @param {any} value
   * @param {string} formatterStr - "format:DD/MM/YYYY" or "uppercase"
   * @returns {string}
   */
  applyFormatter(value, formatterStr) {
    const [name, ...args] = formatterStr.split(':').map(s => s.trim());
    
    const formatter = this.formatters.get(name);
    if (!formatter) {
      throw new Error(`Formatter not found: ${name}`);
    }

    return formatter(value, ...args);
  }

  /**
   * Validate template markers
   * 
   * @param {string} template
   * @returns {ValidationResult}
   */
  validate(template) {
    const markers = this.parseMarkers(template);
    const errors = [];
    const warnings = [];

    for (const marker of markers) {
      // Check if marker exists in context
      if (!this.context.has(marker.path)) {
        errors.push({
          marker: marker.raw,
          message: `Marker not found in context: ${marker.path}`,
          suggestion: this.suggestCorrection(marker.path)
        });
      }

      // Validate formatter
      if (marker.formatter) {
        const [name] = marker.formatter.split(':');
        if (!this.formatters.has(name)) {
          errors.push({
            marker: marker.raw,
            message: `Unknown formatter: ${name}`,
            availableFormatters: this.formatters.list()
          });
        }
      }

      // Check nesting depth
      const depth = marker.path.split('.').length;
      if (depth > this.options.maxDepth) {
        warnings.push({
          marker: marker.raw,
          message: `Nesting depth ${depth} exceeds recommended maximum ${this.options.maxDepth}`
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      markerCount: markers.length
    };
  }

  /**
   * Generate preview with mock data
   * 
   * @param {string} template
   * @param {object} mockData
   * @returns {string}
   */
  preview(template, mockData = {}) {
    const previewContext = new MarkerContext({
      ...this.getDefaultMockData(),
      ...mockData
    });

    const previewResolver = new MarkerResolver(previewContext, {
      ...this.options,
      strict: false  // Don't throw on missing markers in preview
    });

    return previewResolver.resolve(template);
  }

  /**
   * Get default mock data for preview
   */
  getDefaultMockData() {
    return {
      person: {
        firstName: 'Mario',
        lastName: 'Rossi',
        fullName: 'Mario Rossi',
        email: 'mario.rossi@example.com',
        fiscalCode: 'RSSMRA80A01H501U',
        phone: '+39 333 1234567',
        birthDate: '01/01/1980',
        birthPlace: 'Roma (RM)',
        company: {
          name: 'Acme SpA',
          vatNumber: 'IT12345678901'
        }
      },
      course: {
        title: 'Corso Antincendio Rischio Alto',
        code: 'ANT-RA-2025',
        duration: '16 ore',
        category: 'Sicurezza',
        riskLevel: 'Alto',
        validityYears: 3
      },
      schedule: {
        startDate: '15/01/2025',
        endDate: '22/01/2025',
        location: 'Aula Formazione - Milano',
        deliveryMode: 'In presenza',
        maxParticipants: 15
      },
      trainer: {
        fullName: 'Prof. Marco Neri',
        email: 'marco.neri@example.com'
      },
      company: {
        name: 'Element Medica Srl',
        vatNumber: 'IT98765432109',
        address: 'Via Milano 10, 20121 Milano (MI)'
      },
      system: {
        currentDate: '04/11/2025',
        currentYear: '2025',
        progressiveNumber: '123',
        documentNumber: 'ATT-123/2025'
      }
    };
  }

  /**
   * Suggest correction for typo in marker path
   */
  suggestCorrection(path) {
    const availablePaths = this.context.getAllPaths();
    
    // Simple Levenshtein distance for suggestions
    const suggestions = availablePaths
      .map(availPath => ({
        path: availPath,
        distance: this.levenshteinDistance(path, availPath)
      }))
      .filter(s => s.distance <= 3)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(s => s.path);

    return suggestions.length > 0 ? suggestions : null;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(str) {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, char => escapeMap[char]);
  }

  /**
   * Levenshtein distance for typo suggestions
   */
  levenshteinDistance(a, b) {
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }

  /**
   * Detect marker type (simple, conditional, loop)
   */
  detectMarkerType(path) {
    if (path.startsWith('#if ')) return 'conditional';
    if (path.startsWith('#each ')) return 'loop';
    if (path.startsWith('#unless ')) return 'negative-conditional';
    return 'simple';
  }
}

/**
 * Marker Context
 * 
 * Manages data context for marker resolution
 */
class MarkerContext {
  constructor(data) {
    this.data = data;
  }

  /**
   * Get value by path (supports nested properties)
   * 
   * @example
   * context.get('person.company.name')
   * // Returns: data.person.company.name
   */
  get(path) {
    const parts = path.split('.');
    let value = this.data;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * Check if path exists
   */
  has(path) {
    return this.get(path) !== undefined;
  }

  /**
   * Set value by path
   */
  set(path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    let target = this.data;

    for (const part of parts) {
      if (!target[part]) {
        target[part] = {};
      }
      target = target[part];
    }

    target[last] = value;
  }

  /**
   * Get all available paths in context
   */
  getAllPaths(obj = this.data, prefix = '') {
    const paths = [];

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      paths.push(path);

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        paths.push(...this.getAllPaths(value, path));
      }
    }

    return paths;
  }
}

/**
 * Formatter Registry
 * 
 * Manages available formatters for marker values
 */
class FormatterRegistry {
  constructor() {
    this.formatters = new Map();
    this.registerDefaultFormatters();
  }

  /**
   * Register default formatters
   */
  registerDefaultFormatters() {
    // Date formatters
    this.register('date', (value, pattern = 'DD/MM/YYYY') => {
      const date = new Date(value);
      if (isNaN(date)) return value;

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();

      return pattern
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year);
    });

    // Currency formatters
    this.register('currency', (value, format = '€ 0,0.00') => {
      const num = parseFloat(value);
      if (isNaN(num)) return value;

      return format.replace('0,0.00', num.toLocaleString('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }));
    });

    // Number formatters
    this.register('number', (value, format = '0,0') => {
      const num = parseFloat(value);
      if (isNaN(num)) return value;

      const decimals = (format.match(/\.0+/) || [''])[0].length - 1;
      return num.toLocaleString('it-IT', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    });

    // String formatters
    this.register('uppercase', value => String(value).toUpperCase());
    this.register('lowercase', value => String(value).toLowerCase());
    this.register('capitalize', value => {
      const str = String(value);
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });

    // Array formatters
    this.register('join', (value, separator = ', ') => {
      if (!Array.isArray(value)) return value;
      return value.join(separator);
    });

    this.register('count', value => {
      if (Array.isArray(value)) return value.length;
      if (typeof value === 'object') return Object.keys(value).length;
      return 0;
    });
  }

  /**
   * Register custom formatter
   */
  register(name, fn) {
    if (typeof fn !== 'function') {
      throw new Error('Formatter must be a function');
    }
    this.formatters.set(name, fn);
  }

  /**
   * Get formatter by name
   */
  get(name) {
    return this.formatters.get(name);
  }

  /**
   * Check if formatter exists
   */
  has(name) {
    return this.formatters.has(name);
  }

  /**
   * List all available formatters
   */
  list() {
    return Array.from(this.formatters.keys());
  }
}

/**
 * Custom error for marker resolution failures
 */
class MarkerResolutionError extends Error {
  constructor(message, marker = null) {
    super(message);
    this.name = 'MarkerResolutionError';
    this.marker = marker;
  }
}

// Export
export { MarkerResolver, MarkerContext, FormatterRegistry, MarkerResolutionError };
```

### Usage Examples

```javascript
// Example 1: Basic marker resolution
const resolver = new MarkerResolver({
  person: { firstName: 'Mario', lastName: 'Rossi' },
  course: { title: 'Corso Antincendio' }
});

const result = resolver.resolve('{{person.firstName}} {{person.lastName}} - {{course.title}}');
// Output: "Mario Rossi - Corso Antincendio"

// Example 2: With formatters
const template = 'Data: {{schedule.startDate|date:DD/MM/YYYY}}, Prezzo: {{course.price|currency:€ 0,0.00}}';
const result = resolver.resolve(template);
// Output: "Data: 15/01/2025, Prezzo: € 1.234,56"

// Example 3: Validation
const validation = resolver.validate('{{person.firstName}} {{person.invalidField}}');
console.log(validation);
// {
//   valid: false,
//   errors: [
//     {
//       marker: '{{person.invalidField}}',
//       message: 'Marker not found in context: person.invalidField',
//       suggestion: ['person.firstName', 'person.lastName']
//     }
//   ]
// }

// Example 4: Preview with mock data
const preview = resolver.preview('Gentile {{person.fullName}}, corso: {{course.title}}');
// Output: "Gentile Mario Rossi, corso: Corso Antincendio Rischio Alto"
```

---

## 🔄 Template Processing Pipeline

### Pipeline Stages

```
┌────────────────────────────────────────────────────────────────────┐
│                    TEMPLATE PROCESSING PIPELINE                     │
└────────────────────────────────────────────────────────────────────┘

1. INPUT VALIDATION
   ├─ Check template exists
   ├─ Validate template format
   ├─ Check user permissions
   └─ Multi-tenant isolation
       │
       ▼
2. MARKER PARSING
   ├─ Parse Handlebars-like markers
   ├─ Identify marker types
   ├─ Extract formatters
   └─ Build marker tree
       │
       ▼
3. CONTEXT BUILDING
   ├─ Load entities from DB (Prisma)
   │  ├─ Person (if participant/trainer)
   │  ├─ CourseSchedule
   │  ├─ Course
   │  ├─ Company
   │  └─ Sessions
   ├─ Build nested context object
   ├─ Add computed values
   └─ Add system values (date, numbers)
       │
       ▼
4. MARKER RESOLUTION
   ├─ For each marker:
   │  ├─ Resolve value from context
   │  ├─ Apply formatter (if any)
   │  ├─ Handle conditionals
   │  ├─ Process loops
   │  └─ Escape HTML
   └─ Replace marker with resolved value
       │
       ▼
5. TEMPLATE RENDERING
   ├─ Apply header/footer
   ├─ Insert logo (if present)
   ├─ Apply styles/CSS
   └─ Generate final HTML
       │
       ▼
6. PDF GENERATION
   ├─ HTML → PDF (Puppeteer)
   ├─ Page settings (A4, margins)
   ├─ Header/footer injection
   └─ Watermark (if draft)
       │
       ▼
7. STORAGE & METADATA
   ├─ Save PDF to file system/S3
   ├─ Generate filename
   ├─ Calculate file hash
   ├─ Save metadata to DB
   └─ Create audit log entry
       │
       ▼
8. DELIVERY
   ├─ Return download URL
   ├─ Send email (optional)
   └─ Trigger webhooks (optional)
```

### Error Handling Strategy

```typescript
try {
  // Stage 1: Validation
  validateTemplate(template);
  
  // Stage 2-4: Processing
  const html = processTemplate(template, context);
  
  // Stage 5-6: Generation
  const pdf = await generatePDF(html);
  
  // Stage 7-8: Storage & Delivery
  const document = await saveDocument(pdf);
  
  return document;
  
} catch (error) {
  if (error instanceof ValidationError) {
    // User error: return 400 with details
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details
    });
  } else if (error instanceof MarkerResolutionError) {
    // Template error: return 422 with marker info
    return res.status(422).json({
      error: 'Marker resolution failed',
      marker: error.marker,
      suggestion: error.suggestion
    });
  } else if (error instanceof PDFGenerationError) {
    // System error: retry or fallback
    logger.error('PDF generation failed', error);
    return res.status(500).json({
      error: 'Document generation failed',
      retryable: true
    });
  } else {
    // Unknown error: log and return generic error
    logger.error('Unknown error in template processing', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}
```

---

## 📄 Document Generation Flow

### Sequence Diagram - Single Document

```
User          Frontend       API Server    MarkerResolver   PDFGenerator   Database    FileStorage
 │                │              │                │               │             │            │
 │  Click "Genera │              │                │               │             │            │
 │   Attestato"   │              │                │               │             │            │
 ├───────────────>│              │                │               │             │            │
 │                │              │                │               │             │            │
 │                │ POST         │                │               │             │            │
 │                │ /api/        │                │               │             │            │
 │                │  documents/  │                │               │             │            │
 │                │   generate   │                │               │             │            │
 │                ├─────────────>│                │               │             │            │
 │                │              │                │               │             │            │
 │                │              │ Validate       │               │             │            │
 │                │              │ request        │               │             │            │
 │                │              │────────┐       │               │             │            │
 │                │              │        │       │               │             │            │
 │                │              │<───────┘       │               │             │            │
 │                │              │                │               │             │            │
 │                │              │ Load entities  │               │             │            │
 │                │              ├───────────────────────────────────────────>│            │
 │                │              │                │               │             │            │
 │                │              │<───────────────────────────────────────────┤            │
 │                │              │ Schedule +     │               │             │            │
 │                │              │ relations      │               │             │            │
 │                │              │                │               │             │            │
 │                │              │ Load template  │               │             │            │
 │                │              ├───────────────────────────────────────────>│            │
 │                │              │                │               │             │            │
 │                │              │<───────────────────────────────────────────┤            │
 │                │              │ Template       │               │             │            │
 │                │              │                │               │             │            │
 │                │              │ Resolve        │               │             │            │
 │                │              │ markers        │               │             │            │
 │                │              ├───────────────>│               │             │            │
 │                │              │                │               │             │            │
 │                │              │                │ Parse markers │             │            │
 │                │              │                │──────┐        │             │            │
 │                │              │                │      │        │             │            │
 │                │              │                │<─────┘        │             │            │
 │                │              │                │               │             │            │
 │                │              │                │ Resolve from  │             │            │
 │                │              │                │ context       │             │            │
 │                │              │                │──────┐        │             │            │
 │                │              │                │      │        │             │            │
 │                │              │                │<─────┘        │             │            │
 │                │              │                │               │             │            │
 │                │              │<───────────────┤               │             │            │
 │                │              │ HTML with data │               │             │            │
 │                │              │                │               │             │            │
 │                │              │ Generate PDF   │               │             │            │
 │                │              ├───────────────────────────────>│             │            │
 │                │              │                │               │             │            │
 │                │              │                │               │ HTML→PDF    │            │
 │                │              │                │               │────────┐    │            │
 │                │              │                │               │        │    │            │
 │                │              │                │               │<───────┘    │            │
 │                │              │                │               │             │            │
 │                │              │<───────────────────────────────┤             │            │
 │                │              │ PDF Buffer     │               │             │            │
 │                │              │                │               │             │            │
 │                │              │ Save file      │               │             │            │
 │                │              ├───────────────────────────────────────────────────────>│
 │                │              │                │               │             │            │
 │                │              │<───────────────────────────────────────────────────────┤
 │                │              │ File URL       │               │             │            │
 │                │              │                │               │             │            │
 │                │              │ Save metadata  │               │             │            │
 │                │              ├───────────────────────────────────────────>│            │
 │                │              │                │               │             │            │
 │                │              │<───────────────────────────────────────────┤            │
 │                │              │ Document ID    │               │             │            │
 │                │              │                │               │             │            │
 │                │ Response     │                │               │             │            │
 │                │<─────────────┤                │               │             │            │
 │                │ {url, id}    │                │               │             │            │
 │                │              │                │               │             │            │
 │  Download PDF  │              │                │               │             │            │
 │<───────────────┤              │                │               │             │            │
 │                │              │                │               │             │            │
```

### Batch Generation Flow

```
User          Frontend       API Server     Queue       Worker1     Worker2     Database
 │                │              │            │            │           │            │
 │  Select 50     │              │            │            │           │            │
 │  participants  │              │            │            │           │            │
 ├───────────────>│              │            │            │           │            │
 │                │              │            │            │           │            │
 │                │ POST         │            │            │           │            │
 │                │ /api/        │            │            │           │            │
 │                │  documents/  │            │            │           │            │
 │                │   batch      │            │            │           │            │
 │                ├─────────────>│            │            │           │            │
 │                │              │            │            │           │            │
 │                │              │ Create job │            │           │            │
 │                │              ├───────────>│            │           │            │
 │                │              │            │            │           │            │
 │                │              │ Job ID     │            │           │            │
 │                │              │<───────────┤            │           │            │
 │                │              │            │            │           │            │
 │                │ Response     │            │            │           │            │
 │                │<─────────────┤            │            │           │            │
 │                │ {jobId}      │            │            │           │            │
 │                │              │            │            │           │            │
 │  Poll status   │              │            │            │           │            │
 │  every 2s      │              │            │            │           │            │
 ├───────────────>│              │            │            │           │            │
 │                │              │            │            │           │            │
 │                │              │            │ Process    │           │            │
 │                │              │            │ job (25    │           │            │
 │                │              │            │ docs)      │           │            │
 │                │              │            ├───────────>│           │            │
 │                │              │            │            │           │            │
 │                │              │            │            │ Process   │            │
 │                │              │            │            │ job (25   │            │
 │                │              │            │            │ docs)     │            │
 │                │              │            ├───────────────────────>│            │
 │                │              │            │            │           │            │
 │                │              │            │            │ Generate  │            │
 │                │              │            │            │ PDFs      │            │
 │                │              │            │            │──────┐    │            │
 │                │              │            │            │      │    │            │
 │                │              │            │            │<─────┘    │            │
 │                │              │            │            │           │            │
 │                │              │            │            │           │ Generate   │
 │                │              │            │            │           │ PDFs       │
 │                │              │            │            │           │──────┐     │
 │                │              │            │            │           │      │     │
 │                │              │            │            │           │<─────┘     │
 │                │              │            │            │           │            │
 │                │              │            │            │ Save      │            │
 │                │              │            │            │ metadata  │            │
 │                │              │            │            ├───────────────────────>│
 │                │              │            │            │           │            │
 │                │              │            │            │           │ Save       │
 │                │              │            │            │           │ metadata   │
 │                │              │            │            │           ├───────────>│
 │                │              │            │            │           │            │
 │                │              │            │ Complete   │           │            │
 │                │              │            │<───────────┤           │            │
 │                │              │            │            │           │            │
 │                │              │            │            │           │ Complete   │
 │                │              │            │<───────────────────────┤            │
 │                │              │            │            │           │            │
 │                │              │ Job        │            │           │            │
 │                │              │ completed  │            │           │            │
 │                │              │<───────────┤            │           │            │
 │                │              │            │            │           │            │
 │                │ Status:      │            │            │           │            │
 │                │ Completed    │            │            │           │            │
 │<───────────────┤              │            │            │           │            │
 │  50/50 done    │              │            │            │           │            │
 │                │              │            │            │           │            │
 │  Download ZIP  │              │            │            │           │            │
 │<───────────────┤              │            │            │           │            │
 │                │              │            │            │           │            │
```

---

## 🗄️ Database Architecture

### Enhanced Schema Design

#### Enums (Nuovi)

```prisma
// Template Type Enum
enum TemplateType {
  LETTER_OF_ENGAGEMENT    // Lettera di Incarico
  ATTENDANCE_REGISTER     // Registro Presenze
  CERTIFICATE            // Attestato
  INVOICE                // Fattura
  COURSE_PROGRAM         // Programma Corso
  CUSTOM                 // Template personalizzato
}

// Template Format Enum
enum TemplateFormat {
  HTML              // HTML con CSS inline
  DOCX              // Microsoft Word
  GOOGLE_DOCS       // Google Docs (import)
  GOOGLE_SLIDES     // Google Slides (import)
}

// Document Status Enum
enum DocumentStatus {
  DRAFT             // Bozza
  GENERATED         // Generato
  SENT              // Inviato
  ARCHIVED          // Archiviato
}
```

#### Enhanced TemplateLink Model

```prisma
model TemplateLink {
  id                String              @id @default(uuid())
  name              String              // Nome template
  type              TemplateType        // Tipo documento (ENUM)
  fileFormat        TemplateFormat?     // Formato file (ENUM)
  
  // Content fields
  content           String?             @db.Text  // Contenuto HTML/testo
  header            String?             @db.Text  // Header del documento
  footer            String?             @db.Text  // Footer del documento
  
  // Layout & Styling
  styles            Json?               // CSS configuration
  layout            Json?               // Page layout settings
  logoImage         String?             // Logo URL/path
  logoPosition      String?             // Logo position
  
  // Marker configuration
  markers           Json?               // Available markers definition
  markerSchema      Json?               // Validation schema per markers
  
  // Versioning
  version           Int                 @default(1)
  isActive          Boolean             @default(true)
  isDefault         Boolean             @default(false)
  
  // Google Integration
  googleDocsUrl     String?             // Google Docs URL
  lastSyncedAt      DateTime?           // Last sync with Google
  syncEnabled       Boolean             @default(false)
  
  // Metadata
  description       String?
  category          String?
  tags              String[]            @default([])
  
  // Multi-tenant & Audit
  companyId         String?             // Null = template globale
  tenantId          String
  createdBy         String?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  deletedAt         DateTime?           // Soft delete
  
  // Relations
  company           Company?            @relation(fields: [companyId], references: [id])
  tenant            Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  creator           Person?             @relation("TemplateCreator", fields: [createdBy], references: [id])
  
  versions          TemplateVersion[]
  generatedDocs     GeneratedDocument[]
  
  @@index([tenantId])
  @@index([tenantId, type])
  @@index([tenantId, type, isActive])
  @@index([companyId])
  @@index([isDefault, type])
  @@index([deletedAt])
}
```

#### New TemplateVersion Model

```prisma
model TemplateVersion {
  id              String        @id @default(uuid())
  templateId      String
  version         Int           // Version number (1, 2, 3...)
  
  // Snapshot of content at this version
  content         String        @db.Text
  header          String?       @db.Text
  footer          String?       @db.Text
  styles          Json?
  layout          Json?
  markers         Json?
  
  // Change tracking
  changesSummary  String?       // "Aggiornato header, modificati 3 markers"
  changeDetails   Json?         // Detailed diff
  
  // Metadata
  createdBy       String
  createdAt       DateTime      @default(now())
  tenantId        String
  
  // Relations
  template        TemplateLink  @relation(fields: [templateId], references: [id], onDelete: Cascade)
  creator         Person        @relation("VersionCreator", fields: [createdBy], references: [id])
  tenant          Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([templateId, version])
  @@index([templateId, createdAt])
  @@index([tenantId])
}
```

#### New GeneratedDocument Model

```prisma
model GeneratedDocument {
  id              String          @id @default(uuid())
  
  // Template reference
  templateId      String
  templateVersion Int             // Version usata per generazione
  type            TemplateType
  
  // Entity reference (cosa è stato generato)
  entityType      String          // "schedule", "person", "enrollment"
  entityId        String          // ID dell'entità
  
  // File info
  filename        String
  filepath        String          // Path relativo o S3 key
  fileUrl         String          // URL pubblico
  fileSize        Int             // Bytes
  fileHash        String?         // SHA-256 per integrità
  mimeType        String          @default("application/pdf")
  
  // Generation context
  markers         Json            // Actual data used for generation
  metadata        Json?           // Additional metadata
  status          DocumentStatus  @default(GENERATED)
  
  // Batch reference
  batchId         String?         // Null se singolo
  batchSize       Int?            // Total docs in batch
  batchIndex      Int?            // Position in batch (1, 2, 3...)
  
  // Delivery
  sentAt          DateTime?
  sentTo          String?         // Email addresses
  downloadCount   Int             @default(0)
  lastDownloadAt  DateTime?
  
  // Audit
  generatedBy     String
  generatedAt     DateTime        @default(now())
  tenantId        String
  deletedAt       DateTime?
  
  // Relations
  template        TemplateLink    @relation(fields: [templateId], references: [id])
  generator       Person          @relation("DocumentGenerator", fields: [generatedBy], references: [id])
  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([templateId])
  @@index([entityType, entityId])
  @@index([tenantId, createdAt])
  @@index([generatedBy])
  @@index([batchId])
  @@index([status])
  @@index([type, status])
}
```

#### Enhanced Existing Models

**Attestato** (enhanced):
```prisma
model Attestato {
  id                String         @id @default(uuid())
  
  // Template reference (NEW)
  templateId        String?
  templateVersion   Int?
  
  // Existing fields
  personId          String
  scheduledCourseId String
  fileName          String
  fileUrl           String
  fileSize          Int?           // NEW
  
  // Progressive numbering
  annoProgressivo   Int
  numeroProgressivo Int
  
  // Generation metadata (NEW)
  markers           Json?          // Data used for generation
  generatedBy       String?        // User who generated
  generatedAt       DateTime       @default(now())
  
  // Audit
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  deletedAt         DateTime?
  tenantId          String
  
  // Relations
  template          TemplateLink?  @relation(fields: [templateId], references: [id])
  person            Person         @relation(fields: [personId], references: [id], onDelete: Cascade)
  scheduledCourse   CourseSchedule @relation(fields: [scheduledCourseId], references: [id], onDelete: Cascade)
  tenant            Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([templateId])
  @@index([personId])
  @@index([scheduledCourseId])
  @@index([tenantId])
}
```

**LetteraIncarico** (enhanced):
```prisma
model LetteraIncarico {
  id                String         @id @default(uuid())
  
  // Template reference (NEW)
  templateId        String?
  templateVersion   Int?
  
  // Existing fields
  scheduledCourseId String
  trainerId         String
  nomeFile          String
  url               String
  fileSize          Int?           // NEW
  
  // Progressive numbering
  numeroProgressivo Int
  annoProgressivo   Int
  
  // Generation metadata (NEW)
  markers           Json?
  generatedBy       String?
  dataGenerazione   DateTime       @default(now())
  
  // Audit
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  deletedAt         DateTime?
  tenantId          String
  
  // Relations
  template          TemplateLink?  @relation(fields: [templateId], references: [id])
  scheduledCourse   CourseSchedule @relation(fields: [scheduledCourseId], references: [id], onDelete: Cascade)
  trainer           Person         @relation(fields: [trainerId], references: [id], onDelete: Cascade)
  tenant            Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([scheduledCourseId, trainerId])
  @@index([templateId])
  @@index([scheduledCourseId])
  @@index([trainerId])
  @@index([tenantId])
}
```

**RegistroPresenze** (enhanced):
```prisma
model RegistroPresenze {
  id                String                         @id @default(uuid())
  
  // Template reference (NEW)
  templateId        String?
  templateVersion   Int?
  
  // Existing fields
  scheduledCourseId String
  sessionId         String
  formatoreId       String
  nomeFile          String
  url               String
  fileSize          Int?                           // NEW
  
  // Progressive numbering
  numeroProgressivo Int
  annoProgressivo   Int
  
  // Generation metadata (NEW)
  markers           Json?
  generatedBy       String?
  dataGenerazione   DateTime                       @default(now())
  
  // Audit
  createdAt         DateTime                       @default(now())
  updatedAt         DateTime                       @updatedAt
  deletedAt         DateTime?
  tenantId          String
  
  // Relations
  template          TemplateLink?                  @relation(fields: [templateId], references: [id])
  scheduledCourse   CourseSchedule                 @relation(fields: [scheduledCourseId], references: [id], onDelete: Cascade)
  session           CourseSession                  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  formatore         Person                         @relation(fields: [formatoreId], references: [id], onDelete: Cascade)
  tenant            Tenant                         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  presenti          RegistroPresenzePartecipante[]
  
  @@index([templateId])
  @@index([scheduledCourseId])
  @@index([sessionId])
  @@index([formatoreId])
  @@index([tenantId])
}
```

### Database Indexes Strategy

```prisma
// Performance indexes per query comuni

// 1. Template lookup by type and tenant
@@index([tenantId, type, isActive])

// 2. Document history per entity
@@index([entityType, entityId, createdAt])

// 3. Batch document retrieval
@@index([batchId, batchIndex])

// 4. User's generated documents
@@index([generatedBy, createdAt])

// 5. Template usage analytics
@@index([templateId, generatedAt])

// 6. Active templates only
@@index([isActive, deletedAt])
```

---

## 🌐 API Architecture

### API Structure Overview

```
/api
├── /templates                    # Template CRUD
│   ├── GET    /                 # List templates
│   ├── POST   /                 # Create template
│   ├── GET    /:id              # Get template
│   ├── PUT    /:id              # Update template
│   ├── DELETE /:id              # Delete template
│   ├── POST   /:id/validate     # Validate markers
│   ├── POST   /:id/preview      # Preview with mock data
│   ├── GET    /:id/versions     # Version history
│   ├── POST   /:id/rollback     # Rollback to version
│   └── /import
│       └── POST /google         # Import from Google Docs
│
├── /documents                    # Document generation
│   ├── POST   /generate         # Generate single document
│   ├── POST   /batch            # Batch generation (queue)
│   ├── POST   /preview          # Preview before generation
│   ├── GET    /:id              # Get document
│   ├── GET    /:id/download     # Download document
│   ├── DELETE /:id              # Delete document
│   ├── GET    /history/:entityId # Document history
│   └── /jobs
│       ├── GET /:jobId          # Job status
│       └── GET /:jobId/progress # Real-time progress
│
├── /markers                      # Marker utilities
│   ├── GET    /available/:type  # Available markers per type
│   ├── POST   /resolve          # Resolve markers with data
│   └── GET    /formatters       # Available formatters
│
├── /lettere-incarico            # Lettere Incarico API
│   ├── POST   /genera           # Generate letter
│   ├── GET    /:scheduleId      # List letters for schedule
│   ├── GET    /:id              # Get letter
│   └── DELETE /:id              # Delete letter
│
├── /registri-presenze           # Registri Presenze API
│   ├── POST   /genera           # Generate register
│   ├── GET    /:sessionId       # Get register for session
│   ├── POST   /:id/presenze     # Update attendance
│   └── DELETE /:id              # Delete register
│
└── /attestati                   # Attestati API
    ├── POST   /genera           # Generate certificates
    ├── POST   /batch            # Batch generation
    ├── GET    /:scheduleId      # List certificates for schedule
    ├── GET    /:id              # Get certificate
    └── DELETE /:id              # Delete certificate
```

### Middleware Stack

```typescript
// Standard middleware stack per route
[
  authenticateToken(),           // JWT verification
  requirePermission('action'),   // RBAC check
  tenantIsolation(),             // Multi-tenant filter
  validateRequest(),             // Input validation
  rateLimiter(),                 // Rate limiting
  routeHandler()                 // Actual logic
]
```

### Authentication & Authorization

```typescript
/**
 * Permission matrix per template system
 */
const TEMPLATE_PERMISSIONS = {
  // Template management
  'create:templates': ['ADMIN'],
  'read:templates': ['ADMIN', 'MANAGER', 'TRAINER'],
  'update:templates': ['ADMIN'],
  'delete:templates': ['ADMIN'],
  
  // Document generation
  'generate:documents': ['ADMIN', 'MANAGER', 'TRAINER'],
  'read:documents': ['ADMIN', 'MANAGER', 'TRAINER', 'EMPLOYEE'],
  'delete:documents': ['ADMIN', 'MANAGER'],
  
  // Batch operations
  'batch:documents': ['ADMIN', 'MANAGER'],
  
  // Google integration
  'import:google': ['ADMIN'],
};

/**
 * Middleware per permission check
 */
function requirePermission(permission) {
  return (req, res, next) => {
    const userRole = req.user.role;
    const allowedRoles = TEMPLATE_PERMISSIONS[permission];
    
    if (!allowedRoles || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Permission ${permission} required`
      });
    }
    
    next();
  };
}
```

### Request/Response Schemas

#### POST /api/templates

**Request**:
```json
{
  "name": "Attestato Antincendio",
  "type": "CERTIFICATE",
  "fileFormat": "HTML",
  "content": "<html>...</html>",
  "header": "<div>Header</div>",
  "footer": "<div>Footer</div>",
  "styles": {
    "fontSize": "12px",
    "fontFamily": "Arial"
  },
  "layout": {
    "pageSize": "A4",
    "orientation": "portrait",
    "margins": { "top": 20, "right": 20, "bottom": 20, "left": 20 }
  },
  "markers": [
    { "key": "participant.fullName", "label": "Nome Completo", "type": "string" },
    { "key": "course.title", "label": "Titolo Corso", "type": "string" }
  ],
  "isDefault": false,
  "companyId": null
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "name": "Attestato Antincendio",
  "type": "CERTIFICATE",
  "version": 1,
  "isActive": true,
  "createdAt": "2025-11-04T10:30:00Z",
  "createdBy": {
    "id": "user-uuid",
    "fullName": "Mario Rossi"
  }
}
```

#### POST /api/documents/generate

**Request**:
```json
{
  "templateId": "template-uuid",
  "entityType": "schedule",
  "entityId": "schedule-uuid",
  "options": {
    "personId": "person-uuid",
    "includeHeader": true,
    "includeFooter": true,
    "watermark": false
  }
}
```

**Response** (202 Accepted):
```json
{
  "documentId": "doc-uuid",
  "status": "GENERATED",
  "fileUrl": "/uploads/documents/attestato-001-2025.pdf",
  "filename": "attestato-001-2025.pdf",
  "fileSize": 245678,
  "generatedAt": "2025-11-04T10:35:00Z"
}
```

#### POST /api/documents/batch

**Request**:
```json
{
  "templateId": "template-uuid",
  "entityType": "schedule",
  "entityId": "schedule-uuid",
  "personIds": ["person-1", "person-2", "person-3"],
  "options": {
    "sendEmail": false,
    "zipDownload": true
  }
}
```

**Response** (202 Accepted):
```json
{
  "jobId": "job-uuid",
  "status": "PENDING",
  "totalDocuments": 3,
  "estimatedTime": "15 seconds",
  "statusUrl": "/api/documents/jobs/job-uuid"
}
```

#### GET /api/documents/jobs/:jobId

**Response** (200 OK):
```json
{
  "jobId": "job-uuid",
  "status": "PROCESSING",
  "progress": {
    "current": 45,
    "total": 50,
    "percentage": 90
  },
  "documents": [
    {
      "documentId": "doc-1",
      "status": "COMPLETED",
      "filename": "attestato-001-2025.pdf"
    },
    {
      "documentId": "doc-2",
      "status": "PROCESSING"
    }
  ],
  "startedAt": "2025-11-04T10:30:00Z",
  "estimatedCompletion": "2025-11-04T10:31:00Z"
}
```

### Error Response Format

```json
{
  "error": "ValidationError",
  "message": "Invalid template markers",
  "details": [
    {
      "field": "markers",
      "marker": "{{invalid.marker}}",
      "message": "Marker not found in context",
      "suggestion": ["participant.fullName", "participant.firstName"]
    }
  ],
  "code": "MARKER_NOT_FOUND",
  "timestamp": "2025-11-04T10:30:00Z"
}
```

---

## 🎨 Frontend Architecture

### Component Structure

```
src/
├── pages/
│   └── settings/
│       ├── TemplateEditor.tsx           # Template CRUD (enhanced)
│       ├── TemplateList.tsx             # Template list with filters
│       └── DocumentHistory.tsx          # Document history viewer
│
├── components/
│   └── templates/
│       ├── Editor/
│       │   ├── TiptapEditor.tsx         # Rich text editor
│       │   ├── MarkerPicker.tsx         # Marker autocomplete
│       │   ├── ToolbarCustom.tsx        # Editor toolbar
│       │   └── PreviewPane.tsx          # Real-time preview
│       │
│       ├── Generation/
│       │   ├── GenerateModal.tsx        # Single generation modal
│       │   ├── BatchGenerateModal.tsx   # Batch generation modal
│       │   ├── ProgressTracker.tsx      # Job progress display
│       │   └── DocumentPreview.tsx      # Preview before generate
│       │
│       ├── Markers/
│       │   ├── MarkerList.tsx           # Available markers list
│       │   ├── MarkerDetails.tsx        # Marker documentation
│       │   └── FormatterHelper.tsx      # Formatter reference
│       │
│       └── History/
│           ├── VersionHistory.tsx       # Template versions
│           ├── DocumentList.tsx         # Generated documents list
│           └── AuditLog.tsx             # Audit trail
│
├── services/
│   ├── templateService.ts               # Template API client
│   ├── documentService.ts               # Document API client
│   ├── markerService.ts                 # Marker utilities
│   └── jobService.ts                    # Job polling service
│
└── hooks/
    ├── useTemplate.ts                   # Template CRUD hook
    ├── useDocumentGeneration.ts         # Document generation hook
    ├── useJobStatus.ts                  # Job status polling hook
    └── useMarkers.ts                    # Marker resolution hook
```

### State Management Pattern

```typescript
/**
 * Template Editor State
 */
interface TemplateEditorState {
  // Template data
  template: Template | null;
  isDirty: boolean;
  isSaving: boolean;
  
  // Editor state
  content: string;
  cursorPosition: number;
  
  // Preview
  previewMode: 'edit' | 'preview' | 'split';
  previewData: any;
  
  // Validation
  errors: ValidationError[];
  warnings: ValidationWarning[];
  
  // History
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Document Generation State
 */
interface DocumentGenerationState {
  // Generation config
  templateId: string;
  entityId: string;
  options: GenerationOptions;
  
  // Status
  status: 'idle' | 'generating' | 'success' | 'error';
  progress: number;
  
  // Results
  documentId?: string;
  documentUrl?: string;
  error?: string;
}
```

### TipTap Editor Configuration

```typescript
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import { MarkerExtension } from './extensions/MarkerExtension';

const editor = useEditor({
  extensions: [
    StarterKit,
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,
    Image.configure({
      inline: true,
      allowBase64: true,
    }),
    MarkerExtension.configure({
      suggestion: {
        items: ({ query }) => {
          return availableMarkers.filter(marker =>
            marker.key.toLowerCase().includes(query.toLowerCase())
          );
        },
        render: () => {
          // Custom suggestion dropdown
          return MarkerSuggestionList;
        },
      },
    }),
  ],
  content: initialContent,
  onUpdate: ({ editor }) => {
    setContent(editor.getHTML());
    setIsDirty(true);
  },
});
```

### Marker Picker Component

```typescript
/**
 * Marker Picker with Autocomplete
 */
function MarkerPicker({ onSelect }: MarkerPickerProps) {
  const [query, setQuery] = useState('');
  const { data: markers } = useMarkers(templateType);
  
  const filteredMarkers = markers?.filter(marker =>
    marker.key.toLowerCase().includes(query.toLowerCase()) ||
    marker.label.toLowerCase().includes(query.toLowerCase())
  );
  
  return (
    <Combobox value={selected} onChange={onSelect}>
      <ComboboxInput
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca marker..."
      />
      <ComboboxOptions>
        {filteredMarkers?.map((marker) => (
          <ComboboxOption key={marker.key} value={marker}>
            <div className="flex items-center gap-2">
              <code className="text-sm">
                {`{{${marker.key}}}`}
              </code>
              <span className="text-gray-600">{marker.label}</span>
              <Badge>{marker.type}</Badge>
            </div>
            {marker.description && (
              <p className="text-xs text-gray-500 mt-1">
                {marker.description}
              </p>
            )}
          </ComboboxOption>
        ))}
      </ComboboxOptions>
    </Combobox>
  );
}
```

### Real-time Preview Component

```typescript
/**
 * Real-time Preview with Mock Data
 */
function PreviewPane({ template, mockData }: PreviewPaneProps) {
  const [previewHtml, setPreviewHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Debounced preview update
  const debouncedPreview = useMemo(
    () =>
      debounce(async (content: string) => {
        setIsLoading(true);
        try {
          const response = await apiPost('/api/templates/preview', {
            content,
            mockData: mockData || defaultMockData,
          });
          setPreviewHtml(response.html);
        } catch (error) {
          console.error('Preview failed:', error);
        } finally {
          setIsLoading(false);
        }
      }, 500),
    [mockData]
  );
  
  useEffect(() => {
    if (template?.content) {
      debouncedPreview(template.content);
    }
  }, [template?.content, debouncedPreview]);
  
  return (
    <div className="preview-pane">
      {isLoading && <Spinner />}
      <iframe
        srcDoc={previewHtml}
        className="w-full h-full border-0"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
```

### Batch Generation UI Flow

```typescript
/**
 * Batch Generation Modal with Progress Tracking
 */
function BatchGenerateModal({ scheduleId, templateId }: BatchGenerateModalProps) {
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const { data: jobStatus } = useJobStatus(jobId, {
    refetchInterval: jobId ? 2000 : false, // Poll every 2s
  });
  
  const handleGenerate = async () => {
    const response = await apiPost('/api/documents/batch', {
      templateId,
      entityType: 'schedule',
      entityId: scheduleId,
      personIds: selectedPersonIds,
      options: {
        sendEmail: false,
        zipDownload: true,
      },
    });
    
    setJobId(response.jobId);
  };
  
  const isComplete = jobStatus?.status === 'COMPLETED';
  const progress = jobStatus?.progress;
  
  return (
    <Modal>
      {!jobId ? (
        // Selection phase
        <ParticipantSelector
          scheduleId={scheduleId}
          selected={selectedPersonIds}
          onChange={setSelectedPersonIds}
        />
      ) : (
        // Progress phase
        <div>
          <ProgressBar
            value={progress?.current || 0}
            max={progress?.total || 100}
          />
          <p className="text-sm text-gray-600 mt-2">
            {progress?.current} di {progress?.total} documenti generati
          </p>
          
          {isComplete && (
            <Button onClick={() => downloadZip(jobId)}>
              Scarica ZIP
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}
```

---

## 🔒 Security & Multi-Tenancy

### Multi-Tenant Isolation Strategy

```typescript
/**
 * Tenant Isolation Middleware
 * 
 * Ensures all queries are scoped to user's tenant
 */
async function tenantIsolation(req, res, next) {
  const tenantId = req.user.tenantId;
  
  if (!tenantId) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'No tenant context'
    });
  }
  
  // Inject tenantId into all Prisma queries
  req.prisma = prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // Add tenantId filter to all queries
          if (!args.where) args.where = {};
          args.where.tenantId = tenantId;
          
          // Add tenantId to all creates
          if (args.data) {
            args.data.tenantId = tenantId;
          }
          
          return query(args);
        },
      },
    },
  });
  
  next();
}
```

### XSS Protection in Markers

```typescript
/**
 * HTML Escaping per marker values
 */
function escapeHtml(str: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };
  
  return str.replace(/[&<>"'\/]/g, (char) => escapeMap[char]);
}

/**
 * Safe marker resolution
 */
function resolveMarkerSafe(marker: string, context: any): string {
  const value = resolveMarker(marker, context);
  
  // Escape HTML by default
  if (typeof value === 'string') {
    return escapeHtml(value);
  }
  
  return String(value);
}
```

### File Upload Security

```typescript
/**
 * Secure file upload configuration
 */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const tenantId = req.user.tenantId;
      const uploadPath = path.join(UPLOADS_DIR, tenantId);
      
      // Create tenant-specific directory
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Generate secure filename
      const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/html',
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});
```

### GDPR Compliance

```typescript
/**
 * Audit Log per GDPR compliance
 */
interface AuditLog {
  id: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'DOWNLOAD';
  entityType: string;
  entityId: string;
  userId: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details?: any;
}

/**
 * Log document access
 */
async function logDocumentAccess(
  userId: string,
  documentId: string,
  action: 'READ' | 'DOWNLOAD'
) {
  await prisma.auditLog.create({
    data: {
      action,
      entityType: 'GeneratedDocument',
      entityId: documentId,
      userId,
      timestamp: new Date(),
      details: {
        documentType: 'CERTIFICATE',
        accessMethod: 'WEB',
      },
    },
  });
}

/**
 * Data retention policy
 */
async function applyRetentionPolicy() {
  const retentionDays = 365 * 7; // 7 years for legal documents
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  // Soft delete old documents
  await prisma.generatedDocument.updateMany({
    where: {
      createdAt: { lt: cutoffDate },
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });
}
```

---

## ⚡ Performance & Scalability

### Caching Strategy

```typescript
/**
 * Redis Cache Configuration
 */
const cacheConfig = {
  templates: {
    ttl: 3600,              // 1 hour
    keyPrefix: 'template:',
  },
  documents: {
    ttl: 86400,             // 24 hours
    keyPrefix: 'document:',
  },
  markers: {
    ttl: 1800,              // 30 minutes
    keyPrefix: 'markers:',
  },
};

/**
 * Cache middleware
 */
function cacheMiddleware(ttl: number, keyPrefix: string) {
  return async (req, res, next) => {
    const key = `${keyPrefix}${req.params.id}`;
    
    // Check cache
    const cached = await redis.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    // Override res.json to cache response
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      redis.setex(key, ttl, JSON.stringify(data));
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Cache invalidation
 */
async function invalidateTemplateCache(templateId: string) {
  const pattern = `template:${templateId}*`;
  const keys = await redis.keys(pattern);
  
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

### Queue System Architecture

```typescript
import Queue from 'bull';

/**
 * Document Generation Queue
 */
const documentQueue = new Queue('document-generation', {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,  // Keep last 100 completed jobs
    removeOnFail: 500,      // Keep last 500 failed jobs
  },
});

/**
 * Job processor
 */
documentQueue.process('single-generation', 5, async (job) => {
  const { templateId, entityId, entityType, options } = job.data;
  
  try {
    // Update progress
    job.progress(10);
    
    // Load template
    const template = await loadTemplate(templateId);
    job.progress(20);
    
    // Load entity data
    const entityData = await loadEntity(entityType, entityId);
    job.progress(40);
    
    // Resolve markers
    const html = resolveMarkers(template.content, entityData);
    job.progress(60);
    
    // Generate PDF
    const pdf = await generatePDF(html);
    job.progress(80);
    
    // Save document
    const document = await saveDocument(pdf, templateId, entityId);
    job.progress(100);
    
    return document;
  } catch (error) {
    console.error('Document generation failed:', error);
    throw error;
  }
});

/**
 * Batch generation processor
 */
documentQueue.process('batch-generation', 2, async (job) => {
  const { templateId, personIds, scheduleId } = job.data;
  const totalDocs = personIds.length;
  const results = [];
  
  for (let i = 0; i < personIds.length; i++) {
    const personId = personIds[i];
    
    try {
      // Generate single document
      const document = await generateDocument({
        templateId,
        entityType: 'schedule',
        entityId: scheduleId,
        personId,
      });
      
      results.push({ personId, status: 'success', documentId: document.id });
    } catch (error) {
      results.push({ personId, status: 'error', error: error.message });
    }
    
    // Update progress
    job.progress(Math.round(((i + 1) / totalDocs) * 100));
  }
  
  // Create ZIP if all successful
  if (results.every(r => r.status === 'success')) {
    const zipPath = await createZip(results.map(r => r.documentId));
    return { ...results, zipPath };
  }
  
  return results;
});
```

### Database Query Optimization

```typescript
/**
 * Optimized query per document generation
 * 
 * Uses Prisma's include per preload tutte le relazioni necessarie
 * in una singola query invece di N+1 queries
 */
async function loadScheduleWithRelations(scheduleId: string) {
  return await prisma.courseSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      course: {
        include: {
          category: true,
        },
      },
      trainer: {
        include: {
          company: true,
        },
      },
      company: true,
      sessions: {
        where: { deletedAt: null },
        orderBy: { startTime: 'asc' },
      },
      enrollments: {
        where: {
          status: 'COMPLETED',
          deletedAt: null,
        },
        include: {
          person: {
            include: {
              company: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Batch query optimization
 */
async function loadMultiplePersons(personIds: string[]) {
  // Single query instead of N queries
  return await prisma.person.findMany({
    where: {
      id: { in: personIds },
      deletedAt: null,
    },
    include: {
      company: true,
    },
  });
}
```

### PDF Generation Optimization

```typescript
/**
 * Puppeteer pool per parallel PDF generation
 */
import genericPool from 'generic-pool';
import puppeteer from 'puppeteer';

const browserPool = genericPool.createPool(
  {
    create: async () => {
      return await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
    },
    destroy: async (browser) => {
      await browser.close();
    },
  },
  {
    min: 2,         // Minimum 2 browser instances
    max: 10,        // Maximum 10 browser instances
    idleTimeoutMillis: 30000,
  }
);

/**
 * Generate PDF with pooled browser
 */
async function generatePDF(html: string): Promise<Buffer> {
  const browser = await browserPool.acquire();
  
  try {
    const page = await browser.newPage();
    
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
    });
    
    await page.close();
    
    return pdf;
  } finally {
    await browserPool.release(browser);
  }
}
```

### Load Testing Metrics

```typescript
/**
 * Performance targets
 */
const PERFORMANCE_TARGETS = {
  // Response times
  templateLoad: 1000,          // < 1s
  singleGeneration: 3000,      // < 3s
  batchGeneration50: 30000,    // < 30s for 50 docs
  
  // Throughput
  concurrentGenerations: 10,   // 10 simultaneous generations
  batchSize: 200,              // Max 200 docs per batch
  
  // Resource limits
  maxMemoryPerGeneration: 100, // 100MB
  maxPDFSize: 50,              // 50MB
};

/**
 * Monitoring metrics
 */
interface PerformanceMetrics {
  avgGenerationTime: number;
  p95GenerationTime: number;
  p99GenerationTime: number;
  errorRate: number;
  throughput: number;          // docs/minute
  queueLength: number;
  activeWorkers: number;
}
```

---

## 🔌 Integration Points

### Google Workspace Integration

```typescript
/**
 * Google OAuth2 Configuration
 */
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * Import from Google Docs
 */
async function importFromGoogleDocs(docUrl: string) {
  // Extract document ID from URL
  const docId = extractDocId(docUrl);
  
  // Get document content
  const docs = google.docs({ version: 'v1', auth: oauth2Client });
  const doc = await docs.documents.get({ documentId: docId });
  
  // Convert Google Docs content to HTML
  const html = convertGoogleDocsToHtml(doc.data);
  
  // Extract markers from content
  const markers = extractMarkers(html);
  
  return {
    content: html,
    markers,
    title: doc.data.title,
  };
}

/**
 * Convert Google Docs structure to HTML
 */
function convertGoogleDocsToHtml(docData: any): string {
  let html = '';
  
  for (const element of docData.body.content) {
    if (element.paragraph) {
      const paragraph = element.paragraph;
      let paragraphHtml = '<p>';
      
      for (const textRun of paragraph.elements) {
        if (textRun.textRun) {
          let text = textRun.textRun.content;
          
          // Apply text styles
          if (textRun.textRun.textStyle) {
            const style = textRun.textRun.textStyle;
            
            if (style.bold) text = `<strong>${text}</strong>`;
            if (style.italic) text = `<em>${text}</em>`;
            if (style.underline) text = `<u>${text}</u>`;
          }
          
          paragraphHtml += text;
        }
      }
      
      paragraphHtml += '</p>';
      html += paragraphHtml;
    }
  }
  
  return html;
}

/**
 * Sync template with Google Docs
 */
async function syncWithGoogleDocs(templateId: string) {
  const template = await prisma.templateLink.findUnique({
    where: { id: templateId },
  });
  
  if (!template.googleDocsUrl) {
    throw new Error('Template not linked to Google Docs');
  }
  
  // Import updated content
  const { content, markers } = await importFromGoogleDocs(template.googleDocsUrl);
  
  // Update template
  await prisma.templateLink.update({
    where: { id: templateId },
    data: {
      content,
      markers,
      lastSyncedAt: new Date(),
      version: { increment: 1 },
    },
  });
  
  // Invalidate cache
  await invalidateTemplateCache(templateId);
}
```

### Email Integration

```typescript
/**
 * Email service per invio documenti
 */
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send document via email
 */
async function sendDocumentByEmail(
  documentId: string,
  recipientEmail: string
) {
  const document = await prisma.generatedDocument.findUnique({
    where: { id: documentId },
    include: {
      template: true,
      generator: true,
    },
  });
  
  if (!document) {
    throw new Error('Document not found');
  }
  
  // Read PDF file
  const pdfBuffer = fs.readFileSync(document.filepath);
  
  // Send email
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: recipientEmail,
    subject: `Documento: ${document.template.name}`,
    html: `
      <p>Gentile utente,</p>
      <p>In allegato trova il documento <strong>${document.template.name}</strong>.</p>
      <p>Cordiali saluti,<br>Element Medica</p>
    `,
    attachments: [
      {
        filename: document.filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
  
  // Update document metadata
  await prisma.generatedDocument.update({
    where: { id: documentId },
    data: {
      sentAt: new Date(),
      sentTo: recipientEmail,
    },
  });
}
```

### Webhook Integration

```typescript
/**
 * Webhook notifications per eventi
 */
interface WebhookEvent {
  event: 'document.generated' | 'document.sent' | 'batch.completed';
  timestamp: Date;
  data: any;
}

/**
 * Send webhook notification
 */
async function sendWebhook(event: WebhookEvent) {
  const webhookUrl = process.env.WEBHOOK_URL;
  
  if (!webhookUrl) return;
  
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': generateSignature(event),
      },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error('Webhook failed:', error);
  }
}

/**
 * Generate HMAC signature for webhook verification
 */
function generateSignature(payload: any): string {
  const secret = process.env.WEBHOOK_SECRET || '';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}
```

---

## 📊 Monitoring & Observability

### Logging Strategy

```typescript
/**
 * Structured logging with Winston
 */
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'template-system',
  },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

/**
 * Log document generation
 */
logger.info('Document generated', {
  documentId: 'doc-uuid',
  templateId: 'template-uuid',
  entityType: 'schedule',
  entityId: 'schedule-uuid',
  generationTime: 2.5,
  fileSize: 245678,
  userId: 'user-uuid',
  tenantId: 'tenant-uuid',
});

/**
 * Log errors with context
 */
logger.error('PDF generation failed', {
  error: error.message,
  stack: error.stack,
  templateId: 'template-uuid',
  entityId: 'schedule-uuid',
  retryAttempt: 2,
});
```

### Health Check Endpoints

```typescript
/**
 * Health check per monitoring
 */
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      queue: await checkQueue(),
      storage: await checkStorage(),
    },
  };
  
  const isHealthy = Object.values(health.checks).every(check => check.status === 'ok');
  
  res.status(isHealthy ? 200 : 503).json(health);
});

async function checkDatabase(): Promise<{ status: string; latency: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'error',
      latency: Date.now() - start,
    };
  }
}
```

---

## 📚 Summary

### Architecture Highlights

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Marker Resolution** | Custom TypeScript class | Parse & resolve template markers |
| **Template Editor** | Tiptap (ProseMirror) | Rich text editing with marker autocomplete |
| **PDF Generation** | Puppeteer + Pool | HTML to PDF conversion |
| **Queue System** | Bull + Redis | Async batch processing |
| **Cache Layer** | Redis | Template & document caching |
| **Database** | PostgreSQL + Prisma | Data persistence with versioning |
| **File Storage** | Local FS / S3 | Document storage |
| **Auth** | JWT + RBAC | Multi-tenant security |

### Key Design Decisions

1. **Marker Syntax**: Handlebars-like `{{marker}}` per familiarità
2. **Editor Choice**: Tiptap per estensibilità e React integration
3. **Queue System**: Bull per reliability e monitoring
4. **Versioning**: Automatic version increment on template save
5. **Multi-tenant**: Prisma middleware per isolation automatico
6. **Caching**: Redis con TTL differenziati per tipo di dato
7. **Security**: XSS protection, RBAC, audit logging
8. **Scalability**: Puppeteer pool, database indexes, batch optimization

### Non-Functional Requirements Met

| Requirement | Implementation | Target |
|-------------|---------------|--------|
| **Performance** | Puppeteer pool, caching, indexes | < 3s single, < 30s batch 50 |
| **Scalability** | Queue system, horizontal scaling | 10 concurrent, 200 batch max |
| **Security** | XSS protection, RBAC, encryption | Zero vulnerabilities |
| **Reliability** | Retry logic, error handling, monitoring | 99.9% uptime |
| **Maintainability** | TypeScript, tests, documentation | < 2h onboarding |
| **GDPR Compliance** | Audit logs, data retention, encryption | 100% compliant |

---

**Document Owner**: System Architect  
**Last Review**: 4 Novembre 2025  
**Status**: ✅ COMPLETE - Ready for Implementation

