/**
 * P66 - Scadenze Routes
 * 
 * Routes per gestione centralizzata scadenze e farmaci.
 * IMPORTANTE: L'ordine delle route è critico! Le route più specifiche
 * devono venire PRIMA delle route con parametri dinamici.
 * 
 * @module routes/scadenze-routes
 * @project P66 - Sistema Scadenze Centralizzato
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import * as scadenzeController from '../controllers/scadenze.controller.js';
import { validateParamId } from '../middleware/validateUUID.js';

const router = express.Router();

// All scadenze routes require authentication
router.use(authenticate);

router.param('id', validateParamId);

// ============================================
// FARMACI ROUTES (devono venire PRIMA di /:id)
// ============================================

// GET /api/v1/scadenze/farmaci - Lista farmaci
router.get('/farmaci',
    requirePermission('scadenze:read'),
    scadenzeController.getAllFarmaci
);

// GET /api/v1/scadenze/farmaci/stats - Statistiche farmaci
router.get('/farmaci/stats',
    requirePermission('scadenze:read'),
    scadenzeController.getFarmaciStats
);

// GET /api/v1/scadenze/farmaci/ubicazioni - Ubicazioni per autocomplete
router.get('/farmaci/ubicazioni',
    requirePermission('scadenze:read'),
    scadenzeController.getFarmaciUbicazioni
);

// GET /api/v1/scadenze/farmaci/:id - Dettaglio farmaco
router.get('/farmaci/:id',
    requirePermission('scadenze:read'),
    scadenzeController.getFarmacoById
);

// POST /api/v1/scadenze/farmaci - Crea farmaco
router.post('/farmaci',
    requirePermission('scadenze:write'),
    scadenzeController.createFarmaco
);

// PUT /api/v1/scadenze/farmaci/:id - Aggiorna farmaco
router.put('/farmaci/:id',
    requirePermission('scadenze:write'),
    scadenzeController.updateFarmaco
);

// POST /api/v1/scadenze/farmaci/:id/quantita - Carico/scarico quantità
router.post('/farmaci/:id/quantita',
    requirePermission('scadenze:write'),
    scadenzeController.updateFarmacoQuantita
);

// DELETE /api/v1/scadenze/farmaci/:id - Elimina farmaco
router.delete('/farmaci/:id',
    requirePermission('scadenze:delete'),
    scadenzeController.deleteFarmaco
);

// ============================================
// DEADLINE ITEMS ROUTES
// ============================================

// GET /api/v1/scadenze - Lista scadenze con filtri
router.get('/',
    requirePermission('scadenze:read'),
    scadenzeController.getAllDeadlines
);

// GET /api/v1/scadenze/stats - Statistiche dashboard
router.get('/stats',
    requirePermission('scadenze:read'),
    scadenzeController.getDeadlineStats
);

// POST /api/v1/scadenze - Crea scadenza
router.post('/',
    requirePermission('scadenze:write'),
    scadenzeController.createDeadline
);

// GET /api/v1/scadenze/:id - Dettaglio scadenza (DOPO le route specifiche!)
router.get('/:id',
    requirePermission('scadenze:read'),
    scadenzeController.getDeadlineById
);

// PUT /api/v1/scadenze/:id - Aggiorna scadenza
router.put('/:id',
    requirePermission('scadenze:write'),
    scadenzeController.updateDeadline
);

// POST /api/v1/scadenze/:id/complete - Completa scadenza
router.post('/:id/complete',
    requirePermission('scadenze:write'),
    scadenzeController.completeDeadline
);

// DELETE /api/v1/scadenze/:id - Elimina scadenza
router.delete('/:id',
    requirePermission('scadenze:delete'),
    scadenzeController.deleteDeadline
);

export default router;
