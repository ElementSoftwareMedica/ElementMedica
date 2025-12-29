/**
 * Basic Authentication Middleware
 * Simple JWT authentication for API endpoints
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import { RBACService } from './rbac.js';
import { JWTService } from '../auth/jwt.js';

/**
 * Basic JWT Authentication Middleware
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token di accesso richiesto' });
    }

    const token = authHeader.substring(7);

    const decoded = JWTService.verifyAccessToken(token);

    const person = await prisma.person.findUnique({
      where: { id: decoded.personId },
      include: {
        personRoles: {
          where: { isActive: true },
          include: {
            permissions: {
              where: { isGranted: true }
            }
          }
        }
      }
    });

    if (!person) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }

    // Ottieni i permessi usando il servizio RBAC
    const permissions = await RBACService.getPersonPermissions(person.id);

    // Determina il tenantId effettivo:
    // 1. Se l'utente ha header X-Tenant-ID, usa quello (dopo verifica accesso)
    // 2. Altrimenti usa il tenantId della persona
    let effectiveTenantId = person.tenantId;
    const requestedTenantId = req.headers['x-tenant-id'];
    
    if (requestedTenantId && requestedTenantId !== person.tenantId) {
      // Verifica che l'utente abbia accesso al tenant richiesto
      // Gli admin globali hanno accesso a tutti i tenant
      if (person.globalRole === 'ADMIN' || person.globalRole === 'SUPER_ADMIN') {
        effectiveTenantId = requestedTenantId;
        logger.info({
          component: 'auth-middleware',
          action: 'tenant-override',
          personId: person.id,
          originalTenantId: person.tenantId,
          effectiveTenantId: requestedTenantId,
          reason: 'admin-global-access'
        }, 'Admin accessing different tenant');
      } else {
        // Per utenti non admin, verifica PersonTenantAccess
        const tenantAccess = await prisma.personTenantAccess.findFirst({
          where: {
            personId: person.id,
            tenantId: requestedTenantId,
            isActive: true,
            deletedAt: null
          }
        });
        
        if (tenantAccess) {
          effectiveTenantId = requestedTenantId;
          logger.info({
            component: 'auth-middleware',
            action: 'tenant-override',
            personId: person.id,
            originalTenantId: person.tenantId,
            effectiveTenantId: requestedTenantId,
            reason: 'person-tenant-access'
          }, 'User accessing different tenant via PersonTenantAccess');
        } else {
          logger.warn({
            component: 'auth-middleware',
            action: 'tenant-override-denied',
            personId: person.id,
            requestedTenantId,
            reason: 'no-access'
          }, 'Tenant access denied');
          // Non bloccare, ma usa il tenant originale
        }
      }
    }

    // Costruisci l'oggetto person con i ruoli e permessi
    req.person = {
      ...person,
      roles: person.personRoles.map(pr => pr.roleType).filter(Boolean),
      permissions: permissions,
      tenantId: effectiveTenantId, // Usa il tenant effettivo
      originalTenantId: person.tenantId, // Mantieni riferimento al tenant originale
      companyId: person.companyId
    };

    // Imposta anche req.tenantId per le query
    req.tenantId = effectiveTenantId;

    // Backwards compatibility - alcune routes usano req.user
    req.user = req.person;

    next();
  } catch (error) {
    const msg = (error && error.message) || '';
    if (msg.toLowerCase().includes('expired')) {
      return res.status(401).json({ error: 'Token scaduto' });
    }
    if (msg.toLowerCase().includes('invalid access token') || msg.toLowerCase().includes('jwt')) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    console.error('Errore durante l\'autenticazione:', error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
};

/**
 * Optional Authentication Middleware
 * Authenticates user if token is present, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JWTService.verifyAccessToken(token);
    } catch (tokenError) {
      return next();
    }

    if (decoded) {
      const { personId } = decoded;

      const person = await prisma.person.findUnique({
        where: { id: personId },
        include: {
          personRoles: {
            where: { isActive: true },
            include: {
              permissions: {
                where: { isGranted: true }
              }
            }
          }
        }
      });

      if (person && person.status === 'ACTIVE') {
        // Ottieni i permessi usando il servizio RBAC
        const permissions = await RBACService.getPersonPermissions(person.id);

        req.person = {
          id: person.id,
          personId: person.id,
          email: person.email,
          firstName: person.firstName,
          lastName: person.lastName,
          companyId: person.companyId,
          tenantId: person.tenantId,
          roles: person.personRoles.map(pr => pr.roleType),
          permissions: permissions,
          lastLogin: person.lastLogin
        };

        // Backwards compatibility - alcune routes usano req.user
        req.user = req.person;
      }
    }

    next();

  } catch (error) {
    logger.error('Optional authentication error', {
      component: 'auth',
      action: 'optionalAuth',
      error: error.message,
      ip: req.ip,
      path: req.path
    });

    next();
  }
}

/**
 * Require specific roles
 */
export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.person) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const hasRole = roles.some(role => req.person.roles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'AUTH_INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: req.person.roles
      });
    }

    next();
  };
}

/**
 * Require authentication middleware (alias for authenticate)
 * Used by clinical routes for auth requirement
 */
export const requireAuth = authenticate;

/**
 * Require specific permission middleware
 * @param {string} permission - Permission string to check (e.g., 'appointments:read')
 */
export function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.person && !req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const user = req.person || req.user;

    // Check if user has the required permission
    // Handle permissions as either array or object format
    let hasPermission = false;

    if (user.permissions) {
      if (Array.isArray(user.permissions)) {
        // Array format: ['companies:read', 'employees:write', '*']
        hasPermission = user.permissions.includes(permission) ||
          user.permissions.includes('*');
      } else if (typeof user.permissions === 'object') {
        // Object format: { 'companies:read': true, '*': true }
        hasPermission = user.permissions[permission] === true ||
          user.permissions['*'] === true ||
          user.permissions['all:*'] === true;
      }
    }

    // Also check roles for admin access
    if (!hasPermission && user.roles) {
      hasPermission = user.roles.includes('ADMIN') ||
        user.roles.includes('SUPER_ADMIN');
    }

    // Check globalRole as well
    if (!hasPermission && user.globalRole) {
      hasPermission = user.globalRole === 'ADMIN' ||
        user.globalRole === 'SUPER_ADMIN';
    }

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'AUTH_INSUFFICIENT_PERMISSIONS',
        required: permission
      });
    }

    next();
  };
}

// Export authMiddleware as alias for authenticate
export const authMiddleware = authenticate;
export { authenticate };

export default {
  authenticate,
  authMiddleware,
  optionalAuth,
  requireRoles,
  requireAuth,
  requirePermission
};