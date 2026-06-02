/**
 * Public Contact Submissions Routes
 * Route pubbliche per contact submissions (richieste informazioni corsi, etc.)
 */

import express from 'express';
import { createSubmission } from '../controllers/contactSubmissionController.js';
import { rateLimitMiddleware } from '../middleware/rateLimiting.js';
import { publicContentMiddleware } from '../middleware/brandDetection.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Resolve publicTenantId from X-Frontend-Id brand header
router.use(publicContentMiddleware);

/**
 * POST /api/public/contact-submissions
 * Crea una nuova contact submission pubblica
 * SECURITY: Rate limiting (5 submissions/5min per IP)
 */
router.post('/',
    rateLimitMiddleware('public-contact-submit', { windowMs: 300000, max: 5 }), // 5 ogni 5 minuti
    async (req, res) => {
        try {
            // Mappa i campi dal frontend ai campi del controller
            const {
                requestType,
                name,
                email,
                phone,
                company,
                subject,
                message,
                courseTitle,
                courseVariant,
                selectedVariant,
                privacyAccepted,
                marketingAccepted
            } = req.body;

            // Determina il subject: usa quello fornito o genera uno dal requestType/courseTitle
            let finalSubject = subject;
            if (!finalSubject || finalSubject === 'info') {
                if (courseTitle) {
                    finalSubject = `Richiesta ${requestType === 'info' ? 'Informazioni' : requestType === 'preventivo' ? 'Preventivo' : 'Iscrizione'} - ${courseTitle}`;
                } else if (requestType) {
                    finalSubject = `Richiesta ${requestType === 'info' ? 'Informazioni' : requestType === 'preventivo' ? 'Preventivo' : requestType}`;
                } else {
                    finalSubject = 'Richiesta informazioni generiche';
                }
            }

            // Determina il messaggio: usa quello fornito o genera uno
            let finalMessage = message;
            if (!finalMessage && (courseVariant || selectedVariant)) {
                finalMessage = `Variante corso: ${courseVariant || selectedVariant}`;
            }

            // Prepara i dati per il controller esistente
            req.body = {
                type: 'CONTACT', // Usiamo CONTACT come tipo valido dell'enum SubmissionType
                name,
                email,
                phone,
                company,
                subject: finalSubject,
                message: finalMessage,
                source: courseTitle ? 'public_course_page' : 'public_contact_form',
                privacyAccepted: privacyAccepted === true || privacyAccepted === 'true',
                marketingAccepted: marketingAccepted === true || marketingAccepted === 'true',
                metadata: {
                    requestType,
                    courseTitle,
                    courseVariant,
                    selectedVariant,
                    submittedAt: new Date().toISOString()
                }
            };

            // Chiama il controller esistente
            await createSubmission(req, res);
        } catch (error) {
            logger.error({ component: 'public-contact-submissions-routes', error: error.message }, 'Error processing contact submission');
            res.status(500).json({
                error: 'Errore interno',
                message: 'Si è verificato un errore durante l\'invio della richiesta'
            });
        }
    }
);

export default router;
