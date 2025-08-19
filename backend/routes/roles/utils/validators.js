/**
 * Validators Module - Funzioni di validazione per il sistema dei ruoli
 * 
 * Questo modulo contiene tutte le funzioni di validazione utilizzate
 * nel sistema di gestione dei ruoli e permessi.
 */

// Permessi validi per le persone - Sincronizzato con l'enum PersonPermission del database
export const VALID_PERSON_PERMISSIONS = [
  // Permessi legacy (formato frontend)
  'users.read',
  'users.write',
  'users.delete',
  'users.manage_roles',
  'companies.read',
  'companies.write',
  'companies.delete',
  'departments.read',
  'departments.write',
  'departments.delete',
  'roles.read',
  'roles.write',
  'roles.delete',
  'analytics.read',
  'analytics.write',
  'settings.read',
  'settings.write',
  
  // Permessi dal database (enum PersonPermission)
  'VIEW_COMPANIES',
  'CREATE_COMPANIES',
  'EDIT_COMPANIES',
  'DELETE_COMPANIES',
  'VIEW_EMPLOYEES',
  'CREATE_EMPLOYEES',
  'EDIT_EMPLOYEES',
  'DELETE_EMPLOYEES',
  'VIEW_TRAINERS',
  'CREATE_TRAINERS',
  'EDIT_TRAINERS',
  'DELETE_TRAINERS',
  'VIEW_USERS',
  'CREATE_USERS',
  'EDIT_USERS',
  'DELETE_USERS',
  'VIEW_COURSES',
  'CREATE_COURSES',
  'EDIT_COURSES',
  'DELETE_COURSES',
  'MANAGE_ENROLLMENTS',
  'VIEW_DOCUMENTS',
  'CREATE_DOCUMENTS',
  'EDIT_DOCUMENTS',
  'DELETE_DOCUMENTS',
  'DOWNLOAD_DOCUMENTS',
  'VIEW_PERSONS',
  'CREATE_PERSONS',
  'EDIT_PERSONS',
  'DELETE_PERSONS',
  'VIEW_SCHEDULES',
  'CREATE_SCHEDULES',
  'EDIT_SCHEDULES',
  'DELETE_SCHEDULES',
  'VIEW_QUOTES',
  'CREATE_QUOTES',
  'EDIT_QUOTES',
  'DELETE_QUOTES',
  'VIEW_INVOICES',
  'CREATE_INVOICES',
  'EDIT_INVOICES',
  'DELETE_INVOICES',
  'ADMIN_PANEL',
  'SYSTEM_SETTINGS',
  'USER_MANAGEMENT',
  'ROLE_MANAGEMENT',
  'ROLE_CREATE',
  'ROLE_EDIT',
  'ROLE_DELETE',
  'VIEW_ROLES',
  'CREATE_ROLES',
  'EDIT_ROLES',
  'DELETE_ROLES',
  'MANAGE_USERS',
  'ASSIGN_ROLES',
  'REVOKE_ROLES',
  'TENANT_MANAGEMENT',
  'VIEW_TENANTS',
  'CREATE_TENANTS',
  'EDIT_TENANTS',
  'DELETE_TENANTS',
  'VIEW_ADMINISTRATION',
  'CREATE_ADMINISTRATION',
  'EDIT_ADMINISTRATION',
  'DELETE_ADMINISTRATION',
  'VIEW_GDPR',
  'CREATE_GDPR',
  'EDIT_GDPR',
  'DELETE_GDPR',
  'VIEW_GDPR_DATA',
  'EXPORT_GDPR_DATA',
  'DELETE_GDPR_DATA',
  'MANAGE_CONSENTS',
  'VIEW_REPORTS',
  'CREATE_REPORTS',
  'EDIT_REPORTS',
  'DELETE_REPORTS',
  'EXPORT_REPORTS',
  'VIEW_HIERARCHY',
  'CREATE_HIERARCHY',
  'EDIT_HIERARCHY',
  'DELETE_HIERARCHY',
  'MANAGE_HIERARCHY',
  'HIERARCHY_MANAGEMENT',
  // Permessi CMS
  'VIEW_CMS',
  'CREATE_CMS',
  'EDIT_CMS',
  'DELETE_CMS',
  'MANAGE_PUBLIC_CONTENT',
  'READ_PUBLIC_CONTENT',
  // Permessi Form Templates
  'VIEW_FORM_TEMPLATES',
  'CREATE_FORM_TEMPLATES',
  'EDIT_FORM_TEMPLATES',
  'DELETE_FORM_TEMPLATES',
  'MANAGE_FORM_TEMPLATES',
  // Permessi Form Submissions
  'VIEW_SUBMISSIONS',
  'CREATE_SUBMISSIONS',
  'EDIT_SUBMISSIONS',
  'DELETE_SUBMISSIONS',
  'MANAGE_SUBMISSIONS',
  'EXPORT_SUBMISSIONS',
  'VIEW_FORM_SUBMISSIONS',
  'CREATE_FORM_SUBMISSIONS',
  'EDIT_FORM_SUBMISSIONS',
  'DELETE_FORM_SUBMISSIONS',
  'MANAGE_FORM_SUBMISSIONS',
  'EXPORT_FORM_SUBMISSIONS',
  // Permessi Public CMS
  'VIEW_PUBLIC_CMS',
  'CREATE_PUBLIC_CMS',
  'EDIT_PUBLIC_CMS',
  'DELETE_PUBLIC_CMS',
  'MANAGE_PUBLIC_CMS',
  // Permessi Templates
  'VIEW_TEMPLATES',
  'CREATE_TEMPLATES',
  'EDIT_TEMPLATES',
  'DELETE_TEMPLATES',
  'MANAGE_TEMPLATES',
  // Permessi Notifications
  'VIEW_NOTIFICATIONS',
  'CREATE_NOTIFICATIONS',
  'EDIT_NOTIFICATIONS',
  'DELETE_NOTIFICATIONS',
  'MANAGE_NOTIFICATIONS',
  'SEND_NOTIFICATIONS',
  // Permessi Audit Logs
  'VIEW_AUDIT_LOGS',
  'CREATE_AUDIT_LOGS',
  'EDIT_AUDIT_LOGS',
  'DELETE_AUDIT_LOGS',
  'MANAGE_AUDIT_LOGS',
  'EXPORT_AUDIT_LOGS',
  // Permessi API Keys
  'VIEW_API_KEYS',
  'CREATE_API_KEYS',
  'EDIT_API_KEYS',
  'DELETE_API_KEYS',
  'MANAGE_API_KEYS',
  'REGENERATE_API_KEYS'
];

/**
 * Verifica se un permesso è valido per le persone
 * @param {string} permission - Il permesso da verificare
 * @returns {boolean} True se il permesso è valido
 */
export function isValidPersonPermission(permission) {
  return VALID_PERSON_PERMISSIONS.includes(permission);
}

/**
 * Valida e filtra un array di permessi, mantenendo solo quelli validi
 * @param {string[]|Object[]} permissions - Array di permessi da validare (stringhe o oggetti)
 * @returns {string[]|Object[]} Array di permessi validi
 */
export function validateAndFilterPermissions(permissions) {
  if (!Array.isArray(permissions)) {
    return [];
  }
  
  return permissions.filter(permission => {
    // Gestisce il formato stringa (legacy)
    if (typeof permission === 'string') {
      return isValidPersonPermission(permission);
    }
    
    // Gestisce il formato oggetto (nuovo)
    if (typeof permission === 'object' && permission !== null) {
      // Verifica che abbia un permissionId valido
      if (!permission.permissionId || typeof permission.permissionId !== 'string') {
        return false;
      }
      
      // Valida il permissionId
      return isValidPersonPermission(permission.permissionId);
    }
    
    return false;
  });
}

/**
 * Valida i dati di input per la creazione di un ruolo
 * @param {Object} roleData - Dati del ruolo da validare
 * @returns {Object} Risultato della validazione
 */
export function validateRoleData(roleData) {
  const errors = [];
  
  if (!roleData.name || typeof roleData.name !== 'string' || roleData.name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }
  
  if (!roleData.description || typeof roleData.description !== 'string' || roleData.description.trim().length === 0) {
    errors.push('Description is required and must be a non-empty string');
  }
  
  if (roleData.level !== undefined) {
    const level = parseInt(roleData.level);
    if (isNaN(level) || level < 1 || level > 6) {
      errors.push('Level must be a number between 1 and 6');
    }
  }
  
  if (roleData.permissions && !Array.isArray(roleData.permissions)) {
    errors.push('Permissions must be an array');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valida i dati per l'assegnazione di un ruolo
 * @param {Object} assignmentData - Dati dell'assegnazione da validare
 * @returns {Object} Risultato della validazione
 */
export function validateRoleAssignment(assignmentData) {
  const errors = [];
  
  if (!assignmentData.personId || typeof assignmentData.personId !== 'string') {
    errors.push('Person ID is required and must be a string');
  }
  
  if (!assignmentData.roleType || typeof assignmentData.roleType !== 'string') {
    errors.push('Role type is required and must be a string');
  }
  
  if (assignmentData.expiresAt && !(assignmentData.expiresAt instanceof Date) && isNaN(Date.parse(assignmentData.expiresAt))) {
    errors.push('Expires at must be a valid date');
  }
  
  if (assignmentData.customPermissions) {
    const validPermissions = validateAndFilterPermissions(assignmentData.customPermissions);
    if (validPermissions.length !== assignmentData.customPermissions.length) {
      errors.push('Some custom permissions are invalid');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valida i parametri di query per la paginazione
 * @param {Object} query - Parametri di query
 * @returns {Object} Parametri validati
 */
export function validatePaginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  
  return { page, limit };
}

/**
 * Valida un ID (UUID o stringa)
 * @param {string} id - ID da validare
 * @param {string} fieldName - Nome del campo per i messaggi di errore
 * @returns {Object} Risultato della validazione
 */
export function validateId(id, fieldName = 'ID') {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return {
      isValid: false,
      error: `${fieldName} is required and must be a non-empty string`
    };
  }
  
  return { isValid: true };
}

/**
 * Valida i dati per i permessi avanzati
 * @param {Object} permissionData - Dati del permesso da validare
 * @returns {Object} Risultato della validazione
 */
export function validateAdvancedPermission(permissionData) {
  const errors = [];
  
  if (!permissionData.resource || typeof permissionData.resource !== 'string') {
    errors.push('Resource is required and must be a string');
  }
  
  if (!permissionData.action || typeof permissionData.action !== 'string') {
    errors.push('Action is required and must be a string');
  }
  
  if (permissionData.scope && typeof permissionData.scope !== 'string') {
    errors.push('Scope must be a string');
  }
  
  if (permissionData.allowedFields && !Array.isArray(permissionData.allowedFields)) {
    errors.push('Allowed fields must be an array');
  }
  
  if (permissionData.conditions && typeof permissionData.conditions !== 'object') {
    errors.push('Conditions must be an object');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valida i filtri per la ricerca utenti
 * @param {Object} filters - Filtri da validare
 * @returns {Object} Filtri validati
 */
export function validateUserFilters(filters) {
  const validatedFilters = {};
  
  if (filters.role_type && typeof filters.role_type === 'string') {
    validatedFilters.role_type = filters.role_type.trim();
  }
  
  if (filters.company_id && typeof filters.company_id === 'string') {
    validatedFilters.company_id = filters.company_id.trim();
  }
  
  if (filters.department_id && typeof filters.department_id === 'string') {
    validatedFilters.department_id = filters.department_id.trim();
  }
  
  if (filters.status && typeof filters.status === 'string') {
    validatedFilters.status = filters.status.trim();
  }
  
  return validatedFilters;
}

/**
 * Valida i dati per l'aggiornamento di un ruolo personalizzato
 * @param {Object} updateData - Dati di aggiornamento da validare
 * @returns {Object} Risultato della validazione
 */
export function validateCustomRoleUpdate(updateData) {
  const errors = [];
  
  if (updateData.name !== undefined) {
    if (typeof updateData.name !== 'string' || updateData.name.trim().length === 0) {
      errors.push('Name must be a non-empty string');
    }
  }
  
  if (updateData.description !== undefined) {
    if (typeof updateData.description !== 'string') {
      errors.push('Description must be a string');
    }
  }
  
  if (updateData.permissions !== undefined) {
    if (!Array.isArray(updateData.permissions)) {
      errors.push('Permissions must be an array');
    }
  }
  
  if (updateData.tenantAccess !== undefined) {
    const validAccess = ['ALL', 'SPECIFIC', 'NONE'];
    if (!validAccess.includes(updateData.tenantAccess)) {
      errors.push('Tenant access must be one of: ALL, SPECIFIC, NONE');
    }
  }
  
  if (updateData.isActive !== undefined) {
    if (typeof updateData.isActive !== 'boolean') {
      errors.push('isActive must be a boolean');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export default {
  VALID_PERSON_PERMISSIONS,
  isValidPersonPermission,
  validateAndFilterPermissions,
  validateRoleData,
  validateRoleAssignment,
  validatePaginationParams,
  validateId,
  validateAdvancedPermission,
  validateUserFilters,
  validateCustomRoleUpdate
};