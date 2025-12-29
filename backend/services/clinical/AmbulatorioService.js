/**
 * Ambulatorio Service
 * Business logic for clinic room management
 * 
 * @module services/clinical/AmbulatorioService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

export class AmbulatorioService {
    /**
     * Create a new ambulatorio
     */
    static async create(data, tenantId) {
        try {
            // Verify poliambulatorio exists and belongs to tenant
            const poliambulatorio = await prisma.poliambulatorio.findFirst({
                where: {
                    id: data.poliambulatorioId,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!poliambulatorio) {
                throw new Error('Poliambulatorio not found');
            }

            const ambulatorio = await prisma.ambulatorio.create({
                data: {
                    ...data,
                    tenantId
                },
                include: {
                    poliambulatorio: {
                        select: { id: true, nome: true, codice: true }
                    },
                    prestazioniAmbulatorio: {
                        where: { deletedAt: null },
                        include: {
                            prestazione: {
                                select: { id: true, nome: true, codice: true }
                            }
                        }
                    },
                    strumentiAssegnati: {
                        where: { deletedAt: null },
                        include: {
                            strumento: {
                                select: { id: true, nome: true, codice: true }
                            }
                        }
                    }
                }
            });

            logger.info('Ambulatorio created', {
                component: 'ambulatorio-service',
                action: 'create',
                ambulatorioId: ambulatorio.id,
                poliambulatorioId: data.poliambulatorioId,
                tenantId
            });

            return ambulatorio;
        } catch (error) {
            logger.error('Failed to create ambulatorio', {
                component: 'ambulatorio-service',
                action: 'create',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get ambulatorio by ID
     */
    static async getById(id, tenantId) {
        try {
            const ambulatorio = await prisma.ambulatorio.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    poliambulatorio: {
                        select: { id: true, nome: true, codice: true }
                    },
                    prestazioniAmbulatorio: {
                        where: { attivo: true, deletedAt: null },
                        include: {
                            prestazione: {
                                select: {
                                    id: true,
                                    nome: true,
                                    codice: true,
                                    tipo: true,
                                    durataPrevista: true
                                }
                            }
                        }
                    },
                    strumentiAssegnati: {
                        where: { deletedAt: null },
                        include: {
                            strumento: {
                                select: {
                                    id: true,
                                    nome: true,
                                    codice: true,
                                    stato: true
                                }
                            }
                        }
                    }
                }
            });

            return ambulatorio;
        } catch (error) {
            logger.error('Failed to get ambulatorio', {
                component: 'ambulatorio-service',
                action: 'getById',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all ambulatori for tenant
     */
    static async getAll(tenantId, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                search = '',
                poliambulatorioId = null,
                specializzazione = null,
                filterByActive = true,
                orderBy = 'nome',
                orderDir = 'asc'
            } = options;

            const skip = (page - 1) * limit;

            const where = {
                tenantId,
                deletedAt: null,
                ...(filterByActive && { stato: 'ATTIVO' }),
                ...(poliambulatorioId && { poliambulatorioId }),
                ...(specializzazione && { specializzazione }),
                ...(search && {
                    OR: [
                        { nome: { contains: search, mode: 'insensitive' } },
                        { codice: { contains: search, mode: 'insensitive' } },
                        { specializzazione: { contains: search, mode: 'insensitive' } }
                    ]
                })
            };

            const [ambulatori, total] = await Promise.all([
                prisma.ambulatorio.findMany({
                    where,
                    include: {
                        poliambulatorio: {
                            select: { id: true, nome: true }
                        },
                        _count: {
                            select: {
                                prestazioniAmbulatorio: true,
                                strumentiAssegnati: true,
                                appuntamenti: true
                            }
                        }
                    },
                    orderBy: { [orderBy]: orderDir },
                    skip,
                    take: limit
                }),
                prisma.ambulatorio.count({ where })
            ]);

            return {
                data: ambulatori,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Failed to get ambulatori', {
                component: 'ambulatorio-service',
                action: 'getAll',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get ambulatori by poliambulatorio
     */
    static async getByPoliambulatorio(poliambulatorioId, tenantId) {
        try {
            const ambulatori = await prisma.ambulatorio.findMany({
                where: {
                    poliambulatorioId,
                    tenantId,
                    deletedAt: null,
                    stato: 'ATTIVO'
                },
                include: {
                    _count: {
                        select: { prestazioniAmbulatorio: true }
                    }
                },
                orderBy: { nome: 'asc' }
            });

            return ambulatori;
        } catch (error) {
            logger.error('Failed to get ambulatori by poliambulatorio', {
                component: 'ambulatorio-service',
                action: 'getByPoliambulatorio',
                error: error.message,
                poliambulatorioId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update ambulatorio
     */
    static async update(id, data, tenantId) {
        try {
            const existing = await prisma.ambulatorio.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Ambulatorio not found');
            }

            const updated = await prisma.ambulatorio.update({
                where: { id },
                data: {
                    ...data,
                    updatedAt: new Date()
                },
                include: {
                    poliambulatorio: {
                        select: { id: true, nome: true }
                    },
                    prestazioniAmbulatorio: {
                        where: { deletedAt: null },
                        include: { prestazione: true }
                    },
                    strumentiAssegnati: {
                        where: { deletedAt: null },
                        include: { strumento: true }
                    }
                }
            });

            logger.info('Ambulatorio updated', {
                component: 'ambulatorio-service',
                action: 'update',
                ambulatorioId: id,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to update ambulatorio', {
                component: 'ambulatorio-service',
                action: 'update',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete ambulatorio
     */
    static async delete(id, tenantId) {
        try {
            const existing = await prisma.ambulatorio.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Ambulatorio not found');
            }

            // Check for future appointments
            const futureAppointments = await prisma.appuntamento.count({
                where: {
                    ambulatorioId: id,
                    dataOra: { gte: new Date() },
                    stato: { notIn: ['ANNULLATO', 'COMPLETATO'] },
                    deletedAt: null
                }
            });

            if (futureAppointments > 0) {
                throw new Error(`Cannot delete ambulatorio with ${futureAppointments} pending appointments`);
            }

            await prisma.ambulatorio.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            logger.info('Ambulatorio deleted', {
                component: 'ambulatorio-service',
                action: 'delete',
                ambulatorioId: id,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('Failed to delete ambulatorio', {
                component: 'ambulatorio-service',
                action: 'delete',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Assign prestazione to ambulatorio
     */
    static async assignPrestazione(ambulatorioId, prestazioneId, tenantId) {
        try {
            // Verify both belong to tenant
            const [ambulatorio, prestazione] = await Promise.all([
                prisma.ambulatorio.findFirst({
                    where: { id: ambulatorioId, tenantId, deletedAt: null }
                }),
                prisma.prestazione.findFirst({
                    where: { id: prestazioneId, tenantId, deletedAt: null }
                })
            ]);

            if (!ambulatorio) throw new Error('Ambulatorio not found');
            if (!prestazione) throw new Error('Prestazione not found');

            // Check if already assigned
            const existing = await prisma.ambulatorioPrestazione.findFirst({
                where: { ambulatorioId, prestazioneId }
            });

            if (existing) {
                // Reactivate if deactivated
                return prisma.ambulatorioPrestazione.update({
                    where: { id: existing.id },
                    data: { attivo: true, deletedAt: null }
                });
            }

            const assignment = await prisma.ambulatorioPrestazione.create({
                data: {
                    ambulatorioId,
                    prestazioneId,
                    tenantId
                }
            });

            logger.info('Prestazione assigned to ambulatorio', {
                component: 'ambulatorio-service',
                action: 'assignPrestazione',
                ambulatorioId,
                prestazioneId,
                tenantId
            });

            return assignment;
        } catch (error) {
            logger.error('Failed to assign prestazione', {
                component: 'ambulatorio-service',
                action: 'assignPrestazione',
                error: error.message,
                ambulatorioId,
                prestazioneId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Remove prestazione from ambulatorio
     */
    static async removePrestazione(ambulatorioId, prestazioneId, tenantId) {
        try {
            const assignment = await prisma.ambulatorioPrestazione.findFirst({
                where: { ambulatorioId, prestazioneId }
            });

            if (!assignment) {
                throw new Error('Assignment not found');
            }

            await prisma.ambulatorioPrestazione.update({
                where: { id: assignment.id },
                data: { attivo: false }
            });

            logger.info('Prestazione removed from ambulatorio', {
                component: 'ambulatorio-service',
                action: 'removePrestazione',
                ambulatorioId,
                prestazioneId,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('Failed to remove prestazione', {
                component: 'ambulatorio-service',
                action: 'removePrestazione',
                error: error.message,
                ambulatorioId,
                prestazioneId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get availability for a specific date
     */
    static async getAvailability(ambulatorioId, date, tenantId) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const appointments = await prisma.appuntamento.findMany({
                where: {
                    ambulatorioId,
                    tenantId,
                    dataOra: {
                        gte: startOfDay,
                        lte: endOfDay
                    },
                    stato: { notIn: ['ANNULLATO'] },
                    deletedAt: null
                },
                select: {
                    dataOra: true,
                    durataMinuti: true,
                    stato: true
                },
                orderBy: { dataOra: 'asc' }
            });

            return {
                date: date,
                ambulatorioId,
                slots: appointments.map(a => ({
                    start: a.dataOra,
                    duration: a.durataMinuti,
                    status: a.stato
                }))
            };
        } catch (error) {
            logger.error('Failed to get ambulatorio availability', {
                component: 'ambulatorio-service',
                action: 'getAvailability',
                error: error.message,
                ambulatorioId,
                date,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get specializations list (distinct values)
     */
    static async getSpecializations(tenantId) {
        try {
            const specializations = await prisma.ambulatorio.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    specializzazione: { not: null }
                },
                select: { specializzazione: true },
                distinct: ['specializzazione']
            });

            return specializations
                .map(s => s.specializzazione)
                .filter(Boolean)
                .sort();
        } catch (error) {
            logger.error('Failed to get specializations', {
                component: 'ambulatorio-service',
                action: 'getSpecializations',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }
}

export default AmbulatorioService;
