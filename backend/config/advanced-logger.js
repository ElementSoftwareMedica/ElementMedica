// Advanced Logger Configuration
const winston = require('winston');
const path = require('path');

class AdvancedLogger {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'prisma-middleware' },
      transports: [
        new winston.transports.File({ 
          filename: path.join(__dirname, '../logs/error.log'), 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: path.join(__dirname, '../logs/combined.log') 
        }),
        new winston.transports.File({ 
          filename: path.join(__dirname, '../logs/performance.log'),
          level: 'info',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
            })
          )
        })
      ]
    });
    
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.simple()
      }));
    }
  }
  
  // Log query performance
  logQuery(action, duration, result, context = {}) {
    const logData = {
      action,
      duration,
      resultCount: Array.isArray(result) ? result.length : (result ? 1 : 0),
      context,
      timestamp: new Date().toISOString()
    };
    
    if (duration > 1000) { // Query lente > 1s
      this.logger.warn('Slow query detected', logData);
    } else {
      this.logger.info('Query executed', logData);
    }
  }
  
  // Log audit events
  logAudit(action, model, entityId, changes, context = {}) {
    this.logger.info('Audit event', {
      type: 'AUDIT',
      action,
      model,
      entityId,
      changes,
      context,
      timestamp: new Date().toISOString()
    });
  }
  
  // Log security events
  logSecurity(event, details, context = {}) {
    this.logger.warn('Security event', {
      type: 'SECURITY',
      event,
      details,
      context,
      timestamp: new Date().toISOString()
    });
  }
  
  // Log performance metrics
  logPerformance(metric, value, context = {}) {
    this.logger.info('Performance metric', {
      type: 'PERFORMANCE',
      metric,
      value,
      context,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new AdvancedLogger();