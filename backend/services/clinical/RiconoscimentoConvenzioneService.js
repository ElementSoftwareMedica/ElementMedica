/**
 * RiconoscimentoConvenzione Service
 * Business logic for convention recognition/rewards management
 * 
 * Gestisce i riconoscimenti/premi alle aziende per convenzioni:
 * - Definizione riconoscimenti (percentuale o valore assoluto)
 * - Associazione a bundle o prestazioni
 * - Tracking riconoscimenti erogati per paziente
 * 
 * @module services/clinical/RiconoscimentoConvenzioneService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

export class RiconoscimentoConvenzioneService {
    // =========================================================
    // CONVENZIONE-AZIENDA MANAGEMENT
    // =========================================================

    /**
     * Associate an azienda (company) to a convenzione
     * @param {string} convenzioneId - Convenzione ID
     * @param {string} aziendaId - Company ID
     * @param {Object} options - Additional options
     * @param {string} tenantId - Tenant ID
     * @param {string} userId - User performing the action
     * @returns {Promise<Object>} Created association
     */
    static async associateAzienda(convenzioneId, aziendaId, options, tenantId, userId) {
        try {
            // Verify convenzione exists
            const convenzione = await prisma.convenzione.findFirst({
                where: { id: convenzioneId, tenantId, deletedAt: null }
            });

            if (!convenzione) {
                throw new Error('Convenzione non trovata');
            }

            // Verify company exists
            const azienda = await prisma.company.findFirst({
                where: { id: aziendaId, tenantId, deletedAt: null }
            });

            if (!azienda) {
                throw new Error('Azienda non trovata');
            }

            // Check if already associated
            const existing = await prisma.convenzioneAzienda.findFirst({
                where: { convenzioneId, aziendaId, deletedAt: null }
            });

            if (existing) {
                throw new Error('Azienda già associata a questa convenzione');
            }

            const association = await prisma.convenzioneAzienda.create({
                data: {
                    convenzioneId,
                    aziendaId,
                    tenantId,
                    createdBy: userId,
                    referenteAziendale: options.referenteAziendale || null,
                    emailReferente: options.emailReferente || null,
                    telefonoReferente: options.telefonoReferente || null,
                    note: options.note || null,
                    dataAdesione: options.dataAdesione ? new Date(options.dataAdesione) : new Date(),
                    dataFineAdesione: options.dataFineAdesione ? new Date(options.dataFineAdesione) : null,
                    attiva: options.attiva !== false
                },
                include: {
                    convenzione: { select: { id: true, codice: true, nome: true } },
                    azienda: { select: { id: true, ragioneSociale: true, piva: true } }
                }
            });

            logger.info('Azienda associated to convenzione', {
                component: 'riconoscimento-service',
                action: 'associateAzienda',
                convenzioneId,
                aziendaId,
                tenantId
            });

            return association;
        } catch (error) {
            logger.error('Failed to associate azienda', {
                component: 'riconoscimento-service',
                action: 'associateAzienda',
                error: error.message,
                convenzioneId,
                aziendaId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Remove azienda from convenzione
     * @param {string} convenzioneAziendaId - Association ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Deleted association
     */
    static async removeAzienda(convenzioneAziendaId, tenantId) {
        try {
            const association = await prisma.convenzioneAzienda.findFirst({
                where: { id: convenzioneAziendaId, tenantId, deletedAt: null }
            });

            if (!association) {
                throw new Error('Associazione non trovata');
            }

            const deleted = await prisma.convenzioneAzienda.update({
                where: { id: convenzioneAziendaId },
                data: { deletedAt: new Date(), attiva: false }
            });

            logger.info('Azienda removed from convenzione', {
                component: 'riconoscimento-service',
                action: 'removeAzienda',
                convenzioneAziendaId,
                tenantId
            });

            return deleted;
        } catch (error) {
            logger.error('Failed to remove azienda', {
                component: 'riconoscimento-service',
                action: 'removeAzienda',
                error: error.message,
                convenzioneAziendaId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all aziende for a convenzione
     * @param {string} convenzioneId - Convenzione ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Aziende list
     */
    static async getAziendeByConvenzione(convenzioneId, tenantId) {
        try {
            const aziende = await prisma.convenzioneAzienda.findMany({
                where: { convenzioneId, tenantId, deletedAt: null },
                include: {
                    azienda: {
                        select: {
                            id: true,
                            ragioneSociale: true,
                            piva: true,
                            codiceFiscale: true,
                            mail: true,
                            telefono: true,
                            citta: true,
                            sedeAzienda: true
                        }
                    },
                    riconoscimenti: {
                        where: { deletedAt: null, attivo: true },
                        include: {
                            bundle: { select: { id: true, codice: true, nome: true } },
                            prestazione: { select: { id: true, codice: true, nome: true } }
                        }
                    }
                },
                orderBy: { azienda: { ragioneSociale: 'asc' } }
            });

            return aziende;
        } catch (error) {
            logger.error('Failed to get aziende by convenzione', {
                component: 'riconoscimento-service',
                action: 'getAziendeByConvenzione',
                error: error.message,
                convenzioneId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update azienda association
     * @param {string} convenzioneAziendaId - Association ID
     * @param {Object} data - Update data
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Updated association
     */
    static async updateAziendaAssociation(convenzioneAziendaId, data, tenantId) {
        try {
            const existing = await prisma.convenzioneAzienda.findFirst({
                where: { id: convenzioneAziendaId, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Associazione non trovata');
            }

            const updated = await prisma.convenzioneAzienda.update({
                where: { id: convenzioneAziendaId },
                data: {
                    referenteAziendale: data.referenteAziendale ?? existing.referenteAziendale,
                    emailReferente: data.emailReferente ?? existing.emailReferente,
                    telefonoReferente: data.telefonoReferente ?? existing.telefonoReferente,
                    note: data.note ?? existing.note,
                    dataFineAdesione: data.dataFineAdesione ? new Date(data.dataFineAdesione) : existing.dataFineAdesione,
                    attiva: data.attiva ?? existing.attiva
                },
                include: {
                    convenzione: { select: { id: true, codice: true, nome: true } },
                    azienda: { select: { id: true, ragioneSociale: true, piva: true } }
                }
            });

            return updated;
        } catch (error) {
            logger.error('Failed to update azienda association', {
                component: 'riconoscimento-service',
                action: 'updateAziendaAssociation',
                error: error.message,
                convenzioneAziendaId,
                tenantId
            });
            throw error;
        }
    }

    // =========================================================
    // RICONOSCIMENTO DEFINITION
    // =========================================================

    /**
     * Create a new riconoscimento for a convenzione-azienda
     * @param {Object} data - Riconoscimento data
     * @param {string} tenantId - Tenant ID
     * @param {string} userId - User performing the action
     * @returns {Promise<Object>} Created riconoscimento
     */
    static async createRiconoscimento(data, tenantId, userId) {
        try {
            // Verify convenzione-azienda exists
            const convenzioneAzienda = await prisma.convenzioneAzienda.findFirst({
                where: { id: data.convenzioneAziendaId, tenantId, deletedAt: null }
            });

            if (!convenzioneAzienda) {
                throw new Error('Associazione convenzione-azienda non trovata');
            }

            // Validate that either bundleId OR prestazioneId is provided (not both)
            if (data.bundleId && data.prestazioneId) {
                throw new Error('Specificare solo bundle OPPURE prestazione, non entrambi');
            }

            if (!data.bundleId && !data.prestazioneId) {
                throw new Error('Specificare almeno un bundle o una prestazione');
            }

            // Verify bundle/prestazione exists
            if (data.bundleId) {
                const bundle = await prisma.offertaBundle.findFirst({
                    where: { id: data.bundleId, tenantId, deletedAt: null }
                });
                if (!bundle) {
                    throw new Error('Bundle non trovato');
                }
            }

            if (data.prestazioneId) {
                const prestazione = await prisma.prestazione.findFirst({
                    where: { id: data.prestazioneId, tenantId, deletedAt: null }
                });
                if (!prestazione) {
                    throw new Error('Prestazione non trovata');
                }
            }

            // Validate value based on type
            if (data.tipo === 'PERCENTUALE' && (data.valore < 0 || data.valore > 100)) {
                throw new Error('La percentuale deve essere tra 0 e 100');
            }

            if (data.tipo === 'VALORE_ASSOLUTO' && data.valore < 0) {
                throw new Error('Il valore assoluto non può essere negativo');
            }

            const riconoscimento = await prisma.riconoscimentoConvenzione.create({
                data: {
                    convenzioneAziendaId: data.convenzioneAziendaId,
                    bundleId: data.bundleId || null,
                    prestazioneId: data.prestazioneId || null,
                    tipo: data.tipo,
                    valore: data.valore,
                    valoreMinimo: data.valoreMinimo || null,
                    valoreMassimo: data.valoreMassimo || null,
                    dataInizio: data.dataInizio ? new Date(data.dataInizio) : new Date(),
                    dataFine: data.dataFine ? new Date(data.dataFine) : null,
                    attivo: data.attivo !== false,
                    descrizione: data.descrizione || null,
                    note: data.note || null,
                    tenantId,
                    createdBy: userId
                },
                include: {
                    convenzioneAzienda: {
                        include: {
                            convenzione: { select: { id: true, codice: true, nome: true } },
                            azienda: { select: { id: true, ragioneSociale: true } }
                        }
                    },
                    bundle: { select: { id: true, codice: true, nome: true, prezzoBundle: true } },
                    prestazione: { select: { id: true, codice: true, nome: true, prezzoBase: true } }
                }
            });

            logger.info('Riconoscimento created', {
                component: 'riconoscimento-service',
                action: 'createRiconoscimento',
                riconoscimentoId: riconoscimento.id,
                tipo: data.tipo,
                valore: data.valore,
                tenantId
            });

            return riconoscimento;
        } catch (error) {
            logger.error('Failed to create riconoscimento', {
                component: 'riconoscimento-service',
                action: 'createRiconoscimento',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update a riconoscimento
     * @param {string} id - Riconoscimento ID
     * @param {Object} data - Update data
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Updated riconoscimento
     */
    static async updateRiconoscimento(id, data, tenantId) {
        try {
            const existing = await prisma.riconoscimentoConvenzione.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Riconoscimento non trovato');
            }

            // Validate value if type is changing or value is provided
            const tipo = data.tipo || existing.tipo;
            const valore = data.valore !== undefined ? data.valore : existing.valore;

            if (tipo === 'PERCENTUALE' && (valore < 0 || valore > 100)) {
                throw new Error('La percentuale deve essere tra 0 e 100');
            }

            if (tipo === 'VALORE_ASSOLUTO' && valore < 0) {
                throw new Error('Il valore assoluto non può essere negativo');
            }

            const updated = await prisma.riconoscimentoConvenzione.update({
                where: { id },
                data: {
                    tipo: data.tipo ?? existing.tipo,
                    valore: data.valore ?? existing.valore,
                    valoreMinimo: data.valoreMinimo ?? existing.valoreMinimo,
                    valoreMassimo: data.valoreMassimo ?? existing.valoreMassimo,
                    dataFine: data.dataFine ? new Date(data.dataFine) : existing.dataFine,
                    attivo: data.attivo ?? existing.attivo,
                    descrizione: data.descrizione ?? existing.descrizione,
                    note: data.note ?? existing.note
                },
                include: {
                    convenzioneAzienda: {
                        include: {
                            convenzione: { select: { id: true, codice: true, nome: true } },
                            azienda: { select: { id: true, ragioneSociale: true } }
                        }
                    },
                    bundle: { select: { id: true, codice: true, nome: true, prezzoBundle: true } },
                    prestazione: { select: { id: true, codice: true, nome: true, prezzoBase: true } }
                }
            });

            return updated;
        } catch (error) {
            logger.error('Failed to update riconoscimento', {
                component: 'riconoscimento-service',
                action: 'updateRiconoscimento',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Delete a riconoscimento (soft delete)
     * @param {string} id - Riconoscimento ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Deleted riconoscimento
     */
    static async deleteRiconoscimento(id, tenantId) {
        try {
            const existing = await prisma.riconoscimentoConvenzione.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Riconoscimento non trovato');
            }

            const deleted = await prisma.riconoscimentoConvenzione.update({
                where: { id },
                data: { deletedAt: new Date(), attivo: false }
            });

            logger.info('Riconoscimento deleted', {
                component: 'riconoscimento-service',
                action: 'deleteRiconoscimento',
                id,
                tenantId
            });

            return deleted;
        } catch (error) {
            logger.error('Failed to delete riconoscimento', {
                component: 'riconoscimento-service',
                action: 'deleteRiconoscimento',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get riconoscimenti for a convenzione-azienda
     * @param {string} convenzioneAziendaId - Association ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Riconoscimenti list
     */
    static async getRiconoscimentiByConvenzioneAzienda(convenzioneAziendaId, tenantId) {
        try {
            const riconoscimenti = await prisma.riconoscimentoConvenzione.findMany({
                where: { convenzioneAziendaId, tenantId, deletedAt: null },
                include: {
                    bundle: { select: { id: true, codice: true, nome: true, prezzoBundle: true } },
                    prestazione: { select: { id: true, codice: true, nome: true, prezzoBase: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            return riconoscimenti;
        } catch (error) {
            logger.error('Failed to get riconoscimenti', {
                component: 'riconoscimento-service',
                action: 'getRiconoscimentiByConvenzioneAzienda',
                error: error.message,
                convenzioneAziendaId,
                tenantId
            });
            throw error;
        }
    }

    // =========================================================
    // RICONOSCIMENTO EROGATO TRACKING
    // =========================================================

    /**
     * Calculate and record a riconoscimento erogato
     * Used when a patient uses a bundle/prestazione under convenzione
     * @param {Object} data - Erogazione data
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Created erogazione record
     */
    static async erogaRiconoscimento(data, tenantId) {
        try {
            // Find applicable riconoscimento
            const riconoscimento = await prisma.riconoscimentoConvenzione.findFirst({
                where: {
                    id: data.riconoscimentoConvenzioneId,
                    tenantId,
                    deletedAt: null,
                    attivo: true,
                    dataInizio: { lte: new Date() },
                    OR: [
                        { dataFine: null },
                        { dataFine: { gte: new Date() } }
                    ]
                }
            });

            if (!riconoscimento) {
                throw new Error('Riconoscimento non trovato o non attivo');
            }

            // Calculate the riconoscimento amount
            let importoCalcolato;
            const importoBase = parseFloat(data.importoBase);

            if (riconoscimento.tipo === 'PERCENTUALE') {
                importoCalcolato = importoBase * (parseFloat(riconoscimento.valore) / 100);

                // Apply min/max limits
                if (riconoscimento.valoreMinimo && importoCalcolato < parseFloat(riconoscimento.valoreMinimo)) {
                    importoCalcolato = parseFloat(riconoscimento.valoreMinimo);
                }
                if (riconoscimento.valoreMassimo && importoCalcolato > parseFloat(riconoscimento.valoreMassimo)) {
                    importoCalcolato = parseFloat(riconoscimento.valoreMassimo);
                }
            } else {
                // VALORE_ASSOLUTO
                importoCalcolato = parseFloat(riconoscimento.valore);
            }

            const erogazione = await prisma.riconoscimentoErogato.create({
                data: {
                    riconoscimentoConvenzioneId: data.riconoscimentoConvenzioneId,
                    pazienteId: data.pazienteId,
                    appuntamentoId: data.appuntamentoId || null,
                    importoCalcolato,
                    importoBase,
                    stato: 'DA_EROGARE',
                    note: data.note || null,
                    tenantId
                },
                include: {
                    riconoscimentoConvenzione: {
                        include: {
                            convenzioneAzienda: {
                                include: {
                                    azienda: { select: { id: true, ragioneSociale: true } }
                                }
                            }
                        }
                    },
                    paziente: { select: { id: true, firstName: true, lastName: true } }
                }
            });

            logger.info('Riconoscimento erogato created', {
                component: 'riconoscimento-service',
                action: 'erogaRiconoscimento',
                erogazioneId: erogazione.id,
                importoCalcolato,
                tenantId
            });

            return erogazione;
        } catch (error) {
            logger.error('Failed to eroga riconoscimento', {
                component: 'riconoscimento-service',
                action: 'erogaRiconoscimento',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update stato of a riconoscimento erogato
     * @param {string} id - Erogazione ID
     * @param {string} nuovoStato - New stato (EROGATO, ANNULLATO)
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Updated erogazione
     */
    static async updateStatoErogazione(id, nuovoStato, tenantId) {
        try {
            const existing = await prisma.riconoscimentoErogato.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Erogazione non trovata');
            }

            const updateData = { stato: nuovoStato };

            if (nuovoStato === 'EROGATO') {
                updateData.dataErogazione = new Date();
            }

            const updated = await prisma.riconoscimentoErogato.update({
                where: { id },
                data: updateData
            });

            logger.info('Erogazione stato updated', {
                component: 'riconoscimento-service',
                action: 'updateStatoErogazione',
                id,
                nuovoStato,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to update erogazione stato', {
                component: 'riconoscimento-service',
                action: 'updateStatoErogazione',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get erogazioni for an azienda
     * @param {string} aziendaId - Company ID
     * @param {Object} options - Query options
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Paginated erogazioni
     */
    static async getErogazioniByAzienda(aziendaId, options, tenantId) {
        try {
            const { page = 1, pageSize = 20, stato, dataInizio, dataFine } = options;
            const skip = (page - 1) * pageSize;

            const where = {
                tenantId,
                deletedAt: null,
                riconoscimentoConvenzione: {
                    convenzioneAzienda: { aziendaId }
                }
            };

            if (stato) {
                where.stato = stato;
            }

            if (dataInizio || dataFine) {
                where.dataCalcolo = {};
                if (dataInizio) where.dataCalcolo.gte = new Date(dataInizio);
                if (dataFine) where.dataCalcolo.lte = new Date(dataFine);
            }

            const [total, erogazioni] = await Promise.all([
                prisma.riconoscimentoErogato.count({ where }),
                prisma.riconoscimentoErogato.findMany({
                    where,
                    include: {
                        riconoscimentoConvenzione: {
                            include: {
                                bundle: { select: { id: true, codice: true, nome: true } },
                                prestazione: { select: { id: true, codice: true, nome: true } },
                                convenzioneAzienda: {
                                    include: {
                                        convenzione: { select: { id: true, codice: true, nome: true } }
                                    }
                                }
                            }
                        },
                        paziente: { select: { id: true, firstName: true, lastName: true } }
                    },
                    orderBy: { dataCalcolo: 'desc' },
                    skip,
                    take: pageSize
                })
            ]);

            return {
                data: erogazioni,
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize)
                }
            };
        } catch (error) {
            logger.error('Failed to get erogazioni by azienda', {
                component: 'riconoscimento-service',
                action: 'getErogazioniByAzienda',
                error: error.message,
                aziendaId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get summary statistics for riconoscimenti
     * @param {Object} filters - Filters (convenzioneId, aziendaId, periodo)
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Statistics
     */
    static async getStatistiche(filters, tenantId) {
        try {
            const where = { tenantId, deletedAt: null };

            if (filters.aziendaId) {
                where.riconoscimentoConvenzione = {
                    convenzioneAzienda: { aziendaId: filters.aziendaId }
                };
            }

            if (filters.convenzioneId) {
                where.riconoscimentoConvenzione = {
                    ...(where.riconoscimentoConvenzione || {}),
                    convenzioneAzienda: {
                        ...(where.riconoscimentoConvenzione?.convenzioneAzienda || {}),
                        convenzioneId: filters.convenzioneId
                    }
                };
            }

            if (filters.dataInizio || filters.dataFine) {
                where.dataCalcolo = {};
                if (filters.dataInizio) where.dataCalcolo.gte = new Date(filters.dataInizio);
                if (filters.dataFine) where.dataCalcolo.lte = new Date(filters.dataFine);
            }

            const [totale, perStato, importoTotale] = await Promise.all([
                prisma.riconoscimentoErogato.count({ where }),
                prisma.riconoscimentoErogato.groupBy({
                    by: ['stato'],
                    where,
                    _count: true,
                    _sum: { importoCalcolato: true }
                }),
                prisma.riconoscimentoErogato.aggregate({
                    where,
                    _sum: { importoCalcolato: true, importoBase: true }
                })
            ]);

            return {
                totaleErogazioni: totale,
                perStato: perStato.reduce((acc, item) => {
                    acc[item.stato] = {
                        count: item._count,
                        importo: parseFloat(item._sum.importoCalcolato || 0)
                    };
                    return acc;
                }, {}),
                importoTotaleRiconosciuto: parseFloat(importoTotale._sum.importoCalcolato || 0),
                importoBaseTotale: parseFloat(importoTotale._sum.importoBase || 0)
            };
        } catch (error) {
            logger.error('Failed to get statistiche', {
                component: 'riconoscimento-service',
                action: 'getStatistiche',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    // =========================================================
    // UTILITY METHODS
    // =========================================================

    /**
     * Find applicable riconoscimenti for a bundle/prestazione and paziente
     * Used to check if a patient qualifies for riconoscimenti
     * @param {Object} params - Search parameters
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Applicable riconoscimenti
     */
    static async findApplicableRiconoscimenti(params, tenantId) {
        try {
            const { pazienteId, bundleId, prestazioneId } = params;
            const today = new Date();

            // Get paziente to find their company
            const paziente = await prisma.person.findFirst({
                where: { id: pazienteId, tenantId, deletedAt: null },
                select: { companyId: true }
            });

            if (!paziente?.companyId) {
                return []; // No company, no riconoscimenti
            }

            // Find active convenzioni for paziente's company
            const riconoscimenti = await prisma.riconoscimentoConvenzione.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    attivo: true,
                    dataInizio: { lte: today },
                    OR: [
                        { dataFine: null },
                        { dataFine: { gte: today } }
                    ],
                    convenzioneAzienda: {
                        aziendaId: paziente.companyId,
                        attiva: true,
                        deletedAt: null,
                        convenzione: {
                            attiva: true,
                            deletedAt: null,
                            dataInizio: { lte: today },
                            OR: [
                                { dataFine: null },
                                { dataFine: { gte: today } }
                            ]
                        }
                    },
                    ...(bundleId ? { bundleId } : {}),
                    ...(prestazioneId ? { prestazioneId } : {})
                },
                include: {
                    bundle: { select: { id: true, codice: true, nome: true } },
                    prestazione: { select: { id: true, codice: true, nome: true } },
                    convenzioneAzienda: {
                        include: {
                            convenzione: { select: { id: true, codice: true, nome: true } },
                            azienda: { select: { id: true, ragioneSociale: true } }
                        }
                    }
                }
            });

            return riconoscimenti;
        } catch (error) {
            logger.error('Failed to find applicable riconoscimenti', {
                component: 'riconoscimento-service',
                action: 'findApplicableRiconoscimenti',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }
}

export default RiconoscimentoConvenzioneService;
