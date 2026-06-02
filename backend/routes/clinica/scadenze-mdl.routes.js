/**
 * Routes Scadenze MDL - API per dashboard scadenze Medicina del Lavoro
 * 
 * Gestisce le scadenze aggregate MDL:
 * - Nomine MC/RSPP
 * - Giudizi idoneità
 * - Visite periodiche
 * - Sopralluoghi
 * - DVR
 * 
 * @version 1.0.0
 * @since P56 - Medicina del Lavoro
 * @author GitHub Copilot
 */

import express from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import ScadenzeMDLService from '../../services/clinical/ScadenzeMDLService.js';
import MansioneService from '../../services/clinical/MansioneService.js';
import logger from '../../utils/logger.js';
import { validateParamId, validateParam } from '../../middleware/validateUUID.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import prisma from '../../config/prisma-optimization.js';

const router = express.Router();
router.param('id', validateParamId);
router.param('siteId', validateParam('siteId'));

// Apply authentication to all routes in this router
router.use(requireAuth);

/**
 * GET /api/v1/clinica/scadenze-mdl
 * Ottiene tutte le scadenze MDL per il tenant
 * 
 * Query params:
 * - companyTenantProfileId: filtra per azienda
 * - siteId: filtra per sede
 * - categoria: filtra per categoria (nomina_mc, giudizio_idoneita, etc.)
 * - livelloUrgenza: filtra per urgenza (scaduto, critico, urgente, attenzione)
 * - giorni: numero giorni da oggi (default 90)
 * - limit: numero massimo risultati (default 100)
 */
router.get('/', requirePermission('visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        let {
            companyTenantProfileId,
            siteId,
            categoria,
            livelloUrgenza,
            giorni = 90,
            limit = 100,
            includePrenotate
        } = req.query;

        if (companyTenantProfileId) {
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
            companyTenantProfileId = profile?.id || companyTenantProfileId;
        }

        const dataFine = new Date();
        dataFine.setDate(dataFine.getDate() + parseInt(giorni));

        const result = await ScadenzeMDLService.getAllScadenze(tenantId, {
            companyTenantProfileId,
            siteId,
            categoria,
            livelloUrgenza,
            dataFine,
            limit: parseInt(limit),
            includePrenotate: includePrenotate === 'true'
        });

        logger.info({
            tenantId,
            filtri: { companyTenantProfileId, siteId, categoria, livelloUrgenza },
            totaleScadenze: result.scadenze.length
        }, 'GET /scadenze-mdl');

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', stack: error.stack }, 'Errore GET /scadenze-mdl');
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle scadenze MDL',

        });
    }
});

/**
 * GET /api/v1/clinica/scadenze-mdl/statistiche
 * Ottiene solo le statistiche aggregate delle scadenze
 */
router.get('/statistiche', requirePermission('visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { giorni = 90 } = req.query;

        const dataFine = new Date();
        dataFine.setDate(dataFine.getDate() + parseInt(giorni));

        const result = await ScadenzeMDLService.getAllScadenze(tenantId, { dataFine });

        logger.info({ tenantId, giorni, stats: result.statistiche }, 'GET /scadenze-mdl/statistiche');

        res.json({
            success: true,
            data: result.statistiche
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore GET /scadenze-mdl/statistiche');
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle statistiche',

        });
    }
});

/**
 * GET /api/v1/clinica/scadenze-mdl/notifiche
 * Ottiene notifiche per scadenze urgenti (per badge/alert)
 * 
 * Query params:
 * - giorniAvviso: giorni di anticipo (default 30)
 */
router.get('/notifiche', requirePermission('visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { giorniAvviso = 30 } = req.query;

        const result = await ScadenzeMDLService.getNotificheScadenze(
            tenantId,
            parseInt(giorniAvviso)
        );

        logger.info({
            tenantId,
            giorniAvviso,
            conteggio: result.conteggio
        }, 'GET /scadenze-mdl/notifiche');

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore GET /scadenze-mdl/notifiche');
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle notifiche',

        });
    }
});

/**
 * GET /api/v1/clinica/scadenze-mdl/azienda/:companyTenantProfileId
 * Ottiene riepilogo scadenze per una specifica azienda
 */
router.get('/azienda/:companyTenantProfileId', requirePermission('visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { companyTenantProfileId } = req.params;

        const result = await ScadenzeMDLService.getRiepilogoAzienda(
            tenantId,
            companyTenantProfileId
        );

        logger.info({
            tenantId,
            companyTenantProfileId,
            totale: result.statisticheGenerali.totale
        }, 'GET /scadenze-mdl/azienda/:id');

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            companyTenantProfileId: req.params.companyTenantProfileId
        }, 'Errore GET /scadenze-mdl/azienda/:id');
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del riepilogo azienda',

        });
    }
});

/**
 * GET /api/v1/clinica/scadenze-mdl/sede/:siteId
 * Ottiene scadenze per una specifica sede
 */
router.get('/sede/:siteId', requirePermission('visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { siteId } = req.params;
        const { giorni = 90 } = req.query;

        const dataFine = new Date();
        dataFine.setDate(dataFine.getDate() + parseInt(giorni));

        const result = await ScadenzeMDLService.getAllScadenze(tenantId, {
            siteId,
            dataFine
        });

        logger.info({
            tenantId,
            siteId,
            totale: result.scadenze.length
        }, 'GET /scadenze-mdl/sede/:id');

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            siteId: req.params.siteId
        }, 'Errore GET /scadenze-mdl/sede/:id');
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle scadenze sede',

        });
    }
});

/**
 * GET /api/v1/clinica/scadenze-mdl/calendario
 * Ottiene scadenze in formato calendario (per visualizzazione calendar)
 * 
 * Query params:
 * - dataInizio: data inizio periodo (ISO)
 * - dataFine: data fine periodo (ISO)
 */
router.get('/calendario', requirePermission('visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { dataInizio, dataFine, companyTenantProfileId } = req.query;

        // Default: mese corrente
        const inizio = dataInizio ? new Date(dataInizio) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const fine = dataFine ? new Date(dataFine) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

        const result = await ScadenzeMDLService.getAllScadenze(tenantId, {
            dataInizio: inizio,
            dataFine: fine,
            companyTenantProfileId,
            limit: 500
        });

        // Trasforma in formato calendario
        const eventi = result.scadenze.map(s => ({
            id: s.id,
            title: s.tipo,
            description: s.descrizione,
            date: s.dataScadenza,
            categoria: s.categoria,
            urgenza: s.livelloUrgenza,
            color: getColorByUrgenza(s.livelloUrgenza),
            entita: s.entita
        }));

        logger.info({
            tenantId,
            periodo: { inizio, fine },
            totaleEventi: eventi.length
        }, 'GET /scadenze-mdl/calendario');

        res.json({
            success: true,
            data: {
                eventi,
                periodo: { dataInizio: inizio, dataFine: fine }
            }
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore GET /scadenze-mdl/calendario');
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del calendario scadenze',

        });
    }
});

/**
 * GET /api/v1/clinica/scadenze-mdl/export
 * Esporta scadenze in formato CSV/JSON
 * 
 * Query params:
 * - formato: csv | json (default json)
 * - giorni: numero giorni (default 90)
 */
router.get('/export', requirePermission('visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { formato = 'json', giorni = 90, companyTenantProfileId } = req.query;

        const dataFine = new Date();
        dataFine.setDate(dataFine.getDate() + parseInt(giorni));

        const result = await ScadenzeMDLService.getAllScadenze(tenantId, {
            dataFine,
            companyTenantProfileId,
            limit: 1000
        });

        logger.info({
            tenantId,
            formato,
            totale: result.scadenze.length
        }, 'GET /scadenze-mdl/export');

        if (formato === 'csv') {
            // Genera CSV
            const csvHeader = 'Categoria,Tipo,Descrizione,Data Scadenza,Urgenza,Giorni Rimanenti,Azienda,Sede\n';
            const csvRows = result.scadenze.map(s => [
                s.categoria,
                s.tipo,
                `"${(s.descrizione || '').replace(/"/g, '""')}"`,
                new Date(s.dataScadenza).toISOString().split('T')[0],
                s.livelloUrgenza,
                s.giorniAllaScadenza,
                `"${(s.entita?.azienda || '').replace(/"/g, '""')}"`,
                `"${(s.entita?.sede || '').replace(/"/g, '""')}"`
            ].join(',')).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=scadenze-mdl-${new Date().toISOString().split('T')[0]}.csv`);
            res.send(csvHeader + csvRows);
        } else {
            res.json({
                success: true,
                data: result.scadenze,
                statistiche: result.statistiche,
                exportedAt: new Date().toISOString()
            });
        }
    } catch (error) {
        logger.error({ error: error.message }, 'Errore GET /scadenze-mdl/export');
        res.status(500).json({
            success: false,
            message: 'Errore nell\'export delle scadenze',

        });
    }
});

/**
 * POST /api/v1/clinica/scadenze-mdl/programma-prestazioni
 * Registra l'esecuzione delle scadenze per-prestazione di una visita MDL e crea le successive.
 * Chiamato da VisitaPage quando viene salvata la Sorveglianza Sanitaria con prossimoControllo settato.
 *
 * Body: { personId, mansioneId, visitaId, dataVisita }
 */
router.post('/programma-prestazioni', requirePermission('visite:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { personId, mansioneId, visitaId, dataVisita, excludePrestazioniIds, dateOverrides, prestazioniAggiuntive, questionariAggiuntivi } = req.body;

        if (!personId || !mansioneId) {
            return res.status(400).json({
                success: false,
                message: 'personId e mansioneId sono obbligatori'
            });
        }

        const result = await ScadenzeMDLService.programmaPrestazioniDopoVisita(
            tenantId, personId, mansioneId, visitaId || null, dataVisita || null,
            Array.isArray(excludePrestazioniIds) ? excludePrestazioniIds : [],
            typeof dateOverrides === 'object' && dateOverrides !== null ? dateOverrides : {},
            Array.isArray(prestazioniAggiuntive) ? prestazioniAggiuntive : [],
            Array.isArray(questionariAggiuntivi) ? questionariAggiuntivi : []
        );

        logger.info({ tenantId, personId, mansioneId, visitaId, ...result }, 'POST /scadenze-mdl/programma-prestazioni');

        res.json({
            success: true,
            data: result,
            message: `${result.updated} scadenze registrate, ${result.created} nuove scadenze create`
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore POST /scadenze-mdl/programma-prestazioni');
        res.status(500).json({
            success: false,
            message: 'Errore nella programmazione delle scadenze prestazioni'
        });
    }
});

/**
 * GET /api/v1/clinica/scadenze-mdl/persona/:personId/in-scadenza
 * Restituisce le ScadenzaPrestazioneProtocollo aperte del lavoratore entro -60/+30 giorni dalla dataRiferimento.
 * Usato dal modal di prenotazione appuntamento MDL per auto-selezionare le prestazioni in scadenza.
 *
 * Query params:
 * - dataRiferimento: ISO date, data di riferimento (data appuntamento)
 * - giorniPre: giorni precedenti inclusi (default 60)
 * - giorniPost: giorni successivi inclusi (default 30)
 * - giorni: legacy, numero simmetrico di tolleranza
 * - excludeAppuntamentoId: escludi scadenze già collegate a questo appuntamento specifico (in edit mode)
 */
router.get('/persona/:personId/in-scadenza', requirePermission('visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { personId } = req.params;
        const { dataRiferimento, giorni, giorniPre = '60', giorniPost = '30', excludeAppuntamentoId } = req.query;

        if (!personId) {
            return res.status(400).json({ success: false, message: 'personId obbligatorio' });
        }
        if (!dataRiferimento) {
            return res.status(400).json({ success: false, message: 'dataRiferimento obbligatorio' });
        }

        const refDate = new Date(dataRiferimento);
        if (isNaN(refDate.getTime())) {
            return res.status(400).json({ success: false, message: 'dataRiferimento non valida' });
        }

        // Finestra asimmetrica: -60 giorni (scaduti recenti) / +30 giorni (prossimi)
        // Il parametro legacy "giorni" sovrascrive entrambi per backward compatibility
        const preNum = giorni ? parseInt(giorni, 10) : (parseInt(giorniPre, 10) || 60);
        const postNum = giorni ? parseInt(giorni, 10) : (parseInt(giorniPost, 10) || 30);
        const dataMin = new Date(refDate);
        dataMin.setDate(dataMin.getDate() - preNum);
        const dataMax = new Date(refDate);
        dataMax.setDate(dataMax.getDate() + postNum);

        // Recupera scadenze aperte (non eseguite) nel range di date
        // - appuntamentoId null: scadenza non ancora prenotata → da auto-selezionare
        // - appuntamentoId === excludeAppuntamentoId: già collegata a questo appuntamento (edit mode) → includi
        const whereBase = {
            personId,
            tenantId,
            eseguita: false,
            deletedAt: null,
            dataScadenza: { gte: dataMin, lte: dataMax },
        };

        const scadenze = excludeAppuntamentoId
            ? await prisma.scadenzaPrestazioneProtocollo.findMany({
                where: {
                    ...whereBase,
                    OR: [
                        { appuntamentoId: null },
                        { appuntamentoId: excludeAppuntamentoId },
                    ],
                },
                select: {
                    id: true, prestazioneId: true, dataScadenza: true, periodicitaMesi: true, isPrimaVisita: true, appuntamentoId: true,
                },
                orderBy: { dataScadenza: 'asc' },
            })
            : await prisma.scadenzaPrestazioneProtocollo.findMany({
                where: { ...whereBase, appuntamentoId: null },
                select: {
                    id: true, prestazioneId: true, dataScadenza: true, periodicitaMesi: true, isPrimaVisita: true, appuntamentoId: true,
                },
                orderBy: { dataScadenza: 'asc' },
            });

        // Batch-fetch prestazioni per arricchire la risposta
        const prestazioneIds = [...new Set(scadenze.map(s => s.prestazioneId).filter(Boolean))];
        const prestazioni = prestazioneIds.length > 0
            ? await prisma.prestazione.findMany({
                where: { id: { in: prestazioneIds }, deletedAt: null },
                select: { id: true, nome: true, codice: true, tipo: true },
            })
            : [];
        const prestazioneMap = Object.fromEntries(prestazioni.map(p => [p.id, p]));

        const result = scadenze.map(s => ({
            id: s.id,
            prestazioneId: s.prestazioneId,
            prestazione: prestazioneMap[s.prestazioneId] ?? null,
            dataScadenza: s.dataScadenza?.toISOString() ?? null,
            periodicitaMesi: s.periodicitaMesi,
            isPrimaVisita: s.isPrimaVisita,
            giorniAllaScadenza: Math.ceil((new Date(s.dataScadenza).getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)),
        }));

        logger.info(
            { tenantId, personId, dataRiferimento, giorniPre: preNum, giorniPost: postNum, found: result.length },
            'GET /scadenze-mdl/persona/:personId/in-scadenza'
        );

        res.json({ success: true, data: result });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore GET /scadenze-mdl/persona/:personId/in-scadenza');
        res.status(500).json({ success: false, message: 'Errore nel caricamento delle scadenze in corso' });
    }
});

/**
 * GET /api/v1/clinica/scadenze-mdl/persona/:personId
 * Restituisce tutte le ScadenzaPrestazioneProtocollo di un lavoratore, raggruppate per prestazione.
 * Usato in VisitaScadenzaCard per mostrare il piano di sorveglianza completo con stato e scadenze.
 */
router.get('/persona/:personId', requirePermission('visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { personId } = req.params;

        if (!personId) {
            return res.status(400).json({ success: false, message: 'personId obbligatorio' });
        }

        const scadenze = await prisma.scadenzaPrestazioneProtocollo.findMany({
            where: { personId, tenantId, deletedAt: null },
            include: {
                visita: { select: { id: true, dataOra: true, tipoVisitaMDL: true } },
                appuntamento: { select: { id: true, dataOra: true, stato: true, tipoVisitaMDL: true } },
                // P72_21: includi documentoTemplate per questionari periodici
                documentoTemplate: { select: { id: true, nome: true } }
            },
            orderBy: [{ dataScadenza: 'asc' }, { eseguita: 'asc' }]
        });

        // Carica le prestazioni in un'unica query separata (il campo prestazioneId è una raw FK, non una relation Prisma)
        const prestazioneIds = [...new Set(scadenze.map(s => s.prestazioneId).filter(Boolean))];
        const prestazioni = prestazioneIds.length > 0
            ? await prisma.prestazione.findMany({
                where: { id: { in: prestazioneIds }, deletedAt: null },
                select: { id: true, nome: true, codice: true, tipo: true }
            })
            : [];
        const prestazioneMap = Object.fromEntries(prestazioni.map(p => [p.id, p]));

        // Carica isObbligatoria da ProtocolloPrestazione per ogni coppia (protocolloId, prestazioneId)
        // P72_14: Serve per l'ordinamento stabile — VMdL primo, obbligatorie alpha, facoltative alpha
        // Filtra le scadenze prive di protocolloId o prestazioneId per evitare query Prisma invalide
        const protocolloPairs = [...new Map(
            scadenze
                .filter(s => s.protocolloId && s.prestazioneId)
                .map(s => [`${s.protocolloId}::${s.prestazioneId}`, { protocolloId: s.protocolloId, prestazioneId: s.prestazioneId }])
        ).values()];
        const protocolloPrestazioniData = protocolloPairs.length > 0
            ? await prisma.protocolloPrestazione.findMany({
                where: {
                    OR: protocolloPairs.map(p => ({ protocolloId: p.protocolloId, prestazioneId: p.prestazioneId })),
                    deletedAt: null,
                },
                select: { protocolloId: true, prestazioneId: true, isObbligatoria: true },
            })
            : [];
        // Indice: "protocolloId::prestazioneId" → isObbligatoria
        const isObbligatoriaMap = Object.fromEntries(
            protocolloPrestazioniData.map(pp => [`${pp.protocolloId}::${pp.prestazioneId}`, pp.isObbligatoria])
        );

        // Raggruppa per prestazione/questionario: nome, scadenze (aperte/eseguite), prossima scadenza
        const gruppi = new Map();
        for (const s of scadenze) {
            // P72_21: supporto questionari (documentoTemplateId) oltre a prestazioni (prestazioneId)
            const key = s.prestazioneId ?? `q::${s.documentoTemplateId}`;
            const prestazione = s.prestazioneId ? (prestazioneMap[s.prestazioneId] ?? null) : null;
            const isQuestionario = !s.prestazioneId && !!s.documentoTemplateId;
            if (!gruppi.has(key)) {
                const isObbligatoria = isObbligatoriaMap[`${s.protocolloId}::${s.prestazioneId}`] ?? true;
                gruppi.set(key, {
                    prestazioneId: s.prestazioneId,
                    documentoTemplateId: s.documentoTemplateId ?? null, // P72_21
                    prestazioneName: isQuestionario
                        ? (s.documentoTemplate?.nome ?? 'Questionario')
                        : (prestazione?.nome ?? '—'),
                    prestazioneCodice: prestazione?.codice ?? null,
                    prestazioneTipo: isQuestionario ? 'QUESTIONARIO' : (prestazione?.tipo ?? null),
                    isObbligatoria,
                    periodicitaMesi: s.periodicitaMesi,
                    scadenze: []
                });
            }
            gruppi.get(key).scadenze.push({
                id: s.id,
                dataScadenza: s.dataScadenza?.toISOString() ?? null,
                dataEsecuzione: s.dataEsecuzione?.toISOString() ?? null,
                eseguita: s.eseguita,
                isPrimaVisita: s.isPrimaVisita,
                appuntamento: s.appuntamento ? {
                    id: s.appuntamento.id,
                    dataOra: s.appuntamento.dataOra?.toISOString() ?? null,
                    stato: s.appuntamento.stato,
                    tipoVisitaMDL: s.appuntamento.tipoVisitaMDL
                } : null,
                visita: s.visita ? {
                    id: s.visita.id,
                    dataOra: s.visita.dataOra?.toISOString() ?? null
                } : null
            });
        }

        // P72_14: Ordine stabile — Visita Medica del Lavoro prima, obbligatorie in ordine alfabetico, facoltative, questionari
        // Logica: peso 0 = VISITA_MEDICINA_LAVORO, peso 1 = obbligatoria, peso 2 = facoltativa, peso 3 = questionario
        const sortWeight = (g) => {
            if (g.prestazioneTipo === 'VISITA_MEDICINA_LAVORO') return 0;
            if (g.prestazioneTipo === 'QUESTIONARIO') return 3;
            return g.isObbligatoria ? 1 : 2;
        };
        const sorted = Array.from(gruppi.values()).sort((a, b) => {
            const wa = sortWeight(a);
            const wb = sortWeight(b);
            if (wa !== wb) return wa - wb;
            return (a.prestazioneName || '').localeCompare(b.prestazioneName || '', 'it');
        });
        res.json({ success: true, data: sorted });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore GET /scadenze-mdl/persona/:personId');
        res.status(500).json({ success: false, message: 'Errore nel caricamento delle scadenze del lavoratore' });
    }
});

/**
 * PATCH /api/v1/clinica/scadenze-mdl/:id/data-scadenza
 * Aggiorna la data di scadenza di una singola ScadenzaPrestazioneProtocollo non ancora eseguita.
 * Usato dal piano di sorveglianza sanitaria in VisitaScadenzaCard per modificare date singole o riconciliate.
 */
router.patch('/:id/data-scadenza', requirePermission('visite:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const { dataScadenza } = req.body;

        if (!dataScadenza) {
            return res.status(400).json({ success: false, message: 'dataScadenza obbligatoria' });
        }

        const scadenza = await prisma.scadenzaPrestazioneProtocollo.findFirst({
            where: { id, tenantId, deletedAt: null, eseguita: false }
        });
        if (!scadenza) {
            return res.status(404).json({ success: false, message: 'Scadenza non trovata o già eseguita' });
        }

        const updated = await prisma.scadenzaPrestazioneProtocollo.update({
            where: { id },
            data: { dataScadenza: new Date(dataScadenza) }
        });

        logger.info({ id, tenantId, dataScadenza }, 'ScadenzaPrestazioneProtocollo: data aggiornata manualmente');
        res.json({ success: true, data: { id: updated.id, dataScadenza: updated.dataScadenza } });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore PATCH /scadenze-mdl/:id/data-scadenza');
        res.status(500).json({ success: false, message: 'Errore aggiornamento data scadenza' });
    }
});

/**
 * POST /api/v1/clinica/scadenze-mdl/reconcilia-date
 * Riconcilia le date di un gruppo di scadenze non eseguite impostando tutte alla stessa targetDate.
 * Usato dalla feature "Riconcilia date" del piano di sorveglianza sanitaria.
 */
router.post('/reconcilia-date', requirePermission('visite:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { ids, targetDate } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'ids array obbligatorio e non vuoto' });
        }
        if (!targetDate) {
            return res.status(400).json({ success: false, message: 'targetDate obbligatoria' });
        }

        const result = await prisma.scadenzaPrestazioneProtocollo.updateMany({
            where: {
                id: { in: ids },
                tenantId,
                deletedAt: null,
                eseguita: false,
            },
            data: { dataScadenza: new Date(targetDate) }
        });

        logger.info({ tenantId, ids, targetDate, aggiornate: result.count }, 'ScadenzaPrestazioneProtocollo: date riconciliate');
        res.json({ success: true, aggiornate: result.count });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore POST /scadenze-mdl/reconcilia-date');
        res.status(500).json({ success: false, message: 'Errore riconciliazione date' });
    }
});

/**
 * Helper per colore urgenza (per calendario)
 */
function getColorByUrgenza(urgenza) {
    const colors = {
        scaduto: '#ef4444',      // red-500
        critico: '#f97316',      // orange-500
        urgente: '#eab308',      // yellow-500
        attenzione: '#3b82f6',   // blue-500
        programmato: '#22c55e'   // green-500
    };
    return colors[urgenza] || '#6b7280';
}

/**
 * POST /api/v1/clinica/scadenze-mdl/genera-iniziali
 * Genera le scadenze iniziali per tutte le mansioni attive di un lavoratore.
 * Usato dalla VisitaPage quando il piano di sorveglianza è vuoto.
 */
router.post('/genera-iniziali', requirePermission('clinica.visite:update'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { personId } = req.body;

        if (!personId) {
            return res.status(400).json({ success: false, message: 'personId obbligatorio' });
        }

        const result = await MansioneService.ensureScadenzeExist(personId, tenantId);

        logger.info({ personId, tenantId, ...result }, 'POST /scadenze-mdl/genera-iniziali');
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore POST /scadenze-mdl/genera-iniziali');
        res.status(500).json({ success: false, message: 'Errore nella generazione delle scadenze' });
    }
});

export default router;
