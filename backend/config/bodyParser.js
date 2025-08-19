/**
 * Body Parser Factory Module
 * Creates reusable and configurable body parser middleware
 */

import bodyParser from 'body-parser';

/**
 * Default configuration for body parsers
 */
const defaultConfig = {
  json: {
    limit: '50mb',
    strict: true,
    type: 'application/json'
  },
  urlencoded: {
    limit: '50mb',
    extended: true,
    parameterLimit: 1000,
    type: 'application/x-www-form-urlencoded'
  },
  text: {
    limit: '10mb',
    type: 'text/plain'
  },
  raw: {
    limit: '10mb',
    type: 'application/octet-stream'
  }
};

/**
 * Environment-specific configurations
 */
const environmentConfig = {
  development: {
    json: { limit: '50mb' },
    urlencoded: { limit: '50mb' },
    text: { limit: '10mb' },
    raw: { limit: '10mb' }
  },
  production: {
    json: { limit: '10mb' },
    urlencoded: { limit: '10mb' },
    text: { limit: '1mb' },
    raw: { limit: '1mb' }
  },
  test: {
    json: { limit: '1mb' },
    urlencoded: { limit: '1mb' },
    text: { limit: '500kb' },
    raw: { limit: '500kb' }
  }
};

/**
 * Create body parser middleware with custom configuration
 * @param {object} options - Custom configuration options
 * @param {string} environment - Environment name
 * @returns {object} Object containing configured body parser middleware
 */
export const createBodyParsers = (options = {}, environment = process.env.NODE_ENV || 'development') => {
  const envConfig = environmentConfig[environment] || environmentConfig.development;
  
  // Merge configurations: default -> environment -> custom options
  const config = {
    json: { ...defaultConfig.json, ...envConfig.json, ...options.json },
    urlencoded: { ...defaultConfig.urlencoded, ...envConfig.urlencoded, ...options.urlencoded },
    text: { ...defaultConfig.text, ...envConfig.text, ...options.text },
    raw: { ...defaultConfig.raw, ...envConfig.raw, ...options.raw }
  };
  
  return {
    json: bodyParser.json(config.json),
    urlencoded: bodyParser.urlencoded(config.urlencoded),
    text: bodyParser.text(config.text),
    raw: bodyParser.raw(config.raw)
  };
};

/**
 * Create standard body parsers for API endpoints
 * @param {object} customOptions - Custom options to override defaults
 * @returns {array} Array of middleware functions
 */
export const createStandardParsers = (customOptions = {}) => {
  const parsers = createBodyParsers(customOptions);
  
  return [
    parsers.json,
    parsers.urlencoded
  ];
};

/**
 * Create body parsers for file upload endpoints
 * @param {object} customOptions - Custom options to override defaults
 * @returns {array} Array of middleware functions
 */
export const createUploadParsers = (customOptions = {}) => {
  const uploadConfig = {
    json: { limit: '100mb' },
    urlencoded: { limit: '100mb' },
    ...customOptions
  };
  
  const parsers = createBodyParsers(uploadConfig);
  
  return [
    parsers.json,
    parsers.urlencoded,
    parsers.raw
  ];
};

/**
 * Create minimal body parsers for lightweight endpoints
 * @param {object} customOptions - Custom options to override defaults
 * @returns {array} Array of middleware functions
 */
export const createMinimalParsers = (customOptions = {}) => {
  const minimalConfig = {
    json: { limit: '1mb' },
    urlencoded: { limit: '1mb' },
    ...customOptions
  };
  
  const parsers = createBodyParsers(minimalConfig);
  
  return [
    parsers.json,
    parsers.urlencoded
  ];
};

/**
 * Error handler for body parser errors
 * @param {Error} err - Body parser error
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
export const bodyParserErrorHandler = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON syntax',
      message: 'Request body contains invalid JSON'
    });
  }
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Payload too large',
      message: 'Request body exceeds size limit'
    });
  }
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Parse error',
      message: 'Failed to parse request body'
    });
  }
  
  next(err);
};

/**
 * Validate body parser configuration
 * @param {object} config - Configuration to validate
 * @returns {boolean} True if configuration is valid
 */
export const validateBodyParserConfig = (config) => {
  const validTypes = ['json', 'urlencoded', 'text', 'raw'];
  
  return Object.keys(config).every(type => {
    if (!validTypes.includes(type)) return false;
    
    const typeConfig = config[type];
    if (typeof typeConfig !== 'object') return false;
    
    // Validate limit format
    if (typeConfig.limit && typeof typeConfig.limit !== 'string') return false;
    
    return true;
  });
};

export default {
  createBodyParsers,
  createStandardParsers,
  createUploadParsers,
  createMinimalParsers,
  bodyParserErrorHandler,
  validateBodyParserConfig,
  defaultConfig,
  environmentConfig
};