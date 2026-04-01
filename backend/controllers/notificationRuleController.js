/**
 * NotificationRuleController.js
 * 
 * Controller per gestione regole di notifica.
 * API CRUD e funzionalità di test.
 * 
 * PROGETTO 47 - FASE 3: Rule Engine
 * 
 * @module controllers/notificationRuleController
 * @version 1.0.0
 */

import NotificationRuleService from '../services/notifications/NotificationRuleService.js';
import NotificationRuleEngine from '../services/notifications/NotificationRuleEngine.js';
import logger from '../utils/logger.js';

// ============================================
// NOTIFICATION RULE CONTROLLER
// ============================================

class NotificationRuleController {

    /**
     * Lista regole
     * GET /api/v1/notifications/rules
     */
    static async list(req, res) {
        try {
            const { tenantId } = req.person;
            const { page, limit, eventType, isActive, search, orderBy, orderDir } = req.query;

            const result = await NotificationRuleService.getAll(tenantId, {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                eventType,
                isActive: isActive !== undefined ? isActive === 'true' : undefined,
                search,
                orderBy,
                orderDir
            });

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to list notification rules', {
                component: 'NotificationRuleController',
                error: 'Errore interno del server',
                tenantId: req.person?.tenantId
            });
            res.status(500).json({
                success: false,
                message: 'Impossibile elencare le regole di notifica',
                error: 'Errore interno del server'
            });
        }
    }

    /**
     * Ottiene regola per ID
     * GET /api/v1/notifications/rules/:id
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const { tenantId } = req.person;

            const rule = await NotificationRuleService.getById(id, tenantId);

            if (!rule) {
                return res.status(404).json({
                    success: false,
                    message: 'Regola di notifica non trovata'
                });
            }

            res.json({
                success: true,
                data: rule
            });
        } catch (error) {
            logger.error('Failed to get notification rule', {
                component: 'NotificationRuleController',
                error: 'Errore interno del server',
                ruleId: req.params.id,
                tenantId: req.person?.tenantId
            });
            res.status(500).json({
                success: false,
                message: 'Impossibile recuperare la regola di notifica',
                error: 'Errore interno del server'
            });
        }
    }

    /**
     * Crea nuova regola
     * POST /api/v1/notifications/rules
     */
    static async create(req, res) {
        try {
            const { tenantId, id: createdById } = req.person;
            const data = req.body;

            const rule = await NotificationRuleService.create(data, tenantId, createdById);

            res.status(201).json({
                success: true,
                message: 'Regola di notifica creata con successo',
                data: rule
            });
        } catch (error) {
            logger.error('Failed to create notification rule', {
                component: 'NotificationRuleController',
                error: 'Errore interno del server',
                tenantId: req.person?.tenantId
            });

            // Errore di validazione
            if (error.message.includes('must be') || error.message.includes('invalid')) {
                return res.status(400).json({
                    success: false,
                    message: 'Errore di validazione',
                    error: 'Errore interno del server'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Impossibile creare la regola di notifica',
                error: 'Errore interno del server'
            });
        }
    }

    /**
     * Aggiorna regola
     * PUT /api/v1/notifications/rules/:id
     */
    static async update(req, res) {
        try {
            const { id } = req.params;
            const { tenantId } = req.person;
            const data = req.body;

            const rule = await NotificationRuleService.update(id, data, tenantId);

            res.json({
                success: true,
                message: 'Regola di notifica aggiornata con successo',
                data: rule
            });
        } catch (error) {
            logger.error('Failed to update notification rule', {
                component: 'NotificationRuleController',
                error: 'Errore interno del server',
                ruleId: req.params.id,
                tenantId: req.person?.tenantId
            });

            if (error.message === 'NotificationRule not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Regola di notifica non trovata'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Impossibile aggiornare la regola di notifica',
                error: 'Errore interno del server'
            });
        }
    }

    /**
     * Toggle stato attivo regola
     * PUT /api/v1/notifications/rules/:id/toggle
     */
    static async toggleActive(req, res) {
        try {
            const { id } = req.params;
            const { tenantId } = req.person;

            const rule = await NotificationRuleService.toggleActive(id, tenantId);

            res.json({
                success: true,
                message: `Regola ${rule.isActive ? 'attivata' : 'disattivata'} con successo`,
                data: rule
            });
        } catch (error) {
            logger.error('Failed to toggle notification rule', {
                component: 'NotificationRuleController',
                error: 'Errore interno del server',
                ruleId: req.params.id,
                tenantId: req.person?.tenantId
            });

            if (error.message === 'NotificationRule not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Regola di notifica non trovata'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Impossibile attivare/disattivare la regola di notifica',
                error: 'Errore interno del server'
            });
        }
    }

    /**
     * Elimina regola (soft delete)
     * DELETE /api/v1/notifications/rules/:id
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const { tenantId } = req.person;

            await NotificationRuleService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Regola di notifica eliminata con successo'
            });
        } catch (error) {
            logger.error('Failed to delete notification rule', {
                component: 'NotificationRuleController',
                error: 'Errore interno del server',
                ruleId: req.params.id,
                tenantId: req.person?.tenantId
            });

            if (error.message === 'NotificationRule not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Regola di notifica non trovata'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Impossibile eliminare la regola di notifica',
                error: 'Errore interno del server'
            });
        }
    }

    /**
     * Testa regola con payload di esempio
     * POST /api/v1/notifications/rules/:id/test
     */
    static async testRule(req, res) {
        try {
            const { id } = req.params;
            const { tenantId } = req.person;
            const testPayload = req.body;

            const result = await NotificationRuleService.testRule(id, testPayload, tenantId);

            res.json({
                success: result.success,
                ...result
            });
        } catch (error) {
            logger.error('Failed to test notification rule', {
                component: 'NotificationRuleController',
                error: 'Errore interno del server',
                ruleId: req.params.id,
                tenantId: req.person?.tenantId
            });
            res.status(500).json({
                success: false,
                message: 'Impossibile testare la regola di notifica',
                error: 'Errore interno del server'
            });
        }
    }

    /**
     * Lista tipi di eventi disponibili
     * GET /api/v1/notifications/rules/events
     */
    static async listEventTypes(req, res) {
        try {
            const eventTypes = NotificationRuleService.getAvailableEventTypes();

            // Raggruppa per categoria
            const grouped = eventTypes.reduce((acc, event) => {
                if (!acc[event.category]) {
                    acc[event.category] = [];
                }
                acc[event.category].push({
                    type: event.type,
                    description: event.description
                });
                return acc;
            }, {});

            res.json({
                success: true,
                data: {
                    eventTypes,
                    grouped
                }
            });
        } catch (error) {
            logger.error('Failed to list event types', {
                component: 'NotificationRuleController',
                error: 'Errore interno del server'
            });
            res.status(500).json({
                success: false,
                message: 'Impossibile elencare i tipi di evento',
                error: 'Errore interno del server'
            });
        }
    }

    /**
     * Statistiche Rule Engine
     * GET /api/v1/notifications/rules/stats
     */
    static async getStats(req, res) {
        try {
            const { tenantId } = req.person;

            const stats = await NotificationRuleEngine.getStats(tenantId);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Failed to get rule engine stats', {
                component: 'NotificationRuleController',
                error: 'Errore interno del server',
                tenantId: req.person?.tenantId
            });
            res.status(500).json({
                success: false,
                message: 'Impossibile recuperare le statistiche',
                error: 'Errore interno del server'
            });
        }
    }

    /**
     * Duplica regola esistente
     * POST /api/v1/notifications/rules/:id/duplicate
     */
    static async duplicate(req, res) {
        try {
            const { id } = req.params;
            const { tenantId, id: createdById } = req.person;

            // Ottieni regola originale
            const original = await NotificationRuleService.getById(id, tenantId);
            if (!original) {
                return res.status(404).json({
                    success: false,
                    message: 'Regola di notifica non trovata'
                });
            }

            // Crea copia
            const copyData = {
                name: `${original.name} (Copy)`,
                description: original.description,
                eventType: original.eventType,
                conditions: original.conditions,
                targetType: original.targetType,
                targetGroupId: original.targetGroupId,
                targetRoles: original.targetRoles,
                notificationType: original.notificationType,
                notificationCategory: original.notificationCategory,
                priority: original.priority,
                channels: original.channels,
                titleTemplate: original.titleTemplate,
                bodyTemplate: original.bodyTemplate,
                isDismissable: original.isDismissable,
                requiresConfirmation: original.requiresConfirmation,
                delayMinutes: original.delayMinutes,
                delayType: original.delayType,
                respectQuietHours: original.respectQuietHours,
                quietHoursStart: original.quietHoursStart,
                quietHoursEnd: original.quietHoursEnd,
                workingDaysOnly: original.workingDaysOnly,
                enableEscalation: original.enableEscalation,
                escalationMinutes: original.escalationMinutes,
                escalationTargetRoles: original.escalationTargetRoles,
                isActive: false // Duplicato inizia disattivato
            };

            const rule = await NotificationRuleService.create(copyData, tenantId, createdById);

            res.status(201).json({
                success: true,
                message: 'Regola di notifica duplicata con successo',
                data: rule
            });
        } catch (error) {
            logger.error('Failed to duplicate notification rule', {
                component: 'NotificationRuleController',
                error: 'Errore interno del server',
                ruleId: req.params.id,
                tenantId: req.person?.tenantId
            });
            res.status(500).json({
                success: false,
                message: 'Impossibile duplicare la regola di notifica',
                error: 'Errore interno del server'
            });
        }
    }
}

export default NotificationRuleController;
