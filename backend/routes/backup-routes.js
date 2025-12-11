/**
 * Backup Routes
 * 
 * API endpoints per gestione backup e restore database
 * 
 * Endpoints:
 * - GET    /api/v1/backup/entities     Lista entità con conteggi
 * - POST   /api/v1/backup/create       Crea nuovo backup
 * - GET    /api/v1/backup/download/:id Scarica backup
 * - POST   /api/v1/backup/upload       Upload file backup
 * - POST   /api/v1/backup/preview      Preview contenuto backup
 * - POST   /api/v1/backup/restore      Esegue restore
 * - GET    /api/v1/backup/history      Lista backup precedenti
 * - DELETE /api/v1/backup/:id          Elimina backup
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger.js';
import backupService, { ENTITY_CATEGORIES } from '../services/backupService.js';

const router = express.Router();

// Configurazione multer per upload backup
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'temp', 'backup-uploads');
        try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        cb(null, `upload_${Date.now()}_${file.originalname}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
            cb(null, true);
        } else {
            cb(new Error('Solo file ZIP sono supportati'));
        }
    }
});

/**
 * GET /api/v1/backup/entities
 * Ottiene lista entità raggruppate con conteggi
 */
router.get('/entities', async (req, res) => {
    try {
        logger.info('Richiesta lista entità backup');

        const tenantId = req.user?.tenantId;
        const entities = await backupService.getEntitiesWithCounts(tenantId);

        // Calcola totali
        let totalEntities = 0;
        let totalRecords = 0;

        for (const category of Object.values(entities)) {
            totalEntities += category.entities.length;
            for (const entity of category.entities) {
                totalRecords += entity.count;
            }
        }

        res.json({
            success: true,
            data: {
                categories: entities,
                totals: {
                    entities: totalEntities,
                    records: totalRecords
                }
            }
        });
    } catch (error) {
        logger.error('Errore lista entità:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero delle entità',
            details: error.message
        });
    }
});

/**
 * POST /api/v1/backup/validate-dependencies
 * Valida le dipendenze delle entità selezionate
 */
router.post('/validate-dependencies', async (req, res) => {
    try {
        const { entities } = req.body;

        if (!entities || !Array.isArray(entities)) {
            return res.status(400).json({
                success: false,
                error: 'Lista entità mancante'
            });
        }

        const validation = backupService.validateDependencies(entities);

        res.json({
            success: true,
            data: validation
        });
    } catch (error) {
        logger.error('Errore validazione dipendenze:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nella validazione delle dipendenze',
            details: error.message
        });
    }
});

/**
 * POST /api/v1/backup/create
 * Crea nuovo backup con entità selezionate
 */
router.post('/create', async (req, res) => {
    try {
        const { entities, includeMedia = false } = req.body;

        if (!entities || !Array.isArray(entities) || entities.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Seleziona almeno un\'entità da esportare'
            });
        }

        logger.info('Creazione backup', {
            entities: entities.length,
            includeMedia,
            userId: req.user?.id
        });

        const result = await backupService.createBackup(entities, {
            tenantId: req.user?.tenantId,
            includeMedia,
            userId: req.user?.id
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('Errore creazione backup:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nella creazione del backup',
            details: error.message
        });
    }
});

/**
 * GET /api/v1/backup/download/:id
 * Scarica file backup
 */
router.get('/download/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const filePath = backupService.getBackupPath(id);

        // Verifica esistenza
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({
                success: false,
                error: 'Backup non trovato'
            });
        }

        logger.info('Download backup', { id, userId: req.user?.id });

        res.download(filePath, `${id}.zip`);
    } catch (error) {
        logger.error('Errore download backup:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel download del backup',
            details: error.message
        });
    }
});

/**
 * POST /api/v1/backup/upload
 * Upload file backup per preview/restore
 */
router.post('/upload', upload.single('backup'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Nessun file caricato'
            });
        }

        logger.info('Upload backup', {
            filename: req.file.originalname,
            size: req.file.size,
            userId: req.user?.id
        });

        // Valida il file
        const validation = await backupService.validateBackup(req.file.path);

        res.json({
            success: true,
            data: {
                tempPath: req.file.path,
                filename: req.file.originalname,
                size: req.file.size,
                validation
            }
        });
    } catch (error) {
        // Cleanup file in caso di errore
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch { }
        }

        logger.error('Errore upload backup:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel caricamento del backup',
            details: error.message
        });
    }
});

/**
 * POST /api/v1/backup/preview
 * Preview contenuto backup
 */
router.post('/preview', async (req, res) => {
    try {
        const { tempPath } = req.body;

        if (!tempPath) {
            return res.status(400).json({
                success: false,
                error: 'Path file mancante'
            });
        }

        const preview = await backupService.previewBackup(tempPath);

        res.json({
            success: true,
            data: preview
        });
    } catch (error) {
        logger.error('Errore preview backup:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nella preview del backup',
            details: error.message
        });
    }
});

/**
 * POST /api/v1/backup/restore
 * Esegue restore da backup
 */
router.post('/restore', async (req, res) => {
    try {
        const { tempPath, entities, overwrite = false } = req.body;

        if (!tempPath) {
            return res.status(400).json({
                success: false,
                error: 'Path file mancante'
            });
        }

        logger.info('Avvio restore', {
            tempPath,
            entities: entities?.length || 'all',
            overwrite,
            userId: req.user?.id
        });

        const result = await backupService.restoreBackup(tempPath, {
            selectedEntities: entities,
            overwrite,
            tenantId: req.user?.tenantId,
            userId: req.user?.id
        });

        // Cleanup temp file
        try {
            await fs.unlink(tempPath);
        } catch { }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('Errore restore:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel ripristino del backup',
            details: error.message
        });
    }
});

/**
 * GET /api/v1/backup/history
 * Lista backup precedenti
 */
router.get('/history', async (req, res) => {
    try {
        const backups = await backupService.listBackups();

        res.json({
            success: true,
            data: backups
        });
    } catch (error) {
        logger.error('Errore lista backup:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero dello storico backup',
            details: error.message
        });
    }
});

/**
 * DELETE /api/v1/backup/:id
 * Elimina backup
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        logger.info('Eliminazione backup', { id, userId: req.user?.id });

        await backupService.deleteBackup(id);

        res.json({
            success: true,
            message: 'Backup eliminato con successo'
        });
    } catch (error) {
        logger.error('Errore eliminazione backup:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nell\'eliminazione del backup',
            details: error.message
        });
    }
});

export default router;
