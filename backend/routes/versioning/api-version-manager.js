/**
 * API Version Manager - Handles API versioning and deprecation
 * Manages version routing, deprecation notices, and version analytics
 */

import { logger } from '../../utils/logger.js';

export class ApiVersionManager {
  constructor(options = {}) {
    this.options = {
      defaultVersion: 'v1',
      supportedVersions: ['v1', 'v2'],
      deprecatedVersions: new Map(),
      versionHeader: 'X-API-Version',
      enableVersioning: true,
      ...options
    };
    
    this.versionStats = new Map();
    this.versionRoutes = new Map();
    this.versionMiddleware = new Map();
    
    this.initializeVersions();
  }

  /**
   * Initialize version tracking
   */
  initializeVersions() {
    try {
      // Initialize stats for each supported version
      this.options.supportedVersions.forEach(version => {
        this.versionStats.set(version, {
          requests: 0,
          errors: 0,
          averageResponseTime: 0,
          lastUsed: null,
          routes: new Set(),
          deprecated: this.options.deprecatedVersions.has(version)
        });
      });

      logger.info('API version manager initialized', {
        supportedVersions: this.options.supportedVersions,
        defaultVersion: this.options.defaultVersion,
        component: 'api-version-manager'
      });
    } catch (error) {
      logger.error('Failed to initialize API version manager:', {
        error: error.message,
        component: 'api-version-manager'
      });
      throw error;
    }
  }

  /**
   * Create version middleware
   * @returns {Function} Version middleware
   */
  createVersionMiddleware() {
    return (req, res, next) => {
      try {
        // Extract version from URL path or header
        const version = this.extractVersion(req);
        
        // Validate version
        if (!this.isVersionSupported(version)) {
          return res.status(400).json({
            error: 'Unsupported API version',
            supportedVersions: this.options.supportedVersions,
            requestedVersion: version
          });
        }

        // Add version to request
        req.apiVersion = version;
        
        // Add version header to response
        res.set(this.options.versionHeader, version);
        
        // Check for deprecation
        if (this.isVersionDeprecated(version)) {
          const deprecationInfo = this.options.deprecatedVersions.get(version);
          res.set('X-API-Deprecation-Warning', 'true');
          res.set('X-API-Deprecation-Date', deprecationInfo.date);
          if (deprecationInfo.sunset) {
            res.set('X-API-Sunset-Date', deprecationInfo.sunset);
          }
        }

        // Record version usage
        this.recordVersionUsage(version, req);
        
        next();
      } catch (error) {
        logger.error('Version middleware error:', {
          error: error.message,
          component: 'api-version-manager'
        });
        next(error);
      }
    };
  }

  /**
   * Extract version from request
   * @param {object} req - Express request object
   * @returns {string} API version
   */
  extractVersion(req) {
    // Try to extract from URL path first (e.g., /api/v1/users)
    const pathMatch = req.path.match(/^\/api\/(v\d+)/);
    if (pathMatch) {
      return pathMatch[1];
    }

    // Try to extract from header
    const headerVersion = req.get(this.options.versionHeader);
    if (headerVersion) {
      return headerVersion;
    }

    // Try to extract from query parameter
    if (req.query.version) {
      return req.query.version;
    }

    // Return default version
    return this.options.defaultVersion;
  }

  /**
   * Check if version is supported
   * @param {string} version - Version to check
   * @returns {boolean} Whether version is supported
   */
  isVersionSupported(version) {
    return this.options.supportedVersions.includes(version);
  }

  /**
   * Check if version is deprecated
   * @param {string} version - Version to check
   * @returns {boolean} Whether version is deprecated
   */
  isVersionDeprecated(version) {
    return this.options.deprecatedVersions.has(version);
  }

  /**
   * Deprecate a version
   * @param {string} version - Version to deprecate
   * @param {object} options - Deprecation options
   * @returns {boolean} Success status
   */
  deprecateVersion(version, options = {}) {
    try {
      if (!this.isVersionSupported(version)) {
        throw new Error(`Version ${version} is not supported`);
      }

      const deprecationInfo = {
        date: options.date || new Date().toISOString(),
        reason: options.reason || 'Version deprecated',
        sunset: options.sunset || null,
        migration: options.migration || null
      };

      this.options.deprecatedVersions.set(version, deprecationInfo);

      // Update stats
      const stats = this.versionStats.get(version);
      if (stats) {
        stats.deprecated = true;
      }

      logger.info(`API version deprecated: ${version}`, {
        deprecationInfo,
        component: 'api-version-manager'
      });

      return true;
    } catch (error) {
      logger.error(`Failed to deprecate version ${version}:`, {
        error: error.message,
        component: 'api-version-manager'
      });
      return false;
    }
  }

  /**
   * Add a new supported version
   * @param {string} version - Version to add
   * @param {object} options - Version options
   * @returns {boolean} Success status
   */
  addVersion(version, options = {}) {
    try {
      if (this.isVersionSupported(version)) {
        logger.warn(`Version ${version} already supported`, {
          component: 'api-version-manager'
        });
        return true;
      }

      this.options.supportedVersions.push(version);
      
      // Initialize stats for new version
      this.versionStats.set(version, {
        requests: 0,
        errors: 0,
        averageResponseTime: 0,
        lastUsed: null,
        routes: new Set(),
        deprecated: false,
        addedAt: new Date().toISOString(),
        ...options
      });

      logger.info(`API version added: ${version}`, {
        component: 'api-version-manager'
      });

      return true;
    } catch (error) {
      logger.error(`Failed to add version ${version}:`, {
        error: error.message,
        component: 'api-version-manager'
      });
      return false;
    }
  }

  /**
   * Record version usage
   * @param {string} version - Version used
   * @param {object} req - Express request object
   */
  recordVersionUsage(version, req) {
    try {
      const stats = this.versionStats.get(version);
      if (stats) {
        stats.requests++;
        stats.lastUsed = new Date().toISOString();
        stats.routes.add(req.path);
      }
    } catch (error) {
      logger.error('Failed to record version usage:', {
        error: error.message,
        version,
        component: 'api-version-manager'
      });
    }
  }

  /**
   * Record version response metrics
   * @param {string} version - Version used
   * @param {number} responseTime - Response time in ms
   * @param {boolean} isError - Whether response was an error
   */
  recordVersionMetrics(version, responseTime, isError = false) {
    try {
      const stats = this.versionStats.get(version);
      if (stats) {
        if (isError) {
          stats.errors++;
        }
        
        // Update average response time
        const totalRequests = stats.requests;
        stats.averageResponseTime = (
          (stats.averageResponseTime * (totalRequests - 1)) + responseTime
        ) / totalRequests;
      }
    } catch (error) {
      logger.error('Failed to record version metrics:', {
        error: error.message,
        version,
        component: 'api-version-manager'
      });
    }
  }

  /**
   * Get version statistics
   * @param {string} version - Optional specific version
   * @returns {object} Version statistics
   */
  getVersionStats(version = null) {
    if (version) {
      const stats = this.versionStats.get(version);
      return stats ? {
        ...stats,
        routes: Array.from(stats.routes)
      } : null;
    }

    const allStats = {};
    for (const [v, stats] of this.versionStats) {
      allStats[v] = {
        ...stats,
        routes: Array.from(stats.routes)
      };
    }

    return allStats;
  }

  /**
   * Get version usage analytics
   * @returns {object} Version analytics
   */
  getVersionAnalytics() {
    const analytics = {
      totalVersions: this.options.supportedVersions.length,
      deprecatedVersions: this.options.deprecatedVersions.size,
      mostUsedVersion: null,
      leastUsedVersion: null,
      totalRequests: 0,
      totalErrors: 0,
      versionDistribution: {}
    };

    let maxRequests = 0;
    let minRequests = Infinity;

    for (const [version, stats] of this.versionStats) {
      analytics.totalRequests += stats.requests;
      analytics.totalErrors += stats.errors;
      
      analytics.versionDistribution[version] = {
        requests: stats.requests,
        percentage: 0, // Will be calculated after total is known
        errors: stats.errors,
        errorRate: stats.requests > 0 ? (stats.errors / stats.requests) * 100 : 0,
        averageResponseTime: stats.averageResponseTime,
        deprecated: stats.deprecated
      };

      if (stats.requests > maxRequests) {
        maxRequests = stats.requests;
        analytics.mostUsedVersion = version;
      }

      if (stats.requests < minRequests) {
        minRequests = stats.requests;
        analytics.leastUsedVersion = version;
      }
    }

    // Calculate percentages
    for (const version in analytics.versionDistribution) {
      const requests = analytics.versionDistribution[version].requests;
      analytics.versionDistribution[version].percentage = 
        analytics.totalRequests > 0 ? (requests / analytics.totalRequests) * 100 : 0;
    }

    return analytics;
  }

  /**
   * Get deprecation warnings for version
   * @param {string} version - Version to check
   * @returns {object|null} Deprecation info
   */
  getDeprecationInfo(version) {
    return this.options.deprecatedVersions.get(version) || null;
  }

  /**
   * Get all deprecated versions
   * @returns {Array} Array of deprecated version info
   */
  getDeprecatedVersions() {
    const deprecated = [];
    for (const [version, info] of this.options.deprecatedVersions) {
      deprecated.push({
        version,
        ...info
      });
    }
    return deprecated;
  }

  /**
   * Register route for version
   * @param {string} version - API version
   * @param {string} routePath - Route path
   */
  registerVersionRoute(version, routePath) {
    if (!this.versionRoutes.has(version)) {
      this.versionRoutes.set(version, new Set());
    }
    this.versionRoutes.get(version).add(routePath);
  }

  /**
   * Get routes for version
   * @param {string} version - API version
   * @returns {Array} Array of route paths
   */
  getVersionRoutes(version) {
    const routes = this.versionRoutes.get(version);
    return routes ? Array.from(routes) : [];
  }

  /**
   * Get manager status
   * @returns {object} Manager status
   */
  getStatus() {
    return {
      enabled: this.options.enableVersioning,
      defaultVersion: this.options.defaultVersion,
      supportedVersions: this.options.supportedVersions,
      deprecatedCount: this.options.deprecatedVersions.size,
      analytics: this.getVersionAnalytics()
    };
  }

  /**
   * Clear all version data
   */
  clear() {
    this.versionStats.clear();
    this.versionRoutes.clear();
    this.versionMiddleware.clear();
    this.options.deprecatedVersions.clear();
    
    logger.info('API version manager cleared', {
      component: 'api-version-manager'
    });
  }
}

export default ApiVersionManager;