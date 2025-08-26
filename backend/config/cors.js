/**
 * CORS Configuration Module
 * Centralizes CORS settings for different environments
 */

const corsConfig = {
  development: {
    origin: [
      'http://localhost:5173',  // Frontend Vite dev server
      'http://localhost:3000',  // Alternative frontend port
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Tenant-ID',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page-Count',
      'X-Current-Page'
    ],
    optionsSuccessStatus: 200, // For legacy browser support
    maxAge: 86400 // 24 hours
  },
  
  production: {
    origin: function (origin, callback) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Tenant-ID',
      'X-Requested-With',
      'Accept'
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page-Count',
      'X-Current-Page'
    ],
    optionsSuccessStatus: 200,
    maxAge: 86400
  },
  
  test: {
    origin: true, // Allow all origins in test environment
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Tenant-ID',
      'X-Requested-With',
      'Accept'
    ]
  }
};

/**
 * Get CORS configuration for current environment
 * @param {string} environment - Environment name (development, production, test)
 * @param {object} customOptions - Custom options to override defaults
 * @returns {object} CORS configuration object
 */
export const getCorsConfig = (environment = process.env.NODE_ENV || 'development', customOptions = {}) => {
  const baseConfig = corsConfig[environment] || corsConfig.development;
  
  return {
    ...baseConfig,
    ...customOptions
  };
};

/**
 * Create CORS middleware with environment-specific configuration
 * @param {object} customOptions - Custom options to override defaults
 * @returns {object} CORS configuration for express cors middleware
 */
export const createCorsConfig = (customOptions = {}) => {
  return getCorsConfig(process.env.NODE_ENV, customOptions);
};

/**
 * Validate CORS configuration
 * @param {object} config - CORS configuration to validate
 * @returns {boolean} True if configuration is valid
 */
export const validateCorsConfig = (config) => {
  const requiredFields = ['origin', 'credentials', 'methods'];
  
  return requiredFields.every(field => config.hasOwnProperty(field));
};

export default {
  getCorsConfig,
  createCorsConfig,
  validateCorsConfig,
  corsConfig
};