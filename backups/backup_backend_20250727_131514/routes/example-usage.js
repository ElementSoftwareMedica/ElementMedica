/**
 * Example Usage of Advanced Route Management System
 * Demonstrates how to use all the integrated features
 */

import express from 'express';
import { RouteManager } from './index.js';
import { logger } from '../utils/logger.js';

// Create Express app
const app = express();

// Initialize Route Manager with all features enabled
const routeManager = new RouteManager(app, {
  routesDirectory: './routes',
  enableMetrics: true,
  enableCaching: true,
  enableQueryOptimization: true,
  enableVersioning: true,
  enableDocumentation: true,
  logLevel: 'info'
});

/**
 * Example: Register API versions
 */
function setupApiVersions() {
  // Register API v1 (current stable)
  routeManager.registerApiVersion('v1', {
    description: 'API Version 1.0 - Stable release',
    isDefault: true,
    changelog: [
      'Initial API release',
      'Basic CRUD operations for Person and Company',
      'Authentication and authorization'
    ]
  });
  
  // Register API v2 (beta)
  routeManager.registerApiVersion('v2', {
    description: 'API Version 2.0 - Beta release with enhanced features',
    changelog: [
      'Enhanced query capabilities',
      'Improved response formats',
      'New bulk operations'
    ],
    breakingChanges: [
      'Response format changed for list endpoints',
      'Authentication header format updated'
    ]
  });
  
  // Register deprecated version
  routeManager.registerApiVersion('v0.9', {
    description: 'Legacy API version',
    deprecated: true,
    deprecationDate: '2024-01-01',
    sunsetDate: '2024-06-01',
    migrationGuide: 'https://docs.example.com/migration/v0.9-to-v1'
  });
  
  logger.info('API versions configured', {
    versions: ['v1', 'v2', 'v0.9'],
    component: 'example-usage'
  });
}

/**
 * Example: Setup custom validation schemas
 */
function setupValidationSchemas() {
  // Register custom validation for person creation
  routeManager.registerValidation('POST:/api/v1/persons', {
    body: {
      firstName: { required: true, type: 'string', minLength: 2 },
      lastName: { required: true, type: 'string', minLength: 2 },
      email: { required: true, type: 'email' },
      phone: { type: 'string', pattern: /^\+?[1-9]\d{1,14}$/ },
      dateOfBirth: { type: 'date', before: new Date() }
    }
  });
  
  // Register validation for company creation
  routeManager.registerValidation('POST:/api/v1/companies', {
    body: {
      name: { required: true, type: 'string', minLength: 2 },
      vatNumber: { required: true, type: 'string', pattern: /^[A-Z]{2}\d{11}$/ },
      address: { type: 'string' },
      website: { type: 'url' }
    }
  });
  
  logger.info('Custom validation schemas registered', {
    schemas: ['POST:/api/v1/persons', 'POST:/api/v1/companies'],
    component: 'example-usage'
  });
}

/**
 * Example: Setup custom middleware stacks
 */
function setupCustomMiddleware() {
  // Create a custom middleware stack for admin operations
  const adminMiddleware = [
    // Rate limiting for admin operations
    (req, res, next) => {
      // Custom admin rate limiting logic
      next();
    },
    // Admin authentication check
    (req, res, next) => {
      if (!req.user || !req.user.roles.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required'
          }
        });
      }
      next();
    },
    // Admin activity logging
    (req, res, next) => {
      logger.info('Admin operation', {
        userId: req.user.id,
        action: `${req.method} ${req.path}`,
        ip: req.ip,
        component: 'admin-middleware'
      });
      next();
    }
  ];
  
  routeManager.registerMiddlewareStack('admin-enhanced', adminMiddleware);
  
  logger.info('Custom middleware stack registered', {
    stack: 'admin-enhanced',
    middlewareCount: adminMiddleware.length,
    component: 'example-usage'
  });
}

/**
 * Example: Add custom API documentation
 */
function setupCustomDocumentation() {
  // Document a custom analytics endpoint
  routeManager.addApiDocumentation('/api/v1/analytics/dashboard', 'get', {
    tags: ['Analytics'],
    summary: 'Get dashboard analytics',
    description: 'Retrieve comprehensive dashboard analytics data',
    parameters: [
      {
        name: 'period',
        in: 'query',
        description: 'Time period for analytics',
        schema: {
          type: 'string',
          enum: ['day', 'week', 'month', 'year'],
          default: 'month'
        }
      },
      {
        name: 'metrics',
        in: 'query',
        description: 'Comma-separated list of metrics to include',
        schema: {
          type: 'string',
          example: 'users,revenue,conversions'
        }
      }
    ],
    responses: {
      '200': {
        description: 'Analytics data retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'object',
                  properties: {
                    period: { type: 'string', example: 'month' },
                    metrics: {
                      type: 'object',
                      properties: {
                        users: { type: 'integer', example: 1250 },
                        revenue: { type: 'number', example: 45678.90 },
                        conversions: { type: 'integer', example: 89 }
                      }
                    },
                    trends: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          date: { type: 'string', format: 'date' },
                          value: { type: 'number' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  });
  
  logger.info('Custom API documentation added', {
    endpoint: '/api/v1/analytics/dashboard',
    component: 'example-usage'
  });
}

/**
 * Example: Setup sample routes with all features
 */
function setupSampleRoutes() {
  // Person management routes with versioning
  app.get('/api/v1/persons', async (req, res) => {
    try {
      // Use query optimizer for efficient database queries
      const query = req.queryOptimizer.buildQuery('person', {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        search: req.query.search,
        filters: {
          active: req.query.active !== 'false'
        },
        orderBy: { createdAt: 'desc' }
      });
      
      const persons = await req.queryOptimizer.executeQuery('person', 'findMany', query);
      
      res.json({
        success: true,
        data: persons,
        pagination: {
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 10,
          total: persons.length
        }
      });
    } catch (error) {
      logger.error('Error fetching persons', {
        error: error.message,
        component: 'sample-routes'
      });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch persons'
        }
      });
    }
  });
  
  // Company analytics endpoint (v2 only)
  app.get('/api/v2/companies/analytics', (req, res) => {
    // This endpoint is only available in v2
    if (req.apiVersion?.resolved !== 'v2') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not available in this API version'
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        totalCompanies: 150,
        activeCompanies: 142,
        newThisMonth: 8,
        topIndustries: [
          { name: 'Technology', count: 45 },
          { name: 'Healthcare', count: 32 },
          { name: 'Finance', count: 28 }
        ]
      }
    });
  });
  
  logger.info('Sample routes configured', {
    routes: ['/api/v1/persons', '/api/v2/companies/analytics'],
    component: 'example-usage'
  });
}

/**
 * Example: Monitor performance and generate reports
 */
function setupPerformanceMonitoring() {
  // Set up periodic performance reporting
  setInterval(() => {
    const metrics = routeManager.getMetrics();
    const queryReport = routeManager.getQueryOptimizationReport();
    const versioningReport = routeManager.getVersioningReport();
    
    logger.info('Performance Report', {
      timestamp: new Date().toISOString(),
      totalRequests: metrics.overview.totalRequests,
      averageResponseTime: metrics.overview.averageResponseTime,
      errorRate: metrics.overview.errorRate,
      slowQueries: queryReport.enabled ? queryReport.analytics.slowQueries?.length || 0 : 0,
      activeVersions: versioningReport.enabled ? versioningReport.statistics.totalVersions : 0,
      component: 'performance-monitor'
    });
    
    // Log performance recommendations
    const recommendations = routeManager.generatePerformanceRecommendations();
    if (recommendations.length > 0) {
      logger.warn('Performance recommendations available', {
        count: recommendations.length,
        highPriority: recommendations.filter(r => r.priority === 'high').length,
        component: 'performance-monitor'
      });
    }
  }, 60000); // Every minute
  
  logger.info('Performance monitoring configured', {
    interval: '60 seconds',
    component: 'example-usage'
  });
}

/**
 * Initialize the complete system
 */
export async function initializeAdvancedRouting() {
  try {
    // Initialize the route manager
    await routeManager.initialize();
    
    // Setup all features
    setupApiVersions();
    setupValidationSchemas();
    setupCustomMiddleware();
    setupCustomDocumentation();
    setupSampleRoutes();
    setupPerformanceMonitoring();
    
    logger.info('Advanced routing system initialized successfully', {
      features: {
        versioning: true,
        queryOptimization: true,
        documentation: true,
        performanceMonitoring: true,
        customValidation: true
      },
      endpoints: {
        documentation: '/docs',
        performance: '/api/performance',
        versions: '/api/versions',
        metrics: '/api/metrics'
      },
      component: 'example-usage'
    });
    
    return routeManager;
  } catch (error) {
    logger.error('Failed to initialize advanced routing system', {
      error: error.message,
      stack: error.stack,
      component: 'example-usage'
    });
    
    throw error;
  }
}

/**
 * Example usage in main application
 */
export function exampleUsage() {
  const PORT = process.env.PORT || 3000;
  
  initializeAdvancedRouting()
    .then((routeManager) => {
      app.listen(PORT, () => {
        logger.info('Server started with advanced routing', {
          port: PORT,
          documentation: `http://localhost:${PORT}/docs`,
          performance: `http://localhost:${PORT}/api/performance`,
          versions: `http://localhost:${PORT}/api/versions`,
          component: 'example-usage'
        });
        
        // Log system status
        const status = routeManager.getHealthStatus();
        logger.info('System health check', status);
      });
    })
    .catch((error) => {
      logger.error('Failed to start server', {
        error: error.message,
        component: 'example-usage'
      });
      
      process.exit(1);
    });
}

export default {
  initializeAdvancedRouting,
  exampleUsage
};