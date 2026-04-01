/**
 * Sicurezza Routes - Index
 * Aggregates all ElementSicurezza module sub-routers
 * 
 * Base path: /api/v1/sicurezza
 * 
 * @module routes/sicurezza
 * @version 1.0.0 - Initial OT23 implementation
 * @project P44 - ElementSicurezza Management
 */

import express from 'express';
import logger from '../../utils/logger.js';
import { authenticate } from '../../middleware/auth.js';

// Import sub-routers
import ot23Router from './ot23.routes.js';

const router = express.Router();

// ============================================
// HEALTH CHECK
// ============================================

router.get('/health', (req, res) => {
    res.json({
        success: true,
        module: 'sicurezza',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        routes: ['/ot23']
    });
});

// ============================================
// SUB-ROUTERS MOUNT
// ============================================

// OT23 - Modello riduzione tasso INAIL
// NOTA: authenticateToken è una factory function che restituisce il middleware
router.use('/ot23', authenticate, ot23Router);

// ============================================
// ENUMS ENDPOINT
// ============================================

/**
 * @route GET /api/v1/sicurezza/enums
 * @desc Ottieni enums per ElementSicurezza
 */
router.get('/enums', (req, res) => {
    res.json({
        success: true,
        data: {
            statoOT23: [
                { value: 'BOZZA', label: 'Bozza', color: 'gray' },
                { value: 'PRONTO', label: 'Pronto per invio', color: 'blue' },
                { value: 'INVIATO', label: 'Inviato', color: 'indigo' },
                { value: 'IN_VALUTAZIONE', label: 'In valutazione INAIL', color: 'yellow' },
                { value: 'APPROVATO', label: 'Approvato', color: 'green' },
                { value: 'RESPINTO', label: 'Respinto', color: 'red' },
                { value: 'INTEGRAZIONI_RICHIESTE', label: 'Integrazioni richieste', color: 'orange' },
                { value: 'SCADUTO', label: 'Scaduto', color: 'gray' }
            ],
            categorieInterventi: [
                { value: 'ORGANIZZATIVE', label: 'Misure Organizzative' },
                { value: 'TECNICHE', label: 'Misure Tecniche' },
                { value: 'FORMAZIONE', label: 'Formazione e Informazione' },
                { value: 'SORVEGLIANZA', label: 'Sorveglianza Sanitaria' },
                { value: 'EMERGENZE', label: 'Gestione Emergenze' },
                { value: 'ALTRO', label: 'Altro' }
            ]
        }
    });
});

export default router;
