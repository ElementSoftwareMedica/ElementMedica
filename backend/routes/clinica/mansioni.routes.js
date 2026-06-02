/**
 * Mansioni Routes - P56 Medicina del Lavoro
 * 
 * API per gestione mansioni lavorative con rischi associati
 * secondo D.Lgs 81/08
 * 
 * @module routes/clinica/mansioni.routes
 */

import express from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import MansioneService from '../../services/clinical/MansioneService.js';
import { getEffectiveTenantId } from "../../utils/tenantHelper.js";
import logger from '../../utils/logger.js';
import { validateParamId, validateParam } from '../../middleware/validateUUID.js';

const router = express.Router();
router.param('id', validateParamId);
router.param('personId', validateParam('personId'));

/**
 * @route GET /api/v1/clinica/mansioni
 * @desc Lista mansioni con paginazione e filtri
 * @access Private - VIEW_VISITA
 */
router.get('/', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { page = 1, limit = 50, siteId, search } = req.query;

    const result = await MansioneService.findAll(tenantId, {
      page: parseInt(page),
      limit: parseInt(limit),
      siteId,
      search
    });

    res.json(result);
  } catch (error) {
    logger.error({ error: error.message }, 'Errore lista mansioni');
    res.status(500).json({ error: 'Errore nel recupero delle mansioni' });
  }
});

/**
 * @route GET /api/v1/clinica/mansioni/:id
 * @desc Dettaglio mansione con rischi e lavoratori
 * @access Private - VIEW_VISITA
 */
router.get('/:id', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    const mansione = await MansioneService.findById(id, tenantId);

    if (!mansione) {
      return res.status(404).json({ error: 'Mansione non trovata' });
    }

    res.json(mansione);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore dettaglio mansione');
    res.status(500).json({ error: 'Errore nel recupero della mansione' });
  }
});

/**
 * @route POST /api/v1/clinica/mansioni
 * @desc Crea nuova mansione con rischi
 * @access Private - CREATE_VISITA
 */
router.post('/', requireAuth, requirePermission('clinica.visite:create'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const data = req.body;

    // Validazione base
    if (!data.codice || !data.denominazione) {
      return res.status(400).json({
        error: 'Codice e denominazione sono obbligatori'
      });
    }

    const mansione = await MansioneService.create(data, tenantId);

    logger.info({
      mansioneId: mansione.id,
      codice: mansione.codice,
      personId: req.person.id,
      tenantId
    }, 'Mansione creata via API');

    res.status(201).json(mansione);
  } catch (error) {
    logger.error({ error: error.message }, 'Errore creazione mansione');

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Esiste già una mansione con questo codice'
      });
    }

    res.status(500).json({ error: 'Errore nella creazione della mansione' });
  }
});

/**
 * @route PUT /api/v1/clinica/mansioni/:id
 * @desc Aggiorna mansione
 * @access Private - EDIT_VISITA
 */
router.put('/:id', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const data = req.body;

    // Verifica esistenza
    const existing = await MansioneService.findById(id, tenantId);
    if (!existing) {
      return res.status(404).json({ error: 'Mansione non trovata' });
    }

    const mansione = await MansioneService.update(id, data, tenantId);

    logger.info({
      mansioneId: id,
      personId: req.person.id,
      tenantId
    }, 'Mansione aggiornata via API');

    res.json(mansione);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore aggiornamento mansione');
    res.status(500).json({ error: 'Errore nell\'aggiornamento della mansione' });
  }
});

/**
 * @route DELETE /api/v1/clinica/mansioni/:id
 * @desc Elimina mansione (soft delete)
 * @access Private - DELETE_VISITA
 */
router.delete('/:id', requireAuth, requirePermission('clinica.visite:delete'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    const existing = await MansioneService.findById(id, tenantId);
    if (!existing) {
      return res.status(404).json({ error: 'Mansione non trovata' });
    }

    await MansioneService.delete(id, tenantId);

    logger.info({
      mansioneId: id,
      personId: req.person.id,
      tenantId
    }, 'Mansione eliminata via API');

    res.json({ success: true, message: 'Mansione eliminata' });
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore eliminazione mansione');
    res.status(500).json({ error: 'Errore nell\'eliminazione della mansione' });
  }
});

/**
 * @route POST /api/v1/clinica/mansioni/:id/duplicate
 * @desc Duplica mansione esistente
 * @access Private - CREATE_VISITA
 */
router.post('/:id/duplicate', requireAuth, requirePermission('clinica.visite:create'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const { codice } = req.body;

    if (!codice) {
      return res.status(400).json({ error: 'Nuovo codice obbligatorio' });
    }

    const mansione = await MansioneService.duplicate(id, codice, tenantId);

    logger.info({
      sourceId: id,
      newId: mansione.id,
      personId: req.person.id,
      tenantId
    }, 'Mansione duplicata via API');

    res.status(201).json(mansione);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore duplicazione mansione');

    if (error.message === 'Mansione non trovata') {
      return res.status(404).json({ error: 'Errore interno del server' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Codice già esistente' });
    }

    res.status(500).json({ error: 'Errore nella duplicazione della mansione' });
  }
});

/**
 * @route POST /api/v1/clinica/mansioni/:id/assign
 * @desc Assegna mansione a un lavoratore
 * @access Private - EDIT_VISITA
 */
router.post('/:id/assign', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id: mansioneId } = req.params;
    const { personId, isPrimaria, dataInizio, note } = req.body;

    if (!personId) {
      return res.status(400).json({ error: 'ID lavoratore obbligatorio' });
    }

    const assignment = await MansioneService.assignToWorker(
      personId,
      mansioneId,
      { isPrimaria, dataInizio, note },
      tenantId
    );

    logger.info({
      mansioneId,
      personId,
      assignedBy: req.person.id,
      tenantId
    }, 'Mansione assegnata a lavoratore');

    res.status(201).json(assignment);
  } catch (error) {
    logger.error({ error: error.message }, 'Errore assegnazione mansione');

    if (error.message.includes('già assegnato')) {
      return res.status(409).json({ error: 'Errore interno del server' });
    }
    if (error.message.includes('non trovata')) {
      return res.status(404).json({ error: 'Errore interno del server' });
    }

    res.status(500).json({ error: 'Errore nell\'assegnazione della mansione' });
  }
});

/**
 * @route POST /api/v1/clinica/mansioni/:id/bulk-assign
 * @desc Assegna mansione a più lavoratori in blocco
 * @access Private - EDIT_VISITA
 */
router.post('/:id/bulk-assign', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id: mansioneId } = req.params;
    const { personIds, isPrimaria, dataInizio, note } = req.body;

    if (!personIds || !Array.isArray(personIds) || personIds.length === 0) {
      return res.status(400).json({ error: 'Lista ID lavoratori obbligatoria' });
    }

    const results = await MansioneService.bulkAssignToWorkers(
      personIds,
      mansioneId,
      { isPrimaria, dataInizio, note },
      tenantId
    );

    logger.info({
      mansioneId,
      total: personIds.length,
      assigned: results.assigned.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
      assignedBy: req.person.id,
      tenantId
    }, 'Bulk assign mansione completato');

    res.status(200).json(results);
  } catch (error) {
    logger.error({ error: error.message }, 'Errore bulk assegnazione mansione');
    res.status(500).json({ error: 'Errore nell\'assegnazione massiva della mansione' });
  }
});

/**
 * @route DELETE /api/v1/clinica/mansioni/assignment/:assignmentId
 * @desc Rimuove assegnazione mansione da lavoratore
 * @access Private - EDIT_VISITA
 */
router.delete('/assignment/:assignmentId', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { assignmentId } = req.params;

    await MansioneService.removeFromWorker(assignmentId, tenantId);

    logger.info({
      assignmentId,
      removedBy: req.person.id,
      tenantId
    }, 'Assegnazione mansione rimossa');

    res.json({ success: true, message: 'Assegnazione rimossa' });
  } catch (error) {
    logger.error({ error: error.message }, 'Errore rimozione assegnazione');
    res.status(500).json({ error: 'Errore nella rimozione dell\'assegnazione' });
  }
});

/**
 * @route GET /api/v1/clinica/mansioni/worker/:personId/risks
 * @desc Ottiene tutti i rischi di un lavoratore dalle sue mansioni
 * @access Private - VIEW_VISITA
 */
router.get('/worker/:personId/risks', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { personId } = req.params;

    const risks = await MansioneService.getWorkerRisks(personId, tenantId);

    res.json({ success: true, data: risks });
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', personId: req.params.personId }, 'Errore recupero rischi lavoratore');
    res.status(500).json({ error: 'Errore nel recupero dei rischi del lavoratore' });
  }
});

/**
 * @route GET /api/v1/clinica/mansioni/worker/:personId/occupational-profile
 * @desc Sincronizza e restituisce profilo MDL, rischi e storico occupazionale del lavoratore
 * @access Private - VIEW_VISITA
 */
router.get('/worker/:personId/occupational-profile', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { personId } = req.params;

    const syncResult = await MansioneService.ensureWorkerProtocolAssignments(personId, tenantId);
    const risks = await MansioneService.getWorkerRisks(personId, tenantId);
    const statoOccupazionale = await MansioneService.getOccupationalHistory(personId, tenantId);

    res.json({
      success: true,
      data: {
        ...risks,
        statoOccupazionale,
        syncResult
      }
    });
  } catch (error) {
    logger.error({ error: error.message, personId: req.params.personId }, 'Errore profilo occupazionale lavoratore');
    res.status(500).json({ error: 'Errore nel recupero del profilo occupazionale' });
  }
});

/**
 * @route PUT /api/v1/clinica/mansioni/worker/:personId/occupational-profile
 * @desc Aggiorna i dati occupazionali editabili del lavoratore
 * @access Private - EDIT_VISITA
 */
router.put('/worker/:personId/occupational-profile', requireAuth, requirePermission('clinica.visite:write'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { personId } = req.params;
    const updated = await MansioneService.updateWorkerOccupationalProfile(personId, req.body || {}, tenantId);
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error({ error: error.message, personId: req.params.personId }, 'Errore aggiornamento profilo occupazionale lavoratore');
    res.status(400).json({ error: 'Errore aggiornamento profilo occupazionale' });
  }
});

/**
 * @route POST /api/v1/clinica/mansioni/worker/:personId/rischio-aggiuntivo
 * @desc Aggiunge un rischio aggiuntivo specifico per lavoratore (non condiviso con altri sulla stessa mansione)
 * @access Private - EDIT_VISITA
 */
router.post('/worker/:personId/rischio-aggiuntivo', requireAuth, requirePermission('clinica.visite:write'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { personId } = req.params;
    const { codiceRischio, livello, categoria, descrizioneEsposizione, fonteRischio, periodicitaMesi, note } = req.body;

    if (!codiceRischio || !categoria) {
      return res.status(400).json({ error: 'codiceRischio e categoria sono obbligatori' });
    }

    const rischio = await MansioneService.addWorkerRischio(personId, {
      codiceRischio, livello, categoria, descrizioneEsposizione, fonteRischio, periodicitaMesi, note
    }, tenantId);

    res.status(201).json({ success: true, data: rischio });
  } catch (error) {
    logger.error({ error: error.message, personId: req.params.personId }, 'Errore aggiunta rischio aggiuntivo');
    if (error.message?.includes('già assegnato')) {
      return res.status(409).json({ error: 'Rischio già assegnato a questo lavoratore' });
    }
    res.status(500).json({ error: 'Errore nell\'aggiunta del rischio aggiuntivo' });
  }
});

/**
 * @route PUT /api/v1/clinica/mansioni/worker-rischio-aggiuntivo/:id
 * @desc Aggiorna un rischio aggiuntivo specifico per lavoratore
 * @access Private - EDIT_VISITA
 */
router.put('/worker-rischio-aggiuntivo/:id', requireAuth, requirePermission('clinica.visite:write'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const { livello, descrizioneEsposizione, fonteRischio, periodicitaMesi, note } = req.body;

    const rischio = await MansioneService.updateWorkerRischio(id, {
      livello, descrizioneEsposizione, fonteRischio, periodicitaMesi, note
    }, tenantId);

    res.json({ success: true, data: rischio });
  } catch (error) {
    logger.error({ error: error.message, id: req.params.id }, 'Errore aggiornamento rischio aggiuntivo');
    res.status(500).json({ error: 'Errore nell\'aggiornamento del rischio aggiuntivo' });
  }
});

/**
 * @route DELETE /api/v1/clinica/mansioni/worker-rischio-aggiuntivo/:id
 * @desc Rimuove (soft delete) un rischio aggiuntivo specifico per lavoratore
 * @access Private - EDIT_VISITA
 */
router.delete('/worker-rischio-aggiuntivo/:id', requireAuth, requirePermission('clinica.visite:write'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    await MansioneService.removeWorkerRischio(id, tenantId);

    res.json({ success: true, message: 'Rischio aggiuntivo rimosso' });
  } catch (error) {
    logger.error({ error: error.message, id: req.params.id }, 'Errore rimozione rischio aggiuntivo');
    res.status(500).json({ error: 'Errore nella rimozione del rischio aggiuntivo' });
  }
});

/**
 * @route POST /api/v1/clinica/mansioni/worker/:personId/initialize-risks
 * @desc Inizializza i rischi personalizzati copiandoli dalle mansioni attive del lavoratore
 * @access Private - EDIT_VISITA
 */
router.post('/worker/:personId/initialize-risks', requireAuth, requirePermission('clinica.visite:write'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { personId } = req.params;

    const result = await MansioneService.initializeWorkerRisks(personId, tenantId);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ error: error.message, personId: req.params.personId }, 'Errore inizializzazione rischi lavoratore');
    if (error.message?.includes('già rischi personalizzati')) {
      res.status(400).json({ error: 'Il lavoratore dispone già di rischi personalizzati' });
    } else {
      res.status(500).json({ error: 'Errore nell\'inizializzazione dei rischi' });
    }
  }
});

export default router;
