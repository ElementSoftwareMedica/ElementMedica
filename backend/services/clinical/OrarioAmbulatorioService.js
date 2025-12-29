/**
 * OrarioAmbulatorio Service
 * Business logic for ambulatorio schedule management
 * 
 * @module services/clinical/OrarioAmbulatorioService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

// Day names for display
const GIORNI_SETTIMANA = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

export class OrarioAmbulatorioService {
    /**
     * Create a new orario
     * @param {Object} data - Orario data
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Created orario
     */
    static async create(data, tenantId) {
        try {
            // Validate ambulatorio exists
            const ambulatorio = await prisma.ambulatorio.findFirst({
                where: { id: data.ambulatorioId, tenantId, deletedAt: null }
            });

            if (!ambulatorio) {
                throw new Error('Ambulatorio non trovato');
            }

            // Check for overlapping schedule on same day
            const overlap = await this.checkOverlap(
                data.ambulatorioId,
                data.giornoSettimana,
                data.oraInizio,
                data.oraFine,
                tenantId
            );

            if (overlap) {
                throw new Error(`Orario sovrapposto con esistente: ${overlap.oraInizio}-${overlap.oraFine}`);
            }

            const orario = await prisma.orarioAmbulatorio.create({
                data: {
                    tenantId,
                    ambulatorioId: data.ambulatorioId,
                    giornoSettimana: data.giornoSettimana,
                    oraInizio: data.oraInizio,
                    oraFine: data.oraFine,
                    attivo: data.attivo !== false
                },
                include: {
                    ambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true
                        }
                    }
                }
            });

            logger.info('Orario ambulatorio created', {
                component: 'orario-service',
                action: 'create',
                orarioId: orario.id,
                ambulatorioId: data.ambulatorioId,
                giorno: GIORNI_SETTIMANA[data.giornoSettimana],
                tenantId
            });

            return {
                ...orario,
                giornoNome: GIORNI_SETTIMANA[orario.giornoSettimana]
            };
        } catch (error) {
            logger.error('Failed to create orario', {
                component: 'orario-service',
                action: 'create',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Create multiple orari at once (bulk)
     * @param {Array} orari - Array of orario data
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Result with created and failed
     */
    static async createBulk(orari, tenantId) {
        const results = { created: [], failed: [] };

        for (const orarioData of orari) {
            try {
                const orario = await this.create(orarioData, tenantId);
                results.created.push(orario);
            } catch (error) {
                results.failed.push({
                    data: orarioData,
                    error: error.message
                });
            }
        }

        logger.info('Bulk orari created', {
            component: 'orario-service',
            action: 'createBulk',
            created: results.created.length,
            failed: results.failed.length,
            tenantId
        });

        return results;
    }

    /**
     * Copy schedule template from one ambulatorio to another
     * @param {string} fromAmbulatorioId - Source ambulatorio
     * @param {string} toAmbulatorioId - Target ambulatorio
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Copy result
     */
    static async copySchedule(fromAmbulatorioId, toAmbulatorioId, tenantId) {
        try {
            // Verify both ambulatori exist
            const [from, to] = await Promise.all([
                prisma.ambulatorio.findFirst({ where: { id: fromAmbulatorioId, tenantId, deletedAt: null } }),
                prisma.ambulatorio.findFirst({ where: { id: toAmbulatorioId, tenantId, deletedAt: null } })
            ]);

            if (!from) throw new Error('Ambulatorio sorgente non trovato');
            if (!to) throw new Error('Ambulatorio destinazione non trovato');

            // Get source schedule
            const sourceOrari = await prisma.orarioAmbulatorio.findMany({
                where: { ambulatorioId: fromAmbulatorioId, tenantId, deletedAt: null }
            });

            if (sourceOrari.length === 0) {
                return { created: [], message: 'Nessun orario da copiare' };
            }

            // Create copies
            const results = { created: [], skipped: [] };

            for (const orario of sourceOrari) {
                // Check if target already has this schedule
                const existing = await prisma.orarioAmbulatorio.findFirst({
                    where: {
                        ambulatorioId: toAmbulatorioId,
                        giornoSettimana: orario.giornoSettimana,
                        oraInizio: orario.oraInizio,
                        tenantId,
                        deletedAt: null
                    }
                });

                if (existing) {
                    results.skipped.push({
                        giorno: GIORNI_SETTIMANA[orario.giornoSettimana],
                        orario: `${orario.oraInizio}-${orario.oraFine}`
                    });
                    continue;
                }

                const newOrario = await prisma.orarioAmbulatorio.create({
                    data: {
                        tenantId,
                        ambulatorioId: toAmbulatorioId,
                        giornoSettimana: orario.giornoSettimana,
                        oraInizio: orario.oraInizio,
                        oraFine: orario.oraFine,
                        attivo: orario.attivo
                    }
                });

                results.created.push({
                    ...newOrario,
                    giornoNome: GIORNI_SETTIMANA[newOrario.giornoSettimana]
                });
            }

            logger.info('Schedule copied', {
                component: 'orario-service',
                action: 'copySchedule',
                fromAmbulatorioId,
                toAmbulatorioId,
                created: results.created.length,
                skipped: results.skipped.length,
                tenantId
            });

            return results;
        } catch (error) {
            logger.error('Failed to copy schedule', {
                component: 'orario-service',
                action: 'copySchedule',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get orario by ID
     * @param {string} id - Orario ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object|null>} Orario or null
     */
    static async getById(id, tenantId) {
        try {
            const orario = await prisma.orarioAmbulatorio.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    ambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true,
                            sedeId: true
                        }
                    }
                }
            });

            if (orario) {
                return {
                    ...orario,
                    giornoNome: GIORNI_SETTIMANA[orario.giornoSettimana]
                };
            }

            return null;
        } catch (error) {
            logger.error('Failed to get orario', {
                component: 'orario-service',
                action: 'getById',
                orarioId: id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all orari for an ambulatorio
     * @param {string} ambulatorioId - Ambulatorio ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Orari list
     */
    static async getByAmbulatorio(ambulatorioId, tenantId) {
        try {
            const orari = await prisma.orarioAmbulatorio.findMany({
                where: {
                    ambulatorioId,
                    tenantId,
                    deletedAt: null
                },
                orderBy: [
                    { giornoSettimana: 'asc' },
                    { oraInizio: 'asc' }
                ]
            });

            return orari.map(o => ({
                ...o,
                giornoNome: GIORNI_SETTIMANA[o.giornoSettimana]
            }));
        } catch (error) {
            logger.error('Failed to get orari by ambulatorio', {
                component: 'orario-service',
                action: 'getByAmbulatorio',
                ambulatorioId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get weekly schedule view for an ambulatorio
     * @param {string} ambulatorioId - Ambulatorio ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Weekly schedule view
     */
    static async getWeeklySchedule(ambulatorioId, tenantId) {
        try {
            const orari = await this.getByAmbulatorio(ambulatorioId, tenantId);

            // Group by day
            const schedule = {};
            for (let i = 0; i < 7; i++) {
                schedule[i] = {
                    giorno: i,
                    giornoNome: GIORNI_SETTIMANA[i],
                    orari: [],
                    isAttivo: false
                };
            }

            for (const orario of orari) {
                schedule[orario.giornoSettimana].orari.push({
                    id: orario.id,
                    oraInizio: orario.oraInizio,
                    oraFine: orario.oraFine,
                    attivo: orario.attivo
                });
                if (orario.attivo) {
                    schedule[orario.giornoSettimana].isAttivo = true;
                }
            }

            return Object.values(schedule);
        } catch (error) {
            logger.error('Failed to get weekly schedule', {
                component: 'orario-service',
                action: 'getWeeklySchedule',
                ambulatorioId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all orari with pagination and filters
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Paginated orari
     */
    static async getAll(tenantId, options = {}) {
        try {
            const {
                page = 1,
                pageSize = 50,
                ambulatorioId,
                giornoSettimana,
                attivo,
                sortBy = 'giornoSettimana',
                sortOrder = 'asc'
            } = options;

            const skip = (page - 1) * pageSize;

            const where = {
                tenantId,
                deletedAt: null
            };

            if (ambulatorioId) where.ambulatorioId = ambulatorioId;
            if (giornoSettimana !== undefined) where.giornoSettimana = giornoSettimana;
            if (attivo !== undefined) where.attivo = attivo;

            const [total, orari] = await Promise.all([
                prisma.orarioAmbulatorio.count({ where }),
                prisma.orarioAmbulatorio.findMany({
                    where,
                    include: {
                        ambulatorio: {
                            select: {
                                id: true,
                                nome: true,
                                codice: true
                            }
                        }
                    },
                    orderBy: { [sortBy]: sortOrder },
                    skip,
                    take: pageSize
                })
            ]);

            return {
                data: orari.map(o => ({
                    ...o,
                    giornoNome: GIORNI_SETTIMANA[o.giornoSettimana]
                })),
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize),
                    hasNext: skip + orari.length < total,
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            logger.error('Failed to get orari', {
                component: 'orario-service',
                action: 'getAll',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update orario
     * @param {string} id - Orario ID
     * @param {Object} data - Update data
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Updated orario
     */
    static async update(id, data, tenantId) {
        try {
            const existing = await prisma.orarioAmbulatorio.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Orario non trovato');
            }

            // Check for overlap if time or day is changing
            if (data.oraInizio || data.oraFine || data.giornoSettimana !== undefined) {
                const overlap = await this.checkOverlap(
                    existing.ambulatorioId,
                    data.giornoSettimana !== undefined ? data.giornoSettimana : existing.giornoSettimana,
                    data.oraInizio || existing.oraInizio,
                    data.oraFine || existing.oraFine,
                    tenantId,
                    id
                );

                if (overlap) {
                    throw new Error(`Orario sovrapposto con esistente: ${overlap.oraInizio}-${overlap.oraFine}`);
                }
            }

            const updateData = {};

            const allowedFields = ['giornoSettimana', 'oraInizio', 'oraFine', 'attivo'];
            allowedFields.forEach(field => {
                if (data[field] !== undefined) {
                    updateData[field] = data[field];
                }
            });

            const orario = await prisma.orarioAmbulatorio.update({
                where: { id },
                data: updateData,
                include: {
                    ambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true
                        }
                    }
                }
            });

            logger.info('Orario updated', {
                component: 'orario-service',
                action: 'update',
                orarioId: id,
                tenantId
            });

            return {
                ...orario,
                giornoNome: GIORNI_SETTIMANA[orario.giornoSettimana]
            };
        } catch (error) {
            logger.error('Failed to update orario', {
                component: 'orario-service',
                action: 'update',
                orarioId: id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Toggle orario active status
     * @param {string} id - Orario ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Updated orario
     */
    static async toggleActive(id, tenantId) {
        try {
            const existing = await prisma.orarioAmbulatorio.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Orario non trovato');
            }

            const orario = await prisma.orarioAmbulatorio.update({
                where: { id },
                data: { attivo: !existing.attivo }
            });

            logger.info('Orario toggled', {
                component: 'orario-service',
                action: 'toggleActive',
                orarioId: id,
                attivo: orario.attivo,
                tenantId
            });

            return {
                ...orario,
                giornoNome: GIORNI_SETTIMANA[orario.giornoSettimana]
            };
        } catch (error) {
            logger.error('Failed to toggle orario', {
                component: 'orario-service',
                action: 'toggleActive',
                orarioId: id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete orario
     * @param {string} id - Orario ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Deleted orario
     */
    static async delete(id, tenantId) {
        try {
            const existing = await prisma.orarioAmbulatorio.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Orario non trovato');
            }

            const orario = await prisma.orarioAmbulatorio.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            logger.info('Orario deleted', {
                component: 'orario-service',
                action: 'delete',
                orarioId: id,
                tenantId
            });

            return orario;
        } catch (error) {
            logger.error('Failed to delete orario', {
                component: 'orario-service',
                action: 'delete',
                orarioId: id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Delete all orari for an ambulatorio
     * @param {string} ambulatorioId - Ambulatorio ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Delete result
     */
    static async deleteByAmbulatorio(ambulatorioId, tenantId) {
        try {
            const result = await prisma.orarioAmbulatorio.updateMany({
                where: {
                    ambulatorioId,
                    tenantId,
                    deletedAt: null
                },
                data: { deletedAt: new Date() }
            });

            logger.info('Orari deleted by ambulatorio', {
                component: 'orario-service',
                action: 'deleteByAmbulatorio',
                ambulatorioId,
                count: result.count,
                tenantId
            });

            return { deleted: result.count };
        } catch (error) {
            logger.error('Failed to delete orari by ambulatorio', {
                component: 'orario-service',
                action: 'deleteByAmbulatorio',
                ambulatorioId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Check for schedule overlap
     * @param {string} ambulatorioId - Ambulatorio ID
     * @param {number} giornoSettimana - Day of week
     * @param {string} oraInizio - Start time
     * @param {string} oraFine - End time
     * @param {string} tenantId - Tenant ID
     * @param {string} excludeId - Orario ID to exclude
     * @returns {Promise<Object|null>} Overlapping orario or null
     */
    static async checkOverlap(ambulatorioId, giornoSettimana, oraInizio, oraFine, tenantId, excludeId = null) {
        try {
            const where = {
                tenantId,
                ambulatorioId,
                giornoSettimana,
                deletedAt: null,
                AND: [
                    { oraInizio: { lt: oraFine } },
                    { oraFine: { gt: oraInizio } }
                ]
            };

            if (excludeId) {
                where.id = { not: excludeId };
            }

            const overlap = await prisma.orarioAmbulatorio.findFirst({ where });
            return overlap;
        } catch (error) {
            logger.error('Failed to check overlap', {
                component: 'orario-service',
                action: 'checkOverlap',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get total weekly hours for an ambulatorio
     * @param {string} ambulatorioId - Ambulatorio ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Hours summary
     */
    static async getWeeklyHours(ambulatorioId, tenantId) {
        try {
            const orari = await prisma.orarioAmbulatorio.findMany({
                where: {
                    ambulatorioId,
                    tenantId,
                    deletedAt: null,
                    attivo: true
                }
            });

            let totalMinutes = 0;
            const perGiorno = {};

            for (const orario of orari) {
                const [startH, startM] = orario.oraInizio.split(':').map(Number);
                const [endH, endM] = orario.oraFine.split(':').map(Number);
                const minutes = (endH * 60 + endM) - (startH * 60 + startM);

                totalMinutes += minutes;

                if (!perGiorno[orario.giornoSettimana]) {
                    perGiorno[orario.giornoSettimana] = {
                        giorno: orario.giornoSettimana,
                        giornoNome: GIORNI_SETTIMANA[orario.giornoSettimana],
                        minuti: 0
                    };
                }
                perGiorno[orario.giornoSettimana].minuti += minutes;
            }

            // Convert to hours
            Object.values(perGiorno).forEach(g => {
                g.ore = Math.round(g.minuti / 60 * 10) / 10;
            });

            return {
                ambulatorioId,
                totaleOre: Math.round(totalMinutes / 60 * 10) / 10,
                totaleMinuti: totalMinutes,
                perGiorno: Object.values(perGiorno).sort((a, b) => a.giorno - b.giorno),
                giorniAttivi: Object.keys(perGiorno).length
            };
        } catch (error) {
            logger.error('Failed to get weekly hours', {
                component: 'orario-service',
                action: 'getWeeklyHours',
                ambulatorioId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Check if a specific time falls within ambulatorio hours
     * @param {string} ambulatorioId - Ambulatorio ID
     * @param {Date} datetime - Date and time to check
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Check result
     */
    static async isWithinHours(ambulatorioId, datetime, tenantId) {
        try {
            const date = new Date(datetime);
            const dayOfWeek = date.getDay();
            const time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

            const orario = await prisma.orarioAmbulatorio.findFirst({
                where: {
                    ambulatorioId,
                    tenantId,
                    deletedAt: null,
                    attivo: true,
                    giornoSettimana: dayOfWeek,
                    oraInizio: { lte: time },
                    oraFine: { gt: time }
                }
            });

            return {
                isWithinHours: !!orario,
                orario: orario ? {
                    id: orario.id,
                    oraInizio: orario.oraInizio,
                    oraFine: orario.oraFine
                } : null,
                checkedAt: datetime,
                dayOfWeek,
                time
            };
        } catch (error) {
            logger.error('Failed to check hours', {
                component: 'orario-service',
                action: 'isWithinHours',
                ambulatorioId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get next open time for an ambulatorio
     * @param {string} ambulatorioId - Ambulatorio ID
     * @param {string} tenantId - Tenant ID
     * @param {Date} fromDate - Start searching from this date
     * @returns {Promise<Object|null>} Next open time
     */
    static async getNextOpenTime(ambulatorioId, tenantId, fromDate = new Date()) {
        try {
            const orari = await prisma.orarioAmbulatorio.findMany({
                where: {
                    ambulatorioId,
                    tenantId,
                    deletedAt: null,
                    attivo: true
                },
                orderBy: [
                    { giornoSettimana: 'asc' },
                    { oraInizio: 'asc' }
                ]
            });

            if (orari.length === 0) {
                return null;
            }

            const now = new Date(fromDate);
            const currentDay = now.getDay();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            // Check each day starting from today
            for (let i = 0; i < 7; i++) {
                const checkDay = (currentDay + i) % 7;
                const dayOrari = orari.filter(o => o.giornoSettimana === checkDay);

                for (const orario of dayOrari) {
                    // If it's today, only consider times after now
                    if (i === 0 && orario.oraInizio <= currentTime) {
                        if (orario.oraFine > currentTime) {
                            // Currently open
                            return {
                                isOpen: true,
                                datetime: now,
                                orario
                            };
                        }
                        continue;
                    }

                    // Calculate actual date
                    const nextDate = new Date(now);
                    nextDate.setDate(nextDate.getDate() + i);
                    const [h, m] = orario.oraInizio.split(':').map(Number);
                    nextDate.setHours(h, m, 0, 0);

                    return {
                        isOpen: false,
                        datetime: nextDate,
                        orario,
                        daysUntil: i,
                        giornoNome: GIORNI_SETTIMANA[checkDay]
                    };
                }
            }

            return null;
        } catch (error) {
            logger.error('Failed to get next open time', {
                component: 'orario-service',
                action: 'getNextOpenTime',
                ambulatorioId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }
}

export default OrarioAmbulatorioService;
