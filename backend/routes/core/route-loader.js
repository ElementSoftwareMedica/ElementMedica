/**
 * Route Loader - Dynamic Route Loading System
 * Handles automatic discovery and loading of route files
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class RouteLoader {
  constructor(options = {}) {
    this.options = {
      routesDirectory: options.routesDirectory || path.join(__dirname, '..'),
      fileExtensions: options.fileExtensions || ['.js'],
      excludePatterns: options.excludePatterns || [
        /\.backup$/,
        /\.test\.js$/,
        /\.spec\.js$/,
        /^index\.js$/,
        /^config\.js$/,
        /^middleware\.js$/,
        /^response-handler\.js$/,
        /^validators\.js$/,
        /^query-optimizer\.js$/,
        /^api-versioning\.js$/,
        /^api-documentation\.js$/
      ],
      ...options
    };
    
    this.loadedRoutes = new Map();
    this.loadErrors = [];
  }

  /**
   * Load all routes from the routes directory
   * @returns {Promise<Map>} Map of loaded routes
   */
  async loadAllRoutes() {
    try {
      const routeFiles = await this.discoverRouteFiles();
      
      for (const routeFile of routeFiles) {
        await this.loadRouteFile(routeFile);
      }
      
      logger.info('Route loading completed', {
        totalRoutes: this.loadedRoutes.size,
        errors: this.loadErrors.length,
        component: 'route-loader'
      });
      
      return this.loadedRoutes;
    } catch (error) {
      logger.error('Failed to load routes:', {
        error: error.message,
        component: 'route-loader'
      });
      throw error;
    }
  }

  /**
   * Discover all route files in the directory
   * @returns {Promise<Array>} Array of route file paths
   */
  async discoverRouteFiles() {
    const routeFiles = [];
    
    try {
      const entries = await fs.readdir(this.options.routesDirectory, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && this.isValidRouteFile(entry.name)) {
          const filePath = path.join(this.options.routesDirectory, entry.name);
          routeFiles.push({
            name: entry.name,
            path: filePath,
            routeName: this.getRouteNameFromFile(entry.name)
          });
        }
      }
      
      logger.debug('Route files discovered', {
        count: routeFiles.length,
        files: routeFiles.map(f => f.name),
        component: 'route-loader'
      });
      
      return routeFiles;
    } catch (error) {
      logger.error('Failed to discover route files:', {
        error: error.message,
        directory: this.options.routesDirectory,
        component: 'route-loader'
      });
      throw error;
    }
  }

  /**
   * Load versioned routes from version directories
   * @param {string} version - Version string (e.g., 'v1')
   * @returns {Promise<Map>} Map of versioned routes
   */
  async loadVersionedRoutes(version) {
    const versionDir = path.join(this.options.routesDirectory, version);
    const versionedRoutes = new Map();
    
    try {
      const exists = await fs.access(versionDir).then(() => true).catch(() => false);
      if (!exists) {
        logger.warn(`Version directory not found: ${versionDir}`, {
          version,
          component: 'route-loader'
        });
        return versionedRoutes;
      }
      
      const entries = await fs.readdir(versionDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && this.isValidRouteFile(entry.name)) {
          const filePath = path.join(versionDir, entry.name);
          const routeInfo = await this.loadRouteFile({
            name: entry.name,
            path: filePath,
            routeName: this.getRouteNameFromFile(entry.name),
            version
          });
          
          if (routeInfo) {
            versionedRoutes.set(routeInfo.routePath, routeInfo);
          }
        }
      }
      
      logger.debug('Versioned routes loaded', {
        version,
        count: versionedRoutes.size,
        component: 'route-loader'
      });
      
      return versionedRoutes;
    } catch (error) {
      logger.error(`Failed to load versioned routes for ${version}:`, {
        error: error.message,
        version,
        component: 'route-loader'
      });
      return versionedRoutes;
    }
  }

  /**
   * Load a single route file
   * @param {object} routeFile - Route file information
   * @returns {Promise<object|null>} Route information or null if failed
   */
  async loadRouteFile(routeFile) {
    try {
      const { name, path: filePath, routeName, version } = routeFile;
      
      // Dynamic import of route module
      const routeModule = await import(filePath);
      const router = routeModule.default || routeModule.router;
      
      if (!router) {
        logger.warn(`No router exported from ${filePath}`, {
          file: name,
          component: 'route-loader'
        });
        return null;
      }

      const routePath = this.getRoutePathFromFilename(routeName, version);
      const routeInfo = {
        name: routeName,
        router,
        filePath,
        routePath,
        version,
        loadedAt: new Date().toISOString(),
        module: routeModule
      };
      
      this.loadedRoutes.set(routePath, routeInfo);
      
      logger.debug(`Route loaded: ${routePath}`, {
        file: filePath,
        version,
        component: 'route-loader'
      });
      
      return routeInfo;
    } catch (error) {
      const errorInfo = {
        file: routeFile.path,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.loadErrors.push(errorInfo);
      
      logger.error(`Failed to load route file ${routeFile.path}:`, {
        error: error.message,
        component: 'route-loader'
      });
      
      return null;
    }
  }

  /**
   * Check if a file is a valid route file
   * @param {string} filename - File name
   * @returns {boolean} True if valid route file
   */
  isValidRouteFile(filename) {
    // Check file extension
    const hasValidExtension = this.options.fileExtensions.some(ext => 
      filename.endsWith(ext)
    );
    
    if (!hasValidExtension) {
      return false;
    }
    
    // Check exclude patterns
    const isExcluded = this.options.excludePatterns.some(pattern => 
      pattern.test(filename)
    );
    
    return !isExcluded;
  }

  /**
   * Get route name from filename
   * @param {string} filename - File name
   * @returns {string} Route name
   */
  getRouteNameFromFile(filename) {
    return path.basename(filename, path.extname(filename))
      .replace(/-routes$/, '')
      .replace(/-advanced$/, '');
  }

  /**
   * Get route path from filename
   * @param {string} routeName - Route name
   * @param {string} version - API version
   * @returns {string} Route path
   */
  getRoutePathFromFilename(routeName, version = null) {
    // Convert filename to route path
    let routePath = routeName.replace(/_/g, '-');
    
    // Special cases mapping
    const specialRoutes = {
      'auth': '/auth',
      'users': '/users',
      'companies': '/companies',
      'courses': '/courses',
      'employees': '/employees',
      'schedules': '/schedules',
      'settings': '/settings',
      'tenants': '/tenants',
      'roles': '/roles',
      'permissions': '/permissions',
      'gdpr': '/gdpr',
      'person': '/persons',
      'sopralluogo': '/sopralluoghi',
      'reparto': '/reparti',
      'company-sites': '/company-sites',
      'public-courses': '/public',
      'cms': '/cms'
    };
    
    const basePath = specialRoutes[routePath] || `/${routePath}`;
    
    return version ? `/api/${version}${basePath}` : basePath;
  }

  /**
   * Get loading statistics
   * @returns {object} Loading statistics
   */
  getStats() {
    return {
      totalRoutes: this.loadedRoutes.size,
      totalErrors: this.loadErrors.length,
      loadedRoutes: Array.from(this.loadedRoutes.keys()),
      errors: this.loadErrors,
      lastLoadTime: new Date().toISOString()
    };
  }

  /**
   * Reload a specific route
   * @param {string} routePath - Route path to reload
   * @returns {Promise<object|null>} Reloaded route info
   */
  async reloadRoute(routePath) {
    const existingRoute = this.loadedRoutes.get(routePath);
    if (!existingRoute) {
      logger.warn(`Route not found for reload: ${routePath}`, {
        component: 'route-loader'
      });
      return null;
    }
    
    try {
      // Clear module cache
      delete require.cache[existingRoute.filePath];
      
      // Reload the route
      const routeFile = {
        name: path.basename(existingRoute.filePath),
        path: existingRoute.filePath,
        routeName: existingRoute.name,
        version: existingRoute.version
      };
      
      const reloadedRoute = await this.loadRouteFile(routeFile);
      
      logger.info(`Route reloaded: ${routePath}`, {
        component: 'route-loader'
      });
      
      return reloadedRoute;
    } catch (error) {
      logger.error(`Failed to reload route ${routePath}:`, {
        error: error.message,
        component: 'route-loader'
      });
      return null;
    }
  }

  /**
   * Clear all loaded routes
   */
  clear() {
    this.loadedRoutes.clear();
    this.loadErrors = [];
    
    logger.debug('Route loader cleared', {
      component: 'route-loader'
    });
  }
}

export default RouteLoader;