/**
 * Utility per la mappatura dei permessi backend → frontend
 * 
 * Il backend invia permessi in formato resource:action (es. companies:read, clinica.visite:create)
 * Il frontend controlla tramite hasPermission(resource, action) in AuthContext.
 * 
 * Questa utility normalizza i permessi per garantire che tutti gli alias 
 * (read/view, edit/update) e le espansioni (manage, sub-resource) siano presenti.
 */

/**
 * Converte entity e action nel formato resource:action
 */
export const getPermissionKey = (entity: string, action: string): string => {
  if (!entity || !action) return 'unknown:unknown';
  return `${entity}:${action}`;
};

/**
 * Verifica se un permesso nel formato frontend esiste nei permessi backend
 */
export const hasBackendPermission = (
  frontendPermission: string,
  backendPermissions: Record<string, boolean>
): boolean => {
  if (backendPermissions[frontendPermission] === true) return true;

  // Controlla alias read/view, edit/update
  if (frontendPermission.includes(':')) {
    const [resource, action] = frontendPermission.split(':');
    const aliases: Record<string, string[]> = {
      'read': ['view'], 'view': ['read'],
      'edit': ['update'], 'update': ['edit'],
      'write': ['create', 'update', 'edit']
    };
    const alts = aliases[action];
    if (alts) {
      for (const alt of alts) {
        if (backendPermissions[`${resource}:${alt}`] === true) return true;
      }
    }

    // Controlla se ha manage (implica read/create/update/delete)
    if (['read', 'view', 'create', 'update', 'edit', 'delete'].includes(action)) {
      if (backendPermissions[`${resource}:manage`] === true) return true;
    }

    // Controlla wildcard *:*
    if (backendPermissions['*:*'] === true) return true;
    // Controlla resource:*
    if (backendPermissions[`${resource}:*`] === true) return true;
  }

  return false;
};

/**
 * Converte i permessi backend nel formato frontend normalizzato.
 * 
 * Il backend invia permessi in formato `resource:action`.
 * Questa funzione:
 * 1. Preserva tutti i permessi originali
 * 2. Genera alias (read↔view, edit↔update)
 * 3. Espande `manage` → read/create/update/delete
 * 4. Espande `*:*` → all:* 
 * 5. Per sub-risorse (cms.pages:read) genera anche il parent (cms:read)
 */
export const convertBackendToFrontendPermissions = (
  backendPermissions: Record<string, boolean>
): Record<string, boolean> => {
  const result: Record<string, boolean> = {};

  for (const [key, value] of Object.entries(backendPermissions)) {
    if (value !== true) continue;

    // Preserva il permesso originale
    result[key] = true;

    // Gestione wildcard *:*
    if (key === '*:*') {
      result['all:*'] = true;
      continue;
    }

    if (!key.includes(':')) continue;

    const colonIdx = key.indexOf(':');
    const resource = key.substring(0, colonIdx);
    const action = key.substring(colonIdx + 1);

    // Genera alias bidirezionali
    switch (action) {
      case 'read':
        result[`${resource}:view`] = true;
        break;
      case 'view':
        result[`${resource}:read`] = true;
        break;
      case 'edit':
        result[`${resource}:update`] = true;
        break;
      case 'update':
        result[`${resource}:edit`] = true;
        break;
    }

    // Espandi manage → CRUD
    if (action === 'manage') {
      result[`${resource}:read`] = true;
      result[`${resource}:view`] = true;
      result[`${resource}:create`] = true;
      result[`${resource}:update`] = true;
      result[`${resource}:edit`] = true;
      result[`${resource}:delete`] = true;
      result[`${resource}:write`] = true;
    }

    // Espandi write → create/update (coerenza con backend actionImplies)
    if (action === 'write') {
      result[`${resource}:create`] = true;
      result[`${resource}:update`] = true;
      result[`${resource}:edit`] = true;
    }

    // Per sub-risorse (es. cms.pages:read → anche cms:read e pages:read)
    if (resource.includes('.')) {
      const parentResource = resource.split('.')[0];
      const childResource = resource.split('.').slice(1).join('.');
      // Parent: clinica.visite:read → clinica:read
      result[`${parentResource}:${action}`] = true;
      // Child flat: clinica.visite:read → visite:read
      result[`${childResource}:${action}`] = true;
      // Alias anche per parent e child
      if (action === 'read') {
        result[`${parentResource}:view`] = true;
        result[`${childResource}:view`] = true;
      }
      if (action === 'view') {
        result[`${parentResource}:read`] = true;
        result[`${childResource}:read`] = true;
      }
      if (action === 'edit') {
        result[`${parentResource}:update`] = true;
        result[`${childResource}:update`] = true;
      }
      if (action === 'update') {
        result[`${parentResource}:edit`] = true;
        result[`${childResource}:edit`] = true;
      }
    }
  }

  return result;
};