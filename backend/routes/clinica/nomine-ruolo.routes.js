/**
 * Routes Nomine Ruolo - Gestione Figure Sicurezza
 * 
 * Endpoints per gestione nomine MC, RSPP, ASPP, RLS
 * secondo D.Lgs 81/08
 * 
 * @module routes/clinica/nomine-ruolo
 */

import express from 'express';
import prisma from '../../config/prisma-optimization.js';
import NominaRuoloService from '../../services/clinical/NominaRuoloService.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { getEffectiveTenantId } from "../../utils/tenantHelper.js";
import logger from '../../utils/logger.js';
import MovimentoContabileGenerator from '../../services/management/MovimentoContabileGenerator.js';
import { validateParamId, validateParam } from '../../middleware/validateUUID.js';

const router = express.Router();
router.param('id', validateParamId);
router.param('siteId', validateParam('siteId'));
router.param('personId', validateParam('personId'));

// Apply authentication to all routes in this router
router.use(requireAuth);

/**
 * GET /api/v1/clinica/nomine-ruolo
 * Lista tutte le nomine con filtri e paginazione
 */
router.get('/', requirePermission('clinica:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const {
      siteId,
      companyTenantProfileId,
      tipoRuolo,
      stato,
      personId,
      expiringDays,
      page = 1,
      limit = 50
    } = req.query;

    const result = await NominaRuoloService.findAll(tenantId, {
      siteId,
      companyTenantProfileId,
      tipoRuolo,
      stato,
      personId,
      expiringDays: expiringDays ? parseInt(expiringDays) : undefined,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json(result);
  } catch (error) {
    logger.error({ error: error.message }, 'Errore recupero nomine');
    res.status(500).json({ error: 'Errore recupero nomine' });
  }
});

/**
 * GET /api/v1/clinica/nomine-ruolo/by-site/:siteId
 * Nomine di una sede specifica
 */
router.get('/by-site/:siteId', requirePermission('clinica:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { siteId } = req.params;

    const nomine = await NominaRuoloService.findBySite(siteId, tenantId);
    res.json(nomine);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', siteId: req.params.siteId }, 'Errore recupero nomine per sede');
    res.status(500).json({ error: 'Errore recupero nomine per sede' });
  }
});

/**
 * GET /api/v1/clinica/nomine-ruolo/by-company/:companyTenantProfileId
 * Nomine di un'azienda specifica
 */
router.get('/by-company/:companyTenantProfileId', requirePermission('clinica:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { companyTenantProfileId } = req.params;

    const nomine = await NominaRuoloService.findByCompany(companyTenantProfileId, tenantId);
    res.json(nomine);
  } catch (error) {
    logger.error({ error: error.message }, 'Errore recupero nomine per azienda');
    res.status(500).json({ error: 'Errore recupero nomine per azienda' });
  }
});

/**
 * GET /api/v1/clinica/nomine-ruolo/by-person/:personId
 * Nomine di una persona specifica
 */
router.get('/by-person/:personId', requirePermission('clinica:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { personId } = req.params;

    const nomine = await NominaRuoloService.findByPerson(personId, tenantId);
    res.json(nomine);
  } catch (error) {
    logger.error({ error: error.message }, 'Errore recupero nomine per persona');
    res.status(500).json({ error: 'Errore recupero nomine per persona' });
  }
});

/**
 * GET /api/v1/clinica/nomine-ruolo/expiring/:days
 * Nomine in scadenza entro N giorni
 */
router.get('/expiring/:days', requirePermission('clinica:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const days = parseInt(req.params.days) || 30;

    const nomine = await NominaRuoloService.findExpiring(days, tenantId);
    res.json(nomine);
  } catch (error) {
    logger.error({ error: error.message }, 'Errore recupero nomine in scadenza');
    res.status(500).json({ error: 'Errore recupero nomine in scadenza' });
  }
});

/**
 * GET /api/v1/clinica/nomine-ruolo/stats
 * Statistiche nomine
 */
router.get('/stats', requirePermission('clinica:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const stats = await NominaRuoloService.getStats(tenantId);
    res.json(stats);
  } catch (error) {
    logger.error({ error: error.message }, 'Errore recupero statistiche nomine');
    res.status(500).json({ error: 'Errore recupero statistiche nomine' });
  }
});

/**
 * GET /api/v1/clinica/nomine-ruolo/:id
 * Dettaglio singola nomina
 */
router.get('/:id', requirePermission('clinica:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    const nomina = await NominaRuoloService.findById(id, tenantId);
    if (!nomina) {
      return res.status(404).json({ error: 'Nomina non trovata' });
    }

    res.json(nomina);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', nominaId: req.params.id }, 'Errore recupero nomina');
    res.status(500).json({ error: 'Errore recupero nomina' });
  }
});

/**
 * POST /api/v1/clinica/nomine-ruolo
 * Crea nuova nomina
 */
router.post('/', requirePermission('clinica:write'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const nominaData = req.body;

    // Validazione campi obbligatori
    if (!nominaData.personId || !nominaData.tipoRuolo || !nominaData.dataInizio) {
      return res.status(400).json({
        error: 'Campi obbligatori mancanti: personId, tipoRuolo, dataInizio'
      });
    }

    // UUID validation for body IDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(nominaData.personId)) {
      return res.status(400).json({ error: 'personId non valido' });
    }
    if (nominaData.siteId && !uuidRegex.test(nominaData.siteId)) {
      return res.status(400).json({ error: 'siteId non valido' });
    }
    if (nominaData.companyTenantProfileId && !uuidRegex.test(nominaData.companyTenantProfileId)) {
      return res.status(400).json({ error: 'companyTenantProfileId non valido' });
    }

    // Almeno sede o azienda deve essere specificata
    if (!nominaData.siteId && !nominaData.companyTenantProfileId) {
      return res.status(400).json({
        error: 'Specificare almeno siteId o companyTenantProfileId'
      });
    }

    // Risolvi Company.id → CompanyTenantProfile.id se necessario
    if (nominaData.companyTenantProfileId) {
      const profile = await prisma.companyTenantProfile.findFirst({
        where: {
          OR: [
            { id: nominaData.companyTenantProfileId, tenantId, deletedAt: null },
            { companyId: nominaData.companyTenantProfileId, tenantId, deletedAt: null }
          ]
        },
        select: { id: true }
      });
      if (!profile) {
        return res.status(404).json({ error: 'Azienda non trovata nel tenant corrente' });
      }
      nominaData.companyTenantProfileId = profile.id;
    }

    // Dedup: controlla se esiste già una nomina ATTIVA per stessa persona+azienda+ruolo
    // Permetti la creazione di successori se le date non si sovrappongono
    const existingNomina = await prisma.nominaRuolo.findFirst({
      where: {
        personId: nominaData.personId,
        tipoRuolo: nominaData.tipoRuolo,
        stato: 'ATTIVA',
        tenantId,
        deletedAt: null,
        ...(nominaData.companyTenantProfileId
          ? { companyTenantProfileId: nominaData.companyTenantProfileId }
          : { siteId: nominaData.siteId }),
      },
      select: { id: true, dataInizio: true, dataFine: true, dataScadenza: true }
    });
    if (existingNomina) {
      const existingEndDate = existingNomina.dataFine || existingNomina.dataScadenza;
      const newStartDate = nominaData.dataInizio ? new Date(nominaData.dataInizio) : new Date();

      // Se la nomina esistente non ha una data fine/scadenza, o la nuova inizia prima della fine della vecchia: blocca
      if (!existingEndDate || newStartDate <= new Date(existingEndDate)) {
        return res.status(409).json({
          error: 'Esiste già una nomina attiva per questa persona con lo stesso ruolo. Per nominare un successore, imposta una data inizio successiva alla scadenza della nomina corrente.',
          existingNominaId: existingNomina.id,
          existingEndDate: existingEndDate ? existingEndDate.toISOString().split('T')[0] : null,
        });
      }
      // Se la nuova inizia dopo la fine della vecchia: è un successore legittimo, procedi
    }

    const nomina = await NominaRuoloService.create(nominaData, tenantId);
    res.status(201).json(nomina);
    // Genera movimenti contabili in background (non-blocking)
    setImmediate(() =>
      MovimentoContabileGenerator.generaPerNomina(nomina, tenantId, req.person?.id)
        .catch(err => logger.warn({ nominaId: nomina.id, error: err.message }, 'Billing per nomina fallito'))
    );
  } catch (error) {
    if (error.message && error.message.startsWith('OVERLAP:')) {
      return res.status(409).json({ error: 'Sovrapposizione di date con una nomina esistente' });
    }
    logger.error({ error: error.message }, 'Errore creazione nomina');
    res.status(500).json({ error: 'Errore creazione nomina' });
  }
});

/**
 * PUT /api/v1/clinica/nomine-ruolo/:id
 * Aggiorna nomina
 */
router.put('/:id', requirePermission('clinica:write'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const updateData = req.body;

    const nomina = await NominaRuoloService.update(id, updateData, tenantId);

    // P-MDL: Aggiorna (o rigenera) MovimentiContabili BOZZA con i dati aggiornati
    setImmediate(() =>
      MovimentoContabileGenerator.aggiornaPerNomina(nomina, tenantId, req.person?.id || null)
    );

    res.json(nomina);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', nominaId: req.params.id }, 'Errore aggiornamento nomina');
    if (error.message === 'Nomina non trovata') {
      return res.status(404).json({ error: 'Errore interno del server' });
    }
    res.status(500).json({ error: 'Errore aggiornamento nomina' });
  }
});

/**
 * PUT /api/v1/clinica/nomine-ruolo/:id/cease
 * Cessa nomina
 */
router.put('/:id/cease', requirePermission('clinica:write'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const { dataFine } = req.body;

    const nomina = await NominaRuoloService.cease(id, dataFine ? new Date(dataFine) : null, tenantId);
    res.json(nomina);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', nominaId: req.params.id }, 'Errore cessazione nomina');
    if (error.message.includes('non trovata') || error.message.includes('Solo le nomine')) {
      return res.status(400).json({ error: 'Errore interno del server' });
    }
    res.status(500).json({ error: 'Errore cessazione nomina' });
  }
});

/**
 * PUT /api/v1/clinica/nomine-ruolo/:id/renew
 * Rinnova nomina: conferma lo stesso MC/RSPP oppure sostituisci con un altro.
 * Cessa la nomina corrente e crea la nuova con data inizio = giorno dopo dataFine.
 * Un solo movimento contabile per anno: non genera duplicati.
 */
router.put('/:id/renew', requirePermission('clinica:write'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const { newPersonId, dataFine } = req.body;

    // UUID validation for optional newPersonId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (newPersonId && !uuidRegex.test(newPersonId)) {
      return res.status(400).json({ error: 'newPersonId non valido' });
    }

    // Recupera nomina corrente
    const current = await prisma.nominaRuolo.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { person: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!current) {
      return res.status(404).json({ error: 'Nomina non trovata' });
    }
    if (current.stato !== 'ATTIVA') {
      return res.status(400).json({ error: 'Solo le nomine attive possono essere rinnovate' });
    }

    const effectiveDataFine = dataFine ? new Date(dataFine) : new Date();
    const personIdForRenewal = newPersonId || current.personId;

    // Cessa la nomina corrente
    await NominaRuoloService.cease(id, effectiveDataFine, tenantId);

    // Data inizio nuova nomina = giorno successivo alla cessazione
    const dataInizio = new Date(effectiveDataFine);
    dataInizio.setDate(dataInizio.getDate() + 1);

    // Crea nuova nomina (bypassa il dedup POST perché è un rinnovo legittimo)
    const newNomina = await NominaRuoloService.create({
      personId: personIdForRenewal,
      tipoRuolo: current.tipoRuolo,
      companyTenantProfileId: current.companyTenantProfileId,
      siteId: current.siteId,
      dataInizio,
      note: `Rinnovo da nomina ${current.id}`,
    }, tenantId);

    // Genera movimenti contabili solo se in un nuovo anno
    setImmediate(() =>
      MovimentoContabileGenerator.generaPerNomina(newNomina, tenantId, req.person?.id)
        .catch(err => logger.warn({ nominaId: newNomina.id, error: err.message }, 'Billing per rinnovo nomina fallito'))
    );

    res.json({
      success: true,
      message: 'Nomina rinnovata con successo',
      previousNominaId: id,
      newNomina,
    });
  } catch (error) {
    logger.error({ error: error.message, nominaId: req.params.id }, 'Errore rinnovo nomina');
    res.status(500).json({ error: 'Errore durante il rinnovo della nomina' });
  }
});

/**
 * PUT /api/v1/clinica/nomine-ruolo/:id/suspend
 * Sospendi nomina
 */
router.put('/:id/suspend', requirePermission('clinica:write'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo) {
      return res.status(400).json({ error: 'Motivo sospensione obbligatorio' });
    }

    const nomina = await NominaRuoloService.suspend(id, motivo, tenantId);
    res.json(nomina);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', nominaId: req.params.id }, 'Errore sospensione nomina');
    if (error.message.includes('non trovata') || error.message.includes('Solo le nomine')) {
      return res.status(400).json({ error: 'Errore interno del server' });
    }
    res.status(500).json({ error: 'Errore sospensione nomina' });
  }
});

/**
 * PUT /api/v1/clinica/nomine-ruolo/:id/reactivate
 * Riattiva nomina sospesa
 */
router.put('/:id/reactivate', requirePermission('clinica:write'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    const nomina = await NominaRuoloService.reactivate(id, tenantId);
    res.json(nomina);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', nominaId: req.params.id }, 'Errore riattivazione nomina');
    if (error.message.includes('non trovata') || error.message.includes('Solo le nomine')) {
      return res.status(400).json({ error: 'Errore interno del server' });
    }
    res.status(500).json({ error: 'Errore riattivazione nomina' });
  }
});

/**
 * PUT /api/v1/clinica/nomine-ruolo/:id/formazione
 * Aggiorna dati formazione
 */
router.put('/:id/formazione', requirePermission('clinica:write'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const formazioneData = req.body;

    const nomina = await NominaRuoloService.updateFormazione(id, formazioneData, tenantId);
    res.json(nomina);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', nominaId: req.params.id }, 'Errore aggiornamento formazione');
    if (error.message === 'Nomina non trovata') {
      return res.status(404).json({ error: 'Errore interno del server' });
    }
    res.status(500).json({ error: 'Errore aggiornamento formazione' });
  }
});

/**
 * DELETE /api/v1/clinica/nomine-ruolo/:id
 * Elimina nomina (soft delete)
 */
router.delete('/:id', requirePermission('clinica:delete'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    await NominaRuoloService.delete(id, tenantId);

    // P-MDL: Annulla movimenti BOZZA/CONFERMATO collegati alla nomina eliminata
    setImmediate(() =>
      MovimentoContabileGenerator.annullaMovimentiSorgente(
        { nominaRuoloId: id },
        tenantId,
        req.person?.id || null
      )
    );

    res.status(204).send();
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', nominaId: req.params.id }, 'Errore eliminazione nomina');
    if (error.message === 'Nomina non trovata') {
      return res.status(404).json({ error: 'Errore interno del server' });
    }
    res.status(500).json({ error: 'Errore eliminazione nomina' });
  }
});

/**
 * POST /api/v1/clinica/nomine-ruolo/rigenera-movimenti
 * Rigenera i movimenti contabili per tutte le nomine attive del tenant.
 * Utile per sanificare dati storici con stato BOZZA errato.
 * Chiama aggiornaPerNomina (invalida BOZZA → rigenera DA_FATTURARE).
 */
router.post('/rigenera-movimenti', requirePermission('clinica:write'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const updatedBy = req.person?.id || null;

    // Recupera tutte le nomine attive del tenant
    const nomine = await prisma.nominaRuolo.findMany({
      where: { tenantId, deletedAt: null, stato: { in: ['ATTIVA', 'SCADUTA'] } },
      include: {
        person: { select: { id: true, firstName: true, lastName: true, taxCode: true } },
      },
    });

    const results = { totale: nomine.length, ok: 0, errors: 0, warnings: [] };

    for (const nomina of nomine) {
      try {
        const generated = await MovimentoContabileGenerator.aggiornaPerNomina(nomina, tenantId, updatedBy);
        results.ok++;
        if (generated.warnings?.length > 0) results.warnings.push(...generated.warnings);
      } catch (err) {
        results.errors++;
        logger.warn({ nominaId: nomina.id, error: err.message }, 'Errore rigenerazione movimenti nomina');
      }
    }

    logger.info({ tenantId, ...results }, 'Rigenerazione movimenti nomine completata');
    res.json({ message: `Rigenerazione completata: ${results.ok} su ${results.totale} nomine aggiornate.`, ...results });
  } catch (error) {
    logger.error({ error: error.message }, 'Errore rigenera-movimenti nomine');
    res.status(500).json({ error: 'Errore rigenerazione movimenti nomine' });
  }
});

export default router;
