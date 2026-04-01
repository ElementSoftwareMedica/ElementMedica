/**
 * User Information Routes
 * Handles user profile and verification endpoints
 */

import express from 'express';
import authMiddleware from '../../../middleware/auth.js';
const { authenticate } = authMiddleware;
import prisma from '../../../config/prisma-optimization.js';
import { logger } from '../../../utils/logger.js';
import { RBACService } from '../../../middleware/rbac.js';

const router = express.Router();

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current person
 *     description: Get current authenticated person information
 *     tags: [Authentication]
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    // P48: req.person è già arricchito dal middleware auth con dati flattened
    const person = await prisma.person.findUnique({
      where: { id: req.person.id },
      include: {
        personRoles: {
          where: { isActive: true, deletedAt: null },
          include: {
            permissions: {
              where: { isGranted: true }
            },
            companyTenantProfile: {
              include: { company: true }
            }
          }
        },
        tenantProfiles: {
          where: { deletedAt: null, isActive: true }
        }
      }
    });

    if (!person) {
      return res.status(404).json({
        error: 'Persona non trovata',
        message: 'Account persona non trovato'
      });
    }

    // P48: Estrai dati dal profilo tenant del req.person (già risolto dal middleware)
    const primaryProfile = person.tenantProfiles?.find(p => p.isPrimary) || person.tenantProfiles?.[0] || {};
    const profileEmail = primaryProfile.email || null;
    const profileStatus = primaryProfile.status || 'ACTIVE';

    // Get permissions scoped to the effective tenant
    const permissions = await RBACService.getPersonPermissions(person.id, req.person.tenantId);

    // Ottieni companyTenantProfile dalla prima role attiva
    const activeRole = person.personRoles?.[0];
    const companyProfile = activeRole?.companyTenantProfile;

    res.json({
      id: person.id,
      email: profileEmail,
      firstName: person.firstName,
      lastName: person.lastName,
      globalRole: req.person.globalRole,
      tenantId: req.person.tenantId,
      companyTenantProfileId: primaryProfile.companyTenantProfileId || null,
      isActive: profileStatus === 'ACTIVE',
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
      lastLogin: person.lastLogin,
      company: companyProfile?.company ? {
        id: companyProfile.company.id,
        ragioneSociale: companyProfile.company.ragioneSociale || companyProfile.company.name
      } : null,
      roles: person.personRoles.map(pr => pr.roleType),
      permissions: permissions
    });
  } catch (error) {
    logger.error('Get person error', {
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.personId
    });

    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Si è verificato un errore nel recupero delle informazioni utente'
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
router.get('/verify', authenticate, async (req, res) => {
  try {
    logger.info('🔍 [VERIFY] Token verification started', {
      personId: req.person?.id,
      email: req.person?.email
    });

    // Fetch person with complete information including roles and permissions
    const person = await prisma.person.findUnique({
      where: { id: req.person.id },
      include: {
        personRoles: {
          where: { isActive: true, deletedAt: null },
          include: {
            customRole: true,
            permissions: {
              where: { isGranted: true }
            },
            companyTenantProfile: {
              include: { company: true }
            }
          }
        },
        tenantProfiles: {
          where: { deletedAt: null, isActive: true }
        }
      }
    });

    if (!person) {
      return res.status(401).json({
        valid: false,
        error: 'Persona non trovata',
        message: 'Account persona non trovato'
      });
    }

    // Filter personRoles by effective tenant for correct per-tenant permission scoping
    const effectiveTenantId = req.person.tenantId;
    const tenantPersonRoles = effectiveTenantId
      ? person.personRoles.filter(pr => pr.tenantId === effectiveTenantId)
      : person.personRoles;

    // Build permissions map
    const permissionMap = {};

    // Merge permissions from auth middleware (already tenant-scoped via RBACService)
    if (req.person?.permissions) {
      if (Array.isArray(req.person.permissions)) {
        req.person.permissions.forEach(p => { permissionMap[p] = true; });
      } else if (typeof req.person.permissions === 'object') {
        Object.assign(permissionMap, req.person.permissions);
      }
    }

    // Also add role-specific DB permissions for the current tenant only
    tenantPersonRoles.forEach(personRole => {
      if (personRole.permissions) {
        personRole.permissions.forEach(rolePermission => {
          if (rolePermission.permission) {
            permissionMap[rolePermission.permission] = true;
          }
        });
      }
    });

    // Build roles array from tenant-scoped roles only
    // Preserve SUPER_ADMIN globally (system-level admin always has full access)
    const roles = Array.from(new Set([
      ...tenantPersonRoles
        .map(pr => pr.customRole?.name || pr.roleType)
        .filter(Boolean),
      ...(req.person.globalRole === 'SUPER_ADMIN' ? ['SUPER_ADMIN'] : [])
    ]));

    // Determine primary role
    const personRole = roles.length > 0
      ? roles[0]
      : (req.person.globalRole || null);

    // Add default permissions based on tenant-scoped role
    const isAdmin =
      tenantPersonRoles.some(pr => pr.roleType === 'ADMIN' || pr.roleType === 'SUPER_ADMIN') ||
      req.person.globalRole === 'SUPER_ADMIN';
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
      permissionMap['courses:update'] = true;
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

      // Templates permissions (training document templates)
      permissionMap['templates:view'] = true;
      permissionMap['templates:read'] = true;
      permissionMap['templates:create'] = true;
      permissionMap['templates:edit'] = true;
      permissionMap['templates:update'] = true;
      permissionMap['templates:delete'] = true;
      permissionMap['templates:manage'] = true;
      permissionMap['templates:duplicate'] = true;

      // Template uppercase format (for middleware compatibility)
      permissionMap['VIEW_TEMPLATES'] = true;
      permissionMap['CREATE_TEMPLATES'] = true;
      permissionMap['EDIT_TEMPLATES'] = true;
      permissionMap['DELETE_TEMPLATES'] = true;
      permissionMap['MANAGE_TEMPLATES'] = true;

      // Google integration permissions
      permissionMap['google:connect'] = true;
      permissionMap['google:import'] = true;
      permissionMap['google:manage'] = true;

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

      // CMS Pages permissions (for ProtectedRoute compatibility)
      permissionMap['cms_pages:view'] = true;
      permissionMap['cms_pages:read'] = true;
      permissionMap['cms_pages:create'] = true;
      permissionMap['cms_pages:edit'] = true;
      permissionMap['cms_pages:update'] = true;
      permissionMap['cms_pages:delete'] = true;
      permissionMap['cms_pages:manage'] = true;
      permissionMap['cms_pages:publish'] = true;

      // CMS Pages permissions (uppercase format for backend middleware)
      permissionMap['VIEW_CMS_PAGES'] = true;
      permissionMap['CREATE_CMS_PAGES'] = true;
      permissionMap['EDIT_CMS_PAGES'] = true;
      permissionMap['DELETE_CMS_PAGES'] = true;
      permissionMap['PUBLISH_CMS_PAGES'] = true;
      permissionMap['MANAGE_CMS_PAGES'] = true;

      // CMS Media permissions
      permissionMap['cms_media:view'] = true;
      permissionMap['cms_media:read'] = true;
      permissionMap['cms_media:create'] = true;
      permissionMap['cms_media:upload'] = true;
      permissionMap['cms_media:edit'] = true;
      permissionMap['cms_media:delete'] = true;
      permissionMap['cms_media:manage'] = true;

      // CMS Media permissions (uppercase format for backend middleware)
      permissionMap['VIEW_CMS_MEDIA'] = true;
      permissionMap['CREATE_CMS_MEDIA'] = true;
      permissionMap['UPLOAD_CMS_MEDIA'] = true;
      permissionMap['EDIT_CMS_MEDIA'] = true;
      permissionMap['DELETE_CMS_MEDIA'] = true;
      permissionMap['MANAGE_CMS_MEDIA'] = true;

      // Backup permissions
      permissionMap['backup:view'] = true;
      permissionMap['backup:read'] = true;
      permissionMap['backup:create'] = true;
      permissionMap['backup:restore'] = true;
      permissionMap['backup:delete'] = true;
      permissionMap['backup:manage'] = true;

      // Preventivi permissions (colon format for backend middleware)
      permissionMap['read:preventivi'] = true;
      permissionMap['create:preventivi'] = true;
      permissionMap['update:preventivi'] = true;
      permissionMap['delete:preventivi'] = true;
      permissionMap['manage:preventivi'] = true;
      permissionMap['preventivi:read'] = true;
      permissionMap['preventivi:create'] = true;
      permissionMap['preventivi:update'] = true;
      permissionMap['preventivi:delete'] = true;
      permissionMap['preventivi:manage'] = true;

      // Schedules permissions
      permissionMap['read:schedules'] = true;
      permissionMap['create:schedules'] = true;
      permissionMap['update:schedules'] = true;
      permissionMap['delete:schedules'] = true;
      permissionMap['manage:schedules'] = true;
      permissionMap['schedules:read'] = true;
      permissionMap['schedules:create'] = true;
      permissionMap['schedules:update'] = true;
      permissionMap['schedules:delete'] = true;
      permissionMap['schedules:manage'] = true;

      // Attestati permissions
      permissionMap['read:attestati'] = true;
      permissionMap['create:attestati'] = true;
      permissionMap['update:attestati'] = true;
      permissionMap['delete:attestati'] = true;
      permissionMap['manage:attestati'] = true;
      permissionMap['attestati:read'] = true;
      permissionMap['attestati:create'] = true;
      permissionMap['attestati:update'] = true;
      permissionMap['attestati:delete'] = true;
      permissionMap['attestati:manage'] = true;

      // Lettere Incarico permissions
      permissionMap['read:lettere-incarico'] = true;
      permissionMap['create:lettere-incarico'] = true;
      permissionMap['update:lettere-incarico'] = true;
      permissionMap['delete:lettere-incarico'] = true;
      permissionMap['manage:lettere-incarico'] = true;

      // Registri Presenze permissions
      permissionMap['read:registri-presenze'] = true;
      permissionMap['create:registri-presenze'] = true;
      permissionMap['update:registri-presenze'] = true;
      permissionMap['delete:registri-presenze'] = true;
      permissionMap['manage:registri-presenze'] = true;

      // Codici Sconto permissions
      permissionMap['read:codici-sconto'] = true;
      permissionMap['create:codici-sconto'] = true;
      permissionMap['update:codici-sconto'] = true;
      permissionMap['delete:codici-sconto'] = true;
      permissionMap['manage:codici-sconto'] = true;

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
      role: personRole,
      roles: roles,
      permissionsFromMiddleware: req.person?.permissions?.length || 0,
      permissionsFromMap: Object.keys(permissionMap).length
    });

    // Use permissions from middleware (already loaded and mapped)
    const finalPermissions = req.person?.permissions || [];

    // P48: Estrai dati dal profilo tenant
    const verifyProfile = person.tenantProfiles?.find(p => p.isPrimary) || person.tenantProfiles?.[0] || {};
    const verifyActiveRole = person.personRoles?.[0];
    const verifyCompanyProfile = verifyActiveRole?.companyTenantProfile;

    // Token is valid, return complete user info with permissions
    res.json({
      valid: true,
      user: {
        id: person.id,
        personId: person.id,
        email: verifyProfile.email || null,
        username: person.username,
        firstName: person.firstName,
        lastName: person.lastName,
        companyTenantProfileId: verifyProfile.companyTenantProfileId || null,
        tenantId: req.person.tenantId,
        globalRole: req.person.globalRole,
        role: personRole,
        roles: roles,
        permissions: finalPermissions,
        company: verifyCompanyProfile?.company ? {
          id: verifyCompanyProfile.company.id,
          ragioneSociale: verifyCompanyProfile.company.ragioneSociale || verifyCompanyProfile.company.name
        } : null,
        isActive: (verifyProfile.status || 'ACTIVE') === 'ACTIVE',
        lastLogin: person.lastLogin
      },
      permissions: permissionMap,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Token verification failed', {
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id
    });

    res.status(401).json({
      valid: false,
      error: 'Verifica token fallita',
      message: 'Si è verificato un errore durante la verifica del token'
    });
  }
});

export default router;