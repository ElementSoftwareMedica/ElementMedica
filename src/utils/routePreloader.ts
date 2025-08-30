/**
 * Route Preloader Utility
 * Week 11 Implementation - Intelligent Route Preloading
 */

type PreloadableRoute = () => Promise<{ default: React.ComponentType }>;

interface RoutePreloadConfig {
  route: string;
  loader: PreloadableRoute;
  priority: 'high' | 'medium' | 'low';
  preloadOn?: 'hover' | 'visible' | 'idle';
}

class RoutePreloader {
  private preloadedRoutes = new Set<string>();
  private preloadPromises = new Map<string, Promise<{ default: React.ComponentType }>>();
  private routeConfigs = new Map<string, RoutePreloadConfig>();
  private intersectionObserver?: IntersectionObserver;
  private idleCallback?: number;

  constructor() {
    this.setupIntersectionObserver();
    this.setupIdlePreloading();
  }

  /**
   * Register a route for preloading
   */
  registerRoute(config: RoutePreloadConfig) {
    this.routeConfigs.set(config.route, config);
  }

  /**
   * Preload a specific route
   */
  async preloadRoute(route: string): Promise<void> {
    if (this.preloadedRoutes.has(route)) {
      return;
    }

    const config = this.routeConfigs.get(route);
    if (!config) {
      console.warn(`Route ${route} not registered for preloading`);
      return;
    }

    if (this.preloadPromises.has(route)) {
      await this.preloadPromises.get(route);
      return;
    }

    const preloadPromise = this.executePreload(config);
    this.preloadPromises.set(route, preloadPromise);

    try {
      await preloadPromise;
      this.preloadedRoutes.add(route);
      console.log(`✅ Preloaded route: ${route}`);
    } catch (error) {
      console.error(`❌ Failed to preload route ${route}:`, error);
      this.preloadPromises.delete(route);
    }
  }

  /**
   * Preload routes based on priority
   */
  async preloadByPriority(priority: 'high' | 'medium' | 'low') {
    const routesToPreload = Array.from(this.routeConfigs.entries())
      .filter(([, config]) => config.priority === priority)
      .map(([route]) => route);

    await Promise.allSettled(
      routesToPreload.map(route => this.preloadRoute(route))
    );
  }

  /**
   * Setup hover-based preloading for navigation links
   */
  setupHoverPreloading() {
    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link && this.isInternalLink(link.href)) {
        const route = this.extractRoute(link.href);
        const config = this.routeConfigs.get(route);
        
        if (config && config.preloadOn === 'hover') {
          this.preloadRoute(route);
        }
      }
    });
  }

  /**
   * Setup intersection observer for visible-based preloading
   */
  private setupIntersectionObserver() {
    if (typeof IntersectionObserver === 'undefined') return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const route = element.dataset.preloadRoute;
            
            if (route) {
              const config = this.routeConfigs.get(route);
              if (config && config.preloadOn === 'visible') {
                this.preloadRoute(route);
              }
            }
          }
        });
      },
      { rootMargin: '50px' }
    );
  }

  /**
   * Setup idle-based preloading
   */
  private setupIdlePreloading() {
    if (typeof requestIdleCallback === 'undefined') return;

    const preloadIdleRoutes = () => {
      this.idleCallback = requestIdleCallback(() => {
        const idleRoutes = Array.from(this.routeConfigs.entries())
          .filter(([, config]) => config.preloadOn === 'idle')
          .map(([route]) => route);

        idleRoutes.forEach(route => {
          if (!this.preloadedRoutes.has(route)) {
            this.preloadRoute(route);
          }
        });
      });
    };

    // Start idle preloading after initial load
    setTimeout(preloadIdleRoutes, 2000);
  }

  /**
   * Observe an element for visible-based preloading
   */
  observeElement(element: HTMLElement, route: string) {
    if (this.intersectionObserver) {
      element.dataset.preloadRoute = route;
      this.intersectionObserver.observe(element);
    }
  }

  /**
   * Execute the actual preload
   */
  private async executePreload(config: RoutePreloadConfig) {
    return config.loader();
  }

  /**
   * Check if a link is internal
   */
  private isInternalLink(href: string): boolean {
    try {
      const url = new URL(href, window.location.origin);
      return url.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  /**
   * Extract route from URL
   */
  private extractRoute(href: string): string {
    try {
      const url = new URL(href, window.location.origin);
      return url.pathname;
    } catch {
      return href;
    }
  }

  /**
   * Get preload statistics
   */
  getStats() {
    return {
      totalRoutes: this.routeConfigs.size,
      preloadedRoutes: this.preloadedRoutes.size,
      pendingPreloads: this.preloadPromises.size,
      preloadedList: Array.from(this.preloadedRoutes)
    };
  }

  /**
   * Clear all preloaded routes (useful for testing)
   */
  clear() {
    this.preloadedRoutes.clear();
    this.preloadPromises.clear();
    if (this.idleCallback) {
      cancelIdleCallback(this.idleCallback);
    }
  }
}

// Create singleton instance
export const routePreloader = new RoutePreloader();

// Register all application routes
routePreloader.registerRoute({
  route: '/',
  loader: () => import('../pages/Dashboard/Dashboard.lazy'),
  priority: 'high',
  preloadOn: 'idle'
});

routePreloader.registerRoute({
  route: '/companies',
  loader: () => import('../pages/companies/CompaniesPage.lazy'),
  priority: 'high',
  preloadOn: 'hover'
});

routePreloader.registerRoute({
  route: '/employees',
  loader: () => import('../pages/employees/EmployeesPage.lazy'),
  priority: 'high',
  preloadOn: 'hover'
});

routePreloader.registerRoute({
  route: '/courses',
  loader: () => import('../pages/courses/CoursesPage.lazy'),
  priority: 'medium',
  preloadOn: 'hover'
});

routePreloader.registerRoute({
  route: '/trainers',
  loader: () => import('../pages/trainers/TrainersPage.lazy'),
  priority: 'medium',
  preloadOn: 'hover'
});

routePreloader.registerRoute({
  route: '/schedules',
  loader: () => import('../pages/schedules/SchedulesPage.lazy'),
  priority: 'medium',
  preloadOn: 'hover'
});

routePreloader.registerRoute({
  route: '/settings',
  loader: () => import('../pages/settings/Settings.lazy'),
  priority: 'low',
  preloadOn: 'hover'
});

routePreloader.registerRoute({
  route: '/quotes-and-invoices',
  loader: () => import('../pages/QuotesAndInvoices.lazy'),
  priority: 'low',
  preloadOn: 'hover'
});

routePreloader.registerRoute({
  route: '/documents-corsi',
  loader: () => import('../pages/DocumentsCorsi.lazy'),
  priority: 'low',
  preloadOn: 'hover'
});

// Initialize hover preloading
if (typeof document !== 'undefined') {
  routePreloader.setupHoverPreloading();
}

export default routePreloader;