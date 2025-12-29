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
    this.googleMarkerMap = this._defineGoogleMarkerMap();
  }

  /**
   * Definisce la mappatura da marker Google (UPPERCASE) a marker interni
   * @private
   * @returns {Map<string, string>}
   */
  _defineGoogleMarkerMap() {
    const map = new Map();

    // Document markers
    map.set('NUMERO_PROGRESSIVO', 'document.number');
    map.set('NUMERO_DOCUMENTO', 'document.number');
    map.set('TIPO_DOCUMENTO', 'document.type');
    map.set('DATA_GENERAZIONE', 'document.date');
    map.set('DATA_EMISSIONE', 'document.date');
    map.set('NUMERO_LETTERA_INCARICO', 'letteraIncarico.number');
    map.set('NUMERO_ATTESTATO', 'certificate.registrationNumber');
    map.set('DATA_SCADENZA', 'certificate.validUntil');
    map.set('QR_CODE_VERIFICA', 'document.qrCode');
    map.set('PAGINA_CORRENTE', 'document.pageNumber');
    map.set('NUMERO_PAGINA', 'document.pageNumber');
    map.set('PAGINE_TOTALI', 'document.totalPages');

    // Person markers
    map.set('NOME_COMPLETO', 'person.fullName');
    map.set('NOME', 'person.firstName');
    map.set('COGNOME', 'person.lastName');
    map.set('EMAIL', 'person.email');
    map.set('CODICE_FISCALE', 'person.cf');
    map.set('TELEFONO', 'person.phone');
    map.set('DATA_NASCITA', 'person.birthDate');
    map.set('LUOGO_NASCITA', 'person.birthPlace');
    map.set('PROFILO_PROFESSIONALE', 'person.title');
    map.set('INDIRIZZO_VIA', 'person.address.street');
    map.set('INDIRIZZO_CITTA', 'person.address.city');
    map.set('INDIRIZZO_PROVINCIA', 'person.address.province');
    map.set('INDIRIZZO_CAP', 'person.address.postalCode');
    map.set('INDIRIZZO_PAESE', 'person.address.country');
    map.set('INDIRIZZO_COMPLETO', 'person.address.full');

    // Company markers
    map.set('AZIENDA_RAGIONE_SOCIALE', 'company.name');
    map.set('AZIENDA_PIVA', 'company.vatNumber');
    map.set('AZIENDA_CF', 'company.fiscalCode');
    map.set('AZIENDA_CODICE_ATECO', 'company.codiceAteco');
    map.set('AZIENDA_VIA', 'company.address.street');
    map.set('AZIENDA_CITTA', 'company.address.city');
    map.set('AZIENDA_PROVINCIA', 'company.address.province');
    map.set('AZIENDA_CAP', 'company.address.postalCode');
    map.set('AZIENDA_INDIRIZZO', 'company.address.full');
    map.set('AZIENDA_TELEFONO', 'company.phone');
    map.set('AZIENDA_EMAIL', 'company.email');
    map.set('AZIENDA_PEC', 'company.pec');
    map.set('AZIENDA_SDI', 'company.sdiCode');

    // Course markers
    map.set('CORSO_TITOLO', 'course.title');
    map.set('CORSO_CODICE', 'course.code');
    map.set('CORSO_DURATA', 'course.duration');
    map.set('CORSO_CATEGORIA', 'course.category');
    map.set('CORSO_NORMATIVA', 'course.regulation');
    map.set('CORSO_DESCRIZIONE', 'course.description');
    map.set('CORSO_TIPO', 'course.courseType');
    map.set('CORSO_LIVELLO_RISCHIO', 'course.riskLevel');

    // Schedule markers
    map.set('PROGRAMMAZIONE_DATA_INIZIO', 'schedule.startDate');
    map.set('PROGRAMMAZIONE_DATA_FINE', 'schedule.endDate');
    map.set('PROGRAMMAZIONE_SEDE', 'schedule.location');
    map.set('PROGRAMMAZIONE_MODALITA', 'schedule.deliveryMode');
    map.set('AZIENDE_PARTECIPANTI', 'schedule.participantCompanies');

    // Session markers  
    map.set('SESSIONE_NUMERO', 'session.number');
    map.set('SESSIONE_DATA', 'session.date');
    map.set('SESSIONE_ORA_INIZIO', 'session.startTime');
    map.set('SESSIONE_ORA_FINE', 'session.endTime');
    map.set('SESSIONE_DURATA', 'session.duration');
    map.set('SESSIONE_SEDE', 'session.location');
    map.set('SESSIONE_FORMATORE', 'session.trainer.fullName');
    map.set('SESSIONE_NUM_PARTECIPANTI', 'session.participantsCount');

    // Trainer markers
    map.set('FORMATORE_NOME_COMPLETO', 'trainer.fullName');
    map.set('NOME_FORMATORE', 'trainer.firstName');
    map.set('COGNOME_FORMATORE', 'trainer.lastName');
    map.set('FORMATORE_EMAIL', 'trainer.email');
    map.set('FORMATORE_TELEFONO', 'trainer.phone');
    map.set('FORMATORE_QUALIFICHE', 'trainer.qualifications');
    map.set('FORMATORE_TARIFFA_ORARIA', 'trainer.hourlyRate');
    map.set('FORMATORE_ORE_TOTALI', 'trainer.totalHours');
    map.set('FORMATORE_COMPENSO_TOTALE', 'trainer.totalCompensation');
    map.set('FORMATORE_RIMBORSO_SPESE', 'trainer.expenses');

    // Table markers
    map.set('TABELLA_PRESENZE', 'table.attendance');
    map.set('TABELLA_SESSIONI', 'table.sessions');
    map.set('TABELLA_PARTECIPANTI', 'table.participants');
    map.set('TABELLA_INFO_SESSIONI', 'table.sessionsInfo');
    map.set('TABELLA_PRESENTI_SESSIONE_1', 'table.attendanceSession1');
    map.set('TABELLA_PRESENTI_SESSIONE_2', 'table.attendanceSession2');
    map.set('TABELLA_PRESENTI_SESSIONE_3', 'table.attendanceSession3');
    map.set('TABELLA_PRESENTI_SESSIONE_4', 'table.attendanceSession4');
    map.set('TABELLA_PRESENZE_SESSIONE', 'table.sessionAttendance');

    // Current date/time markers
    map.set('DATA_CORRENTE', 'current.date');
    map.set('ANNO_CORRENTE', 'current.year');
    map.set('ORA_CORRENTE', 'current.time');

    return map;
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
    markers.set('person.title', 'Profilo professionale / Titolo');
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
    markers.set('course.courseType', 'Tipologia corso');
    markers.set('course.riskLevel', 'Livello di rischio');

    // Session markers (sessione singola)
    markers.set('session.id', 'ID sessione');
    markers.set('session.date', 'Data sessione');
    markers.set('session.startTime', 'Ora inizio');
    markers.set('session.endTime', 'Ora fine');
    markers.set('session.duration', 'Durata sessione');
    markers.set('session.location', 'Sede sessione');
    markers.set('session.topic', 'Argomento sessione');
    markers.set('session.trainer.fullName', 'Nome completo formatore sessione');
    markers.set('session.trainer.firstName', 'Nome formatore sessione');
    markers.set('session.trainer.lastName', 'Cognome formatore sessione');
    markers.set('session.participantCompanies', 'Aziende partecipanti sessione');
    markers.set('session.partecipantCompanies', 'Aziende partecipanti sessione (alias)'); // Alias for typo in templates
    markers.set('session.participantsCount', 'Numero partecipanti sessione');

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
    markers.set('schedule.deliveryMode', 'Modalità erogazione');
    markers.set('schedule.participantCompanies', 'Aziende partecipanti corso');
    markers.set('schedule.partecipantCompanies', 'Aziende partecipanti corso (alias)'); // Alias for typo in templates

    // Company markers (azienda committente)
    markers.set('company.id', 'ID azienda');
    markers.set('company.name', 'Ragione sociale');
    markers.set('company.vatNumber', 'Partita IVA');
    markers.set('company.fiscalCode', 'Codice fiscale');
    markers.set('company.codiceAteco', 'Codice ATECO');
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
    markers.set('trainer.hourlyRate', 'Tariffa oraria concordata (€/h)');
    markers.set('trainer.totalHours', 'Ore totali del formatore nel corso');
    markers.set('trainer.expenses', 'Rimborso spese (numero)');
    markers.set('trainer.expensesText', 'Rimborso spese (testo o "senza alcun rimborso spese")');
    markers.set('trainer.totalCompensation', 'Compenso totale (tariffa x ore + spese)');

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
    markers.set('document.qrCode', 'QR code verifica autenticità');
    markers.set('document.pageNumber', 'Numero pagina corrente');
    markers.set('document.totalPages', 'Numero totale pagine');

    // Lettera Incarico markers
    markers.set('letteraIncarico.number', 'Numero lettera di incarico');

    // Certificate markers
    markers.set('certificate.registrationNumber', 'Numero attestato');
    markers.set('certificate.validUntil', 'Data scadenza certificato');

    // Table markers
    markers.set('table.attendance', 'Tabella presenze');
    markers.set('table.sessions', 'Elenco sessioni');
    markers.set('table.participants', 'Elenco partecipanti');
    markers.set('table.attendanceSession1', 'Tabella presenti sessione 1 (Cognome, Nome, Firma In, Firma Out)');
    markers.set('table.attendanceSession2', 'Tabella presenti sessione 2 (Cognome, Nome, Firma In, Firma Out)');
    markers.set('table.attendanceSession3', 'Tabella presenti sessione 3 (Cognome, Nome, Firma In, Firma Out)');
    markers.set('table.attendanceSession4', 'Tabella presenti sessione 4 (Cognome, Nome, Firma In, Firma Out)');
    markers.set('table.sessionsInfo', 'Informazioni sulle sessioni del corso');
    markers.set('table.sessionAttendance', 'Tabella presenze sessione corrente (Cognome, Nome, Azienda, Firma Ingresso, Firma Uscita)');

    // Template v11 - HTML compositi per preventivo
    markers.set('vociHtml', 'HTML righe tabella voci preventivo');
    markers.set('totaliHtml', 'HTML righe totali preventivo');
    markers.set('noteHtml', 'HTML box note preventivo (condizionale)');
    markers.set('cliente.nome', 'Nome cliente (azienda o persona)');
    markers.set('cliente.dettagliHtml', 'HTML dettagli cliente (P.IVA, CF, indirizzo)');
    markers.set('corso.boxHtml', 'HTML box servizio/corso completo');
    markers.set('corso.metaHtml', 'HTML meta corso (codice, durata, categoria, rischio)');
    markers.set('preventivo.numero', 'Numero preventivo formattato (PREV-YYYY-NNNN)');
    markers.set('preventivo.dataEmissione', 'Data emissione formattata');
    markers.set('preventivo.partecipantiHtml', 'HTML riga partecipanti (condizionale)');
    markers.set('preventivo.metodoPagamento', 'Metodo di pagamento');
    markers.set('tenant.logoHtml', 'HTML logo tenant (img o testo)');
    markers.set('tenant.vatNumber', 'P.IVA tenant');

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
    // Converti marker Google UPPERCASE a formato interno se necessario
    const originalMarker = marker;
    if (this.googleMarkerMap.has(marker)) {
      marker = this.googleMarkerMap.get(marker);
      logger.debug(`Converted Google marker ${originalMarker} to ${marker}`);
    }

    // ECCEZIONE SPECIALE: pageNumber e totalPages NON devono essere risolti qui
    // Puppeteer li gestisce dinamicamente in header/footer tramite classi CSS
    // Li lasciamo come marker per essere convertiti in _buildPdfOptions
    if (marker === 'document.pageNumber' || marker === 'document.totalPages') {
      return `{{${marker}}}`; // Ritorna il marker intatto per elaborazione successiva
    }

    // Gestione speciale per marker delle tabelle presenze
    if (marker.startsWith('table.attendanceSession')) {
      const sessionNumber = parseInt(marker.replace('table.attendanceSession', ''), 10);
      if (!isNaN(sessionNumber) && sessionNumber >= 1 && sessionNumber <= 4) {
        return this._generateAttendanceTable(context, sessionNumber);
      }
    }

    // Gestione speciale per tabella info sessioni
    if (marker === 'table.sessionsInfo') {
      return this._generateSessionsInfoTable(context);
    }

    // Gestione speciale per tabella partecipanti
    if (marker === 'table.participants') {
      return this._generateParticipantsTable(context);
    }

    // Gestione speciale per tabella presenze sessione corrente
    if (marker === 'table.sessionAttendance') {
      return this._generateSessionAttendanceTable(context);
    }

    // Ottieni il valore dal contesto
    let value = context.get(marker);

    // Critical markers list for enhanced logging
    const criticalMarkers = ['session.participantCompanies', 'trainer.totalHours', 'trainer.totalCompensation', 'letteraIncarico.number'];
    const isCriticalMarker = criticalMarkers.includes(marker);

    // Debug logging
    if (value === null || value === undefined) {
      logger.debug(`❌ Marker '${marker}' not found in context. Available keys: ${Object.keys(context.data).join(', ')}`);
      // Log aggiuntivo per marker critici che non si risolvono
      if (marker.includes('participantCompanies') || marker.includes('totalHours') || marker.includes('totalCompensation') || marker.includes('letteraIncarico')) {
        logger.warn(`⚠️ Critical marker '${marker}' not resolved!`, {
          marker,
          availableTopLevelKeys: Object.keys(context.data),
          hasSession: !!context.data.session,
          sessionKeys: context.data.session ? Object.keys(context.data.session) : [],
          hasTrainer: !!context.data.trainer,
          trainerKeys: context.data.trainer ? Object.keys(context.data.trainer) : [],
          hasLetteraIncarico: !!context.data.letteraIncarico,
          letteraIncaricoKeys: context.data.letteraIncarico ? Object.keys(context.data.letteraIncarico) : []
        });
      }
    } else {
      // Log critical markers at WARN level to see them in production
      if (isCriticalMarker) {
        logger.warn(`✅ Critical marker '${marker}' resolved successfully`, {
          marker,
          value: typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : value,
          valueType: typeof value
        });
      } else {
        logger.debug(`✅ Marker '${marker}' resolved to: ${typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : value}`);
      }
    }

    // Se il valore non esiste, prova a generarlo dinamicamente per system markers
    if (value === null && marker.startsWith('current.')) {
      value = this._resolveSystemMarker(marker);
    }

    // Auto-formattazione date: se il marker contiene 'date' o 'Date' e non c'è formatter,
    // formatta automaticamente con dd.mm.yyyy
    const isDateMarker = marker.toLowerCase().includes('date') ||
      marker === 'current.date' ||
      marker.endsWith('.startDate') ||
      marker.endsWith('.endDate') ||
      marker.endsWith('.birthDate');

    if (isDateMarker && !formatter && value) {
      // Verifica se è una data valida
      const dateValue = value instanceof Date ? value : new Date(value);
      if (!isNaN(dateValue.getTime())) {
        value = this.formatterRegistry.format('date', dateValue, ['DD.MM.YYYY']);
      }
    }

    // Auto-formattazione courseType: da UPPER_SNAKE_CASE a Pascal Case
    // PRIMO_CORSO -> Primo Corso, AGGIORNAMENTO -> Aggiornamento
    if (marker === 'course.courseType' && !formatter && value) {
      const courseTypeLabels = {
        'PRIMO_CORSO': 'Primo Corso',
        'AGGIORNAMENTO': 'Aggiornamento'
      };
      value = courseTypeLabels[value] || String(value).split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }

    // Auto-formattazione riskLevel: supporta RLS con etichette dipendenti
    // Per corsi RLS: ALTO -> '>50 Dipendenti', MEDIO -> '15-50 Dipendenti', BASSO -> '<50 Dipendenti'
    // Per altri corsi: ALTO -> 'Rischio Alto', MEDIO -> 'Rischio Medio', BASSO -> 'Rischio Basso'
    if (marker === 'course.riskLevel' && !formatter && value) {
      // Verifica se è un corso RLS controllando il titolo nel contesto
      const courseTitle = context.get('course.title') || '';
      const isRLS = this._isRLSCourse(courseTitle);

      if (isRLS) {
        const rlsLabels = {
          'ALTO': '>50 Dipendenti',
          'MEDIO': '15-50 Dipendenti',
          'BASSO': '<50 Dipendenti',
          'A': '>50 Dipendenti',
          'B': '15-50 Dipendenti',
          'C': '<50 Dipendenti'
        };
        value = rlsLabels[value] || value;
      } else {
        const riskLevelLabels = {
          'ALTO': 'Rischio Alto',
          'MEDIO': 'Rischio Medio',
          'BASSO': 'Rischio Basso',
          'A': 'Categoria A',
          'B': 'Categoria B',
          'C': 'Categoria C',
          'LOW': 'Basso',
          'MEDIUM': 'Medio',
          'HIGH': 'Alto',
          'VERY_HIGH': 'Molto Alto'
        };
        value = riskLevelLabels[value] || value;
      }
    }

    // Auto-formattazione trainer.hourlyRate e trainer.totalCompensation: formato valuta italiana
    if ((marker === 'trainer.hourlyRate' || marker === 'trainer.totalCompensation') && !formatter && value !== null && value !== undefined) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        value = `€ ${num.toFixed(2).replace('.', ',')}`;
      }
    }

    // Auto-formattazione trainer.totalHours: mostra con decimali se necessario
    if (marker === 'trainer.totalHours' && !formatter && value !== null && value !== undefined) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        value = num % 1 === 0 ? `${num}` : num.toFixed(1).replace('.', ',');
      }
    }

    // Auto-formattazione trainer.expenses: se 0 mostra "senza alcun rimborso spese"
    if (marker === 'trainer.expenses' && !formatter) {
      const num = parseFloat(value);
      if (isNaN(num) || num === 0) {
        value = 'senza alcun rimborso spese';
      } else {
        value = `€ ${num.toFixed(2).replace('.', ',')}`;
      }
    }

    // XSS protection: escape HTML PRIMA di formattare (solo se valore è string raw)
    // I formatter producono output sicuro, quindi escape solo input raw
    // ECCEZIONE 1: Non escapare tag <img> con data URL (immagini embedded sicure come QR codes)
    // ECCEZIONE 2: Non escapare marker che terminano con "Html" (HTML pre-renderizzato trusted)
    //              Es: vociHtml, totaliHtml, noteHtml, cliente.dettagliHtml, corso.metaHtml
    if (typeof value === 'string' && !formatter) {
      // Check if it's a safe embedded image (data URL)
      const isSafeDataUrlImage = value.trim().startsWith('<img') &&
        value.includes('src="data:image/');

      // Check if this is a trusted HTML marker (ends with 'Html')
      // These markers contain pre-rendered HTML from backend services like _buildMarkerData
      const isTrustedHtmlMarker = marker.endsWith('Html') || marker.includes('.dettagliHtml') ||
        marker.includes('.metaHtml') || marker.includes('.partecipantiHtml');

      if (!isSafeDataUrlImage && !isTrustedHtmlMarker) {
        value = escapeHtml(value);
      }
    }

    // Applica formatter se specificato
    if (formatter && this.formatterRegistry.has(formatter)) {
      value = this.formatterRegistry.format(formatter, value, args);
    }

    return value !== null ? String(value) : '';
  }

  /**
   * Genera la tabella presenze per una specifica sessione
   * @private
   * @param {MarkerContext} context - Contesto con i dati
   * @param {number} sessionNumber - Numero della sessione (1-4)
   * @returns {string} - HTML della tabella
   */
  _generateAttendanceTable(context, sessionNumber) {
    // Cerca i dati delle sessioni nel context
    const sessions = context.get('sessions') || [];
    const session = sessions[sessionNumber - 1];

    // Stile tabella standard per documenti PDF
    const tableStyle = `
      border-collapse: collapse;
      width: 100%;
      margin: 10px 0;
      font-size: 11px;
    `;
    const thStyle = `
      border: 1px solid #000;
      background-color: #f0f0f0;
      padding: 8px;
      text-align: left;
      font-weight: bold;
    `;
    const tdStyle = `
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
      min-height: 30px;
    `;
    const tdSignStyle = `
      border: 1px solid #000;
      padding: 8px;
      text-align: center;
      min-width: 80px;
      min-height: 30px;
    `;

    // Se non ci sono dati per la sessione, genera tabella vuota con righe placeholder
    if (!session || !session.participants || session.participants.length === 0) {
      const participants = context.get('participants') || [];

      let html = `<table style="${tableStyle}">
        <thead>
          <tr>
            <th style="${thStyle}">N.</th>
            <th style="${thStyle}">Cognome</th>
            <th style="${thStyle}">Nome</th>
            <th style="${thStyle}">Firma Ingresso</th>
            <th style="${thStyle}">Firma Uscita</th>
          </tr>
        </thead>
        <tbody>`;

      if (participants.length > 0) {
        // Usa i partecipanti dal context
        participants.forEach((participant, index) => {
          const lastName = escapeHtml(participant.lastName || participant.cognome || '');
          const firstName = escapeHtml(participant.firstName || participant.nome || '');
          html += `
            <tr>
              <td style="${tdStyle}">${index + 1}</td>
              <td style="${tdStyle}">${lastName}</td>
              <td style="${tdStyle}">${firstName}</td>
              <td style="${tdSignStyle}"></td>
              <td style="${tdSignStyle}"></td>
            </tr>`;
        });
      } else {
        // Genera righe vuote placeholder (default 10 righe)
        for (let i = 1; i <= 10; i++) {
          html += `
            <tr>
              <td style="${tdStyle}">${i}</td>
              <td style="${tdStyle}"></td>
              <td style="${tdStyle}"></td>
              <td style="${tdSignStyle}"></td>
              <td style="${tdSignStyle}"></td>
            </tr>`;
        }
      }

      html += '</tbody></table>';
      return html;
    }

    // Genera tabella con i dati della sessione
    let html = `<table style="${tableStyle}">
      <thead>
        <tr>
          <th style="${thStyle}">N.</th>
          <th style="${thStyle}">Cognome</th>
          <th style="${thStyle}">Nome</th>
          <th style="${thStyle}">Firma Ingresso</th>
          <th style="${thStyle}">Firma Uscita</th>
        </tr>
      </thead>
      <tbody>`;

    session.participants.forEach((participant, index) => {
      const lastName = escapeHtml(participant.lastName || participant.cognome || '');
      const firstName = escapeHtml(participant.firstName || participant.nome || '');
      html += `
        <tr>
          <td style="${tdStyle}">${index + 1}</td>
          <td style="${tdStyle}">${lastName}</td>
          <td style="${tdStyle}">${firstName}</td>
          <td style="${tdSignStyle}"></td>
          <td style="${tdSignStyle}"></td>
        </tr>`;
    });

    html += '</tbody></table>';
    return html;
  }

  /**
   * Genera la tabella informazioni sessioni
   * @private
   * @param {MarkerContext} context - Contesto con i dati
   * @returns {string} - HTML della tabella
   */
  _generateSessionsInfoTable(context) {
    const sessions = context.get('sessions') || [];

    const tableStyle = `
      border-collapse: collapse;
      width: 100%;
      margin: 10px 0;
      font-size: 11px;
    `;
    const thStyle = `
      border: 1px solid #000;
      background-color: #f0f0f0;
      padding: 8px;
      text-align: left;
      font-weight: bold;
    `;
    const tdStyle = `
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
    `;

    let html = `<table style="${tableStyle}">
      <thead>
        <tr>
          <th style="${thStyle}">Sessione</th>
          <th style="${thStyle}">Data</th>
          <th style="${thStyle}">Ora Inizio</th>
          <th style="${thStyle}">Ora Fine</th>
          <th style="${thStyle}">Durata (ore)</th>
          <th style="${thStyle}">Docente</th>
        </tr>
      </thead>
      <tbody>`;

    if (sessions.length > 0) {
      sessions.forEach((session, index) => {
        const date = session.date ? this.formatterRegistry.format('date', new Date(session.date), ['DD/MM/YYYY']) : '';
        const startTime = session.startTime || '';
        const endTime = session.endTime || '';
        const duration = session.duration || '';
        const trainer = escapeHtml(session.trainerName || session.trainer?.fullName || '');

        html += `
          <tr>
            <td style="${tdStyle}">${index + 1}</td>
            <td style="${tdStyle}">${date}</td>
            <td style="${tdStyle}">${startTime}</td>
            <td style="${tdStyle}">${endTime}</td>
            <td style="${tdStyle}">${duration}</td>
            <td style="${tdStyle}">${trainer}</td>
          </tr>`;
      });
    } else {
      // Genera 4 righe vuote per sessioni placeholder
      for (let i = 1; i <= 4; i++) {
        html += `
          <tr>
            <td style="${tdStyle}">${i}</td>
            <td style="${tdStyle}"></td>
            <td style="${tdStyle}"></td>
            <td style="${tdStyle}"></td>
            <td style="${tdStyle}"></td>
            <td style="${tdStyle}"></td>
          </tr>`;
      }
    }

    html += '</tbody></table>';
    return html;
  }

  /**
   * Genera la tabella dei partecipanti
   * @private
   * @param {MarkerContext} context - Contesto con i dati
   * @returns {string} - HTML della tabella
   */
  _generateParticipantsTable(context) {
    const participants = context.get('participants') || [];

    const tableStyle = `
      border-collapse: collapse;
      width: 100%;
      margin: 10px 0;
      font-size: 11px;
    `;
    const thStyle = `
      border: 1px solid #000;
      background-color: #f0f0f0;
      padding: 8px;
      text-align: left;
      font-weight: bold;
    `;
    const tdStyle = `
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
    `;

    let html = `<table style="${tableStyle}">
      <thead>
        <tr>
          <th style="${thStyle}">N.</th>
          <th style="${thStyle}">Cognome</th>
          <th style="${thStyle}">Nome</th>
          <th style="${thStyle}">C.F.</th>
          <th style="${thStyle}">Azienda</th>
        </tr>
      </thead>
      <tbody>`;

    if (participants.length > 0) {
      participants.forEach((participant, index) => {
        const lastName = escapeHtml(participant.lastName || participant.cognome || '');
        const firstName = escapeHtml(participant.firstName || participant.nome || '');
        const cf = escapeHtml(participant.cf || participant.codiceFiscale || '');
        const company = escapeHtml(participant.companyName || participant.azienda || '');

        html += `
          <tr>
            <td style="${tdStyle}">${index + 1}</td>
            <td style="${tdStyle}">${lastName}</td>
            <td style="${tdStyle}">${firstName}</td>
            <td style="${tdStyle}">${cf}</td>
            <td style="${tdStyle}">${company}</td>
          </tr>`;
      });
    } else {
      // Genera 10 righe vuote placeholder
      for (let i = 1; i <= 10; i++) {
        html += `
          <tr>
            <td style="${tdStyle}">${i}</td>
            <td style="${tdStyle}"></td>
            <td style="${tdStyle}"></td>
            <td style="${tdStyle}"></td>
            <td style="${tdStyle}"></td>
          </tr>`;
      }
    }

    html += '</tbody></table>';
    return html;
  }

  /**
   * Genera la tabella presenze per la sessione corrente
   * Ordina per azienda e poi per cognome
   * @private
   * @param {MarkerContext} context - Contesto con i dati
   * @returns {string} - HTML della tabella
   */
  _generateSessionAttendanceTable(context) {
    let participants = context.get('participants') || [];

    // Stile tabella per documenti PDF
    // ✅ FIX: Aggiunto table-layout: fixed e max-width per evitare overflow del margine destro
    const tableStyle = `
      border-collapse: collapse;
      width: 100%;
      max-width: 100%;
      margin: 10px 0;
      font-size: 11px;
      table-layout: fixed;
    `;
    const thStyle = `
      border: 1px solid #000;
      background-color: #f0f0f0;
      padding: 6px;
      text-align: left;
      font-weight: bold;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    const tdStyle = `
      border: 1px solid #000;
      padding: 6px;
      text-align: left;
      min-height: 30px;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    // Stile speciale per colonne firma con bordo sinistro più spesso per separazione visiva
    // ✅ FIX: Rimosso min-width e usato width percentuale per evitare overflow
    const tdSignStyle = `
      border: 1px solid #000;
      border-left: 2px solid #000;
      padding: 6px;
      text-align: center;
      width: 12%;
      min-height: 30px;
    `;
    // Prima colonna firma - bordo sinistro extra spesso
    // ✅ FIX: Rimosso min-width e usato width percentuale
    const tdFirstSignStyle = `
      border: 1px solid #000;
      border-left: 2px solid #000;
      padding: 6px;
      text-align: center;
      width: 12%;
      min-height: 30px;
    `;
    // Header firma con stesso bordo
    const thSignStyle = `
      border: 1px solid #000;
      border-left: 2px solid #000;
      background-color: #f0f0f0;
      padding: 6px;
      text-align: center;
      font-weight: bold;
      width: 12%;
    `;
    const thSecondSignStyle = `
      border: 1px solid #000;
      border-left: 2px solid #000;
      background-color: #f0f0f0;
      padding: 6px;
      text-align: center;
      font-weight: bold;
      width: 12%;
    `;

    // Ordina partecipanti: prima per azienda, poi per cognome
    const sortedParticipants = [...participants].sort((a, b) => {
      const companyA = (a.companyName || a.azienda || '').toLowerCase();
      const companyB = (b.companyName || b.azienda || '').toLowerCase();

      if (companyA < companyB) return -1;
      if (companyA > companyB) return 1;

      const lastNameA = (a.lastName || a.cognome || '').toLowerCase();
      const lastNameB = (b.lastName || b.cognome || '').toLowerCase();
      if (lastNameA < lastNameB) return -1;
      if (lastNameA > lastNameB) return 1;

      return 0;
    });

    // ✅ FIX: Uso colgroup per definire larghezze colonne esplicite
    // Questo assicura che la tabella rispetti i margini della pagina
    let html = `<table style="${tableStyle}">
      <colgroup>
        <col style="width: 5%;">
        <col style="width: 18%;">
        <col style="width: 18%;">
        <col style="width: 23%;">
        <col style="width: 18%;">
        <col style="width: 18%;">
      </colgroup>
      <thead>
        <tr>
          <th style="${thStyle}">N.</th>
          <th style="${thStyle}">Cognome</th>
          <th style="${thStyle}">Nome</th>
          <th style="${thStyle}">Azienda</th>
          <th style="${thSignStyle}">Firma Ingresso</th>
          <th style="${thSecondSignStyle}">Firma Uscita</th>
        </tr>
      </thead>
      <tbody>`;

    if (sortedParticipants.length > 0) {
      sortedParticipants.forEach((participant, index) => {
        const lastName = escapeHtml(participant.lastName || participant.cognome || '');
        const firstName = escapeHtml(participant.firstName || participant.nome || '');
        const company = escapeHtml(participant.companyName || participant.azienda || '');

        html += `
          <tr>
            <td style="${tdStyle}">${index + 1}</td>
            <td style="${tdStyle}">${lastName}</td>
            <td style="${tdStyle}">${firstName}</td>
            <td style="${tdStyle}">${company}</td>
            <td style="${tdFirstSignStyle}"></td>
            <td style="${tdSignStyle}"></td>
          </tr>`;
      });
    } else {
      // Genera 10 righe vuote placeholder
      for (let i = 1; i <= 10; i++) {
        html += `
          <tr>
            <td style="${tdStyle}">${i}</td>
            <td style="${tdStyle}"></td>
            <td style="${tdStyle}"></td>
            <td style="${tdStyle}"></td>
            <td style="${tdFirstSignStyle}"></td>
            <td style="${tdSignStyle}"></td>
          </tr>`;
      }
    }

    html += '</tbody></table>';
    return html;
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
   * Verifica se un corso è di tipo RLS (Rappresentante Lavoratori Sicurezza)
   * @private
   * @param {string} courseTitle - Titolo del corso
   * @returns {boolean}
   */
  _isRLSCourse(courseTitle) {
    if (!courseTitle) return false;
    const normalizedTitle = courseTitle.toLowerCase();
    return (
      normalizedTitle.includes('rls') ||
      normalizedTitle.includes('rappresentante dei lavoratori') ||
      normalizedTitle.includes('rappresentante lavoratori sicurezza')
    );
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
      },
      // Dati mock per tabelle presenze
      sessions: [
        {
          date: new Date('2024-01-15'),
          startTime: '09:00',
          endTime: '13:00',
          duration: 4,
          trainerName: 'Laura Bianchi',
          participants: [
            { lastName: 'Rossi', firstName: 'Mario', cf: 'RSSMRA80A01H501Z', companyName: 'Azienda Example S.r.l.' },
            { lastName: 'Verdi', firstName: 'Giuseppe', cf: 'VRDGPP75B02F205X', companyName: 'Azienda Example S.r.l.' },
            { lastName: 'Bianchi', firstName: 'Anna', cf: 'BNCNNA82C41H501K', companyName: 'Altra Azienda S.p.A.' }
          ]
        },
        {
          date: new Date('2024-01-16'),
          startTime: '09:00',
          endTime: '13:00',
          duration: 4,
          trainerName: 'Laura Bianchi',
          participants: [
            { lastName: 'Rossi', firstName: 'Mario', cf: 'RSSMRA80A01H501Z', companyName: 'Azienda Example S.r.l.' },
            { lastName: 'Verdi', firstName: 'Giuseppe', cf: 'VRDGPP75B02F205X', companyName: 'Azienda Example S.r.l.' },
            { lastName: 'Bianchi', firstName: 'Anna', cf: 'BNCNNA82C41H501K', companyName: 'Altra Azienda S.p.A.' }
          ]
        },
        {
          date: new Date('2024-01-17'),
          startTime: '14:00',
          endTime: '18:00',
          duration: 4,
          trainerName: 'Laura Bianchi',
          participants: [
            { lastName: 'Rossi', firstName: 'Mario', cf: 'RSSMRA80A01H501Z', companyName: 'Azienda Example S.r.l.' },
            { lastName: 'Verdi', firstName: 'Giuseppe', cf: 'VRDGPP75B02F205X', companyName: 'Azienda Example S.r.l.' },
            { lastName: 'Bianchi', firstName: 'Anna', cf: 'BNCNNA82C41H501K', companyName: 'Altra Azienda S.p.A.' }
          ]
        },
        {
          date: new Date('2024-01-18'),
          startTime: '14:00',
          endTime: '18:00',
          duration: 4,
          trainerName: 'Laura Bianchi',
          participants: [
            { lastName: 'Rossi', firstName: 'Mario', cf: 'RSSMRA80A01H501Z', companyName: 'Azienda Example S.r.l.' },
            { lastName: 'Verdi', firstName: 'Giuseppe', cf: 'VRDGPP75B02F205X', companyName: 'Azienda Example S.r.l.' },
            { lastName: 'Bianchi', firstName: 'Anna', cf: 'BNCNNA82C41H501K', companyName: 'Altra Azienda S.p.A.' }
          ]
        }
      ],
      participants: [
        { lastName: 'Rossi', firstName: 'Mario', cf: 'RSSMRA80A01H501Z', companyName: 'Azienda Example S.r.l.' },
        { lastName: 'Verdi', firstName: 'Giuseppe', cf: 'VRDGPP75B02F205X', companyName: 'Azienda Example S.r.l.' },
        { lastName: 'Bianchi', firstName: 'Anna', cf: 'BNCNNA82C41H501K', companyName: 'Altra Azienda S.p.A.' }
      ]
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
