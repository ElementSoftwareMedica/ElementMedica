/**
 * Visita Service
 * Business logic for clinical visit management
 * 
 * @module services/clinical/VisitaService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

// Stati visita validi
const STATI_VISITA = ['INIZIATA', 'IN_CORSO', 'SOSPESA', 'COMPLETATA', 'ANNULLATA'];

// Transizioni stato consentite
const TRANSIZIONI_STATO = {
    'INIZIATA': ['IN_CORSO', 'SOSPESA', 'ANNULLATA'],
    'IN_CORSO': ['SOSPESA', 'COMPLETATA', 'ANNULLATA'],
    'SOSPESA': ['IN_CORSO', 'COMPLETATA', 'ANNULLATA'],
    'COMPLETATA': [], // Stato finale
    'ANNULLATA': [] // Stato finale
};

export class VisitaService {
    /**
     * Create a new clinical visit
     * @param {Object} data - Visit data
     * @returns {Promise<Object>} Created visit
     */
    static async create(data) {
        try {
            const { tenantId, createdBy, appuntamentoId, pazienteId, medicoId, prestazioneId } = data;

            // Verify paziente exists
            const paziente = await prisma.person.findFirst({
                where: { id: pazienteId, tenantId, deletedAt: null }
            });
            if (!paziente) throw new Error('Paziente not found');

            // Verify medico exists
            const medico = await prisma.person.findFirst({
                where: { id: medicoId, tenantId, deletedAt: null }
            });
            if (!medico) throw new Error('Medico not found');

            // Verify prestazione if provided
            if (prestazioneId) {
                const prestazione = await prisma.prestazione.findFirst({
                    where: { id: prestazioneId, tenantId, deletedAt: null }
                });
                if (!prestazione) throw new Error('Prestazione not found');
            }

            // If from appointment, verify and update appointment status
            if (appuntamentoId) {
                const appuntamento = await prisma.appuntamento.findFirst({
                    where: { id: appuntamentoId, tenantId, deletedAt: null }
                });
                if (!appuntamento) throw new Error('Appuntamento not found');

                // Update appuntamento status to IN_CORSO
                await prisma.appuntamento.update({
                    where: { id: appuntamentoId },
                    data: { stato: 'IN_CORSO' }
                });
            }

            // Generate numero visita (progressivo giornaliero)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const countToday = await prisma.visita.count({
                where: {
                    tenantId,
                    dataOra: { gte: today, lt: tomorrow }
                }
            });

            const numero = `V${today.toISOString().split('T')[0].replace(/-/g, '')}-${String(countToday + 1).padStart(4, '0')}`;

            const visita = await prisma.visita.create({
                data: {
                    numero,
                    tenantId,
                    appuntamentoId: appuntamentoId || null,
                    pazienteId,
                    medicoId,
                    prestazioneId: prestazioneId || null,
                    dataOra: data.dataOra || new Date(),
                    stato: 'INIZIATA',
                    anamnesi: data.anamnesi || null,
                    esamObiettivo: data.esamObiettivo || null,
                    diagnosi: data.diagnosi || null,
                    diagnosiIcd10: data.diagnosiIcd10 || null,
                    terapia: data.terapia || null,
                    prescrizioni: data.prescrizioni || null,
                    noteClinic: data.noteClinic || null,
                    consensoInformato: data.consensoInformato || false,
                    consensoTrattamento: data.consensoTrattamento || false,
                    followUpRichiesto: data.followUpRichiesto || false,
                    followUpData: data.followUpData || null,
                    followUpNote: data.followUpNote || null,
                    createdBy
                },
                include: {
                    paziente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            birthDate: true,
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
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true
                        }
                    },
                    appuntamento: {
                        select: {
                            id: true,
                            numero: true,
                            dataOra: true
                        }
                    }
                }
            });

            logger.info('Visita created', {
                component: 'VisitaService',
                visitaId: visita.id,
                numero: visita.numero,
                pazienteId,
                medicoId,
                tenantId
            });

            return visita;
        } catch (error) {
            logger.error('Failed to create visita', {
                component: 'VisitaService',
                error: error.message,
                tenantId: data.tenantId
            });
            throw error;
        }
    }

    /**
     * Get visit by ID
     * @param {string} id - Visit ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Visit details
     */
    static async getById(id, tenantId) {
        try {
            const visita = await prisma.visita.findFirst({
                where: { id, tenantId, deletedAt: null },
                include: {
                    paziente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            birthDate: true,
                            taxCode: true,
                            email: true,
                            phone: true
                        }
                    },
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            specialties: true,
                            registerCode: true,
                            email: true
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            codiceNazionale: true,
                            nome: true,
                            tipo: true,
                            durataPrevista: true
                        }
                    },
                    appuntamento: {
                        select: {
                            id: true,
                            numero: true,
                            dataOra: true,
                            stato: true
                        }
                    },
                    referti: {
                        where: { deletedAt: null },
                        select: {
                            id: true,
                            tipo: true,
                            titolo: true,
                            stato: true,
                            dataEmissione: true
                        }
                    }
                }
            });

            if (!visita) {
                throw new Error('Visita not found');
            }

            return visita;
        } catch (error) {
            logger.error('Failed to get visita', {
                component: 'VisitaService',
                error: error.message,
                visitaId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all visits with filters and pagination
     * @param {string} tenantId - Tenant ID
     * @param {Object} filters - Filter options
     * @param {Object} options - Pagination options
     * @returns {Promise<Object>} Paginated visits
     */
    static async getAll(tenantId, filters = {}, options = {}) {
        try {
            const { page = 1, limit = 20 } = options;
            const skip = (page - 1) * limit;

            const where = {
                tenantId,
                deletedAt: null
            };

            // Apply filters
            if (filters.pazienteId) where.pazienteId = filters.pazienteId;
            if (filters.medicoId) where.medicoId = filters.medicoId;
            if (filters.prestazioneId) where.prestazioneId = filters.prestazioneId;
            if (filters.stato) where.stato = filters.stato;

            // Date range filter
            if (filters.dataInizio || filters.dataFine) {
                where.dataOra = {};
                if (filters.dataInizio) where.dataOra.gte = new Date(filters.dataInizio);
                if (filters.dataFine) where.dataOra.lte = new Date(filters.dataFine);
            }

            // Search in diagnosi principale
            if (filters.search) {
                where.OR = [
                    { diagnosiPrincipale: { contains: filters.search, mode: 'insensitive' } },
                    { anamnesi: { contains: filters.search, mode: 'insensitive' } }
                ];
            }

            const [visite, total] = await Promise.all([
                prisma.visita.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { dataOra: 'desc' },
                    include: {
                        paziente: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                taxCode: true
                            }
                        },
                        medico: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                specialties: true
                            }
                        },
                        prestazione: {
                            select: {
                                id: true,
                                codice: true,
                                nome: true,
                                tipo: true
                            }
                        }
                    }
                }),
                prisma.visita.count({ where })
            ]);

            return {
                data: visite,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Failed to get visite', {
                component: 'VisitaService',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update visit
     * @param {string} id - Visit ID
     * @param {string} tenantId - Tenant ID
     * @param {Object} data - Update data
     * @returns {Promise<Object>} Updated visit
     */
    static async update(id, tenantId, data) {
        try {
            const existing = await prisma.visita.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Visita not found');
            }

            // Cannot update completed or cancelled visits (clinical data)
            if (['COMPLETATA', 'ANNULLATA'].includes(existing.stato)) {
                throw new Error(`Cannot update visit in status ${existing.stato}`);
            }

            const { tenantId: _, createdBy: __, ...updateData } = data;

            const visita = await prisma.visita.update({
                where: { id },
                data: {
                    ...updateData,
                    updatedAt: new Date()
                },
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
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true
                        }
                    }
                }
            });

            logger.info('Visita updated', {
                component: 'VisitaService',
                visitaId: id,
                tenantId
            });

            return visita;
        } catch (error) {
            logger.error('Failed to update visita', {
                component: 'VisitaService',
                error: error.message,
                visitaId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Change visit status
     * @param {string} id - Visit ID
     * @param {string} tenantId - Tenant ID
     * @param {string} nuovoStato - New status
     * @param {string} updatedBy - User performing the change
     * @returns {Promise<Object>} Updated visit
     */
    static async changeStatus(id, tenantId, nuovoStato, updatedBy) {
        try {
            const existing = await prisma.visita.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Visita not found');
            }

            // Validate state transition
            if (!STATI_VISITA.includes(nuovoStato)) {
                throw new Error(`Invalid status: ${nuovoStato}`);
            }

            const transizioniConsentite = TRANSIZIONI_STATO[existing.stato];
            if (!transizioniConsentite.includes(nuovoStato)) {
                throw new Error(`Cannot transition from ${existing.stato} to ${nuovoStato}`);
            }

            const updateData = {
                stato: nuovoStato,
                updatedAt: new Date()
            };

            // Set completion timestamp
            if (nuovoStato === 'COMPLETATA') {
                updateData.dataChiusura = new Date();
            }

            const visita = await prisma.visita.update({
                where: { id },
                data: updateData,
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
                    }
                }
            });

            // Update related appuntamento if exists
            if (existing.appuntamentoId) {
                let appuntamentoStato = null;
                if (nuovoStato === 'COMPLETATA') appuntamentoStato = 'COMPLETATO';
                else if (nuovoStato === 'ANNULLATA') appuntamentoStato = 'ANNULLATO';

                if (appuntamentoStato) {
                    await prisma.appuntamento.update({
                        where: { id: existing.appuntamentoId },
                        data: { stato: appuntamentoStato }
                    });
                }
            }

            logger.info('Visita status changed', {
                component: 'VisitaService',
                visitaId: id,
                oldStatus: existing.stato,
                newStatus: nuovoStato,
                updatedBy,
                tenantId
            });

            return visita;
        } catch (error) {
            logger.error('Failed to change visita status', {
                component: 'VisitaService',
                error: error.message,
                visitaId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Sign/close visit (medico signature)
     * @param {string} id - Visit ID
     * @param {string} tenantId - Tenant ID
     * @param {string} firmaMedico - Doctor signature
     * @param {string} medicoId - Doctor ID
     * @returns {Promise<Object>} Signed visit
     */
    static async sign(id, tenantId, firmaMedico, medicoId) {
        try {
            const existing = await prisma.visita.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Visita not found');
            }

            // Verify the medico is the one assigned
            if (existing.medicoId !== medicoId) {
                throw new Error('Only the assigned doctor can sign the visit');
            }

            // Can only sign IN_CORSO visits
            if (existing.stato !== 'IN_CORSO') {
                throw new Error(`Cannot sign visit in status ${existing.stato}. Must be IN_CORSO`);
            }

            const visita = await prisma.visita.update({
                where: { id },
                data: {
                    firmaMedico,
                    dataFirma: new Date(),
                    stato: 'COMPLETATA',
                    dataChiusura: new Date(),
                    updatedAt: new Date()
                },
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
                            lastName: true,
                            registerCode: true
                        }
                    }
                }
            });

            // Update appuntamento if exists
            if (existing.appuntamentoId) {
                await prisma.appuntamento.update({
                    where: { id: existing.appuntamentoId },
                    data: { stato: 'COMPLETATO' }
                });
            }

            logger.info('Visita signed', {
                component: 'VisitaService',
                visitaId: id,
                medicoId,
                tenantId
            });

            return visita;
        } catch (error) {
            logger.error('Failed to sign visita', {
                component: 'VisitaService',
                error: error.message,
                visitaId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get visits by patient
     * @param {string} pazienteId - Patient ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Patient visits
     */
    static async getByPaziente(pazienteId, tenantId) {
        try {
            const visite = await prisma.visita.findMany({
                where: {
                    pazienteId,
                    tenantId,
                    deletedAt: null
                },
                orderBy: { dataOra: 'desc' },
                include: {
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            specialties: true
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true
                        }
                    },
                    referti: {
                        where: { deletedAt: null },
                        select: {
                            id: true,
                            tipo: true,
                            titolo: true,
                            stato: true
                        }
                    }
                }
            });

            return visite;
        } catch (error) {
            logger.error('Failed to get visite by paziente', {
                component: 'VisitaService',
                error: error.message,
                pazienteId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get visits by doctor
     * @param {string} medicoId - Doctor ID
     * @param {string} tenantId - Tenant ID
     * @param {Object} filters - Additional filters
     * @returns {Promise<Array>} Doctor visits
     */
    static async getByMedico(medicoId, tenantId, filters = {}) {
        try {
            const where = {
                medicoId,
                tenantId,
                deletedAt: null
            };

            if (filters.stato) where.stato = filters.stato;
            if (filters.dataInizio || filters.dataFine) {
                where.dataOra = {};
                if (filters.dataInizio) where.dataOra.gte = new Date(filters.dataInizio);
                if (filters.dataFine) where.dataOra.lte = new Date(filters.dataFine);
            }

            const visite = await prisma.visita.findMany({
                where,
                orderBy: { dataOra: 'desc' },
                include: {
                    paziente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true
                        }
                    }
                }
            });

            return visite;
        } catch (error) {
            logger.error('Failed to get visite by medico', {
                component: 'VisitaService',
                error: error.message,
                medicoId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete visit
     * @param {string} id - Visit ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<void>}
     */
    static async delete(id, tenantId) {
        try {
            const existing = await prisma.visita.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Visita not found');
            }

            // Cannot delete completed visits (clinical data preservation)
            if (existing.stato === 'COMPLETATA') {
                throw new Error('Cannot delete completed visits. Clinical data must be preserved.');
            }

            // Check for referti
            const refertiCount = await prisma.referto.count({
                where: { visitaId: id, deletedAt: null }
            });

            if (refertiCount > 0) {
                throw new Error(`Cannot delete visit with ${refertiCount} associated referti`);
            }

            await prisma.visita.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            logger.info('Visita deleted', {
                component: 'VisitaService',
                visitaId: id,
                tenantId
            });
        } catch (error) {
            logger.error('Failed to delete visita', {
                component: 'VisitaService',
                error: error.message,
                visitaId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get today's visits for dashboard
     * @param {string} tenantId - Tenant ID
     * @param {string} medicoId - Optional doctor filter
     * @returns {Promise<Object>} Today's visits summary
     */
    static async getTodaySummary(tenantId, medicoId = null) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const where = {
                tenantId,
                deletedAt: null,
                dataOra: { gte: today, lt: tomorrow }
            };

            if (medicoId) where.medicoId = medicoId;

            const [visite, counts] = await Promise.all([
                prisma.visita.findMany({
                    where,
                    orderBy: { dataOra: 'asc' },
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
                        prestazione: {
                            select: {
                                id: true,
                                nome: true,
                                tipo: true
                            }
                        }
                    }
                }),
                prisma.visita.groupBy({
                    by: ['stato'],
                    where,
                    _count: { id: true }
                })
            ]);

            const summary = {
                total: visite.length,
                byStatus: {},
                visite
            };

            counts.forEach(c => {
                summary.byStatus[c.stato] = c._count.id;
            });

            return summary;
        } catch (error) {
            logger.error('Failed to get today summary', {
                component: 'VisitaService',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get available visit states
     * @returns {Array} Valid states
     */
    static getStati() {
        return STATI_VISITA;
    }

    /**
     * Get allowed state transitions
     * @returns {Object} State transition map
     */
    static getTransizioni() {
        return TRANSIZIONI_STATO;
    }
}

export default VisitaService;
