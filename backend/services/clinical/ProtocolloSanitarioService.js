/**
 * ProtocolloSanitarioService - Gestione Protocolli Sanitari P56
 * 
 * Gestisce i protocolli sanitari secondo D.Lgs 81/08:
 * - Definizione prestazioni per mansione/rischio
 * - Periodicità visite
 * - Associazione con prestazioni cliniche
 * 
 * @module services/clinical/ProtocolloSanitarioService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import MansioneService from './MansioneService.js';


/**
 * Service per gestione protocolli sanitari MDL
 */
const ProtocolloSanitarioService = {
    /**
     * Crea un nuovo protocollo sanitario
     * @param {Object} data - Dati protocollo
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Protocollo creato con prestazioni
     */
    async create(data, tenantId) {
        const { prestazioni, questionariIds, siteId: rawSiteId, mansioneId: rawMansioneId, mansioniIds, ...rest } = data;
        // Coerce empty strings to null for optional FK fields (prevents FK constraint violations)
        const protocolloData = {
            ...rest,
            siteId: rawSiteId || null,
            mansioneId: rawMansioneId || null,
        };

        // Resolve mansioni: prefer M:N array, fallback to single mansioneId
        const resolvedMansioniIds = mansioniIds?.length
            ? mansioniIds
            : (rawMansioneId ? [rawMansioneId] : []);

        // Verifica unicità codice per tenant
        const existing = await prisma.protocolloSanitario.findFirst({
            where: { codice: protocolloData.codice, tenantId, deletedAt: null }
        });

        if (existing) {
            throw new Error(`Protocollo con codice ${protocolloData.codice} già esistente`);
        }

        const protocollo = await prisma.protocolloSanitario.create({
            data: {
                ...protocolloData,
                tenantId,
                // M:N mansioni junction
                ...(resolvedMansioniIds.length > 0 && {
                    mansioniAssociate: {
                        createMany: {
                            data: resolvedMansioniIds.map(mId => ({ mansioneId: mId }))
                        }
                    }
                }),
                prestazioni: prestazioni?.length ? {
                    createMany: {
                        data: prestazioni.map((p, index) => ({
                            prestazioneId: p.prestazioneId,
                            isObbligatoria: p.isObbligatoria ?? true,
                            periodicita: p.periodicita || null,
                            periodicitaCustomMesi: p.periodicitaCustomMesi || null,
                            condizioniApplicazione: p.condizioniApplicazione || null,
                            note: p.note || null,
                            tenantId
                        }))
                    }
                } : undefined
            },
            include: {
                prestazioni: {
                    where: { deletedAt: null },
                    include: {
                        prestazione: {
                            select: { id: true, codice: true, nome: true, prezzoBase: true, durataPrevista: true }
                        }
                    }
                },
                mansione: { select: { id: true, codice: true, denominazione: true } },
                mansioniAssociate: {
                    include: { mansione: { select: { id: true, codice: true, denominazione: true } } }
                },
                questionari: {
                    where: { deletedAt: null },
                    include: {
                        documentoTemplate: { select: { id: true, nome: true, codice: true, tipo: true } }
                    }
                },
                site: { select: { id: true, siteName: true } }
            }
        });

        // Link questionari if provided
        if (questionariIds?.length > 0) {
            await prisma.questionarioMedicoConfig.updateMany({
                where: { id: { in: questionariIds }, tenantId, deletedAt: null },
                data: { protocolloSanitarioId: protocollo.id }
            });
        }

        logger.info({ protocolloId: protocollo.id, codice: protocollo.codice, tenantId }, 'Protocollo sanitario creato');
        return protocollo;
    },

    /**
     * Trova tutti i protocolli di un tenant
     * @param {string} tenantId - ID tenant
     * @param {Object} options - Opzioni di filtro
     * @returns {Promise<Object>} Lista protocolli con paginazione
     */
    async findAll(tenantId, options = {}) {
        const { mansioneId, siteId, search, isAttivo, page = 1, limit = 50 } = options;
        const skip = (page - 1) * limit;

        const where = {
            tenantId,
            deletedAt: null,
            // M:N filter: match through junction table
            ...(mansioneId && {
                mansioniAssociate: { some: { mansioneId } }
            }),
            ...(siteId && { siteId }),
            ...(typeof isAttivo === 'boolean' && { isAttivo }),
            ...(search && {
                OR: [
                    { codice: { contains: search, mode: 'insensitive' } },
                    { denominazione: { contains: search, mode: 'insensitive' } }
                ]
            })
        };

        const [protocolli, total] = await Promise.all([
            prisma.protocolloSanitario.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ isAttivo: 'desc' }, { denominazione: 'asc' }],
                include: {
                    prestazioni: {
                        where: { deletedAt: null },
                        include: {
                            prestazione: {
                                select: { id: true, codice: true, nome: true, prezzoBase: true }
                            }
                        }
                    },
                    mansione: { select: { id: true, codice: true, denominazione: true } },
                    mansioniAssociate: {
                        include: { mansione: { select: { id: true, codice: true, denominazione: true } } }
                    },
                    site: { select: { id: true, siteName: true } },
                    questionari: {
                        where: { deletedAt: null },
                        select: {
                            id: true,
                            periodicitaMesi: true,
                            documentoTemplate: { select: { id: true, nome: true, codice: true } }
                        }
                    },
                    _count: {
                        select: {
                            prestazioni: { where: { deletedAt: null } },
                            questionari: { where: { deletedAt: null } }
                        }
                    }
                }
            }),
            prisma.protocolloSanitario.count({ where })
        ]);

        return {
            data: protocolli,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Trova protocollo per ID
     * @param {string} id - ID protocollo
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object|null>} Protocollo con dettagli
     */
    async findById(id, tenantId) {
        return prisma.protocolloSanitario.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                prestazioni: {
                    where: { deletedAt: null },
                    orderBy: { isObbligatoria: 'desc' },
                    include: {
                        prestazione: {
                            select: {
                                id: true,
                                codice: true,
                                nome: true,
                                prezzoBase: true,
                                durataPrevista: true,
                                tipo: true
                            }
                        }
                    }
                },
                mansione: {
                    select: {
                        id: true,
                        codice: true,
                        denominazione: true,
                        rischiAssociati: {
                            where: { deletedAt: null },
                            select: { codiceRischio: true, livello: true, categoria: true }
                        }
                    }
                },
                mansioniAssociate: {
                    include: {
                        mansione: {
                            select: {
                                id: true,
                                codice: true,
                                denominazione: true,
                                rischiAssociati: {
                                    where: { deletedAt: null },
                                    select: { codiceRischio: true, livello: true, categoria: true }
                                }
                            }
                        }
                    }
                },
                site: { select: { id: true, siteName: true, citta: true } },
                questionari: {
                    where: { deletedAt: null },
                    include: {
                        documentoTemplate: { select: { id: true, nome: true, codice: true, tipo: true } }
                    }
                }
            }
        });
    },

    /**
     * Aggiorna protocollo
     * @param {string} id - ID protocollo
     * @param {Object} data - Dati da aggiornare
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Protocollo aggiornato
     */
    async update(id, data, tenantId) {
        const { prestazioni, questionariIds, siteId: rawSiteId, mansioneId: rawMansioneId, mansioniIds, ...rest } = data;

        // Filtra campi non ammessi per Prisma update
        const allowedFields = ['codice', 'denominazione', 'descrizione', 'dataInizioValidita', 'dataFineValidita', 'isAttivo', 'periodicitaVisiteMesi', 'approvatoDa', 'dataApprovazione', 'note'];
        const filteredData = {};
        for (const key of allowedFields) {
            if (rest[key] !== undefined) filteredData[key] = rest[key];
        }

        // Coerce empty strings to null for optional FK fields
        const protocolloData = {
            ...filteredData,
            ...(rawSiteId !== undefined && { siteId: rawSiteId || null }),
            ...(rawMansioneId !== undefined && { mansioneId: rawMansioneId || null }),
        };

        // Verifica esistenza
        const existing = await this.findById(id, tenantId);
        if (!existing) {
            throw new Error('Protocollo non trovato');
        }

        // Verifica unicità codice se cambiato
        if (protocolloData.codice && protocolloData.codice !== existing.codice) {
            const duplicate = await prisma.protocolloSanitario.findFirst({
                where: {
                    codice: protocolloData.codice,
                    tenantId,
                    deletedAt: null,
                    id: { not: id }
                }
            });
            if (duplicate) {
                throw new Error(`Protocollo con codice ${protocolloData.codice} già esistente`);
            }
        }

        // Aggiorna prestazioni se fornite
        if (prestazioni !== undefined) {
            // Hard delete prestazioni esistenti (junction table, non PII)
            await prisma.protocolloPrestazione.deleteMany({
                where: { protocolloId: id }
            });

            // Crea nuove prestazioni
            if (prestazioni.length > 0) {
                await prisma.protocolloPrestazione.createMany({
                    data: prestazioni.map(p => ({
                        protocolloId: id,
                        prestazioneId: p.prestazioneId,
                        isObbligatoria: p.isObbligatoria ?? true,
                        periodicita: p.periodicita || null,
                        periodicitaCustomMesi: p.periodicitaCustomMesi || null,
                        condizioniApplicazione: p.condizioniApplicazione || null,
                        note: p.note || null,
                        tenantId
                    }))
                });
            }
        }

        // Sync M:N mansioni junction if provided
        if (mansioniIds !== undefined) {
            await prisma.protocolloMansione.deleteMany({
                where: { protocolloSanitarioId: id }
            });
            if (mansioniIds.length > 0) {
                await prisma.protocolloMansione.createMany({
                    data: mansioniIds.map(mId => ({
                        protocolloSanitarioId: id,
                        mansioneId: mId
                    }))
                });
            }
            // Keep legacy mansioneId in sync (first mansione or null)
            protocolloData.mansioneId = mansioniIds[0] || null;
        }

        // Sync questionari (set/unset protocolloSanitarioId FK on QuestionarioMedicoConfig)
        if (questionariIds !== undefined) {
            // Unlink all currently linked questionari
            await prisma.questionarioMedicoConfig.updateMany({
                where: { protocolloSanitarioId: id, tenantId, deletedAt: null },
                data: { protocolloSanitarioId: null }
            });
            // Link the new ones
            if (questionariIds.length > 0) {
                await prisma.questionarioMedicoConfig.updateMany({
                    where: { id: { in: questionariIds }, tenantId, deletedAt: null },
                    data: { protocolloSanitarioId: id }
                });
            }
        }

        // Aggiorna protocollo
        const updated = await prisma.protocolloSanitario.update({
            where: { id },
            data: protocolloData,
            include: {
                prestazioni: {
                    where: { deletedAt: null },
                    include: {
                        prestazione: {
                            select: { id: true, codice: true, nome: true, prezzoBase: true }
                        }
                    }
                },
                mansione: { select: { id: true, codice: true, denominazione: true } },
                mansioniAssociate: {
                    include: { mansione: { select: { id: true, codice: true, denominazione: true } } }
                },
                questionari: {
                    where: { deletedAt: null },
                    include: {
                        documentoTemplate: { select: { id: true, nome: true, codice: true, tipo: true } }
                    }
                },
                site: { select: { id: true, siteName: true } }
            }
        });

        logger.info({ protocolloId: id, tenantId }, 'Protocollo sanitario aggiornato');

        // P72_FIX: Rigenera scadenze per lavoratori assegnati alle mansioni del protocollo
        // quando cambiano prestazioni o mansioni associate
        if (prestazioni !== undefined || mansioniIds !== undefined) {
            try {
                const mansioniDelProtocollo = await prisma.protocolloMansione.findMany({
                    where: { protocolloSanitarioId: id },
                    select: { mansioneId: true }
                });
                const allMansioneIds = mansioniDelProtocollo.map(m => m.mansioneId);
                if (allMansioneIds.length > 0) {
                    const assignments = await prisma.lavoratoreMansione.findMany({
                        where: { mansioneId: { in: allMansioneIds }, tenantId, isAttiva: true, deletedAt: null },
                        select: { personId: true }
                    });
                    const uniquePersonIds = [...new Set(assignments.map(a => a.personId))];
                    for (const personId of uniquePersonIds) {
                        try {
                            await MansioneService.ensureScadenzeExist(personId, tenantId);
                        } catch (err) {
                            logger.warn({ personId, protocolloId: id, error: err.message }, 'Errore rigenerazione scadenze post-update protocollo');
                        }
                    }
                    if (uniquePersonIds.length > 0) {
                        logger.info({ protocolloId: id, workersUpdated: uniquePersonIds.length }, 'Scadenze rigenerate per lavoratori dopo aggiornamento protocollo');
                    }
                }
            } catch (err) {
                logger.warn({ protocolloId: id, error: err.message }, 'Errore rigenerazione scadenze post-update protocollo');
            }
        }

        return updated;
    },

    /**
     * Elimina protocollo (soft delete)
     * @param {string} id - ID protocollo
     * @param {string} tenantId - ID tenant
     * @returns {Promise<boolean>} Successo
     */
    async delete(id, tenantId) {
        const existing = await this.findById(id, tenantId);
        if (!existing) {
            throw new Error('Protocollo non trovato');
        }

        await prisma.$transaction([
            // Soft delete prestazioni associate
            prisma.protocolloPrestazione.updateMany({
                where: { protocolloId: id },
                data: { deletedAt: new Date() }
            }),
            // Soft delete protocollo
            prisma.protocolloSanitario.update({
                where: { id },
                data: { deletedAt: new Date() }
            })
        ]);

        logger.info({ protocolloId: id, tenantId }, 'Protocollo sanitario eliminato');
        return true;
    },

    /**
     * Duplica protocollo
     * @param {string} id - ID protocollo sorgente
     * @param {Object} options - Opzioni (nuovo codice, denominazione)
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Nuovo protocollo
     */
    async duplicate(id, options, tenantId) {
        const source = await this.findById(id, tenantId);
        if (!source) {
            throw new Error('Protocollo sorgente non trovato');
        }

        const newCodice = options.codice || `${source.codice}_COPY`;
        const newDenominazione = options.denominazione || `${source.denominazione} (Copia)`;

        // Verifica unicità nuovo codice
        const existing = await prisma.protocolloSanitario.findFirst({
            where: { codice: newCodice, tenantId, deletedAt: null }
        });
        if (existing) {
            throw new Error(`Protocollo con codice ${newCodice} già esistente`);
        }

        // Crea nuovo protocollo con prestazioni
        const newProtocollo = await this.create({
            codice: newCodice,
            denominazione: newDenominazione,
            descrizione: source.descrizione,
            mansioniIds: options.mansioniIds || source.mansioniAssociate?.map(ma => ma.mansioneId) || (source.mansioneId ? [source.mansioneId] : []),
            siteId: options.siteId || source.siteId,
            periodicitaVisiteMesi: source.periodicitaVisiteMesi,
            isAttivo: false, // Disattivato di default per revisione
            note: source.note,
            prestazioni: source.prestazioni.map(p => ({
                prestazioneId: p.prestazioneId,
                isObbligatoria: p.isObbligatoria,
                periodicita: p.periodicita,
                periodicitaCustomMesi: p.periodicitaCustomMesi,
                condizioniApplicazione: p.condizioniApplicazione,
                note: p.note
            }))
        }, tenantId);

        logger.info({ sourceId: id, newId: newProtocollo.id, tenantId }, 'Protocollo sanitario duplicato');
        return newProtocollo;
    },

    /**
     * Trova protocolli per mansione
     * @param {string} mansioneId - ID mansione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Array>} Protocolli associati
     */
    async findByMansione(mansioneId, tenantId) {
        return prisma.protocolloSanitario.findMany({
            where: {
                mansioniAssociate: { some: { mansioneId } },
                tenantId,
                deletedAt: null,
                isAttivo: true
            },
            include: {
                prestazioni: {
                    where: { deletedAt: null },
                    orderBy: { isObbligatoria: 'desc' },
                    include: {
                        prestazione: {
                            select: { id: true, codice: true, nome: true, prezzoBase: true, durataPrevista: true }
                        }
                    }
                }
            },
            orderBy: { denominazione: 'asc' }
        });
    },

    /**
     * Trova protocolli per sede
     * @param {string} siteId - ID sede
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Array>} Protocolli associati
     */
    async findBySite(siteId, tenantId) {
        return prisma.protocolloSanitario.findMany({
            where: {
                siteId,
                tenantId,
                deletedAt: null,
                isAttivo: true
            },
            include: {
                prestazioni: {
                    where: { deletedAt: null },
                    include: {
                        prestazione: {
                            select: { id: true, codice: true, nome: true }
                        }
                    }
                },
                mansione: { select: { id: true, codice: true, denominazione: true } },
                mansioniAssociate: {
                    include: { mansione: { select: { id: true, codice: true, denominazione: true } } }
                }
            },
            orderBy: { denominazione: 'asc' }
        });
    },

    /**
     * Attiva/Disattiva protocollo
     * @param {string} id - ID protocollo
     * @param {boolean} isAttivo - Stato attivazione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Protocollo aggiornato
     */
    async setActive(id, isAttivo, tenantId) {
        const existing = await this.findById(id, tenantId);
        if (!existing) {
            throw new Error('Protocollo non trovato');
        }

        const updated = await prisma.protocolloSanitario.update({
            where: { id },
            data: {
                isAttivo,
                ...(isAttivo && !existing.dataApprovazione && {
                    dataApprovazione: new Date()
                })
            },
            include: {
                prestazioni: {
                    where: { deletedAt: null },
                    include: {
                        prestazione: { select: { id: true, codice: true, nome: true } }
                    }
                }
            }
        });

        logger.info({ protocolloId: id, isAttivo, tenantId }, 'Stato protocollo aggiornato');
        return updated;
    },

    /**
     * Calcola costo stimato protocollo
     * @param {string} id - ID protocollo
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Dettaglio costi
     */
    async calculateCost(id, tenantId) {
        const protocollo = await this.findById(id, tenantId);
        if (!protocollo) {
            throw new Error('Protocollo non trovato');
        }

        let totaleCostoAnnuo = 0;
        let totaleDurataMinuti = 0;
        const dettaglioPrestazioni = [];

        for (const pp of protocollo.prestazioni) {
            const prezzo = parseFloat(pp.prestazione.prezzoBase || 0);
            const durata = pp.prestazione.durataPrevista || 15;

            // Calcola frequenza annua
            let frequenzaAnnua = 1;
            if (pp.periodicita) {
                const periodicitaMap = {
                    'ANNUALE': 1,
                    'BIENNALE': 0.5,
                    'TRIENNALE': 0.33,
                    'QUINQUENNALE': 0.2,
                    'SEMESTRALE': 2,
                    'TRIMESTRALE': 4,
                    'UNA_TANTUM': 0
                };
                frequenzaAnnua = periodicitaMap[pp.periodicita] || 1;
            } else if (pp.periodicitaCustomMesi) {
                frequenzaAnnua = 12 / pp.periodicitaCustomMesi;
            } else {
                frequenzaAnnua = 12 / protocollo.periodicitaVisiteMesi;
            }

            const costoAnnuo = prezzo * frequenzaAnnua;
            const durataAnnua = durata * frequenzaAnnua;

            totaleCostoAnnuo += costoAnnuo;
            totaleDurataMinuti += durataAnnua;

            dettaglioPrestazioni.push({
                prestazioneId: pp.prestazioneId,
                codice: pp.prestazione.codice,
                nome: pp.prestazione.nome,
                prezzoUnitario: prezzo,
                frequenzaAnnua: Math.round(frequenzaAnnua * 100) / 100,
                costoAnnuo: Math.round(costoAnnuo * 100) / 100,
                durataMinuti: durata,
                isObbligatoria: pp.isObbligatoria
            });
        }

        return {
            protocolloId: id,
            codice: protocollo.codice,
            denominazione: protocollo.denominazione,
            periodicitaVisiteMesi: protocollo.periodicitaVisiteMesi,
            totaleCostoAnnuo: Math.round(totaleCostoAnnuo * 100) / 100,
            totaleDurataMinutiAnnua: Math.round(totaleDurataMinuti),
            numeroPrestazioni: dettaglioPrestazioni.length,
            prestazioniObbligatorie: dettaglioPrestazioni.filter(p => p.isObbligatoria).length,
            dettaglioPrestazioni
        };
    },

    /**
     * Genera protocollo automatico da rischi mansione
     * @param {string} mansioneId - ID mansione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Protocollo suggerito (non salvato)
     */
    async suggestFromMansione(mansioneId, tenantId) {
        // Trova mansione con rischi
        const mansione = await prisma.mansione.findFirst({
            where: { id: mansioneId, tenantId, deletedAt: null },
            include: {
                rischiAssociati: { where: { deletedAt: null } }
            }
        });

        if (!mansione) {
            throw new Error('Mansione non trovata');
        }

        // Trova mapping rischio->prestazioni
        const rischiCodici = mansione.rischiAssociati.map(r => r.codiceRischio);

        const mappings = await prisma.rischioPrestazione.findMany({
            where: {
                codiceRischio: { in: rischiCodici },
                tenantId,
                deletedAt: null
            },
            include: {
                prestazione: {
                    select: { id: true, codice: true, nome: true, prezzoBase: true, durataPrevista: true }
                }
            }
        });

        // Deduplica prestazioni (una prestazione può essere mappata a più rischi)
        const prestazioniMap = new Map();
        for (const mapping of mappings) {
            if (!prestazioniMap.has(mapping.prestazioneId)) {
                prestazioniMap.set(mapping.prestazioneId, {
                    prestazioneId: mapping.prestazioneId,
                    prestazione: mapping.prestazione,
                    isObbligatoria: mapping.obbligatoria,
                    periodicita: mapping.periodicita,
                    rischiCorrelati: [mapping.codiceRischio],
                    riferimentoNormativo: mapping.riferimentoNormativo
                });
            } else {
                // Aggiungi rischio correlato
                const existing = prestazioniMap.get(mapping.prestazioneId);
                existing.rischiCorrelati.push(mapping.codiceRischio);
                // Se almeno un mapping è obbligatorio, la prestazione è obbligatoria
                if (mapping.obbligatoria) existing.isObbligatoria = true;
            }
        }

        return {
            mansioneId,
            mansioneCodice: mansione.codice,
            mansioneDenominazione: mansione.denominazione,
            rischiAssociati: mansione.rischiAssociati.map(r => ({
                codice: r.codiceRischio,
                livello: r.livello,
                categoria: r.categoria
            })),
            prestazioniSuggerite: Array.from(prestazioniMap.values()),
            suggestedCodice: `PROT_${mansione.codice}`,
            suggestedDenominazione: `Protocollo per ${mansione.denominazione}`,
            periodicitaVisiteMesiSuggerita: this._calculateSuggestedPeriodicity(mansione.rischiAssociati)
        };
    },

    /**
     * Calcola periodicità suggerita basata sui rischi
     * @private
     */
    _calculateSuggestedPeriodicity(rischi) {
        // Rischi alti -> periodicità più frequente
        const hasAlto = rischi.some(r => r.livello === 'ALTO' || r.livello === 'MOLTO_ALTO');
        const hasMedio = rischi.some(r => r.livello === 'MEDIO');

        if (hasAlto) return 6; // Semestrale per rischi alti
        if (hasMedio) return 12; // Annuale per rischi medi
        return 24; // Biennale per rischi bassi
    }
};

export default ProtocolloSanitarioService;
