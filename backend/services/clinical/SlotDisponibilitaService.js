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
     * @param {Object} data - Slot data
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Created slot
     */
    static async create(data, tenantId) {
        try {
            // Check for overlapping slots
            const overlap = await this.checkOverlap(
                data.medicoId,
                data.data,
                data.oraInizio,
                data.oraFine,
                tenantId
            );

            if (overlap) {
                throw new Error(`Slot sovrapposto con esistente: ${overlap.oraInizio}-${overlap.oraFine}`);
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
                            registerCode: true
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
                            email: true,
                            registerCode: true,
                            specialties: true
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
     * Get available slots for booking
     * @param {Object} filters - Filter options
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Available slots
     */
    static async getAvailable(filters, tenantId) {
        try {
            const {
                medicoId,
                ambulatorioId,
                prestazioneId,
                dataInizio,
                dataFine,
                limit = 50
            } = filters;

            const where = {
                tenantId,
                deletedAt: null,
                stato: 'LIBERO',
                data: {
                    gte: new Date(dataInizio || new Date()),
                    ...(dataFine && { lte: new Date(dataFine) })
                }
            };

            if (medicoId) where.medicoId = medicoId;
            if (ambulatorioId) where.ambulatorioId = ambulatorioId;
            if (prestazioneId) {
                where.OR = [
                    { prestazioneId },
                    { prestazioneId: null } // Generic slots
                ];
            }

            const slots = await prisma.slotDisponibilita.findMany({
                where,
                include: {
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            registerCode: true,
                            specialties: true
                        }
                    }
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
            // Verify exists
            const existing = await prisma.slotDisponibilita.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Slot non trovato');
            }

            // If changing time, check for overlaps
            if (data.oraInizio || data.oraFine || data.data) {
                const overlap = await this.checkOverlap(
                    existing.medicoId,
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

            const allowedFields = ['ambulatorioId', 'prestazioneId', 'oraInizio', 'oraFine', 'stato', 'note', 'appuntamentoId'];
            allowedFields.forEach(field => {
                if (data[field] !== undefined) {
                    updateData[field] = data[field];
                }
            });

            if (data.data !== undefined) {
                updateData.data = new Date(data.data);
            }

            const slot = await prisma.slotDisponibilita.update({
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

            logger.info('Slot updated', {
                component: 'slot-service',
                action: 'update',
                slotId: id,
                tenantId
            });

            return slot;
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

    /**
     * Check for slot overlap
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
            const where = {
                tenantId,
                medicoId,
                data: new Date(data),
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
                            registerCode: true
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
}

export default SlotDisponibilitaService;
