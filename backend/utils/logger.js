import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// GDPR PII SANITIZATION
// ==========================================

/**
 * Patterns per identificare PII nei log
 * GDPR Compliance: Art. 25 - Privacy by Design
 */
const PII_PATTERNS = {
  // Email: any@domain.com
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Phone: international and local formats
  phone: /(?:\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,6}/g,
  // Italian Tax Code (Codice Fiscale)
  taxCode: /[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]/gi,
  // IBAN
  iban: /[A-Z]{2}\d{2}[A-Z0-9]{4,30}/gi,
  // Credit Card (basic pattern)
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  // Italian SSN / Partita IVA
  partitaIva: /\b\d{11}\b/g,
  // JWT tokens (don't log full tokens)
  jwt: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
  // Passwords (common field names in JSON)
  password: /"password"\s*:\s*"[^"]+"/gi
};

/**
 * Sanitizza PII da una stringa o oggetto
 * @param {string|object} data - Dati da sanitizzare
 * @returns {string|object} - Dati sanitizzati
 */
function sanitizePII(data) {
  if (data === null || data === undefined) return data;

  let str;
  const isObject = typeof data === 'object';

  try {
    str = isObject ? JSON.stringify(data) : String(data);
  } catch (e) {
    return '[SERIALIZATION_ERROR]';
  }

  // Apply all PII patterns
  for (const [key, pattern] of Object.entries(PII_PATTERNS)) {
    str = str.replace(pattern, `[REDACTED_${key.toUpperCase()}]`);
  }

  if (isObject) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return str;
    }
  }

  return str;
}

/**
 * Winston format che sanitizza PII automaticamente
 */
const sanitizePIIFormat = winston.format((info) => {
  // Skip sanitization in development if explicitly disabled
  if (process.env.LOG_DISABLE_PII_SANITIZATION === 'true' && process.env.NODE_ENV === 'development') {
    return info;
  }

  // Sanitize message
  if (info.message) {
    info.message = sanitizePII(info.message);
  }

  // Sanitize metadata
  const sensitiveFields = ['email', 'phone', 'taxCode', 'codiceFiscale', 'password', 'token', 'iban'];
  for (const field of sensitiveFields) {
    if (info[field]) {
      info[field] = `[REDACTED_${field.toUpperCase()}]`;
    }
  }

  return info;
});

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define different log formats
const logFormat = winston.format.combine(
  sanitizePIIFormat(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define structured format for file logging
const fileFormat = winston.format.combine(
  sanitizePIIFormat(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Define audit format for security events
const auditFormat = winston.format.combine(
  sanitizePIIFormat(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.json(),
  winston.format.printf((info) => {
    return JSON.stringify({
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
      personId: info.personId || null,
      action: info.action || null,
      resource: info.resource || null,
      ip: info.ip || null,
      userAgent: info.userAgent || null,
      ...info.metadata
    });
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');

// Define transports
const transports = [
  // Console transport for development
  new winston.transports.Console({
    format: logFormat,
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: path.join(logsDir, 'app.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // File transport for errors only
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create the main logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// Create audit logger for security events
const auditLogger = winston.createLogger({
  level: 'info',
  format: auditFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
  exitOnError: false,
});

// Helper functions for structured logging
const logWithContext = (level, message, context = {}) => {
  logger.log(level, message, context);
};

const logError = (error, context = {}) => {
  logger.error(error.message || error, {
    stack: error.stack,
    ...context
  });
};

const logAudit = (action, personId, resource, metadata = {}) => {
  auditLogger.info('Security audit event', {
    action,
    personId,
    resource,
    metadata
  });
};

// HTTP request logging middleware
const httpLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      personId: req.person?.id || null,
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request Error', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
  });

  next();
};

// Performance monitoring helper
const performanceLogger = {
  start: (operation) => {
    const startTime = process.hrtime.bigint();
    return {
      end: (metadata = {}) => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        logger.info('Performance metric', {
          operation,
          duration: `${duration.toFixed(2)}ms`,
          ...metadata
        });
      }
    };
  }
};

export {
  logger,
  auditLogger,
  logWithContext,
  logError,
  logAudit,
  httpLogger,
  performanceLogger,
  sanitizePII
};

export default logger;