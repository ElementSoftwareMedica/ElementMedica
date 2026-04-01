import express from 'express';
import prisma from '../config/prisma-optimization.js';
import { authenticate } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import logger from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

const router = express.Router();

/**
 * Route specifiche per la Dashboard
 * Endpoint ottimizzati per fornire solo i conteggi necessari
 * Bypassano i middleware complessi per evitare timeout
 */

// Get dashboard stats - endpoint ottimizzato per contatori
router.get('/stats', authenticate, tenantMiddleware, async (req, res) => {
  try {
    const person = req.person;
    const tenantId = getEffectiveTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant non disponibile' });
    }

    logger.info('Getting dashboard stats', {
      personId: person?.id,
      tenantId,
      globalRole: person?.globalRole
    });

    // Query parallele ottimizzate per i contatori
    const [companiesCount, employeesCount] = await Promise.all([
      // Conteggio aziende (Company è globale, filtro via CompanyTenantProfile)
      prisma.company.count({
        where: {
          deletedAt: null,
          tenantProfiles: {
            some: {
              tenantId,
              deletedAt: null
            }
          }
        }
      }),

      // Conteggio dipendenti (Person è globale, filtro via PersonTenantProfile)
      prisma.person.count({
        where: {
          deletedAt: null,
          tenantProfiles: {
            some: {
              tenantId,
              status: 'ACTIVE',
              deletedAt: null
            }
          },
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
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id
    });

    res.status(500).json({
      success: false,
      error: 'Errore nel recupero delle statistiche dashboard',
    });
  }
});

// Get companies list - versione semplificata per dashboard
router.get('/companies', authenticate, tenantMiddleware, async (req, res) => {
  try {
    const person = req.person;
    const tenantId = getEffectiveTenantId(req);

    logger.info('Getting companies for dashboard', {
      personId: person?.id,
      tenantId
    });

    const companies = await prisma.company.findMany({
      where: {
        deletedAt: null,
        tenantProfiles: {
          some: {
            tenantId,
            deletedAt: null
          }
        }
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
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id
    });

    res.status(500).json({
      success: false,
      error: 'Errore nel recupero delle aziende',
    });
  }
});

// Get employees list - versione semplificata per dashboard
router.get('/employees', authenticate, tenantMiddleware, async (req, res) => {
  try {
    const person = req.person;
    const tenantId = getEffectiveTenantId(req);

    logger.info('Getting employees for dashboard', {
      personId: person?.id,
      tenantId
    });

    const employees = await prisma.person.findMany({
      where: {
        deletedAt: null,
        tenantProfiles: {
          some: {
            tenantId,
            status: 'ACTIVE',
            deletedAt: null
          }
        },
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
        taxCode: true,
        createdAt: true,
        updatedAt: true,
        tenantProfiles: {
          where: { tenantId, deletedAt: null },
          select: {
            email: true,
            phone: true,
            status: true,
            companyTenantProfileId: true
          }
        }
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
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id
    });

    res.status(500).json({
      success: false,
      error: 'Errore nel recupero dei dipendenti',
    });
  }
});

export default router;