/**
 * Activity Logs API Routes
 * Endpoints per visualizzazione e gestione log attività
 * 
 * GDPR Compliance:
 * - Access control basato su ruoli
 * - Solo dati propri per utenti standard
 * - Admin può vedere dati tenant
 * 
 * @module routes/activity/logs
 */

import express from 'express';
import authMiddleware from '../../../middleware/auth.js';
const { authenticate } = authMiddleware;
import { activityService, ActivityCategory, ActivityType } from '../../../services/activity/index.js';
import logger from '../../../utils/logger.js';
import { getEffectiveTenantId } from '../../../utils/tenantHelper.js';

const router = express.Router();

/**
 * GET /api/v1/activity/me
 * Ottieni le proprie attività
 * 
 * @query {number} [limit=50] - Limite risultati (max 100)
 * @query {number} [offset=0] - Offset per paginazione
 * @query {string} [category] - Filtra per categoria (AUTH, CRUD, etc.)
 * @query {string} [action] - Filtra per azione specifica
 * @query {string} [startDate] - Data inizio (ISO 8601)
 * @query {string} [endDate] - Data fine (ISO 8601)
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const {
      limit = 50,
      offset = 0,
      category,
      action,
      startDate,
      endDate
    } = req.query;

    const result = await activityService.getPersonActivities(req.person.id, {
      limit: Math.min(parseInt(limit) || 50, 100),
      offset: parseInt(offset) || 0,
      category: category || null,
      action: action || null,
      startDate: startDate || null,
      endDate: endDate || null,
      tenantId: getEffectiveTenantId(req)
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Activity API: Error getting personal activities', {
      component: 'activity-api',
      personId: req.person?.id,
      error: 'Operazione non riuscita'
    });
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero delle attività',
    });
  }
});

/**
 * GET /api/v1/activity/me/summary
 * Ottieni sommario delle proprie attività
 * 
 * @query {number} [days=30] - Periodo in giorni (max 365)
 */
router.get('/me/summary', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const summary = await activityService.getPersonActivitySummary(
      req.person.id,
      getEffectiveTenantId(req),
      Math.min(parseInt(days) || 30, 365)
    );

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    logger.error('Activity API: Error getting activity summary', {
      component: 'activity-api',
      personId: req.person?.id,
      error: 'Operazione non riuscita'
    });
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero del riepilogo attività',
    });
  }
});

/**
 * GET /api/v1/activity/persons/:personId
 * Ottieni attività di una specifica persona
 * Richiede ruolo ADMIN o SUPER_ADMIN
 * 
 * @param {string} personId - ID della persona
 * @query {number} [limit=50] - Limite risultati
 * @query {number} [offset=0] - Offset
 * @query {string} [category] - Categoria
 * @query {string} [action] - Azione
 * @query {string} [startDate] - Data inizio
 * @query {string} [endDate] - Data fine
 */
router.get('/persons/:personId', authenticate, async (req, res) => {
  try {
    const { personId } = req.params;

    // Verifica permessi admin
    const isAdmin = req.person.personRoles?.some(role =>
      ['ADMIN', 'SUPER_ADMIN'].includes(role.roleType)
    );

    if (!isAdmin && personId !== req.person.id) {
      return res.status(403).json({
        success: false,
        error: 'Accesso negato',
        message: 'Puoi visualizzare solo le tue attività'
      });
    }

    const {
      limit = 50,
      offset = 0,
      category,
      action,
      startDate,
      endDate
    } = req.query;

    const result = await activityService.getPersonActivities(personId, {
      limit: Math.min(parseInt(limit) || 50, 100),
      offset: parseInt(offset) || 0,
      category: category || null,
      action: action || null,
      startDate: startDate || null,
      endDate: endDate || null,
      tenantId: getEffectiveTenantId(req)
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Activity API: Error getting person activities', {
      component: 'activity-api',
      personId: req.params?.personId,
      error: 'Operazione non riuscita'
    });
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero delle attività',
    });
  }
});

/**
 * GET /api/v1/activity/persons/:personId/summary
 * Ottieni sommario attività di una persona
 * Richiede ruolo ADMIN o SUPER_ADMIN
 * 
 * @param {string} personId - ID della persona
 * @query {number} [days=30] - Periodo in giorni
 */
router.get('/persons/:personId/summary', authenticate, async (req, res) => {
  try {
    const { personId } = req.params;

    // Verifica permessi admin
    const isAdmin = req.person.personRoles?.some(role =>
      ['ADMIN', 'SUPER_ADMIN'].includes(role.roleType)
    );

    if (!isAdmin && personId !== req.person.id) {
      return res.status(403).json({
        success: false,
        error: 'Accesso negato',
        message: 'Puoi visualizzare solo il tuo riepilogo attività'
      });
    }

    const { days = 30 } = req.query;

    const summary = await activityService.getPersonActivitySummary(
      personId,
      getEffectiveTenantId(req),
      Math.min(parseInt(days) || 30, 365)
    );

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    logger.error('Activity API: Error getting person activity summary', {
      component: 'activity-api',
      personId: req.params?.personId,
      error: 'Operazione non riuscita'
    });
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero del riepilogo attività',
    });
  }
});

/**
 * POST /api/v1/activity/search
 * Ricerca avanzata attività
 * Richiede ruolo ADMIN o SUPER_ADMIN
 * 
 * @body {string} [personId] - Filtra per persona
 * @body {string[]} [actions] - Lista azioni
 * @body {string[]} [categories] - Lista categorie
 * @body {string} [resource] - Risorsa
 * @body {string} [resourceId] - ID risorsa
 * @body {boolean} [successOnly] - Solo successi
 * @body {string} [startDate] - Data inizio
 * @body {string} [endDate] - Data fine
 * @body {number} [limit=50] - Limite
 * @body {number} [offset=0] - Offset
 */
router.post('/search', authenticate, async (req, res) => {
  try {
    // Verifica permessi admin
    const isAdmin = req.person.personRoles?.some(role =>
      ['ADMIN', 'SUPER_ADMIN'].includes(role.roleType)
    );

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Accesso negato',
        message: 'Accesso amministratore richiesto per la ricerca'
      });
    }

    const {
      personId,
      actions,
      categories,
      resource,
      resourceId,
      successOnly,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.body;

    const result = await activityService.search({
      tenantId: getEffectiveTenantId(req),
      personId,
      actions,
      categories,
      resource,
      resourceId,
      successOnly,
      startDate,
      endDate,
      limit: Math.min(limit, 100),
      offset
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Activity API: Error searching activities', {
      component: 'activity-api',
      error: 'Operazione non riuscita'
    });
    res.status(500).json({
      success: false,
      error: 'Errore nella ricerca delle attività',
    });
  }
});

/**
 * GET /api/v1/activity/types
 * Ottieni lista dei tipi di attività disponibili
 */
router.get('/types', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      categories: Object.values(ActivityCategory),
      actions: Object.values(ActivityType)
    }
  });
});

export default router;
