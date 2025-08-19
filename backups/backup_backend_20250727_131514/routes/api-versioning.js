/**
 * API Versioning System
 * Advanced versioning management for API endpoints
 */

import { logger } from '../utils/logger.js';
import semver from 'semver';
import path from 'path';
import fs from 'fs/promises';

/**
 * API Version Manager
 */
export class ApiVersionManager {
  constructor() {
    this.versions = new Map();
    this.deprecatedVersions = new Set();
    this.defaultVersion = null;
    this.versionMappings = new Map();
    this.migrationStrategies = new Map();
  }
  
  /**
   * Register a new API version
   * @param {string} version - Version string (e.g., 'v1', '1.0.0')
   * @param {object} config - Version configuration
   */
  registerVersion(version, config = {}) {
    const {
      routes = {},
      middleware = [],
      deprecated = false,
      deprecationDate = null,
      sunsetDate = null,
      description = '',
      changelog = [],
      breakingChanges = [],
      migrationGuide = null
    } = config;
    
    const versionInfo = {
      version,
      routes,
      middleware,
      deprecated,
      deprecationDate: deprecationDate ? new Date(deprecationDate) : null,
      sunsetDate: sunsetDate ? new Date(sunsetDate) : null,
      description,
      changelog,
      breakingChanges,
      migrationGuide,
      registeredAt: new Date(),
      requestCount: 0,
      errorCount: 0,
      lastUsed: null
    };
    
    this.versions.set(version, versionInfo);
    
    if (deprecated) {
      this.deprecatedVersions.add(version);
    }
    
    // Set as default if it's the first version or explicitly marked
    if (!this.defaultVersion || config.isDefault) {
      this.defaultVersion = version;
    }
    
    logger.info('API version registered', {
      version,
      deprecated,
      isDefault: this.defaultVersion === version,
      component: 'api-versioning'
    });
  }
  
  /**
   * Get version information
   * @param {string} version - Version string
   * @returns {object|null} Version information
   */
  getVersion(version) {
    return this.versions.get(version) || null;
  }
  
  /**
   * Get all registered versions
   * @returns {Array} Array of version information
   */
  getAllVersions() {
    return Array.from(this.versions.entries()).map(([version, info]) => ({
      version,
      ...info
    }));
  }
  
  /**
   * Get supported versions (non-deprecated)
   * @returns {Array} Array of supported versions
   */
  getSupportedVersions() {
    return this.getAllVersions().filter(v => !v.deprecated);
  }
  
  /**
   * Get deprecated versions
   * @returns {Array} Array of deprecated versions
   */
  getDeprecatedVersions() {
    return this.getAllVersions().filter(v => v.deprecated);
  }
  
  /**
   * Deprecate a version
   * @param {string} version - Version to deprecate
   * @param {object} options - Deprecation options
   */
  deprecateVersion(version, options = {}) {
    const versionInfo = this.versions.get(version);
    if (!versionInfo) {
      throw new Error(`Version ${version} not found`);
    }
    
    const {
      deprecationDate = new Date(),
      sunsetDate = null,
      reason = 'Version deprecated',
      migrationGuide = null
    } = options;
    
    versionInfo.deprecated = true;
    versionInfo.deprecationDate = new Date(deprecationDate);
    versionInfo.sunsetDate = sunsetDate ? new Date(sunsetDate) : null;
    versionInfo.deprecationReason = reason;
    
    if (migrationGuide) {
      versionInfo.migrationGuide = migrationGuide;
    }
    
    this.deprecatedVersions.add(version);
    
    logger.warn('API version deprecated', {
      version,
      deprecationDate,
      sunsetDate,
      reason,
      component: 'api-versioning'
    });
  }
  
  /**
   * Remove a version (sunset)
   * @param {string} version - Version to remove
   */
  removeVersion(version) {
    if (!this.versions.has(version)) {
      throw new Error(`Version ${version} not found`);
    }
    
    this.versions.delete(version);
    this.deprecatedVersions.delete(version);
    this.versionMappings.delete(version);
    
    // Update default version if removed
    if (this.defaultVersion === version) {
      const availableVersions = Array.from(this.versions.keys());
      this.defaultVersion = availableVersions.length > 0 ? availableVersions[0] : null;
    }
    
    logger.info('API version removed', {
      version,
      newDefault: this.defaultVersion,
      component: 'api-versioning'
    });
  }
  
  /**
   * Set version mapping for backward compatibility
   * @param {string} requestedVersion - Version requested by client
   * @param {string} actualVersion - Actual version to use
   */
  setVersionMapping(requestedVersion, actualVersion) {
    if (!this.versions.has(actualVersion)) {
      throw new Error(`Target version ${actualVersion} not found`);
    }
    
    this.versionMappings.set(requestedVersion, actualVersion);
    
    logger.info('Version mapping set', {
      requestedVersion,
      actualVersion,
      component: 'api-versioning'
    });
  }
  
  /**
   * Resolve version from request
   * @param {string} requestedVersion - Version requested by client
   * @returns {string} Resolved version
   */
  resolveVersion(requestedVersion) {
    // Check for exact match
    if (this.versions.has(requestedVersion)) {
      return requestedVersion;
    }
    
    // Check for version mapping
    if (this.versionMappings.has(requestedVersion)) {
      return this.versionMappings.get(requestedVersion);
    }
    
    // Try semantic version matching
    const availableVersions = Array.from(this.versions.keys())
      .filter(v => semver.valid(v))
      .sort(semver.rcompare);
    
    if (semver.valid(requestedVersion)) {
      const satisfying = availableVersions.find(v => 
        semver.satisfies(v, `^${requestedVersion}`)
      );
      
      if (satisfying) {
        return satisfying;
      }
    }
    
    // Return default version
    return this.defaultVersion;
  }
  
  /**
   * Update version usage statistics
   * @param {string} version - Version used
   * @param {boolean} isError - Whether the request resulted in an error
   */
  updateUsageStats(version, isError = false) {
    const versionInfo = this.versions.get(version);
    if (versionInfo) {
      versionInfo.requestCount++;
      versionInfo.lastUsed = new Date();
      
      if (isError) {
        versionInfo.errorCount++;
      }
    }
  }
  
  /**
   * Get version usage statistics
   * @returns {object} Usage statistics
   */
  getUsageStats() {
    const stats = {
      totalVersions: this.versions.size,
      deprecatedVersions: this.deprecatedVersions.size,
      defaultVersion: this.defaultVersion,
      versions: []
    };
    
    for (const [version, info] of this.versions) {
      stats.versions.push({
        version,
        requestCount: info.requestCount,
        errorCount: info.errorCount,
        errorRate: info.requestCount > 0 ? (info.errorCount / info.requestCount * 100) : 0,
        lastUsed: info.lastUsed,
        deprecated: info.deprecated,
        deprecationDate: info.deprecationDate,
        sunsetDate: info.sunsetDate
      });
    }
    
    // Sort by request count
    stats.versions.sort((a, b) => b.requestCount - a.requestCount);
    
    return stats;
  }
}

/**
 * Version Detection Strategy
 */
export class VersionDetectionStrategy {
  static HEADER = 'header';
  static URL_PATH = 'url_path';
  static QUERY_PARAM = 'query_param';
  static ACCEPT_HEADER = 'accept_header';
  
  constructor(strategy = VersionDetectionStrategy.HEADER, options = {}) {
    this.strategy = strategy;
    this.options = {
      headerName: 'X-API-Version',
      queryParam: 'version',
      pathPrefix: '/api',
      acceptHeaderPattern: /application\/vnd\.api\+json;version=([\d\.]+)/,
      ...options
    };
  }
  
  /**
   * Extract version from request
   * @param {object} req - Express request object
   * @returns {string|null} Extracted version
   */
  extractVersion(req) {
    switch (this.strategy) {
      case VersionDetectionStrategy.HEADER:
        return req.headers[this.options.headerName.toLowerCase()] || null;
      
      case VersionDetectionStrategy.URL_PATH:
        const pathMatch = req.path.match(new RegExp(`${this.options.pathPrefix}/(v\\d+|\\d+\.\\d+\.\\d+)`));
        return pathMatch ? pathMatch[1] : null;
      
      case VersionDetectionStrategy.QUERY_PARAM:
        return req.query[this.options.queryParam] || null;
      
      case VersionDetectionStrategy.ACCEPT_HEADER:
        const acceptHeader = req.headers.accept || '';
        const acceptMatch = acceptHeader.match(this.options.acceptHeaderPattern);
        return acceptMatch ? acceptMatch[1] : null;
      
      default:
        return null;
    }
  }
}

/**
 * API Version Router
 */
export class ApiVersionRouter {
  constructor(versionManager, detectionStrategy) {
    this.versionManager = versionManager;
    this.detectionStrategy = detectionStrategy;
    this.routeHandlers = new Map();
  }
  
  /**
   * Register route handler for specific version
   * @param {string} version - API version
   * @param {string} method - HTTP method
   * @param {string} path - Route path
   * @param {Function} handler - Route handler
   */
  registerRoute(version, method, path, handler) {
    const routeKey = `${version}:${method.toUpperCase()}:${path}`;
    this.routeHandlers.set(routeKey, handler);
    
    logger.debug('Versioned route registered', {
      version,
      method,
      path,
      routeKey,
      component: 'api-version-router'
    });
  }
  
  /**
   * Get route handler for version and path
   * @param {string} version - API version
   * @param {string} method - HTTP method
   * @param {string} path - Route path
   * @returns {Function|null} Route handler
   */
  getRouteHandler(version, method, path) {
    const routeKey = `${version}:${method.toUpperCase()}:${path}`;
    return this.routeHandlers.get(routeKey) || null;
  }
  
  /**
   * Create versioning middleware
   * @returns {Function} Express middleware
   */
  createMiddleware() {
    return (req, res, next) => {
      // Extract version from request
      const requestedVersion = this.detectionStrategy.extractVersion(req);
      
      // Resolve actual version to use
      const resolvedVersion = this.versionManager.resolveVersion(requestedVersion);
      
      if (!resolvedVersion) {
        return res.status(400).json({
          error: 'Unsupported API version',
          requestedVersion,
          supportedVersions: this.versionManager.getSupportedVersions().map(v => v.version)
        });
      }
      
      // Add version info to request
      req.apiVersion = {
        requested: requestedVersion,
        resolved: resolvedVersion,
        info: this.versionManager.getVersion(resolvedVersion)
      };
      
      // Add deprecation headers if version is deprecated
      const versionInfo = this.versionManager.getVersion(resolvedVersion);
      if (versionInfo && versionInfo.deprecated) {
        res.set('X-API-Deprecated', 'true');
        
        if (versionInfo.deprecationDate) {
          res.set('X-API-Deprecation-Date', versionInfo.deprecationDate.toISOString());
        }
        
        if (versionInfo.sunsetDate) {
          res.set('X-API-Sunset-Date', versionInfo.sunsetDate.toISOString());
        }
        
        if (versionInfo.migrationGuide) {
          res.set('X-API-Migration-Guide', versionInfo.migrationGuide);
        }
        
        logger.warn('Deprecated API version used', {
          requestedVersion,
          resolvedVersion,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          component: 'api-versioning'
        });
      }
      
      // Set current version header
      res.set('X-API-Version', resolvedVersion);
      
      // Update usage statistics
      this.versionManager.updateUsageStats(resolvedVersion);
      
      next();
    };
  }
}

/**
 * Auto-discovery for versioned routes
 */
export class VersionedRouteDiscovery {
  constructor(routesDirectory) {
    this.routesDirectory = routesDirectory;
    this.discoveredRoutes = new Map();
  }
  
  /**
   * Discover versioned routes from filesystem
   * @returns {Promise<Map>} Discovered routes by version
   */
  async discoverRoutes() {
    try {
      const entries = await fs.readdir(this.routesDirectory, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && this.isVersionDirectory(entry.name)) {
          const version = entry.name;
          const versionPath = path.join(this.routesDirectory, version);
          const routes = await this.discoverVersionRoutes(versionPath);
          
          this.discoveredRoutes.set(version, routes);
          
          logger.info('Discovered versioned routes', {
            version,
            routeCount: routes.length,
            component: 'route-discovery'
          });
        }
      }
      
      return this.discoveredRoutes;
    } catch (error) {
      logger.error('Route discovery failed', {
        error: error.message,
        directory: this.routesDirectory,
        component: 'route-discovery'
      });
      
      throw error;
    }
  }
  
  /**
   * Check if directory name represents a version
   * @param {string} name - Directory name
   * @returns {boolean} True if version directory
   */
  isVersionDirectory(name) {
    return /^v\d+$/.test(name) || semver.valid(name);
  }
  
  /**
   * Discover routes in a version directory
   * @param {string} versionPath - Path to version directory
   * @returns {Promise<Array>} Array of route information
   */
  async discoverVersionRoutes(versionPath) {
    const routes = [];
    
    try {
      const files = await fs.readdir(versionPath);
      
      for (const file of files) {
        if (file.endsWith('.js') && !file.startsWith('_')) {
          const routePath = path.join(versionPath, file);
          const routeInfo = await this.analyzeRouteFile(routePath);
          
          if (routeInfo) {
            routes.push(routeInfo);
          }
        }
      }
    } catch (error) {
      logger.error('Version route discovery failed', {
        error: error.message,
        versionPath,
        component: 'route-discovery'
      });
    }
    
    return routes;
  }
  
  /**
   * Analyze route file to extract metadata
   * @param {string} filePath - Path to route file
   * @returns {Promise<object|null>} Route information
   */
  async analyzeRouteFile(filePath) {
    try {
      // Dynamic import of the route module
      const routeModule = await import(filePath);
      
      return {
        filePath,
        fileName: path.basename(filePath),
        routeName: path.basename(filePath, '.js'),
        module: routeModule,
        hasDefault: !!routeModule.default,
        exports: Object.keys(routeModule),
        metadata: routeModule.metadata || {}
      };
    } catch (error) {
      logger.error('Route file analysis failed', {
        error: error.message,
        filePath,
        component: 'route-discovery'
      });
      
      return null;
    }
  }
}

/**
 * Version migration utilities
 */
export class VersionMigrationHelper {
  constructor() {
    this.migrationStrategies = new Map();
  }
  
  /**
   * Register migration strategy
   * @param {string} fromVersion - Source version
   * @param {string} toVersion - Target version
   * @param {Function} migrationFn - Migration function
   */
  registerMigration(fromVersion, toVersion, migrationFn) {
    const migrationKey = `${fromVersion}->${toVersion}`;
    this.migrationStrategies.set(migrationKey, migrationFn);
    
    logger.info('Migration strategy registered', {
      fromVersion,
      toVersion,
      migrationKey,
      component: 'version-migration'
    });
  }
  
  /**
   * Migrate data between versions
   * @param {any} data - Data to migrate
   * @param {string} fromVersion - Source version
   * @param {string} toVersion - Target version
   * @returns {any} Migrated data
   */
  migrate(data, fromVersion, toVersion) {
    const migrationKey = `${fromVersion}->${toVersion}`;
    const migrationFn = this.migrationStrategies.get(migrationKey);
    
    if (!migrationFn) {
      logger.warn('No migration strategy found', {
        fromVersion,
        toVersion,
        migrationKey,
        component: 'version-migration'
      });
      
      return data; // Return original data if no migration available
    }
    
    try {
      const migratedData = migrationFn(data);
      
      logger.debug('Data migrated successfully', {
        fromVersion,
        toVersion,
        component: 'version-migration'
      });
      
      return migratedData;
    } catch (error) {
      logger.error('Data migration failed', {
        error: error.message,
        fromVersion,
        toVersion,
        component: 'version-migration'
      });
      
      throw error;
    }
  }
}

export default {
  ApiVersionManager,
  VersionDetectionStrategy,
  ApiVersionRouter,
  VersionedRouteDiscovery,
  VersionMigrationHelper
};