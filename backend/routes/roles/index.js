/**
 * Roles Router - Sistema di gestione dei ruoli refactorizzato
 * 
 * Questo è il router principale che orchestra tutti i moduli del sistema dei ruoli.
 * Sostituisce il file roles.js monolitico con un'architettura modulare.
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';

// Import dei middleware
import { authAndTenant } from './middleware/auth.js';
import { logRoleRequest, logRoleError } from './middleware/logging.js';

// Import dei moduli specializzati
import hierarchyRoutes from './hierarchy.js';
import basicManagementRoutes from './basic-management.js';
import customRolesRoutes from './custom-roles.js';
import assignmentRoutes from './assignment.js';
import advancedPermissionsRoutes from './advanced-permissions.js';
import permissionsRoutes from './permissions.js';
import usersRoutes from './users.js';
import analyticsRoutes from './analytics.js';
import testUtilsRoutes from './test-utils.js';

// Inizializzazione
const router = express.Router();
const prisma = new PrismaClient();

// Endpoint di test semplice
router.get('/test-simple', (req, res) => {
  res.json({
    success: true,
    message: 'Simple test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Endpoint pubblico per ottenere i ruoli di sistema
router.get('/public', async (req, res) => {
  try {
    // Lista statica dei ruoli di sistema basata sull'enum RoleType
    const systemRoles = [
      { id: 'EMPLOYEE', name: 'EMPLOYEE', displayName: 'Employee', description: 'Sistema role: employee' },
      { id: 'MANAGER', name: 'MANAGER', displayName: 'Manager', description: 'Sistema role: manager' },
      { id: 'HR_MANAGER', name: 'HR_MANAGER', displayName: 'Hr Manager', description: 'Sistema role: hr manager' },
      { id: 'DEPARTMENT_HEAD', name: 'DEPARTMENT_HEAD', displayName: 'Department Head', description: 'Sistema role: department head' },
      { id: 'TRAINER', name: 'TRAINER', displayName: 'Trainer', description: 'Sistema role: trainer' },
      { id: 'SENIOR_TRAINER', name: 'SENIOR_TRAINER', displayName: 'Senior Trainer', description: 'Sistema role: senior trainer' },
      { id: 'TRAINER_COORDINATOR', name: 'TRAINER_COORDINATOR', displayName: 'Trainer Coordinator', description: 'Sistema role: trainer coordinator' },
      { id: 'EXTERNAL_TRAINER', name: 'EXTERNAL_TRAINER', displayName: 'External Trainer', description: 'Sistema role: external trainer' },
      { id: 'SUPER_ADMIN', name: 'SUPER_ADMIN', displayName: 'Super Admin', description: 'Sistema role: super admin' },
      { id: 'ADMIN', name: 'ADMIN', displayName: 'Admin', description: 'Sistema role: admin' },
      { id: 'COMPANY_ADMIN', name: 'COMPANY_ADMIN', displayName: 'Company Admin', description: 'Sistema role: company admin' },
      { id: 'TENANT_ADMIN', name: 'TENANT_ADMIN', displayName: 'Tenant Admin', description: 'Sistema role: tenant admin' },
      { id: 'TRAINING_ADMIN', name: 'TRAINING_ADMIN', displayName: 'Training Admin', description: 'Sistema role: training admin' },
      { id: 'CLINIC_ADMIN', name: 'CLINIC_ADMIN', displayName: 'Clinic Admin', description: 'Sistema role: clinic admin' },
      { id: 'COMPANY_MANAGER', name: 'COMPANY_MANAGER', displayName: 'Company Manager', description: 'Sistema role: company manager' },
      { id: 'VIEWER', name: 'VIEWER', displayName: 'Viewer', description: 'Sistema role: viewer' },
      { id: 'OPERATOR', name: 'OPERATOR', displayName: 'Operator', description: 'Sistema role: operator' },
      { id: 'COORDINATOR', name: 'COORDINATOR', displayName: 'Coordinator', description: 'Sistema role: coordinator' },
      { id: 'SUPERVISOR', name: 'SUPERVISOR', displayName: 'Supervisor', description: 'Sistema role: supervisor' },
      { id: 'GUEST', name: 'GUEST', displayName: 'Guest', description: 'Sistema role: guest' },
      { id: 'CONSULTANT', name: 'CONSULTANT', displayName: 'Consultant', description: 'Sistema role: consultant' },
      { id: 'AUDITOR', name: 'AUDITOR', displayName: 'Auditor', description: 'Sistema role: auditor' }
    ];

    res.json({
      success: true,
      data: systemRoles
    });
  } catch (error) {
    console.error('Error fetching system roles:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Middleware globali per tutte le altre route dei ruoli (autenticate)
router.use(authAndTenant);
router.use(logRoleRequest);

// Endpoint di test per l'autenticazione
router.get('/test-auth', async (req, res) => {
  try {
    logger.info('Test auth endpoint called', {
      userId: req.person?.id,
      tenantId: req.tenant?.id || req.person?.tenantId,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Authentication successful',
      data: {
        user: {
          id: req.person?.id,
          email: req.person?.email,
          name: req.person?.name
        },
        tenant: {
          id: req.tenant?.id || req.person?.tenantId,
          name: req.tenant?.name
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Test auth endpoint error', {
      error: error.message,
      stack: error.stack,
      userId: req.person?.id,
      tenantId: req.tenant?.id || req.person?.tenantId
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication test'
    });
  }
});

// Montaggio dei moduli specializzati
// IMPORTANTE: L'ordine è critico! Route più specifiche devono essere montate prima di quelle generiche

// 1. Gestione della gerarchia dei ruoli (route specifiche /hierarchy/*)
router.use('/hierarchy', hierarchyRoutes);

// 2. Gestione dei ruoli personalizzati (route specifiche /custom/*)
router.use('/custom', customRolesRoutes);

// 3. Gestione degli utenti per ruolo (route specifiche /users/*)
router.use('/users', usersRoutes);

// 4. Statistiche sui ruoli (route specifiche /stats/*)
router.use('/stats', analyticsRoutes);

// 5. Gestione dei permessi dei ruoli (include /permissions)
router.use('/', permissionsRoutes);

// 6. Gestione dei permessi avanzati
router.use('/', advancedPermissionsRoutes);

// 7. Assegnazione e rimozione ruoli
router.use('/', assignmentRoutes);

// 8. Test e utility (route di test, cleanup, check)
router.use('/', testUtilsRoutes);

// 9. Gestione base dei ruoli (CRUD, listing) - DEVE essere ultimo per non intercettare altre route
router.use('/', basicManagementRoutes);

// Endpoint di health check per il sistema dei ruoli
router.get('/health', async (req, res) => {
  try {
    // Verifica la connessione al database
    await prisma.$queryRaw`SELECT 1`;
    
    // Verifica che i servizi essenziali siano disponibili
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        authentication: req.person ? 'authenticated' : 'not_authenticated',
        tenant: req.tenant || req.person?.tenantId ? 'available' : 'not_available'
      },
      modules: {
        hierarchy: 'loaded',
        basicManagement: 'loaded',
        customRoles: 'loaded',
        assignment: 'loaded',
        advancedPermissions: 'loaded',
        permissions: 'loaded',
        users: 'loaded',
        statistics: 'loaded',
        testUtils: 'loaded'
      }
    };

    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    logger.error('Health check failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(503).json({
      success: false,
      error: 'Service unavailable',
      details: 'Health check failed'
    });
  }
});

// Endpoint per ottenere informazioni sui moduli caricati
router.get('/modules', (req, res) => {
  try {
    const moduleInfo = {
      totalModules: 8,
      modules: [
        {
          name: 'hierarchy',
          description: 'Gestione della gerarchia dei ruoli',
          endpoints: [
            'GET /hierarchy',
            'GET /hierarchy/user/:userId',
            'GET /hierarchy/current-user',
            'POST /hierarchy/assign',
            'POST /hierarchy/assign-permissions',
            'GET /hierarchy/assignable/:roleType',
            'GET /hierarchy/visible',
            'PUT /hierarchy/move'
          ]
        },
        {
          name: 'basic-management',
          description: 'Gestione base dei ruoli (CRUD)',
          endpoints: [
            'GET /',
            'POST /',
            'GET /:roleType',
            'PUT /:roleType',
            'DELETE /:roleType'
          ]
        },
        {
          name: 'custom-roles',
          description: 'Gestione dei ruoli personalizzati',
          endpoints: [
            'POST /custom',
            'PUT /custom/:id',
            'DELETE /custom/:id'
          ]
        },
        {
          name: 'assignment',
          description: 'Assegnazione e rimozione ruoli',
          endpoints: [
            'POST /assign',
            'DELETE /remove'
          ]
        },
        {
          name: 'advanced-permissions',
          description: 'Gestione dei permessi avanzati',
          endpoints: [
            'GET /:roleType/advanced-permissions',
            'DELETE /:roleType/advanced-permissions'
          ]
        },
        {
          name: 'permissions',
          description: 'Gestione dei permessi dei ruoli',
          endpoints: [
            'GET /permissions',
            'GET /:roleType/permissions',
            'PUT /:roleType/permissions'
          ]
        },
        {
          name: 'users',
          description: 'Gestione degli utenti per ruolo',
          endpoints: [
            'GET /users',
            'GET /user/:personId',
            'PUT /user/:personId/permissions'
          ]
        },
        {
          name: 'analytics',
          description: 'Statistiche e analytics sui ruoli',
          endpoints: [
            'GET /stats'
          ]
        },
        {
          name: 'test-utils',
          description: 'Test, utility e manutenzione',
          endpoints: [
            'GET /test-no-auth',
            'GET /auth-test-debug',
            'POST /cleanup',
            'GET /check/:permission'
          ]
        }
      ],
      refactoredFrom: 'roles.js (2627 lines)',
      refactoredAt: new Date().toISOString(),
      benefits: [
        'Modularità migliorata',
        'Manutenibilità aumentata',
        'Testabilità semplificata',
        'Separazione delle responsabilità',
        'Scalabilità migliorata'
      ]
    };

    res.json({
      success: true,
      data: moduleInfo
    });
  } catch (error) {
    logger.error('Module info endpoint error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve module information'
    });
  }
});

// Middleware di gestione errori specifico per i ruoli
router.use(logRoleError);

// Gestione delle route non trovate
router.use('*', (req, res) => {
  logger.warn('Role route not found', {
    method: req.method,
    url: req.originalUrl,
    userId: req.person?.id,
    tenantId: req.tenant?.id || req.person?.tenantId
  });

  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The requested role endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: [
      'GET /api/roles/health',
      'GET /api/roles/modules',
      'GET /api/roles/test-auth',
      'GET /api/roles/hierarchy/*',
      'GET /api/roles/custom/*',
      'POST /api/roles/assign',
      'DELETE /api/roles/remove',
      'GET /api/roles/users',
      'GET /api/roles/stats'
    ]
  });
});

// Cleanup delle risorse quando il processo termina
process.on('beforeExit', async () => {
  try {
    await prisma.$disconnect();
    logger.info('Prisma client disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting Prisma client', {
      error: error.message
    });
  }
});

export default router;