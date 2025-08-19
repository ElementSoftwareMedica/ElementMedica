
/**
 * Sistema Routing Avanzato V24
 * Timestamp: 2025-01-21T13:15:45.000Z
 * Gestione completa del routing con proxy dinamico, versioning API e middleware avanzati
 */

import { routerMap, RouterMapUtils } from './core/RouterMap.js';
import VersionManager from './core/VersionManager.js';
import ProxyManager from './core/ProxyManager.js';
import RouteLogger from './core/RouteLogger.js';

import {
  createLegacyRedirectMiddleware,
  createStaticRouteMiddleware,
  createRouteValidationMiddleware,
  createDynamicCorsMiddleware,
  createDynamicRateLimitMiddleware
} from './middleware/routeMiddleware.js';

import {
  createDiagnosticHandler,
  createAdvancedDiagnosticMiddleware
} from './middleware/diagnosticMiddleware.js';

import { 
  createBodyParsingMiddleware, 
  createBodyDebugMiddleware
} from './middleware/bodyParsingMiddleware.js';

import { createRawBodyPreservationMiddleware } from './middleware/rawBodyPreservationMiddleware.js';



class AdvancedRoutingSystem {
  constructor(config = {}) {
    this.config = {
      enableLogging: config.enableLogging !== false,
      logLevel: config.logLevel || 'info',
      logFile: config.logFile || null,
      enableDiagnostics: config.enableDiagnostics !== false,
      enableVersioning: config.enableVersioning !== false,
      enableLegacyRedirects: config.enableLegacyRedirects !== false,
      ...config
    };
    
    // Inizializza componenti
    this.routerMap = routerMap;
    this.logger = null;
    this.versionManager = null;
    this.proxyManager = null;
    
    this.initialized = false;
  }

  /**
   * Inizializza il sistema di routing
   */
  async initialize() {
    const timestamp = new Date().toISOString();
    console.log(`🚀🚀🚀 Initializing Advanced Routing System V24 at ${timestamp} 🚀🚀🚀`);
     console.log('🚀🚀🚀 *** FORCING MODULE RELOAD *** 🚀🚀🚀');
    
    try {
      // Valida RouterMap
      const validation = this.validateRouterMap();
      if (!validation.valid) {
        throw new Error(`RouterMap validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Inizializza Logger
      if (this.config.enableLogging) {
        this.logger = new RouteLogger({
          enabled: true,
          level: this.config.logLevel,
          logFile: this.config.logFile,
          ...this.routerMap.logging
        });
        console.log('✅ Route Logger initialized');
      }
      
      // Inizializza Version Manager
      if (this.config.enableVersioning) {
        this.versionManager = new VersionManager(this.routerMap);
        console.log('✅ Version Manager initialized');
      }
      
      // Inizializza ProxyManager
      console.log('🚨🚨🚨 [ROUTING-SYSTEM-V24] *** INITIALIZING PROXY MANAGER *** 🚨🚨🚨');
      this.proxyManager = new ProxyManager(this.routerMap, this.logger);
      console.log('🚨🚨🚨 [ROUTING-SYSTEM-V24] ProxyManager instance created 🚨🚨🚨:', {
        hasProxyManager: !!this.proxyManager,
        hasCreateDynamicProxyMiddleware: !!this.proxyManager.createDynamicProxyMiddleware,
        hasCreateServiceProxy: !!this.proxyManager.createServiceProxy,
        constructorName: this.proxyManager.constructor.name
      });
      await this.proxyManager.initializeProxies();
      console.log('✅ Proxy Manager initialized');
      
      this.initialized = true;
      console.log('🎉 Advanced Routing System initialized successfully');
      
      // Log evento inizializzazione
      if (this.logger) {
        this.logger.logEvent('system_initialized', {
          components: this.getInitializedComponents(),
          config: this.config
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize Advanced Routing System:', error);
      throw error;
    }
  }

  /**
   * Valida RouterMap
   */
  validateRouterMap() {
    return RouterMapUtils.validate();
  }

  /**
   * Ottiene componenti inizializzati
   */
  getInitializedComponents() {
    return {
      logger: !!this.logger,
      versionManager: !!this.versionManager,
      proxyManager: !!this.proxyManager,
      initialized: this.initialized
    };
  }

  /**
   * Configura middleware Express
   */
  configureExpress(app) {
    if (!this.initialized) {
      throw new Error('Routing system not initialized. Call initialize() first.');
    }
    
    console.log('🔧 Configuring Express middleware...');
    
    // Debug: Verifica stato componenti
    console.log('🔍 Component status:', {
      logger: !!this.logger,
      versionManager: !!this.versionManager,
      proxyManager: !!this.proxyManager,
      versionManagerType: this.versionManager ? typeof this.versionManager : 'undefined',
      hasCreateVersionMiddleware: this.versionManager ? typeof this.versionManager.createVersionMiddleware : 'undefined'
    });
    
    // 0. Raw Body Preservation (PRIMO middleware - deve preservare il body prima di tutto)
    app.use(createRawBodyPreservationMiddleware());
    console.log('✅ Raw body preservation middleware configured');
    
    // 1. Request Logger
    if (this.logger) {
      app.use(this.logger.createLoggingMiddleware());
      console.log('✅ Request logging middleware configured');
    }
    
    // 2. Route Validation
    app.use(createRouteValidationMiddleware(this.routerMap, this.logger));
    console.log('✅ Route validation middleware configured');
    
    // 3. Dynamic CORS
    app.use(createDynamicCorsMiddleware(this.routerMap));
    console.log('✅ Dynamic CORS middleware configured');
    
    // 4. Body Parsing
    app.use(createBodyParsingMiddleware(this.routerMap, this.logger));
    console.log('✅ Body parsing middleware configured');
    
    // 6. Body Debug (se abilitato)
    if (process.env.DEBUG_BODY_PARSER || process.env.DEBUG_ALL) {
      app.use(createBodyDebugMiddleware());
      console.log('✅ Body debug middleware configured');
    }
    
    // 7. Dynamic Rate Limiting - TEMPORANEAMENTE DISABILITATO per risolvere errore 429
    // app.use(createDynamicRateLimitMiddleware(this.routerMap));
    console.log('⚠️ Dynamic rate limiting middleware DISABLED (fixing 429 error)');
    
    // 8. Version Resolution (con controlli di sicurezza)
    if (this.versionManager && typeof this.versionManager.createVersionMiddleware === 'function') {
      app.use(this.versionManager.createVersionMiddleware());
      console.log('✅ Version resolution middleware configured');
    } else if (this.config.enableVersioning) {
      console.warn('⚠️ Version Manager not properly initialized, skipping version middleware');
    }
    
    // 9. Legacy Redirects
    if (this.config.enableLegacyRedirects) {
      app.use(createLegacyRedirectMiddleware(this.routerMap, this.logger));
      console.log('✅ Legacy redirect middleware configured');
    }
    
    // 10. Diagnostic Routes (prima dei proxy)
    if (this.config.enableDiagnostics) {
      app.use(createAdvancedDiagnosticMiddleware(
        this.routerMap,
        this.versionManager,
        this.proxyManager,
        this.logger
      ));
      console.log('✅ Diagnostic middleware configured');
    }
    
    // 11. Static Routes
    const diagnosticHandler = createDiagnosticHandler(
      this.routerMap,
      this.versionManager,
      this.proxyManager,
      this.logger
    );
    
    app.use(createStaticRouteMiddleware(this.routerMap, this.logger, diagnosticHandler));
    console.log('✅ Static routes middleware configured');
    
    // 12. Dynamic Proxy (ultimo middleware di routing)
    console.log('🚨🚨🚨 [ROUTING-SYSTEM-V24] *** CONFIGURING DYNAMIC PROXY *** 🚨🚨🚨');
    console.log('🚨🚨🚨 [ROUTING-SYSTEM-V24] ProxyManager status 🚨🚨🚨:', {
      exists: !!this.proxyManager,
      hasCreateDynamicProxyMiddleware: typeof this.proxyManager?.createDynamicProxyMiddleware,
      proxyManagerConstructor: this.proxyManager?.constructor?.name
    });
    app.use(this.proxyManager.createDynamicProxyMiddleware());
    console.log('✅ Dynamic proxy middleware configured');
    
    console.log('🎉 Express middleware configuration completed');
    
    // Log configurazione
    if (this.logger) {
      this.logger.logEvent('express_configured', {
        middlewareCount: 11,
        features: {
          logging: !!this.logger,
          versioning: !!this.versionManager,
          bodyParsing: true,
          legacyRedirects: this.config.enableLegacyRedirects,
          diagnostics: this.config.enableDiagnostics
        }
      });
    }
  }

  /**
   * Ottiene informazioni di stato del sistema
   */
  getSystemInfo() {
    return {
      initialized: this.initialized,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      components: this.getInitializedComponents(),
      config: this.config,
      routerMap: {
        versions: this.routerMap.versions,
        servicesCount: Object.keys(this.routerMap.services).length,
        routesCount: Object.values(this.routerMap.routes).reduce((total, routes) => total + Object.keys(routes).length, 0),
        legacyRoutesCount: Object.keys(this.routerMap.legacy).length,
        staticRoutesCount: Object.keys(this.routerMap.static).length
      }
    };
  }

  /**
   * Ottiene statistiche complete
   */
  async getStats() {
    const stats = {
      system: this.getSystemInfo(),
      proxy: this.proxyManager ? this.proxyManager.getStats() : null,
      logger: this.logger ? this.logger.getStats() : null,
      versions: this.versionManager ? this.versionManager.getAllVersionsInfo() : null
    };
    
    // Health check servizi
    if (this.proxyManager) {
      stats.health = await this.proxyManager.performHealthChecks();
    }
    
    return stats;
  }

  /**
   * Esegue health check completo
   */
  async healthCheck() {
    const health = {
      status: 'unknown',
      timestamp: new Date().toISOString(),
      components: {},
      services: {},
      issues: []
    };
    
    try {
      // Verifica componenti
      health.components = {
        routingSystem: this.initialized,
        logger: !!this.logger,
        versionManager: !!this.versionManager,
        proxyManager: !!this.proxyManager
      };
      
      // Verifica servizi
      if (this.proxyManager) {
        health.services = await this.proxyManager.performHealthChecks();
      }
      
      // Determina stato generale
      const componentIssues = Object.entries(health.components)
        .filter(([name, status]) => !status)
        .map(([name]) => `${name} not available`);
      
      const serviceIssues = Object.entries(health.services)
        .filter(([name, status]) => !status)
        .map(([name]) => `${name} service unhealthy`);
      
      health.issues = [...componentIssues, ...serviceIssues];
      
      if (health.issues.length === 0) {
        health.status = 'healthy';
      } else if (componentIssues.length === 0) {
        health.status = 'degraded';
      } else {
        health.status = 'unhealthy';
      }
      
    } catch (error) {
      health.status = 'error';
      health.issues.push(`Health check failed: ${error.message}`);
    }
    
    return health;
  }

  /**
   * Shutdown graceful del sistema
   */
  async shutdown() {
    console.log('🛑 Shutting down Advanced Routing System...');
    
    try {
      // Log shutdown
      if (this.logger) {
        this.logger.logEvent('system_shutdown', {
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        });
      }
      
      // Reset statistiche se necessario
      if (this.proxyManager) {
        // Eventuali cleanup del proxy manager
      }
      
      console.log('✅ Advanced Routing System shutdown completed');
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }
}

/**
 * Factory function per creare istanza del sistema
 */
function createAdvancedRoutingSystem(config = {}) {
  return new AdvancedRoutingSystem(config);
}

/**
 * Configurazione rapida per Express
 */
async function setupAdvancedRouting(app, config = {}) {
  const routingSystem = createAdvancedRoutingSystem(config);
  await routingSystem.initialize();
  routingSystem.configureExpress(app);
  return routingSystem;
}

export {
  AdvancedRoutingSystem,
  createAdvancedRoutingSystem,
  setupAdvancedRouting,
  
  // Esporta componenti individuali per uso avanzato
  routerMap,
  VersionManager,
  ProxyManager,
  RouteLogger
};