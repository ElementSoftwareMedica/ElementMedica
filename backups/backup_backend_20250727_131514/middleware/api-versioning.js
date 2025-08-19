/**
 * API Versioning Middleware
 * Handles API version routing and backward compatibility
 */

import { logger } from '../utils/logger.js';

/**
 * Extract API version from request
 * Supports version in:
 * - URL path: /api/v1/users
 * - Header: Accept-Version: v1
 * - Query parameter: ?version=v1
 */
function extractVersion(req) {
  // Check x-api-version header from proxy first (highest priority)
  const proxyVersion = req.headers['x-api-version'];
  if (proxyVersion && /^v\d+$/.test(proxyVersion)) {
    return proxyVersion;
  }

  // Check URL path second
  const pathMatch = req.path.match(/^\/api\/(v\d+)\//); 
  if (pathMatch) {
    return pathMatch[1];
  }

  // Check Accept-Version header
  const headerVersion = req.headers['accept-version'];
  if (headerVersion && /^v\d+$/.test(headerVersion)) {
    return headerVersion;
  }

  // Check query parameter
  const queryVersion = req.query.version;
  if (queryVersion && /^v\d+$/.test(queryVersion)) {
    return queryVersion;
  }

  // Default version
  return process.env.API_VERSION_DEFAULT || 'v1';
}

/**
 * Check if version is deprecated
 */
function isVersionDeprecated(version) {
  const deprecatedVersions = (process.env.API_DEPRECATED_VERSIONS || '').split(',');
  return deprecatedVersions.includes(version);
}

/**
 * Get deprecation notice
 */
function getDeprecationNotice(version) {
  const noticeDays = process.env.API_DEPRECATION_NOTICE_DAYS || 90;
  return {
    message: `API version ${version} is deprecated and will be removed in ${noticeDays} days`,
    sunset: new Date(Date.now() + (noticeDays * 24 * 60 * 60 * 1000)).toISOString(),
    migration_guide: `/docs/migration/${version}-to-v2`
  };
}

/**
 * API Versioning Middleware
 */
function apiVersioning(req, res, next) {
  try {
    // Skip versioning for non-API routes and health checks
    if (!req.path.startsWith('/api/') || req.path === '/health' || req.path.startsWith('/health')) {
      return next();
    }
    
    // Extract version from request
    const version = extractVersion(req);
    
    // Set version in request object
    req.apiVersion = version;
    
    // Add version to response headers
    res.set('API-Version', version);
    
    // Check if version is deprecated
    if (isVersionDeprecated(version)) {
      const deprecationNotice = getDeprecationNotice(version);
      
      // Add deprecation headers
      res.set('Deprecation', 'true');
      res.set('Sunset', deprecationNotice.sunset);
      res.set('Link', `<${deprecationNotice.migration_guide}>; rel="migration-guide"`);
      
      // Log deprecation usage
      logger.warn('Deprecated API version used', {
        version,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }
    
    // Rewrite URL to include version if not present
    if (!req.path.startsWith(`/api/${version}/`)) {
      const newPath = req.path.replace(/^\/api\//, `/api/${version}/`);
      req.url = req.url.replace(req.path, newPath);
      // Express will automatically update req.path based on req.url
    }
    
    logger.debug('API version resolved', {
      originalPath: req.originalUrl,
      version,
      newPath: req.path
    });
    
    next();
  } catch (error) {
    logger.error('API versioning error', {
      error: error.message,
      path: req.path,
      stack: error.stack
    });
    
    res.status(400).json({
      error: 'Invalid API version',
      message: 'Please specify a valid API version (v1, v2, etc.)'
    });
  }
}

/**
 * Version compatibility checker
 */
function checkVersionCompatibility(requiredVersion) {
  return (req, res, next) => {
    const currentVersion = req.apiVersion;
    
    if (!currentVersion) {
      return res.status(400).json({
        error: 'API version required',
        message: 'Please specify an API version'
      });
    }
    
    // Extract version numbers for comparison
    const currentVersionNum = parseInt(currentVersion.replace('v', ''));
    const requiredVersionNum = parseInt(requiredVersion.replace('v', ''));
    
    if (currentVersionNum < requiredVersionNum) {
      return res.status(400).json({
        error: 'API version not supported',
        message: `This endpoint requires API version ${requiredVersion} or higher`,
        current_version: currentVersion,
        required_version: requiredVersion
      });
    }
    
    next();
  };
}

/**
 * Version-specific route handler
 */
function versionRoute(versions) {
  return (req, res, next) => {
    const currentVersion = req.apiVersion;
    
    if (versions[currentVersion]) {
      return versions[currentVersion](req, res, next);
    }
    
    // Fallback to latest version if current not found
    const availableVersions = Object.keys(versions).sort().reverse();
    const latestVersion = availableVersions[0];
    
    if (latestVersion && versions[latestVersion]) {
      logger.warn('Falling back to latest version', {
        requested: currentVersion,
        fallback: latestVersion,
        path: req.path
      });
      
      return versions[latestVersion](req, res, next);
    }
    
    res.status(404).json({
      error: 'API version not found',
      message: `API version ${currentVersion} is not available for this endpoint`,
      available_versions: availableVersions
    });
  };
}

export {
  apiVersioning,
  checkVersionCompatibility,
  versionRoute,
  extractVersion,
  isVersionDeprecated,
  getDeprecationNotice
};