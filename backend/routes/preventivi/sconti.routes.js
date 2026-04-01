/**
 * Preventivi Sconti Routes
 * 
 * Gestione sconti su preventivi:
 * - POST /:id/applica-sconto - Applica codice sconto
 * - DELETE /:id/sconti/:scontoId - Rimuove sconto
 * 
 * @module routes/preventivi/sconti.routes
 */

import {
  express,
  body,
  param,
  prisma,
  authenticate,
  requirePermissions,
  auditLog,
  logger,
  preventiviService,
  codiciScontoService,
  validate
} from './common.js';

const router = express.Router();

/**
 * POST /api/preventivi/:id/applica-sconto
 * Applica codice sconto a preventivo
 * 
 * Il codice viene validato per:
 * - Esistenza e attivazione
 * - Applicabilità al tipo servizio
 * - Limite utilizzi non raggiunto
 * - Validità temporale
 */
router.post('/:id/applica-sconto',
  authenticate,
  requirePermissions(['preventivi:update']),
  auditLog('preventivi', 'APPLY_DISCOUNT'),
  [
    param('id').isUUID(),
    body('codice').isString().trim().notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.person;
      const { id: preventivoId } = req.params;
      const { codice: codiceTesto } = req.body;

      // Recupera preventivo
      const preventivo = await prisma.preventivo.findFirst({
        where: { id: preventivoId, tenantId, deletedAt: null }
      });

      if (!preventivo) {
        return res.status(404).json({
          success: false,
          error: 'Preventivo non trovato'
        });
      }

      // Non permettere modifica sconti se stato finale
      if (['FATTURATO', 'ANNULLATO', 'ARCHIVIATO'].includes(preventivo.stato)) {
        return res.status(400).json({
          success: false,
          error: `Impossibile modificare sconti in stato ${preventivo.stato}`
        });
      }

      // Trova codice
      const codice = await prisma.codiceSconto.findFirst({
        where: {
          codice: codiceTesto.toUpperCase(),
          tenantId,
          deletedAt: null
        }
      });

      if (!codice) {
        return res.status(404).json({
          success: false,
          error: 'Codice sconto non trovato'
        });
      }

      // Valida applicabilità
      const clienteType = preventivo.aziendaId ? 'azienda' : 'persona';
      const clienteId = preventivo.aziendaId || preventivo.personaId;

      const validation = await codiciScontoService.validateCodeApplicability(
        codiceTesto,
        tenantId,
        {
          prezzoBase: Number(preventivo.prezzoTotale) - Number(preventivo.scontoTotale),
          tipoServizio: preventivo.tipoServizio,
          clienteId,
          clienteType,
          corsoId: preventivo.corsoId
        }
      );

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Codice non applicabile',
          details: validation.errors
        });
      }

      // Applica sconto in transazione
      const result = await prisma.$transaction(async (tx) => {
        return await preventiviService.applyDiscount(preventivoId, codice.id, {
          transaction: tx,
          userId
        });
      });

      res.json({
        success: true,
        data: result.preventivo,
        sconto: result.sconto,
        totali: result.totali,
        message: `Sconto ${codice.codice} applicato con successo`
      });

      logger.info('Discount applied to preventivo', {
        component: 'preventivi-routes',
        action: 'apply_discount',
        preventivoId,
        codiceId: codice.id,
        codice: codice.codice,
        importoSconto: result.sconto.importoScontato,
        userId,
        tenantId
      });

    } catch (error) {
      logger.error('Failed to apply discount', {
        component: 'preventivi-routes',
        action: 'apply_discount',
        preventivoId: req.params.id,
        error: 'Operazione non riuscita',
        stack: error.stack
      });

      // Gestisci errori specifici
      if (error.message.includes('già applicato')) {
        return res.status(409).json({
          success: false,
          error: 'Errore interno del server'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

/**
 * DELETE /api/preventivi/:id/sconti/:scontoId
 * Rimuove sconto da preventivo
 * 
 * Lo sconto viene rimosso (soft delete) e i totali ricalcolati.
 */
router.delete('/:id/sconti/:scontoId',
  authenticate,
  requirePermissions(['preventivi:update']),
  auditLog('preventivi', 'REMOVE_DISCOUNT'),
  [
    param('id').isUUID(),
    param('scontoId').isUUID()
  ],
  validate,
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.person;
      const { id: preventivoId, scontoId } = req.params;

      // Verifica preventivo
      const preventivo = await prisma.preventivo.findFirst({
        where: { id: preventivoId, tenantId, deletedAt: null }
      });

      if (!preventivo) {
        return res.status(404).json({
          success: false,
          error: 'Preventivo non trovato'
        });
      }

      // Non permettere modifica sconti se stato finale
      if (['FATTURATO', 'ANNULLATO', 'ARCHIVIATO'].includes(preventivo.stato)) {
        return res.status(400).json({
          success: false,
          error: `Impossibile modificare sconti in stato ${preventivo.stato}`
        });
      }

      // Rimuovi sconto in transazione
      const result = await prisma.$transaction(async (tx) => {
        return await preventiviService.removeDiscount(preventivoId, scontoId, {
          transaction: tx,
          userId
        });
      });

      res.json({
        success: true,
        data: result.preventivo,
        totali: result.totali,
        message: 'Sconto rimosso con successo'
      });

      logger.info('Discount removed from preventivo', {
        component: 'preventivi-routes',
        action: 'remove_discount',
        preventivoId,
        scontoId,
        userId,
        tenantId
      });

    } catch (error) {
      logger.error('Failed to remove discount', {
        component: 'preventivi-routes',
        action: 'remove_discount',
        preventivoId: req.params.id,
        scontoId: req.params.scontoId,
        error: 'Operazione non riuscita'
      });

      if (error.message.includes('non trovato')) {
        return res.status(404).json({
          success: false,
          error: 'Errore interno del server'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

export default router;
