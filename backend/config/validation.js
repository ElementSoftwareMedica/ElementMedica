/**
 * Input Validation Configuration
 * Configurazioni per validazione input con Joi e Zod
 */

import Joi from 'joi';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

/**
 * Schemi di validazione comuni con Joi
 */
export const JOI_SCHEMAS = {
  // Schemi base
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
  id: Joi.string().uuid().required(),
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  
  // Schemi per autenticazione
  login: Joi.object({
    identifier: Joi.string().required(),
    password: Joi.string().required(),
    rememberMe: Joi.boolean().optional()
  }),
  
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    acceptTerms: Joi.boolean().valid(true).required()
  }),
  
  // Schemi per utenti
  user: Joi.object({
    email: Joi.string().email().required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    role: Joi.string().valid('admin', 'user', 'manager').optional(),
    isActive: Joi.boolean().optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    dateOfBirth: Joi.date().max('now').optional()
  }),
  
  updateUser: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    dateOfBirth: Joi.date().max('now').optional()
  }),
  
  // Schemi per corsi
  course: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().max(2000).optional(),
    duration: Joi.number().integer().min(1).max(1000).required(),
    price: Joi.number().min(0).max(10000).optional(),
    category: Joi.string().min(2).max(100).required(),
    level: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
    isActive: Joi.boolean().optional()
  }),
  
  // Schemi per aziende
  company: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    address: Joi.string().max(500).optional(),
    website: Joi.string().uri().optional(),
    vatNumber: Joi.string().min(8).max(20).optional(),
    industry: Joi.string().max(100).optional()
  }),
  
  // Schemi per query parameters
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  }),
  
  search: Joi.object({
    q: Joi.string().min(1).max(200).required(),
    category: Joi.string().optional(),
    filters: Joi.object().optional()
  })
};

/**
 * Schemi di validazione comuni con Zod
 */
export const ZOD_SCHEMAS = {
  // Schemi base
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number and special character'),
  id: z.string().uuid('Invalid UUID format'),
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
  
  // Schemi per autenticazione
  login: z.object({
    identifier: z.string().min(1, 'Identifier is required'),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional()
  }),
  
  register: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
             'Password must contain uppercase, lowercase, number and special character'),
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
    acceptTerms: z.boolean().refine(val => val === true, 'Terms must be accepted')
  }),
  
  // Schemi per utenti
  user: z.object({
    email: z.string().email('Invalid email format'),
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    role: z.enum(['admin', 'user', 'manager']).optional(),
    isActive: z.boolean().optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format').optional(),
    dateOfBirth: z.date().max(new Date(), 'Date of birth cannot be in the future').optional()
  }),
  
  updateUser: z.object({
    firstName: z.string().min(2).max(50).optional(),
    lastName: z.string().min(2).max(50).optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format').optional(),
    dateOfBirth: z.date().max(new Date(), 'Date of birth cannot be in the future').optional()
  }),
  
  // Schemi per corsi
  course: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    description: z.string().max(2000).optional(),
    duration: z.number().int().min(1).max(1000),
    price: z.number().min(0).max(10000).optional(),
    category: z.string().min(2).max(100),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    isActive: z.boolean().optional()
  }),
  
  // Schemi per aziende
  company: z.object({
    name: z.string().min(2).max(200),
    email: z.string().email('Invalid email format'),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format').optional(),
    address: z.string().max(500).optional(),
    website: z.string().url('Invalid URL format').optional(),
    vatNumber: z.string().min(8).max(20).optional(),
    industry: z.string().max(100).optional()
  }),
  
  // Schemi per query parameters
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc')
  }),
  
  search: z.object({
    q: z.string().min(1).max(200),
    category: z.string().optional(),
    filters: z.object({}).optional()
  })
};

/**
 * Configurazioni di validazione per ambiente
 */
export const VALIDATION_CONFIGS = {
  development: {
    abortEarly: false, // Mostra tutti gli errori
    allowUnknown: true, // Permetti campi extra
    stripUnknown: false, // Non rimuovere campi extra
    skipFunctions: true,
    skipInvalidProperties: false
  },
  
  production: {
    abortEarly: true, // Ferma al primo errore
    allowUnknown: false, // Non permettere campi extra
    stripUnknown: true, // Rimuovi campi extra
    skipFunctions: true,
    skipInvalidProperties: true
  },
  
  test: {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false,
    skipFunctions: true,
    skipInvalidProperties: false
  }
};

/**
 * Factory per middleware di validazione Joi
 */
export const createJoiValidator = (schema, options = {}) => {
  const environment = process.env.NODE_ENV || 'development';
  const config = { ...VALIDATION_CONFIGS[environment], ...options };
  
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, config);
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      logger.warn('Joi validation failed', {
        service: 'validation',
        errors,
        path: req.path,
        method: req.method
      });
      
      return res.status(400).json({
        error: 'Validation failed',
        message: 'The provided data is invalid',
        details: errors
      });
    }
    
    // Sostituisci req.body con i dati validati
    req.body = value;
    next();
  };
};

/**
 * Factory per middleware di validazione Zod
 */
export const createZodValidator = (schema, options = {}) => {
  return (req, res, next) => {
    try {
      const result = schema.parse(req.body);
      req.body = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.input
        }));
        
        logger.warn('Zod validation failed', {
          service: 'validation',
          errors,
          path: req.path,
          method: req.method
        });
        
        return res.status(400).json({
          error: 'Validation failed',
          message: 'The provided data is invalid',
          details: errors
        });
      }
      
      logger.error('Unexpected validation error', {
        service: 'validation',
        error: error.message,
        path: req.path,
        method: req.method
      });
      
      return res.status(500).json({
        error: 'Internal validation error',
        message: 'An unexpected error occurred during validation'
      });
    }
  };
};

/**
 * Middleware per validazione query parameters
 */
export const validateQuery = (schema, validator = 'joi') => {
  return (req, res, next) => {
    try {
      if (validator === 'joi') {
        const { error, value } = schema.validate(req.query, VALIDATION_CONFIGS[process.env.NODE_ENV || 'development']);
        if (error) {
          const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));
          
          return res.status(400).json({
            error: 'Query validation failed',
            details: errors
          });
        }
        req.query = value;
      } else if (validator === 'zod') {
        req.query = schema.parse(req.query);
      }
      
      next();
    } catch (error) {
      logger.warn('Query validation failed', {
        service: 'validation',
        error: error.message,
        query: req.query,
        path: req.path
      });
      
      return res.status(400).json({
        error: 'Query validation failed',
        message: error.message
      });
    }
  };
};

/**
 * Middleware per validazione params
 */
export const validateParams = (schema, validator = 'joi') => {
  return (req, res, next) => {
    try {
      if (validator === 'joi') {
        const { error, value } = schema.validate(req.params, VALIDATION_CONFIGS[process.env.NODE_ENV || 'development']);
        if (error) {
          const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));
          
          return res.status(400).json({
            error: 'Parameter validation failed',
            details: errors
          });
        }
        req.params = value;
      } else if (validator === 'zod') {
        req.params = schema.parse(req.params);
      }
      
      next();
    } catch (error) {
      logger.warn('Parameter validation failed', {
        service: 'validation',
        error: error.message,
        params: req.params,
        path: req.path
      });
      
      return res.status(400).json({
        error: 'Parameter validation failed',
        message: error.message
      });
    }
  };
};

/**
 * Validatori predefiniti per route comuni
 */
export const validators = {
  // Joi validators
  joi: {
    login: createJoiValidator(JOI_SCHEMAS.login),
    register: createJoiValidator(JOI_SCHEMAS.register),
    user: createJoiValidator(JOI_SCHEMAS.user),
    updateUser: createJoiValidator(JOI_SCHEMAS.updateUser),
    course: createJoiValidator(JOI_SCHEMAS.course),
    company: createJoiValidator(JOI_SCHEMAS.company),
    pagination: validateQuery(JOI_SCHEMAS.pagination, 'joi'),
    search: validateQuery(JOI_SCHEMAS.search, 'joi'),
    id: validateParams(Joi.object({ id: JOI_SCHEMAS.id }), 'joi')
  },
  
  // Zod validators
  zod: {
    login: createZodValidator(ZOD_SCHEMAS.login),
    register: createZodValidator(ZOD_SCHEMAS.register),
    user: createZodValidator(ZOD_SCHEMAS.user),
    updateUser: createZodValidator(ZOD_SCHEMAS.updateUser),
    course: createZodValidator(ZOD_SCHEMAS.course),
    company: createZodValidator(ZOD_SCHEMAS.company),
    pagination: validateQuery(ZOD_SCHEMAS.pagination, 'zod'),
    search: validateQuery(ZOD_SCHEMAS.search, 'zod'),
    id: validateParams(z.object({ id: ZOD_SCHEMAS.id }), 'zod')
  }
};

/**
 * Utility per validazione manuale
 */
export const validate = {
  joi: (data, schema, options = {}) => {
    const config = { ...VALIDATION_CONFIGS[process.env.NODE_ENV || 'development'], ...options };
    return schema.validate(data, config);
  },
  
  zod: (data, schema) => {
    try {
      return { value: schema.parse(data), error: null };
    } catch (error) {
      return { value: null, error };
    }
  }
};

/**
 * Configurazione validazione per ambiente
 */
export const getValidationConfig = (environment = process.env.NODE_ENV || 'development') => {
  return VALIDATION_CONFIGS[environment] || VALIDATION_CONFIGS.development;
};

export default {
  createJoiValidator,
  createZodValidator,
  validateQuery,
  validateParams,
  validators,
  validate,
  getValidationConfig,
  JOI_SCHEMAS,
  ZOD_SCHEMAS,
  VALIDATION_CONFIGS
};