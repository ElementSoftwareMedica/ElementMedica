/**
 * MansioneService - Gestione Mansioni Lavorative P56
 * 
 * Gestisce le mansioni lavorative secondo D.Lgs 81/08 con:
 * - Associazione rischi per mansione
 * - Calcolo automatico protocollo sanitario
 * - Assegnazione mansioni a lavoratori
 * 
 * @module services/clinical/MansioneService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

/**
 * Converte TipoPeriodicita enum in numero di mesi
 * @param {string|null} periodicita - Valore enum TipoPeriodicita
 * @param {number|null} periodicitaCustomMesi - Mesi custom override
 * @param {number} defaultMesi - Default se periodicita è null/SU_INDICAZIONE
 * @returns {number} Mesi di periodicità
 */
function periodicitaMesiFromEnum(periodicita, periodicitaCustomMesi, defaultMesi = 12) {
    if (periodicitaCustomMesi) return periodicitaCustomMesi;
    switch (periodicita) {
        case 'MESI_6': return 6;
        case 'MESI_12': return 12;
        case 'MESI_24': return 24;
        case 'MESI_36': return 36;
        case 'MESI_60': return 60;
        case 'UNA_TANTUM': return 0; // Solo prima visita, nessun rinnovo
        case 'SU_INDICAZIONE':
        default:
            return defaultMesi;
    }
}


/**
 * Service per gestione mansioni lavorative MDL
 */
const MansioneService = {
    /**
     * Crea una nuova mansione
     * @param {Object} data - Dati mansione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Mansione creata con rischi
     */
    async create(data, tenantId) {
        const { rischi, siteId, ...mansioneData } = data;

        const mansione = await prisma.mansione.create({
            data: {
                ...mansioneData,
                // siteId vuoto -> null per evitare FK constraint error
                siteId: siteId && siteId.trim() !== '' ? siteId : null,
                tenantId,
                rischiAssociati: rischi?.length ? {
                    createMany: {
                        data: rischi.map(r => ({
                            codiceRischio: r.codiceRischio,
                            livello: r.livello || 'MEDIO',
                            categoria: r.categoria,
                            descrizioneEsposizione: r.descrizioneEsposizione,
                            misurePrevenzioneDPI: r.misurePrevenzioneDPI,
                            fonteRischio: r.fonteRischio,
                            periodicitaMesi: r.periodicitaMesi,
                            tenantId
                        }))
                    }
                } : undefined
            },
            include: {
                rischiAssociati: true,
                site: true,
                lavoratori: {
                    where: { isAttiva: true, deletedAt: null },
                    include: { person: { select: { id: true, firstName: true, lastName: true } } }
                }
            }
        });

        logger.info({ mansioneId: mansione.id, tenantId }, 'Mansione creata');
        return mansione;
    },

    /**
     * Trova tutte le mansioni di un tenant
     * @param {string} tenantId - ID tenant
     * @param {Object} options - Opzioni di filtro
     * @returns {Promise<Array>} Lista mansioni
     */
    async findAll(tenantId, options = {}) {
        const { siteId, search, page = 1, limit = 50 } = options;
        const skip = (page - 1) * limit;

        const where = {
            tenantId,
            deletedAt: null,
            ...(siteId && { siteId }),
            ...(search && {
                OR: [
                    { codice: { contains: search, mode: 'insensitive' } },
                    { denominazione: { contains: search, mode: 'insensitive' } }
                ]
            })
        };

        const [mansioni, total] = await Promise.all([
            prisma.mansione.findMany({
                where,
                skip,
                take: limit,
                orderBy: { denominazione: 'asc' },
                include: {
                    rischiAssociati: {
                        where: { deletedAt: null },
                        orderBy: { categoria: 'asc' }
                    },
                    site: { select: { id: true, siteName: true } },
                    _count: {
                        select: {
                            lavoratori: { where: { isAttiva: true, deletedAt: null } }
                        }
                    }
                }
            }),
            prisma.mansione.count({ where })
        ]);

        return {
            data: mansioni,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Trova mansione per ID
     * @param {string} id - ID mansione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object|null>} Mansione con tutti i dettagli
     */
    async findById(id, tenantId) {
        return prisma.mansione.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                rischiAssociati: {
                    where: { deletedAt: null },
                    orderBy: [{ categoria: 'asc' }, { codiceRischio: 'asc' }]
                },
                site: { select: { id: true, siteName: true, citta: true } },
                lavoratori: {
                    where: { isAttiva: true, deletedAt: null },
                    include: {
                        person: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                taxCode: true,
                                // Include tenant profile for company info
                                tenantProfiles: {
                                    where: { tenantId, deletedAt: null },
                                    select: {
                                        companyTenantProfile: {
                                            select: {
                                                id: true,
                                                company: {
                                                    select: {
                                                        id: true,
                                                        ragioneSociale: true,
                                                        piva: true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                protocolli: {
                    where: { isAttivo: true, deletedAt: null },
                    include: {
                        prestazioni: {
                            include: { prestazione: { select: { id: true, codice: true, nome: true } } }
                        }
                    }
                },
                giudiziIdoneita: {
                    where: { giudizio: { stato: 'VALIDO', deletedAt: null } },
                    take: 10,
                    orderBy: { giudizio: { dataEmissione: 'desc' } },
                    include: {
                        giudizio: {
                            select: {
                                id: true,
                                tipoGiudizio: true,
                                stato: true,
                                dataEmissione: true,
                                dataScadenza: true,
                                limitazioni: true,
                                prescrizioniIdoneita: true,
                                person: { select: { id: true, firstName: true, lastName: true } }
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Aggiorna una mansione
     * @param {string} id - ID mansione
     * @param {Object} data - Dati da aggiornare
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Mansione aggiornata
     */
    async update(id, data, tenantId) {
        const { rischi, siteId, ...mansioneData } = data;
        // Normalizza siteId: stringa vuota → null per evitare FK constraint violation
        const normalizedSiteId = siteId && typeof siteId === 'string' && siteId.trim() !== '' ? siteId : null;
        mansioneData.siteId = normalizedSiteId;

        // Se ci sono rischi, aggiorna anche quelli
        if (rischi) {
            // Hard delete dei rischi esistenti: MansioneRischio è dato di configurazione
            // (non PII), quindi la cancellazione definitiva è corretta e necessaria per
            // rispettare il vincolo @@unique([mansioneId, codiceRischio]) prima di reinserire.
            await prisma.mansioneRischio.deleteMany({
                where: { mansioneId: id, tenantId }
            });

            // Ricrea i nuovi rischi
            if (rischi.length > 0) {
                await prisma.mansioneRischio.createMany({
                    data: rischi.map(r => ({
                        mansioneId: id,
                        codiceRischio: r.codiceRischio,
                        livello: r.livello || 'MEDIO',
                        categoria: r.categoria,
                        descrizioneEsposizione: r.descrizioneEsposizione,
                        misurePrevenzioneDPI: r.misurePrevenzioneDPI,
                        fonteRischio: r.fonteRischio,
                        periodicitaMesi: r.periodicitaMesi,
                        tenantId
                    }))
                });
            }
        }

        const mansione = await prisma.mansione.update({
            where: { id },
            data: mansioneData,
            include: {
                rischiAssociati: { where: { deletedAt: null } },
                site: { select: { id: true, siteName: true } }
            }
        });

        logger.info({ mansioneId: id, tenantId }, 'Mansione aggiornata');
        return mansione;
    },

    /**
     * Elimina mansione (soft delete)
     * @param {string} id - ID mansione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Mansione eliminata
     */
    async delete(id, tenantId) {
        const mansione = await prisma.mansione.update({
            where: { id },
            data: { deletedAt: new Date() }
        });

        // Soft delete anche dei rischi associati
        await prisma.mansioneRischio.updateMany({
            where: { mansioneId: id, tenantId },
            data: { deletedAt: new Date() }
        });

        logger.info({ mansioneId: id, tenantId }, 'Mansione eliminata');
        return mansione;
    },

    /**
     * Assegna mansione a un lavoratore
     * @param {string} personId - ID lavoratore
     * @param {string} mansioneId - ID mansione
     * @param {Object} data - Dati assegnazione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Assegnazione creata
     */
    async assignToWorker(personId, mansioneId, data, tenantId) {
        // Verifica che non esista già un'assegnazione attiva
        const existing = await prisma.lavoratoreMansione.findFirst({
            where: {
                personId,
                mansioneId,
                tenantId,
                isAttiva: true,
                deletedAt: null
            }
        });

        if (existing) {
            throw new Error('Lavoratore già assegnato a questa mansione');
        }

        // Se è mansione primaria, rimuovi il flag da altre mansioni
        if (data.isPrimaria) {
            await prisma.lavoratoreMansione.updateMany({
                where: { personId, tenantId, isPrimaria: true },
                data: { isPrimaria: false }
            });
        }

        try {
            const assignment = await prisma.lavoratoreMansione.create({
                data: {
                    personId,
                    mansioneId,
                    tenantId,
                    isPrimaria: data.isPrimaria || false,
                    dataInizio: data.dataInizio ? new Date(data.dataInizio) : new Date(),
                    note: data.note
                },
                include: {
                    person: { select: { id: true, firstName: true, lastName: true } },
                    mansione: {
                        include: { rischiAssociati: { where: { deletedAt: null } } }
                    }
                }
            });

            logger.info({ personId, mansioneId, tenantId }, 'Mansione assegnata a lavoratore');

            // Crea scadenze prima visita per ogni prestazione del protocollo della mansione
            try {
                await this._creaScadenzePrimaVisita(personId, mansioneId, tenantId);
            } catch (scadenzaErr) {
                // Non bloccare l'assegnazione se la creazione scadenze fallisce
                logger.warn({ personId, mansioneId, tenantId, error: scadenzaErr.message }, 'Errore creazione scadenze prima visita MDL');
            }

            return assignment;
        } catch (err) {
            // P2002: violazione unique constraint — record già esistente (anche se non attivo)
            if (err.code === 'P2002') {
                throw new Error('Lavoratore già assegnato a questa mansione');
            }
            // P2003: FK violation — personId o mansioneId non valido per questo tenant
            if (err.code === 'P2003') {
                throw new Error('Persona o mansione non trovata per questo tenant');
            }
            throw err;
        }
    },

    /**
     * Assegna una mansione a più lavoratori in blocco
     * @param {string[]} personIds - Lista ID lavoratori
     * @param {string} mansioneId - ID mansione
     * @param {Object} data - Dati assegnazione comuni
     * @param {string} tenantId - ID tenant
     * @returns {Promise<{assigned: Array, skipped: Array, errors: Array}>}
     */
    async bulkAssignToWorkers(personIds, mansioneId, data, tenantId) {
        const results = { assigned: [], skipped: [], errors: [] };

        for (const personId of personIds) {
            try {
                const assignment = await this.assignToWorker(personId, mansioneId, data, tenantId);
                results.assigned.push({ personId, assignment });
            } catch (err) {
                if (err.message?.includes('già assegnato')) {
                    results.skipped.push({ personId, reason: err.message });
                } else {
                    results.errors.push({ personId, error: err.message || 'Errore sconosciuto' });
                    logger.warn({ personId, mansioneId, tenantId, error: err.message }, 'Errore assegnazione bulk mansione');
                }
            }
        }

        logger.info({ mansioneId, tenantId, total: personIds.length, ...results }, 'Bulk assign mansione completato');
        return results;
    },

    /**
     * Rimuove assegnazione mansione da lavoratore
     * @param {string} assignmentId - ID assegnazione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Assegnazione terminata
     */
    async removeFromWorker(assignmentId, tenantId) {
        const assignment = await prisma.lavoratoreMansione.update({
            where: { id: assignmentId },
            data: {
                isAttiva: false,
                dataFine: new Date()
            }
        });

        logger.info({ assignmentId, tenantId }, 'Mansione rimossa da lavoratore');
        return assignment;
    },

    /**
     * Ottiene tutti i rischi associati alle mansioni di un lavoratore
     * @param {string} personId - ID lavoratore
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Array>} Lista rischi unici
     */
    async getWorkerRisks(personId, tenantId) {
        const assignments = await prisma.lavoratoreMansione.findMany({
            where: {
                personId,
                tenantId,
                isAttiva: true,
                deletedAt: null
            },
            include: {
                mansione: {
                    include: {
                        rischiAssociati: {
                            where: { deletedAt: null },
                            orderBy: { codiceRischio: 'asc' }
                        }
                    }
                }
            }
        });

        // Raggruppa rischi unici con livello massimo
        const risksMap = new Map();

        for (const assignment of assignments) {
            for (const rischio of assignment.mansione.rischiAssociati) {
                const existing = risksMap.get(rischio.codiceRischio);

                if (!existing || this._compareLevels(rischio.livello, existing.livello) > 0) {
                    risksMap.set(rischio.codiceRischio, {
                        codiceRischio: rischio.codiceRischio,
                        livello: rischio.livello,
                        categoria: rischio.categoria,
                        mansioni: [...(existing?.mansioni || []), assignment.mansione.denominazione],
                        periodicitaMesi: rischio.periodicitaMesi
                    });
                } else {
                    existing.mansioni.push(assignment.mansione.denominazione);
                }
            }
        }

        // Raccoglie mansioni uniche assegnate al lavoratore (con rischiAssociati per editing frontend)
        const mansioniMap = new Map();
        for (const assignment of assignments) {
            if (!mansioniMap.has(assignment.mansione.id)) {
                mansioniMap.set(assignment.mansione.id, assignment.mansione);
            }
        }

        return {
            rischi: Array.from(risksMap.values()),
            mansioni: Array.from(mansioniMap.values()),
        };
    },

    /**
     * Confronta livelli di rischio
     * @param {string} a - Livello A
     * @param {string} b - Livello B
     * @returns {number} -1, 0, 1
     */
    _compareLevels(a, b) {
        const order = { 'BASSO': 1, 'MEDIO': 2, 'ALTO': 3, 'MOLTO_ALTO': 4 };
        return (order[a] || 0) - (order[b] || 0);
    },

    /**
     * Duplica mansione esistente
     * @param {string} id - ID mansione da duplicare
     * @param {string} newCodice - Nuovo codice
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Nuova mansione
     */
    async duplicate(id, newCodice, tenantId) {
        const original = await this.findById(id, tenantId);
        if (!original) {
            throw new Error('Mansione non trovata');
        }

        const { id: _, createdAt, updatedAt, rischiAssociati, lavoratori, protocolli, giudiziIdoneita, site, ...mansioneData } = original;

        return this.create({
            ...mansioneData,
            codice: newCodice,
            denominazione: `${original.denominazione} (copia)`,
            rischi: rischiAssociati.map(r => ({
                codiceRischio: r.codiceRischio,
                livello: r.livello,
                categoria: r.categoria,
                descrizioneEsposizione: r.descrizioneEsposizione,
                misurePrevenzioneDPI: r.misurePrevenzioneDPI,
                fonteRischio: r.fonteRischio,
                periodicitaMesi: r.periodicitaMesi
            }))
        }, tenantId);
    },

    /**
     * Assicura che le scadenze iniziali esistano per tutte le mansioni attive di un lavoratore.
     * Usato dalla VisitaPage quando il piano di sorveglianza è vuoto.
     * @param {string} personId
     * @param {string} tenantId
     * @returns {Promise<{ created: number; skipped: number }>}
     */
    async ensureScadenzeExist(personId, tenantId) {
        const assignments = await prisma.lavoratoreMansione.findMany({
            where: { personId, tenantId, isAttiva: true, deletedAt: null },
            select: { mansioneId: true }
        });

        let created = 0;
        let skipped = 0;
        for (const { mansioneId } of assignments) {
            try {
                const before = await prisma.scadenzaPrestazioneProtocollo.count({
                    where: { personId, mansioneId, tenantId, deletedAt: null }
                });
                await this._creaScadenzePrimaVisita(personId, mansioneId, tenantId);
                const after = await prisma.scadenzaPrestazioneProtocollo.count({
                    where: { personId, mansioneId, tenantId, deletedAt: null }
                });
                if (after > before) created += (after - before);
                else skipped++;
            } catch (err) {
                logger.warn({ personId, mansioneId, tenantId, error: err.message }, 'Errore generazione scadenze iniziali');
                skipped++;
            }
        }

        return { created, skipped };
    },

    /**
     * Crea scadenze prima visita per ogni prestazione del protocollo della mansione.
     * Chiamato internamente dopo assignToWorker.
     * @param {string} personId
     * @param {string} mansioneId
     * @param {string} tenantId
     */
    async _creaScadenzePrimaVisita(personId, mansioneId, tenantId) {
        // Trova il protocollo attivo per questa mansione (M:N via junction table)
        const protocollo = await prisma.protocolloSanitario.findFirst({
            where: {
                mansioniAssociate: { some: { mansioneId } },
                tenantId,
                isAttivo: true,
                deletedAt: null
            },
            include: {
                prestazioni: {
                    where: { deletedAt: null }
                },
                questionari: {
                    where: { deletedAt: null }
                }
            }
        });

        if (!protocollo || (!protocollo.prestazioni?.length && !protocollo.questionari?.length)) {
            logger.info({ personId, mansioneId, tenantId }, 'Nessun protocollo configurato per mansione, skip prima visita scadenze');
            return;
        }

        // Verifica se esistono già scadenze prima visita per questa persona+mansione
        const existing = await prisma.scadenzaPrestazioneProtocollo.findFirst({
            where: { personId, mansioneId, tenantId, isPrimaVisita: true, deletedAt: null }
        });

        if (existing) {
            logger.info({ personId, mansioneId, tenantId }, 'Scadenze prima visita già esistenti, skip');
            return;
        }

        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);

        // Recupera visite completate per questo paziente per le prestazioni del protocollo
        const prestazioneIds = (protocollo.prestazioni || []).map(pp => pp.prestazioneId);
        let visiteCompletateMap = new Map(); // prestazioneId → { visitaId, dataOra }

        if (prestazioneIds.length > 0) {
            const visiteCompletate = await prisma.visita.findMany({
                where: {
                    pazienteId: personId,
                    tenantId,
                    prestazioneId: { in: prestazioneIds },
                    stato: 'COMPLETATA',
                    deletedAt: null
                },
                select: { id: true, prestazioneId: true, dataOra: true },
                orderBy: { dataOra: 'desc' }
            });

            // Per ogni prestazione, prendi la visita più recente
            for (const v of visiteCompletate) {
                if (!visiteCompletateMap.has(v.prestazioneId)) {
                    visiteCompletateMap.set(v.prestazioneId, { visitaId: v.id, dataOra: v.dataOra });
                }
            }
        }

        // Scadenze per le prestazioni cliniche del protocollo
        const prestazioniScadenze = (protocollo.prestazioni || []).map(pp => {
            const periodicitaMesi = periodicitaMesiFromEnum(pp.periodicita, pp.periodicitaCustomMesi, protocollo.periodicitaVisiteMesi);
            const visitaEsistente = visiteCompletateMap.get(pp.prestazioneId);

            if (visitaEsistente) {
                // Prestazione già eseguita: calcola prossima scadenza
                const prossimaScadenza = new Date(visitaEsistente.dataOra);
                prossimaScadenza.setMonth(prossimaScadenza.getMonth() + periodicitaMesi);
                prossimaScadenza.setHours(0, 0, 0, 0);

                return {
                    personId,
                    mansioneId,
                    prestazioneId: pp.prestazioneId,
                    protocolloId: protocollo.id,
                    tenantId,
                    dataScadenza: prossimaScadenza,
                    periodicitaMesi,
                    isPrimaVisita: false,
                    eseguita: true,
                    dataEsecuzione: visitaEsistente.dataOra,
                    visitaId: visitaEsistente.visitaId
                };
            }

            return {
                personId,
                mansioneId,
                prestazioneId: pp.prestazioneId,
                protocolloId: protocollo.id,
                tenantId,
                dataScadenza: oggi,
                periodicitaMesi,
                isPrimaVisita: true,
                eseguita: false
            };
        });

        // Scadenze per i questionari periodici del protocollo
        const questionariScadenze = (protocollo.questionari || [])
            .filter(q => q.periodicitaMesi && q.periodicitaMesi > 0)
            .map(q => ({
                personId,
                mansioneId,
                prestazioneId: null,
                documentoTemplateId: q.documentoTemplateId,
                protocolloId: protocollo.id,
                tenantId,
                dataScadenza: oggi,
                periodicitaMesi: q.periodicitaMesi,
                isPrimaVisita: true,
                eseguita: false
            }));

        const scadenze = [...prestazioniScadenze, ...questionariScadenze];
        if (!scadenze.length) return;

        const giàEseguite = prestazioniScadenze.filter(s => s.eseguita).length;
        await prisma.scadenzaPrestazioneProtocollo.createMany({ data: scadenze });
        logger.info(
            { personId, mansioneId, tenantId, prestazioni: prestazioniScadenze.length, giàEseguite, questionari: questionariScadenze.length },
            'Scadenze prima visita MDL create'
        );
    }
};

export default MansioneService;
