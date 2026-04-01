/**
 * NotificationGdprService
 * 
 * Service per GDPR compliance del sistema notifiche.
 * Gestisce export dati (Art. 15), diritto all'oblio (Art. 17),
 * retention policy e audit trail.
 * 
 * @module NotificationGdprService
 * @version 1.0.0
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';


/**
 * Service per GDPR compliance delle notifiche
 * Implementa Art. 15, 17 e retention policies
 */
class NotificationGdprService {

    // ==========================================
    // DATA EXPORT (GDPR Art. 15)
    // ==========================================

    /**
     * Esporta tutti i dati notifiche di una persona (Art. 15 - Right of Access)
     * @param {string} personId - ID della persona
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Opzioni export
     * @param {string} options.format - json|csv
     * @returns {Promise<Object>} Dati esportati
     */
    static async exportPersonData(personId, tenantId, options = {}) {
        const { format = 'json' } = options;

        try {
            // Verifica che la persona esista
            // P63: Person non ha tenantId — filtra via tenantProfiles.some
            const person = await prisma.person.findFirst({
                where: {
                    id: personId,
                    deletedAt: null,
                    tenantProfiles: { some: { tenantId, deletedAt: null } }
                },
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
            });

            if (!person) {
                throw new Error('Person not found');
            }

            // Flatten email from tenantProfiles
            person.email = person.tenantProfiles?.[0]?.email;
            delete person.tenantProfiles;

            // Recupera tutte le notifiche della persona
            const notifications = await prisma.notification.findMany({
                where: {
                    recipientId: personId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    logs: {
                        select: {
                            id: true,
                            channel: true,
                            status: true,
                            sentAt: true,
                            deliveredAt: true,
                            readAt: true,
                            actionTakenAt: true,
                            dismissedAt: true,
                            // NO deviceInfo/ipAddress per privacy
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Recupera preferences (nota: NotificationPreference non ha tenantId, è personale)
            const preferences = await prisma.notificationPreference.findMany({
                where: {
                    personId
                }
            });

            // Nota: NotificationSubscription model non esiste, saltato
            const subscriptions = [];

            // Struttura dati export
            const exportData = {
                exportedAt: new Date().toISOString(),
                dataSubject: {
                    id: person.id,
                    firstName: person.firstName,
                    lastName: person.lastName,
                    email: person.email
                },
                notifications: notifications.map(n => ({
                    id: n.id,
                    title: n.title,
                    body: n.body,
                    type: n.type,
                    category: n.category,
                    priority: n.priority,
                    status: n.status,
                    createdAt: n.createdAt,
                    scheduledFor: n.scheduledFor,
                    expiresAt: n.expiresAt,
                    deliveryLogs: n.logs.map(l => ({
                        channel: l.channel,
                        status: l.status,
                        sentAt: l.sentAt,
                        deliveredAt: l.deliveredAt,
                        readAt: l.readAt,
                        actionTakenAt: l.actionTakenAt,
                        dismissedAt: l.dismissedAt
                    }))
                })),
                preferences: preferences.map(p => ({
                    category: p.category,
                    channel: p.channel,
                    enabled: p.enabled,
                    frequency: p.frequency,
                    quietHoursStart: p.quietHoursStart,
                    quietHoursEnd: p.quietHoursEnd
                })),
                subscriptions: subscriptions.map(s => ({
                    topic: s.topic,
                    channel: s.channel,
                    active: s.active,
                    subscribedAt: s.subscribedAt
                })),
                summary: {
                    totalNotifications: notifications.length,
                    totalPreferences: preferences.length,
                    totalSubscriptions: subscriptions.length
                }
            };

            // Log audit
            await this.createAuditLog({
                personId,
                tenantId,
                action: 'DATA_EXPORT',
                resourceType: 'NOTIFICATION_DATA',
                details: {
                    exportFormat: format,
                    itemsExported: notifications.length
                }
            });

            logger.info('Person notification data exported (GDPR Art. 15)', {
                component: 'NotificationGdprService',
                action: 'exportPersonData',
                personId,
                tenantId,
                notificationsCount: notifications.length
            });

            // Formatta output
            if (format === 'csv') {
                return this._formatAsCsv(exportData);
            }

            return {
                format: 'json',
                filename: `notification-data-export-${personId}-${Date.now()}.json`,
                content: JSON.stringify(exportData, null, 2),
                mimeType: 'application/json'
            };

        } catch (error) {
            logger.error('Failed to export person data', {
                component: 'NotificationGdprService',
                action: 'exportPersonData',
                error: error.message,
                personId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Formatta dati export come CSV
     * @private
     */
    static _formatAsCsv(data) {
        const rows = [
            'notification_id,title,type,category,priority,status,created_at,channel,sent_at,read_at'
        ];

        for (const n of data.notifications) {
            for (const log of n.deliveryLogs) {
                rows.push([
                    n.id,
                    `"${(n.title || '').replace(/"/g, '""')}"`,
                    n.type,
                    n.category,
                    n.priority,
                    n.status,
                    n.createdAt,
                    log.channel,
                    log.sentAt || '',
                    log.readAt || ''
                ].join(','));
            }
            // Se nessun log, aggiungi riga base
            if (n.deliveryLogs.length === 0) {
                rows.push([
                    n.id,
                    `"${(n.title || '').replace(/"/g, '""')}"`,
                    n.type,
                    n.category,
                    n.priority,
                    n.status,
                    n.createdAt,
                    '',
                    '',
                    ''
                ].join(','));
            }
        }

        return {
            format: 'csv',
            filename: `notification-data-export-${data.dataSubject.id}-${Date.now()}.csv`,
            content: rows.join('\n'),
            mimeType: 'text/csv'
        };
    }

    // ==========================================
    // DATA DELETION (GDPR Art. 17)
    // ==========================================

    /**
     * Cancella tutti i dati notifiche di una persona (Art. 17 - Right to be Forgotten)
     * @param {string} personId - ID della persona
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Opzioni cancellazione
     * @param {boolean} options.hardDelete - Se true, elimina fisicamente (default: soft delete)
     * @param {string} options.reason - Motivo cancellazione
     * @returns {Promise<Object>} Risultato cancellazione
     */
    static async deletePersonData(personId, tenantId, options = {}) {
        const { hardDelete = false, reason = 'GDPR Art. 17 request' } = options;

        try {
            // Verifica persona
            // P63: Person non ha tenantId — filtra via tenantProfiles.some
            const person = await prisma.person.findFirst({
                where: {
                    id: personId,
                    tenantProfiles: { some: { tenantId } }
                }
            });

            if (!person) {
                throw new Error('Person not found');
            }

            const deletedAt = new Date();
            let result;

            if (hardDelete) {
                // Hard delete - rimuove fisicamente (solo se richiesto esplicitamente)
                result = await prisma.$transaction(async (tx) => {
                    // Prima i logs
                    const deletedLogs = await tx.notificationLog.deleteMany({
                        where: {
                            notification: {
                                recipientId: personId,
                                tenantId
                            }
                        }
                    });

                    // Poi le notifiche
                    const deletedNotifications = await tx.notification.deleteMany({
                        where: {
                            recipientId: personId,
                            tenantId
                        }
                    });

                    // Preferences (no tenantId)
                    const deletedPreferences = await tx.notificationPreference.deleteMany({
                        where: {
                            personId
                        }
                    });

                    // Nota: NotificationSubscription model non esiste
                    const deletedSubscriptions = { count: 0 };

                    return {
                        notifications: deletedNotifications.count,
                        logs: deletedLogs.count,
                        preferences: deletedPreferences.count,
                        subscriptions: deletedSubscriptions.count
                    };
                });
            } else {
                // Soft delete - imposta deletedAt
                result = await prisma.$transaction(async (tx) => {
                    // Soft delete notifiche
                    const deletedNotifications = await tx.notification.updateMany({
                        where: {
                            recipientId: personId,
                            tenantId,
                            deletedAt: null
                        },
                        data: { deletedAt }
                    });

                    // Soft delete preferences
                    const deletedPreferences = await tx.notificationPreference.updateMany({
                        where: {
                            personId,
                            tenantId,
                            deletedAt: null
                        },
                        data: { deletedAt }
                    });

                    // Nota: NotificationSubscription model non esiste
                    const deletedSubscriptions = { count: 0 };

                    return {
                        notifications: deletedNotifications.count,
                        preferences: deletedPreferences.count,
                        subscriptions: deletedSubscriptions.count
                    };
                });
            }

            // Log audit
            await this.createAuditLog({
                personId,
                tenantId,
                action: hardDelete ? 'DATA_HARD_DELETE' : 'DATA_SOFT_DELETE',
                resourceType: 'NOTIFICATION_DATA',
                details: {
                    reason,
                    deletedItems: result
                }
            });

            logger.info('Person notification data deleted (GDPR Art. 17)', {
                component: 'NotificationGdprService',
                action: 'deletePersonData',
                personId,
                tenantId,
                hardDelete,
                result
            });

            return {
                success: true,
                deletedAt,
                hardDelete,
                counts: result
            };

        } catch (error) {
            logger.error('Failed to delete person data', {
                component: 'NotificationGdprService',
                action: 'deletePersonData',
                error: error.message,
                personId,
                tenantId
            });
            throw error;
        }
    }

    // ==========================================
    // RETENTION POLICY
    // ==========================================

    /**
     * Applica retention policy sulle notifiche
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Opzioni retention
     * @param {number} options.retentionDays - Giorni di retention (default: 365)
     * @param {boolean} options.hardDelete - Se true, elimina fisicamente
     * @returns {Promise<Object>} Risultato applicazione policy
     */
    static async applyRetentionPolicy(tenantId, options = {}) {
        const {
            retentionDays = 365,
            hardDelete = false
        } = options;

        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            let result;

            if (hardDelete) {
                // Hard delete vecchi records
                result = await prisma.$transaction(async (tx) => {
                    // Prima i logs delle vecchie notifiche
                    const deletedLogs = await tx.notificationLog.deleteMany({
                        where: {
                            notification: {
                                tenantId,
                                createdAt: { lt: cutoffDate }
                            }
                        }
                    });

                    // Poi le notifiche
                    const deletedNotifications = await tx.notification.deleteMany({
                        where: {
                            tenantId,
                            createdAt: { lt: cutoffDate }
                        }
                    });

                    return {
                        notifications: deletedNotifications.count,
                        logs: deletedLogs.count
                    };
                });
            } else {
                // Soft delete
                const deletedAt = new Date();

                result = await prisma.notification.updateMany({
                    where: {
                        tenantId,
                        createdAt: { lt: cutoffDate },
                        deletedAt: null
                    },
                    data: { deletedAt }
                });

                result = { notifications: result.count };
            }

            // Log audit
            await this.createAuditLog({
                tenantId,
                action: 'RETENTION_POLICY_APPLIED',
                resourceType: 'NOTIFICATION_DATA',
                details: {
                    retentionDays,
                    cutoffDate,
                    hardDelete,
                    deletedItems: result
                }
            });

            logger.info('Retention policy applied', {
                component: 'NotificationGdprService',
                action: 'applyRetentionPolicy',
                tenantId,
                retentionDays,
                cutoffDate,
                result
            });

            return {
                success: true,
                cutoffDate,
                retentionDays,
                hardDelete,
                counts: result
            };

        } catch (error) {
            logger.error('Failed to apply retention policy', {
                component: 'NotificationGdprService',
                action: 'applyRetentionPolicy',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    // ==========================================
    // AUDIT TRAIL
    // ==========================================

    /**
     * Crea entry nel log di audit GDPR
     * @param {Object} params - Parametri audit
     * @returns {Promise<Object>} Entry creata
     */
    static async createAuditLog(params) {
        const {
            personId,
            tenantId,
            action,
            resourceType,
            resourceId,
            details,
            ipAddress,
            userAgent,
            performedBy
        } = params;

        try {
            const auditEntry = await prisma.gdprAuditLog.create({
                data: {
                    personId,
                    tenantId,
                    action,
                    resourceType,
                    resourceId,
                    dataAccessed: details ? JSON.stringify(details) : null,
                    ipAddress,
                    userAgent
                }
            });

            logger.debug('GDPR audit log created', {
                component: 'NotificationGdprService',
                action: 'createAuditLog',
                auditId: auditEntry.id,
                gdprAction: action
            });

            return auditEntry;

        } catch (error) {
            logger.error('Failed to create audit log', {
                component: 'NotificationGdprService',
                action: 'createAuditLog',
                error: error.message
            });
            // Non rilanciamo per evitare di bloccare operazioni principali
            return null;
        }
    }

    /**
     * Recupera audit trail per una persona
     * @param {string} personId - ID persona
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Opzioni paginazione
     * @returns {Promise<Object>} Audit trail
     */
    static async getAuditTrail(personId, tenantId, options = {}) {
        const {
            page = 1,
            limit = 50,
            startDate,
            endDate,
            action
        } = options;

        try {
            const where = {
                personId,
                tenantId,
                deletedAt: null,
                ...(action && { action }),
                ...(startDate || endDate ? {
                    createdAt: {
                        ...(startDate && { gte: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    }
                } : {})
            };

            const [entries, total] = await Promise.all([
                prisma.gdprAuditLog.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                    select: {
                        id: true,
                        action: true,
                        resourceType: true,
                        resourceId: true,
                        dataAccessed: true,
                        ipAddress: true,
                        createdAt: true
                    }
                }),
                prisma.gdprAuditLog.count({ where })
            ]);

            // Parse dataAccessed JSON
            const parsedEntries = entries.map(e => ({
                ...e,
                dataAccessed: e.dataAccessed ?
                    (typeof e.dataAccessed === 'string' ? JSON.parse(e.dataAccessed) : e.dataAccessed)
                    : null
            }));

            logger.info('Audit trail retrieved', {
                component: 'NotificationGdprService',
                action: 'getAuditTrail',
                personId,
                tenantId,
                entries: entries.length
            });

            return {
                data: parsedEntries,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            logger.error('Failed to get audit trail', {
                component: 'NotificationGdprService',
                action: 'getAuditTrail',
                error: error.message,
                personId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Recupera audit trail per tenant (admin)
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Opzioni
     * @returns {Promise<Object>} Audit trail
     */
    static async getTenantAuditTrail(tenantId, options = {}) {
        const {
            page = 1,
            limit = 100,
            startDate,
            endDate,
            action,
            resourceType
        } = options;

        try {
            const where = {
                tenantId,
                deletedAt: null,
                // Filtra solo per azioni relative alle notifiche
                resourceType: resourceType || { in: ['NOTIFICATION_DATA', 'NOTIFICATION', 'NOTIFICATION_PREFERENCE'] },
                ...(action && { action }),
                ...(startDate || endDate ? {
                    createdAt: {
                        ...(startDate && { gte: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    }
                } : {})
            };

            const [entries, total] = await Promise.all([
                prisma.gdprAuditLog.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                    include: {
                        person: {
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
                }),
                prisma.gdprAuditLog.count({ where })
            ]);

            // Parse dataAccessed JSON and flatten email
            const parsedEntries = entries.map(e => ({
                ...e,
                person: e.person ? {
                    ...e.person,
                    email: e.person.tenantProfiles?.[0]?.email,
                    tenantProfiles: undefined
                } : null,
                dataAccessed: e.dataAccessed ?
                    (typeof e.dataAccessed === 'string' ? JSON.parse(e.dataAccessed) : e.dataAccessed)
                    : null
            }));

            logger.info('Tenant audit trail retrieved', {
                component: 'NotificationGdprService',
                action: 'getTenantAuditTrail',
                tenantId,
                entries: entries.length
            });

            return {
                data: parsedEntries,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            logger.error('Failed to get tenant audit trail', {
                component: 'NotificationGdprService',
                action: 'getTenantAuditTrail',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    // ==========================================
    // ANONYMIZATION
    // ==========================================

    /**
     * Anonimizza dati notifiche (alternativa al delete)
     * @param {string} personId - ID persona
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Risultato anonimizzazione
     */
    static async anonymizePersonData(personId, tenantId) {
        try {
            const anonymizedAt = new Date();
            const anonymizedId = `anonymized_${Date.now()}`;

            // Anonimizza contenuto notifiche mantenendo struttura
            const result = await prisma.$transaction(async (tx) => {
                // Aggiorna notifiche con contenuto anonimizzato
                const updatedNotifications = await tx.notification.updateMany({
                    where: {
                        recipientId: personId,
                        tenantId,
                        deletedAt: null
                    },
                    data: {
                        title: '[ANONYMIZED]',
                        body: '[ANONYMIZED]',
                        metadata: JSON.stringify({ anonymized: true, anonymizedAt })
                    }
                });

                // Rimuovi device info dai logs
                await tx.notificationLog.updateMany({
                    where: {
                        notification: {
                            recipientId: personId,
                            tenantId
                        }
                    },
                    data: {
                        deviceInfo: null,
                        ipAddress: null
                    }
                });

                return { notifications: updatedNotifications.count };
            });

            // Log audit
            await this.createAuditLog({
                personId,
                tenantId,
                action: 'DATA_ANONYMIZED',
                resourceType: 'NOTIFICATION_DATA',
                details: {
                    anonymizedAt,
                    itemsAnonymized: result.notifications
                }
            });

            logger.info('Person notification data anonymized', {
                component: 'NotificationGdprService',
                action: 'anonymizePersonData',
                personId,
                tenantId,
                result
            });

            return {
                success: true,
                anonymizedAt,
                counts: result
            };

        } catch (error) {
            logger.error('Failed to anonymize person data', {
                component: 'NotificationGdprService',
                action: 'anonymizePersonData',
                error: error.message,
                personId,
                tenantId
            });
            throw error;
        }
    }
}

export default NotificationGdprService;
