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
  
  // Gestione speciale per permessi dashboard
  if (frontendPermission === 'dashboard:read' || frontendPermission === 'dashboard:view') {
    return backendPermissions['VIEW_DASHBOARD'] === true || 
           backendPermissions['dashboard:read'] === true ||
           backendPermissions['dashboard:view'] === true ||
           backendPermissions['dashboard.view'] === true ||  // Formato con punto
           backendPermissions['dashboard.read'] === true ||  // Formato con punto
           // Per admin, concedi accesso se ha permessi generali
           backendPermissions['ADMIN_PANEL'] === true ||
           backendPermissions['VIEW_COMPANIES'] === true; // Se può vedere aziende, può vedere dashboard
  }
  
  // Gestione speciale per permessi PUBLIC_CMS
  if (frontendPermission === 'PUBLIC_CMS:READ' || frontendPermission === 'PUBLIC_CMS:read') {
    return backendPermissions['VIEW_CMS'] === true || 
           backendPermissions['VIEW_PUBLIC_CMS'] === true ||
           backendPermissions['MANAGE_PUBLIC_CONTENT'] === true ||
           backendPermissions['READ_PUBLIC_CONTENT'] === true;
  }
  
  if (frontendPermission === 'PUBLIC_CMS:CREATE' || frontendPermission === 'PUBLIC_CMS:create') {
    return backendPermissions['CREATE_CMS'] === true || 
           backendPermissions['CREATE_PUBLIC_CMS'] === true ||
           backendPermissions['MANAGE_PUBLIC_CONTENT'] === true;
  }
  
  if (frontendPermission === 'PUBLIC_CMS:UPDATE' || frontendPermission === 'PUBLIC_CMS:update') {
    return backendPermissions['EDIT_CMS'] === true || 
           backendPermissions['EDIT_PUBLIC_CMS'] === true ||
           backendPermissions['MANAGE_PUBLIC_CONTENT'] === true;
  }
  
  if (frontendPermission === 'PUBLIC_CMS:DELETE' || frontendPermission === 'PUBLIC_CMS:delete') {
    return backendPermissions['DELETE_CMS'] === true || 
           backendPermissions['DELETE_PUBLIC_CMS'] === true ||
           backendPermissions['MANAGE_PUBLIC_CONTENT'] === true;
  }

  // Gestione speciale per permessi FORM_TEMPLATES
  if (frontendPermission === 'form_templates:read' || frontendPermission === 'form_templates:view' ||
      frontendPermission === 'FORM_TEMPLATES:read' || frontendPermission === 'FORM_TEMPLATES:READ') {
    return backendPermissions['VIEW_FORM_TEMPLATES'] === true || 
           backendPermissions['MANAGE_FORM_TEMPLATES'] === true;
  }
  
  if (frontendPermission === 'form_templates:create' || 
      frontendPermission === 'FORM_TEMPLATES:create' || frontendPermission === 'FORM_TEMPLATES:CREATE') {
    return backendPermissions['CREATE_FORM_TEMPLATES'] === true || 
           backendPermissions['MANAGE_FORM_TEMPLATES'] === true;
  }
  
  if (frontendPermission === 'form_templates:update' || frontendPermission === 'form_templates:edit' ||
      frontendPermission === 'FORM_TEMPLATES:update' || frontendPermission === 'FORM_TEMPLATES:UPDATE') {
    return backendPermissions['EDIT_FORM_TEMPLATES'] === true || 
           backendPermissions['MANAGE_FORM_TEMPLATES'] === true;
  }
  
  if (frontendPermission === 'form_templates:delete' ||
      frontendPermission === 'FORM_TEMPLATES:delete' || frontendPermission === 'FORM_TEMPLATES:DELETE') {
    return backendPermissions['DELETE_FORM_TEMPLATES'] === true || 
           backendPermissions['MANAGE_FORM_TEMPLATES'] === true;
  }

  // Gestione speciale per permessi FORM_SUBMISSIONS
  if (frontendPermission === 'form_submissions:read' || frontendPermission === 'form_submissions:view' || 
      frontendPermission === 'submissions:read' || frontendPermission === 'submissions:view' ||
      frontendPermission === 'FORM_SUBMISSIONS:read' || frontendPermission === 'FORM_SUBMISSIONS:READ') {
    return backendPermissions['VIEW_SUBMISSIONS'] === true || 
           backendPermissions['VIEW_FORM_SUBMISSIONS'] === true ||
           backendPermissions['MANAGE_SUBMISSIONS'] === true ||
           backendPermissions['MANAGE_FORM_SUBMISSIONS'] === true;
  }
  
  if (frontendPermission === 'form_submissions:create' || frontendPermission === 'submissions:create' ||
      frontendPermission === 'FORM_SUBMISSIONS:create' || frontendPermission === 'FORM_SUBMISSIONS:CREATE') {
    return backendPermissions['CREATE_FORM_SUBMISSIONS'] === true ||
           backendPermissions['MANAGE_SUBMISSIONS'] === true ||
           backendPermissions['MANAGE_FORM_SUBMISSIONS'] === true;
  }
  
  if (frontendPermission === 'form_submissions:update' || frontendPermission === 'form_submissions:edit' ||
      frontendPermission === 'submissions:update' || frontendPermission === 'submissions:edit' ||
      frontendPermission === 'FORM_SUBMISSIONS:update' || frontendPermission === 'FORM_SUBMISSIONS:UPDATE') {
    return backendPermissions['EDIT_FORM_SUBMISSIONS'] === true ||
           backendPermissions['MANAGE_SUBMISSIONS'] === true ||
           backendPermissions['MANAGE_FORM_SUBMISSIONS'] === true;
  }
  
  if (frontendPermission === 'form_submissions:delete' || frontendPermission === 'submissions:delete' ||
      frontendPermission === 'FORM_SUBMISSIONS:delete' || frontendPermission === 'FORM_SUBMISSIONS:DELETE') {
    return backendPermissions['DELETE_FORM_SUBMISSIONS'] === true ||
           backendPermissions['MANAGE_SUBMISSIONS'] === true ||
           backendPermissions['MANAGE_FORM_SUBMISSIONS'] === true;
  }
  
  if (frontendPermission === 'form_submissions:export' || frontendPermission === 'submissions:export' ||
      frontendPermission === 'FORM_SUBMISSIONS:export' || frontendPermission === 'FORM_SUBMISSIONS:EXPORT') {
    return backendPermissions['EXPORT_SUBMISSIONS'] === true || 
           backendPermissions['EXPORT_FORM_SUBMISSIONS'] === true ||
           backendPermissions['MANAGE_SUBMISSIONS'] === true ||
           backendPermissions['MANAGE_FORM_SUBMISSIONS'] === true;
  }

  // Gestione speciale per permessi companies
  if (frontendPermission === 'companies:read' || frontendPermission === 'companies:view') {
    return backendPermissions['VIEW_COMPANIES'] === true || 
           backendPermissions['companies:read'] === true ||
           backendPermissions['companies:view'] === true ||
           backendPermissions['companies.view'] === true ||  // Formato con punto
           backendPermissions['companies.read'] === true;    // Formato con punto
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
      // Caso speciale per MANAGE_PUBLIC_CONTENT -> PUBLIC_CMS
      else if (backendKey === 'MANAGE_PUBLIC_CONTENT') {
        frontendPermissions['PUBLIC_CMS:READ'] = true;
        frontendPermissions['PUBLIC_CMS:CREATE'] = true;
        frontendPermissions['PUBLIC_CMS:UPDATE'] = true;
        frontendPermissions['PUBLIC_CMS:DELETE'] = true;
        frontendPermissions['PUBLIC_CMS:read'] = true;
        frontendPermissions['PUBLIC_CMS:create'] = true;
        frontendPermissions['PUBLIC_CMS:update'] = true;
        frontendPermissions['PUBLIC_CMS:delete'] = true;
      }
      // Casi speciali per permessi CMS specifici
      else if (backendKey === 'VIEW_CMS') {
        frontendPermissions['PUBLIC_CMS:READ'] = true;
        frontendPermissions['PUBLIC_CMS:read'] = true;
      }
      else if (backendKey === 'CREATE_CMS') {
        frontendPermissions['PUBLIC_CMS:CREATE'] = true;
        frontendPermissions['PUBLIC_CMS:create'] = true;
      }
      else if (backendKey === 'EDIT_CMS') {
        frontendPermissions['PUBLIC_CMS:UPDATE'] = true;
        frontendPermissions['PUBLIC_CMS:update'] = true;
      }
      else if (backendKey === 'DELETE_CMS') {
        frontendPermissions['PUBLIC_CMS:DELETE'] = true;
        frontendPermissions['PUBLIC_CMS:delete'] = true;
      }
      else if (backendKey === 'READ_PUBLIC_CONTENT') {
        frontendPermissions['PUBLIC_CMS:READ'] = true;
        frontendPermissions['PUBLIC_CMS:read'] = true;
      }
      // Permessi PUBLIC_CMS specifici
      else if (backendKey === 'VIEW_PUBLIC_CMS') {
        frontendPermissions['PUBLIC_CMS:READ'] = true;
        frontendPermissions['PUBLIC_CMS:read'] = true;
      }
      else if (backendKey === 'CREATE_PUBLIC_CMS') {
        frontendPermissions['PUBLIC_CMS:CREATE'] = true;
        frontendPermissions['PUBLIC_CMS:create'] = true;
      }
      else if (backendKey === 'EDIT_PUBLIC_CMS') {
        frontendPermissions['PUBLIC_CMS:UPDATE'] = true;
        frontendPermissions['PUBLIC_CMS:update'] = true;
      }
      else if (backendKey === 'DELETE_PUBLIC_CMS') {
        frontendPermissions['PUBLIC_CMS:DELETE'] = true;
        frontendPermissions['PUBLIC_CMS:delete'] = true;
      }
      else if (backendKey === 'MANAGE_PUBLIC_CMS') {
        frontendPermissions['PUBLIC_CMS:READ'] = true;
        frontendPermissions['PUBLIC_CMS:read'] = true;
        frontendPermissions['PUBLIC_CMS:CREATE'] = true;
        frontendPermissions['PUBLIC_CMS:create'] = true;
        frontendPermissions['PUBLIC_CMS:UPDATE'] = true;
        frontendPermissions['PUBLIC_CMS:update'] = true;
        frontendPermissions['PUBLIC_CMS:DELETE'] = true;
        frontendPermissions['PUBLIC_CMS:delete'] = true;
      }
      // Casi speciali per permessi FORM_TEMPLATES
      else if (backendKey === 'VIEW_FORM_TEMPLATES') {
        frontendPermissions['form_templates:read'] = true;
        frontendPermissions['form_templates:view'] = true;
      }
      else if (backendKey === 'CREATE_FORM_TEMPLATES') {
        frontendPermissions['form_templates:create'] = true;
      }
      else if (backendKey === 'EDIT_FORM_TEMPLATES') {
        frontendPermissions['form_templates:edit'] = true;
        frontendPermissions['form_templates:update'] = true;
      }
      else if (backendKey === 'DELETE_FORM_TEMPLATES') {
        frontendPermissions['form_templates:delete'] = true;
      }
      else if (backendKey === 'MANAGE_FORM_TEMPLATES') {
        frontendPermissions['form_templates:read'] = true;
        frontendPermissions['form_templates:view'] = true;
        frontendPermissions['form_templates:create'] = true;
        frontendPermissions['form_templates:edit'] = true;
        frontendPermissions['form_templates:update'] = true;
        frontendPermissions['form_templates:delete'] = true;
      }
      // Casi speciali per permessi FORM_SUBMISSIONS
      else if (backendKey === 'VIEW_SUBMISSIONS') {
        frontendPermissions['form_submissions:read'] = true;
        frontendPermissions['form_submissions:view'] = true;
        frontendPermissions['submissions:read'] = true;
        frontendPermissions['submissions:view'] = true;
      }
      else if (backendKey === 'MANAGE_SUBMISSIONS') {
        frontendPermissions['form_submissions:read'] = true;
        frontendPermissions['form_submissions:view'] = true;
        frontendPermissions['form_submissions:create'] = true;
        frontendPermissions['form_submissions:edit'] = true;
        frontendPermissions['form_submissions:update'] = true;
        frontendPermissions['form_submissions:delete'] = true;
        frontendPermissions['submissions:read'] = true;
        frontendPermissions['submissions:view'] = true;
        frontendPermissions['submissions:create'] = true;
        frontendPermissions['submissions:edit'] = true;
        frontendPermissions['submissions:update'] = true;
        frontendPermissions['submissions:delete'] = true;
      }
      else if (backendKey === 'EXPORT_SUBMISSIONS') {
        frontendPermissions['form_submissions:export'] = true;
        frontendPermissions['submissions:export'] = true;
      }
      // Casi speciali per permessi FORM_SUBMISSIONS con formato completo
      else if (backendKey === 'VIEW_FORM_SUBMISSIONS') {
        frontendPermissions['form_submissions:read'] = true;
        frontendPermissions['form_submissions:view'] = true;
        frontendPermissions['submissions:read'] = true;
        frontendPermissions['submissions:view'] = true;
      }
      else if (backendKey === 'CREATE_FORM_SUBMISSIONS') {
        frontendPermissions['form_submissions:create'] = true;
        frontendPermissions['submissions:create'] = true;
      }
      else if (backendKey === 'EDIT_FORM_SUBMISSIONS') {
        frontendPermissions['form_submissions:edit'] = true;
        frontendPermissions['form_submissions:update'] = true;
        frontendPermissions['submissions:edit'] = true;
        frontendPermissions['submissions:update'] = true;
      }
      else if (backendKey === 'DELETE_FORM_SUBMISSIONS') {
        frontendPermissions['form_submissions:delete'] = true;
        frontendPermissions['submissions:delete'] = true;
      }
      else if (backendKey === 'MANAGE_FORM_SUBMISSIONS') {
        frontendPermissions['form_submissions:read'] = true;
        frontendPermissions['form_submissions:view'] = true;
        frontendPermissions['form_submissions:create'] = true;
        frontendPermissions['form_submissions:edit'] = true;
        frontendPermissions['form_submissions:update'] = true;
        frontendPermissions['form_submissions:delete'] = true;
        frontendPermissions['submissions:read'] = true;
        frontendPermissions['submissions:view'] = true;
        frontendPermissions['submissions:create'] = true;
        frontendPermissions['submissions:edit'] = true;
        frontendPermissions['submissions:update'] = true;
        frontendPermissions['submissions:delete'] = true;
      }
      else if (backendKey === 'EXPORT_FORM_SUBMISSIONS') {
        frontendPermissions['form_submissions:export'] = true;
        frontendPermissions['submissions:export'] = true;
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
      // Casi speciali per permessi dashboard
      else if (backendKey === 'VIEW_DASHBOARD' || backendKey === 'dashboard:read' || backendKey === 'dashboard:view' || backendKey === 'dashboard.view' || backendKey === 'dashboard.read') {
        frontendPermissions['dashboard:read'] = true;
        frontendPermissions['dashboard:view'] = true;
      }
      // Gestione formato con punto per companies
      else if (backendKey === 'companies.view' || backendKey === 'companies.read') {
        frontendPermissions['companies:read'] = true;
        frontendPermissions['companies:view'] = true;
      }
      else if (backendKey === 'companies.create') {
        frontendPermissions['companies:create'] = true;
      }
      else if (backendKey === 'companies.edit' || backendKey === 'companies.update') {
        frontendPermissions['companies:edit'] = true;
        frontendPermissions['companies:update'] = true;
      }
      else if (backendKey === 'companies.delete') {
        frontendPermissions['companies:delete'] = true;
      }
      else if (backendKey === 'companies.manage') {
         frontendPermissions['companies:manage'] = true;
         frontendPermissions['companies:read'] = true;
         frontendPermissions['companies:view'] = true;
         frontendPermissions['companies:create'] = true;
         frontendPermissions['companies:edit'] = true;
         frontendPermissions['companies:update'] = true;
         frontendPermissions['companies:delete'] = true;
       }
       // Gestione formato con punto per persons
       else if (backendKey === 'persons.view' || backendKey === 'persons.read') {
         frontendPermissions['persons:read'] = true;
         frontendPermissions['persons:view'] = true;
       }
       else if (backendKey === 'persons.create') {
         frontendPermissions['persons:create'] = true;
       }
       else if (backendKey === 'persons.edit' || backendKey === 'persons.update') {
         frontendPermissions['persons:edit'] = true;
         frontendPermissions['persons:update'] = true;
       }
       else if (backendKey === 'persons.delete') {
         frontendPermissions['persons:delete'] = true;
       }
       else if (backendKey === 'persons.manage') {
         frontendPermissions['persons:manage'] = true;
         frontendPermissions['persons:read'] = true;
         frontendPermissions['persons:view'] = true;
         frontendPermissions['persons:create'] = true;
         frontendPermissions['persons:edit'] = true;
         frontendPermissions['persons:update'] = true;
         frontendPermissions['persons:delete'] = true;
       }
       else if (backendKey === 'persons.view_employees') {
         frontendPermissions['persons:view_employees'] = true;
         frontendPermissions['employees:read'] = true;
         frontendPermissions['employees:view'] = true;
       }
       else if (backendKey === 'persons.view_trainers') {
         frontendPermissions['persons:view_trainers'] = true;
         frontendPermissions['trainers:read'] = true;
         frontendPermissions['trainers:view'] = true;
       }
    }
  });
  
  return frontendPermissions;
};