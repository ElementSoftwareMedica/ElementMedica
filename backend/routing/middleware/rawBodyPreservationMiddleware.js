/**
 * Raw Body Preservation Middleware V38
 * 
 * TENTATIVO 38: Preserva il body raw usando body-parser raw
 * 
 * Questo middleware usa body-parser con tipo 'application/octet-stream'
 * per catturare il raw body prima che altri middleware lo processino.
 */

import bodyParser from 'body-parser';

/**
 * Crea middleware per preservare il body raw
 */
export function createRawBodyPreservationMiddleware() {
  // Crea un parser raw che accetta tutti i content-type
  const rawParser = bodyParser.raw({
    type: '*/*', // Accetta qualsiasi content-type
    limit: '10mb', // Limite di 10MB
    verify: (req, res, buf, encoding) => {
      // Salva il raw body nel req object
      req.rawBody = buf;
    }
  });

  return (req, res, next) => {
    // Solo per metodi che possono avere un body
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next();
    }
    
    // Solo per route API
    if (!req.path.startsWith('/api/')) {
      return next();
    }
    
    // Usa body-parser raw per catturare il body
    rawParser(req, res, (err) => {
      if (err) {
        return next(err);
      }
      
      // Verifica che il raw body sia stato catturato
      if (!req.rawBody) {
        // Crea un buffer vuoto se non c'è body
        req.rawBody = Buffer.alloc(0);
      }
      
      next();
    });
  };
}