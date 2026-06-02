/**
 * Public Booking Routes (P67)
 * Endpoints pubblici per prenotazioni online
 * Crea Appuntamenti REALI visibili in /calendario e /appuntamenti
 * Non richiedono autenticazione, usano publicContentMiddleware per tenant resolution
 * 
 * @module routes/public-booking-routes
 * @project P67 - Prenotazioni Online Pubbliche
 */

import express from 'express';
import { query, param, body, validationResult } from 'express-validator';
import { getMedicoTitle } from '../utils/medicoFormatters.js';
import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';
import { publicContentMiddleware } from '../middleware/brandDetection.js';
import { SlotDisponibilitaService } from '../services/clinical/SlotDisponibilitaService.js';
import { publicRateLimit, publicFormSubmissionLimit } from '../middleware/rateLimiting.js';
import EmailService from '../services/emailService.js';

const router = express.Router();

// ======================================================
// HELPERS
// ======================================================

/**
 * Calculate end time given start time (HH:MM) and duration in minutes
 */
function calculateEndTime(startTime, durationMinutes) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}

/**
 * Resolve price for a prestazione+medico pair.
 * Priority: ListinoPrezzo (medico-specific) > Prestazione.prezzoBase
 */
async function resolvePrezzo(prestazioneId, medicoId, tenantId) {
    const listino = await prisma.listinoPrezzo.findFirst({
        where: {
            prestazioneId,
            medicoId,
            tenantId,
            deletedAt: null
        },
        select: { prezzo: true }
    });
    if (listino && Number(listino.prezzo) > 0) {
        return Number(listino.prezzo);
    }
    const prestazione = await prisma.prestazione.findFirst({
        where: { id: prestazioneId, tenantId, deletedAt: null },
        select: { prezzoBase: true }
    });
    return prestazione ? Number(prestazione.prezzoBase) : null;
}

/**
 * Find or create a Person + PersonTenantProfile for a public patient.
 * Lookup by taxCode (codiceFiscale). If found, reuse existing Person.
 * If PersonTenantProfile doesn't exist for this tenant, create it.
 */
async function findOrCreatePaziente(tx, { nome, cognome, codiceFiscale, telefono, email, residenza, civico, citta }, tenantId) {
    // Lookup by taxCode
    let person = null;
    if (codiceFiscale) {
        person = await tx.person.findFirst({
            where: {
                taxCode: codiceFiscale.toUpperCase(),
                deletedAt: null
            },
            include: {
                tenantProfiles: {
                    where: { tenantId, deletedAt: null },
                    take: 1
                }
            }
        });
    }

    if (person) {
        // Person exists — ensure PersonTenantProfile exists for this tenant
        let profile = person.tenantProfiles[0];
        if (!profile) {
            profile = await tx.personTenantProfile.create({
                data: {
                    personId: person.id,
                    tenantId,
                    phone: telefono,
                    email: email || null,
                    residenceAddress: residenza && civico ? `${residenza}, ${civico}` : residenza || null,
                    residenceCity: citta || null,
                    status: 'ACTIVE',
                    isActive: true
                }
            });
        } else {
            // Update phone if not set
            if (!profile.phone && telefono) {
                await tx.personTenantProfile.update({
                    where: { id: profile.id },
                    data: { phone: telefono }
                });
            }
        }
        return { person, profile, isNew: false };
    }

    // Person does not exist — create both
    const newPerson = await tx.person.create({
        data: {
            firstName: nome.trim(),
            lastName: cognome.trim(),
            taxCode: codiceFiscale ? codiceFiscale.toUpperCase() : null,
            gender: null
        }
    });

    const newProfile = await tx.personTenantProfile.create({
        data: {
            personId: newPerson.id,
            tenantId,
            phone: telefono,
            email: email || null,
            residenceAddress: residenza && civico ? `${residenza}, ${civico}` : residenza || null,
            residenceCity: citta || null,
            status: 'ACTIVE',
            isActive: true
        }
    });

    return { person: newPerson, profile: newProfile, isNew: true };
}


// ======================================================
// PUBLIC SLOTS - Disponibilità visibili pubblicamente
// ======================================================

/**
 * GET /api/public/booking/slots
 * 
 * Recupera gli slot disponibili per prenotazione pubblica.
 * Solo slot con visibilePubblico=true e prenotabileOnline=true.
 * Gli slot sono container di disponibilità (09:00-13:00),
 * NON vengono marcati PRENOTATO — gli appuntamenti individuali gestiscono l'occupazione.
 */
router.get('/booking/slots', [
    publicContentMiddleware,
    query('dataInizio').optional().isISO8601(),
    query('dataFine').optional().isISO8601(),
    query('prestazioneId').optional().isUUID(),
    query('medicoId').optional().isUUID(),
    query('ambulatorioId').optional().isUUID(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const tenantId = req.publicTenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant non identificato. Verificare il dominio.' });
        }

        const {
            dataInizio,
            dataFine,
            prestazioneId,
            medicoId,
            ambulatorioId,
            limit = 100
        } = req.query;

        const slots = await SlotDisponibilitaService.getPublicSlots(tenantId, {
            dataInizio,
            dataFine,
            prestazioneId,
            medicoId,
            ambulatorioId,
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            data: slots,
            count: slots.length
        });

    } catch (error) {
        logger.error('Error fetching public slots', {
            component: 'public-booking-routes',
            action: 'getSlots',
            error: 'Operazione non riuscita'
        });
        res.status(500).json({ error: 'Errore nel recupero disponibilità' });
    }
});

// ======================================================
// PUBLIC TIMES - Sub-slot con stato libero/occupato
// ======================================================

/**
 * GET /api/public/booking/times
 * 
 * Genera gli orari appuntamento (sub-slot) all'interno degli slot disponibilità
 * del medico per un giorno specifico. Ogni sub-slot è marcato libero/occupato
 * in base agli Appuntamenti già esistenti (senza esporre nomi pazienti).
 * 
 * @query {string} medicoId - UUID del medico (required)
 * @query {string} giorno - Data ISO (YYYY-MM-DD) (required)
 * @query {string} [prestazioneId] - UUID della prestazione (optional, refines duration)
 */
router.get('/booking/times', [
    publicContentMiddleware,
    query('medicoId').isUUID().withMessage('medicoId deve essere UUID valido'),
    query('giorno').isISO8601().withMessage('giorno deve essere una data valida (YYYY-MM-DD)'),
    query('prestazioneId').optional().isUUID(),
    query('sedeId').optional().isUUID()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const tenantId = req.publicTenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant non identificato' });
        }

        const { medicoId, giorno, prestazioneId, sedeId } = req.query;

        // Parse day boundaries
        const giornoDate = new Date(giorno + 'T00:00:00.000Z');
        const dataInizio = new Date(Date.UTC(giornoDate.getUTCFullYear(), giornoDate.getUTCMonth(), giornoDate.getUTCDate(), 0, 0, 0, 0));
        const dataFine = new Date(Date.UTC(giornoDate.getUTCFullYear(), giornoDate.getUTCMonth(), giornoDate.getUTCDate(), 23, 59, 59, 999));

        // 1. Find all public availability slots for this medico on this day
        const slots = await prisma.slotDisponibilita.findMany({
            where: {
                tenantId,
                medicoId,
                deletedAt: null,
                visibilePubblico: true,
                prenotabileOnline: true,
                disponibile: true,
                data: {
                    gte: dataInizio,
                    lte: dataFine
                },
                ...(prestazioneId && {
                    OR: [
                        { prestazioneId: null },
                        { prestazioneId }
                    ]
                }),
                ...(sedeId && {
                    ambulatorio: { sedeId }
                })
            },
            include: {
                prestazione: {
                    select: { durataPrevista: true, nome: true }
                },
                ambulatorio: {
                    select: { id: true, nome: true }
                }
            },
            orderBy: { oraInizio: 'asc' }
        });

        if (slots.length === 0) {
            return res.json({
                success: true,
                data: [],
                count: 0,
                message: 'Nessun orario disponibile per questa data'
            });
        }

        // 2. Get existing appointments for this medico on this day
        //    (to determine which sub-slots are occupied)
        const appuntamentiEsistenti = await prisma.appuntamento.findMany({
            where: {
                tenantId,
                medicoId,
                deletedAt: null,
                dataOra: {
                    gte: dataInizio,
                    lte: dataFine
                },
                stato: {
                    notIn: ['ANNULLATO']
                }
            },
            select: {
                dataOra: true,
                durataMinuti: true
            }
        });

        // Build set of occupied time ranges (start minute → end minute of day)
        const occupiedRanges = appuntamentiEsistenti.map(app => {
            const appDate = new Date(app.dataOra);
            const startMin = appDate.getUTCHours() * 60 + appDate.getUTCMinutes();
            return { start: startMin, end: startMin + (app.durataMinuti || 30) };
        });

        // Check if a given time range overlaps with any occupied range
        function isOccupied(startMin, endMin) {
            return occupiedRanges.some(r => startMin < r.end && endMin > r.start);
        }

        // 3. Generate sub-slots for each availability block
        const orariDisponibili = [];
        for (const slot of slots) {
            const durata = slot.durataSlotMinuti || slot.prestazione?.durataPrevista || 30;
            const times = SlotDisponibilitaService.calculateBookingTimes(
                slot.oraInizio,
                slot.oraFine,
                durata
            );

            for (const time of times) {
                const [h, m] = time.split(':').map(Number);
                const startMin = h * 60 + m;
                const endMin = startMin + durata;
                const occupied = isOccupied(startMin, endMin);

                orariDisponibili.push({
                    oraInizio: time,
                    oraFine: calculateEndTime(time, durata),
                    disponibile: !occupied,
                    stato: occupied ? 'occupato' : 'libero',
                    slotId: slot.id,
                    ambulatorioId: slot.ambulatorio?.id || null,
                    durata
                });
            }
        }

        // Deduplicate (same time from multiple overlapping slots) — keep first
        const seen = new Set();
        const deduplicated = orariDisponibili.filter(o => {
            const key = o.oraInizio;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        deduplicated.sort((a, b) => a.oraInizio.localeCompare(b.oraInizio));

        res.json({
            success: true,
            data: deduplicated,
            count: deduplicated.length
        });

    } catch (error) {
        logger.error('Error fetching booking times', {
            component: 'public-booking-routes',
            action: 'getTimes',
            error: 'Operazione non riuscita',
            medicoId: req.query.medicoId,
            giorno: req.query.giorno
        });
        res.status(500).json({ error: 'Errore nel recupero orari' });
    }
});

/**
 * GET /api/public/booking/slots/:slotId/times
 * 
 * Recupera gli orari prenotabili per uno slot specifico.
 * Include stato libero/occupato per ogni sub-slot.
 */
router.get('/booking/slots/:slotId/times', [
    publicContentMiddleware,
    param('slotId').isUUID()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const tenantId = req.publicTenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant non identificato' });
        }

        const { slotId } = req.params;

        const slot = await prisma.slotDisponibilita.findFirst({
            where: {
                id: slotId,
                tenantId,
                deletedAt: null,
                visibilePubblico: true,
                prenotabileOnline: true
            },
            include: {
                prestazione: {
                    select: { durataPrevista: true, nome: true }
                }
            }
        });

        if (!slot) {
            return res.status(404).json({ error: 'Slot non trovato o non disponibile' });
        }

        const durata = slot.durataSlotMinuti || slot.prestazione?.durataPrevista || 30;
        const orari = SlotDisponibilitaService.calculateBookingTimes(
            slot.oraInizio,
            slot.oraFine,
            durata
        );

        // Get existing appointments for this slot's medico+day
        const dataInizio = new Date(slot.data);
        dataInizio.setUTCHours(0, 0, 0, 0);
        const dataFine = new Date(slot.data);
        dataFine.setUTCHours(23, 59, 59, 999);

        const appuntamenti = await prisma.appuntamento.findMany({
            where: {
                tenantId,
                medicoId: slot.medicoId,
                deletedAt: null,
                dataOra: { gte: dataInizio, lte: dataFine },
                stato: { notIn: ['ANNULLATO'] }
            },
            select: { dataOra: true, durataMinuti: true }
        });

        const occupiedRanges = appuntamenti.map(app => {
            const d = new Date(app.dataOra);
            const startMin = d.getUTCHours() * 60 + d.getUTCMinutes();
            return { start: startMin, end: startMin + (app.durataMinuti || 30) };
        });

        const orariConStato = orari.map(time => {
            const [h, m] = time.split(':').map(Number);
            const startMin = h * 60 + m;
            const endMin = startMin + durata;
            const occupied = occupiedRanges.some(r => startMin < r.end && endMin > r.start);
            return {
                oraInizio: time,
                oraFine: calculateEndTime(time, durata),
                disponibile: !occupied,
                stato: occupied ? 'occupato' : 'libero'
            };
        });

        res.json({
            success: true,
            data: {
                slotId: slot.id,
                data: slot.data,
                oraInizio: slot.oraInizio,
                oraFine: slot.oraFine,
                durataMinuti: durata,
                orariPrenotabili: orariConStato,
                prestazione: slot.prestazione?.nome || null
            }
        });

    } catch (error) {
        logger.error('Error fetching slot times', {
            component: 'public-booking-routes',
            action: 'getSlotTimes',
            error: 'Operazione non riuscita',
            slotId: req.params.slotId
        });
        res.status(500).json({ error: 'Errore nel recupero orari' });
    }
});

/**
 * POST /api/public/booking/validate
 * 
 * Valida una richiesta di prenotazione PRIMA di crearla.
 * Verifica anticipo, orario valido, disponibilità.
 */
router.post('/booking/validate', [
    publicRateLimit,
    publicContentMiddleware,
    body('slotId').isUUID().withMessage('slotId deve essere UUID valido'),
    body('oraPrenotazione').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato orario non valido (HH:MM)')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const tenantId = req.publicTenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant non identificato' });
        }

        const { slotId, oraPrenotazione } = req.body;

        const validation = await SlotDisponibilitaService.validatePublicBooking(
            slotId,
            oraPrenotazione,
            tenantId
        );

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.error
            });
        }

        res.json({
            success: true,
            message: 'Prenotazione valida',
            data: {
                slotId,
                oraPrenotazione,
                durataMinuti: validation.durataMinuti,
                orariAlternativi: validation.orariDisponibili
            }
        });

    } catch (error) {
        logger.error('Error validating booking', {
            component: 'public-booking-routes',
            action: 'validate',
            error: 'Operazione non riuscita'
        });
        res.status(500).json({ error: 'Errore nella validazione' });
    }
});

// ======================================================
// PUBLIC PRESTAZIONI - Catalogo con prezzi (ListinoPrezzo > prezzoBase)
// ======================================================

/**
 * GET /api/public/booking/prestazioni
 * 
 * Recupera le prestazioni disponibili per prenotazione pubblica.
 * Include prezzi reali dal tariffario medici (ListinoPrezzo > prezzoBase fallback).
 * Solo prestazioni attive con almeno un medico abilitato che ha slot pubblici.
 * 
 * @query {string} tipo - Filtra per tipo prestazione
 * @query {string} search - Ricerca per nome
 * @query {string} medicoId - Filtra per medico specifico
 */
router.get('/booking/prestazioni', [
    publicContentMiddleware,
    query('tipo').optional().isString().trim(),
    query('search').optional().isString().trim(),
    query('medicoId').optional().isUUID(),
    query('sedeId').optional().isUUID()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const tenantId = req.publicTenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant non identificato' });
        }

        const { tipo, search, medicoId, sedeId } = req.query;

        // Widget settings filter (from publicContentMiddleware → first active API key)
        const ws = req.publicWidgetSettings?.booking || {};
        const wsPrestazioniIds = Array.isArray(ws.prestazioniIds) && ws.prestazioniIds.length > 0 ? ws.prestazioniIds : null;
        const wsBrancheFilter = Array.isArray(ws.brancheFilter) && ws.brancheFilter.length > 0 ? ws.brancheFilter : null;
        const wsSedeIds = Array.isArray(ws.sedeIds) && ws.sedeIds.length > 0 ? ws.sedeIds : null;
        const wsAmbulatorioIds = Array.isArray(ws.ambulatoriIds) && ws.ambulatoriIds.length > 0 ? ws.ambulatoriIds : null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Build slot filter with optional sedeId (query param overrides widget setting)
        const effectiveSedeId = sedeId || null;
        const slotFilter = {
            deletedAt: null,
            visibilePubblico: true,
            prenotabileOnline: true,
            disponibile: true,
            data: { gte: today },
            ...(effectiveSedeId && {
                ambulatorio: {
                    sedeId: effectiveSedeId
                }
            }),
            // Widget settings: ambulatori filter (precise) takes priority over sede filter
            ...(wsAmbulatorioIds && {
                ambulatorioId: { in: wsAmbulatorioIds }
            }),
            ...(!wsAmbulatorioIds && wsSedeIds && !effectiveSedeId && {
                ambulatorio: {
                    sedeId: { in: wsSedeIds }
                }
            })
        };

        const prestazioniWithDoctors = await prisma.prestazione.findMany({
            where: {
                tenantId,
                deletedAt: null,
                attivo: true,
                ...(wsPrestazioniIds && { id: { in: wsPrestazioniIds } }),
                ...(tipo && { tipo }),
                ...(search && {
                    OR: [
                        { nome: { contains: search, mode: 'insensitive' } },
                        { descrizione: { contains: search, mode: 'insensitive' } }
                    ]
                }),
                mediciAbilitati: medicoId
                    ? {
                        // Per Doctor Profile page: include doctor even without slots
                        some: {
                            attivo: true,
                            deletedAt: null,
                            medicoId,
                            medico: {
                                NOT: { firstName: 'ANON', lastName: 'ANON' },
                                deletedAt: null
                            }
                        }
                    }
                    : {
                        // Default: show all active prestazioni with at least one non-ANON doctor.
                        // Slot availability is calculated per-medico in the response (slotDisponibili / onlineBookingAvailable).
                        // This allows clinics to advertise specialties even before online calendar slots are configured.
                        some: {
                            attivo: true,
                            deletedAt: null,
                            medico: {
                                NOT: { firstName: 'ANON', lastName: 'ANON' },
                                deletedAt: null
                            }
                        }
                    },
            },
            select: {
                id: true,
                codice: true,
                nome: true,
                descrizione: true,
                tipo: true,
                durataPrevista: true,
                prezzoBase: true,
                prezzoPrimaVisita: true,
                prezzoControllo: true,
                istruzioniPreparazione: true,
                brancheSpecialistiche: true,
                mediciAbilitati: {
                    where: {
                        attivo: true,
                        deletedAt: null,
                        ...(medicoId && { medicoId }),
                        medico: {
                            NOT: { firstName: 'ANON', lastName: 'ANON' },
                            deletedAt: null
                        }
                    },
                    select: {
                        medicoId: true,
                        durataMedico: true,
                        medico: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                gender: true,
                                slotDisponibilita: {
                                    where: slotFilter,
                                    select: { id: true }
                                }
                            }
                        }
                    }
                },
                // Include listini for price resolution
                listiniPrezzo: {
                    where: {
                        tenantId,
                        deletedAt: null,
                        ...(medicoId && { medicoId })
                    },
                    select: {
                        medicoId: true,
                        prezzo: true
                    }
                }
            },
            orderBy: { nome: 'asc' }
        });

        // Map to response with resolved prices per medico
        let prestazioni = prestazioniWithDoctors.map(p => {
            // When querying for a specific medicoId: always include them even with 0 slots
            // so Doctor Profile pages can show specialties/prestazioni without requiring active agenda
            const mediciConSlot = medicoId
                ? p.mediciAbilitati.filter(ma => ma.medico.slotDisponibilita.length > 0 || ma.medicoId === medicoId)
                : p.mediciAbilitati.filter(ma => ma.medico.slotDisponibilita.length > 0);
            const totalSlots = mediciConSlot.reduce((sum, ma) => sum + ma.medico.slotDisponibilita.length, 0);

            // Resolve price: ListinoPrezzo (medico-specific, non-zero) > prezzoBase
            let prezzoFinale = Number(p.prezzoBase) || 0;
            if (p.listiniPrezzo.length > 0) {
                const listinoValido = p.listiniPrezzo.find(l => Number(l.prezzo) > 0);
                if (listinoValido) {
                    prezzoFinale = Number(listinoValido.prezzo);
                }
            }

            // Medici available for this prestazione
            const mediciDisponibili = mediciConSlot.map(ma => {
                // Per-medico price from listino
                const listinoMedico = p.listiniPrezzo.find(l => l.medicoId === ma.medicoId);
                const prezzoMedico = (listinoMedico && Number(listinoMedico.prezzo) > 0)
                    ? Number(listinoMedico.prezzo)
                    : prezzoFinale;

                return {
                    id: ma.medico.id,
                    nome: `${getMedicoTitle(ma.medico.gender)} ${ma.medico.lastName} ${ma.medico.firstName}`.trim(),
                    slotDisponibili: ma.medico.slotDisponibilita.length,
                    durataMedico: ma.durataMedico || p.durataPrevista,
                    prezzo: prezzoMedico
                };
            });

            return {
                id: p.id,
                codice: p.codice,
                nome: p.nome,
                descrizione: p.descrizione,
                tipo: p.tipo,
                durataPrevista: p.durataPrevista,
                prezzo: prezzoFinale,
                prezzoPrimaVisita: Number(p.prezzoPrimaVisita) || null,
                prezzoControllo: Number(p.prezzoControllo) || null,
                istruzioniPreparazione: p.istruzioniPreparazione,
                brancheSpecialistiche: p.brancheSpecialistiche,
                slotDisponibili: totalSlots,
                onlineBookingAvailable: totalSlots > 0,
                mediciDisponibili
            };
        });

        // Apply branche filter if set (and prestazioniIds not already applied)
        if (wsBrancheFilter && !wsPrestazioniIds) {
            prestazioni = prestazioni.filter(p =>
                p.brancheSpecialistiche.length === 0
                    ? wsBrancheFilter.includes('Altro')
                    : p.brancheSpecialistiche.some(b => wsBrancheFilter.includes(b))
            );
        }

        res.json({
            success: true,
            data: prestazioni,
            count: prestazioni.length
        });

    } catch (error) {
        logger.error('Error fetching public prestazioni', {
            component: 'public-booking-routes',
            action: 'getPrestazioni',
            error: 'Operazione non riuscita'
        });
        res.status(500).json({ error: 'Errore nel recupero prestazioni' });
    }
});

// ======================================================
// PUBLIC BOOKING CREATE - Crea Appuntamento reale
// ======================================================

/**
 * POST /api/public/booking/create
 * 
 * Crea un APPUNTAMENTO REALE visibile in /calendario e /appuntamenti.
 * NON crea più PublicBookingRequest — crea direttamente Appuntamento.
 * 
 * Flow:
 * 1. Valida input (cognome*, nome*, codiceFiscale*, telefono* required)
 * 2. Verifica abilitazione medico per prestazione
 * 3. Trova slot disponibilità contenente l'orario richiesto
 * 4. Verifica nessun appuntamento esistente in quel sub-slot
 * 5. Find/create Person + PersonTenantProfile (lookup by codiceFiscale)
 * 6. Crea Appuntamento con stato PRENOTATO
 * 7. Restituisce ID appuntamento reale
 */
router.post('/booking/create', [
    publicFormSubmissionLimit,
    publicContentMiddleware,
    body('prestazioneId').isUUID().withMessage('prestazioneId deve essere UUID valido'),
    body('medicoId').isUUID().withMessage('medicoId deve essere UUID valido'),
    body('data').isISO8601().withMessage('Data non valida'),
    body('oraPrenotazione').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato orario non valido (HH:MM)'),
    body('cognome').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Cognome richiesto (2-100 caratteri)'),
    body('nome').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Nome richiesto (2-100 caratteri)'),
    body('codiceFiscale').isString().trim().matches(/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i).withMessage('Codice fiscale obbligatorio e non valido'),
    body('telefono').isString().trim().matches(/^[\d\s\+\-()]{6,20}$/).withMessage('Numero di cellulare richiesto'),
    body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail().withMessage('Email non valida'),
    body('residenza').optional({ values: 'falsy' }).isString().trim().isLength({ max: 255 }),
    body('civico').optional({ values: 'falsy' }).isString().trim().isLength({ max: 20 }),
    body('citta').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
    body('note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 500 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const tenantId = req.publicTenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant non identificato' });
        }

        const {
            prestazioneId, medicoId, data, oraPrenotazione,
            cognome, nome, codiceFiscale, telefono,
            email, residenza, civico, citta, note
        } = req.body;

        // 1. Verify medico is authorized for this prestazione
        const abilitazione = await prisma.medicoAbilitato.findFirst({
            where: {
                medicoId,
                prestazioneId,
                tenantId,
                attivo: true,
                deletedAt: null
            },
            select: { durataMedico: true }
        });

        if (!abilitazione) {
            return res.status(400).json({
                success: false,
                error: 'Il medico selezionato non è abilitato per questa prestazione.'
            });
        }

        // 2. Find the availability slot containing the requested time
        const giornoDate = new Date(data + 'T00:00:00.000Z');
        const slot = await prisma.slotDisponibilita.findFirst({
            where: {
                tenantId,
                deletedAt: null,
                medicoId,
                data: giornoDate,
                visibilePubblico: true,
                prenotabileOnline: true,
                disponibile: true,
                oraInizio: { lte: oraPrenotazione },
                oraFine: { gt: oraPrenotazione },
                OR: [
                    { prestazioneId: null },
                    { prestazioneId }
                ]
            },
            include: {
                prestazione: { select: { nome: true, durataPrevista: true } },
                ambulatorio: { select: { id: true, nome: true } }
            }
        });

        if (!slot) {
            return res.status(400).json({
                success: false,
                error: 'Lo slot selezionato non è più disponibile. Riprova con un altro orario.'
            });
        }

        // 3. Determine appointment duration
        const prestazione = await prisma.prestazione.findUnique({
            where: { id: prestazioneId },
            select: { nome: true, durataPrevista: true }
        });
        const durataMinuti = slot.durataSlotMinuti || abilitazione.durataMedico || prestazione?.durataPrevista || 30;

        // 4. Build dataOra from date + time
        const [ore, minuti] = oraPrenotazione.split(':').map(Number);
        const dataOra = new Date(Date.UTC(
            giornoDate.getUTCFullYear(),
            giornoDate.getUTCMonth(),
            giornoDate.getUTCDate(),
            ore, minuti, 0, 0
        ));

        // 5. Check no existing appointment at this exact time for this medico
        const conflitto = await prisma.appuntamento.findFirst({
            where: {
                tenantId,
                medicoId,
                deletedAt: null,
                stato: { notIn: ['ANNULLATO'] },
                dataOra: {
                    gte: new Date(dataOra.getTime()),
                    lt: new Date(dataOra.getTime() + durataMinuti * 60 * 1000)
                }
            },
            select: { id: true }
        });

        // Also check reverse overlap: existing appointments that started earlier
        // but would still be in progress at the requested time
        const conflittoReverse = !conflitto ? await prisma.appuntamento.findFirst({
            where: {
                tenantId,
                medicoId,
                deletedAt: null,
                stato: { notIn: ['ANNULLATO'] },
                dataOra: {
                    gte: new Date(dataOra.getTime() - 120 * 60 * 1000), // max 2h overlap window
                    lt: dataOra
                }
            },
            select: { id: true, dataOra: true, durataMinuti: true }
        }) : null;

        const hasReverseConflict = conflittoReverse &&
            new Date(conflittoReverse.dataOra).getTime() + (conflittoReverse.durataMinuti || 30) * 60 * 1000 > dataOra.getTime();

        if (conflitto || hasReverseConflict) {
            return res.status(409).json({
                success: false,
                error: 'Questo orario è già occupato. Seleziona un altro orario disponibile.'
            });
        }

        // 6. Create Person + PersonTenantProfile + Appuntamento in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Find or create paziente
            const { person: paziente } = await findOrCreatePaziente(tx, {
                nome, cognome, codiceFiscale, telefono, email, residenza, civico, citta
            }, tenantId);

            // Generate numeroPrenotazione
            const year = dataOra.getUTCFullYear();
            const month = dataOra.getUTCMonth();
            const day = dataOra.getUTCDate();
            const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
            const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

            const countToday = await tx.appuntamento.count({
                where: {
                    tenantId,
                    dataOra: { gte: startOfDay, lte: endOfDay }
                }
            });

            const numeroPrenotazione = `${startOfDay.toISOString().split('T')[0]}-${String(countToday + 1).padStart(4, '0')}`;

            // Create the real Appuntamento
            const appuntamento = await tx.appuntamento.create({
                data: {
                    numeroPrenotazione,
                    ambulatorioId: slot.ambulatorioId,
                    prestazioneId,
                    pazienteId: paziente.id,
                    medicoId,
                    dataOra,
                    durataMinuti,
                    stato: 'PRENOTATO',
                    noteInterne: 'Prenotazione online',
                    note: note?.trim() || null,
                    promemoriaEmail: !!email,
                    promemoriaSms: false,
                    tenantId,
                    createdBy: null
                },
                include: {
                    ambulatorio: {
                        select: { id: true, nome: true, codice: true }
                    },
                    prestazione: {
                        select: { id: true, nome: true, codice: true, durataPrevista: true }
                    }
                }
            });

            return { appuntamento, paziente };
        });

        logger.info('Public booking created as Appuntamento', {
            component: 'public-booking-routes',
            action: 'createBooking',
            appuntamentoId: result.appuntamento.id,
            numeroPrenotazione: result.appuntamento.numeroPrenotazione,
            pazienteId: result.paziente.id,
            isNewPaziente: !result.paziente.updatedAt, // rough check
            tenantId
        });

        // Resolve price for response
        const prezzo = await resolvePrezzo(prestazioneId, medicoId, tenantId);

        res.status(201).json({
            success: true,
            message: 'Prenotazione confermata con successo',
            data: {
                id: result.appuntamento.id,
                numeroPrenotazione: result.appuntamento.numeroPrenotazione,
                prestazione: result.appuntamento.prestazione?.nome || 'Visita',
                ambulatorio: result.appuntamento.ambulatorio?.nome || null,
                data,
                orario: oraPrenotazione,
                durataMinuti,
                prezzo,
                stato: 'PRENOTATO',
                paziente: {
                    id: result.paziente.id,
                    nome: result.paziente.firstName,
                    cognome: result.paziente.lastName,
                    birthDate: result.paziente.birthDate || null,
                    birthPlace: result.paziente.birthPlace || null,
                    birthProvince: result.paziente.birthProvince || null
                }
            }
        });

        // Send confirmation email async (fire-and-forget)
        if (email) {
            const sendConfirmationEmail = async () => {
                try {
                    const [medico, tenant] = await Promise.all([
                        prisma.person.findUnique({
                            where: { id: medicoId },
                            select: { firstName: true, lastName: true, gender: true }
                        }),
                        prisma.tenant.findUnique({
                            where: { id: tenantId },
                            select: { name: true, settings: true }
                        })
                    ]);

                    await EmailService.sendAppointmentConfirmation(
                        {
                            dataOra: result.appuntamento.dataOra || dataOra,
                            prestazione: result.appuntamento.prestazione,
                            medico
                        },
                        {
                            firstName: result.paziente.firstName,
                            lastName: result.paziente.lastName,
                            email
                        },
                        {
                            name: tenant?.name || 'ElementMedica',
                            phone: tenant?.settings?.telefono || '',
                            email: tenant?.settings?.email || ''
                        },
                        tenantId
                    );
                    logger.info('Confirmation email queued for public booking', {
                        component: 'public-booking-routes',
                        appuntamentoId: result.appuntamento.id
                    });
                } catch (emailError) {
                    logger.error('Failed to send booking confirmation email', {
                        component: 'public-booking-routes',
                        appuntamentoId: result.appuntamento.id,
                        error: 'Operazione non riuscita'
                    });
                }
            };
            sendConfirmationEmail();
        }

    } catch (error) {
        logger.error('Error creating public booking', {
            component: 'public-booking-routes',
            action: 'createBooking',
            error: 'Operazione non riuscita'
        });

        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Orario già prenotato. Seleziona un altro orario.' });
        }
        if (error.code === 'P2025') {
            return res.status(400).json({ error: 'Slot non più disponibile.' });
        }
        if (error.message?.includes('not found')) {
            return res.status(400).json({ error: 'Dati non validi. Verifica i campi inseriti.' });
        }

        res.status(500).json({ error: 'Errore nella creazione della prenotazione' });
    }
});

// ======================================================
// PUBLIC MEDICI (listing)
// ======================================================

/**
 * GET /api/public/booking/medici
 * 
 * Recupera i medici disponibili per prenotazione pubblica.
 * Solo medici con almeno uno slot pubblico.
 */
router.get('/booking/medici', [
    publicContentMiddleware,
    query('prestazioneId').optional().isUUID()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const tenantId = req.publicTenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant non identificato' });
        }

        const { prestazioneId } = req.query;

        const slotFilter = {
            deletedAt: null,
            visibilePubblico: true,
            prenotabileOnline: true,
            disponibile: true,
            data: { gte: new Date() }
        };

        const medici = await prisma.person.findMany({
            where: {
                deletedAt: null,
                slotDisponibilita: {
                    some: {
                        tenantId,
                        ...slotFilter,
                        ...(prestazioneId && {
                            OR: [
                                { prestazioneId: null },
                                { prestazioneId }
                            ]
                        })
                    }
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
                tenantProfiles: {
                    where: { tenantId, deletedAt: null, isActive: true },
                    select: { title: true },
                    take: 1
                },
                _count: {
                    select: {
                        slotDisponibilita: {
                            where: {
                                tenantId,
                                ...slotFilter
                            }
                        }
                    }
                }
            },
            orderBy: { lastName: 'asc' }
        });

        const mediciFormatted = medici.map(m => ({
            id: m.id,
            nome: `${getMedicoTitle(m.gender)} ${m.lastName} ${m.firstName}`.trim(),
            firstName: m.firstName,
            lastName: m.lastName,
            title: m.tenantProfiles?.[0]?.title || null,
            slotDisponibili: m._count.slotDisponibilita
        }));

        res.json({
            success: true,
            data: mediciFormatted,
            count: mediciFormatted.length
        });

    } catch (error) {
        logger.error('Error fetching public medici', {
            component: 'public-booking-routes',
            action: 'getMedici',
            error: 'Operazione non riuscita'
        });
        res.status(500).json({ error: 'Errore nel recupero medici' });
    }
});

// ======================================================
// PUBLIC SEDI — Sedi del poliambulatorio con orari apertura
// ======================================================

/**
 * GET /api/public/booking/sedi
 * Returns active sedi for the tenant with weekly opening hours.
 */
router.get('/booking/sedi', [
    publicContentMiddleware
], async (req, res) => {
    try {
        const tenantId = req.publicTenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant non identificato' });
        }

        const sedi = await prisma.sedePoliambulatorio.findMany({
            where: {
                tenantId,
                deletedAt: null,
                isAttiva: true
            },
            select: {
                id: true,
                nome: true,
                indirizzo: true,
                citta: true,
                cap: true,
                provincia: true,
                telefono: true,
                isPrincipale: true,
                orariSettimanali: {
                    select: {
                        giornoSettimana: true,
                        fascia: true,
                        oraInizio: true,
                        oraFine: true,
                        isChiuso: true
                    },
                    orderBy: [
                        { giornoSettimana: 'asc' },
                        { fascia: 'asc' }
                    ]
                }
            },
            orderBy: [
                { isPrincipale: 'desc' },
                { nome: 'asc' }
            ]
        });

        // Transform orari into a map of open days (1=Lun..6=Sab, 0=Dom)
        const sediFormatted = sedi.map(sede => {
            const giorniAperti = new Set();
            for (const orario of sede.orariSettimanali) {
                if (!orario.isChiuso) {
                    giorniAperti.add(orario.giornoSettimana);
                }
            }

            return {
                id: sede.id,
                nome: sede.nome,
                indirizzo: sede.indirizzo,
                citta: sede.citta,
                cap: sede.cap,
                provincia: sede.provincia,
                telefono: sede.telefono,
                isPrincipale: sede.isPrincipale,
                giorniAperti: [...giorniAperti].sort(),
                orari: sede.orariSettimanali.filter(o => !o.isChiuso).map(o => ({
                    giorno: o.giornoSettimana,
                    fascia: o.fascia,
                    oraInizio: o.oraInizio,
                    oraFine: o.oraFine
                }))
            };
        });

        res.json({
            success: true,
            data: sediFormatted,
            count: sediFormatted.length
        });

    } catch (error) {
        logger.error('Error fetching public sedi', {
            component: 'public-booking-routes',
            action: 'getSedi',
            error: 'Operazione non riuscita'
        });
        res.status(500).json({ error: 'Errore nel recupero sedi' });
    }
});

// ======================================================
// PUBLIC TIMES MULTI — Times for multiple medici at once
// ======================================================

/**
 * GET /api/public/booking/times-multi
 * Returns availability times for ALL medici doing a specific prestazione on a given day.
 * Used by the "all doctors availability" feature.
 */
router.get('/booking/times-multi', [
    publicContentMiddleware,
    query('prestazioneId').isUUID().withMessage('prestazioneId deve essere UUID valido'),
    query('giorno').isISO8601().withMessage('giorno deve essere una data valida (YYYY-MM-DD)'),
    query('sedeId').optional().isUUID()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const tenantId = req.publicTenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant non identificato' });
        }

        const { prestazioneId, giorno, sedeId } = req.query;

        const giornoDate = new Date(giorno + 'T00:00:00.000Z');
        const dataInizio = new Date(Date.UTC(giornoDate.getUTCFullYear(), giornoDate.getUTCMonth(), giornoDate.getUTCDate(), 0, 0, 0, 0));
        const dataFine = new Date(Date.UTC(giornoDate.getUTCFullYear(), giornoDate.getUTCMonth(), giornoDate.getUTCDate(), 23, 59, 59, 999));

        // Find medici abilitati for this prestazione
        const abilitati = await prisma.medicoAbilitato.findMany({
            where: {
                prestazioneId,
                attivo: true,
                deletedAt: null,
                medico: {
                    deletedAt: null,
                    slotDisponibilita: {
                        some: {
                            tenantId,
                            deletedAt: null,
                            visibilePubblico: true,
                            prenotabileOnline: true,
                            disponibile: true,
                            data: { gte: dataInizio, lte: dataFine },
                            ...(sedeId && { ambulatorio: { sedeId } })
                        }
                    }
                }
            },
            select: {
                medicoId: true,
                durataMedico: true,
                medico: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        gender: true
                    }
                },
                prestazione: {
                    select: { durataPrevista: true }
                }
            }
        });

        // For each medico, get their slots and existing appointments
        const result = [];
        for (const ab of abilitati) {
            const slots = await prisma.slotDisponibilita.findMany({
                where: {
                    tenantId,
                    medicoId: ab.medicoId,
                    deletedAt: null,
                    visibilePubblico: true,
                    prenotabileOnline: true,
                    disponibile: true,
                    data: { gte: dataInizio, lte: dataFine },
                    ...(sedeId && { ambulatorio: { sedeId } }),
                    OR: [
                        { prestazioneId: null },
                        { prestazioneId }
                    ]
                },
                include: {
                    ambulatorio: { select: { id: true, nome: true } }
                },
                orderBy: { oraInizio: 'asc' }
            });

            if (slots.length === 0) continue;

            const appuntamenti = await prisma.appuntamento.findMany({
                where: {
                    tenantId,
                    medicoId: ab.medicoId,
                    deletedAt: null,
                    dataOra: { gte: dataInizio, lte: dataFine },
                    stato: { notIn: ['ANNULLATO'] }
                },
                select: { dataOra: true, durataMinuti: true }
            });

            const occupiedRanges = appuntamenti.map(app => {
                const appDate = new Date(app.dataOra);
                const startMin = appDate.getUTCHours() * 60 + appDate.getUTCMinutes();
                return { start: startMin, end: startMin + (app.durataMinuti || 30) };
            });

            const isOccupied = (startMin, endMin) => occupiedRanges.some(r => startMin < r.end && endMin > r.start);

            const orari = [];
            for (const slot of slots) {
                const durata = slot.durataSlotMinuti || ab.durataMedico || ab.prestazione?.durataPrevista || 30;
                const times = SlotDisponibilitaService.calculateBookingTimes(slot.oraInizio, slot.oraFine, durata);
                for (const time of times) {
                    const [h, m] = time.split(':').map(Number);
                    const startMin = h * 60 + m;
                    const endMin = startMin + durata;
                    const occupied = isOccupied(startMin, endMin);
                    orari.push({
                        oraInizio: time,
                        oraFine: calculateEndTime(time, durata),
                        disponibile: !occupied,
                        stato: occupied ? 'occupato' : 'libero',
                        slotId: slot.id,
                        ambulatorioId: slot.ambulatorio?.id || null,
                        durata
                    });
                }
            }

            // Deduplicate by oraInizio
            const seen = new Set();
            const deduplicated = orari.filter(o => {
                if (seen.has(o.oraInizio)) return false;
                seen.add(o.oraInizio);
                return true;
            }).sort((a, b) => a.oraInizio.localeCompare(b.oraInizio));

            result.push({
                medicoId: ab.medico.id,
                medicoNome: `${getMedicoTitle(ab.medico.gender)} ${ab.medico.lastName} ${ab.medico.firstName}`.trim(),
                orari: deduplicated
            });
        }

        res.json({
            success: true,
            data: result,
            count: result.length
        });

    } catch (error) {
        logger.error('Error fetching multi-medico times', {
            component: 'public-booking-routes',
            action: 'getTimesMulti',
            error: 'Operazione non riuscita'
        });
        res.status(500).json({ error: 'Errore nel recupero orari multi-medico' });
    }
});

export default router;
