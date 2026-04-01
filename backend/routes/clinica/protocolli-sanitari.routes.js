/**
 * Protocolli Sanitari Routes - P56 Medicina del Lavoro
 * 
 * API per gestione protocolli sanitari con prestazioni associate
 * secondo D.Lgs 81/08
 * 
 * @module routes/clinica/protocolli-sanitari.routes
 */

import express from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import ProtocolloSanitarioService from '../../services/clinical/ProtocolloSanitarioService.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import logger from '../../utils/logger.js';
import { validateParamId, validateParam } from '../../middleware/validateUUID.js';

const router = express.Router();
router.param('id', validateParamId);
router.param('siteId', validateParam('siteId'));

/**
 * @route GET /api/v1/clinica/protocolli-sanitari
 * @desc Lista protocolli sanitari con paginazione e filtri
 * @access Private - VIEW_VISITA
 */
router.get('/', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { page = 1, limit = 50, mansioneId, siteId, search, isAttivo } = req.query;

    const result = await ProtocolloSanitarioService.findAll(tenantId, {
      page: parseInt(page),
      limit: parseInt(limit),
      mansioneId,
      siteId,
      search,
      isAttivo: isAttivo === 'true' ? true : isAttivo === 'false' ? false : undefined
    });

    res.json(result);
  } catch (error) {
    logger.error({ error: error.message }, 'Errore lista protocolli sanitari');
    res.status(500).json({ error: 'Errore nel recupero dei protocolli sanitari' });
  }
});

/**
 * @route GET /api/v1/clinica/protocolli-sanitari/by-mansione/:mansioneId
 * @desc Lista protocolli per mansione
 * @access Private - VIEW_VISITA
 */
router.get('/by-mansione/:mansioneId', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { mansioneId } = req.params;

    const protocolli = await ProtocolloSanitarioService.findByMansione(mansioneId, tenantId);
    res.json(protocolli);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', mansioneId: req.params.mansioneId }, 'Errore protocolli per mansione');
    res.status(500).json({ error: 'Errore nel recupero dei protocolli' });
  }
});

/**
 * @route GET /api/v1/clinica/protocolli-sanitari/by-site/:siteId
 * @desc Lista protocolli per sede
 * @access Private - VIEW_VISITA
 */
router.get('/by-site/:siteId', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { siteId } = req.params;

    const protocolli = await ProtocolloSanitarioService.findBySite(siteId, tenantId);
    res.json(protocolli);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', siteId: req.params.siteId }, 'Errore protocolli per sede');
    res.status(500).json({ error: 'Errore nel recupero dei protocolli' });
  }
});

/**
 * @route GET /api/v1/clinica/protocolli-sanitari/suggest/:mansioneId
 * @desc Suggerisci protocollo da rischi mansione
 * @access Private - VIEW_VISITA
 */
router.get('/suggest/:mansioneId', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { mansioneId } = req.params;

    const suggestion = await ProtocolloSanitarioService.suggestFromMansione(mansioneId, tenantId);
    res.json(suggestion);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', mansioneId: req.params.mansioneId }, 'Errore suggerimento protocollo');
    res.status(error.message.includes('non trovata') ? 404 : 500).json({
      error: 'Errore nel suggerimento del protocollo'
    });
  }
});

/**
 * @route GET /api/v1/clinica/protocolli-sanitari/:id
 * @desc Dettaglio protocollo con prestazioni
 * @access Private - VIEW_VISITA
 */
router.get('/:id', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    const protocollo = await ProtocolloSanitarioService.findById(id, tenantId);

    if (!protocollo) {
      return res.status(404).json({ error: 'Protocollo non trovato' });
    }

    res.json(protocollo);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore dettaglio protocollo');
    res.status(500).json({ error: 'Errore nel recupero del protocollo' });
  }
});

/**
 * @route GET /api/v1/clinica/protocolli-sanitari/:id/cost
 * @desc Calcolo costo stimato protocollo
 * @access Private - VIEW_VISITA
 */
router.get('/:id/cost', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    const cost = await ProtocolloSanitarioService.calculateCost(id, tenantId);
    res.json(cost);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore calcolo costo protocollo');
    res.status(error.message.includes('non trovato') ? 404 : 500).json({
      error: 'Errore nel calcolo del costo'
    });
  }
});

/**
 * @route POST /api/v1/clinica/protocolli-sanitari
 * @desc Crea nuovo protocollo sanitario con prestazioni
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

    const protocollo = await ProtocolloSanitarioService.create(data, tenantId);
    res.status(201).json(protocollo);
  } catch (error) {
    logger.error({ error: error.message }, 'Errore creazione protocollo');
    res.status(error.message.includes('già esistente') ? 409 : 500).json({
      error: 'Errore nella creazione del protocollo'
    });
  }
});

/**
 * @route PUT /api/v1/clinica/protocolli-sanitari/:id
 * @desc Aggiorna protocollo sanitario
 * @access Private - UPDATE_VISITA
 */
router.put('/:id', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const data = req.body;

    const protocollo = await ProtocolloSanitarioService.update(id, data, tenantId);
    res.json(protocollo);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore aggiornamento protocollo');
    const status = error.message.includes('non trovato') ? 404 :
      error.message.includes('già esistente') ? 409 : 500;
    res.status(status).json({
      error: 'Errore nell\'aggiornamento del protocollo'
    });
  }
});

/**
 * @route PUT /api/v1/clinica/protocolli-sanitari/:id/activate
 * @desc Attiva/Disattiva protocollo
 * @access Private - UPDATE_VISITA
 */
router.put('/:id/activate', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const { isAttivo } = req.body;

    if (typeof isAttivo !== 'boolean') {
      return res.status(400).json({ error: 'isAttivo deve essere booleano' });
    }

    const protocollo = await ProtocolloSanitarioService.setActive(id, isAttivo, tenantId);
    res.json(protocollo);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore attivazione protocollo');
    res.status(error.message.includes('non trovato') ? 404 : 500).json({
      error: 'Errore nell\'attivazione del protocollo'
    });
  }
});

/**
 * @route POST /api/v1/clinica/protocolli-sanitari/:id/duplicate
 * @desc Duplica protocollo
 * @access Private - CREATE_VISITA
 */
router.post('/:id/duplicate', requireAuth, requirePermission('clinica.visite:create'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const options = req.body;

    const protocollo = await ProtocolloSanitarioService.duplicate(id, options, tenantId);
    res.status(201).json(protocollo);
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore duplicazione protocollo');
    const status = error.message.includes('non trovato') ? 404 :
      error.message.includes('già esistente') ? 409 : 500;
    res.status(status).json({
      error: 'Errore nella duplicazione del protocollo'
    });
  }
});

/**
 * @route DELETE /api/v1/clinica/protocolli-sanitari/:id
 * @desc Elimina protocollo (soft delete)
 * @access Private - DELETE_VISITA
 */
router.delete('/:id', requireAuth, requirePermission('clinica.visite:delete'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    await ProtocolloSanitarioService.delete(id, tenantId);
    res.json({ success: true, message: 'Protocollo eliminato con successo' });
  } catch (error) {
    logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore eliminazione protocollo');
    res.status(error.message.includes('non trovato') ? 404 : 500).json({
      error: 'Errore nell\'eliminazione del protocollo'
    });
  }
});

export default router;
