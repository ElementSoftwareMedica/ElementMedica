/**
 * Poliambulatorio Service
 * Business logic for polyclinic management
 * 
 * @module services/clinical/PoliambulatorioService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

export class PoliambulatorioService {
    /**
     * Create a new poliambulatorio
     */
    static async create(data, tenantId) {
        try {
            const poliambulatorio = await prisma.poliambulatorio.create({
                data: {
                    ...data,
                    tenantId
                },
                include: {
                    direttoreSanitario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            registerCode: true
                        }
                    },
                    ambulatori: true
                }
            });

            logger.info('Poliambulatorio created', {
                component: 'poliambulatorio-service',
                action: 'create',
                poliambulatorioId: poliambulatorio.id,
                tenantId
            });

            return poliambulatorio;
        } catch (error) {
            logger.error('Failed to create poliambulatorio', {
                component: 'poliambulatorio-service',
                action: 'create',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get poliambulatorio by ID
     */
    static async getById(id, tenantId) {
        try {
            const poliambulatorio = await prisma.poliambulatorio.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    direttoreSanitario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            registerCode: true,
                            specialties: true
                        }
                    },
                    ambulatori: {
                        where: { deletedAt: null },
                        orderBy: { nome: 'asc' }
                    }
                }
            });

            return poliambulatorio;
        } catch (error) {
            logger.error('Failed to get poliambulatorio', {
                component: 'poliambulatorio-service',
                action: 'getById',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all poliambulatori for tenant
     */
    static async getAll(tenantId, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                search = '',
                isActive = true,
                orderBy = 'nome',
                orderDir = 'asc'
            } = options;

            const skip = (page - 1) * limit;

            const where = {
                tenantId,
                deletedAt: null,
                ...(isActive !== undefined && { isActive }),
                ...(search && {
                    OR: [
                        { nome: { contains: search, mode: 'insensitive' } },
                        { codice: { contains: search, mode: 'insensitive' } },
                        { citta: { contains: search, mode: 'insensitive' } }
                    ]
                })
            };

            const [poliambulatori, total] = await Promise.all([
                prisma.poliambulatorio.findMany({
                    where,
                    include: {
                        direttoreSanitario: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        },
                        _count: {
                            select: { ambulatori: true }
                        }
                    },
                    orderBy: { [orderBy]: orderDir },
                    skip,
                    take: limit
                }),
                prisma.poliambulatorio.count({ where })
            ]);

            return {
                data: poliambulatori,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Failed to get poliambulatori', {
                component: 'poliambulatorio-service',
                action: 'getAll',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update poliambulatorio
     */
    static async update(id, data, tenantId) {
        try {
            // Verify ownership
            const existing = await prisma.poliambulatorio.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Poliambulatorio not found');
            }

            const updated = await prisma.poliambulatorio.update({
                where: { id },
                data: {
                    ...data,
                    updatedAt: new Date()
                },
                include: {
                    direttoreSanitario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    },
                    ambulatori: {
                        where: { deletedAt: null }
                    }
                }
            });

            logger.info('Poliambulatorio updated', {
                component: 'poliambulatorio-service',
                action: 'update',
                poliambulatorioId: id,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to update poliambulatorio', {
                component: 'poliambulatorio-service',
                action: 'update',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete poliambulatorio
     */
    static async delete(id, tenantId) {
        try {
            // Verify ownership
            const existing = await prisma.poliambulatorio.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Poliambulatorio not found');
            }

            // Soft delete with cascade to ambulatori
            await prisma.$transaction([
                prisma.poliambulatorio.update({
                    where: { id },
                    data: { deletedAt: new Date() }
                }),
                prisma.ambulatorio.updateMany({
                    where: { poliambulatorioId: id },
                    data: { deletedAt: new Date() }
                })
            ]);

            logger.info('Poliambulatorio deleted', {
                component: 'poliambulatorio-service',
                action: 'delete',
                poliambulatorioId: id,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('Failed to delete poliambulatorio', {
                component: 'poliambulatorio-service',
                action: 'delete',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Assign direttore sanitario
     */
    static async assignDirettoreSanitario(poliambulatorioId, direttoreId, tenantId) {
        try {
            // Verify both exist in same tenant
            const [poliambulatorio, direttore] = await Promise.all([
                prisma.poliambulatorio.findFirst({
                    where: { id: poliambulatorioId, tenantId, deletedAt: null }
                }),
                prisma.person.findFirst({
                    where: { id: direttoreId, tenantId, deletedAt: null }
                })
            ]);

            if (!poliambulatorio) {
                throw new Error('Poliambulatorio not found');
            }
            if (!direttore) {
                throw new Error('Direttore sanitario not found');
            }

            const updated = await prisma.poliambulatorio.update({
                where: { id: poliambulatorioId },
                data: { direttoreSanitarioId: direttoreId },
                include: {
                    direttoreSanitario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            registerCode: true
                        }
                    }
                }
            });

            logger.info('Direttore sanitario assigned', {
                component: 'poliambulatorio-service',
                action: 'assignDirettoreSanitario',
                poliambulatorioId,
                direttoreId,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to assign direttore sanitario', {
                component: 'poliambulatorio-service',
                action: 'assignDirettoreSanitario',
                error: error.message,
                poliambulatorioId,
                direttoreId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get statistics for a poliambulatorio
     */
    static async getStatistics(poliambulatorioId, tenantId) {
        try {
            const ambulatoriIds = await prisma.ambulatorio.findMany({
                where: { poliambulatorioId, deletedAt: null },
                select: { id: true }
            }).then(a => a.map(x => x.id));

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const [
                totalAmbulatori,
                totalAppuntamentiOggi,
                totalVisiteOggi,
                appuntamentiInAttesa
            ] = await Promise.all([
                prisma.ambulatorio.count({
                    where: { poliambulatorioId, deletedAt: null, isActive: true }
                }),
                prisma.appuntamento.count({
                    where: {
                        tenantId,
                        ambulatorioId: { in: ambulatoriIds },
                        dataOra: { gte: today, lt: tomorrow },
                        deletedAt: null
                    }
                }),
                prisma.visita.count({
                    where: {
                        tenantId,
                        dataOra: { gte: today, lt: tomorrow },
                        deletedAt: null
                    }
                }),
                prisma.appuntamento.count({
                    where: {
                        tenantId,
                        ambulatorioId: { in: ambulatoriIds },
                        stato: 'IN_ATTESA',
                        deletedAt: null
                    }
                })
            ]);

            return {
                totalAmbulatori,
                totalAppuntamentiOggi,
                totalVisiteOggi,
                appuntamentiInAttesa
            };
        } catch (error) {
            logger.error('Failed to get poliambulatorio statistics', {
                component: 'poliambulatorio-service',
                action: 'getStatistics',
                error: error.message,
                poliambulatorioId,
                tenantId
            });
            throw error;
        }
    }
}

export default PoliambulatorioService;
