/**
 * Utility per la mappatura dei permessi dal formato frontend al formato backend
 * Frontend: roles:read -> Backend: ROLE_MANAGEMENT
 */

// Mappa le actions del frontend con i permessi del database
const actionMapping = {
  'read': 'VIEW',
  'view': 'VIEW',
  'create': 'CREATE', 
  'update': 'EDIT',
  'edit': 'EDIT',
  'delete': 'DELETE'
};

/**
 * Converte un permesso dal formato frontend al formato backend
 * @param {string} frontendPermission - Permesso nel formato frontend (es. 'roles:read', 'companies:create')
 * @returns {string} Il permesso nel formato backend (es. 'ROLE_MANAGEMENT', 'CREATE_COMPANIES')
 */
export function convertFrontendToBackendPermission(frontendPermission) {
  // Se non contiene ':', probabilmente è già nel formato backend
  if (!frontendPermission.includes(':')) {
    return frontendPermission;
  }
  
  const [entity, action] = frontendPermission.split(':');
  
  // Caso speciale per i ruoli
  if (entity === 'roles') {
    const roleActionMapping = {
      'view': 'ROLE_MANAGEMENT',
      'read': 'ROLE_MANAGEMENT', 
      'create': 'ROLE_CREATE',
      'edit': 'ROLE_EDIT',
      'update': 'ROLE_EDIT',
      'delete': 'ROLE_DELETE'
    };
    return roleActionMapping[action.toLowerCase()] || `ROLE_${action.toUpperCase()}`;
  }
  
  // Caso speciale per administration
  if (entity === 'administration' && action.toLowerCase() === 'view') {
    return 'ADMIN_PANEL';
  }
  
  // Conversione standard: ACTION_ENTITY
  const mappedAction = actionMapping[action.toLowerCase()] || action.toUpperCase();
  const entityUpper = entity.toUpperCase();
  
  return `${mappedAction}_${entityUpper}`;
}

/**
 * Converte un array di permessi dal formato frontend al formato backend
 * @param {string|string[]} permissions - Permesso/i nel formato frontend
 * @returns {string[]} Array di permessi nel formato backend
 */
export function convertPermissionsToBackend(permissions) {
  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
  return permissionArray.map(permission => convertFrontendToBackendPermission(permission));
}