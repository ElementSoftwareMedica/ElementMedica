/**
 * Consuntivo Azienda Service
 * 
 * Servizio per generazione report economico riepilogativo per azienda cliente.
 * Include: visite effettuate, prestazioni, costi, fatture emesse, saldi.
 * 
 * @project P58 - Feature Completion
 * @module services/clinical/ConsuntivoAziendaService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

/**
 * Formatta importo in euro
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
    }).format(value || 0);
}

/**
 * ConsuntivoAziendaService
 * 
 * Genera report economici completi per aziende clienti
 */
class ConsuntivoAziendaService {
    /**
     * Genera consuntivo completo per un'azienda
     * 
     * @param {Object} params
     * @param {string} params.companyTenantProfileId - ID profilo azienda
     * @param {string} params.tenantId - ID tenant
     * @param {Date} [params.startDate] - Data inizio periodo
     * @param {Date} [params.endDate] - Data fine periodo
     * @param {boolean} [params.includeSites=true] - Include dettaglio per sede
     * @returns {Promise<Object>} Consuntivo completo
     */
    async generateConsuntivo(params) {
        const {
            companyTenantProfileId,
            tenantId,
            startDate,
            endDate,
            includeSites = true
        } = params;

        logger.info({
            component: 'consuntivo-azienda',
            action: 'generateConsuntivo',
            companyTenantProfileId,
            tenantId,
            startDate,
            endDate
        }, 'Generazione consuntivo azienda');

        // 1. Recupera profilo azienda con dati
        const companyProfile = await this._getCompanyProfile(companyTenantProfileId, tenantId);
        if (!companyProfile) {
            throw new Error('Azienda non trovata');
        }

        // 2. Costruisci filtro date
        const dateFilter = this._buildDateFilter(startDate, endDate);

        // 3. Recupera dati aggregati
        const [
            visiteData,
            fatturatiData,
            preventiviData,
            lavoratoriData
        ] = await Promise.all([
            this._getVisiteStats(companyTenantProfileId, tenantId, dateFilter),
            this._getFatturatiStats(companyTenantProfileId, tenantId, dateFilter),
            this._getPreventiviStats(companyTenantProfileId, tenantId, dateFilter),
            this._getLavoratoriStats(companyTenantProfileId, tenantId)
        ]);

        // 4. Dettaglio per sede (opzionale)
        let siteDetails = [];
        if (includeSites) {
            siteDetails = await this._getSiteDetails(companyTenantProfileId, tenantId, dateFilter);
        }

        // 5. Calcola totali e saldi
        const summary = this._calculateSummary({
            visite: visiteData,
            fatturati: fatturatiData,
            preventivi: preventiviData,
            lavoratori: lavoratoriData
        });

        const consuntivo = {
            azienda: {
                id: companyProfile.company.id,
                ragioneSociale: companyProfile.company.ragioneSociale,
                piva: companyProfile.company.piva,
                codiceFiscale: companyProfile.company.codiceFiscale
            },
            periodo: {
                startDate: startDate?.toISOString() || null,
                endDate: endDate?.toISOString() || null,
                label: this._formatPeriodLabel(startDate, endDate)
            },
            summary,
            visite: visiteData,
            fatturati: fatturatiData,
            preventivi: preventiviData,
            lavoratori: lavoratoriData,
            sites: siteDetails,
            generatedAt: new Date().toISOString()
        };

        logger.info({
            component: 'consuntivo-azienda',
            action: 'generateConsuntivo',
            companyId: companyProfile.company.id,
            totalVisite: summary.visiteEffettuate,
            totaleFatturato: summary.totaleFatturato
        }, 'Consuntivo generato');

        return consuntivo;
    }

    /**
     * Recupera profilo azienda
     */
    async _getCompanyProfile(companyTenantProfileId, tenantId) {
        return prisma.companyTenantProfile.findFirst({
            where: {
                id: companyTenantProfileId,
                tenantId,
                deletedAt: null
            },
            include: {
                company: true,
                sites: {
                    where: { deletedAt: null },
                    select: { id: true, siteName: true, citta: true }
                }
            }
        });
    }

    /**
     * Costruisce filtro date
     */
    _buildDateFilter(startDate, endDate) {
        const filter = {};
        if (startDate) {
            filter.gte = startDate;
        }
        if (endDate) {
            filter.lte = endDate;
        }
        return Object.keys(filter).length > 0 ? filter : null;
    }

    /**
     * Statistiche visite
     */
    async _getVisiteStats(companyTenantProfileId, tenantId, dateFilter) {
        // Visite associate all'azienda via mansione → site → companyTenantProfile
        const siteIds = await this._getSiteIds(companyTenantProfileId, tenantId);

        const whereClause = {
            tenantId,
            deletedAt: null,
            mansione: {
                siteId: { in: siteIds }
            }
        };

        if (dateFilter) {
            whereClause.dataOra = dateFilter;
        }

        const visite = await prisma.visitaMDL.findMany({
            where: whereClause,
            include: {
                prestazioni: {
                    where: { deletedAt: null },
                    select: { prezzoEffettivo: true }
                },
                giudizio: {
                    select: { esito: true }
                }
            }
        });

        // Aggregazione
        const totaleVisite = visite.length;
        const visitePerTipo = {};
        let totalePrestazioni = 0;
        let costoTotale = 0;

        const esitiCount = {
            IDONEO: 0,
            IDONEO_CON_PRESCRIZIONI: 0,
            IDONEO_CON_LIMITAZIONI: 0,
            NON_IDONEO_TEMPORANEO: 0,
            NON_IDONEO_PERMANENTE: 0
        };

        visite.forEach(v => {
            // Conta per tipo
            const tipo = v.tipoVisitaMDL || 'ALTRO';
            visitePerTipo[tipo] = (visitePerTipo[tipo] || 0) + 1;

            // Conta prestazioni e costi
            if (v.prestazioni) {
                totalePrestazioni += v.prestazioni.length;
                v.prestazioni.forEach(p => {
                    costoTotale += Number(p.prezzoEffettivo) || 0;
                });
            }

            // Conta esiti
            if (v.giudizio?.esito) {
                esitiCount[v.giudizio.esito] = (esitiCount[v.giudizio.esito] || 0) + 1;
            }
        });

        return {
            totaleVisite,
            visitePerTipo,
            totalePrestazioni,
            costoTotale: Math.round(costoTotale * 100) / 100,
            esitiCount
        };
    }

    /**
     * Statistiche fatturato
     */
    async _getFatturatiStats(companyTenantProfileId, tenantId, dateFilter) {
        const whereClause = {
            companyTenantProfileId,
            tenantId,
            deletedAt: null
        };

        if (dateFilter) {
            whereClause.dataEmissione = dateFilter;
        }

        const fatture = await prisma.fattura.findMany({
            where: whereClause,
            select: {
                id: true,
                numero: true,
                dataEmissione: true,
                stato: true,
                imponibile: true,
                iva: true,
                importoTotale: true
            }
        });

        // Aggregazione
        const totale = fatture.length;
        let importoTotale = 0;
        let importoPagato = 0;
        let importoDaPagare = 0;

        const perStato = {};

        fatture.forEach(f => {
            const importo = Number(f.importoTotale) || 0;
            importoTotale += importo;

            // Conta per stato
            const stato = f.stato || 'BOZZA';
            perStato[stato] = (perStato[stato] || 0) + 1;

            // Saldi
            if (['PAGATA', 'PARZIALMENTE_PAGATA'].includes(stato)) {
                importoPagato += stato === 'PAGATA' ? importo : importo * 0.5; // Approssimazione
            } else if (['EMESSA', 'INVIATA', 'SCADUTA'].includes(stato)) {
                importoDaPagare += importo;
            }
        });

        return {
            totaleFatture: totale,
            importoTotale: Math.round(importoTotale * 100) / 100,
            importoPagato: Math.round(importoPagato * 100) / 100,
            importoDaPagare: Math.round(importoDaPagare * 100) / 100,
            perStato,
            fatture: fatture.map(f => ({
                numero: f.numero,
                data: f.dataEmissione,
                stato: f.stato,
                importo: Number(f.importoTotale) || 0
            }))
        };
    }

    /**
     * Statistiche preventivi
     */
    async _getPreventiviStats(companyTenantProfileId, tenantId, dateFilter) {
        const whereClause = {
            companyTenantProfileId,
            tenantId,
            deletedAt: null
        };

        if (dateFilter) {
            whereClause.data = dateFilter;
        }

        const preventivi = await prisma.preventivo.findMany({
            where: whereClause,
            select: {
                id: true,
                numero: true,
                data: true,
                stato: true,
                importoFinale: true,
                tipo: true
            }
        });

        // Aggregazione
        const totale = preventivi.length;
        let importoTotale = 0;
        let importoAccettati = 0;

        const perStato = {};

        preventivi.forEach(p => {
            const importo = Number(p.importoFinale) || 0;
            importoTotale += importo;

            const stato = p.stato || 'BOZZA';
            perStato[stato] = (perStato[stato] || 0) + 1;

            if (stato === 'ACCETTATO') {
                importoAccettati += importo;
            }
        });

        return {
            totalePreventivi: totale,
            importoTotale: Math.round(importoTotale * 100) / 100,
            importoAccettati: Math.round(importoAccettati * 100) / 100,
            conversionRate: totale > 0
                ? Math.round((perStato.ACCETTATO || 0) / totale * 100)
                : 0,
            perStato
        };
    }

    /**
     * Statistiche lavoratori
     */
    async _getLavoratoriStats(companyTenantProfileId, tenantId) {
        const siteIds = await this._getSiteIds(companyTenantProfileId, tenantId);

        const [totaleAttivi, conVisitaScaduta, senzaVisita] = await Promise.all([
            // Totale lavoratori attivi
            prisma.personTenantProfile.count({
                where: {
                    tenantId,
                    siteId: { in: siteIds },
                    isActive: true,
                    deletedAt: null
                }
            }),
            // Con visita scaduta
            prisma.personTenantProfile.count({
                where: {
                    tenantId,
                    siteId: { in: siteIds },
                    isActive: true,
                    deletedAt: null,
                    person: {
                        visite: {
                            some: {
                                prossimaSorveglianza: { lt: new Date() }
                            }
                        }
                    }
                }
            }),
            // Senza visita
            prisma.personTenantProfile.count({
                where: {
                    tenantId,
                    siteId: { in: siteIds },
                    isActive: true,
                    deletedAt: null,
                    person: {
                        visite: { none: {} }
                    }
                }
            })
        ]);

        return {
            totaleAttivi,
            conVisitaScaduta,
            senzaVisita,
            inRegola: Math.max(0, totaleAttivi - conVisitaScaduta - senzaVisita)
        };
    }

    /**
     * Dettaglio per sede
     */
    async _getSiteDetails(companyTenantProfileId, tenantId, dateFilter) {
        const sites = await prisma.companySite.findMany({
            where: {
                companyTenantProfileId,
                deletedAt: null
            },
            include: {
                _count: {
                    select: {
                        mansioni: true
                    }
                }
            }
        });

        const details = await Promise.all(sites.map(async site => {
            // Lavoratori per sede
            const lavoratoriCount = await prisma.personTenantProfile.count({
                where: {
                    tenantId,
                    siteId: site.id,
                    isActive: true,
                    deletedAt: null
                }
            });

            // Visite per sede
            const visiteWhere = {
                tenantId,
                deletedAt: null,
                mansione: { siteId: site.id }
            };
            if (dateFilter) {
                visiteWhere.dataOra = dateFilter;
            }

            const visiteCount = await prisma.visitaMDL.count({
                where: visiteWhere
            });

            return {
                siteId: site.id,
                siteName: site.siteName,
                citta: site.citta,
                mansioniCount: site._count.mansioni,
                lavoratoriCount,
                visiteCount
            };
        }));

        return details;
    }

    /**
     * Recupera ID sedi per azienda
     */
    async _getSiteIds(companyTenantProfileId, tenantId) {
        const sites = await prisma.companySite.findMany({
            where: {
                companyTenantProfileId,
                deletedAt: null
            },
            select: { id: true }
        });
        return sites.map(s => s.id);
    }

    /**
     * Calcola summary
     */
    _calculateSummary(data) {
        const { visite, fatturati, preventivi, lavoratori } = data;

        return {
            // Visite
            visiteEffettuate: visite.totaleVisite,
            prestazioniErogate: visite.totalePrestazioni,
            costoVisite: visite.costoTotale,

            // Fatturato
            totaleFatturato: fatturati.importoTotale,
            fatturatoIncassato: fatturati.importoPagato,
            fatturatoDaIncassare: fatturati.importoDaPagare,

            // Preventivi
            preventiviEmessi: preventivi.totalePreventivi,
            preventiviAccettati: preventivi.importoAccettati,
            conversionRate: preventivi.conversionRate,

            // Lavoratori
            lavoratoriAttivi: lavoratori.totaleAttivi,
            lavoratoriScaduti: lavoratori.conVisitaScaduta,
            lavoratoriInRegola: lavoratori.inRegola,

            // Calcoli derivati
            ricavoMedio: visite.totaleVisite > 0
                ? Math.round(fatturati.importoTotale / visite.totaleVisite * 100) / 100
                : 0,
            costoMedioVisita: visite.totaleVisite > 0
                ? Math.round(visite.costoTotale / visite.totaleVisite * 100) / 100
                : 0
        };
    }

    /**
     * Formatta label periodo
     */
    _formatPeriodLabel(startDate, endDate) {
        if (!startDate && !endDate) {
            return 'Tutto il periodo';
        }

        const formatDate = (d) => d?.toLocaleDateString('it-IT') || '';

        if (startDate && endDate) {
            return `Dal ${formatDate(startDate)} al ${formatDate(endDate)}`;
        }
        if (startDate) {
            return `Dal ${formatDate(startDate)}`;
        }
        return `Fino al ${formatDate(endDate)}`;
    }

    /**
     * Esporta consuntivo in formato CSV
     */
    async exportCSV(consuntivo) {
        const lines = [];

        // Header
        lines.push('Consuntivo Azienda');
        lines.push(`Azienda:,${consuntivo.azienda.ragioneSociale}`);
        lines.push(`P.IVA:,${consuntivo.azienda.piva}`);
        lines.push(`Periodo:,${consuntivo.periodo.label}`);
        lines.push('');

        // Summary
        lines.push('RIEPILOGO');
        lines.push(`Visite Effettuate:,${consuntivo.summary.visiteEffettuate}`);
        lines.push(`Prestazioni Erogate:,${consuntivo.summary.prestazioniErogate}`);
        lines.push(`Totale Fatturato:,${formatCurrency(consuntivo.summary.totaleFatturato)}`);
        lines.push(`Fatturato Incassato:,${formatCurrency(consuntivo.summary.fatturatoIncassato)}`);
        lines.push(`Da Incassare:,${formatCurrency(consuntivo.summary.fatturatoDaIncassare)}`);
        lines.push('');

        // Lavoratori
        lines.push('LAVORATORI');
        lines.push(`Attivi:,${consuntivo.summary.lavoratoriAttivi}`);
        lines.push(`In Regola:,${consuntivo.summary.lavoratoriInRegola}`);
        lines.push(`Visite Scadute:,${consuntivo.summary.lavoratoriScaduti}`);
        lines.push('');

        // Fatture
        if (consuntivo.fatturati?.fatture?.length > 0) {
            lines.push('FATTURE');
            lines.push('Numero,Data,Stato,Importo');
            consuntivo.fatturati.fatture.forEach(f => {
                lines.push(`${f.numero},${new Date(f.data).toLocaleDateString('it-IT')},${f.stato},${formatCurrency(f.importo)}`);
            });
            lines.push('');
        }

        // Sedi
        if (consuntivo.sites?.length > 0) {
            lines.push('DETTAGLIO SEDI');
            lines.push('Sede,Città,Mansioni,Lavoratori,Visite');
            consuntivo.sites.forEach(s => {
                lines.push(`${s.siteName},${s.citta || ''},${s.mansioniCount},${s.lavoratoriCount},${s.visiteCount}`);
            });
        }

        return lines.join('\n');
    }
}

export default new ConsuntivoAziendaService();
