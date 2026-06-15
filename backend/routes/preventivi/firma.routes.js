/**
 * Preventivi Firma/Upload Routes
 *
 * Gestione dei PDF firmati caricati manualmente per un preventivo:
 * - GET  /:id/pdf-firmati        - Elenca i PDF firmati
 * - POST /:id/pdf-firmati/upload - Carica un nuovo PDF firmato
 * - GET  /:id/pdf-firmati/:filename - Scarica/visualizza un PDF firmato
 *
 * @module routes/preventivi/firma.routes
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { express, param, prisma, authenticate, requirePermissions, logger, validate } from './common.js';
import { createSingleUpload, multerErrorHandler } from '../../config/multer.js';
import { assertUploadedFileIsSafe } from '../../utils/fileSecurity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
const FIRMA_UPLOAD_ROOT = path.resolve(BACKEND_ROOT, 'uploads', 'preventivi-firmati');

function sanitizeFilename(filename = '') {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

function getPreventivoFirmaDir(tenantId, preventivoId) {
  const dir = path.join(FIRMA_UPLOAD_ROOT, tenantId, preventivoId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function listPdfFirmati(tenantId, preventivoId) {
  const dir = getPreventivoFirmaDir(tenantId, preventivoId);
  return fs.readdirSync(dir)
    .filter(name => !name.endsWith('.json'))
    .map(name => {
      const filePath = path.join(dir, name);
      const stat = fs.statSync(filePath);
      let metadata = {};
      try {
        metadata = JSON.parse(fs.readFileSync(`${filePath}.json`, 'utf8'));
      } catch { /* empty metadata */ }
      return {
        filename: name,
        originalName: metadata.originalName || name,
        note: metadata.note || null,
        sha256: metadata.sha256 || null,
        scanStatus: metadata.scanStatus || null,
        createdAt: metadata.createdAt || stat.birthtime.toISOString(),
        uploadedBy: metadata.uploadedBy || null,
        size: stat.size
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

const router = express.Router();

/**
 * GET /api/preventivi/:id/pdf-firmati
 * Elenca i PDF firmati caricati per un preventivo
 */
router.get(
  '/:id/pdf-firmati',
  authenticate,
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const { tenantId } = req.person;
      const { id } = req.params;

      const preventivo = await prisma.preventivo.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: { id: true }
      });
      if (!preventivo) {
        return res.status(404).json({ success: false, error: 'Preventivo non trovato' });
      }

      const files = listPdfFirmati(tenantId, id);
      return res.json({ success: true, data: files });
    } catch (error) {
      logger.error('Errore lista pdf-firmati', { error: error.message, preventivoId: req.params.id });
      return res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
  }
);

/**
 * POST /api/preventivi/:id/pdf-firmati/upload
 * Carica un PDF firmato per un preventivo
 */
router.post(
  '/:id/pdf-firmati/upload',
  authenticate,
  requirePermissions(['preventivi:write']),
  [param('id').isUUID()],
  validate,
  createSingleUpload('documento', {
    destination: 'uploads/preventivi-firmati-temp',
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxFileSize: 25 * 1024 * 1024
  }),
  multerErrorHandler,
  async (req, res) => {
    try {
      const { tenantId } = req.person;
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'File documento obbligatorio' });
      }

      const preventivo = await prisma.preventivo.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: { id: true, numeroProgressivo: true, annoProgressivo: true }
      });
      if (!preventivo) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, error: 'Preventivo non trovato' });
      }

      const security = await assertUploadedFileIsSafe(req.file.path);
      const dir = getPreventivoFirmaDir(tenantId, id);
      const storedName = `firmato-${Date.now()}-${sanitizeFilename(req.file.originalname)}`;
      const targetPath = path.join(dir, storedName);
      fs.renameSync(req.file.path, targetPath);

      const metadata = {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        note: req.body?.note || null,
        sha256: security.sha256,
        scanStatus: security.scan.status,
        uploadedBy: req.person.id,
        createdAt: new Date().toISOString()
      };
      fs.writeFileSync(`${targetPath}.json`, JSON.stringify(metadata, null, 2));

      await prisma.activityLog.create({
        data: {
          personId: req.person.id,
          tenantId,
          action: 'PREVENTIVO_FIRMATO_UPLOAD',
          category: 'preventivi',
          resource: 'Preventivo',
          resourceId: id,
          details: JSON.stringify({ filename: storedName, originalName: req.file.originalname, sha256: security.sha256 }),
          timestamp: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      }).catch(err => logger.warn('ActivityLog preventivo firmato non salvato', { error: err.message }));

      await prisma.gdprAuditLog.create({
        data: {
          personId: req.person.id,
          tenantId,
          action: 'UPLOAD',
          resourceType: 'PreventivoFirmato',
          resourceId: id,
          dataAccessed: JSON.stringify({ filename: storedName, sha256: security.sha256 })
        }
      }).catch(err => logger.warn('GdprAuditLog preventivo firmato non salvato', { error: err.message }));

      logger.info('PDF firmato caricato', { preventivoId: id, filename: storedName, tenantId });
      return res.status(201).json({
        success: true,
        data: listPdfFirmati(tenantId, id)[0]
      });
    } catch (error) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      if (error.code === 'MALWARE_SCAN_FAILED' || error.code === 'MALWARE_SCAN_NOT_CONFIGURED') {
        return res.status(400).json({ success: false, error: 'File rifiutato dalla scansione sicurezza' });
      }
      logger.error('Errore upload pdf-firmato', { error: error.message, preventivoId: req.params.id });
      return res.status(500).json({ success: false, error: 'Errore nel caricamento del documento' });
    }
  }
);

/**
 * GET /api/preventivi/:id/pdf-firmati/:filename
 * Scarica/visualizza un PDF firmato
 */
router.get(
  '/:id/pdf-firmati/:filename',
  authenticate,
  [param('id').isUUID(), param('filename').isString()],
  validate,
  async (req, res) => {
    try {
      const { tenantId } = req.person;
      const { id, filename } = req.params;

      const preventivo = await prisma.preventivo.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: { id: true }
      });
      if (!preventivo) {
        return res.status(404).json({ success: false, error: 'Preventivo non trovato' });
      }

      const dir = getPreventivoFirmaDir(tenantId, id);
      const safeName = sanitizeFilename(filename);
      const filePath = path.resolve(dir, safeName);

      if (!filePath.startsWith(dir)) {
        return res.status(400).json({ success: false, error: 'Percorso non valido' });
      }
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'File non trovato' });
      }

      const ext = path.extname(safeName).toLowerCase();
      const mimeTypes = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      logger.error('Errore download pdf-firmato', { error: error.message, preventivoId: req.params.id });
      return res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
  }
);

export default router;
