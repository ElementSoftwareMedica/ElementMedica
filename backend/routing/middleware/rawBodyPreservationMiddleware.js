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
  // Crea un parser raw che accetta tutti i content-type TRANNE multipart/form-data
  // Multipart deve essere gestito direttamente dall'API server con multer
  const rawParser = bodyParser.raw({
    type: (req) => {
      const contentType = req.headers['content-type'] || '';
      // SKIP multipart/form-data - deve passare direttamente al server API per multer
      if (contentType.includes('multipart/form-data')) {
        return false;
      }
      return true; // Accetta tutti gli altri content-type
    },
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

    // SKIP multipart/form-data - deve passare direttamente senza processamento
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      console.log(`📤 [RAW-BODY] Skipping multipart/form-data: ${req.method} ${req.path}`);
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