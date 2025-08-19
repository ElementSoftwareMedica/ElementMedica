// Audit Trail Middleware
const advancedLogger = require('../config/advanced-logger');

class AuditTrailMiddleware {
  constructor() {
    this.auditableActions = ['create', 'update', 'delete', 'upsert'];
    this.auditableModels = [
      'Person', 'Company', 'Course', 'Document', 
      'PersonRole', 'ConsentRecord', 'GdprAuditLog'
    ];
  }
  
  shouldAudit(model, action) {
    return this.auditableModels.includes(model) && 
           this.auditableActions.includes(action);
  }
  
  middleware() {
    return async (params, next) => {
      const { model, action, args } = params;
      
      if (!this.shouldAudit(model, action)) {
        return next(params);
      }
      
      // Estrai context utente (se disponibile)
      const context = this.extractUserContext(args);
      
      try {
        const result = await next(params);
        
        // Log audit event
        this.logAuditEvent(model, action, args, result, context);
        
        return result;
      } catch (error) {
        // Log anche i tentativi falliti
        this.logAuditEvent(model, action, args, null, context, error);
        throw error;
      }
    };
  }
  
  extractUserContext(args) {
    // Cerca context utente negli args
    const context = {};
    
    if (args && args.data) {
      if (args.data.tenantId) context.tenantId = args.data.tenantId;
      if (args.data.personId) context.personId = args.data.personId;
    }
    
    if (args && args.where) {
      if (args.where.tenantId) context.tenantId = args.where.tenantId;
      if (args.where.personId) context.personId = args.where.personId;
    }
    
    return context;
  }
  
  logAuditEvent(model, action, args, result, context, error = null) {
    const auditData = {
      model,
      action: action.toUpperCase(),
      entityId: this.extractEntityId(args, result),
      changes: this.extractChanges(action, args),
      success: !error,
      error: error ? error.message : null,
      context
    };
    
    advancedLogger.logAudit(
      auditData.action,
      auditData.model,
      auditData.entityId,
      auditData.changes,
      auditData.context
    );
  }
  
  extractEntityId(args, result) {
    if (result && result.id) return result.id;
    if (args && args.where && args.where.id) return args.where.id;
    if (args && args.data && args.data.id) return args.data.id;
    return null;
  }
  
  extractChanges(action, args) {
    if (action === 'create' && args.data) {
      return { created: this.sanitizeData(args.data) };
    }
    
    if (action === 'update' && args.data) {
      return { updated: this.sanitizeData(args.data) };
    }
    
    if (action === 'delete') {
      return { deleted: true };
    }
    
    return {};
  }
  
  sanitizeData(data) {
    const sanitized = { ...data };
    
    // Rimuovi dati sensibili
    if (sanitized.password) sanitized.password = '[REDACTED]';
    if (sanitized.taxCode) sanitized.taxCode = '[REDACTED]';
    
    return sanitized;
  }
}

module.exports = AuditTrailMiddleware;