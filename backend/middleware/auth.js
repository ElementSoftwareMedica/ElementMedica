/**
 * Basic Authentication Middleware
 * Simple JWT authentication for API endpoints
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import { RBACService } from './rbac.js';
import { JWTService } from '../auth/jwt.js';
import { matchPermission } from '../constants/permissions.js';

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

    // P48: Include tenantProfiles per ottenere email/status/phone
    // F197: findFirst con deletedAt: null — impedisce accesso a persone soft-deleted
    const person = await prisma.person.findFirst({
      where: { id: decoded.personId, deletedAt: null },
      include: {
        personRoles: {
          where: { isActive: true, deletedAt: null }, // F250: added deletedAt
          include: {
            permissions: {
              where: { isGranted: true }
            }
          }
        },
        // P48: Include tenant profiles
        tenantProfiles: {
          where: {
            deletedAt: null,
            isActive: true
          }
        }
      }
    });

    if (!person) {
      return res.status(401).json({ error: 'Utente non trovato o non attivo' });
    }

    // P48: Prendi il profilo primario o il primo disponibile
    const primaryProfile = person.tenantProfiles?.find(p => p.isPrimary) || person.tenantProfiles?.[0] || {};

    // P48: Calcola globalRole dai personRoles PRIMA di determinare il tenant override
    const roleTypes = person.personRoles.map(pr => pr.roleType).filter(Boolean);
    const globalRole = roleTypes.includes('SUPER_ADMIN') ? 'SUPER_ADMIN' :
      roleTypes.includes('ADMIN') ? 'ADMIN' :
        roleTypes[0] || null;

    // P63: Determina il tenantId effettivo SOLO da PersonTenantProfile
    // Person.tenantId è stato RIMOSSO - usare sempre primaryProfile.tenantId
    let effectiveTenantId = primaryProfile.tenantId || null;
    const requestedTenantId = req.headers['x-tenant-id'];

    if (requestedTenantId && requestedTenantId !== effectiveTenantId) {
      // Verifica che l'utente abbia accesso al tenant richiesto
      // Gli admin globali hanno accesso a tutti i tenant
      if (globalRole === 'ADMIN' || globalRole === 'SUPER_ADMIN') {
        effectiveTenantId = requestedTenantId;
        logger.info({
          component: 'auth-middleware',
          action: 'tenant-override',
          personId: person.id,
          defaultTenantId: primaryProfile.tenantId,
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
            defaultTenantId: primaryProfile.tenantId,
            effectiveTenantId: requestedTenantId,
            reason: 'person-tenant-access'
          }, 'User accessing different tenant via PersonTenantAccess');
        } else {
          // P48: Anche controllare se l'utente ha un PersonTenantProfile sul tenant richiesto
          const hasProfile = person.tenantProfiles?.some(p => p.tenantId === requestedTenantId);
          if (hasProfile) {
            effectiveTenantId = requestedTenantId;
            logger.info({
              component: 'auth-middleware',
              action: 'tenant-override',
              personId: person.id,
              defaultTenantId: primaryProfile.tenantId,
              effectiveTenantId: requestedTenantId,
              reason: 'person-tenant-profile'
            }, 'User accessing different tenant via PersonTenantProfile');
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
    }

    // Ottieni i permessi usando il servizio RBAC, filtrati per il tenant effettivo
    const permissions = await RBACService.getPersonPermissions(person.id, effectiveTenantId);

    // Verifica che il tenant sia attivo e abbonamento valido (blocca accesso se tenant disattivato/scaduto)
    // SUPER_ADMIN/ADMIN globali possono accedere anche a tenant inattivi per gestione
    if (effectiveTenantId && globalRole !== 'SUPER_ADMIN' && globalRole !== 'ADMIN') {
      const tenantRecord = await prisma.tenant.findFirst({
        where: { id: effectiveTenantId, deletedAt: null },
        select: { isActive: true, subscriptionStatus: true, subscriptionExpiresAt: true, gracePeriodUntil: true, trialEndsAt: true }
      });

      if (tenantRecord && !tenantRecord.isActive) {
        return res.status(403).json({
          error: 'TENANT_INACTIVE',
          code: 'TENANT_INACTIVE',
          message: 'L\'abbonamento del tuo tenant non è attivo. Contatta l\'amministratore per rinnovare.'
        });
      }

      // Verifica subscription status in tempo reale (non solo al login)
      if (tenantRecord) {
        const now = new Date();
        const { subscriptionStatus, subscriptionExpiresAt, gracePeriodUntil, trialEndsAt } = tenantRecord;

        if (subscriptionStatus === 'cancelled') {
          return res.status(403).json({
            error: 'SUBSCRIPTION_CANCELLED',
            code: 'SUBSCRIPTION_CANCELLED',
            message: 'L\'abbonamento è stato cancellato. Contatta l\'amministratore per riattivarlo.'
          });
        }

        if (subscriptionStatus === 'suspended') {
          return res.status(403).json({
            error: 'SUBSCRIPTION_SUSPENDED',
            code: 'SUBSCRIPTION_SUSPENDED',
            message: 'L\'abbonamento è stato sospeso per mancato pagamento. Contatta l\'amministratore.'
          });
        }

        // Subscription scaduto e grace period terminato
        if (subscriptionExpiresAt && subscriptionExpiresAt < now) {
          const graceExpired = !gracePeriodUntil || gracePeriodUntil < now;
          if (graceExpired) {
            return res.status(403).json({
              error: 'SUBSCRIPTION_EXPIRED',
              code: 'SUBSCRIPTION_EXPIRED',
              message: 'L\'abbonamento è scaduto. Contatta l\'amministratore per il rinnovo.'
            });
          }
        }

        // Trial terminato
        if (subscriptionStatus === 'trial' && trialEndsAt && trialEndsAt < now) {
          return res.status(403).json({
            error: 'TRIAL_EXPIRED',
            code: 'TRIAL_EXPIRED',
            message: 'Il periodo di prova è terminato. Attiva un abbonamento per continuare.'
          });
        }
      }
    }

    req.person = {
      ...person,
      // P48: Includi esplicitamente tenantProfiles per validateUserTenant
      tenantProfiles: person.tenantProfiles || [],
      // P49: Flatten campi da tenantProfiles per convenienza API (evita req.person.tenantProfiles[0].email)
      email: primaryProfile.email || null,
      phone: primaryProfile.phone || null,
      status: primaryProfile.status || 'ACTIVE',
      companyTenantProfileId: primaryProfile.companyTenantProfileId || null,
      siteId: primaryProfile.siteId || null,
      // Keep other computed values
      roles: roleTypes,
      globalRole: globalRole, // P48: backward compatibility for admin checks
      permissions: permissions,
      tenantId: effectiveTenantId, // P63: Sempre da PersonTenantProfile, mai da Person.tenantId
      // P48: Mantieni riferimento al profilo primario
      _primaryProfile: primaryProfile
    };

    // NOTA: req.tenantId rimosso - usare req.person.tenantId per tutte le query

    // F313: Se mustChangePassword=true, blocca tutte le richieste eccetto
    // le rotte di cambio password, logout e refresh token.
    if (person.mustChangePassword === true) {
      const ALLOWED_PATHS_WHEN_MUST_CHANGE = [
        '/api/v1/auth/change-password',
        '/api/v1/auth/logout',
        '/api/v1/auth/refresh',
        '/api/v1/auth/verify', // Consente verify: il client rileva mustChangePassword dalla risposta
        '/health'
      ];
      // req.path è relativo al router corrente; usare req.originalUrl (percorso assoluto)
      const urlPath = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
      const isAllowed = ALLOWED_PATHS_WHEN_MUST_CHANGE.some(p => urlPath === p || urlPath.startsWith(p));
      if (!isAllowed) {
        return res.status(403).json({
          error: 'Cambio password obbligatorio',
          code: 'MUST_CHANGE_PASSWORD',
          message: 'È necessario cambiare la password prima di poter accedere all\'applicazione.'
        });
      }
    }

    next();
  } catch (error) {
    const msg = (error && error.message) || '';
    if (msg.toLowerCase().includes('expired')) {
      return res.status(401).json({ error: 'Token scaduto' });
    }
    if (msg.toLowerCase().includes('invalid access token') || msg.toLowerCase().includes('jwt')) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    logger.error({ component: 'auth', action: 'authenticate', error: error.message, ip: req.ip }, 'Authentication error');
    return res.status(500).json({ error: 'Errore interno del server' });
  }
};

/**
 * Optional Authentication Middleware
 * Authenticates user if token is present, but doesn't require it
 * P48: Include tenantProfiles per email/status
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

      // P48: Include tenantProfiles
      // F197: deletedAt: null — skip soft-deleted persons in optionalAuth
      const person = await prisma.person.findFirst({
        where: { id: personId, deletedAt: null },
        include: {
          personRoles: {
            where: { isActive: true, deletedAt: null }, // F250: added deletedAt
            include: {
              permissions: {
                where: { isGranted: true }
              }
            }
          },
          tenantProfiles: {
            where: { deletedAt: null, isActive: true }
          }
        }
      });

      // P48: Prendi il profilo primario per status check
      const primaryProfile = person?.tenantProfiles?.find(p => p.isPrimary) || person?.tenantProfiles?.[0] || {};
      const profileStatus = primaryProfile.status || 'PENDING';

      // P48: Verifica status da tenantProfiles invece che da Person
      if (person && profileStatus === 'ACTIVE') {
        // Ottieni i permessi usando il servizio RBAC
        const permissions = await RBACService.getPersonPermissions(person.id);

        req.person = {
          id: person.id,
          personId: person.id,
          // P49: Email/phone da tenantProfiles
          email: primaryProfile.email || null,
          phone: primaryProfile.phone || null,
          status: profileStatus,
          firstName: person.firstName,
          lastName: person.lastName,
          companyTenantProfileId: primaryProfile.companyTenantProfileId || null,
          tenantId: primaryProfile.tenantId, // P63: SOLO da PersonTenantProfile
          roles: person.personRoles.map(pr => pr.roleType),
          permissions: permissions,
          lastLogin: person.lastLogin,
          _primaryProfile: primaryProfile
        };
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
        error: 'Autenticazione richiesta',
        code: 'AUTH_REQUIRED'
      });
    }

    const hasRole = roles.some(role => req.person.roles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: 'Permessi insufficienti',
        code: 'AUTH_INSUFFICIENT_PERMISSIONS'
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
    if (!req.person) {
      return res.status(401).json({
        error: 'Autenticazione richiesta',
        code: 'AUTH_REQUIRED'
      });
    }

    const person = req.person;

    // Check if user has the required permission
    // Handle permissions as either array or object format
    let hasPermission = false;

    if (person.permissions) {
      if (Array.isArray(person.permissions)) {
        // Array format: ['clinica.visite:read', 'companies:read', '*']
        for (const userPerm of person.permissions) {
          if (matchPermission(userPerm, permission)) {
            hasPermission = true;
            break;
          }
        }
      } else if (typeof person.permissions === 'object') {
        // Object format: { 'clinica.visite:read': true, '*': true }
        for (const userPerm of Object.keys(person.permissions)) {
          if (person.permissions[userPerm] === true && matchPermission(userPerm, permission)) {
            hasPermission = true;
            break;
          }
        }
      }
    }

    // Also check roles for admin access
    if (!hasPermission && person.roles) {
      hasPermission = person.roles.includes('ADMIN') ||
        person.roles.includes('SUPER_ADMIN');
    }

    // Check globalRole as well
    if (!hasPermission && person.globalRole) {
      hasPermission = person.globalRole === 'ADMIN' ||
        person.globalRole === 'SUPER_ADMIN';
    }

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Permessi insufficienti',
        code: 'AUTH_INSUFFICIENT_PERMISSIONS'
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