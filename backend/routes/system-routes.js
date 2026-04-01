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
// SYSTEM CONFIG ROUTES
// ================================================

// Configurazione di default del sistema
const DEFAULT_CONFIG = {
    // Generale
    'general.appName': 'Element Platform',
    'general.defaultLanguage': 'it',
    'general.dateFormat': 'DD/MM/YYYY',
    'general.timezone': 'Europe/Rome',
    'general.itemsPerPage': 25,

    // Security
    'security.sessionTimeout': 30,
    'security.twoFactorEnabled': false,
    'security.passwordMinLength': 8,
    'security.passwordRequireUppercase': true,
    'security.passwordRequireNumber': true,
    'security.loginAttempts': 5,
    'security.lockoutDuration': 15,

    // Notifiche
    'notifications.emailEnabled': true,
    'notifications.smsEnabled': false,
    'notifications.pushEnabled': false,

    // Features
    'features.cmsModule': true,
    'features.gdprModule': true,
    'features.trainingModule': true,
    'features.billingModule': true,

    // Manutenzione
    'maintenance.mode': false,
    'maintenance.message': 'Sistema in manutenzione',
    'maintenance.autoBackup': true,
    'maintenance.backupFrequency': 'daily',
    'maintenance.retentionDays': 30
};

/**
 * GET /api/v1/settings/config
 * Ottiene la configurazione di sistema
 */
router.get('/settings/config',
    authMiddleware,
    tenantMiddleware,
    requirePermission('system:settings'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            // Prova a caricare configurazioni personalizzate dal database
            let customConfig = {};

            try {
                const settings = await prisma.systemSetting?.findMany({
                    where: { tenantId }
                });

                if (settings && settings.length > 0) {
                    settings.forEach(setting => {
                        customConfig[setting.key] = setting.value;
                    });
                }
            } catch (dbError) {
                // SystemSetting table potrebbe non esistere
                logger.debug('SystemSetting table not available, using defaults');
            }

            // Merge configurazione default con personalizzata
            const config = {
                ...DEFAULT_CONFIG,
                ...customConfig
            };

            return res.json({
                success: true,
                data: config
            });

        } catch (error) {
            logger.error({
                component: 'system-routes',
                action: 'getConfig',
                error: 'Operazione non riuscita'
            }, 'Error fetching system config');

            // Restituisci comunque i default in caso di errore
            return res.json({
                success: true,
                data: DEFAULT_CONFIG
            });
        }
    }
);

/**
 * PUT /api/v1/settings/config
 * Aggiorna la configurazione di sistema
 */
router.put('/settings/config',
    authMiddleware,
    requirePermission('system:settings'),
    tenantMiddleware,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const updates = req.body;

            if (!updates || typeof updates !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Configurazione non valida'
                });
            }

            // Salva le configurazioni nel database (se la tabella esiste)
            try {
                for (const [key, value] of Object.entries(updates)) {
                    await prisma.systemSetting?.upsert({
                        where: {
                            tenantId_key: {
                                tenantId,
                                key
                            }
                        },
                        update: {
                            value: String(value),
                            updatedAt: new Date()
                        },
                        create: {
                            tenantId,
                            key,
                            value: String(value)
                        }
                    });
                }
            } catch (dbError) {
                logger.warn('SystemSetting table not available, config not persisted');
            }

            logger.info({
                component: 'system-routes',
                action: 'updateConfig',
                tenantId,
                updatedKeys: Object.keys(updates)
            }, 'System config updated');

            return res.json({
                success: true,
                message: 'Configurazione aggiornata'
            });

        } catch (error) {
            logger.error({
                component: 'system-routes',
                action: 'updateConfig',
                error: 'Operazione non riuscita'
            }, 'Error updating system config');

            return res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento della configurazione'
            });
        }
    }
);

/**
 * POST /api/v1/settings/config/reset
 * Resetta la configurazione ai valori di default
 */
router.post('/settings/config/reset',
    authMiddleware,
    requirePermission('system:settings'),
    tenantMiddleware,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            // Elimina tutte le configurazioni personalizzate
            try {
                await prisma.systemSetting?.deleteMany({
                    where: { tenantId }
                });
            } catch (dbError) {
                logger.warn('SystemSetting table not available');
            }

            logger.info({
                component: 'system-routes',
                action: 'resetConfig',
                tenantId
            }, 'System config reset to defaults');

            return res.json({
                success: true,
                data: DEFAULT_CONFIG,
                message: 'Configurazione resettata ai valori di default'
            });

        } catch (error) {
            logger.error({
                component: 'system-routes',
                action: 'resetConfig',
                error: 'Operazione non riuscita'
            }, 'Error resetting system config');

            return res.status(500).json({
                success: false,
                error: 'Errore nel reset della configurazione'
            });
        }
    }
);

export default router;
