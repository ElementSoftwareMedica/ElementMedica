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
    map.set('DATA_INIZIO', 'schedule.startDate');
    map.set('DATA_FINE', 'schedule.endDate');
    map.set('PROGRAMMAZIONE_SEDE', 'schedule.location');
    map.set('SEDE_CORSO', 'schedule.location');
    map.set('INDIRIZZO_SEDE', 'schedule.address');
    map.set('PROGRAMMAZIONE_MODALITA', 'schedule.deliveryMode');
    map.set('MODALITA_EROGAZIONE', 'schedule.deliveryMode');
    map.set('CODICE_EDIZIONE', 'schedule.code');
    map.set('MAX_PARTECIPANTI', 'schedule.maxParticipants');
    map.set('NUMERO_SESSIONI', 'schedule.sessionsCount');
    map.set('ORE_TOTALI', 'schedule.totalHours');
    map.set('STATO_PROGRAMMAZIONE', 'schedule.status');
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
    map.set('FORMATORE_COMPLETO', 'trainer.fullName');
    map.set('NOME_FORMATORE', 'trainer.firstName');
    map.set('COGNOME_FORMATORE', 'trainer.lastName');
    map.set('FORMATORE_EMAIL', 'trainer.email');
    map.set('EMAIL_FORMATORE', 'trainer.email');
    map.set('FORMATORE_TELEFONO', 'trainer.phone');
    map.set('TELEFONO_FORMATORE', 'trainer.phone');
    map.set('FORMATORE_QUALIFICHE', 'trainer.certifications');
    map.set('QUALIFICHE_FORMATORE', 'trainer.certifications');
    map.set('CERTIFICAZIONI_FORMATORE', 'trainer.certifications');
    map.set('SPECIALIZZAZIONI_FORMATORE', 'trainer.specialties');
    map.set('FORMATORE_TARIFFA_ORARIA', 'trainer.hourlyRate');
    map.set('TARIFFA_ORARIA', 'trainer.hourlyRate');
    map.set('FORMATORE_ORE_TOTALI', 'trainer.totalHours');
    map.set('ORE_FORMATORE', 'trainer.totalHours');
    map.set('FORMATORE_COMPENSO_TOTALE', 'trainer.totalCompensation');
    map.set('COMPENSO_TOTALE', 'trainer.totalCompensation');
    map.set('FORMATORE_RIMBORSO_SPESE', 'trainer.expenses');
    map.set('RIMBORSO_SPESE', 'trainer.expenses');
    map.set('RIMBORSO_SPESE_TESTO', 'trainer.expensesText');

    // Table markers
    map.set('TABELLA_PRESENZE', 'table.attendance');
    map.set('TABELLA_SESSIONI', 'table.sessions');
    map.set('TABELLA_PARTECIPANTI', 'table.participants');
    map.set('TABELLA_INFO_SESSIONI', 'table.sessionsInfo');
    map.set('TABELLA_PRESENTI_SESSIONE_1', 'table.attendanceSession1');
    map.set('TABELLA_PRESENTI_SESSIONE_2', 'table.attendanceSession2');
    map.set('TABELLA_PRESENTI_SESSIONE_3', 'table.attendanceSession3');
    map.set('TABELLA_PRESENTI_SESSIONE_4', 'table.attendanceSession4');
    map.set('TABELLA_PRESENZE_SESSIONE', 'tableCouseInfo.sessionAttendance');
    map.set('TABELLA_PRESENZE_SESSIONE_SEMPLICE', 'table.sessionAttendance');

    // Current date/time markers
    map.set('DATA_CORRENTE', 'current.date');
    map.set('ANNO_CORRENTE', 'current.year');
    map.set('ORA_CORRENTE', 'current.time');

    // ============================================
    // P52: CLINICA / REFERTI MEDICI
    // ============================================

    // Visita markers
    map.set('VISITA_ID', 'visita.id');
    map.set('DATA_VISITA', 'visita.dataOra');
    map.set('ORA_INIZIO_VISITA', 'visita.oraInizio');
    map.set('ORA_FINE_VISITA', 'visita.oraFine');
    map.set('PRESTAZIONE', 'visita.prestazione');
    map.set('DIAGNOSI', 'visita.diagnosi');
    map.set('ANAMNESI', 'visita.anamnesi');
    map.set('ESAME_OBIETTIVO', 'visita.esameObiettivo');
    map.set('TERAPIA', 'visita.terapia');
    map.set('NOTE_VISITA', 'visita.note');
    map.set('PARAMETRI_VITALI', 'visita.parametriVitali');
    map.set('STATO_VISITA', 'visita.stato');

    // Medico markers
    map.set('MEDICO_ID', 'medico.id');
    map.set('MEDICO_TITOLO', 'medico.titolo');
    map.set('MEDICO_NOME', 'medico.firstName');
    map.set('MEDICO_COGNOME', 'medico.lastName');
    map.set('MEDICO', 'medico.nomeCompleto');
    map.set('MEDICO_SPECIALIZZAZIONE', 'medico.specializzazione');
    map.set('MEDICO_ORDINE', 'medico.ordine');
    map.set('MEDICO_EMAIL', 'medico.email');
    map.set('MEDICO_TELEFONO', 'medico.telefono');
    map.set('FIRMA_MEDICO', 'medico.firma');

    // Paziente markers
    map.set('PAZIENTE_ID', 'paziente.id');
    map.set('PAZIENTE_NOME', 'paziente.firstName');
    map.set('PAZIENTE_COGNOME', 'paziente.lastName');
    map.set('PAZIENTE_NOME_COMPLETO', 'paziente.nomeCompleto');
    map.set('PAZIENTE_CF', 'paziente.codiceFiscale');
    map.set('PAZIENTE_DATA_NASCITA', 'paziente.dataNascita');
    map.set('PAZIENTE_LUOGO_NASCITA', 'paziente.luogoNascita');
    map.set('PAZIENTE_SESSO', 'paziente.sesso');
    map.set('PAZIENTE_ETA', 'paziente.eta');
    map.set('PAZIENTE_INDIRIZZO', 'paziente.indirizzo');
    map.set('PAZIENTE_CITTA', 'paziente.citta');
    map.set('PAZIENTE_CAP', 'paziente.cap');
    map.set('PAZIENTE_PROVINCIA', 'paziente.provincia');
    map.set('PAZIENTE_EMAIL', 'paziente.email');
    map.set('PAZIENTE_TELEFONO', 'paziente.telefono');
    map.set('PAZIENTE_CARTA_IDENTITA', 'paziente.cartaIdentita');
    map.set('FIRMA_PAZIENTE', 'paziente.firma');

    // ============================================
    // P65: PLACEHOLDER FIRMA AGGIUNTIVI
    // ============================================
    // Dipendente (per documenti MDL: privacy, sorveglianza, etc.)
    map.set('DIPENDENTE_ID', 'dipendente.id');
    map.set('DIPENDENTE_NOME', 'dipendente.firstName');
    map.set('DIPENDENTE_COGNOME', 'dipendente.lastName');
    map.set('DIPENDENTE_NOME_COMPLETO', 'dipendente.nomeCompleto');
    map.set('DIPENDENTE_CF', 'dipendente.codiceFiscale');
    map.set('DIPENDENTE_MANSIONE', 'dipendente.mansione');
    map.set('FIRMA_DIPENDENTE', 'dipendente.firma');

    // Formatore (per attestati, test corsi, registri presenze)
    map.set('FORMATORE_ID', 'formatore.id');
    map.set('FORMATORE_NOME', 'formatore.firstName');
    map.set('FORMATORE_COGNOME', 'formatore.lastName');
    map.set('FORMATORE_NOME_COMPLETO', 'formatore.nomeCompleto');
    map.set('FORMATORE_QUALIFICA', 'formatore.qualifica');
    map.set('FIRMA_FORMATORE', 'formatore.firma');

    // Datore di Lavoro (per lettere incarico, nomine)
    map.set('DATORE_ID', 'datore.id');
    map.set('DATORE_NOME', 'datore.firstName');
    map.set('DATORE_COGNOME', 'datore.lastName');
    map.set('DATORE_NOME_COMPLETO', 'datore.nomeCompleto');
    map.set('DATORE_RUOLO', 'datore.ruolo');
    map.set('FIRMA_DATORE', 'datore.firma');
    map.set('FIRMA_DATORE_LAVORO', 'datore.firma'); // Alias

    // ============================================
    // P65 FASE 2: PLACEHOLDER FIRMA DVR/SOPRALLUOGO
    // ============================================

    // RSPP (per DVR, sopralluoghi, verbali)
    map.set('RSPP_ID', 'rspp.id');
    map.set('RSPP_NOME', 'rspp.firstName');
    map.set('RSPP_COGNOME', 'rspp.lastName');
    map.set('RSPP_NOME_COMPLETO', 'rspp.nomeCompleto');
    map.set('RSPP_CF', 'rspp.codiceFiscale');
    map.set('RSPP_QUALIFICA', 'rspp.qualifica');
    map.set('FIRMA_RSPP', 'rspp.firma');

    // Medico Competente (per DVR, sopralluoghi, giudizi)
    map.set('MC_ID', 'mc.id');
    map.set('MC_NOME', 'mc.firstName');
    map.set('MC_COGNOME', 'mc.lastName');
    map.set('MC_NOME_COMPLETO', 'mc.nomeCompleto');
    map.set('MC_CF', 'mc.codiceFiscale');
    map.set('MC_ALBO', 'mc.numeroAlbo');
    map.set('MC_SPECIALIZZAZIONE', 'mc.specializzazione');
    map.set('FIRMA_MC', 'mc.firma');
    map.set('FIRMA_MEDICO_COMPETENTE', 'mc.firma'); // Alias

    // RLS - Rappresentante Lavoratori Sicurezza (per DVR, verbali)
    map.set('RLS_ID', 'rls.id');
    map.set('RLS_NOME', 'rls.firstName');
    map.set('RLS_COGNOME', 'rls.lastName');
    map.set('RLS_NOME_COMPLETO', 'rls.nomeCompleto');
    map.set('RLS_CF', 'rls.codiceFiscale');
    map.set('FIRMA_RLS', 'rls.firma');

    // Operatore (per preventivi, documenti commerciali)
    map.set('OPERATORE_ID', 'operatore.id');
    map.set('OPERATORE_NOME', 'operatore.firstName');
    map.set('OPERATORE_COGNOME', 'operatore.lastName');
    map.set('OPERATORE_NOME_COMPLETO', 'operatore.nomeCompleto');
    map.set('OPERATORE_EMAIL', 'operatore.email');
    map.set('OPERATORE_TELEFONO', 'operatore.telefono');
    map.set('FIRMA_OPERATORE', 'operatore.firma');

    // Cliente (per preventivi, contratti)
    map.set('CLIENTE_ID', 'cliente.id');
    map.set('CLIENTE_NOME', 'cliente.firstName');
    map.set('CLIENTE_COGNOME', 'cliente.lastName');
    map.set('CLIENTE_NOME_COMPLETO', 'cliente.nomeCompleto');
    map.set('CLIENTE_CF', 'cliente.codiceFiscale');
    map.set('CLIENTE_EMAIL', 'cliente.email');
    map.set('FIRMA_CLIENTE', 'cliente.firma');

    // Partecipante generico (per registri presenze, test)
    map.set('PARTECIPANTE_ID', 'partecipante.id');
    map.set('PARTECIPANTE_NOME', 'partecipante.firstName');
    map.set('PARTECIPANTE_COGNOME', 'partecipante.lastName');
    map.set('PARTECIPANTE_NOME_COMPLETO', 'partecipante.nomeCompleto');
    map.set('PARTECIPANTE_CF', 'partecipante.codiceFiscale');
    map.set('FIRMA_PARTECIPANTE', 'partecipante.firma');

    // Referto markers
    map.set('REFERTO_ID', 'referto.id');
    map.set('REFERTO_NUMERO', 'referto.numero');
    map.set('REFERTO_TITOLO', 'referto.titolo');
    map.set('REFERTO', 'referto.contenuto');
    map.set('REFERTO_DATA', 'referto.dataEmissione');
    map.set('REFERTO_DATA_FIRMA', 'referto.dataFirma');
    map.set('REFERTO_STATO', 'referto.stato');
    map.set('REFERTO_CONCLUSIONI', 'referto.conclusioni');
    map.set('REFERTO_ALLEGATI', 'referto.allegati');

    // P52: Marker speciale per generare HTML automatico di tutti i campi visita
    map.set('REFERTO_CAMPI_VISITA', 'visita.datiStrutturatiHtml');
    map.set('REFERTO_AUTO', 'visita.datiStrutturatiHtml');

    // ============================================
    // PREVENTIVI / QUOTAZIONI
    // ============================================

    // Header preventivo
    map.set('NUMERO', 'preventivo.numero');
    map.set('DATA_EMISSIONE', 'preventivo.dataEmissione');
    map.set('DATA_SCADENZA', 'preventivo.dataScadenza');
    map.set('DATA_VALIDITA', 'preventivo.dataValidita');
    map.set('LOGO_URL', 'tenant.logoUrl');

    // Fornitore (tenant - nostra azienda)
    map.set('COMPANY_NAME', 'tenant.name');
    map.set('COMPANY_ADDRESS', 'tenant.address');
    map.set('COMPANY_CAP', 'tenant.cap');
    map.set('COMPANY_CITY', 'tenant.city');
    map.set('COMPANY_PROVINCIA', 'tenant.provincia');
    map.set('COMPANY_PIVA', 'tenant.vatNumber');
    map.set('COMPANY_CF', 'tenant.fiscalCode');
    map.set('COMPANY_PHONE', 'tenant.phone');
    map.set('COMPANY_EMAIL', 'tenant.email');
    map.set('COMPANY_PEC', 'tenant.pec');
    map.set('COMPANY_WEB', 'tenant.website');

    // Alias ENTE_* (italiano) per i marker tenant
    map.set('ENTE_NOME', 'tenant.name');
    map.set('ENTE_LOGO', 'tenant.logo');
    map.set('ENTE_LOGO_SEDE', 'tenant.branchLogo');
    map.set('ENTE_LOGO_SEDE_HTML', 'tenant.branchLogoHtml');
    map.set('ENTE_INDIRIZZO', 'tenant.address');
    map.set('ENTE_TELEFONO', 'tenant.phone');
    map.set('ENTE_EMAIL', 'tenant.email');
    map.set('ENTE_SITO', 'tenant.website');

    // Cliente (azienda o persona)
    map.set('CLIENT_NAME', 'cliente.nome');
    map.set('CLIENT_ADDRESS', 'cliente.indirizzo');
    map.set('CLIENT_CAP', 'cliente.cap');
    map.set('CLIENT_CITY', 'cliente.citta');
    map.set('CLIENT_PROVINCIA', 'cliente.provincia');
    map.set('CLIENT_PIVA', 'cliente.partitaIva');
    map.set('CLIENT_CF', 'cliente.codiceFiscale');
    map.set('CLIENT_SDI', 'cliente.sdi');
    map.set('CLIENT_PHONE', 'cliente.telefono');
    map.set('CLIENT_EMAIL', 'cliente.email');

    // Servizio
    map.set('SERVICE_TYPE_LABEL', 'preventivo.tipoServizio');

    // Corso (quando tipoServizio = CORSO)
    map.set('CORSO_PARTECIPANTI', 'preventivo.numPartecipanti');
    map.set('CORSO_MODALITA', 'corso.deliveryMode');
    map.set('CORSO_SEDE', 'corso.sede');
    map.set('CORSO_DATE_INIZIO', 'corso.dataInizio');
    map.set('CORSO_DATE_FINE', 'corso.dataFine');
    map.set('CORSO_DESCRIZIONE_BREVE', 'corso.description');

    // DVR (quando tipoServizio = DVR)
    map.set('DVR_AZIENDA', 'cliente.ragioneSociale');
    map.set('DVR_NUM_DIPENDENTI', 'preventivo.dvrNumDipendenti');
    map.set('DVR_SETTORE', 'preventivo.dvrSettore');
    map.set('DVR_NUM_SEDI', 'preventivo.dvrNumSedi');
    map.set('DVR_TEMPI_CONSEGNA', 'preventivo.dvrTempiConsegna');

    // RSPP (quando tipoServizio = RSPP)
    map.set('RSPP_AZIENDA', 'cliente.ragioneSociale');
    map.set('RSPP_NUM_DIPENDENTI', 'preventivo.rsppNumDipendenti');
    map.set('RSPP_CLASSE_RISCHIO', 'preventivo.rsppClasseRischio');
    map.set('RSPP_DURATA', 'preventivo.rsppDurata');
    map.set('RSPP_PERIODICITA_VISITE', 'preventivo.rsppPeriodicitaVisite');

    // Medico Competente (quando tipoServizio = MEDICO_COMPETENTE)
    map.set('MEDICO_AZIENDA', 'cliente.ragioneSociale');
    map.set('MEDICO_NUM_DIPENDENTI', 'preventivo.medicoNumDipendenti');
    map.set('MEDICO_TIPO_VISITE', 'preventivo.medicoTipoVisite');
    map.set('MEDICO_FREQUENZA', 'preventivo.medicoFrequenza');
    map.set('MEDICO_SEDE', 'preventivo.medicoSede');

    // Altro servizio
    map.set('ALTRO_SERVIZIO_NOME', 'preventivo.titoloServizio');
    map.set('ALTRO_SERVIZIO_DESCRIZIONE', 'preventivo.altroDescrizione');
    map.set('ALTRO_QUANTITA', 'preventivo.altroQuantita');

    // Prezzi e totali
    map.set('PREZZO_UNITARIO', 'preventivo.prezzoUnitario');
    map.set('PREZZO_TOTALE', 'preventivo.prezzoTotale');
    map.set('SCONTO_TOTALE', 'preventivo.importoSconto');
    map.set('IMPORTO_FINALE', 'preventivo.imponibile');
    map.set('IVA_PERCENTUALE', 'preventivo.percentualeIva');
    map.set('IVA_IMPORTO', 'preventivo.importoIva');
    map.set('TOTALE_IVA_INCLUSA', 'preventivo.importoFinale');

    // Sconti individuali (fino a 3)
    map.set('SCONTO_1_CODICE', 'preventivo.sconto1Codice');
    map.set('SCONTO_1_DESCRIZIONE', 'preventivo.sconto1Descrizione');
    map.set('SCONTO_1_IMPORTO', 'preventivo.sconto1Importo');
    map.set('SCONTO_2_CODICE', 'preventivo.sconto2Codice');
    map.set('SCONTO_2_DESCRIZIONE', 'preventivo.sconto2Descrizione');
    map.set('SCONTO_2_IMPORTO', 'preventivo.sconto2Importo');
    map.set('SCONTO_3_CODICE', 'preventivo.sconto3Codice');
    map.set('SCONTO_3_DESCRIZIONE', 'preventivo.sconto3Descrizione');
    map.set('SCONTO_3_IMPORTO', 'preventivo.sconto3Importo');

    // Note e condizioni
    map.set('NOTE', 'preventivo.note');
    map.set('CONDIZIONI_PAGAMENTO', 'preventivo.metodoPagamento');

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
    markers.set('session.number', 'Numero sessione');
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
    markers.set('trainer.hourlyRate', 'Tariffa oraria concordata IVA inclusa (€/h)');
    markers.set('trainer.totalHours', 'Ore totali del formatore nel corso');
    markers.set('trainer.expenses', 'Rimborso spese (numero)');
    markers.set('trainer.expensesText', 'Rimborso spese (testo o "senza alcun rimborso spese")');
    markers.set('trainer.totalCompensation', 'Compenso totale IVA inclusa (tariffa x ore + spese)');

    // Co-formatore markers
    markers.set('cotrainer.fullName', 'Nome completo co-docente (se presente)');
    markers.set('cotrainer.firstName', 'Nome co-docente');
    markers.set('cotrainer.lastName', 'Cognome co-docente');

    // System markers
    markers.set('current.date', 'Data corrente');
    markers.set('current.year', 'Anno corrente');
    markers.set('current.time', 'Ora corrente');
    markers.set('tenant.id', 'ID tenant');
    markers.set('tenant.name', 'Nome ente');
    markers.set('tenant.logo', 'Logo ente (data URL per img src)');
    markers.set('tenant.branchLogo', 'Logo sede (data URL per img src)');
    markers.set('tenant.branchLogoHtml', 'Logo sede HTML (img tag completo)');
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
    markers.set('document.currentPage', 'Numero pagina corrente (alias)');
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
    markers.set('table.sessionAttendance', 'Tabella presenze semplice (Cognome, Nome, Azienda, Firma Ingresso, Firma Uscita) — senza riepilogo');
    markers.set('tableCouseInfo.sessionAttendance', 'Tabella presenze completa (presenti, riepilogo ore/argomenti, firme docente/co-docente/organizzatore)');

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
    markers.set('tenant.pec', 'PEC tenant');
    markers.set('tenant.city', 'Città sede tenant');
    markers.set('tenant.cap', 'CAP sede tenant');
    markers.set('tenant.provincia', 'Provincia sede tenant');
    markers.set('tenant.fiscalCode', 'Codice Fiscale tenant');
    markers.set('preventivo.titoloServizio', 'Titolo/oggetto del servizio');

    // ============================================
    // P52: CLINICA / REFERTI MEDICI
    // ============================================

    // Visita markers
    markers.set('visita.id', 'ID della visita');
    markers.set('visita.dataOra', 'Data della visita');
    markers.set('visita.oraInizio', 'Ora inizio visita');
    markers.set('visita.oraFine', 'Ora fine visita');
    markers.set('visita.prestazione', 'Nome della prestazione');
    markers.set('visita.diagnosi', 'Diagnosi');
    markers.set('visita.anamnesi', 'Anamnesi');
    markers.set('visita.esameObiettivo', 'Esame obiettivo');
    markers.set('visita.terapia', 'Terapia prescritta');
    markers.set('visita.note', 'Note della visita');
    markers.set('visita.parametriVitali', 'Parametri vitali (PA, FC, T°, SpO2)');
    markers.set('visita.stato', 'Stato della visita');

    // Medico markers
    markers.set('medico.id', 'ID del medico');
    markers.set('medico.titolo', 'Titolo (Dott./Dott.ssa)');
    markers.set('medico.firstName', 'Nome del medico');
    markers.set('medico.lastName', 'Cognome del medico');
    markers.set('medico.nomeCompleto', 'Nome completo del medico (Dott./Dott.ssa Nome Cognome)');
    markers.set('medico.specializzazione', 'Specializzazione');
    markers.set('medico.ordine', 'Ordine professionale e numero iscrizione');
    markers.set('medico.email', 'Email del medico');
    markers.set('medico.telefono', 'Telefono del medico');
    markers.set('medico.firma', 'Firma del medico (immagine)');

    // Paziente markers
    markers.set('paziente.id', 'ID del paziente');
    markers.set('paziente.firstName', 'Nome del paziente');
    markers.set('paziente.lastName', 'Cognome del paziente');
    markers.set('paziente.nomeCompleto', 'Nome completo del paziente');
    markers.set('paziente.codiceFiscale', 'Codice fiscale del paziente');
    markers.set('paziente.dataNascita', 'Data di nascita');
    markers.set('paziente.luogoNascita', 'Luogo di nascita');
    markers.set('paziente.sesso', 'Sesso (M/F)');
    markers.set('paziente.eta', 'Età del paziente');
    markers.set('paziente.indirizzo', 'Indirizzo completo');
    markers.set('paziente.citta', 'Città');
    markers.set('paziente.cap', 'CAP');
    markers.set('paziente.provincia', 'Provincia');
    markers.set('paziente.email', 'Email del paziente');
    markers.set('paziente.telefono', 'Telefono del paziente');
    markers.set('paziente.cartaIdentita', 'Numero carta d\'identità');
    markers.set('paziente.firma', 'Firma del paziente (immagine)');

    // ============================================
    // P65: MARKER FIRMA AGGIUNTIVI
    // ============================================

    // Dipendente markers (per documenti MDL)
    markers.set('dipendente.id', 'ID del dipendente');
    markers.set('dipendente.firstName', 'Nome del dipendente');
    markers.set('dipendente.lastName', 'Cognome del dipendente');
    markers.set('dipendente.nomeCompleto', 'Nome completo del dipendente');
    markers.set('dipendente.codiceFiscale', 'Codice fiscale del dipendente');
    markers.set('dipendente.mansione', 'Mansione del dipendente');
    markers.set('dipendente.firma', 'Firma del dipendente (immagine digitale)');

    // Formatore markers (per attestati, test corsi)
    markers.set('formatore.id', 'ID del formatore');
    markers.set('formatore.firstName', 'Nome del formatore');
    markers.set('formatore.lastName', 'Cognome del formatore');
    markers.set('formatore.nomeCompleto', 'Nome completo del formatore');
    markers.set('formatore.qualifica', 'Qualifica/titolo del formatore');
    markers.set('formatore.firma', 'Firma del formatore (immagine digitale)');

    // Datore di Lavoro markers (per lettere incarico, nomine)
    markers.set('datore.id', 'ID del datore di lavoro');
    markers.set('datore.firstName', 'Nome del datore di lavoro');
    markers.set('datore.lastName', 'Cognome del datore di lavoro');
    markers.set('datore.nomeCompleto', 'Nome completo del datore di lavoro');
    markers.set('datore.ruolo', 'Ruolo in azienda del datore');
    markers.set('datore.firma', 'Firma del datore di lavoro (immagine digitale)');

    // ============================================
    // P65 FASE 2: MARKER FIRMA DVR/SOPRALLUOGO
    // ============================================

    // RSPP markers (per DVR, sopralluoghi, verbali)
    markers.set('rspp.id', 'ID del RSPP');
    markers.set('rspp.firstName', 'Nome del RSPP');
    markers.set('rspp.lastName', 'Cognome del RSPP');
    markers.set('rspp.nomeCompleto', 'Nome completo del RSPP');
    markers.set('rspp.codiceFiscale', 'Codice fiscale del RSPP');
    markers.set('rspp.qualifica', 'Qualifica professionale RSPP');
    markers.set('rspp.firma', 'Firma del RSPP (immagine digitale)');

    // Medico Competente markers (per DVR, sopralluoghi, giudizi)
    markers.set('mc.id', 'ID del Medico Competente');
    markers.set('mc.firstName', 'Nome del Medico Competente');
    markers.set('mc.lastName', 'Cognome del Medico Competente');
    markers.set('mc.nomeCompleto', 'Nome completo del Medico Competente');
    markers.set('mc.codiceFiscale', 'Codice fiscale del MC');
    markers.set('mc.numeroAlbo', 'Numero iscrizione albo MC');
    markers.set('mc.specializzazione', 'Specializzazione del MC');
    markers.set('mc.firma', 'Firma del Medico Competente (immagine digitale)');

    // RLS markers (per DVR, verbali riunioni)
    markers.set('rls.id', 'ID del RLS');
    markers.set('rls.firstName', 'Nome del RLS');
    markers.set('rls.lastName', 'Cognome del RLS');
    markers.set('rls.nomeCompleto', 'Nome completo del RLS');
    markers.set('rls.codiceFiscale', 'Codice fiscale del RLS');
    markers.set('rls.firma', 'Firma del RLS (immagine digitale)');

    // Operatore markers (per preventivi, documenti commerciali)
    markers.set('operatore.id', 'ID dell\'operatore commerciale');
    markers.set('operatore.firstName', 'Nome dell\'operatore');
    markers.set('operatore.lastName', 'Cognome dell\'operatore');
    markers.set('operatore.nomeCompleto', 'Nome completo dell\'operatore');
    markers.set('operatore.email', 'Email dell\'operatore');
    markers.set('operatore.telefono', 'Telefono dell\'operatore');
    markers.set('operatore.firma', 'Firma dell\'operatore (immagine digitale)');

    // Cliente markers (per preventivi, contratti)
    markers.set('cliente.id', 'ID del cliente');
    markers.set('cliente.firstName', 'Nome del cliente');
    markers.set('cliente.lastName', 'Cognome del cliente');
    markers.set('cliente.nomeCompleto', 'Nome completo del cliente');
    markers.set('cliente.codiceFiscale', 'Codice fiscale del cliente');
    markers.set('cliente.email', 'Email del cliente');
    markers.set('cliente.firma', 'Firma del cliente (immagine digitale)');

    // Partecipante markers (per registri presenze, test corsi)
    markers.set('partecipante.id', 'ID del partecipante');
    markers.set('partecipante.firstName', 'Nome del partecipante');
    markers.set('partecipante.lastName', 'Cognome del partecipante');
    markers.set('partecipante.nomeCompleto', 'Nome completo del partecipante');
    markers.set('partecipante.codiceFiscale', 'Codice fiscale del partecipante');
    markers.set('partecipante.firma', 'Firma del partecipante (immagine digitale)');

    // Referto markers
    markers.set('referto.id', 'ID del referto');
    markers.set('referto.numero', 'Numero del referto');
    markers.set('referto.titolo', 'Titolo del referto');
    markers.set('referto.contenuto', 'Contenuto completo del referto');
    markers.set('referto.dataEmissione', 'Data di emissione');
    markers.set('referto.dataFirma', 'Data firma del medico');
    markers.set('referto.stato', 'Stato del referto');
    markers.set('referto.conclusioni', 'Conclusioni del referto');
    markers.set('referto.allegati', 'Elenco allegati');

    // P52: Marker speciale per generare HTML automatico di tutti i campi visita
    markers.set('visita.datiStrutturatiHtml', 'HTML formattato con tutti i campi della visita compilati dal medico');

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
    if (marker === 'document.pageNumber' || marker === 'document.totalPages' || marker === 'document.currentPage') {
      return `{{document.${marker === 'document.currentPage' ? 'pageNumber' : marker.split('.')[1]}}}`; // Ritorna il marker intatto per elaborazione successiva
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

    // Gestione speciale per tabella presenze sessione semplice
    if (marker === 'table.sessionAttendance') {
      return this._generateSimpleSessionAttendanceTable(context);
    }

    // Gestione speciale per tabella presenze sessione completa (con riepilogo)
    if (marker === 'tableCouseInfo.sessionAttendance') {
      return this._generateSessionAttendanceTable(context);
    }

    // P52: Gestione speciale per HTML campi visita (referto automatico)
    if (marker === 'visita.datiStrutturatiHtml') {
      return this._generateVisitaDatiStrutturatiHtml(context);
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
        const _debugVal = typeof value === 'object'
          ? JSON.stringify(value).substring(0, 80)
          : String(value).substring(0, 100) + (typeof value === 'string' && value.length > 100 ? '…[trunc]' : '');
        logger.debug(`✅ Marker '${marker}' resolved to: ${_debugVal}`);
      }
    }

    // Se il valore non esiste, prova a generarlo dinamicamente per system markers
    if (value === null && marker.startsWith('current.')) {
      value = this._resolveSystemMarker(marker);
    }

    // Auto-formattazione date: se il marker contiene 'date' o 'Date' e non c'è formatter,
    // formatta automaticamente con DD/MM/YYYY (convenzione italiana)
    const isDateMarker = marker.toLowerCase().includes('date') ||
      marker === 'current.date' ||
      marker.endsWith('.startDate') ||
      marker.endsWith('.endDate') ||
      marker.endsWith('.birthDate');

    if (isDateMarker && !formatter && value) {
      // Se il valore è già una stringa formattata (es. "13/01/2025"), non ri-formattare
      if (typeof value === 'string' && /^\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4}$/.test(value.trim())) {
        // Già formattata — lascia così com'è
      } else {
        // Formatta da Date/ISO string
        const dateValue = value instanceof Date ? value : new Date(value);
        if (!isNaN(dateValue.getTime())) {
          value = this.formatterRegistry.format('date', dateValue, ['DD/MM/YYYY']);
        }
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

    // Auto-formattazione trainer.hourlyRate: formato valuta italiana con indicazione IVA inclusa
    if (marker === 'trainer.hourlyRate' && !formatter && value !== null && value !== undefined) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        value = `€ ${num.toFixed(2).replace('.', ',')} (IVA inclusa)`;
      }
    }

    // Auto-formattazione trainer.totalCompensation: solo numero formattato (il template ha già €)
    if (marker === 'trainer.totalCompensation' && !formatter && value !== null && value !== undefined) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        value = `${num.toFixed(2).replace('.', ',')} (IVA inclusa)`;
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
          const lastName = escapeHtml(participant.lastName || '');
          const firstName = escapeHtml(participant.firstName || '');
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
      const lastName = escapeHtml(participant.lastName || '');
      const firstName = escapeHtml(participant.firstName || '');
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
        const lastName = escapeHtml(participant.lastName || '');
        const firstName = escapeHtml(participant.firstName || '');
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
   * {{table.sessionAttendance}} — versione SEMPLICE
   * Solo: numero, cognome, nome, azienda, firma ingresso, firma uscita
   * Nessun riepilogo né righe firme finali
   * @private
   */
  _generateSimpleSessionAttendanceTable(context) {
    let participants = context.get('participants') || [];

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
    `;
    const tdStyle = `
      border: 1px solid #000;
      padding: 6px;
      text-align: left;
      min-height: 30px;
    `;
    const thSignStyle = `
      border: 1px solid #000;
      border-left: 2px solid #000;
      background-color: #f0f0f0;
      padding: 6px;
      text-align: center;
      font-weight: bold;
      width: 15%;
    `;
    const tdSignStyle = `
      border: 1px solid #000;
      border-left: 2px solid #000;
      padding: 6px;
      text-align: center;
      width: 15%;
      min-height: 30px;
    `;

    const sorted = [...participants].sort((a, b) => {
      const cA = (a.companyName || a.azienda || '').toLowerCase();
      const cB = (b.companyName || b.azienda || '').toLowerCase();
      if (cA < cB) return -1;
      if (cA > cB) return 1;
      return (a.lastName || '').toLowerCase().localeCompare((b.lastName || '').toLowerCase());
    });

    let html = `<table style="${tableStyle}">
      <colgroup>
        <col style="width: 5%;">
        <col style="width: 20%;">
        <col style="width: 20%;">
        <col style="width: 25%;">
        <col style="width: 15%;">
        <col style="width: 15%;">
      </colgroup>
      <thead>
        <tr>
          <th style="${thStyle}">N.</th>
          <th style="${thStyle}">Cognome</th>
          <th style="${thStyle}">Nome</th>
          <th style="${thStyle}">Azienda</th>
          <th style="${thSignStyle}">Firma Ingresso</th>
          <th style="${thSignStyle}">Firma Uscita</th>
        </tr>
      </thead>
      <tbody>`;

    if (sorted.length > 0) {
      sorted.forEach((p, i) => {
        html += `
          <tr>
            <td style="${tdStyle}">${i + 1}</td>
            <td style="${tdStyle}">${escapeHtml(p.lastName || '')}</td>
            <td style="${tdStyle}">${escapeHtml(p.firstName || '')}</td>
            <td style="${tdStyle}">${escapeHtml(p.companyName || p.azienda || '')}</td>
            <td style="${tdSignStyle}"></td>
            <td style="${tdSignStyle}"></td>
          </tr>`;
      });
    } else {
      for (let i = 1; i <= 10; i++) {
        html += `
          <tr>
            <td style="${tdStyle}">${i}</td>
            <td style="${tdStyle}"></td>
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

  /**
   * {{tableCouseInfo.sessionAttendance}} — versione COMPLETA
   * Include: presenti ordinati, 3 righe extra, riepilogo totali/argomenti/moduli,
   * righe firma organizzatore, docente e co-docente
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

      const lastNameA = (a.lastName || '').toLowerCase();
      const lastNameB = (b.lastName || '').toLowerCase();
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
        const lastName = escapeHtml(participant.lastName || '');
        const firstName = escapeHtml(participant.firstName || '');
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

    // 3 righe vuote aggiuntive per iscritti extra
    for (let i = 1; i <= 3; i++) {
      html += `
        <tr>
          <td style="${tdStyle}"></td>
          <td style="${tdStyle}"></td>
          <td style="${tdStyle}"></td>
          <td style="${tdStyle}"></td>
          <td style="${tdFirstSignStyle}"></td>
          <td style="${tdSignStyle}"></td>
        </tr>`;
    }

    // Dati per righe di riepilogo firme
    const tenantName = escapeHtml(context.get('tenant.name') || '');
    const trainerFullName = escapeHtml(context.get('trainer.fullName') || '');
    const cotrainerFullName = escapeHtml(context.get('cotrainer.fullName') || '');

    // Stile cella di riepilogo (bordo scuro, senza sfondo)
    const tdSummaryLabelStyle = `
      border: 1px solid #000;
      padding: 8px;
      font-weight: bold;
      font-size: 11px;
      vertical-align: middle;
    `;
    const tdSummaryValueStyle = `
      border: 1px solid #000;
      padding: 8px;
      font-size: 11px;
      vertical-align: middle;
    `;
    const tdSummaryTallStyle = `
      border: 1px solid #000;
      padding: 8px;
      font-size: 11px;
      vertical-align: top;
      height: 70px;
    `;

    // Righe di riepilogo — usano colspan per la larghezza desiderata
    // Totale Presenze (75% + 25%)
    html += `
      <tr>
        <td colspan="4" style="${tdSummaryLabelStyle}">Totale Presenze del Giorno:</td>
        <td colspan="2" style="${tdSummaryValueStyle}"></td>
      </tr>
      <tr>
        <td colspan="4" style="${tdSummaryLabelStyle}">Totale ore del giorno:</td>
        <td colspan="2" style="${tdSummaryValueStyle}"></td>
      </tr>
      <tr>
        <td colspan="2" style="${tdSummaryLabelStyle}">Moduli svolti:</td>
        <td colspan="4" style="${tdSummaryValueStyle}"></td>
      </tr>
      <tr>
        <td colspan="2" style="${tdSummaryLabelStyle}">Argomenti:</td>
        <td colspan="4" style="${tdSummaryTallStyle}"></td>
      </tr>
      <tr>
        <td colspan="4" style="${tdSummaryLabelStyle}">Firma del Soggetto Organizzatore</td>
        <td colspan="2" style="${tdSummaryValueStyle}">${tenantName}</td>
      </tr>
      <tr>
        <td colspan="2" style="${tdSummaryLabelStyle}">Firma del Docente</td>
        <td colspan="2" style="${tdSummaryValueStyle}">${trainerFullName}</td>
        <td colspan="2" style="${tdSummaryValueStyle}"></td>
      </tr>
      <tr>
        <td colspan="2" style="${tdSummaryLabelStyle}">Firma del Co-Docente</td>
        <td colspan="2" style="${tdSummaryValueStyle}">${cotrainerFullName}</td>
        <td colspan="2" style="${tdSummaryValueStyle}"></td>
      </tr>`;

    html += '</tbody></table>';
    return html;
  }

  /**
   * P52: Genera HTML formattato con tutti i campi della visita compilati
   * 
   * Questo marker speciale {{visita.datiStrutturatiHtml}} genera automaticamente
   * un documento HTML elegante con tutti i campi della visita organizzati per sezione.
   * 
   * @private
   * @param {MarkerContext} context - Contesto con i dati della visita
   * @returns {string} - HTML formattato con i campi della visita
   */
  _generateVisitaDatiStrutturatiHtml(context) {
    // Recupera i dati strutturati e il template della visita
    const datiStrutturati = context.get('visita.datiStrutturati') || context.get('datiStrutturati') || {};
    const template = context.get('visita.template') || context.get('template') || null;

    // Se non ci sono dati strutturati, ritorna messaggio placeholder
    if (!datiStrutturati || Object.keys(datiStrutturati).length === 0) {
      return '<p style="color: #666; font-style: italic;">Nessun dato della visita disponibile.</p>';
    }

    // Stili CSS per il referto
    const sectionStyle = `
      margin-bottom: 20px;
      page-break-inside: avoid;
    `;
    const sectionTitleStyle = `
      font-size: 14px;
      font-weight: bold;
      color: #2c5282;
      border-bottom: 2px solid #4299e1;
      padding-bottom: 6px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    const fieldRowStyle = `
      margin-bottom: 10px;
      display: flex;
      flex-wrap: wrap;
    `;
    const fieldLabelStyle = `
      font-weight: 600;
      color: #4a5568;
      font-size: 11px;
      text-transform: uppercase;
      margin-bottom: 4px;
    `;
    const fieldValueStyle = `
      font-size: 12px;
      color: #1a202c;
      line-height: 1.5;
      padding: 8px;
      background-color: #f7fafc;
      border-left: 3px solid #4299e1;
      border-radius: 0 4px 4px 0;
    `;
    const richTextValueStyle = `
      font-size: 12px;
      color: #1a202c;
      line-height: 1.6;
      padding: 10px;
      background-color: #f7fafc;
      border-left: 3px solid #4299e1;
      border-radius: 0 4px 4px 0;
    `;
    const vitalsGridStyle = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      padding: 10px;
      background-color: #f0fff4;
      border: 1px solid #9ae6b4;
      border-radius: 6px;
    `;
    const vitalItemStyle = `
      text-align: center;
      padding: 8px;
      background-color: white;
      border-radius: 4px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    `;
    const vitalValueStyle = `
      font-size: 18px;
      font-weight: bold;
      color: #276749;
    `;
    const vitalLabelStyle = `
      font-size: 10px;
      color: #718096;
      text-transform: uppercase;
    `;

    // Mappa sezioni con etichette italiane
    const SECTION_LABELS = {
      anamnesi: 'Anamnesi',
      vitali: 'Parametri Vitali',
      esame: 'Esame Obiettivo',
      diagnosi: 'Diagnosi',
      terapia: 'Terapia',
      followup: 'Follow-up',
      allegati: 'Allegati',
      storia: 'Storia Clinica'
    };

    // Mappa nomi campi -> etichette leggibili
    const FIELD_LABELS = {
      anamnesiFamiliare: 'Anamnesi Familiare',
      anamnesiPatologicaRemota: 'Anamnesi Patologica Remota',
      anamnesiPatologicaProssima: 'Anamnesi Patologica Prossima',
      anamnesiProssima: 'Anamnesi Prossima',
      peso: 'Peso (kg)',
      altezza: 'Altezza (cm)',
      bmi: 'BMI',
      pressioneSistolica: 'Pressione Sistolica (mmHg)',
      pressioneDiastolica: 'Pressione Diastolica (mmHg)',
      frequenzaCardiaca: 'Frequenza Cardiaca (bpm)',
      saturazioneO2: 'Saturazione O2 (%)',
      temperatura: 'Temperatura (°C)',
      esameObiettivo: 'Esame Obiettivo',
      esameObiettivoCardiaco: 'Esame Obiettivo Cardiaco',
      esameObiettivoToracico: 'Esame Obiettivo Toracico',
      diagnosiPrincipale: 'Diagnosi Principale',
      diagnosiSecondarie: 'Diagnosi Secondarie',
      terapia: 'Terapia',
      noteTerapia: 'Note Terapia',
      followUp: 'Follow-up',
      dataFollowUp: 'Data Follow-up',
      noteFollowUp: 'Note Follow-up'
    };

    // Organizza i dati per sezione se abbiamo il template
    let html = '';

    // Se abbiamo il template, organizza per sezioni
    if (template && template.fields) {
      const fieldsBySection = {};

      // Raggruppa campi per sezione
      template.fields.forEach(field => {
        if (!field.visible) return;
        const section = field.section || 'altro';
        if (!fieldsBySection[section]) {
          fieldsBySection[section] = [];
        }
        fieldsBySection[section].push(field);
      });

      // Ordine sezioni
      const sectionOrder = ['anamnesi', 'vitali', 'esame', 'diagnosi', 'terapia', 'followup'];

      sectionOrder.forEach(sectionId => {
        const fields = fieldsBySection[sectionId];
        if (!fields || fields.length === 0) return;

        // Filtra solo campi con valore
        const fieldsWithValue = fields.filter(f => {
          const val = datiStrutturati[f.name];
          return val !== undefined && val !== null && val !== '';
        });

        if (fieldsWithValue.length === 0) return;

        html += `<div style="${sectionStyle}">`;
        html += `<h3 style="${sectionTitleStyle}">${escapeHtml(SECTION_LABELS[sectionId] || sectionId)}</h3>`;

        // Render campi vitali in griglia speciale
        if (sectionId === 'vitali') {
          html += `<div style="${vitalsGridStyle}">`;
          fieldsWithValue.forEach(field => {
            const value = datiStrutturati[field.name];
            const label = FIELD_LABELS[field.name] || field.label || field.name;
            html += `
              <div style="${vitalItemStyle}">
                <div style="${vitalValueStyle}">${escapeHtml(String(value))}</div>
                <div style="${vitalLabelStyle}">${escapeHtml(label)}</div>
              </div>
            `;
          });
          html += '</div>';
        } else {
          // Render altri campi
          fieldsWithValue.forEach(field => {
            const value = datiStrutturati[field.name];
            const label = FIELD_LABELS[field.name] || field.label || field.name;

            html += `<div style="${fieldRowStyle}">`;
            html += `<div style="width: 100%;">`;
            html += `<div style="${fieldLabelStyle}">${escapeHtml(label)}</div>`;

            // Usa stile diverso per rich text
            if (field.type === 'RICHTEXT') {
              html += `<div style="${richTextValueStyle}">${value}</div>`;
            } else {
              html += `<div style="${fieldValueStyle}">${escapeHtml(String(value))}</div>`;
            }

            html += '</div></div>';
          });
        }

        html += '</div>';
      });
    } else {
      // Fallback: render tutti i dati senza organizzazione per sezione
      html += `<div style="${sectionStyle}">`;
      html += `<h3 style="${sectionTitleStyle}">Dati Visita</h3>`;

      Object.entries(datiStrutturati).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;

        const label = FIELD_LABELS[key] || key;
        html += `<div style="${fieldRowStyle}">`;
        html += `<div style="width: 100%;">`;
        html += `<div style="${fieldLabelStyle}">${escapeHtml(label)}</div>`;

        // Controlla se il valore sembra HTML
        const isHtml = typeof value === 'string' && (value.includes('<') && value.includes('>'));
        if (isHtml) {
          html += `<div style="${richTextValueStyle}">${value}</div>`;
        } else {
          html += `<div style="${fieldValueStyle}">${escapeHtml(String(value))}</div>`;
        }

        html += '</div></div>';
      });

      html += '</div>';
    }

    return html || '<p style="color: #666; font-style: italic;">Nessun dato della visita compilato.</p>';
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
   * Processa i blocchi condizionali {{#IF_*}}...{{/IF_*}} nel template
   * 
   * Supporta i seguenti condizionali per preventivi:
   * - {{#IF_AZIENDA}}...{{/IF_AZIENDA}} - cliente è azienda
   * - {{#IF_PERSONA}}...{{/IF_PERSONA}} - cliente è persona fisica
   * - {{#IF_CORSO}}...{{/IF_CORSO}} - tipo servizio è CORSO
   * - {{#IF_DVR}}...{{/IF_DVR}} - tipo servizio è DVR
   * - {{#IF_RSPP}}...{{/IF_RSPP}} - tipo servizio è RSPP
   * - {{#IF_MEDICO}}...{{/IF_MEDICO}} - tipo servizio è MEDICO_COMPETENTE
   * - {{#IF_ALTRO}}...{{/IF_ALTRO}} - tipo servizio è ALTRO o non riconosciuto
   * - {{#IF_SCONTI}}...{{/IF_SCONTI}} - ci sono sconti applicati
   * - {{#IF_NOTE}}...{{/IF_NOTE}} - ci sono note
   * - {{#IF_COMPANY_WEB}}...{{/IF_COMPANY_WEB}} - tenant ha website
   * - {{#IF_CORSO_DATE}}...{{/IF_CORSO_DATE}} - corso ha date previste
   * - {{#IF_CORSO_SEDE}}...{{/IF_CORSO_SEDE}} - corso ha sede specificata
   * - {{#SCONTO_N}}...{{/SCONTO_N}} - sconto N esiste (N = 1, 2, 3)
   * 
   * @private
   * @param {string} template - Template con blocchi condizionali
   * @param {MarkerContext} context - Contesto dei marker
   * @param {Object} data - Dati originali
   * @returns {string} - Template con condizionali processati
   */
  _processConditionalBlocks(template, context, data) {
    let result = template;

    // Definisci le condizioni di valutazione
    const conditions = {
      'IF_AZIENDA': () => !!(data.azienda || data.company || data.cliente?.ragioneSociale),
      'IF_PERSONA': () => !!(data.persona || data.person) && !data.azienda && !data.company,
      'IF_CORSO': () => {
        const tipoServizio = data.preventivo?.tipoServizio || '';
        return tipoServizio === 'CORSO' || tipoServizio === 'Formazione';
      },
      'IF_DVR': () => {
        const tipoServizio = data.preventivo?.tipoServizio || '';
        return tipoServizio === 'DVR';
      },
      'IF_RSPP': () => {
        const tipoServizio = data.preventivo?.tipoServizio || '';
        return tipoServizio === 'RSPP';
      },
      'IF_MEDICO': () => {
        const tipoServizio = data.preventivo?.tipoServizio || '';
        return tipoServizio === 'MEDICO_COMPETENTE' || tipoServizio === 'Medicina del Lavoro';
      },
      'IF_ALTRO': () => {
        const tipoServizio = data.preventivo?.tipoServizio || '';
        return tipoServizio === 'ALTRO' || tipoServizio === 'Altro' ||
          tipoServizio === 'CONSULENZA' || tipoServizio === 'Consulenza' ||
          tipoServizio === 'COMPENSO_FORMATORE' ||
          !['CORSO', 'DVR', 'RSPP', 'MEDICO_COMPETENTE', 'Formazione', 'Medicina del Lavoro'].includes(tipoServizio);
      },
      'IF_SCONTI': () => {
        const scontoTotale = parseFloat(data.preventivo?.importoSconto || 0);
        return scontoTotale > 0 || (data.preventivo?.sconti && data.preventivo.sconti.length > 0);
      },
      'IF_NOTE': () => !!(data.preventivo?.note && data.preventivo.note.trim()),
      'IF_COMPANY_WEB': () => !!(data.tenant?.website),
      'IF_CORSO_DATE': () => !!(data.corso?.dataInizio || data.schedule?.startDate),
      'IF_CORSO_SEDE': () => !!(data.corso?.sede || data.schedule?.location),
      'SCONTO_1': () => !!(data.preventivo?.sconto1Codice || data.preventivo?.sconti?.[0]),
      'SCONTO_2': () => !!(data.preventivo?.sconto2Codice || data.preventivo?.sconti?.[1]),
      'SCONTO_3': () => !!(data.preventivo?.sconto3Codice || data.preventivo?.sconti?.[2])
    };

    // Processa ogni tipo di condizionale
    for (const [condName, evaluator] of Object.entries(conditions)) {
      // Pattern per blocchi {{#COND}}...{{/COND}}
      const regex = new RegExp(`\\{\\{#${condName}\\}\\}([\\s\\S]*?)\\{\\{/${condName}\\}\\}`, 'g');
      const shouldShow = evaluator();

      result = result.replace(regex, (match, content) => {
        if (shouldShow) {
          return content; // Mostra il contenuto
        }
        return ''; // Rimuovi il blocco
      });
    }

    return result;
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

    // FASE 1: Processa blocchi condizionali {{#IF_*}}...{{/IF_*}}
    let resolved = this._processConditionalBlocks(template, context, data);

    // Estrai marker
    const markers = this.parseMarkers(resolved);

    // Risolvi ogni marker
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

    // Post-processing: converti data URI orfani (non dentro src=) in <img> tag
    // Gestisce template legacy dove {{tenant.logo}} era inserito come testo
    resolved = resolved.replace(
      /(?<!src=["'])(?<!src=["'])\b(data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]{20,})/g,
      '<img src="$1" alt="Logo" style="max-width:220px;max-height:80px;object-fit:contain;">'
    );

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
        name: 'Element srl',
        logo: 'data:image/png;base64,...',
        branchLogo: 'data:image/png;base64,...',
        branchLogoHtml: '<img src="data:image/png;base64,..." alt="Logo Branch" style="max-height:80px;max-width:220px;object-fit:contain;">',
        logoHtml: '<img src="data:image/png;base64,..." alt="Element srl" style="max-height:80px;max-width:220px;object-fit:contain;">',
        address: 'Via Training 1, 20100 Milano',
        phone: '02 87654321',
        email: 'info@element-srl.it',
        website: 'www.element-srl.it'
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
