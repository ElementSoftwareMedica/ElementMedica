/**
 * API Documentation Service
 * Generates automatic API documentation using Swagger/OpenAPI
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { logger } from '../utils/logger.js';

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Project 2.0 API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for Project 2.0 backend services',
      contact: {
        name: 'Development Team',
        email: 'dev@project2.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Development server - Main API v1'
      },
      {
        url: 'http://localhost:4001/api/v1',
        description: 'Development server - API Server v1'
      },
      {
        url: 'http://localhost:4002/api/v1',
        description: 'Development server - Documents Server v1'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        },
        refreshToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Refresh-Token',
          description: 'Refresh token for JWT renewal'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type'
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            firstName: {
              type: 'string',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              description: 'User last name'
            },
            role: {
              type: 'string',
              enum: ['admin', 'user', 'manager'],
              description: 'User role'
            },
            companyId: {
              type: 'integer',
              description: 'Associated company ID'
            },
            isActive: {
              type: 'boolean',
              description: 'User active status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Authentication success status'
            },
            user: {
              $ref: '#/components/schemas/User'
            },
            tokens: {
              type: 'object',
              properties: {
                access_token: {
                  type: 'string',
                  description: 'JWT access token'
                },
                refresh_token: {
                  type: 'string',
                  description: 'JWT refresh token'
                },
                expires_in: {
                  type: 'integer',
                  description: 'Token expiration time in seconds'
                }
              }
            }
          }
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
              description: 'Overall system health status'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Health check timestamp'
            },
            services: {
              type: 'object',
              description: 'Individual service health status'
            },
            dependencies: {
              type: 'object',
              description: 'External dependency health status'
            },
            system: {
              type: 'object',
              description: 'System resource information'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './routes/**/*.js',
    './middleware/**/*.js',
    './services/**/*.js'
  ]
};

// Generate Swagger specification
let swaggerSpec = null;

/**
 * Initialize Swagger documentation
 */
function initializeSwagger() {
  try {
    swaggerSpec = swaggerJsdoc(swaggerOptions);
    logger.info('Swagger documentation initialized successfully');
    return swaggerSpec;
  } catch (error) {
    logger.error('Failed to initialize Swagger documentation', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Get Swagger specification
 */
function getSwaggerSpec() {
  if (!swaggerSpec) {
    initializeSwagger();
  }
  return swaggerSpec;
}

/**
 * Generate API documentation for specific version
 */
function generateVersionedDocs(version = 'v1') {
  const versionedOptions = {
    ...swaggerOptions,
    definition: {
      ...swaggerOptions.definition,
      info: {
        ...swaggerOptions.definition.info,
        version: version,
        title: `Project 2.0 API ${version.toUpperCase()}`
      },
      servers: swaggerOptions.definition.servers.map(server => ({
        ...server,
        url: server.url.replace('/v1', `/${version}`)
      }))
    },
    apis: [
      `./routes/${version}/**/*.js`,
      './middleware/**/*.js',
      './services/**/*.js'
    ]
  };
  
  try {
    return swaggerJsdoc(versionedOptions);
  } catch (error) {
    logger.error(`Failed to generate documentation for version ${version}`, {
      error: error.message
    });
    return null;
  }
}

/**
 * Export API documentation to file
 */
function exportDocumentation(outputPath, format = 'yaml') {
  try {
    const spec = getSwaggerSpec();
    const docsDir = path.dirname(outputPath);
    
    // Ensure directory exists
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    let content;
     if (format === 'yaml') {
       content = yaml.dump(spec);
    } else {
      content = JSON.stringify(spec, null, 2);
    }
    
    fs.writeFileSync(outputPath, content);
    logger.info('API documentation exported', {
      path: outputPath,
      format
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to export API documentation', {
      error: error.message,
      path: outputPath,
      format
    });
    return false;
  }
}

/**
 * Generate Postman collection
 */
function generatePostmanCollection() {
  try {
    const spec = getSwaggerSpec();
    
    const collection = {
      info: {
        name: spec.info.title,
        description: spec.info.description,
        version: spec.info.version,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: '{{access_token}}',
            type: 'string'
          }
        ]
      },
      variable: [
        {
          key: 'base_url',
          value: 'http://localhost:3001/api/v1',
          type: 'string'
        },
        {
          key: 'access_token',
          value: '',
          type: 'string'
        },
        {
          key: 'refresh_token',
          value: '',
          type: 'string'
        }
      ],
      item: []
    };
    
    // Convert OpenAPI paths to Postman requests
    Object.entries(spec.paths || {}).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, operation]) => {
        if (method === 'parameters') return;
        
        const request = {
          name: operation.summary || `${method.toUpperCase()} ${path}`,
          request: {
            method: method.toUpperCase(),
            header: [],
            url: {
              raw: `{{base_url}}${path}`,
              host: ['{{base_url}}'],
              path: path.split('/').filter(p => p)
            }
          }
        };
        
        // Add request body if present
        if (operation.requestBody) {
          request.request.body = {
            mode: 'raw',
            raw: JSON.stringify({}, null, 2),
            options: {
              raw: {
                language: 'json'
              }
            }
          };
          
          request.request.header.push({
            key: 'Content-Type',
            value: 'application/json'
          });
        }
        
        collection.item.push(request);
      });
    });
    
    return collection;
  } catch (error) {
    logger.error('Failed to generate Postman collection', {
      error: error.message
    });
    return null;
  }
}

/**
 * Swagger UI middleware configuration
 */
function getSwaggerUiMiddleware() {
  const spec = getSwaggerSpec();
  
  const options = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Project 2.0 API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  };
  
  return swaggerUi.setup(spec, options);
}

/**
 * API documentation stats
 */
function getDocumentationStats() {
  try {
    const spec = getSwaggerSpec();
    
    const stats = {
      title: spec.info.title,
      version: spec.info.version,
      servers: spec.servers?.length || 0,
      paths: Object.keys(spec.paths || {}).length,
      operations: 0,
      schemas: Object.keys(spec.components?.schemas || {}).length,
      security_schemes: Object.keys(spec.components?.securitySchemes || {}).length
    };
    
    // Count operations
    Object.values(spec.paths || {}).forEach(path => {
      Object.keys(path).forEach(method => {
        if (!['parameters', 'summary', 'description'].includes(method)) {
          stats.operations++;
        }
      });
    });
    
    return stats;
  } catch (error) {
    logger.error('Failed to get documentation stats', {
      error: error.message
    });
    return null;
  }
}

export {
  initializeSwagger,
  getSwaggerSpec,
  generateVersionedDocs,
  exportDocumentation,
  generatePostmanCollection,
  getSwaggerUiMiddleware,
  getDocumentationStats,
  swaggerUi
};