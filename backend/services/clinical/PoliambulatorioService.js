/**
 * Poliambulatorio Service
 * Business logic for polyclinic management
 * 
 * @module services/clinical/PoliambulatorioService
 * @updated Project 45 - Added branch-aware support
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { BRANCH_TYPES } from '../../utils/branchHelper.js';

// Default branch for this entity
const DEFAULT_BRANCH = BRANCH_TYPES.MEDICA;

export class PoliambulatorioService {
    // Allowed fields for Poliambulatorio model (Prisma schema)
    static ALLOWED_FIELDS = [
        'nome', 'codice', 'descrizione', 'indirizzo', 'citta', 'cap',
        'provincia', 'telefono', 'email', 'pec', 'piva', 'codiceFiscale',
        'direttoreSanitarioId', 'stato', 'orariApertura', 'createdBy'
    ];

    /**
     * Filter data to only include allowed fields
     */
    static filterData(data) {
        const filtered = {};
        for (const field of this.ALLOWED_FIELDS) {
            if (data[field] !== undefined) {
                filtered[field] = data[field];
            }
        }
        return filtered;
    }

    /**
     * Create a new poliambulatorio
     * @param {Object} data - Poliambulatorio data
     * @param {string} tenantId - Tenant ID
     * @param {string} branchType - Branch type (default: MEDICA)
     */
    static async create(data, tenantId, branchType = DEFAULT_BRANCH) {
        try {
            // Filter data to only include allowed Prisma fields
            const filteredData = this.filterData(data);

            const poliambulatorio = await prisma.poliambulatorio.create({
                data: {
                    ...filteredData,
                    tenantId,
                    branchType, // Project 45: Add branchType
                },
                include: {
                    ambulatori: true,
                    sedi: true
                }
            });

            logger.info('Poliambulatorio created', {
                component: 'poliambulatorio-service',
                action: 'create',
                poliambulatorioId: poliambulatorio.id,
                tenantId,
                branchType,
            });

            return poliambulatorio;
        } catch (error) {
            logger.error('Failed to create poliambulatorio', {
                component: 'poliambulatorio-service',
                action: 'create',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get poliambulatorio by ID
     * @param {string} id - Poliambulatorio ID
     * @param {string} tenantId - Tenant ID
     * @param {string} branchType - Branch type (optional for backward compatibility)
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

            const poliambulatorio = await prisma.poliambulatorio.findFirst({
                where,
                include: {
                    sedi: {
                        where: { deletedAt: null },
                        orderBy: { isPrincipale: 'desc' },
                        include: {
                            direttoreSanitario: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    tenantProfiles: {
                                        where: { deletedAt: null, isActive: true },
                                        select: { email: true, phone: true, registerCode: true, specialties: true, isPrimary: true },
                                        take: 1
                                    }
                                }
                            }
                        }
                    },
                    ambulatori: {
                        where: { deletedAt: null },
                        orderBy: { nome: 'asc' }
                    }
                }
            });

            return poliambulatorio;
        } catch (error) {
            logger.error('Failed to get poliambulatorio', {
                component: 'poliambulatorio-service',
                action: 'getById',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all poliambulatori for tenant
     * @param {string|null} tenantId - Tenant ID to filter by (user's primary tenant)
     * @param {Object} options - Query options
     * @param {boolean} options.showAllTenants - If true and user has multi-tenant access, show all accessible tenants
     * @param {string} options.tenantIds - Comma-separated list of tenant IDs to filter by (for multi-tenant users)
     * @param {string} branchType - Branch type (optional for backward compatibility)
     */
    static async getAll(tenantId, options = {}, branchType = null) {
        try {
            const {
                page = 1,
                limit = 20,
                search = '',
                stato,
                orderBy = 'nome',
                orderDir = 'asc',
                showAllTenants = false,
                tenantIds = null,
                accessibleTenantIds = [] // Array of tenant IDs the user has access to
            } = options;

            const skip = (page - 1) * limit;

            // Determine tenant filter based on user's access
            let tenantFilter = {};

            if (tenantIds) {
                // Filter by specific tenant IDs (must be in user's accessible tenants)
                // Handle both array and comma-separated string formats
                const requestedIds = Array.isArray(tenantIds)
                    ? tenantIds.map(id => id.trim())
                    : tenantIds.split(',').map(id => id.trim());
                const allowedIds = accessibleTenantIds.length > 0
                    ? requestedIds.filter(id => accessibleTenantIds.includes(id))
                    : requestedIds;

                if (allowedIds.length > 0) {
                    tenantFilter = { tenantId: { in: allowedIds } };
                } else {
                    // User has no access to requested tenants, fallback to primary tenant
                    tenantFilter = tenantId ? { tenantId } : {};
                }
            } else if (showAllTenants && accessibleTenantIds.length > 0) {
                // Show all accessible tenants
                tenantFilter = { tenantId: { in: accessibleTenantIds } };
            } else if (tenantId) {
                // Default: filter by user's primary tenant only
                tenantFilter = { tenantId };
            }

            // Build where clause
            const where = {
                deletedAt: null,
                ...tenantFilter,
                ...(stato && { stato }),
                // Project 45: Add branchType filter if provided
                ...(branchType && { branchType }),
                ...(search && {
                    OR: [
                        { nome: { contains: search, mode: 'insensitive' } },
                        { codice: { contains: search, mode: 'insensitive' } },
                        { citta: { contains: search, mode: 'insensitive' } }
                    ]
                })
            };

            logger.debug('Poliambulatori query where clause', {
                component: 'poliambulatorio-service',
                action: 'getAll',
                where: JSON.stringify(where),
                tenantId,
                tenantIds,
                showAllTenants,
                accessibleTenantIds
            });

            const [poliambulatori, total] = await Promise.all([
                prisma.poliambulatorio.findMany({
                    where,
                    include: {
                        sedi: {
                            where: { deletedAt: null },
                            take: 1,
                            orderBy: { isPrincipale: 'desc' }
                        },
                        _count: {
                            select: { ambulatori: true }
                        }
                    },
                    orderBy: { [orderBy]: orderDir },
                    skip,
                    take: limit
                }),
                prisma.poliambulatorio.count({ where })
            ]);

            return {
                data: poliambulatori,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Failed to get poliambulatori', {
                component: 'poliambulatorio-service',
                action: 'getAll',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update poliambulatorio
     */
    static async update(id, data, tenantId) {
        try {
            // Verify ownership
            const existing = await prisma.poliambulatorio.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Poliambulatorio not found');
            }

            // Filter data to only include allowed Prisma fields
            const filteredData = this.filterData(data);

            const updated = await prisma.poliambulatorio.update({
                where: { id },
                data: {
                    ...filteredData,
                    updatedAt: new Date()
                },
                include: {
                    sedi: {
                        where: { deletedAt: null },
                        orderBy: { isPrincipale: 'desc' }
                    },
                    ambulatori: {
                        where: { deletedAt: null }
                    }
                }
            });

            logger.info('Poliambulatorio updated', {
                component: 'poliambulatorio-service',
                action: 'update',
                poliambulatorioId: id,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to update poliambulatorio', {
                component: 'poliambulatorio-service',
                action: 'update',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete poliambulatorio
     */
    static async delete(id, tenantId) {
        try {
            // Verify ownership
            const existing = await prisma.poliambulatorio.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Poliambulatorio not found');
            }

            // Soft delete with cascade to ambulatori
            await prisma.$transaction([
                prisma.poliambulatorio.update({
                    where: { id },
                    data: { deletedAt: new Date() }
                }),
                prisma.ambulatorio.updateMany({
                    where: { poliambulatorioId: id },
                    data: { deletedAt: new Date() }
                })
            ]);

            logger.info('Poliambulatorio deleted', {
                component: 'poliambulatorio-service',
                action: 'delete',
                poliambulatorioId: id,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('Failed to delete poliambulatorio', {
                component: 'poliambulatorio-service',
                action: 'delete',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Assign direttore sanitario
     */
    static async assignDirettoreSanitario(poliambulatorioId, direttoreId, tenantId) {
        try {
            // Verify both exist in same tenant
            const [poliambulatorio, direttore] = await Promise.all([
                prisma.poliambulatorio.findFirst({
                    where: { id: poliambulatorioId, tenantId, deletedAt: null }
                }),
                // P63: Person non ha tenantId — filtra via tenantProfiles.some
                prisma.person.findFirst({
                    where: { id: direttoreId, deletedAt: null, tenantProfiles: { some: { tenantId, deletedAt: null } } }
                })
            ]);

            if (!poliambulatorio) {
                throw new Error('Poliambulatorio not found');
            }
            if (!direttore) {
                throw new Error('Direttore sanitario not found');
            }

            const updated = await prisma.poliambulatorio.update({
                where: { id: poliambulatorioId },
                data: { direttoreSanitarioId: direttoreId },
                include: {
                    sedi: {
                        where: { deletedAt: null },
                        orderBy: { isPrincipale: 'desc' }
                    },
                    ambulatori: {
                        where: { deletedAt: null }
                    }
                }
            });

            // Attach direttore info manually since relation doesn't exist in schema
            updated.direttoreSanitario = direttore;

            logger.info('Direttore sanitario assigned', {
                component: 'poliambulatorio-service',
                action: 'assignDirettoreSanitario',
                poliambulatorioId,
                direttoreId,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to assign direttore sanitario', {
                component: 'poliambulatorio-service',
                action: 'assignDirettoreSanitario',
                error: error.message,
                poliambulatorioId,
                direttoreId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Assign direttore sanitario to a specific sede
     */
    static async assignDirettoreSanitarioToSede(sedeId, direttoreId, tenantId) {
        try {
            // Verify sede exists and belongs to tenant
            const sede = await prisma.sedePoliambulatorio.findFirst({
                where: { id: sedeId, tenantId, deletedAt: null }
            });

            if (!sede) {
                throw new Error('Sede not found');
            }

            // Verify direttore exists if provided
            // P63: Person non ha tenantId — filtra via tenantProfiles.some
            if (direttoreId) {
                const direttore = await prisma.person.findFirst({
                    where: { id: direttoreId, deletedAt: null, tenantProfiles: { some: { tenantId, deletedAt: null } } }
                });

                if (!direttore) {
                    throw new Error('Direttore sanitario not found');
                }
            }

            const updated = await prisma.sedePoliambulatorio.update({
                where: { id: sedeId },
                data: { direttoreSanitarioId: direttoreId },
                include: {
                    direttoreSanitario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            registerCode: true,
                            specialties: true
                        }
                    },
                    poliambulatorio: {
                        select: { id: true, nome: true, codice: true }
                    }
                }
            });

            logger.info('Direttore sanitario assigned to sede', {
                component: 'poliambulatorio-service',
                action: 'assignDirettoreSanitarioToSede',
                sedeId,
                direttoreId,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to assign direttore sanitario to sede', {
                component: 'poliambulatorio-service',
                action: 'assignDirettoreSanitarioToSede',
                error: error.message,
                sedeId,
                direttoreId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all sedi for a poliambulatorio with direttori sanitari
     */
    static async getSedi(poliambulatorioId, tenantId) {
        try {
            const sedi = await prisma.sedePoliambulatorio.findMany({
                where: {
                    poliambulatorioId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    direttoreSanitario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            registerCode: true,
                            specialties: true
                        }
                    },
                    _count: {
                        select: { ambulatori: true }
                    }
                },
                orderBy: [
                    { isPrincipale: 'desc' },
                    { nome: 'asc' }
                ]
            });

            return sedi;
        } catch (error) {
            logger.error('Failed to get sedi', {
                component: 'poliambulatorio-service',
                action: 'getSedi',
                error: error.message,
                poliambulatorioId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Create a new sede for a poliambulatorio
     */
    static async createSede(poliambulatorioId, data, tenantId) {
        try {
            // Verify poliambulatorio exists
            const poliambulatorio = await prisma.poliambulatorio.findFirst({
                where: { id: poliambulatorioId, tenantId, deletedAt: null }
            });

            if (!poliambulatorio) {
                throw new Error('Poliambulatorio not found');
            }

            // Verify direttore if provided
            // P63: Person non ha tenantId — filtra via tenantProfiles.some
            if (data.direttoreSanitarioId) {
                const direttore = await prisma.person.findFirst({
                    where: { id: data.direttoreSanitarioId, deletedAt: null, tenantProfiles: { some: { tenantId, deletedAt: null } } }
                });

                if (!direttore) {
                    throw new Error('Direttore sanitario not found');
                }
            }

            // Extract nested relations from data
            const { orariSettimanali, chiusureSpeciali, ...sedeData } = data;

            // Build create data with nested relations
            const createData = {
                ...sedeData,
                poliambulatorioId,
                tenantId
            };

            // Add orari settimanali if provided
            if (orariSettimanali && Array.isArray(orariSettimanali) && orariSettimanali.length > 0) {
                createData.orariSettimanali = {
                    create: orariSettimanali.map(orario => ({
                        giornoSettimana: orario.giornoSettimana,
                        fascia: orario.fascia || 1,
                        oraInizio: orario.oraInizio,
                        oraFine: orario.oraFine,
                        isChiuso: orario.isChiuso || false,
                        note: orario.note || null,
                        tenantId
                    }))
                };
            }

            // Add chiusure speciali if provided
            if (chiusureSpeciali && Array.isArray(chiusureSpeciali) && chiusureSpeciali.length > 0) {
                createData.chiusureSpeciali = {
                    create: chiusureSpeciali.map(chiusura => ({
                        tipo: chiusura.tipo,
                        nome: chiusura.nome,
                        descrizione: chiusura.descrizione || null,
                        dataInizio: chiusura.dataInizio ? new Date(chiusura.dataInizio) : null,
                        dataFine: chiusura.dataFine ? new Date(chiusura.dataFine) : null,
                        oraInizio: chiusura.oraInizio || null,
                        oraFine: chiusura.oraFine || null,
                        isParziale: chiusura.isParziale || false,
                        ricorrente: chiusura.ricorrente || false,
                        annoRiferimento: chiusura.annoRiferimento || null,
                        attivo: chiusura.attivo !== false,
                        tenantId
                    }))
                };
            }

            const sede = await prisma.sedePoliambulatorio.create({
                data: createData,
                include: {
                    direttoreSanitario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            registerCode: true,
                            specialties: true
                        }
                    },
                    poliambulatorio: {
                        select: { id: true, nome: true, codice: true }
                    },
                    orariSettimanali: true,
                    chiusureSpeciali: true
                }
            });

            logger.info('Sede created', {
                component: 'poliambulatorio-service',
                action: 'createSede',
                sedeId: sede.id,
                poliambulatorioId,
                tenantId
            });

            return sede;
        } catch (error) {
            logger.error('Failed to create sede', {
                component: 'poliambulatorio-service',
                action: 'createSede',
                error: error.message,
                poliambulatorioId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update a sede
     */
    static async updateSede(sedeId, data, tenantId) {
        try {
            // Verify sede exists
            const existing = await prisma.sedePoliambulatorio.findFirst({
                where: { id: sedeId, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Sede not found');
            }

            // Verify direttore if provided
            // P63: Person non ha tenantId — filtra via tenantProfiles.some
            if (data.direttoreSanitarioId) {
                const direttore = await prisma.person.findFirst({
                    where: { id: data.direttoreSanitarioId, deletedAt: null, tenantProfiles: { some: { tenantId, deletedAt: null } } }
                });

                if (!direttore) {
                    throw new Error('Direttore sanitario not found');
                }
            }

            // Extract nested relations from data
            const { orariSettimanali, chiusureSpeciali, ...sedeData } = data;

            // Use transaction for atomic update with relations
            const updated = await prisma.$transaction(async (tx) => {
                // Update orari settimanali if provided
                if (orariSettimanali && Array.isArray(orariSettimanali)) {
                    // Delete existing orari
                    await tx.orarioSede.deleteMany({
                        where: { sedeId, tenantId }
                    });

                    // Create new orari
                    if (orariSettimanali.length > 0) {
                        await tx.orarioSede.createMany({
                            data: orariSettimanali.map(orario => ({
                                sedeId,
                                giornoSettimana: orario.giornoSettimana,
                                fascia: orario.fascia || 1,
                                oraInizio: orario.oraInizio,
                                oraFine: orario.oraFine,
                                isChiuso: orario.isChiuso || false,
                                note: orario.note || null,
                                tenantId
                            }))
                        });
                    }
                }

                // Update chiusure speciali if provided
                if (chiusureSpeciali && Array.isArray(chiusureSpeciali)) {
                    // Delete existing chiusure
                    await tx.chiusuraSpecialeSede.deleteMany({
                        where: { sedeId, tenantId }
                    });

                    // Create new chiusure
                    if (chiusureSpeciali.length > 0) {
                        await tx.chiusuraSpecialeSede.createMany({
                            data: chiusureSpeciali.map(chiusura => ({
                                sedeId,
                                tipo: chiusura.tipo,
                                nome: chiusura.nome,
                                descrizione: chiusura.descrizione || null,
                                dataInizio: chiusura.dataInizio ? new Date(chiusura.dataInizio) : null,
                                dataFine: chiusura.dataFine ? new Date(chiusura.dataFine) : null,
                                oraInizio: chiusura.oraInizio || null,
                                oraFine: chiusura.oraFine || null,
                                isParziale: chiusura.isParziale || false,
                                ricorrente: chiusura.ricorrente || false,
                                annoRiferimento: chiusura.annoRiferimento || null,
                                attivo: chiusura.attivo !== false,
                                tenantId
                            }))
                        });
                    }
                }

                // Update sede
                return tx.sedePoliambulatorio.update({
                    where: { id: sedeId },
                    data: {
                        ...sedeData,
                        updatedAt: new Date()
                    },
                    include: {
                        direttoreSanitario: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true,
                                registerCode: true,
                                specialties: true
                            }
                        },
                        poliambulatorio: {
                            select: { id: true, nome: true, codice: true }
                        },
                        orariSettimanali: true,
                        chiusureSpeciali: true
                    }
                });
            });

            logger.info('Sede updated', {
                component: 'poliambulatorio-service',
                action: 'updateSede',
                sedeId,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to update sede', {
                component: 'poliambulatorio-service',
                action: 'updateSede',
                error: error.message,
                sedeId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete a sede
     */
    static async deleteSede(sedeId, tenantId) {
        try {
            // Verify sede exists
            const existing = await prisma.sedePoliambulatorio.findFirst({
                where: { id: sedeId, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Sede not found');
            }

            // Check for ambulatori in this sede
            const ambulatoriCount = await prisma.ambulatorio.count({
                where: { sedeId, deletedAt: null }
            });

            if (ambulatoriCount > 0) {
                throw new Error(`Cannot delete sede with ${ambulatoriCount} ambulatori`);
            }

            await prisma.sedePoliambulatorio.update({
                where: { id: sedeId },
                data: { deletedAt: new Date() }
            });

            logger.info('Sede deleted', {
                component: 'poliambulatorio-service',
                action: 'deleteSede',
                sedeId,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('Failed to delete sede', {
                component: 'poliambulatorio-service',
                action: 'deleteSede',
                error: error.message,
                sedeId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get statistics for a poliambulatorio
     */
    static async getStatistics(poliambulatorioId, tenantId) {
        try {
            const ambulatoriIds = await prisma.ambulatorio.findMany({
                where: { poliambulatorioId, deletedAt: null },
                select: { id: true }
            }).then(a => a.map(x => x.id));

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const [
                totalAmbulatori,
                totalAppuntamentiOggi,
                totalVisiteOggi,
                appuntamentiInAttesa
            ] = await Promise.all([
                prisma.ambulatorio.count({
                    where: { poliambulatorioId, deletedAt: null, stato: 'ATTIVO' }
                }),
                prisma.appuntamento.count({
                    where: {
                        tenantId,
                        ambulatorioId: { in: ambulatoriIds },
                        dataOra: { gte: today, lt: tomorrow },
                        deletedAt: null
                    }
                }),
                prisma.visita.count({
                    where: {
                        tenantId,
                        dataOra: { gte: today, lt: tomorrow },
                        deletedAt: null
                    }
                }),
                prisma.appuntamento.count({
                    where: {
                        tenantId,
                        ambulatorioId: { in: ambulatoriIds },
                        stato: 'IN_ATTESA',
                        deletedAt: null
                    }
                })
            ]);

            return {
                totalAmbulatori,
                totalAppuntamentiOggi,
                totalVisiteOggi,
                appuntamentiInAttesa
            };
        } catch (error) {
            logger.error('Failed to get poliambulatorio statistics', {
                component: 'poliambulatorio-service',
                action: 'getStatistics',
                error: error.message,
                poliambulatorioId,
                tenantId
            });
            throw error;
        }
    }
}

export default PoliambulatorioService;
