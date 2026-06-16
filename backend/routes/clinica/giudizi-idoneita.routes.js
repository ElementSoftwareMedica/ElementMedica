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
      mansione,
      companyTenantProfileId,
      search
    } = req.query;

    // GDPR/Sicurezza: un Company Manager (senza ruoli admin) può vedere SOLO i giudizi
    // della propria azienda. Il filtro è FORZATO lato backend e non può essere bypassato
    // omettendo il parametro dal client.
    const roles = req.person.roles || [];
    const isCompanyManager = roles.includes('COMPANY_MANAGER') &&
      !roles.some(r => ['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN'].includes(r));
    // Se Company Manager senza azienda associata, forziamo un valore impossibile per non esporre dati
    const effectiveCompanyTenantProfileId = isCompanyManager
      ? (req.person.companyTenantProfileId || '__NO_COMPANY__')
      : companyTenantProfileId;

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
      mansione,
      companyTenantProfileId: effectiveCompanyTenantProfileId,
      search
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

/**
 * @route GET /api/v1/clinica/giudizi-idoneita/form-data
 * @desc Dati filtrati per creare giudizi collegati a visite MDL
 * @access Private - VIEW_VISITA
 */
router.get('/form-data', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { companyTenantProfileId, personId, search } = req.query;
    const data = await GiudizioIdoneitaService.getFormData(tenantId, {
      companyTenantProfileId,
      personId,
      search
    });

    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error: error.message }, 'Errore form-data giudizi idoneità');
    res.status(error.statusCode || 500).json({ error: error.message || 'Errore nel caricamento dei dati' });
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

/**
 * @route POST /api/v1/clinica/giudizi-idoneita/batch-secure-send
 * @desc Invio sicuro forzato di giudizi selezionati (ZIP protetto + password via
 *       WhatsApp al lavoratore / PEC al datore). Permette di scegliere il destinatario.
 * @body { giudizioIds: string[], recipientType: 'worker'|'employer'|'both' }
 * @access Private - CREATE_VISITA
 */
router.post('/batch-secure-send', requireAuth, requirePermission('clinica.visite:create'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { giudizioIds, recipientType = 'both' } = req.body;

    if (!Array.isArray(giudizioIds) || giudizioIds.length === 0) {
      return res.status(400).json({ error: 'Nessun giudizio selezionato' });
    }
    if (!['worker', 'employer', 'both'].includes(recipientType)) {
      return res.status(400).json({ error: 'recipientType non valido' });
    }

    // GDPR/Sicurezza: un Company Manager può inviare solo giudizi della propria azienda
    const roles = req.person.roles || [];
    const isCompanyManager = roles.includes('COMPANY_MANAGER') &&
      !roles.some(r => ['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN'].includes(r));

    let allowedIds = giudizioIds;
    if (isCompanyManager) {
      const companyId = req.person.companyTenantProfileId;
      const owned = companyId ? await prisma.giudizioIdoneita.findMany({
        where: {
          id: { in: giudizioIds },
          tenantId,
          deletedAt: null,
          OR: [
            { mansioni: { some: { mansione: { site: { companyTenantProfileId: companyId } } } } },
            { visita: { appuntamento: { companyTenantProfileId: companyId } } }
          ]
        },
        select: { id: true }
      }) : [];
      allowedIds = owned.map(g => g.id);
    }

    let sent = 0;
    let skipped = 0;
    let errors = 0;
    for (const giudizioId of allowedIds) {
      try {
        const r = await IdoneityNotificationService.sendSecureGiudizioAuto({
          giudizioId, tenantId, performedBy: req.person.id, recipientType
        });
        if (r.skipped) skipped++;
        else sent++;
      } catch (err) {
        errors++;
        logger.warn({ giudizioId, error: err.message }, 'Errore invio sicuro batch');
      }
    }

    logger.info({ tenantId, requested: giudizioIds.length, processed: allowedIds.length, sent, skipped, errors, recipientType }, 'Batch secure-send completato');
    res.json({ success: true, data: { richiesti: giudizioIds.length, processati: allowedIds.length, inviati: sent, saltati: skipped, errori: errors } });
  } catch (error) {
    logger.error({ error: error.message }, 'Errore batch secure-send');
    res.status(500).json({ error: 'Errore durante l\'invio batch' });
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
    if (/non trovato/i.test(error.message)) {
      return res.status(404).json({ error: 'Giudizio non trovato per il tenant corrente' });
    }
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
    if (!data.personId || !data.tipoGiudizio || !data.visitaId) {
      return res.status(400).json({
        error: 'Lavoratore, visita MDL e tipo giudizio sono obbligatori'
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
    res.status(error.statusCode || 500).json({ error: error.message || 'Errore nell\'emissione del giudizio' });
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
    res.status(error.statusCode || 500).json({ error: error.message || 'Errore nell\'aggiornamento del giudizio' });
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

/**
 * @route POST /api/v1/clinica/giudizi-idoneita/:id/firma-lavoratore
 * @desc Salva la firma del lavoratore per un giudizio di idoneità
 * @access Private - EDIT_VISITA
 */
router.post('/:id/firma-lavoratore', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const { firmaImageBase64, position } = req.body;

    if (!firmaImageBase64) {
      return res.status(400).json({ error: 'firmaImageBase64 è obbligatorio' });
    }

    // Posizione opzionale della firma sul PDF: { page, x, y, w } normalizzati 0-1
    let positionJson = null;
    if (position && typeof position === 'object' &&
        Number.isFinite(position.x) && Number.isFinite(position.y)) {
      positionJson = JSON.stringify({
        page: Number.isInteger(position.page) ? position.page : 0,
        x: Math.min(1, Math.max(0, position.x)),
        y: Math.min(1, Math.max(0, position.y)),
        w: Number.isFinite(position.w) ? Math.min(1, Math.max(0.05, position.w)) : 0.25
      });
    }

    const giudizio = await GiudizioIdoneitaService.findById(id, tenantId);
    if (!giudizio) {
      return res.status(404).json({ error: 'Giudizio non trovato' });
    }

    // GDPR/Sicurezza: un Company Manager può firmare SOLO i giudizi della propria azienda
    const roles = req.person.roles || [];
    const isCompanyManager = roles.includes('COMPANY_MANAGER') &&
      !roles.some(r => ['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN'].includes(r));
    if (isCompanyManager) {
      const companyId = req.person.companyTenantProfileId;
      const ownsGiudizio = companyId ? await prisma.giudizioIdoneita.count({
        where: {
          id,
          tenantId,
          deletedAt: null,
          OR: [
            { mansioni: { some: { mansione: { site: { companyTenantProfileId: companyId } } } } },
            { visita: { appuntamento: { companyTenantProfileId: companyId } } }
          ]
        }
      }) : 0;
      if (!ownsGiudizio) {
        return res.status(403).json({ error: 'Accesso negato: il giudizio non appartiene alla tua azienda' });
      }
    }

    const firmaImageUrl = firmaImageBase64.startsWith('data:')
      ? firmaImageBase64
      : `data:image/png;base64,${firmaImageBase64}`;

    // Create or update FirmaDigitale per questo giudizio (lavoratore/dipendente)
    const existing = await prisma.firmaDigitale.findFirst({
      where: {
        documentoId: id,
        documentType: 'GIUDIZIO_IDONEITA',
        firmatarioRole: 'DIPENDENTE',
        tenantId,
        deletedAt: null
      },
      select: { id: true }
    });

    let firma;
    if (existing) {
      firma = await prisma.firmaDigitale.update({
        where: { id: existing.id },
        data: { firmaImageUrl, stato: 'FIRMATO', note: positionJson }
      });
    } else {
      firma = await prisma.firmaDigitale.create({
        data: {
          documentType: 'GIUDIZIO_IDONEITA',
          documentoId: id,
          firmatarioId: giudizio.personId,
          firmatarioRole: 'DIPENDENTE',
          stato: 'FIRMATO',
          tipoFirma: 'GRAFOMETRICA',
          hashDocumento: id,
          firmaImageUrl,
          note: positionJson,
          tenantId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });
    }

    logger.info({ giudizioId: id, firmaId: firma.id, signedBy: req.person.id }, 'Firma lavoratore salvata');
    res.json({ success: true, firmaId: firma.id });
  } catch (error) {
    logger.error({ error: error.message, id: req.params.id }, 'Errore salvataggio firma lavoratore');
    res.status(500).json({ error: 'Errore nel salvataggio della firma' });
  }
});

/**
 * @route GET /api/v1/clinica/giudizi-idoneita/:id/firma-lavoratore
 * @desc Verifica se esiste la firma del lavoratore per un giudizio
 * @access Private - VIEW_VISITA
 */
router.get('/:id/firma-lavoratore', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    const firma = await prisma.firmaDigitale.findFirst({
      where: {
        documentoId: id,
        documentType: 'GIUDIZIO_IDONEITA',
        firmatarioRole: 'DIPENDENTE',
        tenantId,
        deletedAt: null
      },
      select: { id: true, firmaImageUrl: true, createdAt: true, stato: true, note: true }
    });

    res.json({ firma: firma || null, hasFirma: !!firma });
  } catch (error) {
    logger.error({ error: error.message, id: req.params.id }, 'Errore recupero firma lavoratore');
    res.status(500).json({ error: 'Errore nel recupero della firma' });
  }
});

export default router;
