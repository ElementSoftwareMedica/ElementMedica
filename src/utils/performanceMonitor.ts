/**
 * Performance Monitor Utility
 * Week 11 Implementation - Performance Tracking
 */

interface PerformanceMetrics {
  bundleSize: number;
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  routeLoadTimes: Map<string, number>;
  chunkLoadTimes: Map<string, number>;
}

interface RoutePerformance {
  route: string;
  loadTime: number;
  chunkSize: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {
    routeLoadTimes: new Map(),
    chunkLoadTimes: new Map()
  };
  private routeStartTimes = new Map<string, number>();
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
    this.trackInitialLoad();
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers() {
    if (typeof PerformanceObserver === 'undefined') return;

    // Track navigation timing
    try {
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.metrics.loadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
          }
        });
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);
    } catch (error) {
      console.warn('Navigation timing observer not supported:', error);
    }

    // Track paint timing
    try {
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.firstContentfulPaint = entry.startTime;
          }
        });
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);
    } catch (error) {
      console.warn('Paint timing observer not supported:', error);
    }

    // Track LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.largestContentfulPaint = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (error) {
      console.warn('LCP observer not supported:', error);
    }

    // Track CLS
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!layoutShiftEntry.hadRecentInput && layoutShiftEntry.value) {
            clsValue += layoutShiftEntry.value;
            this.metrics.cumulativeLayoutShift = clsValue;
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn('CLS observer not supported:', error);
    }

    // Track resource loading
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.includes('.js') || entry.name.includes('.css')) {
            const chunkName = this.extractChunkName(entry.name);
            const resourceEntry = entry as PerformanceResourceTiming;
            const loadTime = resourceEntry.responseEnd - resourceEntry.requestStart;
            this.metrics.chunkLoadTimes?.set(chunkName, loadTime);
          }
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Resource timing observer not supported:', error);
    }
  }

  /**
   * Track initial page load
   */
  private trackInitialLoad() {
    if (typeof performance !== 'undefined' && performance.timing) {
      const timing = performance.timing;
      this.metrics.loadTime = timing.loadEventEnd - timing.navigationStart;
    }
  }

  /**
   * Start tracking route navigation
   */
  startRouteTracking(route: string) {
    this.routeStartTimes.set(route, performance.now());
  }

  /**
   * End tracking route navigation
   */
  endRouteTracking(route: string) {
    const startTime = this.routeStartTimes.get(route);
    if (startTime) {
      const loadTime = performance.now() - startTime;
      this.metrics.routeLoadTimes?.set(route, loadTime);
      this.routeStartTimes.delete(route);
      
      console.log(`📊 Route ${route} loaded in ${loadTime.toFixed(2)}ms`);
    }
  }

  /**
   * Track bundle size (estimated from loaded resources)
   */
  trackBundleSize() {
    if (typeof performance === 'undefined') return;

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    let totalSize = 0;

    resources.forEach((resource) => {
      if (resource.name.includes('.js') || resource.name.includes('.css')) {
        // Estimate size from transfer size or encoded body size
        const resourceWithSize = resource as PerformanceResourceTiming & { transferSize?: number; encodedBodySize?: number };
        const size = resourceWithSize.transferSize || resourceWithSize.encodedBodySize || 0;
        totalSize += size;
      }
    });

    this.metrics.bundleSize = totalSize;
    return totalSize;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  /**
   * Get route performance data
   */
  getRoutePerformance(): RoutePerformance[] {
    const routeData: RoutePerformance[] = [];
    
    this.metrics.routeLoadTimes?.forEach((loadTime, route) => {
      routeData.push({
        route,
        loadTime,
        chunkSize: this.estimateRouteChunkSize(route),
        timestamp: Date.now()
      });
    });

    return routeData;
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const bundleSize = this.trackBundleSize();
    
    let report = '📊 Performance Report\n';
    report += '===================\n\n';
    
    if (bundleSize) {
      report += `📦 Total Bundle Size: ${(bundleSize / 1024).toFixed(2)} KB\n`;
    }
    
    if (metrics.loadTime) {
      report += `⏱️  Initial Load Time: ${metrics.loadTime.toFixed(2)}ms\n`;
    }
    
    if (metrics.firstContentfulPaint) {
      report += `🎨 First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(2)}ms\n`;
    }
    
    if (metrics.largestContentfulPaint) {
      report += `🖼️  Largest Contentful Paint: ${metrics.largestContentfulPaint.toFixed(2)}ms\n`;
    }
    
    if (metrics.cumulativeLayoutShift !== undefined) {
      report += `📐 Cumulative Layout Shift: ${metrics.cumulativeLayoutShift.toFixed(4)}\n`;
    }
    
    report += '\n🛣️  Route Load Times:\n';
    metrics.routeLoadTimes?.forEach((time, route) => {
      report += `  ${route}: ${time.toFixed(2)}ms\n`;
    });
    
    report += '\n📦 Chunk Load Times:\n';
    metrics.chunkLoadTimes?.forEach((time, chunk) => {
      report += `  ${chunk}: ${time.toFixed(2)}ms\n`;
    });
    
    return report;
  }

  /**
   * Log performance metrics to console
   */
  logMetrics() {
    console.log(this.generateReport());
  }

  /**
   * Check if performance is within acceptable thresholds
   */
  checkPerformanceThresholds(): { passed: boolean; issues: string[] } {
    const issues: string[] = [];
    const metrics = this.getMetrics();
    
    // Check bundle size (should be < 1MB)
    const bundleSize = this.trackBundleSize();
    if (bundleSize && bundleSize > 1024 * 1024) {
      issues.push(`Bundle size too large: ${(bundleSize / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Check LCP (should be < 2.5s)
    if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 2500) {
      issues.push(`LCP too slow: ${metrics.largestContentfulPaint.toFixed(2)}ms`);
    }
    
    // Check CLS (should be < 0.1)
    if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.1) {
      issues.push(`CLS too high: ${metrics.cumulativeLayoutShift.toFixed(4)}`);
    }
    
    // Check route load times (should be < 1s)
    metrics.routeLoadTimes?.forEach((time, route) => {
      if (time > 1000) {
        issues.push(`Route ${route} loads too slowly: ${time.toFixed(2)}ms`);
      }
    });
    
    return {
      passed: issues.length === 0,
      issues
    };
  }

  /**
   * Extract chunk name from resource URL
   */
  private extractChunkName(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('?')[0]; // Remove query parameters
  }

  /**
   * Estimate chunk size for a route
   */
  private estimateRouteChunkSize(route: string): number {
    // This is a simplified estimation
    // In a real implementation, you might track actual chunk sizes
    const baseSize = 50 * 1024; // 50KB base
    const routeMultiplier = route.split('/').length;
    return baseSize * routeMultiplier;
  }

  /**
   * Clean up observers
   */
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-log performance metrics in development
if (process.env.NODE_ENV === 'development') {
  // Log metrics after initial load
  setTimeout(() => {
    performanceMonitor.logMetrics();
  }, 3000);
  
  // Make it available globally for debugging
  (window as typeof window & { performanceMonitor?: typeof performanceMonitor }).performanceMonitor = performanceMonitor;
}

export default performanceMonitor;