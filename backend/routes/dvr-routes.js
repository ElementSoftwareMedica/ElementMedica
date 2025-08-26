import express from 'express';
import logger from '../utils/logger.js';
import middleware from '../auth/middleware.js';
import { checkAdvancedPermission, filterDataByPermissions } from '../middleware/advanced-permissions.js';
import prisma from '../config/prisma-optimization.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// Get all DVRs for a site
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
      
      const dvrs = await prisma.dVR.findMany({
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
          }
        },
        orderBy: { dataScadenza: 'asc' }
      });
      
      res.json({ dvrs });
    } catch (error) {
      logger.error('Failed to fetch DVRs', {
        component: 'dvr-routes',
        action: 'getDVRsBySite',
        error: error.message,
        stack: error.stack,
        siteId: req.params?.siteId
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch DVRs'
      });
    }
  }
);

// Get DVR by ID
router.get('/:id', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'read', {
    getSiteId: async (req) => {
      const dvr = await prisma.dVR.findUnique({
        where: { id: req.params.id, deletedAt: null },
        select: { siteId: true }
      });
      return dvr?.siteId;
    }
  }),
  filterDataByPermissions(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const person = req.person || req.user;
      
      const dvr = await prisma.dVR.findUnique({ 
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
      
      if (!dvr) {
        return res.status(404).json({ 
          error: 'DVR not found',
          message: `DVR with ID ${id} does not exist`
        });
      }
      
      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede
      
      res.json(dvr);
    } catch (error) {
      logger.error('Failed to fetch DVR', {
        component: 'dvr-routes',
        action: 'getDVR',
        error: error.message,
        stack: error.stack,
        dvrId: req.params?.id
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch DVR'
      });
    }
  }
);

// Create new DVR
router.post('/', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'create', {
    getSiteId: (req) => req.body.siteId
  }),
  async (req, res) => {
    try {
      const person = req.person || req.user;
      const { siteId, effettuatoDa, dataEsecuzione, dataScadenza, rischiRilevati, note } = req.body;
      
      // Validate required fields
      if (!siteId || !effettuatoDa || !dataEsecuzione || !dataScadenza) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'siteId, effettuatoDa, dataEsecuzione, and dataScadenza are required'
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
      
      const dvr = await prisma.dVR.create({ 
        data: {
          siteId,
          effettuatoDa,
          dataEsecuzione: new Date(dataEsecuzione),
          dataScadenza: new Date(dataScadenza),
          rischiRilevati,
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
          }
        }
      });
      
      res.status(201).json(dvr);
    } catch (error) {
      logger.error('Failed to create DVR', {
        component: 'dvr-routes',
        action: 'createDVR',
        error: error.message,
        stack: error.stack,
        siteId: req.body?.siteId
      });
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to create DVR'
      });
    }
  }
);

// Update DVR
router.put('/:id', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'update', {
    getSiteId: async (req) => {
      const dvr = await prisma.dVR.findUnique({
        where: { id: req.params.id, deletedAt: null },
        select: { siteId: true }
      });
      return dvr?.siteId;
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
      if (updateData.dataScadenza) {
        updateData.dataScadenza = new Date(updateData.dataScadenza);
      }
      
      // Check if DVR exists
      const existingDVR = await prisma.dVR.findUnique({ 
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
      
      if (!existingDVR) {
        return res.status(404).json({ 
          error: 'DVR not found',
          message: `DVR with ID ${id} does not exist`
        });
      }
      
      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede
      
      const dvr = await prisma.dVR.update({ 
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
          }
        }
      });
      
      res.json(dvr);
    } catch (error) {
      logger.error('Failed to update DVR', {
        component: 'dvr-routes',
        action: 'updateDVR',
        error: error.message,
        stack: error.stack,
        dvrId: req.params?.id
      });
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to update DVR'
      });
    }
  }
);

// Delete DVR (soft delete)
router.delete('/:id', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'delete', {
    getSiteId: async (req) => {
      const dvr = await prisma.dVR.findUnique({
        where: { id: req.params.id, deletedAt: null },
        select: { siteId: true }
      });
      return dvr?.siteId;
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const person = req.person || req.user;
      
      // Check if DVR exists
      const existingDVR = await prisma.dVR.findUnique({ 
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
      
      if (!existingDVR) {
        return res.status(404).json({ 
          error: 'DVR not found',
          message: `DVR with ID ${id} does not exist`
        });
      }
      
      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede
      
      // Soft delete
      await prisma.dVR.update({ 
        where: { id }, 
        data: { 
          deletedAt: new Date()
        }
      });
      
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete DVR', {
        component: 'dvr-routes',
        action: 'deleteDVR',
        error: error.message,
        stack: error.stack,
        dvrId: req.params?.id
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to delete DVR'
      });
    }
  }
);

export default router;