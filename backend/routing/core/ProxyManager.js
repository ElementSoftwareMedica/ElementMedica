/**
 * ProxyManager V41 - Complete HTTP Request Handling
 * 
 * Versione V41: Gestione completa della richiesta HTTP con response handling
 * - Invia req.rawBody come Buffer senza conversione in stringa
 * - Imposta content-length correttamente
 * - Preserva content-type originale
 * - Gestisce completamente la risposta dal server di destinazione
 * 
 * CRITICO: Questa versione gestisce completamente il ciclo richiesta-risposta
 * per garantire che il body venga trasmesso correttamente.
 * 
 * Trigger riavvio: V41
 */

// Invalidazione cache Node.js per forzare ricaricamento
const moduleId = import.meta.url;
if (typeof require !== 'undefined' && require.cache) {
  Object.keys(require.cache).forEach(key => {
    if (key.includes('ProxyManager') || key.includes('routing')) {
      delete require.cache[key];
    }
  });
}

import { createProxyMiddleware } from 'http-proxy-middleware';
import { RouterMapUtils } from './RouterMap.js';

export default class ProxyManager {
  constructor(routerMap, logger) {
    const timestamp = new Date().toISOString();
    const cacheHash = Math.random().toString(36).substring(7);
    
    // ProxyManager V41 initialized - debug logs removed to reduce verbosity
    this.routerMap = routerMap;
    this.logger = logger;
    this.proxies = new Map();
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      serviceStats: {}
    };
  }

  /**
   * Inizializza tutti i proxy basati su RouterMap
   */
  initializeProxies() {
    console.log('🔄 Initializing proxy services...');
    
    // Inizializza proxy per ogni servizio
    for (const [serviceName, serviceConfig] of Object.entries(this.routerMap.services)) {
      this.createServiceProxy(serviceName, serviceConfig);
    }
    
    console.log(`✅ Initialized ${this.proxies.size} proxy services`);
  }

  /**
   * Crea proxy per un servizio specifico
   */
  createServiceProxy(serviceName, serviceConfig) {
    // Creating proxy for service - debug logs removed to reduce verbosity
    const target = RouterMapUtils.getServiceUrl(serviceName);
    
    if (!target) {
      console.error(`❌ Cannot create proxy for service ${serviceName}: invalid configuration`);
      return null;
    }

    const proxyConfig = {
      target: target,
      changeOrigin: true,
      timeout: serviceConfig.timeout || 30000,
      proxyTimeout: serviceConfig.timeout || 30000,
      
      // CRITICO: Configurazione per gestire correttamente il body
      selfHandleResponse: false,
      parseReqBody: false, // ✅ TENTATIVO 37: Disabilitato - raw body gestito manualmente
      
      // CRITICO: Preserva i cookie per l'autenticazione
      cookieDomainRewrite: false,
      cookiePathRewrite: false,
      
      // Handler per gestire manualmente il body raw
      onProxyReq: (proxyReq, req, res) => {
        // CRITICO: Assicura che i cookie siano preservati
        if (req.headers.cookie) {
          proxyReq.setHeader('cookie', req.headers.cookie);
        }
        
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.rawBody) {
          // Scrivi il raw body nella richiesta proxy
          proxyReq.write(req.rawBody);
          proxyReq.end();
        }
      },
      
      // Logging
      logLevel: 'debug',
      logProvider: () => this.logger,
      
      // Event handlers
      onError: this.createErrorHandler(serviceName),
      onProxyRes: this.createProxyResponseHandler(serviceName),
      
      // Headers
      headers: {
        'X-Proxy-Service': serviceName,
        'X-Proxy-Timestamp': () => new Date().toISOString()
      }
    };

    // Proxy configuration and middleware creation - debug logs removed to reduce verbosity
    const proxy = createProxyMiddleware(proxyConfig);
    this.proxies.set(serviceName, proxy);
    
    // Inizializza statistiche servizio
    this.stats.serviceStats[serviceName] = {
      requests: 0,
      errors: 0,
      avgResponseTime: 0,
      lastRequest: null
    };

    console.log(`✅ Created proxy for ${serviceName} -> ${target}`);
    return proxy;
  }

  /**
   * Crea middleware proxy dinamico basato su RouterMap
   */
  createDynamicProxyMiddleware() {
    return async (req, res, next) => {
      const startTime = Date.now();
      
      // Processing request - debug logs removed to reduce verbosity
      
      // Incrementa contatore richieste
      this.stats.totalRequests++;
      
      // Il body parsing è già stato gestito dal middleware del sistema di routing avanzato
      // Procediamo direttamente con il proxy processing
      await this.continueProxyProcessing(req, res, next, startTime);
    };
  }

  /**
   * Continua il processing del proxy dopo il body parsing
   */
  async continueProxyProcessing(req, res, next, startTime) {
    // Risolvi target e configurazione
    const routeConfig = this.resolveRoute(req);
    
    if (!routeConfig) {
      return next(); // Passa al middleware successivo
    }

    // Gestione completa della richiesta HTTP con response handling
    // Per DELETE, usa il proxy standard se non c'è body
    if (req.method === 'DELETE' && !req.rawBody) {
      // Continua con il proxy standard
    } else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      
      if (req.rawBody) {
        
        // TENTATIVO 41: Gestione completa con Promise per attendere la risposta
        const http = await import('http');
        const url = await import('url');
        
        const targetUrl = new url.URL(routeConfig.target + routeConfig.rewrittenPath);
        
        const options = {
          hostname: targetUrl.hostname,
          port: targetUrl.port,
          path: targetUrl.pathname + (targetUrl.search || ''),
          method: req.method,
          headers: {
            ...req.headers,
            'host': targetUrl.host,
            'content-length': req.rawBody.length,
            // CRITICO: Preserva i cookie per l'autenticazione
            'cookie': req.headers.cookie || ''
          }
        };
        
        // Wrap in Promise per gestione completa
        return new Promise((resolve, reject) => {
          const proxyReq = http.default.request(options, (proxyRes) => {
            // Copia headers della risposta (escludi quelli che potrebbero causare problemi)
            Object.keys(proxyRes.headers).forEach(key => {
              if (!['connection', 'transfer-encoding'].includes(key.toLowerCase())) {
                res.setHeader(key, proxyRes.headers[key]);
              }
            });
            
            // Copia status code
            res.statusCode = proxyRes.statusCode;
            
            // Gestisci la risposta completamente
            let responseData = Buffer.alloc(0);
            
            proxyRes.on('data', (chunk) => {
              responseData = Buffer.concat([responseData, chunk]);
            });
            
            proxyRes.on('end', () => {
              // Verifica se la risposta è JSON valida per debug
              if (proxyRes.headers['content-type']?.includes('application/json')) {
                try {
                  const jsonString = responseData.toString('utf8');
                  JSON.parse(jsonString);
                } catch (jsonError) {
                  console.error(`❌ [PROXY-V41] Invalid JSON response:`, {
                    error: jsonError.message,
                    responsePreview: responseData.toString('utf8').substring(0, 200)
                  });
                }
              }
              
              res.end(responseData);
              resolve();
            });
            
            proxyRes.on('error', (error) => {
              console.error(`❌ [PROXY-V41] Response error:`, error);
              reject(error);
            });
          });
          
          proxyReq.on('error', (error) => {
            console.error(`❌ [PROXY-V41] Request error:`, error);
            if (!res.headersSent) {
              res.status(502).json({ error: 'Proxy Error', message: error.message });
            }
            reject(error);
          });
          
          // Scrivi il body e termina la richiesta
          proxyReq.write(req.rawBody);
          proxyReq.end();
        });
      }
    }

    // Aggiungi header informativi
    this.addInformativeHeaders(req, res, routeConfig);
    
    // Log richiesta
    this.logger.logProxyTarget(req, routeConfig.target, routeConfig.rewrittenPath);
    
    // Applica pathRewrite se necessario
    if (routeConfig.pathRewrite) {
      req.url = this.applyPathRewrite(req.url, routeConfig.pathRewrite);
    }
    
    // Ottieni proxy per il servizio (crea se non esiste)
    let proxy = this.proxies.get(routeConfig.service);
    
    if (!proxy) {
      proxy = this.createServiceProxy(routeConfig.service, this.routerMap.services[routeConfig.service]);
      
      if (!proxy) {
        console.error(`❌ Failed to create proxy for service: ${routeConfig.service}`);
        return res.status(502).json({
          error: 'Service Unavailable',
          message: `Proxy for service ${routeConfig.service} not available`
        });
      }
    }

    // Aggiungi handler per tracking tempo risposta
    const originalEnd = res.end;
    res.end = function(...args) {
      const duration = Date.now() - startTime;
      this.updateResponseTimeStats(routeConfig.service, duration);
      originalEnd.apply(res, args);
    }.bind(this);

    // Esegui proxy
    proxy(req, res, next);
  }

  /**
   * Risolve la route e configurazione per una richiesta
   */
  resolveRoute(req) {
    const version = req.apiVersion || RouterMapUtils.getDefaultVersion();
    const path = req.path;
    
    // 1. Prima controlla le route per versione specifica (PRIORITÀ MASSIMA)
    const versionRoutes = RouterMapUtils.getRoutesForVersion(version);
    
    // Trova route corrispondente
    for (const [routePattern, routeConfig] of Object.entries(versionRoutes)) {
      const matchResult = this.matchRoute(path, routePattern);
      if (matchResult.match) {
        const rewrittenPath = this.applyPathRewrite(path, routeConfig.pathRewrite);
        
        return {
          service: routeConfig.target,
          target: RouterMapUtils.getServiceUrl(routeConfig.target),
          pathRewrite: routeConfig.pathRewrite,
          rewrittenPath: rewrittenPath,
          config: routeConfig,
          version: version,
          params: matchResult.params,
          isDynamic: false
        };
      }
    }
    
    // 2. Poi controlla le route dinamiche (solo se non trovate route specifiche)
    const dynamicMatch = RouterMapUtils.matchDynamicRoute(path);
    
    if (dynamicMatch) {
      // Valida la versione se richiesto
      if (dynamicMatch.config.versionValidation && dynamicMatch.params.version && !RouterMapUtils.isVersionSupported(dynamicMatch.params.version)) {
        return null; // Versione non supportata
      }
      
      const rewrittenPath = RouterMapUtils.resolveDynamicPathRewrite(path, dynamicMatch.config, dynamicMatch.params);
      
      return {
        service: dynamicMatch.config.target,
        target: RouterMapUtils.getServiceUrl(dynamicMatch.config.target),
        pathRewrite: dynamicMatch.config.pathRewrite,
        rewrittenPath: rewrittenPath,
        config: dynamicMatch.config,
        version: dynamicMatch.params.version || version,
        params: dynamicMatch.params,
        isDynamic: true
      };
    }
    
    return null;
  }

  /**
   * Verifica se un path corrisponde a un pattern di route
   */
  matchRoute(path, pattern) {
    // Gestisce parametri dinamici come :version e wildcard
    const regexPattern = pattern
      .replace(/:[^\/]+/g, '([^/]+)') // Sostituisce :param con gruppo di cattura
      .replace(/\*/g, '.*')           // Sostituisce * con .*
      .replace(/\//g, '\\/');         // Escape delle slash
    
    const regex = new RegExp(`^${regexPattern}$`);
    const match = regex.exec(path);
    
    if (match) {
      // Estrae i parametri dal match
      const params = {};
      const paramNames = pattern.match(/:[^\/]+/g) || [];
      
      paramNames.forEach((paramName, index) => {
        const cleanParamName = paramName.substring(1); // Rimuove il ':'
        params[cleanParamName] = match[index + 1];
      });
      
      return { match: true, params };
    }
    
    return { match: false, params: {} };
  }

  /**
   * Applica pathRewrite a un URL
   */
  applyPathRewrite(url, pathRewrite) {
    if (!pathRewrite) return url;
    
    let rewrittenUrl = url;
    
    for (const [pattern, replacement] of Object.entries(pathRewrite)) {
      const regex = new RegExp(pattern);
      rewrittenUrl = rewrittenUrl.replace(regex, replacement);
    }
    
    return rewrittenUrl;
  }

  /**
   * Aggiunge header informativi alla risposta
   */
  addInformativeHeaders(req, res, routeConfig) {
    res.set({
      'X-Proxy-Target': routeConfig.target,
      'X-Proxy-Service': routeConfig.service,
      'X-API-Version': routeConfig.version,
      'X-Request-ID': req.requestId || 'unknown'
    });
  }

  /**
   * Crea handler per errori proxy
   */
  createErrorHandler(serviceName) {
    return (err, req, res) => {
      this.stats.failedRequests++;
      this.stats.serviceStats[serviceName].errors++;
      
      console.error(`❌ Proxy error for ${serviceName}:`, err.message);
      
      // Determina status code basato sul tipo di errore
      let statusCode = 502;
      let message = 'Bad Gateway';
      
      if (err.code === 'ECONNREFUSED') {
        statusCode = 503;
        message = 'Service Unavailable';
      } else if (err.code === 'ETIMEDOUT') {
        statusCode = 504;
        message = 'Gateway Timeout';
      }
      
      // Log errore
      this.logger.logError(req, err, serviceName);
      
      // Risposta errore
      if (!res.headersSent) {
        res.status(statusCode).json({
          error: message,
          service: serviceName,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }
    };
  }

  /**
   * Crea handler per risposte proxy
   */
  createProxyResponseHandler(serviceName) {
    return (proxyRes, req, res) => {
      this.stats.successfulRequests++;
      
      // Aggiungi header di risposta
      proxyRes.headers['x-proxy-service'] = serviceName;
      proxyRes.headers['x-proxy-timestamp'] = new Date().toISOString();
    };
  }

  /**
   * Aggiorna statistiche tempo di risposta
   */
  updateResponseTimeStats(serviceName, duration) {
    const serviceStats = this.stats.serviceStats[serviceName];
    
    // Calcola media mobile
    const currentAvg = serviceStats.avgResponseTime;
    const requestCount = serviceStats.requests;
    
    serviceStats.avgResponseTime = ((currentAvg * (requestCount - 1)) + duration) / requestCount;
    
    // Aggiorna media globale
    const totalRequests = this.stats.totalRequests;
    this.stats.avgResponseTime = ((this.stats.avgResponseTime * (totalRequests - 1)) + duration) / totalRequests;
  }

  /**
   * Ottiene statistiche proxy
   */
  getStats() {
    return {
      ...this.stats,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: Object.keys(this.routerMap.services).map(serviceName => ({
        name: serviceName,
        url: RouterMapUtils.getServiceUrl(serviceName),
        stats: this.stats.serviceStats[serviceName],
        healthy: this.isServiceHealthy(serviceName)
      }))
    };
  }

  /**
   * Verifica salute di un servizio
   */
  async isServiceHealthy(serviceName) {
    try {
      const serviceConfig = RouterMapUtils.getService(serviceName);
      const healthUrl = `${RouterMapUtils.getServiceUrl(serviceName)}${serviceConfig.healthCheck}`;
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        timeout: 5000
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Esegue health check di tutti i servizi
   */
  async performHealthChecks() {
    const results = {};
    
    for (const serviceName of Object.keys(this.routerMap.services)) {
      results[serviceName] = await this.isServiceHealthy(serviceName);
    }
    
    return results;
  }

  /**
   * Reset statistiche
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      serviceStats: {}
    };
    
    // Reinizializza stats servizi
    for (const serviceName of Object.keys(this.routerMap.services)) {
      this.stats.serviceStats[serviceName] = {
        requests: 0,
        errors: 0,
        avgResponseTime: 0,
        lastRequest: null
      };
    }
  }
}