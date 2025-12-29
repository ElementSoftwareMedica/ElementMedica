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

            const numeroPrenotazione = `${startOfDay.toISOString().split('T')[0]}-${String(countToday + 1).padStart(4, '0')}`;

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
                data.durataMinuti || 30,
                tenantId
            );

            if (conflicts.length > 0) {
                throw new Error(`Appointment conflicts with existing appointments: ${conflicts.map(c => c.numeroPrenotazione).join(', ')}`);
            }

            // Prepara i dati per la creazione
            const createData = {
                numeroPrenotazione,
                ambulatorioId: data.ambulatorioId,
                prestazioneId: data.prestazioneId,
                pazienteId: data.pazienteId,
                medicoId: data.medicoId,
                dataOra: data.dataOra,
                durataMinuti: data.durataMinuti || 30,
                stato: data.stato || 'PRENOTATO',
                note: data.note,
                noteInterne: data.noteInterne,
                convenzioneId: data.convenzioneId,
                promemoriaSms: data.promemoriaSms || false,
                promemoriaEmail: data.promemoriaEmail || true,
                tenantId,
                createdBy
            };

            const appuntamento = await prisma.appuntamento.create({
                data: createData,
                include: {
                    ambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true,
                            specializzazione: true
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true,
                            durataPrevista: true
                        }
                    }
                }
            });

            // Aggiungi dati paziente e medico manualmente
            appuntamento.paziente = {
                id: paziente.id,
                firstName: paziente.firstName,
                lastName: paziente.lastName,
                email: paziente.email,
                phone: paziente.phone,
                taxCode: paziente.taxCode
            };
            appuntamento.medico = {
                id: medico.id,
                firstName: medico.firstName,
                lastName: medico.lastName,
                specialties: medico.specialties,
                registerCode: medico.registerCode
            };

            logger.info('Appuntamento created', {
                component: 'appuntamento-service',
                action: 'create',
                appuntamentoId: appuntamento.id,
                numeroPrenotazione: appuntamento.numeroPrenotazione,
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
                    ambulatorio: {
                        include: {
                            poliambulatorio: {
                                select: { id: true, nome: true }
                            }
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true,
                            tipo: true,
                            durataPrevista: true
                        }
                    },
                    visita: {
                        where: { deletedAt: null }
                    }
                }
            });

            if (!appuntamento) return null;

            // Carica paziente e medico manualmente
            const [paziente, medico] = await Promise.all([
                prisma.person.findFirst({
                    where: { id: appuntamento.pazienteId, tenantId, deletedAt: null },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        taxCode: true,
                        birthDate: true
                    }
                }),
                prisma.person.findFirst({
                    where: { id: appuntamento.medicoId, tenantId, deletedAt: null },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        specialties: true,
                        registerCode: true
                    }
                })
            ]);

            appuntamento.paziente = paziente;
            appuntamento.medico = medico;

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

            // Costruisci where senza relazioni inesistenti
            const where = {
                tenantId,
                deletedAt: null
            };

            if (dateFrom) {
                where.dataOra = { gte: new Date(dateFrom) };
            }
            if (dateTo) {
                where.dataOra = { ...where.dataOra, lte: new Date(dateTo) };
            }
            if (medicoId) where.medicoId = medicoId;
            if (pazienteId) where.pazienteId = pazienteId;
            if (ambulatorioId) where.ambulatorioId = ambulatorioId;
            if (stato) where.stato = stato;
            if (search) {
                where.OR = [
                    { numeroPrenotazione: { contains: search, mode: 'insensitive' } }
                ];
            }

            const [appuntamenti, total] = await Promise.all([
                prisma.appuntamento.findMany({
                    where,
                    include: {
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
                    },
                    orderBy: { [orderBy]: orderDir },
                    skip,
                    take: limit
                }),
                prisma.appuntamento.count({ where })
            ]);

            // Carica paziente e medico per ogni appuntamento
            const pazienteIds = [...new Set(appuntamenti.map(a => a.pazienteId).filter(Boolean))];
            const medicoIds = [...new Set(appuntamenti.map(a => a.medicoId).filter(Boolean))];

            const [pazienti, medici] = await Promise.all([
                pazienteIds.length > 0 ? prisma.person.findMany({
                    where: { id: { in: pazienteIds }, tenantId },
                    select: { id: true, firstName: true, lastName: true, phone: true }
                }) : [],
                medicoIds.length > 0 ? prisma.person.findMany({
                    where: { id: { in: medicoIds }, tenantId },
                    select: { id: true, firstName: true, lastName: true }
                }) : []
            ]);

            const pazientiMap = new Map((pazienti || []).map(p => [p.id, p]));
            const mediciMap = new Map((medici || []).map(m => [m.id, m]));

            // Aggiungi dati a ciascun appuntamento
            for (const app of appuntamenti) {
                app.paziente = pazientiMap.get(app.pazienteId) || null;
                app.medico = mediciMap.get(app.medicoId) || null;
            }

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
                    ambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            piano: true
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            nome: true,
                            durataPrevista: true
                        }
                    }
                },
                orderBy: { dataOra: 'asc' }
            });

            // Carica paziente e medico
            const pazienteIds = [...new Set(appuntamenti.map(a => a.pazienteId))];
            const medicoIds = [...new Set(appuntamenti.map(a => a.medicoId))];

            const [pazienti, medici] = await Promise.all([
                prisma.person.findMany({
                    where: { id: { in: pazienteIds }, tenantId },
                    select: { id: true, firstName: true, lastName: true, phone: true, email: true }
                }),
                prisma.person.findMany({
                    where: { id: { in: medicoIds }, tenantId },
                    select: { id: true, firstName: true, lastName: true }
                })
            ]);

            const pazientiMap = new Map(pazienti.map(p => [p.id, p]));
            const mediciMap = new Map(medici.map(m => [m.id, m]));

            for (const app of appuntamenti) {
                app.paziente = pazientiMap.get(app.pazienteId) || null;
                app.medico = mediciMap.get(app.medicoId) || null;
            }

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

            // Handle specific state transitions (solo campi esistenti nello schema)
            switch (stato) {
                case 'ARRIVATO':
                case 'IN_ATTESA':
                    updateData.oraArrivo = new Date();
                    break;
                case 'CHIAMATO':
                    updateData.oraChiamata = new Date();
                    break;
                case 'IN_CORSO':
                    updateData.oraInizio = new Date();
                    break;
                case 'COMPLETATO':
                    updateData.oraFine = new Date();
                    break;
                case 'ANNULLATO':
                    // Note interne per il motivo annullamento
                    if (additionalData.motivoAnnullamento) {
                        updateData.noteInterne = additionalData.motivoAnnullamento;
                    }
                    break;
            }

            const updated = await prisma.appuntamento.update({
                where: { id },
                data: updateData,
                include: {
                    ambulatorio: {
                        select: { id: true, nome: true }
                    },
                    prestazione: {
                        select: { id: true, nome: true }
                    }
                }
            });

            // Carica paziente e medico
            const [paziente, medico] = await Promise.all([
                prisma.person.findFirst({
                    where: { id: updated.pazienteId, tenantId },
                    select: { id: true, firstName: true, lastName: true }
                }),
                prisma.person.findFirst({
                    where: { id: updated.medicoId, tenantId },
                    select: { id: true, firstName: true, lastName: true }
                })
            ]);

            updated.paziente = paziente;
            updated.medico = medico;

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
                    data.durataMinuti || existing.durataMinuti,
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
                    ambulatorio: {
                        select: { id: true, nome: true }
                    },
                    prestazione: {
                        select: { id: true, nome: true }
                    }
                }
            });

            // Carica paziente e medico
            const [paziente, medico] = await Promise.all([
                prisma.person.findFirst({
                    where: { id: updated.pazienteId, tenantId },
                    select: { id: true, firstName: true, lastName: true }
                }),
                prisma.person.findFirst({
                    where: { id: updated.medicoId, tenantId },
                    select: { id: true, firstName: true, lastName: true }
                })
            ]);

            updated.paziente = paziente;
            updated.medico = medico;

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
            const whereClause = {
                tenantId,
                deletedAt: null,
                stato: { notIn: ['ANNULLATO', 'COMPLETATO'] },
                OR: [
                    { medicoId },
                    { ambulatorioId }
                ],
                dataOra: { lt: endTime }
            };

            if (excludeId) {
                whereClause.id = { not: excludeId };
            }

            const conflicts = await prisma.appuntamento.findMany({
                where: whereClause,
                select: {
                    id: true,
                    numeroPrenotazione: true,
                    dataOra: true,
                    durataMinuti: true,
                    medicoId: true,
                    ambulatorioId: true
                }
            });

            // Filter actual conflicts (overlapping time ranges)
            return conflicts.filter(app => {
                const appStart = new Date(app.dataOra);
                const appEnd = new Date(appStart.getTime() + app.durataMinuti * 60000);
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

            // Lo schema non ha numeroCoda, usiamo stato e oraArrivo per ordinare
            const where = {
                tenantId,
                deletedAt: null,
                dataOra: { gte: today },
                stato: { in: ['ARRIVATO', 'IN_ATTESA'] },
                oraArrivo: { not: null }
            };

            if (ambulatorioId) {
                where.ambulatorioId = ambulatorioId;
            }

            const queue = await prisma.appuntamento.findMany({
                where,
                include: {
                    ambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            piano: true
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            nome: true
                        }
                    }
                },
                orderBy: { oraArrivo: 'asc' }
            });

            // Carica paziente e medico
            const pazienteIds = [...new Set(queue.map(a => a.pazienteId))];
            const medicoIds = [...new Set(queue.map(a => a.medicoId))];

            const [pazienti, medici] = await Promise.all([
                prisma.person.findMany({
                    where: { id: { in: pazienteIds }, tenantId },
                    select: { id: true, firstName: true, lastName: true }
                }),
                prisma.person.findMany({
                    where: { id: { in: medicoIds }, tenantId },
                    select: { id: true, firstName: true, lastName: true }
                })
            ]);

            const pazientiMap = new Map(pazienti.map(p => [p.id, p]));
            const mediciMap = new Map(medici.map(m => [m.id, m]));

            for (const app of queue) {
                app.paziente = pazientiMap.get(app.pazienteId) || null;
                app.medico = mediciMap.get(app.medicoId) || null;
            }

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
                stato: { in: ['ARRIVATO', 'IN_ATTESA'] },
                oraArrivo: { not: null }
            };

            if (ambulatorioId) {
                where.ambulatorioId = ambulatorioId;
            }

            const nextInQueue = await prisma.appuntamento.findFirst({
                where,
                orderBy: { oraArrivo: 'asc' }
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
