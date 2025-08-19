/**
 * RouteLogger - Sistema di Logging Unificato
 * 
 * Centralizza tutto il logging del sistema di routing con
 * tracciamento completo delle richieste e diagnostica avanzata.
 */

import fs from 'fs';
import path from 'path';

class RouteLogger {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false,
      level: config.level || 'info',
      includeHeaders: config.includeHeaders || ['x-api-version', 'user-agent', 'x-forwarded-for'],
      excludePaths: config.excludePaths || ['/health', '/metrics'],
      logRequests: config.logRequests !== false,
      logResponses: config.logResponses !== false,
      logErrors: config.logErrors !== false,
      logFile: config.logFile || null,
      maxLogSize: config.maxLogSize || 10 * 1024 * 1024, // 10MB
      ...config
    };
    
    this.requestId = 0;
    this.requestMap = new Map(); // Traccia richieste attive
    this.stats = {
      totalRequests: 0,
      errorRequests: 0,
      avgResponseTime: 0,
      requestsByPath: {},
      requestsByService: {},
      errorsByType: {}
    };
    
    // Inizializza file di log se specificato
    if (this.config.logFile) {
      this.initializeLogFile();
    }
  }

  /**
   * Inizializza file di log
   */
  initializeLogFile() {
    try {
      const logDir = path.dirname(this.config.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      // Verifica dimensione file esistente
      if (fs.existsSync(this.config.logFile)) {
        const stats = fs.statSync(this.config.logFile);
        if (stats.size > this.config.maxLogSize) {
          this.rotateLogFile();
        }
      }
    } catch (error) {
      console.error('❌ Error initializing log file:', error.message);
    }
  }

  /**
   * Ruota il file di log
   */
  rotateLogFile() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFile = `${this.config.logFile}.${timestamp}`;
      fs.renameSync(this.config.logFile, rotatedFile);
      console.log(`📋 Log file rotated to: ${rotatedFile}`);
    } catch (error) {
      console.error('❌ Error rotating log file:', error.message);
    }
  }

  /**
   * Genera ID univoco per la richiesta
   */
  generateRequestId() {
    return ++this.requestId;
  }

  /**
   * Log richiesta in ingresso
   */
  logIncomingRequest(req) {
    if (!this.config.enabled || !this.config.logRequests) return null;
    
    // Escludi path specificati
    if (this.config.excludePaths.some(path => req.path.startsWith(path))) {
      return null;
    }

    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();
    
    // Aggiungi requestId alla richiesta
    req.requestId = requestId;
    req.startTime = Date.now();
    
    // Estrai header rilevanti
    const relevantHeaders = {};
    this.config.includeHeaders.forEach(header => {
      if (req.headers[header]) {
        relevantHeaders[header] = req.headers[header];
      }
    });
    
    const logEntry = {
      requestId,
      timestamp,
      type: 'incoming_request',
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      headers: relevantHeaders,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      apiVersion: req.apiVersion
    };
    
    // Salva nella mappa richieste attive
    this.requestMap.set(requestId, {
      ...logEntry,
      startTime: req.startTime
    });
    
    // Aggiorna statistiche
    this.stats.totalRequests++;
    this.updatePathStats(req.path);
    
    this.writeLog(logEntry);
    
    return requestId;
  }

  /**
   * Log target proxy
   */
  logProxyTarget(req, target, rewrittenPath) {
    if (!this.config.enabled || !req.requestId) return;
    
    const logEntry = {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      type: 'proxy_target',
      originalPath: req.path,
      rewrittenPath: rewrittenPath,
      target: target,
      service: this.extractServiceFromTarget(target)
    };
    
    // Aggiorna richiesta nella mappa
    if (this.requestMap.has(req.requestId)) {
      const requestData = this.requestMap.get(req.requestId);
      requestData.proxyTarget = target;
      requestData.rewrittenPath = rewrittenPath;
      requestData.service = logEntry.service;
    }
    
    // Aggiorna statistiche servizio
    this.updateServiceStats(logEntry.service);
    
    this.writeLog(logEntry);
  }

  /**
   * Log risposta
   */
  logResponse(req, res, duration = null) {
    if (!this.config.enabled || !this.config.logResponses || !req.requestId) return;
    
    const calculatedDuration = duration || (req.startTime ? Date.now() - req.startTime : 0);
    
    const logEntry = {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      type: 'response',
      statusCode: res.statusCode,
      duration: calculatedDuration,
      contentLength: res.get('content-length') || 0,
      headers: {
        'content-type': res.get('content-type'),
        'x-api-version': res.get('x-api-version'),
        'x-proxy-service': res.get('x-proxy-service')
      }
    };
    
    // Aggiorna statistiche tempo risposta
    this.updateResponseTimeStats(calculatedDuration);
    
    // Rimuovi dalla mappa richieste attive
    this.requestMap.delete(req.requestId);
    
    this.writeLog(logEntry);
  }

  /**
   * Log errore
   */
  logError(req, error, service = null) {
    if (!this.config.enabled || !this.config.logErrors) return;
    
    const logEntry = {
      requestId: req.requestId || 'unknown',
      timestamp: new Date().toISOString(),
      type: 'error',
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      service: service,
      path: req.path,
      method: req.method
    };
    
    // Aggiorna statistiche errori
    this.stats.errorRequests++;
    this.updateErrorStats(error.code || 'unknown');
    
    this.writeLog(logEntry);
    
    console.error(`💥 [${req.requestId || 'unknown'}] ERROR: ${error.message}${service ? ` (${service})` : ''}`);
  }

  /**
   * Log evento personalizzato
   */
  logEvent(type, data, requestId = null) {
    if (!this.config.enabled) return;
    
    const logEntry = {
      requestId: requestId,
      timestamp: new Date().toISOString(),
      type: type,
      data: data
    };
    
    this.writeLog(logEntry);
  }

  /**
   * Scrive log su file e/o console
   */
  writeLog(logEntry) {
    const logLine = JSON.stringify(logEntry) + '\n';
    
    // Scrivi su file se configurato
    if (this.config.logFile) {
      try {
        fs.appendFileSync(this.config.logFile, logLine);
        
        // Verifica dimensione file
        const stats = fs.statSync(this.config.logFile);
        if (stats.size > this.config.maxLogSize) {
          this.rotateLogFile();
        }
      } catch (error) {
        console.error('❌ Error writing to log file:', error.message);
      }
    }
  }

  /**
   * Estrae nome servizio dal target URL
   */
  extractServiceFromTarget(target) {
    if (!target) return 'unknown';
    
    // Estrai porta dal target per identificare il servizio
    const portMatch = target.match(/:(\d+)/);
    if (portMatch) {
      const port = portMatch[1];
      switch (port) {
        case '4001': return 'api';
        case '4002': return 'documents';
        case '4003': return 'proxy';
        default: return `service-${port}`;
      }
    }
    
    return 'unknown';
  }

  /**
   * Aggiorna statistiche per path
   */
  updatePathStats(path) {
    if (!this.stats.requestsByPath[path]) {
      this.stats.requestsByPath[path] = 0;
    }
    this.stats.requestsByPath[path]++;
  }

  /**
   * Aggiorna statistiche per servizio
   */
  updateServiceStats(service) {
    if (!this.stats.requestsByService[service]) {
      this.stats.requestsByService[service] = 0;
    }
    this.stats.requestsByService[service]++;
  }

  /**
   * Aggiorna statistiche tempo risposta
   */
  updateResponseTimeStats(duration) {
    const totalRequests = this.stats.totalRequests;
    this.stats.avgResponseTime = ((this.stats.avgResponseTime * (totalRequests - 1)) + duration) / totalRequests;
  }

  /**
   * Aggiorna statistiche errori
   */
  updateErrorStats(errorType) {
    if (!this.stats.errorsByType[errorType]) {
      this.stats.errorsByType[errorType] = 0;
    }
    this.stats.errorsByType[errorType]++;
  }

  /**
   * Ottiene statistiche complete
   */
  getStats() {
    return {
      ...this.stats,
      activeRequests: this.requestMap.size,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      config: {
        enabled: this.config.enabled,
        level: this.config.level,
        logFile: this.config.logFile
      }
    };
  }

  /**
   * Ottiene richieste attive
   */
  getActiveRequests() {
    return Array.from(this.requestMap.values());
  }

  /**
   * Reset statistiche
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      errorRequests: 0,
      avgResponseTime: 0,
      requestsByPath: {},
      requestsByService: {},
      errorsByType: {}
    };
  }

  /**
   * Middleware per logging automatico
   */
  createLoggingMiddleware() {
    return (req, res, next) => {
      // Log richiesta in ingresso
      this.logIncomingRequest(req);
      
      // Intercetta fine risposta
      const originalEnd = res.end;
      res.end = function(...args) {
        this.logResponse(req, res);
        originalEnd.apply(res, args);
      }.bind(this);
      
      next();
    };
  }
}

export default RouteLogger;