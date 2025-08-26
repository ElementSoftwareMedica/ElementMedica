/**
 * Auth Middleware - Middleware di autenticazione per il sistema dei ruoli
 * 
 * Questo modulo contiene middleware per l'autenticazione, autorizzazione
 * e controllo dei permessi nel sistema di gestione dei ruoli.
 */

import { PrismaClient } from '@prisma/client';
import { authenticate, authMiddleware as baseAuthMiddleware, optionalAuth, requireRoles } from '../../../middleware/auth.js';
import { tenantMiddleware } from '../../../middleware/tenant.js';
import enhancedRoleService from '../../../services/enhancedRoleService.js';
import roleHierarchyService from '../../../services/roleHierarchyService.js';

const prisma = new PrismaClient();

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
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
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
        error: 'Insufficient permissions for role management'
      });
    }
    
    next();
  } catch (error) {
    console.error('[AUTH_MIDDLEWARE] Error checking role management permission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify permissions'
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
        error: 'Authentication required'
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
        error: 'Access denied'
      });
    }
    
    next();
  } catch (error) {
    console.error('[AUTH_MIDDLEWARE] Error checking user access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify access permissions'
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
    
    console.log('[DEBUG] requireHierarchyManagement - userId:', userId, 'tenantId:', tenantId);
    console.log('[DEBUG] req.person.tenantId:', req.person?.tenantId, 'req.tenant.id:', req.tenant?.id);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Importa il servizio di gerarchia dinamicamente
    // const roleHierarchyService = await import(`../../../services/roleHierarchyService.js?t=${Date.now()}`);
    
    // Ottieni i ruoli dell'utente
    const userRoles = await prisma.personRole.findMany({
      where: {
        personId: userId,
        tenantId: tenantId,
        deletedAt: null
      }
    });
    
    console.log('[DEBUG] userRoles found:', userRoles.length, userRoles.map(r => r.roleType));
    
    const userRoleTypes = userRoles.map(role => role.roleType);
    const highestRole = roleHierarchyService.getHighestRole(userRoleTypes);
    
    console.log('[DEBUG] highestRole:', highestRole);
    
    // Verifica se l'utente ha un ruolo sufficientemente alto per gestire la gerarchia
    const userLevel = roleHierarchyService.getRoleLevel(highestRole);
    
    console.log('[DEBUG] userLevel:', userLevel, 'check:', userLevel <= 1);
    
    // CORREZIONE: Solo SUPER_ADMIN (livello 0) e ADMIN (livello 1) possono gestire la gerarchia
    // Livelli più bassi (0, 1) hanno più permessi, livelli più alti (2, 3, 4...) hanno meno permessi
    if (userLevel > 1) { 
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions for hierarchy management'
      });
    }
    
    // Aggiungi i dati dell'utente alla request per uso successivo
    req.userRoles = userRoleTypes;
    req.userHighestRole = highestRole;
    req.userLevel = userLevel;
    
    next();
  } catch (error) {
    console.error('[AUTH_MIDDLEWARE] Error checking hierarchy management permission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify hierarchy permissions'
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
    
    if (!userId || !targetRoleType) {
      return res.status(400).json({
        success: false,
        error: 'User ID and role type are required'
      });
    }
    
    // Importa il servizio di gerarchia dinamicamente
    // const roleHierarchyService = await import(`../../../services/roleHierarchyService.js?t=${Date.now()}`);
    
    // Ottieni i ruoli dell'utente corrente
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
        error: `You don't have permission to assign role ${targetRoleType}. Your highest role: ${currentUserHighestRole}`
      });
    }
    
    // Aggiungi i dati dell'utente alla request
    req.userRoles = userRoleTypes;
    req.userHighestRole = currentUserHighestRole;
    
    next();
  } catch (error) {
    console.error('[AUTH_MIDDLEWARE] Error checking role assignment permission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify role assignment permissions'
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
        error: 'Authentication required'
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
        error: 'Access denied to analytics'
      });
    }
    
    next();
  } catch (error) {
    console.error('[AUTH_MIDDLEWARE] Error checking analytics access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify analytics permissions'
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
    
    tenantAuth(req, res, next);
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
        error: 'Authentication required'
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
      error: 'Insufficient permissions for custom role management'
    });
  } catch (error) {
    console.error('[AUTH_MIDDLEWARE] Error checking custom role management permission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify custom role permissions'
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