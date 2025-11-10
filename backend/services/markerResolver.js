/**
 * MarkerResolver Service
 * 
 * Servizio per la risoluzione dei marker nei template.
 * Supporta:
 * - 60+ marker predefiniti (person, course, schedule, company, trainer, system)
 * - Proprietà nidificate (fino a 3 livelli: person.address.city)
 * - Formatter inline ({{marker|formatter:args}})
 * - Validazione con suggerimenti typo
 * - Preview con dati mock
 * 
 * Sintassi marker: {{category.property|formatter:args}}
 * Esempio: {{person.birthDate|date:DD/MM/YYYY}}
 * 
 * @module services/markerResolver
 */

// MarkerResolver non richiede Prisma direttamente
// I dati vengono passati tramite il parametro 'data' in resolve()
import logger from '../utils/logger.js';

/**
 * Escape HTML per prevenire XSS
 * @param {string} str - Stringa da escapa
 * @returns {string} - Stringa con caratteri HTML escapati
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  const htmlEscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapeMap[char]);
}

/**
 * Errore di risoluzione marker
 */
class MarkerResolutionError extends Error {
  constructor(message, marker, details = {}) {
    super(message);
    this.name = 'MarkerResolutionError';
    this.marker = marker;
    this.details = details;
  }
}

/**
 * FormatterRegistry
 * 
 * Registro dei formatter disponibili per i marker.
 * Ogni formatter riceve un valore e argomenti opzionali.
 */
class FormatterRegistry {
  constructor() {
    this.formatters = new Map();
    this._registerBuiltInFormatters();
  }

  /**
   * Registra i formatter built-in
   * @private
   */
  _registerBuiltInFormatters() {
    // Date formatter - pattern: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, etc.
    this.register('date', (value, pattern = 'DD/MM/YYYY') => {
      if (!value) return '';
      const date = value instanceof Date ? value : new Date(value);
      if (isNaN(date.getTime())) return value;

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();

      return pattern
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year)
        .replace('YY', String(year).slice(-2));
    });

    // Currency formatter - symbol: €, $, £, etc.
    this.register('currency', (value, symbol = '€') => {
      if (value === null || value === undefined) return '';
      const num = parseFloat(value);
      if (isNaN(num)) return value;

      // Formato italiano: 1.234,56
      const formatted = num.toLocaleString('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      return `${symbol} ${formatted}`;
    });

    // Text transform formatters
    this.register('uppercase', (value) => value ? String(value).toUpperCase() : '');
    this.register('lowercase', (value) => value ? String(value).toLowerCase() : '');
    this.register('capitalize', (value) => {
      if (!value) return '';
      const str = String(value);
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });
    this.register('capitalizeWords', (value) => {
      if (!value) return '';
      return String(value)
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    });

    // Number formatters
    this.register('number', (value, decimals = 0) => {
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      return num.toLocaleString('it-IT', {
        minimumFractionDigits: parseInt(decimals),
        maximumFractionDigits: parseInt(decimals)
      });
    });

    // Phone formatter
    this.register('phone', (value) => {
      if (!value) return '';
      const digits = String(value).replace(/\D/g, '');
      if (digits.length === 10) {
        // Formato: 012 3456789
        return `${digits.slice(0, 3)} ${digits.slice(3)}`;
      }
      return value;
    });

    // Fiscal code formatter
    this.register('cf', (value) => {
      if (!value) return '';
      return String(value).toUpperCase();
    });

    // Default formatter (fallback)
    this.register('default', (value, defaultValue = '') => {
      return value !== null && value !== undefined && value !== '' ? value : defaultValue;
    });

    // Truncate formatter
    this.register('truncate', (value, length = 50, suffix = '...') => {
      if (!value) return '';
      const str = String(value);
      if (str.length <= length) return str;
      return str.slice(0, length) + suffix;
    });
  }

  /**
   * Registra un formatter custom
   * @param {string} name - Nome del formatter
   * @param {Function} fn - Funzione formatter(value, ...args)
   */
  register(name, fn) {
    this.formatters.set(name, fn);
  }

  /**
   * Applica un formatter a un valore
   * @param {string} name - Nome del formatter
   * @param {*} value - Valore da formattare
   * @param {string[]} args - Argomenti del formatter
   * @returns {string} - Valore formattato
   */
  format(name, value, args = []) {
    const formatter = this.formatters.get(name);
    if (!formatter) {
      logger.warn(`Formatter non trovato: ${name}`);
      return value;
    }

    try {
      return formatter(value, ...args);
    } catch (error) {
      logger.error(`Errore nel formatter ${name}:`, error);
      return value;
    }
  }

  /**
   * Verifica se un formatter esiste
   * @param {string} name - Nome del formatter
   * @returns {boolean}
   */
  has(name) {
    return this.formatters.has(name);
  }

  /**
   * Lista tutti i formatter disponibili
   * @returns {string[]}
   */
  list() {
    return Array.from(this.formatters.keys());
  }
}

/**
 * MarkerContext
 * 
 * Contesto per l'accesso ai dati durante la risoluzione dei marker.
 * Carica i dati una sola volta e li mantiene in cache.
 */
class MarkerContext {
  constructor(data = {}) {
    this.data = data;
    this.cache = new Map();
  }

  /**
   * Ottiene un valore dal contesto con supporto per proprietà nidificate
   * @param {string} path - Path della proprietà (es: 'person.address.city')
   * @param {*} defaultValue - Valore di default se non trovato
   * @returns {*}
   */
  get(path, defaultValue = null) {
    // Cache lookup
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }

    // Naviga il path
    const parts = path.split('.');
    let value = this.data;

    for (const part of parts) {
      if (value === null || value === undefined) {
        this.cache.set(path, defaultValue);
        return defaultValue;
      }
      value = value[part];
    }

    const result = value !== undefined ? value : defaultValue;
    this.cache.set(path, result);
    return result;
  }

  /**
   * Imposta un valore nel contesto
   * @param {string} path - Path della proprietà
   * @param {*} value - Valore da impostare
   */
  set(path, value) {
    const parts = path.split('.');
    let obj = this.data;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in obj)) {
        obj[part] = {};
      }
      obj = obj[part];
    }

    obj[parts[parts.length - 1]] = value;
    this.cache.set(path, value);
  }

  /**
   * Verifica se un path esiste
   * @param {string} path - Path della proprietà
   * @returns {boolean}
   */
  has(path) {
    return this.get(path) !== null;
  }

  /**
   * Cancella la cache
   */
  clearCache() {
    this.cache.clear();
  }
}

/**
 * MarkerResolver
 * 
 * Classe principale per la risoluzione dei marker nei template.
 */
class MarkerResolver {
  constructor() {
    this.formatterRegistry = new FormatterRegistry();
    this.allowedMarkers = this._defineAllowedMarkers();
  }

  /**
   * Definisce i marker consentiti con le loro descrizioni
   * @private
   * @returns {Map<string, string>}
   */
  _defineAllowedMarkers() {
    const markers = new Map();

    // Person markers (dipendenti, partecipanti, etc.)
    markers.set('person.id', 'ID persona');
    markers.set('person.fullName', 'Nome completo');
    markers.set('person.firstName', 'Nome');
    markers.set('person.lastName', 'Cognome');
    markers.set('person.email', 'Email');
    markers.set('person.cf', 'Codice fiscale');
    markers.set('person.phone', 'Telefono');
    markers.set('person.birthDate', 'Data di nascita');
    markers.set('person.birthPlace', 'Luogo di nascita');
    markers.set('person.address.street', 'Via');
    markers.set('person.address.city', 'Città');
    markers.set('person.address.province', 'Provincia');
    markers.set('person.address.postalCode', 'CAP');
    markers.set('person.address.country', 'Paese');
    markers.set('person.address.full', 'Indirizzo completo');

    // Course markers
    markers.set('course.id', 'ID corso');
    markers.set('course.title', 'Titolo corso');
    markers.set('course.code', 'Codice corso');
    markers.set('course.duration', 'Durata (ore)');
    markers.set('course.validityYears', 'Anni validità');
    markers.set('course.category', 'Categoria');
    markers.set('course.regulation', 'Normativa');
    markers.set('course.description', 'Descrizione');
    markers.set('course.objectives', 'Obiettivi');
    markers.set('course.topics', 'Argomenti');

    // Schedule markers (sessione specifica)
    markers.set('schedule.id', 'ID programmazione');
    markers.set('schedule.code', 'Codice edizione');
    markers.set('schedule.startDate', 'Data inizio');
    markers.set('schedule.endDate', 'Data fine');
    markers.set('schedule.location', 'Sede');
    markers.set('schedule.address', 'Indirizzo sede');
    markers.set('schedule.maxParticipants', 'Numero max partecipanti');
    markers.set('schedule.sessionsCount', 'Numero sessioni');
    markers.set('schedule.totalHours', 'Ore totali');
    markers.set('schedule.status', 'Stato');

    // Company markers (azienda committente)
    markers.set('company.id', 'ID azienda');
    markers.set('company.name', 'Ragione sociale');
    markers.set('company.vatNumber', 'Partita IVA');
    markers.set('company.fiscalCode', 'Codice fiscale');
    markers.set('company.address.street', 'Via');
    markers.set('company.address.city', 'Città');
    markers.set('company.address.province', 'Provincia');
    markers.set('company.address.postalCode', 'CAP');
    markers.set('company.address.full', 'Indirizzo completo');
    markers.set('company.legalRepresentative', 'Rappresentante legale');
    markers.set('company.email', 'Email');
    markers.set('company.phone', 'Telefono');

    // Preventivo markers (quotazioni/preventivi)
    markers.set('preventivo.id', 'ID preventivo');
    markers.set('preventivo.numeroProgressivo', 'Numero progressivo');
    markers.set('preventivo.annoProgressivo', 'Anno progressivo');
    markers.set('preventivo.stato', 'Stato preventivo');
    markers.set('preventivo.dataCreazione', 'Data creazione');
    markers.set('preventivo.dataInvio', 'Data invio');
    markers.set('preventivo.dataAccettazione', 'Data accettazione');
    markers.set('preventivo.dataValidita', 'Data validità');
    markers.set('preventivo.tipoServizio', 'Tipo servizio');
    markers.set('preventivo.prezzoTotale', 'Prezzo totale');
    markers.set('preventivo.speseAccessorie', 'Spese accessorie');
    markers.set('preventivo.subtotale', 'Subtotale');
    markers.set('preventivo.scontoApplicato', 'Sconto applicato (boolean)');
    markers.set('preventivo.scontoCodice', 'Codice sconto');
    markers.set('preventivo.scontoPercentuale', 'Sconto percentuale');
    markers.set('preventivo.importoSconto', 'Importo sconto');
    markers.set('preventivo.imponibile', 'Imponibile');
    markers.set('preventivo.percentualeIva', 'Percentuale IVA');
    markers.set('preventivo.importoIva', 'Importo IVA');
    markers.set('preventivo.importoFinale', 'Importo finale');
    markers.set('preventivo.note', 'Note');
    markers.set('preventivo.linkAccettazione', 'Link accettazione online');
    markers.set('preventivo.numPartecipanti', 'Numero partecipanti');

    // Trainer markers (docente/formatore)
    markers.set('trainer.id', 'ID docente');
    markers.set('trainer.fullName', 'Nome completo docente');
    markers.set('trainer.firstName', 'Nome docente');
    markers.set('trainer.lastName', 'Cognome docente');
    markers.set('trainer.email', 'Email docente');
    markers.set('trainer.phone', 'Telefono docente');
    markers.set('trainer.qualifications', 'Qualifiche');
    markers.set('trainer.certifications', 'Certificazioni');
    markers.set('trainer.specialties', 'Specializzazioni');

    // System markers
    markers.set('current.date', 'Data corrente');
    markers.set('current.year', 'Anno corrente');
    markers.set('current.time', 'Ora corrente');
    markers.set('tenant.id', 'ID tenant');
    markers.set('tenant.name', 'Nome ente');
    markers.set('tenant.logo', 'Logo ente');
    markers.set('tenant.address', 'Indirizzo ente');
    markers.set('tenant.phone', 'Telefono ente');
    markers.set('tenant.email', 'Email ente');
    markers.set('tenant.website', 'Sito web ente');
    markers.set('document.id', 'ID documento');
    markers.set('document.number', 'Numero progressivo');
    markers.set('document.type', 'Tipo documento');
    markers.set('document.date', 'Data emissione');

    return markers;
  }

  /**
   * Estrae tutti i marker da un template
   * @param {string} template - Template con marker
   * @returns {Array<{raw: string, marker: string, formatter: string|null, args: string[]}>}
   */
  parseMarkers(template) {
    if (!template) return [];

    const regex = /\{\{([^}]+)\}\}/g;
    const markers = [];
    let match;

    while ((match = regex.exec(template)) !== null) {
      const raw = match[0]; // {{person.fullName|uppercase}}
      const content = match[1].trim(); // person.fullName|uppercase

      // Parse formatter se presente
      const pipeIndex = content.indexOf('|');
      let marker, formatter = null, args = [];

      if (pipeIndex !== -1) {
        marker = content.substring(0, pipeIndex).trim();
        const formatterPart = content.substring(pipeIndex + 1).trim();
        
        // Parse formatter e argomenti: uppercase oppure date:DD/MM/YYYY
        const colonIndex = formatterPart.indexOf(':');
        if (colonIndex !== -1) {
          formatter = formatterPart.substring(0, colonIndex).trim();
          args = formatterPart.substring(colonIndex + 1).split(',').map(a => a.trim());
        } else {
          formatter = formatterPart;
        }
      } else {
        marker = content;
      }

      markers.push({ raw, marker, formatter, args });
    }

    return markers;
  }

  /**
   * Risolve un singolo marker con il contesto fornito
   * @param {string} marker - Nome del marker (es: 'person.fullName')
   * @param {MarkerContext} context - Contesto con i dati
   * @param {string|null} formatter - Nome del formatter da applicare
   * @param {string[]} args - Argomenti del formatter
   * @returns {string}
   */
  resolveMarker(marker, context, formatter = null, args = []) {
    // Ottieni il valore dal contesto
    let value = context.get(marker);
    
    // Debug logging
    if (value === null || value === undefined) {
      logger.debug(`❌ Marker '${marker}' not found in context. Available keys: ${Object.keys(context.data).join(', ')}`);
    } else {
      logger.debug(`✅ Marker '${marker}' resolved to: ${typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : value}`);
    }

    // Se il valore non esiste, prova a generarlo dinamicamente per system markers
    if (value === null && marker.startsWith('current.')) {
      value = this._resolveSystemMarker(marker);
    }

    // XSS protection: escape HTML PRIMA di formattare (solo se valore è string raw)
    // I formatter producono output sicuro, quindi escape solo input raw
    if (typeof value === 'string' && !formatter) {
      value = escapeHtml(value);
    }

    // Applica formatter se specificato
    if (formatter && this.formatterRegistry.has(formatter)) {
      value = this.formatterRegistry.format(formatter, value, args);
    }

    return value !== null ? String(value) : '';
  }

  /**
   * Risolve marker di sistema dinamici
   * @private
   * @param {string} marker - Nome del marker di sistema
   * @returns {*}
   */
  _resolveSystemMarker(marker) {
    const now = new Date();

    switch (marker) {
      case 'current.date':
        return now;
      case 'current.year':
        return now.getFullYear();
      case 'current.time':
        return now.toLocaleTimeString('it-IT');
      default:
        return null;
    }
  }

  /**
   * Risolve tutti i marker in un template
   * @param {string} template - Template con marker
   * @param {Object} data - Dati per la risoluzione
   * @param {Object} options - Opzioni di risoluzione
   * @returns {Promise<string>} - Template con marker risolti
   */
  async resolve(template, data = {}, options = {}) {
    const {
      strict = false, // Se true, lancia errore per marker non validi
      validate = true, // Se true, valida marker prima di risolvere
    } = options;

    // Validazione marker se richiesta
    if (validate) {
      const validation = this.validateMarkers(template);
      if (!validation.isValid && strict) {
        throw new MarkerResolutionError(
          'Template contiene marker non validi',
          null,
          validation
        );
      }
    }

    // Crea contesto
    const context = new MarkerContext(data);

    // Estrai marker
    const markers = this.parseMarkers(template);

    // Risolvi ogni marker
    let resolved = template;
    for (const { raw, marker, formatter, args } of markers) {
      try {
        const value = this.resolveMarker(marker, context, formatter, args);
        resolved = resolved.replace(raw, value);
      } catch (error) {
        logger.error(`Errore risolvendo marker ${marker}:`, error);
        if (strict) {
          throw new MarkerResolutionError(
            `Errore risolvendo marker: ${marker}`,
            marker,
            { error: error.message }
          );
        }
        // In modalità non-strict, lascia il marker originale
      }
    }

    return resolved;
  }

  /**
   * Valida i marker in un template
   * @param {string} template - Template da validare
   * @returns {Object} - Risultato validazione con suggerimenti
   */
  validateMarkers(template) {
    const markers = this.parseMarkers(template);
    const errors = [];
    const warnings = [];

    for (const { marker, formatter } of markers) {
      // Verifica marker
      if (!this.allowedMarkers.has(marker)) {
        const suggestion = this._findClosestMarker(marker);
        errors.push({
          marker,
          type: 'unknown_marker',
          message: `Marker non riconosciuto: ${marker}`,
          suggestion: suggestion ? `Intendevi ${suggestion}?` : null
        });
      }

      // Verifica formatter
      if (formatter && !this.formatterRegistry.has(formatter)) {
        const suggestion = this._findClosestFormatter(formatter);
        warnings.push({
          marker,
          formatter,
          type: 'unknown_formatter',
          message: `Formatter non riconosciuto: ${formatter}`,
          suggestion: suggestion ? `Intendevi ${suggestion}?` : null
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      markerCount: markers.length
    };
  }

  /**
   * Trova il marker più simile usando Levenshtein distance
   * @private
   * @param {string} input - Marker da cercare
   * @returns {string|null}
   */
  _findClosestMarker(input) {
    let minDistance = Infinity;
    let closest = null;

    for (const marker of this.allowedMarkers.keys()) {
      const distance = this._levenshteinDistance(input, marker);
      if (distance < minDistance && distance <= 3) {
        minDistance = distance;
        closest = marker;
      }
    }

    return closest;
  }

  /**
   * Trova il formatter più simile
   * @private
   * @param {string} input - Formatter da cercare
   * @returns {string|null}
   */
  _findClosestFormatter(input) {
    let minDistance = Infinity;
    let closest = null;

    for (const formatter of this.formatterRegistry.list()) {
      const distance = this._levenshteinDistance(input, formatter);
      if (distance < minDistance && distance <= 2) {
        minDistance = distance;
        closest = formatter;
      }
    }

    return closest;
  }

  /**
   * Calcola Levenshtein distance tra due stringhe
   * @private
   */
  _levenshteinDistance(a, b) {
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
   * Genera preview di un template con dati mock
   * @param {string} template - Template da visualizzare
   * @returns {Promise<string>} - Template con dati di esempio
   */
  async preview(template) {
    const mockData = this._generateMockData();
    return this.resolve(template, mockData, { strict: false, validate: false });
  }

  /**
   * Genera dati mock per preview
   * @private
   * @returns {Object}
   */
  _generateMockData() {
    return {
      person: {
        id: 1,
        fullName: 'Mario Rossi',
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario.rossi@example.com',
        cf: 'RSSMRA80A01H501Z',
        phone: '333 1234567',
        birthDate: new Date('1980-01-01'),
        birthPlace: 'Roma',
        address: {
          street: 'Via Roma 123',
          city: 'Milano',
          province: 'MI',
          postalCode: '20100',
          country: 'Italia',
          full: 'Via Roma 123, 20100 Milano (MI)'
        }
      },
      course: {
        id: 1,
        title: 'Corso di Sicurezza sul Lavoro',
        code: 'SSL-001',
        duration: 16,
        validityYears: 5,
        category: 'Sicurezza',
        regulation: 'D.Lgs. 81/2008',
        description: 'Corso di formazione sulla sicurezza sul lavoro',
        objectives: 'Fornire le competenze necessarie per operare in sicurezza',
        topics: 'Normativa, Rischi, DPI, Procedure di emergenza'
      },
      schedule: {
        id: 1,
        code: 'SSL-001-2024-01',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-20'),
        location: 'Aula 1 - Sede Milano',
        address: 'Via Milano 1, 20100 Milano',
        maxParticipants: 15,
        sessionsCount: 4,
        totalHours: 16,
        status: 'SCHEDULED'
      },
      company: {
        id: 1,
        name: 'Azienda Example S.r.l.',
        vatNumber: '12345678901',
        fiscalCode: '12345678901',
        address: {
          street: 'Via Azienda 1',
          city: 'Milano',
          province: 'MI',
          postalCode: '20100',
          full: 'Via Azienda 1, 20100 Milano (MI)'
        },
        legalRepresentative: 'Giuseppe Verdi',
        email: 'info@example.com',
        phone: '02 12345678'
      },
      trainer: {
        id: 1,
        fullName: 'Laura Bianchi',
        firstName: 'Laura',
        lastName: 'Bianchi',
        email: 'laura.bianchi@example.com',
        phone: '333 9876543',
        qualifications: 'Ingegnere della Sicurezza',
        certifications: 'Formatore qualificato D.I. 06/03/2013',
        specialties: 'Sicurezza sul lavoro, Gestione emergenze'
      },
      tenant: {
        id: 1,
        name: 'Element Medica Training',
        logo: '/assets/logo.png',
        address: 'Via Training 1, 20100 Milano',
        phone: '02 87654321',
        email: 'info@elementmedica.it',
        website: 'www.elementmedica.it'
      },
      document: {
        id: 1,
        number: '2024/001',
        type: 'CERTIFICATE',
        date: new Date()
      }
    };
  }

  /**
   * Lista tutti i marker disponibili per categoria
   * @returns {Object} - Marker raggruppati per categoria
   */
  listAvailableMarkers() {
    const grouped = {
      person: [],
      course: [],
      schedule: [],
      company: [],
      trainer: [],
      system: [],
      document: []
    };

    for (const [marker, description] of this.allowedMarkers.entries()) {
      const category = marker.split('.')[0];
      if (grouped[category]) {
        grouped[category].push({ marker, description });
      }
    }

    return grouped;
  }

  /**
   * Registra un formatter custom
   * @param {string} name - Nome del formatter
   * @param {Function} fn - Funzione formatter
   */
  registerFormatter(name, fn) {
    this.formatterRegistry.register(name, fn);
  }
}

// Singleton instance
let instance = null;

/**
 * Ottiene l'istanza singleton del MarkerResolver
 * @returns {MarkerResolver}
 */
function getMarkerResolver() {
  if (!instance) {
    instance = new MarkerResolver();
  }
  return instance;
}

export {
  MarkerResolver,
  MarkerContext,
  FormatterRegistry,
  MarkerResolutionError,
  getMarkerResolver
};

export default getMarkerResolver;
