/**
 * Preventivi Workflow Routes
 * 
 * Gestione workflow stati preventivo:
 * - PUT /:id/stato - Cambia stato (con validazione transizioni)
 * 
 * @module routes/preventivi/workflow.routes
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
  validate
} from './common.js';

const router = express.Router();

/**
 * PUT /api/preventivi/:id/stato
 * Cambia stato preventivo (workflow)
 * 
 * Transizioni valide:
 * - BOZZA → INVIATO
 * - INVIATO → VISUALIZZATO, ACCETTATO, RIFIUTATO
 * - VISUALIZZATO → ACCETTATO, RIFIUTATO
 * - ACCETTATO → FATTURATO, ANNULLATO
 * - RIFIUTATO → ARCHIVIATO
 * - FATTURATO → ARCHIVIATO
 * - ANNULLATO → ARCHIVIATO
 */
router.put('/:id/stato',
  authenticate,
  requirePermissions(['preventivi:update']),
  auditLog('preventivi', 'UPDATE_STATO'),
  [
    param('id').isUUID(),
    body('nuovoStato').isIn(['BOZZA', 'INVIATO', 'VISUALIZZATO', 'ACCETTATO', 'RIFIUTATO', 'SCADUTO', 'CONVERTITO', 'FATTURATO', 'ANNULLATO', 'ARCHIVIATO']),
    body('note').optional().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.person;
      const { id } = req.params;
      const { nuovoStato, note } = req.body;

      const preventivo = await prisma.preventivo.findFirst({
        where: { id, tenantId, deletedAt: null }
      });

      if (!preventivo) {
        return res.status(404).json({
          success: false,
          error: 'Preventivo non trovato'
        });
      }

      // Valida transizione
      const transition = preventiviService.validateStateTransition(preventivo.stato, nuovoStato);
      if (!transition.valid) {
        return res.status(400).json({
          success: false,
          error: transition.error,
          allowedTransitions: transition.allowedTransitions
        });
      }

      // Update stato
      const now = new Date();
      const updateData = {
        stato: nuovoStato,
        updatedAt: now
      };

      // Traccia data invio
      if (nuovoStato === 'INVIATO' && !preventivo.dataInvio) {
        updateData.dataInvio = now;
      }

      // Traccia data accettazione/rifiuto
      if (nuovoStato === 'ACCETTATO') {
        updateData.dataAccettazione = now;
      } else if (nuovoStato === 'RIFIUTATO') {
        updateData.dataRifiuto = now;
      }

      // Aggiungi note se fornite
      if (note) {
        const noteAttuali = preventivo.note || '';
        updateData.note = `${noteAttuali}\n\n[${now.toISOString()}] Cambio stato → ${nuovoStato}: ${note}`.trim();
      }

      const preventivoAggiornato = await prisma.preventivo.update({
        where: { id },
        data: updateData,
        include: {
          companyTenantProfile: {
            select: { id: true, company: { select: { id: true, ragioneSociale: true } } }
          },
          persona: { select: { id: true, firstName: true, lastName: true } }
        }
      });

      // Map companyTenantProfile to azienda for frontend
      const { companyTenantProfile, ...preventivoRest } = preventivoAggiornato;
      const mappedPreventivo = { ...preventivoRest, azienda: companyTenantProfile?.company || null };

      res.json({
        success: true,
        data: mappedPreventivo,
        message: `Stato aggiornato: ${preventivo.stato} → ${nuovoStato}`
      });

      logger.info('Preventivo stato changed', {
        component: 'preventivi-routes',
        action: 'update_stato',
        preventivoId: id,
        numero: preventivo.numero,
        statoVecchio: preventivo.stato,
        statoNuovo: nuovoStato,
        userId,
        tenantId
      });

    } catch (error) {
      logger.error('Failed to change preventivo stato', {
        component: 'preventivi-routes',
        action: 'update_stato',
        preventivoId: req.params.id,
        error: 'Operazione non riuscita'
      });
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

export default router;
