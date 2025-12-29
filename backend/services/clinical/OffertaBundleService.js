/**
 * Offerta Bundle Service
 * CRUD operations for bundle/package offers
 * 
 * @module services/clinical/OffertaBundleService
 * @updated Project 45 - Added branch-aware support
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { BRANCH_TYPES } from '../../utils/branchHelper.js';

// Default branch for this entity
const DEFAULT_BRANCH = BRANCH_TYPES.MEDICA;

export class OffertaBundleService {
    /**
     * Create a new bundle offer
     * @param {Object} data - Bundle data
     * @param {string} tenantId - Tenant ID
     * @param {string} [createdBy] - User ID who creates
     * @param {string} branchType - Branch type (default: MEDICA)
     * @returns {Promise<Object>} Created bundle
     */
    static async create(data, tenantId, createdBy = null, branchType = DEFAULT_BRANCH) {
        try {
            const { prestazioni, isActive, ...bundleData } = data;

            // Map isActive to attivo (frontend uses isActive, DB uses attivo)
            if (typeof isActive !== 'undefined') {
                bundleData.attivo = isActive;
            }

            // Ensure codiciScontoIds is an array, not null (Prisma String[] requires array)
            if (bundleData.codiciScontoIds === null || bundleData.codiciScontoIds === undefined) {
                bundleData.codiciScontoIds = [];
            }

            // Convert date strings to proper DateTime format for Prisma
            if (bundleData.validoDa) {
                // Handle both "2025-12-19" and "2025-12-19T00:00:00.000Z" formats
                bundleData.validoDa = new Date(bundleData.validoDa).toISOString();
            }
            if (bundleData.validoA) {
                bundleData.validoA = new Date(bundleData.validoA).toISOString();
            }

            // Generate codice if not provided
            if (!bundleData.codice) {
                const timestamp = Date.now().toString(36).toUpperCase();
                const random = Math.random().toString(36).substring(2, 6).toUpperCase();
                bundleData.codice = `BND-${timestamp}-${random}`;
            }

            // Verify all prestazioni exist for this tenant
            if (prestazioni && prestazioni.length > 0) {
                const prestazioniIds = prestazioni.map(p => p.prestazioneId);
                const existingPrestazioni = await prisma.prestazione.findMany({
                    where: {
                        id: { in: prestazioniIds },
                        tenantId,
                        deletedAt: null
                    },
                    select: { id: true, nome: true }
                });

                if (existingPrestazioni.length !== prestazioniIds.length) {
                    const foundIds = existingPrestazioni.map(p => p.id);
                    const missingIds = prestazioniIds.filter(id => !foundIds.includes(id));

                    // Check if prestazioni exist but in different tenants
                    const crossTenantPrestazioni = await prisma.prestazione.findMany({
                        where: {
                            id: { in: missingIds },
                            deletedAt: null
                        },
                        select: { id: true, nome: true, tenantId: true }
                    });

                    if (crossTenantPrestazioni.length > 0) {
                        const crossTenantNames = crossTenantPrestazioni.map(p => p.nome).join(', ');
                        logger.warn('Attempted to create bundle with prestazioni from different tenant', {
                            component: 'offerta-bundle-service',
                            action: 'create',
                            requestedTenantId: tenantId,
                            crossTenantPrestazioni: crossTenantPrestazioni.map(p => ({ id: p.id, tenantId: p.tenantId }))
                        });
                        throw new Error(`Le prestazioni "${crossTenantNames}" appartengono a un tenant diverso. Seleziona prestazioni dello stesso brand.`);
                    }

                    throw new Error(`${missingIds.length} prestazione/i non trovata/e o eliminata/e. Ricarica la pagina.`);
                }
            }

            // Check for duplicate codice
            const existing = await prisma.offertaBundle.findFirst({
                where: {
                    codice: bundleData.codice,
                    tenantId,
                    deletedAt: null
                }
            });

            if (existing) {
                throw new Error(`Bundle with codice ${bundleData.codice} already exists`);
            }

            // Create bundle with prestazioni
            const bundle = await prisma.offertaBundle.create({
                data: {
                    ...bundleData,
                    tenantId,
                    createdBy,
                    branchType, // Project 45: Add branchType
                    prestazioni: prestazioni ? {
                        create: prestazioni.map((p, index) => ({
                            prestazioneId: p.prestazioneId,
                            quantita: p.quantita || 1,
                            obbligatoria: p.obbligatoria ?? true,
                            ordine: p.ordine ?? index,
                            tenantId
                        }))
                    } : undefined
                },
                include: {
                    prestazioni: {
                        include: {
                            prestazione: {
                                select: {
                                    id: true,
                                    codice: true,
                                    nome: true,
                                    prezzoBase: true
                                }
                            }
                        }
                    }
                }
            });

            logger.info('Bundle created', {
                component: 'offerta-bundle-service',
                action: 'create',
                bundleId: bundle.id,
                codice: bundle.codice,
                prestazioniCount: prestazioni?.length || 0,
                tenantId,
                branchType,
            });

            return bundle;

        } catch (error) {
            logger.error('Error creating bundle', {
                component: 'offerta-bundle-service',
                action: 'create',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all bundles with pagination and filters
     * Supports multi-tenant for admin users
     * @param {Object} options - Query options
     * @param {string} tenantId - Default Tenant ID (brand tenant)
     * @param {string} branchType - Branch type (optional for backward compatibility)
     * @returns {Promise<{data: Array, total: number}>}
     */
    static async findAll({
        page = 1,
        limit = 20,
        attivo,
        search,
        includeExpired = false,
        showAllTenants = false,
        accessibleTenantIds = [],
        queryTenantIds = undefined
    }, tenantId, branchType = null) {
        const now = new Date();
        const skip = (page - 1) * limit;

        // Determine which tenants to query
        let tenantFilter;
        if (showAllTenants && accessibleTenantIds.length > 0) {
            // Show all accessible tenants
            tenantFilter = { tenantId: { in: accessibleTenantIds } };
        } else if (queryTenantIds && queryTenantIds.length > 0) {
            // Filter by specific tenant IDs (intersect with accessible)
            const validTenantIds = queryTenantIds.filter(id => accessibleTenantIds.includes(id));
            if (validTenantIds.length > 0) {
                tenantFilter = { tenantId: { in: validTenantIds } };
            } else {
                tenantFilter = { tenantId };
            }
        } else {
            // Default: use brand tenant
            tenantFilter = { tenantId };
        }

        const where = {
            ...tenantFilter,
            deletedAt: null,
            ...(attivo !== undefined && { attivo }),
            // Project 45: Add branchType filter if provided
            ...(branchType && { branchType }),
            ...(search && {
                OR: [
                    { codice: { contains: search, mode: 'insensitive' } },
                    { nome: { contains: search, mode: 'insensitive' } }
                ]
            }),
            ...(!includeExpired && {
                OR: [
                    { validoA: null },
                    { validoA: { gte: now } }
                ]
            })
        };

        const [data, total] = await Promise.all([
            prisma.offertaBundle.findMany({
                where,
                skip,
                take: limit,
                include: {
                    prestazioni: {
                        where: { deletedAt: null },
                        include: {
                            prestazione: {
                                select: {
                                    id: true,
                                    codice: true,
                                    nome: true,
                                    prezzoBase: true
                                }
                            }
                        },
                        orderBy: { ordine: 'asc' }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.offertaBundle.count({ where })
        ]);

        // Calculate totals for each bundle
        const enrichedData = data.map(bundle => {
            const prezzoSingoli = bundle.prestazioni.reduce((sum, bp) => {
                return sum + (Number(bp.prestazione.prezzoBase) * bp.quantita);
            }, 0);

            let prezzoEffettivo = prezzoSingoli;
            if (bundle.prezzoBundle) {
                prezzoEffettivo = Number(bundle.prezzoBundle);
            } else if (bundle.scontoPercentuale) {
                prezzoEffettivo = prezzoSingoli * (1 - Number(bundle.scontoPercentuale) / 100);
            }

            return {
                ...bundle,
                prezzoSingoli: Math.round(prezzoSingoli * 100) / 100,
                prezzoEffettivo: Math.round(prezzoEffettivo * 100) / 100,
                risparmio: Math.round((prezzoSingoli - prezzoEffettivo) * 100) / 100
            };
        });

        return { data: enrichedData, total };
    }

    /**
     * Get bundle by ID
     * @param {string} id - Bundle ID
     * @param {string} tenantId - Tenant ID
     * @param {Object} [options] - Optional parameters
     * @param {string[]} [options.accessibleTenantIds] - Accessible tenant IDs for multi-tenant access
     * @returns {Promise<Object|null>}
     */
    static async findById(id, tenantId, options = {}) {
        const { accessibleTenantIds = [] } = options;

        // Build tenant filter - support multi-tenant for admin users
        let tenantFilter;
        if (accessibleTenantIds.length > 0) {
            // Admin with multi-tenant access - check against accessible tenants
            tenantFilter = { tenantId: { in: accessibleTenantIds } };
        } else {
            // Regular user - only their tenant
            tenantFilter = { tenantId };
        }

        const bundle = await prisma.offertaBundle.findFirst({
            where: {
                id,
                ...tenantFilter,
                deletedAt: null
            },
            include: {
                prestazioni: {
                    where: { deletedAt: null },
                    include: {
                        prestazione: {
                            select: {
                                id: true,
                                codice: true,
                                nome: true,
                                prezzoBase: true,
                                durataPrevista: true
                            }
                        }
                    },
                    orderBy: { ordine: 'asc' }
                }
            }
        });

        if (!bundle) return null;

        // Calculate totals
        const prezzoSingoli = bundle.prestazioni.reduce((sum, bp) => {
            return sum + (Number(bp.prestazione.prezzoBase) * bp.quantita);
        }, 0);

        const durataEstimata = bundle.prestazioni.reduce((sum, bp) => {
            return sum + (bp.prestazione.durataPrevista * bp.quantita);
        }, 0);

        let prezzoEffettivo = prezzoSingoli;
        if (bundle.prezzoBundle) {
            prezzoEffettivo = Number(bundle.prezzoBundle);
        } else if (bundle.scontoPercentuale) {
            prezzoEffettivo = prezzoSingoli * (1 - Number(bundle.scontoPercentuale) / 100);
        }

        return {
            ...bundle,
            prezzoSingoli: Math.round(prezzoSingoli * 100) / 100,
            prezzoEffettivo: Math.round(prezzoEffettivo * 100) / 100,
            risparmio: Math.round((prezzoSingoli - prezzoEffettivo) * 100) / 100,
            durataEstimata
        };
    }

    /**
     * Update bundle
     * @param {string} id - Bundle ID
     * @param {Object} data - Update data
     * @param {string} tenantId - Tenant ID
     * @param {Object} [options] - Optional parameters
     * @param {string[]} [options.accessibleTenantIds] - Accessible tenant IDs for multi-tenant access
     * @returns {Promise<Object>}
     */
    static async update(id, data, tenantId, options = {}) {
        try {
            const { accessibleTenantIds = [] } = options;
            const { prestazioni, ...bundleData } = data;

            // Ensure codiciScontoIds is an array, not null (Prisma String[] requires array)
            if (bundleData.codiciScontoIds === null) {
                bundleData.codiciScontoIds = [];
            }

            // Convert date strings to proper DateTime format for Prisma
            if (bundleData.validoDa) {
                bundleData.validoDa = new Date(bundleData.validoDa).toISOString();
            }
            if (bundleData.validoA) {
                bundleData.validoA = new Date(bundleData.validoA).toISOString();
            }

            // Build tenant filter - support multi-tenant for admin users
            let tenantFilter;
            if (accessibleTenantIds.length > 0) {
                tenantFilter = { tenantId: { in: accessibleTenantIds } };
            } else {
                tenantFilter = { tenantId };
            }

            // Check if bundle exists
            const existing = await prisma.offertaBundle.findFirst({
                where: {
                    id,
                    ...tenantFilter,
                    deletedAt: null
                }
            });

            if (!existing) {
                throw new Error('Bundle not found');
            }

            // Check codice uniqueness if changing
            if (bundleData.codice && bundleData.codice !== existing.codice) {
                const duplicate = await prisma.offertaBundle.findFirst({
                    where: {
                        codice: bundleData.codice,
                        tenantId: existing.tenantId,
                        deletedAt: null,
                        id: { not: id }
                    }
                });

                if (duplicate) {
                    throw new Error(`Bundle with codice ${bundleData.codice} already exists`);
                }
            }

            // Update in transaction
            const bundle = await prisma.$transaction(async (tx) => {
                // Update bundle data
                await tx.offertaBundle.update({
                    where: { id },
                    data: bundleData
                });

                // Update prestazioni if provided
                if (prestazioni !== undefined) {
                    // Soft delete existing
                    await tx.offertaBundlePrestazione.updateMany({
                        where: {
                            offertaBundleId: id,
                            deletedAt: null
                        },
                        data: { deletedAt: new Date() }
                    });

                    // Create new ones
                    if (prestazioni.length > 0) {
                        await tx.offertaBundlePrestazione.createMany({
                            data: prestazioni.map((p, index) => ({
                                offertaBundleId: id,
                                prestazioneId: p.prestazioneId,
                                quantita: p.quantita || 1,
                                obbligatoria: p.obbligatoria ?? true,
                                ordine: p.ordine ?? index,
                                tenantId: existing.tenantId // Use bundle's tenantId for cross-tenant updates
                            }))
                        });
                    }
                }

                // Return updated bundle
                return tx.offertaBundle.findFirst({
                    where: { id },
                    include: {
                        prestazioni: {
                            where: { deletedAt: null },
                            include: {
                                prestazione: {
                                    select: {
                                        id: true,
                                        codice: true,
                                        nome: true,
                                        prezzoBase: true
                                    }
                                }
                            },
                            orderBy: { ordine: 'asc' }
                        }
                    }
                });
            });

            logger.info('Bundle updated', {
                component: 'offerta-bundle-service',
                action: 'update',
                bundleId: id,
                tenantId
            });

            return bundle;

        } catch (error) {
            logger.error('Error updating bundle', {
                component: 'offerta-bundle-service',
                action: 'update',
                bundleId: id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete bundle
     * @param {string} id - Bundle ID
     * @param {string} tenantId - Tenant ID
     * @param {Object} [options] - Optional parameters
     * @param {string[]} [options.accessibleTenantIds] - Accessible tenant IDs for multi-tenant access
     * @returns {Promise<boolean>}
     */
    static async delete(id, tenantId, options = {}) {
        try {
            const { accessibleTenantIds = [] } = options;

            // Build tenant filter - support multi-tenant for admin users
            let tenantFilter;
            if (accessibleTenantIds.length > 0) {
                tenantFilter = { tenantId: { in: accessibleTenantIds } };
            } else {
                tenantFilter = { tenantId };
            }

            const existing = await prisma.offertaBundle.findFirst({
                where: {
                    id,
                    ...tenantFilter,
                    deletedAt: null
                }
            });

            if (!existing) {
                throw new Error('Bundle not found');
            }

            await prisma.$transaction([
                // Soft delete bundle
                prisma.offertaBundle.update({
                    where: { id },
                    data: { deletedAt: new Date() }
                }),
                // Soft delete prestazioni
                prisma.offertaBundlePrestazione.updateMany({
                    where: {
                        offertaBundleId: id,
                        deletedAt: null
                    },
                    data: { deletedAt: new Date() }
                })
            ]);

            logger.info('Bundle deleted', {
                component: 'offerta-bundle-service',
                action: 'delete',
                bundleId: id,
                tenantId
            });

            return true;

        } catch (error) {
            logger.error('Error deleting bundle', {
                component: 'offerta-bundle-service',
                action: 'delete',
                bundleId: id,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Toggle bundle active status
     * @param {string} id - Bundle ID
     * @param {boolean} attivo - New status
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>}
     */
    static async toggleActive(id, attivo, tenantId) {
        const bundle = await prisma.offertaBundle.update({
            where: {
                id,
                tenantId
            },
            data: { attivo }
        });

        logger.info('Bundle status toggled', {
            component: 'offerta-bundle-service',
            action: 'toggleActive',
            bundleId: id,
            attivo,
            tenantId
        });

        return bundle;
    }

    /**
     * Find bundles containing a specific prestazione
     * @param {string} prestazioneId - Prestazione ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>}
     */
    static async findByPrestazione(prestazioneId, tenantId) {
        const now = new Date();

        const bundles = await prisma.offertaBundle.findMany({
            where: {
                tenantId,
                attivo: true,
                deletedAt: null,
                OR: [
                    { validoA: null },
                    { validoA: { gte: now } }
                ],
                prestazioni: {
                    some: {
                        prestazioneId,
                        deletedAt: null
                    }
                }
            },
            include: {
                prestazioni: {
                    where: { deletedAt: null },
                    include: {
                        prestazione: {
                            select: {
                                id: true,
                                codice: true,
                                nome: true,
                                prezzoBase: true
                            }
                        }
                    },
                    orderBy: { ordine: 'asc' }
                }
            },
            orderBy: { priorita: 'desc' }
        });

        return bundles;
    }

    /**
     * Verifica se un bundle è applicabile a un paziente
     * Controlla: età, sesso, convenzione, solo nuovi pazienti, limite utilizzi
     * @param {string} bundleId - ID del bundle
     * @param {Object} paziente - Dati paziente (id, birthDate, gender, convenzioneId)
     * @param {string} tenantId - ID del tenant
     * @returns {Promise<Object>} Risultato verifica {applicable, reason, bundle}
     */
    static async checkApplicability(bundleId, paziente, tenantId) {
        try {
            const bundle = await prisma.offertaBundle.findFirst({
                where: {
                    id: bundleId,
                    tenantId,
                    deletedAt: null,
                    attivo: true
                }
            });

            if (!bundle) {
                return { applicable: false, reason: 'Bundle non trovato o non attivo' };
            }

            const today = new Date();

            // Verifica date validità
            if (bundle.validoDa && new Date(bundle.validoDa) > today) {
                return { applicable: false, reason: 'Bundle non ancora valido' };
            }
            if (bundle.validoA && new Date(bundle.validoA) < today) {
                return { applicable: false, reason: 'Bundle scaduto' };
            }

            // Verifica utilizzi massimi
            if (bundle.maxUtilizzi && bundle.utilizziCorrente >= bundle.maxUtilizzi) {
                return { applicable: false, reason: 'Limite utilizzi raggiunto' };
            }

            // Verifica solo nuovi pazienti
            if (bundle.soloNuoviPazienti && paziente.id) {
                const visitePassate = await prisma.visita.count({
                    where: {
                        pazienteId: paziente.id,
                        tenantId,
                        deletedAt: null
                    }
                });
                if (visitePassate > 0) {
                    return { applicable: false, reason: 'Bundle riservato a nuovi pazienti' };
                }
            }

            // Verifica età
            if (paziente.birthDate && (bundle.etaMinima || bundle.etaMassima)) {
                const birthDate = new Date(paziente.birthDate);
                const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));

                if (bundle.etaMinima && age < bundle.etaMinima) {
                    return { applicable: false, reason: `Età minima richiesta: ${bundle.etaMinima} anni` };
                }
                if (bundle.etaMassima && age > bundle.etaMassima) {
                    return { applicable: false, reason: `Età massima: ${bundle.etaMassima} anni` };
                }
            }

            // Verifica genere
            if (bundle.genereApplicabile && paziente.gender) {
                if (paziente.gender !== bundle.genereApplicabile) {
                    return {
                        applicable: false,
                        reason: `Bundle riservato a ${bundle.genereApplicabile === 'FEMALE' ? 'donne' : 'uomini'}`
                    };
                }
            }

            // Verifica convenzione
            if (bundle.convenzioniIds && bundle.convenzioniIds.length > 0) {
                if (!paziente.convenzioneId || !bundle.convenzioniIds.includes(paziente.convenzioneId)) {
                    return { applicable: false, reason: 'Bundle riservato a convenzioni specifiche' };
                }
            }

            return {
                applicable: true,
                bundle: {
                    id: bundle.id,
                    codice: bundle.codice,
                    nome: bundle.nome,
                    utilizziRimasti: bundle.maxUtilizzi
                        ? bundle.maxUtilizzi - bundle.utilizziCorrente
                        : null
                }
            };
        } catch (error) {
            logger.error('Errore verifica applicabilità bundle', {
                component: 'offerta-bundle-service',
                action: 'checkApplicability',
                error: error.message,
                bundleId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Ottiene tutti i bundles applicabili a un paziente
     * @param {Object} paziente - Dati paziente
     * @param {string} tenantId - ID del tenant
     * @returns {Promise<Array>} Lista bundles applicabili con prezzi calcolati
     */
    static async getApplicableForPatient(paziente, tenantId) {
        try {
            const allBundles = await prisma.offertaBundle.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    attivo: true
                },
                include: {
                    prestazioni: {
                        where: { deletedAt: null },
                        include: {
                            prestazione: {
                                select: { id: true, nome: true, prezzoBase: true }
                            }
                        }
                    }
                }
            });

            const applicable = [];

            for (const bundle of allBundles) {
                const check = await this.checkApplicability(bundle.id, paziente, tenantId);
                if (check.applicable) {
                    const prezzoSingole = bundle.prestazioni.reduce((sum, p) => {
                        return sum + (Number(p.prestazione.prezzoBase) || 0) * p.quantita;
                    }, 0);

                    let prezzoEffettivo;
                    if (bundle.prezzoBundle) {
                        prezzoEffettivo = Number(bundle.prezzoBundle);
                    } else if (bundle.scontoPercentuale) {
                        prezzoEffettivo = prezzoSingole * (1 - Number(bundle.scontoPercentuale) / 100);
                    } else {
                        prezzoEffettivo = prezzoSingole;
                    }

                    applicable.push({
                        ...bundle,
                        calcolato: {
                            prezzoSingole: Math.round(prezzoSingole * 100) / 100,
                            prezzoEffettivo: Math.round(prezzoEffettivo * 100) / 100,
                            risparmio: Math.round((prezzoSingole - prezzoEffettivo) * 100) / 100,
                            percentualeRisparmio: prezzoSingole > 0
                                ? Math.round((1 - prezzoEffettivo / prezzoSingole) * 100 * 10) / 10
                                : 0
                        }
                    });
                }
            }

            return applicable;
        } catch (error) {
            logger.error('Errore recupero bundles applicabili', {
                component: 'offerta-bundle-service',
                action: 'getApplicableForPatient',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Incrementa il contatore utilizzi del bundle
     * @param {string} bundleId - ID del bundle
     * @param {string} tenantId - ID del tenant
     * @returns {Promise<Object>} Risultato
     */
    static async incrementUtilizzi(bundleId, tenantId) {
        try {
            await prisma.offertaBundle.update({
                where: { id: bundleId },
                data: {
                    utilizziCorrente: { increment: 1 }
                }
            });

            logger.info('Utilizzo bundle incrementato', {
                component: 'offerta-bundle-service',
                action: 'incrementUtilizzi',
                bundleId,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('Errore incremento utilizzi bundle', {
                component: 'offerta-bundle-service',
                action: 'incrementUtilizzi',
                error: error.message,
                bundleId,
                tenantId
            });
            throw error;
        }
    }
}

export default OffertaBundleService;
