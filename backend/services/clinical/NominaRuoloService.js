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
    async _resolveCompanyTenantProfileId(companyTenantProfileId, tenantId) {
        if (!companyTenantProfileId) return companyTenantProfileId;

        const profile = await prisma.companyTenantProfile.findFirst({
            where: {
                tenantId,
                deletedAt: null,
                OR: [
                    { id: companyTenantProfileId },
                    { companyId: companyTenantProfileId }
                ]
            },
            select: { id: true }
        });

        if (!profile) {
            const error = new Error('Azienda non trovata nel tenant corrente');
            error.code = 'COMPANY_PROFILE_NOT_FOUND';
            throw error;
        }

        return profile.id;
    },

    async _resolveCompanyFromSite(siteId, tenantId) {
        if (!siteId) return null;
        const site = await prisma.companySite.findFirst({
            where: { id: siteId, tenantId, deletedAt: null },
            select: { companyTenantProfileId: true }
        });
        return site?.companyTenantProfileId || null;
    },

    async _findActiveConflict({ tenantId, tipoRuolo, siteId, companyTenantProfileId, excludeId }) {
        if (!tipoRuolo || (!siteId && !companyTenantProfileId)) return null;
        if (tipoRuolo === 'MEDICO_COMPETENTE_COORDINATO') return null;

        return prisma.nominaRuolo.findFirst({
            where: {
                tenantId,
                tipoRuolo,
                stato: 'ATTIVA',
                deletedAt: null,
                ...(excludeId ? { id: { not: excludeId } } : {}),
                ...(siteId
                    ? { OR: [{ siteId }, ...(companyTenantProfileId ? [{ companyTenantProfileId }] : [])] }
                    : { companyTenantProfileId })
            },
            select: {
                id: true,
                personId: true,
                tipoRuolo: true,
                dataInizio: true,
                dataFine: true,
                dataScadenza: true,
                siteId: true,
                companyTenantProfileId: true,
                person: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { dataInizio: 'desc' }
        });
    },

    _throwConflict(existing, message = 'Esiste già una nomina attiva per questo ruolo e questa azienda/sede') {
        const error = new Error(message);
        error.code = 'NOMINA_ACTIVE_CONFLICT';
        error.existingNomina = existing;
        throw error;
    },

    _dayBefore(date) {
        const value = new Date(date);
        value.setDate(value.getDate() - 1);
        return value;
    },

    _dayAfter(date) {
        const value = new Date(date);
        value.setDate(value.getDate() + 1);
        return value;
    },

    async _applyConflictResolution(existing, data) {
        const resolution = data.conflictResolution;
        if (!existing) return data;
        if (!resolution) {
            this._throwConflict(existing);
        }

        if (resolution === 'CEASE_PREVIOUS') {
            const newStart = data.dataInizio || new Date();
            await prisma.nominaRuolo.update({
                where: { id: existing.id },
                data: {
                    stato: 'SCADUTA',
                    dataFine: this._dayBefore(newStart)
                }
            });
            return data;
        }

        if (resolution === 'START_AFTER_PREVIOUS') {
            const previousEnd = existing.dataFine || existing.dataScadenza;
            if (!previousEnd) {
                const error = new Error('La nomina precedente non ha una data fine o scadenza. Imposta una cessazione della nomina precedente oppure scegli di cessarla automaticamente.');
                error.code = 'PREVIOUS_NOMINA_WITHOUT_END_DATE';
                error.existingNomina = existing;
                throw error;
            }
            return {
                ...data,
                dataInizio: this._dayAfter(previousEnd)
            };
        }

        this._throwConflict(existing);
    },

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
        let convertedData = this._convertDates(data);
        convertedData.companyTenantProfileId = await this._resolveCompanyTenantProfileId(convertedData.companyTenantProfileId, tenantId);
        if (convertedData.siteId && !convertedData.companyTenantProfileId) {
            convertedData.companyTenantProfileId = await this._resolveCompanyFromSite(convertedData.siteId, tenantId);
        }

        const existing = await this._findActiveConflict({
            tenantId,
            tipoRuolo: convertedData.tipoRuolo,
            siteId: convertedData.siteId,
            companyTenantProfileId: convertedData.companyTenantProfileId
        });

        convertedData = await this._applyConflictResolution(existing, convertedData);
        const { conflictResolution, ...dataToCreate } = convertedData;

        const nomina = await prisma.nominaRuolo.create({
            data: {
                ...dataToCreate,
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
                        companyTenantProfileId: true,
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
        let convertedData = this._convertDates(data);
        convertedData.companyTenantProfileId = await this._resolveCompanyTenantProfileId(convertedData.companyTenantProfileId, tenantId);
        if (convertedData.siteId && !convertedData.companyTenantProfileId) {
            convertedData.companyTenantProfileId = await this._resolveCompanyFromSite(convertedData.siteId, tenantId);
        }

        const effectiveTipoRuolo = convertedData.tipoRuolo || existing.tipoRuolo;
        const effectiveSiteId = convertedData.siteId !== undefined ? convertedData.siteId : existing.siteId;
        const effectiveCompanyTenantProfileId = convertedData.companyTenantProfileId !== undefined
            ? convertedData.companyTenantProfileId
            : existing.companyTenantProfileId;

        const changedPerson = convertedData.personId && convertedData.personId !== existing.personId;
        if (changedPerson && existing.stato === 'ATTIVA') {
            if (!convertedData.conflictResolution) {
                const error = new Error('Stai sostituendo una nomina attiva. Scegli come gestire la nomina precedente.');
                error.code = 'NOMINA_PERSON_CHANGE_CONFLICT';
                error.existingNomina = {
                    id: existing.id,
                    personId: existing.personId,
                    tipoRuolo: existing.tipoRuolo,
                    dataInizio: existing.dataInizio,
                    dataFine: existing.dataFine,
                    dataScadenza: existing.dataScadenza,
                    siteId: existing.siteId,
                    companyTenantProfileId: existing.companyTenantProfileId,
                    person: existing.person
                };
                throw error;
            }

            const submittedStart = convertedData.dataInizio ? new Date(convertedData.dataInizio) : null;
            const existingStart = existing.dataInizio ? new Date(existing.dataInizio) : null;
            const startWasNotChanged = submittedStart && existingStart
                ? submittedStart.toISOString().slice(0, 10) === existingStart.toISOString().slice(0, 10)
                : !submittedStart;
            if (convertedData.conflictResolution === 'CEASE_PREVIOUS' && startWasNotChanged) {
                convertedData.dataInizio = new Date();
            }

            convertedData = await this._applyConflictResolution({
                id: existing.id,
                dataFine: existing.dataFine,
                dataScadenza: existing.dataScadenza
            }, convertedData);

            const { conflictResolution, stato, ...successorData } = convertedData;
            const newNomina = await prisma.nominaRuolo.create({
                data: {
                    personId: successorData.personId,
                    tipoRuolo: effectiveTipoRuolo,
                    siteId: successorData.siteId !== undefined ? successorData.siteId : existing.siteId,
                    companyTenantProfileId: successorData.companyTenantProfileId !== undefined ? successorData.companyTenantProfileId : existing.companyTenantProfileId,
                    dataInizio: successorData.dataInizio || new Date(),
                    dataFine: successorData.dataFine,
                    dataScadenza: successorData.dataScadenza,
                    numeroProtocollo: successorData.numeroProtocollo,
                    documentoNominaId: successorData.documentoNominaId,
                    formazioneRichiesta: successorData.formazioneRichiesta,
                    dataUltimaFormazione: successorData.dataUltimaFormazione,
                    dataProssimaFormazione: successorData.dataProssimaFormazione,
                    note: successorData.note || `Sostituzione da nomina ${existing.id}`,
                    tenantId
                },
                include: {
                    person: { select: { id: true, firstName: true, lastName: true } },
                    site: { select: { id: true, siteName: true, companyTenantProfileId: true } },
                    companyTenantProfile: { select: { id: true, company: { select: { ragioneSociale: true } } } }
                }
            });
            logger.info({ oldNominaId: id, newNominaId: newNomina.id, tenantId }, 'Nomina sostituita preservando storico');
            return newNomina;
        }

        const activeConflict = await this._findActiveConflict({
            tenantId,
            tipoRuolo: effectiveTipoRuolo,
            siteId: effectiveSiteId,
            companyTenantProfileId: effectiveCompanyTenantProfileId,
            excludeId: id
        });
        convertedData = await this._applyConflictResolution(activeConflict, convertedData);

        // F283: Allowlist — prevent mass assignment (protegge tenantId, personId, deletedAt, ecc.)
        const {
            personId,
            tipoRuolo, stato, dataInizio, dataFine, dataScadenza,
            numeroProtocollo, documentoNominaId,
            formazioneRichiesta, dataUltimaFormazione, dataProssimaFormazione,
            note, siteId, companyTenantProfileId
        } = convertedData;
        const safeData = Object.fromEntries(
            Object.entries({
                personId,
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
