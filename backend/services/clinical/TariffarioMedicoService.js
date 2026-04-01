/**
 * TariffarioMedico Service
 * Gestisce le configurazioni tariffarie di default per medico
 * 
 * Questo servizio permette di:
 * - Definire compensi default per ogni medico
 * - Specificare tariffe per branca specialistica
 * - Specificare tariffe per convenzione
 * - Applicare automaticamente questi default quando si crea un ListinoPrezzo
 * 
 * @module services/clinical/TariffarioMedicoService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

export class TariffarioMedicoService {
    /**
     * Crea una nuova configurazione tariffaria per un medico
     * @param {Object} data - Dati del tariffario
     * @returns {Promise<Object>} Tariffario creato
     */
    static async create(data) {
        try {
            const { tenantId, createdBy } = data;

            // Verifico che il medico esista e abbia ruolo MEDICO
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
                throw new Error('Medico non trovato o non abilitato per questo tenant');
            }

            // Verifico convenzione se specificata
            if (data.convenzioneId) {
                const convenzione = await prisma.convenzione.findFirst({
                    where: {
                        id: data.convenzioneId,
                        tenantId,
                        deletedAt: null
                    }
                });
                if (!convenzione) {
                    throw new Error('Convenzione non trovata');
                }
            }

            // Verifico che non esista già un tariffario con stessa combinazione
            const existing = await prisma.tariffarioMedico.findFirst({
                where: {
                    medicoId: data.medicoId,
                    tenantId,
                    brancaSpecialistica: data.brancaSpecialistica || null,
                    convenzioneId: data.convenzioneId || null,
                    deletedAt: null,
                    attivo: true
                }
            });

            if (existing) {
                throw new Error('Esiste già un tariffario attivo per questa combinazione medico/branca/convenzione');
            }

            const tariffario = await prisma.tariffarioMedico.create({
                data: {
                    medicoId: data.medicoId,
                    compensoMedicoTipo: data.compensoMedicoTipo || 'PERCENTUALE',
                    compensoMedicoValore: data.compensoMedicoValore,
                    compensoMedicoMinimo: data.compensoMedicoMinimo,
                    compensoMedicoMassimo: data.compensoMedicoMassimo,
                    brancaSpecialistica: data.brancaSpecialistica,
                    convenzioneId: data.convenzioneId,
                    note: data.note,
                    attivo: data.attivo !== undefined ? data.attivo : true,
                    validoDa: data.validoDa ? new Date(data.validoDa) : new Date(),
                    validoA: data.validoA ? new Date(data.validoA) : null,
                    tenantId,
                    createdBy
                },
                include: {
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true,
                            tenantProfiles: {
                                where: { deletedAt: null, isActive: true },
                                select: { specialties: true, isPrimary: true },
                                take: 1
                            }
                        }
                    },
                    convenzione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true
                        }
                    }
                }
            });

            logger.info('Tariffario medico creato', {
                component: 'tariffario-medico-service',
                action: 'create',
                tariffarioId: tariffario.id,
                medicoId: data.medicoId,
                tenantId
            });

            return tariffario;
        } catch (error) {
            logger.error('Errore creazione tariffario medico', {
                component: 'tariffario-medico-service',
                action: 'create',
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Ottiene tutti i tariffari per un medico
     * @param {string} medicoId - ID del medico
     * @param {string} tenantId - ID del tenant
     * @returns {Promise<Array>} Lista tariffari
     */
    static async getByMedico(medicoId, tenantId) {
        try {
            const tariffari = await prisma.tariffarioMedico.findMany({
                where: {
                    medicoId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    convenzione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true
                        }
                    }
                },
                orderBy: [
                    { brancaSpecialistica: 'asc' },
                    { convenzioneId: 'asc' }
                ]
            });

            return tariffari;
        } catch (error) {
            logger.error('Errore recupero tariffari medico', {
                component: 'tariffario-medico-service',
                action: 'getByMedico',
                error: error.message,
                medicoId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Ottiene il tariffario effettivo per una specifica combinazione
     * Segue priorità: medico+branca+convenzione > medico+branca > medico+convenzione > medico
     * 
     * @param {Object} params - Parametri di ricerca
     * @returns {Promise<Object|null>} Tariffario trovato o null
     */
    static async getEffective({ medicoId, tenantId, brancaSpecialistica = null, convenzioneId = null }) {
        try {
            const today = new Date();

            // Costruisco condizioni con priorità decrescente
            const candidates = await prisma.tariffarioMedico.findMany({
                where: {
                    medicoId,
                    tenantId,
                    deletedAt: null,
                    attivo: true,
                    validoDa: { lte: today },
                    OR: [
                        { validoA: null },
                        { validoA: { gte: today } }
                    ]
                },
                include: {
                    convenzione: {
                        select: { id: true, codice: true, nome: true }
                    }
                }
            });

            if (candidates.length === 0) {
                return null;
            }

            // Ordino per priorità (match più specifico prima)
            const scored = candidates.map(t => {
                let score = 0;

                // Match esatto branca
                if (brancaSpecialistica && t.brancaSpecialistica === brancaSpecialistica) {
                    score += 10;
                } else if (t.brancaSpecialistica === null) {
                    score += 1; // Default per tutte le branche
                } else if (brancaSpecialistica && t.brancaSpecialistica !== brancaSpecialistica) {
                    score = -100; // Non applicabile
                }

                // Match esatto convenzione
                if (convenzioneId && t.convenzioneId === convenzioneId) {
                    score += 10;
                } else if (t.convenzioneId === null) {
                    score += 1; // Default per tutte le convenzioni
                } else if (convenzioneId && t.convenzioneId !== convenzioneId) {
                    score = -100; // Non applicabile
                }

                return { tariffario: t, score };
            });

            // Filtro e ordino
            const applicable = scored
                .filter(s => s.score >= 0)
                .sort((a, b) => b.score - a.score);

            if (applicable.length === 0) {
                return null;
            }

            return applicable[0].tariffario;
        } catch (error) {
            logger.error('Errore recupero tariffario effettivo', {
                component: 'tariffario-medico-service',
                action: 'getEffective',
                error: error.message,
                medicoId,
                brancaSpecialistica,
                convenzioneId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Aggiorna un tariffario
     * @param {string} id - ID del tariffario
     * @param {string} tenantId - ID del tenant
     * @param {Object} data - Dati da aggiornare
     * @returns {Promise<Object>} Tariffario aggiornato
     */
    static async update(id, tenantId, data) {
        try {
            const existing = await prisma.tariffarioMedico.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Tariffario non trovato');
            }

            const updated = await prisma.tariffarioMedico.update({
                where: { id },
                data: {
                    ...(data.compensoMedicoTipo !== undefined && { compensoMedicoTipo: data.compensoMedicoTipo }),
                    ...(data.compensoMedicoValore !== undefined && { compensoMedicoValore: data.compensoMedicoValore }),
                    ...(data.compensoMedicoMinimo !== undefined && { compensoMedicoMinimo: data.compensoMedicoMinimo }),
                    ...(data.compensoMedicoMassimo !== undefined && { compensoMedicoMassimo: data.compensoMedicoMassimo }),
                    ...(data.brancaSpecialistica !== undefined && { brancaSpecialistica: data.brancaSpecialistica }),
                    ...(data.note !== undefined && { note: data.note }),
                    ...(data.attivo !== undefined && { attivo: data.attivo }),
                    ...(data.validoDa && { validoDa: new Date(data.validoDa) }),
                    ...(data.validoA && { validoA: new Date(data.validoA) })
                },
                include: {
                    medico: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    convenzione: {
                        select: { id: true, codice: true, nome: true }
                    }
                }
            });

            logger.info('Tariffario medico aggiornato', {
                component: 'tariffario-medico-service',
                action: 'update',
                tariffarioId: id,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Errore aggiornamento tariffario medico', {
                component: 'tariffario-medico-service',
                action: 'update',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Elimina (soft delete) un tariffario
     * @param {string} id - ID del tariffario
     * @param {string} tenantId - ID del tenant
     * @returns {Promise<Object>} Risultato
     */
    static async delete(id, tenantId) {
        try {
            const existing = await prisma.tariffarioMedico.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Tariffario non trovato');
            }

            await prisma.tariffarioMedico.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            logger.info('Tariffario medico eliminato', {
                component: 'tariffario-medico-service',
                action: 'delete',
                tariffarioId: id,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('Errore eliminazione tariffario medico', {
                component: 'tariffario-medico-service',
                action: 'delete',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Ottiene tutti i tariffari per tenant con paginazione
     * @param {string} tenantId - Primary tenant ID (fallback)
     * @param {Object} options - Opzioni di query
     * @param {string} options.tenantIds - Comma-separated list of tenant IDs (multi-tenant support)
     * @param {boolean} options.allTenants - If true and accessibleTenantIds provided, show all
     * @param {string[]} options.accessibleTenantIds - Array of tenant IDs the user can access
     * @returns {Promise<Object>} Lista con paginazione
     */
    static async getAll(tenantId, options = {}) {
        try {
            const {
                page: pageStr = 1,
                limit: limitStr = 20,
                medicoId,
                brancaSpecialistica,
                convenzioneId,
                attivo,
                tenantIds = null,
                allTenants = false,
                accessibleTenantIds = []
            } = options;

            // Converti in numeri interi (query params arrivano come stringhe)
            const page = parseInt(pageStr, 10) || 1;
            const limit = parseInt(limitStr, 10) || 20;
            const skip = (page - 1) * limit;

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
                ...tenantFilter
            };

            if (medicoId) where.medicoId = medicoId;
            if (brancaSpecialistica) where.brancaSpecialistica = brancaSpecialistica;
            if (convenzioneId) where.convenzioneId = convenzioneId;
            if (attivo !== undefined) where.attivo = attivo;

            const [tariffari, total] = await Promise.all([
                prisma.tariffarioMedico.findMany({
                    where,
                    include: {
                        medico: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                taxCode: true,
                                tenantProfiles: {
                                    where: { deletedAt: null, isActive: true },
                                    select: { specialties: true, isPrimary: true },
                                    take: 1
                                }
                            }
                        },
                        convenzione: {
                            select: {
                                id: true,
                                codice: true,
                                nome: true,
                                tipo: true
                            }
                        }
                    },
                    orderBy: [
                        { createdAt: 'desc' }
                    ],
                    skip,
                    take: limit
                }),
                prisma.tariffarioMedico.count({ where })
            ]);

            return {
                data: tariffari,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Errore recupero tariffari', {
                component: 'tariffario-medico-service',
                action: 'getAll',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }
}

export default TariffarioMedicoService;
