/**
 * Strumento Service
 * Business logic for medical equipment management
 * 
 * @module services/clinical/StrumentoService
 * @updated Project 45 - Added branch-aware support
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { BRANCH_TYPES } from '../../utils/branchHelper.js';

// Default branch for this entity
const DEFAULT_BRANCH = BRANCH_TYPES.MEDICA;

export class StrumentoService {
    /**
     * Create a new strumento
     * @param {Object} data - Strumento data
     * @param {string} tenantId - Tenant ID
     * @param {string} branchType - Branch type (default: MEDICA)
     * @returns {Promise<Object>} Created strumento
     */
    static async create(data, tenantId, branchType = DEFAULT_BRANCH) {
        try {
            const strumento = await prisma.strumento.create({
                data: {
                    ...data,
                    tenantId,
                    branchType, // Project 45: Add branchType
                },
                include: {
                    ambulatoriAssegnati: {
                        where: { deletedAt: null },
                        include: {
                            ambulatorio: {
                                select: { id: true, nome: true, codice: true }
                            }
                        }
                    }
                }
            });

            logger.info('Strumento created', {
                component: 'strumento-service',
                action: 'create',
                strumentoId: strumento.id,
                codice: strumento.codice,
                tenantId,
                branchType,
            });

            return strumento;
        } catch (error) {
            logger.error('Failed to create strumento', {
                component: 'strumento-service',
                action: 'create',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get strumento by ID
     * @param {string} id - Strumento ID
     * @param {string} tenantId - Tenant ID
     * @param {string} branchType - Branch type (optional for backward compatibility)
     * @returns {Promise<Object|null>} Strumento or null
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

            const strumento = await prisma.strumento.findFirst({
                where,
                include: {
                    ambulatoriAssegnati: {
                        where: { deletedAt: null },
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
                    }
                }
            });

            return strumento;
        } catch (error) {
            logger.error('Failed to get strumento', {
                component: 'strumento-service',
                action: 'getById',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all strumenti for tenant
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Query options
     * @param {string} branchType - Branch type (optional for backward compatibility)
     * @returns {Promise<Object>} Strumenti with pagination
     */
    static async getAll(tenantId, options = {}, branchType = null) {
        try {
            const {
                page = 1,
                limit = 20,
                search = '',
                stato = null,
                tipologia = null,
                needsMaintenance = false,
                orderBy = 'nome',
                orderDir = 'asc'
            } = options;

            const skip = (page - 1) * limit;

            const where = {
                tenantId,
                deletedAt: null,
                ...(stato && { stato }),
                ...(tipologia && { tipologia }),
                // Project 45: Add branchType filter if provided
                ...(branchType && { branchType }),
                ...(search && {
                    OR: [
                        { nome: { contains: search, mode: 'insensitive' } },
                        { codice: { contains: search, mode: 'insensitive' } },
                        { marca: { contains: search, mode: 'insensitive' } },
                        { modello: { contains: search, mode: 'insensitive' } },
                        { numeroSerie: { contains: search, mode: 'insensitive' } }
                    ]
                })
            };

            // Filter for maintenance needed
            if (needsMaintenance) {
                const today = new Date();
                const thirtyDaysFromNow = new Date(today);
                thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

                where.OR = [
                    { prossimaManutenzione: { lte: thirtyDaysFromNow } },
                    { stato: { in: ['MANUTENZIONE', 'GUASTO'] } }
                ];
            }

            const [strumenti, total] = await Promise.all([
                prisma.strumento.findMany({
                    where,
                    include: {
                        ambulatorio: {
                            select: { id: true, nome: true, codice: true }
                        },
                        _count: {
                            select: { ambulatoriAssegnati: true }
                        }
                    },
                    orderBy: { [orderBy]: orderDir },
                    skip,
                    take: limit
                }),
                prisma.strumento.count({ where })
            ]);

            return {
                data: strumenti,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Failed to get strumenti', {
                component: 'strumento-service',
                action: 'getAll',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get strumenti by ambulatorio
     * @param {string} ambulatorioId - Ambulatorio ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Strumenti list
     */
    static async getByAmbulatorio(ambulatorioId, tenantId) {
        try {
            const associations = await prisma.strumentoAmbulatorio.findMany({
                where: {
                    ambulatorioId,
                    deletedAt: null,
                    strumento: {
                        tenantId,
                        deletedAt: null
                    }
                },
                include: {
                    strumento: true
                }
            });

            return associations.map(a => ({
                ...a.strumento,
                dataAssegnazione: a.dataAssegnazione,
                dataFineAssegnazione: a.dataFineAssegnazione
            }));
        } catch (error) {
            logger.error('Failed to get strumenti by ambulatorio', {
                component: 'strumento-service',
                action: 'getByAmbulatorio',
                error: error.message,
                ambulatorioId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get strumenti by stato
     * @param {string} stato - Equipment state
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Strumenti list
     */
    static async getByStato(stato, tenantId) {
        try {
            const strumenti = await prisma.strumento.findMany({
                where: {
                    tenantId,
                    stato,
                    deletedAt: null
                },
                orderBy: { nome: 'asc' }
            });

            return strumenti;
        } catch (error) {
            logger.error('Failed to get strumenti by stato', {
                component: 'strumento-service',
                action: 'getByStato',
                error: error.message,
                stato,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update strumento
     * @param {string} id - Strumento ID
     * @param {Object} data - Update data
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Updated strumento
     */
    static async update(id, data, tenantId) {
        try {
            const existing = await prisma.strumento.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Strumento not found');
            }

            const updated = await prisma.strumento.update({
                where: { id },
                data: {
                    ...data,
                    updatedAt: new Date()
                },
                include: {
                    ambulatoriAssegnati: {
                        where: { deletedAt: null },
                        include: {
                            ambulatorio: {
                                select: { id: true, nome: true }
                            }
                        }
                    }
                }
            });

            logger.info('Strumento updated', {
                component: 'strumento-service',
                action: 'update',
                strumentoId: id,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to update strumento', {
                component: 'strumento-service',
                action: 'update',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Change strumento state
     * @param {string} id - Strumento ID
     * @param {string} newStato - New state
     * @param {string} tenantId - Tenant ID
     * @param {string} note - Optional note
     * @returns {Promise<Object>} Updated strumento
     */
    static async changeStato(id, newStato, tenantId, note = null) {
        try {
            const existing = await prisma.strumento.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Strumento not found');
            }

            const updateData = {
                stato: newStato,
                updatedAt: new Date()
            };

            // Auto-update maintenance date if entering/exiting maintenance
            if (newStato === 'MANUTENZIONE') {
                updateData.dataUltimaManutenz = new Date();
            }

            if (note) {
                updateData.note = existing.note
                    ? `${existing.note}\n[${new Date().toISOString()}] ${note}`
                    : `[${new Date().toISOString()}] ${note}`;
            }

            const updated = await prisma.strumento.update({
                where: { id },
                data: updateData
            });

            logger.info('Strumento stato changed', {
                component: 'strumento-service',
                action: 'changeStato',
                strumentoId: id,
                oldStato: existing.stato,
                newStato,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to change strumento stato', {
                component: 'strumento-service',
                action: 'changeStato',
                error: error.message,
                id,
                newStato,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete strumento
     * @param {string} id - Strumento ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Success status
     */
    static async delete(id, tenantId) {
        try {
            const existing = await prisma.strumento.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Strumento not found');
            }

            // Soft delete with cascade to associations
            await prisma.$transaction([
                prisma.strumento.update({
                    where: { id },
                    data: { deletedAt: new Date() }
                }),
                prisma.strumentoAmbulatorio.updateMany({
                    where: { strumentoId: id },
                    data: { deletedAt: new Date() }
                })
            ]);

            logger.info('Strumento deleted', {
                component: 'strumento-service',
                action: 'delete',
                strumentoId: id,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('Failed to delete strumento', {
                component: 'strumento-service',
                action: 'delete',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Assign strumento to ambulatorio
     * @param {string} strumentoId - Strumento ID
     * @param {string} ambulatorioId - Ambulatorio ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Assignment record
     */
    static async assignToAmbulatorio(strumentoId, ambulatorioId, tenantId) {
        try {
            // Verify both belong to tenant
            const [strumento, ambulatorio] = await Promise.all([
                prisma.strumento.findFirst({
                    where: { id: strumentoId, tenantId, deletedAt: null }
                }),
                prisma.ambulatorio.findFirst({
                    where: { id: ambulatorioId, tenantId, deletedAt: null }
                })
            ]);

            if (!strumento) throw new Error('Strumento not found');
            if (!ambulatorio) throw new Error('Ambulatorio not found');

            // Check if already assigned
            const existing = await prisma.strumentoAmbulatorio.findFirst({
                where: { strumentoId, ambulatorioId }
            });

            if (existing) {
                // Reactivate if deactivated
                return prisma.strumentoAmbulatorio.update({
                    where: { id: existing.id },
                    data: {
                        deletedAt: null,
                        dataAssegnazione: new Date(),
                        dataFineAssegnazione: null
                    }
                });
            }

            const assignment = await prisma.strumentoAmbulatorio.create({
                data: {
                    strumentoId,
                    ambulatorioId,
                    dataAssegnazione: new Date()
                }
            });

            logger.info('Strumento assigned to ambulatorio', {
                component: 'strumento-service',
                action: 'assignToAmbulatorio',
                strumentoId,
                ambulatorioId,
                tenantId
            });

            return assignment;
        } catch (error) {
            logger.error('Failed to assign strumento', {
                component: 'strumento-service',
                action: 'assignToAmbulatorio',
                error: error.message,
                strumentoId,
                ambulatorioId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Remove strumento from ambulatorio
     * @param {string} strumentoId - Strumento ID
     * @param {string} ambulatorioId - Ambulatorio ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Success status
     */
    static async removeFromAmbulatorio(strumentoId, ambulatorioId, tenantId) {
        try {
            const assignment = await prisma.strumentoAmbulatorio.findFirst({
                where: { strumentoId, ambulatorioId }
            });

            if (!assignment) {
                throw new Error('Assignment not found');
            }

            await prisma.strumentoAmbulatorio.update({
                where: { id: assignment.id },
                data: {
                    deletedAt: new Date(),
                    dataFineAssegnazione: new Date()
                }
            });

            logger.info('Strumento removed from ambulatorio', {
                component: 'strumento-service',
                action: 'removeFromAmbulatorio',
                strumentoId,
                ambulatorioId,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('Failed to remove strumento', {
                component: 'strumento-service',
                action: 'removeFromAmbulatorio',
                error: error.message,
                strumentoId,
                ambulatorioId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get maintenance schedule
     * @param {string} tenantId - Tenant ID
     * @param {number} daysAhead - Days to look ahead
     * @returns {Promise<Array>} Strumenti needing maintenance
     */
    static async getMaintenanceSchedule(tenantId, daysAhead = 30) {
        try {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysAhead);

            const strumenti = await prisma.strumento.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    stato: { not: 'DISMESSO' },
                    OR: [
                        {
                            prossimaManutenzione: { lte: futureDate }
                        },
                        { stato: 'MANUTENZIONE' },
                        { stato: 'GUASTO' }
                    ]
                },
                include: {
                    ambulatoriAssegnati: {
                        where: { deletedAt: null },
                        include: {
                            ambulatorio: {
                                select: { id: true, nome: true }
                            }
                        }
                    }
                },
                orderBy: { prossimaManutenzione: 'asc' }
            });

            return strumenti.map(s => ({
                ...s,
                urgency: this.calculateMaintenanceUrgency(s)
            }));
        } catch (error) {
            logger.error('Failed to get maintenance schedule', {
                component: 'strumento-service',
                action: 'getMaintenanceSchedule',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Calculate maintenance urgency
     * @param {Object} strumento - Strumento data
     * @returns {string} Urgency level (critical, high, medium, low)
     */
    static calculateMaintenanceUrgency(strumento) {
        if (strumento.stato === 'GUASTO') return 'critical';
        if (strumento.stato === 'MANUTENZIONE') return 'high';

        if (!strumento.dataProssimaManutenz) return 'low';

        const today = new Date();
        const nextMaint = new Date(strumento.dataProssimaManutenz);
        const daysUntilMaint = Math.floor((nextMaint - today) / (1000 * 60 * 60 * 24));

        if (daysUntilMaint < 0) return 'critical';
        if (daysUntilMaint <= 7) return 'high';
        if (daysUntilMaint <= 30) return 'medium';
        return 'low';
    }

    /**
     * Get statistics
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Statistics
     */
    static async getStatistics(tenantId) {
        try {
            const [
                total,
                byStato,
                needingMaintenance
            ] = await Promise.all([
                prisma.strumento.count({
                    where: { tenantId, deletedAt: null, stato: { not: 'DISMESSO' } }
                }),
                prisma.strumento.groupBy({
                    by: ['stato'],
                    where: { tenantId, deletedAt: null },
                    _count: { stato: true }
                }),
                prisma.strumento.count({
                    where: {
                        tenantId,
                        deletedAt: null,
                        stato: { not: 'DISMESSO' },
                        prossimaManutenzione: { lte: new Date() }
                    }
                })
            ]);

            return {
                total,
                byStato: byStato.reduce((acc, item) => {
                    acc[item.stato] = item._count.stato;
                    return acc;
                }, {}),
                needingMaintenance,
                disponibili: byStato.find(s => s.stato === 'DISPONIBILE')?._count.stato || 0
            };
        } catch (error) {
            logger.error('Failed to get strumento statistics', {
                component: 'strumento-service',
                action: 'getStatistics',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get ROI report for equipment
     * Calculates return on investment based on usage and maintenance costs
     * @param {string} strumentoId - Strumento ID (optional, if null returns all)
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Options (dateFrom, dateTo)
     * @returns {Promise<Object>} ROI report
     */
    static async getROIReport(strumentoId, tenantId, options = {}) {
        try {
            const { dateFrom, dateTo } = options;

            const startDate = dateFrom ? new Date(dateFrom) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
            const endDate = dateTo ? new Date(dateTo) : new Date();

            // Get strumento(i)
            const where = {
                tenantId,
                deletedAt: null,
                ...(strumentoId && { id: strumentoId })
            };

            const strumenti = await prisma.strumento.findMany({
                where,
                include: {
                    manutenzioni: {
                        where: {
                            deletedAt: null,
                            dataEsecuzione: {
                                gte: startDate,
                                lte: endDate
                            }
                        }
                    },
                    ambulatoriAssegnati: {
                        where: { deletedAt: null },
                        include: {
                            ambulatorio: {
                                select: {
                                    id: true,
                                    nome: true
                                }
                            }
                        }
                    }
                }
            });

            // Calculate ROI for each strumento
            const reports = await Promise.all(strumenti.map(async (strumento) => {
                // Get ambulatorio IDs where this strumento is assigned
                const ambulatorioIds = strumento.ambulatoriAssegnati.map(a => a.ambulatorioId);

                // Count completed appointments in these ambulatori during the period
                const completedAppointments = ambulatorioIds.length > 0
                    ? await prisma.appuntamento.count({
                        where: {
                            tenantId,
                            ambulatorioId: { in: ambulatorioIds },
                            stato: 'COMPLETATO',
                            dataOra: {
                                gte: startDate,
                                lte: endDate
                            },
                            deletedAt: null
                        }
                    })
                    : 0;

                // Calculate total maintenance cost
                const totalMaintenanceCost = strumento.manutenzioni.reduce((sum, m) => {
                    return sum + (m.costo ? parseFloat(m.costo) : 0);
                }, 0);

                // Calculate equipment age in months
                const equipmentAge = strumento.dataAcquisto
                    ? Math.floor((new Date() - new Date(strumento.dataAcquisto)) / (1000 * 60 * 60 * 24 * 30))
                    : null;

                // Calculate days since last maintenance
                const lastMaintenance = strumento.manutenzioni
                    .filter(m => m.esito !== 'negativo')
                    .sort((a, b) => new Date(b.dataEsecuzione) - new Date(a.dataEsecuzione))[0];

                const daysSinceLastMaintenance = lastMaintenance
                    ? Math.floor((new Date() - new Date(lastMaintenance.dataEsecuzione)) / (1000 * 60 * 60 * 24))
                    : null;

                // Calculate availability rate (days not in maintenance/broken vs total days)
                const periodDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
                const maintenanceDays = strumento.manutenzioni.length * 1; // Assume 1 day per maintenance
                const availabilityRate = periodDays > 0
                    ? Math.round(((periodDays - maintenanceDays) / periodDays) * 100)
                    : 100;

                // Utilization: appointments per ambulatorio where assigned
                const utilizationRate = ambulatorioIds.length > 0
                    ? Math.round(completedAppointments / ambulatorioIds.length)
                    : 0;

                return {
                    strumento: {
                        id: strumento.id,
                        codice: strumento.codice,
                        nome: strumento.nome,
                        marca: strumento.marca,
                        modello: strumento.modello,
                        stato: strumento.stato,
                        dataAcquisto: strumento.dataAcquisto
                    },
                    periodo: {
                        da: startDate,
                        a: endDate,
                        giorni: periodDays
                    },
                    utilizzo: {
                        ambulatoriAssegnati: strumento.ambulatoriAssegnati.map(a => ({
                            id: a.ambulatorio.id,
                            nome: a.ambulatorio.nome,
                            dataAssegnazione: a.dataAssegnazione
                        })),
                        appuntamentiCompletati: completedAppointments,
                        utilizationRate
                    },
                    manutenzione: {
                        numeroInterventi: strumento.manutenzioni.length,
                        costoTotale: Math.round(totalMaintenanceCost * 100) / 100,
                        costoMedio: strumento.manutenzioni.length > 0
                            ? Math.round((totalMaintenanceCost / strumento.manutenzioni.length) * 100) / 100
                            : 0,
                        ultimaManutenzione: lastMaintenance?.dataEsecuzione || null,
                        giorniDaUltimaManutenzione: daysSinceLastMaintenance,
                        prossimaScadenza: strumento.dataProssimaManutenz
                    },
                    indicatori: {
                        etaMesi: equipmentAge,
                        disponibilita: availabilityRate,
                        costoPerAppuntamento: completedAppointments > 0
                            ? Math.round((totalMaintenanceCost / completedAppointments) * 100) / 100
                            : null,
                        efficienza: this._calculateEfficiencyScore(strumento, completedAppointments, totalMaintenanceCost, availabilityRate)
                    }
                };
            }));

            // If single strumento requested, return just that report
            if (strumentoId && reports.length === 1) {
                return reports[0];
            }

            // Calculate aggregate statistics
            const aggregateStats = this._calculateAggregateROI(reports);

            logger.info('ROI report generated', {
                component: 'strumento-service',
                action: 'getROIReport',
                strumentoId,
                strumentiCount: reports.length,
                tenantId
            });

            return {
                reports,
                aggregate: aggregateStats,
                periodo: {
                    da: startDate,
                    a: endDate
                }
            };
        } catch (error) {
            logger.error('Failed to generate ROI report', {
                component: 'strumento-service',
                action: 'getROIReport',
                error: error.message,
                strumentoId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Calculate efficiency score for equipment
     * @private
     * @param {Object} strumento - Strumento data
     * @param {number} appointments - Completed appointments count
     * @param {number} maintenanceCost - Total maintenance cost
     * @param {number} availability - Availability percentage
     * @returns {string} Efficiency rating (A-F)
     */
    static _calculateEfficiencyScore(strumento, appointments, maintenanceCost, availability) {
        let score = 0;

        // Availability contributes 30%
        score += (availability / 100) * 30;

        // Usage contributes 40% (based on appointments per month)
        const monthlyUsage = appointments / 12; // Assuming annual period
        if (monthlyUsage >= 50) score += 40;
        else if (monthlyUsage >= 30) score += 30;
        else if (monthlyUsage >= 15) score += 20;
        else if (monthlyUsage >= 5) score += 10;

        // State contributes 20%
        if (strumento.stato === 'DISPONIBILE') score += 20;
        else if (strumento.stato === 'IN_USO') score += 18;
        else if (strumento.stato === 'MANUTENZIONE') score += 5;
        else if (strumento.stato === 'GUASTO') score += 0;

        // Low maintenance cost contributes 10%
        const costPerAppointment = appointments > 0 ? maintenanceCost / appointments : maintenanceCost;
        if (costPerAppointment < 5) score += 10;
        else if (costPerAppointment < 15) score += 7;
        else if (costPerAppointment < 30) score += 4;
        else score += 0;

        // Convert score to grade
        if (score >= 85) return 'A';
        if (score >= 70) return 'B';
        if (score >= 55) return 'C';
        if (score >= 40) return 'D';
        return 'F';
    }

    /**
     * Calculate aggregate ROI statistics
     * @private
     * @param {Array} reports - Individual strumento reports
     * @returns {Object} Aggregate statistics
     */
    static _calculateAggregateROI(reports) {
        if (!reports.length) {
            return {
                totaleStrumenti: 0,
                costoManutenzioneComplessivo: 0,
                appuntamentiComplessivi: 0,
                disponibilitaMedia: 0,
                distribuzioneEfficienza: {}
            };
        }

        const totalMaintenance = reports.reduce((sum, r) => sum + r.manutenzione.costoTotale, 0);
        const totalAppointments = reports.reduce((sum, r) => sum + r.utilizzo.appuntamentiCompletati, 0);
        const avgAvailability = reports.reduce((sum, r) => sum + r.indicatori.disponibilita, 0) / reports.length;

        // Count efficiency grades
        const efficiencyDist = reports.reduce((acc, r) => {
            const grade = r.indicatori.efficienza;
            acc[grade] = (acc[grade] || 0) + 1;
            return acc;
        }, {});

        // Best and worst performers
        const sortedByEfficiency = [...reports].sort((a, b) => {
            const gradeOrder = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'F': 5 };
            return gradeOrder[a.indicatori.efficienza] - gradeOrder[b.indicatori.efficienza];
        });

        return {
            totaleStrumenti: reports.length,
            costoManutenzioneComplessivo: Math.round(totalMaintenance * 100) / 100,
            appuntamentiComplessivi: totalAppointments,
            disponibilitaMedia: Math.round(avgAvailability),
            distribuzioneEfficienza: efficiencyDist,
            migliorePerformance: sortedByEfficiency[0]?.strumento.nome || null,
            peggiorPerformance: sortedByEfficiency[sortedByEfficiency.length - 1]?.strumento.nome || null,
            costoMedioPerAppuntamento: totalAppointments > 0
                ? Math.round((totalMaintenance / totalAppointments) * 100) / 100
                : null
        };
    }

    /**
     * Get ROI comparison between equipment
     * @param {string[]} strumentoIds - Array of strumento IDs to compare
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Options (dateFrom, dateTo)
     * @returns {Promise<Object>} Comparison report
     */
    static async getROIComparison(strumentoIds, tenantId, options = {}) {
        try {
            if (!strumentoIds || strumentoIds.length < 2) {
                throw new Error('At least 2 equipment IDs required for comparison');
            }

            const reports = await Promise.all(
                strumentoIds.map(id => this.getROIReport(id, tenantId, options))
            );

            // Rank by different metrics
            const rankings = {
                byEfficiency: [...reports]
                    .sort((a, b) => {
                        const gradeOrder = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'F': 5 };
                        return gradeOrder[a.indicatori.efficienza] - gradeOrder[b.indicatori.efficienza];
                    })
                    .map((r, i) => ({ nome: r.strumento.nome, rank: i + 1, valore: r.indicatori.efficienza })),
                byUsage: [...reports]
                    .sort((a, b) => b.utilizzo.appuntamentiCompletati - a.utilizzo.appuntamentiCompletati)
                    .map((r, i) => ({ nome: r.strumento.nome, rank: i + 1, valore: r.utilizzo.appuntamentiCompletati })),
                byMaintenanceCost: [...reports]
                    .sort((a, b) => a.manutenzione.costoTotale - b.manutenzione.costoTotale)
                    .map((r, i) => ({ nome: r.strumento.nome, rank: i + 1, valore: r.manutenzione.costoTotale })),
                byAvailability: [...reports]
                    .sort((a, b) => b.indicatori.disponibilita - a.indicatori.disponibilita)
                    .map((r, i) => ({ nome: r.strumento.nome, rank: i + 1, valore: r.indicatori.disponibilita }))
            };

            logger.info('ROI comparison generated', {
                component: 'strumento-service',
                action: 'getROIComparison',
                strumentiCount: reports.length,
                tenantId
            });

            return {
                strumenti: reports,
                rankings,
                raccomandazione: this._generateRecommendation(reports)
            };
        } catch (error) {
            logger.error('Failed to generate ROI comparison', {
                component: 'strumento-service',
                action: 'getROIComparison',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Generate recommendation based on ROI data
     * @private
     * @param {Array} reports - ROI reports
     * @returns {Object} Recommendation
     */
    static _generateRecommendation(reports) {
        const issues = [];
        const suggestions = [];

        for (const report of reports) {
            const name = report.strumento.nome;

            // Check for issues
            if (report.indicatori.efficienza === 'F' || report.indicatori.efficienza === 'D') {
                issues.push(`${name}: efficienza bassa (${report.indicatori.efficienza})`);
            }

            if (report.indicatori.disponibilita < 80) {
                issues.push(`${name}: disponibilità sotto 80%`);
            }

            if (report.manutenzione.giorniDaUltimaManutenzione > 180) {
                suggestions.push(`${name}: considerare manutenzione preventiva (${report.manutenzione.giorniDaUltimaManutenzione} giorni dall'ultima)`);
            }

            if (report.utilizzo.appuntamentiCompletati === 0) {
                suggestions.push(`${name}: nessun utilizzo nel periodo - verificare assegnazione ambulatori`);
            }

            if (report.strumento.stato === 'GUASTO') {
                issues.push(`${name}: strumento guasto - riparazione urgente`);
            }
        }

        return {
            problemiCritici: issues,
            suggerimenti: suggestions,
            riepilogo: issues.length === 0
                ? 'Tutti gli strumenti operano entro i parametri normali'
                : `${issues.length} problemi critici identificati`
        };
    }

    // ============================================
    // TIPOLOGIA STRUMENTI - Nuovi metodi
    // ============================================

    /**
     * Get strumenti by tipologia
     * @param {string} tipologia - TipologiaStrumento enum value
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Filter options
     * @returns {Promise<Array>} Strumenti of the specified tipologia
     */
    static async getByTipologia(tipologia, tenantId, options = {}) {
        try {
            const { statoAttivo = true, ambulatorioId = null } = options;

            const where = {
                tipologia,
                tenantId,
                deletedAt: null,
                ...(statoAttivo && { stato: 'ATTIVO' }),
                ...(ambulatorioId && { ambulatorioId })
            };

            const strumenti = await prisma.strumento.findMany({
                where,
                include: {
                    ambulatorio: {
                        select: { id: true, nome: true, codice: true }
                    }
                },
                orderBy: { nome: 'asc' }
            });

            logger.info('Retrieved strumenti by tipologia', {
                component: 'strumento-service',
                action: 'getByTipologia',
                tipologia,
                count: strumenti.length,
                tenantId
            });

            return strumenti;
        } catch (error) {
            logger.error('Failed to get strumenti by tipologia', {
                component: 'strumento-service',
                action: 'getByTipologia',
                error: error.message,
                tipologia,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get available tipologie (enum values)
     * @returns {Array<string>} List of tipologie
     */
    static getTipologieDisponibili() {
        return [
            'ECOGRAFO',
            'ELETTROCARDIOGRAFO',
            'LASER',
            'CARBOSSITERAPIA',
            'SPIROMETRO',
            'AUDIOMETRO',
            'OFTALMOSCOPIO',
            'DERMATOSCOPIO',
            'HOLTER_ECG',
            'HOLTER_PRESSORIO',
            'ELETTROMIOGRAFO',
            'DENSITOMETRO',
            'COLPOSCOPIO',
            'ENDOSCOPIO',
            'RADIOGRAFO',
            'MAMMOGRAFO',
            'TAC',
            'RMN',
            'MONITOR_MULTIPARAMETRICO',
            'DEFIBRILLATORE',
            'ELETTROBISTURI',
            'CRIOCHIRURGIA',
            'ALTRO'
        ];
    }

    /**
     * Count strumenti by tipologia
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Counts by tipologia
     */
    static async countByTipologia(tenantId) {
        try {
            const counts = await prisma.strumento.groupBy({
                by: ['tipologia'],
                where: {
                    tenantId,
                    deletedAt: null,
                    tipologia: { not: null }
                },
                _count: { id: true }
            });

            return counts.map(c => ({
                tipologia: c.tipologia,
                count: c._count.id
            }));
        } catch (error) {
            logger.error('Failed to count strumenti by tipologia', {
                component: 'strumento-service',
                action: 'countByTipologia',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Verify if tipologia is available in an ambulatorio
     * Checks if there's at least one active strumento of the given tipologia
     * @param {string} tipologia - TipologiaStrumento
     * @param {string} ambulatorioId - Ambulatorio ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<boolean>} True if tipologia is available
     */
    static async isTipologiaDisponibile(tipologia, ambulatorioId, tenantId) {
        try {
            const count = await prisma.strumento.count({
                where: {
                    tipologia,
                    tenantId,
                    deletedAt: null,
                    stato: 'ATTIVO',
                    OR: [
                        { ambulatorioId },
                        {
                            ambulatoriAssegnati: {
                                some: {
                                    ambulatorioId,
                                    deletedAt: null
                                }
                            }
                        }
                    ]
                }
            });

            return count > 0;
        } catch (error) {
            logger.error('Failed to check tipologia availability', {
                component: 'strumento-service',
                action: 'isTipologiaDisponibile',
                error: error.message,
                tipologia,
                ambulatorioId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get tipologie available in an ambulatorio
     * @param {string} ambulatorioId - Ambulatorio ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array<string>>} List of available tipologie
     */
    static async getTipologieByAmbulatorio(ambulatorioId, tenantId) {
        try {
            const strumenti = await prisma.strumento.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    stato: 'ATTIVO',
                    tipologia: { not: null },
                    OR: [
                        { ambulatorioId },
                        {
                            ambulatoriAssegnati: {
                                some: {
                                    ambulatorioId,
                                    deletedAt: null
                                }
                            }
                        }
                    ]
                },
                select: { tipologia: true },
                distinct: ['tipologia']
            });

            return strumenti.map(s => s.tipologia).filter(Boolean);
        } catch (error) {
            logger.error('Failed to get tipologie by ambulatorio', {
                component: 'strumento-service',
                action: 'getTipologieByAmbulatorio',
                error: error.message,
                ambulatorioId,
                tenantId
            });
            throw error;
        }
    }
}

export default StrumentoService;
