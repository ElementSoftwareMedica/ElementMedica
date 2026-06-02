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

function startOfDay(value) {
    const date = value ? new Date(value) : new Date();
    date.setHours(0, 0, 0, 0);
    return date;
}

function sameNullableId(a, b) {
    return (a || null) === (b || null);
}

function toJsonValue(value) {
    return JSON.parse(JSON.stringify(value ?? null));
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

            // Copia i rischi della mansione come rischi personalizzati del lavoratore
            // Il lavoratore potrà poi aggiungere/rimuovere rischi individualmente
            try {
                await this._copyMansioneRisksToWorker(personId, mansioneId, tenantId);
            } catch (copyErr) {
                logger.warn({ personId, mansioneId, tenantId, error: copyErr.message }, 'Errore copia rischi mansione a lavoratore');
            }

            // Crea scadenze prima visita per ogni prestazione del protocollo della mansione
            try {
                await this._creaScadenzePrimaVisita(personId, mansioneId, tenantId);
            } catch (scadenzaErr) {
                // Non bloccare l'assegnazione se la creazione scadenze fallisce
                logger.warn({ personId, mansioneId, tenantId, error: scadenzaErr.message }, 'Errore creazione scadenze prima visita MDL');
            }

            await this.syncOccupationalSnapshot(personId, tenantId, 'MANSIONE_ASSEGNATA');

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
        const existing = await prisma.lavoratoreMansione.findFirst({
            where: { id: assignmentId, tenantId, deletedAt: null }
        });
        if (!existing) throw new Error('Assegnazione mansione non trovata');

        const assignment = await prisma.lavoratoreMansione.update({
            where: { id: assignmentId },
            data: {
                isAttiva: false,
                dataFine: new Date()
            }
        });

        await this._reconcileWorkerRisksFromActiveMansions(existing.personId, tenantId);
        await this.syncOccupationalSnapshot(existing.personId, tenantId, 'MANSIONE_RIMOSSA');

        logger.info({ assignmentId, tenantId }, 'Mansione rimossa da lavoratore');
        return assignment;
    },

    /**
     * Copia i rischi di una mansione come rischi personalizzati del lavoratore.
     * Se il rischio esiste già attivo, lo salta. Se è soft-deleted, lo riattiva.
     * @param {string} personId - ID lavoratore
     * @param {string} mansioneId - ID mansione
     * @param {string} tenantId - ID tenant
     */
    async _copyMansioneRisksToWorker(personId, mansioneId, tenantId) {
        const mansioneRischi = await prisma.mansioneRischio.findMany({
            where: { mansioneId, deletedAt: null },
        });

        if (mansioneRischi.length === 0) return;

        let copied = 0;
        let reactivated = 0;
        let skipped = 0;

        for (const rischio of mansioneRischi) {
            // Cerca se esiste già un record per questo rischio (attivo o soft-deleted)
            const existing = await prisma.lavoratoreRischioAggiuntivo.findFirst({
                where: { personId, codiceRischio: rischio.codiceRischio, tenantId },
            });

            if (existing) {
                if (existing.deletedAt) {
                    // Era soft-deleted → riattiva con dati aggiornati dalla mansione
                    await prisma.lavoratoreRischioAggiuntivo.update({
                        where: { id: existing.id },
                        data: {
                            deletedAt: null,
                            livello: rischio.livello,
                            categoria: rischio.categoria,
                            descrizioneEsposizione: rischio.descrizioneEsposizione,
                            fonteRischio: rischio.fonteRischio,
                            periodicitaMesi: rischio.periodicitaMesi,
                            sourceMansioneId: mansioneId,
                        },
                    });
                    reactivated++;
                } else {
                    // Già attivo → non sovrascrivere (il lavoratore potrebbe aver personalizzato)
                    skipped++;
                }
            } else {
                // Nuovo → crea
                await prisma.lavoratoreRischioAggiuntivo.create({
                    data: {
                        personId,
                        tenantId,
                        codiceRischio: rischio.codiceRischio,
                        livello: rischio.livello,
                        categoria: rischio.categoria,
                        descrizioneEsposizione: rischio.descrizioneEsposizione,
                        fonteRischio: rischio.fonteRischio,
                        periodicitaMesi: rischio.periodicitaMesi,
                        sourceMansioneId: mansioneId,
                    },
                });
                copied++;
            }
        }

        logger.info({ personId, mansioneId, tenantId, copied, reactivated, skipped }, 'Rischi mansione copiati a lavoratore');
    },

    /**
     * Ottiene tutti i rischi associati alle mansioni di un lavoratore
     * @param {string} personId - ID lavoratore
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Array>} Lista rischi unici
     */
    async getWorkerRisks(personId, tenantId) {
        await this.ensureWorkerProtocolAssignments(personId, tenantId);
        await this.syncOccupationalSnapshot(personId, tenantId, 'SYNC_RISCHI_WORKER');

        const assignments = await prisma.lavoratoreMansione.findMany({
            where: {
                personId,
                tenantId,
                isAttiva: true,
                deletedAt: null
            },
            orderBy: [{ isPrimaria: 'desc' }, { dataInizio: 'desc' }],
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

        // Raccoglie mansioni uniche assegnate al lavoratore
        // Include _assignmentId per permettere la rimozione dal frontend
        const mansioniMap = new Map();
        for (const assignment of assignments) {
            if (!mansioniMap.has(assignment.mansione.id)) {
                mansioniMap.set(assignment.mansione.id, {
                    ...assignment.mansione,
                    _assignmentId: assignment.id,
                    _isPrimaria: assignment.isPrimaria,
                    _dataInizio: assignment.dataInizio,
                    _dataFine: assignment.dataFine,
                });
            }
        }

        // Fetch rischi personalizzati del lavoratore (fonte primaria)
        const rischiPersonalizzati = await prisma.lavoratoreRischioAggiuntivo.findMany({
            where: {
                personId,
                tenantId,
                deletedAt: null,
            },
            orderBy: { codiceRischio: 'asc' },
        });

        // Se il lavoratore ha rischi personalizzati → usa quelli come fonte primaria
        // Se non ne ha → fallback ai rischi delle mansioni (per backward compat con lavoratori pre-migrazione)
        const hasPersonalizedRisks = rischiPersonalizzati.length > 0;

        const risksMap = new Map();

        if (hasPersonalizedRisks) {
            // Fonte primaria: rischi personalizzati del lavoratore
            for (const r of rischiPersonalizzati) {
                risksMap.set(r.codiceRischio, {
                    codiceRischio: r.codiceRischio,
                    livello: r.livello,
                    categoria: r.categoria,
                    periodicitaMesi: r.periodicitaMesi,
                    mansioni: [],
                    _isPersonalizzato: true,
                    _recordId: r.id,
                    _sourceMansioneId: r.sourceMansioneId,
                });
            }
            // Aggiungi info mansione di origine per contesto
            for (const assignment of assignments) {
                for (const rischio of assignment.mansione.rischiAssociati) {
                    const entry = risksMap.get(rischio.codiceRischio);
                    if (entry) {
                        entry.mansioni.push(assignment.mansione.denominazione);
                    }
                }
            }
        } else {
            // Fallback: rischi derivati dalle mansioni (lavoratori pre-migrazione)
            for (const assignment of assignments) {
                for (const rischio of assignment.mansione.rischiAssociati) {
                    const existing = risksMap.get(rischio.codiceRischio);
                    if (!existing || this._compareLevels(rischio.livello, existing.livello) > 0) {
                        risksMap.set(rischio.codiceRischio, {
                            codiceRischio: rischio.codiceRischio,
                            livello: rischio.livello,
                            categoria: rischio.categoria,
                            mansioni: [...(existing?.mansioni || []), assignment.mansione.denominazione],
                            periodicitaMesi: rischio.periodicitaMesi,
                            _isPersonalizzato: false,
                            _recordId: null,
                        });
                    } else if (existing) {
                        existing.mansioni.push(assignment.mansione.denominazione);
                    }
                }
            }
        }

        const statoOccupazionale = await this.getOccupationalHistory(personId, tenantId);

        return {
            rischi: Array.from(risksMap.values()),
            hasPersonalizedRisks,
            mansioni: Array.from(mansioniMap.values()),
            statoOccupazionale,
        };
    },

    /**
     * Aggiunge un rischio personalizzato per singolo lavoratore
     */
    async addWorkerRischio(personId, data, tenantId) {
        const { codiceRischio, livello, categoria, descrizioneEsposizione, fonteRischio, periodicitaMesi, note } = data;

        // Verifica se esiste già (attivo o soft-deleted)
        const existing = await prisma.lavoratoreRischioAggiuntivo.findFirst({
            where: { personId, codiceRischio, tenantId },
        });

        if (existing) {
            if (existing.deletedAt) {
                // Era soft-deleted → riattiva con nuovi dati
                const rischio = await prisma.lavoratoreRischioAggiuntivo.update({
                    where: { id: existing.id },
                    data: {
                        deletedAt: null,
                        livello: livello || 'MEDIO',
                        categoria,
                        descrizioneEsposizione,
                        fonteRischio,
                        periodicitaMesi,
                        note,
                        sourceMansioneId: null, // Aggiunto manualmente
                    },
                });
                await this.syncOccupationalSnapshot(personId, tenantId, 'RISCHIO_RIATTIVATO');
                return rischio;
            }
            throw new Error(`Rischio ${codiceRischio} già assegnato a questo lavoratore`);
        }

        const rischio = await prisma.lavoratoreRischioAggiuntivo.create({
            data: {
                personId,
                tenantId,
                codiceRischio,
                livello: livello || 'MEDIO',
                categoria,
                descrizioneEsposizione,
                fonteRischio,
                periodicitaMesi,
                note,
            },
        });
        await this.syncOccupationalSnapshot(personId, tenantId, 'RISCHIO_AGGIUNTO');
        return rischio;
    },

    /**
     * Aggiorna un rischio aggiuntivo per singolo lavoratore
     */
    async updateWorkerRischio(id, data, tenantId) {
        const rischio = await prisma.lavoratoreRischioAggiuntivo.findFirst({
            where: { id, tenantId, deletedAt: null },
        });
        if (!rischio) throw new Error('Rischio aggiuntivo non trovato');

        const { livello, descrizioneEsposizione, fonteRischio, periodicitaMesi, note } = data;
        const updated = await prisma.lavoratoreRischioAggiuntivo.update({
            where: { id },
            data: { livello, descrizioneEsposizione, fonteRischio, periodicitaMesi, note },
        });
        await this.syncOccupationalSnapshot(rischio.personId, tenantId, 'RISCHIO_AGGIORNATO');
        return updated;
    },

    /**
     * Rimuove (soft delete) un rischio aggiuntivo per singolo lavoratore
     */
    async removeWorkerRischio(id, tenantId) {
        const rischio = await prisma.lavoratoreRischioAggiuntivo.findFirst({
            where: { id, tenantId, deletedAt: null },
        });
        if (!rischio) throw new Error('Rischio aggiuntivo non trovato');

        const removed = await prisma.lavoratoreRischioAggiuntivo.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        await this.syncOccupationalSnapshot(rischio.personId, tenantId, 'RISCHIO_RIMOSSO');
        return removed;
    },

    /**
     * Inizializza i rischi personalizzati per un lavoratore copiandoli dalle sue mansioni attive.
     * Usato per migrare lavoratori pre-esistenti al sistema per-worker.
     * @param {string} personId - ID lavoratore
     * @param {string} tenantId - ID tenant
     */
    async initializeWorkerRisks(personId, tenantId) {
        // Verifica che il lavoratore non abbia già rischi personalizzati
        const existingCount = await prisma.lavoratoreRischioAggiuntivo.count({
            where: { personId, tenantId, deletedAt: null },
        });
        if (existingCount > 0) {
            throw new Error('Il lavoratore ha già rischi personalizzati');
        }

        // Trova tutte le mansioni attive e copia i rischi
        const assignments = await prisma.lavoratoreMansione.findMany({
            where: { personId, tenantId, isAttiva: true, deletedAt: null },
        });

        for (const assignment of assignments) {
            await this._copyMansioneRisksToWorker(personId, assignment.mansioneId, tenantId);
        }

        await this.syncOccupationalSnapshot(personId, tenantId, 'RISCHI_INIZIALIZZATI');
        return { initialized: true };
    },

    /**
     * Sincronizza il contesto occupazionale con il protocollo assegnato al profilo
     * tenant del lavoratore. Il protocollo NON assegna automaticamente mansioni:
     * mansioni e rischi restano quelli effettivamente associati al singolo dipendente.
     */
    async ensureWorkerProtocolAssignments(personId, tenantId) {
        const profile = await prisma.personTenantProfile.findFirst({
            where: { personId, tenantId, deletedAt: null, isActive: true },
            include: { protocolloSanitario: true }
        });

        const protocollo = profile?.protocolloSanitario;
        if (!profile || !protocollo || protocollo.deletedAt || !protocollo.isAttivo) {
            await this.syncOccupationalSnapshot(personId, tenantId, 'SYNC_PROTOCOLLO');
            return { assigned: 0, skipped: 0, protocolloId: null };
        }

        await this.syncOccupationalSnapshot(personId, tenantId, 'PROTOCOLLO_SANITARIO');
        return { assigned: 0, skipped: 0, protocolloId: protocollo.id };
    },

    async updateWorkerOccupationalProfile(personId, data, tenantId) {
        const {
            protocolloSanitarioId,
            title,
            hiredDate,
            endDate,
            tipoContratto,
            tipoCollaboratore,
            oreSettimanali,
            companyTenantProfileId,
            siteId,
            repartoId
        } = data || {};
        const profile = await prisma.personTenantProfile.findFirst({
            where: { personId, tenantId, deletedAt: null, isActive: true },
            select: { id: true },
        });
        if (!profile) {
            throw new Error('Profilo tenant del lavoratore non trovato');
        }

        if (protocolloSanitarioId) {
            const protocollo = await prisma.protocolloSanitario.findFirst({
                where: { id: protocolloSanitarioId, tenantId, deletedAt: null, isAttivo: true },
                select: { id: true },
            });
            if (!protocollo) {
                throw new Error('Protocollo sanitario non valido o non attivo');
            }
        }

        const updateData = {
            protocolloSanitarioId: protocolloSanitarioId || null,
        };
        if (Object.prototype.hasOwnProperty.call(data || {}, 'title')) updateData.title = title || null;
        if (Object.prototype.hasOwnProperty.call(data || {}, 'hiredDate')) updateData.hiredDate = hiredDate ? new Date(hiredDate) : null;
        if (Object.prototype.hasOwnProperty.call(data || {}, 'endDate')) updateData.endDate = endDate ? new Date(endDate) : null;
        if (Object.prototype.hasOwnProperty.call(data || {}, 'tipoContratto')) updateData.tipoContratto = tipoContratto || null;
        if (Object.prototype.hasOwnProperty.call(data || {}, 'tipoCollaboratore')) updateData.tipoCollaboratore = tipoCollaboratore || null;
        if (Object.prototype.hasOwnProperty.call(data || {}, 'oreSettimanali')) updateData.oreSettimanali = oreSettimanali === '' || oreSettimanali == null ? null : Number(oreSettimanali);
        if (Object.prototype.hasOwnProperty.call(data || {}, 'companyTenantProfileId')) updateData.companyTenantProfileId = companyTenantProfileId || null;
        if (Object.prototype.hasOwnProperty.call(data || {}, 'siteId')) updateData.siteId = siteId || null;
        if (Object.prototype.hasOwnProperty.call(data || {}, 'repartoId')) updateData.repartoId = repartoId || null;

        await prisma.personTenantProfile.update({
            where: { id: profile.id },
            data: updateData,
        });

        await this.syncOccupationalSnapshot(personId, tenantId, 'STATO_OCCUPAZIONALE_MODIFICATO');
        return this.getWorkerRisks(personId, tenantId);
    },

    async _getActiveWorkerContext(personId, tenantId) {
        const [profile, assignments, risks] = await Promise.all([
            prisma.personTenantProfile.findFirst({
                where: { personId, tenantId, deletedAt: null, isActive: true },
                include: {
                    companyTenantProfile: {
                        select: { id: true, company: { select: { ragioneSociale: true, piva: true, codiceFiscale: true } } }
                    },
                    site: { select: { id: true, siteName: true, citta: true } },
                    reparto: { select: { id: true, nome: true, codice: true } },
                    protocolloSanitario: {
                        select: {
                            id: true,
                            codice: true,
                            denominazione: true,
                            periodicitaVisiteMesi: true,
                            prestazioni: {
                                where: { deletedAt: null },
                                select: {
                                    prestazioneId: true,
                                    isObbligatoria: true,
                                    periodicita: true,
                                    periodicitaCustomMesi: true,
                                    condizioniApplicazione: true,
                                    prestazione: { select: { id: true, nome: true, codice: true, tipo: true } }
                                }
                            }
                        }
                    }
                }
            }),
            prisma.lavoratoreMansione.findMany({
                where: { personId, tenantId, isAttiva: true, deletedAt: null },
                include: { mansione: { select: { id: true, codice: true, denominazione: true, siteId: true } } },
                orderBy: [{ isPrimaria: 'desc' }, { dataInizio: 'desc' }]
            }),
            prisma.lavoratoreRischioAggiuntivo.findMany({
                where: { personId, tenantId, deletedAt: null },
                orderBy: { codiceRischio: 'asc' }
            })
        ]);

        const primaryAssignment = assignments.find(a => a.isPrimaria) || assignments[0] || null;
        const current = profile ? {
            personId,
            tenantId,
            personTenantProfileId: profile.id,
            companyTenantProfileId: profile.companyTenantProfileId || null,
            siteId: profile.siteId || primaryAssignment?.mansione?.siteId || null,
            repartoId: profile.repartoId || null,
            mansioneId: primaryAssignment?.mansioneId || null,
            protocolloSanitarioId: profile.protocolloSanitarioId || null,
            titolo: profile.title || null,
            status: profile.status || null,
            tipoContratto: profile.tipoContratto || null,
            oreSettimanali: profile.oreSettimanali || null,
            dataInizio: startOfDay(profile.hiredDate || primaryAssignment?.dataInizio || new Date()),
            dataFine: profile.endDate ? startOfDay(profile.endDate) : null,
        } : null;

        const snapshot = {
            company: profile?.companyTenantProfile?.company || null,
            site: profile?.site || null,
            reparto: profile?.reparto || null,
            title: profile?.title || null,
            hiredDate: profile?.hiredDate || null,
            endDate: profile?.endDate || null,
            tipoContratto: profile?.tipoContratto || null,
            tipoCollaboratore: profile?.tipoCollaboratore || null,
            oreSettimanali: profile?.oreSettimanali || null,
            protocolloSanitario: profile?.protocolloSanitario || null,
            mansioni: assignments.map(a => ({
                id: a.mansioneId,
                assignmentId: a.id,
                codice: a.mansione?.codice,
                denominazione: a.mansione?.denominazione,
                isPrimaria: a.isPrimaria,
                dataInizio: a.dataInizio,
                dataFine: a.dataFine
            })),
            rischi: risks.map(r => ({
                id: r.id,
                codiceRischio: r.codiceRischio,
                livello: r.livello,
                categoria: r.categoria,
                periodicitaMesi: r.periodicitaMesi,
                sourceMansioneId: r.sourceMansioneId,
                fonteRischio: r.fonteRischio
            }))
        };

        return { profile, current, snapshot };
    },

    async syncOccupationalSnapshot(personId, tenantId, motivo = 'SYNC') {
        const { profile, current, snapshot } = await this._getActiveWorkerContext(personId, tenantId);
        if (!profile || !current) return null;

        const activeRecord = await prisma.statoOccupazionaleStorico.findFirst({
            where: { personId, tenantId, isCorrente: true, deletedAt: null },
            orderBy: { dataInizio: 'desc' }
        });

        const changed = !activeRecord ||
            !sameNullableId(activeRecord.personTenantProfileId, current.personTenantProfileId) ||
            !sameNullableId(activeRecord.companyTenantProfileId, current.companyTenantProfileId) ||
            !sameNullableId(activeRecord.siteId, current.siteId) ||
            !sameNullableId(activeRecord.repartoId, current.repartoId) ||
            !sameNullableId(activeRecord.mansioneId, current.mansioneId) ||
            !sameNullableId(activeRecord.protocolloSanitarioId, current.protocolloSanitarioId) ||
            activeRecord.status !== current.status ||
            activeRecord.tipoContratto !== current.tipoContratto ||
            activeRecord.oreSettimanali !== current.oreSettimanali ||
            activeRecord.titolo !== current.titolo;

        let record = activeRecord;
        if (changed) {
            if (activeRecord) {
                await prisma.statoOccupazionaleStorico.update({
                    where: { id: activeRecord.id },
                    data: {
                        isCorrente: false,
                        dataFine: startOfDay(new Date()),
                        motivo: activeRecord.motivo || motivo
                    }
                });
            }

            record = await prisma.statoOccupazionaleStorico.create({
                data: {
                    ...current,
                    fonte: 'PERSON_TENANT_PROFILE',
                    motivo,
                    snapshot: toJsonValue(snapshot)
                }
            });
        } else if (activeRecord) {
            record = await prisma.statoOccupazionaleStorico.update({
                where: { id: activeRecord.id },
                data: {
                    dataFine: current.dataFine,
                    snapshot: toJsonValue(snapshot),
                    motivo
                }
            });
        }

        const recordSummary = record ? {
            id: record.id,
            personId: record.personId,
            tenantId: record.tenantId,
            companyTenantProfileId: record.companyTenantProfileId,
            siteId: record.siteId,
            repartoId: record.repartoId,
            mansioneId: record.mansioneId,
            protocolloSanitarioId: record.protocolloSanitarioId,
            titolo: record.titolo,
            status: record.status,
            tipoContratto: record.tipoContratto,
            oreSettimanali: record.oreSettimanali,
            dataInizio: record.dataInizio,
            dataFine: record.dataFine,
            isCorrente: record.isCorrente,
            motivo: record.motivo
        } : null;

        await prisma.profiloDiSalutePersona.upsert({
            where: { personId_tenantId: { personId, tenantId } },
            create: {
                personId,
                tenantId,
                sorveglianzaSanitaria: toJsonValue({
                    protocolloSanitario: snapshot.protocolloSanitario,
                    mansioni: snapshot.mansioni,
                    rischi: snapshot.rischi,
                    aggiornataAl: new Date().toISOString(),
                    fonte: motivo
                }),
                storicoOccupazionale: toJsonValue({
                    corrente: recordSummary,
                    ultimoSnapshot: snapshot,
                    aggiornataAl: new Date().toISOString()
                })
            },
            update: {
                sorveglianzaSanitaria: toJsonValue({
                    protocolloSanitario: snapshot.protocolloSanitario,
                    mansioni: snapshot.mansioni,
                    rischi: snapshot.rischi,
                    aggiornataAl: new Date().toISOString(),
                    fonte: motivo
                }),
                storicoOccupazionale: toJsonValue({
                    corrente: recordSummary,
                    ultimoSnapshot: snapshot,
                    aggiornataAl: new Date().toISOString()
                })
            }
        });

        return record;
    },

    async getOccupationalHistory(personId, tenantId) {
        const history = await prisma.statoOccupazionaleStorico.findMany({
            where: { personId, tenantId, deletedAt: null },
            orderBy: [{ isCorrente: 'desc' }, { dataInizio: 'desc' }],
            take: 25,
            include: {
                companyTenantProfile: { select: { id: true, company: { select: { ragioneSociale: true, piva: true } } } },
                site: { select: { id: true, siteName: true, citta: true } },
                reparto: { select: { id: true, nome: true, codice: true } },
                mansione: { select: { id: true, codice: true, denominazione: true } },
                protocolloSanitario: {
                    select: {
                        id: true,
                        codice: true,
                        denominazione: true,
                        periodicitaVisiteMesi: true,
                        prestazioni: {
                            where: { deletedAt: null },
                            select: {
                                prestazioneId: true,
                                isObbligatoria: true,
                                periodicita: true,
                                periodicitaCustomMesi: true,
                                condizioniApplicazione: true,
                                prestazione: { select: { id: true, nome: true, codice: true, tipo: true } }
                            }
                        }
                    }
                }
            }
        });

        return {
            current: history.find(h => h.isCorrente) || history[0] || null,
            history
        };
    },

    async _reconcileWorkerRisksFromActiveMansions(personId, tenantId) {
        const assignments = await prisma.lavoratoreMansione.findMany({
            where: { personId, tenantId, isAttiva: true, deletedAt: null },
            include: {
                mansione: {
                    include: { rischiAssociati: { where: { deletedAt: null } } }
                }
            }
        });

        const activeRiskSourceByCode = new Map();
        for (const assignment of assignments) {
            for (const rischio of assignment.mansione.rischiAssociati) {
                const existing = activeRiskSourceByCode.get(rischio.codiceRischio);
                if (!existing || this._compareLevels(rischio.livello, existing.livello) > 0) {
                    activeRiskSourceByCode.set(rischio.codiceRischio, {
                        mansioneId: assignment.mansioneId,
                        livello: rischio.livello
                    });
                }
            }
        }

        const workerRisks = await prisma.lavoratoreRischioAggiuntivo.findMany({
            where: { personId, tenantId, deletedAt: null, sourceMansioneId: { not: null } }
        });

        for (const rischio of workerRisks) {
            const activeSource = activeRiskSourceByCode.get(rischio.codiceRischio);
            if (!activeSource) {
                await prisma.lavoratoreRischioAggiuntivo.update({
                    where: { id: rischio.id },
                    data: { deletedAt: new Date() }
                });
            } else if (activeSource.mansioneId !== rischio.sourceMansioneId) {
                await prisma.lavoratoreRischioAggiuntivo.update({
                    where: { id: rischio.id },
                    data: { sourceMansioneId: activeSource.mansioneId }
                });
            }
        }
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
        const profile = await prisma.personTenantProfile.findFirst({
            where: { personId, tenantId, deletedAt: null, isActive: true },
            select: { protocolloSanitarioId: true }
        });

        // Priorità: protocollo assegnato al lavoratore. Fallback: protocollo associato alla mansione.
        const protocolloWhere = profile?.protocolloSanitarioId
            ? { id: profile.protocolloSanitarioId, tenantId, isAttivo: true, deletedAt: null }
            : {
                mansioniAssociate: { some: { mansioneId } },
                tenantId,
                isAttivo: true,
                deletedAt: null
            };

        const protocollo = await prisma.protocolloSanitario.findFirst({
            where: protocolloWhere,
            orderBy: { dataInizioValidita: 'desc' },
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
            logger.info({ personId, mansioneId, tenantId }, 'Nessun protocollo configurato per lavoratore/mansione, skip prima visita scadenze');
            return;
        }

        // Una stessa persona non deve ricevere duplicati dello stesso protocollo solo
        // perché ha più mansioni coperte dallo stesso protocollo sanitario.
        const existingProtocollo = await prisma.scadenzaPrestazioneProtocollo.findFirst({
            where: {
                personId,
                tenantId,
                protocolloId: protocollo.id,
                isPrimaVisita: true,
                deletedAt: null
            }
        });
        if (existingProtocollo) {
            logger.info({ personId, mansioneId, tenantId, protocolloId: protocollo.id }, 'Scadenze prima visita protocollo già esistenti, skip');
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
