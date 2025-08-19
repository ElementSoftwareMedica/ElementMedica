/**
 * Performance Metrics Utilities
 * Raccolta e gestione metriche per monitoraggio performance
 */

// Types
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface ApiMetric {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  cached: boolean;
  deduplicated: boolean;
  timestamp: string;
  error?: string;
}

export interface CacheMetric {
  operation: 'hit' | 'miss' | 'set' | 'clear' | 'invalidate';
  key?: string;
  pattern?: string;
  count?: number;
  timestamp: string;
}

// Configurazione logging
const LOGGING_CONFIG = {
  // Log solo ogni N metriche per ridurre spam
  logEveryNMetrics: 10,
  logEveryNCacheOps: 5,
  // Log solo errori e operazioni importanti
  logOnlyErrors: process.env.NODE_ENV === 'production',
  // Abilita logging dettagliato solo in development con flag specifico
  enableDetailedLogging: process.env.NODE_ENV === 'development' && (typeof localStorage !== 'undefined' && localStorage?.getItem('ENABLE_METRICS_LOGGING') === 'true')
};

// Metrics storage
class MetricsCollector {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: ApiMetric[] = [];
  private cacheMetrics: CacheMetric[] = [];
  private maxMetrics = 1000; // Limite per evitare memory leak
  
  // Contatori per logging batch
  private metricCounter = 0;
  private cacheCounter = 0;

  // Raccolta metriche generiche
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    this.cleanup();
    
    // Log condizionale per ridurre spam
    this.metricCounter++;
    if (LOGGING_CONFIG.enableDetailedLogging && 
        (this.metricCounter % LOGGING_CONFIG.logEveryNMetrics === 0 || metric.value > 1000)) {
      console.log('📊 Metric recorded (batch):', {
        count: this.metricCounter,
        latest: metric,
        avgLast10: this.getAverageLastN(10)
      });
    }
  }

  // Raccolta metriche API
  recordApiMetric(metric: ApiMetric): void {
    this.apiMetrics.push(metric);
    this.cleanup();
    
    // Log solo errori o operazioni lente
    if (LOGGING_CONFIG.enableDetailedLogging && 
        (metric.status >= 400 || metric.duration > 2000)) {
      console.log('📊 API Metric (error/slow):', {
        endpoint: metric.endpoint,
        status: metric.status,
        duration: metric.duration,
        error: metric.error
      });
    }
  }

  // Raccolta metriche cache
  recordCacheMetric(metric: CacheMetric): void {
    this.cacheMetrics.push(metric);
    this.cleanup();
    
    // Log condizionale per cache
    this.cacheCounter++;
    if (LOGGING_CONFIG.enableDetailedLogging && 
        (this.cacheCounter % LOGGING_CONFIG.logEveryNCacheOps === 0 || metric.operation === 'clear')) {
      console.log('💾 Cache Metric (batch):', {
        count: this.cacheCounter,
        operation: metric.operation,
        hitRate: this.getCacheStats().hitRate + '%'
      });
    }
  }

  // Calcola media delle ultime N metriche
  private getAverageLastN(n: number): number {
    const recent = this.metrics.slice(-n);
    if (recent.length === 0) return 0;
    return Math.round(recent.reduce((sum, m) => sum + m.value, 0) / recent.length);
  }

  // Cleanup per evitare memory leak
  private cleanup(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2);
    }
    if (this.apiMetrics.length > this.maxMetrics) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetrics / 2);
    }
    if (this.cacheMetrics.length > this.maxMetrics) {
      this.cacheMetrics = this.cacheMetrics.slice(-this.maxMetrics / 2);
    }
  }

  // Ottieni statistiche API
  getApiStats(): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
    deduplicationRate: number;
    recentRequests: ApiMetric[];
  } {
    const recent = this.apiMetrics.slice(-100); // Ultimi 100 requests
    const totalRequests = recent.length;
    
    if (totalRequests === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        cacheHitRate: 0,
        deduplicationRate: 0,
        recentRequests: []
      };
    }

    const averageResponseTime = recent.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
    const errorCount = recent.filter(m => m.status >= 400).length;
    const cacheHits = recent.filter(m => m.cached).length;
    const deduplicated = recent.filter(m => m.deduplicated).length;
    
    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round((errorCount / totalRequests) * 100),
      cacheHitRate: Math.round((cacheHits / totalRequests) * 100),
      deduplicationRate: Math.round((deduplicated / totalRequests) * 100),
      recentRequests: recent.slice(-10) // Ultimi 10 per debug
    };
  }

  // Ottieni statistiche cache
  getCacheStats(): {
    totalOperations: number;
    hitRate: number;
    recentOperations: CacheMetric[];
  } {
    const recent = this.cacheMetrics.slice(-100);
    const totalOperations = recent.length;
    
    if (totalOperations === 0) {
      return {
        totalOperations: 0,
        hitRate: 0,
        recentOperations: []
      };
    }

    const hits = recent.filter(m => m.operation === 'hit').length;
    const misses = recent.filter(m => m.operation === 'miss').length;
    const total = hits + misses;
    
    return {
      totalOperations,
      hitRate: total > 0 ? Math.round((hits / total) * 100) : 0,
      recentOperations: recent.slice(-10)
    };
  }

  // Ottieni tutte le metriche
  getAllMetrics(): {
    performance: PerformanceMetric[];
    api: ApiMetric[];
    cache: CacheMetric[];
  } {
    return {
      performance: [...this.metrics],
      api: [...this.apiMetrics],
      cache: [...this.cacheMetrics]
    };
  }

  // Pulisci tutte le metriche
  clear(): void {
    this.metrics = [];
    this.apiMetrics = [];
    this.cacheMetrics = [];
    this.metricCounter = 0;
    this.cacheCounter = 0;
    if (LOGGING_CONFIG.enableDetailedLogging) {
      console.log('🗑️ All metrics cleared');
    }
  }

  // Esporta metriche (per invio al backend)
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      performance: this.metrics,
      api: this.apiMetrics,
      cache: this.cacheMetrics,
      stats: {
        api: this.getApiStats(),
        cache: this.getCacheStats()
      }
    }, null, 2);
  }

  // Log statistiche riassuntive
  logSummary(): void {
    if (!LOGGING_CONFIG.enableDetailedLogging) return;
    
    const apiStats = this.getApiStats();
    const cacheStats = this.getCacheStats();
    
    console.log('📊 Metrics Summary:', {
      totalMetrics: this.metrics.length,
      apiRequests: apiStats.totalRequests,
      avgResponseTime: apiStats.averageResponseTime + 'ms',
      errorRate: apiStats.errorRate + '%',
      cacheHitRate: cacheStats.hitRate + '%',
      cacheOperations: cacheStats.totalOperations
    });
  }
}

// Singleton instance
const metricsCollector = new MetricsCollector();

// Utility functions
export function recordMetric(name: string, value: number, tags?: Record<string, string>, metadata?: Record<string, unknown>): void {
  metricsCollector.recordMetric({
    name,
    value,
    timestamp: new Date().toISOString(),
    tags,
    metadata
  });
}

export function recordApiCall(
  endpoint: string,
  method: string,
  duration: number,
  status: number,
  options: {
    cached?: boolean;
    deduplicated?: boolean;
    error?: string;
  } = {}
): void {
  metricsCollector.recordApiMetric({
    endpoint,
    method,
    duration,
    status,
    cached: options.cached || false,
    deduplicated: options.deduplicated || false,
    timestamp: new Date().toISOString(),
    error: options.error
  });
}

export function recordCacheOperation(
  operation: 'hit' | 'miss' | 'set' | 'clear' | 'invalidate',
  key?: string,
  pattern?: string,
  count?: number
): void {
  metricsCollector.recordCacheMetric({
    operation,
    key,
    pattern,
    count,
    timestamp: new Date().toISOString()
  });
}

// Performance timing helpers
export function startTimer(): () => number {
  const start = performance.now();
  return () => performance.now() - start;
}

export function measureAsync<T>(fn: () => Promise<T>, metricName: string): Promise<T> {
  const timer = startTimer();
  return fn().finally(() => {
    const duration = timer();
    recordMetric(metricName, duration, { unit: 'ms' });
  });
}

// Stats getters
export function getApiStats() {
  return metricsCollector.getApiStats();
}

export function getCacheStats() {
  return metricsCollector.getCacheStats();
}

export function getAllMetrics() {
  return metricsCollector.getAllMetrics();
}

export function clearMetrics() {
  metricsCollector.clear();
}

export function exportMetrics() {
  return metricsCollector.exportMetrics();
}

export function logMetricsSummary() {
  metricsCollector.logSummary();
}

// Flush metrics to backend (implementazione futura)
export async function flushMetrics(): Promise<void> {
  try {
    const metrics = metricsCollector.exportMetrics();
    
    // In futuro, inviare al backend
    // await apiPost('/api/metrics', JSON.parse(metrics));
    
    if (LOGGING_CONFIG.enableDetailedLogging) {
      console.log('📊 Metrics would be flushed to backend:', JSON.parse(metrics).stats);
    }
    
    // Per ora, salva in localStorage per debug
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('performance_metrics', metrics);
    }
  } catch (error) {
    console.error('Error flushing metrics:', error);
  }
}

// Auto-flush ogni 5 minuti in development (solo se logging abilitato)
if (LOGGING_CONFIG.enableDetailedLogging) {
  setInterval(() => {
    metricsCollector.logSummary();
    flushMetrics();
  }, 5 * 60 * 1000);
}

// Export default
export default {
  recordMetric,
  recordApiCall,
  recordCacheOperation,
  startTimer,
  measureAsync,
  getApiStats,
  getCacheStats,
  getAllMetrics,
  clearMetrics,
  exportMetrics,
  flushMetrics,
  logMetricsSummary
};

// Debug helper per development (solo se logging abilitato)
if (LOGGING_CONFIG.enableDetailedLogging) {
  (window as typeof window & { metricsDebug?: Record<string, unknown> }).metricsDebug = {
    getStats: () => ({
      api: getApiStats(),
      cache: getCacheStats()
    }),
    getAllMetrics,
    clearMetrics,
    exportMetrics,
    logSummary: logMetricsSummary,
    enableLogging: () => {
      localStorage.setItem('ENABLE_METRICS_LOGGING', 'true');
      console.log('📊 Metrics logging enabled. Reload page to take effect.');
    },
    disableLogging: () => {
      localStorage.removeItem('ENABLE_METRICS_LOGGING');
      console.log('📊 Metrics logging disabled. Reload page to take effect.');
    }
  };
}