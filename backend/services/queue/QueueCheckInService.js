/**
 * QueueCheckInService - Gestione check-in pazienti via QR/Mobile
 * Progetto 53.1: Sistema gestione code pazienti - Riordinamento arrivi
 * 
 * Responsabilità:
 * - Ricerca paziente per lastName/firstName tra prenotati
 * - Check-in paziente prenotato
 * - Registrazione walk-in con recupero anagrafica
 * - Riordinamento coda in base all'ordine di arrivo (orderByArrival)
 * 
 * P53-S14: Gestione appuntamenti multipli (BOOKED_MULTIPLE)
 * - Quando un paziente ha più appuntamenti nello stesso giorno con medici diversi,
 *   non si auto-seleziona il primo: tutti vengono restituiti al frontend
 *   per selezione manuale via UI dedicata (step 'select-appointment').
 * 
 * @module services/queue/QueueCheckInService
 */

import prisma from '../../config/prisma-optimization.js';
import { logger } from '../../utils/logger.js';
import { generateNameVariants } from '../../utils/nameNormalization.js';

class QueueCheckInService {
    /**
     * Cerca paziente per lastName/firstName nella sessione
     * Restituisce tipo di match: BOOKED, KNOWN_WALKIN, NEW_WALKIN, NOT_FOUND
     * 
     * @param {string} sessionId - ID sessione
     * @param {string} lastName - Cognome paziente (obbligatorio)
     * @param {string} [firstName] - Nome paziente (opzionale)
     * @returns {Promise<Object>} Risultato ricerca
     */
    async searchPatient(sessionId, lastName, firstName = '') {
        logger.info({ sessionId, lastName, firstName }, 'QueueCheckInService.searchPatient - Ricerca paziente');

        // Ottieni sessione con configurazione e relazioni
        const session = await prisma.queueSession.findFirst({
            where: { id: sessionId, deletedAt: null },
            include: {
                entries: {
                    where: { deletedAt: null }
                },
                medici: {
                    include: {
                        medico: { select: { personId: true } }
                    }
                },
                ambulatori: {
                    select: { ambulatorioId: true }
                },
                slotDisponibilita: {
                    select: { id: true, oraInizio: true, oraFine: true, data: true }
                }
            }
        });

        if (!session) {
            throw new Error('Sessione non trovata');
        }

        if (!session.isActive) {
            throw new Error('Sessione non attiva');
        }

        const config = session.config || {};
        const patientAccessMode = config.patientAccessMode || 'BOTH';

        const allowBooked = patientAccessMode !== 'ONLY_WALKIN';
        const allowWalkIn = patientAccessMode !== 'ONLY_BOOKED';

        // 1. Cerca tra gli appuntamenti prenotati nella sessione
        if (allowBooked) {
            const bookedMatch = await this.findInBookedAppointments(session, lastName, firstName);
            if (bookedMatch) {
                // Multiple appointments found — patient must choose
                if (bookedMatch.multiple) {
                    logger.info({
                        sessionId,
                        patientId: bookedMatch.pazienteId,
                        appointmentCount: bookedMatch.appointments.length,
                        appointmentTimes: bookedMatch.appointments.map(a => a.dataOra?.toISOString())
                    }, 'QueueCheckInService.searchPatient - Più prenotazioni trovate, selezione necessaria');

                    return {
                        found: true,
                        type: 'BOOKED_MULTIPLE',
                        patient: bookedMatch.patient,
                        appointments: bookedMatch.appointments.map(a => ({
                            id: a.id,
                            dataOra: a.dataOra,
                            prestazione: a.prestazione,
                            medicoId: a.medicoId
                        })),
                        message: 'Trovate più prenotazioni per oggi. Seleziona la tua.'
                    };
                }

                logger.info({
                    sessionId,
                    patientId: bookedMatch.pazienteId,
                    appointmentId: bookedMatch.appuntamentoId
                }, 'QueueCheckInService.searchPatient - Paziente prenotato trovato');

                return {
                    found: true,
                    type: 'BOOKED',
                    patient: bookedMatch.patient,
                    appointment: bookedMatch.appointment,
                    entry: bookedMatch.entry,
                    message: 'Paziente prenotato trovato'
                };
            }
        }

        // 2. Cerca nel database generale pazienti (per recupero anagrafica walk-in)
        if (allowWalkIn) {
            const dbMatch = await this.findPatientInDatabase(lastName, firstName, session.tenantId);

            if (dbMatch) {
                // Multiple matches: need user confirmation
                if (dbMatch.multiple) {
                    logger.info({
                        sessionId,
                        matchCount: dbMatch.patients.length
                    }, 'QueueCheckInService.searchPatient - Trovati multipli pazienti, conferma necessaria');

                    return {
                        found: true,
                        type: 'KNOWN_WALKIN',
                        needsConfirmation: true,
                        patients: dbMatch.patients.map(p => ({
                            id: p.id,
                            firstName: p.firstName,
                            lastName: p.lastName,
                            birthDate: p.birthDate,
                            birthPlace: p.birthPlace,
                        })),
                        allowWalkIn: true,
                        message: 'Trovati più pazienti con questo nome. Seleziona il tuo profilo.'
                    };
                }

                // Single match: return with birth data for confirmation
                logger.info({
                    sessionId,
                    patientId: dbMatch.id
                }, 'QueueCheckInService.searchPatient - Paziente esistente trovato (no appuntamento)');

                return {
                    found: true,
                    type: 'KNOWN_WALKIN',
                    needsConfirmation: true,
                    patient: dbMatch,
                    allowWalkIn: true,
                    message: 'Paziente trovato. Conferma i tuoi dati.'
                };
            }

            // 3. Nessuna corrispondenza - paziente nuovo
            logger.info({ sessionId, lastName, firstName }, 'QueueCheckInService.searchPatient - Nessun paziente trovato');

            return {
                found: false,
                type: 'NEW_WALKIN',
                allowWalkIn: true,
                message: 'Non risulti prenotato. Vuoi fissare una visita?'
            };
        }

        // Solo prenotati e non trovato
        return {
            found: false,
            type: 'NOT_FOUND',
            allowWalkIn: false,
            message: 'Nessuna prenotazione trovata per i tuoi dati. Contatta la reception.'
        };
    }

    /**
     * Cerca paziente tra gli appuntamenti prenotati della sessione
     * Usa la data dello slotDisponibilita (se presente) come data autoritativa,
     * perché session.date può avere offset timezone rispetto alla data reale dello slot.
     * @private
     */
    async findInBookedAppointments(session, lastName, firstName) {
        // Prefer slot date (authoritative for appointments) over session date
        const effectiveDate = session.slotDisponibilita?.data
            ? new Date(session.slotDisponibilita.data)
            : new Date(session.date);

        // Build paziente filter with name variants for fuzzy matching (accents, apostrophes, hyphens)
        const lastNameVariants = generateNameVariants(lastName);
        const firstNameVariants = firstName?.trim() ? generateNameVariants(firstName) : [];

        const pazienteFilter = {
            OR: lastNameVariants.map(v => ({ lastName: { contains: v, mode: 'insensitive' } })),
            deletedAt: null
        };
        if (firstNameVariants.length > 0) {
            pazienteFilter.AND = [
                { OR: firstNameVariants.map(v => ({ firstName: { contains: v, mode: 'insensitive' } })) }
            ];
        }

        // Filter by session medici and ambulatori
        const medicoPersonIds = (session.medici || []).map(sm => sm.medico?.personId).filter(Boolean);
        const ambulatorioIds = session.ambulatorioId
            ? [session.ambulatorioId]
            : (session.ambulatori || []).map(sa => sa.ambulatorioId).filter(Boolean);

        logger.debug({
            sessionId: session.id,
            effectiveDate: effectiveDate.toISOString(),
            slotDisponibilitaId: session.slotDisponibilitaId,
            slotOraInizio: session.slotDisponibilita?.oraInizio,
            slotOraFine: session.slotDisponibilita?.oraFine,
            medicoPersonIds,
            ambulatorioIds,
            lastName,
            firstName
        }, 'findInBookedAppointments: search parameters');

        // Se la sessione è legata a uno slot disponibilità, filtra per la fascia oraria dello slot
        let startRange, endRange;
        const hasSlotRange = session.slotDisponibilita?.oraInizio && session.slotDisponibilita?.oraFine;
        if (hasSlotRange) {
            const [startH, startM] = session.slotDisponibilita.oraInizio.split(':').map(Number);
            const [endH, endM] = session.slotDisponibilita.oraFine.split(':').map(Number);
            // CRITICAL: Slot oraInizio/oraFine are in local time (Europe/Rome), NOT UTC.
            // Use local Date constructor so JS applies the correct CET/CEST offset.
            // Appointments are also created with local time → auto-converted to UTC by JS.
            const year = effectiveDate.getUTCFullYear();
            const month = effectiveDate.getUTCMonth();
            const day = effectiveDate.getUTCDate();
            startRange = new Date(year, month, day, startH, startM, 0, 0);
            endRange = new Date(year, month, day, endH, endM, 59, 999);
        } else {
            startRange = new Date(Date.UTC(
                effectiveDate.getUTCFullYear(), effectiveDate.getUTCMonth(), effectiveDate.getUTCDate(), 0, 0, 0, 0
            ));
            endRange = new Date(Date.UTC(
                effectiveDate.getUTCFullYear(), effectiveDate.getUTCMonth(), effectiveDate.getUTCDate(), 23, 59, 59, 999
            ));
        }

        // Build base filter
        const baseFilter = {
            tenantId: session.tenantId,
            deletedAt: null,
            stato: { notIn: ['ANNULLATO', 'NO_SHOW'] },
            paziente: pazienteFilter
        };

        // Attempt 1: Strict search with time range + medico + ambulatorio
        const strictFilter = {
            ...baseFilter,
            dataOra: { gte: startRange, lte: endRange }
        };
        if (medicoPersonIds.length > 0) {
            strictFilter.medicoId = { in: medicoPersonIds };
        }
        if (ambulatorioIds.length > 0) {
            strictFilter.ambulatorioId = { in: ambulatorioIds };
        }

        let appointments = await prisma.appuntamento.findMany({
            where: strictFilter,
            include: {
                paziente: {
                    select: {
                        id: true, firstName: true, lastName: true,
                        taxCode: true, gender: true, birthDate: true, birthPlace: true
                    }
                },
                prestazione: {
                    select: { id: true, nome: true, durataPrevista: true }
                }
            },
            orderBy: { dataOra: 'asc' }
        });

        // Attempt 2: If strict search found nothing, relax ambulatorio filter (keep time range)
        if (appointments.length === 0) {
            logger.info({
                sessionId: session.id,
                startRange: startRange.toISOString(),
                endRange: endRange.toISOString()
            }, 'findInBookedAppointments: strict search found nothing, trying without ambulatorio filter');

            // CRITICAL: Keep the slot time range even in fallback — prevents matching
            // appointments from other sessions/time windows (e.g., 8:40 vs 14:50)
            const broadFilter = {
                ...baseFilter,
                dataOra: { gte: startRange, lte: endRange }
            };
            // Keep medico filter if available but DROP ambulatorio filter
            if (medicoPersonIds.length > 0) {
                broadFilter.medicoId = { in: medicoPersonIds };
            }

            appointments = await prisma.appuntamento.findMany({
                where: broadFilter,
                include: {
                    paziente: {
                        select: {
                            id: true, firstName: true, lastName: true,
                            taxCode: true, gender: true, birthDate: true, birthPlace: true
                        }
                    },
                    prestazione: {
                        select: { id: true, nome: true, durataPrevista: true }
                    }
                },
                orderBy: { dataOra: 'asc' }
            });

            if (appointments.length > 0) {
                logger.warn({
                    sessionId: session.id,
                    foundCount: appointments.length,
                    appointmentTimes: appointments.map(a => a.dataOra?.toISOString()),
                    ambulatorioIds: appointments.map(a => a.ambulatorioId)
                }, 'findInBookedAppointments: found appointments without ambulatorio filter');
            }
        }

        // Attempt 3: Drop medico filter too (keep time range + patient name only)
        if (appointments.length === 0 && medicoPersonIds.length > 0) {
            logger.info({ sessionId: session.id }, 'findInBookedAppointments: trying without medico filter');

            appointments = await prisma.appuntamento.findMany({
                where: {
                    ...baseFilter,
                    dataOra: { gte: startRange, lte: endRange }
                },
                include: {
                    paziente: {
                        select: {
                            id: true, firstName: true, lastName: true,
                            taxCode: true, gender: true, birthDate: true, birthPlace: true
                        }
                    },
                    prestazione: {
                        select: { id: true, nome: true, durataPrevista: true }
                    }
                },
                orderBy: { dataOra: 'asc' }
            });

            if (appointments.length > 0) {
                logger.warn({
                    sessionId: session.id,
                    foundCount: appointments.length,
                    medicoIds: appointments.map(a => a.medicoId),
                    expectedMedicoIds: medicoPersonIds
                }, 'findInBookedAppointments: found appointments without medico filter (medico ID mismatch)');
            }
        }

        // Attempt 4: Full day fallback ONLY when session has NO slot time range
        // This prevents cross-session contamination while still finding appointments
        // that might have been created with timezone mismatches
        if (appointments.length === 0 && !hasSlotRange) {
            logger.info({ sessionId: session.id }, 'findInBookedAppointments: no slot range, trying full day search');

            const fullDayStart = new Date(Date.UTC(
                effectiveDate.getUTCFullYear(), effectiveDate.getUTCMonth(), effectiveDate.getUTCDate(), 0, 0, 0, 0
            ));
            const fullDayEnd = new Date(Date.UTC(
                effectiveDate.getUTCFullYear(), effectiveDate.getUTCMonth(), effectiveDate.getUTCDate(), 23, 59, 59, 999
            ));

            appointments = await prisma.appuntamento.findMany({
                where: {
                    ...baseFilter,
                    dataOra: { gte: fullDayStart, lte: fullDayEnd }
                },
                include: {
                    paziente: {
                        select: {
                            id: true, firstName: true, lastName: true,
                            taxCode: true, gender: true, birthDate: true, birthPlace: true
                        }
                    },
                    prestazione: {
                        select: { id: true, nome: true, durataPrevista: true }
                    }
                },
                orderBy: { dataOra: 'asc' }
            });
        }

        if (appointments.length === 0) {
            logger.info({ sessionId: session.id, lastName, firstName }, 'findInBookedAppointments: no appointments found with any strategy');
            return null;
        }

        // When multiple appointments found, let the patient choose
        if (appointments.length > 1) {
            // First: check if any appointment already has a queue entry in this session (auto-select)
            const entryAppIds = new Set((session.entries || []).map(e => e.appuntamentoId).filter(Boolean));
            const withEntry = appointments.filter(a => entryAppIds.has(a.id));
            if (withEntry.length === 1) {
                const appointment = withEntry[0];
                logger.info({
                    sessionId: session.id,
                    selectedId: appointment.id,
                    selectedTime: appointment.dataOra?.toISOString(),
                    reason: 'HAS_QUEUE_ENTRY'
                }, 'findInBookedAppointments: auto-selected appointment with existing queue entry');
                const entry = await prisma.numeroChiamata.findFirst({
                    where: { sessionId: session.id, appuntamentoId: appointment.id, deletedAt: null }
                });
                return {
                    patient: appointment.paziente,
                    appointment: appointment,
                    entry: entry,
                    pazienteId: appointment.pazienteId,
                    appuntamentoId: appointment.id
                };
            }

            // Multiple appointments found — return ALL so the patient can choose
            logger.info({
                sessionId: session.id,
                totalFound: appointments.length,
                allTimes: appointments.map(a => a.dataOra?.toISOString()),
                allIds: appointments.map(a => a.id)
            }, 'findInBookedAppointments: multiple appointments found, returning list for patient selection');

            return {
                multiple: true,
                patient: appointments[0].paziente,
                appointments: appointments,
                pazienteId: appointments[0].pazienteId
            };
        }

        const appointment = appointments[0];

        logger.info({
            sessionId: session.id,
            appointmentId: appointment.id,
            dataOra: appointment.dataOra?.toISOString(),
            paziente: `${appointment.paziente?.lastName} ${appointment.paziente?.firstName}`
        }, 'findInBookedAppointments: single appointment matched');

        // Trova l'entry corrispondente nella sessione
        const entry = await prisma.numeroChiamata.findFirst({
            where: {
                sessionId: session.id,
                appuntamentoId: appointment.id,
                deletedAt: null
            }
        });

        return {
            patient: appointment.paziente,
            appointment: appointment,
            entry: entry,
            pazienteId: appointment.pazienteId,
            appuntamentoId: appointment.id
        };
    }

    /**
     * Cerca paziente nel database generale
     * @private
     */
    async findPatientInDatabase(lastName, firstName, tenantId) {
        // Build filter with name variants for fuzzy matching (accents, apostrophes, hyphens, spaces)
        const lastNameVariants = generateNameVariants(lastName);
        const firstNameVariants = firstName?.trim() ? generateNameVariants(firstName) : [];

        const whereFilter = {
            OR: lastNameVariants.map(v => ({ lastName: { contains: v, mode: 'insensitive' } })),
            deletedAt: null,
            tenantProfiles: {
                some: {
                    tenantId: tenantId,
                    deletedAt: null
                }
            }
        };
        if (firstNameVariants.length > 0) {
            whereFilter.AND = [
                { OR: firstNameVariants.map(v => ({ firstName: { contains: v, mode: 'insensitive' } })) }
            ];
        }

        // Cerca in Person con tenantProfiles per il tenant specifico
        const persons = await prisma.person.findMany({
            where: whereFilter,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                taxCode: true,
                gender: true,
                birthDate: true,
                birthPlace: true
                // F306: email/phone NOT returned — public kiosk (shared device)
            },
            take: 10,
            orderBy: { lastName: 'asc' }
        });

        if (persons.length === 0) {
            return null;
        }

        // If multiple matches, return all for user confirmation
        if (persons.length > 1) {
            return {
                multiple: true,
                patients: persons.map(p => ({
                    id: p.id,
                    firstName: p.firstName,
                    lastName: p.lastName,
                    taxCode: p.taxCode,
                    gender: p.gender,
                    birthDate: p.birthDate,
                    birthPlace: p.birthPlace
                }))
            };
        }

        // Single match — return with birth data for confirmation
        const person = persons[0];
        return {
            id: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
            taxCode: person.taxCode,
            gender: person.gender,
            birthDate: person.birthDate,
            birthPlace: person.birthPlace
        };
    }

    /**
     * Cerca paziente per codice fiscale
     * Usato quando la ricerca per nome non trova il paziente
     */
    async searchByTaxCode(taxCode, tenantId) {
        if (!taxCode || taxCode.trim().length < 6) return null;

        const person = await prisma.person.findFirst({
            where: {
                taxCode: { equals: taxCode.trim(), mode: 'insensitive' },
                deletedAt: null,
                tenantProfiles: {
                    some: { tenantId, deletedAt: null }
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                taxCode: true,
                gender: true,
                birthDate: true,
                birthPlace: true
                // F306: email/phone NOT returned — public kiosk (shared device)
                // should not expose contact details of the searched patient
            }
        });

        if (!person) return null;
        return {
            id: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
            taxCode: person.taxCode,
            gender: person.gender,
            birthDate: person.birthDate,
            birthPlace: person.birthPlace
        };
    }

    /**
     * Check-in paziente prenotato
     * Registra l'arrivo e riordina la coda se orderByArrival è attivo
     * 
     * @param {string} sessionId - ID sessione
     * @param {string} appointmentId - ID appuntamento
     * @param {string} [entryId] - ID entry esistente (opzionale)
     * @returns {Promise<Object>} Entry aggiornata
     */
    async checkInBooked(sessionId, appointmentId, entryId = null) {
        logger.info({ sessionId, appointmentId, entryId }, 'QueueCheckInService.checkInBooked - Check-in paziente');

        const session = await prisma.queueSession.findFirst({
            where: { id: sessionId, deletedAt: null }
        });

        if (!session || !session.isActive) {
            throw new Error('Sessione non trovata o non attiva');
        }

        const config = session.config || {};
        const orderByArrival = config.orderByArrival === true;

        // Trova o cerca l'entry per questo appuntamento
        // SECURITY: scopiamo sempre al sessionId per prevenire IDOR cross-tenant
        let entry;
        if (entryId) {
            entry = await prisma.numeroChiamata.findFirst({ where: { id: entryId, sessionId, deletedAt: null } });
        } else {
            entry = await prisma.numeroChiamata.findFirst({
                where: {
                    sessionId,
                    appuntamentoId: appointmentId,
                    deletedAt: null
                }
            });
        }

        if (!entry) {
            throw new Error('Entry non trovata per questo appuntamento');
        }

        // Verifica se già fatto check-in
        if (entry.checkInAt) {
            logger.warn({ entryId: entry.id }, 'QueueCheckInService.checkInBooked - Check-in già effettuato');
            return entry;
        }

        const now = new Date();

        // Calcola prossimo checkInOrder (progressivo per sessione)
        const maxCheckIn = await prisma.numeroChiamata.aggregate({
            where: {
                sessionId,
                checkInOrder: { not: null },
                deletedAt: null
            },
            _max: { checkInOrder: true }
        });
        const nextCheckInOrder = (maxCheckIn._max.checkInOrder || 0) + 1;

        // Salva ordine originale appuntamento se non già salvato
        const originalOrder = entry.originalAppointmentOrder || entry.numero;

        // Aggiorna entry con dati check-in
        entry = await prisma.numeroChiamata.update({
            where: { id: entry.id },
            data: {
                checkInAt: now,
                checkInOrder: nextCheckInOrder,
                originalAppointmentOrder: originalOrder,
                stato: 'IN_ATTESA'
            }
        });

        logger.info({
            entryId: entry.id,
            checkInOrder: nextCheckInOrder,
            orderByArrival
        }, 'QueueCheckInService.checkInBooked - Check-in registrato');

        // Se orderByArrival attivo, riordina la coda
        if (orderByArrival) {
            await this.reorderQueueByArrival(sessionId);
        }

        return entry;
    }

    /**
     * Registra walk-in (paziente senza appuntamento)
     * 
     * @param {string} sessionId - ID sessione
     * @param {Object} walkInData - Dati paziente
     * @param {string} [patientId] - ID paziente esistente (opzionale)
     * @returns {Promise<Object>} Entry creata
     */
    async registerWalkIn(sessionId, walkInData, patientId = null) {
        logger.info({ sessionId, patientId, hasWalkInData: !!walkInData }, 'QueueCheckInService.registerWalkIn');

        const session = await prisma.queueSession.findFirst({
            where: { id: sessionId, deletedAt: null },
            include: {
                ambulatorio: { select: { codice: true } }
            }
        });

        if (!session || !session.isActive) {
            throw new Error('Sessione non trovata o non attiva');
        }

        const config = session.config || {};

        // Verifica che walk-in sia permesso
        if (config.patientAccessMode === 'ONLY_BOOKED') {
            throw new Error('Questa sessione accetta solo pazienti prenotati');
        }

        // Calcola prossimo numero
        const lastEntry = await prisma.numeroChiamata.findFirst({
            where: { sessionId, deletedAt: null },
            orderBy: { numero: 'desc' }
        });
        const numero = (lastEntry?.numero || 0) + 1;

        // Calcola prossimo checkInOrder
        const maxCheckIn = await prisma.numeroChiamata.aggregate({
            where: {
                sessionId,
                checkInOrder: { not: null },
                deletedAt: null
            },
            _max: { checkInOrder: true }
        });
        const nextCheckInOrder = (maxCheckIn._max.checkInOrder || 0) + 1;

        // Sigla ambulatorio
        const sigla = session.ambulatorio?.codice || '';
        const digitCount = config.digitCount || 2;
        const displayNumber = sigla
            ? `${sigla}-${String(numero).padStart(digitCount, '0')}`
            : String(numero).padStart(digitCount, '0');

        const now = new Date();

        // Crea entry walk-in
        const entry = await prisma.numeroChiamata.create({
            data: {
                numero,
                sessionId,
                pazienteId: patientId,
                tenantId: session.tenantId,
                tipoAccesso: 'WALK_IN',
                walkInData: walkInData,
                displayNumber,
                siglaAmbulatorio: sigla || null,
                stato: 'IN_ATTESA',
                priorita: 'NORMALE',
                dataOraArrivo: now,
                checkInAt: now,
                checkInOrder: nextCheckInOrder,
                originalAppointmentOrder: null // Walk-in non ha ordine originale
            }
        });

        logger.info({
            entryId: entry.id,
            numero,
            displayNumber,
            checkInOrder: nextCheckInOrder
        }, 'QueueCheckInService.registerWalkIn - Walk-in registrato');

        // Se orderByArrival attivo, riordina
        if (config.orderByArrival) {
            await this.reorderQueueByArrival(sessionId);
        }

        return entry;
    }

    /**
     * Riordina la coda in base all'ordine di arrivo reale
     * Solo per pazienti che hanno fatto check-in (checkInAt != null)
     * I pazienti non ancora arrivati mantengono una posizione "pendente"
     * 
     * @param {string} sessionId - ID sessione
     */
    async reorderQueueByArrival(sessionId) {
        logger.info({ sessionId }, 'QueueCheckInService.reorderQueueByArrival - Riordinamento coda');

        // 1. Prendi tutte le entry con check-in, ordinate per checkInAt
        const checkedInEntries = await prisma.numeroChiamata.findMany({
            where: {
                sessionId,
                checkInAt: { not: null },
                stato: { in: ['IN_ATTESA', 'CHIAMATO'] }, // Solo in attesa o chiamato
                deletedAt: null
            },
            orderBy: { checkInAt: 'asc' }
        });

        // 2. Riassegna numeri in ordine di arrivo
        for (let i = 0; i < checkedInEntries.length; i++) {
            const newNumber = i + 1;
            if (checkedInEntries[i].numero !== newNumber) {
                await prisma.numeroChiamata.update({
                    where: { id: checkedInEntries[i].id },
                    data: {
                        numero: newNumber,
                        checkInOrder: i + 1
                    }
                });
            }
        }

        // 3. I pazienti non ancora arrivati (no check-in) mantengono numeri > ultimi arrivati
        const notCheckedInEntries = await prisma.numeroChiamata.findMany({
            where: {
                sessionId,
                checkInAt: null,
                stato: { in: ['IN_ATTESA'] },
                deletedAt: null
            },
            orderBy: { originalAppointmentOrder: 'asc' }
        });

        const startNumber = checkedInEntries.length + 1;
        for (let i = 0; i < notCheckedInEntries.length; i++) {
            const newNumber = startNumber + i;
            if (notCheckedInEntries[i].numero !== newNumber) {
                await prisma.numeroChiamata.update({
                    where: { id: notCheckedInEntries[i].id },
                    data: { numero: newNumber }
                });
            }
        }

        logger.info({
            sessionId,
            checkedIn: checkedInEntries.length,
            notCheckedIn: notCheckedInEntries.length
        }, 'QueueCheckInService.reorderQueueByArrival - Riordinamento completato');
    }

    /**
     * Ottieni stato attesa per un paziente
     * 
     * @param {string} entryId - ID entry
     * @returns {Promise<Object>} Stato attesa
     */
    async getWaitingStatus(entryId) {
        const entry = await prisma.numeroChiamata.findFirst({
            where: { id: entryId, deletedAt: null },
            include: {
                session: {
                    select: {
                        id: true,
                        config: true,
                        tenantId: true,
                        ambulatorio: {
                            select: { id: true, nome: true, descrizione: true, piano: true, codice: true }
                        }
                    }
                }
            }
        });

        if (!entry) {
            throw new Error('Entry non trovata');
        }

        // Conta pazienti prima di questo
        // Count only IN_ATTESA entries ahead — CHIAMATO/IN_VISITA are already being served
        const entriesBefore = await prisma.numeroChiamata.count({
            where: {
                sessionId: entry.sessionId,
                numero: { lt: entry.numero },
                stato: 'IN_ATTESA',
                deletedAt: null
            }
        });

        // Stima tempo attesa (15 min default per paziente)
        const avgMinutesPerPatient = 15;
        const estimatedMinutes = entriesBefore * avgMinutesPerPatient;

        // Build ambulatorio info for patient display
        const ambulatorio = entry.session?.ambulatorio;
        const ambulatorioInfo = ambulatorio ? {
            nome: ambulatorio.nome,
            codice: ambulatorio.codice,
            descrizione: ambulatorio.descrizione || null,
            piano: ambulatorio.piano || null
        } : null;

        return {
            entryId: entry.id,
            displayNumber: entry.displayNumber,
            numero: entry.numero,
            stato: entry.stato,
            positionInQueue: entriesBefore + 1,
            entriesBefore: entriesBefore,
            estimatedMinutes: estimatedMinutes,
            checkInAt: entry.checkInAt,
            checkInOrder: entry.checkInOrder,
            ambulatorio: ambulatorioInfo
        };
    }
}

// Singleton export
const queueCheckInService = new QueueCheckInService();
export { queueCheckInService, QueueCheckInService };
export default queueCheckInService;
