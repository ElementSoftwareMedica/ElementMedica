/**
 * Body Parser riutilizzabile per il proxy server
 * Centralizza la gestione del parsing dei body delle richieste
 */

import bodyParser from 'body-parser';
import { logger } from '../../utils/logger.js';
import { createDebugLogger } from './logging.js';

const debugBodyParser = createDebugLogger('bodyparser');

/**
 * Configurazioni predefinite per diversi tipi di parsing
 */
const PARSER_CONFIGS = {
  // Configurazione standard per JSON
  json: {
    limit: '10mb',
    extended: true,
    type: 'application/json'
  },
  
  // Configurazione per URL encoded
  urlencoded: {
    limit: '10mb',
    extended: true,
    type: 'application/x-www-form-urlencoded'
  },
  
  // Configurazione per upload di file grandi
  bulkUpload: {
    limit: '50mb',
    extended: true,
    type: ['application/json', 'application/x-www-form-urlencoded']
  },
  
  // Configurazione per API leggere
  lightweight: {
    limit: '1mb',
    extended: false,
    type: 'application/json'
  },
  
  // Configurazione per raw data
  raw: {
    limit: '10mb',
    type: 'application/octet-stream'
  },
  
  // Configurazione per text
  text: {
    limit: '1mb',
    type: 'text/plain'
  }
};

/**
 * Crea middleware JSON parser con configurazione personalizzata
 * @param {Object} options - Opzioni per il parser
 * @returns {Function} Express middleware
 */
export function createJsonParser(options = {}) {
  const config = { ...PARSER_CONFIGS.json, ...options };
  
  const parser = bodyParser.json(config);
  
  return (req, res, next) => {
    if (process.env.DEBUG_BODY_PARSER || process.env.DEBUG_ALL) {
      debugBodyParser('JSON Parser applied:', {
        path: req.path,
        method: req.method,
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length'),
        limit: config.limit
      });
    }
    
    parser(req, res, (err) => {
      if (err) {
        logger.error('JSON parsing error', {
          service: 'proxy-server',
          error: err.message,
          path: req.path,
          method: req.method,
          contentType: req.get('Content-Type'),
          contentLength: req.get('Content-Length')
        });
        
        return res.status(400).json({
          error: 'Invalid JSON format',
          message: err.message,
          path: req.path
        });
      }
      
      next();
    });
  };
}

/**
 * Crea middleware URL encoded parser con configurazione personalizzata
 * @param {Object} options - Opzioni per il parser
 * @returns {Function} Express middleware
 */
export function createUrlencodedParser(options = {}) {
  const config = { ...PARSER_CONFIGS.urlencoded, ...options };
  
  const parser = bodyParser.urlencoded(config);
  
  return (req, res, next) => {
    if (process.env.DEBUG_BODY_PARSER || process.env.DEBUG_ALL) {
      debugBodyParser('URL Encoded Parser applied:', {
        path: req.path,
        method: req.method,
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length'),
        limit: config.limit,
        extended: config.extended
      });
    }
    
    parser(req, res, (err) => {
      if (err) {
        logger.error('URL encoded parsing error', {
          service: 'proxy-server',
          error: err.message,
          path: req.path,
          method: req.method,
          contentType: req.get('Content-Type')
        });
        
        return res.status(400).json({
          error: 'Invalid URL encoded format',
          message: err.message,
          path: req.path
        });
      }
      
      next();
    });
  };
}

/**
 * Crea middleware raw parser per dati binari
 * @param {Object} options - Opzioni per il parser
 * @returns {Function} Express middleware
 */
export function createRawParser(options = {}) {
  const config = { ...PARSER_CONFIGS.raw, ...options };
  
  const parser = bodyParser.raw(config);
  
  return (req, res, next) => {
    if (process.env.DEBUG_BODY_PARSER || process.env.DEBUG_ALL) {
      debugBodyParser('Raw Parser applied:', {
        path: req.path,
        method: req.method,
        contentType: req.get('Content-Type'),
        limit: config.limit
      });
    }
    
    parser(req, res, next);
  };
}

/**
 * Crea middleware text parser
 * @param {Object} options - Opzioni per il parser
 * @returns {Function} Express middleware
 */
export function createTextParser(options = {}) {
  const config = { ...PARSER_CONFIGS.text, ...options };
  
  const parser = bodyParser.text(config);
  
  return (req, res, next) => {
    if (process.env.DEBUG_BODY_PARSER || process.env.DEBUG_ALL) {
      debugBodyParser('Text Parser applied:', {
        path: req.path,
        method: req.method,
        contentType: req.get('Content-Type'),
        limit: config.limit
      });
    }
    
    parser(req, res, next);
  };
}

/**
 * Crea parser combinato JSON + URL encoded
 * @param {Object} options - Opzioni per i parser
 * @returns {Array} Array di middleware Express
 */
export function createCombinedParser(options = {}) {
  const jsonOptions = { ...PARSER_CONFIGS.json, ...options.json };
  const urlencodedOptions = { ...PARSER_CONFIGS.urlencoded, ...options.urlencoded };
  
  return [
    createJsonParser(jsonOptions),
    createUrlencodedParser(urlencodedOptions)
  ];
}

/**
 * Crea parser per bulk upload con limiti elevati
 * @param {Object} options - Opzioni per il parser
 * @returns {Array} Array di middleware Express
 */
export function createBulkUploadParser(options = {}) {
  const config = { ...PARSER_CONFIGS.bulkUpload, ...options };
  
  return [
    createJsonParser({ limit: config.limit }),
    createUrlencodedParser({ limit: config.limit, extended: config.extended })
  ];
}

/**
 * Crea parser leggero per API veloci
 * @param {Object} options - Opzioni per il parser
 * @returns {Function} Express middleware
 */
export function createLightweightParser(options = {}) {
  const config = { ...PARSER_CONFIGS.lightweight, ...options };
  
  return createJsonParser(config);
}

/**
 * Middleware condizionale che applica il parser solo se necessario
 * @param {Function} parser - Parser da applicare
 * @param {Function} condition - Funzione che determina se applicare il parser
 * @returns {Function} Express middleware
 */
export function createConditionalParser(parser, condition) {
  return (req, res, next) => {
    if (condition(req)) {
      if (process.env.DEBUG_BODY_PARSER || process.env.DEBUG_ALL) {
        debugBodyParser('Conditional parser applied:', {
          path: req.path,
          method: req.method,
          contentType: req.get('Content-Type')
        });
      }
      
      return parser(req, res, next);
    }
    
    next();
  };
}

/**
 * Verifica se una richiesta ha bisogno di body parsing
 * @param {Object} req - Express request object
 * @returns {boolean} True se ha bisogno di parsing
 */
export function needsBodyParsing(req) {
  const method = req.method.toLowerCase();
  const contentType = req.get('Content-Type') || '';
  
  // Metodi che tipicamente hanno body
  const methodsWithBody = ['post', 'put', 'patch'];
  
  // Content types che richiedono parsing
  const parseableTypes = [
    'application/json',
    'application/x-www-form-urlencoded',
    'text/plain',
    'application/octet-stream'
  ];
  
  return methodsWithBody.includes(method) && 
         parseableTypes.some(type => contentType.includes(type));
}

/**
 * Verifica se una richiesta è per bulk upload
 * @param {Object} req - Express request object
 * @returns {boolean} True se è bulk upload
 */
export function isBulkUpload(req) {
  const path = req.path.toLowerCase();
  const bulkPaths = ['/bulk-import', '/bulk-upload', '/import', '/upload'];
  
  return bulkPaths.some(bulkPath => path.includes(bulkPath));
}

/**
 * Verifica se una richiesta è per API leggera
 * @param {Object} req - Express request object
 * @returns {boolean} True se è API leggera
 */
export function isLightweightApi(req) {
  const path = req.path.toLowerCase();
  const lightPaths = ['/health', '/status', '/ping', '/version'];
  
  return lightPaths.some(lightPath => path.includes(lightPath));
}

/**
 * Parser intelligente che sceglie automaticamente il parser appropriato
 * @param {Object} options - Opzioni per i parser
 * @returns {Function} Express middleware
 */
export function createSmartParser(options = {}) {
  return (req, res, next) => {
    // Skip se non ha bisogno di parsing
    if (!needsBodyParsing(req)) {
      return next();
    }
    
    // Parser per bulk upload
    if (isBulkUpload(req)) {
      const bulkParser = createBulkUploadParser(options.bulk);
      return bulkParser[0](req, res, (err) => {
        if (err) return next(err);
        bulkParser[1](req, res, next);
      });
    }
    
    // Parser leggero per API veloci
    if (isLightweightApi(req)) {
      const lightParser = createLightweightParser(options.lightweight);
      return lightParser(req, res, next);
    }
    
    // Parser standard combinato
    const standardParser = createCombinedParser(options.standard);
    return standardParser[0](req, res, (err) => {
      if (err) return next(err);
      standardParser[1](req, res, next);
    });
  };
}

/**
 * Setup completo del body parsing per il proxy server
 * @param {Object} app - Express app instance
 * @param {Object} options - Opzioni di configurazione
 */
export function setupBodyParsing(app, options = {}) {
  // Non applicare body parser globalmente per evitare interferenze con proxy
  // I parser verranno applicati solo dove necessario
  
  if (process.env.DEBUG_BODY_PARSER || process.env.DEBUG_ALL) {
    console.log('✅ Body parsing configured:');
    console.log('   - Smart parsing enabled');
    console.log('   - Bulk upload support:', PARSER_CONFIGS.bulkUpload.limit);
    console.log('   - Standard limit:', PARSER_CONFIGS.json.limit);
    console.log('   - Lightweight limit:', PARSER_CONFIGS.lightweight.limit);
  }
}

/**
 * Ottieni configurazioni disponibili
 * @returns {Object} Configurazioni disponibili
 */
export function getParserConfigs() {
  return { ...PARSER_CONFIGS };
}

/**
 * Ottieni statistiche del body parsing
 * @returns {Object} Statistiche correnti
 */
export function getParsingStats() {
  return {
    configs: Object.keys(PARSER_CONFIGS),
    debugEnabled: !!(process.env.DEBUG_BODY_PARSER || process.env.DEBUG_ALL),
    environment: process.env.NODE_ENV
  };
}

export default {
  createJsonParser,
  createUrlencodedParser,
  createRawParser,
  createTextParser,
  createCombinedParser,
  createBulkUploadParser,
  createLightweightParser,
  createConditionalParser,
  createSmartParser,
  needsBodyParsing,
  isBulkUpload,
  isLightweightApi,
  setupBodyParsing,
  getParserConfigs,
  getParsingStats
};