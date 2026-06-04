/**
 * MovimentoContabile Service
 * 
 * Progetto 59 - Modello Unificato COSTI e RICAVI
 * 
 * Gestisce:
 * - ENTRATA (Ricavi): Fatture da emettere verso pazienti/aziende
 * - USCITA (Costi): Compensi da pagare a MC, RSPP, formatori, fornitori
 * 
 * @module services/management/movimento-contabile-service
 * @version 1.0.0
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { BranchAwareService } from '../BranchAwareService.js';

// Enum values per validazione
export const DirezioneMovimento = {
    ENTRATA: 'ENTRATA',
    USCITA: 'USCITA'
};

export const StatoMovimento = {
    BOZZA: 'BOZZA',
    DA_FATTURARE: 'DA_FATTURARE',
    CONFERMATO: 'CONFERMATO',   // alias storico, mantenuto per compatibilità dati
    FATTURATO: 'FATTURATO',
    PAGATO: 'PAGATO',
    ANNULLATO: 'ANNULLATO',
    STORNATO: 'STORNATO'
};

export const TipoAttivitaMovimento = {
    // Clinica
    VISITA_MEDICA: 'VISITA_MEDICA',
    PRESTAZIONE_CLINICA: 'PRESTAZIONE_CLINICA',
    REFERTO: 'REFERTO',
    // MDL
    VISITA_MDL: 'VISITA_MDL',
    SOPRALLUOGO_MC: 'SOPRALLUOGO_MC',
    SOPRALLUOGO_RSPP: 'SOPRALLUOGO_RSPP',
    DVR_NUOVO: 'DVR_NUOVO',
    DVR_AGGIORNAMENTO_CON_MODIFICHE: 'DVR_AGGIORNAMENTO_CON_MODIFICHE',
    DVR_AGGIORNAMENTO_SENZA_MODIFICHE: 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE',
    NOMINA_MC: 'NOMINA_MC',
    NOMINA_RSPP: 'NOMINA_RSPP',
    GIUDIZIO_IDONEITA: 'GIUDIZIO_IDONEITA',
    ALLEGATO_3B: 'ALLEGATO_3B',
    // Formazione
    CORSO_FORMAZIONE: 'CORSO_FORMAZIONE',
    DOCENZA: 'DOCENZA',
    ATTESTATO: 'ATTESTATO',
    // Commerciale
    BUNDLE: 'BUNDLE',
    CONVENZIONE: 'CONVENZIONE',
    CONSULENZA: 'CONSULENZA',
    // Spese
    SPESA_FISSA: 'SPESA_FISSA',
    SPESA_RICORRENTE: 'SPESA_RICORRENTE',
    RIMBORSO: 'RIMBORSO',
    COMPENSO_FORMATORE: 'COMPENSO_FORMATORE'
};

export const TipoSoggettoMovimento = {
    PAZIENTE: 'PAZIENTE',
    AZIENDA: 'AZIENDA',
    DIPENDENTE: 'DIPENDENTE',
    MEDICO: 'MEDICO',
    FORMATORE: 'FORMATORE',
    RSPP: 'RSPP',
    FORNITORE: 'FORNITORE'
};

/**
 * Servizio per la gestione dei movimenti contabili
 * Estende BranchAwareService per supporto multi-branch
 */
class MovimentoContabileService extends BranchAwareService {
    constructor() {
        // Usa il nome del modello Prisma camelCase
        super('movimentoContabile', null, { mixedBranch: true });
    }

    /**
     * Crea un nuovo movimento contabile
     * 
     * @param {string} tenantId - ID tenant
     * @param {Object} data - Dati del movimento (include createdBy)
     * @returns {Promise<Object>} Movimento creato
     */
    async create(tenantId, data) {
        const createdBy = data.createdBy || null;
        try {
            // Validazione direzione e tipoSoggetto
            if (!Object.values(DirezioneMovimento).includes(data.direzione)) {
                throw new Error(`Direzione non valida: ${data.direzione}`);
            }
            if (!Object.values(TipoAttivitaMovimento).includes(data.tipo)) {
                throw new Error(`Tipo attività non valido: ${data.tipo}`);
            }
            if (!Object.values(TipoSoggettoMovimento).includes(data.tipoSoggetto)) {
                throw new Error(`Tipo soggetto non valido: ${data.tipoSoggetto}`);
            }

            const movimento = await prisma.movimentoContabile.create({
                data: {
                    ...data,
                    tenantId,
                    createdBy,
                    stato: data.stato || StatoMovimento.BOZZA
                },
                include: this._getDefaultIncludes()
            });

            logger.info(`MovimentoContabile creato: ${movimento.id}`, {
                tenantId,
                direzione: movimento.direzione,
                tipo: movimento.tipo,
                importoNetto: movimento.importoNetto
            });

            return movimento;
        } catch (error) {
            logger.error('Errore creazione MovimentoContabile:', error);
            throw error;
        }
    }

    /**
     * Crea coppia di movimenti ENTRATA + USCITA collegati
     * Es: Visita MDL genera ENTRATA (fattura azienda) + USCITA (compenso medico)
     * 
     * @param {string} tenantId - ID tenant
     * @param {Object} entrata - Dati movimento ENTRATA (include createdBy)
     * @param {Object} uscita - Dati movimento USCITA
     * @returns {Promise<{entrata: Object, uscita: Object}>}
     */
    async createPair(tenantId, entrata, uscita) {
        const createdBy = entrata.createdBy || uscita.createdBy || null;
        try {
            return await prisma.$transaction(async (tx) => {
                // Crea ENTRATA
                const movimentoEntrata = await tx.movimentoContabile.create({
                    data: {
                        ...entrata,
                        direzione: DirezioneMovimento.ENTRATA,
                        tenantId,
                        createdBy
                    }
                });

                // Crea USCITA collegata
                const movimentoUscita = await tx.movimentoContabile.create({
                    data: {
                        ...uscita,
                        direzione: DirezioneMovimento.USCITA,
                        movimentoCollegatoId: movimentoEntrata.id,
                        tenantId,
                        createdBy
                    }
                });

                logger.info('MovimentoContabile pair creato', {
                    tenantId,
                    entrataId: movimentoEntrata.id,
                    uscitaId: movimentoUscita.id
                });

                return { entrata: movimentoEntrata, uscita: movimentoUscita };
            });
        } catch (error) {
            logger.error('Errore creazione coppia MovimentoContabile:', error);
            throw error;
        }
    }

    /**
     * Trova un movimento per ID
     * 
     * @param {string} tenantId - ID tenant
     * @param {string} id - ID movimento
     * @returns {Promise<Object|null>}
     */
    async findById(tenantId, id) {
        return prisma.movimentoContabile.findFirst({
            where: {
                id,
                tenantId,
                deletedAt: null
            },
            include: this._getDefaultIncludes()
        });
    }

    /**
     * Lista movimenti con filtri
     * 
     * @param {Object} filters - Filtri di ricerca
     * @param {string} tenantId - ID tenant
     * @param {Object} pagination - Paginazione { page, pageSize }
     * @returns {Promise<{data: Object[], total: number, page: number, pageSize: number}>}
     */
    async findAll(filters, tenantId, pagination = { page: 1, pageSize: 20 }) {
        const where = {
            tenantId,
            deletedAt: null
        };

        // Applica filtri
        if (filters.direzione) where.direzione = filters.direzione;
        if (filters.tipo) where.tipo = filters.tipo;
        if (filters.stato) {
            const stati = Array.isArray(filters.stato)
                ? filters.stato
                : String(filters.stato).split(',').map(stato => stato.trim()).filter(Boolean);
            where.stato = stati.length > 1 ? { in: stati } : stati[0];
        }
        if (filters.tipoSoggetto) where.tipoSoggetto = filters.tipoSoggetto;
        if (filters.personId) where.personId = filters.personId;
        if (filters.companyTenantProfileId) where.companyTenantProfileId = filters.companyTenantProfileId;
        if (filters.branchType) where.branchType = filters.branchType;
        if (filters.nominaRuoloId) where.nominaRuoloId = filters.nominaRuoloId;
        if (filters.siteId) where.siteId = filters.siteId; // Filtro per sede

        // Filtri date
        if (filters.dataEsecuzioneDa || filters.dataEsecuzioneA) {
            where.dataEsecuzione = {};
            if (filters.dataEsecuzioneDa) where.dataEsecuzione.gte = new Date(filters.dataEsecuzioneDa);
            if (filters.dataEsecuzioneA) where.dataEsecuzione.lte = new Date(filters.dataEsecuzioneA);
        }

        if (filters.dataScadenzaDa || filters.dataScadenzaA) {
            where.dataScadenza = {};
            if (filters.dataScadenzaDa) where.dataScadenza.gte = new Date(filters.dataScadenzaDa);
            if (filters.dataScadenzaA) where.dataScadenza.lte = new Date(filters.dataScadenzaA);
        }

        const allowedSortFields = new Set(['dataEsecuzione', 'dataScadenza', 'createdAt', 'updatedAt', 'importoLordo', 'importoNetto', 'stato']);
        const page = Math.max(Number(pagination.page) || 1, 1);
        const pageSize = Math.min(Math.max(Number(pagination.pageSize) || 20, 1), 5000);
        const sortBy = allowedSortFields.has(pagination.sortBy) ? pagination.sortBy : 'dataEsecuzione';
        const sortOrder = pagination.sortOrder === 'asc' ? 'asc' : 'desc';
        const skip = (page - 1) * pageSize;

        const [data, total] = await Promise.all([
            prisma.movimentoContabile.findMany({
                where,
                include: this._getDefaultIncludes(),
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: pageSize
            }),
            prisma.movimentoContabile.count({ where })
        ]);

        return { data, total, page, pageSize };
    }

    /**
     * Aggiorna un movimento
     * 
     * @param {string} tenantId - ID tenant
     * @param {string} id - ID movimento
     * @param {Object} data - Dati da aggiornare (include updatedBy)
     * @returns {Promise<Object>}
     */
    async update(tenantId, id, data) {
        const updatedBy = data.updatedBy || null;
        try {
            // Verifica esistenza e proprietà
            const existing = await this.findById(tenantId, id);
            if (!existing) {
                throw new Error('Movimento non trovato');
            }

            // Non permettere modifica se già fatturato/pagato
            if ([StatoMovimento.FATTURATO, StatoMovimento.PAGATO].includes(existing.stato)) {
                throw new Error(`Non è possibile modificare un movimento in stato ${existing.stato}`);
            }

            // Rimuovi campi non persistibili
            const { updatedBy: _ub, ...dataToSave } = data;

            const movimento = await prisma.movimentoContabile.update({
                where: { id },
                data: {
                    ...dataToSave,
                    updatedBy
                },
                include: this._getDefaultIncludes()
            });

            logger.info(`MovimentoContabile aggiornato: ${id}`, { tenantId, updatedBy });
            return movimento;
        } catch (error) {
            logger.error('Errore aggiornamento MovimentoContabile:', error);
            throw error;
        }
    }

    /**
     * Soft delete di un movimento
     * 
     * @param {string} tenantId - ID tenant
     * @param {string} id - ID movimento
     * @param {Object} opts - { deletionReason, deletedBy }
     * @returns {Promise<Object>}
     */
    async delete(tenantId, id, { deletionReason, deletedBy } = {}) {
        try {
            // Validazione GDPR: motivo obbligatorio
            if (!deletionReason || deletionReason.length < 10) {
                throw new Error('Il motivo della cancellazione deve essere almeno 10 caratteri (GDPR)');
            }

            const existing = await this.findById(tenantId, id);
            if (!existing) {
                throw new Error('Movimento non trovato');
            }

            // Non permettere cancellazione se fatturato/pagato
            if ([StatoMovimento.FATTURATO, StatoMovimento.PAGATO].includes(existing.stato)) {
                throw new Error(`Non è possibile cancellare un movimento in stato ${existing.stato}. Usa storno.`);
            }

            const movimento = await prisma.movimentoContabile.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    updatedBy: deletedBy,
                    note: `${existing.note || ''}\n[DELETED] ${deletionReason}`
                }
            });

            // Log GDPR
            await prisma.gdprAuditLog.create({
                data: {
                    tenantId,
                    personId: deletedBy,
                    action: 'DELETE',
                    resourceType: 'MovimentoContabile',
                    resourceId: id,
                    dataAccessed: { reason: deletionReason, deletedBy },
                    ipAddress: 'internal'
                }
            });

            logger.info(`MovimentoContabile soft deleted: ${id}`, { tenantId, deletedBy, deletionReason });
            return movimento;
        } catch (error) {
            logger.error('Errore cancellazione MovimentoContabile:', error);
            throw error;
        }
    }

    /**
     * Cambia stato di un movimento
     * 
     * @param {string} tenantId - ID tenant
     * @param {string} id - ID movimento
     * @param {Object} opts - { stato, updatedBy, dataPagamento, metodoPagamento, riferimentoPagamento }
     * @returns {Promise<Object>}
     */
    async cambiaStato(tenantId, id, { stato: nuovoStato, updatedBy, dataPagamento, metodoPagamento, riferimentoPagamento } = {}) {
        try {
            if (!Object.values(StatoMovimento).includes(nuovoStato)) {
                throw new Error(`Stato non valido: ${nuovoStato}`);
            }

            const existing = await this.findById(tenantId, id);
            if (!existing) {
                throw new Error('Movimento non trovato');
            }

            // Validazione transizioni di stato
            const transizioniValide = {
                [StatoMovimento.BOZZA]: [StatoMovimento.DA_FATTURARE, StatoMovimento.CONFERMATO, StatoMovimento.ANNULLATO],
                [StatoMovimento.DA_FATTURARE]: [StatoMovimento.FATTURATO, StatoMovimento.ANNULLATO],
                [StatoMovimento.CONFERMATO]: [StatoMovimento.DA_FATTURARE, StatoMovimento.FATTURATO, StatoMovimento.ANNULLATO],
                [StatoMovimento.FATTURATO]: [StatoMovimento.PAGATO, StatoMovimento.STORNATO],
                [StatoMovimento.PAGATO]: [StatoMovimento.STORNATO],
                [StatoMovimento.ANNULLATO]: [],
                [StatoMovimento.STORNATO]: []
            };

            if (!transizioniValide[existing.stato].includes(nuovoStato)) {
                throw new Error(`Transizione non valida: ${existing.stato} -> ${nuovoStato}`);
            }

            const updateData = {
                stato: nuovoStato,
                updatedBy,
                ...(dataPagamento && { dataPagamento }),
                ...(metodoPagamento && { metodoPagamento }),
                ...(riferimentoPagamento && { riferimentoPagamento }),
            };

            // Aggiungi date automatiche
            if (nuovoStato === StatoMovimento.FATTURATO && !updateData.dataFatturazione) {
                updateData.dataFatturazione = new Date();
            }
            if (nuovoStato === StatoMovimento.PAGATO && !updateData.dataPagamento) {
                updateData.dataPagamento = new Date();
            }

            const movimento = await prisma.movimentoContabile.update({
                where: { id },
                data: updateData,
                include: this._getDefaultIncludes()
            });

            logger.info(`MovimentoContabile stato cambiato: ${id}`, {
                tenantId,
                vecchioStato: existing.stato,
                nuovoStato
            });

            return movimento;
        } catch (error) {
            logger.error('Errore cambio stato MovimentoContabile:', error);
            throw error;
        }
    }

    /**
     * Calcola il compenso per un professionista basato sul tariffario
     * Firma compatibile con la rotta POST /calcola-compenso che riceve (tenantId, opts).
     * Quando chiamato dal route layer con (tenantId, opts), il primo arg viene ignorato
     * e si comporta come utility sincrona sul secondo arg.
     * 
     * @param {number|string} importoRifOrTenantId - Importo di riferimento oppure tenantId (route)
     * @param {Object} tariffario - Configurazione compenso o opzioni route
     * @returns {Object} { compenso, tipo, valore }
     */
    calcolaCompenso(importoRifOrTenantId, tariffario) {
        // Route layer passa (tenantId, {tipo, personId,...}) → restituiamo null, non supportato in sync
        if (typeof importoRifOrTenantId === 'string' && tariffario && tariffario.tipo) {
            return null; // async lookup not supported in sync method
        }
        const importoRiferimento = importoRifOrTenantId;
        if (!tariffario || typeof tariffario !== 'object' || tariffario.tipo) return null;

        const tipo = tariffario.compensoMedicoTipo || tariffario.compensoProfessionistaTipo;
        const valore = parseFloat(tariffario.compensoMedicoValore || tariffario.compensoProfessionistaValore || 0);
        const minimo = parseFloat(tariffario.compensoMedicoMinimo || tariffario.compensoProfessionistaMinimo || 0);
        const massimo = parseFloat(tariffario.compensoMedicoMassimo || tariffario.compensoProfessionistaMassimo || Infinity);

        let compenso = 0;

        switch (tipo) {
            case 'PERCENTUALE':
                compenso = (importoRiferimento * valore) / 100;
                break;
            case 'FISSO':
                compenso = valore;
                break;
            case 'MINIMO_MASSIMO':
                compenso = (importoRiferimento * valore) / 100;
                compenso = Math.max(minimo, Math.min(massimo, compenso));
                break;
            default:
                return null;
        }

        return {
            compenso: Math.round(compenso * 100) / 100, // Arrotonda a 2 decimali
            tipo,
            valore,
            importoRiferimento
        };
    }

    /**
     * Report: Totali ENTRATA vs USCITA per periodo
     * 
     * @param {string} tenantId - ID tenant
     * @param {Object} opts - { dataInizio, dataFine, branchType }
     * @returns {Promise<Object>}
     */
    async reportTotali(tenantId, { dataInizio, dataFine, branchType = null } = {}) {
        const where = {
            tenantId,
            deletedAt: null,
            dataEsecuzione: {
                gte: dataInizio,
                lte: dataFine
            },
            stato: { not: StatoMovimento.ANNULLATO }
        };

        if (branchType) where.branchType = branchType;

        const risultati = await prisma.movimentoContabile.groupBy({
            by: ['direzione'],
            where,
            _sum: {
                importoNetto: true,
                importoIva: true,
                importoLordo: true
            },
            _count: true
        });

        const report = {
            periodo: { dataInizio, dataFine },
            entrate: { totale: 0, iva: 0, lordo: 0, count: 0 },
            uscite: { totale: 0, iva: 0, lordo: 0, count: 0 },
            margine: 0
        };

        for (const r of risultati) {
            const key = r.direzione === DirezioneMovimento.ENTRATA ? 'entrate' : 'uscite';
            report[key] = {
                totale: parseFloat(r._sum.importoNetto) || 0,
                iva: parseFloat(r._sum.importoIva) || 0,
                lordo: parseFloat(r._sum.importoLordo) || 0,
                count: r._count
            };
        }

        report.margine = report.entrate.totale - report.uscite.totale;

        return report;
    }

    /**
     * Report: Aging pagamenti (scaduti non pagati)
     * 
     * @param {string} tenantId - ID tenant
     * @param {Object} opts - { direzione }
     * @returns {Promise<Object[]>}
     */
    async reportAging(tenantId, { direzione = null } = {}) {
        const where = {
            tenantId,
            deletedAt: null,
            stato: StatoMovimento.CONFERMATO,
            dataScadenza: { lt: new Date() }
        };

        if (direzione) where.direzione = direzione;

        const movimenti = await prisma.movimentoContabile.findMany({
            where,
            include: this._getDefaultIncludes(),
            orderBy: { dataScadenza: 'asc' }
        });

        // Calcola giorni di ritardo
        const oggi = new Date();
        return movimenti.map(m => ({
            ...m,
            giorniRitardo: Math.floor((oggi - new Date(m.dataScadenza)) / (1000 * 60 * 60 * 24))
        }));
    }

    /**
     * Report: Compensi per professionista
     * 
     * @param {string} tenantId - ID tenant
     * @param {Object} opts - { personId, dataInizio, dataFine }
     * @returns {Promise<Object[]>}
     */
    async reportCompensiProfessionista(tenantId, { personId = null, dataInizio, dataFine } = {}) {
        const where = {
            tenantId,
            deletedAt: null,
            direzione: DirezioneMovimento.USCITA,
            tipoSoggetto: { in: ['MEDICO', 'FORMATORE', 'RSPP'] },
            dataEsecuzione: {
                gte: dataInizio,
                lte: dataFine
            }
        };

        if (personId) where.personId = personId;

        const risultati = await prisma.movimentoContabile.groupBy({
            by: ['personId', 'tipo', 'stato'],
            where,
            _sum: {
                importoNetto: true,
                importoDaPagare: true
            },
            _count: true
        });

        // Raggruppa per persona
        const perPersona = {};
        for (const r of risultati) {
            if (!perPersona[r.personId]) {
                perPersona[r.personId] = {
                    personId: r.personId,
                    totaleCompensi: 0,
                    totalePagato: 0,
                    totaleDaPagare: 0,
                    dettaglio: []
                };
            }

            const importo = parseFloat(r._sum.importoNetto) || 0;
            perPersona[r.personId].totaleCompensi += importo;

            if (r.stato === StatoMovimento.PAGATO) {
                perPersona[r.personId].totalePagato += importo;
            } else {
                perPersona[r.personId].totaleDaPagare += importo;
            }

            perPersona[r.personId].dettaglio.push({
                tipo: r.tipo,
                stato: r.stato,
                importo,
                count: r._count
            });
        }

        // Aggiungi info persona
        const personIds = Object.keys(perPersona);
        if (personIds.length > 0) {
            const persone = await prisma.person.findMany({
                where: { id: { in: personIds }, deletedAt: null },
                select: { id: true, firstName: true, lastName: true }
            });

            for (const p of persone) {
                if (perPersona[p.id]) {
                    perPersona[p.id].nome = `${p.firstName} ${p.lastName}`;
                }
            }
        }

        return Object.values(perPersona);
    }

    /**
     * Includes di default per le query
     * @private
     */
    _getDefaultIncludes() {
        return {
            person: {
                select: { id: true, firstName: true, lastName: true }
            },
            companyTenantProfile: {
                select: { id: true, company: { select: { ragioneSociale: true } } }
            },
            site: {
                select: { id: true, siteName: true }
            },
            voceTariffario: {
                select: { id: true, nome: true, tipo: true, frequenza: true }
            },
            nominaRuolo: {
                select: { id: true, tipoRuolo: true, dataInizio: true }
            },
            appuntamentoPrestazione: {
                select: {
                    id: true,
                    prestazione: { select: { nome: true } },
                    appuntamento: {
                        select: {
                            paziente: { select: { id: true, firstName: true, lastName: true } },
                            companyTenantProfile: { select: { id: true, company: { select: { ragioneSociale: true } } } },
                            ambulatorio: {
                                select: {
                                    nome: true,
                                    sede: { select: { nome: true } }
                                }
                            }
                        }
                    }
                }
            },
            appuntamento: {
                select: {
                    id: true,
                    paziente: { select: { id: true, firstName: true, lastName: true } },
                    prestazione: { select: { nome: true } },
                    prestazioni: {
                        where: { deletedAt: null },
                        select: { prestazione: { select: { nome: true } } }
                    },
                    companyTenantProfile: { select: { id: true, company: { select: { ragioneSociale: true } } } },
                    ambulatorio: {
                        select: {
                            nome: true,
                            sede: { select: { nome: true } }
                        }
                    }
                }
            },
            visita: {
                select: {
                    id: true,
                    paziente: { select: { id: true, firstName: true, lastName: true } },
                    prestazione: { select: { nome: true } },
                    ambulatorio: {
                        select: {
                            nome: true,
                            sede: { select: { nome: true } }
                        }
                    },
                    appuntamento: {
                        select: {
                            paziente: { select: { id: true, firstName: true, lastName: true } },
                            prestazione: { select: { nome: true } },
                            prestazioni: {
                                where: { deletedAt: null },
                                select: { prestazione: { select: { nome: true } } }
                            },
                            companyTenantProfile: { select: { id: true, company: { select: { ragioneSociale: true } } } },
                            ambulatorio: {
                                select: {
                                    nome: true,
                                    sede: { select: { nome: true } }
                                }
                            }
                        }
                    }
                }
            },
            fatturaElettronica: {
                select: {
                    numero: true,
                    totale: true,
                    clientePersona: { select: { id: true, firstName: true, lastName: true } },
                    clienteAzienda: { select: { id: true, company: { select: { ragioneSociale: true } } } },
                    linee: { select: { descrizione: true } }
                }
            },
            // Movimento collegato (per ENTRATA): l'USCITA generata insieme
            movimentoCollegato: {
                select: { id: true, direzione: true, importoNetto: true, importoLordo: true, stato: true }
            },
            // Controparte (per USCITA): l'ENTRATA a cui questo è collegato
            controparteCollegata: {
                select: {
                    id: true,
                    direzione: true,
                    importoNetto: true,
                    importoLordo: true,
                    stato: true,
                    appuntamento: {
                        select: {
                            paziente: { select: { id: true, firstName: true, lastName: true } },
                            prestazione: { select: { nome: true } },
                            prestazioni: {
                                where: { deletedAt: null },
                                select: { prestazione: { select: { nome: true } } }
                            },
                            companyTenantProfile: { select: { id: true, company: { select: { ragioneSociale: true } } } },
                            ambulatorio: {
                                select: {
                                    nome: true,
                                    sede: { select: { nome: true } }
                                }
                            }
                        }
                    },
                    visita: {
                        select: {
                            paziente: { select: { id: true, firstName: true, lastName: true } },
                            prestazione: { select: { nome: true } },
                            ambulatorio: {
                                select: {
                                    nome: true,
                                    sede: { select: { nome: true } }
                                }
                            },
                            appuntamento: {
                                select: {
                                    paziente: { select: { id: true, firstName: true, lastName: true } },
                                    prestazione: { select: { nome: true } },
                                    prestazioni: {
                                        where: { deletedAt: null },
                                        select: { prestazione: { select: { nome: true } } }
                                    },
                                    companyTenantProfile: { select: { id: true, company: { select: { ragioneSociale: true } } } },
                                    ambulatorio: {
                                        select: {
                                            nome: true,
                                            sede: { select: { nome: true } }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    fatturaElettronica: {
                        select: {
                            numero: true,
                            totale: true,
                            clientePersona: { select: { id: true, firstName: true, lastName: true } },
                            clienteAzienda: { select: { id: true, company: { select: { ragioneSociale: true } } } },
                            linee: { select: { descrizione: true } }
                        }
                    },
                    companyTenantProfile: {
                        select: { id: true, company: { select: { ragioneSociale: true } } }
                    }
                }
            }
        };
    }
}

// Singleton export
export const movimentoContabileService = new MovimentoContabileService();
export default movimentoContabileService;
