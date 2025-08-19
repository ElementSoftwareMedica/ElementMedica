import express from 'express';
import logger from '../utils/logger.js';
import middleware from '../auth/middleware.js';
import { checkAdvancedPermission, filterDataByPermissions } from '../middleware/advanced-permissions.js';
import prisma from '../config/prisma-optimization.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// Get all sopralluoghi for a site
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
      
      const sopralluoghi = await prisma.sopralluogo.findMany({
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
          esecutore: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              title: true
            }
          }
        },
        orderBy: { dataEsecuzione: 'desc' }
      });
      
      res.json({ sopralluoghi });
    } catch (error) {
      logger.error('Failed to fetch sopralluoghi', {
        component: 'sopralluogo-routes',
        action: 'getSopralluoghiBySite',
        error: error.message,
        stack: error.stack,
        siteId: req.params?.siteId
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch sopralluoghi'
      });
    }
  }
);

// Get sopralluogo by ID
router.get('/:id', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'read', {
    getSiteId: async (req) => {
      const sopralluogo = await prisma.sopralluogo.findUnique({
        where: { id: req.params.id, deletedAt: null },
        select: { siteId: true }
      });
      return sopralluogo?.siteId;
    }
  }),
  filterDataByPermissions(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const person = req.person || req.user;
      
      const sopralluogo = await prisma.sopralluogo.findUnique({ 
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
          esecutore: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              title: true,
              phone: true
            }
          }
        }
      });
      
      if (!sopralluogo) {
        return res.status(404).json({ 
          error: 'Sopralluogo not found',
          message: `Sopralluogo with ID ${id} does not exist`
        });
      }
      
      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede
      
      res.json(sopralluogo);
    } catch (error) {
      logger.error('Failed to fetch sopralluogo', {
        component: 'sopralluogo-routes',
        action: 'getSopralluogo',
        error: error.message,
        stack: error.stack,
        sopralluogoId: req.params?.id
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch sopralluogo'
      });
    }
  }
);

// Create new sopralluogo
router.post('/', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'create', {
    getSiteId: (req) => req.body.siteId
  }),
  async (req, res) => {
    try {
      const person = req.person || req.user;
      const { 
        siteId, 
        esecutoreId, 
        dataEsecuzione, 
        dataProssimoSopralluogo, 
        valutazione, 
        esito, 
        note 
      } = req.body;
      
      // Validate required fields
      if (!siteId || !dataEsecuzione) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'siteId and dataEsecuzione are required'
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
      
      // Se è specificato un esecutore, verifica che esista
      if (esecutoreId) {
        const esecutore = await prisma.person.findUnique({
          where: { id: esecutoreId }
        });
        
        if (!esecutore) {
          return res.status(404).json({
            error: 'Executor not found',
            message: `Person with ID ${esecutoreId} does not exist`
          });
        }
      }
      
      const sopralluogo = await prisma.sopralluogo.create({ 
        data: {
          siteId,
          esecutoreId,
          dataEsecuzione: new Date(dataEsecuzione),
          dataProssimoSopralluogo: dataProssimoSopralluogo ? new Date(dataProssimoSopralluogo) : null,
          valutazione,
          esito,
          note,
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
          esecutore: {
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
      
      res.status(201).json(sopralluogo);
    } catch (error) {
      logger.error('Failed to create sopralluogo', {
        component: 'sopralluogo-routes',
        action: 'createSopralluogo',
        error: error.message,
        stack: error.stack,
        siteId: req.body?.siteId
      });
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to create sopralluogo'
      });
    }
  }
);

// Update sopralluogo
router.put('/:id', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'update', {
    getSiteId: async (req) => {
      const sopralluogo = await prisma.sopralluogo.findUnique({
        where: { id: req.params.id, deletedAt: null },
        select: { siteId: true }
      });
      return sopralluogo?.siteId;
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const person = req.person || req.user;
      const updateData = { ...req.body };
      
      // Convert date strings to Date objects if present
      if (updateData.dataEsecuzione) {
        updateData.dataEsecuzione = new Date(updateData.dataEsecuzione);
      }
      if (updateData.dataProssimoSopralluogo) {
        updateData.dataProssimoSopralluogo = new Date(updateData.dataProssimoSopralluogo);
      }
      
      // Check if sopralluogo exists
      const existingSopralluogo = await prisma.sopralluogo.findUnique({ 
        where: { 
          id,
          deletedAt: null
        },
        include: {
          site: {
            include: {
              company: true
            }
          }
        }
      });
      
      if (!existingSopralluogo) {
        return res.status(404).json({ 
          error: 'Sopralluogo not found',
          message: `Sopralluogo with ID ${id} does not exist`
        });
      }
      
      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede
      
      // Se si sta cambiando l'esecutore, verifica che esista
      if (updateData.esecutoreId) {
        const esecutore = await prisma.person.findUnique({
          where: { id: updateData.esecutoreId }
        });
        
        if (!esecutore) {
          return res.status(404).json({
            error: 'Executor not found',
            message: `Person with ID ${updateData.esecutoreId} does not exist`
          });
        }
      }
      
      const sopralluogo = await prisma.sopralluogo.update({ 
        where: { id }, 
        data: updateData,
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
          esecutore: {
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
      
      res.json(sopralluogo);
    } catch (error) {
      logger.error('Failed to update sopralluogo', {
        component: 'sopralluogo-routes',
        action: 'updateSopralluogo',
        error: error.message,
        stack: error.stack,
        sopralluogoId: req.params?.id
      });
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to update sopralluogo'
      });
    }
  }
);

// Delete sopralluogo (soft delete)
router.delete('/:id', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'delete', {
    getSiteId: async (req) => {
      const sopralluogo = await prisma.sopralluogo.findUnique({
        where: { id: req.params.id, deletedAt: null },
        select: { siteId: true }
      });
      return sopralluogo?.siteId;
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const person = req.person || req.user;
      
      // Check if sopralluogo exists
      const existingSopralluogo = await prisma.sopralluogo.findUnique({ 
        where: { 
          id,
          deletedAt: null
        },
        include: {
          site: {
            include: {
              company: true
            }
          }
        }
      });
      
      if (!existingSopralluogo) {
        return res.status(404).json({ 
          error: 'Sopralluogo not found',
          message: `Sopralluogo with ID ${id} does not exist`
        });
      }
      
      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede
      
      // Soft delete
      await prisma.sopralluogo.update({ 
        where: { id }, 
        data: { 
          deletedAt: new Date()
        }
      });
      
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete sopralluogo', {
        component: 'sopralluogo-routes',
        action: 'deleteSopralluogo',
        error: error.message,
        stack: error.stack,
        sopralluogoId: req.params?.id
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to delete sopralluogo'
      });
    }
  }
);

export default router;