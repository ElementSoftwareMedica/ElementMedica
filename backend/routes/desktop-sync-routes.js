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

// Multer middleware lazily resolved (controller exports it)
const attachmentUploadMiddleware = (req, res, next) => {
  desktopSyncController.getAttachmentUploadMiddleware()(req, res, next);
};

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

// GET /api/v1/desktop-sync/download-full-db - Download intero database tenant
router.get('/download-full-db',
  requirePermission('clinica:read'),
  desktopSyncController.downloadFullDb
);

// ============================================
// UPLOAD - Invio operazioni offline
// ============================================

// POST /api/v1/desktop-sync/upload-batch - Upload batch operazioni offline
router.post('/upload-batch',
  requirePermission('clinica:write'),
  desktopSyncController.uploadBatch
);

// POST /api/v1/desktop-sync/upload-attachment - Upload allegato binario da client desktop
router.post('/upload-attachment',
  requirePermission('clinica:write'),
  attachmentUploadMiddleware,
  desktopSyncController.uploadAttachment
);

// POST /api/v1/desktop-sync/check-conflicts - Controllo conflitti pre-upload
router.post('/check-conflicts',
  requirePermission('clinica:read'),
  desktopSyncController.checkConflicts
);

// GET /api/v1/desktop-sync/conflict-data - Dati server per diff conflitto
router.get('/conflict-data',
  requirePermission('clinica:read'),
  desktopSyncController.getConflictData
);

// POST /api/v1/desktop-sync/error-report - Upload log errori client desktop
router.post('/error-report',
  requirePermission('clinica:read'),
  desktopSyncController.errorReport
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
