/**
 * Middleware per la validazione degli input nelle route del sistema di gestione dei ruoli
 */

import { 
  validateRoleData, 
  validateRoleAssignment, 
  validateCustomRoleUpdate,
  validatePaginationParams,
  validateId as validateIdUtil,
  validateAdvancedPermission,
  validateUserFilters as validateUserFiltersUtil,
  validateAndFilterPermissions
} from '../utils/validators.js';
import { 
  filterQueryParams,
  filterCustomRoleData,
  filterRoleAssignmentData,
  filterAdvancedPermissionData,
  limitPaginationParams,
  filterSearchParams
} from '../utils/filters.js';
import { createErrorResponse } from '../utils/helpers.js';
import logger from '../../../utils/logger.js';

/**
 * Middleware per validare i dati di creazione di un ruolo
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export function validateCreateRole(req, res, next) {
  try {
    // Filtra e sanitizza i dati in input
    const filteredData = filterCustomRoleData(req.body);
    
    // Valida i dati filtrati
    const validation = validateRoleData(filteredData);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      });
    }
    
    // Sostituisce i dati originali con quelli filtrati e validati
    req.body = filteredData;
    next();
  } catch (error) {
    console.error('[VALIDATION_MIDDLEWARE] Error validating role creation:', error);
    res.status(500).json({
      success: false,
      error: 'Validation error'
    });
  }
}

/**
 * Middleware per validare i dati di aggiornamento di un ruolo
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export function validateUpdateRole(req, res, next) {
  try {
    // Valida l'ID del ruolo
    const roleTypeValidation = validateIdUtil(req.params.roleType, 'Role type');
    if (!roleTypeValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: roleTypeValidation.error
      });
    }
    
    // Filtra e valida i dati di aggiornamento
    const filteredData = filterCustomRoleData(req.body);
    const validation = validateCustomRoleUpdate(filteredData);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      });
    }
    
    req.body = filteredData;
    next();
  } catch (error) {
    console.error('[VALIDATION_MIDDLEWARE] Error validating role update:', error);
    res.status(500).json({
      success: false,
      error: 'Validation error'
    });
  }
}

/**
 * Middleware per validare l'assegnazione di un ruolo
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export function validateRoleAssignmentData(req, res, next) {
  try {
    // Filtra i dati di assegnazione
    const filteredData = filterRoleAssignmentData(req.body);
    
    // Valida i dati filtrati
    const validation = validateRoleAssignment(filteredData);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      });
    }
    
    req.body = filteredData;
    next();
  } catch (error) {
    console.error('[VALIDATION_MIDDLEWARE] Error validating role assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Validation error'
    });
  }
}

/**
 * Middleware per validare i parametri di paginazione
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export function validatePagination(req, res, next) {
  try {
    // Gestione sicura dei parametri di query
    const query = req.query || {};
    
    // Filtra e limita i parametri di paginazione con valori di default sicuri
    const limitedParams = limitPaginationParams(query);
    const validatedParams = validatePaginationParams(limitedParams);
    
    // Aggiunge i parametri validati alla request
    req.pagination = validatedParams;
    next();
  } catch (error) {
    console.error('[VALIDATION_MIDDLEWARE] Error validating pagination:', error);
    
    // Invece di restituire un errore 500, usa valori di default e continua
    req.pagination = { page: 1, limit: 20 };
    next();
  }
}

/**
 * Middleware per validare i parametri di query
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export function validateQueryParams(req, res, next) {
  try {
    // Filtra i parametri di query
    const filteredQuery = filterQueryParams(req.query);
    
    // Valida i filtri utente se presenti
    if (Object.keys(filteredQuery).length > 0) {
      const validatedFilters = validateUserFiltersUtil(filteredQuery);
      req.filters = validatedFilters;
    }
    
    next();
  } catch (error) {
    console.error('[VALIDATION_MIDDLEWARE] Error validating query params:', error);
    res.status(500).json({
      success: false,
      error: 'Validation error'
    });
  }
}

/**
 * Middleware per validare un ID nei parametri della route
 * @param {string} paramName - Nome del parametro da validare
 * @returns {Function} Middleware function
 */
export function validateRouteId(paramName = 'id') {
  return (req, res, next) => {
    try {
      const id = req.params[paramName];
      const validation = validateIdUtil(id, paramName);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: validation.error
        });
      }
      
      next();
    } catch (error) {
      console.error(`[VALIDATION_MIDDLEWARE] Error validating ${paramName}:`, error);
      res.status(500).json({
        success: false,
        error: 'Validation error'
      });
    }
  };
}

/**
 * Middleware per validare i dati dei permessi avanzati
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export function validateAdvancedPermissionData(req, res, next) {
  try {
    // Filtra i dati del permesso
    const filteredData = filterAdvancedPermissionData(req.body);
    
    // Valida i dati filtrati
    const validation = validateAdvancedPermission(filteredData);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      });
    }
    
    req.body = filteredData;
    next();
  } catch (error) {
    console.error('[VALIDATION_MIDDLEWARE] Error validating advanced permission:', error);
    res.status(500).json({
      success: false,
      error: 'Validation error'
    });
  }
}

/**
 * Middleware per validare i permessi avanzati
 */
export const validateAdvancedPermissions = (req, res, next) => {
  try {
    const { permissions } = req.body;
    
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json(createErrorResponse(
        'Invalid permissions format',
        'Permissions must be provided as an array'
      ));
    }

    const validationErrors = [];
    const validPermissions = [];

    permissions.forEach((permission, index) => {
      const validation = validateAdvancedPermission(permission);
      if (!validation.isValid) {
        validationErrors.push(`Permission ${index}: ${validation.errors.join(', ')}`);
      } else {
        validPermissions.push(filterAdvancedPermissionData(permission));
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json(createErrorResponse(
        'Invalid permissions data',
        validationErrors.join('; ')
      ));
    }

    req.body.permissions = validPermissions;
    next();
  } catch (error) {
    logger.error('Error in validateAdvancedPermissions middleware', {
      error: error.message,
      body: req.body
    });
    
    res.status(500).json(createErrorResponse(
      'Validation error',
      'An error occurred during permission validation'
    ));
  }
};

/**
 * Middleware per validare i permessi utente
 */
export const validateUserPermissions = (req, res, next) => {
  try {
    const { permissions } = req.body;
    
    if (!permissions) {
      return res.status(400).json(createErrorResponse(
        'Missing permissions',
        'Permissions array is required'
      ));
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json(createErrorResponse(
        'Invalid permissions format',
        'Permissions must be provided as an array'
      ));
    }

    const validationResult = validateAndFilterPermissions(permissions);
    
    if (!validationResult.isValid) {
      return res.status(400).json(createErrorResponse(
        'Invalid permissions',
        validationResult.errors.join(', ')
      ));
    }

    req.body.permissions = validationResult.validPermissions;
    next();
  } catch (error) {
    logger.error('Error in validateUserPermissions middleware', {
      error: error.message,
      body: req.body
    });
    
    res.status(500).json(createErrorResponse(
      'Validation error',
      'An error occurred during user permissions validation'
    ));
  }
};

/**
 * Middleware per validare i dati di rimozione di un ruolo
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export function validateRoleRemoval(req, res, next) {
  try {
    const { personId, roleType, customRoleId } = req.body;
    
    // Valida che sia presente almeno personId
    if (!personId) {
      return res.status(400).json({
        success: false,
        error: 'Person ID is required'
      });
    }
    
    // Valida che sia presente roleType o customRoleId
    if (!roleType && !customRoleId) {
      return res.status(400).json({
        success: false,
        error: 'Either role type or custom role ID is required'
      });
    }
    
    next();
  } catch (error) {
    console.error('[VALIDATION_MIDDLEWARE] Error validating role removal:', error);
    res.status(500).json({
      success: false,
      error: 'Validation error'
    });
  }
}

/**
 * Middleware per validare i dati di spostamento nella gerarchia
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export function validateHierarchyMove(req, res, next) {
  try {
    const { roleType, newLevel, newParentRoleType } = req.body;
    
    if (!roleType) {
      return res.status(400).json({
        success: false,
        error: 'Role type is required'
      });
    }
    
    if (newLevel === undefined) {
      return res.status(400).json({
        success: false,
        error: 'New level is required'
      });
    }
    
    const level = parseInt(newLevel);
    if (isNaN(level) || level < 1 || level > 6) {
      return res.status(400).json({
        success: false,
        error: 'Level must be a number between 1 and 6'
      });
    }
    
    // Sanitizza i dati
    req.body = {
      roleType: roleType.trim(),
      newLevel: level,
      newParentRoleType: newParentRoleType ? newParentRoleType.trim() : undefined
    };
    
    next();
  } catch (error) {
    console.error('[VALIDATION_MIDDLEWARE] Error validating hierarchy move:', error);
    res.status(500).json({
      success: false,
      error: 'Validation error'
    });
  }
}

/**
 * Middleware per validare i dati di assegnazione permessi
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export function validatePermissionAssignment(req, res, next) {
  try {
    const { targetUserId, permissions } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Target user ID is required'
      });
    }
    
    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        error: 'Permissions must be an array'
      });
    }
    
    next();
  } catch (error) {
    console.error('[VALIDATION_MIDDLEWARE] Error validating permission assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Validation error'
    });
  }
}

/**
 * Middleware combinato per validazione completa
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export function validateRequest(req, res, next) {
  // Applica validazioni di base
  validateQueryParams(req, res, (err) => {
    if (err) return next(err);
    
    validatePagination(req, res, next);
  });
}

export default {
  validateCreateRole,
  validateUpdateRole,
  validateRoleAssignmentData,
  validatePagination,
  validateQueryParams,
  validateRouteId,
  validateAdvancedPermissionData,
  validateRoleRemoval,
  validateHierarchyMove,
  validatePermissionAssignment,
  validateRequest
};