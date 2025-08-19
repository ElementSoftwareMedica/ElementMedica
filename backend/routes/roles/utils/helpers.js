/**
 * Helpers Module - Funzioni di utilità per il sistema dei ruoli
 * 
 * Questo modulo contiene funzioni di utilità generiche utilizzate
 * in tutto il sistema di gestione dei ruoli.
 */

/**
 * Trasforma un nome di ruolo in un tipo di ruolo valido
 * @param {string} name - Nome del ruolo
 * @returns {string} Tipo di ruolo formattato
 */
export function createRoleType(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Role name is required and must be a string');
  }
  
  return name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
}

/**
 * Formatta un tipo di ruolo per la visualizzazione
 * @param {string} roleType - Tipo di ruolo
 * @returns {string} Nome formattato per la visualizzazione
 */
export function formatRoleDisplayName(roleType) {
  if (!roleType || typeof roleType !== 'string') {
    return '';
  }
  
  return roleType
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Raggruppa i permessi per risorsa
 * @param {Array} permissions - Array di permessi
 * @returns {Object} Permessi raggruppati per risorsa
 */
export function groupPermissionsByResource(permissions) {
  if (!Array.isArray(permissions)) {
    return {};
  }
  
  return permissions.reduce((grouped, permission) => {
    const resource = permission.resource || 'general';
    
    if (!grouped[resource]) {
      grouped[resource] = [];
    }
    
    grouped[resource].push({
      action: permission.action,
      scope: permission.scope,
      allowedFields: permission.allowedFields,
      conditions: permission.conditions
    });
    
    return grouped;
  }, {});
}

/**
 * Calcola l'offset per la paginazione
 * @param {number} page - Numero di pagina (1-based)
 * @param {number} limit - Numero di elementi per pagina
 * @returns {number} Offset per la query
 */
export function calculateOffset(page, limit) {
  return (Math.max(1, page) - 1) * Math.max(1, limit);
}

/**
 * Crea un oggetto di paginazione per la risposta
 * @param {number} page - Pagina corrente
 * @param {number} limit - Elementi per pagina
 * @param {number} total - Totale elementi
 * @returns {Object} Oggetto paginazione
 */
export function createPaginationResponse(page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };
}

/**
 * Filtra i dati sensibili da un oggetto utente
 * @param {Object} user - Oggetto utente
 * @returns {Object} Utente con dati filtrati
 */
export function sanitizeUserData(user) {
  if (!user || typeof user !== 'object') {
    return null;
  }
  
  const {
    password,
    passwordHash,
    resetToken,
    verificationToken,
    ...sanitizedUser
  } = user;
  
  return sanitizedUser;
}

/**
 * Crea un filtro WHERE per Prisma basato sui parametri
 * @param {Object} filters - Filtri da applicare
 * @param {string} tenantId - ID del tenant
 * @returns {Object} Oggetto WHERE per Prisma
 */
export function buildWhereClause(filters, tenantId) {
  const whereClause = { tenantId };
  
  if (filters.roleType) {
    whereClause.roleType = filters.roleType;
  }
  
  if (filters.companyId) {
    whereClause.companyId = filters.companyId;
  }
  
  if (filters.departmentId) {
    whereClause.departmentId = filters.departmentId;
  }
  
  if (filters.isActive !== undefined) {
    whereClause.isActive = filters.isActive;
  }
  
  if (filters.status) {
    whereClause.status = filters.status;
  }
  
  // Esclude i record eliminati
  whereClause.deletedAt = null;
  
  return whereClause;
}

/**
 * Trasforma i dati di un ruolo per la risposta API
 * @param {Object} role - Dati del ruolo dal database
 * @returns {Object} Ruolo formattato per l'API
 */
export function transformRoleForResponse(role) {
  if (!role) {
    return null;
  }
  
  return {
    id: role.id,
    type: role.roleType || role.type,
    name: role.name || formatRoleDisplayName(role.roleType || role.type),
    description: role.description,
    level: role.level,
    isActive: role.isActive !== false,
    isSystemRole: !role.customRoleId,
    isCustomRole: !!role.customRoleId,
    permissions: role.permissions || [],
    userCount: role.userCount || 0,
    tenantAccess: role.tenantAccess || 'SPECIFIC',
    createdAt: role.createdAt,
    updatedAt: role.updatedAt
  };
}

/**
 * Trasforma i dati di un utente per la risposta API
 * @param {Object} user - Dati dell'utente dal database
 * @returns {Object} Utente formattato per l'API
 */
export function transformUserForResponse(user) {
  if (!user) {
    return null;
  }
  
  const sanitized = sanitizeUserData(user);
  
  return {
    id: sanitized.id,
    firstName: sanitized.firstName,
    lastName: sanitized.lastName,
    email: sanitized.email,
    status: sanitized.status,
    roles: sanitized.roles || [],
    permissions: sanitized.permissions || [],
    createdAt: sanitized.createdAt,
    updatedAt: sanitized.updatedAt
  };
}

/**
 * Genera un timestamp cache-busting per gli import dinamici
 * @returns {number} Timestamp corrente
 */
export function getCacheBustingTimestamp() {
  return Date.now();
}

/**
 * Crea un messaggio di errore standardizzato
 * @param {string} operation - Operazione che ha fallito
 * @param {Error} error - Errore originale
 * @returns {Object} Oggetto errore standardizzato
 */
export function createErrorResponse(operation, error) {
  return {
    success: false,
    error: `Failed to ${operation}`,
    details: error?.message || 'Unknown error',
    timestamp: new Date().toISOString()
  };
}

/**
 * Crea una risposta di successo standardizzata
 * @param {*} data - Dati da includere nella risposta
 * @param {string} message - Messaggio di successo
 * @returns {Object} Oggetto risposta standardizzato
 */
export function createSuccessResponse(data, message = 'Operation completed successfully') {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

/**
 * Verifica se un valore è un UUID valido
 * @param {string} value - Valore da verificare
 * @returns {boolean} True se è un UUID valido
 */
export function isValidUUID(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Converte una stringa in un array, gestendo diversi formati
 * @param {string|Array} value - Valore da convertire
 * @param {string} separator - Separatore per la stringa (default: ',')
 * @returns {Array} Array risultante
 */
export function ensureArray(value, separator = ',') {
  if (Array.isArray(value)) {
    return value;
  }
  
  if (typeof value === 'string') {
    return value.split(separator).map(item => item.trim()).filter(Boolean);
  }
  
  return [];
}

/**
 * Merge di due oggetti di permessi, rimuovendo duplicati
 * @param {Array} permissions1 - Primo array di permessi
 * @param {Array} permissions2 - Secondo array di permessi
 * @returns {Array} Array di permessi unificato
 */
export function mergePermissions(permissions1, permissions2) {
  const all = [...(permissions1 || []), ...(permissions2 || [])];
  return [...new Set(all)];
}

/**
 * Estrae i parametri di query sicuri da un oggetto request
 * @param {Object} query - Oggetto query dalla request
 * @param {Array} allowedParams - Parametri consentiti
 * @returns {Object} Parametri filtrati
 */
export function extractSafeQueryParams(query, allowedParams) {
  const safeParams = {};
  
  allowedParams.forEach(param => {
    if (query[param] !== undefined) {
      safeParams[param] = query[param];
    }
  });
  
  return safeParams;
}

export default {
  createRoleType,
  formatRoleDisplayName,
  groupPermissionsByResource,
  calculateOffset,
  createPaginationResponse,
  sanitizeUserData,
  buildWhereClause,
  transformRoleForResponse,
  transformUserForResponse,
  getCacheBustingTimestamp,
  createErrorResponse,
  createSuccessResponse,
  isValidUUID,
  ensureArray,
  mergePermissions,
  extractSafeQueryParams
};