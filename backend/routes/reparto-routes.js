import express from 'express';
import logger from '../utils/logger.js';
import middleware from '../auth/middleware.js';
import { checkAdvancedPermission, filterDataByPermissions } from '../middleware/advanced-permissions.js';
import prisma from '../config/prisma-optimization.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// Get all Reparti for a site
router.get('/site/:siteId', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'read', {
    getSiteId: (req) => req.params.siteId
  }),
  filterDataByPermissions(),
  async (req, res) => {
    try {
      const { siteId } = req.params;
      const person = req.person || req.user;
      
      // Verifica che la sede esista
      const site = await prisma.companySite.findUnique({
        where: { id: siteId },
        include: { company: true }
      });
      
      if (!site) {
        return res.status(404).json({ 
          error: 'Site not found',
          message: `Site with ID ${siteId} does not exist`
        });
      }
      
      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede
      
      const reparti = await prisma.reparto.findMany({
        where: { 
          siteId,
          deletedAt: null
        },
        include: {
          site: {
            select: {
              id: true,
              siteName: true,
              company: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          responsabile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          dipendenti: {
            where: { deletedAt: null },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { nome: 'asc' }
      });
      
      res.json({ reparti });
    } catch (error) {
      logger.error('Failed to fetch Reparti', {
        component: 'reparto-routes',
        action: 'getRepartieBySite',
        error: error.message,
        stack: error.stack,
        siteId: req.params?.siteId
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch departments'
      });
    }
  }
);

// Get Reparto by ID
router.get('/:id', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'read', {
    getSiteId: async (req) => {
      const reparto = await prisma.reparto.findUnique({
        where: { id: req.params.id, deletedAt: null },
        select: { siteId: true }
      });
      return reparto?.siteId;
    }
  }),
  filterDataByPermissions(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const person = req.person || req.user;
      
      const reparto = await prisma.reparto.findUnique({ 
        where: { 
          id,
          deletedAt: null
        },
        include: {
          site: {
            include: {
              company: true
            }
          },
          responsabile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          dipendenti: {
            where: { deletedAt: null },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              title: true
            }
          }
        }
      });
      
      if (!reparto) {
        return res.status(404).json({ 
          error: 'Department not found',
          message: `Department with ID ${id} does not exist`
        });
      }
      
      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede
      
      res.json(reparto);
    } catch (error) {
      logger.error('Failed to fetch Reparto', {
        component: 'reparto-routes',
        action: 'getReparto',
        error: error.message,
        stack: error.stack,
        repartoId: req.params?.id
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch department'
      });
    }
  }
);

// Create new Reparto
router.post('/', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'create', {
    getSiteId: (req) => req.body.siteId
  }),
  async (req, res) => {
    try {
      const person = req.person || req.user;
      const { siteId, nome, descrizione, codice, responsabileId } = req.body;
      
      // Validate required fields
      if (!siteId || !nome) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'siteId and nome are required'
        });
      }
      
      // Verifica che la sede esista
      const site = await prisma.companySite.findUnique({
        where: { id: siteId },
        include: { company: true }
      });
      
      if (!site) {
        return res.status(404).json({
          error: 'Site not found',
          message: `Site with ID ${siteId} does not exist`
        });
      }
      
      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede
      
      // Verifica che il responsabile esista se specificato
      if (responsabileId) {
        const responsabile = await prisma.person.findUnique({
          where: { id: responsabileId, deletedAt: null }
        });
        
        if (!responsabile) {
          return res.status(404).json({
            error: 'Responsible person not found',
            message: `Person with ID ${responsabileId} does not exist`
          });
        }
        
        // Verifica che il responsabile appartenga alla stessa company
        if (person.globalRole !== 'ADMIN' && responsabile.companyId !== site.companyId) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Responsible person must belong to the same company'
          });
        }
      }
      
      // Verifica che non esista già un reparto con lo stesso nome nella stessa sede
      const existingReparto = await prisma.reparto.findFirst({
        where: {
          siteId,
          nome,
          deletedAt: null
        }
      });
      
      if (existingReparto) {
        return res.status(409).json({
          error: 'Conflict',
          message: `A department with name "${nome}" already exists in this site`
        });
      }
      
      const reparto = await prisma.reparto.create({ 
        data: {
          siteId,
          nome,
          descrizione,
          codice,
          responsabileId,
          tenantId: person.tenantId
        },
        include: {
          site: {
            select: {
              id: true,
              siteName: true,
              company: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          responsabile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });
      
      res.status(201).json(reparto);
    } catch (error) {
      logger.error('Failed to create Reparto', {
        component: 'reparto-routes',
        action: 'createReparto',
        error: error.message,
        stack: error.stack,
        body: req.body
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to create department'
      });
    }
  }
);

// Update Reparto
router.put('/:id', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'edit', {
    getSiteId: async (req) => {
      const reparto = await prisma.reparto.findUnique({
        where: { id: req.params.id, deletedAt: null },
        select: { siteId: true }
      });
      return reparto?.siteId;
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const person = req.person || req.user;
      const { nome, descrizione, codice, responsabileId } = req.body;
      
      // Verifica che il reparto esista
      const existingReparto = await prisma.reparto.findUnique({
        where: { id, deletedAt: null },
        include: {
          site: {
            include: { company: true }
          }
        }
      });
      
      if (!existingReparto) {
        return res.status(404).json({
          error: 'Department not found',
          message: `Department with ID ${id} does not exist`
        });
      }
      
      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede
      
      // Verifica che il responsabile esista se specificato
      if (responsabileId) {
        const responsabile = await prisma.person.findUnique({
          where: { id: responsabileId, deletedAt: null }
        });
        
        if (!responsabile) {
          return res.status(404).json({
            error: 'Responsible person not found',
            message: `Person with ID ${responsabileId} does not exist`
          });
        }
        
        // Verifica che il responsabile appartenga alla stessa company
        if (person.globalRole !== 'ADMIN' && responsabile.companyId !== existingReparto.site.companyId) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Responsible person must belong to the same company'
          });
        }
      }
      
      // Verifica che non esista già un reparto con lo stesso nome nella stessa sede (escludendo quello corrente)
      if (nome && nome !== existingReparto.nome) {
        const duplicateReparto = await prisma.reparto.findFirst({
          where: {
            siteId: existingReparto.siteId,
            nome,
            deletedAt: null,
            id: { not: id }
          }
        });
        
        if (duplicateReparto) {
          return res.status(409).json({
            error: 'Conflict',
            message: `A department with name "${nome}" already exists in this site`
          });
        }
      }
      
      const updatedReparto = await prisma.reparto.update({
        where: { id },
        data: {
          ...(nome && { nome }),
          ...(descrizione !== undefined && { descrizione }),
          ...(codice !== undefined && { codice }),
          ...(responsabileId !== undefined && { responsabileId })
        },
        include: {
          site: {
            select: {
              id: true,
              siteName: true,
              company: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          responsabile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          dipendenti: {
            where: { deletedAt: null },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });
      
      res.json(updatedReparto);
    } catch (error) {
      logger.error('Failed to update Reparto', {
        component: 'reparto-routes',
        action: 'updateReparto',
        error: error.message,
        stack: error.stack,
        repartoId: req.params?.id,
        body: req.body
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to update department'
      });
    }
  }
);

// Delete Reparto (soft delete)
router.delete('/:id', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'delete', {
    getSiteId: async (req) => {
      const reparto = await prisma.reparto.findUnique({
        where: { id: req.params.id, deletedAt: null },
        select: { siteId: true }
      });
      return reparto?.siteId;
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const person = req.person || req.user;
      
      // Verifica che il reparto esista
      const reparto = await prisma.reparto.findUnique({
        where: { id, deletedAt: null },
        include: {
          site: {
            include: { company: true }
          },
          dipendenti: {
            where: { deletedAt: null }
          }
        }
      });
      
      if (!reparto) {
        return res.status(404).json({
          error: 'Department not found',
          message: `Department with ID ${id} does not exist`
        });
      }
      
      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede
      
      // Verifica che non ci siano dipendenti assegnati al reparto
      if (reparto.dipendenti.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Cannot delete department with assigned employees. Please reassign employees first.'
        });
      }
      
      await prisma.reparto.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
      
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete Reparto', {
        component: 'reparto-routes',
        action: 'deleteReparto',
        error: error.message,
        stack: error.stack,
        repartoId: req.params?.id
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to delete department'
      });
    }
  }
);

// Assign employee to department
router.post('/:id/assign-employee', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'edit', {
    getSiteId: async (req) => {
      const reparto = await prisma.reparto.findUnique({
        where: { id: req.params.id, deletedAt: null },
        select: { siteId: true }
      });
      return reparto?.siteId;
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { personId } = req.body;
      const person = req.person || req.user;
      
      if (!personId) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'personId is required'
        });
      }
      
      // Verifica che il reparto esista
      const reparto = await prisma.reparto.findUnique({
        where: { id, deletedAt: null },
        include: {
          site: {
            include: { company: true }
          }
        }
      });
      
      if (!reparto) {
        return res.status(404).json({
          error: 'Department not found',
          message: `Department with ID ${id} does not exist`
        });
      }
      
      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede
      
      // Verifica che la persona esista
      const employee = await prisma.person.findUnique({
        where: { id: personId, deletedAt: null }
      });
      
      if (!employee) {
        return res.status(404).json({
          error: 'Employee not found',
          message: `Employee with ID ${personId} does not exist`
        });
      }
      
      // Verifica che l'employee appartenga alla stessa company
      if (person.globalRole !== 'ADMIN' && employee.companyId !== reparto.site.companyId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Employee must belong to the same company'
        });
      }
      
      // Assegna l'employee al reparto
      await prisma.person.update({
        where: { id: personId },
        data: { repartoId: id }
      });
      
      res.json({ 
        message: 'Employee assigned to department successfully',
        repartoId: id,
        personId
      });
    } catch (error) {
      logger.error('Failed to assign employee to department', {
        component: 'reparto-routes',
        action: 'assignEmployee',
        error: error.message,
        stack: error.stack,
        repartoId: req.params?.id,
        body: req.body
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to assign employee to department'
      });
    }
  }
);

// Remove employee from department
router.post('/:id/remove-employee', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'edit', {
    getSiteId: async (req) => {
      const reparto = await prisma.reparto.findUnique({
        where: { id: req.params.id, deletedAt: null },
        select: { siteId: true }
      });
      return reparto?.siteId;
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { personId } = req.body;
      const person = req.person || req.user;
      
      if (!personId) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'personId is required'
        });
      }
      
      // Verifica che il reparto esista
      const reparto = await prisma.reparto.findUnique({
        where: { id, deletedAt: null },
        include: {
          site: {
            include: { company: true }
          }
        }
      });
      
      if (!reparto) {
        return res.status(404).json({
          error: 'Department not found',
          message: `Department with ID ${id} does not exist`
        });
      }
      
      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede
      
      // Verifica che la persona esista e sia assegnata al reparto
      const employee = await prisma.person.findUnique({
        where: { id: personId, deletedAt: null }
      });
      
      if (!employee) {
        return res.status(404).json({
          error: 'Employee not found',
          message: `Employee with ID ${personId} does not exist`
        });
      }
      
      if (employee.repartoId !== id) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Employee is not assigned to this department'
        });
      }
      
      // Rimuovi l'employee dal reparto
      await prisma.person.update({
        where: { id: personId },
        data: { repartoId: null }
      });
      
      res.json({ 
        message: 'Employee removed from department successfully',
        repartoId: id,
        personId
      });
    } catch (error) {
      logger.error('Failed to remove employee from department', {
        component: 'reparto-routes',
        action: 'removeEmployee',
        error: error.message,
        stack: error.stack,
        repartoId: req.params?.id,
        body: req.body
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to remove employee from department'
      });
    }
  }
);

export default router;