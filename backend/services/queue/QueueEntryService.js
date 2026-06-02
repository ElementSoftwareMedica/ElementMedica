/**
 * QueueEntryService - Gestione numeri in coda
 * Progetto 53: Sistema gestione code pazienti
 * 
 * Responsabilità:
 * - CRUD numeri in coda (NumeroChiamata)
 * - Calcolo posizione in coda
 * - Stima tempo attesa
 * - Supporto walk-in (pazienti senza appuntamento)
 * - Aggiornamento stati
 * 
 * @module services/queue/QueueEntryService
 */

import prisma from '../../config/prisma-optimization.js';
import { logger } from '../../utils/logger.js';

class QueueEntryService {
    /**
     * Aggiunge un numero alla coda
     * @param {Object} data - Dati entry
     * @param {string} data.sessionId - ID sessione
     * @param {string} [data.pazienteId] - ID paziente (opzionale per walk-in)
     * @param {string} data.tenantId - ID tenant
     * @param {string} [data.appuntamentoId] - ID appuntamento
     * @param {string} [data.ambulatorioId] - ID ambulatorio
     * @param {string} [data.medicoId] - ID medico
     * @param {'NORMALE'|'URGENTE'|'PRIORITARIO'|'EMERGENZA'} [data.priorita='NORMALE'] - Priorità
     * @param {'APPUNTAMENTO'|'WALK_IN'|'EMERGENZA'} [data.tipoAccesso] - Tipo accesso
     * @param {Object} [data.walkInData] - Dati walk-in
     * @returns {Promise<Object>} Entry creata
     */
    async add(data) {
        const {
            sessionId,
            pazienteId,
            tenantId,
            appuntamentoId,
            ambulatorioId,
            medicoId,
            priorita = 'NORMALE',
            tipoAccesso,
            walkInData
        } = data;

        // Idempotency: se l'appuntamento ha già un numero in QUALSIASI sessione (cross-session),
        // ritorna quello esistente. Ogni appuntamento = un solo numero di queue.
        if (appuntamentoId) {
            const existing = await prisma.numeroChiamata.findFirst({
                where: {
                    appuntamentoId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    session: {
                        select: {
                            id: true,
                            mode: true,
                            ambulatorio: {
                                select: { nome: true, codice: true }
                            }
                        }
                    }
                }
            });
            if (existing) {
                logger.info('Queue entry already exists for this appuntamento, returning existing', {
                    service: 'QueueEntryService',
                    action: 'add-idempotent',
                    entryId: existing.id,
                    appuntamentoId,
                    sessionId,
                    numero: existing.numero,
                    tenantId
                });
                return existing;
            }
        }

        if (pazienteId) {
            const existingForPatientInSession = await prisma.numeroChiamata.findFirst({
                where: {
                    sessionId,
                    pazienteId,
                    tenantId,
                    deletedAt: null,
                    stato: { in: ['IN_ATTESA', 'CHIAMATO', 'IN_VISITA'] },
                },
                include: {
                    session: {
                        select: {
                            id: true,
                            mode: true,
                            ambulatorio: {
                                select: { nome: true, codice: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'asc' },
            });
            if (existingForPatientInSession) {
                logger.info('Queue entry already exists for this patient in session, returning existing', {
                    service: 'QueueEntryService',
                    action: 'add-patient-idempotent',
                    entryId: existingForPatientInSession.id,
                    pazienteId,
                    sessionId,
                    numero: existingForPatientInSession.numero,
                    tenantId
                });
                return existingForPatientInSession;
            }
        }

        // Ottieni sessione e ambulatorio per sigla (con verifica multi-tenancy)
        const session = await prisma.queueSession.findFirst({
            where: {
                id: sessionId,
                tenantId,
                deletedAt: null
            },
            include: {
                ambulatorio: {
                    select: { codice: true }
                }
            }
        });

        if (!session || !session.isActive) {
            throw new Error('Sessione non trovata o non attiva');
        }

        // Calcola prossimo numero
        const lastEntry = await prisma.numeroChiamata.findFirst({
            where: {
                sessionId,
                deletedAt: null
            },
            orderBy: { numero: 'desc' }
        });

        const numero = (lastEntry?.numero || 0) + 1;

        // Determina sigla ambulatorio
        let sigla = '';
        if (ambulatorioId) {
            const amb = await prisma.ambulatorio.findFirst({
                where: { id: ambulatorioId, deletedAt: null },
                select: { codice: true }
            });
            sigla = amb?.codice || '';
        } else if (session.ambulatorio) {
            sigla = session.ambulatorio.codice || '';
        }

        // Formato displayNumber
        const config = session.config || {};
        const digitCount = config.digitCount || 2;
        const displayNumber = sigla
            ? `${sigla}-${String(numero).padStart(digitCount, '0')}`
            : String(numero).padStart(digitCount, '0');

        // Stima tempo attesa
        const tempoAttesaStimato = await this.estimateWaitTime(sessionId, priorita);

        // Determina tipo accesso
        const accessType = tipoAccesso || (pazienteId ? 'APPUNTAMENTO' : 'WALK_IN');

        const entry = await prisma.numeroChiamata.create({
            data: {
                numero,
                pazienteId,
                appuntamentoId,
                ambulatorioId: ambulatorioId || session.ambulatorioId,
                medicoId,
                sessionId,
                displayNumber,
                siglaAmbulatorio: sigla,
                priorita,
                stato: 'IN_ATTESA',
                tipoAccesso: accessType,
                tempoAttesaStimato,
                walkInData,
                tenantId
            },
            include: {
                session: {
                    select: {
                        id: true,
                        mode: true,
                        ambulatorio: {
                            select: { nome: true, codice: true }
                        }
                    }
                }
            }
        });

        // Aggiorna currentNumber sessione
        await prisma.queueSession.update({
            where: { id: sessionId, deletedAt: null },
            data: { currentNumber: numero }
        });

        logger.info('Queue entry added', {
            service: 'QueueEntryService',
            entryId: entry.id,
            sessionId,
            numero,
            displayNumber,
            tenantId
        });

        return entry;
    }

    /**
     * Stima tempo attesa in minuti
     * @param {string} sessionId - ID sessione
     * @param {'NORMALE'|'URGENTE'|'PRIORITARIO'|'EMERGENZA'} priorita - Priorità
     * @returns {Promise<number>} Minuti stimati
     */
    async estimateWaitTime(sessionId, priorita = 'NORMALE') {
        // Conta pazienti in attesa prima
        const inAttesa = await prisma.numeroChiamata.count({
            where: {
                sessionId,
                stato: { in: ['IN_ATTESA', 'CHIAMATO'] },
                deletedAt: null,
                // Per priorità normali, conta tutti quelli con priorità >= della propria
                ...(priorita === 'NORMALE' && {
                    priorita: { in: ['NORMALE', 'URGENTE', 'PRIORITARIO', 'EMERGENZA'] }
                }),
                ...(priorita === 'URGENTE' && {
                    priorita: { in: ['URGENTE', 'PRIORITARIO', 'EMERGENZA'] }
                }),
                ...(priorita === 'PRIORITARIO' && {
                    priorita: { in: ['PRIORITARIO', 'EMERGENZA'] }
                }),
                ...(priorita === 'EMERGENZA' && {
                    priorita: 'EMERGENZA'
                })
            }
        });

        // Durata media per paziente (configurabile, default 15 min)
        const DURATA_MEDIA_MINUTI = 15;

        // Aggiungi margine 10%
        const stimaBase = inAttesa * DURATA_MEDIA_MINUTI;
        return Math.ceil(stimaBase * 1.1);
    }

    /**
     * Ottiene entry per ID
     * @param {string} id - ID entry
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object|null>} Entry
     */
    async getById(id, tenantId) {
        return prisma.numeroChiamata.findFirst({
            where: {
                id,
                tenantId,
                deletedAt: null
            },
            include: {
                session: {
                    select: {
                        id: true,
                        mode: true,
                        isActive: true,
                        ambulatorio: {
                            select: { id: true, nome: true, codice: true }
                        }
                    }
                }
            }
        });
    }

    /**
     * Lista entries per sessione
     * @param {Object} params - Parametri
     * @param {string} params.sessionId - ID sessione
     * @param {string} params.tenantId - ID tenant
     * @param {string} [params.stato] - Filtro stato
     * @param {number} [params.page=1] - Pagina
     * @param {number} [params.limit=50] - Limite
     * @returns {Promise<Object>} Lista paginata
     */
    async listBySession(params) {
        const { sessionId, tenantId, stato, page = 1, limit = 50 } = params;

        const where = {
            sessionId,
            tenantId,
            deletedAt: null
        };

        if (stato) {
            where.stato = stato;
        }

        const entries = await prisma.numeroChiamata.findMany({
            where,
            orderBy: [
                { priorita: 'desc' }, // EMERGENZA first
                { numero: 'asc' }
            ],
            include: {
                // Use available Prisma relations
                session: {
                    select: {
                        id: true,
                        ambulatorio: {
                            select: { id: true, nome: true, codice: true }
                        }
                    }
                },
                prestazione: {
                    select: { id: true, nome: true }
                },
                calls: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        const uniqueEntries = [];
        const seen = new Set();
        for (const entry of entries) {
            const key = entry.appuntamentoId
                ? `appt:${entry.appuntamentoId}`
                : entry.pazienteId
                    ? `patient:${entry.pazienteId}:${entry.sessionId}`
                    : entry.displayNumber
                        ? `display:${entry.displayNumber}:${entry.sessionId}`
                        : `entry:${entry.id}`;
            if (seen.has(key)) continue;
            seen.add(key);
            uniqueEntries.push(entry);
        }

        const total = uniqueEntries.length;
        const pagedEntries = uniqueEntries.slice((page - 1) * limit, page * limit);

        // Fetch appuntamento data separately if appuntamentoId exists
        const appuntamentoIds = pagedEntries
            .filter(e => e.appuntamentoId)
            .map(e => e.appuntamentoId);

        let appuntamentiMap = {};
        if (appuntamentoIds.length > 0) {
            const appuntamenti = await prisma.appuntamento.findMany({
                where: { id: { in: appuntamentoIds } },
                select: {
                    id: true,
                    dataOra: true,
                    durataMinuti: true,
                    note: true,
                    prestazione: { select: { nome: true } },
                    paziente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            tenantProfiles: {
                                select: { phone: true },
                                where: { tenantId, deletedAt: null },
                                take: 1
                            }
                        }
                    }
                }
            });
            appuntamentiMap = Object.fromEntries(
                appuntamenti.map(a => [a.id, a])
            );
        }

        // Also fetch paziente data for entries with pazienteId but no appuntamento
        const pazienteIds = pagedEntries
            .filter(e => e.pazienteId && !e.appuntamentoId)
            .map(e => e.pazienteId);

        let pazientiMap = {};
        if (pazienteIds.length > 0) {
            const pazienti = await prisma.person.findMany({
                where: { id: { in: pazienteIds } },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    tenantProfiles: {
                        select: { phone: true },
                        where: { tenantId, deletedAt: null },
                        take: 1
                    }
                }
            });
            pazientiMap = Object.fromEntries(
                pazienti.map(p => [p.id, p])
            );
        }

        // Map to include patient name in a more accessible format
        const mappedEntries = pagedEntries.map(entry => {
            const appuntamento = entry.appuntamentoId ? appuntamentiMap[entry.appuntamentoId] : null;
            const paziente = appuntamento?.paziente || (entry.pazienteId ? pazientiMap[entry.pazienteId] : null);
            const walkIn = entry.walkInData;

            // Build patient name from available sources
            let patientName = null;
            if (paziente?.firstName || paziente?.lastName) {
                patientName = `${paziente.firstName || ''} ${paziente.lastName || ''}`.trim();
            } else if (walkIn?.displayedName) {
                patientName = walkIn.displayedName;
            } else if (walkIn?.firstName || walkIn?.lastName) {
                patientName = `${walkIn.firstName || ''} ${walkIn.lastName || ''}`.trim();
            }

            const pazientePhone = paziente?.tenantProfiles?.[0]?.phone || walkIn?.phone || null;

            return {
                ...entry,
                // Derive personTenantProfile-like structure
                personTenantProfile: paziente ? {
                    id: paziente.id,
                    phone: pazientePhone,
                    person: { firstName: paziente.firstName, lastName: paziente.lastName }
                } : walkIn ? {
                    id: 'walk-in-' + entry.id,
                    phone: walkIn.phone,
                    person: { firstName: walkIn.firstName || walkIn.displayedName, lastName: walkIn.lastName || '' }
                } : null,
                // Add explicit patient name for frontend
                patientName,
                // Ora prevista derived from appuntamento.dataOra
                oraPrevista: appuntamento?.dataOra || entry.dataOraArrivo,
                // Stima attesa based on createdAt
                stimaAttesa: entry.tempoAttesaStimato,
                // Map appuntamento with prestazioneNome for frontend compatibility
                appuntamento: appuntamento ? {
                    id: appuntamento.id,
                    dataOra: appuntamento.dataOra,
                    durataMinuti: appuntamento.durataMinuti,
                    prestazioneNome: appuntamento.prestazione?.nome || entry.prestazione?.nome || null
                } : null,
                // Include prestazione name from entry if available
                prestazioneNome: appuntamento?.prestazione?.nome || entry.prestazione?.nome || null,
                // Last call info
                lastCall: entry.calls?.[0] || null
            };
        });

        return {
            data: mappedEntries,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Ottiene prossimo da chiamare
     * @param {string} sessionId - ID sessione
     * @param {string} tenantId - ID tenant
     * @param {string} [ambulatorioId] - Filtro ambulatorio
     * @returns {Promise<Object|null>} Prossima entry
     */
    async getNext(sessionId, tenantId, ambulatorioId = null) {
        const where = {
            sessionId,
            tenantId,
            stato: 'IN_ATTESA',
            deletedAt: null
        };

        if (ambulatorioId) {
            where.ambulatorioId = ambulatorioId;
        }

        // Ordina per priorità (EMERGENZA > PRIORITARIO > URGENTE > NORMALE)
        // e poi per numero
        return prisma.numeroChiamata.findFirst({
            where,
            orderBy: [
                { priorita: 'desc' },
                { numero: 'asc' }
            ]
        });
    }

    /**
     * Aggiorna stato entry
     * @param {string} id - ID entry
     * @param {string} tenantId - ID tenant
     * @param {string} stato - Nuovo stato
     * @returns {Promise<Object>} Entry aggiornata
     */
    async updateStatus(id, tenantId, stato) {
        const entry = await this.getById(id, tenantId);
        if (!entry) {
            throw new Error('Entry non trovata');
        }

        const now = new Date();
        const updateData = { stato };

        // Calcola tempi effettivi
        switch (stato) {
            case 'CHIAMATO':
                updateData.dataOraChiamata = now;
                break;
            case 'IN_VISITA':
                // Tempo attesa effettivo = da arrivo a inizio visita
                if (entry.dataOraArrivo) {
                    updateData.tempoAttesaEffettivo = Math.round(
                        (now.getTime() - new Date(entry.dataOraArrivo).getTime()) / 60000
                    );
                }
                break;
            case 'COMPLETATO':
            case 'NON_PRESENTATO':
            case 'RIMANDATO':
                updateData.dataOraFine = now;
                break;
        }

        const updated = await prisma.numeroChiamata.update({
            where: { id },
            data: updateData
        });

        logger.info('Queue entry status updated', {
            service: 'QueueEntryService',
            entryId: id,
            oldStatus: entry.stato,
            newStatus: stato,
            tenantId
        });

        return updated;
    }

    /**
     * Aggiorna priorità entry
     * @param {string} id - ID entry
     * @param {string} tenantId - ID tenant
     * @param {'NORMALE'|'URGENTE'|'PRIORITARIO'|'EMERGENZA'} priorita - Nuova priorità
     * @returns {Promise<Object>} Entry aggiornata
     */
    async updatePriority(id, tenantId, priorita) {
        const entry = await this.getById(id, tenantId);
        if (!entry) {
            throw new Error('Entry non trovata');
        }

        const updated = await prisma.numeroChiamata.update({
            where: { id },
            data: { priorita }
        });

        logger.info('Queue entry priority updated', {
            service: 'QueueEntryService',
            entryId: id,
            oldPriority: entry.priorita,
            newPriority: priorita,
            tenantId
        });

        return updated;
    }

    /**
     * Calcola posizione in coda
     * @param {string} id - ID entry
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Posizione info
     */
    async getPosition(id, tenantId) {
        const entry = await this.getById(id, tenantId);
        if (!entry) {
            throw new Error('Entry non trovata');
        }

        if (entry.stato !== 'IN_ATTESA') {
            return {
                position: 0,
                entriesBefore: 0,
                estimatedWaitMinutes: 0,
                status: entry.stato
            };
        }

        // Conta quanti sono prima di questo
        const entriesBefore = await prisma.numeroChiamata.count({
            where: {
                sessionId: entry.sessionId,
                stato: 'IN_ATTESA',
                deletedAt: null,
                OR: [
                    // Stessa priorità ma numero minore
                    {
                        priorita: entry.priorita,
                        numero: { lt: entry.numero }
                    },
                    // Priorità maggiore
                    ...(entry.priorita === 'NORMALE' ? [
                        { priorita: { in: ['URGENTE', 'PRIORITARIO', 'EMERGENZA'] } }
                    ] : []),
                    ...(entry.priorita === 'URGENTE' ? [
                        { priorita: { in: ['PRIORITARIO', 'EMERGENZA'] } }
                    ] : []),
                    ...(entry.priorita === 'PRIORITARIO' ? [
                        { priorita: 'EMERGENZA' }
                    ] : [])
                ]
            }
        });

        const DURATA_MEDIA = 15;
        const estimatedWaitMinutes = Math.ceil(entriesBefore * DURATA_MEDIA * 1.1);

        return {
            position: entriesBefore + 1,
            entriesBefore,
            estimatedWaitMinutes,
            status: entry.stato
        };
    }

    /**
     * Soft delete entry
     * @param {string} id - ID entry
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Entry eliminata
     */
    async delete(id, tenantId) {
        const entry = await this.getById(id, tenantId);
        if (!entry) {
            throw new Error('Entry non trovata');
        }

        const deleted = await prisma.numeroChiamata.update({
            where: { id },
            data: { deletedAt: new Date() }
        });

        logger.info('Queue entry deleted', {
            service: 'QueueEntryService',
            entryId: id,
            tenantId
        });

        return deleted;
    }

    /**
     * Registra push token per notifiche
     * @param {string} id - ID entry
     * @param {string} tenantId - ID tenant
     * @param {string} pushToken - Token push notification
     * @returns {Promise<Object>} Entry aggiornata
     */
    async registerPushToken(id, tenantId, pushToken) {
        const entry = await this.getById(id, tenantId);
        if (!entry) {
            throw new Error('Entry non trovata');
        }

        return prisma.numeroChiamata.update({
            where: { id },
            data: { pushToken }
        });
    }

    /**
     * Aggiorna stime tempo per tutta la sessione
     * @param {string} sessionId - ID sessione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<number>} Numero entries aggiornate
     */
    async updateAllEstimates(sessionId, tenantId) {
        const entries = await prisma.numeroChiamata.findMany({
            where: {
                sessionId,
                tenantId,
                stato: 'IN_ATTESA',
                deletedAt: null
            },
            orderBy: [
                { priorita: 'desc' },
                { numero: 'asc' }
            ]
        });

        const DURATA_MEDIA = 15;
        let position = 0;

        for (const entry of entries) {
            const tempoAttesaStimato = Math.ceil(position * DURATA_MEDIA * 1.1);

            await prisma.numeroChiamata.update({
                where: { id: entry.id },
                data: {
                    tempoAttesaStimato,
                    postioneInCoda: position + 1
                }
            });

            position++;
        }

        logger.info('Queue estimates updated', {
            service: 'QueueEntryService',
            sessionId,
            entriesUpdated: entries.length
        });

        return entries.length;
    }

    /**
     * Complete queue entry by appuntamento ID
     * Used when a visit is completed to mark the queue entry as COMPLETATO
     * @param {string} appuntamentoId - ID of the appointment
     * @param {string} tenantId - Tenant ID for validation
     * @returns {Promise<Object|null>} Updated entry or null if not found
     */
    async completeByAppuntamento(appuntamentoId, tenantId) {
        // Find queue entry linked to this appointment
        const entry = await prisma.numeroChiamata.findFirst({
            where: {
                appuntamentoId,
                tenantId,
                deletedAt: null,
                stato: { in: ['IN_ATTESA', 'CHIAMATO', 'IN_VISITA'] }
            }
        });

        if (!entry) {
            logger.debug('No queue entry found for appuntamento', {
                service: 'QueueEntryService',
                appuntamentoId,
                tenantId
            });
            return null;
        }

        // Update status to COMPLETATO
        const updated = await prisma.numeroChiamata.update({
            where: { id: entry.id },
            data: {
                stato: 'COMPLETATO',
                dataOraFine: new Date()
            }
        });

        logger.info('Queue entry completed via visita termina', {
            service: 'QueueEntryService',
            entryId: entry.id,
            appuntamentoId,
            displayNumber: entry.displayNumber,
            tenantId
        });

        return updated;
    }
}

export default new QueueEntryService();
