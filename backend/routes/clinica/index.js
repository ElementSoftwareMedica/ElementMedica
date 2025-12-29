/**
 * Clinical Routes - Index
 * Aggregates all clinical module sub-routers
 * 
 * Base path: /api/v1/clinica
 * 
 * @module routes/clinica
 * @version 2.0.0 - Modular architecture
 */

import express from 'express';
import logger from '../../utils/logger.js';
import { CLINICAL_ENUMS } from '../../config/validation-clinical.js';
import middleware from '../../auth/middleware.js';

// Import sub-routers (modular)
import poliambulatoriRouter from './poliambulatori.routes.js';
import ambulatoriRouter from './ambulatori.routes.js';
import prestazioniRouter from './prestazioni.routes.js';
import mediciRouter from './medici.routes.js';
import strumentiRouter from './strumenti.routes.js';
import visiteRouter from './visite.routes.js';
import refertiRouter from './referti.routes.js';
// Future imports - will be added as files are created:
// import sediRouter from './sedi.routes.js';
// import mediciRouter from './medici.routes.js';
// import strumentiRouter from './strumenti.routes.js';
// import appuntamentiRouter from './appuntamenti.routes.js';
// import visiteRouter from './visite.routes.js';
// import refertiRouter from './referti.routes.js';
// import slotsRouter from './slots.routes.js';
// import scontiRouter from './sconti.routes.js';
// import orariRouter from './orari.routes.js';
// import templateCampiRouter from './template-campi.routes.js';
// import documentiRouter from './documenti.routes.js';
// import fattureRouter from './fatture.routes.js';
// import manutenzioniRouter from './manutenzioni.routes.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// ============================================
// HEALTH CHECK
// ============================================

router.get('/health', (req, res) => {
    res.json({
        success: true,
        module: 'clinical',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// ENUMS ENDPOINT
// ============================================

router.get('/enums', authenticateToken(), (req, res) => {
    res.json({
        success: true,
        data: CLINICAL_ENUMS
    });
});

// ============================================
// MOUNT SUB-ROUTERS
// ============================================

router.use('/poliambulatori', poliambulatoriRouter);
router.use('/ambulatori', ambulatoriRouter);
router.use('/prestazioni', prestazioniRouter);
router.use('/medici', mediciRouter);
router.use('/strumenti', strumentiRouter);
router.use('/visite', visiteRouter);
router.use('/referti', refertiRouter);

// Future mounts - will be enabled as files are created:
// router.use('/sedi', sediRouter);
// router.use('/bundle', bundleRouter);
// router.use('/convenzioni', convenzioniRouter);
// router.use('/slots', slotsRouter);
// router.use('/listini', listiniRouter);
// router.use('/strumenti', strumentiRouter);
// router.use('/appuntamenti', appuntamentiRouter);
// router.use('/visite', visiteRouter);
// router.use('/referti', refertiRouter);
// router.use('/slots', slotsRouter);
// router.use('/sconti', scontiRouter);
// router.use('/orari-ambulatorio', orariRouter);
// router.use('/template-campi', templateCampiRouter);
// router.use('/documenti', documentiRouter);
// router.use('/fatture', fattureRouter);
// router.use('/manutenzioni', manutenzioniRouter);

// ============================================
// ERROR HANDLER
// ============================================

router.use((error, req, res, next) => {
    logger.error('Clinical routes error', {
        component: 'clinica-routes-index',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        path: req.path,
        method: req.method
    });

    res.status(error.status || 500).json({
        success: false,
        error: 'Errore nel modulo clinico',
        message: error.message
    });
});

export default router;
