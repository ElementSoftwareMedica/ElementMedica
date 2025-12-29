/**
 * Activity Formatter
 * Formattazione e sanitizzazione dei dati di attività
 * 
 * GDPR Compliance:
 * - Rimozione automatica dati sensibili
 * - Sanitizzazione IP e User Agent
 * - Truncation per prevenire overflow
 * 
 * @module ActivityFormatter
 */

import logger from '../../utils/logger.js';

/**
 * Lista di chiavi sensibili da rimuovere dai metadata
 * @constant {string[]}
 */
const SENSITIVE_KEYS = [
  'password',
  'pwd',
  'secret',
  'token',
  'apikey',
  'api_key',
  'apiKey',
  'accesstoken',
  'access_token',
  'accessToken',
  'refreshtoken',
  'refresh_token',
  'refreshToken',
  'creditcard',
  'credit_card',
  'creditCard',
  'cvv',
  'cvc',
  'ssn',
  'taxcode',
  'tax_code',
  'taxCode',
  'codicefiscale',
  'codice_fiscale',
  'codiceFiscale',
  'iban',
  'accountnumber',
  'account_number',
  'accountNumber',
  'pin',
  'otp',
  'authorization',
  'auth'
];

/**
 * Pattern regex per dati sensibili
 * @constant {RegExp[]}
 */
const SENSITIVE_PATTERNS = [
  /password['":\s]*[^,}\s"']+/gi,
  /token['":\s]*[^,}\s"']+/gi,
  /secret['":\s]*[^,}\s"']+/gi,
  /apikey['":\s]*[^,}\s"']+/gi,
  /bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
  /\b[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]\b/gi, // Codice fiscale italiano
  /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}\b/gi, // IBAN pattern
  /\b\d{3}-?\d{2}-?\d{4}\b/g, // SSN pattern
  /\b\d{16}\b/g, // Credit card (16 digits)
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g // Credit card with separators
];

/**
 * Placeholder per dati redatti
 * @constant {string}
 */
const REDACTED = '[REDACTED]';

/**
 * Lunghezza massima per campi stringa
 * @constant {Object}
 */
const MAX_LENGTHS = {
  userAgent: 500,
  details: 5000,
  errorMessage: 1000,
  ipAddress: 45 // IPv6 max length
};

/**
 * Classe per la formattazione e sanitizzazione delle attività
 */
class ActivityFormatter {
  /**
   * Sanitizza un oggetto metadata rimuovendo dati sensibili
   * 
   * @param {Object|null} metadata - Oggetto metadata da sanitizzare
   * @returns {Object|null} Metadata sanitizzato
   */
  sanitizeMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    try {
      const sanitized = this._deepSanitize(metadata);
      return sanitized;
    } catch (error) {
      logger.warn('ActivityFormatter: Error sanitizing metadata', {
        error: error.message
      });
      return { _sanitizationError: true };
    }
  }

  /**
   * Sanitizzazione ricorsiva profonda
   * 
   * @private
   * @param {any} obj - Oggetto da sanitizzare
   * @param {number} depth - Profondità corrente (max 10)
   * @returns {any} Oggetto sanitizzato
   */
  _deepSanitize(obj, depth = 0) {
    // Previeni stack overflow
    if (depth > 10) {
      return '[MAX_DEPTH_EXCEEDED]';
    }

    // Gestisci null/undefined
    if (obj === null || obj === undefined) {
      return null;
    }

    // Gestisci array
    if (Array.isArray(obj)) {
      return obj.map(item => this._deepSanitize(item, depth + 1));
    }

    // Gestisci oggetti
    if (typeof obj === 'object') {
      const sanitized = {};

      for (const [key, value] of Object.entries(obj)) {
        // Controlla se la chiave è sensibile
        if (this._isSensitiveKey(key)) {
          sanitized[key] = REDACTED;
        } else if (typeof value === 'string') {
          sanitized[key] = this._sanitizeString(value);
        } else if (typeof value === 'object') {
          sanitized[key] = this._deepSanitize(value, depth + 1);
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    }

    // Gestisci stringhe
    if (typeof obj === 'string') {
      return this._sanitizeString(obj);
    }

    // Altri tipi primitivi
    return obj;
  }

  /**
   * Verifica se una chiave è sensibile
   * 
   * @private
   * @param {string} key - Nome della chiave
   * @returns {boolean}
   */
  _isSensitiveKey(key) {
    const lowerKey = key.toLowerCase();
    return SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive.toLowerCase()));
  }

  /**
   * Sanitizza una stringa rimuovendo pattern sensibili
   * 
   * @private
   * @param {string} str - Stringa da sanitizzare
   * @returns {string} Stringa sanitizzata
   */
  _sanitizeString(str) {
    if (!str || typeof str !== 'string') {
      return str;
    }

    let sanitized = str;

    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, REDACTED);
    }

    return sanitized;
  }

  /**
   * Sanitizza una stringa di dettagli (legacy field)
   * 
   * @param {string|null} details - Stringa dettagli
   * @returns {string|null} Dettagli sanitizzati e troncati
   */
  sanitizeDetails(details) {
    if (!details) return null;

    let sanitized = String(details);

    // Applica pattern sanitization
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, REDACTED);
    }

    // Tronca se troppo lungo
    if (sanitized.length > MAX_LENGTHS.details) {
      sanitized = sanitized.substring(0, MAX_LENGTHS.details) + '...[TRUNCATED]';
    }

    return sanitized;
  }

  /**
   * Sanitizza e normalizza un indirizzo IP
   * Gestisce formati proxy e IPv6
   * 
   * @param {string|null} ip - Indirizzo IP
   * @returns {string|null} IP sanitizzato
   */
  sanitizeIpAddress(ip) {
    if (!ip) return null;

    let cleaned = ip;

    // Rimuovi prefisso IPv6-mapped IPv4
    cleaned = cleaned.replace(/^::ffff:/, '');

    // Rimuovi escape characters
    cleaned = cleaned.replace(/\\/g, '');

    // Prendi solo il primo IP se c'è una lista (X-Forwarded-For)
    if (cleaned.includes(',')) {
      cleaned = cleaned.split(',')[0].trim();
    }

    // Tronca se troppo lungo
    if (cleaned.length > MAX_LENGTHS.ipAddress) {
      cleaned = cleaned.substring(0, MAX_LENGTHS.ipAddress);
    }

    return cleaned || null;
  }

  /**
   * Sanitizza e tronca User-Agent
   * 
   * @param {string|null} userAgent - Header User-Agent
   * @returns {string|null} User-Agent troncato
   */
  sanitizeUserAgent(userAgent) {
    if (!userAgent) return null;

    let cleaned = String(userAgent);

    // Rimuovi caratteri di controllo
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');

    // Tronca
    if (cleaned.length > MAX_LENGTHS.userAgent) {
      cleaned = cleaned.substring(0, MAX_LENGTHS.userAgent);
    }

    return cleaned || null;
  }

  /**
   * Formatta un messaggio di errore
   * 
   * @param {Error|string|null} error - Errore da formattare
   * @returns {string|null} Messaggio formattato (senza stack trace)
   */
  formatErrorMessage(error) {
    if (!error) return null;

    let message;

    if (error instanceof Error) {
      // MAI includere stack trace nei log per GDPR/security
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (typeof error === 'object' && error.message) {
      message = error.message;
    } else {
      message = String(error);
    }

    // Sanitizza pattern sensibili
    message = this._sanitizeString(message);

    // Tronca
    if (message.length > MAX_LENGTHS.errorMessage) {
      message = message.substring(0, MAX_LENGTHS.errorMessage) + '...[TRUNCATED]';
    }

    return message;
  }

  /**
   * Estrae informazioni del device da User-Agent
   * Utile per analytics
   * 
   * @param {string|null} userAgent - Header User-Agent
   * @returns {Object} Informazioni device
   */
  parseDeviceInfo(userAgent) {
    if (!userAgent) {
      return { type: 'unknown', os: 'unknown', browser: 'unknown' };
    }

    const ua = userAgent.toLowerCase();

    // Detect device type
    let type = 'desktop';
    if (/mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)) {
      type = 'mobile';
    } else if (/tablet|ipad/i.test(ua)) {
      type = 'tablet';
    }

    // Detect OS
    let os = 'unknown';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

    // Detect browser
    let browser = 'unknown';
    if (/chrome/i.test(ua) && !/edge|edg/i.test(ua)) browser = 'Chrome';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/edge|edg/i.test(ua)) browser = 'Edge';
    else if (/msie|trident/i.test(ua)) browser = 'IE';

    return { type, os, browser };
  }

  /**
   * Formatta i dati di una attività per il salvataggio
   * 
   * @param {Object} activityData - Dati grezzi dell'attività
   * @returns {Object} Dati formattati e sanitizzati
   */
  formatForStorage(activityData) {
    return {
      personId: activityData.personId,
      action: activityData.action,
      category: activityData.category,
      resource: activityData.resource || null,
      resourceId: activityData.resourceId || null,
      details: this.sanitizeDetails(activityData.details),
      metadata: this.sanitizeMetadata(activityData.metadata),
      ipAddress: this.sanitizeIpAddress(activityData.ipAddress),
      userAgent: this.sanitizeUserAgent(activityData.userAgent),
      sessionId: activityData.sessionId || null,
      duration: typeof activityData.duration === 'number' ? activityData.duration : null,
      success: activityData.success !== false,
      errorCode: activityData.errorCode || null,
      tenantId: activityData.tenantId,
      timestamp: activityData.timestamp || new Date()
    };
  }
}

// Export singleton instance
export const activityFormatter = new ActivityFormatter();

// Export class for testing
export { ActivityFormatter };

export default activityFormatter;
