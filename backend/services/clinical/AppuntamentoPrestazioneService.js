/**
 * AppuntamentoPrestazioneService - Gestione Multi-Prestazioni per Appuntamento
 * Progetto 55: Medicina del Lavoro - Multi-Prestazioni
 * 
 * Responsabilità:
 * - CRUD prestazioni associate ad un appuntamento
 * - Gestione workflow refertazione multi-specialista
 * - Calcolo compensi per medico refertante
 * - Lista prestazioni da refertare per specialista
 * 
 * @module services/clinical/AppuntamentoPrestazioneService
 */

import prisma from '../../config/prisma-optimization.js';
import { logger } from '../../utils/logger.js';
import MovimentoContabileGenerator from '../management/MovimentoContabileGenerator.js';


/**
 * Stati prestazione appuntamento
 * @typedef {'DA_ESEGUIRE'|'IN_CORSO'|'ESEGUITA'|'IN_ATTESA_REFERTO'|'REFERTATA'|'ANNULLATA'} StatoPrestazioneAppuntamento
 */

class AppuntamentoPrestazioneService {
    /**
     * Crea prestazioni per un appuntamento da bundle
     * @param {Object} params - Parametri
     * @param {string} params.appuntamentoId - ID appuntamento
     * @param {string} params.bundleId - ID bundle
     * @param {string} params.tenantId - ID tenant
     * @param {Object} [params.medicoRefertanteOverrides] - Override medico refertante per prestazioneId
     * @returns {Promise<Array>} Prestazioni create
     */
    async createFromBundle({ appuntamentoId, bundleId, tenantId, medicoRefertanteOverrides = {} }) {
        // Carica bundle con prestazioni
        const bundle = await prisma.offertaBundle.findFirst({
            where: { id: bundleId, deletedAt: null },
            include: {
                prestazioni: {
                    where: { deletedAt: null },
                    include: {
                        prestazione: {
                            select: {
                                id: true,
                                nome: true,
                                codice: true,
                                brancheSpecialistiche: true
                            }
                        }
                    },
                    orderBy: { ordine: 'asc' }
                }
            }
        });

        if (!bundle) {
            throw new Error(`Bundle ${bundleId} non trovato`);
        }

        // Verifica appuntamento
        const appuntamento = await prisma.appuntamento.findFirst({
            where: { id: appuntamentoId, tenantId, deletedAt: null }
        });

        if (!appuntamento) {
            throw new Error(`Appuntamento ${appuntamentoId} non trovato`);
        }

        // Crea prestazioni
        const prestazioni = await Promise.all(
            bundle.prestazioni.map(async (bundlePrestazione, index) => {
                const medicoRefertanteId = medicoRefertanteOverrides[bundlePrestazione.prestazioneId] || null;

                // Se ha branche specialistiche, potrebbe richiedere specialista diverso
                const richiedeSpecialista = bundlePrestazione.prestazione.brancheSpecialistiche?.length > 0;
                const stato = medicoRefertanteId
                    ? 'IN_ATTESA_REFERTO'
                    : 'DA_ESEGUIRE';

                return prisma.appuntamentoPrestazione.create({
                    data: {
                        appuntamentoId,
                        prestazioneId: bundlePrestazione.prestazioneId,
                        medicoRefertanteId,
                        ordine: bundlePrestazione.ordine || index,
                        stato,
                        tenantId
                    },
                    include: {
                        prestazione: {
                            select: { id: true, nome: true, codice: true }
                        },
                        medicoRefertante: {
                            select: { id: true, firstName: true, lastName: true }
                        }
                    }
                });
            })
        );

        logger.info('Prestazioni create da bundle', {
            component: 'AppuntamentoPrestazioneService',
            action: 'createFromBundle',
            appuntamentoId,
            bundleId,
            count: prestazioni.length,
            tenantId
        });

        return prestazioni;
    }

    /**
     * Crea prestazioni singole per un appuntamento
     * @param {Object} params - Parametri
     * @param {string} params.appuntamentoId - ID appuntamento
     * @param {Array} params.prestazioni - Array di { prestazioneId, medicoRefertanteId?, ordine? }
     * @param {string} params.tenantId - ID tenant
     * @returns {Promise<Array>} Prestazioni create
     */
    async create({ appuntamentoId, prestazioni, tenantId }) {
        // Verifica appuntamento
        const appuntamento = await prisma.appuntamento.findFirst({
            where: { id: appuntamentoId, tenantId, deletedAt: null }
        });

        if (!appuntamento) {
            throw new Error(`Appuntamento ${appuntamentoId} non trovato`);
        }

        const uniquePrestazioni = Array.from(
            new Map(
                prestazioni
                    .filter(p => p?.prestazioneId)
                    .map((p, index) => [p.prestazioneId, { ...p, ordine: p.ordine ?? index }])
            ).values()
        );

        const created = await Promise.all(
            uniquePrestazioni.map(async (p, index) => {
                const stato = p.medicoRefertanteId
                    ? 'IN_ATTESA_REFERTO'
                    : 'DA_ESEGUIRE';

                const existing = await prisma.appuntamentoPrestazione.findUnique({
                    where: {
                        appuntamentoId_prestazioneId: {
                            appuntamentoId,
                            prestazioneId: p.prestazioneId
                        }
                    }
                });

                const data = {
                    medicoRefertanteId: p.medicoRefertanteId || existing?.medicoRefertanteId || null,
                    ordine: p.ordine ?? index,
                    stato: existing?.stato && existing.stato !== 'ANNULLATA' ? existing.stato : stato,
                    deletedAt: null,
                    tenantId
                };

                if (existing) {
                    return prisma.appuntamentoPrestazione.update({
                        where: { id: existing.id },
                        data,
                        include: {
                            prestazione: {
                                select: { id: true, nome: true, codice: true }
                            },
                            medicoRefertante: {
                                select: { id: true, firstName: true, lastName: true }
                            }
                        }
                    });
                }

                return prisma.appuntamentoPrestazione.create({
                    data: {
                        appuntamentoId,
                        prestazioneId: p.prestazioneId,
                        ...data
                    },
                    include: {
                        prestazione: {
                            select: { id: true, nome: true, codice: true }
                        },
                        medicoRefertante: {
                            select: { id: true, firstName: true, lastName: true }
                        }
                    }
                });
            })
        );

        logger.info('Prestazioni appuntamento create', {
            component: 'AppuntamentoPrestazioneService',
            action: 'create',
            appuntamentoId,
            count: created.length,
            tenantId
        });

        return created;
    }

    /**
     * Lista prestazioni per un appuntamento
     * @param {string} appuntamentoId - ID appuntamento
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Array>} Prestazioni
     */
    async listByAppuntamento(appuntamentoId, tenantId) {
        return prisma.appuntamentoPrestazione.findMany({
            where: {
                appuntamentoId,
                tenantId,
                deletedAt: null
            },
            include: {
                prestazione: {
                    select: {
                        id: true,
                        nome: true,
                        codice: true,
                        brancheSpecialistiche: true
                    }
                },
                medicoRefertante: {
                    select: { id: true, firstName: true, lastName: true, gender: true }
                },
                referto: {
                    select: { id: true, numeroReferto: true, stato: true }
                }
            },
            orderBy: { ordine: 'asc' }
        });
    }

    /**
     * Lista prestazioni da refertare per un medico specialista
     * @param {Object} params - Parametri
     * @param {string} params.medicoId - ID medico refertante
     * @param {string} params.tenantId - ID tenant
     * @param {string[]} [params.stati] - Stati da filtrare (default: ['IN_ATTESA_REFERTO', 'ESEGUITA'])
     * @param {number} [params.page] - Pagina
     * @param {number} [params.limit] - Limite
     * @returns {Promise<Object>} { data, total, page, limit }
     */
    async listDaRefertare({ medicoId, tenantId, stati, page = 1, limit = 20 }) {
        const statiDaRefertare = stati || ['IN_ATTESA_REFERTO', 'ESEGUITA'];
        const skip = (page - 1) * limit;

        const where = {
            tenantId,
            deletedAt: null,
            stato: { in: statiDaRefertare },
            refertoId: null, // Non ancora refertato
            OR: [
                {
                    visitaSecundaria: {
                        is: {
                            deletedAt: null,
                            stato: { notIn: ['COMPLETATA', 'ANNULLATA'] }
                        }
                    }
                },
                {
                    AND: [
                        { visitaSecundaria: { is: null } },
                        {
                            appuntamento: {
                                visita: {
                                    is: {
                                        deletedAt: null,
                                        stato: { notIn: ['COMPLETATA', 'ANNULLATA'] }
                                    }
                                }
                            }
                        }
                    ]
                }
            ],
            // Se medicoId fornito, filtra per quel medico; se null (admin) mostra tutte
            ...(medicoId && { medicoRefertanteId: medicoId }),
        };

        const [data, total] = await Promise.all([
            prisma.appuntamentoPrestazione.findMany({
                where,
                include: {
                    appuntamento: {
                        include: {
                            visita: { select: { id: true } }, // Necessario per navigare a /visite/:id
                            paziente: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    taxCode: true,
                                    birthDate: true
                                }
                            },
                            medico: {
                                select: { id: true, firstName: true, lastName: true }
                            }
                        }
                    },
                    prestazione: {
                        select: { id: true, nome: true, codice: true }
                    },
                    visitaSecundaria: {
                        select: { id: true, stato: true, medicoId: true, medicoRefertanteId: true }
                    }
                },
                orderBy: [
                    { appuntamento: { dataOra: 'asc' } },
                    { ordine: 'asc' }
                ],
                skip,
                take: limit
            }),
            prisma.appuntamentoPrestazione.count({ where })
        ]);

        logger.debug('Lista prestazioni da refertare', {
            component: 'AppuntamentoPrestazioneService',
            action: 'listDaRefertare',
            medicoId,
            total,
            page,
            tenantId
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    /**
     * Soft-delete delle prestazioni "da refertare" orfane (senza visita collegata).
     * Utile per pulire i dati di test o errori di migrazione.
     * @param {string} tenantId - ID tenant
     * @returns {Promise<{deleted: number}>}
     */
    async cleanupOrfane({ tenantId }) {
        const now = new Date();
        const orfane = await prisma.appuntamentoPrestazione.findMany({
            where: {
                tenantId,
                deletedAt: null,
                stato: { in: ['IN_ATTESA_REFERTO', 'ESEGUITA'] },
                refertoId: null,
                OR: [
                    {
                        AND: [
                            { visitaSecundaria: { is: null } },
                            { appuntamento: { visita: { is: null } } }
                        ]
                    },
                    { visitaSecundaria: { is: { deletedAt: { not: null } } } },
                    { visitaSecundaria: { is: { stato: 'ANNULLATA' } } },
                    { appuntamento: { visita: { is: { deletedAt: { not: null } } } } },
                    { appuntamento: { visita: { is: { stato: 'ANNULLATA' } } } }
                ],
            },
            select: { id: true }
        });

        if (orfane.length === 0) {
            return { deleted: 0 };
        }

        const ids = orfane.map(p => p.id);
        await prisma.appuntamentoPrestazione.updateMany({
            where: { id: { in: ids }, tenantId },
            data: { deletedAt: now }
        });

        logger.info('Cleanup prestazioni orfane', {
            component: 'AppuntamentoPrestazioneService',
            action: 'cleanupOrfane',
            tenantId,
            deleted: orfane.length,
        });

        return { deleted: orfane.length };
    }

    /**
     * Soft-delete delle prestazioni "da refertare" stale: collegate a visite già COMPLETATE
     * ma senza referto ancora emesso. Utile per pulizia di record rimasti in pending
     * dopo la chiusura della visita.
     * @param {string} tenantId - ID tenant
     * @returns {Promise<{deleted: number}>}
     */
    async cleanupStaleCompletate({ tenantId }) {
        const now = new Date();
        const stale = await prisma.appuntamentoPrestazione.findMany({
            where: {
                tenantId,
                deletedAt: null,
                stato: { in: ['IN_ATTESA_REFERTO', 'ESEGUITA'] },
                refertoId: null,
                appuntamento: {
                    visita: {
                        isNot: null,
                        is: { stato: 'COMPLETATA' }
                    }
                }
            },
            select: { id: true }
        });

        if (stale.length === 0) {
            return { deleted: 0 };
        }

        const ids = stale.map(p => p.id);
        await prisma.appuntamentoPrestazione.updateMany({
            where: { id: { in: ids }, tenantId },
            data: { deletedAt: now }
        });

        logger.info('Cleanup prestazioni stale (visita completata, nessun referto)', {
            component: 'AppuntamentoPrestazioneService',
            action: 'cleanupStaleCompletate',
            tenantId,
            deleted: stale.length,
        });

        return { deleted: stale.length };
    }

    /**
     * Aggiorna stato prestazione
     * @param {Object} params - Parametri
     * @param {string} params.id - ID prestazione appuntamento
     * @param {string} params.stato - Nuovo stato
     * @param {string} params.tenantId - ID tenant
     * @param {Object} [params.updates] - Altri campi da aggiornare
     * @returns {Promise<Object>} Prestazione aggiornata
     */
    async updateStato({ id, stato, tenantId, updates = {}, updatedBy = null }) {
        // Validazione transizione stato
        const current = await prisma.appuntamentoPrestazione.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!current) {
            throw new Error(`Prestazione ${id} non trovata`);
        }

        const validTransitions = {
            'DA_ESEGUIRE': ['IN_CORSO', 'ESEGUITA', 'IN_ATTESA_REFERTO', 'ANNULLATA'],
            'IN_CORSO': ['DA_ESEGUIRE', 'ESEGUITA', 'IN_ATTESA_REFERTO', 'ANNULLATA'],
            'ESEGUITA': ['DA_ESEGUIRE', 'IN_ATTESA_REFERTO', 'REFERTATA', 'ANNULLATA'],
            'IN_ATTESA_REFERTO': ['DA_ESEGUIRE', 'ESEGUITA', 'REFERTATA', 'ANNULLATA'],
            'REFERTATA': ['ESEGUITA', 'IN_ATTESA_REFERTO', 'ANNULLATA'],
            'ANNULLATA': ['DA_ESEGUIRE', 'ESEGUITA', 'IN_ATTESA_REFERTO']
        };

        if (!validTransitions[current.stato]?.includes(stato)) {
            throw new Error(`Transizione non valida: ${current.stato} -> ${stato}`);
        }

        const updateData = {
            stato,
            ...updates
        };

        if (stato === 'ESEGUITA' || stato === 'IN_CORSO') {
            updateData.dataEsecuzione = updateData.dataEsecuzione || new Date();
        }
        if (stato === 'IN_ATTESA_REFERTO') {
            updateData.dataEsecuzione = updateData.dataEsecuzione || current.dataEsecuzione || new Date();
        }
        if (current.stato === 'ANNULLATA' && stato !== 'ANNULLATA') {
            updateData.deletedAt = null;
        }

        const updated = await prisma.appuntamentoPrestazione.update({
            where: { id },
            data: updateData,
            include: {
                prestazione: {
                    select: { id: true, nome: true, codice: true }
                },
                medicoRefertante: {
                    select: { id: true, firstName: true, lastName: true }
                },
                referto: {
                    select: { id: true, numeroReferto: true, stato: true }
                }
            }
        });

        logger.info('Stato prestazione aggiornato', {
            component: 'AppuntamentoPrestazioneService',
            action: 'updateStato',
            id,
            oldStato: current.stato,
            newStato: stato,
            tenantId
        });

        if (stato === 'ANNULLATA') {
            try {
                const result = await MovimentoContabileGenerator.annullaPerAppuntamentoPrestazione(id, tenantId, updatedBy);
                if (result?.annullati > 0) {
                    logger.info('Movimenti contabili annullati per prestazione non eseguita', {
                        component: 'AppuntamentoPrestazioneService',
                        action: 'annulla-movimenti-prestazione-non-eseguita',
                        id,
                        annullati: result.annullati,
                        tenantId
                    });
                }
            } catch (error) {
                logger.error('Errore annullamento movimenti per prestazione non eseguita', {
                    component: 'AppuntamentoPrestazioneService',
                    action: 'annulla-movimenti-prestazione-non-eseguita',
                    id,
                    tenantId,
                    error: error?.message
                });
            }
        }

        return updated;
    }

    /**
     * Collega referto a prestazione
     * @param {Object} params - Parametri
     * @param {string} params.id - ID prestazione appuntamento
     * @param {string} params.refertoId - ID referto
     * @param {string} params.tenantId - ID tenant
     * @returns {Promise<Object>} Prestazione aggiornata
     */
    async linkReferto({ id, refertoId, tenantId }) {
        const prestazione = await prisma.appuntamentoPrestazione.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!prestazione) {
            throw new Error(`Prestazione ${id} non trovata`);
        }

        if (prestazione.refertoId) {
            throw new Error(`Prestazione già refertata (referto: ${prestazione.refertoId})`);
        }

        const [updated] = await prisma.$transaction([
            prisma.appuntamentoPrestazione.update({
                where: { id },
                data: {
                    refertoId,
                    stato: 'REFERTATA',
                    dataEsecuzione: new Date()
                },
                include: {
                    prestazione: {
                        select: { id: true, nome: true, codice: true }
                    },
                    medicoRefertante: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    referto: true
                }
            }),
            prisma.referto.update({
                where: { id: refertoId },
                data: { appuntamentoPrestazioneId: id }
            }),
            prisma.movimentoContabile.updateMany({
                where: {
                    tenantId,
                    appPrestazioneId: id,
                    direzione: { in: ['ENTRATA', 'USCITA'] },
                    stato: 'BOZZA',
                    deletedAt: null
                },
                data: {
                    stato: 'DA_FATTURARE',
                    refertoId,
                    updatedAt: new Date()
                }
            })
        ]);

        logger.info('Referto collegato a prestazione', {
            component: 'AppuntamentoPrestazioneService',
            action: 'linkReferto',
            prestazioneId: id,
            refertoId,
            tenantId
        });

        return updated;
    }

    /**
     * Assegna medico refertante a prestazione
     * @param {Object} params - Parametri
     * @param {string} params.id - ID prestazione appuntamento
     * @param {string} params.medicoRefertanteId - ID medico
     * @param {string} params.tenantId - ID tenant
     * @returns {Promise<Object>} Prestazione aggiornata
     */
    async assignMedicoRefertante({ id, medicoRefertanteId, tenantId }) {
        const prestazione = await prisma.appuntamentoPrestazione.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!prestazione) {
            throw new Error(`Prestazione ${id} non trovata`);
        }

        // Se già refertata, non permettere modifica
        if (prestazione.stato === 'REFERTATA') {
            throw new Error('Impossibile modificare medico: prestazione già refertata');
        }

        const updated = await prisma.appuntamentoPrestazione.update({
            where: { id },
            data: {
                medicoRefertanteId,
                stato: 'IN_ATTESA_REFERTO'
            },
            include: {
                prestazione: {
                    select: { id: true, nome: true, codice: true }
                },
                medicoRefertante: {
                    select: { id: true, firstName: true, lastName: true }
                }
            }
        });

        logger.info('Medico refertante assegnato', {
            component: 'AppuntamentoPrestazioneService',
            action: 'assignMedicoRefertante',
            prestazioneId: id,
            medicoRefertanteId,
            tenantId
        });

        return updated;
    }

    /**
     * Calcola compenso per medico refertante
     * @param {Object} params - Parametri
     * @param {string} params.id - ID prestazione appuntamento
     * @param {Decimal} params.importoPrestazione - Importo della prestazione
     * @param {string} params.tenantId - ID tenant
     * @returns {Promise<Object>} Prestazione con compenso calcolato
     */
    async calcolaCompenso({ id, importoPrestazione, tenantId }) {
        const prestazione = await prisma.appuntamentoPrestazione.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                medicoRefertante: {
                    include: {
                        abilitazioni: {
                            where: {
                                prestazioneId: { not: undefined },
                                attivo: true,
                                deletedAt: null
                            }
                        },
                        tariffariMedico: {
                            where: { attivo: true, deletedAt: null },
                            orderBy: { validoDa: 'desc' },
                            take: 1
                        }
                    }
                }
            }
        });

        if (!prestazione) {
            throw new Error(`Prestazione ${id} non trovata`);
        }

        if (!prestazione.medicoRefertanteId) {
            throw new Error('Nessun medico refertante assegnato');
        }

        // Trova abilitazione specifica per questa prestazione
        const abilitazione = prestazione.medicoRefertante?.abilitazioni?.find(
            a => a.prestazioneId === prestazione.prestazioneId
        );

        // Calcola compenso basato su: 1) TariffarioMedico (priorità assoluta),
        // 2) MedicoAbilitato (per-prestazione), 3) zero
        let compenso = 0;
        const tariffario = prestazione.medicoRefertante?.tariffariMedico?.[0] ?? null;

        if (tariffario) {
            // Livello 1: TariffarioMedico generale del medico
            if (tariffario.compensoMedicoTipo === 'PERCENTUALE') {
                compenso = (parseFloat(importoPrestazione) * parseFloat(tariffario.compensoMedicoValore)) / 100;
            } else if (tariffario.compensoMedicoTipo === 'FISSO') {
                compenso = parseFloat(tariffario.compensoMedicoValore);
            }
            if (tariffario.compensoMedicoMinimo && compenso < parseFloat(tariffario.compensoMedicoMinimo)) {
                compenso = parseFloat(tariffario.compensoMedicoMinimo);
            }
            if (tariffario.compensoMedicoMassimo && compenso > parseFloat(tariffario.compensoMedicoMassimo)) {
                compenso = parseFloat(tariffario.compensoMedicoMassimo);
            }
        } else if (abilitazione) {
            // Livello 2: MedicoAbilitato per-prestazione
            if (abilitazione.compensoTipo === 'PERCENTUALE') {
                compenso = (parseFloat(importoPrestazione) * parseFloat(abilitazione.compensoValore)) / 100;
            } else if (abilitazione.compensoTipo === 'FISSO') {
                compenso = parseFloat(abilitazione.compensoValore);
            }

            // Applica min/max
            if (abilitazione.compensoMinimo && compenso < parseFloat(abilitazione.compensoMinimo)) {
                compenso = parseFloat(abilitazione.compensoMinimo);
            }
            if (abilitazione.compensoMassimo && compenso > parseFloat(abilitazione.compensoMassimo)) {
                compenso = parseFloat(abilitazione.compensoMassimo);
            }
        }

        const updated = await prisma.appuntamentoPrestazione.update({
            where: { id },
            data: {
                compensoMedicoCalcolato: compenso
            }
        });

        logger.info('Compenso medico calcolato', {
            component: 'AppuntamentoPrestazioneService',
            action: 'calcolaCompenso',
            prestazioneId: id,
            importoPrestazione,
            compensoCalcolato: compenso,
            tenantId
        });

        return {
            ...updated,
            compensoMedicoCalcolato: compenso
        };
    }

    /**
     * Marca compenso come pagato
     * @param {Object} params - Parametri
     * @param {string} params.id - ID prestazione appuntamento
     * @param {string} params.tenantId - ID tenant
     * @returns {Promise<Object>} Prestazione aggiornata
     */
    async marcaCompensoPagato({ id, tenantId }) {
        const updated = await prisma.appuntamentoPrestazione.update({
            where: { id },
            data: {
                compensoMedicoPagato: true,
                compensoPagatoData: new Date()
            }
        });

        logger.info('Compenso marcato come pagato', {
            component: 'AppuntamentoPrestazioneService',
            action: 'marcaCompensoPagato',
            prestazioneId: id,
            tenantId
        });

        return updated;
    }

    /**
     * Elimina prestazione (soft delete)
     * @param {string} id - ID prestazione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Prestazione eliminata
     */
    async delete(id, tenantId) {
        let prestazione = await prisma.appuntamentoPrestazione.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                visitaSecundaria: {
                    select: { id: true, stato: true, deletedAt: true }
                }
            }
        });

        if (!prestazione) {
            const alreadyDeleted = await prisma.appuntamentoPrestazione.findFirst({
                where: { id, tenantId, deletedAt: { not: null } },
                select: { id: true, deletedAt: true, stato: true }
            });
            if (alreadyDeleted) {
                return alreadyDeleted;
            }

            const visitaSecondaria = await prisma.visita.findFirst({
                where: { id, tenantId, appPrestazioneId: { not: null } },
                select: { appPrestazioneId: true }
            });
            if (visitaSecondaria?.appPrestazioneId) {
                prestazione = await prisma.appuntamentoPrestazione.findFirst({
                    where: { id: visitaSecondaria.appPrestazioneId, tenantId, deletedAt: null },
                    include: {
                        visitaSecundaria: {
                            select: { id: true, stato: true, deletedAt: true }
                        }
                    }
                });
            }
        }

        if (!prestazione) {
            throw new Error(`Prestazione ${id} non trovata`);
        }

        if (prestazione.refertoId) {
            throw new Error('Impossibile eliminare: prestazione già refertata');
        }

        const now = new Date();
        const deleted = await prisma.$transaction(async (tx) => {
            if (prestazione.visitaSecundaria && !prestazione.visitaSecundaria.deletedAt) {
                await tx.referto.updateMany({
                    where: { visitaId: prestazione.visitaSecundaria.id, deletedAt: null },
                    data: { deletedAt: now }
                });
                await tx.visita.update({
                    where: { id: prestazione.visitaSecundaria.id },
                    data: { stato: 'ANNULLATA', deletedAt: now }
                });
            }

            return tx.appuntamentoPrestazione.update({
                where: { id },
                data: {
                    stato: 'ANNULLATA',
                    deletedAt: now
                }
            });
        });

        logger.info('Prestazione eliminata', {
            component: 'AppuntamentoPrestazioneService',
            action: 'delete',
            id,
            tenantId
        });

        return deleted;
    }

    /**
     * Statistiche prestazioni per medico refertante
     * @param {string} medicoId - ID medico
     * @param {string} tenantId - ID tenant
     * @param {Object} [dateRange] - { from, to }
     * @returns {Promise<Object>} Statistiche
     */
    async getStatisticheRefertante(medicoId, tenantId, dateRange = {}) {
        const where = {
            tenantId,
            deletedAt: null,
            // Se medicoId fornito, filtra per quel medico; se null (admin) mostra tutte
            ...(medicoId && { medicoRefertanteId: medicoId }),
        };

        if (dateRange.from || dateRange.to) {
            where.createdAt = {};
            if (dateRange.from) where.createdAt.gte = new Date(dateRange.from);
            if (dateRange.to) where.createdAt.lte = new Date(dateRange.to);
        }

        const [
            totali,
            daRefertare,
            refertate,
            totaleCompensi,
            compensiPagati
        ] = await Promise.all([
            prisma.appuntamentoPrestazione.count({ where }),
            prisma.appuntamentoPrestazione.count({
                where: { ...where, stato: { in: ['IN_ATTESA_REFERTO', 'ESEGUITA'] }, refertoId: null }
            }),
            prisma.appuntamentoPrestazione.count({
                where: { ...where, stato: 'REFERTATA' }
            }),
            prisma.appuntamentoPrestazione.aggregate({
                where: { ...where, compensoMedicoCalcolato: { not: null } },
                _sum: { compensoMedicoCalcolato: true }
            }),
            prisma.appuntamentoPrestazione.aggregate({
                where: { ...where, compensoMedicoPagato: true },
                _sum: { compensoMedicoCalcolato: true }
            })
        ]);

        return {
            totali,
            daRefertare,
            refertate,
            percentualeCompletamento: totali > 0 ? Math.round((refertate / totali) * 100) : 0,
            totaleCompensi: totaleCompensi._sum?.compensoMedicoCalcolato || 0,
            compensiPagati: compensiPagati._sum?.compensoMedicoCalcolato || 0,
            compensiDaPagare: (totaleCompensi._sum?.compensoMedicoCalcolato || 0) - (compensiPagati._sum?.compensoMedicoCalcolato || 0)
        };
    }
}

export default new AppuntamentoPrestazioneService();
