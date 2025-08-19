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
  metadata?: Record<string, any>;
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

// Metrics storage
class MetricsCollector {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: ApiMetric[] = [];
  private cacheMetrics: CacheMetric[] = [];
  private maxMetrics = 1000; // Limite per evitare memory leak

  // Raccolta metriche generiche
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    this.cleanup();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Metric recorded:', metric);
    }
  }

  // Raccolta metriche API
  recordApiMetric(metric: ApiMetric): void {
    this.apiMetrics.push(metric);
    this.cleanup();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🌐 API Metric recorded:', {
        endpoint: metric.endpoint,
        duration: `${metric.duration}ms`,
        status: metric.status,
        cached: metric.cached,
        deduplicated: metric.deduplicated
      });
    }
  }

  // Raccolta metriche cache
  recordCacheMetric(metric: CacheMetric): void {
    this.cacheMetrics.push(metric);
    this.cleanup();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('💾 Cache Metric recorded:', metric);
    }
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
    console.log('🗑️ All metrics cleared');
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
}

// Singleton instance
const metricsCollector = new MetricsCollector();

// Utility functions
export function recordMetric(name: string, value: number, tags?: Record<string, string>, metadata?: Record<string, any>): void {
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

// Flush metrics to backend (implementazione futura)
export async function flushMetrics(): Promise<void> {
  try {
    const metrics = metricsCollector.exportMetrics();
    
    // In futuro, inviare al backend
    // await apiPost('/api/metrics', JSON.parse(metrics));
    
    if (process.env.NODE_ENV === 'development') {
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

// Auto-flush ogni 5 minuti in development
if (process.env.NODE_ENV === 'development') {
  setInterval(flushMetrics, 5 * 60 * 1000);
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
  flushMetrics
};

// Debug helper per development
if (process.env.NODE_ENV === 'development') {
  (window as any).metricsDebug = {
    getStats: () => ({
      api: getApiStats(),
      cache: getCacheStats()
    }),
    getAllMetrics,
    clearMetrics,
    exportMetrics
  };
}