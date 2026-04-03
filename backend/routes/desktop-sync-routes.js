/**
 * P98 - Desktop Sync Routes
 * 
 * Routes per sincronizzazione dati tra webapp e app desktop MDL.
 * Tutti gli endpoint richiedono autenticazione JWT.
 * 
 * @module routes/desktop-sync-routes
 * @project P98 - MDL Desktop Offline-First
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import * as desktopSyncController from '../controllers/desktop-sync.controller.js';

const router = express.Router();

// All desktop-sync routes require authentication
router.use(authenticate);

// ============================================
// DOWNLOAD - Scaricamento dati per giornata
// ============================================

// GET /api/v1/desktop-sync/download-day - Download dati giornata
router.get('/download-day',
  requirePermission('clinica:read'),
  desktopSyncController.downloadDay
);

// ============================================
// UPLOAD - Invio operazioni offline
// ============================================

// POST /api/v1/desktop-sync/upload-batch - Upload batch operazioni offline
router.post('/upload-batch',
  requirePermission('clinica:write'),
  desktopSyncController.uploadBatch
);

// POST /api/v1/desktop-sync/check-conflicts - Controllo conflitti pre-upload
router.post('/check-conflicts',
  requirePermission('clinica:read'),
  desktopSyncController.checkConflicts
);

// ============================================
// CLIENT MANAGEMENT - Registrazione e stato client
// ============================================

// POST /api/v1/desktop-sync/client-register - Registra client desktop
router.post('/client-register',
  requirePermission('clinica:read'),
  desktopSyncController.clientRegister
);

// GET /api/v1/desktop-sync/client-status - Verifica stato client
router.get('/client-status',
  requirePermission('clinica:read'),
  desktopSyncController.clientStatus
);

export default router;
