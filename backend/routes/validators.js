/**
 * API Validators Module
 * Centralized validation schemas and middleware for API endpoints
 */

import { body, param, query, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';

/**
 * Validation Error Handler
 * Standardized validation error response
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    
    logger.warn('Validation failed', {
      method: req.method,
      path: req.path,
      errors: formattedErrors,
      component: 'api-validator'
    });
    
    return res.status(400).json({
      error: 'Validation failed',
      message: 'The request contains invalid data',
      code: 'VALIDATION_ERROR',
      details: formattedErrors,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

/**
 * Common Field Validators
 */
export const validators = {
  // Email validation
  email: () => body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  
  // Password validation
  password: (options = {}) => {
    const { min = 8, requireSpecial = true, requireNumber = true, requireUpper = true } = options;
    
    let validator = body('password')
      .isLength({ min })
      .withMessage(`Password must be at least ${min} characters long`);
    
    if (requireSpecial) {
      validator = validator.matches(/[!@#$%^&*(),.?":{}|<>]/)
        .withMessage('Password must contain at least one special character');
    }
    
    if (requireNumber) {
      validator = validator.matches(/\d/)
        .withMessage('Password must contain at least one number');
    }
    
    if (requireUpper) {
      validator = validator.matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter');
    }
    
    return validator;
  },
  
  // Name validation
  firstName: () => body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  lastName: () => body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  // Phone validation
  phone: () => body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Must be a valid phone number'),
  
  // Date validation
  dateOfBirth: () => body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid ISO 8601 date')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      const age = now.getFullYear() - date.getFullYear();
      
      if (age < 16 || age > 120) {
        throw new Error('Age must be between 16 and 120 years');
      }
      
      return true;
    }),
  
  // Tax code validation (Italian)
  taxCode: () => body('taxCode')
    .optional()
    .matches(/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i)
    .withMessage('Must be a valid Italian tax code'),
  
  // ID validation
  id: (fieldName = 'id') => param(fieldName)
    .isInt({ min: 1 })
    .withMessage(`${fieldName} must be a positive integer`),
  
  // UUID validation
  uuid: (fieldName = 'id') => param(fieldName)
    .isUUID()
    .withMessage(`${fieldName} must be a valid UUID`),
  
  // Pagination validation
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sortBy')
      .optional()
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Sort field must be a valid string'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be either "asc" or "desc"')
  ],
  
  // Search validation
  search: () => query('search')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('Search term must be between 1 and 100 characters'),
  
  // Role validation
  role: () => body('role')
    .isIn(['admin', 'manager', 'user', 'viewer'])
    .withMessage('Role must be one of: admin, manager, user, viewer'),
  
  // Status validation
  status: (allowedStatuses = ['ACTIVE', 'INACTIVE', 'PENDING']) => body('status')
    .isIn(allowedStatuses)
    .withMessage(`Status must be one of: ${allowedStatuses.join(', ')}`),
  
  // Boolean validation
  boolean: (fieldName) => body(fieldName)
    .isBoolean()
    .withMessage(`${fieldName} must be a boolean value`),
  
  // Array validation
  array: (fieldName, options = {}) => {
    const { min = 0, max = 100, itemType = 'string' } = options;
    
    let validator = body(fieldName)
      .isArray({ min, max })
      .withMessage(`${fieldName} must be an array with ${min}-${max} items`);
    
    if (itemType === 'string') {
      validator = validator.custom((array) => {
        if (!array.every(item => typeof item === 'string')) {
          throw new Error(`All items in ${fieldName} must be strings`);
        }
        return true;
      });
    } else if (itemType === 'number') {
      validator = validator.custom((array) => {
        if (!array.every(item => typeof item === 'number')) {
          throw new Error(`All items in ${fieldName} must be numbers`);
        }
        return true;
      });
    }
    
    return validator;
  },
  
  // File validation
  file: (fieldName, options = {}) => {
    const { 
      maxSize = 5 * 1024 * 1024, // 5MB
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    } = options;
    
    return body(fieldName)
      .custom((value, { req }) => {
        const file = req.files?.[fieldName];
        
        if (!file) {
          throw new Error(`${fieldName} is required`);
        }
        
        if (file.size > maxSize) {
          throw new Error(`${fieldName} must be smaller than ${maxSize / (1024 * 1024)}MB`);
        }
        
        if (!allowedTypes.includes(file.mimetype)) {
          throw new Error(`${fieldName} must be one of: ${allowedTypes.join(', ')}`);
        }
        
        return true;
      });
  }
};

/**
 * Validation Schema Builder
 * Helps create complex validation schemas
 */
export class ValidationSchemaBuilder {
  constructor() {
    this.validations = [];
  }
  
  /**
   * Add validation rule
   * @param {Function} validator - Validation function
   * @returns {ValidationSchemaBuilder} Builder instance
   */
  add(validator) {
    if (Array.isArray(validator)) {
      this.validations.push(...validator);
    } else {
      this.validations.push(validator);
    }
    return this;
  }
  
  /**
   * Add conditional validation
   * @param {Function} condition - Condition function
   * @param {Function} validator - Validation function
   * @returns {ValidationSchemaBuilder} Builder instance
   */
  addIf(condition, validator) {
    this.validations.push((req, res, next) => {
      if (condition(req)) {
        return validator(req, res, next);
      }
      next();
    });
    return this;
  }
  
  /**
   * Build validation middleware array
   * @returns {Array} Array of validation middleware
   */
  build() {
    return [...this.validations, handleValidationErrors];
  }
}

/**
 * Pre-built validation schemas for common use cases
 */
export const validationSchemas = {
  // Authentication schemas
  login: () => [
    body('identifier')
      .notEmpty()
      .withMessage('Email, username, or tax code is required')
      .custom((value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const taxCodeRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i;
        
        if (emailRegex.test(value) || taxCodeRegex.test(value) || value.length >= 3) {
          return true;
        }
        throw new Error('Must be a valid email, tax code, or username');
      }),
    validators.password({ min: 6, requireSpecial: false, requireNumber: false, requireUpper: false }),
    body('rememberMe').optional().isBoolean(),
    handleValidationErrors
  ],
  
  register: () => [
    validators.email(),
    validators.password(),
    validators.firstName(),
    validators.lastName(),
    validators.phone(),
    validators.dateOfBirth(),
    validators.taxCode(),
    body('companyId').optional().isInt({ min: 1 }),
    body('acceptTerms').isBoolean().custom((value) => {
      if (!value) {
        throw new Error('You must accept the terms and conditions');
      }
      return true;
    }),
    handleValidationErrors
  ],
  
  changePassword: () => [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    validators.password(),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),
    handleValidationErrors
  ],
  
  // User management schemas
  createUser: () => [
    validators.email(),
    validators.firstName(),
    validators.lastName(),
    validators.phone(),
    validators.role(),
    body('companyId').isInt({ min: 1 }),
    body('sendWelcomeEmail').optional().isBoolean(),
    handleValidationErrors
  ],
  
  updateUser: () => [
    validators.id(),
    validators.email().optional(),
    validators.firstName().optional(),
    validators.lastName().optional(),
    validators.phone(),
    validators.role().optional(),
    validators.status().optional(),
    handleValidationErrors
  ],
  
  // Company schemas
  createCompany: () => [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Company name must be between 1 and 100 characters'),
    body('vatNumber')
      .optional()
      .matches(/^[A-Z]{2}[0-9A-Z]+$/)
      .withMessage('VAT number must be valid'),
    body('address')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Address must not exceed 200 characters'),
    body('city')
      .optional()
      .isLength({ max: 50 })
      .withMessage('City must not exceed 50 characters'),
    body('country')
      .optional()
      .isLength({ min: 2, max: 2 })
      .withMessage('Country must be a 2-letter code'),
    handleValidationErrors
  ],
  
  // Course schemas
  createCourse: () => [
    body('title')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Course title must be between 1 and 100 characters'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters'),
    body('duration')
      .isInt({ min: 1 })
      .withMessage('Duration must be a positive integer (minutes)'),
    body('maxParticipants')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Max participants must be between 1 and 1000'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('categoryId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Category ID must be a positive integer'),
    handleValidationErrors
  ],
  
  // Schedule schemas
  createSchedule: () => [
    body('courseId')
      .isInt({ min: 1 })
      .withMessage('Course ID must be a positive integer'),
    body('startDate')
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    body('endDate')
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
    body('location')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Location must not exceed 100 characters'),
    body('instructorId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Instructor ID must be a positive integer'),
    handleValidationErrors
  ],
  
  // Generic schemas
  pagination: () => [
    ...validators.pagination(),
    handleValidationErrors
  ],
  
  search: () => [
    validators.search(),
    ...validators.pagination(),
    handleValidationErrors
  ],
  
  idParam: () => [
    validators.id(),
    handleValidationErrors
  ],
  
  uuidParam: () => [
    validators.uuid(),
    handleValidationErrors
  ]
};

/**
 * Custom validation helpers
 */
export const customValidators = {
  /**
   * Validate that a field exists in database
   * @param {string} model - Prisma model name
   * @param {string} field - Field name to check
   * @param {object} prisma - Prisma client instance
   * @returns {Function} Validation function
   */
  existsInDatabase: (model, field = 'id', prisma) => {
    return async (value) => {
      const record = await prisma[model].findUnique({
        where: { [field]: value }
      });
      
      if (!record) {
        throw new Error(`${model} with ${field} ${value} does not exist`);
      }
      
      return true;
    };
  },
  
  /**
   * Validate that a field is unique in database
   * @param {string} model - Prisma model name
   * @param {string} field - Field name to check
   * @param {object} prisma - Prisma client instance
   * @param {number} excludeId - ID to exclude from uniqueness check
   * @returns {Function} Validation function
   */
  uniqueInDatabase: (model, field, prisma, excludeId = null) => {
    return async (value) => {
      const where = { [field]: value };
      if (excludeId) {
        where.id = { not: excludeId };
      }
      
      const record = await prisma[model].findFirst({ where });
      
      if (record) {
        throw new Error(`${field} '${value}' is already taken`);
      }
      
      return true;
    };
  },
  
  /**
   * Validate business hours format
   * @param {any} value - Value to validate
   * @returns {boolean} Validation result
   */
  businessHours: (value) => {
    if (!Array.isArray(value) || value.length !== 7) {
      throw new Error('Business hours must be an array of 7 days');
    }
    
    value.forEach((day, index) => {
      if (!day.open || !day.close) {
        throw new Error(`Day ${index + 1} must have open and close times`);
      }
      
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(day.open) || !timeRegex.test(day.close)) {
        throw new Error(`Day ${index + 1} times must be in HH:MM format`);
      }
    });
    
    return true;
  }
};

/**
 * Validation middleware factory
 * @param {Array|Function} schema - Validation schema or single validator
 * @returns {Array} Middleware array
 */
export const validate = (schema) => {
  if (typeof schema === 'function') {
    return schema();
  }
  
  if (Array.isArray(schema)) {
    return [...schema, handleValidationErrors];
  }
  
  throw new Error('Invalid validation schema');
};

export default {
  validators,
  validationSchemas,
  customValidators,
  ValidationSchemaBuilder,
  handleValidationErrors,
  validate
};