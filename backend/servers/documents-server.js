import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { createCorsConfig } from '../config/cors.js';
import prisma from '../config/prisma-optimization.js';
import multer from 'multer';
import path from 'path';
import { google } from 'googleapis';
import fs from 'fs';
import { mkdirp } from 'mkdirp';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeAuth, shutdownAuth } from '../auth/index.js';
import authRoutes from '../auth/routes.js';
import middleware from '../middleware/auth.js';
import googleApiService from '../utils/googleApiService.js';
import googleDocsRoutes from '../routes/google-docs-routes.js';

// Import logging and error handling
import { logger, httpLogger, logAudit } from '../utils/logger.js';
import { globalErrorHandler, notFoundHandler } from '../middleware/errorHandler.js';
import cacheService from '../utils/cache.js';
import {
  documentCacheMiddleware,
  templateCacheMiddleware,
  cacheInvalidationMiddleware,
  documentInvalidationPatterns,
  templateInvalidationPatterns
} from '../middleware/cache.js';
const { authenticate: authenticateToken, requirePermission } = middleware;

dotenv.config({ path: './.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prisma client importato dalla configurazione ottimizzata
const app = express();
app.set('trust proxy', 1);
const PORT = parseInt(process.env.DOCUMENTS_PORT || '4002', 10);
const HOST = process.env.DOCUMENTS_HOST || '127.0.0.1';

// Initialize authentication system
try {
  await initializeAuth();
  logger.info('Authentication system initialized in Documents Server', { service: 'documents-server', port: PORT });
} catch (error) {
  logger.error('Failed to initialize authentication system', { service: 'documents-server', error: error.message, stack: error.stack });
  process.exit(1);
}

// Initialize Google API Service
try {
  await googleApiService.initialize();
  logger.info('Google API Service initialized in Documents Server', { service: 'documents-server' });
} catch (error) {
  logger.warn('Google API Service initialization failed, some features may be limited', {
    service: 'documents-server',
    error: error.message
  });
}

// Initialize cache service (non-blocking)
if (process.env.REDIS_ENABLED !== 'false') {
  cacheService.connect().then(() => {
    logger.info('Cache service initialized in Documents Server', { service: 'documents-server' });
  }).catch((error) => {
    logger.warn('Cache service initialization failed, continuing without cache', {
      service: 'documents-server',
      error: error.message
    });
  });
} else {
  logger.info('Redis disabled, Documents Server running without cache', { service: 'documents-server' });
}

// CORS via configurazione centralizzata (config/cors.js) — usa ALLOWED_ORIGINS env var in produzione
app.use(cors(createCorsConfig()));

// HTTP request logging
app.use(httpLogger);

// Configurazione bodyParser
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Mount authentication routes
app.use('/api', authRoutes);

// Mount Google API routes
app.use('/api/google-docs', googleDocsRoutes);

// Configurazione multer per upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    if (file.fieldname === 'template') {
      uploadPath = path.join(__dirname, 'uploads', 'templates');
    } else {
      uploadPath = path.join(__dirname, 'uploads', 'attestati');
    }
    mkdirp.sync(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const ALLOWED_TEMPLATE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.html', '.htm'];

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_TEMPLATE_EXTENSIONS.includes(ext)) {
      return cb(null, true);
    }
    return cb(new Error(`Invalid file type "${ext}". Allowed: ${ALLOWED_TEMPLATE_EXTENSIONS.join(', ')}`));
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', server: 'Documents Server', port: PORT });
});

// NOTE (F203): The legacy /generate-attestato endpoint was removed.
// It referenced `prisma.participant` (model does not exist in current schema)
// and used `parseInt()` on String UUID primary keys — completely broken and a IDOR risk.
// Attestato generation is handled via the Google Docs API routes (/api/google-docs/*)
// using the correct CourseEnrollment / CourseSchedule models.

// Endpoint per scaricare attestati generati - Protected with authentication and ownership validation
app.get('/download/:filename',
  authenticateToken,
  requirePermission('documents:read'),
  documentCacheMiddleware(1800), // Cache for 30 minutes
  async (req, res) => {
    try {
      const rawFilename = req.params.filename;
      // F201: Path traversal prevention — only allow safe filename characters
      const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9_\-\.]+$/;
      if (!SAFE_FILENAME_REGEX.test(rawFilename)) {
        return res.status(400).json({ error: 'Nome file non valido' });
      }
      const filename = rawFilename;

      // F201: Canonical path check — ensure file is inside allowed directory
      const attestatiDir = path.resolve(path.join(__dirname, 'uploads', 'attestati'));
      const filePath = path.resolve(path.join(attestatiDir, filename));
      if (!filePath.startsWith(attestatiDir + path.sep) && filePath !== attestatiDir) {
        return res.status(400).json({ error: 'Percorso file non valido' });
      }

      const personId = req.person.id;
      const userCompanyTenantProfileId = req.person.companyTenantProfileId;

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File non trovato' });
      }

      // Validate document ownership by checking if the document belongs to user's company
      try {
        const attestato = await prisma.attestato.findFirst({
          where: {
            fileName: filename,
            deletedAt: null,
            person: {
              tenantProfiles: {
                some: {
                  companyTenantProfileId: userCompanyTenantProfileId,
                  deletedAt: null
                }
              }
            }
          },
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                tenantProfiles: {
                  where: { deletedAt: null },
                  select: { companyTenantProfileId: true }
                }
              }
            },
            scheduledCourse: {
              select: {
                id: true
              }
            }
          }
        });

        if (!attestato) {
          logAudit('document_access_denied', personId, filename, {
            userCompanyTenantProfileId,
            reason: 'Document not found or access denied',
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
          return res.status(403).json({ error: 'Accesso negato: documento non trovato o non si dispone dei permessi per accedere' });
        }

        // Log successful document access
        logAudit('document_downloaded', personId, filename, {
          userCompanyTenantProfileId,
          documentId: attestato.id,
          participantId: attestato.personId,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

      } catch (dbError) {
        logger.error('Database error during ownership validation', {
          service: 'documents-server',
          error: dbError.message,
          filename,
          personId
        });
        return res.status(500).json({ error: 'Errore interno del server durante la validazione' });
      }

      res.download(filePath, filename);
    } catch (error) {
      logger.error('Error downloading file', { service: 'documents-server', error: error.message, filename: req.params.filename });
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

// Endpoint per caricare template - Protected with authentication and company validation
app.post('/upload-template',
  authenticateToken,
  requirePermission('documents:create'),
  cacheInvalidationMiddleware(templateInvalidationPatterns),
  // F205: Handle multer errors (including fileFilter rejections) before reaching the handler
  (req, res, next) => {
    upload.single('template')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: 'Errore di caricamento' });
      } else if (err) {
        // fileFilter rejection (invalid file type)
        return res.status(400).json({ error: 'Tipo di file non consentito' });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nessun file template fornito' });
      }

      const filename = req.file.filename;
      const filePath = req.file.path;
      const personId = req.person.id;
      const userCompanyTenantProfileId = req.person.companyTenantProfileId;

      const fileExtension = path.extname(filename).toLowerCase();

      // Defense-in-depth size check (multer fileFilter already blocked invalid types)
      // Check file size (max 10MB) — multer limit is 50MB, enforce stricter 10MB here
      if (req.file.size > 10 * 1024 * 1024) {
        // F205: Delete file from disk immediately to avoid storing rejected uploads
        try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
        logAudit('template_upload_rejected', personId, filename, {
          userCompanyTenantProfileId,
          reason: 'File too large',
          fileSize: req.file.size,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        return res.status(400).json({ error: 'File troppo grande. Dimensione massima: 10MB' });
      }

      // Log successful template upload
      logAudit('template_uploaded', personId, filename, {
        userCompanyTenantProfileId,
        fileSize: req.file.size,
        fileType: fileExtension,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('Template uploaded successfully', { service: 'documents-server', filename, personId, companyTenantProfileId: userCompanyTenantProfileId });

      res.json({
        success: true,
        filename: req.file.filename,
        path: req.file.path
      });
    } catch (error) {
      logger.error('Error uploading template', { service: 'documents-server', error: error.message });
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

// Endpoint per ottenere lista template - Protected with authentication and company filtering
app.get('/templates',
  authenticateToken,
  requirePermission('documents:read'),
  templateCacheMiddleware(3600), // Cache for 1 hour
  async (req, res) => {
    try {
      const personId = req.person.id;
      const userCompanyTenantProfileId = req.person.companyTenantProfileId;

      // Get templates from database that belong to user's company
      const companyTemplates = await prisma.templateLink.findMany({
        where: {
          deletedAt: null,
          OR: [
            { companyTenantProfileId: req.person?.companyTenantProfileId },
            { isDefault: true },
            { companyTenantProfileId: null } // Global templates
          ]
        },
        select: {
          id: true,
          name: true,
          url: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          fileFormat: true,
          isDefault: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Also get physical template files
      const templatesDir = path.join(__dirname, 'uploads', 'templates');
      let physicalTemplates = [];

      if (fs.existsSync(templatesDir)) {
        const files = fs.readdirSync(templatesDir);
        physicalTemplates = files.map(file => {
          const filePath = path.join(templatesDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            modified: stats.mtime,
            type: 'physical'
          };
        });
      }

      logAudit('templates_listed', personId, 'templates', {
        userCompanyTenantProfileId,
        templateCount: companyTemplates.length + physicalTemplates.length,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        templates: companyTemplates,
        physicalTemplates,
        total: companyTemplates.length + physicalTemplates.length
      });
    } catch (error) {
      logger.error('Error listing templates', { service: 'documents-server', error: error.message });
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

// Endpoint per ottenere lista attestati - Protected with authentication and company filtering
app.get('/attestati',
  authenticateToken,
  requirePermission('documents:read'),
  documentCacheMiddleware(1800), // Cache for 30 minutes
  async (req, res) => {
    try {
      const personId = req.person.id;
      const userCompanyTenantProfileId = req.person.companyTenantProfileId;

      // Get attestati from database that belong to user's company
      const companyAttestati = await prisma.attestato.findMany({
        where: {
          deletedAt: null,
          person: {
            tenantProfiles: {
              some: {
                companyTenantProfileId: userCompanyTenantProfileId,
                deletedAt: null
              }
            }
          }
        },
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tenantProfiles: {
                where: { deletedAt: null },
                select: { email: true }
              }
            }
          },
          scheduledCourse: {
            select: {
              id: true,
              course: {
                select: {
                  name: true,
                  code: true
                }
              }
            }
          }
        },
        orderBy: {
          generatedAt: 'desc'
        }
      });

      // Also check physical files and match with database records
      const attestatiDir = path.join(__dirname, 'uploads', 'attestati');
      let physicalFiles = [];

      if (fs.existsSync(attestatiDir)) {
        const files = fs.readdirSync(attestatiDir);
        physicalFiles = files.filter(file => {
          // Check if this file belongs to user's company by matching with database
          return companyAttestati.some(attestato => attestato.fileName === file);
        }).map(file => {
          const filePath = path.join(attestatiDir, file);
          const stats = fs.statSync(filePath);
          const dbRecord = companyAttestati.find(attestato => attestato.fileName === file);
          return {
            name: file,
            size: stats.size,
            modified: stats.mtime,
            participant: dbRecord?.person,
            course: dbRecord?.scheduledCourse?.course
          };
        });
      }

      logAudit('attestati_listed', personId, 'attestati', {
        userCompanyTenantProfileId,
        attestatiCount: companyAttestati.length,
        physicalFilesCount: physicalFiles.length,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        attestati: companyAttestati,
        physicalFiles,
        total: companyAttestati.length
      });
    } catch (error) {
      logger.error('Error listing attestati', { service: 'documents-server', error: error.message });
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'documents-server',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Avvia il server
const server = app.listen(PORT, HOST, () => {
  logger.info('Documents Server started successfully', { service: 'documents-server', port: PORT, host: HOST, timestamp: new Date().toISOString() });
});

server.on('error', (error) => {
  logger.error('Server failed to start', { service: 'documents-server', error: error.message, code: error.code, port: PORT });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully', { service: 'documents-server' });
  server.close(async () => {
    try {
      await shutdownAuth();
      await googleApiService.shutdown();
      await cacheService.disconnect();
      await prisma.$disconnect();
      logger.info('Documents Server shutdown complete', { service: 'documents-server' });
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { service: 'documents-server', error: error.message, stack: error.stack });
      process.exit(1);
    }
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully', { service: 'documents-server' });
  server.close(async () => {
    try {
      await shutdownAuth();
      await googleApiService.shutdown();
      await cacheService.disconnect();
      await prisma.$disconnect();
      logger.info('Documents Server shutdown complete', { service: 'documents-server' });
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { service: 'documents-server', error: error.message, stack: error.stack });
      process.exit(1);
    }
  });
});

export default app;