// Performance Monitoring Middleware
const advancedLogger = require('../config/advanced-logger');

class PerformanceMonitoringMiddleware {
  constructor() {
    this.metrics = {
      queryCount: 0,
      totalDuration: 0,
      slowQueries: 0,
      errorCount: 0
    };
    
    this.slowQueryThreshold = 1000; // 1 secondo
    
    // Report metriche ogni 5 minuti
    setInterval(() => this.reportMetrics(), 5 * 60 * 1000);
  }
  
  middleware() {
    return async (params, next) => {
      const startTime = Date.now();
      this.metrics.queryCount++;
      
      try {
        const result = await next(params);
        const duration = Date.now() - startTime;
        
        this.metrics.totalDuration += duration;
        
        if (duration > this.slowQueryThreshold) {
          this.metrics.slowQueries++;
          
          advancedLogger.logPerformance('slow_query', {
            model: params.model,
            action: params.action,
            duration
          });
        }
        
        return result;
      } catch (error) {
        this.metrics.errorCount++;
        throw error;
      }
    };
  }
  
  reportMetrics() {
    const avgDuration = this.metrics.queryCount > 0 
      ? this.metrics.totalDuration / this.metrics.queryCount 
      : 0;
    
    advancedLogger.logPerformance('metrics_report', {
      queryCount: this.metrics.queryCount,
      avgDuration: Math.round(avgDuration),
      slowQueries: this.metrics.slowQueries,
      errorCount: this.metrics.errorCount,
      slowQueryRate: this.metrics.queryCount > 0 
        ? (this.metrics.slowQueries / this.metrics.queryCount * 100).toFixed(2) + '%'
        : '0%'
    });
    
    // Reset metriche
    this.metrics = {
      queryCount: 0,
      totalDuration: 0,
      slowQueries: 0,
      errorCount: 0
    };
  }
  
  getMetrics() {
    return { ...this.metrics };
  }
}

module.exports = PerformanceMonitoringMiddleware;