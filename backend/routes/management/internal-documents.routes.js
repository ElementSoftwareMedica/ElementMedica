/**
 * Internal Documents Routes
 * API per la gestione di documenti interni (procedure, moduli, marketing) nel management
 *
 * Base path: /api/v1/management/documenti
 *
 * @project P74 - Document Management & Email Templates
 */

import express from 'express';
import path from 'path';
import logger from '../../utils/logger.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { validateParamId } from '../../middleware/validateUUID.js';
import { createUploadConfig, multerErrorHandler } from '../../config/multer.js';
import InternalDocumentService from '../../services/management/InternalDocumentService.js';

const router = express.Router();
router.param('id', validateParamId);
router.use(authenticate);

// Upload config per documenti interni
const uploadDocs = createUploadConfig('documents', {
    destination: 'uploads/internal-documents',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'text/plain'
    ]
});

// ============================================================
// CARTELLE
// ============================================================

/**
 * GET /cartelle/tree
 * Albero completo delle cartelle
 */
router.get('/cartelle/tree', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { tipo } = req.query;
        const tree = await InternalDocumentService.getFolderTree({ tenantId, tipo });
        res.json({ success: true, data: tree });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting folder tree');
        res.status(500).json({ success: false, error: 'Errore nel recupero dell\'albero cartelle' });
    }
});

/**
 * GET /cartelle
 * Elenco cartelle (con filtri)
 */
router.get('/cartelle', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { tipo, parentId, includeChildren } = req.query;
        const folders = await InternalDocumentService.getFolders({
            tenantId,
            tipo,
            parentId: parentId !== undefined ? parentId || null : undefined,
            includeChildren: includeChildren === 'true'
        });
        res.json({ success: true, data: folders });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting folders');
        res.status(500).json({ success: false, error: 'Errore nel recupero cartelle' });
    }
});

/**
 * POST /cartelle
 * Crea nuova cartella
 */
router.post('/cartelle', requirePermission('internal-documents:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { nome, descrizione, tipo, parentId, ordine } = req.body;

        if (!nome?.trim()) {
            return res.status(400).json({ success: false, error: 'Il nome della cartella è obbligatorio' });
        }

        const folder = await InternalDocumentService.createFolder(
            { tenantId, nome: nome.trim(), descrizione, tipo, parentId, ordine },
            req.person.id
        );
        res.status(201).json({ success: true, data: folder });
    } catch (error) {
        logger.error({ error: error.message }, 'Error creating folder');
        const isNotFound = error.message?.includes('non trovata');
        res.status(isNotFound ? 404 : 500).json({ success: false, error: isNotFound ? 'Cartella padre non trovata' : 'Errore nella creazione della cartella' });
    }
});

/**
 * PUT /cartelle/:id
 * Aggiorna cartella
 */
router.put('/cartelle/:id', requirePermission('internal-documents:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const folder = await InternalDocumentService.updateFolder(req.params.id, tenantId, req.body);
        res.json({ success: true, data: folder });
    } catch (error) {
        logger.error({ error: error.message }, 'Error updating folder');
        const isNotFound = error.message?.includes('non trovata');
        res.status(isNotFound ? 404 : 500).json({ success: false, error: isNotFound ? 'Cartella non trovata' : 'Errore nell\'aggiornamento della cartella' });
    }
});

/**
 * DELETE /cartelle/:id
 * Elimina cartella (solo se vuota)
 */
router.delete('/cartelle/:id', requirePermission('internal-documents:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        await InternalDocumentService.deleteFolder(req.params.id, tenantId);
        res.json({ success: true });
    } catch (error) {
        logger.error({ error: error.message }, 'Error deleting folder');
        const isConflict = error.message?.includes('Impossibile eliminare');
        const isNotFound = error.message?.includes('non trovata');
        res.status(isConflict ? 409 : isNotFound ? 404 : 500)
            .json({ success: false, error: isConflict ? 'Impossibile eliminare: la cartella contiene elementi' : isNotFound ? 'Cartella non trovata' : 'Errore nell\'eliminazione della cartella' });
    }
});

// ============================================================
// DOCUMENTI
// ============================================================

/**
 * GET /
 * Elenco documenti con paginazione e filtri
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { folderId, tipo, search, isCurrentVersion, page, limit } = req.query;
        const result = await InternalDocumentService.getDocuments({
            tenantId,
            folderId: folderId !== undefined ? folderId || null : undefined,
            tipo,
            search,
            isCurrentVersion: isCurrentVersion === undefined ? true : isCurrentVersion === 'true',
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });
        res.json({ success: true, ...result });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting documents');
        res.status(500).json({ success: false, error: 'Errore nel recupero documenti' });
    }
});

/**
 * GET /marketing
 * Lista documenti marketing selezionabili per allegati email
 */
router.get('/marketing', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const docs = await InternalDocumentService.getMarketingDocuments(tenantId);
        res.json({ success: true, data: docs });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting marketing documents');
        res.status(500).json({ success: false, error: 'Errore nel recupero documenti marketing' });
    }
});

/**
 * GET /:id
 * Dettaglio documento con storico versioni
 */
router.get('/:id', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const doc = await InternalDocumentService.getDocumentById(req.params.id, tenantId);
        res.json({ success: true, data: doc });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting document');
        const isNotFound = error.message?.includes('non trovato');
        res.status(isNotFound ? 404 : 500).json({ success: false, error: isNotFound ? 'Documento non trovato' : 'Errore nel recupero documento' });
    }
});

/**
 * POST /
 * Crea nuovo documento con upload file
 */
router.post('/', requirePermission('internal-documents:write'), uploadDocs.single('file'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { nome, descrizione, tipo, folderId, versione, tags, isPublic } = req.body;

        if (!nome?.trim()) {
            return res.status(400).json({ success: false, error: 'Il nome del documento è obbligatorio' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Il file è obbligatorio' });
        }

        const fileUrl = `/uploads/internal-documents/${req.file.filename}`;

        const doc = await InternalDocumentService.createDocument({
            tenantId,
            folderId: folderId || null,
            nome: nome.trim(),
            descrizione,
            tipo: tipo || 'ALTRO',
            fileUrl,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            versione: versione || '1.0',
            tags: tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [],
            isPublic: isPublic === 'true' || isPublic === true
        }, req.person.id);

        res.status(201).json({ success: true, data: doc });
    } catch (error) {
        logger.error({ error: error.message }, 'Error creating document');
        const isNotFound = error.message?.includes('non trovata');
        res.status(isNotFound ? 404 : 500).json({ success: false, error: isNotFound ? 'Cartella non trovata' : 'Errore nella creazione del documento' });
    }
});

/**
 * PUT /:id
 * Aggiorna metadati documento
 */
router.put('/:id', requirePermission('internal-documents:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const doc = await InternalDocumentService.updateDocument(req.params.id, tenantId, req.body);
        res.json({ success: true, data: doc });
    } catch (error) {
        logger.error({ error: error.message }, 'Error updating document');
        const isNotFound = error.message?.includes('non trovato');
        res.status(isNotFound ? 404 : 500).json({ success: false, error: isNotFound ? 'Documento non trovato' : 'Errore nell\'aggiornamento del documento' });
    }
});

/**
 * POST /:id/revisione
 * Carica nuova revisione del documento
 */
router.post('/:id/revisione', requirePermission('internal-documents:write'), uploadDocs.single('file'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { versione, revisionNote } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Il file è obbligatorio per una nuova revisione' });
        }

        const fileUrl = `/uploads/internal-documents/${req.file.filename}`;

        const newDoc = await InternalDocumentService.createRevision(
            req.params.id,
            tenantId,
            { fileUrl, fileName: req.file.originalname, fileSize: req.file.size, mimeType: req.file.mimetype, versione, revisionNote },
            req.person.id
        );

        res.status(201).json({ success: true, data: newDoc });
    } catch (error) {
        logger.error({ error: error.message }, 'Error creating revision');
        const isNotFound = error.message?.includes('non trovato');
        res.status(isNotFound ? 404 : 500).json({ success: false, error: isNotFound ? 'Documento non trovato' : 'Errore nella creazione della revisione' });
    }
});

/**
 * DELETE /:id
 * Soft delete documento
 */
router.delete('/:id', requirePermission('internal-documents:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        await InternalDocumentService.deleteDocument(req.params.id, tenantId, req.person.id);
        res.json({ success: true });
    } catch (error) {
        logger.error({ error: error.message }, 'Error deleting document');
        const isNotFound = error.message?.includes('non trovato');
        res.status(isNotFound ? 404 : 500).json({ success: false, error: isNotFound ? 'Documento non trovato' : 'Errore nell\'eliminazione del documento' });
    }
});

router.use(multerErrorHandler);

export default router;
