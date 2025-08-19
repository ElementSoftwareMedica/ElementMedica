import express from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';
import middleware from '../auth/middleware.js';
import { checkAdvancedPermission, filterDataByPermissions, requireOwnCompany } from '../middleware/advanced-permissions.js';

const router = express.Router();
import prisma from '../config/prisma-optimization.js';

const { authenticate: authenticateToken } = middleware;

// Route di test senza middleware
router.get('/test', (req, res) => {
    const response = {
        message: 'Test route working!',
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
        method: req.method
    };
    
    res.json(response);
});

// Get all companies
router.get('/', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'read'),
  filterDataByPermissions(),
  async (req, res) => {
    try {
      const person = req.person || req.user;
      const permissionContext = req.permissionContext;
      
      let whereClause = {};
      
      // Se lo scope è 'company', limita alle companies della persona
      if (permissionContext.scope === 'company' && person.companyId) {
        whereClause.id = person.companyId;
      }
      
      const companies = await prisma.company.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }
      });
      
      res.json(companies);
    } catch (error) {
      logger.error('Failed to fetch companies', {
        component: 'companies-routes',
        action: 'getCompanies',
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch companies'
      });
    }
  }
);

// Get company by ID
router.get('/:id', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'read'),
  requireOwnCompany(),
  filterDataByPermissions(),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const company = await prisma.company.findUnique({ 
        where: { 
          id
        },
        include: {
          persons: true,
          _count: {
            select: {
              persons: true
            }
          }
        }
      });
      
      if (!company) {
        return res.status(404).json({ 
          error: 'Company not found',
          message: `Company with ID ${id} does not exist`
        });
      }
      
      res.json(company);
    } catch (error) {
      logger.error('Failed to fetch company', {
        component: 'companies-routes',
        action: 'getCompany',
        error: error.message,
        stack: error.stack,
        companyId: req.params?.id
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch company'
      });
    }
  }
);

// Create new company
router.post('/', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'create'),
  async (req, res) => {
    try {
      // Remove 'name' field if present (legacy compatibility)
      const { name, ...data } = req.body;
      
      // Validate required fields
      if (!data.ragioneSociale) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'ragioneSociale is required'
        });
      }
      
      // Check for duplicate P.IVA if provided
      if (data.piva) {
        const existingCompanyByPiva = await prisma.company.findFirst({
          where: {
            piva: data.piva,
            deletedAt: null
          }
        });
        
        if (existingCompanyByPiva) {
          return res.status(409).json({
            error: 'Duplicate P.IVA',
            message: `Un'azienda con P.IVA ${data.piva} esiste già`
          });
        }
      }
      
      const company = await prisma.company.create({ 
        data: {
          ...data
        }
      });
      
      res.status(201).json(company);
    } catch (error) {
      logger.error('Failed to create company', {
        component: 'companies-routes',
        action: 'createCompany',
        error: error.message,
        stack: error.stack,
        companyName: req.body?.ragioneSociale
      });
      
      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A company with this information already exists'
        });
      }
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to create company'
      });
    }
  }
);

// Update company
router.put('/:id', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'update'),
  requireOwnCompany(),
  async (req, res) => {
    try {
      const { id } = req.params;
      // Remove 'name' field if present (legacy compatibility)
      const { name, ...data } = req.body;
      
      // Check if company exists
      const existingCompany = await prisma.company.findUnique({ 
        where: { 
          id
        }
      });
      if (!existingCompany) {
        return res.status(404).json({ 
          error: 'Company not found',
          message: `Company with ID ${id} does not exist`
        });
      }
      
      // Check for duplicate P.IVA if provided and different from current
      if (data.piva && data.piva !== existingCompany.piva) {
        const existingCompanyByPiva = await prisma.company.findFirst({
          where: {
            piva: data.piva,
            deletedAt: null,
            id: { not: id }
          }
        });
        
        if (existingCompanyByPiva) {
          return res.status(409).json({
            error: 'Duplicate P.IVA',
            message: `Un'azienda con P.IVA ${data.piva} esiste già`
          });
        }
      }
      
      const company = await prisma.company.update({ 
        where: { id }, 
        data: {
          ...data
        }
      });
      
      res.json(company);
    } catch (error) {
      logger.error('Failed to update company', {
        component: 'companies-routes',
        action: 'updateCompany',
        error: error.message,
        stack: error.stack,
        companyId: req.params?.id
      });
      
      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A company with this information already exists'
        });
      }
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to update company'
      });
    }
  }
);

// Soft delete company
router.delete('/:id', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'delete'),
  requireOwnCompany(),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if company exists
      const existingCompany = await prisma.company.findUnique({ 
        where: { 
          id
        },
        include: {
          persons: {}
        }
      });
      
      if (!existingCompany) {
        return res.status(404).json({ 
          error: 'Company not found',
          message: `Company with ID ${id} does not exist`
        });
      }
      
      // Check if company has persons
      if (existingCompany.persons.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete company',
          message: 'Company has associated persons. Please remove or reassign persons first.'
        });
      }
      
      // Perform soft delete by updating deletedAt field
      await prisma.company.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      res.status(204).end();
    } catch (error) {
      logger.error('Failed to delete company', {
        component: 'companies-routes',
        action: 'deleteCompany',
        error: error.message,
        stack: error.stack,
        companyId: req.params?.id
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to delete company'
      });
    }
  }
);

export { router as default };