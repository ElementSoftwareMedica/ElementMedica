/**
 * Body Parsing Middleware per Advanced Routing System
 * 
 * Gestisce il parsing del body delle richieste in modo intelligente,
 * applicando il parsing solo quando necessario e preservando il raw body per il proxy.
 */

import bodyParser from 'body-parser';
import { RouterMapUtils } from '../core/RouterMap.js';

/**
 * Configurazioni predefinite per il body parsing
 */
const PARSER_CONFIGS = {
  json: {
    limit: '10mb',
    type: 'application/json'
  },
  
  urlencoded: {
    limit: '10mb',
    extended: true,
    type: 'application/x-www-form-urlencoded'
  }
};

/**
 * Route che necessitano del body parsing
 * IMPORTANTE: Includere SOLO route locali, NON route che vengono proxate
 */
let bodyParsingRoutes = [
  // Route legacy che vengono gestite localmente dal proxy
  '/login',                
  '/logout',
  '/register',
  
  // Route locali che necessitano body parsing
  '/health',
  '/routes',
  '/metrics',
  '/status'
  
  // RIMOSSO: Route API che vengono proxate - il body parsing sarà gestito da http-proxy-middleware
  // '/api/v1/auth/*',
  // '/api/v1/users/*',
  // '/api/v1/persons/*',
  // '/api/v1/companies/*',
  // '/api/v1/settings/*',
  // '/api/v1/roles/*',
  // '/api/v1/permissions/*',
  // '/api/v1/gdpr/*',
  // '/api/v1/tenant/*',
  // '/api/v1/documents/*',
  // '/api/v1/advanced-permissions/*',
  // '/api/v2/*',
  // '/api/*'
  
  // RIMOSSO: /auth/login - viene gestito dall'API server, non dal proxy
];

/**
 * Determina se una route ha bisogno del body parsing
 */
function needsBodyParsing(req) {
  const path = req.path;
  const method = req.method;
  
  // Solo per metodi che possono avere un body
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return false;
  }
  
  // Per le route API, disabilita completamente il body parsing
  // Lascia che http-proxy-middleware gestisca tutto
  if (path.startsWith('/api/') && ['POST', 'PUT', 'PATCH'].includes(method)) {
    return false; // Disabilita completamente il parsing
  }
  
  // Controlla se il path corrisponde a una route che necessita body parsing
  for (const route of bodyParsingRoutes) {
    if (route.endsWith('/*')) {
      const routePrefix = route.slice(0, -2); // Rimuove /*
      if (path.startsWith(routePrefix)) {
        return true;
      }
    } else {
      // Per route esatte, controlla che il path sia esattamente uguale
      if (path === route) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Crea middleware per il body parsing intelligente
 */
export function createBodyParsingMiddleware(routerMap, logger) {
  // Crea i parser
  const jsonParser = bodyParser.json(PARSER_CONFIGS.json);
  const urlencodedParser = bodyParser.urlencoded(PARSER_CONFIGS.urlencoded);
  
  return (req, res, next) => {
    // Controlla se questa route necessita del body parsing
    const parsingType = needsBodyParsing(req);
    
    if (parsingType === false) {
      return next();
    }
    
    const contentType = req.get('Content-Type') || '';
    
    // Applica il parser appropriato
    if (contentType.includes('application/json')) {
      jsonParser(req, res, (err) => {
        if (err) {
          if (logger) {
            logger.logEvent('body_parsing_error', {
              path: req.path,
              method: req.method,
              contentType: contentType,
              error: err.message
            });
          }
          
          return res.status(400).json({
            error: 'Invalid JSON format',
            message: err.message,
            path: req.path
          });
        }
        
        next();
      });
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      urlencodedParser(req, res, (err) => {
        if (err) {
          if (logger) {
            logger.logEvent('body_parsing_error', {
              path: req.path,
              method: req.method,
              contentType: contentType,
              error: err.message
            });
          }
          
          return res.status(400).json({
            error: 'Invalid URL encoded format',
            message: err.message,
            path: req.path
          });
        }
        
        next();
      });
    } else {
      // Content-Type non supportato o non specificato
      next();
    }
  };
}

/**
 * Crea middleware di debug per il body parsing
 */
export function createBodyDebugMiddleware() {
  return (req, res, next) => {
    // Debug logs removed to reduce verbosity
    next();
  };
}

/**
 * Aggiunge route che necessitano del body parsing
 */
export function addBodyParsingRoute(route) {
  if (!bodyParsingRoutes.includes(route)) {
    bodyParsingRoutes.push(route);
  }
}

/**
 * Rimuove route dal body parsing
 */
export function removeBodyParsingRoute(route) {
  const index = bodyParsingRoutes.indexOf(route);
  if (index > -1) {
    bodyParsingRoutes.splice(index, 1);
  }
}