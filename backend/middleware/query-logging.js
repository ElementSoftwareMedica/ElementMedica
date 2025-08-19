// Query Logging Middleware
const advancedLogger = require('../config/advanced-logger');

class QueryLoggingMiddleware {
  constructor() {
    this.excludedModels = ['RefreshToken', 'PersonSession'];
  }
  
  shouldExclude(model) {
    return this.excludedModels.includes(model);
  }
  
  middleware() {
    return async (params, next) => {
      const startTime = Date.now();
      
      // Context per logging
      const context = {
        model: params.model,
        action: params.action,
        args: this.sanitizeArgs(params.args)
      };
      
      try {
        const result = await next(params);
        const duration = Date.now() - startTime;
        
        // Log risultato
        if (!this.shouldExclude(params.model)) {
          advancedLogger.logQuery(
            `${params.action} on ${params.model}`,
            duration,
            result,
            context
          );
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        advancedLogger.logger.error('Query failed', {
          ...context,
          duration,
          error: error.message,
          stack: error.stack
        });
        
        throw error;
      }
    };
  }
  
  sanitizeArgs(args) {
    if (!args) return {};
    
    // Rimuovi dati sensibili
    const sanitized = { ...args };
    
    if (sanitized.data && sanitized.data.password) {
      sanitized.data.password = '[REDACTED]';
    }
    
    if (sanitized.where && sanitized.where.password) {
      sanitized.where.password = '[REDACTED]';
    }
    
    return sanitized;
  }
}

module.exports = QueryLoggingMiddleware;