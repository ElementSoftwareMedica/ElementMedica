import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import middleware from '../middleware/auth.js';
import { checkAdvancedPermission, filterDataByPermissions } from '../middleware/advanced-permissions.js';
import { requireFeature } from '../middleware/featureFlags.js';
import prisma from '../config/prisma-optimization.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { createSingleUpload, multerErrorHandler } from '../config/multer.js';
import { validateParamId } from '../middleware/validateUUID.js';
import MovimentoContabileGenerator from '../services/management/MovimentoContabileGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(BACKEND_ROOT, '..');

const router = express.Router();
const { authenticate: authenticateToken } = middleware;
router.param('id', validateParamId);

// Quicklook DVR: deve restare disponibile dalla scheda azienda anche quando
// l'utente non ha il ramo consulenza attivo ma ha accesso al tenant/azienda.
router.get('/:id/documento', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    const dvr = await prisma.dVR.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { tenantId },
          { site: { tenantId, deletedAt: null } },
          { site: { companyTenantProfile: { tenantId, deletedAt: null } } }
        ]
      },
      select: { documentoUrl: true, documentoNome: true }
    });

    if (!dvr) {
      return res.status(404).json({ error: 'DVR non trovato per questo tenant' });
    }
    if (!dvr.documentoUrl) {
      return res.status(404).json({ error: 'Documento non ancora generato per questo DVR' });
    }
    if (dvr.documentoUrl.includes('..')) {
      return res.status(403).json({ error: 'Accesso al file non consentito' });
    }

    const allowedUploadRoots = [
      path.resolve(BACKEND_ROOT, 'uploads'),
      path.resolve(BACKEND_ROOT, 'servers', 'uploads'),
      path.resolve(PROJECT_ROOT, 'uploads'),
    ];
    const isAllowed = (p) => allowedUploadRoots.some(root => p.startsWith(root + path.sep) || p === root);
    const candidates = [
      path.resolve(dvr.documentoUrl),
      ...allowedUploadRoots.map(root => path.normalize(path.join(root, dvr.documentoUrl.replace(/^.*[/\\]uploads[/\\]/, '')))),
      ...allowedUploadRoots.map(root => path.normalize(path.join(root, path.basename(dvr.documentoUrl)))),
    ];

    const filePath = candidates.find(candidate => {
      try {
        const real = fs.realpathSync(candidate);
        return isAllowed(real);
      } catch {
        return false;
      }
    });

    if (!filePath) {
      logger.warn('DVR document file not found on disk', {
        component: 'dvr-routes',
        action: 'getDocumentoPublicBranchSafe',
        dvrId: id,
        storedPath: dvr.documentoUrl
      });
      return res.status(404).json({ error: 'File non trovato sul disco' });
    }

    const filename = (dvr.documentoNome || 'documento.pdf').replace(/[\r\n"]/g, '').replace(/[^\w.\-]/g, '_').substring(0, 100);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    logger.error('Failed to serve DVR document before feature gate', {
      component: 'dvr-routes',
      action: 'getDocumentoPublicBranchSafe',
      error: error.message,
      dvrId: req.params?.id
    });
    res.status(500).json({ error: 'Errore nel recupero del documento' });
  }
});

// Feature gate: DVR richiede BRANCH_CONSULENZA
router.use(authenticateToken, requireFeature('BRANCH_CONSULENZA'));

// Get DVRs by esecutore (persona) - DVR uses firma fields, not esecutoreId
router.get('/by-esecutore',
  authenticateToken,
  checkAdvancedPermission('companies', 'read'),
  async (req, res) => {
    try {
      const { esecutoreId } = req.query;
      const tenantId = getEffectiveTenantId(req);

      if (!esecutoreId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(esecutoreId)) {
        return res.status(400).json({ error: 'esecutoreId non valido' });
      }

      const dvrs = await prisma.dVR.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { firmaMcId: esecutoreId },
            { firmaRsppId: esecutoreId },
            { firmaDatoreId: esecutoreId },
            { firmaRlsId: esecutoreId }
          ]
        },
        include: {
          site: {
            select: {
              id: true,
              siteName: true,
              companyTenantProfile: {
                select: {
                  id: true,
                  company: { select: { id: true, ragioneSociale: true } }
                }
              }
            }
          }
        },
        orderBy: { dataEsecuzione: 'desc' }
      });

      res.json({ data: dvrs });
    } catch (error) {
      logger.error('Failed to get DVRs by esecutore', {
        component: 'dvr-routes',
        error: 'Operazione non riuscita'
      });
      res.status(500).json({ error: 'Errore nel recupero dei DVR' });
    }
  }
);

// Get all DVRs for a site
router.get('/site/:siteId',
  authenticateToken,
  checkAdvancedPermission('companies', 'read', {
    getSiteId: (req) => req.params.siteId
  }),
  filterDataByPermissions(),
  async (req, res) => {
    try {
      const { siteId } = req.params;
      const tenantId = getEffectiveTenantId(req);

      // Verifica che la sede esista
      const site = await prisma.companySite.findUnique({
        where: { id: siteId, tenantId, deletedAt: null },
        include: { companyTenantProfile: { include: { company: true } } }
      });

      if (!site) {
        return res.status(404).json({
          error: 'Sede non trovata'
        });
      }

      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede

      const dvrs = await prisma.dVR.findMany({
        where: {
          siteId,
          tenantId,
          deletedAt: null
        },
        include: {
          site: {
            select: {
              id: true,
              siteName: true,
              companyTenantProfile: {
                select: {
                  id: true,
                  company: {
                    select: {
                      id: true,
                      ragioneSociale: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { dataScadenza: 'asc' }
      });

      res.json({ dvrs });
    } catch (error) {
      logger.error('Failed to fetch DVRs', {
        component: 'dvr-routes',
        action: 'getDVRsBySite',
        error: 'Operazione non riuscita',
        siteId: req.params?.siteId
      });
      res.status(500).json({
        error: 'Errore nel recupero dei DVR'
      });
    }
  }
);

// P59: Get all DVRs for a company (across all sites)
router.get('/company/:companyId',
  authenticateToken,
  checkAdvancedPermission('companies', 'read'),
  async (req, res) => {
    try {
      const { companyId } = req.params;
      const tenantId = getEffectiveTenantId(req);

      // Risolvi CTP dal global Company.id
      const profile = await prisma.companyTenantProfile.findFirst({
        where: { companyId, tenantId, deletedAt: null },
        select: { id: true }
      });

      if (!profile) {
        return res.json({ dvrs: [] });
      }

      // Trova tutte le sedi della CTP
      const sites = await prisma.companySite.findMany({
        where: { companyTenantProfileId: profile.id, tenantId, deletedAt: null },
        select: { id: true }
      });

      if (sites.length === 0) {
        return res.json({ dvrs: [] });
      }

      const siteIds = sites.map(s => s.id);

      const dvrs = await prisma.dVR.findMany({
        where: {
          siteId: { in: siteIds },
          tenantId,
          deletedAt: null
        },
        include: {
          site: {
            select: {
              id: true,
              siteName: true,
              companyTenantProfile: {
                select: {
                  id: true,
                  company: {
                    select: { id: true, ragioneSociale: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { dataScadenza: 'asc' }
      });

      res.json({ dvrs });
    } catch (error) {
      logger.error('Failed to fetch DVRs for company', {
        component: 'dvr-routes',
        action: 'getDVRsByCompany',
        error: 'Operazione non riuscita',
        companyId: req.params?.companyId
      });
      res.status(500).json({
        error: 'Errore nel recupero dei DVR'
      });
    }
  }
);

// Download/serve DVR document (MUST be before /:id to avoid param capture)
router.get('/:id/documento',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const dvr = await prisma.dVR.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: { documentoUrl: true, documentoNome: true }
      });

      if (!dvr) {
        logger.warn('DVR document request failed: record not found or wrong tenant', {
          component: 'dvr-routes',
          action: 'getDocumento',
          dvrId: id,
          tenantId
        });
        return res.status(404).json({ error: 'DVR non trovato per questo tenant' });
      }

      if (!dvr.documentoUrl) {
        logger.warn('DVR document request failed: documentoUrl is null', {
          component: 'dvr-routes',
          action: 'getDocumento',
          dvrId: id
        });
        return res.status(404).json({ error: 'Documento non ancora generato per questo DVR' });
      }

      // Resolve to absolute path — try multiple base directories for robustness
      const allowedUploadRoots = [
        path.resolve(BACKEND_ROOT, 'uploads'),
        path.resolve(BACKEND_ROOT, 'servers', 'uploads'),
        path.resolve(PROJECT_ROOT, 'uploads'),
      ];

      // Security: reject paths with traversal sequences
      if (dvr.documentoUrl.includes('..')) {
        return res.status(403).json({ error: 'Accesso al file non consentito' });
      }

      // Security: validate allowlist BEFORE any file access
      const isAllowed = (p) => allowedUploadRoots.some(root => p.startsWith(root + path.sep) || p === root);

      // Helper: resolve symlinks and verify still within allowed roots (prevents symlink attacks)
      const resolveAndValidate = (candidate) => {
        try {
          const real = fs.realpathSync(candidate);
          return isAllowed(real) ? real : null;
        } catch { return null; }
      };

      // Strategy 1: Try the stored path directly (absolute or CWD-relative)
      let filePath = path.resolve(dvr.documentoUrl);
      let realPath = isAllowed(filePath) ? resolveAndValidate(filePath) : null;
      let fileFound = !!realPath;
      if (fileFound) filePath = realPath;

      // Strategy 2: Extract relative portion after "uploads/" and try each allowed root
      if (!fileFound) {
        const relativePart = dvr.documentoUrl.replace(/^.*[/\\]uploads[/\\]/, '');
        for (const root of allowedUploadRoots) {
          const candidate = path.normalize(path.join(root, relativePart));
          if (isAllowed(candidate)) {
            const real = resolveAndValidate(candidate);
            if (real) {
              filePath = real;
              fileFound = true;
              break;
            }
          }
        }
      }

      // Strategy 3: Try just the filename in each upload root (file may have been moved)
      if (!fileFound) {
        const basename = path.basename(dvr.documentoUrl);
        for (const root of allowedUploadRoots) {
          const candidate = path.normalize(path.join(root, basename));
          if (isAllowed(candidate)) {
            const real = resolveAndValidate(candidate);
            if (real) {
              filePath = real;
              fileFound = true;
              break;
            }
          }
        }
      }

      if (!fileFound) {
        // Final security check: ensure resolved path is still within allowed roots
        if (!isAllowed(filePath)) {
          return res.status(403).json({ error: 'Accesso al file non consentito' });
        }
        logger.warn('DVR document file not found on disk', {
          component: 'dvr-routes',
          action: 'getDocumento',
          dvrId: id,
          storedPath: dvr.documentoUrl,
          resolvedPath: filePath
        });
        return res.status(404).json({ error: 'File non trovato sul disco' });
      }

      // Sanitize filename to prevent HTTP header injection (OWASP A03)
      const rawFilename = dvr.documentoNome || 'documento.pdf';
      const filename = rawFilename.replace(/[\r\n"]/g, '').replace(/[^\w.\-]/g, '_').substring(0, 100);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/pdf');
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      logger.error('Failed to serve DVR document', {
        component: 'dvr-routes',
        action: 'getDocumento',
        error: 'Operazione non riuscita',
        dvrId: req.params?.id
      });
      res.status(500).json({ error: 'Errore nel recupero del documento' });
    }
  }
);

// Get DVR by ID
router.get('/:id',
  authenticateToken,
  checkAdvancedPermission('companies', 'read', {
    getSiteId: async (req) => {
      const dvr = await prisma.dVR.findUnique({
        where: { id: req.params.id, tenantId: getEffectiveTenantId(req), deletedAt: null },
        select: { siteId: true }
      });
      return dvr?.siteId;
    }
  }),
  filterDataByPermissions(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const dvr = await prisma.dVR.findUnique({
        where: {
          id,
          tenantId,
          deletedAt: null
        },
        include: {
          site: {
            include: {
              companyTenantProfile: { include: { company: true } }
            }
          }
        }
      });

      if (!dvr) {
        return res.status(404).json({
          error: 'DVR non trovato'
        });
      }

      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede

      res.json(dvr);
    } catch (error) {
      logger.error('Failed to fetch DVR', {
        component: 'dvr-routes',
        action: 'getDVR',
        error: 'Operazione non riuscita',
        stack: error.stack,
        dvrId: req.params?.id
      });
      res.status(500).json({
        error: 'Errore nel recupero del DVR'
      });
    }
  }
);

// Create new DVR
router.post('/',
  authenticateToken,
  createSingleUpload('documento'),
  multerErrorHandler,
  checkAdvancedPermission('companies', 'create', {
    getSiteId: (req) => req.body.siteId
  }),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const { siteId, effettuatoDa, dataEsecuzione, dataScadenza, rischiRilevati, note, tipoDVR } = req.body;

      // Validate required fields
      if (!siteId || !effettuatoDa || !dataEsecuzione || !dataScadenza) {
        return res.status(400).json({
          error: 'Campi obbligatori mancanti: siteId, effettuatoDa, dataEsecuzione, dataScadenza'
        });
      }

      // Verifica che la sede esista
      const site = await prisma.companySite.findUnique({
        where: { id: siteId, tenantId, deletedAt: null },
        include: { companyTenantProfile: { include: { company: true } } }
      });

      if (!site) {
        return res.status(404).json({
          error: 'Sede non trovata'
        });
      }

      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede

      const dvr = await prisma.dVR.create({
        data: {
          siteId,
          effettuatoDa,
          dataEsecuzione: new Date(dataEsecuzione),
          dataScadenza: new Date(dataScadenza),
          rischiRilevati,
          note,
          tipoDVR,
          tenantId,
          ...(req.file && {
            documentoUrl: req.file.path,
            documentoNome: req.file.originalname
          })
        },
        include: {
          site: {
            select: {
              id: true,
              siteName: true,
              companyTenantProfile: {
                select: {
                  id: true,
                  company: {
                    select: {
                      id: true,
                      ragioneSociale: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Genera movimenti contabili (ENTRATA + USCITA) in background
      setImmediate(() =>
        MovimentoContabileGenerator.generaPerDVR(dvr, tenantId, req.person?.id)
          .catch(err => logger.warn({ dvrId: dvr.id, error: err.message }, 'Generazione movimenti DVR fallita'))
      );

      res.status(201).json(dvr);
    } catch (error) {
      logger.error('Failed to create DVR', {
        component: 'dvr-routes',
        action: 'createDVR',
        error: 'Operazione non riuscita',
        stack: error.stack,
        siteId: req.body?.siteId
      });

      res.status(500).json({
        error: 'Errore nella creazione del DVR'
      });
    }
  }
);

// Update DVR
router.put('/:id',
  authenticateToken,
  createSingleUpload('documento'),
  multerErrorHandler,
  checkAdvancedPermission('companies', 'update', {
    getSiteId: async (req) => {
      const dvr = await prisma.dVR.findUnique({
        where: { id: req.params.id, tenantId: getEffectiveTenantId(req), deletedAt: null },
        select: { siteId: true }
      });
      return dvr?.siteId;
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      // Whitelist allowed fields to prevent mass assignment (OWASP A1)
      const { effettuatoDa, dataEsecuzione, dataScadenza, rischiRilevati, note, tipoDVR } = req.body;
      const updateData = {};
      if (effettuatoDa !== undefined) updateData.effettuatoDa = effettuatoDa;
      if (dataEsecuzione !== undefined) updateData.dataEsecuzione = new Date(dataEsecuzione);
      if (dataScadenza !== undefined) updateData.dataScadenza = new Date(dataScadenza);
      if (rischiRilevati !== undefined) updateData.rischiRilevati = rischiRilevati;
      if (note !== undefined) updateData.note = note;
      if (tipoDVR !== undefined) updateData.tipoDVR = tipoDVR;

      // Handle file upload
      if (req.file) {
        updateData.documentoUrl = req.file.path;
        updateData.documentoNome = req.file.originalname;
      }

      // Check if DVR exists
      const existingDVR = await prisma.dVR.findUnique({
        where: {
          id,
          tenantId,
          deletedAt: null
        },
        include: {
          site: {
            include: {
              companyTenantProfile: { include: { company: true } }
            }
          }
        }
      });

      if (!existingDVR) {
        return res.status(404).json({
          error: 'DVR non trovato'
        });
      }

      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede

      const dvr = await prisma.dVR.update({
        where: { id, tenantId },
        data: updateData,
        include: {
          site: {
            select: {
              id: true,
              siteName: true,
              companyTenantProfile: {
                select: {
                  id: true,
                  company: {
                    select: {
                      id: true,
                      ragioneSociale: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Rigenera movimenti contabili (invalida BOZZA + ricrea)
      setImmediate(() =>
        MovimentoContabileGenerator.aggiornaPerDVR(dvr, tenantId, req.person?.id)
          .catch(err => logger.warn({ dvrId: dvr.id, error: err.message }, 'Rigenerazione movimenti DVR fallita'))
      );

      res.json(dvr);
    } catch (error) {
      logger.error('Failed to update DVR', {
        component: 'dvr-routes',
        action: 'updateDVR',
        error: 'Operazione non riuscita',
        dvrId: req.params?.id
      });

      res.status(500).json({
        error: 'Errore nell\'aggiornamento del DVR'
      });
    }
  }
);

// Delete DVR (soft delete)
router.delete('/:id',
  authenticateToken,
  checkAdvancedPermission('companies', 'delete', {
    getSiteId: async (req) => {
      const dvr = await prisma.dVR.findUnique({
        where: { id: req.params.id, tenantId: getEffectiveTenantId(req), deletedAt: null },
        select: { siteId: true }
      });
      return dvr?.siteId;
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      // Check if DVR exists
      const existingDVR = await prisma.dVR.findUnique({
        where: {
          id,
          tenantId,
          deletedAt: null
        },
        include: {
          site: {
            include: {
              companyTenantProfile: { include: { company: true } }
            }
          }
        }
      });

      if (!existingDVR) {
        return res.status(404).json({
          error: 'DVR non trovato'
        });
      }

      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede

      // Soft delete
      await prisma.dVR.update({
        where: { id, tenantId },
        data: {
          deletedAt: new Date()
        }
      });

      // Annulla movimenti contabili collegati
      setImmediate(() =>
        MovimentoContabileGenerator.annullaMovimentiSorgente({ dvrId: id }, tenantId, req.person?.id)
          .catch(err => logger.warn({ dvrId: id, error: err.message }, 'Annullamento movimenti DVR fallito'))
      );

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete DVR', {
        component: 'dvr-routes',
        action: 'deleteDVR',
        error: 'Operazione non riuscita',
        dvrId: req.params?.id
      });
      res.status(500).json({
        error: 'Errore nell\'eliminazione del DVR'
      });
    }
  }
);

export default router;
