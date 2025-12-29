/**
 * Tariffario Service
 * Advanced pricing calculation with cascading priority
 * 
 * Supports:
 * - Price variation by doctor (medicoId)
 * - Price variation by patient's listino (convenzioneId)
 * - Price variation with CodiceSconto
 * - Price variation for bundle offers (OffertaBundle)
 * - Doctor compensation (PERCENTUALE, FISSO, MINIMO_MASSIMO)
 * 
 * @module services/clinical/TariffarioService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

/**
 * @typedef {Object} CalcoloPrezzoInput
 * @property {string} prestazioneId - ID della prestazione
 * @property {string} [medicoId] - ID del medico (opzionale)
 * @property {string} pazienteId - ID del paziente
 * @property {string} [convenzioneId] - ID della convenzione del paziente
 * @property {string} [codiceSconto] - Codice sconto applicato
 * @property {string} [bundleId] - ID dell'offerta bundle
 * @property {string} tenantId - Tenant ID
 */

/**
 * @typedef {Object} CalcoloPrezzoOutput
 * @property {number} prezzoFinale - Prezzo finale dopo sconti
 * @property {number} prezzoOriginale - Prezzo base prima degli sconti
 * @property {number} scontoApplicato - Importo sconto applicato
 * @property {string} [scontoDescrizione] - Descrizione dello sconto
 * @property {string} fontePrezzoBase - Fonte del prezzo (LISTINO_MEDICO_CONVENZIONE, LISTINO_CONVENZIONE, etc.)
 * @property {string} [listinoApplicatoId] - ID del listino applicato
 * @property {string} [listinoApplicatoNome] - Nome del listino applicato
 * @property {number} prioritaApplicata - Priorità del listino applicato
 * @property {number} compensoMedico - Compenso calcolato per il medico
 * @property {string} compensoMedicoTipo - Tipo di compenso (PERCENTUALE, FISSO, MINIMO_MASSIMO)
 * @property {string} compensoMedicoFonte - Fonte del compenso (LISTINO, MEDICO_ABILITATO, DEFAULT)
 * @property {number} imponibile - Imponibile
 * @property {number} ivaAliquota - Aliquota IVA
 * @property {number} importoIva - Importo IVA
 * @property {number} totaleConIva - Totale con IVA
 */

export class TariffarioService {
    // Default compenso settings
    static DEFAULT_COMPENSO = {
        tipo: 'PERCENTUALE',
        valore: 30,  // 30% default
        minimo: null,
        massimo: null
    };

    /**
     * Calculate price for a prestazione with cascading priority
     * @param {CalcoloPrezzoInput} input - Calculation input
     * @returns {Promise<CalcoloPrezzoOutput>} Calculated price details
     */
    static async calcolaPrezzo(input) {
        const { prestazioneId, medicoId, pazienteId, convenzioneId, codiceSconto, bundleId, tenantId } = input;
        const now = new Date();

        try {
            // 1. Get prestazione for fallback price
            const prestazione = await prisma.prestazione.findFirst({
                where: {
                    id: prestazioneId,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!prestazione) {
                throw new Error('Prestazione not found');
            }

            // 2. Find best matching ListinoPrezzo with priority cascade
            const listino = await this.findBestListino({
                prestazioneId,
                medicoId,
                convenzioneId,
                tenantId,
                now
            });

            // 3. Determine base price and source
            let prezzoBase, fonte, listinoId, listinoNome, priorita, ivaAliquota;
            let compensoConfig = null;

            if (listino) {
                prezzoBase = Number(listino.prezzo);
                ivaAliquota = Number(listino.ivaAliquota);
                listinoId = listino.id;
                listinoNome = listino.nome;
                priorita = listino.priorita;

                // Determine fonte based on listino characteristics
                if (listino.medicoId && listino.convenzioneId) {
                    fonte = 'LISTINO_MEDICO_CONVENZIONE';
                } else if (listino.convenzioneId) {
                    fonte = 'LISTINO_CONVENZIONE';
                } else if (listino.medicoId) {
                    fonte = 'LISTINO_MEDICO';
                } else {
                    fonte = 'LISTINO_GENERICO';
                }

                // Check if listino has compenso override
                if (listino.compensoMedicoTipo) {
                    compensoConfig = {
                        tipo: listino.compensoMedicoTipo,
                        valore: Number(listino.compensoMedicoValore),
                        minimo: listino.compensoMedicoMinimo ? Number(listino.compensoMedicoMinimo) : null,
                        massimo: listino.compensoMedicoMassimo ? Number(listino.compensoMedicoMassimo) : null
                    };
                }

                // Apply percentage discount if set on listino
                if (listino.scontoPercentuale) {
                    prezzoBase = prezzoBase * (1 - Number(listino.scontoPercentuale) / 100);
                }
            } else {
                // Fallback to prestazione.prezzoBase
                prezzoBase = Number(prestazione.prezzoBase);
                ivaAliquota = Number(prestazione.ivaAliquota);
                fonte = 'PREZZO_BASE';
                priorita = 0;
            }

            // 4. Apply CodiceSconto if provided
            let scontoApplicato = 0;
            let scontoDescrizione = null;
            let prezzoDopoSconto = prezzoBase;

            if (codiceSconto) {
                const sconto = await this.applicaCodiceSconto({
                    codice: codiceSconto,
                    prestazioneId,
                    prezzoBase,
                    tenantId,
                    now
                });

                if (sconto) {
                    scontoApplicato = sconto.importoSconto;
                    scontoDescrizione = sconto.descrizione;
                    prezzoDopoSconto = prezzoBase - scontoApplicato;
                }
            }

            // 5. Check for Bundle pricing if bundleId provided
            if (bundleId) {
                const bundleResult = await this.calcolaPrezzoBundle({
                    bundleId,
                    prestazioneId,
                    tenantId,
                    now
                });

                if (bundleResult) {
                    // Bundle overrides individual pricing
                    prezzoDopoSconto = bundleResult.prezzoPrestazione;
                    fonte = 'BUNDLE';
                    scontoDescrizione = `Bundle: ${bundleResult.bundleNome}`;
                    scontoApplicato = prezzoBase - prezzoDopoSconto;

                    // Bundle may have its own compenso config
                    if (bundleResult.compensoConfig) {
                        compensoConfig = bundleResult.compensoConfig;
                    }
                }
            }

            // 6. Calculate doctor compensation
            const compensoResult = await this.calcolaCompensoMedico({
                prestazioneId,
                medicoId,
                prezzoFinale: prezzoDopoSconto,
                compensoOverride: compensoConfig,
                tenantId
            });

            // 7. Calculate VAT
            const importoIva = prezzoDopoSconto * (ivaAliquota / 100);
            const totaleConIva = prezzoDopoSconto + importoIva;

            const result = {
                prezzoFinale: Math.round(prezzoDopoSconto * 100) / 100,
                prezzoOriginale: Math.round(prezzoBase * 100) / 100,
                scontoApplicato: Math.round(scontoApplicato * 100) / 100,
                scontoDescrizione,
                fontePrezzoBase: fonte,
                listinoApplicatoId: listinoId || null,
                listinoApplicatoNome: listinoNome || null,
                prioritaApplicata: priorita,
                compensoMedico: compensoResult.importo,
                compensoMedicoTipo: compensoResult.tipo,
                compensoMedicoFonte: compensoResult.fonte,
                imponibile: Math.round(prezzoDopoSconto * 100) / 100,
                ivaAliquota: Number(ivaAliquota),
                importoIva: Math.round(importoIva * 100) / 100,
                totaleConIva: Math.round(totaleConIva * 100) / 100
            };

            logger.debug('Price calculated', {
                component: 'tariffario-service',
                action: 'calcolaPrezzo',
                input: { prestazioneId, medicoId, convenzioneId },
                result: { fonte, prezzoFinale: result.prezzoFinale },
                tenantId
            });

            return result;

        } catch (error) {
            logger.error('Error calculating price', {
                component: 'tariffario-service',
                action: 'calcolaPrezzo',
                error: error.message,
                input,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Find the best matching ListinoPrezzo with priority cascade
     * @private
     */
    static async findBestListino({ prestazioneId, medicoId, convenzioneId, tenantId, now }) {
        // Build OR conditions for cascading search
        const orConditions = [];

        // Most specific: medicoId + convenzioneId
        if (medicoId && convenzioneId) {
            orConditions.push({ medicoId, convenzioneId });
        }

        // Second: just convenzioneId (includes AZIENDALE type)
        if (convenzioneId) {
            orConditions.push({ medicoId: null, convenzioneId });
        }

        // Third: just medicoId
        if (medicoId) {
            orConditions.push({ medicoId, convenzioneId: null });
        }

        // Fourth: generic listino (no medico, no convenzione)
        orConditions.push({ medicoId: null, convenzioneId: null });

        const listino = await prisma.listinoPrezzo.findFirst({
            where: {
                prestazioneId,
                tenantId,
                attivo: true,
                deletedAt: null,
                validoDa: { lte: now },
                OR: [
                    { validoA: null },
                    { validoA: { gte: now } }
                ],
                ...(orConditions.length > 0 ? { OR: orConditions } : {})
            },
            orderBy: [
                { priorita: 'desc' },  // Higher priority first
                { updatedAt: 'desc' }  // Then most recent
            ]
        });

        return listino;
    }

    /**
     * Apply CodiceSconto if valid
     * @private
     */
    static async applicaCodiceSconto({ codice, prestazioneId, prezzoBase, tenantId, now }) {
        const codiceSconto = await prisma.codiceSconto.findFirst({
            where: {
                codice,
                tenantId,
                attivo: true,
                deletedAt: null,
                dataInizio: { lte: now },
                OR: [
                    { dataFine: null },
                    { dataFine: { gte: now } }
                ],
                // Check if applicable to this prestazione
                OR: [
                    { prestazioniIds: { isEmpty: true } },  // Applies to all
                    { prestazioniIds: { has: prestazioneId } }  // Specific prestazione
                ]
            }
        });

        if (!codiceSconto) {
            return null;
        }

        // Check usage limits
        if (codiceSconto.utilizziMassimi && codiceSconto.utilizziAttuali >= codiceSconto.utilizziMassimi) {
            return null;
        }

        // Calculate discount
        let importoSconto;
        if (codiceSconto.tipo === 'PERCENTUALE') {
            importoSconto = prezzoBase * (Number(codiceSconto.valore) / 100);
        } else {
            // VALORE_ASSOLUTO
            importoSconto = Math.min(Number(codiceSconto.valore), prezzoBase);
        }

        return {
            importoSconto: Math.round(importoSconto * 100) / 100,
            descrizione: `Sconto ${codiceSconto.nome || codice}: ${codiceSconto.tipo === 'PERCENTUALE' ? `${codiceSconto.valore}%` : `€${codiceSconto.valore}`}`
        };
    }

    /**
     * Calculate price for a prestazione within a bundle
     * @private
     */
    static async calcolaPrezzoBundle({ bundleId, prestazioneId, tenantId, now }) {
        const bundle = await prisma.offertaBundle.findFirst({
            where: {
                id: bundleId,
                tenantId,
                attivo: true,
                deletedAt: null,
                validoDa: { lte: now },
                OR: [
                    { validoA: null },
                    { validoA: { gte: now } }
                ]
            },
            include: {
                prestazioni: {
                    where: {
                        prestazioneId,
                        deletedAt: null
                    },
                    include: {
                        prestazione: true
                    }
                }
            }
        });

        if (!bundle || bundle.prestazioni.length === 0) {
            return null;
        }

        // Check usage limits
        if (bundle.maxUtilizzi && bundle.utilizziCorrente >= bundle.maxUtilizzi) {
            return null;
        }

        // Calculate prestazione price within bundle
        let prezzoPrestazione;

        if (bundle.prezzoBundle) {
            // Fixed bundle price: distribute proportionally among prestazioni
            const allBundlePrestazioni = await prisma.offertaBundlePrestazione.findMany({
                where: {
                    offertaBundleId: bundleId,
                    deletedAt: null
                },
                include: {
                    prestazione: true
                }
            });

            const totalPrezzaBase = allBundlePrestazioni.reduce((sum, bp) => {
                return sum + (Number(bp.prestazione.prezzoBase) * bp.quantita);
            }, 0);

            const thisPrestazione = bundle.prestazioni[0];
            const thisPrezzaBase = Number(thisPrestazione.prestazione.prezzoBase);
            const proportion = thisPrezzaBase / totalPrezzaBase;
            prezzoPrestazione = Number(bundle.prezzoBundle) * proportion;
        } else if (bundle.scontoPercentuale) {
            // Percentage discount on individual price
            const thisPrestazione = bundle.prestazioni[0];
            const prezzoBase = Number(thisPrestazione.prestazione.prezzoBase);
            prezzoPrestazione = prezzoBase * (1 - Number(bundle.scontoPercentuale) / 100);
        } else {
            // No discount defined, return null
            return null;
        }

        // Get compenso config from bundle if available
        let compensoConfig = null;
        if (bundle.compensoMedicoTipo) {
            compensoConfig = {
                tipo: bundle.compensoMedicoTipo,
                valore: Number(bundle.compensoMedicoValore),
                minimo: bundle.compensoMedicoMinimo ? Number(bundle.compensoMedicoMinimo) : null,
                massimo: bundle.compensoMedicoMassimo ? Number(bundle.compensoMedicoMassimo) : null
            };
        }

        return {
            prezzoPrestazione: Math.round(prezzoPrestazione * 100) / 100,
            bundleNome: bundle.nome,
            compensoConfig
        };
    }

    /**
     * Calculate doctor compensation
     * @param {Object} params
     * @param {string} params.prestazioneId - Prestazione ID
     * @param {string} [params.medicoId] - Doctor ID
     * @param {number} params.prezzoFinale - Final price for calculation
     * @param {Object} [params.compensoOverride] - Override config from listino/bundle
     * @param {string} params.tenantId - Tenant ID
     * @returns {Promise<{importo: number, tipo: string, fonte: string}>}
     */
    static async calcolaCompensoMedico({ prestazioneId, medicoId, prezzoFinale, compensoOverride, tenantId }) {
        let config = compensoOverride;
        let fonte = 'LISTINO';

        // If no override, check MedicoAbilitato
        if (!config && medicoId) {
            const medicoAbilitato = await prisma.medicoAbilitato.findFirst({
                where: {
                    medicoId,
                    prestazioneId,
                    tenantId,
                    attivo: true,
                    deletedAt: null
                }
            });

            if (medicoAbilitato) {
                config = {
                    tipo: medicoAbilitato.compensoTipo,
                    valore: Number(medicoAbilitato.compensoValore),
                    minimo: medicoAbilitato.compensoMinimo ? Number(medicoAbilitato.compensoMinimo) : null,
                    massimo: medicoAbilitato.compensoMassimo ? Number(medicoAbilitato.compensoMassimo) : null
                };
                fonte = 'MEDICO_ABILITATO';
            }
        }

        // Use default if still no config
        if (!config) {
            config = this.DEFAULT_COMPENSO;
            fonte = 'DEFAULT';
        }

        // Calculate compenso
        let importo;

        switch (config.tipo) {
            case 'PERCENTUALE':
                importo = prezzoFinale * (config.valore / 100);
                break;

            case 'FISSO':
                importo = config.valore;
                break;

            case 'MINIMO_MASSIMO':
                // Calculate percentage then apply bounds
                importo = prezzoFinale * (config.valore / 100);
                if (config.minimo !== null && importo < config.minimo) {
                    importo = config.minimo;
                }
                if (config.massimo !== null && importo > config.massimo) {
                    importo = config.massimo;
                }
                break;

            default:
                importo = prezzoFinale * (this.DEFAULT_COMPENSO.valore / 100);
        }

        return {
            importo: Math.round(importo * 100) / 100,
            tipo: config.tipo,
            fonte
        };
    }

    /**
     * Get pricing breakdown for a prestazione (useful for UI preview)
     * @param {Object} params
     * @returns {Promise<Object>} Pricing breakdown with all applicable listini
     */
    static async getBreakdownPrezzo({ prestazioneId, medicoId, convenzioneId, tenantId }) {
        const now = new Date();

        // Get all applicable listini
        const listini = await prisma.listinoPrezzo.findMany({
            where: {
                prestazioneId,
                tenantId,
                attivo: true,
                deletedAt: null,
                validoDa: { lte: now },
                OR: [
                    { validoA: null },
                    { validoA: { gte: now } }
                ]
            },
            include: {
                convenzione: {
                    select: {
                        id: true,
                        nome: true,
                        tipo: true
                    }
                },
                medico: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: [
                { priorita: 'desc' },
                { updatedAt: 'desc' }
            ]
        });

        // Get prestazione for base price
        const prestazione = await prisma.prestazione.findFirst({
            where: {
                id: prestazioneId,
                tenantId,
                deletedAt: null
            },
            select: {
                id: true,
                nome: true,
                codice: true,
                prezzoBase: true,
                ivaAliquota: true
            }
        });

        // Get applicable bundles
        const bundles = await prisma.offertaBundle.findMany({
            where: {
                tenantId,
                attivo: true,
                deletedAt: null,
                validoDa: { lte: now },
                OR: [
                    { validoA: null },
                    { validoA: { gte: now } }
                ],
                prestazioni: {
                    some: {
                        prestazioneId,
                        deletedAt: null
                    }
                }
            },
            select: {
                id: true,
                codice: true,
                nome: true,
                prezzoBundle: true,
                scontoPercentuale: true
            }
        });

        return {
            prestazione,
            listiniApplicabili: listini.map(l => ({
                id: l.id,
                nome: l.nome || 'Listino standard',
                prezzo: Number(l.prezzo),
                priorita: l.priorita,
                convenzione: l.convenzione,
                medico: l.medico ? {
                    id: l.medico.id,
                    nome: `${l.medico.firstName} ${l.medico.lastName}`
                } : null,
                hasCompensoOverride: !!l.compensoMedicoTipo
            })),
            bundlesApplicabili: bundles.map(b => ({
                id: b.id,
                codice: b.codice,
                nome: b.nome,
                prezzoBundle: b.prezzoBundle ? Number(b.prezzoBundle) : null,
                scontoPercentuale: b.scontoPercentuale ? Number(b.scontoPercentuale) : null
            })),
            prezzoBase: prestazione ? Number(prestazione.prezzoBase) : 0
        };
    }

    /**
     * Increment bundle usage counter
     * @param {string} bundleId - Bundle ID
     * @param {string} tenantId - Tenant ID
     */
    static async incrementBundleUsage(bundleId, tenantId) {
        await prisma.offertaBundle.update({
            where: {
                id: bundleId,
                tenantId
            },
            data: {
                utilizziCorrente: {
                    increment: 1
                }
            }
        });
    }
}

export default TariffarioService;
