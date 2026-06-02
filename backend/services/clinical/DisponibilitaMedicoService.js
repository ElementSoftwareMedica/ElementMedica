/**
 * DisponibilitaMedico Service
 * Business logic for doctor weekly schedule management
 * 
 * @module services/clinical/DisponibilitaMedicoService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import SlotDisponibilitaService from './SlotDisponibilitaService.js';

export class DisponibilitaMedicoService {
    /**
     * Get all disponibilità with pagination and filters
     * @param {Object} options - Query options
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Paginated results
     */
    static async getAll(options = {}, tenantId) {
        try {
            const {
                page = 1,
                limit = 100,
                medicoId,
                ambulatorioId,
                giorno,
                attivo
            } = options;

            const skip = (page - 1) * limit;

            const where = {
                tenantId,
                deletedAt: null,
                ...(medicoId && { medicoId }),
                ...(ambulatorioId && { ambulatorioId }),
                ...(giorno !== undefined && { giorno: parseInt(giorno) }),
                ...(attivo !== undefined && { attivo: attivo === 'true' || attivo === true })
            };

            const [data, total] = await Promise.all([
                prisma.disponibilitaMedico.findMany({
                    where,
                    skip,
                    take: parseInt(limit),
                    orderBy: [
                        { giorno: 'asc' },
                        { oraInizio: 'asc' }
                    ]
                }),
                prisma.disponibilitaMedico.count({ where })
            ]);

            return {
                data,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Failed to get disponibilità', {
                component: 'disponibilita-medico-service',
                action: 'getAll',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get disponibilità by medico
     * @param {string} medicoId - Medico ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Disponibilità list
     */
    static async getByMedico(medicoId, tenantId) {
        try {
            const data = await prisma.disponibilitaMedico.findMany({
                where: {
                    medicoId,
                    tenantId,
                    deletedAt: null
                },
                orderBy: [
                    { giorno: 'asc' },
                    { oraInizio: 'asc' }
                ]
            });

            return data;
        } catch (error) {
            logger.error('Failed to get disponibilità by medico', {
                component: 'disponibilita-medico-service',
                action: 'getByMedico',
                medicoId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get disponibilità by ID
     * @param {string} id - Disponibilità ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Disponibilità
     */
    static async getById(id, tenantId) {
        try {
            const disponibilita = await prisma.disponibilitaMedico.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!disponibilita) {
                throw new Error('Disponibilità non trovata');
            }

            return disponibilita;
        } catch (error) {
            logger.error('Failed to get disponibilità by ID', {
                component: 'disponibilita-medico-service',
                action: 'getById',
                id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Create new disponibilità
     * @param {Object} data - Disponibilità data
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Created disponibilità
     */
    static async create(data, tenantId) {
        try {
            // Check for overlapping schedule
            const overlap = await this.checkOverlap(
                data.medicoId,
                data.giorno,
                data.oraInizio,
                data.oraFine,
                tenantId,
                null // no exclude id for new
            );

            if (overlap) {
                throw new Error(`Esiste già una disponibilità per questo medico ${this.getGiornoName(data.giorno)} dalle ${overlap.oraInizio} alle ${overlap.oraFine}`);
            }

            const disponibilita = await prisma.disponibilitaMedico.create({
                data: {
                    tenantId,
                    medicoId: data.medicoId,
                    ambulatorioId: data.ambulatorioId || null,
                    prestazioneId: data.prestazioneId || null,
                    giorno: parseInt(data.giorno),
                    oraInizio: data.oraInizio,
                    oraFine: data.oraFine,
                    durataSlot: data.durataSlot || 30,
                    intervalloSlot: data.intervalloSlot || 0,
                    maxAppuntamenti: data.maxAppuntamenti || null,
                    attivo: data.attivo !== false,
                    validoDal: data.validoDal ? new Date(data.validoDal) : null,
                    validoAl: data.validoAl ? new Date(data.validoAl) : null,
                    note: data.note || null,
                    branchType: data.branchType || 'MEDICA',
                    createdBy: data.createdBy || null
                }
            });

            logger.info('Disponibilità created', {
                component: 'disponibilita-medico-service',
                action: 'create',
                id: disponibilita.id,
                medicoId: data.medicoId,
                giorno: data.giorno,
                tenantId
            });

            // P68: Auto-genera slot per i prossimi 3 mesi dopo creazione pattern
            if (disponibilita.attivo && disponibilita.ambulatorioId) {
                try {
                    const today = new Date();
                    today.setHours(12, 0, 0, 0); // noon-based to avoid DST edge
                    const threeMonthsLater = new Date(today);
                    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

                    // Build YYYY-MM-DD locally (toISOString converts to UTC → can shift day)
                    const pad2 = n => String(n).padStart(2, '0');
                    const dataInizio = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
                    const dataFine = `${threeMonthsLater.getFullYear()}-${pad2(threeMonthsLater.getMonth() + 1)}-${pad2(threeMonthsLater.getDate())}`;

                    const genResult = await SlotDisponibilitaService.generateFromDisponibilita(
                        data.medicoId,
                        dataInizio,
                        dataFine,
                        tenantId
                    );

                    logger.info('P68: Auto-generated slots after pattern creation', {
                        component: 'disponibilita-medico-service',
                        action: 'create-auto-generate',
                        disponibilitaId: disponibilita.id,
                        medicoId: data.medicoId,
                        created: genResult.created,
                        skipped: genResult.skipped,
                        dateRange: `${dataInizio} - ${dataFine}`,
                        tenantId
                    });

                    disponibilita._slotsGenerated = genResult.created;
                    disponibilita._slotsSkipped = genResult.skipped;
                } catch (genError) {
                    // Non bloccare la creazione del pattern se la generazione slot fallisce
                    logger.error('P68: Failed to auto-generate slots after pattern creation', {
                        component: 'disponibilita-medico-service',
                        action: 'create-auto-generate',
                        disponibilitaId: disponibilita.id,
                        error: genError.message,
                        tenantId
                    });
                }
            }

            return disponibilita;
        } catch (error) {
            logger.error('Failed to create disponibilità', {
                component: 'disponibilita-medico-service',
                action: 'create',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update disponibilità
     * @param {string} id - Disponibilità ID
     * @param {Object} data - Update data
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Updated disponibilità
     */
    static async update(id, data, tenantId) {
        try {
            // Verify exists
            const existing = await this.getById(id, tenantId);

            // Check for overlap if changing time/day or medico
            if (data.giorno !== undefined || data.oraInizio || data.oraFine || data.medicoId) {
                const targetMedicoId = data.medicoId || existing.medicoId;
                const overlap = await this.checkOverlap(
                    targetMedicoId,
                    data.giorno !== undefined ? data.giorno : existing.giorno,
                    data.oraInizio || existing.oraInizio,
                    data.oraFine || existing.oraFine,
                    tenantId,
                    id // exclude current
                );

                if (overlap) {
                    const giorno = data.giorno !== undefined ? data.giorno : existing.giorno;
                    throw new Error(`Esiste già una disponibilità per questo medico ${this.getGiornoName(giorno)} dalle ${overlap.oraInizio} alle ${overlap.oraFine}`);
                }
            }

            const updateData = {};
            if (data.medicoId !== undefined) updateData.medicoId = data.medicoId;
            if (data.ambulatorioId !== undefined) updateData.ambulatorioId = data.ambulatorioId || null;
            if (data.prestazioneId !== undefined) updateData.prestazioneId = data.prestazioneId || null;
            if (data.giorno !== undefined) updateData.giorno = parseInt(data.giorno);
            if (data.oraInizio) updateData.oraInizio = data.oraInizio;
            if (data.oraFine) updateData.oraFine = data.oraFine;
            if (data.durataSlot !== undefined) updateData.durataSlot = data.durataSlot;
            if (data.intervalloSlot !== undefined) updateData.intervalloSlot = data.intervalloSlot;
            if (data.maxAppuntamenti !== undefined) updateData.maxAppuntamenti = data.maxAppuntamenti;
            if (data.attivo !== undefined) updateData.attivo = data.attivo;
            if (data.validoDal !== undefined) updateData.validoDal = data.validoDal ? new Date(data.validoDal) : null;
            if (data.validoAl !== undefined) updateData.validoAl = data.validoAl ? new Date(data.validoAl) : null;
            if (data.note !== undefined) updateData.note = data.note;

            const disponibilita = await prisma.disponibilitaMedico.update({
                where: { id },
                data: updateData
            });

            logger.info('Disponibilità updated', {
                component: 'disponibilita-medico-service',
                action: 'update',
                id,
                tenantId
            });

            // P68: Se il pattern è attivo e ha ambulatorio, rigenera slot futuri (non tocca quelli con appuntamenti)
            const timeChanged = data.oraInizio || data.oraFine || data.giorno !== undefined || data.durataSlot !== undefined || data.intervalloSlot !== undefined;
            if (disponibilita.attivo && disponibilita.ambulatorioId && timeChanged) {
                try {
                    // Elimina slot futuri LIBERI (senza appuntamento) legati a questo pattern
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(0, 0, 0, 0);

                    await prisma.slotDisponibilita.updateMany({
                        where: {
                            disponibilitaMedicoId: id,
                            tenantId,
                            data: { gte: tomorrow },
                            stato: 'LIBERO',
                            appuntamentoId: null,
                            deletedAt: null
                        },
                        data: { deletedAt: new Date() }
                    });

                    // Rigenera per i prossimi 3 mesi
                    const today = new Date();
                    today.setHours(12, 0, 0, 0); // noon-based to avoid DST edge
                    const threeMonthsLater = new Date(today);
                    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

                    // Build YYYY-MM-DD locally (toISOString converts to UTC → can shift day)
                    const pad2 = n => String(n).padStart(2, '0');
                    const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
                    const endStr = `${threeMonthsLater.getFullYear()}-${pad2(threeMonthsLater.getMonth() + 1)}-${pad2(threeMonthsLater.getDate())}`;

                    const genResult = await SlotDisponibilitaService.generateFromDisponibilita(
                        disponibilita.medicoId,
                        todayStr,
                        endStr,
                        tenantId
                    );

                    logger.info('P68: Regenerated slots after pattern update', {
                        component: 'disponibilita-medico-service',
                        action: 'update-regenerate',
                        disponibilitaId: id,
                        created: genResult.created,
                        tenantId
                    });
                } catch (genError) {
                    logger.error('P68: Failed to regenerate slots after pattern update', {
                        component: 'disponibilita-medico-service',
                        action: 'update-regenerate',
                        error: genError.message,
                        tenantId
                    });
                }
            }

            return disponibilita;
        } catch (error) {
            logger.error('Failed to update disponibilità', {
                component: 'disponibilita-medico-service',
                action: 'update',
                id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Delete disponibilità (soft delete)
     * @param {string} id - Disponibilità ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Deleted disponibilità
     */
    static async delete(id, tenantId) {
        try {
            // Verify exists
            await this.getById(id, tenantId);

            const disponibilita = await prisma.disponibilitaMedico.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            logger.info('Disponibilità deleted', {
                component: 'disponibilita-medico-service',
                action: 'delete',
                id,
                tenantId
            });

            return disponibilita;
        } catch (error) {
            logger.error('Failed to delete disponibilità', {
                component: 'disponibilita-medico-service',
                action: 'delete',
                id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Copy week pattern from one week to another
     * @param {string} medicoId - Medico ID
     * @param {string} fromDate - Source week start date (YYYY-MM-DD)
     * @param {string} toDate - Target week start date (YYYY-MM-DD) 
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Copy result
     */
    static async copyWeek(medicoId, fromDate, toDate, tenantId) {
        try {
            // Get all active disponibilità for the medico
            const disponibilita = await prisma.disponibilitaMedico.findMany({
                where: {
                    medicoId,
                    tenantId,
                    deletedAt: null,
                    attivo: true
                }
            });

            // Since DisponibilitaMedico is weekly pattern (not date-specific),
            // copying week doesn't really make sense - the pattern applies to all weeks.
            // This might be used to generate SlotDisponibilita for a specific week instead.

            return {
                success: true,
                message: 'Pattern settimanale è già applicato a tutte le settimane',
                existingPatterns: disponibilita.length
            };
        } catch (error) {
            logger.error('Failed to copy week', {
                component: 'disponibilita-medico-service',
                action: 'copyWeek',
                medicoId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Check for overlapping disponibilità
     * @param {string} medicoId - Medico ID
     * @param {number} giorno - Day of week (0-6)
     * @param {string} oraInizio - Start time HH:mm
     * @param {string} oraFine - End time HH:mm
     * @param {string} tenantId - Tenant ID
     * @param {string|null} excludeId - ID to exclude (for updates)
     * @returns {Promise<Object|null>} Overlapping record or null
     */
    static async checkOverlap(medicoId, giorno, oraInizio, oraFine, tenantId, excludeId = null) {
        try {
            const where = {
                medicoId,
                giorno: parseInt(giorno),
                tenantId,
                deletedAt: null,
                attivo: true,
                ...(excludeId && { id: { not: excludeId } })
            };

            const existing = await prisma.disponibilitaMedico.findMany({ where });

            // Check time overlap
            for (const disp of existing) {
                if (this.timesOverlap(oraInizio, oraFine, disp.oraInizio, disp.oraFine)) {
                    return disp;
                }
            }

            return null;
        } catch (error) {
            logger.error('Failed to check overlap', {
                component: 'disponibilita-medico-service',
                action: 'checkOverlap',
                error: error.message
            });
            return null;
        }
    }

    /**
     * Check if two time ranges overlap
     * @param {string} start1 - First range start HH:mm
     * @param {string} end1 - First range end HH:mm
     * @param {string} start2 - Second range start HH:mm
     * @param {string} end2 - Second range end HH:mm
     * @returns {boolean} True if overlapping
     */
    static timesOverlap(start1, end1, start2, end2) {
        const toMinutes = (time) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        const s1 = toMinutes(start1);
        const e1 = toMinutes(end1);
        const s2 = toMinutes(start2);
        const e2 = toMinutes(end2);

        return s1 < e2 && e1 > s2;
    }

    /**
     * Get day name from number
     * @param {number} giorno - Day number (0-6)
     * @returns {string} Day name in Italian
     */
    static getGiornoName(giorno) {
        const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
        return giorni[parseInt(giorno)] || 'giorno non valido';
    }
}

export default DisponibilitaMedicoService;
