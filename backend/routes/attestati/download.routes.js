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

const router = express.Router();

/**
 * GET /api/v1/attestati/:id/download
 * Download certificate PDF
 */
router.get('/:id/download', authenticateToken(), requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.person.tenantId;

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
    if (attestato.fileUrl.startsWith('/uploads/') || attestato.fileUrl.startsWith('/documents/')) {
      let filePath;
      if (attestato.fileUrl.startsWith('/uploads/')) {
        filePath = path.join(__dirname, '..', attestato.fileUrl);
      } else {
        const relativePath = attestato.fileUrl.substring(1);
        filePath = path.join(__dirname, '..', 'uploads', relativePath);
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
        const uploadsBasePath = path.join(__dirname, '..', 'uploads', 'documents');
        const justFileName = path.basename(attestato.fileUrl);
        const altPath1 = path.join(uploadsBasePath, justFileName);
        const altPath2 = path.join(__dirname, '..', attestato.fileUrl);

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
      return res.status(500).json({ error: 'Failed to fetch certificate file' });
    }
  } catch (error) {
    logger.error('Failed to download certificate', {
      component: 'attestati-routes',
      action: 'download',
      attestatoId: req.params.id,
      error: error.message,
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Failed to download certificate' });
  }
});

/**
 * POST /api/v1/attestati/download-zip-batch
 * Download multiple certificates as ZIP archive
 */
router.post(
  '/download-zip-batch',
  authenticateToken(),
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
      const tenantId = req.person.tenantId;

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
              error: fileError.message
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
        error: error.message,
        personId: req.person?.id
      });
      res.status(500).json({ error: 'Failed to create ZIP archive' });
    }
  }
);

export default router;
