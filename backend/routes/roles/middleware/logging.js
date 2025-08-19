/**
 * Logging Middleware - Middleware di logging per il sistema dei ruoli
 * 
 * Questo modulo contiene middleware per il logging delle operazioni
 * e l'audit trail nel sistema di gestione dei ruoli.
 */

import logger from '../../../utils/logger.js';

/**
 * Middleware per il logging delle richieste alle API dei ruoli
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export function logRoleRequest(req, res, next) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Aggiungi l'ID della richiesta alla request
  req.requestId = requestId;
  
  // Log della richiesta in entrata
  logger.info('Role API Request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.person?.id,
    tenantId: req.tenant?.id || req.person?.tenantId,
    timestamp: new Date().toISOString()
  });
  
  // Override del metodo res.json per loggare la risposta
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    // Log della risposta
    logger.info('Role API Response', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      success: data?.success !== false,
      userId: req.person?.id,
      tenantId: req.tenant?.id || req.person?.tenantId,
      timestamp: new Date().toISOString()
    });
    
    // Se c'è un errore, logga anche i dettagli
    if (data?.success === false) {
      logger.warn('Role API Error Response', {
        requestId,
        error: data.error,
        details: data.details,
        method: req.method,
        url: req.originalUrl,
        userId: req.person?.id,
        tenantId: req.tenant?.id || req.person?.tenantId
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Middleware per il logging delle operazioni di gestione ruoli
 * @param {string} operation - Tipo di operazione
 * @returns {Function} Middleware function
 */
export function logRoleOperation(operation) {
  return (req, res, next) => {
    // Salva i dati originali per il logging post-operazione
    req.operationData = {
      operation,
      requestId: req.requestId,
      userId: req.person?.id,
      tenantId: req.tenant?.id || req.person?.tenantId,
      timestamp: new Date().toISOString(),
      input: {
        params: req.params,
        body: sanitizeLogData(req.body),
        query: req.query
      }
    };
    
    // Log dell'inizio dell'operazione
    logger.info(`Role Operation Started: ${operation}`, {
      requestId: req.requestId,
      operation,
      userId: req.person?.id,
      tenantId: req.tenant?.id || req.person?.tenantId,
      targetData: sanitizeLogData(req.body)
    });
    
    // Override del metodo res.json per loggare il risultato
    const originalJson = res.json;
    res.json = function(data) {
      const success = data?.success !== false;
      
      if (success) {
        logger.info(`Role Operation Completed: ${operation}`, {
          requestId: req.requestId,
          operation,
          userId: req.person?.id,
          tenantId: req.tenant?.id || req.person?.tenantId,
          result: sanitizeLogData(data.data)
        });
      } else {
        logger.error(`Role Operation Failed: ${operation}`, {
          requestId: req.requestId,
          operation,
          userId: req.person?.id,
          tenantId: req.tenant?.id || req.person?.tenantId,
          error: data.error,
          details: data.details
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Middleware per l'audit trail delle modifiche ai ruoli
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export function auditRoleChanges(req, res, next) {
  // Salva lo stato originale per il confronto
  req.auditData = {
    requestId: req.requestId,
    userId: req.person?.id,
    userEmail: req.person?.email,
    tenantId: req.tenant?.id || req.person?.tenantId,
    timestamp: new Date().toISOString(),
    action: `${req.method} ${req.route?.path || req.originalUrl}`,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  };
  
  // Override del metodo res.json per creare l'audit log
  const originalJson = res.json;
  res.json = function(data) {
    const success = data?.success !== false;
    
    if (success && shouldAudit(req.method, req.originalUrl)) {
      createAuditLog(req, data);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Middleware per il logging degli errori nelle API dei ruoli
 * @param {Error} error - Errore catturato
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export function logRoleError(error, req, res, next) {
  logger.error('Role API Error', {
    requestId: req.requestId,
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    userId: req.person?.id,
    tenantId: req.tenant?.id || req.person?.tenantId,
    body: sanitizeLogData(req.body),
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString()
  });
  
  // Se la risposta non è stata ancora inviata, invia un errore generico
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId: req.requestId
    });
  }
  
  next(error);
}

/**
 * Genera un ID univoco per la richiesta
 * @returns {string} ID della richiesta
 */
function generateRequestId() {
  return `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitizza i dati per il logging rimuovendo informazioni sensibili
 * @param {*} data - Dati da sanitizzare
 * @returns {*} Dati sanitizzati
 */
function sanitizeLogData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'secret',
    'key',
    'authorization'
  ];
  
  const sanitized = Array.isArray(data) ? [] : {};
  
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Determina se un'operazione deve essere sottoposta ad audit
 * @param {string} method - Metodo HTTP
 * @param {string} url - URL della richiesta
 * @returns {boolean} True se deve essere sottoposta ad audit
 */
function shouldAudit(method, url) {
  // Audit per operazioni di modifica
  const auditMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  
  // Esclude operazioni di sola lettura
  const readOnlyPaths = [
    '/api/roles/test-auth',
    '/api/roles/stats',
    '/api/roles/hierarchy/current-user'
  ];
  
  return auditMethods.includes(method) && 
         !readOnlyPaths.some(path => url.includes(path));
}

/**
 * Crea un log di audit per le modifiche ai ruoli
 * @param {Object} req - Request object
 * @param {Object} responseData - Dati della risposta
 */
async function createAuditLog(req, responseData) {
  try {
    const auditEntry = {
      ...req.auditData,
      operation: determineOperation(req.method, req.originalUrl),
      targetType: determineTargetType(req.originalUrl),
      targetId: extractTargetId(req),
      changes: extractChanges(req, responseData),
      success: responseData?.success !== false,
      result: sanitizeLogData(responseData?.data)
    };
    
    // Log dell'audit entry
    logger.info('Role Audit Log', auditEntry);
    
    // Qui potresti anche salvare l'audit log in un database dedicato
    // await saveAuditLog(auditEntry);
    
  } catch (error) {
    logger.error('Failed to create audit log', {
      error: error.message,
      requestId: req.requestId
    });
  }
}

/**
 * Determina il tipo di operazione dall'URL e metodo
 * @param {string} method - Metodo HTTP
 * @param {string} url - URL della richiesta
 * @returns {string} Tipo di operazione
 */
function determineOperation(method, url) {
  if (url.includes('/assign')) return 'ROLE_ASSIGNMENT';
  if (url.includes('/remove')) return 'ROLE_REMOVAL';
  if (url.includes('/custom')) return 'CUSTOM_ROLE_MANAGEMENT';
  if (url.includes('/hierarchy')) return 'HIERARCHY_MANAGEMENT';
  if (url.includes('/permissions')) return 'PERMISSION_MANAGEMENT';
  
  switch (method) {
    case 'POST': return 'CREATE_ROLE';
    case 'PUT': return 'UPDATE_ROLE';
    case 'DELETE': return 'DELETE_ROLE';
    default: return 'UNKNOWN_OPERATION';
  }
}

/**
 * Determina il tipo di target dall'URL
 * @param {string} url - URL della richiesta
 * @returns {string} Tipo di target
 */
function determineTargetType(url) {
  if (url.includes('/custom')) return 'CUSTOM_ROLE';
  if (url.includes('/user/')) return 'USER_ROLE';
  if (url.includes('/hierarchy')) return 'ROLE_HIERARCHY';
  return 'SYSTEM_ROLE';
}

/**
 * Estrae l'ID del target dalla richiesta
 * @param {Object} req - Request object
 * @returns {string} ID del target
 */
function extractTargetId(req) {
  return req.params.id || 
         req.params.roleType || 
         req.params.personId || 
         req.body.personId || 
         req.body.roleType || 
         'unknown';
}

/**
 * Estrae le modifiche dalla richiesta e risposta
 * @param {Object} req - Request object
 * @param {Object} responseData - Dati della risposta
 * @returns {Object} Oggetto con le modifiche
 */
function extractChanges(req, responseData) {
  return {
    input: sanitizeLogData(req.body),
    params: req.params,
    result: sanitizeLogData(responseData?.data)
  };
}

export default {
  logRoleRequest,
  logRoleOperation,
  auditRoleChanges,
  logRoleError
};