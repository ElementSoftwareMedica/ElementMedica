/**
 * Prestazione Service
 * Business logic for medical services/procedures management
 * 
 * @module services/clinical/PrestazioneService
 * @updated Project 45 - Added branch-aware support
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { BRANCH_TYPES } from '../../utils/branchHelper.js';

// Default branch for this entity
const DEFAULT_BRANCH = BRANCH_TYPES.MEDICA;

export class PrestazioneService {
    /**
     * Create a new prestazione
     * @param {Object} data - Prestazione data
     * @param {string} tenantId - Tenant ID
     * @param {string} branchType - Branch type (default: MEDICA)
     * @returns {Promise<Object>} Created prestazione
     */
    static async create(data, tenantId, branchType = DEFAULT_BRANCH) {
        try {
            // Extract tipologieRichieste if provided
            const { tipologieRichieste, ...prestazioneData } = data;

            const prestazione = await prisma.$transaction(async (tx) => {
                // Create prestazione with branchType
                const created = await tx.prestazione.create({
                    data: {
                        ...prestazioneData,
                        tenantId,
                        branchType, // Project 45: Add branchType
                    }
                });

                // Create tipologie richieste if provided
                if (tipologieRichieste && tipologieRichieste.length > 0) {
                    await tx.prestazioneTipologiaStrumento.createMany({
                        data: tipologieRichieste.map(t => ({
                            prestazioneId: created.id,
                            tipologia: t.tipologia,
                            // Support both "isObbligatorio" and "obbligatorio" from frontend
                            isObbligatorio: t.isObbligatorio ?? t.obbligatorio ?? true,
                            quantitaMinima: t.quantitaMinima ?? 1,
                            note: t.note,
                            tenantId
                        }))
                    });
                }

                // Return with relations
                return tx.prestazione.findFirst({
                    where: { id: created.id },
                    include: {
                        listiniPrezzo: {
                            where: { deletedAt: null, attivo: true },
                            orderBy: { validoDa: 'desc' }
                        },
                        ambulatori: {
                            where: { attivo: true, deletedAt: null },
                            include: {
                                ambulatorio: {
                                    select: { id: true, nome: true, codice: true }
                                }
                            }
                        },
                        tipologieRichieste: {
                            where: { deletedAt: null }
                        }
                    }
                });
            });

            logger.info('Prestazione created', {
                component: 'prestazione-service',
                action: 'create',
                prestazioneId: prestazione.id,
                codice: prestazione.codice,
                tipologieCount: tipologieRichieste?.length ?? 0,
                tenantId,
                branchType,
            });

            return prestazione;
        } catch (error) {
            logger.error('Failed to create prestazione', {
                component: 'prestazione-service',
                action: 'create',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get prestazione by ID
     * @param {string} id - Prestazione ID
     * @param {string} tenantId - Tenant ID
     * @param {string} branchType - Branch type (optional for backward compatibility)
     * @returns {Promise<Object|null>} Prestazione or null
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

            const prestazione = await prisma.prestazione.findFirst({
                where,
                include: {
                    listiniPrezzo: {
                        where: { deletedAt: null, attivo: true },
                        orderBy: { validoDa: 'desc' }
                    },
                    ambulatori: {
                        where: { attivo: true, deletedAt: null },
                        include: {
                            ambulatorio: {
                                select: {
                                    id: true,
                                    nome: true,
                                    codice: true,
                                    specializzazione: true,
                                    poliambulatorio: {
                                        select: { id: true, nome: true }
                                    }
                                }
                            }
                        }
                    },
                    tipologieRichieste: {
                        where: { deletedAt: null },
                        orderBy: { tipologia: 'asc' }
                    }
                }
            });

            return prestazione;
        } catch (error) {
            logger.error('Failed to get prestazione', {
                component: 'prestazione-service',
                action: 'getById',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all prestazioni for tenant
     * @param {string} tenantId - Primary tenant ID (fallback)
     * @param {Object} options - Query options
     * @param {string} branchType - Branch type (optional for backward compatibility)
     * @param {string} options.tenantIds - Comma-separated list of tenant IDs (multi-tenant support)
     * @param {boolean} options.allTenants - If true and accessibleTenantIds provided, show all
     * @param {string[]} options.accessibleTenantIds - Array of tenant IDs the user can access
     * @returns {Promise<Object>} Prestazioni with pagination
     */
    static async getAll(tenantId, options = {}, branchType = null) {
        try {
            const {
                page = 1,
                limit = 20,
                search = '',
                tipo = null,
                attivo = true,
                orderBy = 'nome',
                orderDir = 'asc',
                tenantIds = null,
                allTenants = false,
                accessibleTenantIds = []
            } = options;

            const skip = (page - 1) * limit;

            // Determine tenant filter based on user's access (multi-tenant support)
            let tenantFilter = {};

            if (tenantIds) {
                // Handle both array and comma-separated string formats
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
                ...(attivo !== undefined && { attivo }),
                ...(tipo && { tipo }),
                // P45: branchType filter - il modello ha branchType con default MEDICA, non serve filtro legacy
                ...(branchType && { branchType }),
                ...(search && {
                    OR: [
                        { nome: { contains: search, mode: 'insensitive' } },
                        { codice: { contains: search, mode: 'insensitive' } },
                        { descrizione: { contains: search, mode: 'insensitive' } }
                    ]
                })
            };

            const [prestazioni, total] = await Promise.all([
                prisma.prestazione.findMany({
                    where,
                    include: {
                        _count: {
                            select: {
                                listiniPrezzo: true,
                                ambulatori: true
                            }
                        }
                    },
                    orderBy: { [orderBy]: orderDir },
                    skip,
                    take: limit
                }),
                prisma.prestazione.count({ where })
            ]);

            return {
                data: prestazioni,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Failed to get prestazioni', {
                component: 'prestazione-service',
                action: 'getAll',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get prestazioni by tipo
     * @param {string} tipo - Tipo prestazione
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Prestazioni list
     */
    static async getByTipo(tipo, tenantId) {
        try {
            const prestazioni = await prisma.prestazione.findMany({
                where: {
                    tenantId,
                    tipo,
                    deletedAt: null,
                    attivo: true
                },
                orderBy: { nome: 'asc' }
            });

            return prestazioni;
        } catch (error) {
            logger.error('Failed to get prestazioni by tipo', {
                component: 'prestazione-service',
                action: 'getByTipo',
                error: error.message,
                tipo,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get prestazioni by ambulatorio
     * @param {string} ambulatorioId - Ambulatorio ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Prestazioni list
     */
    static async getByAmbulatorio(ambulatorioId, tenantId) {
        try {
            const associations = await prisma.ambulatorioPrestazione.findMany({
                where: {
                    ambulatorioId,
                    attivo: true,
                    deletedAt: null,
                    prestazione: {
                        tenantId,
                        deletedAt: null,
                        attivo: true
                    }
                },
                include: {
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true,
                            durataPrevista: true,
                            richiedeStrumento: true
                        }
                    }
                }
            });

            return associations.map(a => a.prestazione);
        } catch (error) {
            logger.error('Failed to get prestazioni by ambulatorio', {
                component: 'prestazione-service',
                action: 'getByAmbulatorio',
                error: error.message,
                ambulatorioId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update prestazione
     * @param {string} id - Prestazione ID
     * @param {Object} data - Update data
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Updated prestazione
     */
    static async update(id, data, tenantId) {
        try {
            const existing = await prisma.prestazione.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Prestazione not found');
            }

            // Extract tipologieRichieste if provided
            const { tipologieRichieste, ...prestazioneData } = data;

            const updated = await prisma.$transaction(async (tx) => {
                // Update prestazione
                await tx.prestazione.update({
                    where: { id },
                    data: {
                        ...prestazioneData,
                        updatedAt: new Date()
                    }
                });

                // Update tipologie if provided
                if (tipologieRichieste !== undefined) {
                    // HARD DELETE existing tipologie (they are configuration data, not PII)
                    // This avoids unique constraint violation on (prestazioneId, tipologia)
                    await tx.prestazioneTipologiaStrumento.deleteMany({
                        where: { prestazioneId: id }
                    });

                    // Create new tipologie
                    if (tipologieRichieste && tipologieRichieste.length > 0) {
                        await tx.prestazioneTipologiaStrumento.createMany({
                            data: tipologieRichieste.map(t => ({
                                prestazioneId: id,
                                tipologia: t.tipologia,
                                // Support both "isObbligatorio" and "obbligatorio" from frontend
                                isObbligatorio: t.isObbligatorio ?? t.obbligatorio ?? true,
                                quantitaMinima: t.quantitaMinima ?? 1,
                                note: t.note,
                                tenantId
                            }))
                        });
                    }
                }

                // Return with relations
                return tx.prestazione.findFirst({
                    where: { id },
                    include: {
                        listiniPrezzo: {
                            where: { deletedAt: null, attivo: true },
                            orderBy: { validoDa: 'desc' }
                        },
                        ambulatori: {
                            where: { attivo: true, deletedAt: null },
                            include: {
                                ambulatorio: {
                                    select: { id: true, nome: true }
                                }
                            }
                        },
                        tipologieRichieste: {
                            where: { deletedAt: null }
                        }
                    }
                });
            });

            logger.info('Prestazione updated', {
                component: 'prestazione-service',
                action: 'update',
                prestazioneId: id,
                tipologieUpdated: tipologieRichieste !== undefined,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to update prestazione', {
                component: 'prestazione-service',
                action: 'update',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete prestazione
     * @param {string} id - Prestazione ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Success status
     */
    static async delete(id, tenantId) {
        try {
            const existing = await prisma.prestazione.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Prestazione not found');
            }

            // Check for future appointments using this prestazione
            const futureAppointments = await prisma.appuntamento.count({
                where: {
                    prestazioneId: id,
                    dataOra: { gte: new Date() },
                    stato: { notIn: ['ANNULLATO', 'COMPLETATO'] },
                    deletedAt: null
                }
            });

            if (futureAppointments > 0) {
                throw new Error(`Cannot delete prestazione with ${futureAppointments} pending appointments`);
            }

            // Soft delete with cascade to associations
            await prisma.$transaction([
                prisma.prestazione.update({
                    where: { id },
                    data: { deletedAt: new Date() }
                }),
                prisma.ambulatorioPrestazione.updateMany({
                    where: { prestazioneId: id },
                    data: { attivo: false, deletedAt: new Date() }
                }),
                prisma.listinoPrezzo.updateMany({
                    where: { prestazioneId: id },
                    data: { deletedAt: new Date() }
                })
            ]);

            logger.info('Prestazione deleted', {
                component: 'prestazione-service',
                action: 'delete',
                prestazioneId: id,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('Failed to delete prestazione', {
                component: 'prestazione-service',
                action: 'delete',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get pricing for a prestazione
     * @param {string} prestazioneId - Prestazione ID
     * @param {string} tenantId - Tenant ID
     * @param {string} tipo - Tipo listino (optional)
     * @returns {Promise<Array>} Pricing list
     */
    static async getPricing(prestazioneId, tenantId, tipo = null) {
        try {
            const today = new Date();

            const where = {
                prestazioneId,
                tenantId,
                deletedAt: null,
                attivo: true,
                validoDa: { lte: today },
                OR: [
                    { validoA: null },
                    { validoA: { gte: today } }
                ]
            };

            const pricing = await prisma.listinoPrezzo.findMany({
                where,
                orderBy: [
                    { validoDa: 'desc' }
                ]
            });

            return pricing;
        } catch (error) {
            logger.error('Failed to get prestazione pricing', {
                component: 'prestazione-service',
                action: 'getPricing',
                error: error.message,
                prestazioneId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get types list (enum values with counts)
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Types with counts
     */
    static async getTypes(tenantId) {
        try {
            const types = await prisma.prestazione.groupBy({
                by: ['tipo'],
                where: {
                    tenantId,
                    deletedAt: null
                },
                _count: {
                    tipo: true
                }
            });

            return types.map(t => ({
                tipo: t.tipo,
                count: t._count.tipo
            }));
        } catch (error) {
            logger.error('Failed to get prestazione types', {
                component: 'prestazione-service',
                action: 'getTypes',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Search prestazioni by codice nazionale
     * @param {string} codiceNazionale - National code
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Matching prestazioni
     */
    static async searchByNationalCode(codiceNazionale, tenantId) {
        try {
            const prestazioni = await prisma.prestazione.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    codiceNazionale: {
                        contains: codiceNazionale,
                        mode: 'insensitive'
                    }
                },
                select: {
                    id: true,
                    codice: true,
                    codiceNazionale: true,
                    nome: true,
                    tipo: true,
                    durataPrevista: true
                },
                orderBy: { codiceNazionale: 'asc' },
                take: 20
            });

            return prestazioni;
        } catch (error) {
            logger.error('Failed to search prestazioni by national code', {
                component: 'prestazione-service',
                action: 'searchByNationalCode',
                error: error.message,
                codiceNazionale,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get prestazione statistics
     * @param {string} prestazioneId - Prestazione ID
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Date range options
     * @returns {Promise<Object>} Statistics
     */
    static async getStatistics(prestazioneId, tenantId, options = {}) {
        try {
            const { startDate, endDate } = options;

            const dateFilter = {};
            if (startDate) dateFilter.gte = new Date(startDate);
            if (endDate) dateFilter.lte = new Date(endDate);

            const whereBase = {
                prestazioneId,
                tenantId,
                deletedAt: null
            };

            if (Object.keys(dateFilter).length > 0) {
                whereBase.dataOra = dateFilter;
            }

            const [
                totalAppuntamenti,
                completati,
                annullati,
                ambulatoriCount
            ] = await Promise.all([
                prisma.appuntamento.count({
                    where: whereBase
                }),
                prisma.appuntamento.count({
                    where: { ...whereBase, stato: 'COMPLETATO' }
                }),
                prisma.appuntamento.count({
                    where: { ...whereBase, stato: 'ANNULLATO' }
                }),
                prisma.ambulatorioPrestazione.count({
                    where: {
                        prestazioneId,
                        attivo: true,
                        deletedAt: null
                    }
                })
            ]);

            return {
                prestazioneId,
                period: { startDate, endDate },
                totalAppuntamenti,
                completati,
                annullati,
                percentualeCompletamento: totalAppuntamenti > 0
                    ? Math.round((completati / totalAppuntamenti) * 100)
                    : 0,
                percentualeAnnullamento: totalAppuntamenti > 0
                    ? Math.round((annullati / totalAppuntamenti) * 100)
                    : 0,
                ambulatoriCount: ambulatoriCount
            };
        } catch (error) {
            logger.error('Failed to get prestazione statistics', {
                component: 'prestazione-service',
                action: 'getStatistics',
                error: error.message,
                prestazioneId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get medici abilitati per una prestazione
     * Trova i medici che lavorano negli ambulatori dove la prestazione è abilitata
     * @param {string} prestazioneId - Prestazione ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Lista medici abilitati con dati di abilitazione
     */
    static async getMediciAbilitati(prestazioneId, tenantId) {
        try {
            // Recupera i medici abilitati con tutti i dati di abilitazione
            const mediciAbilitati = await prisma.medicoAbilitato.findMany({
                where: {
                    prestazioneId,
                    attivo: true,
                    deletedAt: null,
                    tenantId
                },
                include: {
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true,
                            tenantProfiles: {
                                where: { tenantId, deletedAt: null },
                                select: {
                                    email: true,
                                    registerCode: true,
                                    specialties: true
                                }
                            }
                        }
                    }
                }
            });

            // Trasforma in formato più utilizzabile con flatten dei tenantProfiles
            return mediciAbilitati.map(abilitazione => {
                const profile = abilitazione.medico?.tenantProfiles?.[0] || {};
                return {
                    id: abilitazione.id,
                    medicoId: abilitazione.medicoId,
                    prestazioneId: abilitazione.prestazioneId,
                    attivo: abilitazione.attivo,
                    dataAbilitazione: abilitazione.dataAbilitazione,
                    durataMedico: abilitazione.durataMedico,
                    compensoTipo: abilitazione.compensoTipo,
                    compensoValore: Number(abilitazione.compensoValore),
                    compensoMinimo: abilitazione.compensoMinimo ? Number(abilitazione.compensoMinimo) : null,
                    compensoMassimo: abilitazione.compensoMassimo ? Number(abilitazione.compensoMassimo) : null,
                    note: abilitazione.note,
                    medico: {
                        id: abilitazione.medico?.id,
                        firstName: abilitazione.medico?.firstName,
                        lastName: abilitazione.medico?.lastName,
                        taxCode: abilitazione.medico?.taxCode,
                        email: profile.email || null,
                        registerCode: profile.registerCode || null,
                        specialties: profile.specialties || []
                    }
                };
            });
        } catch (error) {
            logger.error('Failed to get medici abilitati', {
                component: 'prestazione-service',
                action: 'getMediciAbilitati',
                error: error.message,
                prestazioneId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get prestazioni per medico
     * Trova le prestazioni che il medico può eseguire basandosi sugli ambulatori
     * @param {string} medicoId - Medico ID
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Opzioni filtro
     * @returns {Promise<Array>} Lista prestazioni
     */
    static async getPrestazioniPerMedico(medicoId, tenantId, options = {}) {
        try {
            const { tipo, attivo = true } = options;

            // Trova le prestazioni per cui il medico è abilitato
            const medicoAbilitazioni = await prisma.medicoAbilitato.findMany({
                where: {
                    tenantId,
                    medicoId,
                    attivo: true,
                    deletedAt: null
                },
                select: { prestazioneId: true },
                distinct: ['prestazioneId']
            });

            const prestazioneIds = medicoAbilitazioni.map(m => m.prestazioneId);

            if (prestazioneIds.length === 0) {
                return [];
            }

            // Trova le prestazioni 
            const whereClause = {
                tenantId,
                deletedAt: null,
                id: { in: prestazioneIds }
            };

            if (attivo !== undefined) {
                whereClause.attivo = attivo;
            }

            if (tipo) {
                whereClause.tipo = tipo;
            }

            const prestazioni = await prisma.prestazione.findMany({
                where: whereClause,
                include: {
                    ambulatori: {
                        where: {
                            attivo: true,
                            deletedAt: null
                        },
                        include: {
                            ambulatorio: {
                                select: { id: true, nome: true, codice: true }
                            }
                        }
                    }
                },
                orderBy: { nome: 'asc' }
            });

            return prestazioni;
        } catch (error) {
            logger.error('Failed to get prestazioni per medico', {
                component: 'prestazione-service',
                action: 'getPrestazioniPerMedico',
                error: error.message,
                medicoId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Verifica se un medico può eseguire una prestazione
     * @param {string} medicoId - Medico ID
     * @param {string} prestazioneId - Prestazione ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} { canPerform: boolean, ambulatori: Array }
     */
    static async canMedicoPerformPrestazione(medicoId, prestazioneId, tenantId) {
        try {
            // Verifica se il medico è abilitato per questa prestazione
            const abilitazione = await prisma.medicoAbilitato.findFirst({
                where: {
                    medicoId,
                    prestazioneId,
                    attivo: true,
                    deletedAt: null,
                    tenantId
                }
            });

            if (!abilitazione) {
                return { canPerform: false, ambulatori: [] };
            }

            // Trova gli ambulatori dove la prestazione è abilitata
            const ambulatoriPrestazione = await prisma.ambulatorioPrestazione.findMany({
                where: {
                    prestazioneId,
                    attivo: true,
                    deletedAt: null
                },
                select: { ambulatorioId: true }
            });

            const ambulatorioIds = ambulatoriPrestazione.map(a => a.ambulatorioId);

            if (ambulatorioIds.length === 0) {
                return { canPerform: true, ambulatori: [] };
            }

            // Recupera dettagli ambulatori
            const ambulatoriDetails = await prisma.ambulatorio.findMany({
                where: {
                    id: { in: ambulatorioIds },
                    deletedAt: null,
                    stato: 'ATTIVO'
                },
                select: {
                    id: true,
                    nome: true,
                    codice: true,
                    specializzazione: true
                }
            });

            return {
                canPerform: true,
                ambulatori: ambulatoriDetails
            };
        } catch (error) {
            logger.error('Failed to check medico can perform prestazione', {
                component: 'prestazione-service',
                action: 'canMedicoPerformPrestazione',
                error: error.message,
                medicoId,
                prestazioneId,
                tenantId
            });
            throw error;
        }
    }

    // ============================================
    // TIPOLOGIE STRUMENTI - Gestione requisiti
    // ============================================

    /**
     * Get tipologie richieste for a prestazione
     * @param {string} prestazioneId - Prestazione ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Tipologie richieste
     */
    static async getTipologieRichieste(prestazioneId, tenantId) {
        try {
            const tipologie = await prisma.prestazioneTipologiaStrumento.findMany({
                where: {
                    prestazioneId,
                    tenantId,
                    deletedAt: null
                },
                orderBy: { tipologia: 'asc' }
            });

            return tipologie;
        } catch (error) {
            logger.error('Failed to get tipologie richieste', {
                component: 'prestazione-service',
                action: 'getTipologieRichieste',
                error: error.message,
                prestazioneId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Add a tipologia requirement to a prestazione
     * @param {string} prestazioneId - Prestazione ID
     * @param {Object} tipologiaData - Tipologia data
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Created tipologia requirement
     */
    static async addTipologiaRichiesta(prestazioneId, tipologiaData, tenantId) {
        try {
            const { tipologia, isObbligatorio = true, quantitaMinima = 1, note } = tipologiaData;

            // Check if already exists
            const existing = await prisma.prestazioneTipologiaStrumento.findFirst({
                where: {
                    prestazioneId,
                    tipologia,
                    deletedAt: null
                }
            });

            if (existing) {
                throw new Error(`Tipologia ${tipologia} già presente per questa prestazione`);
            }

            const created = await prisma.prestazioneTipologiaStrumento.create({
                data: {
                    prestazioneId,
                    tipologia,
                    isObbligatorio,
                    quantitaMinima,
                    note,
                    tenantId
                }
            });

            logger.info('Tipologia richiesta added', {
                component: 'prestazione-service',
                action: 'addTipologiaRichiesta',
                prestazioneId,
                tipologia,
                tenantId
            });

            return created;
        } catch (error) {
            logger.error('Failed to add tipologia richiesta', {
                component: 'prestazione-service',
                action: 'addTipologiaRichiesta',
                error: error.message,
                prestazioneId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Remove a tipologia requirement from a prestazione
     * @param {string} prestazioneId - Prestazione ID
     * @param {string} tipologia - TipologiaStrumento value
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Success status
     */
    static async removeTipologiaRichiesta(prestazioneId, tipologia, tenantId) {
        try {
            const result = await prisma.prestazioneTipologiaStrumento.updateMany({
                where: {
                    prestazioneId,
                    tipologia,
                    tenantId,
                    deletedAt: null
                },
                data: { deletedAt: new Date() }
            });

            logger.info('Tipologia richiesta removed', {
                component: 'prestazione-service',
                action: 'removeTipologiaRichiesta',
                prestazioneId,
                tipologia,
                count: result.count,
                tenantId
            });

            return { success: true, count: result.count };
        } catch (error) {
            logger.error('Failed to remove tipologia richiesta', {
                component: 'prestazione-service',
                action: 'removeTipologiaRichiesta',
                error: error.message,
                prestazioneId,
                tipologia,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Check if an ambulatorio has all required tipologie for a prestazione
     * @param {string} prestazioneId - Prestazione ID
     * @param {string} ambulatorioId - Ambulatorio ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Availability result
     */
    static async checkTipologieDisponibili(prestazioneId, ambulatorioId, tenantId) {
        try {
            // Get required tipologie
            const tipologieRichieste = await prisma.prestazioneTipologiaStrumento.findMany({
                where: {
                    prestazioneId,
                    tenantId,
                    deletedAt: null,
                    isObbligatorio: true
                }
            });

            if (tipologieRichieste.length === 0) {
                return { disponibile: true, tipologieMancanti: [] };
            }

            // Check availability for each tipologia
            const checks = await Promise.all(
                tipologieRichieste.map(async (t) => {
                    const count = await prisma.strumento.count({
                        where: {
                            tipologia: t.tipologia,
                            tenantId,
                            deletedAt: null,
                            stato: 'ATTIVO',
                            OR: [
                                { ambulatorioId },
                                {
                                    ambulatoriAssegnati: {
                                        some: { ambulatorioId, deletedAt: null }
                                    }
                                }
                            ]
                        }
                    });

                    return {
                        tipologia: t.tipologia,
                        richiesta: t.quantitaMinima,
                        disponibile: count,
                        sufficiente: count >= t.quantitaMinima
                    };
                })
            );

            const tipologieMancanti = checks.filter(c => !c.sufficiente);

            return {
                disponibile: tipologieMancanti.length === 0,
                tipologieRichieste: checks,
                tipologieMancanti: tipologieMancanti.map(t => t.tipologia)
            };
        } catch (error) {
            logger.error('Failed to check tipologie disponibili', {
                component: 'prestazione-service',
                action: 'checkTipologieDisponibili',
                error: error.message,
                prestazioneId,
                ambulatorioId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get prestazioni by tipologia richiesta
     * @param {string} tipologia - TipologiaStrumento
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Prestazioni that require the given tipologia
     */
    static async getByTipologiaRichiesta(tipologia, tenantId) {
        try {
            const associations = await prisma.prestazioneTipologiaStrumento.findMany({
                where: {
                    tipologia,
                    tenantId,
                    deletedAt: null,
                    prestazione: {
                        deletedAt: null,
                        attivo: true
                    }
                },
                include: {
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true,
                            durataPrevista: true,
                            prezzoBase: true
                        }
                    }
                }
            });

            return associations.map(a => ({
                ...a.prestazione,
                isObbligatorio: a.isObbligatorio,
                quantitaMinima: a.quantitaMinima
            }));
        } catch (error) {
            logger.error('Failed to get prestazioni by tipologia richiesta', {
                component: 'prestazione-service',
                action: 'getByTipologiaRichiesta',
                error: error.message,
                tipologia,
                tenantId
            });
            throw error;
        }
    }
}

export default PrestazioneService;
