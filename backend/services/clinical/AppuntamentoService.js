/**
 * Appuntamento Service
 * Business logic for appointment management with queue system
 * 
 * @module services/clinical/AppuntamentoService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

export class AppuntamentoService {
    /**
     * Create a new appointment
     */
    static async create(data, tenantId, createdBy) {
        try {
            // Generate progressive number for the day
            const dataOra = new Date(data.dataOra);
            const startOfDay = new Date(dataOra);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(dataOra);
            endOfDay.setHours(23, 59, 59, 999);

            const countToday = await prisma.appuntamento.count({
                where: {
                    tenantId,
                    dataOra: { gte: startOfDay, lte: endOfDay }
                }
            });

            const numero = `${startOfDay.toISOString().split('T')[0]}-${String(countToday + 1).padStart(4, '0')}`;

            // Verify all references exist
            const [paziente, medico, ambulatorio] = await Promise.all([
                prisma.person.findFirst({
                    where: { id: data.pazienteId, tenantId, deletedAt: null }
                }),
                prisma.person.findFirst({
                    where: { id: data.medicoId, tenantId, deletedAt: null }
                }),
                prisma.ambulatorio.findFirst({
                    where: { id: data.ambulatorioId, tenantId, deletedAt: null }
                })
            ]);

            if (!paziente) throw new Error('Paziente not found');
            if (!medico) throw new Error('Medico not found');
            if (!ambulatorio) throw new Error('Ambulatorio not found');

            // Check for conflicts
            const conflicts = await this.checkConflicts(
                data.medicoId,
                data.ambulatorioId,
                dataOra,
                data.durataPrevista || 30,
                tenantId
            );

            if (conflicts.length > 0) {
                throw new Error(`Appointment conflicts with existing appointments: ${conflicts.map(c => c.numero).join(', ')}`);
            }

            const appuntamento = await prisma.appuntamento.create({
                data: {
                    ...data,
                    numero,
                    tenantId,
                    createdBy
                },
                include: {
                    paziente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            taxCode: true
                        }
                    },
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            specialties: true,
                            registerCode: true
                        }
                    },
                    ambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true,
                            specializzazione: true
                        }
                    }
                }
            });

            logger.info('Appuntamento created', {
                component: 'appuntamento-service',
                action: 'create',
                appuntamentoId: appuntamento.id,
                numero: appuntamento.numero,
                pazienteId: data.pazienteId,
                medicoId: data.medicoId,
                tenantId
            });

            return appuntamento;
        } catch (error) {
            logger.error('Failed to create appuntamento', {
                component: 'appuntamento-service',
                action: 'create',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get appointment by ID
     */
    static async getById(id, tenantId) {
        try {
            const appuntamento = await prisma.appuntamento.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    paziente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            taxCode: true,
                            birthDate: true
                        }
                    },
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            specialties: true,
                            registerCode: true
                        }
                    },
                    ambulatorio: {
                        include: {
                            poliambulatorio: {
                                select: { id: true, nome: true }
                            }
                        }
                    },
                    visite: {
                        where: { deletedAt: null }
                    }
                }
            });

            return appuntamento;
        } catch (error) {
            logger.error('Failed to get appuntamento', {
                component: 'appuntamento-service',
                action: 'getById',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all appointments with filters
     */
    static async getAll(tenantId, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                dateFrom = null,
                dateTo = null,
                medicoId = null,
                pazienteId = null,
                ambulatorioId = null,
                stato = null,
                search = '',
                orderBy = 'dataOra',
                orderDir = 'asc'
            } = options;

            const skip = (page - 1) * limit;

            const where = {
                tenantId,
                deletedAt: null,
                ...(dateFrom && { dataOra: { gte: new Date(dateFrom) } }),
                ...(dateTo && { dataOra: { ...where?.dataOra, lte: new Date(dateTo) } }),
                ...(medicoId && { medicoId }),
                ...(pazienteId && { pazienteId }),
                ...(ambulatorioId && { ambulatorioId }),
                ...(stato && { stato }),
                ...(search && {
                    OR: [
                        { numero: { contains: search, mode: 'insensitive' } },
                        { paziente: { firstName: { contains: search, mode: 'insensitive' } } },
                        { paziente: { lastName: { contains: search, mode: 'insensitive' } } },
                        { paziente: { taxCode: { contains: search, mode: 'insensitive' } } }
                    ]
                })
            };

            const [appuntamenti, total] = await Promise.all([
                prisma.appuntamento.findMany({
                    where,
                    include: {
                        paziente: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                phone: true
                            }
                        },
                        medico: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
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
                    orderBy: { [orderBy]: orderDir },
                    skip,
                    take: limit
                }),
                prisma.appuntamento.count({ where })
            ]);

            return {
                data: appuntamenti,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Failed to get appuntamenti', {
                component: 'appuntamento-service',
                action: 'getAll',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get today's appointments (agenda view)
     */
    static async getAgendaGiornaliera(tenantId, date = new Date(), options = {}) {
        try {
            const { medicoId, ambulatorioId } = options;

            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const where = {
                tenantId,
                deletedAt: null,
                dataOra: { gte: startOfDay, lte: endOfDay },
                ...(medicoId && { medicoId }),
                ...(ambulatorioId && { ambulatorioId })
            };

            const appuntamenti = await prisma.appuntamento.findMany({
                where,
                include: {
                    paziente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phone: true,
                            email: true
                        }
                    },
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    ambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            stanza: true
                        }
                    }
                },
                orderBy: { dataOra: 'asc' }
            });

            // Group by hour for agenda view
            const agendaByHour = {};
            appuntamenti.forEach(app => {
                const hour = app.dataOra.getHours();
                if (!agendaByHour[hour]) {
                    agendaByHour[hour] = [];
                }
                agendaByHour[hour].push(app);
            });

            return {
                date: startOfDay.toISOString().split('T')[0],
                totalAppuntamenti: appuntamenti.length,
                appuntamenti,
                agendaByHour
            };
        } catch (error) {
            logger.error('Failed to get agenda giornaliera', {
                component: 'appuntamento-service',
                action: 'getAgendaGiornaliera',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update appointment status
     */
    static async updateStato(id, stato, tenantId, additionalData = {}) {
        try {
            const existing = await prisma.appuntamento.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Appuntamento not found');
            }

            const updateData = {
                stato,
                updatedAt: new Date()
            };

            // Handle specific state transitions
            switch (stato) {
                case 'CONFERMATO':
                    updateData.dataConferma = new Date();
                    break;
                case 'ANNULLATO':
                    updateData.dataAnnullamento = new Date();
                    updateData.motivoAnnullamento = additionalData.motivoAnnullamento;
                    break;
                case 'IN_ATTESA':
                    updateData.oraArrivo = new Date();
                    // Assign queue number
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const queueCount = await prisma.appuntamento.count({
                        where: {
                            tenantId,
                            dataOra: { gte: today },
                            stato: { in: ['IN_ATTESA', 'IN_CORSO'] },
                            numeroCoda: { not: null }
                        }
                    });
                    updateData.numeroCoda = queueCount + 1;
                    break;
                case 'IN_CORSO':
                    updateData.oraInizio = new Date();
                    break;
                case 'COMPLETATO':
                    updateData.oraFine = new Date();
                    break;
            }

            const updated = await prisma.appuntamento.update({
                where: { id },
                data: updateData,
                include: {
                    paziente: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    medico: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    ambulatorio: {
                        select: { id: true, nome: true }
                    }
                }
            });

            logger.info('Appuntamento stato updated', {
                component: 'appuntamento-service',
                action: 'updateStato',
                appuntamentoId: id,
                oldStato: existing.stato,
                newStato: stato,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to update appuntamento stato', {
                component: 'appuntamento-service',
                action: 'updateStato',
                error: error.message,
                id,
                stato,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update appointment
     */
    static async update(id, data, tenantId) {
        try {
            const existing = await prisma.appuntamento.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Appuntamento not found');
            }

            // If rescheduling, check for conflicts
            if (data.dataOra && data.dataOra !== existing.dataOra) {
                const conflicts = await this.checkConflicts(
                    data.medicoId || existing.medicoId,
                    data.ambulatorioId || existing.ambulatorioId,
                    new Date(data.dataOra),
                    data.durataPrevista || existing.durataPrevista,
                    tenantId,
                    id // Exclude self
                );

                if (conflicts.length > 0) {
                    throw new Error(`Rescheduling conflicts with existing appointments`);
                }
            }

            const updated = await prisma.appuntamento.update({
                where: { id },
                data: {
                    ...data,
                    updatedAt: new Date()
                },
                include: {
                    paziente: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    medico: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    ambulatorio: {
                        select: { id: true, nome: true }
                    }
                }
            });

            logger.info('Appuntamento updated', {
                component: 'appuntamento-service',
                action: 'update',
                appuntamentoId: id,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to update appuntamento', {
                component: 'appuntamento-service',
                action: 'update',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete appointment
     */
    static async delete(id, tenantId) {
        try {
            const existing = await prisma.appuntamento.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Appuntamento not found');
            }

            await prisma.appuntamento.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            logger.info('Appuntamento deleted', {
                component: 'appuntamento-service',
                action: 'delete',
                appuntamentoId: id,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('Failed to delete appuntamento', {
                component: 'appuntamento-service',
                action: 'delete',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Check for scheduling conflicts
     */
    static async checkConflicts(medicoId, ambulatorioId, dataOra, durata, tenantId, excludeId = null) {
        try {
            const startTime = new Date(dataOra);
            const endTime = new Date(startTime.getTime() + durata * 60000);

            // Find overlapping appointments for same doctor or same ambulatorio
            const conflicts = await prisma.appuntamento.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    stato: { notIn: ['ANNULLATO', 'COMPLETATO'] },
                    ...(excludeId && { id: { not: excludeId } }),
                    OR: [
                        { medicoId },
                        { ambulatorioId }
                    ],
                    AND: [
                        { dataOra: { lt: endTime } },
                        {
                            // endTime of existing appointment > startTime of new
                            // We need to calculate end time based on dataOra + durataPrevista
                        }
                    ]
                },
                select: {
                    id: true,
                    numero: true,
                    dataOra: true,
                    durataPrevista: true,
                    medicoId: true,
                    ambulatorioId: true
                }
            });

            // Filter actual conflicts (overlapping time ranges)
            return conflicts.filter(app => {
                const appStart = new Date(app.dataOra);
                const appEnd = new Date(appStart.getTime() + app.durataPrevista * 60000);
                return (startTime < appEnd && endTime > appStart);
            });
        } catch (error) {
            logger.error('Failed to check conflicts', {
                component: 'appuntamento-service',
                action: 'checkConflicts',
                error: error.message,
                medicoId,
                ambulatorioId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get waiting queue
     */
    static async getWaitingQueue(tenantId, ambulatorioId = null) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const where = {
                tenantId,
                deletedAt: null,
                dataOra: { gte: today },
                stato: 'IN_ATTESA',
                numeroCoda: { not: null },
                ...(ambulatorioId && { ambulatorioId })
            };

            const queue = await prisma.appuntamento.findMany({
                where,
                include: {
                    paziente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    ambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            stanza: true
                        }
                    }
                },
                orderBy: { numeroCoda: 'asc' }
            });

            return {
                totalInQueue: queue.length,
                queue
            };
        } catch (error) {
            logger.error('Failed to get waiting queue', {
                component: 'appuntamento-service',
                action: 'getWaitingQueue',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Call next patient (update stato to IN_CORSO)
     */
    static async callNextPatient(tenantId, ambulatorioId = null) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const where = {
                tenantId,
                deletedAt: null,
                dataOra: { gte: today },
                stato: 'IN_ATTESA',
                numeroCoda: { not: null },
                ...(ambulatorioId && { ambulatorioId })
            };

            const nextInQueue = await prisma.appuntamento.findFirst({
                where,
                orderBy: { numeroCoda: 'asc' }
            });

            if (!nextInQueue) {
                return { message: 'No patients in queue' };
            }

            return this.updateStato(nextInQueue.id, 'IN_CORSO', tenantId);
        } catch (error) {
            logger.error('Failed to call next patient', {
                component: 'appuntamento-service',
                action: 'callNextPatient',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }
}

export default AppuntamentoService;
