/**
 * SlotDisponibilita Service
 * Business logic for appointment slot availability management
 * 
 * @module services/clinical/SlotDisponibilitaService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

export class SlotDisponibilitaService {
    /**
     * Create a new slot
     * Conflict scenarios:
     * 1. Same day + Same time + Same medico + Same ambulatorio + Same tenant = BLOCK (error)
     * 2. Same day + Same time + Same medico + Different ambulatorio + Same tenant = WARN (require confirmation)
     * 3. Same day + Same time + Different medico + Same ambulatorio + Same tenant = WARN (require confirmation)
     * 
     * @param {Object} data - Slot data
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Created slot
     */
    static async create(data, tenantId) {
        try {
            // Check for overlapping slots - now returns 3 categories
            const overlaps = await this.checkOverlapDetailed(
                data.medicoId,
                data.ambulatorioId,
                data.data,
                data.oraInizio,
                data.oraFine,
                tenantId
            );

            // Scenario 1: BLOCK - Same medico + Same ambulatorio (same time, same day, same tenant)
            // Exception: if the overlapping slot is LIBERO and strictly contains the new slot,
            // treat it as an availability window (parent slot) and allow sub-slot creation.
            if (overlaps.sameMedicoSameAmbulatorio.length > 0) {
                const blockers = overlaps.sameMedicoSameAmbulatorio.filter(overlap => {
                    // A LIBERO slot that strictly contains the new slot is an availability window → allow
                    const isParentWindow = (overlap.stato === 'LIBERO' || overlap.stato === 'libero') &&
                        overlap.oraInizio <= data.oraInizio &&
                        overlap.oraFine >= data.oraFine &&
                        !(overlap.oraInizio === data.oraInizio && overlap.oraFine === data.oraFine);
                    return !isParentWindow;
                });
                if (blockers.length === 0) {
                    // All overlaps are parent windows → sub-slot creation is allowed, continue
                } else {
                    const overlap = blockers[0];
                    const medico = await prisma.person.findFirst({ // F246: findFirst+deletedAt
                        where: { id: data.medicoId, deletedAt: null },
                        select: { firstName: true, lastName: true }
                    });
                    const medicoName = medico ? `${medico.firstName || ''} ${medico.lastName || ''}`.trim() : 'il medico selezionato';
                    throw new Error(`Il medico "${medicoName}" ha già una disponibilità dalle ${overlap.oraInizio} alle ${overlap.oraFine} nello stesso ambulatorio. Modifica l'orario o elimina prima la disponibilità esistente.`);
                } // end else blockers
            }

            // Scenario 2: WARN - Same medico + Different ambulatorio (requires forceCreate)
            // Medico is double-booked in different rooms - warn but allow if confirmed
            if (overlaps.sameMedicoDifferentAmbulatorio.length > 0 && !data.forceCreate) {
                const overlap = overlaps.sameMedicoDifferentAmbulatorio[0];
                const medico = await prisma.person.findFirst({ // F246: findFirst+deletedAt
                    where: { id: data.medicoId, deletedAt: null },
                    select: { firstName: true, lastName: true }
                });
                const medicoName = medico ? `${medico.firstName || ''} ${medico.lastName || ''}`.trim() : 'il medico selezionato';
                const ambulatorio = await prisma.ambulatorio.findFirst({
                    where: { id: overlap.ambulatorioId, deletedAt: null },
                    select: { nome: true }
                });
                const ambulatorioName = ambulatorio?.nome || 'altro ambulatorio';
                throw new Error(`Il medico "${medicoName}" ha già una disponibilità dalle ${overlap.oraInizio} alle ${overlap.oraFine} in ${ambulatorioName}. Conferma per creare comunque.`);
            }

            // Scenario 3: WARN - Different medico + Same ambulatorio (requires forceCreate)
            // Room is double-booked with different doctors - warn but allow if confirmed
            if (overlaps.differentMedicoSameAmbulatorio.length > 0 && !data.forceCreate) {
                const overlap = overlaps.differentMedicoSameAmbulatorio[0];
                const otherMedico = await prisma.person.findFirst({ // F246: findFirst+deletedAt
                    where: { id: overlap.medicoId, deletedAt: null },
                    select: { firstName: true, lastName: true }
                });
                const otherMedicoName = otherMedico ? `${otherMedico.firstName || ''} ${otherMedico.lastName || ''}`.trim() : 'un altro medico';
                const ambulatorio = await prisma.ambulatorio.findFirst({
                    where: { id: data.ambulatorioId, deletedAt: null },
                    select: { nome: true }
                });
                const ambulatorioName = ambulatorio?.nome || 'questo ambulatorio';
                throw new Error(`${ambulatorioName} è già occupato dal medico "${otherMedicoName}" dalle ${overlap.oraInizio} alle ${overlap.oraFine}. Conferma per creare comunque.`);
            }

            const slot = await prisma.slotDisponibilita.create({
                data: {
                    tenantId,
                    medicoId: data.medicoId,
                    ambulatorioId: data.ambulatorioId || null,
                    prestazioneId: data.prestazioneId || null,
                    data: new Date(data.data),
                    oraInizio: data.oraInizio,
                    oraFine: data.oraFine,
                    stato: data.stato?.toUpperCase() || 'LIBERO',
                    note: data.note || null
                },
                include: {
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            tenantProfiles: {
                                where: { deletedAt: null, isActive: true },
                                select: { registerCode: true, isPrimary: true },
                                take: 1
                            }
                        }
                    }
                }
            });

            logger.info('Slot created', {
                component: 'slot-service',
                action: 'create',
                slotId: slot.id,
                medicoId: data.medicoId,
                data: data.data,
                tenantId
            });

            return slot;
        } catch (error) {
            logger.error('Failed to create slot', {
                component: 'slot-service',
                action: 'create',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Create multiple slots at once (bulk)
     * @param {Array} slots - Array of slot data
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Result with created and failed
     */
    static async createBulk(slots, tenantId) {
        const results = { created: [], failed: [] };

        for (const slotData of slots) {
            try {
                const slot = await this.create(slotData, tenantId);
                results.created.push(slot);
            } catch (error) {
                results.failed.push({
                    data: slotData,
                    error: error.message
                });
            }
        }

        logger.info('Bulk slots created', {
            component: 'slot-service',
            action: 'createBulk',
            created: results.created.length,
            failed: results.failed.length,
            tenantId
        });

        return results;
    }

    /**
     * Generate SlotDisponibilita from DisponibilitaMedico weekly patterns.
     * 
     * Expands weekly patterns into concrete date-specific slots for a given date range.
     * Respects: validoDal/validoAl on patterns, FerieAssenza exclusions, existing slot dedup.
     * 
     * @param {string} medicoId - Medico person ID
     * @param {string} dataInizio - Start date (YYYY-MM-DD)
     * @param {string} dataFine - End date (YYYY-MM-DD)
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} { created: number, skipped: number, errors: number, details: string[] }
     */
    static async generateFromDisponibilita(medicoId, dataInizio, dataFine, tenantId) {
        try {
            // 1. Fetch all active weekly patterns for this medico
            const patterns = await prisma.disponibilitaMedico.findMany({
                where: {
                    medicoId,
                    tenantId,
                    attivo: true,
                    deletedAt: null
                },
                orderBy: [{ giorno: 'asc' }, { oraInizio: 'asc' }]
            });

            if (patterns.length === 0) {
                return { created: 0, skipped: 0, errors: 0, details: ['Nessun pattern settimanale attivo trovato'] };
            }

            // 2. Fetch FerieAssenza to exclude blocked days
            const ferie = await prisma.ferieAssenza.findMany({
                where: {
                    medicoId,
                    tenantId,
                    deletedAt: null,
                    stato: { not: 'RIFIUTATA' },
                    dataInizio: { lte: new Date(dataFine) },
                    dataFine: { gte: new Date(dataInizio) }
                }
            });

            const start = new Date(dataInizio);
            const end = new Date(dataFine);
            const results = { created: 0, skipped: 0, errors: 0, details: [] };

            // 3. Iterate through each day in the range
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon...6=Sat
                const dateStr = d.toISOString().split('T')[0];
                const currentDate = new Date(dateStr);

                // Check if this date falls within any FerieAssenza
                const isOnLeave = ferie.some(f => {
                    const fStart = new Date(f.dataInizio);
                    const fEnd = new Date(f.dataFine);
                    fStart.setHours(0, 0, 0, 0);
                    fEnd.setHours(23, 59, 59, 999);
                    return currentDate >= fStart && currentDate <= fEnd && f.giornataIntera;
                });

                if (isOnLeave) {
                    continue;
                }

                // Find patterns for this day of week
                const dayPatterns = patterns.filter(p => {
                    if (p.giorno !== dayOfWeek) return false;
                    // Check validoDal/validoAl
                    if (p.validoDal && currentDate < new Date(p.validoDal)) return false;
                    if (p.validoAl && currentDate > new Date(p.validoAl)) return false;
                    return true;
                });

                for (const pattern of dayPatterns) {
                    // ambulatorioId is required for SlotDisponibilita (non-nullable in schema)
                    if (!pattern.ambulatorioId) {
                        results.details.push(`Pattern ${pattern.id} saltato: ambulatorio obbligatorio per generare slot. Modifica il pattern e specifica un ambulatorio.`);
                        results.skipped++;
                        continue;
                    }

                    // P52 Session #11: UN UNICO slot per giorno per fascia di disponibilità
                    // Invece di creare N slot da 30 min, creiamo UN solo SlotDisponibilita
                    // con oraInizio/oraFine del pattern completo e durataSlotMinuti per riferimento booking
                    const oraInizio = pattern.oraInizio;
                    const oraFine = pattern.oraFine;
                    const duration = pattern.durataSlot || 30;

                    // Check for partial-day leave that covers the entire range
                    const partialLeave = ferie.some(f => {
                        if (f.giornataIntera) return false;
                        const fStart = new Date(f.dataInizio);
                        const fEnd = new Date(f.dataFine);
                        fStart.setHours(0, 0, 0, 0);
                        fEnd.setHours(23, 59, 59, 999);
                        if (currentDate < fStart || currentDate > fEnd) return false;
                        // Check time overlap
                        if (f.orarioInizio && f.orarioFine) {
                            return this.timesOverlap(oraInizio, oraFine, f.orarioInizio, f.orarioFine);
                        }
                        return false;
                    });

                    if (partialLeave) {
                        results.skipped++;
                        continue;
                    }

                    // Check if slot already exists (dedup per medico+data+pattern)
                    const existing = await prisma.slotDisponibilita.findFirst({
                        where: {
                            medicoId,
                            data: currentDate,
                            disponibilitaMedicoId: pattern.id,
                            tenantId,
                            deletedAt: null
                        }
                    });

                    if (existing) {
                        results.skipped++;
                        continue;
                    }

                    // Create ONE slot per day per pattern (P68: reference parent pattern)
                    try {
                        await prisma.slotDisponibilita.create({
                            data: {
                                medicoId,
                                ambulatorioId: pattern.ambulatorioId,
                                prestazioneId: pattern.prestazioneId || null,
                                disponibilitaMedicoId: pattern.id,
                                data: currentDate,
                                oraInizio,
                                oraFine,
                                stato: 'LIBERO',
                                disponibile: true,
                                durataSlotMinuti: duration,
                                maxPrenotazioni: pattern.maxAppuntamenti || 1,
                                tenantId
                            }
                        });
                        results.created++;
                    } catch (err) {
                        results.errors++;
                        logger.error('Errore creazione slot', { dateStr, oraInizio, error: err.message });
                        results.details.push(`Errore creazione slot ${dateStr} ${oraInizio}`);
                    }
                }
            }

            logger.info('Slots generated from disponibilita patterns', {
                component: 'slot-service',
                action: 'generateFromDisponibilita',
                medicoId,
                dateRange: `${dataInizio} - ${dataFine}`,
                created: results.created,
                skipped: results.skipped,
                errors: results.errors,
                tenantId
            });

            return results;
        } catch (error) {
            logger.error('Failed to generate slots from disponibilita', {
                component: 'slot-service',
                action: 'generateFromDisponibilita',
                error: error.message,
                medicoId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Check if two time ranges overlap
     * @private
     */
    static timesOverlap(s1, e1, s2, e2) {
        const start1 = this.parseTime(s1);
        const end1 = this.parseTime(e1);
        const start2 = this.parseTime(s2);
        const end2 = this.parseTime(e2);
        return start1 < end2 && start2 < end1;
    }

    /**
     * Generate slots from orario ambulatorio template
     * @param {string} medicoId - Medico ID
     * @param {Date} dataInizio - Start date
     * @param {Date} dataFine - End date
     * @param {number} durataMiniuti - Slot duration in minutes
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Generated slots result
     */
    static async generateFromOrario(medicoId, dataInizio, dataFine, durataMinuti, tenantId, options = {}) {
        try {
            const { ambulatorioId, prestazioneId, skipExisting = true } = options;

            // Get medico's schedule from orari ambulatorio
            const orari = await prisma.orarioAmbulatorio.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    disponibile: true,
                    ...(ambulatorioId && { ambulatorioId })
                },
                include: {
                    ambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            medicoIds: true
                        }
                    }
                }
            });

            // Filter to ambulatori where this medico works
            const medicoOrari = orari.filter(o =>
                o.ambulatorio?.medicoIds?.includes(medicoId)
            );

            if (medicoOrari.length === 0) {
                return { created: [], skipped: 0, message: 'Nessun orario trovato per il medico' };
            }

            const slots = [];
            const start = new Date(dataInizio);
            const end = new Date(dataFine);

            // Iterate through each day
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay();

                // Find orari for this day
                const dayOrari = medicoOrari.filter(o => o.giornoSettimana === dayOfWeek);

                for (const orario of dayOrari) {
                    // Generate slots for this time range
                    const startTime = this.parseTime(orario.oraInizio);
                    const endTime = this.parseTime(orario.oraFine);

                    let currentTime = startTime;
                    while (currentTime + durataMinuti <= endTime) {
                        const oraInizio = this.formatTime(currentTime);
                        const oraFine = this.formatTime(currentTime + durataMinuti);

                        slots.push({
                            medicoId,
                            ambulatorioId: orario.ambulatorioId,
                            prestazioneId,
                            data: new Date(d).toISOString().split('T')[0],
                            oraInizio,
                            oraFine,
                            stato: 'LIBERO'
                        });

                        currentTime += durataMinuti;
                    }
                }
            }

            // Create slots, optionally skipping existing
            const results = { created: [], skipped: 0 };

            for (const slotData of slots) {
                if (skipExisting) {
                    const existing = await prisma.slotDisponibilita.findFirst({
                        where: {
                            medicoId: slotData.medicoId,
                            data: new Date(slotData.data),
                            oraInizio: slotData.oraInizio,
                            deletedAt: null
                        }
                    });

                    if (existing) {
                        results.skipped++;
                        continue;
                    }
                }

                try {
                    const slot = await this.create(slotData, tenantId);
                    results.created.push(slot);
                } catch (error) {
                    // Slot overlap, skip
                    results.skipped++;
                }
            }

            logger.info('Slots generated from orario', {
                component: 'slot-service',
                action: 'generateFromOrario',
                medicoId,
                created: results.created.length,
                skipped: results.skipped,
                tenantId
            });

            return results;
        } catch (error) {
            logger.error('Failed to generate slots from orario', {
                component: 'slot-service',
                action: 'generateFromOrario',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get slot by ID
     * @param {string} id - Slot ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object|null>} Slot or null
     */
    static async getById(id, tenantId) {
        try {
            const slot = await prisma.slotDisponibilita.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            tenantProfiles: {
                                where: { deletedAt: null, isActive: true },
                                select: { email: true, registerCode: true, specialties: true, isPrimary: true },
                                take: 1
                            }
                        }
                    }
                }
            });

            return slot;
        } catch (error) {
            logger.error('Failed to get slot', {
                component: 'slot-service',
                action: 'getById',
                slotId: id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get available slots for booking (supports multi-tenant)
     * @param {Object} filters - Filter options
     * @param {string} tenantId - Default tenant ID (fallback)
     * @param {Object} options - Additional options
     * @param {string|string[]} options.tenantIds - Tenant IDs to query (comma-separated string or array)
     * @param {boolean} options.allTenants - If true and accessibleTenantIds provided, show all
     * @param {string[]} options.accessibleTenantIds - Array of tenant IDs the user can access
     * @returns {Promise<Array>} Available slots
     */
    static async getAvailable(filters, tenantId, options = {}) {
        try {
            const {
                medicoId,
                ambulatorioId,
                prestazioneId,
                dataInizio,
                dataFine,
                disponibile, // Filter for disponibile/libero slots
                includePast = false, // New flag to include past slots
                limit = 50
            } = filters;

            // Multi-tenant support: determine effective tenant IDs
            const { tenantIds, allTenants = false, accessibleTenantIds = [] } = options;

            let effectiveTenantIds = [];

            if (tenantIds) {
                // tenantIds can be string (comma-separated) or array
                const requestedIds = typeof tenantIds === 'string'
                    ? tenantIds.split(',').map(id => id.trim())
                    : tenantIds;
                effectiveTenantIds = accessibleTenantIds.length > 0
                    ? requestedIds.filter(id => accessibleTenantIds.includes(id))
                    : requestedIds;

                if (effectiveTenantIds.length === 0) {
                    effectiveTenantIds = tenantId ? [tenantId] : [];
                }
            } else if (allTenants && accessibleTenantIds.length > 0) {
                effectiveTenantIds = accessibleTenantIds;
            } else if (tenantId) {
                effectiveTenantIds = [tenantId];
            }

            // Determine if we should filter by stato LIBERO
            // Either if disponibile is explicitly 'true' or if not including past
            const filterByLibero = disponibile === 'true' || disponibile === true ||
                (includePast === false || includePast === 'false');

            const where = {
                // Multi-tenant: use IN clause for multiple tenant IDs
                ...(effectiveTenantIds.length === 1
                    ? { tenantId: effectiveTenantIds[0] }
                    : effectiveTenantIds.length > 1
                        ? { tenantId: { in: effectiveTenantIds } }
                        : { tenantId }
                ),
                deletedAt: null,
                // Filter by stato LIBERO if requested or if not including past
                ...(filterByLibero ? { stato: 'LIBERO' } : {}),
                // Apply date filter
                ...(dataInizio || dataFine ? {
                    data: {
                        ...(dataInizio && { gte: new Date(dataInizio) }),
                        ...(dataFine && { lte: new Date(dataFine) })
                    }
                } : (includePast === false || includePast === 'false' ? {
                    data: { gte: new Date() }
                } : {}))
            };

            if (medicoId) where.medicoId = medicoId;
            if (ambulatorioId) where.ambulatorioId = ambulatorioId;
            if (prestazioneId) {
                where.OR = [
                    { prestazioneId },
                    { prestazioneId: null } // Generic slots
                ];
            }

            logger.debug('getAvailable query', {
                component: 'slot-service',
                action: 'getAvailable',
                effectiveTenantIds,
                where: JSON.stringify(where),
                dataInizio,
                dataFine
            });

            const slots = await prisma.slotDisponibilita.findMany({
                where,
                include: {
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            tenantProfiles: {
                                where: { deletedAt: null, isActive: true },
                                select: { registerCode: true, specialties: true, tenantId: true, isPrimary: true },
                                take: 1
                            }
                        }
                    },
                    ambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true
                        }
                    }
                    // Note: SlotDisponibilita has tenantId field but no tenant relation
                    // The tenantId is included in the slot data directly
                },
                orderBy: [
                    { data: 'asc' },
                    { oraInizio: 'asc' }
                ],
                take: limit
            });

            return slots;
        } catch (error) {
            logger.error('Failed to get available slots', {
                component: 'slot-service',
                action: 'getAvailable',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get slots by medico and date range
     * @param {string} medicoId - Medico ID
     * @param {Date} dataInizio - Start date
     * @param {Date} dataFine - End date
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Slots
     */
    static async getByMedicoDateRange(medicoId, dataInizio, dataFine, tenantId) {
        try {
            const slots = await prisma.slotDisponibilita.findMany({
                where: {
                    tenantId,
                    medicoId,
                    deletedAt: null,
                    data: {
                        gte: new Date(dataInizio),
                        lte: new Date(dataFine)
                    }
                },
                orderBy: [
                    { data: 'asc' },
                    { oraInizio: 'asc' }
                ]
            });

            return slots;
        } catch (error) {
            logger.error('Failed to get medico slots', {
                component: 'slot-service',
                action: 'getByMedicoDateRange',
                medicoId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get slots grouped by date (for calendar view)
     * @param {Object} filters - Filter options
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Slots grouped by date
     */
    static async getGroupedByDate(filters, tenantId) {
        try {
            const {
                medicoId,
                ambulatorioId,
                dataInizio,
                dataFine,
                soloLiberi = false
            } = filters;

            const where = {
                tenantId,
                deletedAt: null,
                data: {
                    gte: new Date(dataInizio),
                    lte: new Date(dataFine)
                }
            };

            if (medicoId) where.medicoId = medicoId;
            if (ambulatorioId) where.ambulatorioId = ambulatorioId;
            if (soloLiberi) where.stato = 'libero';

            const slots = await prisma.slotDisponibilita.findMany({
                where,
                include: {
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                },
                orderBy: [
                    { data: 'asc' },
                    { oraInizio: 'asc' }
                ]
            });

            // Group by date
            const grouped = {};
            for (const slot of slots) {
                const dateKey = slot.data.toISOString().split('T')[0];
                if (!grouped[dateKey]) {
                    grouped[dateKey] = {
                        date: dateKey,
                        slots: [],
                        summary: { liberi: 0, prenotati: 0, bloccati: 0 }
                    };
                }
                grouped[dateKey].slots.push(slot);
                grouped[dateKey].summary[slot.stato === 'libero' ? 'liberi' :
                    slot.stato === 'prenotato' ? 'prenotati' : 'bloccati']++;
            }

            return Object.values(grouped);
        } catch (error) {
            logger.error('Failed to get grouped slots', {
                component: 'slot-service',
                action: 'getGroupedByDate',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update slot
     * @param {string} id - Slot ID
     * @param {Object} data - Update data
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Updated slot
     */
    static async update(id, data, tenantId) {
        try {
            // Verify exists and include appuntamento relation
            const existing = await prisma.slotDisponibilita.findFirst({
                where: { id, tenantId, deletedAt: null },
                include: {
                    appuntamento: {
                        select: { id: true, medicoId: true, stato: true }
                    }
                }
            });

            if (!existing) {
                throw new Error('Slot non trovato');
            }

            // Only check for overlaps if changing time/date (not just medicoId)
            // Changing only the medico doesn't create a time overlap - it's the same slot with a different doctor
            // Compare values with existing to determine if actually changing time
            const existingDateStr = existing.data instanceof Date
                ? existing.data.toISOString().split('T')[0]
                : String(existing.data).split('T')[0];
            const isChangingTime = (data.oraInizio && data.oraInizio !== existing.oraInizio) ||
                (data.oraFine && data.oraFine !== existing.oraFine) ||
                (data.data && String(data.data).split('T')[0] !== existingDateStr);
            const isChangingMedico = data.medicoId && data.medicoId !== existing.medicoId;
            const isChangingAmbulatorio = data.ambulatorioId && data.ambulatorioId !== existing.ambulatorioId;

            if (isChangingTime) {
                const targetMedicoId = data.medicoId || existing.medicoId;
                const overlap = await this.checkOverlap(
                    targetMedicoId,
                    data.data || existing.data,
                    data.oraInizio || existing.oraInizio,
                    data.oraFine || existing.oraFine,
                    tenantId,
                    id // Exclude current slot
                );

                if (overlap) {
                    throw new Error(`Slot sovrapposto con esistente: ${overlap.oraInizio}-${overlap.oraFine}`);
                }
            }

            const updateData = {};

            const allowedFields = ['medicoId', 'ambulatorioId', 'prestazioneId', 'oraInizio', 'oraFine', 'stato', 'note', 'appuntamentoId'];
            allowedFields.forEach(field => {
                if (data[field] !== undefined) {
                    updateData[field] = data[field];
                }
            });

            if (data.data !== undefined) {
                updateData.data = new Date(data.data);
            }

            // Use transaction to update slot and cascade medico change to appuntamento
            const result = await prisma.$transaction(async (tx) => {
                // Update the slot
                const slot = await tx.slotDisponibilita.update({
                    where: { id },
                    data: updateData,
                    include: {
                        medico: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                });

                // If medico changed and slot has an associated appointment, update appointment's medicoId
                if (isChangingMedico && existing.appuntamentoId) {
                    // Only update if appointment is in a modifiable state
                    const modifiableStates = ['PRENOTATO', 'CONFERMATO', 'IN_ATTESA'];
                    if (existing.appuntamento && modifiableStates.includes(existing.appuntamento.stato)) {
                        await tx.appuntamento.update({
                            where: { id: existing.appuntamentoId },
                            data: { medicoId: data.medicoId }
                        });

                        logger.info('Cascaded medico change to appuntamento', {
                            component: 'slot-service',
                            action: 'cascade-medico',
                            slotId: id,
                            appuntamentoId: existing.appuntamentoId,
                            oldMedicoId: existing.medicoId,
                            newMedicoId: data.medicoId,
                            tenantId
                        });
                    } else {
                        logger.warn('Skipped cascade to appuntamento (stato non modificabile)', {
                            component: 'slot-service',
                            action: 'cascade-medico-skipped',
                            slotId: id,
                            appuntamentoId: existing.appuntamentoId,
                            appuntamentoStato: existing.appuntamento?.stato,
                            tenantId
                        });
                    }
                }

                // Cascade ambulatorio changes to linked QueueSession(s) and their entries
                if (isChangingAmbulatorio) {
                    const linkedSessions = await tx.queueSession.findMany({
                        where: {
                            slotDisponibilitaId: id,
                            tenantId,
                            deletedAt: null,
                            isActive: true
                        },
                        select: { id: true, ambulatorioId: true }
                    });

                    for (const qs of linkedSessions) {
                        // Update session's ambulatorioId
                        await tx.queueSession.update({
                            where: { id: qs.id },
                            data: { ambulatorioId: data.ambulatorioId }
                        });

                        // Cascade to NumeroChiamata entries (queue entries)
                        // Only update entries that have appointments within this slot's time range
                        // NOTE: NumeroChiamata has appuntamentoId but NO Prisma relation to Appuntamento,
                        // so we must query appointments separately via a lookup.
                        const allEntries = await tx.numeroChiamata.findMany({
                            where: {
                                sessionId: qs.id,
                                ambulatorioId: qs.ambulatorioId,
                                tenantId,
                                deletedAt: null
                            },
                            select: {
                                id: true,
                                appuntamentoId: true
                            }
                        });

                        // Build appointment time lookup for entries that have appointments
                        const entryAppIds = allEntries
                            .map(e => e.appuntamentoId)
                            .filter(Boolean);
                        const entryAppointments = entryAppIds.length > 0
                            ? await tx.appuntamento.findMany({
                                where: { id: { in: entryAppIds } },
                                select: { id: true, dataOra: true }
                            })
                            : [];
                        const appTimeMap = new Map();
                        const timeFormatter = new Intl.DateTimeFormat('it-IT', {
                            timeZone: 'Europe/Rome',
                            hour: '2-digit', minute: '2-digit', hour12: false
                        });
                        for (const app of entryAppointments) {
                            const parts = timeFormatter.formatToParts(new Date(app.dataOra));
                            const t = `${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}`;
                            appTimeMap.set(app.id, t);
                        }

                        // Filter entries: only those with appointments in this slot's time range (or no appointment)
                        const entriesToMove = allEntries.filter(entry => {
                            if (!entry.appuntamentoId) return true; // No appointment → move with session
                            const appTime = appTimeMap.get(entry.appuntamentoId);
                            if (!appTime) return true; // Appointment not found → move with session
                            return appTime >= existing.oraInizio && appTime < existing.oraFine;
                        });

                        if (entriesToMove.length > 0) {
                            await tx.numeroChiamata.updateMany({
                                where: {
                                    id: { in: entriesToMove.map(e => e.id) }
                                },
                                data: { ambulatorioId: data.ambulatorioId }
                            });
                        }

                        // Update QueueSessionAmbulatorio join table
                        await tx.queueSessionAmbulatorio.updateMany({
                            where: {
                                sessionId: qs.id,
                                ambulatorioId: qs.ambulatorioId
                            },
                            data: { ambulatorioId: data.ambulatorioId }
                        });
                    }

                    // Also cascade to linked appointments via two paths:
                    // 1. The slot's own direct appointment (SlotDisponibilita.appuntamentoId)
                    if (existing.appuntamentoId) {
                        const modifiableStates = ['PRENOTATO', 'CONFERMATO', 'IN_ATTESA'];
                        if (!existing.appuntamento || modifiableStates.includes(existing.appuntamento.stato)) {
                            await tx.appuntamento.update({
                                where: { id: existing.appuntamentoId },
                                data: { ambulatorioId: data.ambulatorioId }
                            });
                        }
                    }

                    // 2. Appointments linked through queue session entries (NumeroChiamata.appuntamentoId)
                    // IMPORTANT: Only cascade appointments that fall within this slot's time range
                    // to avoid moving appointments from other slots (e.g. morning when moving afternoon)
                    const slotOraInizio = existing.oraInizio;
                    const slotOraFine = existing.oraFine;
                    const slotDate = existing.data;

                    for (const qs of linkedSessions) {
                        // Query entries with appuntamentoId (no Prisma relation, so separate lookup)
                        const sessionEntries = await tx.numeroChiamata.findMany({
                            where: {
                                sessionId: qs.id,
                                appuntamentoId: { not: null },
                                deletedAt: null
                            },
                            select: {
                                appuntamentoId: true
                            }
                        });

                        // Lookup appointment times separately
                        const sesAppIds = sessionEntries.map(e => e.appuntamentoId).filter(Boolean);
                        const sesAppointments = sesAppIds.length > 0
                            ? await tx.appuntamento.findMany({
                                where: { id: { in: sesAppIds } },
                                select: { id: true, dataOra: true }
                            })
                            : [];
                        const sesAppTimeMap = new Map();
                        const sesFormatter = new Intl.DateTimeFormat('it-IT', {
                            timeZone: 'Europe/Rome',
                            hour: '2-digit', minute: '2-digit', hour12: false
                        });
                        for (const app of sesAppointments) {
                            const parts = sesFormatter.formatToParts(new Date(app.dataOra));
                            const t = `${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}`;
                            sesAppTimeMap.set(app.id, t);
                        }

                        // Filter entries whose appointment time falls within this slot's time range
                        const entryAppointmentIds = sessionEntries
                            .filter(e => {
                                const appTime = sesAppTimeMap.get(e.appuntamentoId);
                                if (!appTime) return false;
                                return appTime >= slotOraInizio && appTime < slotOraFine;
                            })
                            .map(e => e.appuntamentoId)
                            .filter(Boolean);

                        if (entryAppointmentIds.length > 0) {
                            await tx.appuntamento.updateMany({
                                where: {
                                    id: { in: entryAppointmentIds },
                                    ambulatorioId: existing.ambulatorioId,
                                    tenantId,
                                    deletedAt: null,
                                    stato: { in: ['PRENOTATO', 'CONFERMATO', 'IN_ATTESA'] }
                                },
                                data: { ambulatorioId: data.ambulatorioId }
                            });
                        }
                    }

                    if (linkedSessions.length > 0) {
                        logger.info('Cascaded ambulatorio change to QueueSession(s), entries, and appointments', {
                            component: 'slot-service',
                            action: 'cascade-ambulatorio-queue',
                            slotId: id,
                            sessionIds: linkedSessions.map(s => s.id),
                            oldAmbulatorioId: existing.ambulatorioId,
                            newAmbulatorioId: data.ambulatorioId,
                            tenantId
                        });
                    }
                }

                return slot;
            });

            logger.info('Slot updated', {
                component: 'slot-service',
                action: 'update',
                slotId: id,
                medicoChanged: isChangingMedico,
                ambulatorioChanged: isChangingAmbulatorio,
                tenantId
            });

            return result;
        } catch (error) {
            logger.error('Failed to update slot', {
                component: 'slot-service',
                action: 'update',
                slotId: id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Book a slot (set to prenotato)
     * @param {string} id - Slot ID
     * @param {string} appuntamentoId - Appuntamento ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Updated slot
     */
    static async book(id, appuntamentoId, tenantId) {
        try {
            const slot = await prisma.slotDisponibilita.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!slot) {
                throw new Error('Slot non trovato');
            }

            if (slot.stato !== 'LIBERO') {
                throw new Error('Slot non disponibile');
            }

            const updated = await prisma.slotDisponibilita.update({
                where: { id },
                data: {
                    stato: 'PRENOTATO',
                    appuntamentoId
                }
            });

            logger.info('Slot booked', {
                component: 'slot-service',
                action: 'book',
                slotId: id,
                appuntamentoId,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to book slot', {
                component: 'slot-service',
                action: 'book',
                slotId: id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Release a slot (set back to libero)
     * @param {string} id - Slot ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Updated slot
     */
    static async release(id, tenantId) {
        try {
            const slot = await prisma.slotDisponibilita.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!slot) {
                throw new Error('Slot non trovato');
            }

            const updated = await prisma.slotDisponibilita.update({
                where: { id },
                data: {
                    stato: 'LIBERO',
                    appuntamentoId: null
                }
            });

            logger.info('Slot released', {
                component: 'slot-service',
                action: 'release',
                slotId: id,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to release slot', {
                component: 'slot-service',
                action: 'release',
                slotId: id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Block a slot
     * @param {string} id - Slot ID
     * @param {string} note - Block reason
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Updated slot
     */
    static async block(id, note, tenantId) {
        try {
            const slot = await prisma.slotDisponibilita.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!slot) {
                throw new Error('Slot non trovato');
            }

            if (slot.stato === 'PRENOTATO') {
                throw new Error('Impossibile bloccare uno slot prenotato');
            }

            const updated = await prisma.slotDisponibilita.update({
                where: { id },
                data: {
                    stato: 'BLOCCATO',
                    motivoBlocco: note
                }
            });

            logger.info('Slot blocked', {
                component: 'slot-service',
                action: 'block',
                slotId: id,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to block slot', {
                component: 'slot-service',
                action: 'block',
                slotId: id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete slot
     * @param {string} id - Slot ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Deleted slot
     */
    static async delete(id, tenantId) {
        try {
            const existing = await prisma.slotDisponibilita.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Slot non trovato');
            }

            if (existing.stato === 'prenotato') {
                throw new Error('Impossibile eliminare uno slot prenotato');
            }

            const slot = await prisma.slotDisponibilita.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            logger.info('Slot deleted', {
                component: 'slot-service',
                action: 'delete',
                slotId: id,
                tenantId
            });

            return slot;
        } catch (error) {
            logger.error('Failed to delete slot', {
                component: 'slot-service',
                action: 'delete',
                slotId: id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Delete multiple slots by date range
     * @param {string} medicoId - Medico ID
     * @param {Date} dataInizio - Start date
     * @param {Date} dataFine - End date
     * @param {string} tenantId - Tenant ID
     * @param {boolean} soloLiberi - Only delete free slots
     * @returns {Promise<Object>} Delete result
     */
    static async deleteByDateRange(medicoId, dataInizio, dataFine, tenantId, soloLiberi = true) {
        try {
            const where = {
                tenantId,
                medicoId,
                deletedAt: null,
                data: {
                    gte: new Date(dataInizio),
                    lte: new Date(dataFine)
                }
            };

            if (soloLiberi) {
                where.stato = 'libero';
            }

            const result = await prisma.slotDisponibilita.updateMany({
                where,
                data: { deletedAt: new Date() }
            });

            logger.info('Slots deleted by date range', {
                component: 'slot-service',
                action: 'deleteByDateRange',
                medicoId,
                dataInizio,
                dataFine,
                count: result.count,
                tenantId
            });

            return { deleted: result.count };
        } catch (error) {
            logger.error('Failed to delete slots by date range', {
                component: 'slot-service',
                action: 'deleteByDateRange',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    // =====================================================
    // P68: CASCADE OPERATIONS FOR RECURRING PATTERNS
    // =====================================================

    /**
     * Delete all future slots generated from a specific pattern (P68)
     * @param {string} disponibilitaMedicoId - The pattern ID
     * @param {Date} fromDate - Delete slots from this date forward (inclusive)
     * @param {string} tenantId - Tenant ID
     * @param {boolean} soloLiberi - Only delete free slots (default true)
     * @returns {Promise<Object>} { deleted: number }
     */
    static async deleteFutureSlotsByPattern(disponibilitaMedicoId, fromDate, tenantId, soloLiberi = true) {
        try {
            const where = {
                disponibilitaMedicoId,
                tenantId,
                deletedAt: null,
                data: { gte: new Date(fromDate) }
            };

            if (soloLiberi) {
                where.stato = 'LIBERO';
            }

            const result = await prisma.slotDisponibilita.updateMany({
                where,
                data: { deletedAt: new Date() }
            });

            logger.info('Future slots deleted by pattern', {
                component: 'slot-service',
                action: 'deleteFutureSlotsByPattern',
                disponibilitaMedicoId,
                fromDate,
                count: result.count,
                tenantId
            });

            return { deleted: result.count };
        } catch (error) {
            logger.error('Failed to delete future slots by pattern', {
                component: 'slot-service',
                action: 'deleteFutureSlotsByPattern',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update time for all future slots generated from a specific pattern (P68)
     * @param {string} disponibilitaMedicoId - The pattern ID
     * @param {Date} fromDate - Update slots from this date forward
     * @param {Object} newTime - { oraInizio, oraFine }
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} { updated: number }
     */
    static async updateFutureSlotTimesByPattern(disponibilitaMedicoId, fromDate, newTime, tenantId) {
        try {
            const where = {
                disponibilitaMedicoId,
                tenantId,
                deletedAt: null,
                stato: 'LIBERO',
                data: { gte: new Date(fromDate) }
            };

            const updateData = {};
            if (newTime.oraInizio) updateData.oraInizio = newTime.oraInizio;
            if (newTime.oraFine) updateData.oraFine = newTime.oraFine;

            const result = await prisma.slotDisponibilita.updateMany({
                where,
                data: updateData
            });

            logger.info('Future slot times updated by pattern', {
                component: 'slot-service',
                action: 'updateFutureSlotTimesByPattern',
                disponibilitaMedicoId,
                fromDate,
                newTime,
                count: result.count,
                tenantId
            });

            return { updated: result.count };
        } catch (error) {
            logger.error('Failed to update future slot times by pattern', {
                component: 'slot-service',
                action: 'updateFutureSlotTimesByPattern',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Count future slots for a pattern (P68 - for UI to show impact)
     * @param {string} disponibilitaMedicoId - The pattern ID
     * @param {Date} fromDate - Count from this date forward
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<number>} Count of future free slots
     */
    static async countFutureSlotsByPattern(disponibilitaMedicoId, fromDate, tenantId) {
        try {
            const count = await prisma.slotDisponibilita.count({
                where: {
                    disponibilitaMedicoId,
                    tenantId,
                    deletedAt: null,
                    stato: 'LIBERO',
                    data: { gte: new Date(fromDate) }
                }
            });
            return count;
        } catch (error) {
            logger.error('Failed to count future slots by pattern', {
                component: 'slot-service',
                action: 'countFutureSlotsByPattern',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Check for slot overlap (legacy - returns first overlap)
     * @param {string} medicoId - Medico ID
     * @param {Date|string} data - Date
     * @param {string} oraInizio - Start time
     * @param {string} oraFine - End time
     * @param {string} tenantId - Tenant ID
     * @param {string} excludeId - Slot ID to exclude
     * @returns {Promise<Object|null>} Overlapping slot or null
     */
    static async checkOverlap(medicoId, data, oraInizio, oraFine, tenantId, excludeId = null) {
        try {
            // CRITICAL FIX: Use UTC methods to avoid timezone shift bug
            // Previous bug: setHours(0,0,0,0) on UTC date shifts to previous day in UTC+1
            const inputDate = new Date(data);

            // Extract the date parts in UTC to avoid timezone issues
            const year = inputDate.getUTCFullYear();
            const month = inputDate.getUTCMonth();
            const day = inputDate.getUTCDate();

            // Create UTC midnight boundaries for the SAME day
            const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
            const dayEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

            const where = {
                tenantId,
                medicoId,
                data: {
                    gte: dayStart,
                    lte: dayEnd
                },
                deletedAt: null,
                AND: [
                    { oraInizio: { lt: oraFine } },
                    { oraFine: { gt: oraInizio } }
                ]
            };

            if (excludeId) {
                where.id = { not: excludeId };
            }

            const overlap = await prisma.slotDisponibilita.findFirst({ where });
            return overlap;
        } catch (error) {
            logger.error('Failed to check slot overlap', {
                component: 'slot-service',
                action: 'checkOverlap',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Check for slot overlap with detailed categorization for 3 conflict scenarios
     * 
     * Returns 3 categories of overlapping slots:
     * 1. sameMedicoSameAmbulatorio: Same medico + Same ambulatorio = BLOCK
     * 2. sameMedicoDifferentAmbulatorio: Same medico + Different ambulatorio = WARN
     * 3. differentMedicoSameAmbulatorio: Different medico + Same ambulatorio = WARN
     * 
     * @param {string} medicoId - Medico ID for the new slot
     * @param {string} ambulatorioId - Ambulatorio ID for the new slot
     * @param {Date|string} data - Date
     * @param {string} oraInizio - Start time
     * @param {string} oraFine - End time
     * @param {string} tenantId - Tenant ID
     * @param {string} excludeId - Slot ID to exclude (for updates)
     * @returns {Promise<{sameMedicoSameAmbulatorio: Array, sameMedicoDifferentAmbulatorio: Array, differentMedicoSameAmbulatorio: Array}>}
     */
    static async checkOverlapDetailed(medicoId, ambulatorioId, data, oraInizio, oraFine, tenantId, excludeId = null) {
        try {
            // CRITICAL FIX: Parse date string directly without timezone conversion
            // Input format: "YYYY-MM-DD" string
            let year, month, day;

            if (typeof data === 'string' && data.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // Parse date string directly: "2026-01-04" -> year=2026, month=0, day=4
                const parts = data.split('-');
                year = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
                day = parseInt(parts[2], 10);
            } else {
                // Fallback for Date objects - use UTC to avoid timezone shift
                const inputDate = new Date(data);
                year = inputDate.getUTCFullYear();
                month = inputDate.getUTCMonth();
                day = inputDate.getUTCDate();
            }

            // Create UTC midnight boundaries for the SAME day
            const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
            const dayEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

            logger.info('checkOverlapDetailed - checking 3 conflict scenarios', {
                component: 'slot-service',
                action: 'checkOverlapDetailed',
                inputData: data,
                parsedDate: `${year}-${month + 1}-${day}`,
                dayStartISO: dayStart.toISOString(),
                dayEndISO: dayEnd.toISOString(),
                medicoId,
                ambulatorioId,
                oraInizio,
                oraFine,
                tenantId
            });

            // Base where clause for time overlap
            const baseWhere = {
                tenantId,
                deletedAt: null,
                data: { gte: dayStart, lte: dayEnd },
                AND: [
                    { oraInizio: { lt: oraFine } },
                    { oraFine: { gt: oraInizio } }
                ]
            };

            if (excludeId) {
                baseWhere.id = { not: excludeId };
            }

            // Query 1: Same medico (any ambulatorio) - for scenarios 1 & 2
            const sameMedicoOverlaps = await prisma.slotDisponibilita.findMany({
                where: { ...baseWhere, medicoId }
            });

            logger.info('checkOverlapDetailed - query results raw', {
                component: 'slot-service',
                action: 'checkOverlapDetailed',
                sameMedicoOverlapsCount: sameMedicoOverlaps.length,
                sameMedicoOverlapsData: sameMedicoOverlaps.map(o => ({
                    id: o.id,
                    data: o.data?.toISOString?.() || o.data,
                    oraInizio: o.oraInizio,
                    oraFine: o.oraFine,
                    medicoId: o.medicoId,
                    ambulatorioId: o.ambulatorioId
                })),
                queriedDateRange: { dayStart: dayStart.toISOString(), dayEnd: dayEnd.toISOString() },
                queriedMedicoId: medicoId,
                tenantId
            });

            // Query 2: Same ambulatorio, different medico - for scenario 3
            const sameAmbulatorioOverlaps = ambulatorioId ? await prisma.slotDisponibilita.findMany({
                where: { ...baseWhere, ambulatorioId, medicoId: { not: medicoId } }
            }) : [];

            // Categorize same medico overlaps
            const sameMedicoSameAmbulatorio = sameMedicoOverlaps.filter(o => o.ambulatorioId === ambulatorioId);
            const sameMedicoDifferentAmbulatorio = sameMedicoOverlaps.filter(o => o.ambulatorioId !== ambulatorioId);

            // Different medico, same ambulatorio (already filtered in query)
            const differentMedicoSameAmbulatorio = sameAmbulatorioOverlaps;

            logger.debug('checkOverlapDetailed result - 3 scenarios', {
                component: 'slot-service',
                action: 'checkOverlapDetailed',
                medicoId,
                ambulatorioId,
                sameMedicoSameAmbulatorioCount: sameMedicoSameAmbulatorio.length,
                sameMedicoDifferentAmbulatorioCount: sameMedicoDifferentAmbulatorio.length,
                differentMedicoSameAmbulatorioCount: differentMedicoSameAmbulatorio.length,
                sameMedicoSameAmbulatorioDetails: sameMedicoSameAmbulatorio.map(o => ({
                    id: o.id, oraInizio: o.oraInizio, oraFine: o.oraFine
                })),
                sameMedicoDifferentAmbulatorioDetails: sameMedicoDifferentAmbulatorio.map(o => ({
                    id: o.id, ambulatorioId: o.ambulatorioId, oraInizio: o.oraInizio, oraFine: o.oraFine
                })),
                differentMedicoSameAmbulatorioDetails: differentMedicoSameAmbulatorio.map(o => ({
                    id: o.id, medicoId: o.medicoId, oraInizio: o.oraInizio, oraFine: o.oraFine
                })),
                tenantId
            });

            return {
                sameMedicoSameAmbulatorio,
                sameMedicoDifferentAmbulatorio,
                differentMedicoSameAmbulatorio
            };
        } catch (error) {
            logger.error('Failed to check slot overlap detailed', {
                component: 'slot-service',
                action: 'checkOverlapDetailed',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Calculate availability summary for a date range
     * @param {string} medicoId - Medico ID
     * @param {Date} dataInizio - Start date
     * @param {Date} dataFine - End date
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Availability summary
     */
    static async calculateAvailability(medicoId, dataInizio, dataFine, tenantId) {
        try {
            const slots = await prisma.slotDisponibilita.findMany({
                where: {
                    tenantId,
                    medicoId,
                    deletedAt: null,
                    data: {
                        gte: new Date(dataInizio),
                        lte: new Date(dataFine)
                    }
                }
            });

            const summary = {
                totale: slots.length,
                liberi: 0,
                prenotati: 0,
                bloccati: 0,
                percentualeOccupazione: 0,
                perGiorno: {}
            };

            for (const slot of slots) {
                const dateKey = slot.data.toISOString().split('T')[0];

                if (!summary.perGiorno[dateKey]) {
                    summary.perGiorno[dateKey] = { liberi: 0, prenotati: 0, bloccati: 0 };
                }

                switch (slot.stato) {
                    case 'libero':
                        summary.liberi++;
                        summary.perGiorno[dateKey].liberi++;
                        break;
                    case 'prenotato':
                        summary.prenotati++;
                        summary.perGiorno[dateKey].prenotati++;
                        break;
                    case 'bloccato':
                        summary.bloccati++;
                        summary.perGiorno[dateKey].bloccati++;
                        break;
                }
            }

            if (summary.totale > 0) {
                summary.percentualeOccupazione = Math.round(
                    (summary.prenotati / summary.totale) * 100
                );
            }

            return summary;
        } catch (error) {
            logger.error('Failed to calculate availability', {
                component: 'slot-service',
                action: 'calculateAvailability',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get first available slot for a prestazione
     * @param {string} prestazioneId - Prestazione ID
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Additional options
     * @returns {Promise<Object|null>} First available slot
     */
    static async getFirstAvailable(prestazioneId, tenantId, options = {}) {
        try {
            const { medicoId, ambulatorioId, afterDate } = options;
            const startDate = afterDate || new Date();

            const where = {
                tenantId,
                deletedAt: null,
                stato: 'LIBERO',
                data: { gte: startDate },
                OR: [
                    { prestazioneId },
                    { prestazioneId: null }
                ]
            };

            if (medicoId) where.medicoId = medicoId;
            if (ambulatorioId) where.ambulatorioId = ambulatorioId;

            const slot = await prisma.slotDisponibilita.findFirst({
                where,
                include: {
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            tenantProfiles: {
                                where: { deletedAt: null, isActive: true },
                                select: { registerCode: true, isPrimary: true },
                                take: 1
                            }
                        }
                    }
                },
                orderBy: [
                    { data: 'asc' },
                    { oraInizio: 'asc' }
                ]
            });

            return slot;
        } catch (error) {
            logger.error('Failed to get first available slot', {
                component: 'slot-service',
                action: 'getFirstAvailable',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    // ========== UTILITY METHODS ==========

    /**
     * Parse time string to minutes
     * @private
     */
    static parseTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Format minutes to time string
     * @private
     */
    static formatTime(minutes) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    // ========== P67: PUBLIC BOOKING METHODS ==========

    /**
     * Get publicly visible slots for a date range
     * Only returns slots with visibilePubblico=true and prenotabileOnline=true
     * 
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Query options
     * @returns {Promise<Object[]>} Available public slots
     */
    static async getPublicSlots(tenantId, options = {}) {
        try {
            const {
                dataInizio,
                dataFine,
                prestazioneId = null,
                medicoId = null,
                ambulatorioId = null,
                limit = 100
            } = options;

            const now = new Date();
            const startDate = dataInizio ? new Date(dataInizio) : now;

            // Default: 90 days ahead
            const endDate = dataFine
                ? new Date(dataFine)
                : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

            const where = {
                tenantId,
                deletedAt: null,
                disponibile: true,
                visibilePubblico: true,
                prenotabileOnline: true,
                stato: 'LIBERO',
                data: {
                    gte: startDate,
                    lte: endDate
                }
            };

            if (prestazioneId) where.prestazioneId = prestazioneId;
            if (medicoId) where.medicoId = medicoId;
            if (ambulatorioId) where.ambulatorioId = ambulatorioId;

            const slots = await prisma.slotDisponibilita.findMany({
                where,
                select: {
                    id: true,
                    data: true,
                    oraInizio: true,
                    oraFine: true,
                    maxPrenotazioni: true,
                    durataSlotMinuti: true,
                    anticipoMinimoOre: true,
                    anticipoMassimoGiorni: true,
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            gender: true,
                            tenantProfiles: {
                                where: { tenantId, deletedAt: null, isActive: true },
                                select: { title: true },
                                take: 1
                            }
                        }
                    },
                    ambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            indicazioniPaziente: true,
                            poliambulatorio: {
                                select: { id: true, nome: true }
                            },
                            sede: {
                                select: {
                                    id: true,
                                    nome: true,
                                    indirizzo: true,
                                    citta: true
                                }
                            }
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            nome: true,
                            durataPrevista: true,
                            prezzoBase: true
                        }
                    },
                    // Per verificare se lo slot è occupato
                    appuntamentoId: true
                },
                orderBy: [
                    { data: 'asc' },
                    { oraInizio: 'asc' }
                ],
                take: limit
            });

            // Filter out fully booked slots and calculate available times
            const availableSlots = slots
                .filter(slot => {
                    // Slot is available if appuntamentoId is null (no booking)
                    // For maxPrenotazioni > 1, would need different logic with separate booking table
                    return slot.appuntamentoId === null;
                })
                .map(slot => {
                    // Calculate available booking times based on slot duration
                    const durata = slot.durataSlotMinuti || slot.prestazione?.durataPrevista || 30;
                    const availableTimes = this.calculateBookingTimes(
                        slot.oraInizio,
                        slot.oraFine,
                        durata
                    );

                    // Destruct to remove appuntamentoId from response (internal only)
                    const { appuntamentoId, ...slotWithoutAppId } = slot;

                    return {
                        ...slotWithoutAppId,
                        postiDisponibili: 1, // Simplified: 1 slot = 1 posto
                        orariPrenotabili: availableTimes,
                        durataMinuti: durata
                    };
                });

            logger.info('Public slots retrieved', {
                component: 'slot-service',
                action: 'getPublicSlots',
                count: availableSlots.length,
                tenantId
            });

            return availableSlots;
        } catch (error) {
            logger.error('Failed to get public slots', {
                component: 'slot-service',
                action: 'getPublicSlots',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Calculate valid booking times within a slot based on duration
     * Example: slot 09:00-12:00, duration 30min → ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]
     * 
     * @param {string} oraInizio - Start time (HH:MM)
     * @param {string} oraFine - End time (HH:MM)
     * @param {number} durataMinuti - Duration in minutes
     * @returns {string[]} Array of valid booking times
     */
    static calculateBookingTimes(oraInizio, oraFine, durataMinuti) {
        const times = [];
        const startMinutes = this.parseTime(oraInizio);
        const endMinutes = this.parseTime(oraFine);

        // Generate slots ensuring there's enough time for the full duration
        for (let t = startMinutes; t + durataMinuti <= endMinutes; t += durataMinuti) {
            times.push(this.formatTime(t));
        }

        return times;
    }

    /**
     * Validate a booking request for public slots
     * Checks: anticipo minimo/massimo, orario valido, disponibilità
     * 
     * @param {string} slotId - Slot ID
     * @param {string} oraPrenotazione - Requested booking time (HH:MM)
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Validation result with slot data
     */
    static async validatePublicBooking(slotId, oraPrenotazione, tenantId) {
        try {
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
                        select: { durataPrevista: true }
                    },
                    _count: {
                        select: { appuntamento: true }
                    }
                }
            });

            if (!slot) {
                return { valid: false, error: 'Slot non trovato o non prenotabile online' };
            }

            // Check capacity
            const currentBookings = slot._count?.appuntamento || 0;
            if (currentBookings >= slot.maxPrenotazioni) {
                return { valid: false, error: 'Slot completamente prenotato' };
            }

            // Check anticipo minimo
            const now = new Date();
            const slotDateTime = new Date(slot.data);
            const [hours, minutes] = oraPrenotazione.split(':').map(Number);
            slotDateTime.setHours(hours, minutes, 0, 0);

            const hoursUntilSlot = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
            if (hoursUntilSlot < slot.anticipoMinimoOre) {
                return {
                    valid: false,
                    error: `Prenotazione richiede almeno ${slot.anticipoMinimoOre} ore di anticipo`
                };
            }

            // Check anticipo massimo
            const daysUntilSlot = hoursUntilSlot / 24;
            if (daysUntilSlot > slot.anticipoMassimoGiorni) {
                return {
                    valid: false,
                    error: `Prenotazione possibile al massimo ${slot.anticipoMassimoGiorni} giorni in anticipo`
                };
            }

            // Check valid booking time
            const durata = slot.durataSlotMinuti || slot.prestazione?.durataPrevista || 30;
            const validTimes = this.calculateBookingTimes(slot.oraInizio, slot.oraFine, durata);

            if (!validTimes.includes(oraPrenotazione)) {
                return {
                    valid: false,
                    error: `Orario ${oraPrenotazione} non valido. Orari disponibili: ${validTimes.join(', ')}`
                };
            }

            return {
                valid: true,
                slot,
                durataMinuti: durata,
                orariDisponibili: validTimes
            };
        } catch (error) {
            logger.error('Failed to validate public booking', {
                component: 'slot-service',
                action: 'validatePublicBooking',
                error: error.message,
                slotId,
                tenantId
            });
            throw error;
        }
    }

    // =====================================================
    // P68: AUTO-GENERATION (CRON JOB)
    // =====================================================

    /**
     * Auto-generate slots for all active patterns across all tenants
     * Called by the weekly cron job (Monday 2 AM)
     * Generates slots for the next 3 months (rolling window)
     * @returns {Promise<Object>} Summary of generation results per tenant
     */
    static async autoGenerateSlots() {
        const results = { tenants: [], totalCreated: 0, totalErrors: 0 };

        try {
            // 1. Get all distinct tenants that have active patterns
            const tenantsWithPatterns = await prisma.disponibilitaMedico.findMany({
                where: {
                    attivo: true,
                    deletedAt: null
                },
                select: {
                    tenantId: true,
                    medicoId: true
                },
                distinct: ['tenantId', 'medicoId']
            });

            if (tenantsWithPatterns.length === 0) {
                logger.info('P68: No active patterns found for auto-generation', {
                    component: 'slot-service',
                    action: 'autoGenerateSlots'
                });
                return results;
            }

            // 2. Calculate date range (today + 3 months)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const threeMonthsLater = new Date(today);
            threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

            const dataInizio = today.toISOString().split('T')[0];
            const dataFine = threeMonthsLater.toISOString().split('T')[0];

            // 3. Group by tenant and medico
            const tenantMedicoMap = {};
            for (const item of tenantsWithPatterns) {
                if (!tenantMedicoMap[item.tenantId]) {
                    tenantMedicoMap[item.tenantId] = new Set();
                }
                tenantMedicoMap[item.tenantId].add(item.medicoId);
            }

            // 4. Generate slots for each tenant/medico combination
            for (const [tenantId, medicoIds] of Object.entries(tenantMedicoMap)) {
                const tenantResult = { tenantId, medici: [], created: 0, errors: 0 };

                for (const medicoId of medicoIds) {
                    try {
                        const result = await this.generateFromDisponibilita(
                            medicoId,
                            dataInizio,
                            dataFine,
                            tenantId
                        );

                        tenantResult.medici.push({
                            medicoId,
                            created: result.created,
                            skipped: result.skipped,
                            errors: result.errors
                        });
                        tenantResult.created += result.created;
                        tenantResult.errors += result.errors;
                    } catch (error) {
                        tenantResult.errors++;
                        logger.error('P68: Failed to generate slots for medico', {
                            component: 'slot-service',
                            action: 'autoGenerateSlots',
                            medicoId,
                            tenantId,
                            error: error.message
                        });
                    }
                }

                results.tenants.push(tenantResult);
                results.totalCreated += tenantResult.created;
                results.totalErrors += tenantResult.errors;
            }

            logger.info('P68: Auto-generation completed', {
                component: 'slot-service',
                action: 'autoGenerateSlots',
                dateRange: `${dataInizio} - ${dataFine}`,
                tenantCount: results.tenants.length,
                totalCreated: results.totalCreated,
                totalErrors: results.totalErrors
            });

            return results;
        } catch (error) {
            logger.error('P68: Auto-generation failed', {
                component: 'slot-service',
                action: 'autoGenerateSlots',
                error: error.message
            });
            throw error;
        }
    }
}

export default SlotDisponibilitaService;
