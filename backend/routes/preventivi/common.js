/**
 * Common imports and utilities for Preventivi routes
 * 
 * @module routes/preventivi/common
 */

import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import prisma from '../../config/prisma-optimization.js';
import authMiddleware from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { auditLog } from '../../middleware/audit.js';
import logger from '../../utils/logger.js';
import preventiviService from '../../services/preventivi-service.js';
import codiciScontoService from '../../services/codici-sconto-service.js';

const { authenticate } = authMiddleware;

/**
 * Middleware validazione errori
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error({
      component: 'preventivi',
      path: req.path,
      method: req.method,
      body: req.body,
      errors: errors.array()
    }, 'Validation errors in preventivi route');
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

export {
  express,
  body,
  query,
  param,
  validationResult,
  prisma,
  authenticate,
  requirePermissions,
  auditLog,
  logger,
  preventiviService,
  codiciScontoService,
  validate
};
