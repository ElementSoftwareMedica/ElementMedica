/**
 * Servizio per la gestione dei permessi su entità virtuali
 * Gestisce i permessi CRUD per Dipendenti e Formatori come entità virtuali basate su Person
 */

import { logger } from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';
import { RBACService } from './RBACService.js';
import { matchPermission } from '../constants/permissions.js';


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
    const person = await prisma.person.findFirst({ // F228: findFirst+deletedAt
      where: { id: personId, deletedAt: null },
      include: {
        personRoles: {
          where: {
            isActive: true,
            deletedAt: null
          }
        }
      }
    });

    if (!person) {
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
 * P48: company è ora in tenantProfiles, non direttamente su Person
 * P63: Person.tenantId RIMOSSO - filter via tenantProfiles
 */
export async function getPersonsInVirtualEntity(virtualEntityName, tenantId, companyId = null) {
  try {
    const virtualEntity = VIRTUAL_ENTITIES[virtualEntityName.toUpperCase()];
    if (!virtualEntity) {
      throw new Error(`Entità virtuale ${virtualEntityName} non trovata`);
    }

    // P63: Person.tenantId REMOVED - always filter via tenantProfiles
    const whereClause = {
      deletedAt: null,
      tenantProfiles: {
        some: {
          tenantId: tenantId,
          deletedAt: null,
          isActive: true
        }
      }
    };

    // P48: companyId è ora in tenantProfiles
    if (companyId) {
      whereClause.tenantProfiles = {
        some: {
          tenantId: tenantId,
          companyId: companyId,
          deletedAt: null
        }
      };
    }

    const persons = await prisma.person.findMany({
      where: whereClause,
      include: {
        personRoles: {
          where: {
            isActive: true,
            deletedAt: null
          },
          include: { companyTenantProfile: true } // P49
        },
        // P48/P49: company è in tenantProfiles via companyTenantProfile
        tenantProfiles: {
          where: { deletedAt: null },
          include: { companyTenantProfile: true } // P49: company -> companyTenantProfile
        }
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

    // P48: Flatten tenantProfiles per backward compatibility
    // Estrae email, phone, status dal profilo tenant specifico al top-level
    const flattenedPersons = filteredPersons.map(person => {
      // Trova il profilo per il tenant corrente, o il primo profilo attivo
      const profile = person.tenantProfiles?.find(p => p.tenantId === tenantId && !p.deletedAt)
        || person.tenantProfiles?.[0]
        || {};

      // Estrai ruoli attivi
      const roles = person.personRoles?.map(r => r.roleType) || [];

      return {
        // Campi Person (globali, immutabili)
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        taxCode: person.taxCode,
        vatNumber: person.vatNumber,
        birthDate: person.birthDate,
        birthPlace: person.birthPlace,
        birthProvince: person.birthProvince,
        gender: person.gender,
        username: person.username,
        profileImage: person.profileImage,
        gdprConsentDate: person.gdprConsentDate,
        gdprConsentVersion: person.gdprConsentVersion,
        createdAt: person.createdAt,
        updatedAt: person.updatedAt,

        // P48: Campi da PersonTenantProfile (per-tenant, dinamici) - FLATTENED
        email: profile.email || null,
        phone: profile.phone || null,
        pec: profile.pec || null,
        status: profile.status || 'PENDING',
        title: profile.title || null,
        hiredDate: profile.hiredDate || null,
        endDate: profile.endDate || null,
        hourlyRate: profile.hourlyRate || null,
        monthlyRate: profile.monthlyRate || null,
        iban: profile.iban || null,
        residenceAddress: profile.residenceAddress || null,
        residenceCity: profile.residenceCity || null,
        postalCode: profile.postalCode || null,
        province: profile.province || null,
        companyTenantProfileId: profile.companyTenantProfileId || null,
        siteId: profile.siteId || null,
        repartoId: profile.repartoId || null,
        notes: profile.notes || null,

        // Relazioni
        personRoles: person.personRoles,
        tenantProfiles: person.tenantProfiles, // Mantieni per debug/compatibilità

        // P49: Company data via tenantProfile
        companyTenantProfile: profile.companyTenantProfile || null,

        // Ruoli flattened per backward compatibility
        globalRole: roles[0] || null,
        roles: roles,

        // P63: tenantId SOLO da PersonTenantProfile
        tenantId: profile.tenantId || tenantId
      };
    });

    return flattenedPersons;
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
    const virtualEntity = VIRTUAL_ENTITIES[virtualEntityName.toUpperCase()];
    if (!virtualEntity) {
      logger.warn('Virtual entity not found', { virtualEntityName });
      return false;
    }

    const requiredPermission = virtualEntity.permissions[action.toUpperCase()];
    if (!requiredPermission) {
      logger.warn('Invalid action for virtual entity', { action, virtualEntityName });
      return false;
    }

    // Verifica se l'utente ha il permesso diretto sull'entità virtuale
    const hasDirectPermission = await hasUserPermission(userId, requiredPermission, tenantId);
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
        return hasGenericPermission;
      }
    }

    logger.warn('Nessun permesso trovato per entità virtuale', { entity: virtualEntityName, action });
    return false;
  } catch (error) {
    logger.error('Errore nella verifica permessi entità virtuale:', error);
    return false;
  }
}

/**
 * Mappa permessi legacy (VIRTUAL_ENTITIES) a formato moderno (RBAC)
 */
const LEGACY_TO_MODERN = {
  'VIEW_EMPLOYEES': 'employees:read', 'CREATE_EMPLOYEES': 'employees:create',
  'EDIT_EMPLOYEES': 'employees:update', 'DELETE_EMPLOYEES': 'employees:delete',
  'VIEW_TRAINERS': 'trainers:read', 'CREATE_TRAINERS': 'trainers:create',
  'EDIT_TRAINERS': 'trainers:update', 'DELETE_TRAINERS': 'trainers:delete',
  'VIEW_PERSONS': 'persons:read', 'CREATE_PERSONS': 'persons:create',
  'EDIT_PERSONS': 'persons:update', 'DELETE_PERSONS': 'persons:delete'
};

/**
 * Verifica se un utente ha un permesso specifico
 * Usa il sistema RBAC unificato (defaults + DB) con matchPermission - nessun bypass per ruolo
 */
async function hasUserPermission(userId, permission, tenantId, req = null) {
  try {
    // 1. Verifica via RBAC Service (defaults da RoleTypes.js + DB RolePermission merge)
    //    Questo è il sistema primario: ogni ruolo ha i propri permessi definiti
    const rbacPermissions = await RBACService.getPersonPermissions(userId);
    if (rbacPermissions && typeof rbacPermissions === 'object') {
      // Converti il permesso legacy in formato moderno per il matching
      const modernPerm = LEGACY_TO_MODERN[permission] || permission;
      for (const userPerm of Object.keys(rbacPermissions)) {
        if (rbacPermissions[userPerm] === true && matchPermission(userPerm, modernPerm)) {
          return true;
        }
      }
    }

    // 2. Fallback: verifica DB RolePermission con il formato legacy originale
    //    Per casi dove i permessi sono stati assegnati manualmente nel DB
    const person = await prisma.person.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        personRoles: {
          where: { isActive: true, deletedAt: null, tenantId },
          include: {
            permissions: {
              where: { permission, isGranted: true }
            }
          }
        }
      }
    });

    if (!person) return false;

    return person.personRoles.some(role =>
      role.permissions.some(perm => perm.permission === permission && perm.isGranted)
    );
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
        deletedAt: null, // F253: exclude soft-deleted role permissions
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