/**
 * Attestati Email Routes
 * 
 * Gestione invio email attestati:
 * - POST /:id/send-email - Invio singolo attestato via email
 * 
 * @module routes/attestati/email.routes
 */

import {
  express,
  prisma,
  authenticateToken,
  requirePermission,
  body,
  validationResult,
  logger
} from './common.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';

const router = express.Router();

/**
 * POST /api/v1/attestati/:id/send-email
 * Send certificate via email
 */
router.post(
  '/:id/send-email',
  authenticateToken,
  requirePermission('documents:create'),
  [
    body('recipientEmail').optional().isEmail().withMessage('Valid email required'),
    body('subject').optional().isString().withMessage('Subject must be string'),
    body('message').optional().isString().withMessage('Message must be string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { recipientEmail, subject, message } = req.body;
      const tenantId = getEffectiveTenantId(req);

      // Get certificate
      const attestato = await prisma.attestato.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null
        },
        include: {
          person: {
            include: {
              tenantProfiles: {
                where: { tenantId, deletedAt: null },
                take: 1,
                select: { email: true }
              }
            }
          },
          scheduledCourse: {
            include: { course: true }
          }
        }
      });

      if (!attestato) {
        return res.status(404).json({ error: 'Certificato non trovato' });
      }

      // P48: email dal profilo tenant, non da Person
      const email = recipientEmail || attestato.person.tenantProfiles?.[0]?.email;
      if (!email) {
        return res.status(400).json({ error: 'Nessun indirizzo email disponibile' });
      }

      // TODO: Implement email sending via email service
      logger.info('Certificate email send requested', {
        component: 'attestati-routes',
        action: 'send-email',
        attestatoId: id,
        recipientEmail: email,
        personId: req.person?.id
      });

      // Mock success response
      res.json({
        message: 'Richiesta invio email accodata',
        recipientEmail: email,
        attestatoId: id
      });

    } catch (error) {
      logger.error('Failed to send certificate email', {
        component: 'attestati-routes',
        action: 'send-email',
        attestatoId: req.params.id,
        error: 'Operazione non riuscita',
        personId: req.person?.id
      });
      res.status(500).json({ error: 'Errore nell\'invio dell\'email del certificato' });
    }
  }
);

export default router;
