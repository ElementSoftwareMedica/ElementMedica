/**
 * Activity Logs Routes
 * Endpoints per creazione e consultazione degli activity logs
 */

import express from 'express';
import prisma from '../config/prisma-optimization.js';
import { body, query, validationResult } from 'express-validator';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import logger from '../utils/logger.js';
import PersonRoleQueryService from '../services/person/PersonRoleQueryService.js';

const router = express.Router();

// Utility: normalizza il campo details in stringa JSON o testo
function normalizeDetails(details) {
  if (details === undefined || details === null) return null;
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details);
  } catch (e) {
    return String(details);
  }
}

// Determina il personId: autenticato o fallback a SYSTEM_USER/ADMIN/SUPER_ADMIN del tenant
async function resolvePersonId(req) {
  if (req.person?.id) return req.person.id;

  const tenantId = req.tenant?.id || req.tenantId;
  if (!tenantId) return null;

  try {
    const systemUsers = await PersonRoleQueryService.getSystemUsers({ tenantId, limit: 1 });
    if (systemUsers && systemUsers.length > 0) return systemUsers[0].id;
  } catch (e) {
    logger.warn('Fallback SYSTEM_USER resolution failed', { error: e?.message, tenantId });
  }

  try {
    const admins = await PersonRoleQueryService.getAdmins({ tenantId, limit: 1 });
    if (admins && admins.length > 0) return admins[0].id;
  } catch (e) {
    logger.warn('Fallback ADMIN resolution failed', { error: e?.message, tenantId });
  }

  try {
    const supers = await PersonRoleQueryService.getSuperAdmins({ tenantId, limit: 1 });
    if (supers && supers.length > 0) return supers[0].id;
  } catch (e) {
    logger.warn('Fallback SUPER_ADMIN resolution failed', { error: e?.message, tenantId });
  }

  return null;
}

/**
 * POST /api/v1/activity-logs
 * Endpoint pubblico (auth opzionale) per registrare un activity log
 */
router.post(
  '/',
  tenantMiddleware,
  optionalAuth,
  [
    body('action').isString().trim().notEmpty(),
    body('details').optional(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Dati non validi', details: errors.array() });
      }

      const personId = await resolvePersonId(req);
      if (!personId) {
        return res.status(400).json({
          success: false,
          error: 'Impossibile determinare l\'utente',
          message: 'Fornire un token valido o configurare un utente di sistema/admin per il tenant'
        });
      }

      const tenantId = req.tenant?.id || req.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, error: 'Tenant non trovato o inattivo' });
      }

      const { action, details } = req.body;
      const detailsStr = normalizeDetails(details);

      const created = await prisma.activityLog.create({
        data: {
          personId,
          action,
          details: detailsStr,
          timestamp: new Date(),
          tenantId: tenantId,
        },
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      logger.error('Errore creazione ActivityLog', {
        component: 'activity-logs-routes',
        action: 'create',
        error: error.message,
        stack: error.stack,
        tenantId: req.tenant?.id,
      });
      return res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
  }
);

/**
 * GET /api/v1/activity-logs
 * Endpoint autenticato per elenco activity logs con filtri/paginazione
 */
router.get(
  '/',
  authenticate,
  tenantMiddleware,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('action').optional().isString().trim(),
    query('personId').optional().isUUID(),
    query('search').optional().isString().trim(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Parametri non validi', details: errors.array() });
      }

      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const skip = (page - 1) * limit;

      const { action, personId, search, from, to } = req.query;

      if (!req.tenant?.id) {
        return res.status(400).json({ success: false, error: 'Tenant non trovato o inattivo' });
      }

      const where = {
        tenantId: req.tenant.id,
      };

      if (personId) where.personId = personId;
      if (action) {
        // filtro più flessibile sul campo action
        where.action = { contains: action, mode: 'insensitive' };
      }

      // Filtro intervallo date
      if (from || to) {
        where.timestamp = {};
        if (from) where.timestamp.gte = new Date(from);
        if (to) where.timestamp.lte = new Date(to);
      }

      // Filtro ricerca su action/details
      if (search) {
        where.OR = [
          { action: { contains: search, mode: 'insensitive' } },
          { details: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [total, logs] = await Promise.all([
        prisma.activityLog.count({ where }),
        prisma.activityLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip,
          take: limit,
          include: {
            person: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        })
      ]);

      const totalPages = Math.ceil(total / limit) || 1;

      return res.json({
        success: true,
        data: logs,
        meta: { page, limit, total, totalPages }
      });
    } catch (error) {
      logger.error('Errore recupero ActivityLogs', {
        component: 'activity-logs-routes',
        action: 'list',
        error: error.message,
        stack: error.stack,
        tenantId: req.tenant?.id,
      });
      return res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
  }
);

export default router;