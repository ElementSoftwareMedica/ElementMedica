/**
 * QueueCallService - Gestione chiamate pazienti
 * Progetto 53: Sistema gestione code pazienti
 * 
 * Responsabilità:
 * - Chiamata paziente (crea record QueueCall)
 * - Richiama paziente
 * - Stato display corrente
 * - Storico chiamate
 * - Broadcast WebSocket (future)
 * 
 * @module services/queue/QueueCallService
 */

import prisma from '../../config/prisma-optimization.js';
import { logger } from '../../utils/logger.js';
import QueueEntryService from './QueueEntryService.js';

class QueueCallService {
    /**
     * Chiama il prossimo paziente in coda
     * @param {Object} params - Parametri
     * @param {string} params.sessionId - ID sessione
     * @param {string} params.tenantId - ID tenant
     * @param {string} params.calledByPersonId - ID persona che chiama
     * @param {string} params.ambulatorioId - ID ambulatorio destinazione
     * @param {string} [params.displayedMessage] - Messaggio custom
     * @returns {Promise<Object>} Chiamata creata con entry
     */
    async callNext(params) {
        const { sessionId, tenantId, calledByPersonId, ambulatorioId, displayedMessage } = params;

        // Ottieni prossimo da chiamare
        const nextEntry = await QueueEntryService.getNext(sessionId, tenantId, ambulatorioId);

        if (!nextEntry) {
            return { success: false, message: 'Nessun paziente in attesa' };
        }

        return this.callSpecific({
            entryId: nextEntry.id,
            tenantId,
            calledByPersonId,
            ambulatorioId,
            displayedMessage
        });
    }

    /**
     * Chiama un paziente specifico
     * @param {Object} params - Parametri
     * @param {string} params.entryId - ID entry da chiamare
     * @param {string} params.tenantId - ID tenant
     * @param {string} params.calledByPersonId - ID persona che chiama
     * @param {string} params.ambulatorioId - ID ambulatorio destinazione
     * @param {string} [params.displayedMessage] - Messaggio custom
     * @param {string} [params.appuntamentoId] - ID appuntamento (fallback lookup)
     * @returns {Promise<Object>} Chiamata creata con entry
     */
    async callSpecific(params) {
        const { entryId, tenantId, calledByPersonId, ambulatorioId, displayedMessage, skipStatusChange, appuntamentoId } = params;

        // Ottieni entry - prima per ID (incluso soft-deleted per ottenere appuntamentoId)
        let entry = await prisma.numeroChiamata.findFirst({
            where: {
                id: entryId,
                tenantId,
                deletedAt: null
            }
        });

        // Fallback robusto: se entry non trovata per ID, cerca per appuntamentoId
        // L'appuntamentoId può venire dal parametro O dall'entry soft-deleted con lo stesso ID
        let resolvedAppuntamentoId = appuntamentoId;
        if (!entry) {
            // Prova a trovare l'appuntamentoId dall'entry originale (anche soft-deleted)
            if (!resolvedAppuntamentoId) {
                const deletedEntry = await prisma.numeroChiamata.findFirst({
                    where: { id: entryId, tenantId },
                    select: { appuntamentoId: true }
                });
                resolvedAppuntamentoId = deletedEntry?.appuntamentoId;
            }

            if (resolvedAppuntamentoId) {
                entry = await prisma.numeroChiamata.findFirst({
                    where: {
                        appuntamentoId: resolvedAppuntamentoId,
                        tenantId,
                        deletedAt: null
                    },
                    orderBy: { createdAt: 'desc' }
                });
                if (entry) {
                    logger.info('callSpecific: entry found via appuntamentoId fallback', {
                        service: 'QueueCallService',
                        originalEntryId: entryId,
                        foundEntryId: entry.id,
                        appuntamentoId: resolvedAppuntamentoId,
                        tenantId
                    });
                }
            }
        }

        if (!entry) {
            throw new Error('Entry non trovata');
        }

        if (entry.stato === 'COMPLETATO' || entry.stato === 'NON_PRESENTATO') {
            throw new Error('Paziente già processato');
        }

        // Ottieni ambulatorio per sigla
        const ambulatorio = await prisma.ambulatorio.findFirst({
            where: { id: ambulatorioId, deletedAt: null },
            select: {
                id: true,
                codice: true,
                nome: true
            }
        });

        if (!ambulatorio) {
            throw new Error('Ambulatorio non trovato');
        }

        // Aggiorna displayNumber se diverso dall'ambulatorio originale
        let displayNumber = entry.displayNumber;
        if (ambulatorio.codice !== entry.siglaAmbulatorio) {
            const config = await this.getSessionConfig(entry.sessionId);
            const digitCount = config?.digitCount || 2;
            displayNumber = ambulatorio.codice
                ? `${ambulatorio.codice}-${String(entry.numero).padStart(digitCount, '0')}`
                : String(entry.numero).padStart(digitCount, '0');
        }

        // Crea chiamata
        const call = await prisma.queueCall.create({
            data: {
                sessionId: entry.sessionId,
                numeroChiamataId: entry.id,
                calledByPersonId,
                ambulatorioId,
                siglaAmbulatorio: ambulatorio.codice,
                displayedNumber: displayNumber,
                displayedMessage: displayedMessage || `Numero ${displayNumber} - ${ambulatorio.nome}`,
                tenantId,
                calledAt: new Date()
            },
            include: {
                ambulatorio: {
                    select: { id: true, nome: true, codice: true, colore: true }
                },
                calledBy: {
                    select: { id: true, firstName: true, lastName: true }
                }
            }
        });

        // Aggiorna stato entry a CHIAMATO (skip if calling from IN_VISITA)
        if (!skipStatusChange) {
            await QueueEntryService.updateStatus(entry.id, tenantId, 'CHIAMATO');
        }

        // Aggiorna displayNumber se cambiato
        if (displayNumber !== entry.displayNumber) {
            await prisma.numeroChiamata.update({
                where: { id: entry.id },
                data: {
                    displayNumber,
                    siglaAmbulatorio: ambulatorio.codice
                }
            });
        }

        logger.info('Patient called', {
            service: 'QueueCallService',
            callId: call.id,
            entryId: entry.id,
            displayNumber,
            ambulatorioId,
            skipStatusChange: !!skipStatusChange,
            tenantId
        });

        // TODO: Broadcast WebSocket per aggiornamento display
        // await this.broadcastCall(call);

        return {
            success: true,
            call,
            entry: {
                ...entry,
                displayNumber,
                stato: skipStatusChange ? entry.stato : 'CHIAMATO'
            }
        };
    }

    /**
     * Richiama un paziente (seconda chiamata)
     * @param {string} entryId - ID entry
     * @param {string} tenantId - ID tenant
     * @param {string} calledByPersonId - ID persona che chiama
     * @returns {Promise<Object>} Nuova chiamata
     */
    async recall(entryId, tenantId, calledByPersonId) {
        const entry = await prisma.numeroChiamata.findFirst({
            where: {
                id: entryId,
                tenantId,
                deletedAt: null
            }
        });

        if (!entry) {
            throw new Error('Entry non trovata');
        }

        // Trova ultima chiamata per questo entry
        const lastCall = await prisma.queueCall.findFirst({
            where: {
                numeroChiamataId: entryId,
                tenantId
            },
            orderBy: { calledAt: 'desc' }
        });

        if (!lastCall) {
            throw new Error('Nessuna chiamata precedente trovata');
        }

        // Crea nuova chiamata (richiamo)
        const call = await prisma.queueCall.create({
            data: {
                sessionId: entry.sessionId,
                numeroChiamataId: entry.id,
                calledByPersonId,
                ambulatorioId: lastCall.ambulatorioId,
                siglaAmbulatorio: lastCall.siglaAmbulatorio,
                displayedNumber: lastCall.displayedNumber,
                displayedMessage: `RICHIAMO: ${lastCall.displayedMessage || lastCall.displayedNumber}`,
                tenantId,
                calledAt: new Date()
            },
            include: {
                ambulatorio: {
                    select: { id: true, nome: true, codice: true, colore: true }
                }
            }
        });

        logger.info('Patient recalled', {
            service: 'QueueCallService',
            callId: call.id,
            entryId,
            tenantId
        });

        return {
            success: true,
            call,
            isRecall: true
        };
    }

    /**
     * Ottiene stato display corrente per sessione
     * @param {string} sessionId - ID sessione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Stato display con formato compatibile frontend
     */
    async getDisplayState(sessionId, tenantId) {
        // Fetch session con ambulatorio
        const session = await prisma.queueSession.findFirst({
            where: {
                id: sessionId,
                tenantId,
                deletedAt: null
            },
            include: {
                ambulatorio: {
                    select: { id: true, nome: true, codice: true, colore: true }
                }
            }
        });

        if (!session) {
            throw new Error('Sessione non trovata');
        }

        // Ultima chiamata della sessione (currentCall)
        const lastCall = await prisma.queueCall.findFirst({
            where: {
                sessionId,
                tenantId
            },
            orderBy: { calledAt: 'desc' },
            include: {
                ambulatorio: {
                    select: { id: true, nome: true, codice: true, colore: true }
                },
                calledBy: {
                    select: { id: true, firstName: true, lastName: true }
                },
                numeroChiamata: {
                    select: { pazienteId: true, stato: true }
                }
            }
        });

        // Chiamate recenti (ultime 5)
        const recentCalls = await prisma.queueCall.findMany({
            where: {
                sessionId,
                tenantId
            },
            orderBy: { calledAt: 'desc' },
            take: 5,
            include: {
                ambulatorio: {
                    select: { id: true, nome: true, codice: true, colore: true }
                },
                calledBy: {
                    select: { id: true, firstName: true, lastName: true }
                }
            }
        });

        // Conteggio pazienti in attesa
        const waitingCount = await prisma.numeroChiamata.count({
            where: {
                sessionId,
                tenantId,
                stato: 'IN_ATTESA',
                deletedAt: null
            }
        });

        // Statistiche sessione
        const stats = await prisma.numeroChiamata.groupBy({
            by: ['stato'],
            where: {
                sessionId,
                tenantId,
                deletedAt: null
            },
            _count: true
        });

        const statsMap = stats.reduce((acc, s) => {
            acc[s.stato] = s._count;
            return acc;
        }, {});

        return {
            // P61: Formato compatibile frontend DisplayState
            session,
            currentCall: lastCall,
            recentCalls,
            waitingCount,
            lastUpdate: new Date().toISOString(),
            // Legacy fields per retrocompatibilità
            displayedNumber: lastCall?.displayedNumber || null,
            displayedMessage: lastCall?.displayedMessage || null,
            ambulatorio: lastCall?.ambulatorio || null,
            medico: lastCall?.calledBy || null,
            calledAt: lastCall?.calledAt || null,
            stats: {
                inAttesa: statsMap['IN_ATTESA'] || 0,
                chiamati: statsMap['CHIAMATO'] || 0,
                inVisita: statsMap['IN_VISITA'] || 0,
                completati: statsMap['COMPLETATO'] || 0,
                nonPresentati: statsMap['NON_PRESENTATO'] || 0
            }
        };
    }

    /**
     * Ottiene storico chiamate
     * @param {Object} params - Parametri
     * @param {string} params.sessionId - ID sessione
     * @param {string} params.tenantId - ID tenant
     * @param {number} [params.limit=10] - Limite
     * @returns {Promise<Object[]>} Storico chiamate
     */
    async getHistory(params) {
        const { sessionId, tenantId, limit = 10 } = params;

        return prisma.queueCall.findMany({
            where: {
                sessionId,
                tenantId
            },
            orderBy: { calledAt: 'desc' },
            take: limit,
            include: {
                ambulatorio: {
                    select: { id: true, nome: true, codice: true, colore: true }
                },
                calledBy: {
                    select: { id: true, firstName: true, lastName: true }
                }
            }
        });
    }

    /**
     * Marca paziente come arrivato in ambulatorio
     * @param {string} callId - ID chiamata
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Chiamata aggiornata
     */
    async acknowledge(callId, tenantId) {
        const call = await prisma.queueCall.findFirst({
            where: { id: callId, tenantId }
        });

        if (!call) {
            throw new Error('Chiamata non trovata');
        }

        // Aggiorna chiamata con timestamp acknowledge
        const updated = await prisma.queueCall.update({
            where: { id: callId, deletedAt: null },
            data: { acknowledgedAt: new Date() }
        });

        // Aggiorna stato entry a IN_VISITA
        await QueueEntryService.updateStatus(call.numeroChiamataId, tenantId, 'IN_VISITA');

        logger.info('Call acknowledged', {
            service: 'QueueCallService',
            callId,
            entryId: call.numeroChiamataId,
            tenantId
        });

        return updated;
    }

    /**
     * Marca paziente come non presentato
     * @param {string} entryId - ID entry
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Entry aggiornata
     */
    async markNoShow(entryId, tenantId) {
        await QueueEntryService.updateStatus(entryId, tenantId, 'NON_PRESENTATO');

        logger.info('Patient marked as no-show', {
            service: 'QueueCallService',
            entryId,
            tenantId
        });

        return { success: true, entryId, status: 'NON_PRESENTATO' };
    }

    /**
     * Completa visita
     * @param {string} entryId - ID entry
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Entry aggiornata
     */
    async complete(entryId, tenantId) {
        await QueueEntryService.updateStatus(entryId, tenantId, 'COMPLETATO');

        // Aggiorna stime per gli altri in coda
        const entry = await prisma.numeroChiamata.findFirst({
            where: { id: entryId, deletedAt: null },
            select: { sessionId: true }
        });

        if (entry?.sessionId) {
            await QueueEntryService.updateAllEstimates(entry.sessionId, tenantId);
        }

        logger.info('Visit completed', {
            service: 'QueueCallService',
            entryId,
            tenantId
        });

        return { success: true, entryId, status: 'COMPLETATO' };
    }

    /**
     * Helper: ottieni config sessione
     * @private
     */
    async getSessionConfig(sessionId) {
        const session = await prisma.queueSession.findFirst({
            where: { id: sessionId, deletedAt: null },
            select: { config: true }
        });
        return session?.config;
    }

    /**
     * Ottiene chiamate per ambulatorio
     * @param {Object} params - Parametri
     * @param {string} params.ambulatorioId - ID ambulatorio
     * @param {string} params.tenantId - ID tenant
     * @param {Date} [params.date] - Data (default oggi)
     * @returns {Promise<Object[]>} Chiamate
     */
    async getByAmbulatorio(params) {
        const { ambulatorioId, tenantId, date } = params;

        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        return prisma.queueCall.findMany({
            where: {
                ambulatorioId,
                tenantId,
                calledAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            orderBy: { calledAt: 'desc' },
            include: {
                numeroChiamata: {
                    select: {
                        id: true,
                        numero: true,
                        displayNumber: true,
                        stato: true,
                        pazienteId: true
                    }
                },
                calledBy: {
                    select: { id: true, firstName: true, lastName: true }
                }
            }
        });
    }
}

export default new QueueCallService();
