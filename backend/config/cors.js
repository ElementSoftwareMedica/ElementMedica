/**
 * CORS Configuration Module
 * Centralizes CORS settings for different environments
 */

const corsConfig = {
  development: {
    origin: [
      'http://localhost:5173',  // Element Sicurezza - Vite dev server
      'http://localhost:5174',  // Element Medica - Vite dev server
      'http://localhost:3000',  // Alternative frontend port
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:3000'
    ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-ID',
      'X-Frontend-Id',  // MULTI-BRAND: Header per identificare il frontend brand
      'X-Operate-Tenant-Id', // P59: Header per cross-tenant operations
      'x-operate-tenant-id', // P59: lowercase version
      'X-Requested-With',
      'Accept',
      'Origin',
      'cache-control',
      'pragma',
      'expires'
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
      const allowedOrigins = (process.env.ALLOWED_ORIGINS?.split(',') || []).map(o => o.trim()).filter(Boolean);

      // Domains always allowed — includes our own webapp domain so the Electron desktop
      // app (which rewrites its null-origin to this value) is always accepted.
      const defaultAllowed = [
        'https://www.elementmedica.com',
        'https://elementmedica.com',
        'https://www.elementsicurezza.com',
        'https://elementsicurezza.com',
      ];

      // Electron desktop apps: file:// context sends Origin: null (literal string) or no Origin.
      // callback(null, true) would reflect "null" as ACA-Origin, which browsers reject.
      // Instead, explicitly return our primary domain so the response is valid.
      if (!origin || origin === 'null') {
        return callback(null, 'https://www.elementmedica.com');
      }

      if ([...defaultAllowed, ...allowedOrigins].indexOf(origin) !== -1) {
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
      'X-Frontend-Id',  // MULTI-BRAND: Header per identificare il frontend brand
      'X-Operate-Tenant-Id', // P59: Header per cross-tenant operations
      'x-operate-tenant-id', // P59: lowercase version
      'X-Requested-With',
      'Accept',
      'Origin',
      'cache-control',
      'pragma',
      'expires'
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
      'X-Frontend-Id',  // MULTI-BRAND: Header per identificare il frontend brand
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