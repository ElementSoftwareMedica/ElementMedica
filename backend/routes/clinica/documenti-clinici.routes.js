/**
 * Documenti Clinici Routes
 * Gestione allegati visite e referti
 * 
 * Endpoints:
 * - GET /storage-stats    Statistiche storage documenti
 * - GET /visita/:visitaId    Lista allegati per visita
 * - GET /referto/:refertoId    Lista allegati per referto
 * - POST /visita/upload    Upload allegato visita
 * - POST /referto/upload    Upload allegato referto
 * - GET /visita/download/:allegatoId    Download allegato visita
 * - GET /referto/download/:allegatoId    Download allegato referto
 * - DELETE /visita/:allegatoId    Elimina allegato visita
 * - DELETE /referto/:allegatoId    Elimina allegato referto
 * 
 * @module routes/clinica/documenti-clinici
 * @version 1.0.0
 */

import express from 'express';
import fs from 'fs/promises';
import logger from '../../utils/logger.js';
import DocumentoClinicoService from '../../services/clinical/DocumentoClinicoService.js';
import middleware from '../../auth/middleware.js';
import { createUploadConfig, multerErrorHandler } from '../../config/multer.js';
import { auditClinico, getEffectiveTenantId } from './utils/clinica-utils.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// ============================================
// STATS ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/documenti/storage-stats
 * @desc Statistiche storage documenti
 * @access Authenticated
 */
router.get('/storage-stats',
    authenticateToken(),
    auditClinico('get_storage_stats'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const stats = await DocumentoClinicoService.getStorageStats(tenantId);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Failed to get storage stats', {
                component: 'documenti-clinici-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle statistiche storage',
                message: error.message
            });
        }
    }
);

// ============================================
// VISITA ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/documenti/visita/:visitaId
 * @desc Lista allegati per visita
 * @access Authenticated
 */
router.get('/visita/:visitaId',
    authenticateToken(),
    auditClinico('list_allegati_visita'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { visitaId } = req.params;

            const allegati = await DocumentoClinicoService.getAllegatiVisita(visitaId, tenantId);

            res.json({
                success: true,
                data: allegati
            });
        } catch (error) {
            logger.error('Failed to list allegati visita', {
                component: 'documenti-clinici-routes',
                error: error.message,
                visitaId: req.params.visitaId,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nel recupero degli allegati',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/documenti/visita/upload
 * @desc Upload allegato visita (multipart/form-data)
 * @access Authenticated + Permission
 * @body file - File da caricare (campo 'file')
 * @body visitaId - ID della visita
 * @body tipo - Tipo allegato (document, image, dicom, lab_result, trace, other)
 * @body descrizione - Descrizione opzionale
 */
router.post('/visita/upload',
    authenticateToken(),
    createUploadConfig('clinical').single('file'),
    multerErrorHandler,
    auditClinico('upload_allegato_visita'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { visitaId, tipo, descrizione } = req.body;
            const file = req.file;

            // Validazione input
            if (!file) {
                return res.status(400).json({
                    success: false,
                    error: 'File obbligatorio',
                    message: 'Nessun file caricato. Inviare file nel campo "file".'
                });
            }

            if (!visitaId) {
                // Rimuovi file se validazione fallisce
                await fs.unlink(file.path).catch(() => { });
                return res.status(400).json({
                    success: false,
                    error: 'visitaId obbligatorio',
                    message: 'Specificare l\'ID della visita.'
                });
            }

            if (!tipo || !['document', 'image', 'dicom', 'lab_result', 'trace', 'other'].includes(tipo)) {
                await fs.unlink(file.path).catch(() => { });
                return res.status(400).json({
                    success: false,
                    error: 'tipo non valido',
                    message: 'Tipo deve essere: document, image, dicom, lab_result, trace, other'
                });
            }

            // Leggi file dal disco
            const fileBuffer = await fs.readFile(file.path);

            // Upload tramite service
            const allegato = await DocumentoClinicoService.uploadAllegatoVisita({
                visitaId,
                tipo,
                nome: file.originalname,
                descrizione: descrizione || null,
                buffer: fileBuffer,
                mimeType: file.mimetype
            }, tenantId, userId);

            // Rimuovi file temporaneo dopo upload
            await fs.unlink(file.path).catch(() => { });

            res.status(201).json({
                success: true,
                data: allegato,
                message: 'Allegato caricato con successo'
            });
        } catch (error) {
            // Rimuovi file temporaneo in caso di errore
            if (req.file) {
                await fs.unlink(req.file.path).catch(() => { });
            }

            logger.error('Failed to upload allegato visita', {
                component: 'documenti-clinici-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'upload del file',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/documenti/visita/download/:allegatoId
 * @desc Download allegato visita
 * @access Authenticated
 */
router.get('/visita/download/:allegatoId',
    authenticateToken(),
    auditClinico('download_allegato_visita'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { allegatoId } = req.params;

            const result = await DocumentoClinicoService.downloadAllegatoVisita(allegatoId, tenantId, userId);

            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
            res.setHeader('Content-Length', result.size);

            res.send(result.buffer);
        } catch (error) {
            logger.error('Failed to download allegato visita', {
                component: 'documenti-clinici-routes',
                error: error.message,
                allegatoId: req.params.allegatoId,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nel download del file',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/documenti/visita/:allegatoId
 * @desc Elimina allegato visita (soft delete)
 * @access Authenticated + Permission
 */
router.delete('/visita/:allegatoId',
    authenticateToken(),
    auditClinico('delete_allegato_visita'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { allegatoId } = req.params;

            await DocumentoClinicoService.deleteAllegatoVisita(allegatoId, tenantId, userId);

            res.json({
                success: true,
                message: 'Allegato eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete allegato visita', {
                component: 'documenti-clinici-routes',
                error: error.message,
                allegatoId: req.params.allegatoId,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'eliminazione dell\'allegato',
                message: error.message
            });
        }
    }
);

// ============================================
// REFERTO ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/documenti/referto/:refertoId
 * @desc Lista allegati per referto
 * @access Authenticated
 */
router.get('/referto/:refertoId',
    authenticateToken(),
    auditClinico('list_allegati_referto'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { refertoId } = req.params;

            const allegati = await DocumentoClinicoService.getAllegatiReferto(refertoId, tenantId);

            res.json({
                success: true,
                data: allegati
            });
        } catch (error) {
            logger.error('Failed to list allegati referto', {
                component: 'documenti-clinici-routes',
                error: error.message,
                refertoId: req.params.refertoId,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nel recupero degli allegati',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/documenti/referto/upload
 * @desc Upload allegato referto (multipart/form-data)
 * @access Authenticated + Permission
 * @body file - File da caricare (campo 'file')
 * @body refertoId - ID del referto
 * @body tipo - Tipo allegato (document, image, dicom, lab_result, trace, other)
 * @body descrizione - Descrizione opzionale
 */
router.post('/referto/upload',
    authenticateToken(),
    createUploadConfig('clinical').single('file'),
    multerErrorHandler,
    auditClinico('upload_allegato_referto'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { refertoId, tipo, descrizione } = req.body;
            const file = req.file;

            // Validazione input
            if (!file) {
                return res.status(400).json({
                    success: false,
                    error: 'File obbligatorio',
                    message: 'Nessun file caricato. Inviare file nel campo "file".'
                });
            }

            if (!refertoId) {
                await fs.unlink(file.path).catch(() => { });
                return res.status(400).json({
                    success: false,
                    error: 'refertoId obbligatorio',
                    message: 'Specificare l\'ID del referto.'
                });
            }

            if (!tipo || !['document', 'image', 'dicom', 'lab_result', 'trace', 'other'].includes(tipo)) {
                await fs.unlink(file.path).catch(() => { });
                return res.status(400).json({
                    success: false,
                    error: 'tipo non valido',
                    message: 'Tipo deve essere: document, image, dicom, lab_result, trace, other'
                });
            }

            // Leggi file dal disco
            const fileBuffer = await fs.readFile(file.path);

            // Upload tramite service
            const allegato = await DocumentoClinicoService.uploadAllegatoReferto({
                refertoId,
                tipo,
                nome: file.originalname,
                descrizione: descrizione || null,
                buffer: fileBuffer,
                mimeType: file.mimetype
            }, tenantId, userId);

            // Rimuovi file temporaneo dopo upload
            await fs.unlink(file.path).catch(() => { });

            res.status(201).json({
                success: true,
                data: allegato,
                message: 'Allegato caricato con successo'
            });
        } catch (error) {
            // Rimuovi file temporaneo in caso di errore
            if (req.file) {
                await fs.unlink(req.file.path).catch(() => { });
            }

            logger.error('Failed to upload allegato referto', {
                component: 'documenti-clinici-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 :
                error.message.includes('firmato') ? 403 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'upload del file',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/documenti/referto/download/:allegatoId
 * @desc Download allegato referto
 * @access Authenticated
 */
router.get('/referto/download/:allegatoId',
    authenticateToken(),
    auditClinico('download_allegato_referto'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { allegatoId } = req.params;

            const result = await DocumentoClinicoService.downloadAllegatoReferto(allegatoId, tenantId, userId);

            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
            res.setHeader('Content-Length', result.size);

            res.send(result.buffer);
        } catch (error) {
            logger.error('Failed to download allegato referto', {
                component: 'documenti-clinici-routes',
                error: error.message,
                allegatoId: req.params.allegatoId,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nel download del file',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/documenti/referto/:allegatoId
 * @desc Elimina allegato referto (soft delete)
 * @access Authenticated + Permission
 */
router.delete('/referto/:allegatoId',
    authenticateToken(),
    auditClinico('delete_allegato_referto'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { allegatoId } = req.params;

            await DocumentoClinicoService.deleteAllegatoReferto(allegatoId, tenantId, userId);

            res.json({
                success: true,
                message: 'Allegato eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete allegato referto', {
                component: 'documenti-clinici-routes',
                error: error.message,
                allegatoId: req.params.allegatoId,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 :
                error.message.includes('firmato') ? 403 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'eliminazione dell\'allegato',
                message: error.message
            });
        }
    }
);

export default router;
