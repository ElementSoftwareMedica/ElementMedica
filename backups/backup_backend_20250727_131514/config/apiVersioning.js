/**
 * API Versioning Configuration
 * Gestione centralizzata del versioning delle API con supporto per v1, v2 e route dinamiche
 */

import express from 'express';
import { logger } from '../utils/logger.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * Versioni API supportate
 */
export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2'
};

/**
 * Configurazioni per versioning
 */
export const VERSIONING_CONFIG = {
  defaultVersion: API_VERSIONS.V1,
  supportedVersions: [API_VERSIONS.V1, API_VERSIONS.V2],
  versionHeader: 'X-API-Version',
  versionParam: 'version',
  deprecationWarnings: true,
  strictVersioning: false, // Se true, richiede versione esplicita
  
  // Configurazioni per deprecazione
  deprecation: {
    [API_VERSIONS.V1]: {
      deprecated: false,
      sunsetDate: null,
      migrationGuide: '/docs/migration/v1-to-v2'
    }
  },
  
  // Prefissi per le route
  routePrefixes: {
    [API_VERSIONS.V1]: '/api/v1',
    [API_VERSIONS.V2]: '/api/v2'
  }
};

/**
 * Classe per gestire il versioning delle API
 */
export class APIVersionManager {
  constructor(app, options = {}) {
    this.app = app;
    this.config = { ...VERSIONING_CONFIG, ...options };
    this.routers = new Map();
    this.routes = new Map();
    this.middleware = new Map();
    
    // Inizializza router per ogni versione
    this.initializeRouters();
    
    logger.info('API Version Manager initialized', {
      service: 'api-versioning',
      supportedVersions: this.config.supportedVersions,
      defaultVersion: this.config.defaultVersion
    });
  }
  
  /**
   * Inizializza router per ogni versione
   */
  initializeRouters() {
    this.config.supportedVersions.forEach(version => {
      const router = express.Router();
      const prefix = this.config.routePrefixes[version];
      
      // Middleware per logging della versione
      router.use((req, res, next) => {
        req.apiVersion = version;
        res.setHeader('X-API-Version', version);
        
        // Log della richiesta con versione
        logger.debug('API request', {
          service: 'api-versioning',
          version,
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent')
        });
        
        next();
      });
      
      // Middleware per deprecazione
      if (this.config.deprecation[version]?.deprecated) {
        router.use(this.createDeprecationMiddleware(version));
      }
      
      this.routers.set(version, router);
      
      // Monta il router sull'app
      this.app.use(prefix, router);
      
      logger.info('API version router initialized', {
        service: 'api-versioning',
        version,
        prefix
      });
    });
  }
  
  /**
   * Crea middleware per gestire la deprecazione
   */
  createDeprecationMiddleware(version) {
    const deprecationInfo = this.config.deprecation[version];
    
    return (req, res, next) => {
      // Header di deprecazione
      res.setHeader('Deprecation', 'true');
      
      if (deprecationInfo.sunsetDate) {
        res.setHeader('Sunset', deprecationInfo.sunsetDate);
      }
      
      if (deprecationInfo.migrationGuide) {
        res.setHeader('Link', `<${deprecationInfo.migrationGuide}>; rel="migration-guide"`);
      }
      
      // Warning nel response
      if (this.config.deprecationWarnings) {
        res.setHeader('Warning', `299 - "API version ${version} is deprecated"`);
      }
      
      logger.warn('Deprecated API version used', {
        service: 'api-versioning',
        version,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      
      next();
    };
  }
  
  /**
   * Registra route per una versione specifica
   */
  registerRoute(version, method, path, ...handlers) {
    if (!this.config.supportedVersions.includes(version)) {
      throw new Error(`Unsupported API version: ${version}`);
    }
    
    const router = this.routers.get(version);
    
    if (!router) {
      throw new Error(`Router for version ${version} not found`);
    }
    
    // Registra la route
    router[method.toLowerCase()](path, ...handlers);
    
    // Traccia la route registrata
    const routeKey = `${version}:${method}:${path}`;
    this.routes.set(routeKey, {
      version,
      method: method.toUpperCase(),
      path,
      handlers: handlers.length,
      registeredAt: new Date().toISOString()
    });
    
    logger.debug('Route registered', {
      service: 'api-versioning',
      version,
      method: method.toUpperCase(),
      path,
      handlers: handlers.length
    });
    
    return this;
  }
  
  /**
   * Registra middleware per una versione specifica
   */
  registerMiddleware(version, middleware, options = {}) {
    if (!this.config.supportedVersions.includes(version)) {
      throw new Error(`Unsupported API version: ${version}`);
    }
    
    const router = this.routers.get(version);
    
    if (!router) {
      throw new Error(`Router for version ${version} not found`);
    }
    
    // Applica middleware
    if (options.path) {
      router.use(options.path, middleware);
    } else {
      router.use(middleware);
    }
    
    // Traccia il middleware
    const middlewareKey = `${version}:${options.name || 'anonymous'}`;
    this.middleware.set(middlewareKey, {
      version,
      name: options.name || 'anonymous',
      path: options.path || '*',
      registeredAt: new Date().toISOString()
    });
    
    logger.debug('Middleware registered', {
      service: 'api-versioning',
      version,
      name: options.name || 'anonymous',
      path: options.path || '*'
    });
    
    return this;
  }
  
  /**
   * Carica automaticamente le route da directory
   */
  async loadRoutesFromDirectory(version, directory) {
    try {
      const routeFiles = await this.findRouteFiles(directory);
      
      for (const filePath of routeFiles) {
        try {
          const routeModule = await import(filePath);
          
          if (routeModule.default && typeof routeModule.default === 'function') {
            // Se il modulo esporta una funzione, chiamala con il router
            const router = this.routers.get(version);
            routeModule.default(router);
          } else if (routeModule.router) {
            // Se il modulo esporta un router, montalo
            const router = this.routers.get(version);
            const mountPath = routeModule.mountPath || '/';
            router.use(mountPath, routeModule.router);
          }
          
          logger.info('Route file loaded', {
            service: 'api-versioning',
            version,
            file: path.basename(filePath)
          });
          
        } catch (error) {
          logger.error('Failed to load route file', {
            service: 'api-versioning',
            version,
            file: filePath,
            error: error.message
          });
        }
      }
      
    } catch (error) {
      logger.error('Failed to load routes from directory', {
        service: 'api-versioning',
        version,
        directory,
        error: error.message
      });
    }
  }
  
  /**
   * Trova file di route in una directory
   */
  async findRouteFiles(directory) {
    const files = [];
    
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          // Ricorsione nelle sottodirectory
          const subFiles = await this.findRouteFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      logger.warn('Cannot read directory for routes', {
        service: 'api-versioning',
        directory,
        error: error.message
      });
    }
    
    return files;
  }
  
  /**
   * Middleware per rilevamento automatico della versione
   */
  createVersionDetectionMiddleware() {
    return (req, res, next) => {
      let version = this.config.defaultVersion;
      
      // 1. Controlla header X-API-Version
      const headerVersion = req.get(this.config.versionHeader);
      if (headerVersion && this.config.supportedVersions.includes(headerVersion)) {
        version = headerVersion;
      }
      
      // 2. Controlla query parameter
      const queryVersion = req.query[this.config.versionParam];
      if (queryVersion && this.config.supportedVersions.includes(queryVersion)) {
        version = queryVersion;
      }
      
      // 3. Controlla Accept header (es: application/vnd.api+json;version=v2)
      const acceptHeader = req.get('Accept');
      if (acceptHeader) {
        const versionMatch = acceptHeader.match(/version=([^;,\s]+)/);
        if (versionMatch && this.config.supportedVersions.includes(versionMatch[1])) {
          version = versionMatch[1];
        }
      }
      
      // Verifica versioning strict
      if (this.config.strictVersioning && !req.get(this.config.versionHeader) && !req.query[this.config.versionParam]) {
        return res.status(400).json({
          error: 'API version required',
          message: `Please specify API version using ${this.config.versionHeader} header or ${this.config.versionParam} query parameter`,
          supportedVersions: this.config.supportedVersions
        });
      }
      
      req.apiVersion = version;
      res.setHeader('X-API-Version', version);
      
      next();
    };
  }
  
  /**
   * Middleware per gestire route non trovate con suggerimenti di versione
   */
  createVersionNotFoundMiddleware() {
    return (req, res) => {
      const currentVersion = req.apiVersion || this.config.defaultVersion;
      const availableVersions = this.config.supportedVersions.filter(v => v !== currentVersion);
      
      const suggestions = availableVersions.map(version => {
        const prefix = this.config.routePrefixes[version];
        return `${prefix}${req.path}`;
      });
      
      res.status(404).json({
        error: 'Route not found',
        message: `The requested route does not exist in API version ${currentVersion}`,
        currentVersion,
        availableVersions,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        path: req.path,
        method: req.method
      });
    };
  }
  
  /**
   * Ottieni informazioni sulle route registrate
   */
  getRouteInfo() {
    const routesByVersion = {};
    
    this.config.supportedVersions.forEach(version => {
      routesByVersion[version] = {
        prefix: this.config.routePrefixes[version],
        deprecated: this.config.deprecation[version]?.deprecated || false,
        routes: [],
        middleware: []
      };
    });
    
    // Aggiungi route
    for (const [key, route] of this.routes) {
      routesByVersion[route.version].routes.push(route);
    }
    
    // Aggiungi middleware
    for (const [key, middleware] of this.middleware) {
      routesByVersion[middleware.version].middleware.push(middleware);
    }
    
    return {
      defaultVersion: this.config.defaultVersion,
      supportedVersions: this.config.supportedVersions,
      versions: routesByVersion
    };
  }
  
  /**
   * Depreca una versione API
   */
  deprecateVersion(version, options = {}) {
    if (!this.config.supportedVersions.includes(version)) {
      throw new Error(`Cannot deprecate unsupported version: ${version}`);
    }
    
    this.config.deprecation[version] = {
      deprecated: true,
      sunsetDate: options.sunsetDate || null,
      migrationGuide: options.migrationGuide || `/docs/migration/${version}-to-${this.getNextVersion(version)}`,
      reason: options.reason || 'Version deprecated'
    };
    
    // Aggiungi middleware di deprecazione se non già presente
    const router = this.routers.get(version);
    if (router) {
      router.use(this.createDeprecationMiddleware(version));
    }
    
    logger.warn('API version deprecated', {
      service: 'api-versioning',
      version,
      sunsetDate: options.sunsetDate,
      reason: options.reason
    });
  }
  
  /**
   * Ottieni la prossima versione disponibile
   */
  getNextVersion(currentVersion) {
    const versions = this.config.supportedVersions;
    const currentIndex = versions.indexOf(currentVersion);
    
    if (currentIndex === -1 || currentIndex === versions.length - 1) {
      return versions[versions.length - 1]; // Ultima versione
    }
    
    return versions[currentIndex + 1];
  }
  
  /**
   * Ottieni router per una versione
   */
  getRouter(version) {
    return this.routers.get(version);
  }
  
  /**
   * Ottieni configurazione
   */
  getConfig() {
    return { ...this.config };
  }
}

/**
 * Factory per creare route versionate
 */
export const createVersionedRoute = (versions, routeDefinition) => {
  return (versionManager) => {
    versions.forEach(version => {
      const { method, path, handlers } = routeDefinition;
      versionManager.registerRoute(version, method, path, ...handlers);
    });
  };
};

/**
 * Decorator per route versionate
 */
export const versionedRoute = (versions) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(req, res, next) {
      const requestedVersion = req.apiVersion;
      
      if (!versions.includes(requestedVersion)) {
        return res.status(400).json({
          error: 'Unsupported API version',
          message: `This endpoint is not available in version ${requestedVersion}`,
          supportedVersions: versions
        });
      }
      
      return originalMethod.call(this, req, res, next);
    };
    
    return descriptor;
  };
};

/**
 * Utility per confrontare versioni
 */
export const compareVersions = (version1, version2) => {
  const v1 = version1.replace('v', '');
  const v2 = version2.replace('v', '');
  
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
};

export default {
  APIVersionManager,
  createVersionedRoute,
  versionedRoute,
  compareVersions,
  API_VERSIONS,
  VERSIONING_CONFIG
};