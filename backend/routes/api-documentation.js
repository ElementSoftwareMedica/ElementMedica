/**
 * API Documentation Generator
 * Automatic OpenAPI/Swagger documentation generation
 */

import { logger } from '../utils/logger.js';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs/promises';
import path from 'path';

/**
 * OpenAPI Schema Generator
 */
export class OpenApiSchemaGenerator {
  constructor() {
    this.schemas = new Map();
    this.paths = new Map();
    this.components = {
      schemas: {},
      securitySchemes: {},
      parameters: {},
      responses: {},
      examples: {}
    };
    this.tags = new Set();
  }
  
  /**
   * Generate schema from Prisma model
   * @param {string} modelName - Prisma model name
   * @param {object} modelDefinition - Prisma model definition
   * @returns {object} OpenAPI schema
   */
  generateSchemaFromPrismaModel(modelName, modelDefinition) {
    const schema = {
      type: 'object',
      properties: {},
      required: []
    };
    
    // Add standard fields
    schema.properties.id = {
      type: 'string',
      format: 'uuid',
      description: 'Unique identifier',
      example: '123e4567-e89b-12d3-a456-426614174000'
    };
    
    schema.properties.createdAt = {
      type: 'string',
      format: 'date-time',
      description: 'Creation timestamp',
      example: '2024-01-01T00:00:00.000Z'
    };
    
    schema.properties.updatedAt = {
      type: 'string',
      format: 'date-time',
      description: 'Last update timestamp',
      example: '2024-01-01T00:00:00.000Z'
    };
    
    schema.properties.deletedAt = {
      type: 'string',
      format: 'date-time',
      nullable: true,
      description: 'Soft delete timestamp',
      example: null
    };
    
    // Add model-specific fields based on common patterns
    if (modelName === 'Person') {
      Object.assign(schema.properties, {
        firstName: {
          type: 'string',
          description: 'First name',
          example: 'Mario'
        },
        lastName: {
          type: 'string',
          description: 'Last name',
          example: 'Rossi'
        },
        email: {
          type: 'string',
          format: 'email',
          description: 'Email address',
          example: 'mario.rossi@example.com'
        },
        phone: {
          type: 'string',
          description: 'Phone number',
          example: '+39 123 456 7890'
        },
        dateOfBirth: {
          type: 'string',
          format: 'date',
          description: 'Date of birth',
          example: '1990-01-01'
        },
        fiscalCode: {
          type: 'string',
          description: 'Italian fiscal code',
          example: 'RSSMRA90A01H501X'
        }
      });
      
      schema.required = ['firstName', 'lastName', 'email'];
    }
    
    if (modelName === 'Company') {
      Object.assign(schema.properties, {
        name: {
          type: 'string',
          description: 'Company name',
          example: 'Acme Corporation'
        },
        vatNumber: {
          type: 'string',
          description: 'VAT number',
          example: 'IT12345678901'
        },
        address: {
          type: 'string',
          description: 'Company address',
          example: 'Via Roma 1, 20121 Milano, Italy'
        },
        website: {
          type: 'string',
          format: 'uri',
          description: 'Company website',
          example: 'https://www.acme.com'
        }
      });
      
      schema.required = ['name', 'vatNumber'];
    }
    
    this.schemas.set(modelName, schema);
    this.components.schemas[modelName] = schema;
    
    return schema;
  }
  
  /**
   * Generate CRUD paths for a model
   * @param {string} modelName - Model name
   * @param {string} basePath - Base API path
   * @param {object} options - Generation options
   */
  generateCrudPaths(modelName, basePath, options = {}) {
    const {
      includeList = true,
      includeGet = true,
      includeCreate = true,
      includeUpdate = true,
      includeDelete = true,
      includeSoftDelete = true,
      customOperations = []
    } = options;
    
    const modelLower = modelName.toLowerCase();
    const modelPlural = `${modelLower}s`;
    const tag = modelName;
    
    this.tags.add(tag);
    
    // List endpoint
    if (includeList) {
      this.paths.set(`${basePath}/${modelPlural}`, {
        get: {
          tags: [tag],
          summary: `List ${modelPlural}`,
          description: `Retrieve a paginated list of ${modelPlural}`,
          parameters: [
            {
              name: 'page',
              in: 'query',
              description: 'Page number',
              schema: { type: 'integer', minimum: 1, default: 1 }
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Items per page',
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
            },
            {
              name: 'search',
              in: 'query',
              description: 'Search term',
              schema: { type: 'string' }
            },
            {
              name: 'sortBy',
              in: 'query',
              description: 'Sort field',
              schema: { type: 'string', default: 'createdAt' }
            },
            {
              name: 'sortOrder',
              in: 'query',
              description: 'Sort order',
              schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: { $ref: `#/components/schemas/${modelName}` }
                      },
                      pagination: {
                        type: 'object',
                        properties: {
                          page: { type: 'integer', example: 1 },
                          limit: { type: 'integer', example: 10 },
                          total: { type: 'integer', example: 100 },
                          totalPages: { type: 'integer', example: 10 }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '500': { $ref: '#/components/responses/InternalServerError' }
          },
          security: [{ bearerAuth: [] }]
        }
      });
    }
    
    // Get by ID endpoint
    if (includeGet) {
      this.paths.set(`${basePath}/${modelPlural}/{id}`, {
        get: {
          tags: [tag],
          summary: `Get ${modelLower} by ID`,
          description: `Retrieve a specific ${modelLower} by its ID`,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: `${modelName} ID`,
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: `#/components/schemas/${modelName}` }
                    }
                  }
                }
              }
            },
            '404': { $ref: '#/components/responses/NotFound' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '500': { $ref: '#/components/responses/InternalServerError' }
          },
          security: [{ bearerAuth: [] }]
        }
      });
    }
    
    // Create endpoint
    if (includeCreate) {
      const createSchema = { ...this.schemas.get(modelName) };
      // Remove read-only fields
      delete createSchema.properties.id;
      delete createSchema.properties.createdAt;
      delete createSchema.properties.updatedAt;
      delete createSchema.properties.deletedAt;
      
      this.paths.set(`${basePath}/${modelPlural}`, {
        ...this.paths.get(`${basePath}/${modelPlural}`),
        post: {
          tags: [tag],
          summary: `Create ${modelLower}`,
          description: `Create a new ${modelLower}`,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: createSchema
              }
            }
          },
          responses: {
            '201': {
              description: 'Created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: `#/components/schemas/${modelName}` }
                    }
                  }
                }
              }
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '422': { $ref: '#/components/responses/ValidationError' },
            '500': { $ref: '#/components/responses/InternalServerError' }
          },
          security: [{ bearerAuth: [] }]
        }
      });
    }
    
    // Update endpoint
    if (includeUpdate) {
      const updateSchema = { ...this.schemas.get(modelName) };
      // Remove read-only fields and make all optional
      delete updateSchema.properties.id;
      delete updateSchema.properties.createdAt;
      delete updateSchema.properties.updatedAt;
      delete updateSchema.properties.deletedAt;
      updateSchema.required = [];
      
      const pathKey = `${basePath}/${modelPlural}/{id}`;
      const existingPath = this.paths.get(pathKey) || {};
      
      this.paths.set(pathKey, {
        ...existingPath,
        put: {
          tags: [tag],
          summary: `Update ${modelLower}`,
          description: `Update an existing ${modelLower}`,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: `${modelName} ID`,
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: updateSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'Updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: `#/components/schemas/${modelName}` }
                    }
                  }
                }
              }
            },
            '404': { $ref: '#/components/responses/NotFound' },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '422': { $ref: '#/components/responses/ValidationError' },
            '500': { $ref: '#/components/responses/InternalServerError' }
          },
          security: [{ bearerAuth: [] }]
        }
      });
    }
    
    // Delete endpoint
    if (includeDelete) {
      const pathKey = `${basePath}/${modelPlural}/{id}`;
      const existingPath = this.paths.get(pathKey) || {};
      
      this.paths.set(pathKey, {
        ...existingPath,
        delete: {
          tags: [tag],
          summary: `Delete ${modelLower}`,
          description: `${includeSoftDelete ? 'Soft delete' : 'Permanently delete'} a ${modelLower}`,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: `${modelName} ID`,
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          responses: {
            '204': {
              description: 'Deleted successfully'
            },
            '404': { $ref: '#/components/responses/NotFound' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '500': { $ref: '#/components/responses/InternalServerError' }
          },
          security: [{ bearerAuth: [] }]
        }
      });
    }
    
    logger.debug('CRUD paths generated', {
      modelName,
      basePath,
      pathsCount: this.paths.size,
      component: 'api-documentation'
    });
  }
  
  /**
   * Add custom endpoint documentation
   * @param {string} path - API path
   * @param {string} method - HTTP method
   * @param {object} spec - OpenAPI specification
   */
  addCustomEndpoint(path, method, spec) {
    const pathKey = path;
    const existingPath = this.paths.get(pathKey) || {};
    
    this.paths.set(pathKey, {
      ...existingPath,
      [method.toLowerCase()]: spec
    });
    
    // Add tags if specified
    if (spec.tags) {
      spec.tags.forEach(tag => this.tags.add(tag));
    }
  }
  
  /**
   * Generate complete OpenAPI specification
   * @param {object} info - API info
   * @returns {object} Complete OpenAPI spec
   */
  generateOpenApiSpec(info = {}) {
    const {
      title = 'API Documentation',
      version = '1.0.0',
      description = 'Automatically generated API documentation',
      contact = {},
      license = {},
      servers = [{ url: '/api', description: 'Development server' }]
    } = info;
    
    // Setup standard components
    this.setupStandardComponents();
    
    const spec = {
      openapi: '3.0.3',
      info: {
        title,
        version,
        description,
        contact,
        license
      },
      servers,
      tags: Array.from(this.tags).map(tag => ({
        name: tag,
        description: `${tag} related operations`
      })),
      paths: Object.fromEntries(this.paths),
      components: this.components
    };
    
    logger.info('OpenAPI specification generated', {
      title,
      version,
      pathsCount: this.paths.size,
      schemasCount: Object.keys(this.components.schemas).length,
      tagsCount: this.tags.size,
      component: 'api-documentation'
    });
    
    return spec;
  }
  
  /**
   * Setup standard OpenAPI components
   */
  setupStandardComponents() {
    // Security schemes
    this.components.securitySchemes = {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key'
      }
    };
    
    // Standard responses
    this.components.responses = {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'BAD_REQUEST' },
                    message: { type: 'string', example: 'Invalid request parameters' },
                    details: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      },
      Unauthorized: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'UNAUTHORIZED' },
                    message: { type: 'string', example: 'Authentication required' }
                  }
                }
              }
            }
          }
        }
      },
      Forbidden: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'FORBIDDEN' },
                    message: { type: 'string', example: 'Insufficient permissions' }
                  }
                }
              }
            }
          }
        }
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'NOT_FOUND' },
                    message: { type: 'string', example: 'Resource not found' }
                  }
                }
              }
            }
          }
        }
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'VALIDATION_ERROR' },
                    message: { type: 'string', example: 'Validation failed' },
                    details: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          field: { type: 'string', example: 'email' },
                          message: { type: 'string', example: 'Invalid email format' }
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
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'INTERNAL_SERVER_ERROR' },
                    message: { type: 'string', example: 'An unexpected error occurred' }
                  }
                }
              }
            }
          }
        }
      }
    };
    
    // Common parameters
    this.components.parameters = {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number',
        schema: { type: 'integer', minimum: 1, default: 1 }
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Items per page',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
      },
      SearchParam: {
        name: 'search',
        in: 'query',
        description: 'Search term',
        schema: { type: 'string' }
      }
    };
  }
}

/**
 * Documentation Middleware Factory
 */
export class DocumentationMiddleware {
  constructor(schemaGenerator) {
    this.schemaGenerator = schemaGenerator;
    this.swaggerSpec = null;
  }
  
  /**
   * Generate Swagger UI middleware
   * @param {object} options - Swagger UI options
   * @returns {Array} Array of middleware functions
   */
  generateSwaggerMiddleware(options = {}) {
    const {
      routePrefix = '/docs',
      title = 'API Documentation',
      version = '1.0.0',
      description = 'Automatically generated API documentation',
      customCss = '',
      customSiteTitle = 'API Docs'
    } = options;
    
    // Generate OpenAPI spec
    this.swaggerSpec = this.schemaGenerator.generateOpenApiSpec({
      title,
      version,
      description
    });
    
    const swaggerUiOptions = {
      customCss,
      customSiteTitle,
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true
      }
    };
    
    return [
      // Serve OpenAPI spec as JSON
      (req, res, next) => {
        if (req.path === `${routePrefix}/openapi.json`) {
          res.json(this.swaggerSpec);
          return;
        }
        next();
      },
      
      // Serve Swagger UI
      swaggerUi.serve,
      swaggerUi.setup(this.swaggerSpec, swaggerUiOptions)
    ];
  }
  
  /**
   * Generate documentation endpoint
   * @param {object} options - Documentation options
   * @returns {Function} Express middleware
   */
  generateDocumentationEndpoint(options = {}) {
    const {
      includeMetrics = true,
      includeVersions = true,
      includeHealth = true
    } = options;
    
    return (req, res) => {
      const documentation = {
        openapi: this.swaggerSpec,
        info: {
          title: this.swaggerSpec.info.title,
          version: this.swaggerSpec.info.version,
          description: this.swaggerSpec.info.description,
          generatedAt: new Date().toISOString()
        },
        endpoints: {
          swagger: '/docs',
          openapi: '/docs/openapi.json',
          health: includeHealth ? '/health' : null,
          metrics: includeMetrics ? '/metrics' : null
        },
        statistics: {
          totalPaths: Object.keys(this.swaggerSpec.paths).length,
          totalSchemas: Object.keys(this.swaggerSpec.components.schemas).length,
          totalTags: this.swaggerSpec.tags.length
        }
      };
      
      res.json({
        success: true,
        data: documentation
      });
    };
  }
}

/**
 * Auto-documentation from route files
 */
export class RouteDocumentationExtractor {
  constructor() {
    this.extractedDocs = new Map();
  }
  
  /**
   * Extract documentation from route file comments
   * @param {string} filePath - Path to route file
   * @returns {Promise<object|null>} Extracted documentation
   */
  async extractFromFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const docs = this.parseJSDocComments(content);
      
      this.extractedDocs.set(filePath, docs);
      
      return docs;
    } catch (error) {
      logger.error('Documentation extraction failed', {
        error: error.message,
        filePath,
        component: 'route-doc-extractor'
      });
      
      return null;
    }
  }
  
  /**
   * Parse JSDoc comments from file content
   * @param {string} content - File content
   * @returns {object} Parsed documentation
   */
  parseJSDocComments(content) {
    const docs = {
      routes: [],
      schemas: [],
      examples: []
    };
    
    // Extract JSDoc blocks
    const jsdocRegex = /\/\*\*([\s\S]*?)\*\//g;
    let match;
    
    while ((match = jsdocRegex.exec(content)) !== null) {
      const comment = match[1];
      const parsed = this.parseJSDocBlock(comment);
      
      if (parsed.type === 'route') {
        docs.routes.push(parsed);
      } else if (parsed.type === 'schema') {
        docs.schemas.push(parsed);
      } else if (parsed.type === 'example') {
        docs.examples.push(parsed);
      }
    }
    
    return docs;
  }
  
  /**
   * Parse individual JSDoc block
   * @param {string} comment - JSDoc comment content
   * @returns {object} Parsed JSDoc data
   */
  parseJSDocBlock(comment) {
    const lines = comment.split('\n').map(line => line.trim().replace(/^\*\s?/, ''));
    
    const parsed = {
      type: 'unknown',
      description: '',
      tags: {}
    };
    
    let currentTag = null;
    
    for (const line of lines) {
      if (line.startsWith('@')) {
        const tagMatch = line.match(/@(\w+)\s*(.*)/);
        if (tagMatch) {
          currentTag = tagMatch[1];
          parsed.tags[currentTag] = tagMatch[2] || true;
          
          // Determine type based on tags
          if (currentTag === 'route' || currentTag === 'api') {
            parsed.type = 'route';
          } else if (currentTag === 'schema' || currentTag === 'typedef') {
            parsed.type = 'schema';
          } else if (currentTag === 'example') {
            parsed.type = 'example';
          }
        }
      } else if (currentTag && line) {
        // Continue previous tag
        if (typeof parsed.tags[currentTag] === 'string') {
          parsed.tags[currentTag] += ' ' + line;
        }
      } else if (line && !parsed.description) {
        parsed.description = line;
      }
    }
    
    return parsed;
  }
  
  /**
   * Get all extracted documentation
   * @returns {Map} Map of file paths to documentation
   */
  getAllExtractedDocs() {
    return this.extractedDocs;
  }
}

export default {
  OpenApiSchemaGenerator,
  DocumentationMiddleware,
  RouteDocumentationExtractor
};