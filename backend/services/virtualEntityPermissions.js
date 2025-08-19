/**
 * Servizio per la gestione dei permessi su entità virtuali
 * Gestisce i permessi CRUD per Dipendenti e Formatori come entità virtuali basate su Person
 */

import { logger } from '../utils/logger.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Definizione delle entità virtuali e i loro filtri
 */
export const VIRTUAL_ENTITIES = {
  EMPLOYEES: {
    name: 'employees',
    displayName: 'Dipendenti',
    description: 'Person con ruolo Responsabile Aziendale o gerarchicamente inferiore sullo stesso ramo',
    baseEntity: 'Person',
    roleFilter: {
      // Ruoli che definiscono un "Dipendente"
      roleTypes: ['COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'TRAINER_COORDINATOR', 'SENIOR_TRAINER', 'TRAINER', 'EMPLOYEE'],
      minLevel: 2, // COMPANY_ADMIN
      maxLevel: 8  // EMPLOYEE
    },
    permissions: {
      VIEW: 'VIEW_EMPLOYEES',
      CREATE: 'CREATE_EMPLOYEES', 
      EDIT: 'EDIT_EMPLOYEES',
      DELETE: 'DELETE_EMPLOYEES'
    }
  },
  TRAINERS: {
    name: 'trainers',
    displayName: 'Formatori',
    description: 'Person con ruolo Coordinatore Formatori o gerarchicamente inferiore sullo stesso ramo',
    baseEntity: 'Person',
    roleFilter: {
      // Ruoli che definiscono un "Formatore"
      roleTypes: ['TRAINER_COORDINATOR', 'SENIOR_TRAINER', 'TRAINER', 'EXTERNAL_TRAINER'],
      minLevel: 4, // TRAINER_COORDINATOR
      maxLevel: 7  // TRAINER/EXTERNAL_TRAINER
    },
    permissions: {
      VIEW: 'VIEW_TRAINERS',
      CREATE: 'CREATE_TRAINERS',
      EDIT: 'EDIT_TRAINERS', 
      DELETE: 'DELETE_TRAINERS'
    }
  }
};

/**
 * Gerarchia dei ruoli con livelli
 */
const ROLE_HIERARCHY = {
  'SUPER_ADMIN': 0,
  'ADMIN': 1,
  'COMPANY_ADMIN': 2,
  'TENANT_ADMIN': 2,
  'TRAINING_ADMIN': 3,
  'CLINIC_ADMIN': 3,
  'HR_MANAGER': 4,
  'MANAGER': 4,
  'DEPARTMENT_HEAD': 4,
  'TRAINER_COORDINATOR': 5,
  'COMPANY_MANAGER': 5,
  'SENIOR_TRAINER': 6,
  'SUPERVISOR': 5,
  'COORDINATOR': 6,
  'TRAINER': 7,
  'EXTERNAL_TRAINER': 7,
  'OPERATOR': 7,
  'EMPLOYEE': 8,
  'VIEWER': 9,
  'GUEST': 10
};

/**
 * Verifica se una persona rientra nella definizione di un'entità virtuale
 */
export async function isPersonInVirtualEntity(personId, virtualEntityName) {
  try {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        personRoles: {
          where: { 
            isActive: true,
            deletedAt: null 
          }
        }
      }
    });

    if (!person || person.deletedAt) {
      return false;
    }

    const virtualEntity = VIRTUAL_ENTITIES[virtualEntityName.toUpperCase()];
    if (!virtualEntity) {
      return false;
    }

    // Verifica se la persona ha almeno un ruolo che rientra nella definizione dell'entità virtuale
    return person.personRoles.some(role => {
      const roleLevel = ROLE_HIERARCHY[role.roleType];
      return roleLevel !== undefined && 
             roleLevel >= virtualEntity.roleFilter.minLevel && 
             roleLevel <= virtualEntity.roleFilter.maxLevel &&
             virtualEntity.roleFilter.roleTypes.includes(role.roleType);
    });
  } catch (error) {
    logger.error('Errore nella verifica entità virtuale:', error);
    return false;
  }
}

/**
 * Ottiene tutte le persone che rientrano in un'entità virtuale
 */
export async function getPersonsInVirtualEntity(virtualEntityName, tenantId, companyId = null) {
  try {
    const virtualEntity = VIRTUAL_ENTITIES[virtualEntityName.toUpperCase()];
    if (!virtualEntity) {
      throw new Error(`Entità virtuale ${virtualEntityName} non trovata`);
    }

    const whereClause = {
      deletedAt: null,
      tenantId: tenantId
    };

    if (companyId) {
      whereClause.companyId = companyId;
    }

    const persons = await prisma.person.findMany({
      where: whereClause,
      include: {
        personRoles: {
          where: { 
            isActive: true,
            deletedAt: null 
          }
        },
        company: true
      }
    });

    // Filtra le persone che rientrano nella definizione dell'entità virtuale
    const filteredPersons = persons.filter(person => {
      const hasMatchingRole = person.personRoles.some(role => {
        const roleLevel = ROLE_HIERARCHY[role.roleType];
        const isValidLevel = roleLevel !== undefined && 
               roleLevel >= virtualEntity.roleFilter.minLevel && 
               roleLevel <= virtualEntity.roleFilter.maxLevel;
        const isValidRoleType = virtualEntity.roleFilter.roleTypes.includes(role.roleType);
        
        return isValidLevel && isValidRoleType;
      });
      
      return hasMatchingRole;
    });
    
    return filteredPersons;
  } catch (error) {
    logger.error('Errore nel recupero persone entità virtuale:', error);
    throw error;
  }
}

/**
 * Verifica se un utente ha un permesso specifico su un'entità virtuale
 */
export async function hasVirtualEntityPermission(userId, virtualEntityName, action, tenantId) {
  try {
    logger.info(`🔍 Verifica permesso entità virtuale: userId=${userId}, entity=${virtualEntityName}, action=${action}, tenantId=${tenantId}`);
    
    const virtualEntity = VIRTUAL_ENTITIES[virtualEntityName.toUpperCase()];
    if (!virtualEntity) {
      logger.warn(`❌ Entità virtuale non trovata: ${virtualEntityName}`);
      return false;
    }

    const requiredPermission = virtualEntity.permissions[action.toUpperCase()];
    if (!requiredPermission) {
      logger.warn(`❌ Azione non valida: ${action} per entità ${virtualEntityName}`);
      return false;
    }

    logger.info(`🔍 Permesso richiesto: ${requiredPermission}`);

    // Verifica se l'utente ha il permesso diretto sull'entità virtuale
    const hasDirectPermission = await hasUserPermission(userId, requiredPermission, tenantId);
    logger.info(`🔍 Permesso diretto (${requiredPermission}): ${hasDirectPermission}`);
    if (hasDirectPermission) {
      return true;
    }

    // NOTA: Rimuovo la verifica del permesso in formato moderno perché non esiste nell'enum PersonPermission
    // const modernPermissionFormat = `${virtualEntityName.toLowerCase()}:${action.toLowerCase()}`;
    // const hasModernPermission = await hasUserPermission(userId, modernPermissionFormat, tenantId);
    // logger.info(`🔍 Permesso moderno (${modernPermissionFormat}): ${hasModernPermission}`);
    // if (hasModernPermission) {
    //   return true;
    // }

    // Verifica se l'utente ha permessi su Person (che automaticamente danno accesso alle entità virtuali)
    // I permessi su Person sono VIEW_EMPLOYEES, CREATE_EMPLOYEES, ecc. per compatibilità storica
    const personPermissions = {
      VIEW: 'VIEW_EMPLOYEES',
      CREATE: 'CREATE_EMPLOYEES',
      EDIT: 'EDIT_EMPLOYEES',
      DELETE: 'DELETE_EMPLOYEES'
    };

    const personPermission = personPermissions[action.toUpperCase()];
    if (personPermission) {
      const hasPersonPermission = await hasUserPermission(userId, personPermission, tenantId);
      logger.info(`🔍 Permesso person (${personPermission}): ${hasPersonPermission}`);
      if (hasPersonPermission) {
        return true;
      }
      
      // Verifica anche i permessi generici su Person
      const genericPersonPermissions = {
        VIEW: 'VIEW_PERSONS',
        CREATE: 'CREATE_PERSONS',
        EDIT: 'EDIT_PERSONS',
        DELETE: 'DELETE_PERSONS'
      };
      
      const genericPersonPermission = genericPersonPermissions[action.toUpperCase()];
      if (genericPersonPermission) {
        const hasGenericPermission = await hasUserPermission(userId, genericPersonPermission, tenantId);
        logger.info(`🔍 Permesso generico person (${genericPersonPermission}): ${hasGenericPermission}`);
        return hasGenericPermission;
      }
    }

    logger.warn(`❌ Nessun permesso trovato per userId=${userId}, entity=${virtualEntityName}, action=${action}`);
    return false;
  } catch (error) {
    logger.error('Errore nella verifica permessi entità virtuale:', error);
    return false;
  }
}

/**
 * Verifica se un utente ha un permesso specifico
 */
async function hasUserPermission(userId, permission, tenantId, req = null) {
  try {
    // Prima verifica se l'utente è admin (bypass completo)
    const person = await prisma.person.findUnique({
      where: { id: userId },
      include: {
        personRoles: {
          where: { 
            isActive: true,
            deletedAt: null,
            tenantId: tenantId
          },
          include: {
            permissions: {
              where: {
                permission: permission,
                isGranted: true
              }
            }
          }
        }
      }
    });

    if (!person) {
      return false;
    }

    // Verifica se è admin (bypass completo per admin)
    const roles = person.personRoles.map(pr => pr.roleType);
    if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) {
      logger.info(`Admin bypass per permesso ${permission} per utente ${userId}`);
      return true;
    }

    // Verifica se ha il permesso attraverso i suoi ruoli nella tabella permissions
    const hasRolePermission = person.personRoles.some(role => 
      role.permissions.some(perm => perm.permission === permission && perm.isGranted)
    );

    if (hasRolePermission) {
      return true;
    }

    // Fallback: verifica i permessi moderni per admin
    // Gli admin hanno tutti i permessi in formato moderno (es. employees:view)
    if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) {
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Errore nella verifica permesso utente:', error);
    return false;
  }
}

/**
 * Assegna permessi su entità virtuali a un ruolo
 */
export async function assignVirtualEntityPermissions(roleId, virtualEntityName, permissions, grantedBy) {
  try {
    const virtualEntity = VIRTUAL_ENTITIES[virtualEntityName.toUpperCase()];
    if (!virtualEntity) {
      throw new Error(`Entità virtuale ${virtualEntityName} non trovata`);
    }

    const permissionsToCreate = [];

    for (const action of permissions) {
      const permission = virtualEntity.permissions[action.toUpperCase()];
      if (permission) {
        permissionsToCreate.push({
          personRoleId: roleId,
          permission: permission,
          isGranted: true,
          grantedBy: grantedBy,
          grantedAt: new Date()
        });
      }
    }

    if (permissionsToCreate.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionsToCreate,
        skipDuplicates: true
      });
    }

    logger.info(`Permessi entità virtuale ${virtualEntityName} assegnati al ruolo ${roleId}`);
    return true;
  } catch (error) {
    logger.error('Errore nell\'assegnazione permessi entità virtuale:', error);
    throw error;
  }
}

/**
 * Rimuove permessi su entità virtuali da un ruolo
 */
export async function revokeVirtualEntityPermissions(roleId, virtualEntityName, permissions) {
  try {
    const virtualEntity = VIRTUAL_ENTITIES[virtualEntityName.toUpperCase()];
    if (!virtualEntity) {
      throw new Error(`Entità virtuale ${virtualEntityName} non trovata`);
    }

    const permissionsToRevoke = permissions.map(action => 
      virtualEntity.permissions[action.toUpperCase()]
    ).filter(Boolean);

    if (permissionsToRevoke.length > 0) {
      await prisma.rolePermission.deleteMany({
        where: {
          personRoleId: roleId,
          permission: {
            in: permissionsToRevoke
          }
        }
      });
    }

    logger.info(`Permessi entità virtuale ${virtualEntityName} rimossi dal ruolo ${roleId}`);
    return true;
  } catch (error) {
    logger.error('Errore nella rimozione permessi entità virtuale:', error);
    throw error;
  }
}

/**
 * Ottiene tutti i permessi di un ruolo su entità virtuali
 */
export async function getRoleVirtualEntityPermissions(roleId) {
  try {
    const permissions = await prisma.rolePermission.findMany({
      where: {
        personRoleId: roleId,
        isGranted: true,
        permission: {
          in: [
            ...Object.values(VIRTUAL_ENTITIES.EMPLOYEES.permissions),
            ...Object.values(VIRTUAL_ENTITIES.TRAINERS.permissions)
          ]
        }
      }
    });

    const result = {
      employees: [],
      trainers: []
    };

    permissions.forEach(perm => {
      // Determina a quale entità virtuale appartiene il permesso
      if (Object.values(VIRTUAL_ENTITIES.EMPLOYEES.permissions).includes(perm.permission)) {
        const action = Object.keys(VIRTUAL_ENTITIES.EMPLOYEES.permissions)
          .find(key => VIRTUAL_ENTITIES.EMPLOYEES.permissions[key] === perm.permission);
        if (action) {
          result.employees.push(action.toLowerCase());
        }
      }
      
      if (Object.values(VIRTUAL_ENTITIES.TRAINERS.permissions).includes(perm.permission)) {
        const action = Object.keys(VIRTUAL_ENTITIES.TRAINERS.permissions)
          .find(key => VIRTUAL_ENTITIES.TRAINERS.permissions[key] === perm.permission);
        if (action) {
          result.trainers.push(action.toLowerCase());
        }
      }
    });

    return result;
  } catch (error) {
    logger.error('Errore nel recupero permessi entità virtuali del ruolo:', error);
    throw error;
  }
}

export default {
  VIRTUAL_ENTITIES,
  isPersonInVirtualEntity,
  getPersonsInVirtualEntity,
  hasVirtualEntityPermission,
  assignVirtualEntityPermissions,
  revokeVirtualEntityPermissions,
  getRoleVirtualEntityPermissions
};