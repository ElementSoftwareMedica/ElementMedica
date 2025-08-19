/**
 * Middleware Loader Module
 * Automatically loads and registers middleware modules
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createMiddlewareManager } from './index.js';
import { getMiddlewareConfig } from '../config/middleware.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Middleware Loader Class
 * Handles automatic discovery and loading of middleware modules
 */
export class MiddlewareLoader {
  constructor(app, options = {}) {
    this.app = app;
    this.middlewareManager = createMiddlewareManager(app);
    this.middlewareDir = options.middlewareDir || __dirname;
    this.environment = process.env.NODE_ENV || 'development';
    this.autoLoad = options.autoLoad !== false;
    this.loadedModules = new Map();
  }

  /**
   * Initialize middleware loader
   * @param {string} preset - Middleware preset to use
   * @returns {Promise<MiddlewareLoader>} Loader instance
   */
  async initialize(preset = null) {
    try {
      // Get middleware configuration for current environment
      const { configs, preset: envPreset, routeMiddlewares } = getMiddlewareConfig(this.environment);
      const targetPreset = preset || envPreset;

      logger.info('Initializing middleware loader', {
        environment: this.environment,
        preset: preset || 'environment-default',
        autoLoad: this.autoLoad
      });

      // Auto-discover and load middleware modules if enabled
      if (this.autoLoad) {
        await this.discoverMiddlewares();
      }

      // Register discovered middlewares with configurations
      await this.registerMiddlewares(configs);

      // Apply middleware preset
      if (targetPreset && targetPreset.middlewares) {
        this.middlewareManager.apply(targetPreset.middlewares, targetPreset.globalOptions);
      }

      // Apply route-specific middlewares
      this.applyRouteMiddlewares(routeMiddlewares);

      logger.info('Middleware loader initialized successfully', {
        discovered: this.loadedModules.size,
        registered: this.middlewareManager.getRegisteredCount(),
        applied: this.middlewareManager.getAppliedCount()
      });

      return this;
    } catch (error) {
      logger.error('Failed to initialize middleware loader:', error);
      throw error;
    }
  }

  /**
   * Discover middleware modules in the middleware directory
   * @returns {Promise<void>}
   */
  async discoverMiddlewares() {
    try {
      const files = await fs.readdir(this.middlewareDir);
      const middlewareFiles = files.filter(file => 
        file.endsWith('.js') && 
        file !== 'index.js' && 
        file !== 'loader.js' &&
        !file.startsWith('.')
      );

      logger.info(`Discovering middlewares in ${this.middlewareDir}`, {
        files: middlewareFiles.length
      });

      // Load each middleware module
      for (const file of middlewareFiles) {
        await this.loadMiddlewareModule(file);
      }

      logger.info('Middleware discovery completed', {
        loaded: this.loadedModules.size
      });
    } catch (error) {
      logger.error('Failed to discover middlewares:', error);
      throw error;
    }
  }

  /**
   * Load a specific middleware module
   * @param {string} filename - Middleware file name
   * @returns {Promise<void>}
   */
  async loadMiddlewareModule(filename) {
    try {
      const modulePath = path.join(this.middlewareDir, filename);
      const moduleName = path.basename(filename, '.js');

      // Dynamic import of the middleware module
      const module = await import(modulePath);
      
      // Extract middleware function and metadata
      const middlewareData = this.extractMiddlewareData(module, moduleName);
      
      if (middlewareData) {
        this.loadedModules.set(moduleName, {
          ...middlewareData,
          filename,
          modulePath,
          loadedAt: new Date().toISOString()
        });

        logger.debug(`Loaded middleware module: ${moduleName}`, {
          hasDefault: !!module.default,
          hasNamed: Object.keys(module).length > (module.default ? 1 : 0),
          exports: Object.keys(module)
        });
      }
    } catch (error) {
      logger.error(`Failed to load middleware module ${filename}:`, error);
      // Don't throw here to allow other middlewares to load
    }
  }

  /**
   * Extract middleware function and metadata from module
   * @param {object} module - Imported module
   * @param {string} moduleName - Module name
   * @returns {object|null} Middleware data
   */
  extractMiddlewareData(module, moduleName) {
    let middleware = null;
    let metadata = {};

    // Try to find middleware function in different export patterns
    if (typeof module.default === 'function') {
      middleware = module.default;
    } else if (typeof module[moduleName] === 'function') {
      middleware = module[moduleName];
    } else if (typeof module.middleware === 'function') {
      middleware = module.middleware;
    } else {
      // Look for any function export
      const functionExports = Object.keys(module).filter(key => 
        typeof module[key] === 'function' && key !== 'default'
      );
      
      if (functionExports.length === 1) {
        middleware = module[functionExports[0]];
      }
    }

    // Extract metadata if available
    if (module.config) {
      metadata = { ...module.config };
    }
    if (module.metadata) {
      metadata = { ...metadata, ...module.metadata };
    }

    if (!middleware) {
      logger.warn(`No middleware function found in module: ${moduleName}`);
      return null;
    }

    return {
      middleware,
      metadata
    };
  }

  /**
   * Register loaded middlewares with the middleware manager
   * @param {object} configs - Middleware configurations
   * @returns {Promise<void>}
   */
  async registerMiddlewares(configs) {
    for (const [name, moduleData] of this.loadedModules) {
      try {
        // Merge module metadata with configuration
        const config = {
          ...moduleData.metadata,
          ...configs[name]
        };

        // Register with middleware manager
        this.middlewareManager.register(name, moduleData.middleware, config);

        logger.debug(`Registered middleware: ${name}`, {
          priority: config.priority,
          environments: config.environment,
          enabled: config.enabled
        });
      } catch (error) {
        logger.error(`Failed to register middleware ${name}:`, error);
      }
    }
  }

  /**
   * Apply route-specific middlewares
   * @param {object} routeMiddlewares - Route middleware configurations
   */
  applyRouteMiddlewares(routeMiddlewares) {
    Object.entries(routeMiddlewares).forEach(([route, config]) => {
      try {
        this.middlewareManager.applyToRoute(
          route, 
          config.middlewares, 
          config.options
        );
        
        logger.debug(`Applied route middlewares for ${route}`, {
          middlewares: config.middlewares
        });
      } catch (error) {
        logger.error(`Failed to apply route middlewares for ${route}:`, error);
      }
    });
  }

  /**
   * Reload a specific middleware
   * @param {string} name - Middleware name
   * @returns {Promise<boolean>} Success status
   */
  async reloadMiddleware(name) {
    try {
      const moduleData = this.loadedModules.get(name);
      if (!moduleData) {
        logger.warn(`Middleware ${name} not found for reload`);
        return false;
      }

      // Unregister current middleware
      this.middlewareManager.unregister(name);

      // Reload module
      await this.loadMiddlewareModule(moduleData.filename);
      
      // Re-register with current configuration
      const { configs } = getMiddlewareConfig(this.environment);
      const newModuleData = this.loadedModules.get(name);
      
      if (newModuleData) {
        const config = {
          ...newModuleData.metadata,
          ...configs[name]
        };
        
        this.middlewareManager.register(name, newModuleData.middleware, config);
        
        logger.info(`Middleware ${name} reloaded successfully`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Failed to reload middleware ${name}:`, error);
      return false;
    }
  }

  /**
   * Get loader status
   * @returns {object} Loader status
   */
  getStatus() {
    return {
      environment: this.environment,
      middlewareDir: this.middlewareDir,
      autoLoad: this.autoLoad,
      discovered: this.loadedModules.size,
      manager: this.middlewareManager.getStatus(),
      modules: Array.from(this.loadedModules.entries()).map(([name, data]) => ({
        name,
        filename: data.filename,
        loadedAt: data.loadedAt,
        hasMetadata: !!data.metadata
      }))
    };
  }

  /**
   * Get middleware manager instance
   * @returns {MiddlewareManager} Middleware manager
   */
  getManager() {
    return this.middlewareManager;
  }
}

/**
 * Create and initialize middleware loader
 * @param {object} app - Express app instance
 * @param {object} options - Loader options
 * @param {string} preset - Middleware preset
 * @returns {Promise<MiddlewareLoader>} Initialized loader
 */
export const createMiddlewareLoader = async (app, options = {}, preset = null) => {
  const loader = new MiddlewareLoader(app, options);
  await loader.initialize(preset);
  return loader;
};

/**
 * Quick setup function for common use cases
 * @param {object} app - Express app instance
 * @param {string} environment - Target environment
 * @returns {Promise<MiddlewareManager>} Middleware manager
 */
export const setupMiddlewares = async (app, environment = null) => {
  const env = environment || process.env.NODE_ENV || 'development';
  const loader = await createMiddlewareLoader(app, { autoLoad: true }, env);
  return loader.getManager();
};

export default {
  MiddlewareLoader,
  createMiddlewareLoader,
  setupMiddlewares
};