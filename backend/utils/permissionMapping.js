/**
 * Utility per la mappatura dei permessi dal formato frontend al formato backend
 * Frontend: roles:read -> Backend: ROLE_MANAGEMENT
 */

// Mappa le actions del frontend con i permessi del database
const actionMapping = {
  'read': 'VIEW',
  'view': 'VIEW',
  'create': 'CREATE',
  'write': 'CREATE',  // write può essere sia CREATE che EDIT, usiamo CREATE come default
  'update': 'EDIT',
  'edit': 'EDIT',
  'delete': 'DELETE'
};

// Mappature speciali per permessi composti (entity:action_sufix)
const specialMappings = {
  'persons:view_trainers': 'VIEW_TRAINERS',
  'persons:view_employees': 'VIEW_EMPLOYEES',
  'persons:create_trainers': 'CREATE_TRAINERS',
  'persons:create_employees': 'CREATE_EMPLOYEES',
  'persons:edit_trainers': 'EDIT_TRAINERS',
  'persons:edit_employees': 'EDIT_EMPLOYEES',
  'persons:delete_trainers': 'DELETE_TRAINERS',
  'persons:delete_employees': 'DELETE_EMPLOYEES'
};

/**
 * Converte un permesso dal formato frontend al formato backend
 * @param {string} frontendPermission - Permesso nel formato frontend (es. 'roles:read', 'companies:create', 'read:schedules')
 * @returns {string} Il permesso nel formato backend (es. 'ROLE_MANAGEMENT', 'CREATE_COMPANIES', 'VIEW_SCHEDULES')
 */
export function convertFrontendToBackendPermission(frontendPermission) {
  // Se non contiene ':', probabilmente è già nel formato backend
  if (!frontendPermission.includes(':')) {
    return frontendPermission;
  }

  // Controlla prima le mappature speciali
  if (specialMappings[frontendPermission]) {
    return specialMappings[frontendPermission];
  }

  const parts = frontendPermission.split(':');
  let entity, action;

  // Determina se il formato è action:entity o entity:action
  // Se la prima parte è un'azione conosciuta, allora è action:entity
  if (actionMapping[parts[0].toLowerCase()]) {
    action = parts[0];
    entity = parts[1];
  } else {
    // Altrimenti è entity:action
    entity = parts[0];
    action = parts[1];
  }

  // Caso speciale per i ruoli
  if (entity.toLowerCase() === 'roles') {
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
  if (entity.toLowerCase() === 'administration' && action.toLowerCase() === 'view') {
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