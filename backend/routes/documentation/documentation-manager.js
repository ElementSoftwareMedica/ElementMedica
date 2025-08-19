/**
 * Documentation Manager - Handles API documentation generation and serving
 * Manages OpenAPI schemas, route documentation, and documentation endpoints
 */

import { logger } from '../../utils/logger.js';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

export class DocumentationManager {
  constructor(options = {}) {
    this.options = {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'Auto-generated API documentation',
      basePath: '/api',
      docsPath: '/docs',
      enableSwagger: true,
      enableRedoc: false,
      ...options
    };
    
    this.schemas = new Map();
    this.routeDocumentation = new Map();
    this.customDocumentation = new Map();
    this.swaggerSpec = null;
    
    this.initializeDocumentation();
  }

  /**
   * Initialize documentation system
   */
  initializeDocumentation() {
    try {
      if (this.options.enableSwagger) {
        this.generateSwaggerSpec();
      }

      logger.info('Documentation manager initialized', {
        enableSwagger: this.options.enableSwagger,
        docsPath: this.options.docsPath,
        component: 'documentation-manager'
      });
    } catch (error) {
      logger.error('Failed to initialize documentation manager:', {
        error: error.message,
        component: 'documentation-manager'
      });
      throw error;
    }
  }

  /**
   * Generate Swagger specification
   */
  generateSwaggerSpec() {
    try {
      const swaggerOptions = {
        definition: {
          openapi: '3.0.0',
          info: {
            title: this.options.title,
            version: this.options.version,
            description: this.options.description
          },
          servers: [
            {
              url: this.options.basePath,
              description: 'API Server'
            }
          ],
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
              }
            }
          }
        },
        apis: ['./routes/**/*.js'] // Path to the API files
      };

      this.swaggerSpec = swaggerJsdoc(swaggerOptions);

      logger.info('Swagger specification generated', {
        paths: Object.keys(this.swaggerSpec.paths || {}).length,
        component: 'documentation-manager'
      });
    } catch (error) {
      logger.error('Failed to generate Swagger specification:', {
        error: error.message,
        component: 'documentation-manager'
      });
    }
  }

  /**
   * Setup documentation routes
   * @param {object} app - Express app
   */
  setupDocumentationRoutes(app) {
    try {
      if (this.options.enableSwagger && this.swaggerSpec) {
        // Swagger UI route
        app.use(
          this.options.docsPath,
          swaggerUi.serve,
          swaggerUi.setup(this.swaggerSpec, {
            explorer: true,
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: this.options.title
          })
        );

        // JSON spec route
        app.get(`${this.options.docsPath}/json`, (req, res) => {
          res.json(this.swaggerSpec);
        });

        // YAML spec route
        app.get(`${this.options.docsPath}/yaml`, (req, res) => {
          res.type('text/yaml');
          res.send(this.convertToYaml(this.swaggerSpec));
        });
      }

      // Custom documentation routes
      app.get('/api/documentation', (req, res) => {
        res.json(this.getDocumentationIndex());
      });

      app.get('/api/documentation/:section', (req, res) => {
        const section = req.params.section;
        const documentation = this.getDocumentationSection(section);
        
        if (documentation) {
          res.json(documentation);
        } else {
          res.status(404).json({
            error: 'Documentation section not found',
            section
          });
        }
      });

      // API versions documentation
      app.get('/api/versions', (req, res) => {
        res.json(this.getVersionsDocumentation());
      });

      logger.info('Documentation routes setup complete', {
        swaggerEnabled: this.options.enableSwagger,
        docsPath: this.options.docsPath,
        component: 'documentation-manager'
      });
    } catch (error) {
      logger.error('Failed to setup documentation routes:', {
        error: error.message,
        component: 'documentation-manager'
      });
      throw error;
    }
  }

  /**
   * Register route documentation
   * @param {string} routePath - Route path
   * @param {object} documentation - Route documentation
   */
  registerRouteDocumentation(routePath, documentation) {
    try {
      this.routeDocumentation.set(routePath, {
        ...documentation,
        registeredAt: new Date().toISOString()
      });

      logger.debug(`Route documentation registered: ${routePath}`, {
        component: 'documentation-manager'
      });
    } catch (error) {
      logger.error(`Failed to register route documentation for ${routePath}:`, {
        error: error.message,
        component: 'documentation-manager'
      });
    }
  }

  /**
   * Add custom documentation
   * @param {string} section - Documentation section
   * @param {object} content - Documentation content
   */
  addCustomDocumentation(section, content) {
    try {
      this.customDocumentation.set(section, {
        content,
        addedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });

      logger.info(`Custom documentation added: ${section}`, {
        component: 'documentation-manager'
      });
    } catch (error) {
      logger.error(`Failed to add custom documentation for ${section}:`, {
        error: error.message,
        component: 'documentation-manager'
      });
    }
  }

  /**
   * Register OpenAPI schema
   * @param {string} name - Schema name
   * @param {object} schema - OpenAPI schema
   */
  registerSchema(name, schema) {
    try {
      this.schemas.set(name, schema);

      // Add to Swagger spec if available
      if (this.swaggerSpec && this.swaggerSpec.components) {
        if (!this.swaggerSpec.components.schemas) {
          this.swaggerSpec.components.schemas = {};
        }
        this.swaggerSpec.components.schemas[name] = schema;
      }

      logger.debug(`Schema registered: ${name}`, {
        component: 'documentation-manager'
      });
    } catch (error) {
      logger.error(`Failed to register schema ${name}:`, {
        error: error.message,
        component: 'documentation-manager'
      });
    }
  }

  /**
   * Get documentation index
   * @returns {object} Documentation index
   */
  getDocumentationIndex() {
    return {
      title: this.options.title,
      version: this.options.version,
      description: this.options.description,
      endpoints: {
        swagger: this.options.enableSwagger ? this.options.docsPath : null,
        json: this.options.enableSwagger ? `${this.options.docsPath}/json` : null,
        yaml: this.options.enableSwagger ? `${this.options.docsPath}/yaml` : null
      },
      sections: Array.from(this.customDocumentation.keys()),
      routes: Array.from(this.routeDocumentation.keys()),
      schemas: Array.from(this.schemas.keys()),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Get documentation section
   * @param {string} section - Section name
   * @returns {object|null} Documentation section
   */
  getDocumentationSection(section) {
    const customDoc = this.customDocumentation.get(section);
    if (customDoc) {
      return customDoc;
    }

    // Check if it's a route documentation
    const routeDoc = this.routeDocumentation.get(section);
    if (routeDoc) {
      return routeDoc;
    }

    return null;
  }

  /**
   * Get versions documentation
   * @returns {object} Versions documentation
   */
  getVersionsDocumentation() {
    return {
      current: this.options.version,
      supported: ['v1', 'v2'], // This would come from version manager
      deprecated: [],
      changelog: this.getChangelog(),
      migration: this.getMigrationGuide()
    };
  }

  /**
   * Get API changelog
   * @returns {Array} Changelog entries
   */
  getChangelog() {
    // This would typically come from a file or database
    return [
      {
        version: '2.0.0',
        date: '2024-01-15',
        changes: [
          'Added new authentication endpoints',
          'Improved error handling',
          'Performance optimizations'
        ]
      },
      {
        version: '1.0.0',
        date: '2023-12-01',
        changes: [
          'Initial API release',
          'Basic CRUD operations',
          'User management'
        ]
      }
    ];
  }

  /**
   * Get migration guide
   * @returns {object} Migration guide
   */
  getMigrationGuide() {
    return {
      'v1-to-v2': {
        title: 'Migrating from v1 to v2',
        breaking_changes: [
          'Authentication now requires JWT tokens',
          'Response format has changed for error messages'
        ],
        steps: [
          'Update authentication implementation',
          'Update error handling',
          'Test all endpoints'
        ]
      }
    };
  }

  /**
   * Generate route documentation from Express router
   * @param {object} router - Express router
   * @param {string} basePath - Base path for routes
   * @returns {object} Generated documentation
   */
  generateRouteDocumentation(router, basePath = '') {
    const documentation = {
      basePath,
      routes: [],
      generatedAt: new Date().toISOString()
    };

    try {
      // Extract routes from router stack
      if (router.stack) {
        router.stack.forEach(layer => {
          if (layer.route) {
            const route = layer.route;
            const methods = Object.keys(route.methods);
            
            documentation.routes.push({
              path: basePath + route.path,
              methods: methods,
              middleware: layer.handle.name || 'anonymous',
              parameters: this.extractRouteParameters(route.path)
            });
          }
        });
      }

      return documentation;
    } catch (error) {
      logger.error('Failed to generate route documentation:', {
        error: error.message,
        basePath,
        component: 'documentation-manager'
      });
      return documentation;
    }
  }

  /**
   * Extract route parameters from path
   * @param {string} path - Route path
   * @returns {Array} Route parameters
   */
  extractRouteParameters(path) {
    const paramRegex = /:([^/]+)/g;
    const parameters = [];
    let match;

    while ((match = paramRegex.exec(path)) !== null) {
      parameters.push({
        name: match[1],
        type: 'string',
        required: true,
        in: 'path'
      });
    }

    return parameters;
  }

  /**
   * Convert object to YAML string
   * @param {object} obj - Object to convert
   * @returns {string} YAML string
   */
  convertToYaml(obj) {
    // Simple YAML conversion - in production, use a proper YAML library
    return JSON.stringify(obj, null, 2)
      .replace(/"/g, '')
      .replace(/,$/gm, '')
      .replace(/^\s*[\{\}]/gm, '');
  }

  /**
   * Update Swagger specification
   * @param {object} updates - Specification updates
   */
  updateSwaggerSpec(updates) {
    try {
      if (this.swaggerSpec) {
        this.swaggerSpec = {
          ...this.swaggerSpec,
          ...updates
        };

        logger.info('Swagger specification updated', {
          component: 'documentation-manager'
        });
      }
    } catch (error) {
      logger.error('Failed to update Swagger specification:', {
        error: error.message,
        component: 'documentation-manager'
      });
    }
  }

  /**
   * Get documentation statistics
   * @returns {object} Documentation statistics
   */
  getStats() {
    return {
      routes: this.routeDocumentation.size,
      customSections: this.customDocumentation.size,
      schemas: this.schemas.size,
      swaggerEnabled: this.options.enableSwagger,
      lastGenerated: this.swaggerSpec ? new Date().toISOString() : null
    };
  }

  /**
   * Clear all documentation
   */
  clear() {
    this.schemas.clear();
    this.routeDocumentation.clear();
    this.customDocumentation.clear();
    this.swaggerSpec = null;
    
    logger.info('Documentation manager cleared', {
      component: 'documentation-manager'
    });
  }
}

export default DocumentationManager;