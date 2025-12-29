/**
 * Permissions Middleware
 * Middleware per la verifica dei permessi con formato unificato resource:action
 * 
 * @module middleware/permissions
 * @version 2.0.0 - Simplified (only resource:action format)
 */

import { checkPermission as utilCheckPermission } from '../utils/permissions.js';
import logger from '../utils/logger.js';

/**
 * Middleware per verificare un singolo permesso
 * @param {string} permission - Permesso richiesto in formato resource:action
 * @returns {Function} Middleware Express
 */
export function checkPermission(permission) {
  return utilCheckPermission(permission);
}

/**
 * Middleware per verificare permessi multipli (OR logic)
 * L'utente deve avere almeno uno dei permessi specificati
 * @param {string[]} permissions - Array di permessi richiesti in formato resource:action
 * @returns {Function} Middleware Express
 */
export function checkPermissions(permissions) {
  return async (req, res, next) => {
    try {
      // Verifica che l'utente sia autenticato
      if (!req.person || !req.person.id) {
        logger.warn("Authentication required - person missing or no ID", {
          component: "permissions",
          action: "checkPermissions"
        });
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Se non ci sono permessi da verificare, passa al prossimo middleware
      if (!permissions || permissions.length === 0) {
        return next();
      }

      // Verifica se l'utente ha almeno uno dei permessi richiesti
      let hasAnyPermission = false;

      for (const permission of permissions) {
        try {
          const permissionMiddleware = utilCheckPermission(permission);
          
          // Simula la chiamata del middleware
          await new Promise((resolve, reject) => {
            permissionMiddleware(req, res, (error) => {
              if (error) {
                reject(error);
              } else {
                hasAnyPermission = true;
                resolve();
              }
            });
          });
          
          // Se abbiamo trovato un permesso valido, interrompi il ciclo
          if (hasAnyPermission) {
            break;
          }
        } catch {
          // Permesso non valido, continua con il prossimo
          continue;
        }
      }

      if (!hasAnyPermission) {
        logger.debug("Permission denied", {
          component: "permissions",
          action: "checkPermissions",
          personId: req.person.id,
          required: permissions
        });
        return res.status(403).json({
          error: 'Permission denied',
          code: 'PERMISSION_DENIED',
          required: permissions,
          message: `Richiesto almeno uno dei seguenti permessi: ${permissions.join(', ')}`
        });
      }

      next();
    } catch (error) {
      logger.error('Permissions check failed', {
        component: 'permissions',
        action: 'checkPermissions',
        permissions,
        error: error.message
      });
      res.status(500).json({
        error: 'Permission check failed',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
}

export default {
  checkPermission,
  checkPermissions
};