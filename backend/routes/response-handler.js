/**
 * API Response Handler Module
 * Standardized response formatting and error handling for APIs
 */

import { logger } from '../utils/logger.js';

/**
 * Standard API Response Structure
 */
class ApiResponse {
  constructor(success = true, data = null, message = null, meta = {}) {
    this.success = success;
    this.timestamp = new Date().toISOString();
    
    if (data !== null) {
      this.data = data;
    }
    
    if (message) {
      this.message = message;
    }
    
    if (Object.keys(meta).length > 0) {
      this.meta = meta;
    }
  }
}

/**
 * Error Response Structure
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, code = null, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Pagination Helper
 */
class PaginationHelper {
  /**
   * Create pagination metadata
   * @param {number} page - Current page number
   * @param {number} limit - Items per page
   * @param {number} total - Total number of items
   * @param {string} baseUrl - Base URL for pagination links
   * @returns {object} Pagination metadata
   */
  static createMeta(page, limit, total, baseUrl = '') {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    const meta = {
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNext,
        hasPrev
      }
    };
    
    // Add navigation links if baseUrl is provided
    if (baseUrl) {
      meta.pagination.links = {
        first: `${baseUrl}?page=1&limit=${limit}`,
        last: `${baseUrl}?page=${totalPages}&limit=${limit}`
      };
      
      if (hasPrev) {
        meta.pagination.links.prev = `${baseUrl}?page=${page - 1}&limit=${limit}`;
      }
      
      if (hasNext) {
        meta.pagination.links.next = `${baseUrl}?page=${page + 1}&limit=${limit}`;
      }
    }
    
    return meta;
  }
  
  /**
   * Calculate offset for database queries
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {number} Offset value
   */
  static calculateOffset(page, limit) {
    return (page - 1) * limit;
  }
  
  /**
   * Validate pagination parameters
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {object} Validated parameters
   */
  static validateParams(page = 1, limit = 10) {
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));
    
    return {
      page: validatedPage,
      limit: validatedLimit,
      offset: this.calculateOffset(validatedPage, validatedLimit)
    };
  }
}

/**
 * Response Formatter
 */
export class ResponseFormatter {
  /**
   * Send success response
   * @param {object} res - Express response object
   * @param {any} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   * @param {object} meta - Additional metadata
   */
  static success(res, data = null, message = null, statusCode = 200, meta = {}) {
    const response = new ApiResponse(true, data, message, meta);
    
    // Set pagination headers if available
    if (meta.pagination) {
      res.set({
        'X-Total-Count': meta.pagination.totalItems.toString(),
        'X-Page-Count': meta.pagination.totalPages.toString(),
        'X-Current-Page': meta.pagination.currentPage.toString(),
        'X-Per-Page': meta.pagination.itemsPerPage.toString()
      });
    }
    
    return res.status(statusCode).json(response);
  }
  
  /**
   * Send error response
   * @param {object} res - Express response object
   * @param {string|Error} error - Error message or Error object
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Error code
   * @param {any} details - Additional error details
   */
  static error(res, error, statusCode = 500, code = null, details = null) {
    let message = 'Internal server error';
    let errorCode = code;
    let errorDetails = details;
    
    if (error instanceof ApiError) {
      message = error.message;
      statusCode = error.statusCode;
      errorCode = error.code;
      errorDetails = error.details;
    } else if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
    
    const response = {
      success: false,
      error: {
        message,
        code: errorCode,
        details: errorDetails
      },
      timestamp: new Date().toISOString()
    };
    
    // Log error for debugging
    logger.error('API Error Response', {
      message,
      statusCode,
      code: errorCode,
      details: errorDetails,
      stack: error instanceof Error ? error.stack : undefined,
      component: 'response-handler'
    });
    
    return res.status(statusCode).json(response);
  }
  
  /**
   * Send paginated response
   * @param {object} res - Express response object
   * @param {Array} data - Array of items
   * @param {number} total - Total number of items
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @param {string} message - Success message
   * @param {string} baseUrl - Base URL for pagination links
   */
  static paginated(res, data, total, page, limit, message = null, baseUrl = '') {
    const meta = PaginationHelper.createMeta(page, limit, total, baseUrl);
    return this.success(res, data, message, 200, meta);
  }
  
  /**
   * Send created response (201)
   * @param {object} res - Express response object
   * @param {any} data - Created resource data
   * @param {string} message - Success message
   * @param {string} location - Location header value
   */
  static created(res, data, message = 'Resource created successfully', location = null) {
    if (location) {
      res.set('Location', location);
    }
    
    return this.success(res, data, message, 201);
  }
  
  /**
   * Send no content response (204)
   * @param {object} res - Express response object
   */
  static noContent(res) {
    return res.status(204).send();
  }
  
  /**
   * Send not found response (404)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   * @param {string} resource - Resource name
   */
  static notFound(res, message = null, resource = 'Resource') {
    const errorMessage = message || `${resource} not found`;
    return this.error(res, errorMessage, 404, 'NOT_FOUND');
  }
  
  /**
   * Send unauthorized response (401)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static unauthorized(res, message = 'Authentication required') {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }
  
  /**
   * Send forbidden response (403)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static forbidden(res, message = 'Access denied') {
    return this.error(res, message, 403, 'FORBIDDEN');
  }
  
  /**
   * Send bad request response (400)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   * @param {any} details - Validation details
   */
  static badRequest(res, message = 'Bad request', details = null) {
    return this.error(res, message, 400, 'BAD_REQUEST', details);
  }
  
  /**
   * Send conflict response (409)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static conflict(res, message = 'Resource conflict') {
    return this.error(res, message, 409, 'CONFLICT');
  }
  
  /**
   * Send unprocessable entity response (422)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   * @param {any} details - Validation details
   */
  static unprocessableEntity(res, message = 'Validation failed', details = null) {
    return this.error(res, message, 422, 'VALIDATION_ERROR', details);
  }
  
  /**
   * Send too many requests response (429)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   * @param {number} retryAfter - Retry after seconds
   */
  static tooManyRequests(res, message = 'Too many requests', retryAfter = null) {
    if (retryAfter) {
      res.set('Retry-After', retryAfter.toString());
    }
    
    return this.error(res, message, 429, 'RATE_LIMIT_EXCEEDED');
  }
  
  /**
   * Send service unavailable response (503)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static serviceUnavailable(res, message = 'Service temporarily unavailable') {
    return this.error(res, message, 503, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * Express middleware for handling async route errors
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware
 */
export const globalErrorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Unhandled error in API', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
    params: req.params,
    userId: req.user?.id,
    requestId: req.requestId,
    component: 'global-error-handler'
  });
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return ResponseFormatter.unprocessableEntity(res, 'Validation failed', err.details);
  }
  
  if (err.name === 'CastError') {
    return ResponseFormatter.badRequest(res, 'Invalid ID format');
  }
  
  if (err.code === 11000) { // MongoDB duplicate key error
    return ResponseFormatter.conflict(res, 'Resource already exists');
  }
  
  if (err.name === 'JsonWebTokenError') {
    return ResponseFormatter.unauthorized(res, 'Invalid token');
  }
  
  if (err.name === 'TokenExpiredError') {
    return ResponseFormatter.unauthorized(res, 'Token expired');
  }
  
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ResponseFormatter.badRequest(res, 'File too large');
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return ResponseFormatter.badRequest(res, 'Too many files');
    }
    return ResponseFormatter.badRequest(res, 'File upload error');
  }
  
  // Handle Prisma errors
  if (err.code === 'P2002') {
    return ResponseFormatter.conflict(res, 'Unique constraint violation');
  }
  
  if (err.code === 'P2025') {
    return ResponseFormatter.notFound(res, 'Record not found');
  }
  
  if (err.code?.startsWith('P')) {
    return ResponseFormatter.error(res, 'Database error', 500, 'DATABASE_ERROR');
  }
  
  // Handle API errors
  if (err instanceof ApiError) {
    return ResponseFormatter.error(res, err.message, err.statusCode, err.code, err.details);
  }
  
  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  const message = isDevelopment ? err.message : 'Internal server error';
  const details = isDevelopment ? { stack: err.stack } : null;
  
  return ResponseFormatter.error(res, message, 500, 'INTERNAL_ERROR', details);
};

/**
 * 404 handler middleware
 */
export const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    component: 'not-found-handler'
  });
  
  return ResponseFormatter.notFound(res, `Route ${req.method} ${req.path} not found`, 'Endpoint');
};

/**
 * Response transformation middleware
 */
export const responseTransformer = (transformFn) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      if (typeof transformFn === 'function') {
        try {
          data = transformFn(data, req);
        } catch (error) {
          logger.error('Response transformation error', {
            error: error.message,
            path: req.path,
            component: 'response-transformer'
          });
        }
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Data sanitization middleware
 */
export const dataSanitizer = (options = {}) => {
  const {
    removeFields = ['password', 'passwordHash', 'salt', 'secret'],
    maskFields = ['email', 'phone'],
    maskChar = '*'
  } = options;
  
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized = { ...obj };
    
    // Remove sensitive fields
    removeFields.forEach(field => {
      delete sanitized[field];
    });
    
    // Mask fields
    maskFields.forEach(field => {
      if (sanitized[field] && typeof sanitized[field] === 'string') {
        const value = sanitized[field];
        if (field === 'email') {
          const [local, domain] = value.split('@');
          sanitized[field] = `${local.charAt(0)}${maskChar.repeat(local.length - 2)}${local.charAt(local.length - 1)}@${domain}`;
        } else if (field === 'phone') {
          sanitized[field] = value.replace(/.(?=.{4})/g, maskChar);
        } else {
          sanitized[field] = value.replace(/.(?=.{2})/g, maskChar);
        }
      }
    });
    
    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeObject(sanitized[key]);
      }
    });
    
    return sanitized;
  };
  
  return responseTransformer((data) => {
    if (data && typeof data === 'object') {
      if (data.data) {
        data.data = sanitizeObject(data.data);
      } else {
        data = sanitizeObject(data);
      }
    }
    return data;
  });
};

/**
 * Response compression middleware for large datasets
 */
export const responseCompressor = (threshold = 1024) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      const jsonString = JSON.stringify(data);
      
      if (jsonString.length > threshold) {
        res.set('Content-Encoding', 'gzip');
        logger.debug('Response compressed', {
          originalSize: jsonString.length,
          path: req.path,
          component: 'response-compressor'
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Request/Response correlation middleware
 */
export const correlationMiddleware = () => {
  return (req, res, next) => {
    const correlationId = req.get('X-Correlation-ID') || 
                         req.get('X-Request-ID') || 
                         `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    req.correlationId = correlationId;
    res.set('X-Correlation-ID', correlationId);
    
    next();
  };
};

export {
  ApiResponse,
  ApiError,
  PaginationHelper
};

export default {
  ResponseFormatter,
  ApiResponse,
  ApiError,
  PaginationHelper,
  asyncHandler,
  globalErrorHandler,
  notFoundHandler,
  responseTransformer,
  dataSanitizer,
  responseCompressor,
  correlationMiddleware
};