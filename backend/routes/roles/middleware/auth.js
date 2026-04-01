/**
 * Auth Middleware - Middleware di autenticazione per il sistema dei ruoli
 * 
 * Questo modulo contiene middleware per l'autenticazione, autorizzazione
 * e controllo dei permessi nel sistema di gestione dei ruoli.
 */

import prisma from '../../../config/prisma-optimization.js';
import { authenticate, authMiddleware as baseAuthMiddleware, optionalAuth, requireRoles } from '../../../middleware/auth.js';
import { tenantMiddleware } from '../../../middleware/tenant.js';
import enhancedRoleService from '../../../services/enhancedRoleService.js';
import roleHierarchyService from '../../../services/roleHierarchyService.js';
import logger from '../../../utils/logger.js';


/**
 * Middleware di autenticazione base
 * Wrapper per il middleware di autenticazione esistente
 */
export const authMiddleware = baseAuthMiddleware;

/**
 * Middleware per il controllo del tenant
 * Wrapper per il middleware tenant esistente
 */
export const tenantAuth = tenantMiddleware;

/**
 * Middleware per richiedere un permesso specifico
 * @param {string} permission - Permesso richiesto
 * @returns {Function} Middleware function
 */
export function requirePermission(permission) {
  return enhancedRoleService.requirePermission(permission);
}

/**
 * Middleware per verificare se l'utente può gestire i ruoli
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export async function requireRoleManagement(req, res, next) {
  try {
    const userId = req.person?.id;
    const tenantId = req.tenant?.id || req.person?.tenantId;
    const globalRole = req.person?.globalRole;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Autenticazione richiesta'
      });
    }

    // CORREZIONE: Se l'utente ha globalRole SUPER_ADMIN o ADMIN, consenti l'accesso immediatamente
    if (globalRole === 'SUPER_ADMIN' || globalRole === 'ADMIN') {
      logger.debug({ globalRole, userId }, 'Role management access granted via globalRole');
      return next();
    }

    // Verifica se l'utente ha il permesso ROLE_MANAGEMENT
    const hasPermission = await enhancedRoleService.hasPermission(
      userId,
      'ROLE_MANAGEMENT',
      { tenantId }
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Permessi insufficienti per la gestione dei ruoli'
      });
    }

    next();
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', userId: req.person?.id }, 'Errore verifica permessi gestione ruoli');
    res.status(500).json({
      success: false,
      error: 'Errore nella verifica dei permessi'
    });
  }
}

/**
 * Middleware per verificare se l'utente può accedere ai dati di un altro utente
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export async function requireUserAccess(req, res, next) {
  try {
    const currentUserId = req.person?.id;
    const targetUserId = req.params.personId || req.body.personId;
    const tenantId = req.tenant?.id || req.person?.tenantId;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        error: 'Autenticazione richiesta'
      });
    }

    // L'utente può sempre accedere ai propri dati
    if (currentUserId === targetUserId) {
      return next();
    }

    // Altrimenti verifica se ha permessi di gestione utenti
    const hasPermission = await enhancedRoleService.hasPermission(
      currentUserId,
      'users.read',
      { tenantId }
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Accesso negato'
      });
    }

    next();
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', userId: req.person?.id }, 'Errore verifica permessi accesso utente');
    res.status(500).json({
      success: false,
      error: 'Errore nella verifica dei permessi di accesso'
    });
  }
}

/**
 * Middleware per verificare se l'utente può gestire ruoli gerarchici
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export async function requireHierarchyManagement(req, res, next) {
  try {
    const userId = req.person?.id;
    // CORREZIONE: Usa prima il tenantId dell'utente, poi quello risolto dal dominio
    const tenantId = req.person?.tenantId || req.tenant?.id;
    const globalRole = req.person?.globalRole;

    logger.debug({ userId, tenantId, globalRole }, 'requireHierarchyManagement check');

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Autenticazione richiesta'
      });
    }

    // CORREZIONE: Se l'utente ha globalRole SUPER_ADMIN o ADMIN, consenti l'accesso immediatamente
    if (globalRole === 'SUPER_ADMIN' || globalRole === 'ADMIN') {
      logger.debug({ globalRole, userId }, 'Hierarchy management access granted via globalRole');
      req.userRoles = [globalRole];
      req.userHighestRole = globalRole;
      req.userLevel = globalRole === 'SUPER_ADMIN' ? 0 : 1;
      return next();
    }

    // Ottieni i ruoli dell'utente dalla tabella PersonRole
    const userRoles = await prisma.personRole.findMany({
      where: {
        personId: userId,
        tenantId: tenantId,
        deletedAt: null
      }
    });

    logger.debug({ userRolesCount: userRoles.length }, 'userRoles found');

    const userRoleTypes = userRoles.map(role => role.roleType);
    const highestRole = roleHierarchyService.getHighestRole(userRoleTypes);

    logger.debug({ highestRole }, 'highestRole resolved');

    // Verifica se l'utente ha un ruolo sufficientemente alto per gestire la gerarchia
    const userLevel = roleHierarchyService.getRoleLevel(highestRole);

    logger.debug({ userLevel, check: userLevel <= 1 }, 'userLevel check');

    // CORREZIONE: Solo SUPER_ADMIN (livello 0) e ADMIN (livello 1) possono gestire la gerarchia
    // Livelli più bassi (0, 1) hanno più permessi, livelli più alti (2, 3, 4...) hanno meno permessi
    if (userLevel > 1) {
      return res.status(403).json({
        success: false,
        error: 'Permessi insufficienti per la gestione della gerarchia'
      });
    }

    // Aggiungi i dati dell'utente alla request per uso successivo
    req.userRoles = userRoleTypes;
    req.userHighestRole = highestRole;
    req.userLevel = userLevel;

    next();
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', userId: req.person?.id }, 'Errore verifica permessi gerarchia');
    res.status(500).json({
      success: false,
      error: 'Errore nella verifica dei permessi della gerarchia'
    });
  }
}

/**
 * Middleware per verificare se l'utente può assegnare un ruolo specifico
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export async function requireRoleAssignmentPermission(req, res, next) {
  try {
    const userId = req.person?.id;
    const tenantId = req.tenant?.id || req.person?.tenantId;
    const targetRoleType = req.body.roleType;
    const globalRole = req.person?.globalRole;

    if (!userId || !targetRoleType) {
      return res.status(400).json({
        success: false,
        error: 'ID utente e tipo ruolo obbligatori'
      });
    }

    // CORREZIONE: Se l'utente ha globalRole SUPER_ADMIN o ADMIN, può assegnare qualsiasi ruolo
    if (globalRole === 'SUPER_ADMIN' || globalRole === 'ADMIN') {
      logger.debug({ globalRole, userId }, 'Role assignment access granted via globalRole');
      req.userRoles = [globalRole];
      req.userHighestRole = globalRole;
      return next();
    }

    // Ottieni i ruoli dell'utente corrente dalla tabella PersonRole
    const userRoles = await prisma.personRole.findMany({
      where: {
        personId: userId,
        tenantId: tenantId,
        deletedAt: null
      }
    });

    const userRoleTypes = userRoles.map(role => role.roleType);
    const currentUserHighestRole = roleHierarchyService.getHighestRole(userRoleTypes);

    // Verifica se l'utente può assegnare questo ruolo
    const canAssign = roleHierarchyService.canAssignToRole(currentUserHighestRole, targetRoleType);

    if (!canAssign) {
      return res.status(403).json({
        success: false,
        error: 'Permessi insufficienti per assegnare questo ruolo'
      });
    }

    // Aggiungi i dati dell'utente alla request
    req.userRoles = userRoleTypes;
    req.userHighestRole = currentUserHighestRole;

    next();
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', userId: req.person?.id }, 'Errore verifica permessi assegnazione ruolo');
    res.status(500).json({
      success: false,
      error: 'Errore nella verifica dei permessi di assegnazione ruolo'
    });
  }
}

/**
 * Middleware per verificare se l'utente può accedere alle statistiche
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export async function requireAnalyticsAccess(req, res, next) {
  try {
    const userId = req.person?.id;
    const tenantId = req.tenant?.id || req.person?.tenantId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Autenticazione richiesta'
      });
    }

    const hasPermission = await enhancedRoleService.hasPermission(
      userId,
      'analytics.read',
      { tenantId }
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Accesso negato alle statistiche'
      });
    }

    next();
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', userId: req.person?.id }, 'Errore verifica permessi statistiche');
    res.status(500).json({
      success: false,
      error: 'Errore nella verifica dei permessi analitici'
    });
  }
}

/**
 * Middleware combinato per autenticazione e tenant
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export function authAndTenant(req, res, next) {
  authMiddleware(req, res, (err) => {
    if (err) return next(err);

    // Se l'utente è autenticato e ha un tenantId, usalo direttamente
    // invece di tentare la risoluzione dal dominio (che fallisce per chiamate interne)
    if (req.person?.tenantId) {
      prisma.tenant.findUnique({
        where: { id: req.person.tenantId }
      }).then(tenant => {
        if (tenant && tenant.isActive && !tenant.deletedAt) {
          req.tenant = tenant;
          next();
        } else {
          // Fallback al tenantAuth normale
          tenantAuth(req, res, next);
        }
      }).catch(() => {
        // In caso di errore, prova il tenantAuth normale
        tenantAuth(req, res, next);
      });
    } else {
      // Se non c'è tenantId nel JWT, usa il metodo normale
      tenantAuth(req, res, next);
    }
  });
}

/**
 * Middleware per verificare se l'utente può gestire ruoli personalizzati
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export async function requireCustomRoleManagement(req, res, next) {
  try {
    const userId = req.person?.id;
    const tenantId = req.tenant?.id || req.person?.tenantId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Autenticazione richiesta'
      });
    }

    // Verifica permessi multipli per la gestione dei ruoli personalizzati
    const permissions = ['ROLE_MANAGEMENT', 'CREATE_ROLES', 'EDIT_ROLES'];

    for (const permission of permissions) {
      const hasPermission = await enhancedRoleService.hasPermission(
        userId,
        permission,
        { tenantId }
      );

      if (hasPermission) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      error: 'Permessi insufficienti per la gestione dei ruoli personalizzati'
    });
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', userId: req.person?.id }, 'Errore verifica permessi ruoli personalizzati');
    res.status(500).json({
      success: false,
      error: 'Errore nella verifica dei permessi del ruolo personalizzato'
    });
  }
}

export default {
  authMiddleware,
  tenantAuth,
  requirePermission,
  requireRoleManagement,
  requireUserAccess,
  requireHierarchyManagement,
  requireRoleAssignmentPermission,
  requireAnalyticsAccess,
  authAndTenant,
  requireCustomRoleManagement
};