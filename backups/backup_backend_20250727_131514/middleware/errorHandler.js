import { logger, logError, logAudit } from '../utils/logger.js';

// Global error handler middleware
const globalErrorHandler = (error, req, res, next) => {
  // Log the error with context
  logError(error, {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    personId: req.person?.id || null,
    body: req.method !== 'GET' ? req.body : undefined,
    params: req.params,
    query: req.query
  });

  // Determine error type and response
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let details = null;

  // Handle different error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = error.details || error.message;
  } else if (error.name === 'UnauthorizedError' || error.message?.includes('unauthorized')) {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Authentication required';
    
    // Log security event
    logAudit('UNAUTHORIZED_ACCESS_ATTEMPT', req.person?.id || null, req.url, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method
    });
  } else if (error.name === 'ForbiddenError' || error.message?.includes('forbidden')) {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    message = 'Access denied';
    
    // Log security event
    logAudit('FORBIDDEN_ACCESS_ATTEMPT', req.person?.id || null, req.url, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method
    });
  } else if (error.name === 'NotFoundError' || error.message?.includes('not found')) {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = 'Resource not found';
  } else if (error.name === 'ConflictError' || error.message?.includes('conflict')) {
    statusCode = 409;
    errorCode = 'CONFLICT';
    message = 'Resource conflict';
    details = error.message;
  } else if (error.code === 'P2002') {
    // Prisma unique constraint violation
    statusCode = 409;
    errorCode = 'DUPLICATE_ENTRY';
    message = 'Duplicate entry';
    details = 'A record with this information already exists';
  } else if (error.code === 'P2025') {
    // Prisma record not found
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = 'Record not found';
  } else if (error.code === 'P2003') {
    // Prisma foreign key constraint violation
    statusCode = 400;
    errorCode = 'FOREIGN_KEY_CONSTRAINT';
    message = 'Foreign key constraint violation';
  }

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    error: message,
    code: errorCode,
    timestamp: new Date().toISOString(),
    requestId: req.id || null
  };

  // Add details in development or for client errors
  if (isDevelopment || statusCode < 500) {
    if (details) {
      errorResponse.details = details;
    }
    
    // Add stack trace in development
    if (isDevelopment && error.stack) {
      errorResponse.stack = error.stack;
    }
  }

  res.status(statusCode).json(errorResponse);
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  const error = new Error('Endpoint not found');
  error.status = 404;
  error.path = req.path;
  error.method = req.method;
  
  // Log per debugging
  logger.warn('404 - Endpoint not found', {
    method: req.method,
    path: req.path,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

// Export errorHandler as alias for globalErrorHandler
export const errorHandler = globalErrorHandler;

export {
  globalErrorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError
};

export default globalErrorHandler;