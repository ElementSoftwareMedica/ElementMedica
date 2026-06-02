/**
 * Activity Logs Routes
 * Endpoints per creazione e consultazione degli activity logs
 */

import express from 'express';
import prisma from '../config/prisma-optimization.js';
import { body, query, validationResult } from 'express-validator';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
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

  const tenantId = req.tenant?.id || getEffectiveTenantId(req);
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

      const tenantId = req.tenant?.id || getEffectiveTenantId(req);
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
        error: 'Operazione non riuscita',
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
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('action').optional().isString().trim(),
    query('resource').optional().isString().trim(),
    query('personId').optional().isUUID(),
    query('personSearch').optional().isString().trim(),
    query('tenantId').optional().isUUID(),
    query('tenantIds').optional().isString().trim(),
    query('allTenants').optional().isString().trim(),
    query('includeLowSignal').optional().isString().trim(),
    query('search').optional().isString().trim(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Parametri non validi', details: errors.array() });
      }

      const page = req.query.page || (req.query.offset ? Math.floor(req.query.offset / (req.query.limit || 20)) + 1 : 1);
      const limit = req.query.limit || 20;
      const skip = (page - 1) * limit;

      const { action, resource, personId, personSearch, search, tenantId, tenantIds, allTenants, includeLowSignal } = req.query;
      const from = req.query.from || req.query.dateFrom;
      const to = req.query.to || req.query.dateTo;

      // Admin globali possono vedere tutti i log
      const userGlobalRole = req.person?.globalRole;
      const isGlobalAdmin = userGlobalRole === 'SUPER_ADMIN' || userGlobalRole === 'ADMIN';

      const where = {};
      if (includeLowSignal !== 'true') {
        where.NOT = [
          { action: { in: ['ENTITY_READ', 'ENTITY_LIST'] }, resource: { in: ['system', 'System', 'Sistema'] } },
          { action: { contains: 'VIEW', mode: 'insensitive' }, resource: { in: ['system', 'System', 'Sistema'] } }
        ];
      }

      if (!isGlobalAdmin) {
        // Utenti normali: filtro tenant obbligatorio
        if (!req.tenant?.id) {
          return res.status(400).json({ success: false, error: 'Tenant non trovato o inattivo' });
        }
        where.tenantId = req.tenant.id;
      } else if (tenantIds) {
        const requestedTenantIds = String(tenantIds).split(',').map(id => id.trim()).filter(Boolean);
        if (requestedTenantIds.length > 0 && allTenants !== 'true') {
          where.tenantId = { in: requestedTenantIds };
        } else if (requestedTenantIds.length > 0) {
          where.tenantId = { in: requestedTenantIds };
        }
      } else if (tenantId) {
        where.tenantId = tenantId;
      }
      // Se isGlobalAdmin e no tenantFilter, where.tenantId rimane undefined = tutti i tenant

      if (personId) where.personId = personId;
      if (resource) where.resource = { contains: resource, mode: 'insensitive' };
      if (action) {
        // filtro più flessibile sul campo action
        where.action = { contains: action, mode: 'insensitive' };
      }
      if (personSearch) {
        where.person = {
          OR: [
            { firstName: { contains: personSearch, mode: 'insensitive' } },
            { lastName: { contains: personSearch, mode: 'insensitive' } },
            { taxCode: { contains: personSearch, mode: 'insensitive' } },
            {
              tenantProfiles: {
                some: { email: { contains: personSearch, mode: 'insensitive' } }
              }
            }
          ]
        };
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
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                tenantProfiles: {
                  where: where.tenantId && typeof where.tenantId === 'string' ? { tenantId: where.tenantId, deletedAt: null } : { deletedAt: null },
                  select: { email: true },
                  take: 1
                }
              }
            },
            tenant: {
              select: { id: true, name: true, slug: true }
            }
          }
        })
      ]);

      const totalPages = Math.ceil(total / limit) || 1;
      const normalizedLogs = logs.map(log => ({
        ...log,
        user: {
          id: log.person?.id,
          firstName: log.person?.firstName,
          lastName: log.person?.lastName,
          username: log.person?.username,
          email: log.person?.tenantProfiles?.[0]?.email || null
        },
        tenantName: log.tenant?.name || log.tenant?.slug || null
      }));

      return res.json({
        success: true,
        data: normalizedLogs,
        logs: normalizedLogs,
        total,
        page,
        pageSize: limit,
        meta: { page, limit, total, totalPages }
      });
    } catch (error) {
      logger.error('Errore recupero ActivityLogs', {
        component: 'activity-logs-routes',
        action: 'list',
        error: 'Operazione non riuscita',
        stack: error.stack,
        tenantId: req.tenant?.id,
      });
      return res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
  }
);

export default router;
