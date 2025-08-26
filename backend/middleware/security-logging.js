// Security Logging Middleware
const advancedLogger = require('../config/advanced-logger');

class SecurityLoggingMiddleware {
  constructor() {
    this.suspiciousPatterns = [
      /SELECT.*FROM.*WHERE.*1=1/i,
      /UNION.*SELECT/i,
      /DROP.*TABLE/i,
      /DELETE.*FROM.*WHERE.*1=1/i
    ];
    
    this.rateLimits = new Map();
    this.maxRequestsPerMinute = 100;
  }
  
  middleware() {
    return async (params, next) => {
      const context = this.extractSecurityContext(params);
      
      // Check rate limiting
      if (this.checkRateLimit(context)) {
        advancedLogger.logSecurity('RATE_LIMIT_EXCEEDED', {
          model: params.model,
          action: params.action,
          context
        });
      }
      
      // Check for suspicious patterns
      this.checkSuspiciousActivity(params, context);
      
      // Check tenant isolation
      this.checkTenantIsolation(params, context);
      
      return next(params);
    };
  }
  
  extractSecurityContext(params) {
    const context = {
      timestamp: new Date().toISOString(),
      model: params.model,
      action: params.action
    };
    
    if (params.args) {
      if (params.args.data && params.args.data.tenantId) {
        context.tenantId = params.args.data.tenantId;
      }
      if (params.args.where && params.args.where.tenantId) {
        context.tenantId = params.args.where.tenantId;
      }
    }
    
    return context;
  }
  
  checkRateLimit(context) {
    const key = `${context.tenantId || 'unknown'}_${context.model}`;
    const now = Date.now();
    const windowStart = now - 60000; // 1 minuto
    
    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, []);
    }
    
    const requests = this.rateLimits.get(key);
    
    // Rimuovi richieste vecchie
    const recentRequests = requests.filter(time => time > windowStart);
    recentRequests.push(now);
    
    this.rateLimits.set(key, recentRequests);
    
    return recentRequests.length > this.maxRequestsPerMinute;
  }
  
  checkSuspiciousActivity(params, context) {
    const queryString = JSON.stringify(params.args || {});
    
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(queryString)) {
        advancedLogger.logSecurity('SUSPICIOUS_QUERY_PATTERN', {
          pattern: pattern.toString(),
          query: queryString.substring(0, 200), // Primi 200 caratteri
          context
        });
        break;
      }
    }
  }
  
  checkTenantIsolation(params, context) {
    const tenantRequiredModels = [
      'Person', 'Company', 'Course', 'Document', 
      'PersonRole', 'ConsentRecord'
    ];
    
    if (tenantRequiredModels.includes(params.model)) {
      if (!context.tenantId) {
        advancedLogger.logSecurity('TENANT_ISOLATION_VIOLATION', {
          model: params.model,
          action: params.action,
          reason: 'Missing tenantId',
          context
        });
      }
    }
  }
}

module.exports = SecurityLoggingMiddleware;