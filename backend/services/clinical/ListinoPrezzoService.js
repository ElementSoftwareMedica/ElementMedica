/**
 * Listino Prezzo Service
 * Business logic for pricing management - Aligned with current schema
 * 
 * @module services/clinical/ListinoPrezzoService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { BRANCH_TYPES } from '../../utils/branchHelper.js';

const DEFAULT_BRANCH = BRANCH_TYPES.MEDICA;

export class ListinoPrezzoService {
    /**
     * Create a new listino prezzo
     * @param {Object} data - Listino data
     * @returns {Promise<Object>} Created listino
     */
    static async create(data) {
        try {
            const { tenantId, createdBy, branchType = DEFAULT_BRANCH } = data;

            // Verify prestazione exists and belongs to tenant
            const prestazione = await prisma.prestazione.findFirst({
                where: {
                    id: data.prestazioneId,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!prestazione) {
                throw new Error('Prestazione not found');
            }

            // If medicoId provided, verify it exists
            if (data.medicoId) {
                const medico = await prisma.person.findFirst({
                    where: {
                        id: data.medicoId,
                        deletedAt: null,
                        personRoles: {
                            some: {
                                roleType: 'MEDICO',
                                tenantId,
                                isActive: true,
                                deletedAt: null
                            }
                        }
                    }
                });
                if (!medico) {
                    throw new Error('Medico not found or not enabled for this tenant');
                }
            }

            // If convenzioneId provided, verify it exists
            if (data.convenzioneId) {
                const convenzione = await prisma.convenzione.findFirst({
                    where: {
                        id: data.convenzioneId,
                        tenantId,
                        deletedAt: null
                    }
                });
                if (!convenzione) {
                    throw new Error('Convenzione not found');
                }
            }

            // Check for overlapping validity periods for same prestazione/medico/convenzione
            const overlapping = await prisma.listinoPrezzo.findFirst({
                where: {
                    tenantId,
                    prestazioneId: data.prestazioneId,
                    medicoId: data.medicoId || null,
                    convenzioneId: data.convenzioneId || null,
                    poliambulatorioId: data.poliambulatorioId || null,
                    deletedAt: null,
                    AND: [
                        { validoDa: { lte: data.validoA || new Date('2099-12-31') } },
                        {
                            OR: [
                                { validoA: null },
                                { validoA: { gte: data.validoDa || new Date() } }
                            ]
                        }
                    ]
                }
            });

            if (overlapping) {
                throw new Error('Overlapping validity period with existing price for this configuration');
            }

            // Build create data
            const createData = {
                prestazioneId: data.prestazioneId,
                prezzo: data.prezzo,
                tenantId,
                createdBy,
                branchType,
                // Optional fields
                ...(data.poliambulatorioId && { poliambulatorioId: data.poliambulatorioId }),
                ...(data.convenzioneId && { convenzioneId: data.convenzioneId }),
                ...(data.medicoId && { medicoId: data.medicoId }),
                ...(data.codice && { codice: data.codice }),
                ...(data.nome && { nome: data.nome }),
                ...(data.descrizione && { descrizione: data.descrizione }),
                ...(data.durataMedico !== undefined && { durataMedico: data.durataMedico }),
                ...(data.ivaAliquota !== undefined && { ivaAliquota: data.ivaAliquota }),
                ...(data.scontoPercentuale !== undefined && { scontoPercentuale: data.scontoPercentuale }),
                ...(data.compensoMedicoTipo && { compensoMedicoTipo: data.compensoMedicoTipo }),
                ...(data.compensoMedicoValore !== undefined && { compensoMedicoValore: data.compensoMedicoValore }),
                ...(data.compensoMedicoMinimo !== undefined && { compensoMedicoMinimo: data.compensoMedicoMinimo }),
                ...(data.compensoMedicoMassimo !== undefined && { compensoMedicoMassimo: data.compensoMedicoMassimo }),
                ...(data.attivo !== undefined && { attivo: data.attivo }),
                ...(data.validoDa && { validoDa: new Date(data.validoDa) }),
                ...(data.validoA && { validoA: new Date(data.validoA) }),
                ...(data.priorita !== undefined && { priorita: data.priorita })
            };

            const listino = await prisma.listinoPrezzo.create({
                data: createData,
                include: {
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true,
                            brancheSpecialistiche: true
                        }
                    },
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    convenzione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true
                        }
                    },
                    poliambulatorio: {
                        select: {
                            id: true,
                            nome: true
                        }
                    }
                }
            });

            logger.info('Listino prezzo created', {
                component: 'listino-prezzo-service',
                action: 'create',
                listinoId: listino.id,
                prestazioneId: data.prestazioneId,
                medicoId: data.medicoId,
                convenzioneId: data.convenzioneId,
                tenantId,
                branchType
            });

            return listino;
        } catch (error) {
            logger.error('Failed to create listino prezzo', {
                component: 'listino-prezzo-service',
                action: 'create',
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Get listino by ID
     * @param {string} id - Listino ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object|null>} Listino or null
     */
    static async getById(id, tenantId, branchType = null) {
        try {
            const listino = await prisma.listinoPrezzo.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null,
                    ...(branchType && { branchType })
                },
                include: {
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true,
                            durataPrevista: true,
                            brancheSpecialistiche: true,
                            prezzoBase: true
                        }
                    },
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true
                        }
                    },
                    convenzione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true,
                            attiva: true
                        }
                    },
                    poliambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true
                        }
                    }
                }
            });

            if (!listino) {
                throw new Error('Listino not found');
            }

            return listino;
        } catch (error) {
            logger.error('Failed to get listino prezzo', {
                component: 'listino-prezzo-service',
                action: 'getById',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all listini for tenant
     * @param {string} tenantId - Tenant ID
     * @param {Object} filters - Filter options
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Listini with pagination
     */
    static async getAll(tenantId, filters = {}, options = {}, branchType = null) {
        try {
            const {
                page = 1,
                limit = 20,
                orderBy = 'createdAt',
                orderDir = 'desc',
                tenantIds = null,
                allTenants = false,
                accessibleTenantIds = []
            } = options;

            const {
                prestazioneId,
                poliambulatorioId,
                convenzioneId,
                medicoId,
                attivo,
                includeExpired = false,
                search
            } = filters;

            const skip = (page - 1) * limit;
            const today = new Date();

            // Determine tenant filter based on user's access (multi-tenant support)
            let tenantFilter = {};

            if (tenantIds) {
                const requestedIds = Array.isArray(tenantIds)
                    ? tenantIds
                    : (typeof tenantIds === 'string' ? tenantIds.split(',').map(id => id.trim()) : []);
                const allowedIds = accessibleTenantIds.length > 0
                    ? requestedIds.filter(id => accessibleTenantIds.includes(id))
                    : requestedIds;

                if (allowedIds.length > 0) {
                    tenantFilter = allowedIds.length === 1
                        ? { tenantId: allowedIds[0] }
                        : { tenantId: { in: allowedIds } };
                } else {
                    tenantFilter = tenantId ? { tenantId } : {};
                }
            } else if (allTenants && accessibleTenantIds.length > 0) {
                tenantFilter = { tenantId: { in: accessibleTenantIds } };
            } else if (tenantId) {
                tenantFilter = { tenantId };
            }

            const where = {
                deletedAt: null,
                ...tenantFilter,
                ...(branchType && { branchType })
            };

            // Apply filters
            if (prestazioneId) where.prestazioneId = prestazioneId;
            if (poliambulatorioId) where.poliambulatorioId = poliambulatorioId;
            if (convenzioneId) where.convenzioneId = convenzioneId;
            if (medicoId) where.medicoId = medicoId;
            if (attivo !== undefined) where.attivo = attivo;

            // Exclude expired if not requested
            if (!includeExpired) {
                where.OR = [
                    { validoA: null },
                    { validoA: { gte: today } }
                ];
            }

            // Search filter
            if (search) {
                where.AND = [
                    ...(where.AND || []),
                    {
                        OR: [
                            { codice: { contains: search, mode: 'insensitive' } },
                            { nome: { contains: search, mode: 'insensitive' } },
                            { prestazione: { nome: { contains: search, mode: 'insensitive' } } }
                        ]
                    }
                ];
            }

            const [listini, total] = await Promise.all([
                prisma.listinoPrezzo.findMany({
                    where,
                    include: {
                        prestazione: {
                            select: {
                                id: true,
                                codice: true,
                                nome: true,
                                tipo: true,
                                brancheSpecialistiche: true
                            }
                        },
                        medico: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        },
                        convenzione: {
                            select: {
                                id: true,
                                codice: true,
                                nome: true
                            }
                        },
                        poliambulatorio: {
                            select: {
                                id: true,
                                nome: true
                            }
                        }
                    },
                    orderBy: { [orderBy]: orderDir },
                    skip,
                    take: limit
                }),
                prisma.listinoPrezzo.count({ where })
            ]);

            return {
                data: listini,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Failed to get listini prezzi', {
                component: 'listino-prezzo-service',
                action: 'getAll',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all listini for a specific prestazione
     * @param {string} prestazioneId - Prestazione ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Listini for the prestazione
     */
    static async getByPrestazione(prestazioneId, tenantId) {
        try {
            const listini = await prisma.listinoPrezzo.findMany({
                where: {
                    prestazioneId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true,
                            brancheSpecialistiche: true,
                            prezzoBase: true,
                            durataPrevista: true
                        }
                    },
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    convenzione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true,
                            attiva: true
                        }
                    },
                    poliambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true
                        }
                    }
                },
                orderBy: [
                    { priorita: 'desc' },
                    { createdAt: 'desc' }
                ]
            });

            logger.info('Retrieved listini by prestazione', {
                component: 'listino-prezzo-service',
                action: 'getByPrestazione',
                prestazioneId,
                count: listini.length,
                tenantId
            });

            return listini;
        } catch (error) {
            logger.error('Failed to get listini by prestazione', {
                component: 'listino-prezzo-service',
                action: 'getByPrestazione',
                error: error.message,
                prestazioneId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get effective price for a prestazione considering medico and convenzione
     * Uses priorita field to resolve conflicts
     * 
     * @param {Object} params - Query parameters
     * @param {string} params.prestazioneId - Prestazione ID
     * @param {string} params.tenantId - Tenant ID
     * @param {string} [params.medicoId] - Optional medico ID for specific pricing
     * @param {string} [params.convenzioneId] - Optional convenzione ID
     * @param {string} [params.poliambulatorioId] - Optional poliambulatorio ID
     * @returns {Promise<Object|null>} Best matching price or null
     */
    static async getEffectivePrice({ prestazioneId, tenantId, medicoId = null, convenzioneId = null, poliambulatorioId = null }) {
        try {
            const today = new Date();

            // Build query conditions for matching
            const orConditions = [
                // Default (no medico, no convenzione)
                { medicoId: null, convenzioneId: null }
            ];

            if (medicoId && convenzioneId) {
                orConditions.unshift({ medicoId, convenzioneId });
            }
            if (medicoId) {
                orConditions.unshift({ medicoId, convenzioneId: null });
            }
            if (convenzioneId) {
                orConditions.unshift({ medicoId: null, convenzioneId });
            }

            const candidates = await prisma.listinoPrezzo.findMany({
                where: {
                    prestazioneId,
                    tenantId,
                    deletedAt: null,
                    attivo: true,
                    validoDa: { lte: today },
                    OR: [
                        { validoA: null },
                        { validoA: { gte: today } }
                    ],
                    AND: {
                        OR: orConditions
                    }
                },
                include: {
                    prestazione: {
                        select: { id: true, codice: true, nome: true, prezzoBase: true }
                    },
                    medico: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    convenzione: {
                        select: { id: true, codice: true, nome: true }
                    }
                },
                orderBy: [
                    { priorita: 'desc' },
                    { validoDa: 'desc' }
                ]
            });

            if (candidates.length === 0) {
                // Fallback to prestazione base price
                const prestazione = await prisma.prestazione.findFirst({
                    where: { id: prestazioneId, tenantId, deletedAt: null },
                    select: { prezzoBase: true, nome: true, codice: true }
                });

                if (prestazione) {
                    return {
                        prezzo: prestazione.prezzoBase,
                        source: 'PRESTAZIONE_BASE',
                        prestazione
                    };
                }
                return null;
            }

            // Return best match (first due to ordering)
            const best = candidates[0];
            return {
                ...best,
                source: best.medicoId && best.convenzioneId
                    ? 'MEDICO_CONVENZIONE'
                    : best.medicoId
                        ? 'MEDICO'
                        : best.convenzioneId
                            ? 'CONVENZIONE'
                            : 'LISTINO_DEFAULT'
            };
        } catch (error) {
            logger.error('Failed to get effective price', {
                component: 'listino-prezzo-service',
                action: 'getEffectivePrice',
                error: error.message,
                prestazioneId,
                medicoId,
                convenzioneId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all prices configured for a medico (management view — all listini regardless of date).
     * Returns prestazione, bundle, and documentoTemplate (questionario) entries.
     * P72_19: Includes bundle and documentoTemplate relations.
     *
     * @param {string} medicoId - Medico ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Listini with all relation data
     */
    static async getByMedico(medicoId, tenantId) {
        try {
            const listini = await prisma.listinoPrezzo.findMany({
                where: {
                    medicoId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true,
                            brancheSpecialistiche: true,
                            prezzoBase: true,
                            durataPrevista: true
                        }
                    },
                    bundle: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            attivo: true
                        }
                    },
                    // P72_19: documentoTemplate (questionario)
                    documentoTemplate: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true
                        }
                    },
                    convenzione: {
                        select: { id: true, codice: true, nome: true }
                    },
                    poliambulatorio: {
                        select: { id: true, nome: true, codice: true }
                    }
                },
                orderBy: [
                    { createdAt: 'desc' }
                ]
            });

            logger.info('Retrieved listini by medico', {
                component: 'listino-prezzo-service',
                action: 'getByMedico',
                medicoId,
                count: listini.length,
                tenantId
            });

            return listini;
        } catch (error) {
            logger.error('Failed to get listini by medico', {
                component: 'listino-prezzo-service',
                action: 'getByMedico',
                error: error.message,
                medicoId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all listini for a specific documentoTemplate (questionario compensation view).
     * P72_19: Support for questionario-based listino entries.
     *
     * @param {string} documentoTemplateId - DocumentoTemplate ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Listini with documentoTemplate data
     */
    static async getByDocumentoTemplate(documentoTemplateId, tenantId) {
        try {
            const listini = await prisma.listinoPrezzo.findMany({
                where: {
                    documentoTemplateId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    documentoTemplate: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true
                        }
                    },
                    medico: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    convenzione: {
                        select: { id: true, codice: true, nome: true }
                    }
                },
                orderBy: [
                    { priorita: 'desc' }
                ]
            });

            logger.info('Retrieved listini by documentoTemplate', {
                component: 'listino-prezzo-service',
                action: 'getByDocumentoTemplate',
                documentoTemplateId,
                count: listini.length,
                tenantId
            });

            return listini;
        } catch (error) {
            logger.error('Failed to get listini by documentoTemplate', {
                component: 'listino-prezzo-service',
                action: 'getByDocumentoTemplate',
                error: error.message,
                documentoTemplateId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Create a listino prezzo for a documentoTemplate (questionario).
     * P72_19: Support for questionario-based listino entries.
     *
     * @param {Object} data - Create data including documentoTemplateId
     * @returns {Promise<Object>} Created listino
     */
    static async createForDocumentoTemplate(data) {
        try {
            const { tenantId, createdBy } = data;

            // Verify documentoTemplate exists and belongs to tenant
            const template = await prisma.documentoTemplate.findFirst({
                where: {
                    id: data.documentoTemplateId,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!template) {
                throw new Error('DocumentoTemplate not found');
            }

            // If medicoId provided, verify it exists
            if (data.medicoId) {
                const medico = await prisma.person.findFirst({
                    where: {
                        id: data.medicoId,
                        deletedAt: null,
                        personRoles: {
                            some: {
                                roleType: 'MEDICO',
                                tenantId,
                                isActive: true,
                                deletedAt: null
                            }
                        }
                    }
                });
                if (!medico) {
                    throw new Error('Medico not found or not enabled for this tenant');
                }
            }

            // Check for duplicate (same template/medico/convenzione)
            const duplicate = await prisma.listinoPrezzo.findFirst({
                where: {
                    tenantId,
                    documentoTemplateId: data.documentoTemplateId,
                    medicoId: data.medicoId || null,
                    convenzioneId: data.convenzioneId || null,
                    deletedAt: null
                }
            });

            if (duplicate) {
                throw new Error('Esiste già un listino per questa configurazione medico/questionario');
            }

            const createData = {
                documentoTemplateId: data.documentoTemplateId,
                prezzo: data.prezzo ?? 0,
                tenantId,
                createdBy,
                ...(data.medicoId && { medicoId: data.medicoId }),
                ...(data.convenzioneId && { convenzioneId: data.convenzioneId }),
                ...(data.poliambulatorioId && { poliambulatorioId: data.poliambulatorioId }),
                ...(data.codice && { codice: data.codice }),
                ...(data.nome && { nome: data.nome }),
                ...(data.descrizione && { descrizione: data.descrizione }),
                ...(data.durataMedico !== undefined && { durataMedico: data.durataMedico }),
                ...(data.ivaAliquota !== undefined && { ivaAliquota: data.ivaAliquota }),
                ...(data.scontoPercentuale !== undefined && { scontoPercentuale: data.scontoPercentuale }),
                ...(data.compensoMedicoTipo && { compensoMedicoTipo: data.compensoMedicoTipo }),
                ...(data.compensoMedicoValore !== undefined && { compensoMedicoValore: data.compensoMedicoValore }),
                ...(data.compensoMedicoMinimo !== undefined && { compensoMedicoMinimo: data.compensoMedicoMinimo }),
                ...(data.compensoMedicoMassimo !== undefined && { compensoMedicoMassimo: data.compensoMedicoMassimo }),
                ...(data.attivo !== undefined && { attivo: data.attivo }),
                ...(data.validoDa && { validoDa: new Date(data.validoDa) }),
                ...(data.validoA && { validoA: new Date(data.validoA) }),
                ...(data.priorita !== undefined && { priorita: data.priorita })
            };

            const listino = await prisma.listinoPrezzo.create({
                data: createData,
                include: {
                    documentoTemplate: {
                        select: { id: true, codice: true, nome: true, tipo: true }
                    },
                    medico: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    convenzione: {
                        select: { id: true, codice: true, nome: true }
                    }
                }
            });

            logger.info('Listino prezzo for documentoTemplate created', {
                component: 'listino-prezzo-service',
                action: 'createForDocumentoTemplate',
                listinoId: listino.id,
                documentoTemplateId: data.documentoTemplateId,
                medicoId: data.medicoId,
                tenantId
            });

            return listino;
        } catch (error) {
            logger.error('Failed to create listino prezzo for documentoTemplate', {
                component: 'listino-prezzo-service',
                action: 'createForDocumentoTemplate',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get all prices for a convenzione
     * @param {string} convenzioneId - Convenzione ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Listini for convenzione
     */
    static async getByConvenzione(convenzioneId, tenantId) {
        try {
            const today = new Date();

            const listini = await prisma.listinoPrezzo.findMany({
                where: {
                    tenantId,
                    convenzioneId,
                    deletedAt: null,
                    attivo: true,
                    validoDa: { lte: today },
                    OR: [
                        { validoA: null },
                        { validoA: { gte: today } }
                    ]
                },
                include: {
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true,
                            brancheSpecialistiche: true
                        }
                    },
                    medico: {
                        select: { id: true, firstName: true, lastName: true }
                    }
                },
                orderBy: [
                    { prestazione: { nome: 'asc' } },
                    { prezzo: 'asc' }
                ]
            });

            return listini;
        } catch (error) {
            logger.error('Failed to get listini by convenzione', {
                component: 'listino-prezzo-service',
                action: 'getByConvenzione',
                error: error.message,
                convenzioneId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update listino prezzo
     * @param {string} id - Listino ID
     * @param {string} tenantId - Tenant ID
     * @param {Object} data - Update data
     * @returns {Promise<Object>} Updated listino
     */
    static async update(id, tenantId, data) {
        try {
            const existing = await prisma.listinoPrezzo.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Listino prezzo not found');
            }

            // Build update data
            const updateData = {
                ...(data.prezzo !== undefined && { prezzo: data.prezzo }),
                ...(data.codice !== undefined && { codice: data.codice }),
                ...(data.nome !== undefined && { nome: data.nome }),
                ...(data.descrizione !== undefined && { descrizione: data.descrizione }),
                ...(data.ivaAliquota !== undefined && { ivaAliquota: data.ivaAliquota }),
                ...(data.scontoPercentuale !== undefined && { scontoPercentuale: data.scontoPercentuale }),
                ...(data.durataMedico !== undefined && { durataMedico: data.durataMedico }),
                ...(data.compensoMedicoTipo !== undefined && { compensoMedicoTipo: data.compensoMedicoTipo }),
                ...(data.compensoMedicoValore !== undefined && { compensoMedicoValore: data.compensoMedicoValore }),
                ...(data.compensoMedicoMinimo !== undefined && { compensoMedicoMinimo: data.compensoMedicoMinimo }),
                ...(data.compensoMedicoMassimo !== undefined && { compensoMedicoMassimo: data.compensoMedicoMassimo }),
                ...(data.attivo !== undefined && { attivo: data.attivo }),
                ...(data.validoDa && { validoDa: new Date(data.validoDa) }),
                ...(data.validoA && { validoA: new Date(data.validoA) }),
                ...(data.priorita !== undefined && { priorita: data.priorita })
            };

            const updated = await prisma.listinoPrezzo.update({
                where: { id },
                data: updateData,
                include: {
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true,
                            brancheSpecialistiche: true
                        }
                    },
                    medico: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    convenzione: {
                        select: { id: true, codice: true, nome: true }
                    }
                }
            });

            logger.info('Listino prezzo updated', {
                component: 'listino-prezzo-service',
                action: 'update',
                listinoId: id,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to update listino prezzo', {
                component: 'listino-prezzo-service',
                action: 'update',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete listino prezzo
     * @param {string} id - Listino ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Success status
     */
    static async delete(id, tenantId) {
        try {
            const existing = await prisma.listinoPrezzo.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Listino prezzo not found');
            }

            await prisma.listinoPrezzo.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            logger.info('Listino prezzo deleted', {
                component: 'listino-prezzo-service',
                action: 'delete',
                listinoId: id,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('Failed to delete listino prezzo', {
                component: 'listino-prezzo-service',
                action: 'delete',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get statistics
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Statistics
     */
    static async getStatistics(tenantId) {
        try {
            const today = new Date();

            const [
                totalListini,
                totalAttivi,
                avgPrice,
                byMedicoCount,
                byConvenzioneCount
            ] = await Promise.all([
                prisma.listinoPrezzo.count({
                    where: { tenantId, deletedAt: null }
                }),
                prisma.listinoPrezzo.count({
                    where: {
                        tenantId,
                        deletedAt: null,
                        attivo: true,
                        validoDa: { lte: today },
                        OR: [{ validoA: null }, { validoA: { gte: today } }]
                    }
                }),
                prisma.listinoPrezzo.aggregate({
                    where: {
                        tenantId,
                        deletedAt: null,
                        attivo: true
                    },
                    _avg: { prezzo: true }
                }),
                prisma.listinoPrezzo.findMany({
                    where: { tenantId, deletedAt: null, medicoId: { not: null } },
                    select: { medicoId: true },
                    distinct: ['medicoId']
                }).then(m => m.length),
                prisma.listinoPrezzo.findMany({
                    where: { tenantId, deletedAt: null, convenzioneId: { not: null } },
                    select: { convenzioneId: true },
                    distinct: ['convenzioneId']
                }).then(c => c.length)
            ]);

            return {
                totalListini,
                totalAttivi,
                avgPrice: avgPrice._avg.prezzo ? Math.round(Number(avgPrice._avg.prezzo) * 100) / 100 : 0,
                mediciWithCustomPricing: byMedicoCount,
                convenzioniWithPricing: byConvenzioneCount
            };
        } catch (error) {
            logger.error('Failed to get listino statistics', {
                component: 'listino-prezzo-service',
                action: 'getStatistics',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Bulk create prices for a medico for multiple prestazioni
     * @param {string} medicoId - Medico ID
     * @param {Array} prestazioni - Array of {prestazioneId, prezzo, ...}
     * @param {string} tenantId - Tenant ID
     * @param {string} createdBy - Creator ID
     * @returns {Promise<Object>} Creation result
     */
    static async bulkCreateForMedico(medicoId, prestazioni, tenantId, createdBy) {
        try {
            const results = await prisma.$transaction(async (tx) => {
                const created = [];
                const errors = [];

                for (const p of prestazioni) {
                    try {
                        const listino = await tx.listinoPrezzo.create({
                            data: {
                                prestazioneId: p.prestazioneId,
                                medicoId,
                                prezzo: p.prezzo,
                                compensoMedicoTipo: p.compensoMedicoTipo,
                                compensoMedicoValore: p.compensoMedicoValore,
                                compensoMedicoMinimo: p.compensoMedicoMinimo,
                                compensoMedicoMassimo: p.compensoMedicoMassimo,
                                tenantId,
                                createdBy
                            }
                        });
                        created.push(listino);
                    } catch (err) {
                        errors.push({ prestazioneId: p.prestazioneId, error: err.message });
                    }
                }

                return { created, errors };
            });

            logger.info('Bulk prices created for medico', {
                component: 'listino-prezzo-service',
                action: 'bulkCreateForMedico',
                medicoId,
                createdCount: results.created.length,
                errorCount: results.errors.length,
                tenantId
            });

            return results;
        } catch (error) {
            logger.error('Failed to bulk create prices for medico', {
                component: 'listino-prezzo-service',
                action: 'bulkCreateForMedico',
                error: error.message,
                medicoId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get listini for a bundle
     * @param {string} bundleId - Bundle ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Listini for the bundle
     */
    static async getByBundle(bundleId, tenantId) {
        try {
            const listini = await prisma.listinoPrezzo.findMany({
                where: {
                    bundleId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    bundle: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            prezzoBundle: true,
                            durataBundle: true
                        }
                    },
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    convenzione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true,
                            attiva: true
                        }
                    },
                    poliambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true
                        }
                    }
                },
                orderBy: [
                    { priorita: 'desc' },
                    { createdAt: 'desc' }
                ]
            });

            logger.info('Retrieved listini by bundle', {
                component: 'listino-prezzo-service',
                action: 'getByBundle',
                bundleId,
                count: listini.length,
                tenantId
            });

            return listini;
        } catch (error) {
            logger.error('Failed to get listini by bundle', {
                component: 'listino-prezzo-service',
                action: 'getByBundle',
                error: error.message,
                bundleId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Create listino for a bundle
     * @param {Object} data - Listino data with bundleId
     * @returns {Promise<Object>} Created listino
     */
    static async createForBundle(data) {
        try {
            const { tenantId, createdBy } = data;

            // Verify bundle exists and belongs to tenant
            const bundle = await prisma.offertaBundle.findFirst({
                where: {
                    id: data.bundleId,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!bundle) {
                throw new Error('Bundle not found');
            }

            // If medicoId provided, verify it exists
            if (data.medicoId) {
                const medico = await prisma.person.findFirst({
                    where: {
                        id: data.medicoId,
                        deletedAt: null,
                        personRoles: {
                            some: {
                                roleType: 'MEDICO',
                                tenantId,
                                isActive: true,
                                deletedAt: null
                            }
                        }
                    }
                });
                if (!medico) {
                    throw new Error('Medico not found or not enabled for this tenant');
                }
            }

            // Check for overlapping validity periods for same bundle/medico/convenzione
            const overlapping = await prisma.listinoPrezzo.findFirst({
                where: {
                    tenantId,
                    bundleId: data.bundleId,
                    medicoId: data.medicoId || null,
                    convenzioneId: data.convenzioneId || null,
                    poliambulatorioId: data.poliambulatorioId || null,
                    deletedAt: null,
                    AND: [
                        { validoDa: { lte: data.validoA || new Date('2099-12-31') } },
                        {
                            OR: [
                                { validoA: null },
                                { validoA: { gte: data.validoDa || new Date() } }
                            ]
                        }
                    ]
                }
            });

            if (overlapping) {
                throw new Error('Esiste già un listino per questa configurazione medico/bundle nello stesso periodo');
            }

            // Build create data
            const createData = {
                bundleId: data.bundleId,
                prezzo: data.prezzo,
                tenantId,
                createdBy,
                // Optional fields
                ...(data.poliambulatorioId && { poliambulatorioId: data.poliambulatorioId }),
                ...(data.convenzioneId && { convenzioneId: data.convenzioneId }),
                ...(data.medicoId && { medicoId: data.medicoId }),
                ...(data.codice && { codice: data.codice }),
                ...(data.nome && { nome: data.nome }),
                ...(data.descrizione && { descrizione: data.descrizione }),
                ...(data.durataMedico !== undefined && { durataMedico: data.durataMedico }),
                ...(data.ivaAliquota !== undefined && { ivaAliquota: data.ivaAliquota }),
                ...(data.scontoPercentuale !== undefined && { scontoPercentuale: data.scontoPercentuale }),
                ...(data.compensoMedicoTipo && { compensoMedicoTipo: data.compensoMedicoTipo }),
                ...(data.compensoMedicoValore !== undefined && { compensoMedicoValore: data.compensoMedicoValore }),
                ...(data.compensoMedicoMinimo !== undefined && { compensoMedicoMinimo: data.compensoMedicoMinimo }),
                ...(data.compensoMedicoMassimo !== undefined && { compensoMedicoMassimo: data.compensoMedicoMassimo }),
                ...(data.attivo !== undefined && { attivo: data.attivo }),
                ...(data.validoDa && { validoDa: new Date(data.validoDa) }),
                ...(data.validoA && { validoA: new Date(data.validoA) }),
                ...(data.priorita !== undefined && { priorita: data.priorita })
            };

            const listino = await prisma.listinoPrezzo.create({
                data: createData,
                include: {
                    bundle: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true
                        }
                    },
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    convenzione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true
                        }
                    },
                    poliambulatorio: {
                        select: {
                            id: true,
                            nome: true
                        }
                    }
                }
            });

            logger.info('Listino prezzo for bundle created', {
                component: 'listino-prezzo-service',
                action: 'createForBundle',
                listinoId: listino.id,
                bundleId: data.bundleId,
                medicoId: data.medicoId,
                tenantId
            });

            return listino;
        } catch (error) {
            logger.error('Failed to create listino prezzo for bundle', {
                component: 'listino-prezzo-service',
                action: 'createForBundle',
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

export default ListinoPrezzoService;
