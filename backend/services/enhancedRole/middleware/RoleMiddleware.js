import { logger } from '../../../utils/logger.js';
import { hasPermission } from '../permissions/PermissionChecker.js';
// import { convertPermissionsToBackend } from '../../../utils/permissionMapping.js';

/**
 * Middleware per la verifica dei permessi
 * Modulo estratto da EnhancedRoleService per migliorare la manutenibilità
 */

/**
 * Middleware per verificare se l'utente ha i permessi necessari
 * @param {string|string[]} requiredPermissions - Permesso/i richiesto/i
 * @param {Object} options - Opzioni aggiuntive
 * @param {string} options.resource - Risorsa specifica (opzionale)
 * @param {string} options.action - Azione specifica (opzionale)
 * @param {Function} options.getResourceId - Funzione per ottenere l'ID della risorsa dalla request
 * @param {boolean} options.requireAll - Se true, richiede tutti i permessi (default: false)
 */
export function requirePermission(requiredPermissions, options = {}) {
  return async (req, res, next) => {
    try {
      const userId = req.person?.id || req.user?.id || req.userId;
      const tenantId = req.tenant?.id || req.tenantId;

      if (!userId) {
        logger.warn('[ROLE_MIDDLEWARE] Missing user ID in request');
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // OTTIMIZZAZIONE: Bypass per utenti ADMIN/SUPER_ADMIN per evitare timeout
      const userRoles = req.person?.roles || req.user?.roles || [];
      const globalRole = req.person?.globalRole || req.user?.globalRole;
      const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN') || globalRole === 'ADMIN' || globalRole === 'SUPER_ADMIN';
      
      if (isAdmin) {
        logger.info('[ROLE_MIDDLEWARE] Admin user bypassing permission check', {
          userId,
          roles: userRoles,
          globalRole,
          requiredPermissions
        });
        
        // Converte i permessi per coerenza anche per gli admin
        const frontendPermissions = Array.isArray(requiredPermissions) 
          ? requiredPermissions 
          : [requiredPermissions];
        // const backendPermissions = convertPermissionsToBackend(frontendPermissions);
        const backendPermissions = frontendPermissions; // Temporaneo
        
        // Aggiungi informazioni sui permessi alla request
        req.userPermissions = {
          verified: frontendPermissions,
          verifiedBackend: backendPermissions,
          hasAll: true,
          hasAny: true,
          bypassedAsAdmin: true
        };
        
        return next();
      }
      
      if (!tenantId) {
        logger.warn('[ROLE_MIDDLEWARE] Missing tenant ID in request');
        return res.status(400).json({
          error: 'Tenant context required',
          code: 'TENANT_REQUIRED'
        });
      }
      
      // Normalizza i permessi richiesti in array
      const frontendPermissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];

      // Converte i permessi dal formato frontend a quello backend
      // const backendPermissions = convertPermissionsToBackend(frontendPermissions);
      const backendPermissions = frontendPermissions; // Temporaneo

      // Verifica i permessi solo per utenti non-admin
      const permissionChecks = await Promise.all(
        backendPermissions.map(permission => 
          hasPermission(userId, permission, tenantId, {
            resource: options.resource,
            action: options.action,
            resourceId: options.getResourceId ? options.getResourceId(req) : null
          })
        )
      );

      // Determina se l'utente ha i permessi necessari
      const hasRequiredPermissions = options.requireAll 
        ? permissionChecks.every(Boolean)
        : permissionChecks.some(Boolean);

      if (!hasRequiredPermissions) {
        logger.warn('[ROLE_MIDDLEWARE] Permission denied', {
          userId,
          tenantId,
          requiredPermissions: frontendPermissions,
          backendPermissions: backendPermissions,
          resource: options.resource,
          action: options.action
        });

        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          required: frontendPermissions,
          backend: backendPermissions
        });
      }

      // Aggiungi informazioni sui permessi alla request per uso successivo
      req.userPermissions = {
        verified: frontendPermissions,
        verifiedBackend: backendPermissions,
        hasAll: permissionChecks.every(Boolean),
        hasAny: permissionChecks.some(Boolean)
      };

      next();
    } catch (error) {
      logger.error('[ROLE_MIDDLEWARE] Error checking permissions:', error);
      res.status(500).json({
        error: 'Internal server error during permission check',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
}

/**
 * Middleware per verificare ruoli specifici
 * @param {string|string[]} requiredRoles - Ruolo/i richiesto/i
 * @param {Object} options - Opzioni aggiuntive
 * @param {boolean} options.requireAll - Se true, richiede tutti i ruoli (default: false)
 * @param {boolean} options.allowGlobal - Se true, accetta anche ruoli globali (default: true)
 */
export function requireRole(requiredRoles, options = {}) {
  return async (req, res, next) => {
    try {
      const userId = req.person?.id || req.user?.id || req.userId;
      const tenantId = req.tenant?.id || req.tenantId;

      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Importa getUserRoles dinamicamente per evitare dipendenze circolari
      const { getUserRoles } = await import('../core/RoleCore.js');
      
      const userRoles = await getUserRoles(userId, tenantId);
      const userRoleTypes = userRoles.map(role => role.roleType);

      // Normalizza i ruoli richiesti in array
      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

      // Verifica se l'utente ha i ruoli necessari
      const hasRequiredRoles = options.requireAll
        ? roles.every(role => userRoleTypes.includes(role))
        : roles.some(role => userRoleTypes.includes(role));

      if (!hasRequiredRoles) {
        logger.warn('[ROLE_MIDDLEWARE] Role access denied', {
          userId,
          tenantId,
          requiredRoles: roles,
          userRoles: userRoleTypes
        });

        return res.status(403).json({
          error: 'Insufficient role privileges',
          code: 'ROLE_DENIED',
          required: roles
        });
      }

      // Aggiungi informazioni sui ruoli alla request
      req.userRoles = userRoles;
      req.userRoleTypes = userRoleTypes;

      next();
    } catch (error) {
      logger.error('[ROLE_MIDDLEWARE] Error checking roles:', error);
      res.status(500).json({
        error: 'Internal server error during role check',
        code: 'ROLE_CHECK_ERROR'
      });
    }
  };
}

/**
 * Middleware per verificare se l'utente è admin
 */
export function requireAdmin() {
  return requireRole(['SUPER_ADMIN', 'ADMIN', 'TENANT_ADMIN'], {
    requireAll: false
  });
}

/**
 * Middleware per verificare se l'utente è super admin
 */
export function requireSuperAdmin() {
  return requireRole('SUPER_ADMIN');
}

/**
 * Middleware per verificare se l'utente può gestire una specifica azienda
 * @param {Function} getCompanyId - Funzione per ottenere l'ID dell'azienda dalla request
 */
export function requireCompanyAccess(getCompanyId) {
  return async (req, res, next) => {
    try {
      const userId = req.person?.id || req.user?.id || req.userId;
      const tenantId = req.tenant?.id || req.tenantId;
      const companyId = getCompanyId ? getCompanyId(req) : req.params.companyId;

      if (!userId || !tenantId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (!companyId) {
        return res.status(400).json({
          error: 'Company ID required',
          code: 'COMPANY_ID_REQUIRED'
        });
      }

      // Importa getUserRoles dinamicamente
      const { getUserRoles } = await import('../core/RoleCore.js');
      
      const userRoles = await getUserRoles(userId, tenantId);

      // Verifica se l'utente ha accesso globale o specifico alla company
      const hasAccess = userRoles.some(role => 
        // Ruoli globali che possono accedere a tutte le company
        ['SUPER_ADMIN', 'ADMIN', 'TENANT_ADMIN'].includes(role.roleType) ||
        // Ruolo specifico per questa company
        (role.companyId === companyId)
      );

      if (!hasAccess) {
        logger.warn('[ROLE_MIDDLEWARE] Company access denied', {
          userId,
          tenantId,
          companyId,
          userRoles: userRoles.map(r => ({ type: r.roleType, companyId: r.companyId }))
        });

        return res.status(403).json({
          error: 'Access denied to this company',
          code: 'COMPANY_ACCESS_DENIED'
        });
      }

      // Aggiungi informazioni alla request
      req.companyId = companyId;
      req.hasGlobalAccess = userRoles.some(role => 
        ['SUPER_ADMIN', 'ADMIN', 'TENANT_ADMIN'].includes(role.roleType)
      );

      next();
    } catch (error) {
      logger.error('[ROLE_MIDDLEWARE] Error checking company access:', error);
      res.status(500).json({
        error: 'Internal server error during company access check',
        code: 'COMPANY_ACCESS_CHECK_ERROR'
      });
    }
  };
}

/**
 * Middleware combinato per verificare sia permessi che ruoli
 * @param {Object} requirements - Requisiti di accesso
 * @param {string|string[]} requirements.permissions - Permessi richiesti
 * @param {string|string[]} requirements.roles - Ruoli richiesti
 * @param {boolean} requirements.requireAllPermissions - Se true, richiede tutti i permessi
 * @param {boolean} requirements.requireAllRoles - Se true, richiede tutti i ruoli
 */
export function requireAccess(requirements = {}) {
  return async (req, res, next) => {
    try {
      const { permissions, roles, requireAllPermissions = false, requireAllRoles = false } = requirements;

      // Se sono specificati sia permessi che ruoli, verifica entrambi
      if (permissions && roles) {
        // Crea middleware temporanei per la verifica
        const permissionMiddleware = requirePermission(permissions, { requireAll: requireAllPermissions });
        const roleMiddleware = requireRole(roles, { requireAll: requireAllRoles });

        // Esegui la verifica dei permessi
        await new Promise((resolve, reject) => {
          permissionMiddleware(req, res, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });

        // Esegui la verifica dei ruoli
        await new Promise((resolve, reject) => {
          roleMiddleware(req, res, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });

        next();
      } else if (permissions) {
        // Solo verifica permessi
        const middleware = requirePermission(permissions, { requireAll: requireAllPermissions });
        middleware(req, res, next);
      } else if (roles) {
        // Solo verifica ruoli
        const middleware = requireRole(roles, { requireAll: requireAllRoles });
        middleware(req, res, next);
      } else {
        // Nessun requisito specificato, procedi
        next();
      }
    } catch (error) {
      logger.error('[ROLE_MIDDLEWARE] Error in combined access check:', error);
      res.status(500).json({
        error: 'Internal server error during access check',
        code: 'ACCESS_CHECK_ERROR'
      });
    }
  };
}

export default {
  requirePermission,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireCompanyAccess,
  requireAccess
};