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
import middleware from '../../middleware/auth.js';

// Import sub-routers (modular)
import poliambulatoriRouter from './poliambulatori.routes.js';
import ambulatoriRouter from './ambulatori.routes.js';
import prestazioniRouter from './prestazioni.routes.js';
import mediciRouter from './medici.routes.js';
import strumentiRouter from './strumenti.routes.js';
import visiteRouter from './visite.routes.js';
import refertiRouter from './referti.routes.js';
import sediRouter from './sedi.routes.js';
import bundleRouter from './bundle.routes.js';
import convenzioniRouter from './convenzioni.routes.js';
import manutenzioniRouter from './manutenzioni.routes.js';
import slotsRouter from './slots.routes.js';
import listiniRouter from './listini.routes.js';
import tariffarioMedicoRouter from './tariffario-medico.routes.js';
import orariAmbulatorioRouter from './orari-ambulatorio.routes.js';
import documentiClinici from './documenti-clinici.routes.js';
import appuntamentiRouter from './appuntamenti.routes.js';
import appuntamentoPrestazioniRouter from './appuntamentoPrestazioni.routes.js';
import scontiRouter from './sconti.routes.js';
import allegato3aRouter from './allegato-3a.routes.js';
import allegato3bRouter from './allegato-3b.routes.js';
import consensoFirmaRouter from './consenso-firma.routes.js';
import consensoModuliRouter from './consenso-moduli.routes.js';
import consuntivoRouter from './consuntivo.routes.js';
import disponibilitaRouter from './disponibilita.routes.js';
import emailTemplatesRouter from './email-templates.routes.js';
import fascicoloSanitarioRouter from './fascicolo-sanitario.routes.js';
import ferieRouter from './ferie.routes.js';
import giudiziIdoneitaRouter from './giudizi-idoneita.routes.js';
import malattieProfessionaliRouter from './malattie-professionali.routes.js';
import mansioniRouter from './mansioni.routes.js';
import mediciDocumentsRouter from './medici-documents.routes.js';
import modulisticaRouter from './modulistica.routes.js';
import nomineRuoloRouter from './nomine-ruolo.routes.js';
import pazientiRouter from './pazienti.routes.js';
import pecConfigRouter from './pec-config.routes.js';
import pecRouter from './pec.routes.js';
import profiloSaluteRouter from './profilo-salute.routes.js';
import protocolliSanitariRouter from './protocolli-sanitari.routes.js';
import queueRouter from './queue.routes.js';
import rischioPrestazioniRouter from './rischio-prestazioni.routes.js';
import scadenzeMdlRouter from './scadenze-mdl.routes.js';
import strumentiBridgeRouter from './strumenti-bridge.routes.js';
import tabletSessionRouter from './tablet-session.routes.js';
import visitTemplatesRouter from './visit-templates.routes.js';
import questionariRouter from '../v1/clinica/questionari-routes.js';

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

router.get('/enums', authenticateToken, (req, res) => {
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
router.use('/sedi', sediRouter);
router.use('/bundle', bundleRouter);
router.use('/convenzioni', convenzioniRouter);
router.use('/manutenzioni', manutenzioniRouter);
router.use('/slots', slotsRouter);
router.use('/listini', listiniRouter);
router.use('/tariffario-medico', tariffarioMedicoRouter);
router.use('/orari-ambulatorio', orariAmbulatorioRouter);
router.use('/documenti', documentiClinici);
router.use('/appuntamenti', appuntamentiRouter);
router.use('/', appuntamentoPrestazioniRouter);
router.use('/sconti', scontiRouter);
router.use('/allegato-3a', allegato3aRouter);
router.use('/allegato-3b', allegato3bRouter);
router.use('/', consensoFirmaRouter);  // Routes define /appuntamenti/:id/consenso-* paths internally
router.use('/consenso-moduli', consensoModuliRouter);
router.use('/consuntivo', consuntivoRouter);
router.use('/disponibilita', disponibilitaRouter);
router.use('/email-templates', emailTemplatesRouter);
router.use('/fascicolo-sanitario', fascicoloSanitarioRouter);
router.use('/ferie', ferieRouter);
router.use('/giudizi-idoneita', giudiziIdoneitaRouter);
router.use('/malattie-professionali', malattieProfessionaliRouter);
router.use('/mansioni', mansioniRouter);
router.use('/medici-documents', mediciDocumentsRouter);
router.use('/modulistica', modulisticaRouter);
router.use('/nomine-ruolo', nomineRuoloRouter);
router.use('/pazienti', pazientiRouter);
router.use('/pec-config', pecConfigRouter);
router.use('/pec', pecRouter);
router.use('/profilo-salute', profiloSaluteRouter);
router.use('/protocolli-sanitari', protocolliSanitariRouter);
router.use('/queue', queueRouter);
router.use('/rischio-prestazioni', rischioPrestazioniRouter);
router.use('/scadenze-mdl', scadenzeMdlRouter);
router.use('/strumenti-bridge', strumentiBridgeRouter);
router.use('/', tabletSessionRouter);  // Route defines /tablet/key path internally
router.use('/visit-templates', visitTemplatesRouter);
router.use('/questionari', questionariRouter);

// ============================================
// ERROR HANDLER
// ============================================

router.use((error, req, res, next) => {
    logger.error('Clinical routes error', {
        component: 'clinica-routes-index',
        error: 'Operazione non riuscita',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        path: req.path,
        method: req.method
    });

    res.status(error.status || 500).json({
        success: false,
        error: 'Errore nel modulo clinico',
    });
});

export default router;
