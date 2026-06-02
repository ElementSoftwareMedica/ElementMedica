/**
 * Custom Roles Routes - Gestione dei ruoli personalizzati
 * 
 * Questo modulo gestisce tutte le operazioni sui ruoli personalizzati:
 * creazione, aggiornamento ed eliminazione di ruoli custom definiti dagli utenti.
 */

import express from 'express';
import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

// Import dei middleware
import { requireCustomRoleManagement } from './middleware/auth.js';
import { logRoleOperation, auditRoleChanges } from './middleware/logging.js';
import {
  validateCreateRole,
  validateUpdateRole,
  validateRouteId
} from './middleware/validation.js';

// Import delle utilità
import {
  createSuccessResponse,
  createErrorResponse,
  transformRoleForResponse
} from './utils/helpers.js';
import { filterCustomRoleData } from './utils/filters.js';
import { validateRoleData } from './utils/validators.js';

const router = express.Router();

/**
 * POST /api/roles/custom
 * Crea un nuovo ruolo personalizzato
 */
router.post('/',
  validateCreateRole,
  requireCustomRoleManagement,
  logRoleOperation('CREATE_CUSTOM_ROLE'),
  auditRoleChanges,
  async (req, res) => {
    try {
      const roleData = filterCustomRoleData(req.body);
      const tenantId = req.tenant?.id || req.person?.tenantId;

      // Valida i dati del ruolo personalizzato
      const validation = validateRoleData(roleData);
      if (!validation.isValid) {
        return res.status(400).json(createErrorResponse(
          'Invalid custom role data',
          validation.errors.join(', ')
        ));
      }

      // Verifica che non esista già un ruolo personalizzato con lo stesso nome
      const existingRole = await prisma.customRole.findFirst({
        where: {
          name: roleData.name,
          tenantId
        }
      });

      if (existingRole) {
        return res.status(409).json(createErrorResponse(
          'Ruolo personalizzato già esistente',
          `A custom role with name '${roleData.name}' already exists`
        ));
      }

      // Crea il ruolo personalizzato in una transazione
      const newCustomRole = await prisma.$transaction(async (tx) => {
        // Crea il ruolo personalizzato
        const customRole = await tx.customRole.create({
          data: {
            name: roleData.name,
            description: roleData.description,
            isActive: roleData.isActive !== false,
            tenantId,
            createdBy: req.person.id,
            updatedBy: req.person.id
          }
        });

        // Se ci sono permessi da assegnare, aggiungili
        if (roleData.permissions && roleData.permissions.length > 0) {
          await tx.customRolePermission.createMany({
            data: roleData.permissions.map(permission => ({
              customRoleId: customRole.id,
              permission: permission
            }))
          });

          // Ricarica il ruolo con i permessi
          return await tx.customRole.findUnique({
            where: { id: customRole.id },
            include: {
              permissions: true
            }
          });
        }

        return customRole;
      });

      logger.info('Custom role created', {
        customRoleId: newCustomRole.id,
        name: newCustomRole.name,
        createdBy: req.person.id,
        tenantId,
        permissionsCount: newCustomRole.permissions?.length || 0
      });

      res.status(201).json(createSuccessResponse({
        id: newCustomRole.id,
        name: newCustomRole.name,
        description: newCustomRole.description,
        isActive: newCustomRole.isActive,
        permissions: newCustomRole.permissions?.map(cp => ({
          id: cp.id,
          permission: cp.permission,
          resource: cp.resource,
          scope: cp.scope
        })) || [],
        createdAt: newCustomRole.createdAt,
        updatedAt: newCustomRole.updatedAt
      }, 'Ruolo personalizzato creato con successo'));
    } catch (error) {
      logger.error('Error creating custom role', {
        error: 'Operazione non riuscita',
        stack: error.stack,
        roleData: req.body,
        createdBy: req.person?.id,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse('Errore nella creazione del ruolo personalizzato'));
    }
  }
);

/**
 * PUT /api/roles/custom/:id
 * Aggiorna un ruolo personalizzato esistente
 */
router.put('/:id',
  validateRouteId('id'),
  validateUpdateRole,
  requireCustomRoleManagement,
  logRoleOperation('UPDATE_CUSTOM_ROLE'),
  auditRoleChanges,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = filterCustomRoleData(req.body);
      const tenantId = req.tenant?.id || req.person?.tenantId;

      // Valida i dati di aggiornamento
      const validation = validateRoleData(updateData, true);
      if (!validation.isValid) {
        return res.status(400).json(createErrorResponse(
          'Invalid update data',
          validation.errors.join(', ')
        ));
      }

      // Trova il ruolo personalizzato esistente
      const existingCustomRole = await prisma.customRole.findFirst({
        where: {
          id,
          tenantId
        }
      });

      if (!existingCustomRole) {
        return res.status(404).json(createErrorResponse(
          'Ruolo personalizzato non trovato',
          `Custom role with ID '${id}' not found`
        ));
      }

      // Se si sta cambiando il nome, verifica che non esista già
      if (updateData.name && updateData.name !== existingCustomRole.name) {
        const duplicateRole = await prisma.customRole.findFirst({
          where: {
            name: updateData.name,
            tenantId,
            id: { not: id }
          }
        });

        if (duplicateRole) {
          return res.status(409).json(createErrorResponse(
            'Nome ruolo personalizzato già in uso',
            `A custom role with name '${updateData.name}' already exists`
          ));
        }
      }

      // Aggiorna il ruolo personalizzato in una transazione
      const updatedCustomRole = await prisma.$transaction(async (tx) => {
        // Aggiorna i dati del ruolo
        const customRole = await tx.customRole.update({
          where: { id },
          data: {
            ...updateData,
            updatedBy: req.person.id,
            updatedAt: new Date()
          }
        });

        // Se ci sono nuovi permessi da gestire
        if (updateData.permissions !== undefined) {
          // Rimuovi i permessi esistenti
          await tx.customRolePermission.deleteMany({
            where: { customRoleId: id }
          });

          // Aggiungi i nuovi permessi
          if (updateData.permissions.length > 0) {
            await tx.customRolePermission.createMany({
              data: updateData.permissions.map(permission => ({
                customRoleId: id,
                permission: permission
              }))
            });
          }
        }

        // Ricarica il ruolo con i permessi aggiornati
        return await tx.customRole.findUnique({
          where: { id },
          include: {
            permissions: true
          }
        });
      });

      logger.info('Custom role updated', {
        customRoleId: updatedCustomRole.id,
        name: updatedCustomRole.name,
        originalName: existingCustomRole.name,
        updatedBy: req.person.id,
        tenantId,
        changes: Object.keys(updateData)
      });

      res.json(createSuccessResponse({
        id: updatedCustomRole.id,
        name: updatedCustomRole.name,
        description: updatedCustomRole.description,
        isActive: updatedCustomRole.isActive,
        permissions: updatedCustomRole.permissions?.map(cp => ({
          id: cp.id,
          permission: cp.permission,
          resource: cp.resource,
          scope: cp.scope,
          assignedAt: cp.createdAt
        })) || [],
        createdAt: updatedCustomRole.createdAt,
        updatedAt: updatedCustomRole.updatedAt
      }, 'Ruolo personalizzato aggiornato con successo'));
    } catch (error) {
      logger.error('Error updating custom role', {
        error: 'Operazione non riuscita',
        stack: error.stack,
        customRoleId: req.params.id,
        updateData: req.body,
        updatedBy: req.person?.id,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse('Errore nell\'aggiornamento del ruolo personalizzato'));
    }
  }
);

/**
 * DELETE /api/roles/custom/:id
 * Elimina un ruolo personalizzato (soft delete)
 */
router.delete('/:id',
  validateRouteId('id'),
  requireCustomRoleManagement,
  logRoleOperation('DELETE_CUSTOM_ROLE'),
  auditRoleChanges,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { force = 'false' } = req.query;
      const tenantId = req.tenant?.id || req.person?.tenantId;

      // Trova il ruolo personalizzato
      const customRole = await prisma.customRole.findFirst({
        where: {
          id,
          tenantId
        },
        include: {
          _count: {
            select: {
              personRoles: {
                where: {
                  customRoleId: { not: null }
                }
              }
            }
          }
        }
      });

      if (!customRole) {
        return res.status(404).json(createErrorResponse(
          'Ruolo personalizzato non trovato',
          `Custom role with ID '${id}' not found`
        ));
      }

      // Verifica se il ruolo è assegnato a degli utenti
      if (customRole._count.personRoles > 0 && force !== 'true') {
        return res.status(409).json(createErrorResponse(
          'Custom role is in use',
          `This custom role is assigned to ${customRole._count.personRoles} user(s). Use force=true to delete anyway.`
        ));
      }

      // Elimina il ruolo personalizzato in una transazione
      await prisma.$transaction(async (tx) => {
        // Se force=true, rimuovi prima tutte le assegnazioni
        if (force === 'true') {
          await tx.personRole.deleteMany({
            where: { customRoleId: id }
          });
        }

        // Rimuovi i permessi del ruolo
        await tx.customRolePermission.deleteMany({
          where: { customRoleId: id }
        });

        // Soft delete del ruolo personalizzato
        await tx.customRole.update({
          where: { id },
          data: {
            isActive: false,
            deletedAt: new Date()
          }
        });
      });

      logger.info('Custom role deleted', {
        customRoleId: id,
        name: customRole.name,
        deletedBy: req.person.id,
        tenantId,
        force: force === 'true',
        usersAffected: customRole._count.personRoles
      });

      res.json(createSuccessResponse({
        id,
        name: customRole.name,
        deletedAt: new Date().toISOString(),
        usersAffected: force === 'true' ? customRole._count.personRoles : 0
      }, 'Ruolo personalizzato eliminato con successo'));
    } catch (error) {
      logger.error('Error deleting custom role', {
        error: 'Operazione non riuscita',
        stack: error.stack,
        customRoleId: req.params.id,
        deletedBy: req.person?.id,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse('Errore nell\'eliminazione del ruolo personalizzato'));
    }
  }
);

/**
 * GET /api/roles/custom/:id
 * Ottiene i dettagli di un ruolo personalizzato specifico
 */
router.get('/:id',
  validateRouteId('id'),
  logRoleOperation('GET_CUSTOM_ROLE_DETAILS'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { includeUsers = 'false' } = req.query;
      const tenantId = req.tenant?.id || req.person?.tenantId;

      // Trova il ruolo personalizzato
      const customRole = await prisma.customRole.findFirst({
        where: {
          id,
          tenantId,
          isActive: true
        },
        include: {
          permissions: {
            include: {
              permission: true
            }
          },
          _count: {
            select: {
              personRoles: {
                where: {
                  customRoleId: { not: null }
                }
              }
            }
          },
          ...(includeUsers === 'true' && {
            personRoles: {
              where: {
                customRoleId: { not: null }
              },
              include: {
                person: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    tenantProfiles: {
                      where: { tenantId, deletedAt: null },
                      take: 1,
                      select: { email: true, isActive: true }
                    }
                  }
                }
              }
            }
          })
        }
      });

      if (!customRole) {
        return res.status(404).json(createErrorResponse(
          'Ruolo personalizzato non trovato',
          `Custom role with ID '${id}' not found`
        ));
      }

      // Trasforma il ruolo per la risposta
      const transformedCustomRole = {
        id: customRole.id,
        name: customRole.name,
        description: customRole.description,
        isActive: customRole.isActive,
        userCount: customRole._count.personRoles,
        permissions: customRole.permissions.map(cp => ({
          id: cp.permission.id,
          name: cp.permission.name,
          resource: cp.permission.resource,
          action: cp.permission.action,
          assignedAt: cp.createdAt,
          assignedBy: cp.assignedBy
        })),
        createdAt: customRole.createdAt,
        updatedAt: customRole.updatedAt,
        ...(includeUsers === 'true' && {
          users: customRole.personRoles.map(pr => ({
            id: pr.person.id,
            email: pr.person.tenantProfiles?.[0]?.email || '',
            name: `${pr.person.firstName || ''} ${pr.person.lastName || ''}`.trim(),
            isActive: pr.person.tenantProfiles?.[0]?.isActive ?? true,
            assignedAt: pr.createdAt,
            assignedBy: pr.assignedBy
          }))
        })
      };

      logger.info('Dettagli ruolo personalizzato recuperati', {
        customRoleId: id,
        name: customRole.name,
        tenantId,
        userId: req.person?.id,
        includeUsers: includeUsers === 'true'
      });

      res.json(createSuccessResponse(transformedCustomRole, 'Custom role details retrieved successfully'));
    } catch (error) {
      logger.error('Error retrieving custom role details', {
        error: 'Operazione non riuscita',
        stack: error.stack,
        customRoleId: req.params.id,
        tenantId: req.tenant?.id || req.person?.tenantId,
        userId: req.person?.id
      });

      res.status(500).json(createErrorResponse('Errore nel recupero dei dettagli del ruolo personalizzato'));
    }
  }
);

/**
 * GET /api/roles/custom
 * Lista tutti i ruoli personalizzati del tenant
 */
router.get('/',
  logRoleOperation('LIST_CUSTOM_ROLES'),
  async (req, res) => {
    try {
      const {
        search,
        active = 'true',
        includeDeleted = 'false'
      } = req.query;
      const tenantId = req.tenant?.id || req.person?.tenantId;

      // Costruisci la clausola WHERE
      const whereClause = {
        tenantId,
        ...(includeDeleted !== 'true' && { isActive: true }),
        ...(active !== 'all' && { isActive: active === 'true' }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        })
      };

      // Ottieni i ruoli personalizzati
      const customRoles = await prisma.customRole.findMany({
        where: whereClause,
        include: {
          permissions: true,
          _count: {
            select: {
              personRoles: {
                where: {
                  customRoleId: { not: null }
                }
              }
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      // Trasforma i ruoli per la risposta
      const transformedCustomRoles = customRoles.map(customRole => ({
        id: customRole.id,
        name: customRole.name,
        description: customRole.description,
        isActive: customRole.isActive,
        userCount: customRole._count.personRoles,
        permissionsCount: customRole.permissions.length,
        createdAt: customRole.createdAt,
        updatedAt: customRole.updatedAt,
        ...(customRole.deletedAt && { deletedAt: customRole.deletedAt })
      }));

      logger.info('Custom roles listed', {
        tenantId,
        userId: req.person?.id,
        totalCount: transformedCustomRoles.length,
        filters: { search, active, includeDeleted }
      });

      res.json(createSuccessResponse(transformedCustomRoles, 'Ruoli personalizzati recuperati con successo'));
    } catch (error) {
      logger.error('Error listing custom roles', {
        error: 'Operazione non riuscita',
        stack: error.stack,
        tenantId: req.tenant?.id || req.person?.tenantId,
        userId: req.person?.id,
        query: req.query
      });

      res.status(500).json(createErrorResponse('Errore nel recupero dei ruoli personalizzati'));
    }
  }
);

export default router;