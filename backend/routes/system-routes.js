/**
 * System Routes
 * Endpoints per log di sistema e configurazione
 * 
 * @module routes/system-routes
 */

import express from 'express';
import prisma from '../config/prisma-optimization.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import logger from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

const router = express.Router();

// ================================================
// SYSTEM LOGS ROUTES
// ================================================

/**
 * GET /api/v1/logs
 * Ottiene i log di sistema con paginazione e filtri
 * Admin globali (SUPER_ADMIN, ADMIN) vedono tutti i log di tutti i tenant
 */
router.get('/logs',
    authMiddleware,
    tenantMiddleware,
    requirePermission('system:read'),
    async (req, res) => {
        try {
            const {
                limit = 50,
                offset = 0,
                resource,
                action,
                dateFrom,
                dateTo,
                search,
                tenantFilter // Permette agli admin di filtrare per tenant specifico
            } = req.query;

            const userGlobalRole = req.person?.globalRole;
            const isGlobalAdmin = userGlobalRole === 'SUPER_ADMIN' || userGlobalRole === 'ADMIN';

            const tenantId = getEffectiveTenantId(req);

            // Admin globali possono vedere tutti i log, altri utenti solo quelli del proprio tenant
            const where = {};

            if (!isGlobalAdmin) {
                // Utenti normali: filtro tenant obbligatorio
                if (!tenantId) {
                    return res.status(400).json({
                        success: false,
                        error: 'Tenant non trovato'
                    });
                }
                where.tenantId = tenantId;
            } else if (tenantFilter) {
                // Admin con filtro tenant specifico
                where.tenantId = tenantFilter;
            }
            // Se isGlobalAdmin e no tenantFilter, where.tenantId rimane undefined = tutti i tenant

            // Filtri opzionali
            if (resource) {
                where.action = { contains: resource, mode: 'insensitive' };
            }

            if (action) {
                if (where.action) {
                    where.AND = [
                        { action: where.action },
                        { action: { contains: action, mode: 'insensitive' } }
                    ];
                    delete where.action;
                } else {
                    where.action = { contains: action, mode: 'insensitive' };
                }
            }

            // Filtro date
            if (dateFrom || dateTo) {
                where.timestamp = {};
                if (dateFrom) where.timestamp.gte = new Date(dateFrom);
                if (dateTo) where.timestamp.lte = new Date(dateTo);
            }

            // Filtro ricerca testuale
            if (search) {
                where.OR = [
                    { action: { contains: search, mode: 'insensitive' } },
                    { details: { contains: search, mode: 'insensitive' } }
                ];
            }

            const [total, logs] = await Promise.all([
                prisma.activityLog.count({ where }),
                prisma.activityLog.findMany({
                    where,
                    orderBy: { timestamp: 'desc' },
                    skip: parseInt(offset),
                    take: parseInt(limit),
                    include: {
                        person: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                tenantProfiles: {
                                    where: { deletedAt: null },
                                    take: 1,
                                    select: { email: true }
                                }
                            }
                        }
                    }
                })
            ]);

            // Formatta i log per il frontend
            const formattedLogs = logs.map(log => {
                const personEmail = log.person?.tenantProfiles?.[0]?.email || '';
                return {
                    id: log.id,
                    timestamp: log.timestamp,
                    action: log.action,
                    resource: log.resource || log.action?.split('_')[0]?.toLowerCase() || 'system',
                    resourceId: log.resourceId || null,
                    category: log.category || null,
                    metadata: log.metadata || null,
                    details: log.details,
                    user: log.person ? {
                        id: log.person.id,
                        name: `${log.person.firstName || ''} ${log.person.lastName || ''}`.trim() || personEmail,
                        email: personEmail
                    } : null,
                    personId: log.personId,
                    tenantId: log.tenantId
                };
            });

            return res.json({
                success: true,
                logs: formattedLogs,
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

        } catch (error) {
            logger.error({
                component: 'system-routes',
                action: 'getLogs',
                error: 'Operazione non riuscita',
                stack: error.stack
            }, 'Error fetching system logs');

            return res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei log'
            });
        }
    }
);

// ================================================
// SYSTEM CONFIG ROUTES — RIMOSSE
// ================================================
// Le rotte /settings/config (GET/PUT/reset) sono state rimosse: salvavano su una
// tabella `SystemSetting` inesistente e i valori (security.*, features.*, ecc.) non
// erano letti da alcun middleware. Le uniche impostazioni reali del tab "Sistema"
// (tema chiaro/scuro/automatico) sono gestite client-side da ThemeContext.
// I feature flag sono gestiti dalla pagina dedicata (FeaturePricingPage / TenantFeature).

export default router;
