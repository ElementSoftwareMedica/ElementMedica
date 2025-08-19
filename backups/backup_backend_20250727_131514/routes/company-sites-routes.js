import express from 'express';
import logger from '../utils/logger.js';
import middleware from '../auth/middleware.js';
import { checkAdvancedPermission, filterDataByPermissions, requireOwnCompany } from '../middleware/advanced-permissions.js';
import prisma from '../config/prisma-optimization.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// Get all sites for a company
router.get('/company/:companyId', 
  authenticateToken(), 
  // checkAdvancedPermission('companies', 'read'), // Temporaneamente disabilitato per debug
  // requireOwnCompany(), // Temporaneamente commentato per debug
  // filterDataByPermissions(), // Temporaneamente disabilitato per debug
  async (req, res) => {
    try {
      const { companyId } = req.params;
      const person = req.person || req.user;
      
      // Verifica che la company esista e che l'utente abbia accesso
      const company = await prisma.company.findUnique({
        where: { id: companyId }
      });
      
      if (!company) {
        return res.status(404).json({ 
          error: 'Company not found',
          message: `Company with ID ${companyId} does not exist`
        });
      }
      
      // Se l'utente non è admin globale, verifica che appartenga alla company
      if (person.globalRole !== 'ADMIN' && person.companyId !== companyId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only access sites of your own company'
        });
      }
      
      const sites = await prisma.companySite.findMany({
        where: { 
          companyId,
          deletedAt: null
        },
        include: {
          rspp: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          medicoCompetente: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          _count: {
            select: {
              persons: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      // Restituisco i dati nel formato atteso dal frontend
      res.json({ sites });
    } catch (error) {
      logger.error('Failed to fetch company sites', {
        component: 'company-sites-routes',
        action: 'getCompanySites',
        error: error.message,
        stack: error.stack,
        companyId: req.params?.companyId
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch company sites'
      });
    }
  }
);

// Get site by ID
router.get('/:id', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'read', {
    getSiteId: (req) => req.params.id
  }),
  filterDataByPermissions(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const person = req.person || req.user;
      
      const site = await prisma.companySite.findUnique({ 
        where: { 
          id,
          deletedAt: null
        },
        include: {
          company: true,
          rspp: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          },
          medicoCompetente: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          },
          persons: {
            where: { deletedAt: null },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              title: true
            }
          }
        }
      });
      
      if (!site) {
        return res.status(404).json({ 
          error: 'Site not found',
          message: `Site with ID ${id} does not exist`
        });
      }
      
      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede
      
      res.json(site);
    } catch (error) {
      logger.error('Failed to fetch site', {
        component: 'company-sites-routes',
        action: 'getSite',
        error: error.message,
        stack: error.stack,
        siteId: req.params?.id
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch site'
      });
    }
  }
);

// Create new site
router.post('/', 
  authenticateToken(), 
  // checkAdvancedPermission('companies', 'create'), // Temporaneamente disabilitato per debug
  async (req, res) => {
    try {
      const person = req.person || req.user;
      const { companyId, siteName, ...siteData } = req.body;
      
      // Validate required fields
      if (!companyId || !siteName) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'companyId and siteName are required'
        });
      }
      
      // Verifica che la company esista
      const company = await prisma.company.findUnique({
        where: { id: companyId }
      });
      
      if (!company) {
        return res.status(404).json({
          error: 'Company not found',
          message: `Company with ID ${companyId} does not exist`
        });
      }
      
      // Verifica permessi: admin globale o appartenenza alla company
      if (person.globalRole !== 'ADMIN' && person.companyId !== companyId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only create sites for your own company'
        });
      }
      
      // Verifica che non esista già una sede con lo stesso nome per questa company
      const existingSite = await prisma.companySite.findFirst({
        where: {
          companyId,
          siteName,
          deletedAt: null
        }
      });
      
      if (existingSite) {
        return res.status(409).json({
          error: 'Conflict',
          message: `A site with name "${siteName}" already exists for this company`
        });
      }
      
      // Pulisci i dati prima di inviarli a Prisma
      const cleanedSiteData = { ...siteData };
      
      // Converti stringhe vuote in null per i campi DateTime
      const dateFields = [
        'ultimoSopralluogo',
        'prossimoSopralluogo',
        'ultimoSopralluogoRSPP', 
        'prossimoSopralluogoRSPP', 
        'ultimoSopralluogoMedico', 
        'prossimoSopralluogoMedico'
      ];
      
      dateFields.forEach(field => {
        if (cleanedSiteData[field] === '' || cleanedSiteData[field] === undefined) {
          cleanedSiteData[field] = null;
        } else if (cleanedSiteData[field]) {
          // Converti in Date se è una stringa valida
          try {
            cleanedSiteData[field] = new Date(cleanedSiteData[field]);
          } catch (e) {
            cleanedSiteData[field] = null;
          }
        }
      });

      const site = await prisma.companySite.create({ 
        data: {
          companyId,
          siteName,
          tenantId: person.tenantId,
          ...cleanedSiteData
        },
        include: {
          company: true,
          rspp: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          medicoCompetente: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });
      
      res.status(201).json(site);
    } catch (error) {
      logger.error('Failed to create site', {
        component: 'company-sites-routes',
        action: 'createSite',
        error: error.message,
        stack: error.stack,
        companyId: req.body?.companyId,
        siteName: req.body?.siteName
      });
      
      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A site with this information already exists'
        });
      }
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to create site'
      });
    }
  }
);

// Update site
router.put('/:id', 
  authenticateToken(), 
  // checkAdvancedPermission('companies', 'update'), // Temporaneamente disabilitato per debug
  async (req, res) => {
    try {
      const { id } = req.params;
      const person = req.person || req.user;
      const updateData = req.body;
      
      // Check if site exists
      const existingSite = await prisma.companySite.findUnique({ 
        where: { 
          id,
          deletedAt: null
        },
        include: {
          company: true
        }
      });
      
      if (!existingSite) {
        return res.status(404).json({ 
          error: 'Site not found',
          message: `Site with ID ${id} does not exist`
        });
      }
      
      // Verifica permessi: admin globale o appartenenza alla company
      if (person.globalRole !== 'ADMIN' && person.companyId !== existingSite.companyId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only update sites of your own company'
        });
      }
      
      // Se si sta cambiando il nome della sede, verifica che non esista già
      if (updateData.siteName && updateData.siteName !== existingSite.siteName) {
        const duplicateSite = await prisma.companySite.findFirst({
          where: {
            companyId: existingSite.companyId,
            siteName: updateData.siteName,
            deletedAt: null,
            id: { not: id }
          }
        });
        
        if (duplicateSite) {
          return res.status(409).json({
            error: 'Conflict',
            message: `A site with name "${updateData.siteName}" already exists for this company`
          });
        }
      }
      
      // Pulisci i dati prima di inviarli a Prisma
      const cleanedUpdateData = { ...updateData };
      
      // Converti stringhe vuote in null per i campi DateTime
      const dateFields = [
        'ultimoSopralluogo',
        'prossimoSopralluogo',
        'ultimoSopralluogoRSPP', 
        'prossimoSopralluogoRSPP', 
        'ultimoSopralluogoMedico', 
        'prossimoSopralluogoMedico'
      ];
      
      dateFields.forEach(field => {
        if (cleanedUpdateData[field] === '' || cleanedUpdateData[field] === undefined) {
          cleanedUpdateData[field] = null;
        } else if (cleanedUpdateData[field]) {
          // Converti in Date se è una stringa valida
          try {
            cleanedUpdateData[field] = new Date(cleanedUpdateData[field]);
          } catch (e) {
            cleanedUpdateData[field] = null;
          }
        }
      });

      const site = await prisma.companySite.update({ 
        where: { id }, 
        data: cleanedUpdateData,
        include: {
          company: true,
          rspp: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          medicoCompetente: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });
      
      res.json(site);
    } catch (error) {
      logger.error('Failed to update site', {
        component: 'company-sites-routes',
        action: 'updateSite',
        error: error.message,
        stack: error.stack,
        siteId: req.params?.id
      });
      
      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A site with this information already exists'
        });
      }
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to update site'
      });
    }
  }
);

// Delete site (soft delete)
router.delete('/:id', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'delete'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const person = req.person || req.user;
      
      // Check if site exists
      const existingSite = await prisma.companySite.findUnique({ 
        where: { 
          id,
          deletedAt: null
        }
      });
      
      if (!existingSite) {
        return res.status(404).json({ 
          error: 'Site not found',
          message: `Site with ID ${id} does not exist`
        });
      }
      
      // Verifica permessi: admin globale o appartenenza alla company
      if (person.globalRole !== 'ADMIN' && person.companyId !== existingSite.companyId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only delete sites of your own company'
        });
      }
      
      // Verifica che non ci siano dipendenti assegnati a questa sede
      const assignedPersons = await prisma.person.count({
        where: {
          siteId: id,
          deletedAt: null
        }
      });
      
      if (assignedPersons > 0) {
        return res.status(409).json({
          error: 'Conflict',
          message: `Cannot delete site: ${assignedPersons} employees are still assigned to this site`
        });
      }
      
      // Soft delete
      await prisma.companySite.update({ 
        where: { id }, 
        data: { 
          deletedAt: new Date()
        }
      });
      
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete site', {
        component: 'company-sites-routes',
        action: 'deleteSite',
        error: error.message,
        stack: error.stack,
        siteId: req.params?.id
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to delete site'
      });
    }
  }
);

export default router;