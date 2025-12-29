/**
 * Convenzione Service
 * Business logic for convention/insurance agreement management
 * 
 * @module services/clinical/ConvenzioneService
 * @updated Project 45 - Added branch-aware support
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { BRANCH_TYPES } from '../../utils/branchHelper.js';

// Default branch for this entity
const DEFAULT_BRANCH = BRANCH_TYPES.MEDICA;

export class ConvenzioneService {
    /**
     * Create a new convenzione
     * @param {Object} data - Convenzione data
     * @param {string} tenantId - Tenant ID
     * @param {string} branchType - Branch type (default: MEDICA)
     * @returns {Promise<Object>} Created convenzione
     */
    static async create(data, tenantId, branchType = DEFAULT_BRANCH) {
        try {
            // Check for duplicate code
            const existing = await prisma.convenzione.findFirst({
                where: {
                    tenantId,
                    codice: data.codice,
                    deletedAt: null
                }
            });

            if (existing) {
                throw new Error(`Convenzione con codice "${data.codice}" già esistente`);
            }

            const convenzione = await prisma.convenzione.create({
                data: {
                    tenantId,
                    branchType, // Project 45: Add branchType
                    codice: data.codice,
                    nome: data.nome,
                    tipo: data.tipo,
                    descrizione: data.descrizione || null,
                    enteTerzo: data.enteTerzo || null,
                    partitaIva: data.partitaIva || null,
                    codiceFiscale: data.codiceFiscale || null,
                    telefono: data.telefono || null,
                    email: data.email || null,
                    referente: data.referente || null,
                    dataInizio: new Date(data.dataInizio),
                    dataFine: data.dataFine ? new Date(data.dataFine) : null,
                    condizioni: data.condizioni || null,
                    attiva: data.attiva !== false
                },
                include: {
                    listiniPrezzo: {
                        where: { deletedAt: null },
                        include: {
                            prestazione: {
                                select: {
                                    id: true,
                                    codice: true,
                                    nome: true
                                }
                            }
                        }
                    },
                    poliambulatori: true
                }
            });

            logger.info('Convenzione created', {
                component: 'convenzione-service',
                action: 'create',
                convenzioneId: convenzione.id,
                codice: convenzione.codice,
                tenantId,
                branchType,
            });

            return convenzione;
        } catch (error) {
            logger.error('Failed to create convenzione', {
                component: 'convenzione-service',
                action: 'create',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get convenzione by ID
     * @param {string} id - Convenzione ID
     * @param {string} tenantId - Tenant ID
     * @param {string} branchType - Branch type (optional for backward compatibility)
     * @returns {Promise<Object|null>} Convenzione or null
     */
    static async getById(id, tenantId, branchType = null) {
        try {
            const where = {
                id,
                tenantId,
                deletedAt: null
            };

            // Project 45: Add branchType filter if provided
            if (branchType) {
                where.branchType = branchType;
            }

            const convenzione = await prisma.convenzione.findFirst({
                where,
                include: {
                    listiniPrezzo: {
                        where: { deletedAt: null },
                        include: {
                            prestazione: {
                                select: {
                                    id: true,
                                    codice: true,
                                    nome: true
                                }
                            }
                        }
                    },
                    poliambulatori: true,
                    aziende: {
                        where: { deletedAt: null },
                        include: {
                            azienda: {
                                select: {
                                    id: true,
                                    ragioneSociale: true,
                                    piva: true,
                                    mail: true,
                                    telefono: true
                                }
                            },
                            riconoscimenti: {
                                where: { deletedAt: null, attivo: true },
                                include: {
                                    bundle: { select: { id: true, codice: true, nome: true } },
                                    prestazione: { select: { id: true, codice: true, nome: true } }
                                }
                            }
                        }
                    }
                }
            });

            return convenzione;
        } catch (error) {
            logger.error('Failed to get convenzione', {
                component: 'convenzione-service',
                action: 'getById',
                convenzioneId: id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get convenzione by code
     * @param {string} codice - Convenzione code
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object|null>} Convenzione or null
     */
    static async getByCode(codice, tenantId) {
        try {
            const convenzione = await prisma.convenzione.findFirst({
                where: {
                    codice,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    listiniPrezzo: {
                        where: { deletedAt: null },
                        include: {
                            prestazione: {
                                select: {
                                    id: true,
                                    codice: true,
                                    nome: true
                                }
                            }
                        }
                    },
                    poliambulatori: true
                }
            });

            return convenzione;
        } catch (error) {
            logger.error('Failed to get convenzione by code', {
                component: 'convenzione-service',
                action: 'getByCode',
                codice,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all convenzioni with pagination and filters
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Query options
     * @param {string} branchType - Branch type (optional for backward compatibility)
     * @returns {Promise<Object>} Paginated convenzioni
     */
    static async getAll(tenantId, options = {}, branchType = null) {
        try {
            const {
                page = 1,
                pageSize = 20,
                tipo,
                attiva,
                search,
                validaOggi = false,
                sortBy = 'nome',
                sortOrder = 'asc'
            } = options;

            const skip = (page - 1) * pageSize;
            const today = new Date();

            // Build where clause
            const where = {
                tenantId,
                deletedAt: null,
                // Project 45: Add branchType filter if provided
                ...(branchType && { branchType }),
            };

            if (tipo) {
                where.tipo = tipo;
            }

            if (attiva !== undefined) {
                where.attiva = attiva;
            }

            if (search) {
                where.OR = [
                    { nome: { contains: search, mode: 'insensitive' } },
                    { codice: { contains: search, mode: 'insensitive' } },
                    { descrizione: { contains: search, mode: 'insensitive' } }
                ];
            }

            // Filter for currently valid conventions
            if (validaOggi) {
                where.dataInizio = { lte: today };
                where.OR = [
                    { dataFine: null },
                    { dataFine: { gte: today } }
                ];
            }

            // Get total count
            const total = await prisma.convenzione.count({ where });

            // Get convenzioni
            const convenzioni = await prisma.convenzione.findMany({
                where,
                include: {
                    listiniPrezzo: {
                        where: { deletedAt: null },
                        include: {
                            prestazione: {
                                select: {
                                    id: true,
                                    codice: true,
                                    nome: true
                                }
                            }
                        }
                    },
                    poliambulatori: true
                },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: pageSize
            });

            return {
                data: convenzioni,
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize),
                    hasNext: skip + convenzioni.length < total,
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            logger.error('Failed to get convenzioni', {
                component: 'convenzione-service',
                action: 'getAll',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update convenzione
     * @param {string} id - Convenzione ID
     * @param {Object} data - Update data
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Updated convenzione
     */
    static async update(id, data, tenantId) {
        try {
            // Verify exists
            const existing = await prisma.convenzione.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Convenzione non trovata');
            }

            // Check for duplicate code if code is being changed
            if (data.codice && data.codice !== existing.codice) {
                const duplicate = await prisma.convenzione.findFirst({
                    where: {
                        tenantId,
                        codice: data.codice,
                        id: { not: id },
                        deletedAt: null
                    }
                });

                if (duplicate) {
                    throw new Error(`Convenzione con codice "${data.codice}" già esistente`);
                }
            }

            const updateData = {};

            // Only include fields that are provided
            const allowedFields = [
                'codice', 'nome', 'tipo', 'descrizione', 'contatto',
                'telefono', 'email', 'indirizzo', 'percentualeSconto',
                'massimaleAnnuo', 'documentoPath', 'note', 'attiva'
            ];

            allowedFields.forEach(field => {
                if (data[field] !== undefined) {
                    updateData[field] = data[field];
                }
            });

            // Handle date fields specially
            if (data.dataInizio !== undefined) {
                updateData.dataInizio = new Date(data.dataInizio);
            }
            if (data.dataFine !== undefined) {
                updateData.dataFine = data.dataFine ? new Date(data.dataFine) : null;
            }

            const convenzione = await prisma.convenzione.update({
                where: { id },
                data: updateData,
                include: {
                    listiniPrezzo: {
                        where: { deletedAt: null },
                        include: {
                            prestazione: {
                                select: {
                                    id: true,
                                    codice: true,
                                    nome: true
                                }
                            }
                        }
                    },
                    poliambulatori: true
                }
            });

            logger.info('Convenzione updated', {
                component: 'convenzione-service',
                action: 'update',
                convenzioneId: id,
                tenantId
            });

            return convenzione;
        } catch (error) {
            logger.error('Failed to update convenzione', {
                component: 'convenzione-service',
                action: 'update',
                convenzioneId: id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete convenzione
     * @param {string} id - Convenzione ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Deleted convenzione
     */
    static async delete(id, tenantId) {
        try {
            // Verify exists
            const existing = await prisma.convenzione.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Convenzione non trovata');
            }

            const convenzione = await prisma.convenzione.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            logger.info('Convenzione deleted', {
                component: 'convenzione-service',
                action: 'delete',
                convenzioneId: id,
                tenantId
            });

            return convenzione;
        } catch (error) {
            logger.error('Failed to delete convenzione', {
                component: 'convenzione-service',
                action: 'delete',
                convenzioneId: id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Associate listino to convenzione
     * @param {string} convenzioneId - Convenzione ID
     * @param {string} listinoId - Listino ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Created association
     */
    static async associateListino(convenzioneId, listinoId, tenantId) {
        try {
            // Verify convenzione exists
            const convenzione = await prisma.convenzione.findFirst({
                where: { id: convenzioneId, tenantId, deletedAt: null }
            });

            if (!convenzione) {
                throw new Error('Convenzione non trovata');
            }

            // Verify listino exists
            const listino = await prisma.listinoPrezzo.findFirst({
                where: { id: listinoId, tenantId, deletedAt: null }
            });

            if (!listino) {
                throw new Error('Listino non trovato');
            }

            // Check if association already exists
            const existing = await prisma.convenzioneListino.findFirst({
                where: { convenzioneId, listinoId }
            });

            if (existing) {
                throw new Error('Listino già associato alla convenzione');
            }

            const association = await prisma.convenzioneListino.create({
                data: {
                    convenzioneId,
                    listinoId
                },
                include: {
                    listino: {
                        select: {
                            id: true,
                            nome: true,
                            tipo: true
                        }
                    }
                }
            });

            logger.info('Listino associated to convenzione', {
                component: 'convenzione-service',
                action: 'associateListino',
                convenzioneId,
                listinoId,
                tenantId
            });

            return association;
        } catch (error) {
            logger.error('Failed to associate listino to convenzione', {
                component: 'convenzione-service',
                action: 'associateListino',
                convenzioneId,
                listinoId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Remove listino from convenzione
     * @param {string} convenzioneId - Convenzione ID
     * @param {string} listinoId - Listino ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<void>}
     */
    static async removeListino(convenzioneId, listinoId, tenantId) {
        try {
            // Verify convenzione exists
            const convenzione = await prisma.convenzione.findFirst({
                where: { id: convenzioneId, tenantId, deletedAt: null }
            });

            if (!convenzione) {
                throw new Error('Convenzione non trovata');
            }

            await prisma.convenzioneListino.deleteMany({
                where: { convenzioneId, listinoId }
            });

            logger.info('Listino removed from convenzione', {
                component: 'convenzione-service',
                action: 'removeListino',
                convenzioneId,
                listinoId,
                tenantId
            });
        } catch (error) {
            logger.error('Failed to remove listino from convenzione', {
                component: 'convenzione-service',
                action: 'removeListino',
                convenzioneId,
                listinoId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get listini for convenzione
     * @param {string} convenzioneId - Convenzione ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} List of listini
     */
    static async getListini(convenzioneId, tenantId) {
        try {
            const convenzione = await prisma.convenzione.findFirst({
                where: { id: convenzioneId, tenantId, deletedAt: null },
                include: {
                    listiniPrezzo: {
                        where: { deletedAt: null },
                        include: {
                            prestazione: {
                                select: {
                                    id: true,
                                    codice: true,
                                    nome: true
                                }
                            }
                        }
                    }
                }
            });

            if (!convenzione) {
                throw new Error('Convenzione non trovata');
            }

            return convenzione.listiniPrezzo;
        } catch (error) {
            logger.error('Failed to get listini for convenzione', {
                component: 'convenzione-service',
                action: 'getListini',
                convenzioneId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Check if convenzione is valid today
     * @param {string} id - Convenzione ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Validity status
     */
    static async checkValidity(id, tenantId) {
        try {
            const convenzione = await prisma.convenzione.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!convenzione) {
                throw new Error('Convenzione non trovata');
            }

            const today = new Date();
            const dataInizio = new Date(convenzione.dataInizio);
            const dataFine = convenzione.dataFine ? new Date(convenzione.dataFine) : null;

            const isValid =
                convenzione.attiva &&
                dataInizio <= today &&
                (!dataFine || dataFine >= today);

            return {
                convenzioneId: id,
                codice: convenzione.codice,
                nome: convenzione.nome,
                isValid,
                attiva: convenzione.attiva,
                dataInizio: convenzione.dataInizio,
                dataFine: convenzione.dataFine,
                reason: !isValid ?
                    (!convenzione.attiva ? 'Convenzione non attiva' :
                        dataInizio > today ? 'Convenzione non ancora valida' :
                            'Convenzione scaduta') : null
            };
        } catch (error) {
            logger.error('Failed to check convenzione validity', {
                component: 'convenzione-service',
                action: 'checkValidity',
                convenzioneId: id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get available convenzioni for a patient booking
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} List of valid convenzioni
     */
    static async getAvailableForBooking(tenantId) {
        try {
            const today = new Date();

            const convenzioni = await prisma.convenzione.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    attiva: true,
                    dataInizio: { lte: today },
                    OR: [
                        { dataFine: null },
                        { dataFine: { gte: today } }
                    ]
                },
                select: {
                    id: true,
                    codice: true,
                    nome: true,
                    tipo: true,
                    listiniPrezzo: {
                        select: {
                            id: true,
                            nome: true,
                            prezzo: true,
                            prestazione: {
                                select: {
                                    id: true,
                                    codice: true,
                                    nome: true
                                }
                            }
                        }
                    }
                },
                orderBy: { nome: 'asc' }
            });

            return convenzioni;
        } catch (error) {
            logger.error('Failed to get available convenzioni', {
                component: 'convenzione-service',
                action: 'getAvailableForBooking',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get convenzioni expiring soon
     * @param {string} tenantId - Tenant ID
     * @param {number} daysAhead - Days to look ahead (default 30)
     * @returns {Promise<Array>} List of expiring convenzioni
     */
    static async getExpiringSoon(tenantId, daysAhead = 30) {
        try {
            const today = new Date();
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysAhead);

            const convenzioni = await prisma.convenzione.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    attiva: true,
                    dataFine: {
                        gte: today,
                        lte: futureDate
                    }
                },
                orderBy: { dataFine: 'asc' }
            });

            return convenzioni.map(c => ({
                ...c,
                daysUntilExpiry: Math.ceil((new Date(c.dataFine) - today) / (1000 * 60 * 60 * 24))
            }));
        } catch (error) {
            logger.error('Failed to get expiring convenzioni', {
                component: 'convenzione-service',
                action: 'getExpiringSoon',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get statistics for convenzioni
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Statistics
     */
    static async getStatistics(tenantId) {
        try {
            const today = new Date();

            const [total, active, byType, expiringSoon] = await Promise.all([
                // Total count
                prisma.convenzione.count({
                    where: { tenantId, deletedAt: null }
                }),
                // Active and valid count
                prisma.convenzione.count({
                    where: {
                        tenantId,
                        deletedAt: null,
                        attiva: true,
                        dataInizio: { lte: today },
                        OR: [
                            { dataFine: null },
                            { dataFine: { gte: today } }
                        ]
                    }
                }),
                // Count by type
                prisma.convenzione.groupBy({
                    by: ['tipo'],
                    where: { tenantId, deletedAt: null },
                    _count: true
                }),
                // Expiring in 30 days
                prisma.convenzione.count({
                    where: {
                        tenantId,
                        deletedAt: null,
                        attiva: true,
                        dataFine: {
                            gte: today,
                            lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
                        }
                    }
                })
            ]);

            return {
                totale: total,
                attive: active,
                inScadenza: expiringSoon,
                perTipo: byType.reduce((acc, item) => {
                    acc[item.tipo] = item._count;
                    return acc;
                }, {})
            };
        } catch (error) {
            logger.error('Failed to get convenzioni statistics', {
                component: 'convenzione-service',
                action: 'getStatistics',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }
}

export default ConvenzioneService;
