import express from 'express';
import prisma from '../config/prisma-optimization.js';
import { authenticate } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Route specifiche per la Dashboard
 * Endpoint ottimizzati per fornire solo i conteggi necessari
 * Bypassano i middleware complessi per evitare timeout
 */

// Get dashboard stats - endpoint ottimizzato per contatori
router.get('/stats', authenticate, tenantMiddleware, async (req, res) => {
  try {
    const person = req.person || req.user;
    const tenantId = req.tenantId || person?.tenantId;
    
    logger.info('Getting dashboard stats', { 
      personId: person?.id,
      tenantId,
      globalRole: person?.globalRole
    });

    // Query parallele ottimizzate per i contatori
    const [companiesCount, employeesCount] = await Promise.all([
      // Conteggio aziende
      prisma.company.count({
        where: {
          deletedAt: null,
          ...(tenantId && { tenantId })
        }
      }),
      
      // Conteggio dipendenti (persone con ruoli di dipendente)
      prisma.person.count({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
          ...(tenantId && { tenantId }),
          personRoles: {
            some: {
              roleType: { 
                in: ['EMPLOYEE', 'COMPANY_MANAGER', 'TRAINER']
              },
              isActive: true,
              deletedAt: null
            }
          }
        }
      })
    ]);

    const stats = {
      totalCompanies: companiesCount,
      totalEmployees: employeesCount,
      timestamp: new Date().toISOString()
    };

    logger.info('Dashboard stats retrieved successfully', stats);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting dashboard stats:', {
      error: error.message,
      stack: error.stack,
      personId: req.person?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard stats',
      details: error.message
    });
  }
});

// Get companies list - versione semplificata per dashboard
router.get('/companies', authenticate, tenantMiddleware, async (req, res) => {
  try {
    const person = req.person || req.user;
    const tenantId = req.tenantId || person?.tenantId;
    
    logger.info('Getting companies for dashboard', { 
      personId: person?.id,
      tenantId 
    });

    const companies = await prisma.company.findMany({
      where: {
        deletedAt: null,
        ...(tenantId && { tenantId })
      },
      select: {
        id: true,
        ragioneSociale: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Trasforma per compatibilità con dashboard
    const transformedCompanies = companies.map(company => ({
      ...company,
      name: company.ragioneSociale || '',
      sector: '',
      ragioneSociale: company.ragioneSociale || ''
    }));

    logger.info('Companies retrieved successfully for dashboard', { 
      count: transformedCompanies.length 
    });

    res.json(transformedCompanies);

  } catch (error) {
    logger.error('Error getting companies for dashboard:', {
      error: error.message,
      stack: error.stack,
      personId: req.person?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve companies',
      details: error.message
    });
  }
});

// Get employees list - versione semplificata per dashboard
router.get('/employees', authenticate, tenantMiddleware, async (req, res) => {
  try {
    const person = req.person || req.user;
    const tenantId = req.tenantId || person?.tenantId;
    
    logger.info('Getting employees for dashboard', { 
      personId: person?.id,
      tenantId 
    });

    const employees = await prisma.person.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        ...(tenantId && { tenantId }),
        personRoles: {
          some: {
            roleType: { 
              in: [
                'COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'TRAINER_COORDINATOR', 
                'SENIOR_TRAINER', 'TRAINER', 'EXTERNAL_TRAINER', 'EMPLOYEE', 
                'COMPANY_MANAGER', 'TRAINING_ADMIN', 'CLINIC_ADMIN', 'VIEWER', 
                'OPERATOR', 'COORDINATOR', 'SUPERVISOR', 'GUEST', 'CONSULTANT', 'AUDITOR'
              ]
            },
            isActive: true,
            deletedAt: null
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        taxCode: true,
        companyId: true,
        tenantId: true,
        status: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });

    logger.info('Employees retrieved successfully for dashboard', { 
      count: employees.length 
    });

    res.json(employees);

  } catch (error) {
    logger.error('Error getting employees for dashboard:', {
      error: error.message,
      stack: error.stack,
      personId: req.person?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve employees',
      details: error.message
    });
  }
});

export default router;