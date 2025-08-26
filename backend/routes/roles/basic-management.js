/**
 * Basic Management Routes - Gestione base dei ruoli (CRUD)
 * 
 * Questo modulo gestisce le operazioni CRUD di base sui ruoli:
 * listing, creazione, lettura e aggiornamento dei ruoli di sistema.
 * 
 * NOTA: Aggiornato per usare PersonRole e RoleType enum invece del modello Role obsoleto
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';

// Import dei middleware
import { requireRoleManagement } from './middleware/auth.js';
import { logRoleOperation, auditRoleChanges } from './middleware/logging.js';
import { 
  validateCreateRole,
  validateUpdateRole,
  validatePagination 
} from './middleware/validation.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Funzioni di utilità
 */

// Crea una risposta di successo standardizzata
function createSuccessResponse(data, message = 'Success') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

// Crea una risposta di errore standardizzata
function createErrorResponse(error, details = null) {
  return {
    success: false,
    error: error,
    details: details,
    timestamp: new Date().toISOString()
  };
}

// Crea una risposta paginata
function createPaginationResponse(data, totalCount, page, limit) {
  const totalPages = Math.ceil(totalCount / limit);
  const currentPage = parseInt(page);
  
  return {
    data,
    pagination: {
      currentPage,
      totalPages,
      totalCount,
      limit: parseInt(limit),
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    }
  };
}

// Calcola l'offset per la paginazione
function calculateOffset(page, limit) {
  return (parseInt(page) - 1) * parseInt(limit);
}

// Filtra i dati del ruolo per rimuovere campi non permessi
function filterRoleData(data) {
  const allowedFields = ['name', 'description', 'permissions', 'isActive'];
  const filtered = {};
  
  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      filtered[field] = data[field];
    }
  });
  
  return filtered;
}

// Valida i dati del ruolo
function validateRoleData(data, isUpdate = false) {
  const errors = [];
  
  if (!isUpdate && !data.name) {
    errors.push('Name is required');
  }
  
  if (data.name && (typeof data.name !== 'string' || data.name.trim().length === 0)) {
    errors.push('Name must be a non-empty string');
  }
  
  if (data.description && typeof data.description !== 'string') {
    errors.push('Description must be a string');
  }
  
  if (data.permissions && !Array.isArray(data.permissions)) {
    errors.push('Permissions must be an array');
  }
  
  if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
    errors.push('isActive must be a boolean');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Filtra i dati utente per la risposta
function filterUserData(user) {
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isActive: user.isActive
  };
}

// Trasforma un ruolo per la risposta API
function transformRoleForResponse(role) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isActive: role.isActive,
    isSystemRole: false,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt
  };
}

// Lista dei ruoli di sistema dall'enum RoleType
const SYSTEM_ROLES = [
  'EMPLOYEE',
  'MANAGER', 
  'HR_MANAGER',
  'DEPARTMENT_HEAD',
  'TRAINER',
  'SENIOR_TRAINER',
  'TRAINER_COORDINATOR',
  'EXTERNAL_TRAINER',
  'SUPER_ADMIN',
  'ADMIN',
  'COMPANY_ADMIN',
  'TENANT_ADMIN',
  'TRAINING_ADMIN',
  'CLINIC_ADMIN',
  'COMPANY_MANAGER',
  'VIEWER',
  'OPERATOR',
  'COORDINATOR',
  'SUPERVISOR',
  'GUEST',
  'CONSULTANT',
  'AUDITOR'
];

/**
 * GET /api/roles
 * Lista tutti i ruoli disponibili con paginazione e filtri
 */
router.get('/',
  validatePagination,
  logRoleOperation('LIST_ROLES'),
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 50, 
        search, 
        type, 
        active,
        sortBy = 'roleType',
        sortOrder = 'asc'
      } = req.query;
      
      const offset = calculateOffset(page, limit);
      const tenantId = req.tenant?.id || req.person?.tenantId;

      // Ottieni statistiche sui ruoli assegnati
      const roleStats = await prisma.personRole.groupBy({
        by: ['roleType'],
        where: {
          tenantId,
          isActive: true,
          deletedAt: null,
          roleType: { not: null }
        },
        _count: {
          id: true
        }
      });

      // Ottieni anche i custom roles
      const customRoles = await prisma.customRole.findMany({
        where: {
          tenantId,
          isActive: true,
          deletedAt: null
        },
        include: {
          _count: {
            select: {
              personRoles: {
                where: {
                  isActive: true,
                  deletedAt: null
                }
              }
            }
          }
        }
      });

      // Crea la mappa delle statistiche
      const statsMap = new Map();
      roleStats.forEach(stat => {
        if (stat.roleType) {
          statsMap.set(stat.roleType, stat._count.id);
        }
      });

      // Filtra i ruoli di sistema
      let systemRoles = SYSTEM_ROLES.map(roleType => ({
        id: roleType,
        roleType,
        name: roleType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        description: `Sistema - ${roleType.replace(/_/g, ' ').toLowerCase()}`,
        isActive: true,
        isSystemRole: true,
        userCount: statsMap.get(roleType) || 0,
        permissions: []
      }));

      // Aggiungi i custom roles
      const customRolesList = customRoles.map(role => ({
        id: role.id,
        roleType: `CUSTOM_${role.name.toUpperCase().replace(/\s+/g, '_')}`,
        name: role.name,
        description: role.description || `Custom role - ${role.name}`,
        isActive: role.isActive,
        isSystemRole: false,
        userCount: role._count.personRoles,
        permissions: []
      }));

      // Combina tutti i ruoli
      let allRoles = [...systemRoles, ...customRolesList];

      // Applica filtri
      if (search) {
        const searchLower = search.toLowerCase();
        allRoles = allRoles.filter(role => 
          role.name.toLowerCase().includes(searchLower) ||
          role.description.toLowerCase().includes(searchLower) ||
          role.roleType.toLowerCase().includes(searchLower)
        );
      }

      if (type) {
        allRoles = allRoles.filter(role => role.roleType === type);
      }

      if (active !== undefined) {
        const isActive = active === 'true';
        allRoles = allRoles.filter(role => role.isActive === isActive);
      }

      // Ordinamento
      allRoles.sort((a, b) => {
        const aValue = a[sortBy] || '';
        const bValue = b[sortBy] || '';
        
        if (sortOrder === 'desc') {
          return bValue.toString().localeCompare(aValue.toString());
        }
        return aValue.toString().localeCompare(bValue.toString());
      });

      // Paginazione
      const totalCount = allRoles.length;
      const paginatedRoles = allRoles.slice(offset, offset + parseInt(limit));

      logger.info('Roles listed', {
        tenantId,
        userId: req.person?.id,
        totalCount,
        returnedCount: paginatedRoles.length,
        filters: { search, type, active },
        pagination: { page, limit }
      });

      const paginationResponse = createPaginationResponse(
        paginatedRoles,
        totalCount,
        page,
        limit
      );

      res.json(createSuccessResponse(paginationResponse, 'Roles retrieved successfully'));
    } catch (error) {
      logger.error('Error listing roles', {
        error: error.message,
        stack: error.stack,
        tenantId: req.tenant?.id || req.person?.tenantId,
        userId: req.person?.id,
        query: req.query
      });

      res.status(500).json(createErrorResponse(
        'Failed to retrieve roles',
        error.message
      ));
    }
  }
);

/**
 * POST /api/roles
 * Crea un nuovo custom role nel sistema
 */
router.post('/',
  validateCreateRole,
  requireRoleManagement,
  logRoleOperation('CREATE_ROLE'),
  auditRoleChanges,
  async (req, res) => {
    try {
      const roleData = filterRoleData(req.body);
      const tenantId = req.tenant?.id || req.person?.tenantId;

      // Valida i dati del ruolo
      const validation = validateRoleData(roleData);
      if (!validation.isValid) {
        return res.status(400).json(createErrorResponse(
          'Invalid role data',
          validation.errors.join(', ')
        ));
      }

      // Verifica che non esista già un custom role con lo stesso nome
      const existingRole = await prisma.customRole.findFirst({
        where: {
          name: roleData.name,
          tenantId
        }
      });

      if (existingRole) {
        return res.status(409).json(createErrorResponse(
          'Role already exists',
          `A custom role with name '${roleData.name}' already exists`
        ));
      }

      // Crea il nuovo custom role in una transazione
      const newRole = await prisma.$transaction(async (tx) => {
        // Crea il custom role
        const role = await tx.customRole.create({
          data: {
            name: roleData.name,
            description: roleData.description,
            tenantId,
            createdBy: req.person.id,
            isActive: true
          },
          include: {
            permissions: true
          }
        });

        // Se ci sono permessi da assegnare, aggiungili
        if (roleData.permissions && roleData.permissions.length > 0) {
          await tx.customRolePermission.createMany({
            data: roleData.permissions.map(permissionData => ({
              customRoleId: role.id,
              permission: typeof permissionData === 'string' ? permissionData : permissionData.permissionId,
              scope: typeof permissionData === 'string' ? 'global' : (permissionData.scope || 'global'),
              resource: typeof permissionData === 'string' ? null : (permissionData.resource || null)
            }))
          });

          // Ricarica il ruolo con i permessi
          return await tx.customRole.findUnique({
            where: { id: role.id },
            include: {
              permissions: true
            }
          });
        }

        return role;
      });

      logger.info('Custom role created', {
        roleId: newRole.id,
        roleName: newRole.name,
        createdBy: req.person.id,
        tenantId,
        permissionsCount: newRole.permissions?.length || 0
      });

      res.status(201).json(createSuccessResponse(
        {
          id: newRole.id,
          name: newRole.name,
          description: newRole.description,
          isActive: newRole.isActive,
          isSystemRole: false,
          userCount: 0,
          permissions: newRole.permissions || []
        },
        'Custom role created successfully'
      ));
    } catch (error) {
      logger.error('Error creating custom role', {
        error: error.message,
        stack: error.stack,
        roleData: req.body,
        createdBy: req.person?.id,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse(
        'Failed to create custom role',
        error.message
      ));
    }
  }
);

/**
 * GET /api/roles/:roleType
 * Ottiene informazioni dettagliate su un ruolo specifico
 */
router.get('/:roleType',
  logRoleOperation('GET_ROLE_DETAILS'),
  async (req, res) => {
    try {
      const { roleType } = req.params;
      const { includeUsers = 'false' } = req.query;
      const tenantId = req.tenant?.id || req.person?.tenantId;

      let roleDetails = null;
      let isSystemRole = false;

      // Verifica se è un ruolo di sistema
      if (SYSTEM_ROLES.includes(roleType)) {
        isSystemRole = true;
        
        // Ottieni statistiche per il ruolo di sistema
        const userCount = await prisma.personRole.count({
          where: {
            roleType,
            tenantId,
            isActive: true,
            deletedAt: null
          }
        });

        roleDetails = {
          id: roleType,
          roleType,
          name: roleType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
          description: `Sistema - ${roleType.replace(/_/g, ' ').toLowerCase()}`,
          isActive: true,
          isSystemRole: true,
          userCount,
          permissions: []
        };

        // Se richiesto, includi gli utenti
        if (includeUsers === 'true') {
          const personRoles = await prisma.personRole.findMany({
            where: {
              roleType,
              tenantId,
              isActive: true,
              deletedAt: null
            },
            include: {
              person: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  isActive: true
                }
              }
            }
          });

          roleDetails.users = personRoles.map(pr => ({
            ...filterUserData(pr.person),
            assignedAt: pr.createdAt,
            assignedBy: pr.assignedBy
          }));
        }
      } else {
        // Cerca nei custom roles
        const customRole = await prisma.customRole.findFirst({
          where: {
            OR: [
              { id: roleType },
              { name: roleType }
            ],
            tenantId
          },
          include: {
            permissions: true,
            _count: {
              select: {
                personRoles: {
                  where: {
                    isActive: true,
                    deletedAt: null
                  }
                }
              }
            },
            ...(includeUsers === 'true' && {
              personRoles: {
                where: {
                  isActive: true,
                  deletedAt: null
                },
                include: {
                  person: {
                    select: {
                      id: true,
                      email: true,
                      name: true,
                      isActive: true
                    }
                  }
                }
              }
            })
          }
        });

        if (customRole) {
          roleDetails = {
            id: customRole.id,
            roleType: `CUSTOM_${customRole.name.toUpperCase().replace(/\s+/g, '_')}`,
            name: customRole.name,
            description: customRole.description || `Custom role - ${customRole.name}`,
            isActive: customRole.isActive,
            isSystemRole: false,
            userCount: customRole._count.personRoles,
            permissions: customRole.permissions || []
          };

          if (includeUsers === 'true' && customRole.personRoles) {
            roleDetails.users = customRole.personRoles.map(pr => ({
              ...filterUserData(pr.person),
              assignedAt: pr.createdAt,
              assignedBy: pr.assignedBy
            }));
          }
        }
      }

      if (!roleDetails) {
        return res.status(404).json(createErrorResponse(
          'Role not found',
          `Role with type '${roleType}' not found`
        ));
      }

      logger.info('Role details retrieved', {
        roleType,
        roleId: roleDetails.id,
        tenantId,
        userId: req.person?.id,
        includeUsers: includeUsers === 'true',
        isSystemRole
      });

      res.json(createSuccessResponse(roleDetails, 'Role details retrieved successfully'));
    } catch (error) {
      logger.error('Error retrieving role details', {
        error: error.message,
        stack: error.stack,
        roleType: req.params.roleType,
        tenantId: req.tenant?.id || req.person?.tenantId,
        userId: req.person?.id
      });

      res.status(500).json(createErrorResponse(
        'Failed to retrieve role details',
        error.message
      ));
    }
  }
);

/**
 * PUT /api/roles/:roleType
 * Aggiorna un custom role esistente
 */
router.put('/:roleType',
  validateUpdateRole,
  requireRoleManagement,
  logRoleOperation('UPDATE_ROLE'),
  auditRoleChanges,
  async (req, res) => {
    try {
      const { roleType } = req.params;
      const updateData = filterRoleData(req.body);
      const tenantId = req.tenant?.id || req.person?.tenantId;

      // Non permettere l'aggiornamento dei ruoli di sistema
      if (SYSTEM_ROLES.includes(roleType)) {
        return res.status(403).json(createErrorResponse(
          'Cannot update system role',
          'System roles cannot be modified'
        ));
      }

      // Valida i dati di aggiornamento
      const validation = validateRoleData(updateData, true);
      if (!validation.isValid) {
        return res.status(400).json(createErrorResponse(
          'Invalid role data',
          validation.errors.join(', ')
        ));
      }

      // Trova il custom role
      const existingRole = await prisma.customRole.findFirst({
        where: {
          OR: [
            { id: roleType },
            { name: roleType }
          ],
          tenantId
        },
        include: {
          permissions: true
        }
      });

      if (!existingRole) {
        return res.status(404).json(createErrorResponse(
          'Role not found',
          `Custom role with identifier '${roleType}' not found`
        ));
      }

      // Se si sta cambiando il nome, verifica che non esista già
      if (updateData.name && updateData.name !== existingRole.name) {
        const nameConflict = await prisma.customRole.findFirst({
          where: {
            name: updateData.name,
            tenantId,
            id: { not: existingRole.id }
          }
        });

        if (nameConflict) {
          return res.status(409).json(createErrorResponse(
            'Name already exists',
            `A custom role with name '${updateData.name}' already exists`
          ));
        }
      }

      // Aggiorna il ruolo in una transazione
      const updatedRole = await prisma.$transaction(async (tx) => {
        // Aggiorna i dati base del ruolo
        const role = await tx.customRole.update({
          where: { id: existingRole.id },
          data: {
            name: updateData.name || existingRole.name,
            description: updateData.description || existingRole.description,
            isActive: updateData.isActive !== undefined ? updateData.isActive : existingRole.isActive,
            updatedBy: req.person.id,
            updatedAt: new Date()
          }
        });

        // Se ci sono permessi da aggiornare
        if (updateData.permissions !== undefined) {
          // Rimuovi tutti i permessi esistenti
          await tx.customRolePermission.deleteMany({
            where: { customRoleId: role.id }
          });

          // Aggiungi i nuovi permessi
          if (updateData.permissions.length > 0) {
            await tx.customRolePermission.createMany({
              data: updateData.permissions.map(permissionData => ({
                customRoleId: role.id,
                permission: typeof permissionData === 'string' ? permissionData : permissionData.permissionId,
                scope: typeof permissionData === 'string' ? 'global' : (permissionData.scope || 'global'),
                resource: typeof permissionData === 'string' ? null : (permissionData.resource || null)
              }))
            });
          }
        }

        // Ricarica il ruolo con i permessi aggiornati
        return await tx.customRole.findUnique({
          where: { id: role.id },
          include: {
            permissions: true,
            _count: {
              select: {
                personRoles: {
                  where: {
                    isActive: true,
                    deletedAt: null
                  }
                }
              }
            }
          }
        });
      });

      logger.info('Custom role updated', {
        roleId: updatedRole.id,
        roleName: updatedRole.name,
        updatedBy: req.person.id,
        tenantId,
        changes: updateData,
        permissionsCount: updatedRole.permissions?.length || 0
      });

      res.json(createSuccessResponse(
        {
          id: updatedRole.id,
          name: updatedRole.name,
          description: updatedRole.description,
          isActive: updatedRole.isActive,
          isSystemRole: false,
          userCount: updatedRole._count.personRoles,
          permissions: updatedRole.permissions || []
        },
        'Custom role updated successfully'
      ));
    } catch (error) {
      logger.error('Error updating custom role', {
        error: error.message,
        stack: error.stack,
        roleType: req.params.roleType,
        updateData: req.body,
        updatedBy: req.person?.id,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse(
        'Failed to update custom role',
        error.message
      ));
    }
  }
);

/**
 * DELETE /api/roles/:roleType
 * Elimina un custom role (soft delete)
 */
router.delete('/:roleType',
  requireRoleManagement,
  logRoleOperation('DELETE_ROLE'),
  auditRoleChanges,
  async (req, res) => {
    try {
      const { roleType } = req.params;
      const { force = 'false' } = req.query;
      const tenantId = req.tenant?.id || req.person?.tenantId;

      // Non permettere l'eliminazione dei ruoli di sistema
      if (SYSTEM_ROLES.includes(roleType)) {
        return res.status(403).json(createErrorResponse(
          'Cannot delete system role',
          'System roles cannot be deleted'
        ));
      }

      // Trova il custom role
      const existingRole = await prisma.customRole.findFirst({
        where: {
          OR: [
            { id: roleType },
            { name: roleType }
          ],
          tenantId
        },
        include: {
          _count: {
            select: {
              personRoles: {
                where: {
                  isActive: true,
                  deletedAt: null
                }
              }
            }
          }
        }
      });

      if (!existingRole) {
        return res.status(404).json(createErrorResponse(
          'Role not found',
          `Custom role with identifier '${roleType}' not found`
        ));
      }

      // Verifica se ci sono utenti assegnati
      if (existingRole._count.personRoles > 0 && force !== 'true') {
        return res.status(409).json(createErrorResponse(
          'Role has assigned users',
          `Cannot delete role '${existingRole.name}' because it has ${existingRole._count.personRoles} assigned users. Use force=true to proceed.`
        ));
      }

      // Elimina il ruolo in una transazione
      await prisma.$transaction(async (tx) => {
        // Se force=true, rimuovi prima tutti gli assegnamenti
        if (force === 'true' && existingRole._count.personRoles > 0) {
          await tx.personRole.updateMany({
            where: {
              customRoleId: existingRole.id,
              isActive: true,
              deletedAt: null
            },
            data: {
              isActive: false,
              deletedAt: new Date()
            }
          });
        }

        // Rimuovi tutti i permessi del ruolo
        await tx.customRolePermission.deleteMany({
          where: { customRoleId: existingRole.id }
        });

        // Soft delete del ruolo
        await tx.customRole.update({
          where: { id: existingRole.id },
          data: {
            isActive: false,
            deletedAt: new Date()
          }
        });
      });

      logger.info('Custom role deleted', {
        roleId: existingRole.id,
        roleName: existingRole.name,
        deletedBy: req.person.id,
        tenantId,
        force: force === 'true',
        usersAffected: existingRole._count.personRoles
      });

      res.json(createSuccessResponse(
        {
          id: existingRole.id,
          name: existingRole.name,
          deleted: true,
          usersAffected: existingRole._count.personRoles
        },
        'Custom role deleted successfully'
      ));
    } catch (error) {
      logger.error('Error deleting custom role', {
        error: error.message,
        stack: error.stack,
        roleType: req.params.roleType,
        deletedBy: req.person?.id,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse(
        'Failed to delete custom role',
        error.message
      ));
    }
  }
);

export default router;