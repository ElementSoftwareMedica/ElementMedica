/**
 * GiudizioIdoneitaService - Gestione Giudizi di Idoneità P56
 * 
 * Gestisce i giudizi di idoneità secondo Art. 41 c.6 D.Lgs 81/08:
 * - IDONEO
 * - IDONEO_CON_PRESCRIZIONI
 * - IDONEO_CON_LIMITAZIONI
 * - NON_IDONEO_TEMPORANEO
 * - NON_IDONEO_PERMANENTE
 * 
 * Include gestione ricorsi (Art. 41 c.9) e tracking scadenze
 * 
 * @module services/clinical/GiudizioIdoneitaService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';


/**
 * Service per gestione giudizi di idoneità MDL
 */
const GiudizioIdoneitaService = {
    /**
     * Crea un nuovo giudizio di idoneità
     * @param {Object} data - Dati giudizio
     * @param {string} medicoCompetenteId - ID medico che emette il giudizio
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Giudizio creato
     */
    async create(data, medicoCompetenteId, tenantId) {
        const {
            personId,
            visitaId,
            mansioneIds = [],
            tipoGiudizio,
            dataScadenza,
            prescrizioniIdoneita,
            limitazioni,
            motivazioni,
            stato: requestedStato
        } = data;

        const isBozza = requestedStato === 'BOZZA';
        const statoFinale = isBozza ? 'BOZZA' : 'VALIDO';

        // Invalida eventuali giudizi precedenti attivi per la stessa persona
        // (solo se non è una bozza — le bozze non invalidano giudizi validi)
        if (!isBozza) {
            await prisma.giudizioIdoneita.updateMany({
                where: {
                    personId,
                    tenantId,
                    stato: 'VALIDO'
                },
                data: { stato: 'SOSTITUITO' }
            });
        }

        // Calcola data scadenza se non specificata (default 12 mesi)
        const scadenza = dataScadenza || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        // Calcola termine ricorso (30 giorni dalla notifica)
        const ricorsoEntro = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const giudizio = await prisma.giudizioIdoneita.create({
            data: {
                personId,
                visitaId,
                medicoCompetenteId,
                tipoGiudizio,
                stato: statoFinale,
                dataEmissione: new Date(),
                dataScadenza: scadenza,
                prescrizioniIdoneita,
                limitazioni,
                motivazioni,
                ricorsoEntro,
                tenantId,
                ...(mansioneIds.length > 0 && {
                    mansioni: {
                        create: mansioneIds.map(mansioneId => ({ mansioneId }))
                    }
                })
            },
            include: {
                person: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        taxCode: true
                    }
                },
                medicoCompetente: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                mansioni: {
                    include: {
                        mansione: {
                            select: {
                                id: true,
                                codice: true,
                                denominazione: true
                            }
                        }
                    }
                },
                visita: {
                    select: {
                        id: true,
                        dataOra: true,
                        tipoVisitaMDL: true
                    }
                }
            }
        });

        logger.info({
            giudizioId: giudizio.id,
            personId,
            tipoGiudizio,
            medicoCompetenteId,
            tenantId
        }, 'Giudizio di idoneità emesso');

        return giudizio;
    },

    /**
     * Trova tutti i giudizi per un tenant
     * @param {string} tenantId - ID tenant
     * @param {Object} options - Opzioni di filtro
     * @returns {Promise<Object>} Lista giudizi con paginazione
     */
    async findAll(tenantId, options = {}) {
        const {
            personId,
            medicoCompetenteId,
            tipoGiudizio,
            stato,
            inScadenza, // Giudizi in scadenza nei prossimi N giorni
            dateFrom,   // P66: Data emissione da
            dateTo,     // P66: Data emissione a
            mansione,   // P66: Cerca per mansione (testo libero)
            page = 1,
            limit = 50
        } = options;
        const skip = (page - 1) * limit;

        const where = {
            tenantId,
            deletedAt: null,
            ...(personId && { personId }),
            ...(medicoCompetenteId && { medicoCompetenteId }),
            ...(tipoGiudizio && { tipoGiudizio }),
            ...(stato && { stato }),
            ...(inScadenza && {
                stato: 'VALIDO',
                dataScadenza: {
                    lte: new Date(Date.now() + inScadenza * 24 * 60 * 60 * 1000)
                }
            }),
            ...(dateFrom || dateTo ? {
                dataEmissione: {
                    ...(dateFrom && { gte: new Date(dateFrom) }),
                    ...(dateTo && { lte: new Date(dateTo + 'T23:59:59.999Z') })
                }
            } : {}),
            ...(mansione && {
                mansioni: {
                    some: {
                        mansione: {
                            denominazione: { contains: mansione, mode: 'insensitive' }
                        }
                    }
                }
            })
        };

        const [giudizi, total] = await Promise.all([
            prisma.giudizioIdoneita.findMany({
                where,
                skip,
                take: limit,
                orderBy: { dataEmissione: 'desc' },
                include: {
                    person: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true
                        }
                    },
                    medicoCompetente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    mansioni: {
                        include: {
                            mansione: {
                                select: {
                                    id: true,
                                    codice: true,
                                    denominazione: true
                                }
                            }
                        }
                    },
                    visita: {
                        select: {
                            id: true,
                            dataOra: true,
                            tipoVisitaMDL: true,
                            appuntamento: {
                                select: {
                                    id: true,
                                    prestazioni: {
                                        select: {
                                            id: true,
                                            stato: true,
                                            dataEsecuzione: true,
                                            prestazione: {
                                                select: {
                                                    id: true,
                                                    nome: true,
                                                    codice: true,
                                                    tipo: true
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }),
            prisma.giudizioIdoneita.count({ where })
        ]);

        return {
            data: giudizi,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Trova giudizio per ID
     * @param {string} id - ID giudizio
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object|null>} Giudizio con tutti i dettagli
     */
    async findById(id, tenantId) {
        return prisma.giudizioIdoneita.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                person: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        taxCode: true,
                        birthDate: true
                    }
                },
                medicoCompetente: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                mansioni: {
                    include: {
                        mansione: {
                            include: {
                                rischiAssociati: { where: { deletedAt: null } }
                            }
                        }
                    }
                },
                visita: {
                    select: {
                        id: true,
                        dataOra: true,
                        tipoVisitaMDL: true,
                        anamnesi: true,
                        esamiObiettivo: true
                    }
                }
            }
        });
    },

    /**
     * Trova giudizio attivo per un lavoratore
     * @param {string} personId - ID lavoratore
     * @param {string} tenantId - ID tenant
     * @param {string|null} mansioneId - ID mansione (opzionale)
     * @returns {Promise<Object|null>} Giudizio attivo
     */
    async findActiveForWorker(personId, tenantId, mansioneId = null) {
        return prisma.giudizioIdoneita.findFirst({
            where: {
                personId,
                tenantId,
                stato: 'VALIDO',
                deletedAt: null,
                ...(mansioneId && {
                    mansioni: { some: { mansioneId } }
                })
            },
            include: {
                medicoCompetente: {
                    select: { id: true, firstName: true, lastName: true }
                },
                mansioni: {
                    include: {
                        mansione: {
                            select: { id: true, codice: true, denominazione: true }
                        }
                    }
                }
            }
        });
    },

    /**
     * Aggiorna giudizio (es. per aggiungere notifiche)
     * @param {string} id - ID giudizio
     * @param {Object} data - Dati da aggiornare
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Giudizio aggiornato
     */
    async update(id, data, tenantId) {
        const giudizio = await prisma.giudizioIdoneita.update({
            where: { id, tenantId, deletedAt: null },
            data: {
                ...data,
                // Non permettere modifica di alcuni campi critici
                personId: undefined,
                medicoCompetenteId: undefined
            },
            include: {
                person: { select: { id: true, firstName: true, lastName: true } },
                medicoCompetente: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        logger.info({ giudizioId: id, tenantId }, 'Giudizio aggiornato');
        return giudizio;
    },

    /**
     * Registra notifica al lavoratore
     * @param {string} id - ID giudizio
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Giudizio aggiornato
     */
    async notifyWorker(id, tenantId) {
        return prisma.giudizioIdoneita.update({
            where: { id, tenantId, deletedAt: null },
            data: {
                dataNotificaLavoratore: new Date(),
                // Ricalcola termine ricorso dalla data di notifica effettiva
                ricorsoEntro: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });
    },

    /**
     * Registra notifica al datore di lavoro
     * @param {string} id - ID giudizio
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Giudizio aggiornato
     */
    async notifyEmployer(id, tenantId) {
        return prisma.giudizioIdoneita.update({
            where: { id, tenantId, deletedAt: null },
            data: { dataNotificaDatoreLavoro: new Date() }
        });
    },

    /**
     * Registra presentazione ricorso (Art. 41 c.9)
     * @param {string} id - ID giudizio
     * @param {Object} ricorsoData - Dati ricorso
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Giudizio aggiornato
     */
    async registerAppeal(id, ricorsoData, tenantId) {
        const giudizio = await prisma.giudizioIdoneita.update({
            where: { id, tenantId, deletedAt: null },
            data: {
                stato: 'RICORSO_IN_CORSO',
                ricorsoDataPresentazione: new Date()
            }
        });

        logger.info({
            giudizioId: id,
            tenantId
        }, 'Ricorso presentato contro giudizio idoneità');

        return giudizio;
    },

    /**
     * Registra esito ricorso
     * @param {string} id - ID giudizio
     * @param {string} esito - Esito del ricorso
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Giudizio aggiornato
     */
    async resolveAppeal(id, esito, tenantId) {
        const giudizio = await prisma.giudizioIdoneita.update({
            where: { id, tenantId, deletedAt: null },
            data: {
                stato: 'VALIDO', // O stato diverso basato sull'esito
                ricorsoEsito: esito
            }
        });

        logger.info({
            giudizioId: id,
            esito,
            tenantId
        }, 'Ricorso risolto');

        return giudizio;
    },

    /**
     * Ottiene statistiche giudizi per un medico
     * @param {string} medicoCompetenteId - ID medico
     * @param {string} tenantId - ID tenant
     * @param {Object} period - Periodo { from, to }
     * @returns {Promise<Object>} Statistiche
     */
    async getStatsByMedico(medicoCompetenteId, tenantId, period = {}) {
        const where = {
            medicoCompetenteId,
            tenantId,
            deletedAt: null,
            ...(period.from && {
                dataEmissione: {
                    gte: period.from,
                    ...(period.to && { lte: period.to })
                }
            })
        };

        const [
            totale,
            idonei,
            idoneiConPrescrizioni,
            idoneiConLimitazioni,
            nonIdoneiTemp,
            nonIdoneiPerm
        ] = await Promise.all([
            prisma.giudizioIdoneita.count({ where }),
            prisma.giudizioIdoneita.count({ where: { ...where, tipoGiudizio: 'IDONEO' } }),
            prisma.giudizioIdoneita.count({ where: { ...where, tipoGiudizio: 'IDONEO_CON_PRESCRIZIONI' } }),
            prisma.giudizioIdoneita.count({ where: { ...where, tipoGiudizio: 'IDONEO_CON_LIMITAZIONI' } }),
            prisma.giudizioIdoneita.count({ where: { ...where, tipoGiudizio: 'NON_IDONEO_TEMPORANEO' } }),
            prisma.giudizioIdoneita.count({ where: { ...where, tipoGiudizio: 'NON_IDONEO_PERMANENTE' } })
        ]);

        return {
            totale,
            perTipo: {
                idonei,
                idoneiConPrescrizioni,
                idoneiConLimitazioni,
                nonIdoneiTemporanei: nonIdoneiTemp,
                nonIdoneiPermanenti: nonIdoneiPerm
            },
            percentualiIdoneita: totale > 0 ? {
                idonei: ((idonei / totale) * 100).toFixed(1),
                conLimitazioni: (((idoneiConPrescrizioni + idoneiConLimitazioni) / totale) * 100).toFixed(1),
                nonIdonei: (((nonIdoneiTemp + nonIdoneiPerm) / totale) * 100).toFixed(1)
            } : null
        };
    },

    /**
     * Ottiene giudizi in scadenza per un tenant
     * @param {string} tenantId - ID tenant
     * @param {number} giorni - Giorni entro cui scade
     * @returns {Promise<Array>} Lista giudizi in scadenza
     */
    async getExpiring(tenantId, giorni = 30) {
        return prisma.giudizioIdoneita.findMany({
            where: {
                tenantId,
                stato: 'VALIDO',
                deletedAt: null,
                dataScadenza: {
                    lte: new Date(Date.now() + giorni * 24 * 60 * 60 * 1000),
                    gte: new Date()
                }
            },
            include: {
                person: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        taxCode: true,
                        tenantProfiles: {
                            where: { tenantId, deletedAt: null },
                            select: { email: true, phone: true, companyTenantProfileId: true }
                        }
                    }
                },
                mansioni: {
                    include: {
                        mansione: {
                            select: { id: true, codice: true, denominazione: true }
                        }
                    }
                }
            },
            orderBy: { dataScadenza: 'asc' }
        });
    },

    /**
     * Elimina giudizio (soft delete)
     * @param {string} id - ID giudizio
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Giudizio eliminato
     */
    async delete(id, tenantId, deletionReason) {
        const giudizio = await prisma.$transaction(async (tx) => {
            const record = await tx.giudizioIdoneita.update({
                where: { id, tenantId, deletedAt: null },
                data: { deletedAt: new Date() }
            });

            await tx.gdprAuditLog.create({
                data: {
                    tenantId,
                    action: 'DELETE',
                    resourceType: 'GiudizioIdoneita',
                    resourceId: id,
                    dataAccessed: ['giudizio_idoneita'],
                    performedBy: null,
                    deletionReason: deletionReason || 'Eliminazione giudizio di idoneità',
                }
            });

            return record;
        });

        logger.info({ giudizioId: id, tenantId }, 'Giudizio eliminato con audit GDPR');
        return giudizio;
    }
};

export default GiudizioIdoneitaService;
