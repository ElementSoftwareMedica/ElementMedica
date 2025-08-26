/**
 * Raw Body Middleware per Advanced Routing System
 * 
 * Preserva il body raw per le route API che devono essere proxate,
 * evitando che il body stream venga consumato da Express prima del proxy.
 */

/**
 * Determina se una route necessita della preservazione del body raw
 */
function needsRawBodyPreservation(req) {
  const path = req.path;
  const method = req.method;
  
  // Solo per metodi che possono avere un body
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return false;
  }
  
  // Preserva il body raw per tutte le route API che verranno proxate
  if (path.startsWith('/api/')) {
    return true;
  }
  
  return false;
}

/**
 * Crea middleware per preservare il body raw
 */
export function createRawBodyMiddleware() {
  return (req, res, next) => {
    // Verifica se questa route necessita della preservazione del body raw
    if (!needsRawBodyPreservation(req)) {
      return next();
    }
    
    console.log(`🔍 [RAW-BODY] ===== PRESERVING RAW BODY =====`);
    console.log(`🔍 [RAW-BODY] Processing: ${req.method} ${req.path}`);
    console.log(`🔍 [RAW-BODY] Content-Type: ${req.get('Content-Type')}`);
    console.log(`🔍 [RAW-BODY] Content-Length: ${req.get('Content-Length')}`);
    
    // Buffer per raccogliere i chunk del body
    let chunks = [];
    let bodyLength = 0;
    
    // Salva i metodi originali del request stream
    const originalOn = req.on.bind(req);
    const originalEmit = req.emit.bind(req);
    
    // Flag per tracciare se il body è stato letto
    let bodyRead = false;
    
    // Intercetta l'evento 'data' per catturare i chunk
    req.on = function(event, listener) {
      if (event === 'data') {
        // Intercetta i listener 'data' per catturare i chunk
        const wrappedListener = function(chunk) {
          if (!bodyRead) {
            chunks.push(chunk);
            bodyLength += chunk.length;
            console.log(`🔍 [RAW-BODY] Captured chunk: ${chunk.length} bytes (total: ${bodyLength})`);
          }
          return listener.call(this, chunk);
        };
        return originalOn(event, wrappedListener);
      } else if (event === 'end') {
        // Intercetta l'evento 'end' per finalizzare il body
        const wrappedListener = function() {
          if (!bodyRead && chunks.length > 0) {
            req.rawBody = Buffer.concat(chunks).toString('utf8');
            bodyRead = true;
            console.log(`✅ [RAW-BODY] Raw body preserved: ${req.rawBody.length} characters`);
            console.log(`🔍 [RAW-BODY] Raw body content:`, req.rawBody);
          }
          return listener.call(this, ...arguments);
        };
        return originalOn(event, wrappedListener);
      }
      
      return originalOn(event, listener);
    };
    
    // Continua al middleware successivo
    next();
  };
}

export default {
  createRawBodyMiddleware
};