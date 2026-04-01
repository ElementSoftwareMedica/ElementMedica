/**
 * @file appuntamenti.routes.js
 * @description Routes per la gestione degli appuntamenti - Versione modulare
 * @module routes/clinica/appuntamenti
 *
 * @requires express
 * @requires ../../middleware/auth
 * @requires ../../middleware/advanced-permissions
 * @requires ../../controllers/clinica/appuntamentiController
 *
 * Routes:
 * - GET    /appuntamenti        - Lista appuntamenti con filtri
 * - GET    /appuntamenti/today  - Appuntamenti di oggi
 * - GET    /appuntamenti/:id    - Dettaglio appuntamento
 * - POST   /appuntamenti        - Crea nuovo appuntamento
 * - PUT    /appuntamenti/:id    - Aggiorna appuntamento
 * - PUT    /appuntamenti/:id/stato - Aggiorna stato
 * - DELETE /appuntamenti/:id    - Elimina appuntamento (soft delete)
 */

import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import { auditClinico } from './utils/clinica-utils.js';
import appuntamentiController from '../../controllers/clinica/appuntamentiController.js';
import { validateParamId } from '../../middleware/validateUUID.js';

const router = express.Router();
router.param('id', validateParamId);

// ============================================
// MIDDLEWARE COMUNI
// ============================================

/** Middleware di autenticazione e permessi lettura */
const readAccess = [
    authenticate,
    checkAdvancedPermission('agenda', 'read')
];

/** Middleware di autenticazione e permessi creazione */
const createAccess = [
    authenticate,
    checkAdvancedPermission('agenda', 'create')
];

/** Middleware di autenticazione e permessi modifica */
const updateAccess = [
    authenticate,
    checkAdvancedPermission('agenda', 'update')
];

/** Middleware di autenticazione e permessi eliminazione */
const deleteAccess = [
    authenticate,
    checkAdvancedPermission('agenda', 'delete')
];

// ============================================
// ROUTES LISTA
// ============================================

/**
 * @route GET /api/v1/clinica/appuntamenti/check-duplicate
 * @desc Check if patient has duplicate appointment with same doctor on same day
 * @access Authenticated + VIEW_AGENDA
 */
router.get('/check-duplicate',
    ...readAccess,
    appuntamentiController.checkDuplicate
);

/**
 * @route GET /api/v1/clinica/appuntamenti
 * @desc Lista appuntamenti con filtri e paginazione
 * @access Authenticated + VIEW_AGENDA
 */
router.get('/',
    ...readAccess,
    auditClinico('list_appuntamenti'),
    appuntamentiController.getAll
);

/**
 * @route GET /api/v1/clinica/appuntamenti/today
 * @desc Lista appuntamenti di oggi
 * @access Authenticated + VIEW_AGENDA
 */
router.get('/today',
    ...readAccess,
    auditClinico('list_appuntamenti_today'),
    appuntamentiController.getToday
);

/**
 * @route GET /api/v1/clinica/appuntamenti/paziente/:pazienteId
 * @desc Lista appuntamenti di un paziente
 * @access Authenticated + VIEW_AGENDA
 */
router.get('/paziente/:pazienteId',
    ...readAccess,
    auditClinico('list_appuntamenti_paziente'),
    appuntamentiController.getByPaziente
);

// ============================================
// ROUTES SINGOLO RECORD
// ============================================

/**
 * @route GET /api/v1/clinica/appuntamenti/:id
 * @desc Dettaglio appuntamento
 * @access Authenticated + VIEW_AGENDA
 */
router.get('/:id',
    ...readAccess,
    auditClinico('get_appuntamento'),
    appuntamentiController.getById
);

/**
 * @route POST /api/v1/clinica/appuntamenti
 * @desc Crea nuovo appuntamento
 * @access Authenticated + MANAGE_AGENDA
 */
router.post('/',
    ...createAccess,
    auditClinico('create_appuntamento'),
    appuntamentiController.create
);

/**
 * @route PUT /api/v1/clinica/appuntamenti/:id
 * @desc Aggiorna appuntamento
 * @access Authenticated + MANAGE_AGENDA
 */
router.put('/:id',
    ...updateAccess,
    auditClinico('update_appuntamento'),
    appuntamentiController.update
);

/**
 * @route PUT /api/v1/clinica/appuntamenti/:id/stato
 * @desc Aggiorna stato appuntamento
 * @access Authenticated + MANAGE_AGENDA
 */
router.put('/:id/stato',
    ...updateAccess,
    auditClinico('update_appuntamento_stato'),
    appuntamentiController.updateStato
);

/**
 * @route POST /api/v1/clinica/appuntamenti/:id/accetta
 * @desc Accetta paziente (check-in) - Cambia stato a IN_ATTESA
 * @access Authenticated + MANAGE_AGENDA
 */
router.post('/:id/accetta',
    ...updateAccess,
    auditClinico('accetta_paziente'),
    appuntamentiController.accetta
);

/**
 * @route POST /api/v1/clinica/appuntamenti/:id/chiama
 * @desc Chiama paziente dalla sala d'attesa - Cambia stato a IN_CORSO
 * @access Authenticated + MANAGE_AGENDA
 */
router.post('/:id/chiama',
    ...updateAccess,
    auditClinico('chiama_paziente'),
    appuntamentiController.chiama
);

/**
 * @route POST /api/v1/clinica/appuntamenti/:id/pagamento
 * @desc Registra pagamento - Gestisce pagamento anticipato o post-visita
 * @access Authenticated + MANAGE_AGENDA
 */
router.post('/:id/pagamento',
    ...updateAccess,
    auditClinico('registra_pagamento'),
    appuntamentiController.registraPagamento
);

/**
 * @route POST /api/v1/clinica/appuntamenti/:id/annulla-visita
 * @desc Annulla visita in corso: azzera oraInizio, riporta stato a PRENOTATO
 * @access Authenticated + MANAGE_AGENDA
 */
router.post('/:id/annulla-visita',
    ...updateAccess,
    auditClinico('annulla_visita'),
    appuntamentiController.annullaVisita
);

/**
 * @route DELETE /api/v1/clinica/appuntamenti/:id
 * @desc Elimina appuntamento (soft delete)
 * @access Authenticated + MANAGE_AGENDA
 */
router.delete('/:id',
    ...deleteAccess,
    auditClinico('delete_appuntamento'),
    appuntamentiController.remove
);

export default router;
