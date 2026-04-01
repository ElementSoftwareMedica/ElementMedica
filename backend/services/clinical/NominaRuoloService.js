/**
 * NominaRuoloService - Gestione Nomine Figure Sicurezza P56
 * 
 * Gestisce le nomine di MC, RSPP, ASPP, RLS secondo D.Lgs 81/08:
 * - Tracciamento nomine con validità
 * - Alert scadenze formazione
 * - Storico nomine per sede/azienda
 * 
 * @module services/clinical/NominaRuoloService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';


/**
 * Service per gestione nomine figure sicurezza
 */
const NominaRuoloService = {
    /**
     * Converte le date da stringa a oggetto Date
     * @param {Object} data - Dati con date potenzialmente stringhe
     * @returns {Object} Dati con date convertite
     */
    _convertDates(data) {
        const dateFields = ['dataInizio', 'dataFine', 'dataScadenza', 'dataUltimaFormazione', 'dataProssimaFormazione'];
        const converted = { ...data };

        dateFields.forEach(field => {
            if (converted[field]) {
                // Se è già un Date, lo lasciamo
                if (converted[field] instanceof Date) {
                    return;
                }
                // Se è una stringa, la convertiamo
                if (typeof converted[field] === 'string') {
                    // Se manca l'orario, aggiungiamo T00:00:00Z
                    const dateStr = converted[field];
                    if (dateStr.length === 10) {
                        // Formato YYYY-MM-DD
                        converted[field] = new Date(dateStr + 'T00:00:00.000Z');
                    } else {
                        converted[field] = new Date(dateStr);
                    }
                }
            }
        });

        return converted;
    },

    /**
     * Crea una nuova nomina
     * @param {Object} data - Dati nomina
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Nomina creata
     */
    async create(data, tenantId) {
        // P59: Converti date da stringa a Date
        const convertedData = this._convertDates(data);

        // Verifica sovrapposizione date con nomine attive per stesso ruolo/sede o azienda
        const existingFilter = {
            tipoRuolo: convertedData.tipoRuolo,
            stato: 'ATTIVA',
            tenantId,
            deletedAt: null
        };

        if (convertedData.siteId) {
            existingFilter.siteId = convertedData.siteId;
        } else if (convertedData.companyTenantProfileId) {
            existingFilter.companyTenantProfileId = convertedData.companyTenantProfileId;
        }

        const existing = await prisma.nominaRuolo.findFirst({
            where: existingFilter,
            select: { id: true, dataInizio: true, dataFine: true, dataScadenza: true }
        });

        if (existing) {
            // Determina la data di fine effettiva della nomina attiva
            const existingEndDate = existing.dataFine || existing.dataScadenza;
            const newStartDate = convertedData.dataInizio || new Date();

            if (!existingEndDate || newStartDate <= existingEndDate) {
                // Sovrapposizione di date: non permettere
                throw new Error('OVERLAP: Esiste già una nomina attiva con date sovrapposte. Imposta una data inizio successiva alla scadenza della nomina corrente.');
            }

            // Successore valido: aggiorna dataFine della nomina precedente se non impostata
            if (!existing.dataFine) {
                const dayBefore = new Date(newStartDate);
                dayBefore.setDate(dayBefore.getDate() - 1);
                await prisma.nominaRuolo.update({
                    where: { id: existing.id },
                    data: { dataFine: dayBefore }
                });
                logger.info({ oldNominaId: existing.id, dataFine: dayBefore }, 'DataFine impostata automaticamente per nomina predecessore');
            }
        }

        const nomina = await prisma.nominaRuolo.create({
            data: {
                ...convertedData,
                tenantId
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
                site: {
                    select: { id: true, siteName: true, citta: true }
                },
                companyTenantProfile: {
                    select: {
                        id: true,
                        company: { select: { ragioneSociale: true } }
                    }
                }
            }
        });

        logger.info({ nominaId: nomina.id, tipoRuolo: nomina.tipoRuolo, tenantId }, 'Nomina creata');
        return nomina;
    },

    /**
     * Trova tutte le nomine di un tenant
     * @param {string} tenantId - ID tenant
     * @param {Object} options - Opzioni di filtro
     * @returns {Promise<Object>} Lista nomine con paginazione
     */
    async findAll(tenantId, options = {}) {
        const {
            siteId,
            companyTenantProfileId,
            tipoRuolo,
            stato,
            personId,
            expiringDays, // Nomine in scadenza entro N giorni
            page = 1,
            limit = 50
        } = options;
        const skip = (page - 1) * limit;

        const where = {
            tenantId,
            deletedAt: null,
            ...(siteId && { siteId }),
            ...(companyTenantProfileId && { companyTenantProfileId }),
            ...(tipoRuolo && { tipoRuolo }),
            ...(stato && { stato }),
            ...(personId && { personId }),
            ...(expiringDays && {
                dataScadenza: {
                    lte: new Date(Date.now() + expiringDays * 24 * 60 * 60 * 1000),
                    gte: new Date()
                },
                stato: 'ATTIVA'
            })
        };

        const [nomine, total] = await Promise.all([
            prisma.nominaRuolo.findMany({
                where,
                skip,
                take: limit,
                orderBy: [
                    { stato: 'asc' }, // ATTIVA prima
                    { dataScadenza: 'asc' }
                ],
                include: {
                    person: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true
                        }
                    },
                    site: {
                        select: { id: true, siteName: true, citta: true, companyTenantProfileId: true }
                    },
                    companyTenantProfile: {
                        select: {
                            id: true,
                            company: { select: { ragioneSociale: true } }
                        }
                    }
                }
            }),
            prisma.nominaRuolo.count({ where })
        ]);

        return {
            data: nomine,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Trova nomina per ID
     * @param {string} id - ID nomina
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object|null>} Nomina con dettagli
     */
    async findById(id, tenantId) {
        return prisma.nominaRuolo.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                person: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        taxCode: true,
                        birthDate: true,
                        tenantProfiles: {
                            where: { tenantId, deletedAt: null },
                            select: { email: true, phone: true }
                        }
                    }
                },
                site: {
                    select: {
                        id: true,
                        siteName: true,
                        citta: true,
                        indirizzo: true,
                        companyTenantProfile: {
                            select: { company: { select: { ragioneSociale: true, piva: true } } }
                        }
                    }
                },
                companyTenantProfile: {
                    select: {
                        id: true,
                        company: { select: { ragioneSociale: true, piva: true } }
                    }
                }
            }
        });
    },

    /**
     * Aggiorna nomina
     * @param {string} id - ID nomina
     * @param {Object} data - Dati da aggiornare
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Nomina aggiornata
     */
    async update(id, data, tenantId) {
        const existing = await this.findById(id, tenantId);
        if (!existing) {
            throw new Error('Nomina non trovata');
        }

        // P59: Converti date da stringa a Date
        const convertedData = this._convertDates(data);

        // F283: Allowlist — prevent mass assignment (protegge tenantId, personId, deletedAt, ecc.)
        const {
            tipoRuolo, stato, dataInizio, dataFine, dataScadenza,
            numeroProtocollo, documentoNominaId,
            formazioneRichiesta, dataUltimaFormazione, dataProssimaFormazione,
            note, siteId, companyTenantProfileId
        } = convertedData;
        const safeData = Object.fromEntries(
            Object.entries({
                tipoRuolo, stato, dataInizio, dataFine, dataScadenza,
                numeroProtocollo, documentoNominaId,
                formazioneRichiesta, dataUltimaFormazione, dataProssimaFormazione,
                note, siteId, companyTenantProfileId
            }).filter(([, v]) => v !== undefined)
        );

        const updated = await prisma.nominaRuolo.update({
            where: { id },
            data: safeData,
            include: {
                person: {
                    select: { id: true, firstName: true, lastName: true }
                },
                site: {
                    select: { id: true, siteName: true }
                }
            }
        });

        logger.info({ nominaId: id, tenantId }, 'Nomina aggiornata');
        return updated;
    },

    /**
     * Elimina nomina (soft delete)
     * @param {string} id - ID nomina
     * @param {string} tenantId - ID tenant
     * @returns {Promise<boolean>} Successo
     */
    async delete(id, tenantId) {
        const existing = await this.findById(id, tenantId);
        if (!existing) {
            throw new Error('Nomina non trovata');
        }

        await prisma.nominaRuolo.update({
            where: { id },
            data: { deletedAt: new Date() }
        });

        logger.info({ nominaId: id, tenantId }, 'Nomina eliminata');
        return true;
    },

    /**
     * Cessa nomina (termina formalmente)
     * @param {string} id - ID nomina
     * @param {Date} dataFine - Data di cessazione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Nomina cessata
     */
    async cease(id, dataFine, tenantId) {
        const existing = await this.findById(id, tenantId);
        if (!existing) {
            throw new Error('Nomina non trovata');
        }

        if (existing.stato !== 'ATTIVA') {
            throw new Error('Solo le nomine attive possono essere cessate');
        }

        const updated = await prisma.nominaRuolo.update({
            where: { id },
            data: {
                stato: 'SCADUTA',
                dataFine: dataFine || new Date()
            },
            include: {
                person: { select: { id: true, firstName: true, lastName: true } },
                site: { select: { id: true, siteName: true } }
            }
        });

        logger.info({ nominaId: id, dataFine, tenantId }, 'Nomina cessata');
        return updated;
    },

    /**
     * Sospende nomina (temporaneamente)
     * @param {string} id - ID nomina
     * @param {string} motivo - Motivo sospensione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Nomina sospesa
     */
    async suspend(id, motivo, tenantId) {
        const existing = await this.findById(id, tenantId);
        if (!existing) {
            throw new Error('Nomina non trovata');
        }

        if (existing.stato !== 'ATTIVA') {
            throw new Error('Solo le nomine attive possono essere sospese');
        }

        const updated = await prisma.nominaRuolo.update({
            where: { id },
            data: {
                stato: 'SOSPESA',
                note: existing.note
                    ? `${existing.note}\n[SOSPENSIONE] ${new Date().toISOString().split('T')[0]}: ${motivo}`
                    : `[SOSPENSIONE] ${new Date().toISOString().split('T')[0]}: ${motivo}`
            },
            include: {
                person: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        logger.info({ nominaId: id, tenantId }, 'Nomina sospesa');
        return updated;
    },

    /**
     * Riattiva nomina sospesa
     * @param {string} id - ID nomina
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Nomina riattivata
     */
    async reactivate(id, tenantId) {
        const existing = await this.findById(id, tenantId);
        if (!existing) {
            throw new Error('Nomina non trovata');
        }

        if (existing.stato !== 'SOSPESA') {
            throw new Error('Solo le nomine sospese possono essere riattivate');
        }

        const updated = await prisma.nominaRuolo.update({
            where: { id },
            data: {
                stato: 'ATTIVA',
                note: existing.note
                    ? `${existing.note}\n[RIATTIVAZIONE] ${new Date().toISOString().split('T')[0]}`
                    : `[RIATTIVAZIONE] ${new Date().toISOString().split('T')[0]}`
            },
            include: {
                person: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        logger.info({ nominaId: id, tenantId }, 'Nomina riattivata');
        return updated;
    },

    /**
     * Trova nomine per sede
     * @param {string} siteId - ID sede
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Array>} Nomine attive della sede
     */
    async findBySite(siteId, tenantId) {
        return prisma.nominaRuolo.findMany({
            where: {
                siteId,
                tenantId,
                deletedAt: null,
                stato: { in: ['ATTIVA', 'SOSPESA'] }
            },
            include: {
                person: {
                    select: { id: true, firstName: true, lastName: true, taxCode: true }
                }
            },
            orderBy: [{ tipoRuolo: 'asc' }, { dataInizio: 'desc' }]
        });
    },

    /**
     * Trova nomine per azienda
     * @param {string} companyTenantProfileId - ID profilo azienda
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Array>} Nomine dell'azienda
     */
    async findByCompany(companyTenantProfileId, tenantId) {
        return prisma.nominaRuolo.findMany({
            where: {
                companyTenantProfileId,
                tenantId,
                deletedAt: null
            },
            include: {
                person: {
                    select: { id: true, firstName: true, lastName: true }
                },
                site: {
                    select: { id: true, siteName: true }
                }
            },
            orderBy: [{ tipoRuolo: 'asc' }, { dataInizio: 'desc' }]
        });
    },

    /**
     * Trova nomine per persona
     * @param {string} personId - ID persona
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Array>} Nomine della persona
     */
    async findByPerson(personId, tenantId) {
        return prisma.nominaRuolo.findMany({
            where: {
                personId,
                tenantId,
                deletedAt: null
            },
            include: {
                site: {
                    select: {
                        id: true,
                        siteName: true,
                        companyTenantProfile: {
                            select: { company: { select: { ragioneSociale: true } } }
                        }
                    }
                },
                companyTenantProfile: {
                    select: { company: { select: { ragioneSociale: true } } }
                }
            },
            orderBy: [{ stato: 'asc' }, { dataInizio: 'desc' }]
        });
    },

    /**
     * Trova nomine in scadenza
     * @param {number} days - Giorni per scadenza
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Array>} Nomine in scadenza
     */
    async findExpiring(days, tenantId) {
        const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        return prisma.nominaRuolo.findMany({
            where: {
                tenantId,
                deletedAt: null,
                stato: 'ATTIVA',
                OR: [
                    // Nomina in scadenza
                    {
                        dataScadenza: {
                            lte: futureDate,
                            gte: new Date()
                        }
                    },
                    // Formazione in scadenza
                    {
                        dataProssimaFormazione: {
                            lte: futureDate,
                            gte: new Date()
                        }
                    }
                ]
            },
            include: {
                person: {
                    select: { id: true, firstName: true, lastName: true }
                },
                site: {
                    select: { id: true, siteName: true }
                },
                companyTenantProfile: {
                    select: { company: { select: { ragioneSociale: true } } }
                }
            },
            orderBy: { dataScadenza: 'asc' }
        });
    },

    /**
     * Aggiorna formazione
     * @param {string} id - ID nomina
     * @param {Object} formazioneData - Dati formazione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Nomina aggiornata
     */
    async updateFormazione(id, formazioneData, tenantId) {
        const existing = await this.findById(id, tenantId);
        if (!existing) {
            throw new Error('Nomina non trovata');
        }

        const updated = await prisma.nominaRuolo.update({
            where: { id },
            data: {
                dataUltimaFormazione: formazioneData.dataUltimaFormazione,
                dataProssimaFormazione: formazioneData.dataProssimaFormazione,
                formazioneRichiesta: formazioneData.formazioneRichiesta,
                note: formazioneData.note || existing.note
            },
            include: {
                person: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        logger.info({ nominaId: id, tenantId }, 'Formazione nomina aggiornata');
        return updated;
    },

    /**
     * Statistiche nomine per tenant
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Statistiche
     */
    async getStats(tenantId) {
        const [
            totaleAttive,
            perRuolo,
            inScadenza30gg,
            formazioneScadenza30gg
        ] = await Promise.all([
            prisma.nominaRuolo.count({
                where: { tenantId, deletedAt: null, stato: 'ATTIVA' }
            }),
            prisma.nominaRuolo.groupBy({
                by: ['tipoRuolo'],
                where: { tenantId, deletedAt: null, stato: 'ATTIVA' },
                _count: true
            }),
            prisma.nominaRuolo.count({
                where: {
                    tenantId,
                    deletedAt: null,
                    stato: 'ATTIVA',
                    dataScadenza: {
                        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        gte: new Date()
                    }
                }
            }),
            prisma.nominaRuolo.count({
                where: {
                    tenantId,
                    deletedAt: null,
                    stato: 'ATTIVA',
                    dataProssimaFormazione: {
                        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        gte: new Date()
                    }
                }
            })
        ]);

        return {
            totaleAttive,
            perRuolo: perRuolo.reduce((acc, r) => {
                acc[r.tipoRuolo] = r._count;
                return acc;
            }, {}),
            inScadenza30gg,
            formazioneScadenza30gg,
            alertTotali: inScadenza30gg + formazioneScadenza30gg
        };
    }
};

export default NominaRuoloService;
