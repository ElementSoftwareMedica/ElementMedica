/**
 * NotificationRuleEngine.js
 * 
 * Motore di esecuzione regole che collega EventBus e NotificationService.
 * Ascolta eventi dal bus, valuta regole e genera notifiche.
 * 
 * PROGETTO 47 - FASE 3: Rule Engine
 * 
 * Features:
 * - Integrazione con EventBus
 * - Valutazione regole in parallelo
 * - Scheduling notifiche ritardate
 * - Gestione escalation
 * - Logging completo
 * 
 * @module services/notifications/NotificationRuleEngine
 * @version 1.0.0
 */

import { EventBus } from '../events/index.js';
import NotificationService from './NotificationService.js';
import NotificationRuleService from './NotificationRuleService.js';
import logger from '../../utils/logger.js';
import prisma from '../../config/prisma-optimization.js';

// ============================================
// NOTIFICATION RULE ENGINE
// ============================================

class NotificationRuleEngine {
    static isInitialized = false;
    static registeredEventTypes = new Set();

    /**
     * Inizializza il Rule Engine
     * Registra listener per eventi dal bus
     */
    static initialize() {
        if (this.isInitialized) {
            logger.warn('NotificationRuleEngine already initialized', {
                component: 'NotificationRuleEngine'
            });
            return;
        }

        // Registra listener globale per tutti gli eventi
        EventBus.subscribe('*', this.handleEvent.bind(this));

        this.isInitialized = true;

        logger.info('NotificationRuleEngine initialized', {
            component: 'NotificationRuleEngine',
            status: 'listening for all events'
        });
    }

    /**
     * Handler principale per eventi dal bus
     * @param {Object} event - Evento dal bus
     */
    static async handleEvent(event) {
        const startTime = Date.now();

        try {
            const { type, payload, metadata, tenantId } = event;

            // Skip eventi di notifica per evitare loop
            if (type.startsWith('notification.')) {
                return;
            }

            // Skip se manca tenantId
            if (!tenantId) {
                logger.debug('Event skipped - no tenantId', {
                    component: 'NotificationRuleEngine',
                    eventType: type
                });
                return;
            }

            // Trova regole matching
            const rules = await NotificationRuleService.findMatchingRules(type, tenantId);

            if (rules.length === 0) {
                logger.debug('No matching rules for event', {
                    component: 'NotificationRuleEngine',
                    eventType: type,
                    tenantId
                });
                return;
            }

            logger.debug('Processing event with rules', {
                component: 'NotificationRuleEngine',
                eventType: type,
                rulesCount: rules.length,
                tenantId
            });

            // Valuta e processa ogni regola
            const results = await Promise.allSettled(
                rules.map(rule => this.processRule(rule, event))
            );

            // Log risultati
            const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.fired).length;
            const skipped = results.filter(r => r.status === 'fulfilled' && !r.value.fired).length;
            const failed = results.filter(r => r.status === 'rejected').length;

            logger.info('Event processed by RuleEngine', {
                component: 'NotificationRuleEngine',
                eventType: type,
                rulesEvaluated: rules.length,
                notificationsFired: succeeded,
                rulesSkipped: skipped,
                rulesFailed: failed,
                durationMs: Date.now() - startTime,
                tenantId
            });

        } catch (error) {
            logger.error('Failed to process event in RuleEngine', {
                component: 'NotificationRuleEngine',
                error: error.message,
                eventType: event?.type,
                tenantId: event?.tenantId
            });
        }
    }

    /**
     * Processa singola regola per un evento
     * @param {Object} rule - Regola
     * @param {Object} event - Evento
     * @returns {Promise<Object>} Risultato processing
     */
    static async processRule(rule, event) {
        const result = {
            ruleId: rule.id,
            ruleName: rule.name,
            fired: false,
            scheduled: false,
            notificationId: null,
            error: null
        };

        try {
            // 1. Valuta condizioni
            const conditionsMet = NotificationRuleService.evaluateConditions(
                rule,
                event.payload,
                { event, timestamp: new Date() }
            );

            if (!conditionsMet) {
                logger.debug('Rule conditions not met', {
                    component: 'NotificationRuleEngine',
                    ruleId: rule.id,
                    eventType: event.type
                });
                return result;
            }

            // 2. Risolvi destinatari
            const targets = await NotificationRuleService.resolveTargets(
                rule,
                event.payload,
                event.tenantId
            );

            if (targets.length === 0) {
                logger.debug('No targets for rule', {
                    component: 'NotificationRuleEngine',
                    ruleId: rule.id,
                    eventType: event.type
                });
                return result;
            }

            // 3. Calcola tempo invio
            const sendTime = NotificationRuleService.calculateSendTime(rule);
            const isScheduled = NotificationRuleService.requiresScheduling(rule);

            // 4. Costruisci notifica
            const notificationConfig = NotificationRuleService.buildNotificationFromRule(rule, event);

            // 5. Crea/Schedula notifiche per ogni target
            for (const recipientId of targets) {
                const notificationData = {
                    ...notificationConfig,
                    tenantId: event.tenantId,
                    recipientId,
                    ruleId: rule.id,
                    triggeredBy: event.metadata?.triggeredBy
                };

                if (isScheduled) {
                    // Schedula per dopo
                    await this.scheduleNotification(notificationData, sendTime, rule);
                    result.scheduled = true;
                } else {
                    // Invia subito
                    const notification = await NotificationService.create(notificationData, {
                        sendImmediately: true
                    });
                    result.notificationId = notification.id;
                }
            }

            result.fired = true;
            result.targetsCount = targets.length;

            logger.info('Rule fired successfully', {
                component: 'NotificationRuleEngine',
                ruleId: rule.id,
                ruleName: rule.name,
                eventType: event.type,
                targetsCount: targets.length,
                isScheduled,
                tenantId: event.tenantId
            });

            // 6. Configura escalation se abilitata
            if (rule.escalationEnabled && rule.escalationDelay > 0) {
                await this.setupEscalation(rule, event, result.notificationId);
            }

        } catch (error) {
            result.error = error.message;
            logger.error('Failed to process rule', {
                component: 'NotificationRuleEngine',
                ruleId: rule.id,
                error: error.message,
                eventType: event.type
            });
        }

        return result;
    }

    /**
     * Schedula notifica per invio futuro
     * @param {Object} notificationData - Dati notifica
     * @param {Date} sendTime - Tempo invio
     * @param {Object} rule - Regola
     */
    static async scheduleNotification(notificationData, sendTime, rule) {
        try {
            // Crea notifica schedulata (scheduledAt indica che è programmata)
            const notification = await NotificationService.create({
                ...notificationData,
                scheduledAt: sendTime
            }, {
                sendImmediately: false
            });

            logger.info('Notification scheduled', {
                component: 'NotificationRuleEngine',
                notificationId: notification.id,
                ruleId: rule.id,
                scheduledAt: sendTime.toISOString(),
                tenantId: notificationData.tenantId
            });

            return notification;
        } catch (error) {
            logger.error('Failed to schedule notification', {
                component: 'NotificationRuleEngine',
                error: error.message,
                ruleId: rule.id
            });
            throw error;
        }
    }

    /**
     * Configura escalation per notifica
     * @param {Object} rule - Regola con escalation config
     * @param {Object} event - Evento originale
     * @param {string} notificationId - ID notifica originale
     */
    static async setupEscalation(rule, event, notificationId) {
        try {
            const escalationTime = new Date();
            escalationTime.setMinutes(escalationTime.getMinutes() + rule.escalationDelay);

            await prisma.notificationEscalation.create({
                data: {
                    notificationId,
                    tenantId: event.tenantId,
                    level: 1,
                    targetType: rule.escalationTarget ? 'ROLE' : 'ALL_ADMINS',
                    targetRole: rule.escalationTarget,
                    scheduledAt: escalationTime,
                    status: 'PENDING',
                    metadata: {
                        ruleId: rule.id,
                        eventType: event.type,
                        originalTargets: event.payload
                    }
                }
            });

            logger.info('Escalation configured', {
                component: 'NotificationRuleEngine',
                notificationId,
                ruleId: rule.id,
                escalationTime: escalationTime.toISOString(),
                tenantId: event.tenantId
            });
        } catch (error) {
            logger.error('Failed to setup escalation', {
                component: 'NotificationRuleEngine',
                error: error.message,
                notificationId,
                ruleId: rule.id
            });
        }
    }

    /**
     * Processa notifiche schedulate (chiamato da cron job)
     */
    static async processScheduledNotifications() {
        try {
            const now = new Date();

            // Trova notifiche schedulate da inviare (scheduledAt non null e nel passato)
            const scheduledNotifications = await prisma.notification.findMany({
                where: {
                    scheduledAt: {
                        not: null,
                        lte: now
                    },
                    deletedAt: null
                },
                take: 100 // Batch size
            });

            if (scheduledNotifications.length === 0) {
                return { processed: 0 };
            }

            logger.info('Processing scheduled notifications', {
                component: 'NotificationRuleEngine',
                count: scheduledNotifications.length
            });

            let processed = 0;
            let failed = 0;

            for (const notification of scheduledNotifications) {
                try {
                    // Aggiorna stato e invia
                    await prisma.notification.update({
                        where: { id: notification.id },
                        data: { status: 'PENDING' }
                    });

                    await NotificationService.deliver(notification.id, notification.tenantId);
                    processed++;
                } catch (error) {
                    failed++;
                    logger.error('Failed to process scheduled notification', {
                        component: 'NotificationRuleEngine',
                        notificationId: notification.id,
                        error: error.message
                    });
                }
            }

            logger.info('Scheduled notifications processed', {
                component: 'NotificationRuleEngine',
                processed,
                failed
            });

            return { processed, failed };
        } catch (error) {
            logger.error('Failed to process scheduled notifications', {
                component: 'NotificationRuleEngine',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Processa escalation pending (chiamato da cron job)
     */
    static async processEscalations() {
        try {
            const now = new Date();

            // Trova escalation da processare
            const pendingEscalations = await prisma.notificationEscalation.findMany({
                where: {
                    status: 'PENDING',
                    scheduledAt: { lte: now }
                },
                include: {
                    notification: {
                        include: {
                            logs: true // Include logs to check read/actionTaken status
                        }
                    }
                },
                take: 50
            });

            if (pendingEscalations.length === 0) {
                return { processed: 0 };
            }

            logger.info('Processing escalations', {
                component: 'NotificationRuleEngine',
                count: pendingEscalations.length
            });

            let processed = 0;

            for (const escalation of pendingEscalations) {
                try {
                    // Verifica se notifica originale è stata letta/confermata
                    // NOTE: status and actionTakenAt are on NotificationLog, not Notification
                    const hasReadLogs = escalation.notification.logs?.some(
                        log => log.readAt !== null || log.actionTakenAt !== null
                    );

                    if (hasReadLogs) {
                        // Notifica già gestita, cancella escalation
                        await prisma.notificationEscalation.update({
                            where: { id: escalation.id },
                            data: { status: 'CANCELLED' }
                        });
                        continue;
                    }

                    // Risolvi target escalation
                    const targets = await this.resolveEscalationTargets(escalation);

                    // Crea notifica escalation per ogni target
                    for (const recipientId of targets) {
                        await NotificationService.create({
                            tenantId: escalation.tenantId,
                            recipientId,
                            title: `[ESCALATION] ${escalation.notification.title}`,
                            body: `Notifica non gestita: ${escalation.notification.body}`,
                            type: 'ALERT',
                            category: 'ESCALATION',
                            priority: 'URGENT',
                            channels: ['IN_APP', 'EMAIL'],
                            forcePopup: true,
                            metadata: {
                                originalNotificationId: escalation.notificationId,
                                escalationId: escalation.id,
                                escalationLevel: escalation.level
                            }
                        }, { sendImmediately: true });
                    }

                    // Aggiorna stato escalation
                    await prisma.notificationEscalation.update({
                        where: { id: escalation.id },
                        data: {
                            status: 'TRIGGERED',
                            triggeredAt: now
                        }
                    });

                    processed++;

                    logger.info('Escalation triggered', {
                        component: 'NotificationRuleEngine',
                        escalationId: escalation.id,
                        notificationId: escalation.notificationId,
                        targetsCount: targets.length
                    });
                } catch (error) {
                    logger.error('Failed to process escalation', {
                        component: 'NotificationRuleEngine',
                        escalationId: escalation.id,
                        error: error.message
                    });
                }
            }

            return { processed };
        } catch (error) {
            logger.error('Failed to process escalations', {
                component: 'NotificationRuleEngine',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Risolve target per escalation
     * @param {Object} escalation - Record escalation
     * @returns {Promise<string[]>} Array personId
     */
    static async resolveEscalationTargets(escalation) {
        const targets = [];

        if (escalation.targetType === 'ROLE' && escalation.targetRole) {
            // P48: status è in tenantProfiles, non in Person
            const persons = await prisma.personRole.findMany({
                where: {
                    roleType: escalation.targetRole,
                    isActive: true,
                    tenantId: escalation.tenantId,
                    person: {
                        deletedAt: null,
                        tenantProfiles: {
                            some: {
                                tenantId: escalation.tenantId,
                                status: 'ACTIVE'
                            }
                        }
                    }
                },
                select: { personId: true }
            });
            targets.push(...persons.map(p => p.personId));
        } else {
            // Default: tutti gli admin
            // P48: status è in tenantProfiles, non in Person
            const admins = await prisma.personRole.findMany({
                where: {
                    roleType: { in: ['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN'] },
                    isActive: true,
                    tenantId: escalation.tenantId,
                    person: {
                        deletedAt: null,
                        tenantProfiles: {
                            some: {
                                tenantId: escalation.tenantId,
                                status: 'ACTIVE'
                            }
                        }
                    }
                },
                select: { personId: true }
            });
            targets.push(...admins.map(a => a.personId));
        }

        return [...new Set(targets)];
    }

    /**
     * Statistiche Rule Engine
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Statistiche
     */
    static async getStats(tenantId) {
        try {
            const [
                totalRules,
                activeRules,
                scheduledNotifications,
                pendingEscalations
            ] = await Promise.all([
                prisma.notificationRule.count({
                    where: { tenantId, deletedAt: null }
                }),
                prisma.notificationRule.count({
                    where: { tenantId, deletedAt: null, isActive: true }
                }),
                prisma.notification.count({
                    where: { tenantId, scheduledAt: { not: null, gt: new Date() }, deletedAt: null }
                }),
                prisma.notificationEscalation.count({
                    where: { tenantId, resolvedAt: null }
                })
            ]);

            return {
                rules: {
                    total: totalRules,
                    active: activeRules,
                    inactive: totalRules - activeRules
                },
                queue: {
                    scheduled: scheduledNotifications,
                    pendingEscalations
                },
                engine: {
                    isInitialized: this.isInitialized,
                    registeredEvents: this.registeredEventTypes.size
                }
            };
        } catch (error) {
            logger.error('Failed to get RuleEngine stats', {
                component: 'NotificationRuleEngine',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }
}

export default NotificationRuleEngine;
