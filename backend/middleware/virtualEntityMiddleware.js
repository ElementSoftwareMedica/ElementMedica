/**
 * Middleware per la gestione dei permessi su entità virtuali
 * Integra il controllo dei permessi per Dipendenti e Formatori nelle API esistenti
 */

import { hasVirtualEntityPermission, VIRTUAL_ENTITIES } from '../services/virtualEntityPermissions.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware per verificare i permessi su entità virtuali
 */
export function checkVirtualEntityPermission(virtualEntityName, action) {
  return async (req, res, next) => {
    try {
      console.log(`🔍 [MIDDLEWARE] checkVirtualEntityPermission chiamato: entity=${virtualEntityName}, action=${action}`);
      
      const userId = req.user?.id;
      const tenantId = req.user?.tenantId; // Corretto: usa req.user.tenantId invece di req.tenant?.id
      
      console.log(`🔍 [MIDDLEWARE] userId=${userId}, tenantId=${tenantId}`);

      if (!userId || !tenantId) {
        console.log(`❌ [MIDDLEWARE] Utente o tenant non autenticato`);
        return res.status(401).json({
          success: false,
          message: 'Utente o tenant non autenticato'
        });
      }

      // Verifica se l'utente ha il permesso sull'entità virtuale
      console.log(`🔍 [MIDDLEWARE] Chiamando hasVirtualEntityPermission...`);
      const hasPermission = await hasVirtualEntityPermission(
        userId, 
        virtualEntityName, 
        action, 
        tenantId
      );
      
      console.log(`🔍 [MIDDLEWARE] hasVirtualEntityPermission risultato: ${hasPermission}`);

      if (!hasPermission) {
        console.log(`❌ [MIDDLEWARE] Accesso negato per utente ${userId} su entità virtuale ${virtualEntityName} (azione: ${action})`);
        logger.warn(`Accesso negato per utente ${userId} su entità virtuale ${virtualEntityName} (azione: ${action})`);
        return res.status(403).json({
          success: false,
          message: `Permesso negato per l'azione ${action} su ${virtualEntityName}`
        });
      }

      // Aggiungi informazioni sull'entità virtuale alla richiesta
      req.virtualEntity = {
        name: virtualEntityName,
        action: action,
        config: VIRTUAL_ENTITIES[virtualEntityName.toUpperCase()]
      };

      next();
    } catch (error) {
      logger.error('Errore nel middleware permessi entità virtuale:', error);
      return res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  };
}

/**
 * Middleware per filtrare i risultati in base all'entità virtuale
 */
export function filterVirtualEntityResults(virtualEntityName) {
  return async (req, res, next) => {
    try {
      // Salva la funzione json originale
      const originalJson = res.json;

      // Override della funzione json per filtrare i risultati
      res.json = function(data) {
        if (data && data.data && Array.isArray(data.data)) {
          // Filtra i risultati in base alla definizione dell'entità virtuale
          const virtualEntity = VIRTUAL_ENTITIES[virtualEntityName.toUpperCase()];
          if (virtualEntity) {
            data.data = data.data.filter(person => {
              if (!person.roles) return false;
              
              return person.roles.some(role => {
                return virtualEntity.roleFilter.roleTypes.includes(role.roleType) &&
                       role.isActive && !role.deletedAt;
              });
            });
          }
        }

        // Chiama la funzione json originale
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Errore nel middleware filtro entità virtuale:', error);
      next(error);
    }
  };
}

/**
 * Middleware per validare che una persona appartenga all'entità virtuale
 */
export function validateVirtualEntityMembership(virtualEntityName) {
  return async (req, res, next) => {
    try {
      const personId = req.params.id || req.body.id;
      
      if (!personId) {
        return res.status(400).json({
          success: false,
          message: 'ID persona richiesto'
        });
      }

      const { isPersonInVirtualEntity } = await import('../services/virtualEntityPermissions.js');
      const belongsToEntity = await isPersonInVirtualEntity(personId, virtualEntityName);

      if (!belongsToEntity) {
        return res.status(403).json({
          success: false,
          message: `La persona non appartiene all'entità ${virtualEntityName}`
        });
      }

      next();
    } catch (error) {
      logger.error('Errore nella validazione appartenenza entità virtuale:', error);
      return res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  };
}

/**
 * Middleware combinato per entità virtuali
 */
export function virtualEntityMiddleware(virtualEntityName, action, options = {}) {
  const middlewares = [
    checkVirtualEntityPermission(virtualEntityName, action)
  ];

  if (options.filterResults) {
    middlewares.push(filterVirtualEntityResults(virtualEntityName));
  }

  if (options.validateMembership && ['edit', 'delete', 'view'].includes(action.toLowerCase())) {
    middlewares.push(validateVirtualEntityMembership(virtualEntityName));
  }

  return middlewares;
}

/**
 * Helper per creare middleware specifici per entità
 */
export const employeesMiddleware = {
  view: () => virtualEntityMiddleware('EMPLOYEES', 'VIEW', { filterResults: true }),
  create: () => virtualEntityMiddleware('EMPLOYEES', 'CREATE'),
  edit: () => virtualEntityMiddleware('EMPLOYEES', 'EDIT', { validateMembership: true }),
  delete: () => virtualEntityMiddleware('EMPLOYEES', 'DELETE', { validateMembership: true }),
  list: () => virtualEntityMiddleware('EMPLOYEES', 'VIEW', { filterResults: true })
};

export const trainersMiddleware = {
  view: () => virtualEntityMiddleware('TRAINERS', 'VIEW', { filterResults: true }),
  create: () => virtualEntityMiddleware('TRAINERS', 'CREATE'),
  edit: () => virtualEntityMiddleware('TRAINERS', 'EDIT', { validateMembership: true }),
  delete: () => virtualEntityMiddleware('TRAINERS', 'DELETE', { validateMembership: true }),
  list: () => virtualEntityMiddleware('TRAINERS', 'VIEW', { filterResults: true })
};

export default {
  checkVirtualEntityPermission,
  filterVirtualEntityResults,
  validateVirtualEntityMembership,
  virtualEntityMiddleware,
  employeesMiddleware,
  trainersMiddleware
};