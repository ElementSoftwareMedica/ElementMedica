/**
 * Attestati Download Routes
 * 
 * Gestione download attestati:
 * - GET /:id/download - Download singolo PDF
 * - POST /download-zip-batch - Download multiplo come ZIP
 * 
 * @module routes/attestati/download.routes
 */

import {
  express,
  prisma,
  authenticateToken,
  requirePermission,
  body,
  validationResult,
  logger,
  archiver,
  fs,
  fsSync,
  path,
  __dirname
} from './common.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { signDocument, signDocumentsBulk } from '../../services/documentSigningService.js';

const router = express.Router();

/**
 * GET /api/v1/attestati/:id/download
 * Download certificate PDF
 */
router.get('/:id/download', authenticateToken, requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    const attestato = await prisma.attestato.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      },
      include: {
        person: true,
        scheduledCourse: {
          include: { course: true }
        }
      }
    });

    if (!attestato) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    if (!attestato.fileUrl) {
      return res.status(404).json({ error: 'Certificate file not found' });
    }

    // Generate proper filename if not saved
    let downloadFileName = attestato.fileName;
    if (!downloadFileName || (downloadFileName.includes('attestato_') && downloadFileName.includes('-'))) {
      const createdDate = new Date(attestato.createdAt);
      const dateStr = `${createdDate.getFullYear()}.${String(createdDate.getMonth() + 1).padStart(2, '0')}.${String(createdDate.getDate()).padStart(2, '0')}`;

      const firstName = attestato.person?.firstName || 'Partecipante';
      const lastName = attestato.person?.lastName || '';
      const courseTitle = attestato.scheduledCourse?.course?.title || 'Corso';

      const sanitizedFirstName = firstName.replace(/[^a-zA-Z0-9\sàèéìòùÀÈÉÌÒÙ]/g, '').trim();
      const sanitizedLastName = lastName.replace(/[^a-zA-Z0-9\sàèéìòùÀÈÉÌÒÙ]/g, '').trim();
      const sanitizedCourseTitle = courseTitle.replace(/[^a-zA-Z0-9\sàèéìòùÀÈÉÌÒÙ]/g, '').trim().substring(0, 50);

      downloadFileName = `${dateStr} - ${sanitizedFirstName} ${sanitizedLastName} - ${sanitizedCourseTitle}.pdf`;
    }

    logger.info('Certificate download requested', {
      component: 'attestati-routes',
      action: 'download',
      attestatoId: id,
      personId: req.person?.id,
      fileUrl: attestato.fileUrl
    });

    // Handle local file paths
    // __dirname is backend/routes/attestati/, need ../../ to reach backend/
    const backendRoot = path.join(__dirname, '..', '..');
    if (attestato.fileUrl.startsWith('/uploads/') || attestato.fileUrl.startsWith('/documents/')) {
      let filePath;
      if (attestato.fileUrl.startsWith('/uploads/')) {
        filePath = path.join(backendRoot, attestato.fileUrl);
      } else {
        const relativePath = attestato.fileUrl.substring(1);
        filePath = path.join(backendRoot, 'uploads', relativePath);
      }

      logger.debug('Attempting to serve file', {
        component: 'attestati-routes',
        action: 'download',
        attestatoId: id,
        fileUrl: attestato.fileUrl,
        resolvedPath: filePath,
        exists: fsSync.existsSync(filePath)
      });

      if (fsSync.existsSync(filePath)) {
        return res.download(filePath, downloadFileName);
      } else {
        // Fallback paths
        const uploadsBasePath = path.join(backendRoot, 'uploads', 'documents');
        const justFileName = path.basename(attestato.fileUrl);
        const altPath1 = path.join(uploadsBasePath, justFileName);
        const altPath2 = path.join(backendRoot, attestato.fileUrl);

        if (fsSync.existsSync(altPath1)) {
          return res.download(altPath1, downloadFileName);
        }

        if (fsSync.existsSync(altPath2)) {
          return res.download(altPath2, downloadFileName);
        }

        logger.error('File not found on disk', {
          component: 'attestati-routes',
          action: 'download',
          attestatoId: id,
          primaryPath: filePath,
          altPath1,
          altPath2
        });
        return res.status(404).json({ error: 'Certificate file not found on disk' });
      }
    }

    // Handle external URLs (Supabase storage or absolute path)
    try {
      const axios = await import('axios');
      const fileResponse = await axios.default.get(attestato.fileUrl, { responseType: 'stream' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadFileName)}"`);
      fileResponse.data.pipe(res);
    } catch (fetchError) {
      logger.error('Failed to fetch file from storage', {
        error: fetchError.message,
        fileUrl: attestato.fileUrl
      });
      return res.status(500).json({ error: 'Errore nel recupero del file certificato' });
    }
  } catch (error) {
    logger.error('Failed to download certificate', {
      component: 'attestati-routes',
      action: 'download',
      attestatoId: req.params.id,
      error: 'Operazione non riuscita',
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Errore nel download del certificato' });
  }
});

/**
 * POST /api/v1/attestati/download-zip-batch
 * Download multiple certificates as ZIP archive
 */
router.post(
  '/download-zip-batch',
  authenticateToken,
  requirePermission('documents:read'),
  [
    body('attestatoIds').isArray({ min: 1 }).withMessage('At least one certificate ID required'),
    body('attestatoIds.*').isUUID().withMessage('All certificate IDs must be valid UUIDs')
  ],
  async (req, res) => {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return res.status(400).json({ errors: validationErrors.array() });
      }

      const { attestatoIds } = req.body;
      const tenantId = getEffectiveTenantId(req);

      // Get all certificates
      const attestati = await prisma.attestato.findMany({
        where: {
          id: { in: attestatoIds },
          tenantId,
          deletedAt: null
        },
        include: {
          person: true,
          scheduledCourse: {
            include: { course: true }
          }
        }
      });

      if (attestati.length === 0) {
        return res.status(404).json({ error: 'No certificates found' });
      }

      // Collect valid files
      const filesToAdd = [];
      for (const attestato of attestati) {
        if (attestato.fileUrl) {
          try {
            let filePath = attestato.fileUrl;

            if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
              const urlObj = new URL(filePath);
              filePath = urlObj.pathname;
            }

            filePath = filePath.replace(/^\/+/, '');

            const fullPath = filePath.startsWith('uploads/')
              ? path.join(process.cwd(), filePath)
              : path.join(process.cwd(), 'uploads', filePath);

            await fs.access(fullPath);

            const zipEntryName = attestato.fileName ||
              `${attestato.person.lastName}_${attestato.person.firstName}_${attestato.scheduledCourse.course.title.substring(0, 30).replace(/\s+/g, '_')}.pdf`;

            filesToAdd.push({ fullPath, zipEntryName });
          } catch (fileError) {
            logger.warn('Failed to access certificate file for ZIP', {
              attestatoId: attestato.id,
              fileUrl: attestato.fileUrl,
              error: 'Operazione non riuscita'
            });
          }
        }
      }

      if (filesToAdd.length === 0) {
        return res.status(404).json({
          error: 'No certificate files found on disk',
          message: 'I file degli attestati non sono stati trovati.'
        });
      }

      // Create ZIP archive
      const archive = archiver('zip', { zlib: { level: 9 } });
      const zipFileName = `attestati_${Date.now()}.zip`;

      res.attachment(zipFileName);
      res.setHeader('Content-Type', 'application/zip');

      archive.on('error', (err) => {
        logger.error('Archive error', { error: err.message });
        if (!res.headersSent) {
          res.status(500).json({ error: 'Archive creation failed' });
        }
      });

      const archiveFinished = new Promise((resolve, reject) => {
        archive.on('end', () => resolve(archive.pointer()));
        archive.on('error', reject);
      });

      archive.pipe(res);

      for (const { fullPath, zipEntryName } of filesToAdd) {
        archive.file(fullPath, { name: zipEntryName });
      }

      archive.finalize();
      const totalBytes = await archiveFinished;

      logger.info('Batch certificates downloaded as ZIP', {
        component: 'attestati-routes',
        action: 'download-zip-batch',
        totalCertificates: attestati.length,
        filesAdded: filesToAdd.length,
        totalBytes,
        personId: req.person?.id
      });

    } catch (error) {
      logger.error('Failed to create ZIP archive', {
        component: 'attestati-routes',
        action: 'download-zip-batch',
        error: 'Operazione non riuscita',
        personId: req.person?.id
      });
      res.status(500).json({ error: 'Errore nella creazione dell\'archivio ZIP' });
    }
  }
);

/**
 * GET /api/v1/attestati/:id/preview
 * Serve attestato PDF inline for preview (used by SigningWorkflowModal)
 */
router.get('/:id/preview', authenticateToken, requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    const attestato = await prisma.attestato.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!attestato) {
      return res.status(404).json({ error: 'Attestato non trovato' });
    }

    if (!attestato.fileUrl) {
      return res.status(404).json({ error: 'File attestato non trovato' });
    }

    const backendRoot = path.join(__dirname, '..', '..');

    if (attestato.fileUrl.startsWith('/uploads/') || attestato.fileUrl.startsWith('/documents/')) {
      let filePath;
      if (attestato.fileUrl.startsWith('/uploads/')) {
        filePath = path.join(backendRoot, attestato.fileUrl);
      } else {
        filePath = path.join(backendRoot, 'uploads', attestato.fileUrl.substring(1));
      }

      if (fsSync.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        return fsSync.createReadStream(filePath).pipe(res);
      }

      // Fallback paths
      const justFileName = path.basename(attestato.fileUrl);
      const altPath = path.join(backendRoot, 'uploads', 'documents', justFileName);
      if (fsSync.existsSync(altPath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        return fsSync.createReadStream(altPath).pipe(res);
      }

      return res.status(404).json({ error: 'File non trovato su disco' });
    }

    // External URL: proxy the file
    const axios = await import('axios');
    const fileResponse = await axios.default.get(attestato.fileUrl, { responseType: 'stream' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    fileResponse.data.pipe(res);
  } catch (error) {
    logger.error('Failed to preview attestato', {
      component: 'attestati-routes',
      action: 'preview',
      attestatoId: req.params.id,
      error: 'Operazione non riuscita'
    });
    res.status(500).json({ error: 'Errore nel caricamento dell\'anteprima' });
  }
});

/**
 * POST /api/v1/attestati/:id/sign
 * Apply signature to attestato
 */
router.post('/:id/sign', authenticateToken, requirePermission('documents:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);
    const { signatureData, placement } = req.body;

    if (!signatureData) {
      return res.status(400).json({ error: 'Dati firma mancanti' });
    }

    const result = await signDocument({
      documentId: id,
      signatureBase64: signatureData,
      signedById: req.person?.id,
      tenantId,
      placement
    });

    logger.info('Attestato signed', {
      component: 'attestati-routes',
      action: 'sign',
      attestatoId: id,
      signerId: req.person?.id
    });

    res.json({ success: true, message: 'Firma applicata con successo', signedFileUrl: result.signedFileUrl });
  } catch (error) {
    logger.error('Failed to sign attestato', {
      component: 'attestati-routes',
      action: 'sign',
      attestatoId: req.params.id,
      error: 'Operazione non riuscita'
    });
    res.status(500).json({ error: 'Errore nell\'applicazione della firma' });
  }
});

/**
 * POST /api/v1/attestati/bulk-sign
 * Apply signature to multiple attestati
 */
router.post('/bulk-sign', authenticateToken, requirePermission('documents:write'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { documentIds, signatureData, placement } = req.body;

    if (!signatureData || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'Dati firma o ID documenti mancanti' });
    }

    const { succeeded, failed } = await signDocumentsBulk({
      documentIds,
      signatureBase64: signatureData,
      signedById: req.person?.id,
      tenantId,
      placement
    });

    logger.info('Attestati bulk signed', {
      component: 'attestati-routes',
      action: 'bulk-sign',
      succeeded: succeeded.length,
      failed: failed.length,
      signerId: req.person?.id
    });

    res.json({ succeeded, failed });
  } catch (error) {
    logger.error('Failed to bulk sign attestati', {
      component: 'attestati-routes',
      action: 'bulk-sign',
      error: 'Operazione non riuscita'
    });
    res.status(500).json({ error: 'Errore nella firma multipla' });
  }
});

export default router;
