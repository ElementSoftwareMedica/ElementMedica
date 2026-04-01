/**
 * UUID Validation Middleware
 *
 * Validates req.params.id (and other params) are valid UUIDs before
 * hitting the database, returning HTTP 400 instead of Prisma P2023 errors.
 *
 * Usage:
 *   router.get('/:id', validateParamId, authenticate, controller.getOne);
 *   router.get('/:entityId/relations', validateParam('entityId'), authenticate, controller);
 */

import { validate as isUUID } from 'uuid';

/**
 * Validates req.params.id is a valid UUID v4.
 * Returns 400 INVALID_ID_FORMAT if not valid.
 */
export function validateParamId(req, res, next) {
  const { id } = req.params;
  if (!id || !isUUID(id)) {
    return res.status(400).json({
      success: false,
      error: 'Formato ID non valido',
      code: 'INVALID_ID_FORMAT',
    });
  }
  next();
}

/**
 * Validates req.params[paramName] is a valid UUID.
 * Returns 400 INVALID_ID_FORMAT if not valid.
 *
 * @param {string} paramName - The name of the param to validate (default: 'id')
 */
export function validateParam(paramName = 'id') {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!value || !isUUID(value)) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${paramName} format`,
        code: 'INVALID_ID_FORMAT',
      });
    }
    next();
  };
}

/**
 * Validates multiple req.params are valid UUIDs.
 * Returns 400 on the first invalid param.
 *
 * @param {...string} paramNames - Names of the params to validate
 */
export function validateParams(...paramNames) {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const value = req.params[paramName];
      if (!value || !isUUID(value)) {
        return res.status(400).json({
          success: false,
          error: `Invalid ${paramName} format`,
          code: 'INVALID_ID_FORMAT',
        });
      }
    }
    next();
  };
}
