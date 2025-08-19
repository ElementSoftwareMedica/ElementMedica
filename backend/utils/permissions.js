/**
 * Utility per la gestione dei permessi
 * Wrapper per il servizio di permessi avanzati
 */

import AdvancedPermissionService from '../services/advanced-permission.js';

// Istanza del servizio di permessi avanzati
const advancedPermissionService = new AdvancedPermissionService();

/**
 * Middleware per verificare i permessi
 * @param {string} permission - Permesso richiesto nel formato 'resource:action'
 * @returns {Function} Middleware Express
 */
export function checkPermission(permission) {
  return async (req, res, next) => {
    try {
      // Verifica che l'utente sia autenticato
      if (!req.person || !req.person.id) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Parsing del permesso
      const [resource, action] = permission.split(':');
      if (!resource || !action) {
        return res.status(400).json({
          error: 'Invalid permission format',
          code: 'INVALID_PERMISSION_FORMAT',
          expected: 'resource:action'
        });
      }

      // Verifica del permesso
      const permissionResult = await advancedPermissionService.checkPermission({
        personId: req.person.id,
        resource,
        action,
        targetCompanyId: req.params.companyId || req.body.companyId || req.query.companyId
      });

      if (!permissionResult.allowed) {
        return res.status(403).json({
          error: 'Permission denied',
          code: 'PERMISSION_DENIED',
          reason: permissionResult.reason
        });
      }

      // Aggiungi informazioni sui permessi alla richiesta
      req.permissions = {
        allowedFields: permissionResult.allowedFields,
        scope: permissionResult.scope,
        reason: permissionResult.reason
      };

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        error: 'Permission check failed',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
}

/**
 * Verifica diretta dei permessi (senza middleware)
 * @param {Object} params - Parametri per la verifica
 * @returns {Promise<Object>} Risultato della verifica
 */
export async function hasPermission(params) {
  return await advancedPermissionService.checkPermission(params);
}

/**
 * Ottiene tutti i permessi avanzati per una persona
 * @param {string} personId - ID della persona
 * @returns {Promise<Array>} Lista dei permessi
 */
export async function getPersonPermissions(personId) {
  return await advancedPermissionService.getPersonAdvancedPermissions(personId);
}