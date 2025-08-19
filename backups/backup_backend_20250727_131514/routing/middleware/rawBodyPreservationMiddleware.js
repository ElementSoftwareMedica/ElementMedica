/**
 * Raw Body Preservation Middleware V37
 * 
 * TENTATIVO 37: Preserva il body raw PRIMA che Express lo consumi
 * 
 * Questo middleware deve essere il PRIMO nella catena per intercettare
 * il body stream prima che qualsiasi altro middleware possa consumarlo.
 */

/**
 * Crea middleware per preservare il body raw
 */
export function createRawBodyPreservationMiddleware() {
  return (req, res, next) => {
    console.log(`🔧🔧🔧🔧 [RAW-BODY-V37] *** MIDDLEWARE CALLED *** 🔧🔧🔧🔧`);
    console.log(`🔧 [RAW-BODY-V37] Method: ${req.method}, Path: ${req.path}`);
    console.log(`🔧 [RAW-BODY-V37] Content-Type: ${req.get('Content-Type')}`);
    console.log(`🔧 [RAW-BODY-V37] Content-Length: ${req.get('Content-Length')}`);
    
    // Solo per metodi che possono avere un body
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      console.log(`⏭️ [RAW-BODY-V37] Method ${req.method} doesn't need body preservation`);
      return next();
    }
    
    // Solo per route API
    if (!req.path.startsWith('/api/')) {
      console.log(`⏭️ [RAW-BODY-V37] Non-API route, skipping: ${req.path}`);
      return next();
    }
    
    console.log(`🔧 [RAW-BODY-V37] Preserving raw body for API route: ${req.path}`);
    
    const chunks = [];
    
    // Intercetta i dati del body
    req.on('data', (chunk) => {
      console.log(`🔧 [RAW-BODY-V37] Received chunk:`, {
        length: chunk.length,
        type: typeof chunk
      });
      chunks.push(chunk);
    });
    
    // Quando il body è completo
    req.on('end', () => {
      if (chunks.length > 0) {
        req.rawBody = Buffer.concat(chunks);
        console.log(`✅ [RAW-BODY-V37] Raw body preserved:`, {
          length: req.rawBody.length,
          preview: req.rawBody.toString().substring(0, 100)
        });
      } else {
        console.log(`⚠️ [RAW-BODY-V37] No body data received`);
      }
      
      // Continua con il prossimo middleware
      next();
    });
    
    // Gestione errori
    req.on('error', (err) => {
      console.error(`❌ [RAW-BODY-V37] Error reading body:`, err);
      next(err);
    });
  };
}