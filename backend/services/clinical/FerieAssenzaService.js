/**
 * FerieAssenza Service
 * Business logic for managing doctor holidays and absences
 * 
 * Supports:
 * - FERIE (holidays)
 * - MALATTIA (sick leave)
 * - PERMESSO (partial day leave)
 * - CONGEDO (parental/other leave)
 * - ALTRA_ASSENZA (other absences)
 * 
 * @module services/clinical/FerieAssenzaService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

export class FerieAssenzaService {
    /**
     * Get all ferie/assenze with pagination and filters
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
                tipo,
                stato,
                dataInizio,
                dataFine
            } = options;

            const skip = (page - 1) * limit;

            const where = {
                tenantId,
                deletedAt: null,
                ...(medicoId && { medicoId }),
                ...(tipo && { tipo }),
                ...(stato && { stato })
            };

            // Filter by date range if provided
            if (dataInizio || dataFine) {
                where.AND = [];
                if (dataInizio) {
                    where.AND.push({
                        dataFine: { gte: new Date(dataInizio) }
                    });
                }
                if (dataFine) {
                    where.AND.push({
                        dataInizio: { lte: new Date(dataFine) }
                    });
                }
            }

            const [data, total] = await Promise.all([
                prisma.ferieAssenza.findMany({
                    where,
                    skip,
                    take: parseInt(limit),
                    orderBy: [
                        { dataInizio: 'desc' }
                    ]
                }),
                prisma.ferieAssenza.count({ where })
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
            logger.error('Failed to get ferie/assenze', {
                component: 'ferie-assenza-service',
                action: 'getAll',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get ferie/assenze by medico
     * @param {string} medicoId - Medico ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} FerieAssenza list
     */
    static async getByMedico(medicoId, tenantId) {
        try {
            const data = await prisma.ferieAssenza.findMany({
                where: {
                    medicoId,
                    tenantId,
                    deletedAt: null
                },
                orderBy: [
                    { dataInizio: 'desc' }
                ]
            });

            return data;
        } catch (error) {
            logger.error('Failed to get ferie by medico', {
                component: 'ferie-assenza-service',
                action: 'getByMedico',
                medicoId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get ferie/assenza by ID
     * @param {string} id - FerieAssenza ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} FerieAssenza
     */
    static async getById(id, tenantId) {
        try {
            const ferieAssenza = await prisma.ferieAssenza.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!ferieAssenza) {
                throw new Error('Ferie/Assenza non trovata');
            }

            return ferieAssenza;
        } catch (error) {
            logger.error('Failed to get ferie by ID', {
                component: 'ferie-assenza-service',
                action: 'getById',
                id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Create new ferie/assenza
     * @param {Object} data - FerieAssenza data
     * @param {string} tenantId - Tenant ID
     * @param {string} createdBy - User ID creating
     * @returns {Promise<Object>} Created FerieAssenza
     */
    static async create(data, tenantId, createdBy) {
        try {
            const {
                medicoId,
                tipo = 'FERIE',
                stato = 'RICHIESTA',
                dataInizio,
                dataFine,
                orarioInizio,
                orarioFine,
                giornataIntera = true,
                motivazione,
                note
            } = data;

            // Validate dates
            const startDate = new Date(dataInizio);
            const endDate = new Date(dataFine);

            if (endDate < startDate) {
                throw new Error('La data fine non può essere precedente alla data inizio');
            }

            // Check for conflicts with existing ferie
            const conflicts = await this.checkConflicts({
                medicoId,
                dataInizio: startDate,
                dataFine: endDate,
                tenantId
            });

            if (conflicts.length > 0) {
                throw new Error('Esistono già ferie/assenze per il periodo indicato');
            }

            const ferieAssenza = await prisma.ferieAssenza.create({
                data: {
                    tenantId,
                    medicoId,
                    tipo,
                    stato,
                    dataInizio: startDate,
                    dataFine: endDate,
                    orarioInizio,
                    orarioFine,
                    giornataIntera,
                    motivazione,
                    note,
                    createdBy
                }
            });

            logger.info('Ferie/Assenza created', {
                component: 'ferie-assenza-service',
                action: 'create',
                ferieId: ferieAssenza.id,
                medicoId,
                tipo,
                tenantId
            });

            return ferieAssenza;
        } catch (error) {
            logger.error('Failed to create ferie', {
                component: 'ferie-assenza-service',
                action: 'create',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update ferie/assenza
     * @param {string} id - FerieAssenza ID
     * @param {Object} data - Update data
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Updated FerieAssenza
     */
    static async update(id, data, tenantId) {
        try {
            // Verify exists
            await this.getById(id, tenantId);

            const updateData = {};

            if (data.tipo !== undefined) updateData.tipo = data.tipo;
            if (data.stato !== undefined) updateData.stato = data.stato;
            if (data.dataInizio !== undefined) updateData.dataInizio = new Date(data.dataInizio);
            if (data.dataFine !== undefined) updateData.dataFine = new Date(data.dataFine);
            if (data.orarioInizio !== undefined) updateData.orarioInizio = data.orarioInizio;
            if (data.orarioFine !== undefined) updateData.orarioFine = data.orarioFine;
            if (data.giornataIntera !== undefined) updateData.giornataIntera = data.giornataIntera;
            if (data.motivazione !== undefined) updateData.motivazione = data.motivazione;
            if (data.note !== undefined) updateData.note = data.note;
            if (data.approvatoDa !== undefined) updateData.approvatoDa = data.approvatoDa;
            if (data.dataApprovazione !== undefined) updateData.dataApprovazione = new Date(data.dataApprovazione);

            // Validate dates if both are being updated
            if (updateData.dataInizio && updateData.dataFine) {
                if (updateData.dataFine < updateData.dataInizio) {
                    throw new Error('La data fine non può essere precedente alla data inizio');
                }
            }

            const ferieAssenza = await prisma.ferieAssenza.update({
                where: { id },
                data: updateData
            });

            logger.info('Ferie/Assenza updated', {
                component: 'ferie-assenza-service',
                action: 'update',
                ferieId: id,
                tenantId
            });

            return ferieAssenza;
        } catch (error) {
            logger.error('Failed to update ferie', {
                component: 'ferie-assenza-service',
                action: 'update',
                id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete ferie/assenza
     * @param {string} id - FerieAssenza ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Deleted FerieAssenza
     */
    static async delete(id, tenantId) {
        try {
            // Verify exists
            await this.getById(id, tenantId);

            const ferieAssenza = await prisma.ferieAssenza.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            logger.info('Ferie/Assenza deleted', {
                component: 'ferie-assenza-service',
                action: 'delete',
                ferieId: id,
                tenantId
            });

            return ferieAssenza;
        } catch (error) {
            logger.error('Failed to delete ferie', {
                component: 'ferie-assenza-service',
                action: 'delete',
                id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Check for conflicts with existing ferie/assenze
     * @param {Object} params - Check parameters
     * @returns {Promise<Array>} Conflicting records
     */
    static async checkConflicts({ medicoId, dataInizio, dataFine, tenantId, excludeId }) {
        try {
            const where = {
                medicoId,
                tenantId,
                deletedAt: null,
                // Check for overlapping dates
                AND: [
                    { dataInizio: { lte: dataFine } },
                    { dataFine: { gte: dataInizio } }
                ]
            };

            if (excludeId) {
                where.id = { not: excludeId };
            }

            const conflicts = await prisma.ferieAssenza.findMany({
                where,
                select: {
                    id: true,
                    tipo: true,
                    dataInizio: true,
                    dataFine: true
                }
            });

            return conflicts;
        } catch (error) {
            logger.error('Failed to check conflicts', {
                component: 'ferie-assenza-service',
                action: 'checkConflicts',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Approve ferie/assenza request
     * @param {string} id - FerieAssenza ID
     * @param {string} approvedBy - User ID approving
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Approved FerieAssenza
     */
    static async approve(id, approvedBy, tenantId) {
        try {
            const ferieAssenza = await prisma.ferieAssenza.update({
                where: { id },
                data: {
                    stato: 'APPROVATA',
                    approvatoDa: approvedBy,
                    dataApprovazione: new Date()
                }
            });

            logger.info('Ferie/Assenza approved', {
                component: 'ferie-assenza-service',
                action: 'approve',
                ferieId: id,
                approvedBy,
                tenantId
            });

            return ferieAssenza;
        } catch (error) {
            logger.error('Failed to approve ferie', {
                component: 'ferie-assenza-service',
                action: 'approve',
                id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Reject ferie/assenza request
     * @param {string} id - FerieAssenza ID
     * @param {string} rejectedBy - User ID rejecting
     * @param {string} note - Rejection reason
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Rejected FerieAssenza
     */
    static async reject(id, rejectedBy, note, tenantId) {
        try {
            const ferieAssenza = await prisma.ferieAssenza.update({
                where: { id },
                data: {
                    stato: 'RIFIUTATA',
                    approvatoDa: rejectedBy,
                    dataApprovazione: new Date(),
                    note: note || undefined
                }
            });

            logger.info('Ferie/Assenza rejected', {
                component: 'ferie-assenza-service',
                action: 'reject',
                ferieId: id,
                rejectedBy,
                tenantId
            });

            return ferieAssenza;
        } catch (error) {
            logger.error('Failed to reject ferie', {
                component: 'ferie-assenza-service',
                action: 'reject',
                id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }
}

export default FerieAssenzaService;
