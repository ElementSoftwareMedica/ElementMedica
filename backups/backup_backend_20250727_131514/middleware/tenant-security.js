/**
 * Tenant Security Middleware - Fase 6
 * Middleware per sicurezza multi-tenant e iniezione automatica tenantId
 */

import logger from '../utils/logger.js';

// Modelli che richiedono tenantId
const TENANT_REQUIRED_MODELS = [
  'Person', 'Company', 'Course', 'CourseSchedule',
  'CourseEnrollment', 'CourseSession', 'RegistroPresenze',
  'RegistroPresenzePartecipante', 'Preventivo', 'PreventivoPartecipante',
  'Fattura', 'Attestato', 'LetteraIncarico',
  'ActivityLog', 'GdprAuditLog', 'ConsentRecord'
];

// Modelli esclusi dal controllo tenant
const TENANT_EXCLUDED_MODELS = [
  'Permission', 'RefreshToken', 'PersonSession',
  'TestDocument', 'Tenant', 'TenantConfiguration'
];

/**
 * Crea middleware sicurezza tenant
 */
export function createTenantSecurityMiddleware() {
  return async (params, next) => {
    const { model, action } = params;
    
    // Skip se modello escluso
    if (TENANT_EXCLUDED_MODELS.includes(model)) {
      return next(params);
    }
    
    // Skip se modello non richiede tenant
    if (!TENANT_REQUIRED_MODELS.includes(model)) {
      return next(params);
    }
    
    try {
      // Ottieni tenantId dal contesto
      const tenantId = getTenantIdFromContext();
      
      if (!tenantId) {
        throw new Error('TenantId mancante nel contesto di sicurezza');
      }
      
      // Inietta tenantId nelle operazioni
      if (['create', 'createMany'].includes(action)) {
        return handleCreateOperations(params, next, tenantId);
      }
      
      if (['findFirst', 'findMany', 'findUnique', 'count', 'aggregate'].includes(action)) {
        return handleFindOperations(params, next, tenantId);
      }
      
      if (['update', 'updateMany', 'upsert'].includes(action)) {
        return handleUpdateOperations(params, next, tenantId);
      }
      
      if (['delete', 'deleteMany'].includes(action)) {
        return handleDeleteOperations(params, next, tenantId);
      }
      
      return next(params);
      
    } catch (error) {
      logger.error('Tenant security middleware error', {
        model,
        action,
        error: error.message,
        component: 'tenant-security-middleware'
      });
      throw error;
    }
  };
}

/**
 * Ottiene tenantId dal contesto corrente
 */
function getTenantIdFromContext() {
  // In un'implementazione reale, questo dovrebbe ottenere
  // il tenantId dal JWT token o dal contesto della richiesta
  // Per ora, restituiamo un placeholder
  
  // Esempio: da AsyncLocalStorage o da request context
  // return AsyncLocalStorage.getStore()?.tenantId;
  
  // Placeholder per sviluppo
  return process.env.CURRENT_TENANT_ID || null;
}

/**
 * Gestisce operazioni di creazione
 */
function handleCreateOperations(params, next, tenantId) {
  const { args } = params;
  
  if (args.data) {
    // Singola creazione
    if (!args.data.tenantId) {
      params.args.data.tenantId = tenantId;
    } else if (args.data.tenantId !== tenantId) {
      throw new Error('Tentativo di creare record per tenant diverso');
    }
  }
  
  if (args.data && Array.isArray(args.data)) {
    // Creazione multipla
    params.args.data = args.data.map(item => {
      if (!item.tenantId) {
        return { ...item, tenantId };
      } else if (item.tenantId !== tenantId) {
        throw new Error('Tentativo di creare record per tenant diverso');
      }
      return item;
    });
  }
  
  return next(params);
}

/**
 * Gestisce operazioni di ricerca
 */
function handleFindOperations(params, next, tenantId) {
  const { args } = params;
  
  if (!args) {
    params.args = {};
  }
  
  if (!args.where) {
    params.args.where = {};
  }
  
  // Forza filtro per tenantId
  params.args.where.tenantId = tenantId;
  
  return next(params);
}

/**
 * Gestisce operazioni di aggiornamento
 */
function handleUpdateOperations(params, next, tenantId) {
  const { args } = params;
  
  if (!args.where) {
    params.args.where = {};
  }
  
  // Forza filtro per tenantId
  params.args.where.tenantId = tenantId;
  
  // Impedisci modifica tenantId
  if (args.data && args.data.tenantId && args.data.tenantId !== tenantId) {
    throw new Error('Tentativo di modificare tenantId non consentito');
  }
  
  return next(params);
}

/**
 * Gestisce operazioni di eliminazione
 */
function handleDeleteOperations(params, next, tenantId) {
  const { args } = params;
  
  if (!args.where) {
    params.args.where = {};
  }
  
  // Forza filtro per tenantId
  params.args.where.tenantId = tenantId;
  
  return next(params);
}

/**
 * Middleware per impostare contesto tenant da JWT
 */
export function createTenantContextMiddleware() {
  return (req, res, next) => {
    try {
      // Estrai tenantId dal JWT token
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.tenantId = decoded.tenantId;
        
        // Imposta nel contesto globale per Prisma middleware
        process.env.CURRENT_TENANT_ID = decoded.tenantId;
      }
      
      next();
    } catch (error) {
      logger.error('Tenant context middleware error', {
        error: error.message,
        component: 'tenant-context-middleware'
      });
      next();
    }
  };
}

export default {
  createTenantSecurityMiddleware,
  createTenantContextMiddleware
};
