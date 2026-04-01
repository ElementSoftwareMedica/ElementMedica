/**
 * NotificationService
 * 
 * Service centrale per la gestione delle notifiche avanzate.
 * Gestisce creazione, delivery, tracking e analytics.
 * 
 * PROGETTO 47 - Advanced Notification System
 * 
 * @module services/notifications/NotificationService
 * @version 1.1.0 - Added cache integration
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import EmailService from '../emailService.js';
import SMSService from '../smsService.js';
import NotificationDeliveryService from './NotificationDeliveryService.js';
import { NotificationCacheService } from './NotificationCacheService.js';

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// ============================================
// NOTIFICATION SERVICE
// ============================================

class NotificationService {

    // ==========================================
    // CRUD OPERATIONS
    // ==========================================

    /**
     * Crea una nuova notifica
     * 
     * @param {Object} data - Dati notifica
     * @param {string} data.tenantId - Tenant ID (required)
     * @param {string} [data.recipientId] - ID destinatario singolo
     * @param {string} [data.groupId] - ID gruppo destinatari
     * @param {string} data.title - Titolo notifica
     * @param {string} data.body - Corpo notifica
     * @param {string} [data.shortBody] - Versione breve per SMS
     * @param {string} [data.type='INFO'] - Tipo notifica
     * @param {string} [data.category='SYSTEM'] - Categoria
     * @param {string} [data.priority='NORMAL'] - Priorità
     * @param {string[]} [data.channels=['IN_APP']] - Canali delivery
     * @param {Object} options - Opzioni aggiuntive
     * @returns {Promise<Object>} Notifica creata
     */
    static async create(data, options = {}) {
        const {
            tenantId,
            recipientId,
            groupId,
            title,
            body,
            shortBody,
            type = 'INFO',
            category = 'SYSTEM',
            priority = 'NORMAL',
            channels = ['IN_APP'],
            icon,
            iconColor,
            bgColor,
            isDismissable = true,
            requiresConfirmation = false,
            forcePopup = false,
            scheduledAt,
            expiresAt,
            entityType,
            entityId,
            actionUrl,
            actionLabel,
            triggeredBy,
            ruleId,
            metadata
        } = data;

        try {
            // Validazione base
            if (!tenantId) {
                throw new Error('tenantId is required');
            }
            if (!title || !body) {
                throw new Error('title and body are required');
            }
            if (!recipientId && !groupId) {
                throw new Error('Either recipientId or groupId is required');
            }

            // Verifica che recipientId appartenga al tenant (cross-tenant injection prevention)
            if (recipientId) {
                const recipientBelongsToTenant = await prisma.personTenantProfile.findFirst({
                    where: { personId: recipientId, tenantId, deletedAt: null }
                });
                if (!recipientBelongsToTenant) {
                    throw new Error('Recipient does not belong to this tenant');
                }
            }

            // Crea notifica nel database
            const notification = await prisma.notification.create({
                data: {
                    tenantId,
                    recipientId,
                    groupId,
                    title,
                    body,
                    shortBody: shortBody || body.substring(0, 160),
                    type,
                    category,
                    priority,
                    channels,
                    icon,
                    iconColor,
                    bgColor,
                    isDismissable: type === 'CRITICAL' ? false : isDismissable,
                    requiresConfirmation: type === 'CRITICAL' ? true : requiresConfirmation,
                    forcePopup: priority === 'URGENT' || priority === 'CRITICAL_P' ? true : forcePopup,
                    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                    expiresAt: expiresAt ? new Date(expiresAt) : null,
                    entityType,
                    entityId,
                    actionUrl,
                    actionLabel,
                    triggeredBy,
                    ruleId,
                    metadata
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
                    }
                }
            });

            logger.info('Notification created', {
                component: 'NotificationService',
                action: 'create',
                notificationId: notification.id,
                tenantId,
                type,
                category,
                priority,
                recipientId,
                groupId
            });

            // Invalidate cache for recipient
            if (recipientId) {
                await NotificationCacheService.incrementUnreadCount(recipientId, tenantId);
                await NotificationCacheService.invalidateRecentNotifications(recipientId, tenantId);
            }

            // Se non schedulata, invia subito
            if (!scheduledAt) {
                await this._deliverNotification(notification);
            }

            return notification;

        } catch (error) {
            logger.error('Failed to create notification', {
                component: 'NotificationService',
                action: 'create',
                error: error.message,
                tenantId,
                recipientId
            });
            throw error;
        }
    }

    /**
     * Invia notifica a persona specifica
     * 
     * @param {string} personId - ID destinatario
     * @param {Object} notification - Dati notifica
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Notifica creata e inviata
     */
    static async sendToPerson(personId, notification, tenantId) {
        return this.create({
            ...notification,
            recipientId: personId,
            tenantId
        });
    }

    /**
     * Invia notifica a gruppo
     * 
     * @param {string} groupId - ID gruppo
     * @param {Object} notification - Dati notifica
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Notifica creata
     */
    static async sendToGroup(groupId, notification, tenantId) {
        try {
            // Verifica che il gruppo esista e appartiene al tenant
            const group = await prisma.notificationGroup.findFirst({
                where: {
                    id: groupId,
                    tenantId,
                    deletedAt: null,
                    isActive: true
                },
                include: {
                    members: {
                        include: {
                            person: { select: { id: true } }
                        }
                    }
                }
            });

            if (!group) {
                throw new Error('Group not found or inactive');
            }

            // Crea notifica principale per il gruppo
            const mainNotification = await this.create({
                ...notification,
                groupId,
                tenantId
            });

            // Per gruppi statici, crea log per ogni membro
            if (group.type === 'STATIC') {
                const logPromises = group.members.map(member =>
                    this._createNotificationLog(mainNotification.id, member.personId, notification.channels || ['IN_APP'])
                );
                await Promise.all(logPromises);
            }

            logger.info('Notification sent to group', {
                component: 'NotificationService',
                action: 'sendToGroup',
                notificationId: mainNotification.id,
                groupId,
                memberCount: group.members.length
            });

            return mainNotification;

        } catch (error) {
            logger.error('Failed to send notification to group', {
                component: 'NotificationService',
                action: 'sendToGroup',
                error: error.message,
                groupId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Invia notifica broadcast a tutto il tenant
     * 
     * @param {Object} notification - Dati notifica
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Notifica creata
     */
    static async broadcast(notification, tenantId) {
        try {
            // Crea notifica senza recipientId (broadcast)
            const broadcastNotification = await prisma.notification.create({
                data: {
                    tenantId,
                    title: notification.title,
                    body: notification.body,
                    shortBody: notification.shortBody || notification.body.substring(0, 160),
                    type: notification.type || 'INFO',
                    category: notification.category || 'SYSTEM',
                    priority: notification.priority || 'NORMAL',
                    channels: notification.channels || ['IN_APP'],
                    icon: notification.icon,
                    iconColor: notification.iconColor,
                    isDismissable: notification.isDismissable !== false,
                    triggeredBy: notification.triggeredBy,
                    metadata: notification.metadata
                }
            });

            // P48: Ottieni tutti gli utenti attivi del tenant tramite tenantProfiles
            const tenantUsers = await prisma.person.findMany({
                where: {
                    deletedAt: null,
                    tenantProfiles: {
                        some: {
                            tenantId,
                            status: 'ACTIVE',
                            deletedAt: null
                        }
                    }
                },
                select: { id: true }
            });

            // Crea log per ogni utente
            const logPromises = tenantUsers.map(user =>
                this._createNotificationLog(broadcastNotification.id, user.id, notification.channels || ['IN_APP'])
            );
            await Promise.all(logPromises);

            logger.info('Broadcast notification sent', {
                component: 'NotificationService',
                action: 'broadcast',
                notificationId: broadcastNotification.id,
                tenantId,
                recipientCount: tenantUsers.length
            });

            return broadcastNotification;

        } catch (error) {
            logger.error('Failed to send broadcast notification', {
                component: 'NotificationService',
                action: 'broadcast',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    // ==========================================
    // QUERY OPERATIONS
    // ==========================================

    /**
     * Ottiene notifiche per persona con filtri
     * 
     * @param {string} personId - ID persona
     * @param {Object} filters - Filtri
     * @param {Object} pagination - Paginazione
     * @returns {Promise<Object>} Notifiche paginate
     */
    static async getByPerson(personId, filters = {}, pagination = {}) {
        const {
            status,
            types,
            categories,
            priority,
            since,
            until,
            unreadOnly = false
        } = filters;

        const {
            page = 1,
            limit = DEFAULT_PAGE_SIZE
        } = pagination;

        const take = Math.min(limit, MAX_PAGE_SIZE);
        const skip = (page - 1) * take;

        try {
            // P48/P63: Ottieni il tenant dell'utente dal profilo primario (Person.tenantId RIMOSSO)
            const person = await prisma.person.findFirst({ // F245: findFirst+deletedAt
                where: { id: personId, deletedAt: null },
                select: {
                    // P63: tenantId RIMOSSO da Person - usa PersonTenantProfile.tenantId
                    tenantProfiles: {
                        where: { deletedAt: null, isActive: true },
                        select: { tenantId: true, isPrimary: true },
                        orderBy: { isPrimary: 'desc' }
                    }
                }
            });

            if (!person) {
                throw new Error('Person not found');
            }

            // P63: tenantId SOLO da PersonTenantProfile (Person.tenantId RIMOSSO)
            const effectiveTenantId = person.tenantProfiles?.find(p => p.isPrimary)?.tenantId ||
                person.tenantProfiles?.[0]?.tenantId ||
                null;

            if (!effectiveTenantId) {
                throw new Error('Could not determine tenant for person');
            }

            // Costruisci where clause
            const where = {
                tenantId: effectiveTenantId,
                deletedAt: null,
                OR: [
                    { recipientId: personId },
                    { recipientId: null } // Broadcast
                ]
            };

            // Filtri opzionali
            if (types && types.length > 0) {
                where.type = { in: types };
            }
            if (categories && categories.length > 0) {
                where.category = { in: categories };
            }
            if (priority) {
                where.priority = priority;
            }
            if (since) {
                where.createdAt = { ...where.createdAt, gte: new Date(since) };
            }
            if (until) {
                where.createdAt = { ...where.createdAt, lte: new Date(until) };
            }

            // Filtro per stato lettura
            if (unreadOnly) {
                where.logs = {
                    none: {
                        recipientId: personId,
                        readAt: { not: null }
                    }
                };
            }

            // Query con conteggio
            const [notifications, total] = await Promise.all([
                prisma.notification.findMany({
                    where,
                    include: {
                        logs: {
                            where: { recipientId: personId },
                            select: {
                                status: true,
                                readAt: true,
                                dismissedAt: true,
                                actionTakenAt: true
                            }
                        }
                    },
                    orderBy: [
                        { priority: 'desc' },
                        { createdAt: 'desc' }
                    ],
                    skip,
                    take
                }),
                prisma.notification.count({ where })
            ]);

            // Arricchisci con stato lettura
            const enrichedNotifications = notifications.map(n => ({
                ...n,
                isRead: n.logs?.[0]?.readAt !== null,
                isDismissed: n.logs?.[0]?.dismissedAt !== null,
                actionTaken: n.logs?.[0]?.actionTakenAt !== null
            }));

            return {
                data: enrichedNotifications,
                pagination: {
                    page,
                    limit: take,
                    total,
                    totalPages: Math.ceil(total / take),
                    hasMore: skip + notifications.length < total
                }
            };

        } catch (error) {
            logger.error('Failed to get notifications for person', {
                component: 'NotificationService',
                action: 'getByPerson',
                error: error.message,
                personId
            });
            throw error;
        }
    }

    /**
     * Ottiene conteggio notifiche non lette
     * 
     * @param {string} personId - ID persona
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Conteggi
     */
    static async getUnreadCount(personId, tenantId) {
        try {
            // P61: Validate required parameters to prevent Prisma errors
            if (!personId || !tenantId) {
                logger.warn('getUnreadCount called with missing parameters', {
                    component: 'NotificationService',
                    action: 'getUnreadCount',
                    personId: personId || 'missing',
                    tenantId: tenantId || 'missing'
                });
                return {
                    total: 0,
                    direct: 0,
                    broadcast: 0,
                    critical: 0,
                    fromCache: false,
                    error: 'Missing required parameters'
                };
            }

            // Check cache first
            const cached = await NotificationCacheService.getUnreadCount(personId, tenantId);
            if (cached !== null) {
                return {
                    total: cached,
                    direct: cached, // Simplified for cache
                    broadcast: 0,
                    critical: 0,
                    fromCache: true
                };
            }

            // Notifiche dirette non lette
            const directUnread = await prisma.notification.count({
                where: {
                    tenantId,
                    recipientId: personId,
                    deletedAt: null,
                    logs: {
                        none: {
                            recipientId: personId,
                            readAt: { not: null }
                        }
                    }
                }
            });

            // Broadcast non letti
            const broadcastUnread = await prisma.notification.count({
                where: {
                    tenantId,
                    recipientId: null,
                    deletedAt: null,
                    logs: {
                        none: {
                            recipientId: personId,
                            readAt: { not: null }
                        }
                    }
                }
            });

            // Critici non letti
            const criticalUnread = await prisma.notification.count({
                where: {
                    tenantId,
                    OR: [
                        { recipientId: personId },
                        { recipientId: null }
                    ],
                    deletedAt: null,
                    type: 'CRITICAL',
                    logs: {
                        none: {
                            recipientId: personId,
                            readAt: { not: null }
                        }
                    }
                }
            });

            const total = directUnread + broadcastUnread;

            // Cache the total count
            await NotificationCacheService.setUnreadCount(personId, tenantId, total);

            return {
                total,
                direct: directUnread,
                broadcast: broadcastUnread,
                critical: criticalUnread,
                fromCache: false
            };

        } catch (error) {
            logger.error('Failed to get unread count', {
                component: 'NotificationService',
                action: 'getUnreadCount',
                error: error.message,
                personId
            });
            throw error;
        }
    }

    /**
     * Ottiene notifiche critiche non gestite
     * 
     * @param {string} personId - ID persona
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Notifiche critiche
     */
    static async getCriticalUnhandled(personId, tenantId) {
        try {
            // Guard: tenantId è obbligatorio per la query
            if (!tenantId) {
                logger.warn('[NotificationService] getCriticalUnhandled called with null tenantId', { personId });
                return [];
            }
            const criticalNotifications = await prisma.notification.findMany({
                where: {
                    tenantId,
                    OR: [
                        { recipientId: personId },
                        { recipientId: null }
                    ],
                    deletedAt: null,
                    type: 'CRITICAL',
                    requiresConfirmation: true,
                    logs: {
                        none: {
                            recipientId: personId,
                            OR: [
                                { readAt: { not: null } },
                                { actionTakenAt: { not: null } }
                            ]
                        }
                    }
                },
                orderBy: [
                    { priority: 'desc' },
                    { createdAt: 'desc' }
                ],
                take: 10
            });

            return criticalNotifications;

        } catch (error) {
            logger.error('Failed to get critical unhandled', {
                component: 'NotificationService',
                action: 'getCriticalUnhandled',
                error: error.message,
                personId
            });
            return [];
        }
    }

    /**
     * Ottiene notifica per ID
     * 
     * @param {string} notificationId - ID notifica
     * @param {string} personId - ID persona (per verifica accesso)
     * @returns {Promise<Object>} Notifica
     */
    static async getById(notificationId, personId) {
        try {
            const notification = await prisma.notification.findFirst({
                where: {
                    id: notificationId,
                    OR: [
                        { recipientId: personId },
                        { recipientId: null }
                    ],
                    deletedAt: null
                },
                include: {
                    logs: {
                        where: { recipientId: personId }
                    },
                    recipient: {
                        select: { id: true, firstName: true, lastName: true }
                    }
                }
            });

            if (!notification) {
                return null;
            }

            return {
                ...notification,
                isRead: notification.logs?.[0]?.readAt !== null,
                isDismissed: notification.logs?.[0]?.dismissedAt !== null
            };

        } catch (error) {
            logger.error('Failed to get notification by ID', {
                component: 'NotificationService',
                action: 'getById',
                error: error.message,
                notificationId
            });
            throw error;
        }
    }

    // ==========================================
    // STATUS OPERATIONS
    // ==========================================

    /**
     * Marca notifica come letta
     * 
     * @param {string} notificationId - ID notifica
     * @param {string} personId - ID persona
     * @returns {Promise<Object>} Log aggiornato
     */
    static async markAsRead(notificationId, personId, tenantId) {
        try {
            // Verifica che la notifica esista e appartenga al tenant del recipient
            const notification = await prisma.notification.findFirst({
                where: {
                    id: notificationId,
                    tenantId,
                    OR: [
                        { recipientId: personId },
                        { recipientId: null }
                    ],
                    deletedAt: null
                }
            });

            if (!notification) {
                throw new Error('Notification not found or not accessible');
            }

            // Aggiorna o crea log
            const log = await prisma.notificationLog.upsert({
                where: {
                    notificationId_recipientId_channel: {
                        notificationId,
                        recipientId: personId,
                        channel: 'IN_APP'
                    }
                },
                update: {
                    readAt: new Date(),
                    status: 'READ'
                },
                create: {
                    notificationId,
                    recipientId: personId,
                    channel: 'IN_APP',
                    status: 'READ',
                    readAt: new Date(),
                    sentAt: new Date(),
                    deliveredAt: new Date()
                }
            });

            // Invalidate cache
            await NotificationCacheService.decrementUnreadCount(personId, notification.tenantId);
            await NotificationCacheService.invalidateRecentNotifications(personId, notification.tenantId);

            logger.info('Notification marked as read', {
                component: 'NotificationService',
                action: 'markAsRead',
                notificationId,
                personId
            });

            return log;

        } catch (error) {
            logger.error('Failed to mark notification as read', {
                component: 'NotificationService',
                action: 'markAsRead',
                error: error.message,
                notificationId,
                personId
            });
            throw error;
        }
    }

    /**
     * Marca tutte le notifiche come lette
     * 
     * @param {string} personId - ID persona
     * @param {string} tenantId - Tenant ID
     * @param {Object} filters - Filtri opzionali (types, categories)
     * @returns {Promise<number>} Numero di notifiche aggiornate
     */
    static async markAllAsRead(personId, tenantId, filters = {}) {
        try {
            const where = {
                tenantId,
                OR: [
                    { recipientId: personId },
                    { recipientId: null }
                ],
                deletedAt: null
            };

            if (filters.types?.length > 0) {
                where.type = { in: filters.types };
            }
            if (filters.categories?.length > 0) {
                where.category = { in: filters.categories };
            }

            // Ottieni tutte le notifiche non lette
            const notifications = await prisma.notification.findMany({
                where,
                select: { id: true }
            });

            // Aggiorna/crea log per ciascuna
            const updatePromises = notifications.map(n =>
                prisma.notificationLog.upsert({
                    where: {
                        notificationId_recipientId_channel: {
                            notificationId: n.id,
                            recipientId: personId,
                            channel: 'IN_APP'
                        }
                    },
                    update: {
                        readAt: new Date(),
                        status: 'READ'
                    },
                    create: {
                        notificationId: n.id,
                        recipientId: personId,
                        channel: 'IN_APP',
                        status: 'READ',
                        readAt: new Date(),
                        sentAt: new Date()
                    }
                })
            );

            await Promise.all(updatePromises);

            logger.info('All notifications marked as read', {
                component: 'NotificationService',
                action: 'markAllAsRead',
                personId,
                count: notifications.length
            });

            return notifications.length;

        } catch (error) {
            logger.error('Failed to mark all as read', {
                component: 'NotificationService',
                action: 'markAllAsRead',
                error: error.message,
                personId
            });
            throw error;
        }
    }

    /**
     * Dismissare notifica (se dismissable)
     * 
     * @param {string} notificationId - ID notifica
     * @param {string} personId - ID persona
     * @returns {Promise<Object>} Log aggiornato
     */
    static async dismiss(notificationId, personId, tenantId) {
        try {
            // Verifica che la notifica sia dismissable e appartenga al tenant
            const notification = await prisma.notification.findFirst({
                where: {
                    id: notificationId,
                    tenantId,
                    OR: [
                        { recipientId: personId },
                        { recipientId: null }
                    ],
                    deletedAt: null
                }
            });

            if (!notification) {
                throw new Error('Notification not found');
            }

            if (!notification.isDismissable) {
                throw new Error('This notification cannot be dismissed');
            }

            // Per notifiche CRITICAL che richiedono conferma
            if (notification.requiresConfirmation) {
                throw new Error('This notification requires confirmation before dismissing');
            }

            const log = await prisma.notificationLog.upsert({
                where: {
                    notificationId_recipientId_channel: {
                        notificationId,
                        recipientId: personId,
                        channel: 'IN_APP'
                    }
                },
                update: {
                    dismissedAt: new Date(),
                    status: 'DISMISSED'
                },
                create: {
                    notificationId,
                    recipientId: personId,
                    channel: 'IN_APP',
                    status: 'DISMISSED',
                    dismissedAt: new Date(),
                    sentAt: new Date()
                }
            });

            logger.info('Notification dismissed', {
                component: 'NotificationService',
                action: 'dismiss',
                notificationId,
                personId
            });

            return log;

        } catch (error) {
            logger.error('Failed to dismiss notification', {
                component: 'NotificationService',
                action: 'dismiss',
                error: error.message,
                notificationId,
                personId
            });
            throw error;
        }
    }

    /**
     * Conferma ricezione (per notifiche che lo richiedono)
     * 
     * @param {string} notificationId - ID notifica
     * @param {string} personId - ID persona
     * @returns {Promise<Object>} Log aggiornato
     */
    static async confirmReceipt(notificationId, personId, tenantId) {
        try {
            const notification = await prisma.notification.findFirst({
                where: {
                    id: notificationId,
                    tenantId,
                    OR: [
                        { recipientId: personId },
                        { recipientId: null }
                    ],
                    deletedAt: null,
                    requiresConfirmation: true
                }
            });

            if (!notification) {
                throw new Error('Notification not found or does not require confirmation');
            }

            const log = await prisma.notificationLog.upsert({
                where: {
                    notificationId_recipientId_channel: {
                        notificationId,
                        recipientId: personId,
                        channel: 'IN_APP'
                    }
                },
                update: {
                    readAt: new Date(),
                    dismissedAt: new Date(),
                    status: 'DISMISSED'
                },
                create: {
                    notificationId,
                    recipientId: personId,
                    channel: 'IN_APP',
                    status: 'DISMISSED',
                    readAt: new Date(),
                    dismissedAt: new Date(),
                    sentAt: new Date()
                }
            });

            logger.info('Notification receipt confirmed', {
                component: 'NotificationService',
                action: 'confirmReceipt',
                notificationId,
                personId
            });

            return log;

        } catch (error) {
            logger.error('Failed to confirm notification receipt', {
                component: 'NotificationService',
                action: 'confirmReceipt',
                error: error.message,
                notificationId,
                personId
            });
            throw error;
        }
    }

    /**
     * Registra click su action
     * 
     * @param {string} notificationId - ID notifica
     * @param {string} personId - ID persona
     * @param {string} actionType - Tipo azione
     * @returns {Promise<Object>} Log aggiornato
     */
    static async trackAction(notificationId, personId, actionType = 'click') {
        try {
            const log = await prisma.notificationLog.upsert({
                where: {
                    notificationId_recipientId_channel: {
                        notificationId,
                        recipientId: personId,
                        channel: 'IN_APP'
                    }
                },
                update: {
                    actionTakenAt: new Date(),
                    status: 'ACTION_TAKEN',
                    readAt: new Date() // Marca anche come letta
                },
                create: {
                    notificationId,
                    recipientId: personId,
                    channel: 'IN_APP',
                    status: 'ACTION_TAKEN',
                    actionTakenAt: new Date(),
                    readAt: new Date(),
                    sentAt: new Date()
                }
            });

            logger.info('Notification action tracked', {
                component: 'NotificationService',
                action: 'trackAction',
                notificationId,
                personId,
                actionType
            });

            return log;

        } catch (error) {
            logger.error('Failed to track notification action', {
                component: 'NotificationService',
                action: 'trackAction',
                error: error.message,
                notificationId,
                personId
            });
            throw error;
        }
    }

    /**
     * Soft delete notifica (admin)
     * 
     * @param {string} notificationId - ID notifica
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Notifica eliminata
     */
    static async delete(notificationId, tenantId) {
        try {
            const notification = await prisma.notification.update({
                where: {
                    id: notificationId,
                    tenantId
                },
                data: {
                    deletedAt: new Date()
                }
            });

            logger.info('Notification deleted', {
                component: 'NotificationService',
                action: 'delete',
                notificationId,
                tenantId
            });

            return notification;

        } catch (error) {
            logger.error('Failed to delete notification', {
                component: 'NotificationService',
                action: 'delete',
                error: error.message,
                notificationId
            });
            throw error;
        }
    }

    // ==========================================
    // ANALYTICS
    // ==========================================

    /**
     * Statistiche generali notifiche
     * 
     * @param {string} tenantId - Tenant ID
     * @param {Object} dateRange - Range date
     * @returns {Promise<Object>} Statistiche
     */
    static async getStats(tenantId, dateRange = {}) {
        const { from, to } = dateRange;

        try {
            const where = {
                tenantId,
                deletedAt: null
            };

            if (from) where.createdAt = { gte: new Date(from) };
            if (to) where.createdAt = { ...where.createdAt, lte: new Date(to) };

            // Conteggi totali
            const [
                totalSent,
                byType,
                byCategory,
                byPriority,
                deliveryStats
            ] = await Promise.all([
                prisma.notification.count({ where }),
                prisma.notification.groupBy({
                    by: ['type'],
                    where,
                    _count: true
                }),
                prisma.notification.groupBy({
                    by: ['category'],
                    where,
                    _count: true
                }),
                prisma.notification.groupBy({
                    by: ['priority'],
                    where,
                    _count: true
                }),
                prisma.notificationLog.groupBy({
                    by: ['status'],
                    _count: true,
                    where: {
                        notification: where
                    }
                })
            ]);

            return {
                totalSent,
                byType: byType.reduce((acc, item) => {
                    acc[item.type] = item._count;
                    return acc;
                }, {}),
                byCategory: byCategory.reduce((acc, item) => {
                    acc[item.category] = item._count;
                    return acc;
                }, {}),
                byPriority: byPriority.reduce((acc, item) => {
                    acc[item.priority] = item._count;
                    return acc;
                }, {}),
                deliveryStats: deliveryStats.reduce((acc, item) => {
                    acc[item.status] = item._count;
                    return acc;
                }, {})
            };

        } catch (error) {
            logger.error('Failed to get notification stats', {
                component: 'NotificationService',
                action: 'getStats',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    // ==========================================
    // PRIVATE HELPER METHODS
    // ==========================================

    /**
     * Gestisce delivery della notifica su tutti i canali
     * Usa NotificationDeliveryService per multi-channel delivery
     * @private
     */
    static async _deliverNotification(notification) {
        try {
            // Carica recipient se non incluso
            let recipient = notification.recipient;
            if (!recipient && notification.recipientId) {
                recipient = await prisma.person.findFirst({ // F245: findFirst+deletedAt
                    where: { id: notification.recipientId, deletedAt: null }
                });
            }

            if (!recipient) {
                logger.warn('No recipient for notification delivery', {
                    component: 'NotificationService',
                    notificationId: notification.id
                });
                return;
            }

            // Usa il nuovo DeliveryService per multi-channel delivery
            const results = await NotificationDeliveryService.deliver(notification, recipient);

            logger.info('Notification delivered', {
                component: 'NotificationService',
                action: '_deliverNotification',
                notificationId: notification.id,
                channels: notification.channels,
                results: results.map(r => ({ channel: r.channel, status: r.status }))
            });

            return results;

        } catch (error) {
            logger.error('Failed to deliver notification', {
                component: 'NotificationService',
                action: '_deliverNotification',
                notificationId: notification.id,
                error: error.message
            });
            // Non rilanciamo l'errore per non bloccare il flusso
        }
    }

    /**
     * Delivery su singolo canale
     * @private
     */
    static async _deliverToChannel(notification, channel) {
        switch (channel) {
            case 'IN_APP':
                // IN_APP è sempre creato automaticamente
                if (notification.recipientId) {
                    await this._createNotificationLog(
                        notification.id,
                        notification.recipientId,
                        ['IN_APP']
                    );
                }
                // TODO: Emit WebSocket event
                break;

            case 'EMAIL':
                if (notification.recipient?.email) {
                    await this._sendEmail(notification);
                }
                break;

            case 'SMS':
                await this._sendSMS(notification);
                break;

            case 'WHATSAPP':
                await this._sendWhatsApp(notification);
                break;

            case 'PUSH':
                // TODO: Implementare push notifications
                logger.warn('Push notifications not yet implemented', {
                    component: 'NotificationService',
                    notificationId: notification.id
                });
                break;
        }
    }

    /**
     * Crea log di notifica
     * @private
     */
    static async _createNotificationLog(notificationId, recipientId, channels) {
        const logs = [];

        for (const channel of channels) {
            try {
                const log = await prisma.notificationLog.create({
                    data: {
                        notificationId,
                        recipientId,
                        channel,
                        status: 'PENDING',
                        sentAt: new Date()
                    }
                });
                logs.push(log);
            } catch (error) {
                // Se già esiste, ignora (unique constraint)
                if (!error.message.includes('Unique constraint')) {
                    throw error;
                }
            }
        }

        return logs;
    }

    /**
     * Invia email usando EmailService esistente
     * @private
     */
    static async _sendEmail(notification) {
        try {
            const recipient = await prisma.person.findFirst({ // F245: findFirst+deletedAt
                where: { id: notification.recipientId, deletedAt: null },
                select: {
                    firstName: true,
                    lastName: true,
                    tenantProfiles: {
                        where: { tenantId: notification.tenantId },
                        select: { email: true },
                        take: 1
                    }
                }
            });

            const recipientEmail = recipient?.tenantProfiles?.[0]?.email;
            if (!recipientEmail) {
                logger.warn('No email for notification recipient', {
                    component: 'NotificationService',
                    recipientId: notification.recipientId
                });
                return;
            }

            // Usa EmailService esistente
            await EmailService.queue({
                to: recipientEmail,
                template: 'NOTIFICA_GENERICA',
                data: {
                    title: notification.title,
                    body: notification.body,
                    actionUrl: notification.actionUrl,
                    actionLabel: notification.actionLabel || 'Vai alla notifica'
                },
                tenantId: notification.tenantId
            });

            // Aggiorna log
            await prisma.notificationLog.updateMany({
                where: {
                    notificationId: notification.id,
                    recipientId: notification.recipientId,
                    channel: 'EMAIL'
                },
                data: {
                    status: 'SENT',
                    sentAt: new Date()
                }
            });

        } catch (error) {
            logger.error('Failed to send email notification', {
                component: 'NotificationService',
                action: '_sendEmail',
                error: error.message,
                notificationId: notification.id
            });

            await prisma.notificationLog.updateMany({
                where: {
                    notificationId: notification.id,
                    recipientId: notification.recipientId,
                    channel: 'EMAIL'
                },
                data: {
                    status: 'FAILED',
                    failureReason: error.message
                }
            });
        }
    }

    /**
     * Invia SMS usando SMSService esistente
     * @private
     */
    static async _sendSMS(notification) {
        try {
            // P48: phone è in PersonTenantProfile, non su Person
            const recipient = await prisma.person.findFirst({ // F248: findFirst+deletedAt
                where: { id: notification.recipientId, deletedAt: null },
                select: {
                    firstName: true,
                    tenantProfiles: {
                        where: { tenantId: notification.tenantId, deletedAt: null },
                        select: { phone: true },
                        take: 1
                    }
                }
            });
            const recipientPhone = recipient?.tenantProfiles?.[0]?.phone;

            if (!recipientPhone) {
                logger.warn('No phone for notification recipient', {
                    component: 'NotificationService',
                    recipientId: notification.recipientId
                });
                return;
            }

            // Usa SMSService esistente
            await SMSService.sendSMS({
                to: recipientPhone,
                message: notification.shortBody || notification.body.substring(0, 160),
                tenantId: notification.tenantId
            });

            await prisma.notificationLog.updateMany({
                where: {
                    notificationId: notification.id,
                    recipientId: notification.recipientId,
                    channel: 'SMS'
                },
                data: {
                    status: 'SENT',
                    sentAt: new Date()
                }
            });

        } catch (error) {
            logger.error('Failed to send SMS notification', {
                component: 'NotificationService',
                action: '_sendSMS',
                error: error.message,
                notificationId: notification.id
            });

            await prisma.notificationLog.updateMany({
                where: {
                    notificationId: notification.id,
                    recipientId: notification.recipientId,
                    channel: 'SMS'
                },
                data: {
                    status: 'FAILED',
                    failureReason: error.message
                }
            });
        }
    }

    /**
     * Invia WhatsApp usando SMSService esistente
     * @private
     */
    static async _sendWhatsApp(notification) {
        try {
            // P48: phone è in PersonTenantProfile, non su Person
            const recipient = await prisma.person.findFirst({ // F248: findFirst+deletedAt
                where: { id: notification.recipientId, deletedAt: null },
                select: {
                    firstName: true,
                    tenantProfiles: {
                        where: { tenantId: notification.tenantId, deletedAt: null },
                        select: { phone: true },
                        take: 1
                    }
                }
            });
            const recipientPhone = recipient?.tenantProfiles?.[0]?.phone;

            if (!recipientPhone) {
                return;
            }

            // Usa SMSService.sendWhatsApp esistente
            await SMSService.sendWhatsApp({
                to: recipientPhone,
                message: notification.body,
                tenantId: notification.tenantId
            });

            await prisma.notificationLog.updateMany({
                where: {
                    notificationId: notification.id,
                    recipientId: notification.recipientId,
                    channel: 'WHATSAPP'
                },
                data: {
                    status: 'SENT',
                    sentAt: new Date()
                }
            });

        } catch (error) {
            logger.error('Failed to send WhatsApp notification', {
                component: 'NotificationService',
                action: '_sendWhatsApp',
                error: error.message,
                notificationId: notification.id
            });

            await prisma.notificationLog.updateMany({
                where: {
                    notificationId: notification.id,
                    recipientId: notification.recipientId,
                    channel: 'WHATSAPP'
                },
                data: {
                    status: 'FAILED',
                    failureReason: error.message
                }
            });
        }
    }
}

export default NotificationService;
