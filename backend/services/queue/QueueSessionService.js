/**
 * QueueSessionService - Gestione sessioni coda
 * Progetto 53: Sistema gestione code pazienti
 * 
 * Responsabilità:
 * - CRUD sessioni coda (giornaliere/per slot)
 * - Generazione automatica numeri da appuntamenti
 * - Gestione QR code per modalità Mobile
 * - Configurazione sessione (Display/Mobile rules)
 * 
 * @module services/queue/QueueSessionService
 */

import prisma from '../../config/prisma-optimization.js';
import crypto from 'crypto';
import { logger } from '../../utils/logger.js';

/**
 * Normalize a date to UTC midnight for Prisma @db.Date columns.
 * CRITICAL: date-fns startOfDay() uses LOCAL timezone which shifts dates
 * on CET/CEST servers (e.g. Feb 10 00:00 UTC → Feb 9 23:00 UTC in CET).
 * This function always produces UTC midnight for the date's UTC components.
 * @param {Date|string} date - Date to normalize
 * @returns {Date} Date at UTC midnight
 */
function toUTCMidnight(date) {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Get end of day in UTC (23:59:59.999) for date range queries.
 * @param {Date|string} date - Date to get end of day for
 * @returns {Date} Date at UTC 23:59:59.999
 */
function toUTCEndOfDay(date) {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

/**
 * @typedef {Object} DisplayQueueConfig
 * @property {boolean} resetDaily - Reset automatico giornaliero
 * @property {number} resetHour - Ora reset (0-23)
 * @property {string} prefix - Prefisso numero (es. "A-")
 * @property {number} digitCount - Numero cifre (2 o 3)
 * @property {boolean} autoGenerateFromAppointments - Genera da appuntamenti
 * @property {number} bufferExtraNumbers - Numeri extra
 * @property {boolean} allowAddAfterGeneration - Permetti aggiunta
 * @property {'list'|'tickets'|'both'} printFormat - Formato stampa
 * @property {boolean} showMedicoName - Mostra nome medico su display
 * @property {boolean} showAmbulatorioName - Mostra nome ambulatorio
 * @property {boolean} enableAudio - Abilita audio
 * @property {'beep'|'tts'|'both'} audioType - Tipo audio
 */

/**
 * @typedef {Object} MobileQueueConfig
 * @property {boolean} isEnabled - Abilitata
 * @property {boolean} allowPatientChoosePrestazione - Paziente sceglie prestazione
 * @property {string[]} prestazioniDisponibili - ID prestazioni disponibili
 * @property {string} prestazioneDefault - ID prestazione default
 * @property {boolean} allowPatientChooseSlot - Paziente sceglie slot
 * @property {number} slotDurationMinutes - Durata slot minuti
 * @property {boolean} allowNewPatients - Permetti nuovi pazienti
 * @property {boolean} requireConsensoPrivacy - Richiedi consenso
 * @property {string[]} requiredFields - Campi obbligatori
 * @property {boolean} enablePushNotifications - Notifiche push
 * @property {boolean} enableSmsNotifications - Notifiche SMS
 * @property {number} notifyMinutesBefore - Minuti prima notifica
 * @property {number} maxQueueSize - Max dimensione coda
 * @property {number} cutoffMinutesBeforeEnd - Cutoff minuti prima fine
 */

class QueueSessionService {
    /**
     * Genera un token sicuro per QR code
     * @returns {string} Token base64url
     */
    generateQueueToken() {
        return crypto.randomBytes(16).toString('base64url');
    }

    /**
     * Verifica se esiste già una sessione per data/ambulatorio/mode/slot
     * Supporta fallback per multi-medico: se la ricerca per slotDisponibilitaId
     * non trova risultati, cerca sessioni dove il medico è membro (QueueSessionMedico)
     * @param {Object} params
     * @param {string} params.tenantId
     * @param {Date} params.date
     * @param {string} [params.ambulatorioId]
     * @param {string} params.mode
     * @param {string} [params.slotDisponibilitaId] - Per sessioni Mobile legate a slot (P54)
     * @param {string} [params.medicoPersonId] - Person.id del medico, per fallback multi-medico
     * @returns {Promise<Object|null>} Sessione esistente o null
     */
    async checkExisting({ tenantId, date, ambulatorioId, mode, slotDisponibilitaId, medicoPersonId }) {
        // Build dynamic where clause
        const whereClause = {
            tenantId,
            date: toUTCMidnight(date),
            mode,
            isActive: true,
            deletedAt: null
        };

        // P54: Se slotDisponibilitaId è fornito, cerca per slot specifico (Mobile mode)
        // Altrimenti cerca per ambulatorio (DISPLAY mode)
        if (slotDisponibilitaId) {
            whereClause.slotDisponibilitaId = slotDisponibilitaId;
        } else {
            whereClause.ambulatorioId = ambulatorioId || null;
        }

        const sessionInclude = {
            ambulatorio: {
                select: { id: true, nome: true, codice: true }
            },
            _count: {
                select: { entries: true }
            }
        };

        const result = await prisma.queueSession.findFirst({
            where: whereClause,
            include: sessionInclude
        });

        if (result) return result;

        // Fallback multi-medico: se non trovata per slotDisponibilitaId,
        // cerca sessioni dove il medico è membro tramite QueueSessionMedico
        if (slotDisponibilitaId && medicoPersonId) {
            // Resolve medicoPersonId (Person.id) → PersonTenantProfile.id
            const profile = await prisma.personTenantProfile.findFirst({
                where: { personId: medicoPersonId, tenantId, deletedAt: null }
            });

            if (profile) {
                return prisma.queueSession.findFirst({
                    where: {
                        tenantId,
                        date: toUTCMidnight(date),
                        mode,
                        isActive: true,
                        deletedAt: null,
                        medici: {
                            some: { medicoId: profile.id }
                        }
                    },
                    include: sessionInclude
                });
            }
        }

        return null;
    }

    /**
     * Crea una nuova sessione coda
     * @param {Object} data - Dati sessione
     * @param {string} data.tenantId - ID tenant
     * @param {Date} data.date - Data sessione
     * @param {string} [data.ambulatorioId] - ID ambulatorio principale
     * @param {'DISPLAY'|'MOBILE'} data.mode - Modalità
     * @param {Object} [data.config] - Configurazione
     * @param {string} [data.slotDisponibilitaId] - ID slot disponibilità (P54: rinominato)
     * @param {string[]} [data.mediciIds] - IDs medici per multi-medico
     * @param {string[]} [data.ambulatoriIds] - IDs ambulatori per multi-ambulatorio
     * @returns {Promise<Object>} Sessione creata
     */
    async create(data) {
        const {
            tenantId,
            date,
            ambulatorioId,
            mode,
            config,
            slotDisponibilitaId,
            mediciIds = [],
            ambulatoriIds = []
        } = data;

        // P54: Verifica unicità per slot disponibilità (se fornito) o per ambulatorio
        const whereClause = {
            tenantId,
            date: toUTCMidnight(date),
            mode,
            isActive: true,
            deletedAt: null
        };

        // Se slotDisponibilitaId è fornito, controlla unicità per slot
        if (slotDisponibilitaId) {
            whereClause.slotDisponibilitaId = slotDisponibilitaId;
        } else {
            whereClause.ambulatorioId = ambulatorioId || null;
        }

        const existing = await prisma.queueSession.findFirst({
            where: whereClause
        });

        if (existing) {
            const errorMsg = slotDisponibilitaId
                ? 'Esiste già una sessione attiva per questo slot di disponibilità'
                : 'Esiste già una sessione attiva per questa data e ambulatorio';
            throw new Error(errorMsg);
        }

        // Genera QR token solo per modalità Mobile
        let qrCodeToken = null;
        let qrCodeUrl = null;
        if (mode === 'MOBILE') {
            qrCodeToken = this.generateQueueToken();
            // URL base configurabile
            const baseUrl = process.env.PUBLIC_URL || 'https://app.element-srl.it';
            qrCodeUrl = `${baseUrl}/queue/join/${qrCodeToken}`;
        }

        // P53: Risolvi Person.id → PersonTenantProfile.id per FK QueueSessionMedico
        // SlotDisponibilita.medicoId punta a Person.id, ma QueueSessionMedico.medicoId → PersonTenantProfile.id
        let resolvedMediciIds = [];
        if (mediciIds.length > 0) {
            const profiles = await prisma.personTenantProfile.findMany({
                where: {
                    personId: { in: mediciIds },
                    tenantId,
                    deletedAt: null
                },
                select: { id: true, personId: true }
            });

            resolvedMediciIds = profiles.map(p => p.id);

            if (resolvedMediciIds.length === 0) {
                // Check if the IDs are already PersonTenantProfile.ids (not Person.ids)
                const existingProfiles = await prisma.personTenantProfile.findMany({
                    where: {
                        id: { in: mediciIds },
                        tenantId,
                        deletedAt: null
                    },
                    select: { id: true }
                });

                if (existingProfiles.length > 0) {
                    resolvedMediciIds = existingProfiles.map(p => p.id);
                    logger.info('mediciIds are already PersonTenantProfile IDs', {
                        service: 'QueueSessionService',
                        mediciIds,
                        resolvedMediciIds,
                        tenantId
                    });
                } else {
                    logger.error('No PersonTenantProfile found for mediciIds - cannot create session medici', {
                        service: 'QueueSessionService',
                        mediciIds,
                        tenantId
                    });
                    // Skip medici creation instead of causing FK violation
                    resolvedMediciIds = [];
                }
            }
        }

        // Prepara dati per creazione multi-medico/ambulatorio
        const mediciData = resolvedMediciIds.length > 0
            ? {
                create: resolvedMediciIds.map((medicoId, index) => ({
                    medicoId,
                    ordine: index,
                    isPrimary: index === 0
                }))
            }
            : undefined;

        const ambulatoriData = ambulatoriIds.length > 0
            ? {
                create: ambulatoriIds.map((ambulatorioId, index) => ({
                    ambulatorioId,
                    ordine: index,
                    isPrimary: index === 0
                }))
            }
            : undefined;

        // When linked to a SlotDisponibilita, use the SLOT's date as authoritative
        // to avoid timezone issues with toUTCMidnight on local-offset date input
        let sessionDate = toUTCMidnight(date);
        if (slotDisponibilitaId) {
            const slot = await prisma.slotDisponibilita.findFirst({
                where: { id: slotDisponibilitaId, deletedAt: null },
                select: { data: true }
            });
            if (slot?.data) {
                sessionDate = new Date(slot.data);
                logger.info({ slotDate: sessionDate.toISOString(), inputDate: date }, 'Using slot date as authoritative for session');
            }
        }

        const session = await prisma.queueSession.create({
            data: {
                tenantId,
                date: sessionDate,
                ambulatorioId,
                mode,
                config: config || this.getDefaultConfig(mode),
                slotDisponibilitaId,
                qrCodeToken,
                qrCodeUrl,
                isActive: true,
                currentNumber: 0,
                startedAt: new Date(),
                // P53.2: Multi-medico e multi-ambulatorio
                medici: mediciData,
                ambulatori: ambulatoriData
            },
            include: {
                ambulatorio: {
                    select: {
                        id: true,
                        codice: true,
                        nome: true,
                        colore: true
                    }
                },
                medici: {
                    include: {
                        medico: {
                            include: {
                                person: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                        gender: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { ordine: 'asc' }
                },
                ambulatori: {
                    include: {
                        ambulatorio: {
                            select: {
                                id: true,
                                codice: true,
                                nome: true,
                                colore: true,
                                indicazioniPaziente: true,
                                isEsterno: true
                            }
                        }
                    },
                    orderBy: { ordine: 'asc' }
                }
            }
        });

        logger.info('Queue session created', {
            service: 'QueueSessionService',
            sessionId: session.id,
            tenantId,
            mode,
            mediciCount: mediciIds.length,
            ambulatoriCount: ambulatoriIds.length,
            date: date.toISOString()
        });

        return session;
    }

    /**
     * Ottiene configurazione default per modalità
     * @param {'DISPLAY'|'MOBILE'} mode - Modalità
     * @returns {Object} Configurazione default
     */
    getDefaultConfig(mode) {
        if (mode === 'DISPLAY') {
            return {
                resetDaily: true,
                resetHour: 6,
                prefix: '',
                digitCount: 2,
                autoGenerateFromAppointments: true,
                bufferExtraNumbers: 5,
                allowAddAfterGeneration: true,
                printFormat: 'list',
                showMedicoName: true,
                showAmbulatorioName: true,
                enableAudio: true,
                audioType: 'beep'
            };
        }

        // MOBILE
        return {
            isEnabled: true,
            allowPatientChoosePrestazione: false,
            prestazioniDisponibili: [],
            prestazioneDefault: null,
            allowPatientChooseSlot: false,
            slotDurationMinutes: 15,
            allowNewPatients: true,
            requireConsensoPrivacy: true,
            requiredFields: ['firstName', 'lastName', 'phone'],
            enablePushNotifications: true,
            enableSmsNotifications: false,
            notifyMinutesBefore: 10,
            maxQueueSize: 50,
            cutoffMinutesBeforeEnd: 30
        };
    }

    /**
     * Ottiene sessione per ID
     * @param {string} id - ID sessione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object|null>} Sessione
     */
    async getById(id, tenantId) {
        return prisma.queueSession.findFirst({
            where: {
                id,
                tenantId,
                deletedAt: null
            },
            include: {
                ambulatorio: {
                    select: {
                        id: true,
                        codice: true,
                        nome: true,
                        colore: true,
                        specializzazione: true,
                        indicazioniPaziente: true,
                        isEsterno: true
                    }
                },
                // Include slot disponibilità for time range filtering
                slotDisponibilita: {
                    select: {
                        id: true,
                        oraInizio: true,
                        oraFine: true,
                        data: true,
                        medicoId: true,
                        ambulatorioId: true
                    }
                },
                // P53.2: Multi-medico
                medici: {
                    include: {
                        medico: {
                            include: {
                                person: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                        gender: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { ordine: 'asc' }
                },
                // P53.2: Multi-ambulatorio
                ambulatori: {
                    include: {
                        ambulatorio: {
                            select: {
                                id: true,
                                codice: true,
                                nome: true,
                                colore: true,
                                indicazioniPaziente: true,
                                isEsterno: true
                            }
                        }
                    },
                    orderBy: { ordine: 'asc' }
                },
                entries: {
                    where: { deletedAt: null },
                    orderBy: { numero: 'asc' },
                    take: 100
                },
                _count: {
                    select: {
                        entries: {
                            where: { stato: 'IN_ATTESA', deletedAt: null }
                        }
                    }
                }
            }
        });
    }

    /**
     * Ottiene sessione per token QR (endpoint pubblico)
     * @param {string} token - Token QR code
     * @returns {Promise<Object|null>} Sessione
     */
    async getByToken(token) {
        const session = await prisma.queueSession.findFirst({
            where: { qrCodeToken: token },
            include: {
                ambulatorio: {
                    select: {
                        id: true,
                        codice: true,
                        nome: true
                    }
                }
            }
        });

        if (!session || !session.isActive || session.deletedAt) {
            return null;
        }

        return session;
    }

    /**
     * Ottiene sessione per token QR con verifica tenant
     * @param {string} token - Token QR code
     * @param {string} tenantId - ID tenant per verifica
     * @returns {Promise<Object|null>} Sessione
     */
    async getByQrToken(token, tenantId) {
        const session = await prisma.queueSession.findFirst({
            where: {
                qrCodeToken: token,
                tenantId,
                deletedAt: null
            },
            include: {
                ambulatorio: {
                    select: {
                        id: true,
                        codice: true,
                        nome: true,
                        colore: true
                    }
                },
                entries: {
                    where: { deletedAt: null },
                    orderBy: { numero: 'asc' },
                    take: 100
                }
            }
        });

        if (!session || !session.isActive) {
            return null;
        }

        return session;
    }

    /**
     * Recupera sessione via QR token (versione pubblica - no tenantId filter)
     * Usato dagli endpoint pubblici per il mobile check-in
     * 
     * @param {string} token - Token QR code
     * @returns {Promise<Object|null>} Sessione con info medico e ambulatorio
     */
    async getByQrTokenPublic(token) {
        const session = await prisma.queueSession.findFirst({
            where: {
                qrCodeToken: token,
                deletedAt: null
            },
            include: {
                ambulatorio: {
                    select: {
                        id: true,
                        codice: true,
                        nome: true,
                        specializzazione: true,
                        indicazioniPaziente: true,
                        isEsterno: true
                    }
                },
                // P53.2: Include multi-medico per mostrare lista medici
                medici: {
                    include: {
                        medico: {
                            include: {
                                person: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                        gender: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { ordine: 'asc' }
                },
                // P53.2: Include multi-ambulatorio con indicazioni
                ambulatori: {
                    include: {
                        ambulatorio: {
                            select: {
                                id: true,
                                codice: true,
                                nome: true,
                                indicazioniPaziente: true,
                                isEsterno: true
                            }
                        }
                    },
                    orderBy: { ordine: 'asc' }
                },
                // Include slot disponibilità per filtrare appuntamenti per fascia oraria
                slotDisponibilita: {
                    select: {
                        id: true,
                        oraInizio: true,
                        oraFine: true,
                        data: true,
                        medicoId: true,
                        ambulatorioId: true,
                        prestazioneId: true
                    }
                }
            }
        });

        if (!session) {
            return null;
        }

        // Log accesso pubblico per audit
        logger.info({
            sessionId: session.id,
            tenantId: session.tenantId,
            token: token.substring(0, 8) + '...'
        }, 'QueueSessionService.getByQrTokenPublic - Public access');

        return session;
    }

    /**
     * Lista sessioni per tenant con filtri
     * @param {Object} params - Parametri ricerca
     * @param {string} params.tenantId - ID tenant
     * @param {Date} [params.date] - Data specifica
     * @param {Date} [params.dateFrom] - Data inizio range
     * @param {Date} [params.dateTo] - Data fine range
     * @param {'DISPLAY'|'MOBILE'} [params.mode] - Filtro modalità
     * @param {boolean} [params.isActive] - Filtro attive
     * @param {string} [params.ambulatorioId] - Filtro ambulatorio
     * @param {number} [params.page=1] - Pagina
     * @param {number} [params.limit=20] - Limite
     * @returns {Promise<Object>} Lista paginata
     */
    async list(params) {
        const {
            tenantId,
            date,
            dateFrom,
            dateTo,
            mode,
            isActive,
            ambulatorioId,
            page = 1,
            limit = 20
        } = params;

        const where = {
            tenantId,
            deletedAt: null
        };

        // Filtri data
        if (date) {
            where.date = toUTCMidnight(date);
        } else if (dateFrom || dateTo) {
            where.date = {};
            if (dateFrom) where.date.gte = toUTCMidnight(dateFrom);
            if (dateTo) where.date.lte = toUTCEndOfDay(dateTo);
        }

        if (mode) where.mode = mode;
        if (typeof isActive === 'boolean') where.isActive = isActive;
        if (ambulatorioId) where.ambulatorioId = ambulatorioId;

        const [total, sessions] = await Promise.all([
            prisma.queueSession.count({ where }),
            prisma.queueSession.findMany({
                where,
                include: {
                    ambulatorio: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            colore: true
                        }
                    },
                    medici: {
                        include: {
                            medico: {
                                select: {
                                    id: true,
                                    personId: true,
                                    person: {
                                        select: {
                                            firstName: true,
                                            lastName: true,
                                            gender: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    // P53.2: Multi-ambulatorio — needed for per-medico ambulatorio display
                    ambulatori: {
                        include: {
                            ambulatorio: {
                                select: {
                                    id: true,
                                    codice: true,
                                    nome: true,
                                    colore: true
                                }
                            }
                        },
                        orderBy: { ordine: 'asc' }
                    },
                    // Include slot per risolvere ambulatorio per-medico
                    slotDisponibilita: {
                        select: {
                            id: true,
                            data: true,
                            medicoId: true,
                            ambulatorioId: true,
                            ambulatorio: { select: { id: true, nome: true, codice: true } }
                        }
                    },
                    _count: {
                        select: {
                            entries: true,
                            calls: true
                        }
                    }
                },
                orderBy: [
                    { date: 'desc' },
                    { createdAt: 'desc' }
                ],
                skip: (page - 1) * limit,
                take: limit
            })
        ]);

        // Post-process: risolvi ambulatorio per-medico
        for (const session of sessions) {
            if (session.medici?.length > 0) {
                const slotAmbId = session.slotDisponibilita?.ambulatorioId;
                const slotAmb = session.slotDisponibilita?.ambulatorio;
                // Use slot date as authoritative (session.date may have timezone offset)
                const effectiveSlotDate = session.slotDisponibilita?.data
                    ? new Date(session.slotDisponibilita.data)
                    : new Date(session.date);
                for (const sm of session.medici) {
                    // Se lo slot appartiene a questo medico, usa l'ambulatorio dello slot
                    if (slotAmbId && session.slotDisponibilita?.medicoId === sm.medico?.personId) {
                        sm._ambulatorio = slotAmb;
                    } else {
                        // Cerca slot per questo medico nella stessa data
                        const medicoSlot = await prisma.slotDisponibilita.findFirst({
                            where: {
                                tenantId: session.tenantId,
                                medicoId: sm.medico?.personId,
                                data: effectiveSlotDate,
                                deletedAt: null
                            },
                            select: { ambulatorio: { select: { id: true, nome: true, codice: true } } }
                        });
                        sm._ambulatorio = medicoSlot?.ambulatorio || session.ambulatorio || null;
                    }
                }
            }
        }

        return {
            data: sessions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Aggiorna sessione
     * @param {string} id - ID sessione
     * @param {string} tenantId - ID tenant
     * @param {Object} data - Dati da aggiornare
     * @returns {Promise<Object>} Sessione aggiornata
     */
    async update(id, tenantId, data) {
        const session = await this.getById(id, tenantId);
        if (!session) {
            throw new Error('Sessione non trovata');
        }

        const { config, isActive, ambulatorioId } = data;

        const updated = await prisma.queueSession.update({
            where: { id },
            data: {
                ...(config && { config }),
                ...(typeof isActive === 'boolean' && { isActive }),
                ...(ambulatorioId !== undefined && { ambulatorioId }),
                ...(isActive === false && { endedAt: new Date() })
            },
            include: {
                ambulatorio: {
                    select: {
                        id: true,
                        codice: true,
                        nome: true
                    }
                }
            }
        });

        logger.info('Queue session updated', {
            service: 'QueueSessionService',
            sessionId: id,
            tenantId,
            changes: Object.keys(data)
        });

        return updated;
    }

    /**
     * Aggiunge un medico alla sessione coda
     * Risolve Person.id → PersonTenantProfile.id per FK QueueSessionMedico
     * @param {string} sessionId - ID sessione
     * @param {string} tenantId - ID tenant
     * @param {string} medicoPersonId - Person.id del medico (da SlotDisponibilita.medicoId)
     * @returns {Promise<Object>} Record QueueSessionMedico creato
     */
    async addMedico(sessionId, tenantId, medicoPersonId) {
        const session = await this.getById(sessionId, tenantId);
        if (!session) throw new Error('Sessione non trovata');

        // Resolve Person.id → PersonTenantProfile.id
        let profileId = null;
        const profile = await prisma.personTenantProfile.findFirst({
            where: { personId: medicoPersonId, tenantId, deletedAt: null },
            select: { id: true }
        });

        if (profile) {
            profileId = profile.id;
        } else {
            // Check if it's already a PersonTenantProfile.id
            const existing = await prisma.personTenantProfile.findFirst({
                where: { id: medicoPersonId, tenantId, deletedAt: null },
                select: { id: true }
            });
            if (existing) {
                profileId = existing.id;
            }
        }

        if (!profileId) {
            throw new Error('Medico non trovato nel tenant corrente');
        }

        // Get current max ordine
        const maxOrdine = await prisma.queueSessionMedico.aggregate({
            where: { sessionId },
            _max: { ordine: true }
        });
        const nextOrdine = (maxOrdine._max.ordine ?? -1) + 1;

        const record = await prisma.queueSessionMedico.create({
            data: {
                sessionId,
                medicoId: profileId,
                ordine: nextOrdine,
                isPrimary: false
            },
            include: {
                medico: {
                    select: {
                        id: true,
                        personId: true,
                        person: {
                            select: { firstName: true, lastName: true, gender: true }
                        }
                    }
                }
            }
        });

        logger.info({
            sessionId,
            medicoProfileId: profileId,
            medicoPersonId,
            tenantId
        }, 'QueueSessionService.addMedico: medico added to session');

        return record;
    }

    /**
     * Rimuove un medico dalla sessione coda
     * @param {string} sessionId - ID sessione
     * @param {string} tenantId - ID tenant
     * @param {string} medicoId - PersonTenantProfile.id o QueueSessionMedico.id
     * @returns {Promise<boolean>} true se rimosso
     */
    async removeMedico(sessionId, tenantId, medicoId) {
        const session = await this.getById(sessionId, tenantId);
        if (!session) throw new Error('Sessione non trovata');

        // Try to find by medicoId (PersonTenantProfile.id)
        let record = await prisma.queueSessionMedico.findFirst({
            where: { sessionId, medicoId }
        });

        // Fallback: try by id (QueueSessionMedico.id)
        if (!record) {
            record = await prisma.queueSessionMedico.findFirst({
                where: { id: medicoId, sessionId }
            });
        }

        if (!record) {
            throw new Error('Medico non associato a questa sessione');
        }

        await prisma.queueSessionMedico.delete({
            where: { id: record.id }
        });

        logger.info({
            sessionId,
            medicoId,
            recordId: record.id,
            tenantId
        }, 'QueueSessionService.removeMedico: medico removed from session');

        return true;
    }

    /**
     * Trova medici disponibili (con SlotDisponibilita) per una data e tenant
     * Esclude i medici già associati alla sessione
     * @param {string} sessionId - ID sessione
     * @param {string} tenantId - ID tenant
     * @param {Date} date - Data
     * @returns {Promise<Object[]>} Lista medici con slot disponibilità
     */
    async getAvailableMedici(sessionId, tenantId, date) {
        // Get medici already in session
        const existingMedici = await prisma.queueSessionMedico.findMany({
            where: { sessionId },
            select: { medico: { select: { personId: true } } }
        });
        const existingPersonIds = existingMedici.map(sm => sm.medico.personId);

        // Find medici with SlotDisponibilita on this date in this tenant
        const sessionDate = new Date(date);
        const startOfDay = new Date(Date.UTC(
            sessionDate.getUTCFullYear(), sessionDate.getUTCMonth(), sessionDate.getUTCDate(), 0, 0, 0, 0
        ));
        const endOfDay = new Date(Date.UTC(
            sessionDate.getUTCFullYear(), sessionDate.getUTCMonth(), sessionDate.getUTCDate(), 23, 59, 59, 999
        ));

        const slots = await prisma.slotDisponibilita.findMany({
            where: {
                tenantId,
                data: { gte: startOfDay, lte: endOfDay },
                disponibile: true,
                deletedAt: null,
                ...(existingPersonIds.length > 0 && {
                    medicoId: { notIn: existingPersonIds }
                })
            },
            select: {
                medicoId: true,
                oraInizio: true,
                oraFine: true,
                ambulatorioId: true,
                medico: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        gender: true
                    }
                },
                ambulatorio: {
                    select: {
                        id: true,
                        nome: true,
                        codice: true
                    }
                }
            },
            orderBy: { oraInizio: 'asc' }
        });

        // Group by medicoId to get unique medici with their time ranges
        const mediciMap = new Map();
        for (const slot of slots) {
            if (!mediciMap.has(slot.medicoId)) {
                mediciMap.set(slot.medicoId, {
                    personId: slot.medicoId,
                    firstName: slot.medico.firstName,
                    lastName: slot.medico.lastName,
                    gender: slot.medico.gender,
                    slots: [],
                    ambulatori: new Set()
                });
            }
            const entry = mediciMap.get(slot.medicoId);
            entry.slots.push({ oraInizio: slot.oraInizio, oraFine: slot.oraFine });
            if (slot.ambulatorio) {
                entry.ambulatori.add(JSON.stringify({
                    id: slot.ambulatorio.id,
                    nome: slot.ambulatorio.nome,
                    codice: slot.ambulatorio.codice
                }));
            }
        }

        return Array.from(mediciMap.values()).map(m => ({
            ...m,
            ambulatori: Array.from(m.ambulatori).map(a => JSON.parse(a))
        }));
    }

    /**
     * Chiude una sessione
     * @param {string} id - ID sessione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Sessione chiusa
     */
    async close(id, tenantId) {
        return this.update(id, tenantId, {
            isActive: false
        });
    }

    /**
     * Soft delete sessione
     * @param {string} id - ID sessione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Sessione eliminata
     */
    async delete(id, tenantId) {
        const session = await this.getById(id, tenantId);
        if (!session) {
            throw new Error('Sessione non trovata');
        }

        const deleted = await prisma.queueSession.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                isActive: false,
                endedAt: new Date()
            }
        });

        logger.info('Queue session deleted', {
            service: 'QueueSessionService',
            sessionId: id,
            tenantId
        });

        return deleted;
    }

    /**
     * Genera numeri da appuntamenti del giorno
     * Filtra per finestra temporale dello slot disponibilità se presente
     * @param {string} sessionId - ID sessione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object[]>} Numeri generati
     */
    async generateFromAppointments(sessionId, tenantId) {
        const session = await this.getById(sessionId, tenantId);
        if (!session) {
            throw new Error('Sessione non trovata');
        }

        // Build time range: use slot's oraInizio/oraFine if available, otherwise full day
        let timeStart, timeEnd;
        const sessionDate = new Date(session.date);

        if (session.slotDisponibilita?.oraInizio && session.slotDisponibilita?.oraFine) {
            // Narrow to slot time window for precise filtering
            const [startH, startM] = session.slotDisponibilita.oraInizio.split(':').map(Number);
            const [endH, endM] = session.slotDisponibilita.oraFine.split(':').map(Number);
            timeStart = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), startH, startM, 0, 0);
            timeEnd = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), endH, endM, 59, 999);
            logger.info('generateFromAppointments: filtering by slot time range', {
                service: 'QueueSessionService', sessionId, tenantId,
                slotOraInizio: session.slotDisponibilita.oraInizio,
                slotOraFine: session.slotDisponibilita.oraFine
            });
        } else {
            timeStart = toUTCMidnight(session.date);
            timeEnd = toUTCEndOfDay(session.date);
        }

        // Build medico filter from session medici or slot medicoId
        const medicoIds = [];
        if (session.medici?.length > 0) {
            medicoIds.push(...session.medici.map(m => m.medico?.personId || m.medicoId).filter(Boolean));
        } else if (session.slotDisponibilita?.medicoId) {
            medicoIds.push(session.slotDisponibilita.medicoId);
        }

        // Ottieni appuntamenti filtrati per finestra temporale e medico
        const appuntamenti = await prisma.appuntamento.findMany({
            where: {
                tenantId,
                dataOra: {
                    gte: timeStart,
                    lt: timeEnd
                },
                stato: { in: ['PRENOTATO', 'CONFERMATO'] },
                deletedAt: null,
                // Filter by medico if session has associated medici
                ...(medicoIds.length > 0 && { medicoId: { in: medicoIds } }),
                // Filter by ambulatorio from slot (live) or session (fallback)
                ...(session.slotDisponibilita?.ambulatorioId
                    ? { ambulatorioId: session.slotDisponibilita.ambulatorioId }
                    : session.ambulatorioId ? { ambulatorioId: session.ambulatorioId } : {})
            },
            orderBy: { dataOra: 'asc' },
            include: {
                ambulatorio: {
                    select: {
                        id: true,
                        codice: true,
                        nome: true
                    }
                },
                paziente: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        // P53 Fix: Controlla appuntamenti che hanno GIÀ un numero di coda (in qualsiasi sessione)
        // Ogni appuntamento deve corrispondere a UN SOLO numero di queue
        const appuntamentoIds = appuntamenti.map(a => a.id);
        const existingEntries = appuntamentoIds.length > 0
            ? await prisma.numeroChiamata.findMany({
                where: {
                    appuntamentoId: { in: appuntamentoIds },
                    tenantId,
                    deletedAt: null
                },
                select: { appuntamentoId: true, id: true, numero: true, sessionId: true }
            })
            : [];

        const alreadyAssignedIds = new Set(existingEntries.map(e => e.appuntamentoId));
        const toCreate = appuntamenti.filter(a => !alreadyAssignedIds.has(a.id));

        if (alreadyAssignedIds.size > 0) {
            logger.info('Skipping appuntamenti with existing queue entries', {
                service: 'QueueSessionService',
                sessionId,
                skippedCount: alreadyAssignedIds.size,
                totalAppuntamenti: appuntamenti.length,
                toCreateCount: toCreate.length,
                tenantId
            });
        }

        // Ottieni ultimo numero in questa sessione per continuare la sequenza
        const lastEntry = await prisma.numeroChiamata.findFirst({
            where: { sessionId, deletedAt: null },
            orderBy: { numero: 'desc' }
        });
        let currentNumero = lastEntry?.numero || 0;

        // Genera numeri solo per appuntamenti SENZA numero esistente
        const config = session.config || {};
        const digitCount = config.digitCount || 2;

        const entries = [];
        for (const app of toCreate) {
            currentNumero++;
            const sigla = app.ambulatorio?.codice || '';
            const displayNumber = sigla
                ? `${sigla}-${String(currentNumero).padStart(digitCount, '0')}`
                : String(currentNumero).padStart(digitCount, '0');

            const entry = await prisma.numeroChiamata.create({
                data: {
                    numero: currentNumero,
                    pazienteId: app.pazienteId,
                    appuntamentoId: app.id,
                    ambulatorioId: app.ambulatorioId,
                    medicoId: app.medicoId,
                    sessionId: session.id,
                    displayNumber,
                    siglaAmbulatorio: sigla,
                    priorita: 'NORMALE',
                    stato: 'IN_ATTESA',
                    tenantId
                }
            });

            entries.push(entry);
        }

        // Aggiorna currentNumber con l'ultimo numero generato
        if (currentNumero > 0) {
            await prisma.queueSession.update({
                where: { id: sessionId, deletedAt: null },
                data: { currentNumber: currentNumero }
            });
        }

        // Includi anche le entries già esistenti nel risultato per completezza
        const existingEntriesForSession = existingEntries.filter(e => e.sessionId === sessionId);
        if (existingEntriesForSession.length > 0) {
            logger.info('Returning existing entries along with new ones', {
                service: 'QueueSessionService',
                sessionId,
                existingCount: existingEntriesForSession.length,
                newCount: entries.length,
                tenantId
            });
        }

        logger.info('Queue entries generated from appointments', {
            service: 'QueueSessionService',
            sessionId,
            tenantId,
            count: entries.length
        });

        return entries;
    }

    /**
     * Ottiene statistiche sessione
     * @param {string} sessionId - ID sessione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Statistiche
     */
    async getStats(sessionId, tenantId) {
        const session = await this.getById(sessionId, tenantId);
        if (!session) {
            throw new Error('Sessione non trovata');
        }

        // Nota: Le colonne nel DB sono camelCase (non snake_case)
        // Prisma non applica automaticamente la conversione
        const [stats] = await prisma.$queryRaw`
            SELECT 
                COUNT(*) FILTER (WHERE stato = 'IN_ATTESA') as in_attesa,
                COUNT(*) FILTER (WHERE stato = 'CHIAMATO') as chiamati,
                COUNT(*) FILTER (WHERE stato = 'IN_VISITA') as in_visita,
                COUNT(*) FILTER (WHERE stato = 'COMPLETATO') as completati,
                COUNT(*) FILTER (WHERE stato = 'NON_PRESENTATO') as non_presentati,
                COUNT(*) as totale,
                AVG("tempoAttesaEffettivo") FILTER (WHERE "tempoAttesaEffettivo" IS NOT NULL) as tempo_attesa_medio
            FROM numeri_chiamata
            WHERE "sessionId" = ${sessionId}
              AND "tenantId" = ${tenantId}
              AND "deletedAt" IS NULL
        `;

        return {
            inAttesa: Number(stats.in_attesa) || 0,
            chiamati: Number(stats.chiamati) || 0,
            inVisita: Number(stats.in_visita) || 0,
            completati: Number(stats.completati) || 0,
            nonPresentati: Number(stats.non_presentati) || 0,
            totale: Number(stats.totale) || 0,
            tempoAttesaMedio: Math.round(Number(stats.tempo_attesa_medio) || 0)
        };
    }

    /**
     * Ottiene sessione attiva per oggi
     * @param {string} tenantId - ID tenant
     * @param {string} [ambulatorioId] - ID ambulatorio opzionale
     * @param {'DISPLAY'|'MOBILE'} [mode='DISPLAY'] - Modalità
     * @returns {Promise<Object|null>} Sessione attiva
     */
    async getActiveToday(tenantId, ambulatorioId = null, mode = 'DISPLAY') {
        const today = toUTCMidnight(new Date());

        return prisma.queueSession.findFirst({
            where: {
                tenantId,
                date: today,
                mode,
                isActive: true,
                deletedAt: null,
                ...(ambulatorioId && { ambulatorioId })
            },
            include: {
                ambulatorio: {
                    select: {
                        id: true,
                        codice: true,
                        nome: true,
                        colore: true
                    }
                },
                _count: {
                    select: {
                        entries: {
                            where: { stato: 'IN_ATTESA', deletedAt: null }
                        }
                    }
                }
            }
        });
    }

    /**
     * Trova sessione attiva per ambulatorio/slot e data
     * P54: Prima cerca per slotDisponibilitaId, poi fallback ad ambulatorioId
     * Used by AccettazionePage integration for auto-assigning queue numbers
     * @param {string} tenantId - ID tenant
     * @param {string} ambulatorioId - ID ambulatorio
     * @param {string} dateStr - Data in formato YYYY-MM-DD
     * @param {string} [slotDisponibilitaId] - ID slot disponibilità (opzionale)
     * @returns {Promise<Object|null>} Sessione attiva o null
     */
    async findActiveSession(tenantId, ambulatorioId, dateStr, slotDisponibilitaId = null) {
        const targetDate = toUTCMidnight(dateStr);

        // P54: Se slotDisponibilitaId fornito, cerca prima per slot specifico
        if (slotDisponibilitaId) {
            const slotSession = await prisma.queueSession.findFirst({
                where: {
                    tenantId,
                    slotDisponibilitaId,
                    date: targetDate,
                    isActive: true,
                    deletedAt: null
                },
                include: {
                    ambulatorio: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            if (slotSession) {
                logger.debug('Found active session for slot disponibilità', {
                    service: 'QueueSessionService',
                    sessionId: slotSession.id,
                    slotDisponibilitaId,
                    date: dateStr,
                    mode: slotSession.mode,
                    tenantId
                });
                return slotSession;
            }
        }

        // Fallback: cerca per ambulatorioId (includi anche sessioni per-slot)
        const session = await prisma.queueSession.findFirst({
            where: {
                tenantId,
                ambulatorioId,
                date: targetDate,
                isActive: true,
                deletedAt: null
            },
            include: {
                ambulatorio: {
                    select: {
                        id: true,
                        codice: true,
                        nome: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (session) {
            logger.debug('Found active session for ambulatorio (fallback)', {
                service: 'QueueSessionService',
                sessionId: session.id,
                ambulatorioId,
                date: dateStr,
                mode: session.mode,
                tenantId
            });
        }

        return session;
    }
}

export default new QueueSessionService();
