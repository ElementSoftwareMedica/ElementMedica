/**
 * P66 - Scadenze Controller
 * 
 * Controller per gestione centralizzata scadenze e farmaci.
 * 
 * @module controllers/scadenze.controller
 * @project P66 - Sistema Scadenze Centralizzato
 */

import DeadlineService from '../services/scadenze/DeadlineService.js';
import FarmacoService from '../services/scadenze/FarmacoService.js';
import logger from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

// ============== DEADLINE ITEMS ==============

/**
 * GET /api/v1/scadenze
 * Ottiene tutte le scadenze con filtri
 */
export async function getAllDeadlines(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const filters = {
            categoria: req.query.categoria,
            status: req.query.status,
            priorita: req.query.priorita,
            dataInizio: req.query.dataInizio,
            dataFine: req.query.dataFine,
            responsabileId: req.query.responsabileId,
            search: req.query.search,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder
        };

        const result = await DeadlineService.getAll(tenantId, filters);
        res.json(result);
    } catch (error) {
        logger.error({ error: error.message }, 'Errore recupero scadenze');
        res.status(500).json({ error: 'Errore nel recupero scadenze' });
    }
}

/**
 * GET /api/v1/scadenze/stats
 * Ottiene statistiche dashboard
 */
export async function getDeadlineStats(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const stats = await DeadlineService.getStats(tenantId);
        res.json(stats);
    } catch (error) {
        logger.error({ error: error.message }, 'Errore recupero statistiche scadenze');
        res.status(500).json({ error: 'Errore nel recupero statistiche' });
    }
}

/**
 * GET /api/v1/scadenze/:id
 * Ottiene dettaglio scadenza
 */
export async function getDeadlineById(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        const deadline = await DeadlineService.getById(id, tenantId);
        if (!deadline) {
            return res.status(404).json({ error: 'Scadenza non trovata' });
        }

        res.json(deadline);
    } catch (error) {
        logger.error({ error: error.message, id: req.params.id }, 'Errore recupero scadenza');
        res.status(500).json({ error: 'Errore nel recupero scadenza' });
    }
}

/**
 * POST /api/v1/scadenze
 * Crea nuova scadenza
 */
export async function createDeadline(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const createdBy = req.person.id;
        const data = req.body;

        const deadline = await DeadlineService.create(data, tenantId, createdBy);
        res.status(201).json(deadline);
    } catch (error) {
        logger.error({ error: error.message }, 'Errore creazione scadenza');
        res.status(400).json({ error: 'Errore nella creazione scadenza' });
    }
}

/**
 * PUT /api/v1/scadenze/:id
 * Aggiorna scadenza
 */
export async function updateDeadline(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const data = req.body;

        const deadline = await DeadlineService.update(id, tenantId, data);
        res.json(deadline);
    } catch (error) {
        logger.error({ error: error.message, id: req.params.id }, 'Errore aggiornamento scadenza');
        res.status(400).json({ error: 'Errore nell\'aggiornamento scadenza' });
    }
}

/**
 * POST /api/v1/scadenze/:id/complete
 * Completa scadenza
 */
export async function completeDeadline(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const completatoDa = req.person.id;
        const { noteCompletamento } = req.body;

        const deadline = await DeadlineService.complete(id, tenantId, completatoDa, noteCompletamento);
        res.json(deadline);
    } catch (error) {
        logger.error({ error: error.message, id: req.params.id }, 'Errore completamento scadenza');
        res.status(400).json({ error: 'Errore nel completamento scadenza' });
    }
}

/**
 * DELETE /api/v1/scadenze/:id
 * Elimina scadenza (soft delete)
 */
export async function deleteDeadline(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const deletedBy = req.person.id;
        const { deletionReason } = req.body;

        if (!deletionReason || deletionReason.length < 10) {
            return res.status(400).json({
                error: 'La motivazione della cancellazione deve contenere almeno 10 caratteri'
            });
        }

        await DeadlineService.delete(id, tenantId, deletedBy, deletionReason);
        res.json({ success: true, message: 'Scadenza eliminata' });
    } catch (error) {
        logger.error({ error: error.message, id: req.params.id }, 'Errore eliminazione scadenza');
        res.status(400).json({ error: 'Errore nell\'eliminazione scadenza' });
    }
}

// ============== FARMACI ==============

/**
 * GET /api/v1/scadenze/farmaci
 * Ottiene tutti i farmaci con filtri
 */
export async function getAllFarmaci(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const filters = {
            ambulatorioId: req.query.ambulatorioId,
            ubicazione: req.query.ubicazione,
            formaFarmaceutica: req.query.formaFarmaceutica,
            inScadenza: req.query.inScadenza === 'true',
            sottoScorta: req.query.sottoScorta === 'true',
            search: req.query.search,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder
        };

        const result = await FarmacoService.getAll(tenantId, filters);
        res.json(result);
    } catch (error) {
        logger.error({ error: error.message }, 'Errore recupero farmaci');
        res.status(500).json({ error: 'Errore nel recupero farmaci' });
    }
}

/**
 * GET /api/v1/scadenze/farmaci/stats
 * Ottiene statistiche farmaci
 */
export async function getFarmaciStats(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const stats = await FarmacoService.getStats(tenantId);
        res.json(stats);
    } catch (error) {
        logger.error({ error: error.message }, 'Errore recupero statistiche farmaci');
        res.status(500).json({ error: 'Errore nel recupero statistiche' });
    }
}

/**
 * GET /api/v1/scadenze/farmaci/ubicazioni
 * Ottiene ubicazioni per autocomplete
 */
export async function getFarmaciUbicazioni(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const ubicazioni = await FarmacoService.getUbicazioni(tenantId);
        res.json(ubicazioni);
    } catch (error) {
        logger.error({ error: error.message }, 'Errore recupero ubicazioni');
        res.status(500).json({ error: 'Errore nel recupero ubicazioni' });
    }
}

/**
 * GET /api/v1/scadenze/farmaci/:id
 * Ottiene dettaglio farmaco
 */
export async function getFarmacoById(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        const farmaco = await FarmacoService.getById(id, tenantId);
        if (!farmaco) {
            return res.status(404).json({ error: 'Farmaco non trovato' });
        }

        res.json(farmaco);
    } catch (error) {
        logger.error({ error: error.message, id: req.params.id }, 'Errore recupero farmaco');
        res.status(500).json({ error: 'Errore nel recupero farmaco' });
    }
}

/**
 * POST /api/v1/scadenze/farmaci
 * Crea nuovo farmaco
 */
export async function createFarmaco(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const createdBy = req.person.id;
        const data = req.body;

        const farmaco = await FarmacoService.create(data, tenantId, createdBy);
        res.status(201).json(farmaco);
    } catch (error) {
        logger.error({ error: error.message }, 'Errore creazione farmaco');
        res.status(400).json({ error: 'Errore nella creazione farmaco' });
    }
}

/**
 * PUT /api/v1/scadenze/farmaci/:id
 * Aggiorna farmaco
 */
export async function updateFarmaco(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const data = req.body;

        const farmaco = await FarmacoService.update(id, tenantId, data);
        res.json(farmaco);
    } catch (error) {
        logger.error({ error: error.message, id: req.params.id }, 'Errore aggiornamento farmaco');
        res.status(400).json({ error: 'Errore nell\'aggiornamento farmaco' });
    }
}

/**
 * POST /api/v1/scadenze/farmaci/:id/quantita
 * Aggiorna quantità (carico/scarico)
 */
export async function updateFarmacoQuantita(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const operatoreId = req.person.id;
        const { delta, motivo } = req.body;

        if (typeof delta !== 'number') {
            return res.status(400).json({ error: 'Delta deve essere un numero' });
        }
        if (!motivo) {
            return res.status(400).json({ error: 'Motivo obbligatorio' });
        }

        const farmaco = await FarmacoService.updateQuantita(id, tenantId, delta, motivo, operatoreId);
        res.json(farmaco);
    } catch (error) {
        logger.error({ error: error.message, id: req.params.id }, 'Errore aggiornamento quantità farmaco');
        res.status(400).json({ error: 'Errore nell\'aggiornamento quantità' });
    }
}

/**
 * DELETE /api/v1/scadenze/farmaci/:id
 * Elimina farmaco (soft delete)
 */
export async function deleteFarmaco(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const deletedBy = req.person.id;
        const { deletionReason } = req.body;

        if (!deletionReason || deletionReason.length < 10) {
            return res.status(400).json({
                error: 'La motivazione della cancellazione deve contenere almeno 10 caratteri'
            });
        }

        await FarmacoService.delete(id, tenantId, deletedBy, deletionReason);
        res.json({ success: true, message: 'Farmaco eliminato' });
    } catch (error) {
        logger.error({ error: error.message, id: req.params.id }, 'Errore eliminazione farmaco');
        res.status(400).json({ error: 'Errore nell\'eliminazione farmaco' });
    }
}
