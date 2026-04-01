/**
 * P68 - HR Personnel Management Routes
 * Gestione personale interno: mansioni, profili HR, turni, disponibilità, timbrature, assenze, cartellini
 */

import express from 'express';
import mansioniInterneRoutes from './mansioni-interne-routes.js';
import profiliHRRoutes from './profili-hr-routes.js';
import turniRoutes from './turni-routes.js';
import disponibilitaRoutes from './disponibilita-routes.js';
import timbraturaRoutes from './timbratura-routes.js';
import assenzeRoutes from './assenze-routes.js';
import cartelliniRoutes from './cartellini-routes.js';
import selfCompanyRoutes from './self-company-routes.js';

const router = express.Router();

// Mount all HR sub-routes
router.use('/mansioni-interne', mansioniInterneRoutes);
router.use('/profili', profiliHRRoutes);
router.use('/turni', turniRoutes);
router.use('/disponibilita', disponibilitaRoutes);
router.use('/timbratura', timbraturaRoutes);
router.use('/assenze', assenzeRoutes);
router.use('/cartellini', cartelliniRoutes);
router.use('/self-company', selfCompanyRoutes);

export default router;
