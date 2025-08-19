/**
 * Diagnostic Middleware - Endpoint Diagnostico /routes
 * 
 * Fornisce informazioni complete sullo stato del sistema di routing,
 * statistiche, configurazioni attive e health check dei servizi.
 */

import { RouterMapUtils } from '../core/RouterMap.js';

/**
 * Crea handler per endpoint diagnostico /routes
 */
function createDiagnosticHandler(routerMap, versionManager, proxyManager, logger) {
  return async (req, res) => {
    try {
      const timestamp = new Date().toISOString();
      
      // Informazioni base
      const diagnosticInfo = {
        timestamp,
        uptime: process.uptime(),
        service: 'proxy-server',
        version: process.env.npm_package_version || '1.0.0',
        node: process.version,
        
        // Configurazione versioni
        versions: versionManager ? versionManager.getAllVersionsInfo() : routerMap.versions,
        
        // Servizi configurati
        services: await getServicesInfo(routerMap, proxyManager),
        
        // Route attive
        routes: getRoutesInfo(routerMap, versionManager),
        
        // Route legacy
        legacy: getLegacyRoutesInfo(routerMap),
        
        // Route statiche
        static: getStaticRoutesInfo(routerMap),
        
        // Statistiche
        stats: getSystemStats(proxyManager, logger),
        
        // Configurazioni
        config: getConfigInfo(routerMap),
        
        // Health status
        health: await getHealthStatus(routerMap, proxyManager)
      };
      
      // Log richiesta diagnostica
      if (logger) {
        logger.logEvent('diagnostic_request', {
          endpoint: '/routes',
          requestedBy: req.ip || 'unknown'
        }, req.requestId);
      }
      
      res.json(diagnosticInfo);
      
    } catch (error) {
      console.error('❌ Error in diagnostic handler:', error);
      
      if (logger) {
        logger.logError(req, error, 'diagnostic');
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate diagnostic information',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Ottiene informazioni sui servizi
 */
async function getServicesInfo(routerMap, proxyManager) {
  const services = [];
  
  for (const [serviceName, serviceConfig] of Object.entries(routerMap.services)) {
    const serviceUrl = RouterMapUtils.getServiceUrl(serviceName);
    let healthStatus = 'unknown';
    let responseTime = null;
    
    // Verifica health se ProxyManager disponibile
    if (proxyManager) {
      try {
        const startTime = Date.now();
        const isHealthy = await proxyManager.isServiceHealthy(serviceName);
        responseTime = Date.now() - startTime;
        healthStatus = isHealthy ? 'healthy' : 'unhealthy';
      } catch (error) {
        healthStatus = 'error';
      }
    }
    
    services.push({
      name: serviceName,
      displayName: serviceConfig.name || serviceName,
      url: serviceUrl,
      host: serviceConfig.host,
      port: serviceConfig.port,
      protocol: serviceConfig.protocol,
      healthCheck: serviceConfig.healthCheck,
      timeout: serviceConfig.timeout,
      retries: serviceConfig.retries,
      status: healthStatus,
      responseTime: responseTime
    });
  }
  
  return services;
}

/**
 * Ottiene informazioni sulle route attive
 */
function getRoutesInfo(routerMap, versionManager) {
  const routesInfo = {
    byVersion: {},
    total: 0,
    dynamic: []
  };
  
  // Route per versione
  for (const [version, routes] of Object.entries(routerMap.routes)) {
    const versionRoutes = [];
    
    for (const [pattern, config] of Object.entries(routes)) {
      const serviceUrl = RouterMapUtils.getServiceUrl(config.target);
      
      versionRoutes.push({
        pattern: pattern,
        target: config.target,
        targetUrl: serviceUrl,
        pathRewrite: config.pathRewrite,
        methods: config.methods,
        description: config.description,
        cors: config.cors,
        rateLimit: config.rateLimit
      });
      
      routesInfo.total++;
    }
    
    routesInfo.byVersion[version] = {
        routes: versionRoutes,
        count: versionRoutes.length,
        supported: RouterMapUtils.isVersionSupported(version),
        deprecated: versionManager && typeof versionManager.isVersionDeprecated === 'function' 
          ? versionManager.isVersionDeprecated(version) : false,
        sunset: versionManager && typeof versionManager.isVersionSunset === 'function' 
          ? versionManager.isVersionSunset(version) : false
      };
  }
  
  // Route dinamiche
  if (versionManager) {
    const dynamicRoutes = versionManager.generateDynamicRoutes();
    routesInfo.dynamic = Object.entries(dynamicRoutes).map(([pattern, config]) => ({
      pattern: pattern,
      version: config.version,
      target: config.target,
      dynamic: true,
      description: config.description
    }));
  }
  
  return routesInfo;
}

/**
 * Ottiene informazioni sulle route legacy
 */
function getLegacyRoutesInfo(routerMap) {
  const legacyRoutes = RouterMapUtils.getLegacyRoutes();
  
  return Object.entries(legacyRoutes).map(([pattern, config]) => ({
    pattern: pattern,
    redirect: config.redirect || config,
    method: config.method,
    methods: config.methods,
    description: config.description,
    type: 'legacy_redirect'
  }));
}

/**
 * Ottiene informazioni sulle route statiche
 */
function getStaticRoutesInfo(routerMap) {
  const staticRoutes = RouterMapUtils.getStaticRoutes();
  
  return Object.entries(staticRoutes).map(([pattern, config]) => ({
    pattern: pattern,
    handler: config.handler,
    methods: config.methods,
    description: config.description,
    type: 'static'
  }));
}

/**
 * Ottiene statistiche del sistema
 */
function getSystemStats(proxyManager, logger) {
  const stats = {
    proxy: null,
    logger: null,
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  };
  
  // Statistiche proxy
  if (proxyManager) {
    stats.proxy = proxyManager.getStats();
  }
  
  // Statistiche logger
  if (logger) {
    stats.logger = logger.getStats();
  }
  
  return stats;
}

/**
 * Ottiene informazioni di configurazione
 */
function getConfigInfo(routerMap) {
  return {
    cors: {
      configured: Object.keys(routerMap.corsConfig || {}).length,
      patterns: Object.keys(routerMap.corsConfig || {})
    },
    rateLimit: {
      configured: Object.keys(routerMap.rateLimitConfig || {}).length,
      types: Object.keys(routerMap.rateLimitConfig || {})
    },
    logging: routerMap.logging || { enabled: false }
  };
}

/**
 * Ottiene stato di salute generale
 */
async function getHealthStatus(routerMap, proxyManager) {
  const health = {
    overall: 'unknown',
    services: {},
    issues: []
  };
  
  if (proxyManager) {
    try {
      const healthChecks = await proxyManager.performHealthChecks();
      health.services = healthChecks;
      
      // Determina stato generale
      const healthyServices = Object.values(healthChecks).filter(Boolean).length;
      const totalServices = Object.keys(healthChecks).length;
      
      if (healthyServices === totalServices) {
        health.overall = 'healthy';
      } else if (healthyServices > 0) {
        health.overall = 'degraded';
        health.issues.push(`${totalServices - healthyServices} services unhealthy`);
      } else {
        health.overall = 'unhealthy';
        health.issues.push('All services unhealthy');
      }
      
    } catch (error) {
      health.overall = 'error';
      health.issues.push(`Health check failed: ${error.message}`);
    }
  }
  
  return health;
}

/**
 * Crea middleware per endpoint diagnostico avanzato
 */
function createAdvancedDiagnosticMiddleware(routerMap, versionManager, proxyManager, logger) {
  return (req, res, next) => {
    const path = req.path;
    const query = req.query;
    
    // Endpoint diagnostici specifici
    switch (path) {
      case '/routes':
        return createDiagnosticHandler(routerMap, versionManager, proxyManager, logger)(req, res);
        
      case '/routes/health':
        return handleHealthDiagnostic(routerMap, proxyManager)(req, res);
        
      case '/routes/stats':
        return handleStatsDiagnostic(proxyManager, logger)(req, res);
        
      case '/routes/config':
        return handleConfigDiagnostic(routerMap)(req, res);
        
      case '/routes/version':
        return handleVersionDiagnostic(versionManager, query.version)(req, res);
        
      default:
        return next();
    }
  };
}

/**
 * Handler per diagnostica health
 */
function handleHealthDiagnostic(routerMap, proxyManager) {
  return async (req, res) => {
    try {
      const health = await getHealthStatus(routerMap, proxyManager);
      const statusCode = health.overall === 'healthy' ? 200 : 
                        health.overall === 'degraded' ? 207 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(500).json({
        error: 'Health check failed',
        message: error.message
      });
    }
  };
}

/**
 * Handler per diagnostica statistiche
 */
function handleStatsDiagnostic(proxyManager, logger) {
  return (req, res) => {
    const stats = getSystemStats(proxyManager, logger);
    res.json(stats);
  };
}

/**
 * Handler per diagnostica configurazione
 */
function handleConfigDiagnostic(routerMap) {
  return (req, res) => {
    const config = getConfigInfo(routerMap);
    res.json(config);
  };
}

/**
 * Handler per diagnostica versione
 */
function handleVersionDiagnostic(versionManager, requestedVersion) {
  return (req, res) => {
    if (!versionManager) {
      return res.status(501).json({
        error: 'Version manager not available'
      });
    }
    
    if (requestedVersion) {
      const versionInfo = versionManager.getVersionInfo(requestedVersion);
      res.json(versionInfo);
    } else {
      const allVersions = versionManager.getAllVersionsInfo();
      res.json(allVersions);
    }
  };
}

export {
  createDiagnosticHandler,
  createAdvancedDiagnosticMiddleware
};