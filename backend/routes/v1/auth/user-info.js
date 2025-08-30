/**
 * User Information Routes
 * Handles user profile and verification endpoints
 */

import express from 'express';
import { authenticateTest } from '../../../auth/middleware-test.js';
import prisma from '../../../config/prisma-optimization.js';
import { logger } from '../../../utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current person
 *     description: Get current authenticated person information
 *     tags: [Authentication]
 */
router.get('/me', authenticateTest, async (req, res) => {
  try {
    const person = await prisma.person.findUnique({
      where: { id: req.person.id },
      include: {
        company: true,
        personRoles: {
          include: {
            permissions: {
              where: {
                isGranted: true
              }
            }
          }
        }
      }
    });

    if (!person) {
      return res.status(404).json({
        error: 'Person not found',
        message: 'Person account not found'
      });
    }

    res.json({
      id: person.id,
      email: person.email,
      firstName: person.firstName,
      lastName: person.lastName,
      role: person.role,
      companyId: person.companyId,
      isActive: person.status === 'ACTIVE',
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
      lastLogin: person.lastLogin,
      company: person.company ? {
        id: person.company.id,
        name: person.company.name
      } : null,
      roles: person.personRoles.map(pr => pr.roleType),
      permissions: person.personRoles.flatMap(pr => 
        pr.permissions.map(p => p.permission)
      )
    });
  } catch (error) {
    logger.error('Get person error', {
      error: error.message,
      stack: error.stack,
      personId: req.person?.personId
    });
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while retrieving person information'
    });
  }
});

/**
 * @swagger
 * /auth/verify:
 *   get:
 *     summary: Verify JWT token
 *     description: Verifies if the provided JWT token is valid and returns person information with permissions
 *     tags: [Authentication]
 */
router.get('/verify', authenticateTest, async (req, res) => {
  try {
    logger.info('🔍 [VERIFY] Token verification started', {
      personId: req.person?.id,
      email: req.person?.email
    });

    // Fetch person with complete information including roles and permissions
    const person = await prisma.person.findUnique({
      where: { id: req.person.id },
      include: {
        company: true,
        personRoles: {
          include: {
            customRole: true,
            permissions: {
              where: {
                isGranted: true
              }
            }
          }
        }
      }
    });

    if (!person) {
      return res.status(401).json({
        valid: false,
        error: 'Person not found',
        message: 'Person account not found'
      });
    }

    // Build permissions map
    const permissionMap = {};
    
    // Get role-based permissions
    person.personRoles.forEach(personRole => {
      if (personRole.permissions) {
        personRole.permissions.forEach(rolePermission => {
          if (rolePermission.permission) {
            permissionMap[rolePermission.permission] = true;
          }
        });
      }
    });

    // Build roles array including customRole/roleType and fallback to globalRole
    const roles = Array.from(new Set([
      ...person.personRoles
        .map(pr => pr.customRole?.name || pr.roleType)
        .filter(Boolean),
      ...(person.globalRole ? [person.globalRole] : []),
      ...(Array.isArray(req.person?.roles) ? req.person.roles.filter(Boolean) : [])
    ]));
  
    // Determine primary role with fallback to globalRole
    const personRole = roles.length > 0
      ? roles[0]
      : (person.globalRole || (Array.isArray(req.person?.roles) && req.person.roles.length > 0 ? req.person.roles[0] : null));
  
    // Add default permissions based on role
    const isAdmin =
      personRole === 'ADMIN' ||
      personRole === 'SUPER_ADMIN' ||
      roles.includes('ADMIN') ||
      roles.includes('SUPER_ADMIN') ||
      (Array.isArray(req.person?.roles) && (req.person.roles.includes('ADMIN') || req.person.roles.includes('SUPER_ADMIN')));
    if (isAdmin) {
      // Admin permissions
      permissionMap['dashboard:view'] = true;
      permissionMap['dashboard:read'] = true;
      permissionMap['companies:view'] = true;
      permissionMap['companies:read'] = true;
      permissionMap['companies:create'] = true;
      permissionMap['companies:write'] = true;
      permissionMap['companies:edit'] = true;
      permissionMap['companies:delete'] = true;
      permissionMap['companies:manage'] = true;
      
      // Tenants permissions (admin defaults)
      permissionMap['tenants:view'] = true;
      permissionMap['tenants:read'] = true;
      
      // Persons permissions
      permissionMap['persons:view'] = true;
      permissionMap['persons:read'] = true;
      permissionMap['persons:create'] = true;
      permissionMap['persons:edit'] = true;
      permissionMap['persons:delete'] = true;
      permissionMap['persons:manage'] = true;
      
      // Users permissions
      permissionMap['users:view'] = true;
      permissionMap['users:read'] = true;
      permissionMap['users:create'] = true;
      permissionMap['users:edit'] = true;
      permissionMap['users:delete'] = true;
      permissionMap['users:manage'] = true;
      
      // Employees permissions
      permissionMap['employees:view'] = true;
      permissionMap['employees:read'] = true;
      permissionMap['employees:create'] = true;
      permissionMap['employees:edit'] = true;
      permissionMap['employees:delete'] = true;
      permissionMap['employees:manage'] = true;
      
      // Trainers permissions
      permissionMap['trainers:view'] = true;
      permissionMap['trainers:read'] = true;
      permissionMap['trainers:create'] = true;
      permissionMap['trainers:edit'] = true;
      permissionMap['trainers:delete'] = true;
      permissionMap['trainers:manage'] = true;
      
      // Courses permissions
      permissionMap['courses:view'] = true;
      permissionMap['courses:read'] = true;
      permissionMap['courses:create'] = true;
      permissionMap['courses:edit'] = true;
      permissionMap['courses:delete'] = true;
      permissionMap['courses:manage'] = true;
      
      // Enrollments permissions
      permissionMap['enrollments:view'] = true;
      permissionMap['enrollments:read'] = true;
      permissionMap['enrollments:create'] = true;
      permissionMap['enrollments:edit'] = true;
      permissionMap['enrollments:delete'] = true;
      permissionMap['enrollments:manage'] = true;
      
      // Documents permissions
      permissionMap['documents:view'] = true;
      permissionMap['documents:read'] = true;
      permissionMap['documents:create'] = true;
      permissionMap['documents:edit'] = true;
      permissionMap['documents:delete'] = true;
      permissionMap['documents:download'] = true;
      permissionMap['documents:manage'] = true;
      
      // Roles permissions
      permissionMap['roles:view'] = true;
      permissionMap['roles:read'] = true;
      permissionMap['roles:create'] = true;
      permissionMap['roles:edit'] = true;
      permissionMap['roles:delete'] = true;
      permissionMap['roles:manage'] = true;
      
      // System permissions
      permissionMap['system:admin'] = true;
      permissionMap['admin:access'] = true;
      permissionMap['settings:view'] = true;
      permissionMap['settings:edit'] = true;
      permissionMap['settings:manage'] = true;
      
      // GDPR permissions
      permissionMap['gdpr:view'] = true;
      permissionMap['gdpr:read'] = true;
      permissionMap['gdpr:export'] = true;
      permissionMap['gdpr:delete'] = true;
      permissionMap['gdpr:manage'] = true;
      
      // Consents permissions
      permissionMap['consents:view'] = true;
      permissionMap['consents:read'] = true;
      permissionMap['consents:create'] = true;
      permissionMap['consents:edit'] = true;
      permissionMap['consents:delete'] = true;
      permissionMap['consents:manage'] = true;
      
      // Reports permissions
      permissionMap['reports:view'] = true;
      permissionMap['reports:read'] = true;
      permissionMap['reports:create'] = true;
      permissionMap['reports:edit'] = true;
      permissionMap['reports:delete'] = true;
      permissionMap['reports:export'] = true;
      permissionMap['reports:manage'] = true;
      
      // Management permissions
      permissionMap['management:tenant'] = true;
      permissionMap['management:system'] = true;
      
      // Form Templates permissions
      permissionMap['form_templates:view'] = true;
      permissionMap['form_templates:read'] = true;
      permissionMap['form_templates:create'] = true;
      permissionMap['form_templates:edit'] = true;
      permissionMap['form_templates:delete'] = true;
      permissionMap['form_templates:manage'] = true;
      
      // Form Submissions permissions
      permissionMap['form_submissions:view'] = true;
      permissionMap['form_submissions:read'] = true;
      permissionMap['form_submissions:create'] = true;
      permissionMap['form_submissions:edit'] = true;
      permissionMap['form_submissions:delete'] = true;
      permissionMap['form_submissions:export'] = true;
      permissionMap['form_submissions:manage'] = true;
      
      // Public CMS permissions (both formats for compatibility)
      permissionMap['public_cms:view'] = true;
      permissionMap['public_cms:read'] = true;
      permissionMap['public_cms:create'] = true;
      permissionMap['public_cms:edit'] = true;
      permissionMap['public_cms:delete'] = true;
      permissionMap['public_cms:manage'] = true;
      
      // Public CMS permissions (uppercase format for frontend compatibility)
      permissionMap['PUBLIC_CMS:VIEW'] = true;
      permissionMap['PUBLIC_CMS:READ'] = true;
      permissionMap['PUBLIC_CMS:CREATE'] = true;
      permissionMap['PUBLIC_CMS:EDIT'] = true;
      permissionMap['PUBLIC_CMS:UPDATE'] = true;
      permissionMap['PUBLIC_CMS:DELETE'] = true;
      permissionMap['PUBLIC_CMS:MANAGE'] = true;
    }

    logger.info('🔍 [VERIFY] Token verification successful', {
      personId: person.id,
      email: person.email,
      role: personRole,
      roles: roles,
      permissionsCount: Object.keys(permissionMap).length
    });

    // Token is valid, return complete user info with permissions
    res.json({
      valid: true,
      user: {
        id: person.id,
        personId: person.id,
        email: person.email,
        username: person.username,
        firstName: person.firstName,
        lastName: person.lastName,
        companyId: person.companyId,
        tenantId: person.tenantId,
        role: personRole,
        roles: roles,
        company: person.company ? {
          id: person.company.id,
          name: person.company.name
        } : null,
        tenant: person.tenant || null,
        isActive: person.status === 'ACTIVE',
        lastLogin: person.lastLogin
      },
      permissions: permissionMap,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Token verification failed', {
      error: error.message,
      stack: error.stack,
      personId: req.person?.id
    });
    
    res.status(401).json({
      valid: false,
      error: 'Token verification failed',
      message: 'An error occurred during token verification'
    });
  }
});

export default router;