/**
 * notificationEscalationController.js
 * 
 * Controller per gestione escalation notifiche.
 * Gestisce API per lista, risoluzione, configurazione e statistiche.
 * 
 * PROGETTO 47 - FASE 7: Escalation System
 * 
 * @module controllers/notificationEscalationController
 * @version 1.0.0
 */

import NotificationEscalationService from '../services/notifications/NotificationEscalationService.js';
import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';

// ============================================
// NOTIFICATION ESCALATION CONTROLLER
// ============================================

const notificationEscalationController = {

    // ============================================
    // ESCALATION LISTING
    // ============================================

    /**
     * GET /api/v1/notifications/escalations
     * Lista escalation con filtri
     */
    async list(req, res) {
        try {
            const { tenantId } = req.person;
            const {
                page = 1,
                limit = 20,
                status = 'all',
                level,
                from,
                to
            } = req.query;

            const result = await NotificationEscalationService.list(tenantId, {
                page: parseInt(page),
                limit: parseInt(limit),
                status,
                level: level ? parseInt(level) : null,
                from,
                to
            });

            res.json(result);
        } catch (error) {
            logger.error({
                error: 'Errore interno del server',
                personId: req.person?.id,
                component: 'notificationEscalationController'
            }, 'Error listing escalations');
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    /**
     * GET /api/v1/notifications/escalations/active
     * Lista escalation attive (non risolte)
     */
    async getActive(req, res) {
        try {
            const { tenantId } = req.person;
            const escalations = await NotificationEscalationService.getActive(tenantId);

            res.json({ escalations });
        } catch (error) {
            logger.error({
                error: 'Errore interno del server',
                personId: req.person?.id,
                component: 'notificationEscalationController'
            }, 'Error getting active escalations');
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    /**
     * GET /api/v1/notifications/escalations/:id
     * Dettaglio singola escalation
     */
    async getById(req, res) {
        try {
            const { tenantId } = req.person;
            const { id } = req.params;

            const escalation = await NotificationEscalationService.getById(id, tenantId);

            if (!escalation) {
                return res.status(404).json({ error: 'Escalation non trovata' });
            }

            res.json({ escalation });
        } catch (error) {
            logger.error({
                error: 'Errore interno del server',
                escalationId: req.params.id,
                component: 'notificationEscalationController'
            }, 'Error getting escalation');
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    // ============================================
    // ESCALATION ACTIONS
    // ============================================

    /**
     * PUT /api/v1/notifications/escalations/:id/resolve
     * Risolvi escalation manualmente
     */
    async resolve(req, res) {
        try {
            const { id: personId, tenantId } = req.person;
            const { id } = req.params;

            // Verifica che l'escalation appartenga al tenant
            const escalation = await NotificationEscalationService.getById(id, tenantId);

            if (!escalation) {
                return res.status(404).json({ error: 'Escalation non trovata' });
            }

            if (escalation.resolvedAt) {
                return res.status(400).json({ error: 'Escalation già risolta' });
            }

            await NotificationEscalationService.resolveById(id, personId);

            res.json({
                success: true,
                message: 'Escalation risolta con successo'
            });
        } catch (error) {
            logger.error({
                error: 'Errore interno del server',
                escalationId: req.params.id,
                personId: req.person?.id,
                component: 'notificationEscalationController'
            }, 'Error resolving escalation');
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    /**
     * POST /api/v1/notifications/:notificationId/escalate
     * Forza escalation manuale di una notifica
     */
    async forceEscalation(req, res) {
        try {
            const { id: personId, tenantId } = req.person;
            const { notificationId } = req.params;
            const { targetPersonIds, channels, message } = req.body;

            // Verifica che la notifica appartenga al tenant

            const notification = await prisma.notification.findFirst({
                where: {
                    id: notificationId,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!notification) {
                return res.status(404).json({ error: 'Notifica non trovata' });
            }

            if (notification.currentEscalationLevel >= 3) {
                return res.status(400).json({ error: 'Notifica già al livello massimo di escalation' });
            }

            const escalation = await NotificationEscalationService.forceEscalation(
                notificationId,
                personId,
                { targetPersonIds, channels, message }
            );

            res.json({
                success: true,
                escalation,
                message: 'Escalation forzata con successo'
            });
        } catch (error) {
            logger.error({
                error: 'Errore interno del server',
                notificationId: req.params.notificationId,
                personId: req.person?.id,
                component: 'notificationEscalationController'
            }, 'Error forcing escalation');
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    /**
     * POST /api/v1/notifications/escalations/process
     * Trigger manuale del processamento escalation (per admin)
     */
    async triggerProcessing(req, res) {
        try {
            const result = await NotificationEscalationService.processEscalations();

            res.json({
                success: true,
                processed: result.processed,
                errors: result.errors,
                message: 'Elaborazione escalation completata'
            });
        } catch (error) {
            logger.error({
                error: 'Errore interno del server',
                personId: req.person?.id,
                component: 'notificationEscalationController'
            }, 'Error triggering escalation processing');
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    // ============================================
    // STATISTICS
    // ============================================

    /**
     * GET /api/v1/notifications/escalations/stats
     * Statistiche escalation
     */
    async getStats(req, res) {
        try {
            const { tenantId } = req.person;
            const { from, to } = req.query;

            const stats = await NotificationEscalationService.getStats(tenantId, {
                from: from ? new Date(from) : undefined,
                to: to ? new Date(to) : undefined
            });

            res.json({ stats });
        } catch (error) {
            logger.error({
                error: 'Errore interno del server',
                personId: req.person?.id,
                component: 'notificationEscalationController'
            }, 'Error getting escalation stats');
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    /**
     * GET /api/v1/notifications/escalations/count
     * Conteggio escalation attive per livello
     */
    async getCountByLevel(req, res) {
        try {
            const { tenantId } = req.person;
            const counts = await NotificationEscalationService.countByLevel(tenantId);

            res.json({ counts });
        } catch (error) {
            logger.error({
                error: 'Errore interno del server',
                personId: req.person?.id,
                component: 'notificationEscalationController'
            }, 'Error getting escalation count');
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    // ============================================
    // CONFIGURATION
    // ============================================

    /**
     * GET /api/v1/notifications/escalations/config
     * Ottieni configurazione escalation per tutti i livelli
     */
    async getConfig(req, res) {
        try {
            const { tenantId } = req.person;
            const config = await NotificationEscalationService.getAllConfigs(tenantId);

            res.json({ config });
        } catch (error) {
            logger.error({
                error: 'Errore interno del server',
                personId: req.person?.id,
                component: 'notificationEscalationController'
            }, 'Error getting escalation config');
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    /**
     * PUT /api/v1/notifications/escalations/config/:level
     * Aggiorna configurazione per livello
     */
    async updateConfig(req, res) {
        try {
            const { tenantId } = req.person;
            const level = parseInt(req.params.level);

            if (isNaN(level) || level < 1 || level > 3) {
                return res.status(400).json({
                    error: 'Livello non valido. Deve essere 1, 2 o 3'
                });
            }

            const {
                delayMinutes,
                targetType,
                targetRole,
                targetPersonIds,
                additionalChannels,
                messageTemplate,
                isActive
            } = req.body;

            // Validazione targetType
            const validTargetTypes = ['SUPERVISOR', 'MANAGER', 'ADMIN', 'ROLE', 'PERSON'];
            if (targetType && !validTargetTypes.includes(targetType)) {
                return res.status(400).json({
                    error: `targetType non valido. Deve essere uno tra: ${validTargetTypes.join(', ')}`
                });
            }

            // Validazione channels
            const validChannels = ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH'];
            if (additionalChannels) {
                const invalidChannels = additionalChannels.filter(c => !validChannels.includes(c));
                if (invalidChannels.length > 0) {
                    return res.status(400).json({
                        error: `Canali non validi: ${invalidChannels.join(', ')}. Validi: ${validChannels.join(', ')}`
                    });
                }
            }

            const config = await NotificationEscalationService.upsertConfig(tenantId, level, {
                delayMinutes,
                targetType,
                targetRole,
                targetPersonIds,
                additionalChannels,
                messageTemplate,
                isActive
            });

            res.json({
                success: true,
                config,
                message: `Configurazione escalation per livello ${level} aggiornata`
            });
        } catch (error) {
            logger.error({
                error: 'Errore interno del server',
                level: req.params.level,
                personId: req.person?.id,
                component: 'notificationEscalationController'
            }, 'Error updating escalation config');
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    /**
     * DELETE /api/v1/notifications/escalations/config/:level
     * Reset configurazione a default
     */
    async resetConfig(req, res) {
        try {
            const { tenantId } = req.person;
            const level = req.params.level === 'all' ? null : parseInt(req.params.level);

            if (level !== null && (isNaN(level) || level < 1 || level > 3)) {
                return res.status(400).json({
                    error: 'Livello non valido. Deve essere 1, 2, 3 o "all"'
                });
            }

            await NotificationEscalationService.resetConfig(tenantId, level);

            res.json({
                success: true,
                message: level === null
                    ? 'Tutte le configurazioni escalation ripristinate ai valori predefiniti'
                    : `Configurazione escalation per livello ${level} ripristinata ai valori predefiniti`
            });
        } catch (error) {
            logger.error({
                error: 'Errore interno del server',
                level: req.params.level,
                personId: req.person?.id,
                component: 'notificationEscalationController'
            }, 'Error resetting escalation config');
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    /**
     * GET /api/v1/notifications/escalations/config/defaults
     * Ottieni configurazione default (senza personalizzazioni tenant)
     */
    async getDefaultConfig(req, res) {
        try {
            res.json({
                config: NotificationEscalationService.DEFAULT_ESCALATION_CONFIG
            });
        } catch (error) {
            logger.error({
                error: 'Errore interno del server',
                component: 'notificationEscalationController'
            }, 'Error getting default config');
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
};

export default notificationEscalationController;
