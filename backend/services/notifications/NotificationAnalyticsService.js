/**
 * NotificationAnalyticsService
 * 
 * Service per analytics avanzate del sistema notifiche.
 * Fornisce metriche KPI, trend analysis e report dettagliati.
 * 
 * @module NotificationAnalyticsService
 * @version 1.0.0
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';


/**
 * Service per analytics delle notifiche
 * Gestisce metriche, trend e report dettagliati
 */
class NotificationAnalyticsService {

    // ==========================================
    // OVERVIEW STATS
    // ==========================================

    /**
     * Ottiene statistiche overview per il dashboard
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Opzioni di filtro
     * @param {Date} options.startDate - Data inizio
     * @param {Date} options.endDate - Data fine
     * @param {string} options.category - Categoria filtro
     * @returns {Promise<Object>} Statistiche overview
     */
    static async getOverviewStats(tenantId, options = {}) {
        const { startDate, endDate, category } = options;

        try {
            const notificationWhere = {
                tenantId,
                deletedAt: null,
                ...(category && { category }),
                ...(startDate || endDate ? {
                    createdAt: {
                        ...(startDate && { gte: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    }
                } : {})
            };

            // Query parallele per performance
            const [
                totalNotifications,
                sentCount,
                readCount,
                clickedCount,
                dismissedCount,
                failedCount
            ] = await Promise.all([
                // Totale notifiche create
                prisma.notification.count({ where: notificationWhere }),

                // Notifiche inviate (con almeno un log SENT o DELIVERED)
                prisma.notification.count({
                    where: {
                        ...notificationWhere,
                        logs: {
                            some: {
                                status: { in: ['SENT', 'DELIVERED'] }
                            }
                        }
                    }
                }),

                // Notifiche lette
                prisma.notification.count({
                    where: {
                        ...notificationWhere,
                        logs: {
                            some: {
                                readAt: { not: null }
                            }
                        }
                    }
                }),

                // Notifiche con click/azione
                prisma.notification.count({
                    where: {
                        ...notificationWhere,
                        logs: {
                            some: {
                                actionTakenAt: { not: null }
                            }
                        }
                    }
                }),

                // Notifiche dismissate
                prisma.notification.count({
                    where: {
                        ...notificationWhere,
                        logs: {
                            some: {
                                dismissedAt: { not: null }
                            }
                        }
                    }
                }),

                // Notifiche fallite
                prisma.notification.count({
                    where: {
                        ...notificationWhere,
                        logs: {
                            some: {
                                status: 'FAILED'
                            }
                        }
                    }
                })
            ]);

            // Calcola percentuali
            const calculateRate = (count, base) =>
                base > 0 ? Math.round((count / base) * 10000) / 100 : 0;

            const stats = {
                total: totalNotifications,
                sent: sentCount,
                read: readCount,
                clicked: clickedCount,
                dismissed: dismissedCount,
                failed: failedCount,
                rates: {
                    delivery: calculateRate(sentCount, totalNotifications),
                    open: calculateRate(readCount, sentCount),
                    click: calculateRate(clickedCount, sentCount),
                    dismiss: calculateRate(dismissedCount, sentCount),
                    failure: calculateRate(failedCount, totalNotifications)
                }
            };

            logger.info('Overview stats retrieved', {
                component: 'NotificationAnalyticsService',
                action: 'getOverviewStats',
                tenantId,
                totalNotifications
            });

            return stats;

        } catch (error) {
            logger.error('Failed to get overview stats', {
                component: 'NotificationAnalyticsService',
                action: 'getOverviewStats',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    // ==========================================
    // DELIVERY METRICS
    // ==========================================

    /**
     * Ottiene metriche di delivery per canale
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Opzioni di filtro
     * @returns {Promise<Object>} Metriche per canale
     */
    static async getDeliveryMetrics(tenantId, options = {}) {
        const { startDate, endDate } = options;

        try {
            const logWhere = {
                notification: {
                    tenantId,
                    deletedAt: null
                },
                ...(startDate || endDate ? {
                    sentAt: {
                        ...(startDate && { gte: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    }
                } : {})
            };

            // Metriche per canale
            const channelStats = await prisma.notificationLog.groupBy({
                by: ['channel', 'status'],
                where: logWhere,
                _count: true
            });

            // Calcola avg delivery time con query parametrizzata
            // SECURITY: Use parameterized query to prevent SQL injection
            const parsedStartDate = startDate ? new Date(startDate) : null;
            const parsedEndDate = endDate ? new Date(endDate) : null;

            let avgDeliveryTime;
            if (parsedStartDate && parsedEndDate) {
                avgDeliveryTime = await prisma.$queryRaw`
                    SELECT 
                        nl.channel,
                        AVG(EXTRACT(EPOCH FROM (nl."deliveredAt" - nl."sentAt"))) as avg_delivery_seconds
                    FROM "notification_logs" nl
                    INNER JOIN "notifications" n ON nl."notificationId" = n.id
                    WHERE n."tenantId" = ${tenantId}
                        AND n."deletedAt" IS NULL
                        AND nl."deliveredAt" IS NOT NULL
                        AND nl."sentAt" IS NOT NULL
                        AND nl."sentAt" >= ${parsedStartDate}
                        AND nl."sentAt" <= ${parsedEndDate}
                    GROUP BY nl.channel
                `;
            } else if (parsedStartDate) {
                avgDeliveryTime = await prisma.$queryRaw`
                    SELECT 
                        nl.channel,
                        AVG(EXTRACT(EPOCH FROM (nl."deliveredAt" - nl."sentAt"))) as avg_delivery_seconds
                    FROM "notification_logs" nl
                    INNER JOIN "notifications" n ON nl."notificationId" = n.id
                    WHERE n."tenantId" = ${tenantId}
                        AND n."deletedAt" IS NULL
                        AND nl."deliveredAt" IS NOT NULL
                        AND nl."sentAt" IS NOT NULL
                        AND nl."sentAt" >= ${parsedStartDate}
                    GROUP BY nl.channel
                `;
            } else if (parsedEndDate) {
                avgDeliveryTime = await prisma.$queryRaw`
                    SELECT 
                        nl.channel,
                        AVG(EXTRACT(EPOCH FROM (nl."deliveredAt" - nl."sentAt"))) as avg_delivery_seconds
                    FROM "notification_logs" nl
                    INNER JOIN "notifications" n ON nl."notificationId" = n.id
                    WHERE n."tenantId" = ${tenantId}
                        AND n."deletedAt" IS NULL
                        AND nl."deliveredAt" IS NOT NULL
                        AND nl."sentAt" IS NOT NULL
                        AND nl."sentAt" <= ${parsedEndDate}
                    GROUP BY nl.channel
                `;
            } else {
                avgDeliveryTime = await prisma.$queryRaw`
                    SELECT 
                        nl.channel,
                        AVG(EXTRACT(EPOCH FROM (nl."deliveredAt" - nl."sentAt"))) as avg_delivery_seconds
                    FROM "notification_logs" nl
                    INNER JOIN "notifications" n ON nl."notificationId" = n.id
                    WHERE n."tenantId" = ${tenantId}
                        AND n."deletedAt" IS NULL
                        AND nl."deliveredAt" IS NOT NULL
                        AND nl."sentAt" IS NOT NULL
                    GROUP BY nl.channel
                `;
            }

            // Organizza risultati per canale
            const channels = ['EMAIL', 'SMS', 'PUSH', 'WEBHOOK', 'IN_APP'];
            const metrics = {};

            for (const channel of channels) {
                const channelLogs = channelStats.filter(s => s.channel === channel);
                const total = channelLogs.reduce((sum, s) => sum + s._count, 0);
                const delivered = channelLogs.find(s => s.status === 'DELIVERED')?._count || 0;
                const failed = channelLogs.find(s => s.status === 'FAILED')?._count || 0;
                const pending = channelLogs.find(s => s.status === 'PENDING')?._count || 0;

                const avgTime = avgDeliveryTime.find(a => a.channel === channel);

                metrics[channel] = {
                    total,
                    delivered,
                    failed,
                    pending,
                    deliveryRate: total > 0 ? Math.round((delivered / total) * 10000) / 100 : 0,
                    failureRate: total > 0 ? Math.round((failed / total) * 10000) / 100 : 0,
                    avgDeliveryTimeSeconds: avgTime ? Math.round(avgTime.avg_delivery_seconds) : null
                };
            }

            logger.info('Delivery metrics retrieved', {
                component: 'NotificationAnalyticsService',
                action: 'getDeliveryMetrics',
                tenantId,
                channels: Object.keys(metrics).filter(c => metrics[c].total > 0)
            });

            return metrics;

        } catch (error) {
            logger.error('Failed to get delivery metrics', {
                component: 'NotificationAnalyticsService',
                action: 'getDeliveryMetrics',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    // ==========================================
    // TREND ANALYSIS
    // ==========================================

    /**
     * Analisi trend temporali
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Opzioni
     * @param {string} options.granularity - hour|day|week|month
     * @param {Date} options.startDate - Data inizio
     * @param {Date} options.endDate - Data fine
     * @returns {Promise<Array>} Dati trend
     */
    static async getTrendAnalysis(tenantId, options = {}) {
        const {
            granularity = 'day',
            startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default 30 giorni
            endDate = new Date()
        } = options;

        try {
            // SECURITY: Whitelist validation for date format - prevents SQL injection
            const allowedFormats = {
                hour: 'YYYY-MM-DD HH24:00',
                day: 'YYYY-MM-DD',
                week: 'IYYY-IW',
                month: 'YYYY-MM'
            };

            if (!allowedFormats[granularity]) {
                throw new Error(`Invalid granularity: ${granularity}. Allowed: ${Object.keys(allowedFormats).join(', ')}`);
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            // Query per trend - usando $queryRaw tagged templates (no string interpolation)
            // Split per granularity per evitare $queryRawUnsafe
            let trendData;
            if (granularity === 'hour') {
                trendData = await prisma.$queryRaw`
                    SELECT 
                        TO_CHAR(n."createdAt", 'YYYY-MM-DD HH24:00') as period,
                        COUNT(*) as total,
                        COUNT(CASE WHEN EXISTS (
                            SELECT 1 FROM "notification_logs" nl 
                            WHERE nl."notificationId" = n.id AND nl.status IN ('SENT', 'DELIVERED')
                        ) THEN 1 END) as sent,
                        COUNT(CASE WHEN EXISTS (
                            SELECT 1 FROM "notification_logs" nl 
                            WHERE nl."notificationId" = n.id AND nl."readAt" IS NOT NULL
                        ) THEN 1 END) as read,
                        COUNT(CASE WHEN EXISTS (
                            SELECT 1 FROM "notification_logs" nl 
                            WHERE nl."notificationId" = n.id AND nl."actionTakenAt" IS NOT NULL
                        ) THEN 1 END) as clicked,
                        COUNT(CASE WHEN EXISTS (
                            SELECT 1 FROM "notification_logs" nl 
                            WHERE nl."notificationId" = n.id AND nl."dismissedAt" IS NOT NULL
                        ) THEN 1 END) as dismissed
                    FROM "notifications" n
                    WHERE n."tenantId" = ${tenantId}
                        AND n."deletedAt" IS NULL
                        AND n."createdAt" >= ${start}
                        AND n."createdAt" <= ${end}
                    GROUP BY TO_CHAR(n."createdAt", 'YYYY-MM-DD HH24:00')
                    ORDER BY period ASC
                `;
            } else if (granularity === 'day') {
                trendData = await prisma.$queryRaw`
                    SELECT 
                        TO_CHAR(n."createdAt", 'YYYY-MM-DD') as period,
                        COUNT(*) as total,
                        COUNT(CASE WHEN EXISTS (
                            SELECT 1 FROM "notification_logs" nl 
                            WHERE nl."notificationId" = n.id AND nl.status IN ('SENT', 'DELIVERED')
                        ) THEN 1 END) as sent,
                        COUNT(CASE WHEN EXISTS (
                            SELECT 1 FROM "notification_logs" nl 
                            WHERE nl."notificationId" = n.id AND nl."readAt" IS NOT NULL
                        ) THEN 1 END) as read,
                        COUNT(CASE WHEN EXISTS (
                            SELECT 1 FROM "notification_logs" nl 
                            WHERE nl."notificationId" = n.id AND nl."actionTakenAt" IS NOT NULL
                        ) THEN 1 END) as clicked,
                        COUNT(CASE WHEN EXISTS (
                            SELECT 1 FROM "notification_logs" nl 
                            WHERE nl."notificationId" = n.id AND nl."dismissedAt" IS NOT NULL
                        ) THEN 1 END) as dismissed
                    FROM "notifications" n
                    WHERE n."tenantId" = ${tenantId}
                        AND n."deletedAt" IS NULL
                        AND n."createdAt" >= ${start}
                        AND n."createdAt" <= ${end}
                    GROUP BY TO_CHAR(n."createdAt", 'YYYY-MM-DD')
                    ORDER BY period ASC
                `;
            } else if (granularity === 'week') {
                trendData = await prisma.$queryRaw`
                    SELECT 
                        TO_CHAR(n."createdAt", 'IYYY-IW') as period,
                        COUNT(*) as total,
                        COUNT(CASE WHEN EXISTS (
                            SELECT 1 FROM "notification_logs" nl 
                            WHERE nl."notificationId" = n.id AND nl.status IN ('SENT', 'DELIVERED')
                        ) THEN 1 END) as sent,
                        COUNT(CASE WHEN EXISTS (
                            SELECT 1 FROM "notification_logs" nl 
                            WHERE nl."notificationId" = n.id AND nl."readAt" IS NOT NULL
                        ) THEN 1 END) as read,
                        COUNT(CASE WHEN EXISTS (
                            SELECT 1 FROM "notification_logs" nl 
                            WHERE nl."notificationId" = n.id AND nl."actionTakenAt" IS NOT NULL
                        ) THEN 1 END) as clicked,
                        COUNT(CASE WHEN EXISTS (
                            SELECT 1 FROM "notification_logs" nl 
                            WHERE nl."notificationId" = n.id AND nl."dismissedAt" IS NOT NULL
                        ) THEN 1 END) as dismissed
                    FROM "notifications" n
                    WHERE n."tenantId" = ${tenantId}
                        AND n."deletedAt" IS NULL
                        AND n."createdAt" >= ${start}
                        AND n."createdAt" <= ${end}
                    GROUP BY TO_CHAR(n."createdAt", 'IYYY-IW')
                    ORDER BY period ASC
                `;
            } else {
                // granularity === 'month'
                trendData = await prisma.$queryRaw`
                    SELECT 
                        TO_CHAR(n."createdAt", 'YYYY-MM') as period,
                        COUNT(*) as total,
                        COUNT(CASE WHEN EXISTS (
                            SELECT 1 FROM "notification_logs" nl 
                            WHERE nl."notificationId" = n.id AND nl.status IN ('SENT', 'DELIVERED')
                        ) THEN 1 END) as sent,
                        COUNT(CASE WHEN EXISTS (
                            SELECT 1 FROM "notification_logs" nl 
                            WHERE nl."notificationId" = n.id AND nl."readAt" IS NOT NULL
                        ) THEN 1 END) as read,
                        COUNT(CASE WHEN EXISTS (
                            SELECT 1 FROM "notification_logs" nl 
                            WHERE nl."notificationId" = n.id AND nl."actionTakenAt" IS NOT NULL
                        ) THEN 1 END) as clicked,
                        COUNT(CASE WHEN EXISTS (
                            SELECT 1 FROM "notification_logs" nl 
                            WHERE nl."notificationId" = n.id AND nl."dismissedAt" IS NOT NULL
                        ) THEN 1 END) as dismissed
                    FROM "notifications" n
                    WHERE n."tenantId" = ${tenantId}
                        AND n."deletedAt" IS NULL
                        AND n."createdAt" >= ${start}
                        AND n."createdAt" <= ${end}
                    GROUP BY TO_CHAR(n."createdAt", 'YYYY-MM')
                    ORDER BY period ASC
                `;
            }

            // Converti BigInt a Number per JSON serialization
            const result = trendData.map(row => ({
                period: row.period,
                total: Number(row.total),
                sent: Number(row.sent),
                read: Number(row.read),
                clicked: Number(row.clicked),
                dismissed: Number(row.dismissed),
                openRate: row.sent > 0 ? Math.round((Number(row.read) / Number(row.sent)) * 10000) / 100 : 0,
                clickRate: row.sent > 0 ? Math.round((Number(row.clicked) / Number(row.sent)) * 10000) / 100 : 0
            }));

            logger.info('Trend analysis completed', {
                component: 'NotificationAnalyticsService',
                action: 'getTrendAnalysis',
                tenantId,
                granularity,
                dataPoints: result.length
            });

            return result;

        } catch (error) {
            logger.error('Failed to get trend analysis', {
                component: 'NotificationAnalyticsService',
                action: 'getTrendAnalysis',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    // ==========================================
    // ENGAGEMENT BY CATEGORY
    // ==========================================

    /**
     * Metriche engagement per categoria
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Opzioni di filtro
     * @returns {Promise<Array>} Engagement per categoria
     */
    static async getEngagementByCategory(tenantId, options = {}) {
        const { startDate, endDate } = options;

        try {
            const where = {
                tenantId,
                deletedAt: null,
                ...(startDate || endDate ? {
                    createdAt: {
                        ...(startDate && { gte: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    }
                } : {})
            };

            // Ottieni categorie uniche
            const categories = await prisma.notification.groupBy({
                by: ['category'],
                where,
                _count: true
            });

            // Per ogni categoria, calcola engagement
            const engagementData = await Promise.all(
                categories.map(async (cat) => {
                    const categoryWhere = { ...where, category: cat.category };

                    const [sent, read, clicked, dismissed] = await Promise.all([
                        prisma.notification.count({
                            where: {
                                ...categoryWhere,
                                logs: { some: { status: { in: ['SENT', 'DELIVERED'] } } }
                            }
                        }),
                        prisma.notification.count({
                            where: {
                                ...categoryWhere,
                                logs: { some: { readAt: { not: null } } }
                            }
                        }),
                        prisma.notification.count({
                            where: {
                                ...categoryWhere,
                                logs: { some: { actionTakenAt: { not: null } } }
                            }
                        }),
                        prisma.notification.count({
                            where: {
                                ...categoryWhere,
                                logs: { some: { dismissedAt: { not: null } } }
                            }
                        })
                    ]);

                    return {
                        category: cat.category,
                        total: cat._count,
                        sent,
                        read,
                        clicked,
                        dismissed,
                        openRate: sent > 0 ? Math.round((read / sent) * 10000) / 100 : 0,
                        clickRate: sent > 0 ? Math.round((clicked / sent) * 10000) / 100 : 0,
                        dismissRate: sent > 0 ? Math.round((dismissed / sent) * 10000) / 100 : 0
                    };
                })
            );

            // Ordina per totale decrescente
            engagementData.sort((a, b) => b.total - a.total);

            logger.info('Engagement by category retrieved', {
                component: 'NotificationAnalyticsService',
                action: 'getEngagementByCategory',
                tenantId,
                categories: engagementData.length
            });

            return engagementData;

        } catch (error) {
            logger.error('Failed to get engagement by category', {
                component: 'NotificationAnalyticsService',
                action: 'getEngagementByCategory',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    // ==========================================
    // NOTIFICATION REPORT
    // ==========================================

    /**
     * Report dettagliato per singola notifica
     * @param {string} notificationId - ID notifica
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Report dettagliato
     */
    static async getNotificationReport(notificationId, tenantId) {
        try {
            const notification = await prisma.notification.findFirst({
                where: {
                    id: notificationId,
                    tenantId,
                    deletedAt: null
                },
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
                    },
                    logs: {
                        orderBy: { sentAt: 'asc' }
                    },
                    group: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            if (!notification) {
                throw new Error('Notification not found');
            }

            // Flatten recipient.email from tenantProfiles
            if (notification.recipient) {
                notification.recipient = {
                    ...notification.recipient,
                    email: notification.recipient.tenantProfiles?.[0]?.email,
                    tenantProfiles: undefined
                };
            }

            // Calcola metriche per questa notifica
            const logs = notification.logs;
            const channelBreakdown = {};

            for (const log of logs) {
                if (!channelBreakdown[log.channel]) {
                    channelBreakdown[log.channel] = {
                        status: log.status,
                        sentAt: log.sentAt,
                        deliveredAt: log.deliveredAt,
                        readAt: log.readAt,
                        actionTakenAt: log.actionTakenAt,
                        dismissedAt: log.dismissedAt,
                        failureReason: log.failureReason,
                        retryCount: log.retryCount
                    };
                }
            }

            // Timeline eventi
            const timeline = [];

            if (notification.createdAt) {
                timeline.push({ event: 'created', timestamp: notification.createdAt });
            }

            for (const log of logs) {
                if (log.sentAt) {
                    timeline.push({
                        event: 'sent',
                        timestamp: log.sentAt,
                        channel: log.channel
                    });
                }
                if (log.deliveredAt) {
                    timeline.push({
                        event: 'delivered',
                        timestamp: log.deliveredAt,
                        channel: log.channel
                    });
                }
                if (log.readAt) {
                    timeline.push({
                        event: 'read',
                        timestamp: log.readAt,
                        channel: log.channel
                    });
                }
                if (log.actionTakenAt) {
                    timeline.push({
                        event: 'action_taken',
                        timestamp: log.actionTakenAt,
                        channel: log.channel
                    });
                }
                if (log.dismissedAt) {
                    timeline.push({
                        event: 'dismissed',
                        timestamp: log.dismissedAt,
                        channel: log.channel
                    });
                }
            }

            // Ordina timeline
            timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            const report = {
                notification: {
                    id: notification.id,
                    title: notification.title,
                    body: notification.body,
                    type: notification.type,
                    category: notification.category,
                    priority: notification.priority,
                    status: notification.status,
                    createdAt: notification.createdAt
                },
                recipient: notification.recipient,
                group: notification.group,
                delivery: {
                    channels: Object.keys(channelBreakdown),
                    breakdown: channelBreakdown
                },
                engagement: {
                    wasRead: logs.some(l => l.readAt),
                    actionTaken: logs.some(l => l.actionTakenAt),
                    wasDismissed: logs.some(l => l.dismissedAt),
                    firstReadAt: logs.find(l => l.readAt)?.readAt || null,
                    actionTakenAt: logs.find(l => l.actionTakenAt)?.actionTakenAt || null
                },
                timeline,
                metadata: notification.metadata
            };

            logger.info('Notification report generated', {
                component: 'NotificationAnalyticsService',
                action: 'getNotificationReport',
                notificationId,
                tenantId
            });

            return report;

        } catch (error) {
            logger.error('Failed to get notification report', {
                component: 'NotificationAnalyticsService',
                action: 'getNotificationReport',
                error: error.message,
                notificationId,
                tenantId
            });
            throw error;
        }
    }

    // ==========================================
    // DISTRIBUTION ANALYTICS
    // ==========================================

    /**
     * Distribuzione per tipo e priorità
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Opzioni
     * @returns {Promise<Object>} Distribuzione
     */
    static async getDistribution(tenantId, options = {}) {
        const { startDate, endDate } = options;

        try {
            const where = {
                tenantId,
                deletedAt: null,
                ...(startDate || endDate ? {
                    createdAt: {
                        ...(startDate && { gte: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    }
                } : {})
            };

            // Log where clause for status distribution
            const logWhere = {
                notification: {
                    tenantId,
                    deletedAt: null
                },
                ...(startDate || endDate ? {
                    createdAt: {
                        ...(startDate && { gte: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    }
                } : {})
            };

            const [byType, byPriority, byStatus] = await Promise.all([
                prisma.notification.groupBy({
                    by: ['type'],
                    where,
                    _count: true
                }),
                prisma.notification.groupBy({
                    by: ['priority'],
                    where,
                    _count: true
                }),
                // Status is on NotificationLog, not Notification
                prisma.notificationLog.groupBy({
                    by: ['status'],
                    where: logWhere,
                    _count: true
                })
            ]);

            const distribution = {
                byType: byType.map(t => ({
                    type: t.type,
                    count: t._count
                })),
                byPriority: byPriority.map(p => ({
                    priority: p.priority,
                    count: p._count
                })),
                byStatus: byStatus.map(s => ({
                    status: s.status,
                    count: s._count
                }))
            };

            logger.info('Distribution analytics retrieved', {
                component: 'NotificationAnalyticsService',
                action: 'getDistribution',
                tenantId
            });

            return distribution;

        } catch (error) {
            logger.error('Failed to get distribution', {
                component: 'NotificationAnalyticsService',
                action: 'getDistribution',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    // ==========================================
    // EXPORT DATA
    // ==========================================

    /**
     * Esporta dati analytics in formato CSV o JSON
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Opzioni export
     * @param {string} options.format - csv|json
     * @param {Date} options.startDate - Data inizio
     * @param {Date} options.endDate - Data fine
     * @returns {Promise<Object>} Dati formattati
     */
    static async exportAnalytics(tenantId, options = {}) {
        const { format = 'json', startDate, endDate } = options;

        try {
            // Raccogli tutti i dati
            const [overview, delivery, trends, categories, distribution] = await Promise.all([
                this.getOverviewStats(tenantId, { startDate, endDate }),
                this.getDeliveryMetrics(tenantId, { startDate, endDate }),
                this.getTrendAnalysis(tenantId, { startDate, endDate }),
                this.getEngagementByCategory(tenantId, { startDate, endDate }),
                this.getDistribution(tenantId, { startDate, endDate })
            ]);

            const exportData = {
                exportedAt: new Date().toISOString(),
                dateRange: { startDate, endDate },
                overview,
                delivery,
                trends,
                categories,
                distribution
            };

            if (format === 'csv') {
                // Genera CSV per trends (più tabellare)
                const csvRows = ['period,total,sent,read,clicked,dismissed,openRate,clickRate'];
                for (const row of trends) {
                    csvRows.push([
                        row.period,
                        row.total,
                        row.sent,
                        row.read,
                        row.clicked,
                        row.dismissed,
                        row.openRate,
                        row.clickRate
                    ].join(','));
                }

                return {
                    format: 'csv',
                    filename: `notification-analytics-${tenantId}-${Date.now()}.csv`,
                    content: csvRows.join('\n'),
                    mimeType: 'text/csv'
                };
            }

            return {
                format: 'json',
                filename: `notification-analytics-${tenantId}-${Date.now()}.json`,
                content: JSON.stringify(exportData, null, 2),
                mimeType: 'application/json'
            };

        } catch (error) {
            logger.error('Failed to export analytics', {
                component: 'NotificationAnalyticsService',
                action: 'exportAnalytics',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }
}

export default NotificationAnalyticsService;
