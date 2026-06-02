/**
 * Allegato 3B Routes - Relazione Annuale INAIL
 * 
 * API per generazione Relazione Annuale (Allegato 3B) secondo Art. 40 D.Lgs 81/08
 * 
 * @module routes/clinica/allegato-3b.routes
 * @project P56 - Medicina del Lavoro Sistema Completo - FASE 6
 */

import express from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { requireFeature } from '../../middleware/featureFlags.js';
import prisma from '../../config/prisma-optimization.js';
import Allegato3BService from '../../services/clinical/Allegato3BService.js';
import logger from '../../utils/logger.js';
import { validateParamId } from '../../middleware/validateUUID.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';

const router = express.Router();
router.param('id', validateParamId);

// Feature gate: Allegato 3B richiede MDL_ALLEGATO_3B
router.use(requireAuth, requireFeature('MDL_ALLEGATO_3B'));

/**
 * Arricchisce un record Allegato 3B con la proprietà `statistiche` calcolata
 * dai campi flat del modello Prisma, per compatibilità col frontend.
 */
function enrichWithStatistiche(record) {
    if (!record) return record;
    const visitePerTipologia = record.visitePerTipologia || {};
    const giudiziPerTipologia = record.giudiziPerTipologia || {};
    const lavoratoriPerGenere = record.lavoratoriPerGenere || {};
    const rischi = record.statistichePerRischio || {};
    const malattie = record.malattieProf || {};
    const giudiziPerRischio = record.giudiziPerRischio || {};
    const accertamentiIntegrativi = record.accertamentiIntegrativi || {};
    const totaliSorveglianza = rischi._totali || {};
    const occupatiDateRiferimento = rischi._occupatiDateRiferimento || {};

    // Mappa i tipi giudizio alle categorie frontend
    const idonei = (giudiziPerTipologia['IDONEO'] || 0);
    const idoneiPrescrizioni = (giudiziPerTipologia['IDONEO_CON_PRESCRIZIONI'] || 0);
    const idoneiLimitazioni = (giudiziPerTipologia['IDONEO_CON_LIMITAZIONI'] || 0);
    const nonIdoneiTemp = (giudiziPerTipologia['NON_IDONEO_TEMPORANEO'] || 0);
    const nonIdoneiPerm = (giudiziPerTipologia['NON_IDONEO_PERMANENTE'] || 0);

    // Mappa le visite per tipologia
    const visitePreventive = (visitePerTipologia['PREVENTIVA'] || 0) + (visitePerTipologia['PREVENTIVA_PREASSUNTIVA'] || 0);
    const visitePeriodiche = (visitePerTipologia['PERIODICA'] || 0);
    const visiteRichiestaDL = (visitePerTipologia['RICHIESTA_DATORE_LAVORO'] || 0) + (visitePerTipologia['STRAORDINARIA'] || 0);
    const visiteRichiestaLav = (visitePerTipologia['RICHIESTA_LAVORATORE'] || 0);
    const visiteCambioMansione = (visitePerTipologia['CAMBIO_MANSIONE'] || 0);
    const visiteRientroMalattia = (visitePerTipologia['RIENTRO_MALATTIA'] || 0);

    // Trasforma statistichePerRischio da oggetto a array
    const statistichePerRischioArr = Object.entries(rischi)
        .filter(([codice]) => !codice.startsWith('_'))
        .map(([codice, data]) => ({
            tipoRischio: codice,
            lavoratoriEsposti: data.lavoratoriEsposti || 0,
            visiteProgrammate: 0,
            visiteEffettuate: 0,
            giudiziEmessi: 0
        }));

    record.statistiche = {
        totaleOccupati: totaliSorveglianza.occupatiAl31Dicembre || record.totLavoratoriSorvegliati || 0,
        totaleOccupatiMaschi: occupatiDateRiferimento.al31Dicembre?.perGenere?.maschi ?? lavoratoriPerGenere.maschi ?? 0,
        totaleOccupatiFemmine: occupatiDateRiferimento.al31Dicembre?.perGenere?.femmine ?? lavoratoriPerGenere.femmine ?? 0,
        occupatiAl30Giugno: totaliSorveglianza.occupatiAl30Giugno || 0,
        occupatiAl31Dicembre: totaliSorveglianza.occupatiAl31Dicembre || 0,
        occupatiDateRiferimento,
        totaleSorvegliatiSanitari: record.totLavoratoriSorvegliati || 0,
        visitePreventive,
        visitePeriodiche,
        visiteRichiestaDL,
        visiteRichiestaLavoratore: visiteRichiestaLav,
        visiteCambioMansione,
        visiteRientroMalattia,
        idonei,
        idoneiConPrescrizioni: idoneiPrescrizioni,
        idoneiConLimitazioni: idoneiLimitazioni,
        nonIdoneiTemporanei: nonIdoneiTemp,
        nonIdoneiPermanenti: nonIdoneiPerm,
        statistichePerRischio: statistichePerRischioArr,
        giudiziPerRischio,
        accertamentiIntegrativi,
        malattieRilevate: malattie.totale || 0,
        malattieDeununciate: malattie.totale || 0,
        periodoRiferimento: {
            dataInizio: `${record.anno}-01-01`,
            dataFine: `${record.anno}-12-31`
        },
        dataGenerazione: record.dataCompilazione || record.updatedAt || new Date().toISOString()
    };

    return record;
}

/**
 * @route GET /api/v1/clinica/allegato-3b
 * @desc Lista Allegati 3B con filtri e paginazione
 * @access Private - VIEW_VISITA
 */
router.get('/', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const {
            page = 1,
            limit = 20,
            medicoCompetenteId,
            companyTenantProfileId,
            anno,
            stato
        } = req.query;

        const result = await Allegato3BService.findAll(tenantId, {
            page: parseInt(page),
            limit: parseInt(limit),
            medicoCompetenteId,
            companyTenantProfileId,
            anno,
            stato
        });

        // Arricchisci ogni record con statistiche computed
        if (result.data) {
            result.data = result.data.map(enrichWithStatistiche);
        }

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore lista Allegati 3B');
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero degli Allegati 3B',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route GET /api/v1/clinica/allegato-3b/dashboard/:anno
 * @desc Dashboard aggregata annuale - Relazione Sanitaria Annuale
 * @access Private - VIEW_VISITA
 * @project P56 Fase 7 - Relazione Sanitaria Annuale
 */
router.get('/dashboard/:anno', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const anno = parseInt(req.params.anno);

        if (!anno || isNaN(anno) || anno < 2000 || anno > 2100) {
            return res.status(400).json({
                success: false,
                error: 'Anno non valido',
                message: 'Fornire un anno valido tra 2000 e 2100'
            });
        }

        const dashboard = await Allegato3BService.getAnnualDashboard(anno, tenantId);

        res.json({
            success: true,
            data: dashboard
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', anno: req.params.anno }, 'Errore dashboard annuale MDL');
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero della dashboard',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route GET /api/v1/clinica/allegato-3b/zip/:anno
 * @desc Scarica ZIP con tutti gli XML dell'anno
 * @access Private - VIEW_VISITA
 */
router.get('/zip/:anno', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const anno = parseInt(req.params.anno);

        if (!anno || isNaN(anno) || anno < 2000 || anno > 2100) {
            return res.status(400).json({
                success: false,
                error: 'Anno non valido'
            });
        }

        // Get all allegati for this year
        const result = await Allegato3BService.findAll(tenantId, { anno, limit: 500 });
        const allegati = result.data || [];

        if (allegati.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Nessun Allegato 3B trovato per l\'anno selezionato'
            });
        }

        const archiver = (await import('archiver')).default;
        const archive = archiver('zip', { zlib: { level: 9 } });

        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', `attachment; filename="allegati_3b_${anno}.zip"`);
        archive.pipe(res);

        for (const allegato of allegati) {
            try {
                const xml = await Allegato3BService.generateXML(allegato.id, tenantId);
                const companyName = (allegato.companyTenantProfile?.company?.ragioneSociale || 'azienda')
                    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
                    .replace(/\s+/g, '_')
                    .substring(0, 50);
                archive.append(xml, { name: `allegato3b_${anno}_${companyName}.xml` });
            } catch (xmlErr) {
                logger.warn({ error: xmlErr.message, allegatoId: allegato.id }, 'Errore generazione XML per allegato, skip');
            }
        }

        await archive.finalize();
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', anno: req.params.anno }, 'Errore generazione ZIP Allegati 3B');
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Errore nella generazione dello ZIP',
                message: 'Errore interno del server'
            });
        }
    }
});

/**
 * @route POST /api/v1/clinica/allegato-3b/generate-all
 * @desc Genera e compila Allegato 3B per tutte le aziende con MC attivo
 * @access Private - EDIT_VISITA
 */
router.post('/generate-all', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { anno } = req.body;

        if (!anno || isNaN(parseInt(anno)) || anno < 2000 || anno > 2100) {
            return res.status(400).json({ success: false, error: 'Anno non valido' });
        }

        // Find all companies with active MC nomination in this tenant
        const nomine = await prisma.nominaRuolo.findMany({
            where: {
                tenantId,
                deletedAt: null,
                stato: 'ATTIVA',
                tipoRuolo: 'MEDICO_COMPETENTE'
            },
            select: {
                personId: true,
                companyTenantProfileId: true,
                companyTenantProfile: {
                    select: { company: { select: { ragioneSociale: true } } }
                },
                site: {
                    select: {
                        companyTenantProfileId: true,
                        companyTenantProfile: {
                            select: { company: { select: { ragioneSociale: true } } }
                        }
                    }
                }
            }
        });

        // Deduplicate by companyTenantProfileId → pick one MC per company
        const companyMap = new Map();
        for (const n of nomine) {
            const cpId = n.companyTenantProfileId || n.site?.companyTenantProfileId;
            const ragioneSociale = n.companyTenantProfile?.company?.ragioneSociale
                || n.site?.companyTenantProfile?.company?.ragioneSociale;
            if (cpId && !companyMap.has(cpId)) {
                companyMap.set(cpId, {
                    companyTenantProfileId: cpId,
                    medicoCompetenteId: n.personId,
                    ragioneSociale
                });
            }
        }

        let created = 0;
        let compiled = 0;
        let errors = 0;
        const details = [];

        for (const [cpId, info] of companyMap) {
            try {
                // Create or update record
                const allegato = await Allegato3BService.createOrUpdate({
                    medicoCompetenteId: info.medicoCompetenteId,
                    companyTenantProfileId: cpId,
                    anno: parseInt(anno)
                }, tenantId);
                created++;

                // Compile statistics
                const stats = await Allegato3BService.compileStatistics(cpId, parseInt(anno), tenantId);
                await Allegato3BService.createOrUpdate({
                    medicoCompetenteId: info.medicoCompetenteId,
                    companyTenantProfileId: cpId,
                    anno: parseInt(anno),
                    totLavoratoriSorvegliati: stats.totLavoratoriSorvegliati,
                    totVisiteEffettuate: stats.totVisiteEffettuate,
                    totGiudiziIdoneita: stats.totGiudiziIdoneita,
                    totGiudiziConLimitazioni: stats.totGiudiziConLimitazioni,
                    totGiudiziConPrescrizioni: stats.totGiudiziConPrescrizioni,
                    totInidoneita: stats.totInidoneita,
                    statistichePerRischio: stats.statistichePerRischio,
                    malattieProf: stats.malattieProf,
                    lavoratoriPerGenere: stats.lavoratoriPerGenere,
                    lavoratoriPerFasciaEta: stats.lavoratoriPerFasciaEta,
                    visitePerTipologia: stats.visitePerTipologia,
                    giudiziPerTipologia: stats.giudiziPerTipologia,
                    giudiziPerRischio: stats.giudiziPerRischio,
                    accertamentiIntegrativi: stats.accertamentiIntegrativi,
                    dataCompilazione: new Date(),
                    stato: 'PRONTO'
                }, tenantId);
                compiled++;

                details.push({ companyTenantProfileId: cpId, ragioneSociale: info.ragioneSociale, status: 'ok' });
            } catch (err) {
                errors++;
                details.push({ companyTenantProfileId: cpId, ragioneSociale: info.ragioneSociale, status: 'error', error: 'Errore nella generazione dell\'Allegato 3B' });
                logger.warn({ error: 'Operazione non riuscita', companyTenantProfileId: cpId }, 'Errore generazione Allegato 3B per azienda');
            }
        }

        logger.info({ anno, created, compiled, errors, total: companyMap.size }, 'Bulk generate-all Allegato 3B completato');

        res.json({
            success: true,
            data: { anno: parseInt(anno), totaleAziende: companyMap.size, creati: created, compilati: compiled, errori: errors, dettagli: details }
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore bulk generate-all Allegato 3B');
        res.status(500).json({ success: false, error: 'Errore nella generazione massiva degli Allegati 3B' });
    }
});

/**
 * @route GET /api/v1/clinica/allegato-3b/:id
 * @desc Dettaglio singolo Allegato 3B
 * @access Private - VIEW_VISITA
 */
router.get('/:id', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        const allegato = await Allegato3BService.findById(id, tenantId);

        if (!allegato) {
            return res.status(404).json({
                success: false,
                error: 'Allegato 3B non trovato'
            });
        }

        res.json({
            success: true,
            data: enrichWithStatistiche(allegato)
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore dettaglio Allegato 3B');
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero dell\'Allegato 3B',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route POST /api/v1/clinica/allegato-3b
 * @desc Crea nuovo Allegato 3B
 * @access Private - EDIT_VISITA
 */
router.post('/', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { medicoCompetenteId, companyTenantProfileId, anno } = req.body;

        if (!medicoCompetenteId || !companyTenantProfileId || !anno) {
            return res.status(400).json({
                success: false,
                error: 'Dati obbligatori mancanti: medicoCompetenteId, companyTenantProfileId, anno'
            });
        }

        const allegato = await Allegato3BService.createOrUpdate({ medicoCompetenteId, companyTenantProfileId, anno }, tenantId);

        // Auto-compile: calcola statistiche immediatamente dopo la creazione
        let compiled = allegato;
        try {
            const stats = await Allegato3BService.compileStatistics(
                allegato.companyTenantProfileId,
                allegato.anno,
                tenantId
            );
            compiled = await Allegato3BService.createOrUpdate({
                medicoCompetenteId: allegato.medicoCompetenteId,
                companyTenantProfileId: allegato.companyTenantProfileId,
                anno: allegato.anno,
                totLavoratoriSorvegliati: stats.totLavoratoriSorvegliati,
                totVisiteEffettuate: stats.totVisiteEffettuate,
                totGiudiziIdoneita: stats.totGiudiziIdoneita,
                totGiudiziConLimitazioni: stats.totGiudiziConLimitazioni,
                totGiudiziConPrescrizioni: stats.totGiudiziConPrescrizioni,
                totInidoneita: stats.totInidoneita,
                statistichePerRischio: stats.statistichePerRischio,
                malattieProf: stats.malattieProf,
                lavoratoriPerGenere: stats.lavoratoriPerGenere,
                lavoratoriPerFasciaEta: stats.lavoratoriPerFasciaEta,
                visitePerTipologia: stats.visitePerTipologia,
                giudiziPerTipologia: stats.giudiziPerTipologia,
                giudiziPerRischio: stats.giudiziPerRischio,
                accertamentiIntegrativi: stats.accertamentiIntegrativi,
                dataCompilazione: new Date(),
                stato: 'PRONTO'
            }, tenantId);
        } catch (compileError) {
            logger.warn({ error: compileError.message, allegatoId: allegato.id }, 'Auto-compilazione fallita, allegato creato in stato DA_COMPILARE');
        }

        // Re-fetch con relazioni per il frontend
        const full = await Allegato3BService.findById(compiled.id, tenantId);
        res.status(201).json({
            success: true,
            data: enrichWithStatistiche(full || compiled)
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore creazione Allegato 3B');
        res.status(500).json({
            success: false,
            error: 'Errore nella creazione dell\'Allegato 3B',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route POST /api/v1/clinica/allegato-3b/:id/compile
 * @desc Compila automaticamente le statistiche
 * @access Private - EDIT_VISITA
 */
router.post('/:id/compile', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        // Recupera l'allegato
        const allegato = await Allegato3BService.findById(id, tenantId);
        if (!allegato) {
            return res.status(404).json({
                success: false,
                error: 'Allegato 3B non trovato'
            });
        }

        // Compila statistiche
        const stats = await Allegato3BService.compileStatistics(
            allegato.companyTenantProfileId,
            allegato.anno,
            tenantId
        );

        // Aggiorna allegato con statistiche
        const updated = await Allegato3BService.createOrUpdate({
            medicoCompetenteId: allegato.medicoCompetenteId,
            companyTenantProfileId: allegato.companyTenantProfileId,
            anno: allegato.anno,
            totLavoratoriSorvegliati: stats.totLavoratoriSorvegliati,
            totVisiteEffettuate: stats.totVisiteEffettuate,
            totGiudiziIdoneita: stats.totGiudiziIdoneita,
            totGiudiziConLimitazioni: stats.totGiudiziConLimitazioni,
            totGiudiziConPrescrizioni: stats.totGiudiziConPrescrizioni,
            totInidoneita: stats.totInidoneita,
            statistichePerRischio: stats.statistichePerRischio,
            malattieProf: stats.malattieProf,
            lavoratoriPerGenere: stats.lavoratoriPerGenere,
            lavoratoriPerFasciaEta: stats.lavoratoriPerFasciaEta,
            visitePerTipologia: stats.visitePerTipologia,
            giudiziPerTipologia: stats.giudiziPerTipologia,
            giudiziPerRischio: stats.giudiziPerRischio,
            accertamentiIntegrativi: stats.accertamentiIntegrativi,
            dataCompilazione: new Date(),
            stato: 'PRONTO'
        }, tenantId);

        // Re-fetch con relazioni per il frontend
        const full = await Allegato3BService.findById(updated.id, tenantId);
        res.json({
            success: true,
            data: enrichWithStatistiche(full || updated),
            statistics: stats
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore compilazione Allegato 3B');
        res.status(500).json({
            success: false,
            error: 'Errore nella compilazione dell\'Allegato 3B',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route GET /api/v1/clinica/allegato-3b/:id/xml
 * @desc Genera XML per invio INAIL
 * @access Private - VIEW_VISITA
 */
router.get('/:id/xml', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        const xml = await Allegato3BService.generateXML(id, tenantId);

        res.set('Content-Type', 'application/xml');
        res.set('Content-Disposition', `attachment; filename="allegato3b_${id}.xml"`);
        res.send(xml);
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore generazione XML Allegato 3B');
        res.status(500).json({
            success: false,
            error: 'Errore nella generazione dell\'XML',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route POST /api/v1/clinica/allegato-3b/preview
 * @desc Preview statistiche senza salvare
 * @access Private - VIEW_VISITA
 */
router.post('/preview', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { companyTenantProfileId, anno } = req.body;

        if (!companyTenantProfileId || !anno) {
            return res.status(400).json({
                success: false,
                error: 'Parametri obbligatori: companyTenantProfileId, anno'
            });
        }

        const stats = await Allegato3BService.compileStatistics(
            companyTenantProfileId,
            parseInt(anno),
            tenantId
        );

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore preview Allegato 3B');
        res.status(500).json({
            success: false,
            error: 'Errore nella generazione del preview',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route PUT /api/v1/clinica/allegato-3b/:id/stato
 * @desc Aggiorna stato invio
 * @access Private - EDIT_VISITA
 */
router.put('/:id/stato', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const { stato, protocollo, ricevuta } = req.body;

        const validStati = ['DA_COMPILARE', 'COMPILATO', 'INVIATO', 'CONFERMATO', 'ERRORE', 'ANNULLATO'];
        if (!validStati.includes(stato)) {
            return res.status(400).json({
                success: false,
                error: `Stato non valido. Valori ammessi: ${validStati.join(', ')}`
            });
        }

        const allegato = await Allegato3BService.updateStatoInvio(
            id,
            stato,
            { protocollo, ricevuta },
            tenantId
        );

        res.json({
            success: true,
            data: allegato
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore aggiornamento stato Allegato 3B');
        res.status(500).json({
            success: false,
            error: 'Errore nell\'aggiornamento dello stato',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route DELETE /api/v1/clinica/allegato-3b/:id
 * @desc Elimina Allegato 3B (solo se non inviato)
 * @access Private - DELETE_VISITA
 */
router.delete('/:id', requireAuth, requirePermission('clinica.visite:delete'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        await Allegato3BService.delete(id, tenantId);

        res.json({
            success: true,
            message: 'Allegato 3B eliminato con successo'
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore eliminazione Allegato 3B');

        if (error.message.includes('già inviato')) {
            return res.status(400).json({
                success: false,
                error: 'Errore interno del server'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Errore nell\'eliminazione dell\'Allegato 3B',
            message: 'Errore interno del server'
        });
    }
});

export default router;
