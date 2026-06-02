/**
 * Public Queue Routes - API pubbliche per check-in pazienti via QR
 * Progetto 53.1: Sistema gestione code pazienti - Mobile Check-in
 * 
 * Questi endpoint sono pubblici (no authenticate) e accessibili via QR code token.
 * Il token viene validato internamente per ogni richiesta.
 * 
 * P53-S14 Miglioramenti:
 * - GET /:token: risolve ambulatorio per-medico (3-level: SlotDisponibilita → DisponibilitaMedico → session fallback)
 * - Flow 1b (slot linking): normalizzazione date a UTC midnight per match @db.Date + fallback overlapping
 * - POST /:token/search: supporta type BOOKED_MULTIPLE con lista appuntamenti per selezione UI
 * 
 * Endpoints:
 * - GET  /api/v1/public/queue/:token - Info sessione da QR (con ambulatorio per medico)
 * - POST /api/v1/public/queue/:token/search - Cerca paziente per lastName/firstName
 * - POST /api/v1/public/queue/:token/checkin - Check-in paziente prenotato
 * - POST /api/v1/public/queue/:token/walkin - Registra walk-in
 * - GET  /api/v1/public/queue/:token/status/:entryId - Stato attesa paziente
 * 
 * @module routes/public-queue-routes
 */

import express from 'express';
import { QueueSessionService, QueueDisplayMonitorService } from '../services/queue/index.js';
import QueueCheckInService from '../services/queue/QueueCheckInService.js';
import { logger } from '../utils/logger.js';
import { generateNameVariants, normalizeName } from '../utils/nameNormalization.js';
import PersonService from '../services/person/PersonService.js'; // F314: PersonCRUDService rimosso — consolidato in PersonService
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import prisma from '../config/prisma-optimization.js';
import crypto from 'crypto';

/**
 * Genera una password temporanea sicura e casuale per nuovi pazienti walk-in.
 * Non usa DEFAULT_TEMP_PASSWORD — ogni paziente riceve credenziali uniche.
 * Il paziente dovrà usare "Recupera password" o attendere che l'admin invii le credenziali.
 */
const generatePatientTempPassword = () => crypto.randomBytes(16).toString('hex');

const router = express.Router();

/**
 * Parsa codice fiscale italiano per estrarre data di nascita e genere.
 * Nota: usa Date.UTC() per coerenza con la convenzione UTC del backend.
 * Non sostituire con backend/utils/codiceFiscale.js che usa new Date() in local time.
 * @param {string} cf - Codice fiscale (16 chars)
 * @returns {{ birthDate: Date|null, gender: string, codiceCatastale: string }|null}
 */
function parseFiscalCode(cf) {
    if (!cf || cf.length < 16) return null;
    const upper = cf.toUpperCase();
    const monthMap = { A: 0, B: 1, C: 2, D: 3, E: 4, H: 5, L: 6, M: 7, P: 8, R: 9, S: 10, T: 11 };

    const yearPart = parseInt(upper.substring(6, 8), 10);
    const monthLetter = upper.charAt(8);
    const dayPart = parseInt(upper.substring(9, 11), 10);
    const codiceCatastale = upper.substring(11, 15);

    const month = monthMap[monthLetter];
    if (month === undefined || isNaN(yearPart) || isNaN(dayPart)) return null;

    const gender = dayPart > 40 ? 'FEMALE' : 'MALE';
    const day = dayPart > 40 ? dayPart - 40 : dayPart;
    const year = yearPart <= 29 ? 2000 + yearPart : 1900 + yearPart;

    const date = new Date(Date.UTC(year, month, day));
    if (isNaN(date.getTime())) return null;

    return { birthDate: date, gender, codiceCatastale };
}

// Rate limiting per proteggere gli endpoint pubblici
const queueRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30, // 30 richieste per minuto per IP
    message: { success: false, error: 'Troppe richieste, riprova tra un minuto' }
});

// Middleware per validare il token QR e recuperare la sessione
const validateQueueToken = async (req, res, next) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ success: false, error: 'Token mancante' });
        }

        // Cerca sessione per token (senza filtro tenant perché è pubblico)
        const session = await QueueSessionService.getByQrTokenPublic(token);

        if (!session) {
            return res.status(404).json({ success: false, error: 'Sessione non trovata o link scaduto' });
        }

        if (!session.isActive) {
            return res.status(410).json({ success: false, error: 'Questa sessione non è più attiva' });
        }

        // Aggiungi sessione alla request
        req.queueSession = session;
        next();
    } catch (error) {
        logger.error({ error: error.message }, 'Error validating queue token');
        res.status(500).json({ success: false, error: 'Errore nella validazione del token' });
    }
};

// Applica rate limiting a tutte le routes
router.use(queueRateLimiter);

// ============================================
// PUBLIC QUEUE ENDPOINTS
// ============================================

/**
 * GET /:token - Info sessione da QR code
 * Restituisce info sulla sessione per mostrare la landing page
 */
router.get('/:token', validateQueueToken, async (req, res) => {
    try {
        const session = req.queueSession;
        const config = session.config || {};

        // P53.2: Prepara lista medici da multi-medico
        const mediciRaw = session.medici?.length > 0
            ? session.medici.map(sm => ({
                id: sm.medico.id,
                personId: sm.medico.personId,
                firstName: sm.medico.person.firstName,
                lastName: sm.medico.person.lastName,
                gender: sm.medico.person.gender,
                isPrimary: sm.isPrimary
            }))
            : session.disponibilitaMedico?.medico
                ? [{
                    id: session.disponibilitaMedico.medico.id || session.disponibilitaMedico.medicoId,
                    personId: session.disponibilitaMedico.medico.id || session.disponibilitaMedico.medicoId,
                    firstName: session.disponibilitaMedico.medico.firstName,
                    lastName: session.disponibilitaMedico.medico.lastName,
                    gender: session.disponibilitaMedico.medico.gender,
                    isPrimary: true
                }]
                : [];

        // Resolve ambulatorio per medico (SlotDisponibilita → DisponibilitaMedico → session fallback)
        // Use slot date as authoritative (session.date may have timezone offset)
        const effectiveDateForSlot = session.slotDisponibilita?.data
            ? new Date(session.slotDisponibilita.data)
            : new Date(session.date);
        const dayOfWeek = effectiveDateForSlot.getUTCDay();
        const medici = await Promise.all(mediciRaw.map(async (m) => {
            // P53-S23 FIX: Prefer session's linked slotDisponibilita ambulatorio (authoritative after cascade)
            // This avoids non-deterministic findFirst when medico has multiple slots on same date
            if (session.slotDisponibilita?.ambulatorioId && session.slotDisponibilita.medicoId === m.personId) {
                const amb = await prisma.ambulatorio.findFirst({
                    where: { id: session.slotDisponibilita.ambulatorioId, deletedAt: null },
                    select: { id: true, nome: true, codice: true, indicazioniPaziente: true }
                });
                if (amb) {
                    return { ...m, ambulatorio: { id: amb.id, nome: amb.nome, codice: amb.codice, indicazioni: amb.indicazioniPaziente } };
                }
            }
            // 1. Check SlotDisponibilita for this medico on this date
            const medicoSlot = await prisma.slotDisponibilita.findFirst({
                where: {
                    tenantId: session.tenantId,
                    medicoId: m.personId,
                    data: effectiveDateForSlot,
                    deletedAt: null
                },
                select: { ambulatorioId: true, ambulatorio: { select: { id: true, nome: true, codice: true, indicazioniPaziente: true } } }
            });
            if (medicoSlot?.ambulatorio) {
                return { ...m, ambulatorio: { id: medicoSlot.ambulatorio.id, nome: medicoSlot.ambulatorio.nome, codice: medicoSlot.ambulatorio.codice, indicazioni: medicoSlot.ambulatorio.indicazioniPaziente } };
            }
            // 2. Check DisponibilitaMedico for this day-of-week (ambulatorioId only, no relation)
            const medicoDisp = await prisma.disponibilitaMedico.findFirst({
                where: {
                    tenantId: session.tenantId,
                    medicoId: m.personId,
                    giorno: dayOfWeek,
                    attivo: true,
                    deletedAt: null
                },
                select: { ambulatorioId: true }
            });
            if (medicoDisp?.ambulatorioId) {
                const amb = await prisma.ambulatorio.findFirst({
                    where: { id: medicoDisp.ambulatorioId, deletedAt: null },
                    select: { id: true, nome: true, codice: true, indicazioniPaziente: true }
                });
                if (amb) {
                    return { ...m, ambulatorio: { id: amb.id, nome: amb.nome, codice: amb.codice, indicazioni: amb.indicazioniPaziente } };
                }
            }
            // 3. Fallback to session ambulatorio
            const fallbackAmb = session.ambulatorio || (session.ambulatori?.length > 0 ? session.ambulatori[0].ambulatorio : null);
            return { ...m, ambulatorio: fallbackAmb ? { id: fallbackAmb.id, nome: fallbackAmb.nome, codice: fallbackAmb.codice, indicazioni: fallbackAmb.indicazioniPaziente } : null };
        }));

        // P53.2: Prepara lista ambulatori con indicazioni
        // Priority: junction table → per-medico resolved → session.ambulatorio fallback
        let ambulatori;
        if (session.ambulatori?.length > 0) {
            ambulatori = session.ambulatori.map(sa => ({
                id: sa.ambulatorio.id,
                codice: sa.ambulatorio.codice,
                nome: sa.ambulatorio.nome,
                indicazioni: sa.indicazioniOverride || sa.ambulatorio.indicazioniPaziente,
                isEsterno: sa.ambulatorio.isEsterno,
                isPrimary: sa.isPrimary
            }));
        } else if (medici.length > 0) {
            // Derive unique ambulatori from per-medico resolution (SlotDisponibilita/DisponibilitaMedico)
            const seen = new Set();
            ambulatori = medici
                .filter(m => m.ambulatorio?.id && !seen.has(m.ambulatorio.id) && seen.add(m.ambulatorio.id))
                .map((m, idx) => ({
                    id: m.ambulatorio.id,
                    codice: m.ambulatorio.codice,
                    nome: m.ambulatorio.nome,
                    indicazioni: m.ambulatorio.indicazioni,
                    isEsterno: false,
                    isPrimary: idx === 0
                }));
        } else if (session.ambulatorio) {
            ambulatori = [{
                id: session.ambulatorio.id,
                codice: session.ambulatorio.codice,
                nome: session.ambulatorio.nome,
                indicazioni: session.ambulatorio.indicazioniPaziente,
                isEsterno: session.ambulatorio.isEsterno,
                isPrimary: true
            }];
        } else {
            ambulatori = [];
        }

        // Restituisci solo info necessarie per la landing page
        res.json({
            success: true,
            data: {
                sessionId: session.id,
                // Use slotDisponibilita.data as authoritative date (session.date may have TZ offset)
                date: effectiveDateForSlot?.toISOString() || session.date,
                mode: session.mode,
                // Ambulatorio principale (single-display mode)
                ambulatorio: session.ambulatorio ? {
                    nome: session.ambulatorio.nome,
                    indicazioni: session.ambulatorio.indicazioniPaziente,
                    isEsterno: session.ambulatorio.isEsterno
                } : null,
                // Medico principale (single-display mode)
                medico: medici.length > 0 ? medici[0] : null,
                // P53.2: Array completo medici e ambulatori
                medici,
                ambulatori,
                // Config pubblico (senza info sensibili)
                patientAccessMode: config.patientAccessMode || 'BOTH',
                allowNewPatients: config.allowNewPatients !== false,
                prestazioniDisponibili: config.allowPatientChoosePrestazione ?
                    config.prestazioniDisponibili : null,
                allowPatientChoosePrestazione: config.allowPatientChoosePrestazione || false,
                // Campi anagrafica richiesti per walk-in
                requiredPatientFields: config.requiredPatientFields || ['lastName', 'firstName'],
                durataMinutiDefault: config.durataMinutiDefault || 30,
                // Fascia oraria dello slot disponibilità collegato
                slotOrario: session.slotDisponibilita ? {
                    oraInizio: session.slotDisponibilita.oraInizio,
                    oraFine: session.slotDisponibilita.oraFine
                } : null,
                // P53: Questionario post-prenotazione
                questionarioTemplateId: config.questionarioTemplateId || null,
                questionarioTemplateNome: config.questionarioTemplateNome || null,
                questionarioMode: config.questionarioMode || 'DISABLED'
            }
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', token: req.params.token }, 'Error getting public queue info');
        res.status(500).json({ success: false, error: 'Errore nel recupero delle informazioni' });
    }
});

/**
 * POST /:token/search - Cerca paziente per lastName/firstName
 * Cerca tra prenotati e/o nel database generale in base alla config
 */
router.post('/:token/search', validateQueueToken, async (req, res) => {
    try {
        const session = req.queueSession;
        const { lastName, firstName } = req.body;

        if (!lastName || lastName.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Inserisci almeno 2 caratteri del cognome'
            });
        }

        const result = await QueueCheckInService.searchPatient(
            session.id,
            lastName.trim(),
            firstName?.trim() || ''
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', sessionId: req.queueSession?.id }, 'Error searching patient');
        res.status(500).json({ success: false, error: 'Errore nella ricerca' });
    }
});

/**
 * POST /:token/search-cf - Cerca paziente per codice fiscale
 * Usato quando la ricerca per nome non trova riscontro
 */
router.post('/:token/search-cf', validateQueueToken, async (req, res) => {
    try {
        const session = req.queueSession;
        const { taxCode } = req.body;

        if (!taxCode || taxCode.trim().length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Inserisci almeno 6 caratteri del codice fiscale'
            });
        }

        const patient = await QueueCheckInService.searchByTaxCode(taxCode.trim(), session.tenantId);

        if (patient) {
            // Check if patient has a booked appointment for today filtered by session medici/ambulatorio
            // Use slot date as authoritative (session.date may have timezone offset)
            const effectiveDate = session.slotDisponibilita?.data
                ? new Date(session.slotDisponibilita.data)
                : new Date(session.date);

            // Se la sessione è legata a uno slot disponibilità, filtra per la fascia oraria dello slot
            let startRange, endRange;
            if (session.slotDisponibilita?.oraInizio && session.slotDisponibilita?.oraFine) {
                const [startH, startM] = session.slotDisponibilita.oraInizio.split(':').map(Number);
                const [endH, endM] = session.slotDisponibilita.oraFine.split(':').map(Number);
                // CRITICAL: Slot times are local (Europe/Rome), NOT UTC.
                // Use local Date constructor to match how appointments are stored.
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

            // Get session medici and ambulatori for filtering
            const sessionMedici = await prisma.queueSessionMedico.findMany({
                where: { sessionId: session.id },
                include: { medico: { select: { personId: true } } }
            });
            const sessionAmbulatori = await prisma.queueSessionAmbulatorio.findMany({
                where: { sessionId: session.id },
                select: { ambulatorioId: true }
            });
            const medicoPersonIds = sessionMedici.map(sm => sm.medico?.personId).filter(Boolean);
            const ambulatorioIds = session.ambulatorioId
                ? [session.ambulatorioId]
                : sessionAmbulatori.map(sa => sa.ambulatorioId);

            // Attempt 1: strict search with time range + medico + ambulatorio
            const strictFilter = {
                pazienteId: patient.id,
                tenantId: session.tenantId,
                deletedAt: null,
                stato: { notIn: ['ANNULLATO', 'NO_SHOW'] },
                dataOra: { gte: startRange, lte: endRange }
            };
            if (medicoPersonIds.length > 0) strictFilter.medicoId = { in: medicoPersonIds };
            if (ambulatorioIds.length > 0) strictFilter.ambulatorioId = { in: ambulatorioIds };

            let appointment = await prisma.appuntamento.findFirst({
                where: strictFilter,
                include: { prestazione: { select: { id: true, nome: true } } },
                orderBy: { dataOra: 'asc' }
            });

            // Attempt 2: Keep time range, drop ambulatorio filter
            if (!appointment) {
                const broadFilter = {
                    pazienteId: patient.id,
                    tenantId: session.tenantId,
                    deletedAt: null,
                    stato: { notIn: ['ANNULLATO', 'NO_SHOW'] },
                    dataOra: { gte: startRange, lte: endRange }
                };
                if (medicoPersonIds.length > 0) broadFilter.medicoId = { in: medicoPersonIds };

                const broadResults = await prisma.appuntamento.findMany({
                    where: broadFilter,
                    include: { prestazione: { select: { id: true, nome: true } } },
                    orderBy: { dataOra: 'asc' }
                });

                if (broadResults.length > 0) {
                    appointment = broadResults[0];
                    logger.warn({ sessionId: session.id, appointmentId: appointment.id, dataOra: appointment.dataOra?.toISOString() }, 'search-cf: strict search missed appointment, found without ambulatorio filter');
                }
            }

            // Attempt 3: Keep time range, drop medico filter too
            if (!appointment && medicoPersonIds.length > 0) {
                const noMedicoResults = await prisma.appuntamento.findMany({
                    where: {
                        pazienteId: patient.id,
                        tenantId: session.tenantId,
                        deletedAt: null,
                        stato: { notIn: ['ANNULLATO', 'NO_SHOW'] },
                        dataOra: { gte: startRange, lte: endRange }
                    },
                    include: { prestazione: { select: { id: true, nome: true } } },
                    orderBy: { dataOra: 'asc' }
                });

                if (noMedicoResults.length > 0) {
                    appointment = noMedicoResults[0];
                    logger.warn({ sessionId: session.id, appointmentId: appointment.id, medicoId: appointment.medicoId, expectedMedicoIds: medicoPersonIds }, 'search-cf: found appointment only after dropping medico filter');
                }
            }

            // Attempt 4: Full day fallback ONLY when session has NO slot range
            const hasSlotRange = session.slotDisponibilita?.oraInizio && session.slotDisponibilita?.oraFine;
            if (!appointment && !hasSlotRange) {
                const fullDayStart = new Date(Date.UTC(
                    effectiveDate.getUTCFullYear(), effectiveDate.getUTCMonth(), effectiveDate.getUTCDate(), 0, 0, 0, 0
                ));
                const fullDayEnd = new Date(Date.UTC(
                    effectiveDate.getUTCFullYear(), effectiveDate.getUTCMonth(), effectiveDate.getUTCDate(), 23, 59, 59, 999
                ));
                const fullDayResults = await prisma.appuntamento.findMany({
                    where: {
                        pazienteId: patient.id,
                        tenantId: session.tenantId,
                        deletedAt: null,
                        stato: { notIn: ['ANNULLATO', 'NO_SHOW'] },
                        dataOra: { gte: fullDayStart, lte: fullDayEnd }
                    },
                    include: { prestazione: { select: { id: true, nome: true } } },
                    orderBy: { dataOra: 'asc' }
                });

                if (fullDayResults.length > 0) {
                    appointment = fullDayResults[0];
                    logger.warn({ sessionId: session.id, appointmentId: appointment.id }, 'search-cf: found appointment via full day fallback (no slot range)');
                }
            }

            res.json({
                success: true,
                data: {
                    found: true,
                    type: appointment ? 'BOOKED' : 'KNOWN_WALKIN',
                    patient,
                    appointment: appointment || null,
                    message: appointment
                        ? 'Paziente trovato con prenotazione per oggi.'
                        : 'Paziente trovato tramite codice fiscale.'
                }
            });
        } else {
            res.json({
                success: true,
                data: {
                    found: false,
                    type: 'NEW_WALKIN',
                    message: 'Nessun paziente trovato con questo codice fiscale.'
                }
            });
        }
    } catch (error) {
        logger.error({ error: error.message }, 'Error searching patient by CF');
        res.status(500).json({ success: false, error: 'Errore nella ricerca' });
    }
});

/**
 * POST /:token/checkin - Check-in paziente prenotato
 * Registra l'arrivo e riordina la coda se orderByArrival è attivo
 */
router.post('/:token/checkin', validateQueueToken, async (req, res) => {
    try {
        const session = req.queueSession;
        const { appointmentId, entryId } = req.body;

        if (!appointmentId) {
            return res.status(400).json({
                success: false,
                error: 'ID appuntamento mancante'
            });
        }

        // Check if session has a questionnaire configured
        const sessionConfig = session.config || {};
        const hasQuestionario = !!(sessionConfig.questionarioTemplateId) &&
            sessionConfig.questionarioMode && sessionConfig.questionarioMode !== 'DISABLED';

        // If questionnaire configured and not disabled, transition appointment to CONFERMATO (hold before IN_ATTESA)
        // F296: aggiunto tenantId: session.tenantId per evitare cross-tenant updateMany IDOR
        if (hasQuestionario) {
            await prisma.appuntamento.updateMany({
                where: {
                    id: appointmentId,
                    tenantId: session.tenantId,
                    stato: 'PRENOTATO',
                    deletedAt: null
                },
                data: { stato: 'CONFERMATO' }
            });
        }

        const entry = await QueueCheckInService.checkInBooked(
            session.id,
            appointmentId,
            entryId
        );

        // Assicura che il paziente abbia PersonTenantProfile e PersonRole nel tenant
        if (entry.pazienteId) {
            const patientId = entry.pazienteId;
            const existingProfile = await prisma.personTenantProfile.findFirst({
                where: { personId: patientId, tenantId: session.tenantId, deletedAt: null }
            });
            if (!existingProfile) {
                await prisma.personTenantProfile.create({
                    data: {
                        personId: patientId,
                        tenantId: session.tenantId,
                        status: 'ACTIVE'
                    }
                });
            }
            const existingRole = await prisma.personRole.findFirst({
                where: { personId: patientId, tenantId: session.tenantId, roleType: 'PAZIENTE', deletedAt: null }
            });
            if (!existingRole) {
                await prisma.personRole.create({
                    data: { personId: patientId, tenantId: session.tenantId, roleType: 'PAZIENTE' }
                });
            }
            // Genera username/password se mancanti (principio del minimo privilegio: no hash in memoria)
            const person = await prisma.person.findFirst({ // F247: findFirst+deletedAt
                where: { id: patientId, deletedAt: null },
                select: { username: true, firstName: true, lastName: true }
            });
            const personHasPassword = await prisma.person.count({
                where: { id: patientId, password: { not: null } }
            }) > 0;
            if (person && (!person.username || !personHasPassword)) {
                const updates = {};
                if (!person.username && person.firstName && person.lastName) {
                    updates.username = await PersonService.generateUniqueUsername(person.firstName, person.lastName); // F314
                }
                if (!personHasPassword) {
                    updates.password = await bcrypt.hash(generatePatientTempPassword(), 12);
                    updates.mustChangePassword = true;
                }
                if (Object.keys(updates).length > 0) {
                    await prisma.person.update({ where: { id: patientId }, data: updates });
                }
            }
        }

        // Ottieni stato attesa aggiornato
        const waitingStatus = await QueueCheckInService.getWaitingStatus(entry.id);

        res.json({
            success: true,
            data: {
                entry: {
                    id: entry.id,
                    displayNumber: entry.displayNumber,
                    numero: entry.numero,
                    checkInAt: entry.checkInAt,
                    checkInOrder: entry.checkInOrder
                },
                waiting: waitingStatus,
                // Signal questionnaire pending to frontend
                questionarioPending: hasQuestionario ? {
                    templateId: sessionConfig.questionarioTemplateId,
                    templateNome: sessionConfig.questionarioTemplateNome,
                    mode: sessionConfig.questionarioMode,
                    appointmentId
                } : null
            },
            message: 'Check-in effettuato con successo'
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', sessionId: req.queueSession?.id }, 'Error checking in patient');
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /:token/available-times - Calcola orari disponibili per walk-in
 * Strategia a 3 livelli:
 *   1. Se la sessione ha slotDisponibilitaId → usa oraInizio/oraFine di quello slot come finestra
 *   2. Se esistono SlotDisponibilita liberi pre-generati per data/medico → usa quelli
 *   3. Fallback: calcola da DisponibilitaMedico patterns per il giorno della settimana
 * In ogni caso, sottrae gli appuntamenti esistenti e genera intervalli di `durataMinuti`
 */
router.get('/:token/available-times', validateQueueToken, async (req, res) => {
    try {
        const session = req.queueSession;
        const sessionConfig = session.config || {};
        // Use slotDisponibilita.data as authoritative date (session.date may have TZ offset)
        const effectiveDate = session.slotDisponibilita?.data
            ? new Date(session.slotDisponibilita.data)
            : new Date(session.date);
        const effectiveDateUTC = new Date(Date.UTC(
            effectiveDate.getUTCFullYear(), effectiveDate.getUTCMonth(), effectiveDate.getUTCDate()
        ));
        const dayOfWeek = effectiveDateUTC.getUTCDay();
        const durataMinuti = parseInt(req.query.durata) || sessionConfig.durataMinutiDefault || 30;

        // Get session medici
        const sessionMedici = await prisma.queueSessionMedico.findMany({
            where: { sessionId: session.id },
            include: { medico: { select: { personId: true, person: { select: { firstName: true, lastName: true, gender: true } } } } }
        });
        const medicoPersonIds = sessionMedici.map(sm => sm.medico.personId);

        if (medicoPersonIds.length === 0) {
            logger.warn({ sessionId: session.id }, 'available-times: No medici assigned to session');
            return res.json({ success: true, data: [] });
        }

        // Map medico names for display
        const medicoNameMap = {};
        for (const sm of sessionMedici) {
            medicoNameMap[sm.medico.personId] = `${sm.medico.person.lastName} ${sm.medico.person.firstName}`;
        }

        // Current time for filtering past slots — use Italy timezone consistently
        // Slot times (oraInizio/oraFine) are stored as Italian local time strings
        const now = new Date();
        const italyFormatter = new Intl.DateTimeFormat('it-IT', {
            timeZone: 'Europe/Rome',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        });
        const italyParts = italyFormatter.formatToParts(now);
        const getPart = (type) => italyParts.find(p => p.type === type)?.value || '00';
        const nowItalyDate = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
        const nowItalyTime = `${getPart('hour')}:${getPart('minute')}`;

        const effectiveDateStr = effectiveDateUTC.toISOString().split('T')[0];
        const isToday = effectiveDateStr === nowItalyDate;
        const currentTime = isToday ? nowItalyTime : '00:00';

        logger.debug({
            sessionId: session.id,
            effectiveDate: effectiveDateUTC.toISOString(),
            dayOfWeek,
            durataMinuti,
            medicoPersonIds,
            slotDisponibilitaId: session.slotDisponibilitaId,
            slotOrario: session.slotDisponibilita ? `${session.slotDisponibilita.oraInizio}-${session.slotDisponibilita.oraFine}` : null,
            tenantId: session.tenantId
        }, 'available-times: Query params');

        // Collect time blocks from which to generate available windows
        const timeBlocks = []; // Array of { oraInizio: "HH:mm", oraFine: "HH:mm", medicoId: string }

        // STRATEGY 1: Session has a linked SlotDisponibilita → use its time range
        // PLUS query all other slots for the same medici on the same day
        if (session.slotDisponibilita?.oraInizio && session.slotDisponibilita?.oraFine) {
            // First: add the linked slot's time range for all session medici
            for (const medicoPersonId of medicoPersonIds) {
                timeBlocks.push({
                    oraInizio: session.slotDisponibilita.oraInizio,
                    oraFine: session.slotDisponibilita.oraFine,
                    medicoId: medicoPersonId
                });
            }

            // Then: also query ALL other slots for the same medici on the same day
            // This ensures afternoon slots are included even when session was created from a morning slot
            const additionalSlots = await prisma.slotDisponibilita.findMany({
                where: {
                    tenantId: session.tenantId,
                    data: effectiveDateUTC,
                    disponibile: true,
                    deletedAt: null,
                    medicoId: { in: medicoPersonIds },
                    id: { not: session.slotDisponibilitaId } // Exclude the already-included linked slot
                },
                select: { oraInizio: true, oraFine: true, medicoId: true },
                orderBy: { oraInizio: 'asc' }
            });

            for (const slot of additionalSlots) {
                // Avoid duplicate time blocks (same medico + same time range)
                const isDuplicate = timeBlocks.some(
                    tb => tb.medicoId === slot.medicoId && tb.oraInizio === slot.oraInizio && tb.oraFine === slot.oraFine
                );
                if (!isDuplicate) {
                    timeBlocks.push({
                        oraInizio: slot.oraInizio,
                        oraFine: slot.oraFine,
                        medicoId: slot.medicoId
                    });
                }
            }

            logger.debug({
                sessionId: session.id,
                linkedSlot: `${session.slotDisponibilita.oraInizio}-${session.slotDisponibilita.oraFine}`,
                additionalSlots: additionalSlots.length,
                totalTimeBlocks: timeBlocks.length,
                medicoCount: medicoPersonIds.length
            }, 'available-times: Using linked SlotDisponibilita + additional slots for all session medici');
        }

        // STRATEGY 2: If no time blocks yet, try pre-generated SlotDisponibilita LIBERO
        if (timeBlocks.length === 0) {
            const existingSlots = await prisma.slotDisponibilita.findMany({
                where: {
                    tenantId: session.tenantId,
                    data: effectiveDateUTC,
                    stato: 'LIBERO',
                    appuntamentoId: null,
                    disponibile: true,
                    deletedAt: null,
                    medicoId: { in: medicoPersonIds }
                },
                select: {
                    id: true,
                    oraInizio: true,
                    oraFine: true,
                    medicoId: true,
                    durataSlotMinuti: true,
                    medico: { select: { id: true, firstName: true, lastName: true, gender: true } }
                },
                orderBy: { oraInizio: 'asc' }
            });

            if (existingSlots.length > 0) {
                // Return pre-generated slots directly (they already have correct granularity)
                const available = existingSlots
                    .filter(s => s.oraInizio >= currentTime)
                    .map(s => ({
                        id: s.id,
                        oraInizio: s.oraInizio,
                        oraFine: s.oraFine,
                        slotId: s.id,
                        durata: s.durataSlotMinuti || durataMinuti,
                        medico: s.medico ? `${s.medico.lastName} ${s.medico.firstName}` : null,
                        medicoId: s.medicoId
                    }));
                logger.debug({ sessionId: session.id, availableCount: available.length }, 'available-times: Returning pre-generated slots');
                return res.json({ success: true, data: available });
            }
        }

        // STRATEGY 3: If still no time blocks, fall back to DisponibilitaMedico patterns
        if (timeBlocks.length === 0) {
            const disponibilita = await prisma.disponibilitaMedico.findMany({
                where: {
                    tenantId: session.tenantId,
                    medicoId: { in: medicoPersonIds },
                    giorno: dayOfWeek,
                    attivo: true,
                    deletedAt: null,
                    AND: [
                        { OR: [{ validoDal: null }, { validoDal: { lte: effectiveDateUTC } }] },
                        { OR: [{ validoAl: null }, { validoAl: { gte: effectiveDateUTC } }] }
                    ]
                },
                orderBy: { oraInizio: 'asc' }
            });

            logger.debug({ sessionId: session.id, disponibilitaCount: disponibilita.length, dayOfWeek }, 'available-times: DisponibilitaMedico query result');

            if (disponibilita.length === 0) {
                logger.warn({ sessionId: session.id, dayOfWeek, medicoPersonIds }, 'available-times: No availability source found — returning empty');
                return res.json({ success: true, data: [] });
            }

            for (const disp of disponibilita) {
                timeBlocks.push({
                    oraInizio: disp.oraInizio,
                    oraFine: disp.oraFine,
                    medicoId: disp.medicoId,
                    disponibilitaId: disp.id
                });
            }
        }

        // Get existing appointments for this date to exclude busy intervals
        const startOfDay = new Date(Date.UTC(
            effectiveDateUTC.getUTCFullYear(), effectiveDateUTC.getUTCMonth(), effectiveDateUTC.getUTCDate(), 0, 0, 0, 0
        ));
        const endOfDay = new Date(Date.UTC(
            effectiveDateUTC.getUTCFullYear(), effectiveDateUTC.getUTCMonth(), effectiveDateUTC.getUTCDate(), 23, 59, 59, 999
        ));

        const existingAppointments = await prisma.appuntamento.findMany({
            where: {
                tenantId: session.tenantId,
                medicoId: { in: medicoPersonIds },
                dataOra: { gte: startOfDay, lte: endOfDay },
                stato: { notIn: ['ANNULLATO', 'NO_SHOW'] },
                deletedAt: null
            },
            select: { dataOra: true, durataMinuti: true, medicoId: true }
        });

        // Build busy intervals per medico — use Italy timezone for consistency with slot times
        const busyByMedico = {};
        const italyTimeFormatter = new Intl.DateTimeFormat('it-IT', {
            timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false
        });
        for (const app of existingAppointments) {
            if (!busyByMedico[app.medicoId]) busyByMedico[app.medicoId] = [];
            const start = new Date(app.dataOra);
            // Extract hours/minutes in Italy timezone — appointments may be stored in UTC
            const timeParts = italyTimeFormatter.formatToParts(start);
            const appHour = parseInt(timeParts.find(p => p.type === 'hour')?.value || '0');
            const appMinute = parseInt(timeParts.find(p => p.type === 'minute')?.value || '0');
            const startMin = appHour * 60 + appMinute;
            const endMin = startMin + (app.durataMinuti || 30);
            busyByMedico[app.medicoId].push({ start: startMin, end: endMin });
        }

        // Generate available time windows from time blocks
        const freeSlots = [];
        let totalPossibleSlots = 0;
        let pastSlots = 0;

        for (const block of timeBlocks) {
            const [startH, startM] = block.oraInizio.split(':').map(Number);
            const [endH, endM] = block.oraFine.split(':').map(Number);
            const blockStart = startH * 60 + startM;
            const blockEnd = endH * 60 + endM;
            const busy = busyByMedico[block.medicoId] || [];

            for (let slotStart = blockStart; slotStart + durataMinuti <= blockEnd; slotStart += durataMinuti) {
                totalPossibleSlots++;
                const slotEnd = slotStart + durataMinuti;

                // Skip past times (use strict < so the exact minute is still available)
                const slotTimeStr = `${String(Math.floor(slotStart / 60)).padStart(2, '0')}:${String(slotStart % 60).padStart(2, '0')}`;
                if (slotTimeStr < currentTime) {
                    pastSlots++;
                    continue;
                }

                // Check for conflicts with existing appointments
                const isConflict = busy.some(b => slotStart < b.end && slotEnd > b.start);
                if (isConflict) continue;

                const slotEndStr = `${String(Math.floor(slotEnd / 60)).padStart(2, '0')}:${String(slotEnd % 60).padStart(2, '0')}`;

                freeSlots.push({
                    id: `computed-${block.medicoId}-${slotTimeStr}`,
                    oraInizio: slotTimeStr,
                    oraFine: slotEndStr,
                    slotId: null,
                    durata: durataMinuti,
                    medico: medicoNameMap[block.medicoId] || null,
                    medicoId: block.medicoId,
                    disponibilitaId: block.disponibilitaId || null
                });
            }
        }

        freeSlots.sort((a, b) => a.oraInizio.localeCompare(b.oraInizio));

        // Determine reason for empty slots and generate overbooking options if applicable
        let emptyReason = null; // 'all_past' | 'all_booked' | null
        const overbookingSlots = [];

        if (freeSlots.length === 0 && totalPossibleSlots > 0) {
            if (pastSlots === totalPossibleSlots) {
                emptyReason = 'all_past';
            } else {
                emptyReason = 'all_booked';
                // Generate overbooking options:
                // 1. Small gaps between appointments (even if shorter than full duration)
                // 2. Slot at the end of the block (past the declared availability)
                for (const block of timeBlocks) {
                    const [startH, startM] = block.oraInizio.split(':').map(Number);
                    const [endH, endM] = block.oraFine.split(':').map(Number);
                    const blockStart = startH * 60 + startM;
                    const blockEnd = endH * 60 + endM;
                    const busy = (busyByMedico[block.medicoId] || [])
                        .filter(b => b.end > blockStart && b.start < blockEnd)
                        .sort((a, b) => a.start - b.start);

                    // Find small gaps between appointments
                    let prevEnd = blockStart;
                    for (const b of busy) {
                        const gapStart = Math.max(prevEnd, blockStart);
                        const gapEnd = b.start;
                        if (gapEnd > gapStart) {
                            const gapMinutes = gapEnd - gapStart;
                            const gapStartStr = `${String(Math.floor(gapStart / 60)).padStart(2, '0')}:${String(gapStart % 60).padStart(2, '0')}`;
                            // Only include gaps that are not in the past
                            if (gapStartStr >= currentTime && gapMinutes >= 5) {
                                const gapEndStr = `${String(Math.floor(gapEnd / 60)).padStart(2, '0')}:${String(gapEnd % 60).padStart(2, '0')}`;
                                overbookingSlots.push({
                                    id: `overbooking-gap-${block.medicoId}-${gapStartStr}`,
                                    oraInizio: gapStartStr,
                                    oraFine: gapEndStr,
                                    durata: gapMinutes,
                                    medico: medicoNameMap[block.medicoId] || null,
                                    medicoId: block.medicoId,
                                    type: 'gap',
                                    label: `Buco di ${gapMinutes} min (durata visita: ${durataMinuti} min)`
                                });
                            }
                        }
                        prevEnd = Math.max(prevEnd, b.end);
                    }

                    // Offer end-of-block overbooking (after last appointment)
                    const lastBusyEnd = busy.length > 0 ? Math.max(...busy.map(b => b.end)) : blockStart;
                    const overbookStart = Math.max(lastBusyEnd, blockEnd);
                    const overbookStartStr = `${String(Math.floor(overbookStart / 60)).padStart(2, '0')}:${String(overbookStart % 60).padStart(2, '0')}`;
                    const overbookEnd = overbookStart + durataMinuti;
                    const overbookEndStr = `${String(Math.floor(overbookEnd / 60)).padStart(2, '0')}:${String(overbookEnd % 60).padStart(2, '0')}`;

                    if (overbookStartStr >= currentTime) {
                        overbookingSlots.push({
                            id: `overbooking-end-${block.medicoId}-${overbookStartStr}`,
                            oraInizio: overbookStartStr,
                            oraFine: overbookEndStr,
                            durata: durataMinuti,
                            medico: medicoNameMap[block.medicoId] || null,
                            medicoId: block.medicoId,
                            type: 'end_of_block',
                            label: `Fuori fascia: ${overbookStartStr}–${overbookEndStr} (non garantito)`
                        });
                    }
                }
            }
        }

        logger.debug({ sessionId: session.id, totalSlots: freeSlots.length, emptyReason, overbookingCount: overbookingSlots.length }, 'available-times: Computed free slots');
        res.json({
            success: true,
            data: freeSlots,
            emptyReason,
            overbookingSlots: overbookingSlots.length > 0 ? overbookingSlots : undefined,
            meta: { currentTime, isToday, totalPossibleSlots, pastSlots }
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', sessionId: req.queueSession?.id }, 'Error computing available times');
        res.status(500).json({ success: false, error: 'Errore nel calcolo degli orari disponibili' });
    }
});

/**
 * POST /:token/walkin - Registra paziente walk-in
 * P69: Auto-crea appuntamento se la sessione ha prestazione configurata
 * 
 * Flusso:
 * 1. Se slotId fornito: crea appuntamento da slot disponibilità
 * 2. Se session.config.prestazioneId: auto-crea appuntamento (ora corrente + durata config)
 * 3. Fallback: solo entry coda senza appuntamento
 */
router.post('/:token/walkin', validateQueueToken, async (req, res) => {
    try {
        const session = req.queueSession;
        const { patientId, walkInData, slotId, prestazioneId, selectedTime, selectedMedicoId } = req.body;
        const sessionConfig = (session.config || {});

        // P53: Determine if a questionnaire is configured for this session
        const hasQuestionario = sessionConfig.questionarioTemplateId &&
            sessionConfig.questionarioMode && sessionConfig.questionarioMode !== 'DISABLED';
        // When questionnaire is pending, set appointment to CONFERMATO (will become IN_ATTESA after completion)
        const appointmentStato = hasQuestionario ? 'CONFERMATO' : 'IN_ATTESA';

        // Validazione base dati walk-in
        if (!patientId && !walkInData) {
            return res.status(400).json({
                success: false,
                error: 'Dati paziente mancanti'
            });
        }

        if (walkInData) {
            if (!walkInData.lastName || !walkInData.firstName) {
                return res.status(400).json({
                    success: false,
                    error: 'Nome e cognome sono obbligatori'
                });
            }
        }

        let effectivePatientId = patientId;
        let appointmentId = null;

        // Helper: crea Person + TenantProfile + PersonRole per nuovo walk-in
        // Genera username (nome.cognome), password temporanea sicura casuale, ruolo PAZIENTE
        const createNewPatient = async () => {
            if (effectivePatientId || !walkInData) return;

            // Auto-fill birthDate e gender dal codice fiscale se non forniti
            let { birthDate, gender, birthPlace, provinciaNascita, sesso } = walkInData;
            // Support both 'gender' and 'sesso' field names from frontend
            if (!gender && sesso) gender = sesso;
            if (walkInData.taxCode && walkInData.taxCode.length >= 16) {
                const cfData = parseFiscalCode(walkInData.taxCode);
                if (cfData) {
                    if (!birthDate) birthDate = cfData.birthDate;
                    if (!gender) gender = cfData.gender;
                }
            }

            // Sanitize birthDate: validate it's a real date, not a phone number or garbage
            if (birthDate) {
                const parsedBirthDate = birthDate instanceof Date ? birthDate : new Date(birthDate);
                if (isNaN(parsedBirthDate.getTime()) || parsedBirthDate.getFullYear() < 1900 || parsedBirthDate.getFullYear() > 2100) {
                    logger.warn({ birthDate: typeof birthDate === 'string' ? birthDate.substring(0, 20) : 'Date object', walkInLastName: walkInData.lastName }, 'Invalid birthDate in walk-in data, resetting to null');
                    birthDate = null;
                } else {
                    birthDate = parsedBirthDate;
                }
            }

            // Helper: assicura che un paziente abbia PersonTenantProfile e PersonRole nel tenant
            const ensurePatientTenantAccess = async (personId) => {
                // PersonTenantProfile
                const existingProfile = await prisma.personTenantProfile.findFirst({
                    where: { personId, tenantId: session.tenantId, deletedAt: null }
                });
                if (!existingProfile) {
                    await prisma.personTenantProfile.create({
                        data: {
                            personId,
                            tenantId: session.tenantId,
                            email: walkInData.email || null,
                            phone: walkInData.phone || null,
                            status: 'ACTIVE'
                        }
                    });
                }
                // PersonRole PAZIENTE
                const existingRole = await prisma.personRole.findFirst({
                    where: { personId, tenantId: session.tenantId, roleType: 'PAZIENTE', deletedAt: null }
                });
                if (!existingRole) {
                    await prisma.personRole.create({
                        data: {
                            personId,
                            tenantId: session.tenantId,
                            roleType: 'PAZIENTE'
                        }
                    });
                }
            };

            try {
                // P53-S23: Fuzzy name duplicate detection before creating new patient
                const lastNameVariants = generateNameVariants(walkInData.lastName);
                const firstNameVariants = generateNameVariants(walkInData.firstName);
                const fuzzyExisting = await prisma.person.findMany({
                    where: {
                        deletedAt: null,
                        OR: lastNameVariants.map(v => ({ lastName: { contains: v, mode: 'insensitive' } })),
                        AND: firstNameVariants.length > 0
                            ? [{ OR: firstNameVariants.map(v => ({ firstName: { contains: v, mode: 'insensitive' } })) }]
                            : undefined
                    },
                    select: { id: true, firstName: true, lastName: true, taxCode: true, username: true },
                    take: 5
                });

                // Post-filter: require exact normalized match
                const normalizedLN = normalizeName(walkInData.lastName);
                const normalizedFN = normalizeName(walkInData.firstName);
                const match = fuzzyExisting.find(p =>
                    normalizeName(p.lastName) === normalizedLN &&
                    normalizeName(p.firstName) === normalizedFN
                );

                if (match) {
                    effectivePatientId = match.id;
                    await ensurePatientTenantAccess(match.id);

                    // Se il paziente non ha username/password, generali ora
                    // Principio del minimo privilegio: controlla esistenza hash senza fetcharlo
                    const matchHasPassword = await prisma.person.count({
                        where: { id: match.id, password: { not: null } }
                    }) > 0;
                    if (!match.username || !matchHasPassword) {
                        const updates = {};
                        if (!match.username) {
                            updates.username = await PersonService.generateUniqueUsername( // F314
                                walkInData.firstName, walkInData.lastName
                            );
                        }
                        if (!matchHasPassword) {
                            updates.password = await bcrypt.hash(generatePatientTempPassword(), 12);
                            updates.mustChangePassword = true;
                        }
                        if (Object.keys(updates).length > 0) {
                            await prisma.person.update({
                                where: { id: match.id },
                                data: updates
                            });
                        }
                    }

                    logger.info({ personId: match.id, fuzzyMatch: true }, 'Walk-in: found existing patient by fuzzy name match');
                    return;
                }

                // Genera username e password sicura casuale per nuovo paziente
                const username = await PersonService.generateUniqueUsername( // F314
                    walkInData.firstName, walkInData.lastName
                );
                const hashedPassword = await bcrypt.hash(generatePatientTempPassword(), 12);

                const newPerson = await prisma.person.create({
                    data: {
                        firstName: walkInData.firstName,
                        lastName: walkInData.lastName,
                        username,
                        password: hashedPassword,
                        mustChangePassword: true,
                        taxCode: walkInData.taxCode || null,
                        gender: gender || 'NOT_SPECIFIED',
                        birthDate: birthDate || null,
                        birthPlace: birthPlace || null,
                        birthProvince: provinciaNascita || null,
                        tenantProfiles: {
                            create: {
                                tenantId: session.tenantId,
                                email: walkInData.email || null,
                                phone: walkInData.phone || null,
                                residenceAddress: walkInData.residenza || null,
                                residenceCity: walkInData.comuneResidenza || null,
                                status: 'ACTIVE'
                            }
                        },
                        personRoles: {
                            create: {
                                tenantId: session.tenantId,
                                roleType: 'PAZIENTE'
                            }
                        }
                    }
                });
                effectivePatientId = newPerson.id;
                logger.info({ personId: newPerson.id, username, tenantId: session.tenantId }, 'New walk-in patient created with credentials and PAZIENTE role');
            } catch (createErr) {
                // Se esiste già un paziente con lo stesso codice fiscale, cercalo
                if (createErr.code === 'P2002' && walkInData.taxCode) {
                    const existing = await prisma.person.findFirst({
                        where: { taxCode: walkInData.taxCode, deletedAt: null }
                    });
                    if (existing) {
                        effectivePatientId = existing.id;
                        await ensurePatientTenantAccess(existing.id);
                        logger.info({ personId: existing.id }, 'Walk-in: found existing patient by taxCode');
                        return;
                    }
                }
                throw createErr;
            }
        };

        // Helper: genera numero prenotazione
        const generateNumeroPrenotazione = async (date) => {
            const d = new Date(date);
            const startOfDay = new Date(Date.UTC(
                d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0
            ));
            const endOfDay = new Date(Date.UTC(
                d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999
            ));
            const countToday = await prisma.appuntamento.count({
                where: { tenantId: session.tenantId, dataOra: { gte: startOfDay, lte: endOfDay } }
            });
            return `${startOfDay.toISOString().split('T')[0]}-${String(countToday + 1).padStart(4, '0')}`;
        };

        // Helper: Convert Italian local time (HH:mm from slot oraInizio) to proper UTC Date
        // Slot times represent Europe/Rome local time; server runs in UTC
        const italianLocalToUTC = (dateUtc, timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const year = dateUtc.getUTCFullYear();
            const month = dateUtc.getUTCMonth();
            const day = dateUtc.getUTCDate();
            // Determine Italy's UTC offset for this date (CET=+1, CEST=+2)
            const refUtc = new Date(Date.UTC(year, month, day, 12, 0, 0));
            const parts = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Europe/Rome',
                hour: 'numeric',
                hour12: false
            }).formatToParts(refUtc);
            const romeHourAtNoon = parseInt(parts.find(p => p.type === 'hour')?.value || '13');
            const offsetHours = romeHourAtNoon - 12;
            return new Date(Date.UTC(year, month, day, hours - offsetHours, minutes, 0));
        };

        // CRITICAL: Use slotDisponibilita.data as authoritative date (session.date may have
        // timezone offset from startOfDay). This ensures correct day, ambulatorio, and slot linking.
        const effectiveDate = session.slotDisponibilita?.data
            ? new Date(session.slotDisponibilita.data)
            : new Date(session.date);
        // Normalize to UTC midnight for Prisma @db.Date queries
        const effectiveDateUTC = new Date(Date.UTC(
            effectiveDate.getUTCFullYear(), effectiveDate.getUTCMonth(), effectiveDate.getUTCDate()
        ));

        // === FLUSSO 1: Crea appuntamento da slot disponibilità ===
        if (slotId) {
            const slot = await prisma.slotDisponibilita.findFirst({
                where: {
                    id: slotId,
                    tenantId: session.tenantId,
                    stato: 'LIBERO',
                    appuntamentoId: null,
                    disponibile: true,
                    deletedAt: null
                }
            });

            if (!slot) {
                return res.status(400).json({ success: false, error: 'Lo slot selezionato non è più disponibile' });
            }

            await createNewPatient();

            // Build dataOra: frontend sends UTC ISO string, fallback converts Italian local time
            const { selectedDateTime: slotDateTime } = req.body;
            const dataOra = slotDateTime
                ? new Date(slotDateTime)
                : italianLocalToUTC(effectiveDateUTC, slot.oraInizio);

            const numeroPrenotazione = await generateNumeroPrenotazione(effectiveDate);
            const effectivePrestazioneId = slot.prestazioneId || prestazioneId || sessionConfig.prestazioneId;
            if (!effectivePrestazioneId) {
                return res.status(400).json({ success: false, error: 'Prestazione non specificata per questo slot' });
            }

            const appointment = await prisma.appuntamento.create({
                data: {
                    numeroPrenotazione,
                    pazienteId: effectivePatientId,
                    medicoId: slot.medicoId,
                    ambulatorioId: slot.ambulatorioId,
                    prestazioneId: effectivePrestazioneId,
                    dataOra,
                    durataMinuti: slot.durataSlotMinuti || sessionConfig.durataMinutiDefault || 30,
                    stato: appointmentStato,
                    tenantId: session.tenantId,
                    createdBy: 'SISTEMA_QUEUE',
                    isOverbooking: false,
                    oraArrivo: new Date(),
                    ...(sessionConfig.convenzioneId ? { convenzioneId: sessionConfig.convenzioneId } : {})
                }
            });
            appointmentId = appointment.id;

            await prisma.slotDisponibilita.update({
                where: { id: slotId },
                data: { appuntamentoId: appointment.id, stato: 'OCCUPATO' }
            });

            logger.info({ appointmentId: appointment.id, slotId, sessionId: session.id }, 'Walk-in appointment from slot');
        }
        // === FLUSSO 1b: Crea appuntamento da orario selezionato (computed slot senza SlotDisponibilita) ===
        else if (selectedTime && selectedMedicoId) {
            await createNewPatient();

            if (!effectivePatientId) {
                return res.status(400).json({ success: false, error: 'ID paziente necessario per creare appuntamento' });
            }

            const effectivePrestazioneId = prestazioneId || sessionConfig.prestazioneId;
            if (!effectivePrestazioneId) {
                return res.status(400).json({ success: false, error: 'Prestazione non configurata per la sessione' });
            }

            // Try to find medico's ambulatorio from their SlotDisponibilita or DisponibilitaMedico
            // Use effectiveDateUTC (from slotDisponibilita.data) for correct date queries
            let ambulatorioId = null;

            // P53-S23 FIX: Prefer session's linked slot ambulatorio (authoritative after cascade)
            if (session.slotDisponibilita?.ambulatorioId && session.slotDisponibilita.medicoId === selectedMedicoId) {
                ambulatorioId = session.slotDisponibilita.ambulatorioId;
            }

            // 1. Check SlotDisponibilita for this medico on this date
            if (!ambulatorioId) {
                const medicoSlot = await prisma.slotDisponibilita.findFirst({
                    where: {
                        tenantId: session.tenantId,
                        medicoId: selectedMedicoId,
                        data: effectiveDateUTC,
                        deletedAt: null
                    },
                    select: { ambulatorioId: true }
                });
                if (medicoSlot) {
                    ambulatorioId = medicoSlot.ambulatorioId;
                }
            }

            // 2. If not found, check DisponibilitaMedico for this day-of-week
            if (!ambulatorioId) {
                const dayOfWeek = effectiveDateUTC.getUTCDay();
                const medicoDisp = await prisma.disponibilitaMedico.findFirst({
                    where: {
                        tenantId: session.tenantId,
                        medicoId: selectedMedicoId,
                        giorno: dayOfWeek,
                        attivo: true,
                        deletedAt: null
                    },
                    select: { ambulatorioId: true }
                });
                if (medicoDisp) {
                    ambulatorioId = medicoDisp.ambulatorioId;
                }
            }

            // 3. Fallback to session ambulatorio
            if (!ambulatorioId) {
                const sessionAmbulatori = await prisma.queueSessionAmbulatorio.findMany({
                    where: { sessionId: session.id },
                    select: { ambulatorioId: true }
                });
                ambulatorioId = session.ambulatorioId ||
                    (sessionAmbulatori.length > 0 ? sessionAmbulatori[0].ambulatorioId : null);
            }

            if (!ambulatorioId) {
                return res.status(400).json({ success: false, error: 'Ambulatorio non configurato per la sessione' });
            }

            // Build dataOra: frontend sends UTC ISO string, fallback converts Italian local time
            const { selectedDateTime } = req.body;
            const dataOra = selectedDateTime
                ? new Date(selectedDateTime)
                : italianLocalToUTC(effectiveDateUTC, selectedTime);

            const numeroPrenotazione = await generateNumeroPrenotazione(effectiveDate);

            const appointment = await prisma.appuntamento.create({
                data: {
                    numeroPrenotazione,
                    pazienteId: effectivePatientId,
                    medicoId: selectedMedicoId,
                    ambulatorioId,
                    prestazioneId: effectivePrestazioneId,
                    dataOra,
                    durataMinuti: sessionConfig.durataMinutiDefault || 30,
                    stato: appointmentStato,
                    tenantId: session.tenantId,
                    createdBy: 'SISTEMA_QUEUE',
                    isOverbooking: false,
                    oraArrivo: new Date(),
                    ...(sessionConfig.convenzioneId ? { convenzioneId: sessionConfig.convenzioneId } : {})
                }
            });
            appointmentId = appointment.id;

            // Link to matching SlotDisponibilita if one exists for this time/medico
            // Use effectiveDateUTC for correct date matching
            try {
                const matchingSlot = await prisma.slotDisponibilita.findFirst({
                    where: {
                        tenantId: session.tenantId,
                        medicoId: selectedMedicoId,
                        data: effectiveDateUTC,
                        oraInizio: selectedTime,
                        stato: 'LIBERO',
                        disponibile: true,
                        appuntamentoId: null,
                        deletedAt: null
                    }
                });
                if (matchingSlot) {
                    await prisma.slotDisponibilita.update({
                        where: { id: matchingSlot.id },
                        data: { appuntamentoId: appointment.id, stato: 'OCCUPATO' }
                    });
                    logger.info({ slotId: matchingSlot.id, appointmentId: appointment.id, ambulatorioId: matchingSlot.ambulatorioId }, 'Linked walk-in appointment to existing slot');
                } else {
                    // Try broader match: any slot for this medico on this date with matching or overlapping time
                    const anySlot = await prisma.slotDisponibilita.findFirst({
                        where: {
                            tenantId: session.tenantId,
                            medicoId: selectedMedicoId,
                            data: effectiveDateUTC,
                            stato: 'LIBERO',
                            disponibile: true,
                            appuntamentoId: null,
                            deletedAt: null,
                            oraInizio: { lte: selectedTime },
                            oraFine: { gte: selectedTime }
                        }
                    });
                    if (anySlot) {
                        await prisma.slotDisponibilita.update({
                            where: { id: anySlot.id },
                            data: { appuntamentoId: appointment.id, stato: 'OCCUPATO' }
                        });
                        logger.info({ slotId: anySlot.id, appointmentId: appointment.id, slotTime: `${anySlot.oraInizio}-${anySlot.oraFine}` }, 'Linked walk-in appointment to overlapping slot');
                    } else {
                        logger.info({ medicoId: selectedMedicoId, date: effectiveDateUTC.toISOString(), time: selectedTime }, 'No matching SlotDisponibilita found for walk-in (appointment created without slot link)');
                    }
                }
            } catch (linkErr) {
                logger.warn({ error: linkErr.message }, 'Could not link walk-in appointment to slot (non-critical)');
            }

            logger.info({
                appointmentId: appointment.id,
                selectedTime,
                medicoId: selectedMedicoId,
                sessionId: session.id
            }, 'Walk-in appointment from computed time slot');
        }
        // === FLUSSO 2: Auto-crea appuntamento da config sessione (P69) ===
        // Smart resolution: pick best medico (least appointments on this date) + correct ambulatorio
        else if (sessionConfig.prestazioneId) {
            await createNewPatient();

            if (!effectivePatientId) {
                return res.status(400).json({ success: false, error: 'ID paziente necessario per creare appuntamento' });
            }

            // Recupera medici della sessione
            const sessionMedici = await prisma.queueSessionMedico.findMany({
                where: { sessionId: session.id },
                include: { medico: { select: { personId: true } } },
                orderBy: { ordine: 'asc' }
            });
            const medicoPersonIds = sessionMedici.map(sm => sm.medico.personId);

            if (medicoPersonIds.length === 0) {
                logger.warn({ sessionId: session.id }, 'Walk-in Flow 2: no medici assigned to session');
                // Crea solo entry coda senza appuntamento
            } else {
                // Pick the medico with the fewest appointments on this date (load balancing)
                const startOfDayUTC = new Date(Date.UTC(
                    effectiveDateUTC.getUTCFullYear(), effectiveDateUTC.getUTCMonth(), effectiveDateUTC.getUTCDate(), 0, 0, 0, 0
                ));
                const endOfDayUTC = new Date(Date.UTC(
                    effectiveDateUTC.getUTCFullYear(), effectiveDateUTC.getUTCMonth(), effectiveDateUTC.getUTCDate(), 23, 59, 59, 999
                ));

                const appointmentCounts = await prisma.appuntamento.groupBy({
                    by: ['medicoId'],
                    where: {
                        tenantId: session.tenantId,
                        medicoId: { in: medicoPersonIds },
                        dataOra: { gte: startOfDayUTC, lte: endOfDayUTC },
                        stato: { notIn: ['ANNULLATO', 'NO_SHOW'] },
                        deletedAt: null
                    },
                    _count: { id: true }
                });

                const countMap = {};
                for (const ac of appointmentCounts) {
                    countMap[ac.medicoId] = ac._count.id;
                }

                // Sort medici by appointment count (ascending) to pick the least busy
                const sortedMedici = [...medicoPersonIds].sort((a, b) => (countMap[a] || 0) - (countMap[b] || 0));
                const medicoPersonId = sortedMedici[0];

                // Resolve ambulatorio for the chosen medico (same 3-level strategy as Flow 1b)
                let ambulatorioId = null;

                // P53-S23 FIX: Prefer session's linked slot ambulatorio (authoritative after cascade)
                if (session.slotDisponibilita?.ambulatorioId && session.slotDisponibilita.medicoId === medicoPersonId) {
                    ambulatorioId = session.slotDisponibilita.ambulatorioId;
                }

                // 1. Check SlotDisponibilita for this medico on this date
                if (!ambulatorioId) {
                    const medicoSlot = await prisma.slotDisponibilita.findFirst({
                        where: {
                            tenantId: session.tenantId,
                            medicoId: medicoPersonId,
                            data: effectiveDateUTC,
                            deletedAt: null
                        },
                        select: { ambulatorioId: true }
                    });
                    if (medicoSlot) {
                        ambulatorioId = medicoSlot.ambulatorioId;
                    }
                }

                // 2. Check DisponibilitaMedico for this day-of-week
                if (!ambulatorioId) {
                    const dayOfWeek = effectiveDateUTC.getUTCDay();
                    const medicoDisp = await prisma.disponibilitaMedico.findFirst({
                        where: {
                            tenantId: session.tenantId,
                            medicoId: medicoPersonId,
                            giorno: dayOfWeek,
                            attivo: true,
                            deletedAt: null
                        },
                        select: { ambulatorioId: true }
                    });
                    if (medicoDisp) {
                        ambulatorioId = medicoDisp.ambulatorioId;
                    }
                }

                // 3. Fallback to session ambulatorio
                if (!ambulatorioId) {
                    ambulatorioId = session.ambulatorioId;
                }

                if (!ambulatorioId) {
                    logger.warn({ sessionId: session.id, medicoPersonId }, 'Walk-in Flow 2: missing ambulatorio');
                } else {
                    const now = new Date();
                    // Use effectiveDate + current local time (no UTC offset) for consistent timezone handling
                    const dataOra = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth(), effectiveDate.getDate(), now.getHours(), now.getMinutes(), 0, 0);

                    const numeroPrenotazione = await generateNumeroPrenotazione(effectiveDate);

                    const appointment = await prisma.appuntamento.create({
                        data: {
                            numeroPrenotazione,
                            pazienteId: effectivePatientId,
                            medicoId: medicoPersonId,
                            ambulatorioId,
                            prestazioneId: sessionConfig.prestazioneId,
                            dataOra,
                            durataMinuti: sessionConfig.durataMinutiDefault || 30,
                            stato: appointmentStato,
                            tenantId: session.tenantId,
                            createdBy: 'SISTEMA_QUEUE',
                            isOverbooking: false,
                            oraArrivo: now,
                            ...(sessionConfig.convenzioneId ? { convenzioneId: sessionConfig.convenzioneId } : {})
                        }
                    });
                    appointmentId = appointment.id;

                    // Link to matching SlotDisponibilita if available
                    try {
                        const matchingSlot = await prisma.slotDisponibilita.findFirst({
                            where: {
                                tenantId: session.tenantId,
                                medicoId: medicoPersonId,
                                data: effectiveDateUTC,
                                stato: 'LIBERO',
                                disponibile: true,
                                appuntamentoId: null,
                                deletedAt: null
                            },
                            orderBy: { oraInizio: 'asc' }
                        });
                        if (matchingSlot) {
                            await prisma.slotDisponibilita.update({
                                where: { id: matchingSlot.id },
                                data: { appuntamentoId: appointment.id, stato: 'OCCUPATO' }
                            });
                            logger.info({ slotId: matchingSlot.id, appointmentId: appointment.id }, 'Flow 2: linked appointment to slot');
                        }
                    } catch (linkErr) {
                        logger.warn({ error: linkErr.message }, 'Flow 2: could not link slot (non-critical)');
                    }

                    logger.info({
                        appointmentId: appointment.id,
                        medicoPersonId,
                        ambulatorioId,
                        prestazioneId: sessionConfig.prestazioneId,
                        durataMinuti: sessionConfig.durataMinutiDefault || 30,
                        sessionId: session.id
                    }, 'Walk-in auto-appointment from session config (Flow 2)');
                }
            }
        }

        // Crea entry coda
        const entry = await QueueCheckInService.registerWalkIn(
            session.id,
            walkInData,
            effectivePatientId
        );

        // Collega appuntamento alla entry se creato
        if (appointmentId) {
            await prisma.numeroChiamata.update({
                where: { id: entry.id },
                data: {
                    appuntamentoId: appointmentId,
                    tipoAccesso: 'APPUNTAMENTO'
                }
            });
        }

        // Ottieni stato attesa
        const waitingStatus = await QueueCheckInService.getWaitingStatus(entry.id);

        res.json({
            success: true,
            data: {
                entry: {
                    id: entry.id,
                    displayNumber: entry.displayNumber,
                    numero: entry.numero,
                    checkInAt: entry.checkInAt,
                    checkInOrder: entry.checkInOrder
                },
                appointment: appointmentId ? { id: appointmentId } : null,
                waiting: waitingStatus,
                // P53: Signal questionnaire pending to frontend
                questionarioPending: hasQuestionario && appointmentId ? {
                    templateId: sessionConfig.questionarioTemplateId,
                    templateNome: sessionConfig.questionarioTemplateNome,
                    mode: sessionConfig.questionarioMode,
                    appointmentId
                } : null
            },
            message: appointmentId
                ? 'Prenotazione e registrazione in coda effettuate con successo'
                : 'Registrazione effettuata con successo'
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', sessionId: req.queueSession?.id }, 'Error registering walk-in');
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /:token/status/:entryId - Stato attesa paziente
 * Restituisce posizione in coda e tempo stimato
 */
router.get('/:token/status/:entryId', validateQueueToken, async (req, res) => {
    try {
        const { entryId } = req.params;

        const status = await QueueCheckInService.getWaitingStatus(entryId);

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', entryId: req.params.entryId }, 'Error getting waiting status');
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

// ============================================
// DISPLAY MONITOR - PUBLIC ENDPOINTS (P53.3)
// Accesso pubblico ai monitor display via token
// ============================================

/**
 * GET /display/:accessToken - Accesso pubblico al monitor display
 * Usato da TV/totem in sala d'attesa senza autenticazione
 */
router.get('/display/:accessToken', queueRateLimiter, async (req, res) => {
    try {
        const { accessToken } = req.params;

        if (!accessToken) {
            return res.status(400).json({ success: false, error: 'Token mancante' });
        }

        const monitor = await QueueDisplayMonitorService.getByAccessToken(accessToken);

        if (!monitor) {
            return res.status(404).json({
                success: false,
                error: 'Monitor non trovato o link scaduto'
            });
        }

        // Ottieni stato display
        const displayState = await QueueDisplayMonitorService.getDisplayState(monitor.id);

        res.json({
            success: true,
            data: {
                monitor: {
                    id: monitor.id,
                    nome: monitor.nome,
                    codice: monitor.codice,
                    config: monitor.config,
                    poliambulatorio: monitor.poliambulatorio,
                    ambulatori: monitor.ambulatori
                },
                currentCall: displayState.currentCall,
                recentCalls: displayState.recentCalls,
                waitingCount: displayState.waitingCount
            }
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting public display');
        res.status(500).json({ success: false, error: 'Errore nel recupero del display' });
    }
});

/**
 * GET /display/:accessToken/state - Polling stato display
 * Endpoint leggero per aggiornamento frequente
 */
router.get('/display/:accessToken/state', queueRateLimiter, async (req, res) => {
    try {
        const { accessToken } = req.params;

        const monitor = await QueueDisplayMonitorService.getByAccessToken(accessToken);

        if (!monitor) {
            return res.status(404).json({ success: false, error: 'Monitor non trovato' });
        }

        const displayState = await QueueDisplayMonitorService.getDisplayState(monitor.id);

        res.json({
            success: true,
            data: {
                currentCall: displayState.currentCall,
                recentCalls: displayState.recentCalls,
                waitingCount: displayState.waitingCount,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting display state');
        res.status(500).json({ success: false, error: 'Errore' });
    }
});

// ============================================
// P53: PUBLIC QUESTIONNAIRE ENDPOINTS
// ============================================

/**
 * GET /:token/questionario/:templateId - Get template fields for public questionnaire
 * Returns only the campi (fields) definition, no sensitive data
 */
router.get('/:token/questionario/:templateId', validateQueueToken, async (req, res) => {
    try {
        const { templateId } = req.params;
        const session = req.queueSession;

        logger.info({
            templateId,
            sessionTenantId: session.tenantId,
            sessionId: session.id
        }, 'Public questionario: loading template');

        // P53-S23 FIX: Don't filter by session.tenantId — the admin already validated
        // this template at configuration time. In cross-tenant scenarios, the template
        // may belong to the admin's own tenant while the session operates on another.
        // The templateId is trusted since it comes from the session config (admin-set).
        const template = await prisma.documentoTemplate.findFirst({
            where: {
                id: templateId,
                isActive: true,
                deletedAt: null
            },
            select: {
                id: true,
                nome: true,
                descrizione: true,
                tipo: true,
                campi: true,
                richiedeFirma: true,
                richiedeFirmaMedico: true
            }
        });

        if (!template) {
            // Diagnostic: check why template wasn't found
            const rawTemplate = await prisma.documentoTemplate.findFirst({
                where: { id: templateId },
                select: { id: true, tenantId: true, isActive: true, deletedAt: true, nome: true }
            });
            logger.warn({
                templateId,
                sessionTenantId: session.tenantId,
                rawTemplate: rawTemplate || 'NOT_FOUND_AT_ALL'
            }, 'Public questionario: template not found — diagnostic lookup');

            return res.status(404).json({
                success: false,
                error: 'Questionario non trovato',
                debug: process.env.NODE_ENV !== 'production' ? {
                    templateId,
                    sessionTenantId: session.tenantId,
                    templateExists: !!rawTemplate,
                    templateTenantId: rawTemplate?.tenantId,
                    templateIsActive: rawTemplate?.isActive,
                    templateDeletedAt: rawTemplate?.deletedAt
                } : undefined
            });
        }

        res.json({
            success: true,
            data: template
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting public questionario template');
        res.status(500).json({ success: false, error: 'Errore nel recupero del questionario' });
    }
});

/**
 * POST /:token/questionario/:templateId/submit - Submit questionnaire answers
 * Creates a DocumentoCompilato and transitions appointment from CONFERMATO → IN_ATTESA
 */
router.post('/:token/questionario/:templateId/submit', validateQueueToken, async (req, res) => {
    try {
        const { templateId } = req.params;
        const { appointmentId, risposte } = req.body;
        const session = req.queueSession;

        if (!appointmentId || !risposte) {
            return res.status(400).json({ success: false, error: 'Dati mancanti: appointmentId e risposte obbligatori' });
        }

        // Verify appointment belongs to this session's tenant
        const appointment = await prisma.appuntamento.findFirst({
            where: {
                id: appointmentId,
                tenantId: session.tenantId,
                deletedAt: null
            },
            select: { id: true, pazienteId: true, stato: true }
        });

        if (!appointment) {
            return res.status(404).json({ success: false, error: 'Appuntamento non trovato' });
        }

        // Verify template exists (no tenantId filter — same cross-tenant reason as GET)
        const template = await prisma.documentoTemplate.findFirst({
            where: {
                id: templateId,
                isActive: true,
                deletedAt: null
            },
            select: { id: true, nome: true, campi: true }
        });

        if (!template) {
            return res.status(404).json({ success: false, error: 'Template non trovato' });
        }

        // Use transaction: create compiled document + transition appointment
        const result = await prisma.$transaction(async (tx) => {
            // Create DocumentoCompilato with the patient's responses
            const documento = await tx.documentoCompilato.create({
                data: {
                    documentoTemplateId: templateId,
                    pazienteId: appointment.pazienteId,
                    appuntamentoId: appointmentId,
                    stato: 'COMPLETATO',
                    datiCompilati: risposte,
                    compilatoDa: appointment.pazienteId,
                    tenantId: session.tenantId
                }
            });

            // Transition appointment from CONFERMATO → IN_ATTESA
            if (appointment.stato === 'CONFERMATO') {
                await tx.appuntamento.update({
                    where: { id: appointmentId },
                    data: { stato: 'IN_ATTESA' }
                });
            }

            return documento;
        });

        logger.info({
            sessionId: session.id,
            templateId,
            appointmentId,
            documentoId: result.id
        }, 'Questionnaire submitted, appointment transitioned to IN_ATTESA');

        res.json({
            success: true,
            data: { documentoId: result.id },
            message: 'Questionario completato con successo'
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error submitting questionnaire');
        res.status(500).json({ success: false, error: 'Errore nell\'invio del questionario' });
    }
});

/**
 * POST /:token/questionario/skip - Skip optional questionnaire
 * Transitions appointment from CONFERMATO → IN_ATTESA without creating a document
 */
router.post('/:token/questionario/skip', validateQueueToken, async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const session = req.queueSession;

        if (!appointmentId) {
            return res.status(400).json({ success: false, error: 'appointmentId richiesto' });
        }

        // Verify appointment belongs to tenant
        const appointment = await prisma.appuntamento.findFirst({
            where: {
                id: appointmentId,
                tenantId: session.tenantId,
                stato: 'CONFERMATO',
                deletedAt: null
            }
        });

        if (!appointment) {
            return res.status(404).json({ success: false, error: 'Appuntamento non trovato' });
        }

        // Transition CONFERMATO → IN_ATTESA
        await prisma.appuntamento.update({
            where: { id: appointmentId },
            data: { stato: 'IN_ATTESA' }
        });

        logger.info({
            appointmentId,
            sessionId: session.id,
            tenantId: session.tenantId
        }, 'Questionnaire skipped, appointment transitioned to IN_ATTESA');

        res.json({
            success: true,
            message: 'Questionario saltato, appuntamento in attesa'
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error skipping questionnaire');
        res.status(500).json({ success: false, error: 'Errore nel saltare il questionario' });
    }
});
export default router;
