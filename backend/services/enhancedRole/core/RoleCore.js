import prisma from '../../../config/prisma-optimization.js';
import { logger } from '../../../utils/logger.js';
import { ROLE_TYPES, ROLE_SCOPES } from '../utils/RoleTypes.js';


/**
 * Gestione delle operazioni CRUD sui ruoli
 * Modulo estratto da EnhancedRoleService per migliorare la manutenibilità
 */

/**
 * Assegna un ruolo a un utente
 */
export async function assignRole(personId, tenantId, roleType, options = {}) {
  try {
    const {
      companyId = null,
      departmentId = null,
      assignedBy = null,
      expiresAt = null,
      customPermissions = null
    } = options;

    // P48: Verifica che la persona esista e appartenga al tenant
    // companyId e globalRole sono ora in tenantProfiles/personRoles
    // P63: Person non ha tenantId — usa tenantProfiles.some o personRoles SUPER_ADMIN
    const person = await prisma.person.findFirst({
      where: {
        id: personId,
        deletedAt: null,
        OR: [
          { tenantProfiles: { some: { tenantId, deletedAt: null } } },
          // P48: Super admin check via personRoles
          {
            personRoles: {
              some: {
                roleType: 'SUPER_ADMIN',
                isActive: true,
                deletedAt: null
              }
            }
          }
        ]
      }
    });

    if (!person) {
      throw new Error('Person not found or does not belong to this tenant');
    }

    // Determina lo scope del ruolo
    let roleScope = ROLE_SCOPES.TENANT;
    if (roleType === ROLE_TYPES.SUPER_ADMIN) {
      roleScope = ROLE_SCOPES.GLOBAL;
    } else if (companyId) {
      roleScope = ROLE_SCOPES.COMPANY;
    } else if (departmentId) {
      roleScope = ROLE_SCOPES.DEPARTMENT;
    }

    // Verifica se esiste già un ruolo simile (solo non eliminati)
    const existingRole = await prisma.personRole.findFirst({
      where: {
        personId,
        tenantId,
        roleType,
        companyId,
        deletedAt: null,
      }
    });

    if (existingRole) {
      // Aggiorna il ruolo esistente
      return await prisma.personRole.update({
        where: { id: existingRole.id },
        data: {
          assignedBy,
          assignedAt: new Date(),
          validUntil: expiresAt
        }
      });
    } else {
      // Crea un nuovo ruolo
      return await prisma.personRole.create({
        data: {
          personId,
          tenantId,
          roleType,
          companyId,
          assignedBy,
          validUntil: expiresAt
        }
      });
    }
  } catch (error) {
    logger.error('[ROLE_CORE] Error assigning role:', error);
    throw error;
  }
}

/**
 * Rimuove un ruolo da un utente
 */
export async function removeRole(personId, tenantId, roleType, companyId = null) {
  try {
    const result = await prisma.personRole.updateMany({
      where: {
        personId,
        tenantId,
        roleType,
        companyId,
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    return result.count > 0;
  } catch (error) {
    logger.error('[ROLE_CORE] Error removing role:', error);
    throw error;
  }
}

/**
 * Ottiene tutti i ruoli di un utente
 */
export async function getUserRoles(personId, tenantId = null) {
  try {
    const where = {
      personId,
      isActive: true,
      deletedAt: null, // F221: exclude soft-deleted roles
      OR: [
        { validUntil: null },
        { validUntil: { gt: new Date() } }
      ]
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    // Ottieni i ruoli dalla tabella PersonRole
    const personRoles = await prisma.personRole.findMany({
      where,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        companyTenantProfile: {
          select: {
            id: true,
            company: {
              select: {
                id: true,
                ragioneSociale: true
              }
            }
          }
        }
      },
      orderBy: [
        { roleType: 'asc' },
        { assignedAt: 'desc' }
      ]
    });

    // P48: globalRole non esiste più, tutti i ruoli sono in personRoles
    // Nessuna logica aggiuntiva necessaria

    return personRoles;
  } catch (error) {
    logger.error('[ROLE_CORE] Error getting user roles:', error);
    throw error;
  }
}

/**
 * Lista utenti con un ruolo specifico
 */
export async function getUsersByRole(roleType, tenantId, companyId = null) {
  try {
    const where = {
      roleType,
      tenantId,
      isActive: true,
      deletedAt: null // F221: exclude soft-deleted roles
    };

    if (companyId) {
      where.companyTenantProfileId = companyId;
    }

    return await prisma.personRole.findMany({
      where,
      include: {
        person: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            tenantProfiles: {
              where: { tenantId, deletedAt: null, isActive: true },
              select: { email: true, isActive: true },
              take: 1
            }
          }
        },
        companyTenantProfile: {
          select: {
            id: true,
            company: {
              select: {
                id: true,
                ragioneSociale: true
              }
            }
          }
        }
      }
    });
  } catch (error) {
    logger.error('[ROLE_CORE] Error getting users by role:', error);
    throw error;
  }
}

/**
 * Aggiorna le permissions di un ruolo
 */
export async function updateRolePermissions(roleId, permissions) {
  try {
    return await prisma.personRole.update({
      where: { id: roleId },
      data: {
        permissions: { permissions }
      }
    });
  } catch (error) {
    logger.error('[ROLE_CORE] Error updating role permissions:', error);
    throw error;
  }
}

/**
 * Verifica e pulisce ruoli scaduti
 */
export async function cleanupExpiredRoles() {
  try {
    const result = await prisma.personRole.updateMany({
      where: {
        validUntil: {
          lt: new Date()
        },
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    logger.info(`[ROLE_CORE] Deactivated ${result.count} expired roles`);
    return result.count;
  } catch (error) {
    logger.error('[ROLE_CORE] Error cleaning up expired roles:', error);
    throw error;
  }
}

/**
 * Verifica se un utente ha un ruolo specifico
 */
export async function hasRole(personId, roleType, tenantId = null, companyId = null) {
  try {
    const where = {
      personId,
      roleType,
      isActive: true,
      OR: [
        { validUntil: null },
        { validUntil: { gt: new Date() } }
      ]
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (companyId) {
      where.companyTenantProfileId = companyId;
    }

    where.deletedAt = null;
    const role = await prisma.personRole.findFirst({ where });
    return !!role;
  } catch (error) {
    logger.error('[ROLE_CORE] Error checking role:', error);
    return false;
  }
}

/**
 * Ottiene il ruolo primario di un utente per un tenant
 */
export async function getPrimaryRole(personId, tenantId) {
  try {
    const roles = await getUserRoles(personId, tenantId);

    // Ordine di priorità per determinare il ruolo primario
    const priorityOrder = [
      ROLE_TYPES.SUPER_ADMIN,
      ROLE_TYPES.ADMIN,
      ROLE_TYPES.TENANT_ADMIN,
      ROLE_TYPES.COMPANY_ADMIN,
      ROLE_TYPES.HR_MANAGER,
      ROLE_TYPES.MANAGER,
      ROLE_TYPES.DEPARTMENT_HEAD,
      ROLE_TYPES.TRAINER_COORDINATOR,
      ROLE_TYPES.SENIOR_TRAINER,
      ROLE_TYPES.TRAINER,
      ROLE_TYPES.EXTERNAL_TRAINER,
      ROLE_TYPES.SUPERVISOR,
      ROLE_TYPES.COORDINATOR,
      ROLE_TYPES.OPERATOR,
      ROLE_TYPES.EMPLOYEE,
      ROLE_TYPES.CONSULTANT,
      ROLE_TYPES.AUDITOR,
      ROLE_TYPES.VIEWER,
      ROLE_TYPES.GUEST
    ];

    for (const roleType of priorityOrder) {
      const role = roles.find(r => r.roleType === roleType);
      if (role) {
        return role;
      }
    }

    return roles[0] || null;
  } catch (error) {
    logger.error('[ROLE_CORE] Error getting primary role:', error);
    return null;
  }
}

export default {
  assignRole,
  removeRole,
  getUserRoles,
  getUsersByRole,
  updateRolePermissions,
  cleanupExpiredRoles,
  hasRole,
  getPrimaryRole
};