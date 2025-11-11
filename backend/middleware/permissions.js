/**
 * Permissions Middleware
 * Middleware per la verifica dei permessi con supporto per permessi multipli
 */

import { checkPermission as utilCheckPermission } from '../utils/permissions.js';
import logger from '../utils/logger.js';

/**
 * Middleware per verificare un singolo permesso
 * @param {string} permission - Permesso richiesto
 * @returns {Function} Middleware Express
 */
export function checkPermission(permission) {
  return utilCheckPermission(permission);
}

/**
 * Middleware per verificare permessi multipli (OR logic)
 * L'utente deve avere almeno uno dei permessi specificati
 * @param {string[]} permissions - Array di permessi richiesti (supporta sia enum che resource:action)
 * @returns {Function} Middleware Express
 */
export function checkPermissions(permissions) {
  return async (req, res, next) => {
    logger.debug("Permissions check started", { component: "permissions", action: "checkPermissions" });
    logger.debug("Required permissions", { component: "permissions", permissions });
    logger.debug("Person presence", { component: "permissions", hasPerson: !!req.person });
    if (req.person) {
      logger.debug("Person IDs", { 
        component: "permissions",
        personId: req.person.id,
        personIdAlt: req.person.personId
      });
    }
    
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

      // Importa RBACService per i permessi enum
      const { RBACService } = await import('./rbac.js');

      // Verifica se l'utente ha almeno uno dei permessi richiesti
      let hasAnyPermission = false;
      let lastError = null;

      const personId = req.person.personId || req.person.id;

      for (const permission of permissions) {
        try {
          // Determina se è un permesso enum o resource:action
          const isEnumPermission = !permission.includes(':');
          
          logger.debug("Processing permission", { 
            component: "permissions",
            permission,
            isEnumPermission
          });
          
          if (isEnumPermission) {
            // Per permessi enum, usa getPersonPermissions e controlla direttamente
            logger.debug("Getting person permissions", { 
              component: "permissions",
              personId
            });
            const userPermissions = await RBACService.getPersonPermissions(personId);
            logger.debug("User permissions retrieved", { 
              component: "permissions",
              permissionCount: Object.keys(userPermissions).length,
              hasPermission: !!userPermissions[permission]
            });
            
            if (userPermissions[permission]) {
              logger.debug("Permission GRANTED", { 
                component: "permissions",
                permission
              });
              hasAnyPermission = true;
              break;
            } else {
              logger.debug("Permission DENIED", { 
                component: "permissions",
                permission
              });
            }
          } else {
            // Usa il middleware AdvancedPermissionService per permessi resource:action
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
            } catch (resourceActionError) {
              // Errore specifico per permessi resource:action, continua con il prossimo
              lastError = resourceActionError;
              continue;
            }
          }
        } catch (error) {
          lastError = error;
          continue;
        }
      }

      if (!hasAnyPermission) {
        return res.status(403).json({
          error: 'Permission denied',
          code: 'PERMISSION_DENIED',
          required: permissions,
          message: `Richiesto almeno uno dei seguenti permessi: ${permissions.join(', ')}`
        });
      }

      next();
    } catch (error) {
      logger.error('Multiple permissions check failed', {
        component: 'permissions',
        action: 'checkPermissions',
        permissions,
        error: error.message,
        stack: error.stack
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