/**
 * Operazioni database per la gestione della gerarchia dei ruoli
 * Gestisce interazioni con Prisma per ruoli personalizzati e assegnazioni
 */

import { ROLE_HIERARCHY, getRoleLevel, getDefaultParentRole } from './HierarchyDefinition.js';
import { canAssignToRole, canManageRole } from './HierarchyCalculator.js';
import { canAssignPermission } from './PermissionManager.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Ottiene la gerarchia completa dei ruoli includendo quelli personalizzati
 * @param {string} tenantId - ID del tenant
 * @returns {Object} Gerarchia completa con ruoli di sistema e personalizzati
 */
export async function getRoleHierarchy(tenantId) {
  try {
    // Ottieni ruoli personalizzati dal database
    const customRoles = await prisma.customRole.findMany({
      where: { 
        tenantId,
        deletedAt: null,
        isActive: true
      },
      include: {
        permissions: true
      }
    });

    // Combina ruoli di sistema con quelli personalizzati
    const hierarchy = { ...ROLE_HIERARCHY };
    
    customRoles.forEach(customRole => {
      hierarchy[customRole.name] = {
        level: customRole.level || 3,
        parent: customRole.parentRole,
        name: customRole.displayName || customRole.name,
        description: customRole.description || '',
        canAssignTo: [], // Sarà calcolato dinamicamente
        permissions: customRole.permissions.map(p => p.permission),
        isCustom: true,
        id: customRole.id
      };
    });

    return hierarchy;
  } catch (error) {
    console.error('Errore nel recupero della gerarchia:', error);
    throw error;
  }
}

/**
 * Assegna un ruolo con controlli gerarchici
 * @param {string} assignerId - ID di chi assegna
 * @param {string} targetUserId - ID dell'utente target
 * @param {string} roleType - Tipo di ruolo da assegnare
 * @param {string} tenantId - ID del tenant
 * @param {Object} options - Opzioni aggiuntive
 * @returns {Object} Risultato dell'assegnazione
 */
export async function assignRoleWithHierarchy(assignerId, targetUserId, roleType, tenantId, options = {}) {
  try {
    // Verifica permessi dell'assegnatore
    const assigner = await prisma.person.findUnique({
      where: { id: assignerId },
      include: {
        personRoles: {
          include: { 
            customRole: true,
            assignedByPerson: true,
            company: true,
            tenant: true
          }
        }
      }
    });

    if (!assigner) {
      throw new Error('Assegnatore non trovato');
    }

    // Ottieni il ruolo più alto dell'assegnatore
    const assignerRoles = assigner.personRoles.map(pr => pr.roleType);
    const assignerHighestRole = getHighestRole(assignerRoles);

    // Verifica se può assegnare questo ruolo
    if (!canAssignToRole(assignerHighestRole, roleType)) {
      throw new Error(`Non hai i permessi per assegnare il ruolo ${roleType}`);
    }

    // Verifica se il ruolo esiste (sistema o personalizzato)
    const hierarchy = await getRoleHierarchy(tenantId);
    if (!hierarchy[roleType]) {
      throw new Error(`Ruolo ${roleType} non trovato`);
    }

    // Verifica se l'assegnazione esiste già
    const existingAssignment = await prisma.personRole.findFirst({
      where: {
        personId: targetUserId,
        roleType: roleType,
        tenantId: tenantId
      }
    });

    if (existingAssignment) {
      throw new Error('Ruolo già assegnato a questo utente');
    }

    // Crea l'assegnazione
    const assignment = await prisma.personRole.create({
      data: {
        personId: targetUserId,
        roleType: roleType,
        assignedBy: assignerId,
        assignedAt: new Date(),
        tenantId: tenantId,
        isActive: true,
        isPrimary: options.isPrimary || false,
        level: ROLE_HIERARCHY[roleType]?.level || 0,
        ...options
      },
      include: {
        customRole: true,
        person: true,
        assignedByPerson: true
      }
    });

    return {
      success: true,
      assignment,
      message: `Ruolo ${roleType} assegnato con successo`
    };

  } catch (error) {
    console.error('Errore nell\'assegnazione del ruolo:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Assegna permessi con controlli gerarchici
 * @param {string} assignerId - ID di chi assegna
 * @param {string} targetUserId - ID dell'utente target
 * @param {Array} permissions - Array di permessi da assegnare
 * @param {string} tenantId - ID del tenant
 * @returns {Object} Risultato dell'assegnazione
 */
export async function assignPermissionsWithHierarchy(assignerId, targetUserId, permissions, tenantId) {
  try {
    // Verifica permessi dell'assegnatore
    const assigner = await prisma.person.findUnique({
      where: { id: assignerId },
      include: {
        personRoles: {
          include: { 
            customRole: true,
            assignedByPerson: true,
            company: true,
            tenant: true
          }
        }
      }
    });

    if (!assigner) {
      throw new Error('Assegnatore non trovato');
    }

    const assignerRoles = assigner.personRoles.map(pr => pr.roleType);
    const assignerHighestRole = getHighestRole(assignerRoles);

    // Verifica se può assegnare tutti i permessi richiesti
    const invalidPermissions = permissions.filter(permission => 
      !canAssignPermission(assignerHighestRole, permission)
    );

    if (invalidPermissions.length > 0) {
      throw new Error(`Non hai i permessi per assegnare: ${invalidPermissions.join(', ')}`);
    }

    // Ottieni o crea i permessi nel database
    const permissionRecords = await Promise.all(
      permissions.map(async (permissionName) => {
        let permission = await prisma.permission.findFirst({
          where: {
            name: permissionName,
            tenantId
          }
        });

        if (!permission) {
          permission = await prisma.permission.create({
            data: {
              name: permissionName,
              description: `Permesso ${permissionName}`,
              tenantId
            }
          });
        }

        return permission;
      })
    );

    // Assegna i permessi all'utente
    const assignments = await Promise.all(
      permissionRecords.map(async (permission) => {
        // Verifica se l'assegnazione esiste già
        const existing = await prisma.personPermission.findFirst({
          where: {
            personId: targetUserId,
            permissionId: permission.id
          }
        });

        if (!existing) {
          return await prisma.personPermission.create({
            data: {
              personId: targetUserId,
              permissionId: permission.id,
              assignedBy: assignerId,
              assignedAt: new Date()
            },
            include: {
              permission: true
            }
          });
        }

        return existing;
      })
    );

    return {
      success: true,
      assignments,
      message: `Permessi assegnati con successo`
    };

  } catch (error) {
    console.error('Errore nell\'assegnazione dei permessi:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Ottiene la gerarchia dei ruoli per un utente specifico
 * @param {string} userId - ID dell'utente
 * @param {string} tenantId - ID del tenant
 * @returns {Object} Gerarchia dei ruoli dell'utente
 */
export async function getUserRoleHierarchy(userId, tenantId) {
  try {
    // Validazione del parametro userId
    if (!userId) {
      throw new Error('userId è richiesto');
    }
    
    // Se userId è un array, prendi il primo elemento
    const actualUserId = Array.isArray(userId) ? userId[0] : userId;
    
    if (typeof actualUserId !== 'string') {
      throw new Error('userId deve essere una stringa');
    }

    const user = await prisma.person.findUnique({
      where: { id: actualUserId },
      include: {
        personRoles: {
          include: {
            customRole: true,
            assignedByPerson: true,
            company: true,
            tenant: true
          }
        },
        grantedPermissions: {
          include: {
            personRole: true,
            grantedByPerson: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('Utente non trovato');
    }

    const roles = user.personRoles.map(pr => ({
      id: pr.id,
      type: pr.roleType,
      customRole: pr.customRole,
      name: pr.customRole ? pr.customRole.name : pr.roleType,
      level: pr.level,
      assignedAt: pr.assignedAt,
      isActive: pr.isActive,
      isPrimary: pr.isPrimary
    }));

    const permissions = user.grantedPermissions ? user.grantedPermissions.map(gp => ({
      id: gp.id,
      permission: gp.permission,
      isGranted: gp.isGranted,
      grantedAt: gp.grantedAt,
      grantedBy: gp.grantedBy,
      grantedByPerson: gp.grantedByPerson
    })) : [];

    return {
      userId: actualUserId,
      roles,
      permissions,
      highestRole: getHighestRole(roles.map(r => r.type))
    };

  } catch (error) {
    console.error('Errore nel recupero della gerarchia utente:', error);
    throw error;
  }
}

/**
 * Aggiorna la gerarchia dei ruoli ricorsivamente
 * @param {string} roleType - Tipo di ruolo da aggiornare
 * @param {number} newLevel - Nuovo livello
 * @param {string} newParent - Nuovo genitore
 * @param {string} tenantId - ID del tenant
 * @returns {Object} Risultato dell'aggiornamento
 */
export async function updateRoleHierarchy(roleType, newLevel, newParent, tenantId) {
  try {
    // Aggiorna il ruolo principale
    const role = await prisma.role.findFirst({
      where: {
        type: roleType,
        tenantId
      }
    });

    if (!role) {
      throw new Error(`Ruolo ${roleType} non trovato`);
    }

    const updatedRole = await prisma.role.update({
      where: { id: role.id },
      data: {
        level: newLevel,
        parentRole: newParent
      }
    });

    // Aggiorna i ruoli figli ricorsivamente
    await updateChildrenPaths(roleType, tenantId);

    return {
      success: true,
      updatedRole,
      message: 'Gerarchia aggiornata con successo'
    };

  } catch (error) {
    console.error('Errore nell\'aggiornamento della gerarchia:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Aggiorna i percorsi dei ruoli figli ricorsivamente
 * @param {string} parentRoleType - Tipo di ruolo genitore
 * @param {string} tenantId - ID del tenant
 */
async function updateChildrenPaths(parentRoleType, tenantId) {
  try {
    const childRoles = await prisma.role.findMany({
      where: {
        parentRole: parentRoleType,
        tenantId
      }
    });

    for (const childRole of childRoles) {
      const newLevel = getRoleLevel(parentRoleType) + 1;
      
      await prisma.role.update({
        where: { id: childRole.id },
        data: { level: newLevel }
      });

      // Ricorsione per i figli del figlio
      await updateChildrenPaths(childRole.type, tenantId);
    }
  } catch (error) {
    console.error('Errore nell\'aggiornamento dei percorsi figli:', error);
    throw error;
  }
}

/**
 * Aggiunge un nuovo ruolo personalizzato alla gerarchia
 * @param {Object} roleData - Dati del nuovo ruolo
 * @param {string} tenantId - ID del tenant
 * @returns {Object} Risultato della creazione
 */
export async function addRoleToHierarchy(roleData, tenantId) {
  try {
    const { name, displayName, description, parentRole, permissions = [], createdBy } = roleData;

    // Calcola il livello basato sul genitore
    const parentLevel = parentRole ? getRoleLevel(parentRole) : 0;
    const level = parentLevel + 1;

    // Crea il ruolo personalizzato
    const customRole = await prisma.customRole.create({
      data: {
        name,
        displayName,
        description,
        parentRole,
        level,
        tenantId,
        createdBy,
        isActive: true
      }
    });

    // Crea i permessi associati
    if (permissions.length > 0) {
      await Promise.all(
        permissions.map(permissionName =>
          prisma.customRolePermission.create({
            data: {
              customRoleId: customRole.id,
              permission: permissionName,
              scope: 'global'
            }
          })
        )
      );
    }

    return {
      success: true,
      customRole,
      message: 'Ruolo personalizzato creato con successo'
    };

  } catch (error) {
    console.error('Errore nella creazione del ruolo personalizzato:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Ottiene i ruoli visibili per un utente basandosi sul suo livello
 * @param {string} userId - ID dell'utente
 * @param {string} tenantId - ID del tenant
 * @returns {Array} Array di ruoli visibili
 */
export async function getVisibleRolesForUser(userId, tenantId) {
  try {
    const userHierarchy = await getUserRoleHierarchy(userId, tenantId);
    const userLevel = getRoleLevel(userHierarchy.highestRole);

    // Ottieni tutti i ruoli personalizzati del tenant
    const customRoles = await prisma.customRole.findMany({
      where: { 
        tenantId,
        deletedAt: null,
        isActive: true
      },
      include: {
        permissions: true
      }
    });

    // Filtra i ruoli basandosi sul livello dell'utente
    // L'utente può vedere solo ruoli di livello superiore (numero maggiore)
    const visibleCustomRoles = customRoles.filter(role => role.level > userLevel);

    // Aggiungi anche i ruoli di sistema che può assegnare
    const systemRoles = Object.entries(ROLE_HIERARCHY)
      .filter(([roleType, roleData]) => roleData.level > userLevel)
      .map(([roleType, roleData]) => ({
        name: roleType,
        displayName: roleData.name,
        description: roleData.description,
        level: roleData.level,
        parentRole: roleData.parent,
        isCustom: false
      }));

    return [...visibleCustomRoles, ...systemRoles];

  } catch (error) {
    console.error('Errore nel recupero dei ruoli visibili:', error);
    throw error;
  }
}

// Funzione helper per ottenere il ruolo più alto (importata dal calculator)
function getHighestRole(roles) {
  if (!roles || roles.length === 0) return null;
  
  let highestRole = roles[0];
  let highestLevel = getRoleLevel(highestRole);
  
  for (let i = 1; i < roles.length; i++) {
    const currentLevel = getRoleLevel(roles[i]);
    if (currentLevel < highestLevel) {
      highestRole = roles[i];
      highestLevel = currentLevel;
    }
  }
  
  return highestRole;
}