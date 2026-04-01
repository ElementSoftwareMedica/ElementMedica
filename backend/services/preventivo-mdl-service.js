/**
 * Preventivo MDL Service
 * 
 * Servizio per la generazione automatica di preventivi
 * Medicina del Lavoro basati su protocolli sanitari.
 * 
 * @project P58 - Feature Completion
 * @module services/preventivo-mdl-service
 * 
 * Flusso generazione:
 * 1. Recupera sedi selezionate dell'azienda
 * 2. Per ogni sede recupera mansioni attive
 * 3. Per ogni mansione recupera rischi → prestazioni obbligatorie
 * 4. Aggrega prestazioni uniche
 * 5. Applica prezzi da TariffarioAzienda (convenzione) o Tariffario base
 * 6. Calcola totali con IVA appropriata
 * 7. Genera righe preventivo
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

/**
 * Aliquote IVA per tipologia prestazione
 * Prestazioni sanitarie: 10%
 * Altri servizi: 22%
 */
const IVA_RATES = {
    PRESTAZIONE_SANITARIA: 10.00,
    SERVIZIO_GENERALE: 22.00
};

/**
 * Categorizzazione prestazioni per IVA
 */
const PRESTAZIONI_SANITARIE_CATEGORIES = [
    'VISITA_MEDICA',
    'ESAME_STRUMENTALE',
    'ACCERTAMENTO_SANITARIO',
    'AUDIOMETRIA',
    'SPIROMETRIA',
    'VISIOTEST',
    'ECG',
    'ESAME_SANGUE',
    'ESAME_URINE',
    'DROGA_TEST',
    'ALCOL_TEST'
];

class PreventivoMDLService {
    /**
     * Genera un preventivo MDL completo per un'azienda
     * 
     * @param {Object} params
     * @param {string} params.tenantId - ID tenant
     * @param {string} params.companyTenantProfileId - ID profilo azienda
     * @param {Object} params.companyProfile - Profilo azienda con company inclusa
     * @param {string[]} params.siteIds - ID sedi da includere
     * @param {number} [params.numLavoratori] - Override numero lavoratori
     * @param {string} [params.tariffarioAziendaId] - ID convenzione tariffaria
     * @param {boolean} [params.includeOnlyObbligatorie=true] - Solo prestazioni obbligatorie
     * @param {number} [params.validitaGiorni=30] - Giorni validità
     * @param {string} params.createdBy - ID utente creatore
     * @returns {Promise<Object>} Preventivo creato con dettagli
     */
    async generateFromProtocolli(params) {
        const {
            tenantId,
            companyTenantProfileId,
            companyProfile,
            siteIds,
            numLavoratori,
            tariffarioAziendaId,
            includeOnlyObbligatorie = true,
            validitaGiorni = 30,
            createdBy
        } = params;

        // 1. Calcola preview per avere tutti i dati
        const preview = await this.calculatePreview({
            tenantId,
            companyTenantProfileId,
            companyProfile,
            siteIds,
            numLavoratori,
            tariffarioAziendaId,
            includeOnlyObbligatorie
        });

        if (preview.prestazioniAggregate.length === 0) {
            throw new Error('Nessuna prestazione trovata per i protocolli selezionati');
        }

        // 2. Crea preventivo con transazione
        const preventivo = await prisma.$transaction(async (tx) => {
            // Numero progressivo
            const lastPreventivo = await tx.preventivo.findFirst({
                where: { tenantId },
                orderBy: { numero: 'desc' },
                select: { numero: true }
            });
            const nextNumero = (lastPreventivo?.numero || 0) + 1;

            // Data validità
            const dataValidita = new Date();
            dataValidita.setDate(dataValidita.getDate() + validitaGiorni);

            // Crea preventivo
            const newPreventivo = await tx.preventivo.create({
                data: {
                    tenantId,
                    numero: nextNumero,
                    data: new Date(),
                    dataValidita,
                    companyTenantProfileId,
                    stato: 'BOZZA',
                    tipo: 'MDL_SORVEGLIANZA',

                    // Totali
                    prezzoTotale: preview.totali.prezzoTotale,
                    scontoPercentuale: preview.scontoApplicato?.percentuale || 0,
                    scontoValore: preview.totali.scontoTotale || 0,
                    imponibile: preview.totali.imponibile,
                    iva: preview.totali.iva,
                    importoFinale: preview.totali.importoFinale,

                    // Metadata
                    note: this._generateNote(preview),
                    createdById: createdBy,

                    // Righe preventivo
                    righe: {
                        create: preview.prestazioniAggregate.map((prest, index) => ({
                            tenantId,
                            ordine: index + 1,
                            descrizione: prest.descrizione,
                            codice: prest.codice,
                            quantita: prest.quantita,
                            prezzoUnitario: prest.prezzoUnitario,
                            prezzoTotale: prest.prezzoTotale,
                            aliquotaIva: prest.aliquotaIva,
                            prestazioneId: prest.prestazioneId,
                            tipo: 'PRESTAZIONE'
                        }))
                    }
                },
                include: {
                    righe: true,
                    companyTenantProfile: {
                        include: { company: true }
                    }
                }
            });

            return newPreventivo;
        });

        logger.info({
            component: 'preventivo-mdl-service',
            action: 'generateFromProtocolli',
            preventivoId: preventivo.id,
            numero: preventivo.numero,
            importoFinale: preventivo.importoFinale,
            numRighe: preventivo.righe.length,
            tenantId
        }, 'Preventivo MDL generato con successo');

        return {
            preventivo,
            dettaglio: preview
        };
    }

    /**
     * Calcola preview preventivo senza salvare
     * 
     * @param {Object} params
     * @returns {Promise<Object>} Preview con prestazioni e totali
     */
    async calculatePreview(params) {
        const {
            tenantId,
            companyTenantProfileId,
            companyProfile,
            siteIds,
            numLavoratori,
            tariffarioAziendaId,
            includeOnlyObbligatorie = true
        } = params;

        // 1. Recupera sedi con mansioni
        const sites = await prisma.companySite.findMany({
            where: {
                id: { in: siteIds },
                companyTenantProfileId,
                deletedAt: null
            },
            include: {
                mansioni: {
                    where: { deletedAt: null },
                    include: {
                        rischi: {
                            where: { deletedAt: null },
                            include: {
                                risk: {
                                    include: {
                                        prestazioni: {
                                            where: { deletedAt: null },
                                            include: {
                                                prestazione: true
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        lavoratori: {
                            where: {
                                deletedAt: null,
                                isActive: true
                            },
                            select: { id: true }
                        }
                    }
                }
            }
        });

        // 2. Raccogli tutte le prestazioni uniche
        const prestazioniMap = new Map();
        let totaleLavoratori = 0;
        const dettaglioSedi = [];

        for (const site of sites) {
            const sedeLavoratori = numLavoratori || site.mansioni.reduce(
                (sum, m) => sum + m.lavoratori.length, 0
            );
            totaleLavoratori += sedeLavoratori;

            const dettaglioMansioni = [];

            for (const mansione of site.mansioni) {
                const numLav = numLavoratori || mansione.lavoratori.length;

                for (const mansioneRischio of mansione.rischi) {
                    const risk = mansioneRischio.risk;

                    for (const riskPrestazione of risk.prestazioni) {
                        const prestazione = riskPrestazione.prestazione;

                        // Filtra solo obbligatorie se richiesto
                        if (includeOnlyObbligatorie && !riskPrestazione.obbligatoria) {
                            continue;
                        }

                        // Aggrega per prestazione ID
                        const key = prestazione.id;
                        if (!prestazioniMap.has(key)) {
                            prestazioniMap.set(key, {
                                prestazioneId: prestazione.id,
                                codice: prestazione.codice,
                                descrizione: prestazione.nome,
                                categoria: prestazione.categoria,
                                quantita: 0,
                                prezzoUnitario: 0,
                                prezzoTotale: 0,
                                periodicita: riskPrestazione.periodicita || 12, // mesi
                                obbligatoria: riskPrestazione.obbligatoria
                            });
                        }

                        // Incrementa quantità
                        prestazioniMap.get(key).quantita += numLav;
                    }
                }

                dettaglioMansioni.push({
                    mansioneId: mansione.id,
                    nomeMansione: mansione.nome,
                    numLavoratori: numLav,
                    rischiCount: mansione.rischi.length
                });
            }

            dettaglioSedi.push({
                siteId: site.id,
                siteName: site.siteName,
                citta: site.citta,
                mansioni: dettaglioMansioni,
                totaleLavoratoriSede: sedeLavoratori
            });
        }

        // 3. Applica prezzi da tariffario
        const tariffario = await this._getTariffario(
            tenantId,
            companyTenantProfileId,
            tariffarioAziendaId
        );

        const prestazioniAggregate = [];
        let prezzoTotale = 0;

        for (const [, prest] of prestazioniMap) {
            // Trova prezzo nel tariffario
            const prezzo = await this._getPrezzoForPrestazione(
                prest.prestazioneId,
                tariffario,
                tenantId
            );

            prest.prezzoUnitario = prezzo;
            prest.prezzoTotale = prest.quantita * prezzo;
            prest.aliquotaIva = this._getAliquotaIva(prest.categoria);

            prezzoTotale += prest.prezzoTotale;
            prestazioniAggregate.push(prest);
        }

        // Ordina per categoria e descrizione
        prestazioniAggregate.sort((a, b) => {
            if (a.categoria !== b.categoria) {
                return (a.categoria || '').localeCompare(b.categoria || '');
            }
            return a.descrizione.localeCompare(b.descrizione);
        });

        // 4. Calcola sconto convenzione
        let scontoApplicato = null;
        let scontoTotale = 0;

        if (tariffario?.scontoPercentuale > 0) {
            scontoTotale = prezzoTotale * (tariffario.scontoPercentuale / 100);
            scontoApplicato = {
                percentuale: tariffario.scontoPercentuale,
                descrizione: tariffario.descrizione || 'Convenzione aziendale'
            };
        }

        // 5. Calcola IVA per categoria
        const imponibile = prezzoTotale - scontoTotale;
        const ivaDetails = this._calculateIvaByCategory(prestazioniAggregate, scontoApplicato?.percentuale || 0);
        const iva = ivaDetails.totaleIva;

        return {
            azienda: {
                id: companyProfile.company.id,
                ragioneSociale: companyProfile.company.ragioneSociale,
                piva: companyProfile.company.piva
            },
            sedi: dettaglioSedi,
            numLavoratori: totaleLavoratori,
            prestazioniAggregate,
            scontoApplicato,
            totali: {
                prezzoTotale: Math.round(prezzoTotale * 100) / 100,
                scontoTotale: Math.round(scontoTotale * 100) / 100,
                imponibile: Math.round(imponibile * 100) / 100,
                iva: Math.round(iva * 100) / 100,
                importoFinale: Math.round((imponibile + iva) * 100) / 100,
                ivaDetails
            }
        };
    }

    /**
     * Recupera tariffario applicabile
     */
    async _getTariffario(tenantId, companyTenantProfileId, tariffarioAziendaId) {
        if (tariffarioAziendaId) {
            return prisma.tariffarioAzienda.findFirst({
                where: {
                    id: tariffarioAziendaId,
                    tenantId,
                    companyTenantProfileId,
                    deletedAt: null,
                    isActive: true
                },
                include: {
                    voci: {
                        where: { deletedAt: null }
                    }
                }
            });
        }

        // Cerca tariffario attivo per l'azienda
        return prisma.tariffarioAzienda.findFirst({
            where: {
                tenantId,
                companyTenantProfileId,
                deletedAt: null,
                isActive: true
            },
            include: {
                voci: {
                    where: { deletedAt: null }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Recupera prezzo per prestazione
     */
    async _getPrezzoForPrestazione(prestazioneId, tariffario, tenantId) {
        // 1. Cerca in tariffario aziendale
        if (tariffario?.voci) {
            const voce = tariffario.voci.find(v => v.prestazioneId === prestazioneId);
            if (voce) {
                return voce.prezzo;
            }
        }

        // 2. Cerca in tariffario base del tenant
        const voceBase = await prisma.tariffarioVoce.findFirst({
            where: {
                tenantId,
                prestazioneId,
                deletedAt: null
            }
        });

        if (voceBase) {
            return voceBase.prezzo;
        }

        // 3. Prezzo dalla prestazione stessa
        const prestazione = await prisma.prestazione.findFirst({
            where: { id: prestazioneId, tenantId, deletedAt: null },
            select: { prezzoBase: true }
        });

        return prestazione?.prezzoBase || 0;
    }

    /**
     * Determina aliquota IVA per categoria
     */
    _getAliquotaIva(categoria) {
        if (PRESTAZIONI_SANITARIE_CATEGORIES.includes(categoria)) {
            return IVA_RATES.PRESTAZIONE_SANITARIA;
        }
        return IVA_RATES.SERVIZIO_GENERALE;
    }

    /**
     * Calcola IVA suddivisa per aliquota
     */
    _calculateIvaByCategory(prestazioni, scontoPercentuale) {
        const ivaByRate = {};
        let totaleIva = 0;

        for (const prest of prestazioni) {
            const netto = prest.prezzoTotale * (1 - scontoPercentuale / 100);
            const ivaAmount = netto * (prest.aliquotaIva / 100);

            const rateKey = prest.aliquotaIva.toString();
            if (!ivaByRate[rateKey]) {
                ivaByRate[rateKey] = {
                    aliquota: prest.aliquotaIva,
                    imponibile: 0,
                    iva: 0
                };
            }

            ivaByRate[rateKey].imponibile += netto;
            ivaByRate[rateKey].iva += ivaAmount;
            totaleIva += ivaAmount;
        }

        return {
            dettaglio: Object.values(ivaByRate).map(v => ({
                aliquota: v.aliquota,
                imponibile: Math.round(v.imponibile * 100) / 100,
                iva: Math.round(v.iva * 100) / 100
            })),
            totaleIva: Math.round(totaleIva * 100) / 100
        };
    }

    /**
     * Genera nota descrittiva per preventivo
     */
    _generateNote(preview) {
        const lines = [
            `Preventivo MDL generato automaticamente`,
            `Azienda: ${preview.azienda.ragioneSociale}`,
            `Sedi incluse: ${preview.sedi.map(s => s.siteName).join(', ')}`,
            `Totale lavoratori: ${preview.numLavoratori}`,
            `Prestazioni: ${preview.prestazioniAggregate.length}`,
        ];

        if (preview.scontoApplicato) {
            lines.push(`Sconto applicato: ${preview.scontoApplicato.percentuale}% (${preview.scontoApplicato.descrizione})`);
        }

        return lines.join('\n');
    }
}

export default new PreventivoMDLService();
