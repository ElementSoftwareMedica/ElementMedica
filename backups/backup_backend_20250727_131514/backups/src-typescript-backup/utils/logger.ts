/**
 * Logger Utility - Week 12 Multi-Tenant Implementation
 * Sistema di logging avanzato per il multi-tenant
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

/**
 * Livelli di log personalizzati
 */
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Colori per i livelli di log
 */
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Aggiungi i colori a winston
winston.addColors(logColors);

/**
 * Formato per i log in sviluppo
 */
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, tenantId, personId, requestId, ...meta } = info;
    
    let logMessage = `${timestamp} [${level}]: ${message}`;
    
    // Aggiungi contesto se presente
    if (tenantId) logMessage += ` [tenant:${tenantId}]`;
    if (personId) logMessage += ` [person:${personId}]`;
    if (requestId) logMessage += ` [req:${requestId}]`;
    
    // Aggiungi metadata se presente
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

/**
 * Formato per i log in produzione
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Crea la directory dei log se non esiste
 */
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Configurazione dei transport
 */
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  }),
];

// File transport per produzione
if (process.env.NODE_ENV === 'production') {
  transports.push(
    // Log generale
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      level: 'info',
      format: productionFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    
    // Log errori
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: productionFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    
    // Log audit (per sicurezza e compliance)
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf((info) => {
          // Solo log con tag audit
          if (info.audit) {
            return JSON.stringify(info);
          }
          return '';
        })
      ),
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
    })
  );
}

/**
 * Logger principale
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels: logLevels,
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  transports,
  exitOnError: false,
});

/**
 * Interfaccia per il contesto del log
 */
export interface LogContext {
  tenantId?: string;
  personId?: string;
  requestId?: string;
  action?: string;
  resource?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

/**
 * Classe wrapper per il logger con contesto
 */
export class ContextualLogger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  private formatMessage(message: string, meta: any = {}) {
    return {
      message,
      ...this.context,
      ...meta,
    };
  }

  error(message: string, meta?: any) {
    logger.error(this.formatMessage(message, meta));
  }

  warn(message: string, meta?: any) {
    logger.warn(this.formatMessage(message, meta));
  }

  info(message: string, meta?: any) {
    logger.info(this.formatMessage(message, meta));
  }

  http(message: string, meta?: any) {
    logger.http(this.formatMessage(message, meta));
  }

  debug(message: string, meta?: any) {
    logger.debug(this.formatMessage(message, meta));
  }

  /**
   * Log di audit per operazioni sensibili
   */
  audit(action: string, details: any = {}) {
    logger.info({
      message: `AUDIT: ${action}`,
      audit: true,
      action,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...details,
    });
  }

  /**
   * Aggiorna il contesto
   */
  setContext(newContext: Partial<LogContext>) {
    this.context = { ...this.context, ...newContext };
  }

  /**
   * Crea un nuovo logger con contesto aggiornato
   */
  child(additionalContext: Partial<LogContext>): ContextualLogger {
    return new ContextualLogger({ ...this.context, ...additionalContext });
  }
}

/**
 * Factory per creare logger con contesto
 */
export function createLogger(context: LogContext = {}): ContextualLogger {
  return new ContextualLogger(context);
}

/**
 * Logger per richieste HTTP
 */
export function createHttpLogger(req: any): ContextualLogger {
  const context: LogContext = {
    requestId: req.id || req.headers['x-request-id'],
    tenantId: req.tenantId || req.tenant?.id,
    personId: req.person?.id,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.originalUrl || req.url,
  };
  
  return new ContextualLogger(context);
}

/**
 * Middleware per il logging delle richieste HTTP
 */
export function httpLoggerMiddleware(req: any, res: any, next: any) {
  const startTime = Date.now();
  const httpLogger = createHttpLogger(req);
  
  // Aggiungi il logger alla richiesta
  req.logger = httpLogger;
  
  // Log della richiesta in arrivo
  httpLogger.http(`${req.method} ${req.originalUrl}`, {
    headers: req.headers,
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
  });
  
  // Override del metodo res.end per loggare la risposta
  const originalEnd = res.end;
  res.end = function(chunk: any, encoding: any) {
    const duration = Date.now() - startTime;
    
    httpLogger.http(`${req.method} ${req.originalUrl} - ${res.statusCode}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
    });
    
    // Log errori
    if (res.statusCode >= 400) {
      httpLogger.warn(`HTTP Error ${res.statusCode}`, {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        error: chunk ? chunk.toString() : undefined,
      });
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

/**
 * Utility per il logging di performance
 */
export class PerformanceLogger {
  private startTime: number;
  private logger: ContextualLogger;
  private operation: string;

  constructor(operation: string, context: LogContext = {}) {
    this.operation = operation;
    this.logger = new ContextualLogger(context);
    this.startTime = Date.now();
    
    this.logger.debug(`Starting operation: ${operation}`);
  }

  end(additionalInfo: any = {}) {
    const duration = Date.now() - this.startTime;
    
    this.logger.info(`Completed operation: ${this.operation}`, {
      duration: `${duration}ms`,
      ...additionalInfo,
    });
    
    return duration;
  }

  error(error: any, additionalInfo: any = {}) {
    const duration = Date.now() - this.startTime;
    
    this.logger.error(`Failed operation: ${this.operation}`, {
      duration: `${duration}ms`,
      error: error.message || error,
      stack: error.stack,
      ...additionalInfo,
    });
    
    return duration;
  }
}

/**
 * Utility per il logging di database queries
 */
export function logDatabaseQuery(
  query: string,
  params: any[] = [],
  duration?: number,
  context: LogContext = {}
) {
  const dbLogger = new ContextualLogger({ ...context, component: 'database' });
  
  dbLogger.debug('Database query executed', {
    query,
    params,
    duration: duration ? `${duration}ms` : undefined,
  });
}

/**
 * Utility per il logging di errori con stack trace
 */
export function logError(
  error: Error,
  context: LogContext = {},
  additionalInfo: any = {}
) {
  const errorLogger = new ContextualLogger(context);
  
  errorLogger.error(error.message, {
    name: error.name,
    stack: error.stack,
    ...additionalInfo,
  });
}

/**
 * Utility per il logging di eventi di sicurezza
 */
export function logSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: any = {},
  context: LogContext = {}
) {
  const securityLogger = new ContextualLogger({ ...context, component: 'security' });
  
  const logMethod = severity === 'critical' || severity === 'high' ? 'error' : 
                   severity === 'medium' ? 'warn' : 'info';
  
  securityLogger[logMethod](`SECURITY EVENT: ${event}`, {
    severity,
    event,
    ...details,
  });
  
  // Log di audit per eventi di sicurezza
  securityLogger.audit(`security_event_${event}`, {
    severity,
    ...details,
  });
}

/**
 * Export del logger di default per compatibilità
 */
export default logger;