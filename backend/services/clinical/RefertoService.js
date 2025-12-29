/**
 * Referto Service
 * Business logic for medical report management
 * 
 * @module services/clinical/RefertoService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

// Stati referto validi
const STATI_REFERTO = ['BOZZA', 'IN_REVISIONE', 'FIRMATO', 'CONSEGNATO', 'ARCHIVIATO'];

// Transizioni stato consentite
const TRANSIZIONI_STATO = {
    'BOZZA': ['IN_REVISIONE', 'FIRMATO'],
    'IN_REVISIONE': ['BOZZA', 'FIRMATO'],
    'FIRMATO': ['CONSEGNATO', 'ARCHIVIATO'],
    'CONSEGNATO': ['ARCHIVIATO'],
    'ARCHIVIATO': [] // Stato finale
};

export class RefertoService {
    /**
     * Create a new medical report
     * @param {Object} data - Report data
     * @returns {Promise<Object>} Created report
     */
    static async create(data) {
        try {
            const { tenantId, createdBy, visitaId, tipo, titolo, contenuto } = data;

            // Verify visita exists
            const visita = await prisma.visita.findFirst({
                where: { id: visitaId, tenantId, deletedAt: null },
                include: {
                    paziente: { select: { id: true, firstName: true, lastName: true } },
                    medico: { select: { id: true, firstName: true, lastName: true } }
                }
            });

            if (!visita) {
                throw new Error('Visita not found');
            }

            // Generate numero referto (progressivo)
            const today = new Date();
            const year = today.getFullYear();

            const countYear = await prisma.referto.count({
                where: {
                    tenantId,
                    createdAt: {
                        gte: new Date(year, 0, 1),
                        lt: new Date(year + 1, 0, 1)
                    }
                }
            });

            const numero = `REF${year}-${String(countYear + 1).padStart(6, '0')}`;

            const referto = await prisma.referto.create({
                data: {
                    numero,
                    tenantId,
                    visitaId,
                    tipo,
                    titolo,
                    contenuto: contenuto || null,
                    conclusioni: data.conclusioni || null,
                    valoriRiferimento: data.valoriRiferimento || null,
                    stato: 'BOZZA',
                    createdBy
                },
                include: {
                    visita: {
                        select: {
                            id: true,
                            dataOra: true,
                            pazienteId: true,
                            medicoId: true,
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
                                    registerCode: true
                                }
                            }
                        }
                    }
                }
            });

            logger.info('Referto created', {
                component: 'RefertoService',
                refertoId: referto.id,
                numero: referto.numero,
                visitaId,
                tipo,
                tenantId
            });

            return referto;
        } catch (error) {
            logger.error('Failed to create referto', {
                component: 'RefertoService',
                error: error.message,
                tenantId: data.tenantId
            });
            throw error;
        }
    }

    /**
     * Get report by ID
     * @param {string} id - Report ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Report details
     */
    static async getById(id, tenantId) {
        try {
            const referto = await prisma.referto.findFirst({
                where: { id, tenantId, deletedAt: null },
                include: {
                    visita: {
                        include: {
                            paziente: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    birthDate: true,
                                    taxCode: true,
                                    email: true
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
                                    nome: true,
                                    tipo: true
                                }
                            }
                        }
                    }
                }
            });

            if (!referto) {
                throw new Error('Referto not found');
            }

            return referto;
        } catch (error) {
            logger.error('Failed to get referto', {
                component: 'RefertoService',
                error: error.message,
                refertoId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all reports with filters and pagination
     * @param {string} tenantId - Tenant ID
     * @param {Object} filters - Filter options
     * @param {Object} options - Pagination options
     * @returns {Promise<Object>} Paginated reports
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
            if (filters.visitaId) where.visitaId = filters.visitaId;
            if (filters.tipo) where.tipo = filters.tipo;
            if (filters.stato) where.stato = filters.stato;

            // Date range filter
            if (filters.dataInizio || filters.dataFine) {
                where.dataEmissione = {};
                if (filters.dataInizio) where.dataEmissione.gte = new Date(filters.dataInizio);
                if (filters.dataFine) where.dataEmissione.lte = new Date(filters.dataFine);
            }

            // Search in numero or titolo
            if (filters.search) {
                where.OR = [
                    { numero: { contains: filters.search, mode: 'insensitive' } },
                    { titolo: { contains: filters.search, mode: 'insensitive' } }
                ];
            }

            const [referti, total] = await Promise.all([
                prisma.referto.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        visita: {
                            select: {
                                id: true,
                                dataOra: true,
                                pazienteId: true,
                                medicoId: true,
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
                        }
                    }
                }),
                prisma.referto.count({ where })
            ]);

            return {
                data: referti,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Failed to get referti', {
                component: 'RefertoService',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update report
     * @param {string} id - Report ID
     * @param {string} tenantId - Tenant ID
     * @param {Object} data - Update data
     * @returns {Promise<Object>} Updated report
     */
    static async update(id, tenantId, data) {
        try {
            const existing = await prisma.referto.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Referto not found');
            }

            // Cannot update signed/delivered/archived reports
            if (['FIRMATO', 'CONSEGNATO', 'ARCHIVIATO'].includes(existing.stato)) {
                throw new Error(`Cannot update report in status ${existing.stato}`);
            }

            const { tenantId: _, createdBy: __, ...updateData } = data;

            const referto = await prisma.referto.update({
                where: { id },
                data: {
                    ...updateData,
                    updatedAt: new Date()
                },
                include: {
                    visita: {
                        select: {
                            id: true,
                            dataOra: true,
                            paziente: {
                                select: { id: true, firstName: true, lastName: true }
                            },
                            medico: {
                                select: { id: true, firstName: true, lastName: true }
                            }
                        }
                    }
                }
            });

            logger.info('Referto updated', {
                component: 'RefertoService',
                refertoId: id,
                tenantId
            });

            return referto;
        } catch (error) {
            logger.error('Failed to update referto', {
                component: 'RefertoService',
                error: error.message,
                refertoId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Change report status
     * @param {string} id - Report ID
     * @param {string} tenantId - Tenant ID
     * @param {string} nuovoStato - New status
     * @param {string} updatedBy - User performing the change
     * @returns {Promise<Object>} Updated report
     */
    static async changeStatus(id, tenantId, nuovoStato, updatedBy) {
        try {
            const existing = await prisma.referto.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Referto not found');
            }

            // Validate state transition
            if (!STATI_REFERTO.includes(nuovoStato)) {
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

            const referto = await prisma.referto.update({
                where: { id },
                data: updateData,
                include: {
                    visita: {
                        select: {
                            id: true,
                            dataOra: true,
                            paziente: {
                                select: { id: true, firstName: true, lastName: true }
                            }
                        }
                    }
                }
            });

            logger.info('Referto status changed', {
                component: 'RefertoService',
                refertoId: id,
                oldStatus: existing.stato,
                newStatus: nuovoStato,
                updatedBy,
                tenantId
            });

            return referto;
        } catch (error) {
            logger.error('Failed to change referto status', {
                component: 'RefertoService',
                error: error.message,
                refertoId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Sign report (medico signature)
     * @param {string} id - Report ID
     * @param {string} tenantId - Tenant ID
     * @param {string} firmaMedico - Doctor signature
     * @param {string} medicoId - Doctor ID
     * @returns {Promise<Object>} Signed report
     */
    static async sign(id, tenantId, firmaMedico, medicoId) {
        try {
            const existing = await prisma.referto.findFirst({
                where: { id, tenantId, deletedAt: null },
                include: {
                    visita: {
                        select: { medicoId: true }
                    }
                }
            });

            if (!existing) {
                throw new Error('Referto not found');
            }

            // Verify the medico is the one from the visit
            if (existing.visita.medicoId !== medicoId) {
                throw new Error('Only the visit doctor can sign the report');
            }

            // Can only sign BOZZA or IN_REVISIONE reports
            if (!['BOZZA', 'IN_REVISIONE'].includes(existing.stato)) {
                throw new Error(`Cannot sign report in status ${existing.stato}. Must be BOZZA or IN_REVISIONE`);
            }

            const referto = await prisma.referto.update({
                where: { id },
                data: {
                    firmaMedico,
                    dataFirma: new Date(),
                    dataEmissione: new Date(),
                    stato: 'FIRMATO',
                    updatedAt: new Date()
                },
                include: {
                    visita: {
                        select: {
                            id: true,
                            dataOra: true,
                            paziente: {
                                select: { id: true, firstName: true, lastName: true }
                            },
                            medico: {
                                select: { id: true, firstName: true, lastName: true, registerCode: true }
                            }
                        }
                    }
                }
            });

            logger.info('Referto signed', {
                component: 'RefertoService',
                refertoId: id,
                medicoId,
                tenantId
            });

            return referto;
        } catch (error) {
            logger.error('Failed to sign referto', {
                component: 'RefertoService',
                error: error.message,
                refertoId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Mark report as delivered
     * @param {string} id - Report ID
     * @param {string} tenantId - Tenant ID
     * @param {Object} deliveryData - Delivery information
     * @returns {Promise<Object>} Updated report
     */
    static async deliver(id, tenantId, deliveryData) {
        try {
            const existing = await prisma.referto.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Referto not found');
            }

            // Can only deliver signed reports
            if (existing.stato !== 'FIRMATO') {
                throw new Error(`Cannot deliver report in status ${existing.stato}. Must be FIRMATO`);
            }

            const referto = await prisma.referto.update({
                where: { id },
                data: {
                    stato: 'CONSEGNATO',
                    dataConsegna: new Date(),
                    consegnatoA: deliveryData.consegnatoA,
                    metodiConsegna: deliveryData.metodiConsegna,
                    updatedAt: new Date()
                },
                include: {
                    visita: {
                        select: {
                            id: true,
                            paziente: {
                                select: { id: true, firstName: true, lastName: true }
                            }
                        }
                    }
                }
            });

            logger.info('Referto delivered', {
                component: 'RefertoService',
                refertoId: id,
                consegnatoA: deliveryData.consegnatoA,
                metodiConsegna: deliveryData.metodiConsegna,
                tenantId
            });

            return referto;
        } catch (error) {
            logger.error('Failed to deliver referto', {
                component: 'RefertoService',
                error: error.message,
                refertoId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get reports by visit
     * @param {string} visitaId - Visit ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Visit reports
     */
    static async getByVisita(visitaId, tenantId) {
        try {
            const referti = await prisma.referto.findMany({
                where: {
                    visitaId,
                    tenantId,
                    deletedAt: null
                },
                orderBy: { createdAt: 'desc' }
            });

            return referti;
        } catch (error) {
            logger.error('Failed to get referti by visita', {
                component: 'RefertoService',
                error: error.message,
                visitaId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get reports by patient
     * @param {string} pazienteId - Patient ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Patient reports
     */
    static async getByPaziente(pazienteId, tenantId) {
        try {
            const referti = await prisma.referto.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    visita: {
                        pazienteId,
                        deletedAt: null
                    }
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    visita: {
                        select: {
                            id: true,
                            dataOra: true,
                            medico: {
                                select: { id: true, firstName: true, lastName: true }
                            },
                            prestazione: {
                                select: { id: true, nome: true }
                            }
                        }
                    }
                }
            });

            return referti;
        } catch (error) {
            logger.error('Failed to get referti by paziente', {
                component: 'RefertoService',
                error: error.message,
                pazienteId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete report
     * @param {string} id - Report ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<void>}
     */
    static async delete(id, tenantId) {
        try {
            const existing = await prisma.referto.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Referto not found');
            }

            // Cannot delete signed/delivered/archived reports
            if (['FIRMATO', 'CONSEGNATO', 'ARCHIVIATO'].includes(existing.stato)) {
                throw new Error(`Cannot delete report in status ${existing.stato}. Clinical data must be preserved.`);
            }

            await prisma.referto.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            logger.info('Referto deleted', {
                component: 'RefertoService',
                refertoId: id,
                tenantId
            });
        } catch (error) {
            logger.error('Failed to delete referto', {
                component: 'RefertoService',
                error: error.message,
                refertoId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get pending reports (not yet signed)
     * @param {string} tenantId - Tenant ID
     * @param {string} medicoId - Optional doctor filter
     * @returns {Promise<Array>} Pending reports
     */
    static async getPending(tenantId, medicoId = null) {
        try {
            const where = {
                tenantId,
                deletedAt: null,
                stato: { in: ['BOZZA', 'IN_REVISIONE'] }
            };

            if (medicoId) {
                where.visita = {
                    medicoId,
                    deletedAt: null
                };
            }

            const referti = await prisma.referto.findMany({
                where,
                orderBy: { createdAt: 'asc' },
                include: {
                    visita: {
                        select: {
                            id: true,
                            dataOra: true,
                            paziente: {
                                select: { id: true, firstName: true, lastName: true }
                            },
                            medico: {
                                select: { id: true, firstName: true, lastName: true }
                            }
                        }
                    }
                }
            });

            return referti;
        } catch (error) {
            logger.error('Failed to get pending referti', {
                component: 'RefertoService',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get available report states
     * @returns {Array} Valid states
     */
    static getStati() {
        return STATI_REFERTO;
    }

    /**
     * Get allowed state transitions
     * @returns {Object} State transition map
     */
    static getTransizioni() {
        return TRANSIZIONI_STATO;
    }
}

export default RefertoService;
