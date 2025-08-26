/**
 * Filters Module - Filtri di sicurezza per il sistema dei ruoli
 * 
 * Questo modulo contiene filtri di sicurezza e sanitizzazione
 * per proteggere l'applicazione da input malicious.
 */

/**
 * Sanitizza una stringa rimuovendo caratteri potenzialmente pericolosi
 * @param {string} input - Stringa da sanitizzare
 * @returns {string} Stringa sanitizzata
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>\"']/g, '') // Rimuove caratteri HTML/JS pericolosi
    .replace(/\0/g, '') // Rimuove null bytes
    .substring(0, 1000); // Limita la lunghezza
}

/**
 * Sanitizza un oggetto rimuovendo proprietà pericolose
 * @param {Object} obj - Oggetto da sanitizzare
 * @param {Array} allowedFields - Campi consentiti
 * @returns {Object} Oggetto sanitizzato
 */
export function sanitizeObject(obj, allowedFields) {
  if (!obj || typeof obj !== 'object') {
    return {};
  }
  
  const sanitized = {};
  
  allowedFields.forEach(field => {
    if (obj.hasOwnProperty(field)) {
      if (typeof obj[field] === 'string') {
        sanitized[field] = sanitizeString(obj[field]);
      } else if (Array.isArray(obj[field])) {
        sanitized[field] = obj[field].map(item => 
          typeof item === 'string' ? sanitizeString(item) : item
        );
      } else {
        sanitized[field] = obj[field];
      }
    }
  });
  
  return sanitized;
}

/**
 * Filtra i permessi per rimuovere quelli non autorizzati
 * @param {Array} permissions - Array di permessi
 * @param {Array} allowedPermissions - Permessi consentiti
 * @returns {Array} Permessi filtrati
 */
export function filterPermissions(permissions, allowedPermissions) {
  if (!Array.isArray(permissions)) {
    return [];
  }
  
  return permissions.filter(permission => {
    if (typeof permission !== 'string') {
      return false;
    }
    
    return allowedPermissions.includes(permission);
  });
}

/**
 * Filtra i dati dell'utente per rimuovere informazioni sensibili
 * @param {Object} user - Dati dell'utente
 * @returns {Object} Dati dell'utente filtrati
 */
export function filterUserData(user) {
  if (!user || typeof user !== 'object') {
    return null;
  }
  
  const allowedFields = [
    'id',
    'firstName',
    'lastName',
    'email',
    'status',
    'createdAt',
    'updatedAt',
    'lastLogin'
  ];
  
  return sanitizeObject(user, allowedFields);
}

/**
 * Filtra i dati del ruolo per l'API pubblica
 * @param {Object} role - Dati del ruolo
 * @returns {Object} Dati del ruolo filtrati
 */
export function filterRoleData(role) {
  if (!role || typeof role !== 'object') {
    return null;
  }
  
  const allowedFields = [
    'id',
    'type',
    'roleType',
    'name',
    'description',
    'level',
    'isActive',
    'isSystemRole',
    'isCustomRole',
    'permissions',
    'userCount',
    'tenantAccess',
    'createdAt',
    'updatedAt'
  ];
  
  return sanitizeObject(role, allowedFields);
}

/**
 * Filtra i parametri di query per prevenire injection
 * @param {Object} query - Parametri di query
 * @returns {Object} Parametri filtrati
 */
export function filterQueryParams(query) {
  if (!query || typeof query !== 'object') {
    return {};
  }
  
  const allowedParams = [
    'page',
    'limit',
    'role_type',
    'company_id',
    'department_id',
    'status',
    'search',
    'sort',
    'order'
  ];
  
  const filtered = {};
  
  allowedParams.forEach(param => {
    if (query[param] !== undefined) {
      if (typeof query[param] === 'string') {
        filtered[param] = sanitizeString(query[param]);
      } else if (typeof query[param] === 'number') {
        filtered[param] = Math.max(0, parseInt(query[param]) || 0);
      } else {
        filtered[param] = query[param];
      }
    }
  });
  
  return filtered;
}

/**
 * Valida e filtra i dati per la creazione di un ruolo personalizzato
 * @param {Object} roleData - Dati del ruolo
 * @returns {Object} Dati del ruolo filtrati e validati
 */
export function filterCustomRoleData(roleData) {
  if (!roleData || typeof roleData !== 'object') {
    return {};
  }
  
  const allowedFields = [
    'name',
    'description',
    'permissions',
    'tenantAccess',
    'isActive'
  ];
  
  const filtered = sanitizeObject(roleData, allowedFields);
  
  // Validazioni specifiche
  if (filtered.tenantAccess && !['ALL', 'SPECIFIC', 'NONE'].includes(filtered.tenantAccess)) {
    filtered.tenantAccess = 'SPECIFIC';
  }
  
  if (filtered.isActive !== undefined && typeof filtered.isActive !== 'boolean') {
    filtered.isActive = true;
  }
  
  return filtered;
}

/**
 * Filtra i dati per l'assegnazione di un ruolo
 * @param {Object} assignmentData - Dati dell'assegnazione
 * @returns {Object} Dati dell'assegnazione filtrati
 */
export function filterRoleAssignmentData(assignmentData) {
  if (!assignmentData || typeof assignmentData !== 'object') {
    return {};
  }
  
  const allowedFields = [
    'personId',
    'roleType',
    'customRoleId',
    'companyId',
    'departmentId',
    'expiresAt',
    'customPermissions'
  ];
  
  const filtered = sanitizeObject(assignmentData, allowedFields);
  
  // Validazione data di scadenza
  if (filtered.expiresAt) {
    const expiryDate = new Date(filtered.expiresAt);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
      delete filtered.expiresAt;
    } else {
      filtered.expiresAt = expiryDate;
    }
  }
  
  return filtered;
}

/**
 * Filtra i dati per i permessi avanzati
 * @param {Object} permissionData - Dati del permesso
 * @returns {Object} Dati del permesso filtrati
 */
export function filterAdvancedPermissionData(permissionData) {
  if (!permissionData || typeof permissionData !== 'object') {
    return {};
  }
  
  const allowedFields = [
    'resource',
    'action',
    'scope',
    'allowedFields',
    'conditions'
  ];
  
  const filtered = sanitizeObject(permissionData, allowedFields);
  
  // Validazione scope
  if (filtered.scope && !['global', 'tenant', 'company', 'department', 'personal'].includes(filtered.scope)) {
    filtered.scope = 'tenant';
  }
  
  // Validazione allowedFields
  if (filtered.allowedFields && !Array.isArray(filtered.allowedFields)) {
    delete filtered.allowedFields;
  }
  
  // Validazione conditions
  if (filtered.conditions && typeof filtered.conditions !== 'object') {
    delete filtered.conditions;
  }
  
  return filtered;
}

/**
 * Rimuove campi sensibili da un array di oggetti
 * @param {Array} items - Array di oggetti
 * @param {Function} filterFunction - Funzione di filtro da applicare
 * @returns {Array} Array filtrato
 */
export function filterArrayData(items, filterFunction) {
  if (!Array.isArray(items)) {
    return [];
  }
  
  return items
    .map(item => filterFunction(item))
    .filter(item => item !== null && item !== undefined);
}

/**
 * Applica rate limiting sui parametri di paginazione
 * @param {Object} paginationParams - Parametri di paginazione
 * @returns {Object} Parametri limitati
 */
export function limitPaginationParams(paginationParams) {
  const { page = 1, limit = 20 } = paginationParams;
  
  return {
    page: Math.max(1, Math.min(1000, parseInt(page) || 1)),
    limit: Math.max(1, Math.min(100, parseInt(limit) || 20))
  };
}

/**
 * Filtra e valida i parametri per la ricerca
 * @param {Object} searchParams - Parametri di ricerca
 * @returns {Object} Parametri di ricerca validati
 */
export function filterSearchParams(searchParams) {
  if (!searchParams || typeof searchParams !== 'object') {
    return {};
  }
  
  const filtered = {};
  
  if (searchParams.search && typeof searchParams.search === 'string') {
    filtered.search = sanitizeString(searchParams.search).substring(0, 100);
  }
  
  if (searchParams.sort && typeof searchParams.sort === 'string') {
    const allowedSortFields = ['name', 'createdAt', 'updatedAt', 'level', 'userCount'];
    if (allowedSortFields.includes(searchParams.sort)) {
      filtered.sort = searchParams.sort;
    }
  }
  
  if (searchParams.order && ['asc', 'desc'].includes(searchParams.order)) {
    filtered.order = searchParams.order;
  }
  
  return filtered;
}

export default {
  sanitizeString,
  sanitizeObject,
  filterPermissions,
  filterUserData,
  filterRoleData,
  filterQueryParams,
  filterCustomRoleData,
  filterRoleAssignmentData,
  filterAdvancedPermissionData,
  filterArrayData,
  limitPaginationParams,
  filterSearchParams
};