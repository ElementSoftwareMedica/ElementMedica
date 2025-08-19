// Middleware Configuration
const QueryLoggingMiddleware = require('./middleware/query-logging');
const PerformanceMonitoringMiddleware = require('./middleware/performance-monitoring');
const AuditTrailMiddleware = require('./middleware/audit-trail');
const SecurityLoggingMiddleware = require('./middleware/security-logging');

class MiddlewareManager {
  constructor() {
    this.queryLogging = new QueryLoggingMiddleware();
    this.performanceMonitoring = new PerformanceMonitoringMiddleware();
    this.auditTrail = new AuditTrailMiddleware();
    this.securityLogging = new SecurityLoggingMiddleware();
  }
  
  // Configura tutti i middleware per Prisma
  configurePrismaMiddleware(prisma) {
    console.log('🔧 Configuring Prisma middleware...');
    
    // Ordine importante: Security -> Audit -> Performance -> Logging
    prisma.$use(this.securityLogging.middleware());
    prisma.$use(this.auditTrail.middleware());
    prisma.$use(this.performanceMonitoring.middleware());
    prisma.$use(this.queryLogging.middleware());
    
    console.log('✅ All middleware configured');
  }
  
  // Ottieni metriche performance
  getPerformanceMetrics() {
    return this.performanceMonitoring.getMetrics();
  }
}

module.exports = MiddlewareManager;