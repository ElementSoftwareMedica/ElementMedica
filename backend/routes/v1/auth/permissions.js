/**
 * Permissions Routes
 * Handles permission-related endpoints
 */

import express from 'express';
import { authenticate } from '../../../auth/middleware.js';
import logger from '../../../utils/logger.js';
import prisma from '../../../config/prisma-optimization.js';

const router = express.Router();

/**
 * @swagger
 * /auth/permissions/{personId}:
 *   get:
 *     summary: Get person permissions
 *     description: Get permissions for a specific person
 *     tags: [Authentication, Permissions]
 */
router.get('/permissions/:personId', authenticate, async (req, res) => {
  try {
    const { personId } = req.params;
    
    logger.info('🔍 [PERMISSIONS] Getting permissions for person', {
      personId: personId,
      requestedBy: req.person?.id
    });

    // Security check - only allow users to get their own permissions
    if (!req.person || req.person.id !== personId) {
      return res.status(403).json({
        error: 'Access denied - can only access own permissions',
        code: 'PERMISSION_ACCESS_DENIED'
      });
    }

    // Get role from token data
    const personRole = req.person.globalRole || req.person.role || 'ADMIN';
    
    logger.info('🚀 [PERMISSIONS] Building permissions for role', {
      personId: req.person.id,
      role: personRole
    });

    // Build permissions map - optimized for speed
    const permissionMap = {};
    
    // Add default permissions based on role
    if (personRole === 'ADMIN' || personRole === 'SUPER_ADMIN') {
      // Dashboard permissions
      permissionMap['dashboard:read'] = true;
      permissionMap['dashboard:view'] = true;
      
      // Companies permissions
      permissionMap['companies:read'] = true;
      permissionMap['companies:view'] = true;
      permissionMap['companies:create'] = true;
      permissionMap['companies:edit'] = true;
      permissionMap['companies:update'] = true;
      permissionMap['companies:delete'] = true;
      permissionMap['companies:manage'] = true;
      
      // Persons permissions
      permissionMap['persons:read'] = true;
      permissionMap['persons:view'] = true;
      permissionMap['persons:create'] = true;
      permissionMap['persons:edit'] = true;
      permissionMap['persons:update'] = true;
      permissionMap['persons:delete'] = true;
      permissionMap['persons:manage'] = true;
      
      // Users permissions
      permissionMap['users:read'] = true;
      permissionMap['users:view'] = true;
      permissionMap['users:create'] = true;
      permissionMap['users:edit'] = true;
      permissionMap['users:update'] = true;
      permissionMap['users:delete'] = true;
      permissionMap['users:manage'] = true;
      
      // Roles permissions
      permissionMap['roles:read'] = true;
      permissionMap['roles:view'] = true;
      permissionMap['roles:create'] = true;
      permissionMap['roles:edit'] = true;
      permissionMap['roles:update'] = true;
      permissionMap['roles:delete'] = true;
      permissionMap['roles:manage'] = true;
      
      // Form Templates permissions (CRITICAL)
      permissionMap['form_templates:read'] = true;
      permissionMap['form_templates:view'] = true;
      permissionMap['form_templates:create'] = true;
      permissionMap['form_templates:edit'] = true;
      permissionMap['form_templates:update'] = true;
      permissionMap['form_templates:delete'] = true;
      permissionMap['form_templates:manage'] = true;
      
      // Form Submissions permissions (CRITICAL)
      permissionMap['form_submissions:read'] = true;
      permissionMap['form_submissions:view'] = true;
      permissionMap['form_submissions:create'] = true;
      permissionMap['form_submissions:edit'] = true;
      permissionMap['form_submissions:update'] = true;
      permissionMap['form_submissions:delete'] = true;
      permissionMap['form_submissions:export'] = true;
      permissionMap['form_submissions:manage'] = true;
      
      // Public CMS permissions (CRITICAL)
      permissionMap['PUBLIC_CMS:READ'] = true;
      permissionMap['PUBLIC_CMS:read'] = true;
      permissionMap['PUBLIC_CMS:view'] = true;
      permissionMap['PUBLIC_CMS:CREATE'] = true;
      permissionMap['PUBLIC_CMS:create'] = true;
      permissionMap['PUBLIC_CMS:EDIT'] = true;
      permissionMap['PUBLIC_CMS:edit'] = true;
      permissionMap['PUBLIC_CMS:UPDATE'] = true;
      permissionMap['PUBLIC_CMS:update'] = true;
      permissionMap['PUBLIC_CMS:DELETE'] = true;
      permissionMap['PUBLIC_CMS:delete'] = true;
      permissionMap['PUBLIC_CMS:manage'] = true;
      
      // Courses permissions
      permissionMap['courses:read'] = true;
      permissionMap['courses:view'] = true;
      permissionMap['courses:create'] = true;
      permissionMap['courses:edit'] = true;
      permissionMap['courses:update'] = true;
      permissionMap['courses:delete'] = true;
      permissionMap['courses:manage'] = true;
      
      // System permissions
      permissionMap['system:admin'] = true;
      permissionMap['settings:view'] = true;
      permissionMap['settings:edit'] = true;
      permissionMap['settings:manage'] = true;
      
      // Universal permissions for admin
      permissionMap['all:read'] = true;
      permissionMap['all:view'] = true;
      permissionMap['all:create'] = true;
      permissionMap['all:edit'] = true;
      permissionMap['all:update'] = true;
      permissionMap['all:delete'] = true;
      permissionMap['all:manage'] = true;
    }
    
    logger.info('🔍 [PERMISSIONS] Sending response', {
      personId: req.person.id,
      role: personRole,
      permissionsCount: Object.keys(permissionMap).length
    });

    res.json({
      success: true,
      data: {
        personId: req.person.id,
        role: personRole,
        permissions: permissionMap
      }
    });
  } catch (error) {
    logger.error('Failed to get person permissions', {
      error: error.message,
      stack: error.stack,
      action: 'getPermissions',
      personId: req.person?.id
    });
    
    res.status(500).json({
      error: 'Failed to get permissions',
      code: 'AUTH_GET_PERMISSIONS_FAILED'
    });
  }
});

/**
 * Test endpoint without authentication to debug timeout issue
 */
router.get('/test-permissions', async (req, res) => {
  try {
    logger.info('🔍 [TEST-PERMISSIONS] Test endpoint called');
    
    // Return hardcoded permissions for admin
    const permissionMap = {
      // Form Templates permissions (CRITICAL)
      'form_templates:read': true,
      'form_templates:view': true,
      'form_templates:create': true,
      'form_templates:edit': true,
      'form_templates:update': true,
      'form_templates:delete': true,
      'form_templates:manage': true,
      
      // Form Submissions permissions (CRITICAL)
      'form_submissions:read': true,
      'form_submissions:view': true,
      'form_submissions:create': true,
      'form_submissions:edit': true,
      'form_submissions:update': true,
      'form_submissions:delete': true,
      'form_submissions:export': true,
      'form_submissions:manage': true,
      
      // Public CMS permissions (CRITICAL)
      'PUBLIC_CMS:READ': true,
      'PUBLIC_CMS:read': true,
      'PUBLIC_CMS:view': true,
      'PUBLIC_CMS:CREATE': true,
      'PUBLIC_CMS:create': true,
      'PUBLIC_CMS:EDIT': true,
      'PUBLIC_CMS:edit': true,
      'PUBLIC_CMS:UPDATE': true,
      'PUBLIC_CMS:update': true,
      'PUBLIC_CMS:DELETE': true,
      'PUBLIC_CMS:delete': true,
      'PUBLIC_CMS:manage': true,
      
      // Universal permissions for admin
      'all:read': true,
      'all:view': true,
      'all:create': true,
      'all:edit': true,
      'all:update': true,
      'all:delete': true,
      'all:manage': true
    };
    
    res.json({
      success: true,
      data: {
        personId: 'test-admin',
        role: 'ADMIN',
        permissions: permissionMap
      }
    });
  } catch (error) {
    logger.error('Test permissions failed', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Test permissions failed',
      code: 'TEST_PERMISSIONS_FAILED'
    });
  }
});

// Simplified permissions endpoint for debugging
router.get('/permissions-simple/:personId', (req, res) => {
  try {
    const { personId } = req.params;
    
    // Extract token manually for minimal processing
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Return hardcoded admin permissions for testing
    const permissions = {
      // Dashboard
      'dashboard:read': true,
      'dashboard:write': true,
      
      // Companies
      'companies:read': true,
      'companies:create': true,
      'companies:edit': true,
      'companies:delete': true,
      
      // Persons
      'persons:read': true,
      'persons:create': true,
      'persons:edit': true,
      'persons:delete': true,
      
      // Users
      'users:read': true,
      'users:create': true,
      'users:edit': true,
      'users:delete': true,
      
      // Roles
      'roles:read': true,
      'roles:create': true,
      'roles:edit': true,
      'roles:delete': true,
      
      // Form Templates
      'FORM_TEMPLATES:READ': true,
      'FORM_TEMPLATES:CREATE': true,
      'FORM_TEMPLATES:EDIT': true,
      'FORM_TEMPLATES:DELETE': true,
      'form_templates:read': true,
      'form_templates:create': true,
      'form_templates:edit': true,
      'form_templates:delete': true,
      
      // Form Submissions
      'FORM_SUBMISSIONS:READ': true,
      'FORM_SUBMISSIONS:CREATE': true,
      'FORM_SUBMISSIONS:EDIT': true,
      'FORM_SUBMISSIONS:DELETE': true,
      'form_submissions:read': true,
      'form_submissions:create': true,
      'form_submissions:edit': true,
      'form_submissions:delete': true,
      
      // Public CMS
      'PUBLIC_CMS:READ': true,
      'PUBLIC_CMS:CREATE': true,
      'PUBLIC_CMS:EDIT': true,
      'PUBLIC_CMS:DELETE': true,
      'public_cms:read': true,
      'public_cms:create': true,
      'public_cms:edit': true,
      'public_cms:delete': true,
      
      // Courses
      'courses:read': true,
      'courses:create': true,
      'courses:edit': true,
      'courses:delete': true,
      
      // System
      'system:read': true,
      'system:create': true,
      'system:edit': true,
      'system:delete': true
    };
    
    res.json({
      success: true,
      personId: personId,
      permissions: permissions,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('❌ [PERMISSIONS-SIMPLE] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;