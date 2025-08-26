/**
 * @fileoverview Gestione delle route di test e utility per i ruoli
 * @description Modulo per endpoint di test, debug e utility del sistema ruoli
 * @author Sistema di gestione ruoli
 * @version 1.0.0
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
const router = express.Router();
const prisma = new PrismaClient();

// Middleware
import { authenticate } from '../../middleware/auth.js';
import enhancedRoleService from '../../services/enhancedRoleService.js';
import logger from '../../utils/logger.js';

/**
 * @route GET /api/roles/test-no-auth
 * @desc Test endpoint per verificare che il router funzioni senza autenticazione
 * @access Public
 */
router.get('/test-no-auth', (req, res) => {
  res.json({
    success: true,
    message: 'Endpoint working without auth',
    headers: req.headers.authorization ? 'Token present' : 'No token'
  });
});

/**
 * @route GET /api/roles/auth-test-debug
 * @desc Test endpoint per verificare autenticazione con middleware
 * @access Authenticated
 */
router.get('/auth-test-debug', authenticate, async (req, res) => {
  try {
    console.log('🔍 AUTH TEST DEBUG - Request received');
    console.log('🔍 AUTH TEST DEBUG - req.person:', !!req.person);
    console.log('🔍 AUTH TEST DEBUG - req.person.id:', req.person?.id);
    console.log('🔍 AUTH TEST DEBUG - req.person.tenantId:', req.person?.tenantId);
    
    res.json({
      success: true,
      message: 'Auth middleware test successful',
      data: {
        personId: req.person?.id,
        tenantId: req.person?.tenantId,
        hasAuth: !!req.person
      }
    });
  } catch (error) {
    console.error('🚨 AUTH TEST DEBUG ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Auth middleware test failed'
    });
  }
});

/**
 * @route POST /api/roles/cleanup
 * @desc Pulisce i ruoli scaduti
 * @access Admin
 */
router.post('/cleanup',
  authenticate,
  enhancedRoleService.requirePermission('system.maintenance'),
  async (req, res) => {
    try {
      const tenantId = req.tenant.id;
      const cleanedCount = await enhancedRoleService.cleanupExpiredRoles(tenantId);

      res.json({
        success: true,
        data: {
          cleanedRoles: cleanedCount
        },
        message: `Cleaned up ${cleanedCount} expired roles`
      });
    } catch (error) {
      console.error('[ROLES_API] Error cleaning up roles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup expired roles'
      });
    }
  }
);

/**
 * @route GET /api/roles/check/:permission
 * @desc Verifica se l'utente corrente ha una specifica permissione
 * @access Authenticated
 */
router.get('/check/:permission', authenticate, async (req, res) => {
  try {
    const { permission } = req.params;
    const personId = req.person.id;
    const tenantId = req.tenant.id;
    const { companyId, departmentId } = req.query;

    const context = { tenantId };
    if (companyId) context.companyId = companyId;
    if (departmentId) context.departmentId = departmentId;

    const hasPermission = await enhancedRoleService.hasPermission(
      personId,
      permission,
      context
    );

    res.json({
      success: true,
      data: {
        permission,
        hasPermission,
        context
      }
    });
  } catch (error) {
    console.error('[ROLES_API] Error checking permission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check permission'
    });
  }
});

export default router;