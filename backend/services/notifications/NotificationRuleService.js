/**
 * NotificationRuleService.js
 * 
 * Rule Engine per notifiche configurabili.
 * Gestisce regole, condizioni, timing e template processing.
 * 
 * PROGETTO 47 - FASE 3: Rule Engine
 * 
 * Features:
 * - CRUD regole complete
 * - Valutazione condizioni (AND/OR/NOT)
 * - Operatori di confronto avanzati
 * - Delay configurabile (minuti, ore, giorni)
 * - Quiet hours e giorni lavorativi
 * - Template con variabili dinamiche
 * - Cache per performance
 * 
 * @module services/notifications/NotificationRuleService
 * @version 1.0.0
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

// ============================================
// CACHE (In-memory per semplicità, sostituire con Redis in prod)
// ============================================

const ruleCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minuti

// ============================================
// NOTIFICATION RULE SERVICE
// ============================================

class NotificationRuleService {

    // ==========================================
    // CRUD OPERATIONS
    // ==========================================

    /**
     * Crea una nuova regola
     * @param {Object} data - Dati regola
     * @param {string} tenantId - Tenant ID
     * @param {string} createdById - ID dell'utente che crea la regola
     * @returns {Promise<Object>} Regola creata
     */
    static async create(data, tenantId, createdById) {
        try {
            // Valida condizioni se presenti
            if (data.conditions) {
                this.validateConditions(data.conditions);
            }

            const rule = await prisma.notificationRule.create({
                data: {
                    tenantId,
                    createdById,
                    name: data.name,
                    description: data.description,
                    eventType: data.eventType,
                    conditions: data.conditions || {},
                    // DELAY
                    delayMinutes: data.delayMinutes || 0,
                    delayType: data.delayType || 'IMMEDIATE',
                    // QUIET HOURS
                    respectQuietHours: data.respectQuietHours !== false,
                    quietHoursStart: data.quietHoursStart,
                    quietHoursEnd: data.quietHoursEnd,
                    workingDaysOnly: data.workingDaysOnly || false,
                    // TARGET
                    targetType: data.targetType || 'ENTITY_OWNER',
                    targetGroupId: data.targetGroupId,
                    targetRoles: data.targetRoles || [],
                    // NOTIFICA
                    notificationType: data.notificationType || 'INFO',
                    notificationCategory: data.notificationCategory || 'SYSTEM',
                    priority: data.priority || 'NORMAL',
                    channels: data.channels || ['IN_APP'],
                    // TEMPLATE
                    titleTemplate: data.titleTemplate,
                    bodyTemplate: data.bodyTemplate,
                    // COMPORTAMENTO
                    isDismissable: data.isDismissable !== false,
                    requiresConfirmation: data.requiresConfirmation || false,
                    // ESCALATION
                    enableEscalation: data.enableEscalation || false,
                    escalationMinutes: data.escalationMinutes,
                    escalationTargetRoles: data.escalationTargetRoles || [],
                    // STATO
                    isActive: data.isActive !== false
                }
            });

            // Invalida cache
            await this.invalidateCache(tenantId);

            logger.info('NotificationRule created', {
                component: 'NotificationRuleService',
                ruleId: rule.id,
                name: rule.name,
                eventType: rule.eventType,
                tenantId
            });

            return rule;
        } catch (error) {
            logger.error('Failed to create NotificationRule', {
                component: 'NotificationRuleService',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Aggiorna una regola esistente
     * @param {string} id - Rule ID
     * @param {Object} data - Dati aggiornamento
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Regola aggiornata
     */
    static async update(id, data, tenantId) {
        try {
            // Verifica esistenza
            const existing = await prisma.notificationRule.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('NotificationRule not found');
            }

            // Valida condizioni se aggiornate
            if (data.conditions) {
                this.validateConditions(data.conditions);
            }

            const rule = await prisma.notificationRule.update({
                where: { id },
                data: {
                    ...data,
                    updatedAt: new Date()
                }
            });

            // Invalida cache
            await this.invalidateCache(tenantId);

            logger.info('NotificationRule updated', {
                component: 'NotificationRuleService',
                ruleId: id,
                tenantId
            });

            return rule;
        } catch (error) {
            logger.error('Failed to update NotificationRule', {
                component: 'NotificationRuleService',
                error: error.message,
                ruleId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Ottiene regola per ID
     * @param {string} id - Rule ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object|null>} Regola o null
     */
    static async getById(id, tenantId) {
        try {
            const rule = await prisma.notificationRule.findFirst({
                where: { id, tenantId, deletedAt: null },
                include: {
                    targetGroup: true,
                    createdBy: {
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

            // Flatten createdBy.email from tenantProfiles
            if (rule?.createdBy) {
                rule.createdBy = {
                    ...rule.createdBy,
                    email: rule.createdBy.tenantProfiles?.[0]?.email,
                    tenantProfiles: undefined
                };
            }

            return rule;
        } catch (error) {
            logger.error('Failed to get NotificationRule', {
                component: 'NotificationRuleService',
                error: error.message,
                ruleId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Lista regole con filtri
     * @param {string} tenantId - Tenant ID
     * @param {Object} filters - Filtri
     * @returns {Promise<Object>} Lista paginata
     */
    static async getAll(tenantId, filters = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                eventType,
                isActive,
                search,
                orderBy = 'priority',
                orderDir = 'desc'
            } = filters;

            const skip = (page - 1) * limit;

            const where = {
                tenantId,
                deletedAt: null,
                ...(eventType && { eventType }),
                ...(isActive !== undefined && { isActive }),
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } }
                    ]
                })
            };

            const [rules, total] = await Promise.all([
                prisma.notificationRule.findMany({
                    where,
                    include: {
                        targetGroup: {
                            select: { id: true, name: true }
                        },
                        createdBy: {
                            select: { id: true, firstName: true, lastName: true }
                        }
                    },
                    orderBy: { [orderBy]: orderDir },
                    skip,
                    take: limit
                }),
                prisma.notificationRule.count({ where })
            ]);

            return {
                data: rules,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Failed to list NotificationRules', {
                component: 'NotificationRuleService',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Toggle stato attivo regola
     * @param {string} id - Rule ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Regola aggiornata
     */
    static async toggleActive(id, tenantId) {
        try {
            const existing = await prisma.notificationRule.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('NotificationRule not found');
            }

            const rule = await prisma.notificationRule.update({
                where: { id },
                data: {
                    isActive: !existing.isActive,
                    updatedAt: new Date()
                }
            });

            await this.invalidateCache(tenantId);

            logger.info('NotificationRule toggled', {
                component: 'NotificationRuleService',
                ruleId: id,
                isActive: rule.isActive,
                tenantId
            });

            return rule;
        } catch (error) {
            logger.error('Failed to toggle NotificationRule', {
                component: 'NotificationRuleService',
                error: error.message,
                ruleId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete regola
     * @param {string} id - Rule ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Risultato
     */
    static async delete(id, tenantId) {
        try {
            const existing = await prisma.notificationRule.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('NotificationRule not found');
            }

            await prisma.notificationRule.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            await this.invalidateCache(tenantId);

            logger.info('NotificationRule deleted', {
                component: 'NotificationRuleService',
                ruleId: id,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('Failed to delete NotificationRule', {
                component: 'NotificationRuleService',
                error: error.message,
                ruleId: id,
                tenantId
            });
            throw error;
        }
    }

    // ==========================================
    // RULE MATCHING
    // ==========================================

    /**
     * Trova regole che matchano un tipo di evento
     * @param {string} eventType - Tipo evento
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Regole matching
     */
    static async findMatchingRules(eventType, tenantId) {
        try {
            // Check cache
            const cacheKey = `rules:${tenantId}:${eventType}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }

            const rules = await prisma.notificationRule.findMany({
                where: {
                    tenantId,
                    eventType,
                    isActive: true,
                    deletedAt: null
                },
                include: {
                    targetGroup: true
                },
                orderBy: { priority: 'desc' }
            });

            // Cache per 5 minuti
            this.setCache(cacheKey, rules);

            return rules;
        } catch (error) {
            logger.error('Failed to find matching rules', {
                component: 'NotificationRuleService',
                error: error.message,
                eventType,
                tenantId
            });
            return [];
        }
    }

    // ==========================================
    // CONDITION EVALUATION
    // ==========================================

    /**
     * Valuta le condizioni di una regola
     * @param {Object} rule - Regola
     * @param {Object} payload - Dati evento
     * @param {Object} context - Contesto aggiuntivo
     * @returns {boolean} True se condizioni soddisfatte
     */
    static evaluateConditions(rule, payload, context = {}) {
        // Nessuna condizione = sempre true
        if (!rule.conditions || Object.keys(rule.conditions).length === 0) {
            return true;
        }

        try {
            return this.evaluateNode(rule.conditions, payload, context);
        } catch (error) {
            logger.error('Condition evaluation failed', {
                component: 'NotificationRuleService',
                error: error.message,
                ruleId: rule.id
            });
            return false;
        }
    }

    /**
     * Valuta nodo condizione ricorsivamente
     * Supporta AND, OR, NOT e operatori di confronto
     * @param {Object} node - Nodo condizione
     * @param {Object} payload - Dati
     * @param {Object} context - Contesto
     * @returns {boolean} Risultato valutazione
     */
    static evaluateNode(node, payload, context) {
        // Operatore AND
        if (node.and && Array.isArray(node.and)) {
            return node.and.every(child => this.evaluateNode(child, payload, context));
        }

        // Operatore OR
        if (node.or && Array.isArray(node.or)) {
            return node.or.some(child => this.evaluateNode(child, payload, context));
        }

        // Operatore NOT
        if (node.not) {
            return !this.evaluateNode(node.not, payload, context);
        }

        // Condizione semplice
        if (node.field && node.operator) {
            return this.evaluateComparison(node, payload, context);
        }

        // Nodo vuoto = true
        return true;
    }

    /**
     * Valuta confronto singolo
     * @param {Object} condition - Condizione {field, operator, value}
     * @param {Object} payload - Dati
     * @param {Object} context - Contesto
     * @returns {boolean} Risultato confronto
     */
    static evaluateComparison(condition, payload, context) {
        const { field, operator, value } = condition;

        // Ottieni valore dal payload o context
        const source = field.startsWith('context.') ? context : payload;
        const fieldPath = field.replace('context.', '');
        const actualValue = this.getNestedValue(source, fieldPath);

        switch (operator) {
            // Uguaglianza
            case 'eq':
            case 'equals':
                return actualValue === value;

            case 'neq':
            case 'not_equals':
                return actualValue !== value;

            // Confronto numerico
            case 'gt':
            case 'greater_than':
                return Number(actualValue) > Number(value);

            case 'gte':
            case 'greater_than_or_equals':
                return Number(actualValue) >= Number(value);

            case 'lt':
            case 'less_than':
                return Number(actualValue) < Number(value);

            case 'lte':
            case 'less_than_or_equals':
                return Number(actualValue) <= Number(value);

            // Stringhe
            case 'contains':
                return String(actualValue || '').toLowerCase().includes(String(value).toLowerCase());

            case 'not_contains':
                return !String(actualValue || '').toLowerCase().includes(String(value).toLowerCase());

            case 'starts_with':
                return String(actualValue || '').toLowerCase().startsWith(String(value).toLowerCase());

            case 'ends_with':
                return String(actualValue || '').toLowerCase().endsWith(String(value).toLowerCase());

            case 'regex':
                try {
                    return new RegExp(value, 'i').test(String(actualValue || ''));
                } catch {
                    return false;
                }

            // Array
            case 'in':
                return Array.isArray(value) && value.includes(actualValue);

            case 'not_in':
                return Array.isArray(value) && !value.includes(actualValue);

            // Null checks
            case 'is_null':
            case 'is_empty':
                return actualValue === null || actualValue === undefined || actualValue === '';

            case 'is_not_null':
            case 'is_not_empty':
                return actualValue !== null && actualValue !== undefined && actualValue !== '';

            // Range
            case 'between':
                if (Array.isArray(value) && value.length === 2) {
                    const num = Number(actualValue);
                    return num >= Number(value[0]) && num <= Number(value[1]);
                }
                return false;

            // Array contains
            case 'array_contains':
                return Array.isArray(actualValue) && actualValue.includes(value);

            case 'array_not_contains':
                return Array.isArray(actualValue) && !actualValue.includes(value);

            // Date comparisons
            case 'date_before':
                return new Date(actualValue) < new Date(value);

            case 'date_after':
                return new Date(actualValue) > new Date(value);

            case 'date_equals':
                return new Date(actualValue).toDateString() === new Date(value).toDateString();

            default:
                logger.warn('Unknown condition operator', {
                    component: 'NotificationRuleService',
                    operator
                });
                return false;
        }
    }

    /**
     * Ottiene valore nested da oggetto
     * Supporta dot notation: 'patient.address.city'
     * @param {Object} obj - Oggetto sorgente
     * @param {string} path - Path con dot notation
     * @returns {*} Valore trovato o undefined
     */
    static getNestedValue(obj, path) {
        if (!obj || !path) return undefined;

        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    // ==========================================
    // TIMING & SCHEDULING
    // ==========================================

    /**
     * Calcola quando inviare la notifica
     * Considera delay, quiet hours, working days
     * @param {Object} rule - Regola
     * @param {Date} baseTime - Tempo base (default: now)
     * @returns {Date} Tempo invio calcolato
     */
    static calculateSendTime(rule, baseTime = new Date()) {
        let sendTime = new Date(baseTime);

        // Applica delay
        if (rule.delayValue > 0) {
            switch (rule.delayType) {
                case 'MINUTES':
                    sendTime.setMinutes(sendTime.getMinutes() + rule.delayValue);
                    break;
                case 'HOURS':
                    sendTime.setHours(sendTime.getHours() + rule.delayValue);
                    break;
                case 'DAYS':
                    sendTime.setDate(sendTime.getDate() + rule.delayValue);
                    break;
                case 'WEEKS':
                    sendTime.setDate(sendTime.getDate() + (rule.delayValue * 7));
                    break;
                case 'IMMEDIATE':
                default:
                    // Nessun delay
                    break;
            }
        }

        // Applica quiet hours
        if (rule.quietHoursStart && rule.quietHoursEnd) {
            sendTime = this.adjustForQuietHours(sendTime, rule.quietHoursStart, rule.quietHoursEnd);
        }

        // Applica working days only
        if (rule.workingDaysOnly) {
            sendTime = this.adjustForWorkingDays(sendTime);
        }

        return sendTime;
    }

    /**
     * Aggiusta orario per quiet hours
     * @param {Date} time - Tempo originale
     * @param {string} quietStart - Inizio quiet hours (HH:MM)
     * @param {string} quietEnd - Fine quiet hours (HH:MM)
     * @returns {Date} Tempo aggiustato
     */
    static adjustForQuietHours(time, quietStart, quietEnd) {
        const hour = time.getHours();
        const minutes = time.getMinutes();
        const currentTimeMinutes = hour * 60 + minutes;

        const [startHour, startMin] = quietStart.split(':').map(Number);
        const [endHour, endMin] = quietEnd.split(':').map(Number);
        const quietStartMinutes = startHour * 60 + startMin;
        const quietEndMinutes = endHour * 60 + endMin;

        // Quiet hours normale (es. 22:00 - 08:00)
        if (quietStartMinutes > quietEndMinutes) {
            // Attraversa mezzanotte
            if (currentTimeMinutes >= quietStartMinutes || currentTimeMinutes < quietEndMinutes) {
                time.setHours(endHour, endMin, 0, 0);
                if (currentTimeMinutes >= quietStartMinutes) {
                    time.setDate(time.getDate() + 1);
                }
            }
        } else {
            // Non attraversa mezzanotte (es. 12:00 - 14:00)
            if (currentTimeMinutes >= quietStartMinutes && currentTimeMinutes < quietEndMinutes) {
                time.setHours(endHour, endMin, 0, 0);
            }
        }

        return time;
    }

    /**
     * Aggiusta per giorni lavorativi (salta weekend)
     * @param {Date} time - Tempo originale
     * @returns {Date} Tempo aggiustato
     */
    static adjustForWorkingDays(time) {
        const day = time.getDay();

        // 0 = Domenica, 6 = Sabato
        if (day === 0) {
            // Domenica -> Lunedì
            time.setDate(time.getDate() + 1);
        } else if (day === 6) {
            // Sabato -> Lunedì
            time.setDate(time.getDate() + 2);
        }

        return time;
    }

    /**
     * Verifica se la notifica è schedulata per dopo
     * @param {Object} rule - Regola
     * @returns {boolean} True se richiede scheduling
     */
    static requiresScheduling(rule) {
        return rule.delayType !== 'IMMEDIATE' && rule.delayValue > 0;
    }

    // ==========================================
    // TEMPLATE PROCESSING
    // ==========================================

    /**
     * Processa template con variabili
     * Sostituisce {{variabile}} con valori
     * @param {string} template - Template stringa
     * @param {Object} variables - Variabili da sostituire
     * @returns {string} Template processato
     */
    static processTemplate(template, variables) {
        if (!template) return '';

        return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
            const value = this.getNestedValue(variables, path);

            // Formatta date
            if (value instanceof Date) {
                return value.toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            return value !== undefined && value !== null ? String(value) : match;
        });
    }

    /**
     * Costruisce configurazione notifica da regola ed evento
     * @param {Object} rule - Regola
     * @param {Object} event - Evento domain
     * @returns {Object} Configurazione notifica
     */
    static buildNotificationFromRule(rule, event) {
        const variables = {
            ...event.payload,
            event: event,
            timestamp: new Date().toISOString(),
            formattedDate: new Date().toLocaleDateString('it-IT')
        };

        // Usa template se disponibile, altrimenti notificationConfig
        const template = rule.template;
        const config = rule.notificationConfig || {};

        const title = template
            ? this.processTemplate(template.titleTemplate, variables)
            : this.processTemplate(config.title || '', variables);

        const body = template
            ? this.processTemplate(template.bodyTemplate, variables)
            : this.processTemplate(config.body || '', variables);

        return {
            title,
            body,
            shortBody: template
                ? this.processTemplate(template.shortBodyTemplate, variables)
                : body.substring(0, 160),
            type: config.type || 'INFO',
            category: config.category || 'SYSTEM',
            priority: this.mapPriorityToEnum(rule.priority),
            channels: rule.channels || ['IN_APP'],
            entityType: event.aggregateType,
            entityId: event.aggregateId,
            actionUrl: config.actionUrl
                ? this.processTemplate(config.actionUrl, variables)
                : null,
            actionLabel: config.actionLabel,
            icon: config.icon || template?.iconName,
            iconColor: config.color || template?.defaultColor,
            isDismissable: config.isDismissable !== false,
            requiresConfirmation: config.requireConfirmation || false,
            forcePopup: config.forcePopup || rule.priority >= 8,
            metadata: {
                ruleId: rule.id,
                ruleName: rule.name,
                eventId: event.id,
                eventType: event.type
            }
        };
    }

    /**
     * Mappa priorità numerica a enum
     * @param {number} priority - Priorità (1-10)
     * @returns {string} Enum priorità
     */
    static mapPriorityToEnum(priority) {
        if (priority >= 9) return 'CRITICAL';
        if (priority >= 7) return 'URGENT';
        if (priority >= 5) return 'HIGH';
        if (priority >= 3) return 'NORMAL';
        return 'LOW';
    }

    // ==========================================
    // TARGETING
    // ==========================================

    /**
     * Risolve i destinatari della notifica
     * @param {Object} rule - Regola
     * @param {Object} payload - Payload evento
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<string[]>} Array di personId
     */
    static async resolveTargets(rule, payload, tenantId) {
        const targets = [];

        switch (rule.targetType) {
            case 'EVENT_FIELD':
                // Prendi ID dal campo specificato nel payload
                const fieldValue = this.getNestedValue(payload, rule.targetField);
                if (fieldValue) {
                    if (Array.isArray(fieldValue)) {
                        targets.push(...fieldValue);
                    } else {
                        targets.push(fieldValue);
                    }
                }
                break;

            case 'GROUP':
                // Prendi membri del gruppo
                if (rule.targetGroupId) {
                    const members = await prisma.notificationGroupMember.findMany({
                        where: {
                            groupId: rule.targetGroupId
                        },
                        select: { personId: true }
                    });
                    targets.push(...members.map(m => m.personId));
                }
                break;

            case 'ROLE':
                // P48: Prendi persone con ruolo specifico, status in tenantProfiles
                if (rule.targetRole) {
                    const persons = await prisma.personRole.findMany({
                        where: {
                            roleType: rule.targetRole,
                            isActive: true,
                            person: {
                                deletedAt: null,
                                tenantProfiles: {
                                    some: {
                                        tenantId,
                                        status: 'ACTIVE',
                                        deletedAt: null
                                    }
                                }
                            }
                        },
                        select: { personId: true }
                    });
                    targets.push(...persons.map(p => p.personId));
                }
                break;

            case 'ALL_ADMINS':
                // P48: Tutti gli admin del tenant, status in tenantProfiles
                const admins = await prisma.personRole.findMany({
                    where: {
                        roleType: { in: ['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN'] },
                        isActive: true,
                        person: {
                            deletedAt: null,
                            tenantProfiles: {
                                some: {
                                    tenantId,
                                    status: 'ACTIVE',
                                    deletedAt: null
                                }
                            }
                        }
                    },
                    select: { personId: true }
                });
                targets.push(...admins.map(a => a.personId));
                break;

            default:
                logger.warn('Unknown target type', {
                    component: 'NotificationRuleService',
                    targetType: rule.targetType
                });
        }

        // Rimuovi duplicati
        return [...new Set(targets)];
    }

    // ==========================================
    // VALIDATION
    // ==========================================

    /**
     * Valida struttura condizioni
     * @param {Object} conditions - Condizioni da validare
     * @throws {Error} Se condizioni invalide
     */
    static validateConditions(conditions) {
        if (!conditions || typeof conditions !== 'object') {
            throw new Error('Conditions must be an object');
        }

        const validateNode = (node, path = 'root') => {
            if (node.and) {
                if (!Array.isArray(node.and)) {
                    throw new Error(`${path}.and must be an array`);
                }
                node.and.forEach((child, i) => validateNode(child, `${path}.and[${i}]`));
            } else if (node.or) {
                if (!Array.isArray(node.or)) {
                    throw new Error(`${path}.or must be an array`);
                }
                node.or.forEach((child, i) => validateNode(child, `${path}.or[${i}]`));
            } else if (node.not) {
                validateNode(node.not, `${path}.not`);
            } else if (node.field) {
                if (!node.operator) {
                    throw new Error(`${path}: field requires operator`);
                }
                const validOperators = [
                    'eq', 'equals', 'neq', 'not_equals',
                    'gt', 'greater_than', 'gte', 'greater_than_or_equals',
                    'lt', 'less_than', 'lte', 'less_than_or_equals',
                    'contains', 'not_contains', 'starts_with', 'ends_with', 'regex',
                    'in', 'not_in', 'is_null', 'is_not_null', 'is_empty', 'is_not_empty',
                    'between', 'array_contains', 'array_not_contains',
                    'date_before', 'date_after', 'date_equals'
                ];
                if (!validOperators.includes(node.operator)) {
                    throw new Error(`${path}: invalid operator '${node.operator}'`);
                }
            }
        };

        validateNode(conditions);
    }

    // ==========================================
    // TESTING
    // ==========================================

    /**
     * Testa una regola con payload di esempio (dry-run)
     * @param {string} ruleId - Rule ID
     * @param {Object} testPayload - Payload di test
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Risultato test
     */
    static async testRule(ruleId, testPayload, tenantId) {
        try {
            const rule = await this.getById(ruleId, tenantId);
            if (!rule) {
                throw new Error('Rule not found');
            }

            // Valuta condizioni
            const conditionsMet = this.evaluateConditions(rule, testPayload);

            // Calcola tempo invio
            const sendTime = this.calculateSendTime(rule);

            // Risolvi target
            const targets = await this.resolveTargets(rule, testPayload, tenantId);

            // Costruisci notifica (senza inviarla)
            const notification = this.buildNotificationFromRule(rule, {
                type: rule.eventType,
                payload: testPayload,
                aggregateType: 'TEST',
                aggregateId: 'test-id'
            });

            return {
                success: true,
                rule: {
                    id: rule.id,
                    name: rule.name,
                    eventType: rule.eventType
                },
                evaluation: {
                    conditionsMet,
                    sendTime: sendTime.toISOString(),
                    isScheduled: this.requiresScheduling(rule),
                    targetsCount: targets.length,
                    targets: targets.slice(0, 10) // Mostra primi 10
                },
                notification: {
                    title: notification.title,
                    body: notification.body,
                    priority: notification.priority,
                    channels: notification.channels
                }
            };
        } catch (error) {
            return {
                success: false,
                error: 'Operazione regola notifica non riuscita'
            };
        }
    }

    /**
     * Lista tipi di eventi disponibili
     * @returns {Array} Lista eventi con descrizioni
     */
    static getAvailableEventTypes() {
        return [
            // Appointments
            { type: 'appointment.created', description: 'Appuntamento creato', category: 'Appuntamenti' },
            { type: 'appointment.updated', description: 'Appuntamento modificato', category: 'Appuntamenti' },
            { type: 'appointment.cancelled', description: 'Appuntamento annullato', category: 'Appuntamenti' },
            { type: 'appointment.rescheduled', description: 'Appuntamento riprogrammato', category: 'Appuntamenti' },
            { type: 'appointment.reminder.24h', description: 'Reminder 24 ore prima', category: 'Appuntamenti' },
            { type: 'appointment.reminder.1h', description: 'Reminder 1 ora prima', category: 'Appuntamenti' },
            { type: 'appointment.conflict', description: 'Conflitto rilevato', category: 'Appuntamenti' },

            // Visite
            { type: 'visita.completed', description: 'Visita completata', category: 'Visite' },
            { type: 'visita.result.available', description: 'Risultati disponibili', category: 'Visite' },
            { type: 'visita.expiring', description: 'Visita in scadenza', category: 'Visite' },

            // Fatture
            { type: 'invoice.issued', description: 'Fattura emessa', category: 'Fatture' },
            { type: 'invoice.paid', description: 'Fattura pagata', category: 'Fatture' },
            { type: 'invoice.overdue', description: 'Fattura scaduta', category: 'Fatture' },
            { type: 'invoice.reminder', description: 'Reminder pagamento', category: 'Fatture' },

            // Documenti
            { type: 'document.created', description: 'Documento creato', category: 'Documenti' },
            { type: 'document.signed', description: 'Documento firmato', category: 'Documenti' },
            { type: 'document.expiring', description: 'Documento in scadenza', category: 'Documenti' },
            { type: 'document.signature.requested', description: 'Firma richiesta', category: 'Documenti' },

            // Corsi
            { type: 'course.enrollment', description: 'Iscrizione corso', category: 'Formazione' },
            { type: 'course.started', description: 'Corso iniziato', category: 'Formazione' },
            { type: 'course.completed', description: 'Corso completato', category: 'Formazione' },
            { type: 'course.certificate.expiring', description: 'Certificato in scadenza', category: 'Formazione' },
            { type: 'course.certificate.issued', description: 'Certificato emesso', category: 'Formazione' },

            // Persone
            { type: 'person.created', description: 'Utente creato', category: 'Utenti' },
            { type: 'person.password.changed', description: 'Password cambiata', category: 'Utenti' },
            { type: 'person.role.assigned', description: 'Ruolo assegnato', category: 'Utenti' },

            // Sistema
            { type: 'system.error.critical', description: 'Errore critico', category: 'Sistema' },
            { type: 'system.maintenance.scheduled', description: 'Manutenzione programmata', category: 'Sistema' },
            { type: 'system.security.alert', description: 'Alert sicurezza', category: 'Sistema' }
        ];
    }

    // ==========================================
    // CACHE MANAGEMENT
    // ==========================================

    /**
     * Ottiene valore dalla cache
     * @param {string} key - Chiave cache
     * @returns {*} Valore o null
     */
    static getFromCache(key) {
        const entry = ruleCache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiry) {
            ruleCache.delete(key);
            return null;
        }

        return entry.value;
    }

    /**
     * Salva valore in cache
     * @param {string} key - Chiave cache
     * @param {*} value - Valore
     * @param {number} ttl - TTL in ms (default: 5 min)
     */
    static setCache(key, value, ttl = CACHE_TTL) {
        ruleCache.set(key, {
            value,
            expiry: Date.now() + ttl
        });
    }

    /**
     * Invalida cache per tenant
     * @param {string} tenantId - Tenant ID
     */
    static async invalidateCache(tenantId) {
        for (const key of ruleCache.keys()) {
            if (key.includes(tenantId)) {
                ruleCache.delete(key);
            }
        }
    }

    /**
     * Pulisce tutta la cache
     */
    static clearCache() {
        ruleCache.clear();
    }
}

export default NotificationRuleService;
