import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger.js';
import { ROLE_TYPES, ROLE_SCOPES, getDefaultPermissions } from '../utils/RoleTypes.js';
import { getUserRoles } from '../core/RoleCore.js';

const prisma = new PrismaClient();

/**
 * Gestione avanzata dei permessi e verifiche di accesso
 * Modulo estratto da EnhancedRoleService per migliorare la manutenibilità
 */

/**
 * Verifica se un utente ha una specifica permission
 */
export async function hasPermission(personId, permission, context = {}) {
  try {
    const { tenantId, companyId, resourceId } = context;

    // OTTIMIZZAZIONE: Query semplificata per ottenere i ruoli dell'utente
    const userRoles = await prisma.personRole.findMany({
      where: {
        personId,
        isActive: true,
        OR: [
          { validUntil: null },
          { validUntil: { gt: new Date() } }
        ]
      },
      select: {
        roleType: true,
        companyId: true,
        tenantId: true
      }
    });

    // Verifica se l'utente è super admin o admin
    const hasGlobalAdmin = userRoles.some(role => 
      role.roleType === ROLE_TYPES.SUPER_ADMIN ||
      role.roleType === ROLE_TYPES.ADMIN
    );

    if (hasGlobalAdmin) {
      return true;
    }

    // Verifica i permessi di default per i ruoli di sistema
    for (const role of userRoles) {
      const defaultPermissions = getDefaultPermissions(role.roleType);
      
      if (defaultPermissions.includes(permission)) {
        // Verifica il contesto se necessario
        if (role.companyId && companyId) {
          if (role.companyId === companyId) {
            return true;
          }
        } else if (role.tenantId && tenantId) {
          if (role.tenantId === tenantId) {
            return true;
          }
        } else {
          // Per ruoli senza scope specifico, concedi il permesso
          return true;
        }
      }
    }

    // Solo se necessario, fai query più complesse
    if (permission.includes('_')) {
      const parts = permission.split('_');
      const action = parts.length >= 2 ? parts[0].toLowerCase() : null;
      const resource = parts.length >= 2 ? parts.slice(1).join('_').toLowerCase() : null;

      if (action && resource) {
        // Query ottimizzata per permessi specifici
        const specificPermissions = await prisma.rolePermission.findMany({
          where: {
            permission: permission,
            isGranted: true,
            personRole: {
              personId,
              isActive: true,
              OR: [
                { validUntil: null },
                { validUntil: { gt: new Date() } }
              ]
            }
          },
          take: 1 // Basta trovarne uno
        });

        if (specificPermissions.length > 0) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    logger.error('[PERMISSION_CHECKER] Error checking permission:', error);
    return false;
  }
}

/**
 * Ottiene tutte le permissions di un utente
 */
export async function getUserPermissions(personId, tenantId = null) {
  try {
    const userRoles = await getUserRoles(personId, tenantId);
    const allPermissions = new Set();

    // Aggiungi i permessi di default per i ruoli di sistema
    userRoles.forEach(role => {
      const defaultPermissions = getDefaultPermissions(role.roleType);
      defaultPermissions.forEach(permission => allPermissions.add(permission));
    });

    // Aggiungi i permessi specifici dal database (RolePermission)
    const personRoles = await prisma.personRole.findMany({
      where: {
        personId,
        tenantId,
        isActive: true,
        OR: [
          { validUntil: null },
          { validUntil: { gt: new Date() } }
        ]
      },
      include: {
        permissions: {
          where: {
            isGranted: true
          }
        },
        advancedPermissions: true
      }
    });

    // Aggiungi permessi base (RolePermission)
    personRoles.forEach(personRole => {
      personRole.permissions.forEach(rolePerm => {
        allPermissions.add(rolePerm.permission);
      });
    });

    // Aggiungi permessi avanzati (AdvancedPermission) - convertiti in formato standard
    personRoles.forEach(personRole => {
      personRole.advancedPermissions.forEach(advPerm => {
        const permission = `${advPerm.action.toUpperCase()}_${advPerm.resource.toUpperCase()}`;
        allPermissions.add(permission);
      });
    });

    // Aggiungi permessi da ruoli personalizzati (CustomRole)
    const customRoles = await prisma.customRole.findMany({
      where: {
        tenantId,
        deletedAt: null
      },
      include: {
        permissions: true
      }
    });

    // Verifica se l'utente ha ruoli personalizzati e aggiungi i loro permessi
    customRoles.forEach(customRole => {
      const hasCustomRole = userRoles.some(role => 
        role.roleType === `CUSTOM_${customRole.id}`
      );
      
      if (hasCustomRole) {
        customRole.permissions.forEach(customPerm => {
          allPermissions.add(customPerm.permission);
        });
      }
    });

    return Array.from(allPermissions);
  } catch (error) {
    logger.error('[PERMISSION_CHECKER] Error getting user permissions:', error);
    throw error;
  }
}

/**
 * Ottiene i permessi avanzati per un utente su una risorsa specifica
 */
export async function getAdvancedPermissions(personId, resource, action, tenantId) {
  try {
    const userRoles = await prisma.personRole.findMany({
      where: {
        personId,
        tenantId,
        isActive: true,
        OR: [
          { validUntil: null },
          { validUntil: { gt: new Date() } }
        ]
      },
      include: {
        advancedPermissions: {
          where: {
            resource,
            action
          }
        }
      }
    });

    const permissions = [];
    userRoles.forEach(role => {
      role.advancedPermissions.forEach(permission => {
        permissions.push({
          roleType: role.roleType,
          scope: permission.scope,
          allowedFields: permission.allowedFields,
          conditions: permission.conditions
        });
      });
    });

    return permissions;
  } catch (error) {
    logger.error('[PERMISSION_CHECKER] Error getting advanced permissions:', error);
    throw error;
  }
}

/**
 * Verifica se un utente può accedere a una risorsa specifica con condizioni
 */
export async function canAccessResource(personId, resource, resourceId, action, tenantId) {
  try {
    const permissions = await getAdvancedPermissions(personId, resource, action, tenantId);
    
    if (permissions.length === 0) {
      return await hasPermission(personId, `${resource}.${action}`, { tenantId });
    }

    // Verifica le condizioni specifiche
    for (const permission of permissions) {
      if (permission.scope === 'global') {
        return true;
      }
      
      if (permission.conditions) {
        const conditionsMet = await evaluateConditions(
          permission.conditions, 
          personId, 
          resourceId, 
          tenantId
        );
        if (conditionsMet) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    logger.error('[PERMISSION_CHECKER] Error checking resource access:', error);
    return false;
  }
}

/**
 * Valuta le condizioni per l'accesso a una risorsa
 */
export async function evaluateConditions(conditions, personId, resourceId, tenantId) {
  try {
    if (!conditions || typeof conditions !== 'object') {
      return true;
    }

    // Esempio di condizioni supportate:
    // { "ownedBy": "self" } - può accedere solo alle proprie risorse
    // { "companyId": "same" } - può accedere solo alle risorse della stessa azienda
    // { "departmentId": "same" } - può accedere solo alle risorse dello stesso dipartimento

    if (conditions.ownedBy === 'self') {
      // Verifica che la risorsa appartenga all'utente
      return resourceId === personId;
    }

    if (conditions.companyId === 'same') {
      // Ottieni entrambe le informazioni con una singola query ottimizzata
      const [userPerson, resourcePerson] = await Promise.all([
        prisma.person.findUnique({
          where: { id: personId },
          select: { companyId: true }
        }),
        prisma.person.findUnique({
          where: { id: resourceId },
          select: { companyId: true }
        })
      ]);
      
      return userPerson?.companyId === resourcePerson?.companyId;
    }

    return true;
  } catch (error) {
    logger.error('[PERMISSION_CHECKER] Error evaluating conditions:', error);
    return false;
  }
}

/**
 * Filtra i dati in base ai permessi avanzati dell'utente
 */
export async function filterDataByPermissions(personId, resource, action, data, tenantId) {
  try {
    // BYPASS TEMPORANEO: Verifica se l'utente è admin
    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: { 
        globalRole: true,
        email: true,
        personRoles: {
          where: { isActive: true },
          select: { roleType: true }
        }
      }
    });

    // Se è admin o super admin, restituisci tutti i dati
    if (person?.globalRole === 'ADMIN' || person?.globalRole === 'SUPER_ADMIN' ||
        person?.personRoles?.some(role => role.roleType === 'ADMIN' || role.roleType === 'SUPER_ADMIN')) {
      return data;
    }

    const permissions = await getAdvancedPermissions(personId, resource, action, tenantId);
    
    if (permissions.length === 0) {
      // Nessun permesso avanzato, restituisci i dati completi se ha il permesso base
      // Converte il formato resource.action in ACTION_RESOURCE (es. employees.view -> VIEW_EMPLOYEES)
      const permissionName = `${action.toUpperCase()}_${resource.toUpperCase()}`;
      const hasBasicPermission = await hasPermission(personId, permissionName, { tenantId });
      return hasBasicPermission ? data : null;
    }

    // Combina tutti i permessi per determinare i campi accessibili
    const allowedFields = new Set();
    let hasGlobalAccess = false;

    permissions.forEach(permission => {
      if (permission.scope === 'global' || permission.scope === 'tenant') {
        hasGlobalAccess = true;
      }
      
      if (permission.allowedFields && Array.isArray(permission.allowedFields)) {
        permission.allowedFields.forEach(field => allowedFields.add(field));
      }
    });

    // Se ha accesso globale e nessun campo è specificato, restituisci tutto
    if (hasGlobalAccess && allowedFields.size === 0) {
      return data;
    }

    // Filtra i dati in base ai campi consentiti
    if (Array.isArray(data)) {
      return data.map(item => filterObjectFields(item, allowedFields));
    } else if (typeof data === 'object' && data !== null) {
      return filterObjectFields(data, allowedFields);
    }

    return data;
  } catch (error) {
    logger.error('[PERMISSION_CHECKER] Error filtering data by permissions:', error);
    throw error;
  }
}

/**
 * Filtra i campi di un oggetto in base ai permessi
 */
export function filterObjectFields(obj, allowedFields) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const filtered = {};
  
  // Se non ci sono campi specificati, restituisci l'oggetto completo
  if (allowedFields.size === 0) {
    return obj;
  }

  // Filtra solo i campi consentiti
  allowedFields.forEach(field => {
    if (obj.hasOwnProperty(field)) {
      filtered[field] = obj[field];
    }
  });

  // Aggiungi sempre l'ID se presente
  if (obj.id && !filtered.id) {
    filtered.id = obj.id;
  }

  return filtered;
}

export default {
  hasPermission,
  getUserPermissions,
  getAdvancedPermissions,
  canAccessResource,
  evaluateConditions,
  filterDataByPermissions,
  filterObjectFields
};