/**
 * Giudizi Idoneità Routes - P56 Medicina del Lavoro
 * 
 * API per gestione giudizi di idoneità secondo Art. 41 D.Lgs 81/08
 * Include gestione ricorsi e tracking scadenze
 * 
 * @module routes/clinica/giudizi-idoneita.routes
 */

import express from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import prisma from '../../config/prisma-optimization.js';
import GiudizioIdoneitaService from '../../services/clinical/GiudizioIdoneitaService.js';
import GiudizioIdoneitaPdfService from '../../services/clinical/GiudizioIdoneitaPdfService.js';
import GiudizioEmailService from '../../services/clinical/GiudizioEmailService.js';
import IdoneityNotificationService from '../../services/clinical/IdoneityNotificationService.js';
import { getEffectiveTenantId } from "../../utils/tenantHelper.js";
import logger from '../../utils/logger.js';
import { validateParamId } from '../../middleware/validateUUID.js';

const router = express.Router();
router.param('id', validateParamId);

/**
 * @route GET /api/v1/clinica/giudizi-idoneita
 * @desc Lista giudizi con paginazione e filtri
 * @access Private - VIEW_VISITA
 */
router.get('/', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const {
      page = 1,
      limit = 50,
      personId,
      medicoCompetenteId,
      tipoGiudizio,
      stato,
      inScadenza,
      dateFrom,
      dateTo,
      mansione
    } = req.query;

    const result = await GiudizioIdoneitaService.findAll(tenantId, {
      page: parseInt(page),
      limit: parseInt(limit),
      personId,
      medicoCompetenteId,
      tipoGiudizio,
      stato,
      inScadenza: inScadenza ? parseInt(inScadenza) : undefined,
      dateFrom,
      dateTo,
      mansione
    });

    res.json(result);
  } catch (error) {
    logger.error({ error: error.message }, 'Errore lista giudizi idoneità');
    res.status(500).json({ error: 'Errore nel recupero dei giudizi' });
  }
});

/**
 * @route GET /api/v1/clinica/giudizi-idoneita/expiring
 * @desc Lista giudizi in scadenza
 * @access Private - VIEW_VISITA
 */
router.get('/expiring', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { giorni = 30 } = req.query;

    const giudizi = await GiudizioIdoneitaService.getExpiring(tenantId, parseInt(giorni));

    res.json(giudizi);
  } catch (error) {
    logger.error({ error: error.message }, 'Errore lista giudizi in scadenza');
    res.status(500).json({ error: 'Errore nel recupero dei giudizi in scadenza' });
  }
});

/**
 * @route GET /api/v1/clinica/giudizi-idoneita/stats/:medicoCompetenteId
 * @desc Statistiche giudizi per medico competente
 * @access Private - VIEW_VISITA
 */
router.get('/stats/:medicoCompetenteId', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { medicoCompetenteId } = req.params;
    const { from, to } = req.query;

    const stats = await GiudizioIdoneitaService.getStatsByMedico(
      medicoCompetenteId,
      tenantId,
      {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined
      }
    );

    res.json(stats);
  } catch (error) {
    logger.error({ error: error.message }, 'Errore statistiche giudizi');
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
});

/**
 * @route GET /api/v1/clinica/giudizi-idoneita/worker/:personId
 * @desc Giudizio attivo per un lavoratore
 * @access Private - VIEW_VISITA
 */
router.get('/worker/:personId', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { personId } = req.params;
    const { mansioneId } = req.query;

    const giudizio = await GiudizioIdoneitaService.findActiveForWorker(
      personId,
      tenantId,
      mansioneId
    );

    if (!giudizio) {
      return res.status(404).json({
        error: 'Nessun giudizio di idoneità attivo trovato'
      });
    }

    res.json(giudizio);
  } catch (error) {
    logger.error({ error: error.message }, 'Errore recupero giudizio lavoratore');
    res.status(500).json({ error: 'Errore nel recupero del giudizio' });
  }
});

// ===== BATCH ROUTES (MUST be before /:id to avoid parameter matching) =====

/**
 * @route GET /api/v1/clinica/giudizi-idoneita/batch-preview
 * @desc Preview dei giudizi di oggi raggruppati per azienda, con stato invio
 * @access Private - CREATE_VISITA
 */
router.get('/batch-preview', requireAuth, requirePermission('clinica.visite:create'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const giudizi = await prisma.giudizioIdoneita.findMany({
      where: {
        tenantId,
        deletedAt: null,
        stato: 'VALIDO',
        dataEmissione: { gte: today, lt: tomorrow }
      },
      select: {
        id: true,
        tipoGiudizio: true,
        dataEmissione: true,
        pdfLavoratoreUrl: true,
        pdfDatoreUrl: true,
        dataNotificaLavoratore: true,
        invioSicuroAziendaAt: true,
        person: { select: { id: true, firstName: true, lastName: true } },
        mansioni: {
          include: {
            mansione: {
              select: {
                id: true,
                denominazione: true,
                site: {
                  select: {
                    id: true,
                    companyTenantProfile: {
                      select: {
                        id: true,
                        company: { select: { ragioneSociale: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        visita: {
          select: {
            appuntamento: {
              select: {
                companyTenantProfileId: true,
                companyTenantProfile: {
                  select: {
                    id: true,
                    company: { select: { ragioneSociale: true } }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { dataEmissione: 'desc' }
    });

    // Group by company
    const companiesMap = new Map();

    for (const g of giudizi) {
      // Cerca companyProfile dalla prima mansione con site, o dalla visita
      const mansioneWithSite = g.mansioni?.find(m => m.mansione?.site?.companyTenantProfile);
      const companyProfile = mansioneWithSite?.mansione?.site?.companyTenantProfile || g.visita?.appuntamento?.companyTenantProfile;
      const companyId = companyProfile?.id || 'senza-azienda';
      const companyName = companyProfile?.company?.ragioneSociale || 'Senza azienda';

      if (!companiesMap.has(companyId)) {
        companiesMap.set(companyId, {
          companyTenantProfileId: companyId === 'senza-azienda' ? null : companyId,
          ragioneSociale: companyName,
          giudizi: [],
          totale: 0,
          giaInviati: 0
        });
      }

      const entry = companiesMap.get(companyId);
      const alreadySent = !!(g.dataNotificaLavoratore || g.invioSicuroAziendaAt);
      entry.giudizi.push({
        id: g.id,
        personId: g.person.id,
        lavoratore: `${g.person.lastName} ${g.person.firstName}`,
        tipoGiudizio: g.tipoGiudizio,
        hasPdf: !!(g.pdfLavoratoreUrl && g.pdfDatoreUrl),
        alreadySent
      });
      entry.totale++;
      if (alreadySent) entry.giaInviati++;
    }

    res.json({
      success: true,
      data: {
        totaleGiudizi: giudizi.length,
        companies: [...companiesMap.values()]
      }
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Errore batch-preview giudizi');
    res.status(500).json({ error: 'Errore nel caricamento dei dati' });
  }
});

/**
 * @route POST /api/v1/clinica/giudizi-idoneita/batch-generate-send
 * @desc Forza generazione PDF e invio email/ZIP per tutti i giudizi di oggi
 * @access Private - CREATE_VISITA
 */
router.post('/batch-generate-send', requireAuth, requirePermission('clinica.visite:create'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { companyTenantProfileId, companyTenantProfileIds, personIds, force } = req.body;

    const companyIds = companyTenantProfileIds?.length
      ? companyTenantProfileIds
      : companyTenantProfileId
        ? [companyTenantProfileId]
        : null;

    logger.info({ tenantId, companyIds, personIds, force }, 'Avvio batch force-generate giudizi di oggi');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const whereClause = {
      tenantId,
      deletedAt: null,
      stato: 'VALIDO',
      dataEmissione: { gte: today, lt: tomorrow },
      ...(companyIds && {
        OR: [
          { mansioni: { some: { mansione: { site: { companyTenantProfileId: { in: companyIds } } } } } },
          { visita: { appuntamento: { companyTenantProfileId: { in: companyIds } } } }
        ]
      }),
      ...(personIds?.length && { personId: { in: personIds } })
    };

    if (force) {
      await prisma.giudizioIdoneita.updateMany({
        where: whereClause,
        data: {
          dataNotificaLavoratore: null,
          invioSicuroAziendaAt: null
        }
      });
      logger.info('Force re-send: reset notification timestamps');
    }

    const pendingGiudizi = await prisma.giudizioIdoneita.findMany({
      where: whereClause,
      select: { id: true, pdfLavoratoreUrl: true, pdfDatoreUrl: true }
    });

    let pdfGenerated = 0;
    let pdfErrors = 0;

    for (const g of pendingGiudizi) {
      if (!g.pdfLavoratoreUrl || !g.pdfDatoreUrl) {
        try {
          await GiudizioIdoneitaPdfService.generateAndStore(g.id, tenantId);
          pdfGenerated++;
        } catch (err) {
          pdfErrors++;
          logger.warn({ error: 'Operazione non riuscita', giudizioId: g.id }, 'Errore generazione PDF in batch');
        }
      }
    }

    const emailStats = await GiudizioEmailService.sendDailyGiudiziNotifications();
    const zipStats = await IdoneityNotificationService.sendDailyZipToCompanies(tenantId);

    const result = {
      giudiziTrovati: pendingGiudizi.length,
      pdfGenerati: pdfGenerated,
      pdfErrori: pdfErrors,
      email: emailStats,
      zipAziende: zipStats
    };

    logger.info(result, 'Batch force-generate completato');

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ error: error.message }, 'Errore batch force-generate giudizi');
    res.status(500).json({ error: 'Errore durante la generazione batch' });
  }
});

// ===== PARAMETERIZED ROUTES =====

/**
 * @route GET /api/v1/clinica/giudizi-idoneita/:id/pdf/:destinatario
 * @desc Download PDF giudizio (on-demand, generato al volo)
 * @param destinatario 'lavoratore' | 'datore'
 * @access Private - VIEW_VISITA
 */
router.get('/:id/pdf/:destinatario', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  const { id, destinatario } = req.params;
  if (!['lavoratore', 'datore'].includes(destinatario)) {
    return res.status(400).json({ error: 'Destinatario non valido — usare "lavoratore" o "datore"' });
  }
  try {
    const tenantId = getEffectiveTenantId(req);
    const { buffer, filename } = await GiudizioIdoneitaPdfService.generate(id, destinatario, tenantId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack, id, destinatario }, 'Errore generazione PDF giudizio idoneità');
    res.status(500).json({ error: 'Errore nella generazione del PDF' });
  }
});

/**
 * @route POST /api/v1/clinica/giudizi-idoneita/:id/generate-documents
 * @desc Genera e salva entrambi i PDF (lavoratore + datore); aggiorna il record
 * @access Private - CREATE_VISITA
 */
router.post('/:id/generate-documents', requireAuth, requirePermission('clinica.visite:create'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    const urls = await GiudizioIdoneitaPdfService.generateAndStore(id, tenantId);

    res.json({ success: true, data: urls });
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore generazione documenti giudizio');
    res.status(500).json({ error: 'Errore nella generazione dei documenti' });
  }
});

/**
 * @route POST /api/v1/clinica/giudizi-idoneita/:id/complete-workflow
 * @desc Genera entrambi i PDF + schedula invio email al lavoratore e al datore
 * @access Private - CREATE_VISITA
 */
router.post('/:id/complete-workflow', requireAuth, requirePermission('clinica.visite:create'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    // 1. Genera e salva PDF
    const urls = await GiudizioIdoneitaPdfService.generateAndStore(id, tenantId);

    // 2. Invia email a entrambi i destinatari (se configurate)
    let emailResult = null;
    try {
      emailResult = await GiudizioEmailService.sendGiudizioNotification(id, 'both');
    } catch (emailErr) {
      // Email fallback: log ma non blocca la risposta
      logger.warn({ error: emailErr.message, id }, 'Invio email giudizio fallito — PDF comunque generati');
    }

    res.json({
      success: true,
      data: {
        ...urls,
        emailInviata: !!emailResult
      }
    });
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore complete-workflow giudizio');
    res.status(500).json({ error: 'Errore nel completamento del workflow giudizio' });
  }
});

/**
 * @route GET /api/v1/clinica/giudizi-idoneita/:id
 * @desc Dettaglio giudizio
 * @access Private - VIEW_VISITA
 */
router.get('/:id', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    const giudizio = await GiudizioIdoneitaService.findById(id, tenantId);

    if (!giudizio) {
      return res.status(404).json({ error: 'Giudizio non trovato' });
    }

    res.json(giudizio);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore dettaglio giudizio');
    res.status(500).json({ error: 'Errore nel recupero del giudizio' });
  }
});

/**
 * @route POST /api/v1/clinica/giudizi-idoneita
 * @desc Emette nuovo giudizio di idoneità
 * @access Private - CREATE_VISITA
 */
router.post('/', requireAuth, requirePermission('clinica.visite:create'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const medicoCompetenteId = req.person.id;
    const data = req.body;

    // Validazione base
    if (!data.personId || !data.tipoGiudizio) {
      return res.status(400).json({
        error: 'Lavoratore e tipo giudizio sono obbligatori'
      });
    }

    // Validazione tipo giudizio
    const tipiValidi = [
      'IDONEO',
      'IDONEO_CON_PRESCRIZIONI',
      'IDONEO_CON_LIMITAZIONI',
      'IDONEO_CON_LIMITAZIONI_PRESCRIZIONI',
      'NON_IDONEO_TEMPORANEO',
      'NON_IDONEO_PERMANENTE'
    ];

    if (!tipiValidi.includes(data.tipoGiudizio)) {
      return res.status(400).json({
        error: 'Tipo giudizio non valido',
        tipiValidi
      });
    }

    // Se non idoneo, richiede motivazioni
    if (data.tipoGiudizio.startsWith('NON_IDONEO') && !data.motivazioni) {
      return res.status(400).json({
        error: 'Le motivazioni sono obbligatorie per giudizi di non idoneità'
      });
    }

    // Se con prescrizioni/limitazioni, richiede dettagli
    if (
      (data.tipoGiudizio === 'IDONEO_CON_PRESCRIZIONI' && !data.prescrizioniIdoneita) ||
      (data.tipoGiudizio === 'IDONEO_CON_LIMITAZIONI' && !data.limitazioni) ||
      (data.tipoGiudizio === 'IDONEO_CON_LIMITAZIONI_PRESCRIZIONI' && (!data.limitazioni || !data.prescrizioniIdoneita))
    ) {
      return res.status(400).json({
        error: 'Dettagliare prescrizioni/limitazioni per questo tipo di giudizio'
      });
    }

    const giudizio = await GiudizioIdoneitaService.create(
      data,
      medicoCompetenteId,
      tenantId
    );

    logger.info({
      giudizioId: giudizio.id,
      personId: data.personId,
      tipoGiudizio: data.tipoGiudizio,
      medicoCompetenteId,
      tenantId
    }, 'Giudizio idoneità emesso via API');

    res.status(201).json(giudizio);
  } catch (error) {
    logger.error({ error: error.message }, 'Errore emissione giudizio');
    res.status(500).json({ error: 'Errore nell\'emissione del giudizio' });
  }
});

/**
 * @route PUT /api/v1/clinica/giudizi-idoneita/:id
 * @desc Aggiorna giudizio (solo campi modificabili)
 * @access Private - EDIT_VISITA
 */
router.put('/:id', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const data = req.body;

    const existing = await GiudizioIdoneitaService.findById(id, tenantId);
    if (!existing) {
      return res.status(404).json({ error: 'Giudizio non trovato' });
    }

    const giudizio = await GiudizioIdoneitaService.update(id, data, tenantId);

    logger.info({
      giudizioId: id,
      updatedBy: req.person.id,
      tenantId
    }, 'Giudizio aggiornato via API');

    res.json(giudizio);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore aggiornamento giudizio');
    res.status(500).json({ error: 'Errore nell\'aggiornamento del giudizio' });
  }
});

/**
 * @route POST /api/v1/clinica/giudizi-idoneita/:id/notify-worker
 * @desc Registra notifica al lavoratore
 * @access Private - EDIT_VISITA
 */
router.post('/:id/notify-worker', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    const giudizio = await GiudizioIdoneitaService.notifyWorker(id, tenantId);

    logger.info({
      giudizioId: id,
      notifiedBy: req.person.id,
      tenantId
    }, 'Lavoratore notificato del giudizio');

    res.json(giudizio);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore notifica lavoratore');
    res.status(500).json({ error: 'Errore nella registrazione della notifica' });
  }
});

/**
 * @route POST /api/v1/clinica/giudizi-idoneita/:id/notify-employer
 * @desc Registra notifica al datore di lavoro
 * @access Private - EDIT_VISITA
 */
router.post('/:id/notify-employer', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    const giudizio = await GiudizioIdoneitaService.notifyEmployer(id, tenantId);

    logger.info({
      giudizioId: id,
      notifiedBy: req.person.id,
      tenantId
    }, 'Datore di lavoro notificato del giudizio');

    res.json(giudizio);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore notifica datore lavoro');
    res.status(500).json({ error: 'Errore nella registrazione della notifica' });
  }
});

/**
 * @route POST /api/v1/clinica/giudizi-idoneita/:id/appeal
 * @desc Registra presentazione ricorso (Art. 41 c.9)
 * @access Private - EDIT_VISITA
 */
router.post('/:id/appeal', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const ricorsoData = req.body;

    const existing = await GiudizioIdoneitaService.findById(id, tenantId);
    if (!existing) {
      return res.status(404).json({ error: 'Giudizio non trovato' });
    }

    // Verifica che sia ancora nel termine per il ricorso
    if (existing.ricorsoEntro && new Date() > new Date(existing.ricorsoEntro)) {
      return res.status(400).json({
        error: 'Termine per la presentazione del ricorso scaduto'
      });
    }

    const giudizio = await GiudizioIdoneitaService.registerAppeal(id, ricorsoData, tenantId);

    logger.info({
      giudizioId: id,
      registeredBy: req.person.id,
      tenantId
    }, 'Ricorso registrato');

    res.json(giudizio);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore registrazione ricorso');
    res.status(500).json({ error: 'Errore nella registrazione del ricorso' });
  }
});

/**
 * @route POST /api/v1/clinica/giudizi-idoneita/:id/appeal-resolution
 * @desc Registra esito ricorso
 * @access Private - EDIT_VISITA
 */
router.post('/:id/appeal-resolution', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const { esito } = req.body;

    if (!esito) {
      return res.status(400).json({ error: 'Esito ricorso obbligatorio' });
    }

    const giudizio = await GiudizioIdoneitaService.resolveAppeal(id, esito, tenantId);

    logger.info({
      giudizioId: id,
      esito,
      resolvedBy: req.person.id,
      tenantId
    }, 'Esito ricorso registrato');

    res.json(giudizio);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore risoluzione ricorso');
    res.status(500).json({ error: 'Errore nella registrazione dell\'esito' });
  }
});

/**
 * @route DELETE /api/v1/clinica/giudizi-idoneita/:id
 * @desc Elimina giudizio (soft delete)
 * @access Private - DELETE_VISITA
 */
router.delete('/:id', requireAuth, requirePermission('clinica.visite:delete'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const { deletionReason } = req.body || {};

    if (!deletionReason || deletionReason.length < 10) {
      return res.status(400).json({ error: 'Motivo eliminazione obbligatorio (minimo 10 caratteri)' });
    }

    const existing = await GiudizioIdoneitaService.findById(id, tenantId);
    if (!existing) {
      return res.status(404).json({ error: 'Giudizio non trovato' });
    }

    await GiudizioIdoneitaService.delete(id, tenantId, deletionReason);

    logger.info({
      giudizioId: id,
      deletedBy: req.person.id,
      tenantId
    }, 'Giudizio eliminato via API');

    res.json({ success: true, message: 'Giudizio eliminato' });
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore eliminazione giudizio');
    res.status(500).json({ error: 'Errore nell\'eliminazione del giudizio' });
  }
});

export default router;
