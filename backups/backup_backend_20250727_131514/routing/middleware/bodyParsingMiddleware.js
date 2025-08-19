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
  
  console.log(`🔍 [BODY-PARSER] needsBodyParsing check for: ${method} ${path}`);
  
  // Solo per metodi che possono avere un body
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    console.log(`🔍 [BODY-PARSER] Method ${method} doesn't need body parsing`);
    return false;
  }
  
  // TENTATIVO 36: Per le route API, disabilita completamente il body parsing
  // Lascia che http-proxy-middleware gestisca tutto
  if (path.startsWith('/api/') && ['POST', 'PUT', 'PATCH'].includes(method)) {
    console.log(`🔧 [BODY-PARSER-V36] API route detected - SKIPPING body parsing (delegating to http-proxy-middleware): ${path}`);
    return false; // Disabilita completamente il parsing
  }
  
  // Controlla se il path corrisponde a una route che necessita body parsing
  for (const route of bodyParsingRoutes) {
    console.log(`🔍 [BODY-PARSER] Testing route: ${route} against path: ${path}`);
    
    if (route.endsWith('/*')) {
      const routePrefix = route.slice(0, -2); // Rimuove /*
      console.log(`🔍 [BODY-PARSER] Wildcard route - checking if ${path} starts with ${routePrefix}`);
      if (path.startsWith(routePrefix)) {
        console.log(`✅ [BODY-PARSER] Match found with wildcard route: ${route}`);
        return true;
      }
    } else {
      // Per route esatte, controlla che il path sia esattamente uguale
      console.log(`🔍 [BODY-PARSER] Exact route - checking exact match for ${route}`);
      if (path === route) {
        console.log(`✅ [BODY-PARSER] Match found with exact route: ${route}`);
        return true;
      }
    }
  }
  
  console.log(`❌ [BODY-PARSER] No matching route found for: ${path}`);
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
    // Debug logging sempre attivo per diagnostica
    console.log(`🔍 [BODY-PARSER] ===== MIDDLEWARE CALLED =====`);
    console.log(`🔍 [BODY-PARSER] Processing: ${req.method} ${req.path}`);
    console.log(`🔍 [BODY-PARSER] Content-Type: ${req.get('Content-Type')}`);
    console.log(`🔍 [BODY-PARSER] Content-Length: ${req.get('Content-Length')}`);
    console.log(`🔍 [BODY-PARSER] URL: ${req.url}`);
    console.log(`🔍 [BODY-PARSER] Original URL: ${req.originalUrl}`);
    
    console.log(`🔍 [BODY-PARSER] Checking if parsing needed...`);
    
    // Controlla se questa route necessita del body parsing
    const parsingType = needsBodyParsing(req);
    
    if (parsingType === false) {
      console.log(`⏭️ [BODY-PARSER] Skipping body parsing for: ${req.method} ${req.path}`);
      return next();
    }
    
    console.log(`✅ [BODY-PARSER] Applying body parsing for: ${req.method} ${req.path}`);
    
    const contentType = req.get('Content-Type') || '';
    
    // Applica il parser appropriato
    if (contentType.includes('application/json')) {
      console.log(`🔍 [BODY-PARSER] Using JSON parser...`);
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
          
          console.error(`❌ [BODY-PARSER] JSON parsing error for ${req.path}:`, err.message);
          
          return res.status(400).json({
            error: 'Invalid JSON format',
            message: err.message,
            path: req.path
          });
        }
        
        console.log(`✅ [BODY-PARSER] JSON parsed successfully for ${req.path}`);
        console.log(`🔍 [BODY-PARSER] Body keys:`, Object.keys(req.body || {}));
        console.log(`🔍 [BODY-PARSER] Body content:`, req.body);
        
        next();
      });
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      console.log(`🔍 [BODY-PARSER] Using URL-encoded parser...`);
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
          
          console.error(`❌ [BODY-PARSER] URL encoded parsing error for ${req.path}:`, err.message);
          
          return res.status(400).json({
            error: 'Invalid URL encoded format',
            message: err.message,
            path: req.path
          });
        }
        
        console.log(`✅ [BODY-PARSER] URL encoded parsed successfully for ${req.path}`);
        console.log(`🔍 [BODY-PARSER] Body keys:`, Object.keys(req.body || {}));
        console.log(`🔍 [BODY-PARSER] Body content:`, req.body);
        
        next();
      });
    } else {
      // Content-Type non supportato o non specificato
      console.log(`⏭️ [BODY-PARSER] Unsupported content type: ${contentType}`);
      next();
    }
  };
}

/**
 * Crea middleware di debug per il body parsing
 */
export function createBodyDebugMiddleware() {
  return (req, res, next) => {
    if (process.env.DEBUG_BODY_PARSER || process.env.DEBUG_ALL) {
      console.log(`🔍 [BODY-DEBUG] Request: ${req.method} ${req.path}`);
      console.log(`🔍 [BODY-DEBUG] Headers:`, {
        'content-type': req.get('Content-Type'),
        'content-length': req.get('Content-Length'),
        'user-agent': req.get('User-Agent')
      });
      
      if (req.body) {
        console.log(`🔍 [BODY-DEBUG] Parsed body:`, req.body);
        console.log(`🔍 [BODY-DEBUG] Body keys:`, Object.keys(req.body));
      } else {
        console.log(`🔍 [BODY-DEBUG] No parsed body`);
      }
    }
    
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