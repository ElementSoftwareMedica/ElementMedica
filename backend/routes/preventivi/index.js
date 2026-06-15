/**
 * Preventivi Routes - Index
 * 
 * Aggregatore route modulari per preventivi.
 * Combina tutte le route in un unico router.
 * 
 * Moduli:
 * - crud.routes.js - CRUD operations (GET, POST, PUT, DELETE)
 * - workflow.routes.js - Gestione stati (PUT /:id/stato)
 * - sconti.routes.js - Gestione sconti (POST /:id/applica-sconto, DELETE /:id/sconti/:scontoId)
 * - pdf.routes.js - Generazione PDF (GET /:id/pdf)
 * - merge.routes.js - Merge/Unmerge preventivi (POST /merge, POST /:id/unmerge)
 * 
 * @module routes/preventivi
 */

import express from 'express';
import crudRoutes from './crud.routes.js';
import workflowRoutes from './workflow.routes.js';
import scontiRoutes from './sconti.routes.js';
import pdfRoutes from './pdf.routes.js';
import mergeRoutes from './merge.routes.js';
import mdlRoutes from './mdl.routes.js';
import firmaRoutes from './firma.routes.js';

const router = express.Router();

/**
 * IMPORTANT: Route order matters!
 * 
 * 1. Specific routes FIRST (/merge, /:id/stato, etc.)
 * 2. Generic CRUD routes LAST (/:id)
 * 
 * This prevents Express from matching /merge as /:id
 */

// Merge routes - POST /merge, POST /:id/unmerge
router.use('/', mergeRoutes);

// Workflow routes - PUT /:id/stato
router.use('/', workflowRoutes);

// Sconti routes - POST /:id/applica-sconto, DELETE /:id/sconti/:scontoId
router.use('/', scontiRoutes);

// PDF routes - GET /:id/pdf
router.use('/', pdfRoutes);

// MDL routes - Generazione preventivi Medicina del Lavoro
router.use('/mdl', mdlRoutes);

// Firma routes - GET /:id/pdf-firmati, POST /:id/pdf-firmati/upload
router.use('/', firmaRoutes);

// CRUD routes - GET /, POST /, GET /:id, PUT /:id, DELETE /:id
// MUST be last to prevent /:id from matching specific routes
router.use('/', crudRoutes);

export default router;
