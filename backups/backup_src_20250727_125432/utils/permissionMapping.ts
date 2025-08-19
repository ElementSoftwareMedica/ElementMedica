/**
 * Utility per la mappatura dei permessi dal formato frontend al formato backend
 * Frontend: companies:read -> Backend: VIEW_COMPANIES
 */

// Mappa le actions del frontend con i permessi del database
const actionMapping: Record<string, string> = {
  'read': 'VIEW',
  'view': 'VIEW',
  'create': 'CREATE', 
  'update': 'EDIT',
  'edit': 'EDIT',
  'delete': 'DELETE'
};

/**
 * Converte entity e action nel formato ACTION_ENTITY richiesto dal backend
 * @param entity - L'entità (es. 'companies', 'users')
 * @param action - L'azione (es. 'read', 'create', 'edit', 'delete')
 * @returns Il permesso nel formato backend (es. 'VIEW_COMPANIES')
 */
export const getPermissionKey = (entity: string, action: string): string => {
  // Protezione per valori undefined o null
  if (!entity || !action) {
    console.warn('getPermissionKey called with undefined values:', { entity, action });
    return 'UNKNOWN_PERMISSION';
  }
  
  // Caso speciale per i ruoli: genera chiavi specifiche per ogni azione
  if (entity === 'roles') {
    const roleActionMapping: Record<string, string> = {
      'view': 'ROLE_MANAGEMENT',
      'read': 'ROLE_MANAGEMENT', 
      'create': 'ROLE_CREATE',
      'edit': 'ROLE_EDIT',
      'update': 'ROLE_EDIT',
      'delete': 'ROLE_DELETE'
    };
    const actionLower = action ? action.toLowerCase() : '';
    const result = roleActionMapping[actionLower] || `ROLE_${action.toUpperCase()}`;
    return result;
  }
  
  // Caso speciale per administration: usa ADMIN_PANEL per view
  if (entity === 'administration' && action && action.toLowerCase() === 'view') {
    return 'ADMIN_PANEL';
  }
  
  const actionLower = action ? action.toLowerCase() : '';
  
  // Protezione per toUpperCase()
  let actionUpper = 'UNKNOWN';
  let entityUpper = 'UNKNOWN';
  
  try {
    actionUpper = action && typeof action === 'string' ? action.toUpperCase() : 'UNKNOWN';
  } catch (error) {
    console.warn('Error in toUpperCase() for action:', action, error);
  }
  
  try {
    entityUpper = entity && typeof entity === 'string' ? entity.toUpperCase() : 'UNKNOWN';
  } catch (error) {
    console.warn('Error in toUpperCase() for entity:', entity, error);
  }
  
  const mappedAction = actionMapping[actionLower] || actionUpper;
  const result = `${mappedAction}_${entityUpper}`;
  
  return result;
};

/**
 * Verifica se un permesso nel formato frontend corrisponde a uno nel formato backend
 * @param frontendPermission - Permesso nel formato frontend (es. 'companies:read')
 * @param backendPermissions - Oggetto con i permessi backend
 * @returns true se il permesso è presente
 */
export const hasBackendPermission = (
  frontendPermission: string, 
  backendPermissions: Record<string, boolean>
): boolean => {
  // Se il permesso è già nel formato backend, controllalo direttamente
  if (backendPermissions[frontendPermission] === true) {
    return true;
  }
  
  // Gestione speciale per permessi persons
  if (frontendPermission === 'persons:read' || frontendPermission === 'persons:view') {
    return backendPermissions['VIEW_PERSONS'] === true;
  }
  
  if (frontendPermission === 'persons:create') {
    return backendPermissions['CREATE_PERSONS'] === true;
  }
  
  if (frontendPermission === 'persons:edit' || frontendPermission === 'persons:update') {
    return backendPermissions['EDIT_PERSONS'] === true;
  }
  
  if (frontendPermission === 'persons:delete') {
    return backendPermissions['DELETE_PERSONS'] === true;
  }
  
  // Gestione speciale per permessi persons con view_employees e view_trainers
  if (frontendPermission === 'persons:view_employees') {
    return backendPermissions['VIEW_EMPLOYEES'] === true;
  }
  
  if (frontendPermission === 'persons:view_trainers') {
    return backendPermissions['VIEW_TRAINERS'] === true;
  }
  
  // Gestione speciale per permessi employees e trainers
  if (frontendPermission === 'employees:read') {
    return backendPermissions['VIEW_EMPLOYEES'] === true;
  }
  
  if (frontendPermission === 'trainers:read') {
    return backendPermissions['VIEW_TRAINERS'] === true;
  }
  
  if (frontendPermission === 'courses:read') {
    return backendPermissions['VIEW_COURSES'] === true;
  }
  
  // Se è nel formato frontend (resource:action), convertilo
  if (frontendPermission.includes(':')) {
    const [resource, action] = frontendPermission.split(':');
    const backendKey = getPermissionKey(resource, action);
    return backendPermissions[backendKey] === true;
  }
  
  return false;
};

/**
 * Converte tutti i permessi dal formato backend al formato frontend per compatibilità
 * @param backendPermissions - Permessi nel formato backend
 * @returns Permessi nel formato frontend
 */
export const convertBackendToFrontendPermissions = (
  backendPermissions: Record<string, boolean>
): Record<string, boolean> => {
  const frontendPermissions: Record<string, boolean> = {};
  
  // Mantieni i permessi backend originali
  Object.keys(backendPermissions).forEach(key => {
    if (backendPermissions[key] === true) {
      frontendPermissions[key] = true;
    }
  });
  
  // Aggiungi le mappature frontend
  Object.keys(backendPermissions).forEach(backendKey => {
    if (backendPermissions[backendKey] === true) {
      // Converti VIEW_COMPANIES -> companies:read
      if (backendKey.startsWith('VIEW_')) {
        const entity = backendKey.replace('VIEW_', '').toLowerCase();
        frontendPermissions[`${entity}:read`] = true;
        frontendPermissions[`${entity}:view`] = true;
      }
      // Converti CREATE_COMPANIES -> companies:create
      else if (backendKey.startsWith('CREATE_')) {
        const entity = backendKey.replace('CREATE_', '').toLowerCase();
        frontendPermissions[`${entity}:create`] = true;
      }
      // Converti EDIT_COMPANIES -> companies:edit
      else if (backendKey.startsWith('EDIT_')) {
        const entity = backendKey.replace('EDIT_', '').toLowerCase();
        frontendPermissions[`${entity}:edit`] = true;
        frontendPermissions[`${entity}:update`] = true;
      }
      // Converti DELETE_COMPANIES -> companies:delete
      else if (backendKey.startsWith('DELETE_')) {
        const entity = backendKey.replace('DELETE_', '').toLowerCase();
        frontendPermissions[`${entity}:delete`] = true;
      }
      // Caso speciale per ROLE_MANAGEMENT -> roles:read
      else if (backendKey === 'ROLE_MANAGEMENT') {
        frontendPermissions['roles:read'] = true;
        frontendPermissions['roles:view'] = true;
      }
      // Caso speciale per ADMIN_PANEL -> administration:view
      else if (backendKey === 'ADMIN_PANEL') {
        frontendPermissions['administration:view'] = true;
      }
      // Casi speciali per permessi persons
      else if (backendKey === 'VIEW_PERSONS') {
        frontendPermissions['persons:read'] = true;
        frontendPermissions['persons:view'] = true;
      }
      else if (backendKey === 'CREATE_PERSONS') {
        frontendPermissions['persons:create'] = true;
      }
      else if (backendKey === 'EDIT_PERSONS') {
        frontendPermissions['persons:edit'] = true;
        frontendPermissions['persons:update'] = true;
      }
      else if (backendKey === 'DELETE_PERSONS') {
        frontendPermissions['persons:delete'] = true;
      }
      // Casi speciali per VIEW_EMPLOYEES e VIEW_TRAINERS
      else if (backendKey === 'VIEW_EMPLOYEES') {
        frontendPermissions['employees:read'] = true;
        frontendPermissions['employees:view'] = true;
        frontendPermissions['persons:view_employees'] = true;
      }
      else if (backendKey === 'VIEW_TRAINERS') {
        frontendPermissions['trainers:read'] = true;
        frontendPermissions['trainers:view'] = true;
        frontendPermissions['persons:view_trainers'] = true;
      }
      else if (backendKey === 'VIEW_COURSES') {
        frontendPermissions['courses:read'] = true;
        frontendPermissions['courses:view'] = true;
      }
      // Altri permessi speciali per employees e trainers
      else if (backendKey === 'CREATE_EMPLOYEES') {
        frontendPermissions['employees:create'] = true;
      }
      else if (backendKey === 'EDIT_EMPLOYEES') {
        frontendPermissions['employees:edit'] = true;
        frontendPermissions['employees:update'] = true;
      }
      else if (backendKey === 'DELETE_EMPLOYEES') {
        frontendPermissions['employees:delete'] = true;
      }
      else if (backendKey === 'CREATE_TRAINERS') {
        frontendPermissions['trainers:create'] = true;
      }
      else if (backendKey === 'EDIT_TRAINERS') {
        frontendPermissions['trainers:edit'] = true;
        frontendPermissions['trainers:update'] = true;
      }
      else if (backendKey === 'DELETE_TRAINERS') {
        frontendPermissions['trainers:delete'] = true;
      }
      else if (backendKey === 'CREATE_COURSES') {
        frontendPermissions['courses:create'] = true;
      }
      else if (backendKey === 'EDIT_COURSES') {
        frontendPermissions['courses:edit'] = true;
        frontendPermissions['courses:update'] = true;
      }
      else if (backendKey === 'DELETE_COURSES') {
        frontendPermissions['courses:delete'] = true;
      }
    }
  });
  
  return frontendPermissions;
};