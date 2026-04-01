/**
 * NotificationEscalationService.js
 * 
 * Gestisce l'escalation automatica delle notifiche critiche.
 * Sistema multi-livello (1-3) con configurazione per tenant.
 * 
 * PROGETTO 47 - FASE 7: Escalation System
 * 
 * Features:
 * - Escalation automatica per timeout
 * - 3 livelli configurabili per tenant
 * - Target resolution (SUPERVISOR, MANAGER, ADMIN, ROLE, PERSON)
 * - Multi-channel escalation (canali aggiuntivi per livello)
 * - Statistiche e tracking
 * - Risoluzione manuale
 * 
 * @module services/notifications/NotificationEscalationService
 * @version 1.0.0
 */

import prisma from '../../config/prisma-optimization.js';
import NotificationService from './NotificationService.js';
import logger from '../../utils/logger.js';

// ============================================
// NOTIFICATION ESCALATION SERVICE
// ============================================

class NotificationEscalationService {

    // ============================================
    // DEFAULT CONFIGURATION
    // ============================================

    /**
     * Configurazione default per livelli di escalation
     */
    static DEFAULT_ESCALATION_CONFIG = {
        level1: {
            delayMinutes: 30,
            targetType: 'SUPERVISOR',
            additionalChannels: ['SMS'],
            messageTemplate: 'Notifica non gestita - Escalation Livello 1'
        },
        level2: {
            delayMinutes: 60,
            targetType: 'MANAGER',
            additionalChannels: ['SMS', 'WHATSAPP'],
            messageTemplate: 'Notifica critica non gestita - Escalation Livello 2'
        },
        level3: {
            delayMinutes: 120,
            targetType: 'ADMIN',
            additionalChannels: ['SMS', 'WHATSAPP', 'EMAIL'],
            messageTemplate: '⚠️ URGENTE: Notifica critica non gestita - Escalation Finale'
        }
    };

    // ============================================
    // ESCALATION PROCESSING (CRON JOB)
    // ============================================

    /**
     * Processa le escalation pendenti (chiamato da cron job ogni 5 minuti)
     * @returns {Promise<{processed: number, errors: number}>}
     */
    static async processEscalations() {
        logger.info('Processing notification escalations...', {
            component: 'NotificationEscalationService'
        });

        let processed = 0;
        let errors = 0;

        try {
            // Trova notifiche che richiedono escalation
            const pendingEscalations = await this.findPendingEscalations();

            logger.info(`Found ${pendingEscalations.length} notifications pending escalation`, {
                component: 'NotificationEscalationService'
            });

            for (const notification of pendingEscalations) {
                try {
                    await this.escalateNotification(notification);
                    processed++;
                } catch (error) {
                    errors++;
                    logger.error({
                        error: error.message,
                        notificationId: notification.id,
                        component: 'NotificationEscalationService'
                    }, 'Failed to escalate notification');
                }
            }

            logger.info({
                processed,
                errors,
                component: 'NotificationEscalationService'
            }, 'Escalation processing completed');

            return { processed, errors };

        } catch (error) {
            logger.error({
                error: error.message,
                component: 'NotificationEscalationService'
            }, 'Error in processEscalations');
            throw error;
        }
    }

    /**
     * Trova notifiche che necessitano escalation
     * @returns {Promise<Array>} Notifiche da escalare
     */
    static async findPendingEscalations() {
        const now = new Date();

        // Prima trova le notifiche candidate (priority CRITICAL_P/URGENT o requiresConfirmation)
        const candidates = await prisma.notification.findMany({
            where: {
                deletedAt: null,
                // Solo notifiche che supportano escalation
                OR: [
                    { priority: 'CRITICAL_P' },
                    { priority: 'URGENT' },
                    { requiresConfirmation: true }
                ],
                // Non già al livello massimo
                currentEscalationLevel: { lt: 3 }
            },
            include: {
                logs: {
                    where: {
                        // Cerchiamo log non ancora letti o senza action taken
                        // NOTE: NotificationLog uses actionTakenAt, not confirmedAt
                        OR: [
                            { readAt: null },
                            { actionTakenAt: null }
                        ]
                    }
                },
                escalations: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        // Filtra per tempo trascorso basato sul livello corrente
        const needsEscalation = [];

        for (const notification of candidates) {
            // Se non ha log con read/actionTaken, potrebbe necessitare escalation
            // NOTE: NotificationLog uses actionTakenAt, not confirmedAt
            const hasUnreadLogs = notification.logs.some(log =>
                log.readAt === null || (notification.requiresConfirmation && log.actionTakenAt === null)
            );

            if (!hasUnreadLogs && notification.logs.length > 0) {
                // Tutti i log sono letti/con action, skip
                continue;
            }

            // Determina il delay per il livello successivo
            const nextLevel = notification.currentEscalationLevel + 1;
            const config = await this.getEscalationConfig(notification.tenantId, nextLevel);

            if (!config) continue;

            const delayMs = config.delayMinutes * 60 * 1000;

            // Calcola il timestamp di riferimento
            const referenceTime = notification.lastEscalatedAt || notification.createdAt;
            const thresholdTime = new Date(referenceTime.getTime() + delayMs);

            if (now >= thresholdTime) {
                needsEscalation.push(notification);
            }
        }

        return needsEscalation;
    }

    /**
     * Esegue escalation per una notifica
     * @param {Object} notification - Notifica da escalare
     * @returns {Promise<Object>} Escalation record creato
     */
    static async escalateNotification(notification) {
        const currentLevel = notification.currentEscalationLevel || 0;
        const nextLevel = currentLevel + 1;

        logger.info({
            notificationId: notification.id,
            fromLevel: currentLevel,
            toLevel: nextLevel,
            component: 'NotificationEscalationService'
        }, 'Escalating notification');

        // Ottieni config per il livello
        const escalationConfig = await this.getEscalationConfig(
            notification.tenantId,
            nextLevel
        );

        if (!escalationConfig) {
            logger.warn({
                notificationId: notification.id,
                level: nextLevel,
                component: 'NotificationEscalationService'
            }, 'No escalation config for level');
            return null;
        }

        // Trova target escalation
        const escalationTargets = await this.findEscalationTargets(
            notification,
            escalationConfig,
            nextLevel
        );

        if (escalationTargets.length === 0) {
            logger.warn({
                notificationId: notification.id,
                component: 'NotificationEscalationService'
            }, 'No escalation targets found');
            return null;
        }

        // Crea record escalation
        const escalation = await prisma.notificationEscalation.create({
            data: {
                tenantId: notification.tenantId,
                notificationId: notification.id,
                fromLevel: currentLevel,
                toLevel: nextLevel,
                reason: 'TIMEOUT',
                escalatedToPersonIds: escalationTargets.map(t => t.id),
                // Backward compat: primo target
                escalatedToId: escalationTargets[0]?.id
            }
        });

        // Aggiorna livello notifica
        await prisma.notification.update({
            where: { id: notification.id },
            data: {
                currentEscalationLevel: nextLevel,
                lastEscalatedAt: new Date()
            }
        });

        // Invia notifica ai target
        const messageTemplate = escalationConfig.messageTemplate ||
            this.DEFAULT_ESCALATION_CONFIG[`level${nextLevel}`]?.messageTemplate ||
            `Notifica non gestita - Escalation Livello ${nextLevel}`;

        for (const target of escalationTargets) {
            try {
                await NotificationService.sendToPerson(target.id, {
                    title: `🚨 ${messageTemplate}`,
                    body: `${notification.title}\n\n${notification.body}`,
                    type: 'CRITICAL',
                    category: 'SYSTEM',
                    priority: 'CRITICAL_P',
                    channels: ['IN_APP', ...(escalationConfig.additionalChannels || [])],
                    isDismissable: false,
                    requiresConfirmation: true,
                    actionUrl: notification.actionUrl,
                    metadata: {
                        originalNotificationId: notification.id,
                        escalationLevel: nextLevel,
                        escalationId: escalation.id,
                        escalationType: 'ESCALATION'
                    }
                }, notification.tenantId);

                logger.info({
                    targetId: target.id,
                    notificationId: notification.id,
                    level: nextLevel,
                    component: 'NotificationEscalationService'
                }, 'Escalation notification sent to target');

            } catch (error) {
                logger.error({
                    error: error.message,
                    targetId: target.id,
                    notificationId: notification.id,
                    component: 'NotificationEscalationService'
                }, 'Failed to send escalation notification to target');
            }
        }

        logger.info({
            notificationId: notification.id,
            level: nextLevel,
            targetsCount: escalationTargets.length,
            escalationId: escalation.id,
            component: 'NotificationEscalationService'
        }, 'Notification escalated successfully');

        return escalation;
    }

    // ============================================
    // TARGET RESOLUTION
    // ============================================

    /**
     * Trova target per escalation basato sulla configurazione
     * @param {Object} notification - Notifica
     * @param {Object} config - Configurazione escalation
     * @param {number} level - Livello escalation
     * @returns {Promise<Array<Person>>} Array di persone target
     */
    static async findEscalationTargets(notification, config, level) {
        const { tenantId } = notification;

        switch (config.targetType) {
            case 'SUPERVISOR': {
                // Trova supervisore del destinatario attraverso gerarchia ruoli
                const recipientRole = await prisma.personRole.findFirst({
                    where: {
                        personId: notification.recipientId,
                        isActive: true,
                        deletedAt: null,
                        parentRoleId: { not: null }
                    },
                    include: {
                        parentRole: {
                            include: {
                                person: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        deletedAt: true,
                                        tenantProfiles: {
                                            where: { tenantId },
                                            select: { email: true, phone: true, status: true },
                                            take: 1
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                if (recipientRole?.parentRole?.person) {
                    const parentPerson = recipientRole.parentRole.person;
                    const profile = parentPerson.tenantProfiles?.[0];
                    if (profile?.status === 'ACTIVE' && !parentPerson.deletedAt) {
                        return [{
                            ...parentPerson,
                            email: profile?.email,
                            phone: profile?.phone,
                            status: profile?.status,
                            tenantProfiles: undefined
                        }];
                    }
                }

                // P63: Person.tenantId REMOVED - filter only via tenantProfiles
                // Fallback: trova qualsiasi manager
                const managers = await prisma.person.findMany({
                    where: {
                        deletedAt: null,
                        tenantProfiles: {
                            some: {
                                tenantId,
                                status: 'ACTIVE',
                                deletedAt: null
                            }
                        },
                        personRoles: {
                            some: {
                                roleType: { in: ['MANAGER', 'ADMIN'] }
                            }
                        }
                    },
                    take: 3
                });
                return managers;
            }

            case 'MANAGER': {
                // P63: Person.tenantId REMOVED - filter only via tenantProfiles
                // Trova tutti i manager del tenant
                return prisma.person.findMany({
                    where: {
                        deletedAt: null,
                        tenantProfiles: {
                            some: {
                                tenantId,
                                status: 'ACTIVE',
                                deletedAt: null
                            }
                        },
                        personRoles: {
                            some: {
                                roleType: 'MANAGER'
                            }
                        }
                    }
                });
            }

            case 'ADMIN': {
                // P63: Person.tenantId REMOVED - filter only via tenantProfiles
                // Trova tutti gli admin del tenant
                return prisma.person.findMany({
                    where: {
                        deletedAt: null,
                        tenantProfiles: {
                            some: {
                                tenantId,
                                status: 'ACTIVE',
                                deletedAt: null
                            }
                        },
                        personRoles: {
                            some: {
                                roleType: { in: ['ADMIN', 'SUPER_ADMIN'] }
                            }
                        }
                    }
                });
            }

            case 'ROLE': {
                // Target specifico per ruolo configurato
                if (!config.targetRole) {
                    logger.warn({
                        configId: config.id,
                        component: 'NotificationEscalationService'
                    }, 'ROLE target type without targetRole specified');
                    return [];
                }

                // P63: Person.tenantId REMOVED - filter only via tenantProfiles
                return prisma.person.findMany({
                    where: {
                        deletedAt: null,
                        tenantProfiles: {
                            some: {
                                tenantId,
                                status: 'ACTIVE',
                                deletedAt: null
                            }
                        },
                        personRoles: {
                            some: {
                                roleType: config.targetRole
                            }
                        }
                    }
                });
            }

            case 'PERSON': {
                // Target persona/e specifiche
                if (!config.targetPersonIds || config.targetPersonIds.length === 0) {
                    logger.warn({
                        configId: config.id,
                        component: 'NotificationEscalationService'
                    }, 'PERSON target type without targetPersonIds');
                    return [];
                }

                // P63: Person.tenantId and Person.status REMOVED - filter via tenantProfiles
                return prisma.person.findMany({
                    where: {
                        id: { in: config.targetPersonIds },
                        deletedAt: null,
                        tenantProfiles: {
                            some: {
                                tenantId,
                                status: 'ACTIVE',
                                deletedAt: null
                            }
                        }
                    }
                });
            }

            default:
                logger.warn({
                    targetType: config.targetType,
                    component: 'NotificationEscalationService'
                }, 'Unknown target type');
                return [];
        }
    }

    // ============================================
    // CONFIGURATION MANAGEMENT
    // ============================================

    /**
     * Ottieni configurazione escalation per tenant e livello
     * @param {string} tenantId - ID tenant
     * @param {number} level - Livello (1, 2 o 3)
     * @returns {Promise<Object>} Configurazione (custom o default)
     */
    static async getEscalationConfig(tenantId, level) {
        if (level < 1 || level > 3) {
            return null;
        }

        // Cerca config custom nel DB
        const customConfig = await prisma.escalationConfig.findFirst({
            where: {
                tenantId,
                level,
                isActive: true,
                deletedAt: null
            }
        });

        if (customConfig) {
            return {
                delayMinutes: customConfig.delayMinutes,
                targetType: customConfig.targetType,
                targetRole: customConfig.targetRole,
                targetPersonIds: customConfig.targetPersonIds,
                additionalChannels: customConfig.additionalChannels,
                messageTemplate: customConfig.messageTemplate
            };
        }

        // Fallback a configurazione default
        const levelKey = `level${level}`;
        return this.DEFAULT_ESCALATION_CONFIG[levelKey] || null;
    }

    /**
     * Ottieni tutte le configurazioni escalation per un tenant
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Configurazioni per tutti i livelli
     */
    static async getAllConfigs(tenantId) {
        const configs = await prisma.escalationConfig.findMany({
            where: {
                tenantId,
                deletedAt: null
            },
            orderBy: { level: 'asc' }
        });

        // Merge con default
        return {
            level1: configs.find(c => c.level === 1) || {
                level: 1,
                isDefault: true,
                ...this.DEFAULT_ESCALATION_CONFIG.level1
            },
            level2: configs.find(c => c.level === 2) || {
                level: 2,
                isDefault: true,
                ...this.DEFAULT_ESCALATION_CONFIG.level2
            },
            level3: configs.find(c => c.level === 3) || {
                level: 3,
                isDefault: true,
                ...this.DEFAULT_ESCALATION_CONFIG.level3
            }
        };
    }

    /**
     * Aggiorna o crea configurazione escalation
     * @param {string} tenantId - ID tenant
     * @param {number} level - Livello (1, 2 o 3)
     * @param {Object} data - Dati configurazione
     * @returns {Promise<Object>} Configurazione aggiornata
     */
    static async upsertConfig(tenantId, level, data) {
        if (level < 1 || level > 3) {
            throw new Error('Invalid escalation level. Must be 1, 2 or 3');
        }

        const config = await prisma.escalationConfig.upsert({
            where: {
                tenantId_level: {
                    tenantId,
                    level
                }
            },
            update: {
                delayMinutes: data.delayMinutes,
                targetType: data.targetType,
                targetRole: data.targetRole,
                targetPersonIds: data.targetPersonIds || [],
                additionalChannels: data.additionalChannels || [],
                messageTemplate: data.messageTemplate,
                isActive: data.isActive !== undefined ? data.isActive : true,
                updatedAt: new Date()
            },
            create: {
                tenantId,
                level,
                delayMinutes: data.delayMinutes || this.DEFAULT_ESCALATION_CONFIG[`level${level}`].delayMinutes,
                targetType: data.targetType || this.DEFAULT_ESCALATION_CONFIG[`level${level}`].targetType,
                targetRole: data.targetRole,
                targetPersonIds: data.targetPersonIds || [],
                additionalChannels: data.additionalChannels || [],
                messageTemplate: data.messageTemplate,
                isActive: data.isActive !== undefined ? data.isActive : true
            }
        });

        logger.info({
            tenantId,
            level,
            configId: config.id,
            component: 'NotificationEscalationService'
        }, 'Escalation config updated');

        return config;
    }

    /**
     * Reset configurazione a default
     * @param {string} tenantId - ID tenant
     * @param {number} level - Livello (1, 2 o 3) o null per tutti
     * @returns {Promise<void>}
     */
    static async resetConfig(tenantId, level = null) {
        const where = { tenantId };
        if (level !== null) {
            where.level = level;
        }

        await prisma.escalationConfig.deleteMany({ where });

        logger.info({
            tenantId,
            level: level || 'all',
            component: 'NotificationEscalationService'
        }, 'Escalation config reset to default');
    }

    // ============================================
    // ESCALATION RESOLUTION
    // ============================================

    /**
     * Risolvi escalation (quando notifica viene gestita)
     * @param {string} notificationId - ID notifica
     * @param {string} resolvedBy - ID persona che risolve
     * @returns {Promise<void>}
     */
    static async resolveEscalation(notificationId, resolvedBy) {
        // Trova escalation aperte
        const openEscalations = await prisma.notificationEscalation.findMany({
            where: {
                notificationId,
                resolvedAt: null
            }
        });

        if (openEscalations.length === 0) {
            logger.debug({
                notificationId,
                component: 'NotificationEscalationService'
            }, 'No open escalations to resolve');
            return;
        }

        // Chiudi tutte le escalation
        await prisma.notificationEscalation.updateMany({
            where: {
                id: { in: openEscalations.map(e => e.id) }
            },
            data: {
                resolvedAt: new Date(),
                resolvedBy
            }
        });

        // Reset livello notifica
        await prisma.notification.update({
            where: { id: notificationId },
            data: { currentEscalationLevel: 0 }
        });

        logger.info({
            notificationId,
            resolvedBy,
            escalationsResolved: openEscalations.length,
            component: 'NotificationEscalationService'
        }, 'Escalation resolved');
    }

    /**
     * Risolvi escalation manualmente da ID escalation
     * @param {string} escalationId - ID escalation
     * @param {string} resolvedBy - ID persona che risolve
     * @returns {Promise<Object>} Escalation aggiornata
     */
    static async resolveById(escalationId, resolvedBy) {
        const escalation = await prisma.notificationEscalation.findFirst({
            where: { id: escalationId, deletedAt: null }
        });

        if (!escalation) {
            throw new Error('Escalation not found');
        }

        if (escalation.resolvedAt) {
            throw new Error('Escalation already resolved');
        }

        // Aggiorna escalation
        const updated = await prisma.notificationEscalation.update({
            where: { id: escalationId },
            data: {
                resolvedAt: new Date(),
                resolvedBy
            }
        });

        // Se era l'ultima escalation aperta, reset il livello della notifica
        const remainingOpen = await prisma.notificationEscalation.count({
            where: {
                notificationId: escalation.notificationId,
                resolvedAt: null
            }
        });

        if (remainingOpen === 0) {
            await prisma.notification.update({
                where: { id: escalation.notificationId },
                data: { currentEscalationLevel: 0 }
            });
        }

        logger.info({
            escalationId,
            notificationId: escalation.notificationId,
            resolvedBy,
            component: 'NotificationEscalationService'
        }, 'Escalation resolved manually');

        return updated;
    }

    // ============================================
    // QUERIES & LISTING
    // ============================================

    /**
     * Lista escalation per tenant
     * @param {string} tenantId - ID tenant
     * @param {Object} options - Opzioni di filtro
     * @returns {Promise<Object>} Lista paginata
     */
    static async list(tenantId, options = {}) {
        const {
            page = 1,
            limit = 20,
            status = 'all', // 'all', 'open', 'resolved'
            level = null,
            from = null,
            to = null
        } = options;

        const where = {
            tenantId
        };

        if (status === 'open') {
            where.resolvedAt = null;
        } else if (status === 'resolved') {
            where.resolvedAt = { not: null };
        }

        if (level !== null) {
            where.toLevel = level;
        }

        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to);
        }

        const [escalations, total] = await Promise.all([
            prisma.notificationEscalation.findMany({
                where,
                include: {
                    notification: {
                        select: {
                            id: true,
                            title: true,
                            body: true,
                            type: true,
                            priority: true,
                            recipientId: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.notificationEscalation.count({ where })
        ]);

        return {
            escalations,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Ottieni dettaglio singola escalation
     * @param {string} escalationId - ID escalation
     * @param {string} tenantId - ID tenant (per verifica accesso)
     * @returns {Promise<Object|null>} Escalation con dettagli
     */
    static async getById(escalationId, tenantId) {
        const escalation = await prisma.notificationEscalation.findFirst({
            where: {
                id: escalationId,
                tenantId
            },
            include: {
                notification: {
                    include: {
                        recipient: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                tenantProfiles: {
                                    where: { tenantId },
                                    select: { email: true },
                                    take: 1
                                }
                            }
                        }
                    }
                }
            }
        });

        // Flatten recipient.email from tenantProfiles
        if (escalation?.notification?.recipient) {
            escalation.notification.recipient = {
                ...escalation.notification.recipient,
                email: escalation.notification.recipient.tenantProfiles?.[0]?.email,
                tenantProfiles: undefined
            };
        }

        return escalation;
    }

    /**
     * Lista escalation aperte/attive
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Array>} Escalation attive
     */
    static async getActive(tenantId) {
        return prisma.notificationEscalation.findMany({
            where: {
                tenantId,
                resolvedAt: null
            },
            include: {
                notification: {
                    select: {
                        id: true,
                        title: true,
                        body: true,
                        type: true,
                        priority: true,
                        currentEscalationLevel: true,
                        recipient: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                { toLevel: 'desc' },
                { createdAt: 'desc' }
            ]
        });
    }

    // ============================================
    // STATISTICS
    // ============================================

    /**
     * Ottieni statistiche escalation
     * @param {string} tenantId - ID tenant
     * @param {Object} dateRange - Range di date { from, to }
     * @returns {Promise<Object>} Statistiche
     */
    static async getStats(tenantId, dateRange = {}) {
        const {
            from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: ultimi 30 giorni
            to = new Date()
        } = dateRange;

        const escalations = await prisma.notificationEscalation.findMany({
            where: {
                tenantId,
                createdAt: {
                    gte: from,
                    lte: to
                }
            },
            select: {
                id: true,
                toLevel: true,
                createdAt: true,
                resolvedAt: true
            }
        });

        const resolved = escalations.filter(e => e.resolvedAt);
        const unresolved = escalations.filter(e => !e.resolvedAt);

        // Tempo medio di risoluzione (in millisecondi)
        const resolutionTimes = resolved.map(e =>
            e.resolvedAt.getTime() - e.createdAt.getTime()
        );
        const avgResolutionTime = resolutionTimes.length > 0
            ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
            : 0;

        // Breakdown per livello
        const byLevel = {
            level1: escalations.filter(e => e.toLevel === 1).length,
            level2: escalations.filter(e => e.toLevel === 2).length,
            level3: escalations.filter(e => e.toLevel === 3).length
        };

        // Trend giornaliero
        const daily = this._calculateDailyTrend(escalations, from, to);

        // Rate di risoluzione
        const resolutionRate = escalations.length > 0
            ? Math.round((resolved.length / escalations.length) * 100)
            : 100;

        return {
            total: escalations.length,
            resolved: resolved.length,
            unresolved: unresolved.length,
            avgResolutionTimeMinutes: Math.round(avgResolutionTime / 60000),
            resolutionRate,
            byLevel,
            daily,
            period: {
                from: from.toISOString(),
                to: to.toISOString()
            }
        };
    }

    /**
     * Calcola trend giornaliero escalation
     * @private
     */
    static _calculateDailyTrend(escalations, from, to) {
        const days = {};
        const current = new Date(from);

        // Inizializza tutti i giorni a 0
        while (current <= to) {
            const key = current.toISOString().split('T')[0];
            days[key] = { total: 0, resolved: 0 };
            current.setDate(current.getDate() + 1);
        }

        // Conta escalation per giorno
        for (const esc of escalations) {
            const dayKey = esc.createdAt.toISOString().split('T')[0];
            if (days[dayKey]) {
                days[dayKey].total++;
                if (esc.resolvedAt) {
                    days[dayKey].resolved++;
                }
            }
        }

        return Object.entries(days).map(([date, counts]) => ({
            date,
            ...counts
        }));
    }

    /**
     * Conta escalation attive per livello
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Conteggio per livello
     */
    static async countByLevel(tenantId) {
        const counts = await prisma.notificationEscalation.groupBy({
            by: ['toLevel'],
            where: {
                tenantId,
                resolvedAt: null
            },
            _count: {
                id: true
            }
        });

        return {
            level1: counts.find(c => c.toLevel === 1)?._count?.id || 0,
            level2: counts.find(c => c.toLevel === 2)?._count?.id || 0,
            level3: counts.find(c => c.toLevel === 3)?._count?.id || 0,
            total: counts.reduce((sum, c) => sum + (c._count?.id || 0), 0)
        };
    }

    // ============================================
    // MANUAL ESCALATION
    // ============================================

    /**
     * Forza escalation manuale di una notifica
     * @param {string} notificationId - ID notifica
     * @param {string} performedBy - ID persona che esegue
     * @param {Object} options - Opzioni (targetPersonIds, channels, message)
     * @returns {Promise<Object>} Escalation creata
     */
    static async forceEscalation(notificationId, performedBy, options = {}) {
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, deletedAt: null },
            include: { tenant: true }
        });

        if (!notification) {
            throw new Error('Notification not found');
        }

        const currentLevel = notification.currentEscalationLevel || 0;
        const nextLevel = Math.min(currentLevel + 1, 3);

        // Determina target
        let targets = [];
        if (options.targetPersonIds && options.targetPersonIds.length > 0) {
            // P63: Person.tenantId and Person.status REMOVED - filter via tenantProfiles
            targets = await prisma.person.findMany({
                where: {
                    id: { in: options.targetPersonIds },
                    deletedAt: null,
                    tenantProfiles: {
                        some: {
                            tenantId: notification.tenantId,
                            status: 'ACTIVE',
                            deletedAt: null
                        }
                    }
                }
            });
        } else {
            // Usa config default
            const config = await this.getEscalationConfig(notification.tenantId, nextLevel);
            targets = await this.findEscalationTargets(notification, config, nextLevel);
        }

        if (targets.length === 0) {
            throw new Error('No valid escalation targets found');
        }

        // Crea record escalation
        const escalation = await prisma.notificationEscalation.create({
            data: {
                tenantId: notification.tenantId,
                notificationId: notification.id,
                fromLevel: currentLevel,
                toLevel: nextLevel,
                reason: 'MANUAL',
                escalatedToPersonIds: targets.map(t => t.id),
                escalatedToId: targets[0]?.id
            }
        });

        // Aggiorna livello notifica
        await prisma.notification.update({
            where: { id: notificationId },
            data: {
                currentEscalationLevel: nextLevel,
                lastEscalatedAt: new Date()
            }
        });

        // Invia notifica
        const message = options.message || `Escalation manuale - Livello ${nextLevel}`;
        const channels = options.channels || ['IN_APP', 'EMAIL'];

        for (const target of targets) {
            try {
                await NotificationService.sendToPerson(target.id, {
                    title: `🚨 ${message}`,
                    body: `${notification.title}\n\n${notification.body}`,
                    type: 'CRITICAL',
                    category: 'SYSTEM',
                    priority: 'CRITICAL_P',
                    channels,
                    isDismissable: false,
                    requiresConfirmation: true,
                    actionUrl: notification.actionUrl,
                    metadata: {
                        originalNotificationId: notification.id,
                        escalationLevel: nextLevel,
                        escalationId: escalation.id,
                        escalationType: 'MANUAL',
                        performedBy
                    }
                }, notification.tenantId);
            } catch (error) {
                logger.error({
                    error: error.message,
                    targetId: target.id,
                    component: 'NotificationEscalationService'
                }, 'Failed to send manual escalation');
            }
        }

        logger.info({
            notificationId,
            escalationId: escalation.id,
            level: nextLevel,
            performedBy,
            targetsCount: targets.length,
            component: 'NotificationEscalationService'
        }, 'Manual escalation performed');

        return escalation;
    }
}

export default NotificationEscalationService;
