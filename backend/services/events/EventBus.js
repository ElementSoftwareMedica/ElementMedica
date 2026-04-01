/**
 * EventBus.js
 * 
 * Event Bus centralizzato per Domain Events
 * Sistema Publish/Subscribe loosely-coupled per architettura event-driven.
 * 
 * PROGETTO 47 - FASE 2: Event Bus & Domain Events
 * 
 * Features:
 * - In-memory EventEmitter (Node.js native)
 * - Event persistence in database (DomainEvent table)
 * - Middleware system per event enrichment
 * - Async handlers per non bloccare l'emitter
 * - Event replay per debugging/recovery
 * - Wildcard subscription per global handlers
 * 
 * @module services/events/EventBus
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import logger from '../../utils/logger.js';
import prisma from '../../config/prisma-optimization.js';

// ============================================
// EVENT BUS CLASS
// ============================================

class EventBusClass extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(100); // Aumenta limite per molti handler
        this.handlers = new Map();
        this.middlewares = [];
        this.initialized = false;

        logger.info('EventBus: Instance created');
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================

    /**
     * Inizializza l'EventBus
     * Registra handler built-in e middleware
     */
    initialize() {
        if (this.initialized) {
            logger.warn('EventBus: Already initialized');
            return this;
        }

        // Middleware per logging
        this.use(async (event) => {
            logger.debug({
                eventType: event.type,
                eventId: event.id,
                aggregateType: event.aggregateType,
                aggregateId: event.aggregateId
            }, 'EventBus: Processing event');
        });

        // Error handler globale
        this.on('error', (error) => {
            logger.error({ error }, 'EventBus: Unhandled error');
        });

        this.initialized = true;
        logger.info('EventBus: Initialized successfully');

        return this;
    }

    // ==========================================
    // MIDDLEWARE
    // ==========================================

    /**
     * Registra middleware per preprocessing eventi
     * @param {Function} middleware - async (event) => void
     * @returns {EventBusClass} this per chaining
     */
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new Error('Middleware must be a function');
        }
        this.middlewares.push(middleware);
        return this;
    }

    // ==========================================
    // PUBLISH
    // ==========================================

    /**
     * Pubblica evento nel bus
     * @param {Object} event - Evento da pubblicare
     * @param {string} event.type - Tipo evento (es. 'APPOINTMENT_CREATED')
     * @param {Object} event.payload - Dati specifici dell'evento
     * @param {string} [event.aggregateType] - Tipo entità (es. 'Appuntamento')
     * @param {string} [event.aggregateId] - ID entità
     * @param {Object} [event.metadata] - Metadati (userId, tenantId, ipAddress, etc.)
     * @param {boolean} [event.persist=true] - Se salvare nel database
     * @returns {Promise<Object>} Evento arricchito
     */
    async publish(eventOrType, payload) {
        // Support both signatures:
        // 1. publish({ type, payload, ... }) - new format
        // 2. publish(eventType, payload) - legacy format
        let event;
        if (typeof eventOrType === 'string') {
            // Legacy format: publish(eventType, payload)
            event = { type: eventOrType, payload };
        } else {
            // New format: publish({ type, payload, ... })
            event = eventOrType;
        }

        logger.debug({
            component: 'EventBus',
            action: 'publish_converted',
            eventType: event.type,
            hasEventPayload: !!event.payload,
        }, 'EventBus event after conversion');

        // Valida evento
        if (!event.type) {
            throw new Error('Invalid event: type is required');
        }
        if (!event.payload) {
            throw new Error('Invalid event: payload is required');
        }

        // Enrich event con valori default
        const enrichedEvent = {
            ...event,
            id: event.id || crypto.randomUUID(),
            timestamp: event.timestamp || new Date().toISOString(),
            version: event.version || 1,
            aggregateType: event.aggregateType || 'Unknown',
            aggregateId: event.aggregateId || null,
            metadata: {
                ...event.metadata,
                publishedAt: new Date().toISOString()
            }
        };

        try {
            // Execute middlewares
            for (const middleware of this.middlewares) {
                await middleware(enrichedEvent);
            }

            // Store event (if persistence enabled)
            if (event.persist !== false && enrichedEvent.metadata?.tenantId) {
                await this.storeEvent(enrichedEvent);
            }

            // Log
            logger.debug({
                eventType: enrichedEvent.type,
                eventId: enrichedEvent.id,
                aggregateType: enrichedEvent.aggregateType,
                aggregateId: enrichedEvent.aggregateId
            }, 'EventBus: Publishing domain event');

            // Emit to specific handlers
            this.emit(enrichedEvent.type, enrichedEvent);

            // Emit wildcard for global handlers
            this.emit('*', enrichedEvent);

            return enrichedEvent;

        } catch (error) {
            logger.error({
                error,
                eventType: event.type,
                eventId: enrichedEvent.id
            }, 'EventBus: Failed to publish event');
            throw error;
        }
    }

    /**
     * Pubblica multipli eventi in sequenza
     * @param {Array<Object>} events - Array di eventi
     * @returns {Promise<Array<Object>>} Eventi arricchiti
     */
    async publishAll(events) {
        const results = [];
        for (const event of events) {
            results.push(await this.publish(event));
        }
        return results;
    }

    /**
     * Pubblica evento con delay
     * @param {Object} event - Evento da pubblicare
     * @param {number} delayMs - Delay in millisecondi
     * @returns {Promise<NodeJS.Timeout>} Timer reference
     */
    publishDelayed(event, delayMs) {
        return new Promise((resolve) => {
            const timer = setTimeout(async () => {
                await this.publish(event);
                resolve(timer);
            }, delayMs);
        });
    }

    // ==========================================
    // SUBSCRIBE
    // ==========================================

    /**
     * Registra handler per tipo evento
     * @param {string} eventType - Tipo evento o '*' per tutti
     * @param {Function} handler - async (event) => void
     * @param {Object} [options] - Opzioni
     * @param {number} [options.priority=0] - Priorità handler (maggiore = prima)
     * @param {boolean} [options.async=true] - Se eseguire in modo asincrono
     * @returns {Function} Funzione per unsubscribe
     */
    subscribe(eventType, handler, options = {}) {
        const { priority = 0, async: isAsync = true } = options;

        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }

        const wrappedHandler = async (event) => {
            try {
                if (isAsync) {
                    // Non blocca l'emitter
                    setImmediate(async () => {
                        try {
                            await handler(event);
                        } catch (error) {
                            logger.error({
                                error: error.message,
                                stack: error.stack,
                                eventType,
                                eventId: event.id
                            }, 'EventBus: Event handler failed (async)');
                        }
                    });
                } else {
                    await handler(event);
                }
            } catch (error) {
                logger.error({
                    error: error.message,
                    stack: error.stack,
                    eventType,
                    eventId: event.id
                }, 'EventBus: Event handler failed');
                // Non ri-lanciare per non bloccare altri handler
            }
        };

        wrappedHandler.priority = priority;
        wrappedHandler.originalHandler = handler;

        this.on(eventType, wrappedHandler);

        // Track per unsubscribe
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType).push(wrappedHandler);

        logger.debug({ eventType }, 'EventBus: Handler registered');

        // Return unsubscribe function
        return () => this.unsubscribe(eventType, handler);
    }

    /**
     * Registra handler che si rimuove dopo la prima esecuzione
     * @param {string} eventType - Tipo evento
     * @param {Function} handler - Handler
     * @returns {Function} Funzione per unsubscribe
     */
    subscribeOnce(eventType, handler) {
        const onceHandler = async (event) => {
            this.unsubscribe(eventType, onceHandler);
            await handler(event);
        };
        return this.subscribe(eventType, onceHandler);
    }

    /**
     * Rimuove handler specifico
     * @param {string} eventType - Tipo evento
     * @param {Function} handler - Handler originale
     */
    unsubscribe(eventType, handler) {
        const handlers = this.handlers.get(eventType) || [];
        const index = handlers.findIndex(h => h.originalHandler === handler || h === handler);

        if (index >= 0) {
            this.off(eventType, handlers[index]);
            handlers.splice(index, 1);
            logger.debug({ eventType }, 'EventBus: Handler unregistered');
        }
    }

    /**
     * Rimuove tutti gli handler per un tipo di evento
     * @param {string} eventType - Tipo evento
     */
    unsubscribeAll(eventType) {
        const handlers = this.handlers.get(eventType) || [];

        for (const handler of handlers) {
            this.off(eventType, handler);
        }

        this.handlers.delete(eventType);
        logger.debug({ eventType }, 'EventBus: All handlers unregistered');
    }

    // ==========================================
    // PERSISTENCE
    // ==========================================

    /**
     * Persiste evento nel database
     * @param {Object} event - Evento da salvare
     */
    async storeEvent(event) {
        try {
            await prisma.domainEvent.create({
                data: {
                    id: event.id,
                    type: event.type,
                    aggregateType: event.aggregateType || 'Unknown',
                    aggregateId: event.aggregateId || null,
                    payload: event.payload,
                    metadata: event.metadata || {},
                    tenantId: event.metadata?.tenantId,
                    version: event.version || 1,
                    processed: false,
                    createdAt: new Date(event.timestamp)
                }
            });

            logger.debug({
                eventId: event.id,
                eventType: event.type
            }, 'EventBus: Event stored in database');

        } catch (error) {
            logger.error({
                error: error.message,
                eventId: event.id,
                eventType: event.type
            }, 'EventBus: Failed to store domain event');
            // Non bloccare il flusso - evento già emesso
        }
    }

    /**
     * Marca evento come processato
     * @param {string} eventId - ID evento
     */
    async markEventProcessed(eventId) {
        try {
            await prisma.domainEvent.update({
                where: { id: eventId },
                data: {
                    processed: true,
                    processedAt: new Date()
                }
            });
        } catch (error) {
            logger.warn({ error: error.message, eventId }, 'EventBus: Failed to mark event as processed');
        }
    }

    // ==========================================
    // REPLAY & RECOVERY
    // ==========================================

    /**
     * Replay eventi per un aggregato specifico
     * Utile per debugging e recovery
     * @param {string} aggregateType - Tipo aggregato
     * @param {string} aggregateId - ID aggregato
     * @param {number} [fromVersion=0] - Versione iniziale
     * @returns {Promise<number>} Numero eventi replayed
     */
    async replayEvents(aggregateType, aggregateId, fromVersion = 0) {
        const events = await prisma.domainEvent.findMany({
            where: {
                aggregateType,
                aggregateId,
                version: { gte: fromVersion }
            },
            orderBy: { version: 'asc' }
        });

        logger.info({
            aggregateType,
            aggregateId,
            fromVersion,
            count: events.length
        }, 'EventBus: Replaying events');

        for (const event of events) {
            await this.publish({
                ...event,
                payload: event.payload,
                persist: false, // Non ri-salvare
                replay: true
            });
        }

        return events.length;
    }

    /**
     * Recupera eventi non processati
     * Utile per recovery dopo crash
     * @param {string} tenantId - ID tenant
     * @param {number} [limit=100] - Limite eventi
     * @returns {Promise<Array>} Eventi non processati
     */
    async getUnprocessedEvents(tenantId, limit = 100) {
        return prisma.domainEvent.findMany({
            where: {
                tenantId,
                processed: false
            },
            orderBy: { createdAt: 'asc' },
            take: limit
        });
    }

    /**
     * Riprocessa eventi non processati
     * @param {string} tenantId - ID tenant
     * @returns {Promise<number>} Numero eventi riprocessati
     */
    async reprocessUnprocessedEvents(tenantId) {
        const events = await this.getUnprocessedEvents(tenantId);

        logger.info({
            tenantId,
            count: events.length
        }, 'EventBus: Reprocessing unprocessed events');

        for (const event of events) {
            await this.publish({
                ...event,
                payload: event.payload,
                persist: false,
                reprocess: true
            });
            await this.markEventProcessed(event.id);
        }

        return events.length;
    }

    // ==========================================
    // QUERY
    // ==========================================

    /**
     * Ottiene eventi per aggregato
     * @param {string} aggregateType - Tipo aggregato
     * @param {string} aggregateId - ID aggregato
     * @param {Object} [options] - Opzioni query
     * @returns {Promise<Array>} Eventi
     */
    async getEventsForAggregate(aggregateType, aggregateId, options = {}) {
        const { limit = 50, offset = 0 } = options;

        return prisma.domainEvent.findMany({
            where: {
                aggregateType,
                aggregateId
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
    }

    /**
     * Ottiene eventi per tipo
     * @param {string} eventType - Tipo evento
     * @param {string} tenantId - ID tenant
     * @param {Object} [options] - Opzioni query
     * @returns {Promise<Array>} Eventi
     */
    async getEventsByType(eventType, tenantId, options = {}) {
        const { limit = 50, offset = 0, since } = options;

        return prisma.domainEvent.findMany({
            where: {
                type: eventType,
                tenantId,
                ...(since && { createdAt: { gte: since } })
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
    }

    // ==========================================
    // STATS
    // ==========================================

    /**
     * Ottiene statistiche degli handler registrati
     * @returns {Object} Statistiche
     */
    getStats() {
        const stats = {
            totalHandlers: 0,
            handlersByType: {}
        };

        for (const [eventType, handlers] of this.handlers.entries()) {
            stats.totalHandlers += handlers.length;
            stats.handlersByType[eventType] = handlers.length;
        }

        return stats;
    }

    /**
     * Ottiene statistiche eventi dal database
     * @param {string} tenantId - ID tenant
     * @param {Date} [since] - Da quando
     * @returns {Promise<Object>} Statistiche eventi
     */
    async getEventStats(tenantId, since) {
        const whereClause = {
            tenantId,
            ...(since && { createdAt: { gte: since } })
        };

        const [total, processed, byType] = await Promise.all([
            prisma.domainEvent.count({ where: whereClause }),
            prisma.domainEvent.count({ where: { ...whereClause, processed: true } }),
            prisma.domainEvent.groupBy({
                by: ['type'],
                where: whereClause,
                _count: { type: true }
            })
        ]);

        return {
            total,
            processed,
            unprocessed: total - processed,
            byType: byType.reduce((acc, item) => {
                acc[item.type] = item._count.type;
                return acc;
            }, {})
        };
    }

    // ==========================================
    // CLEANUP
    // ==========================================

    /**
     * Pulisce eventi vecchi
     * @param {number} daysOld - Giorni di retention
     * @param {string} [tenantId] - Opzionale: solo per tenant specifico
     * @returns {Promise<number>} Numero eventi eliminati
     */
    async cleanupOldEvents(daysOld = 90, tenantId = null) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const whereClause = {
            createdAt: { lt: cutoffDate },
            processed: true,
            ...(tenantId && { tenantId })
        };

        const result = await prisma.domainEvent.deleteMany({
            where: whereClause
        });

        logger.info({
            deletedCount: result.count,
            daysOld,
            tenantId
        }, 'EventBus: Cleaned up old events');

        return result.count;
    }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const EventBus = new EventBusClass();

// Auto-initialize
EventBus.initialize();

export default EventBus;
