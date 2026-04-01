import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import middleware from '../middleware/auth.js';
import { checkAdvancedPermission, filterDataByPermissions } from '../middleware/advanced-permissions.js';
import prisma from '../config/prisma-optimization.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { createSingleUpload, multerErrorHandler } from '../config/multer.js';
import MovimentoContabileGenerator from '../services/management/MovimentoContabileGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '..');

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// Get sopralluoghi by esecutore (persona)
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

      const sopralluoghi = await prisma.sopralluogo.findMany({
        where: {
          esecutoreId,
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
                  company: { select: { id: true, ragioneSociale: true } }
                }
              }
            }
          }
        },
        orderBy: { dataEsecuzione: 'desc' }
      });

      res.json({ data: sopralluoghi });
    } catch (error) {
      logger.error('Failed to get sopralluoghi by esecutore', {
        component: 'sopralluogo-routes',
        error: 'Operazione non riuscita'
      });
      res.status(500).json({ error: 'Errore nel recupero dei sopralluoghi' });
    }
  }
);

// Get all sopralluoghi for a site
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
      const site = await prisma.companySite.findFirst({
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

      const sopralluoghi = await prisma.sopralluogo.findMany({
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
          },
          esecutore: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { dataEsecuzione: 'desc' }
      });

      res.json({ sopralluoghi });
    } catch (error) {
      logger.error('Failed to fetch sopralluoghi', {
        component: 'sopralluogo-routes',
        action: 'getSopralluoghiBySite',
        error: 'Operazione non riuscita',
        siteId: req.params?.siteId
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nel recupero dei sopralluoghi'
      });
    }
  }
);

// P59: Get all sopralluoghi for a company (across all sites)
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
        return res.json({ sopralluoghi: [] });
      }

      // Trova tutte le sedi della CTP
      const sites = await prisma.companySite.findMany({
        where: { companyTenantProfileId: profile.id, tenantId, deletedAt: null },
        select: { id: true }
      });

      if (sites.length === 0) {
        return res.json({ sopralluoghi: [] });
      }

      const siteIds = sites.map(s => s.id);

      const sopralluoghi = await prisma.sopralluogo.findMany({
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
                    select: {
                      id: true,
                      ragioneSociale: true
                    }
                  }
                }
              }
            }
          },
          esecutore: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { dataEsecuzione: 'desc' }
      });

      res.json({ sopralluoghi });
    } catch (error) {
      logger.error('Failed to fetch sopralluoghi for company', {
        component: 'sopralluogo-routes',
        action: 'getSopralluoghiByCompany',
        error: 'Operazione non riuscita',
        companyId: req.params?.companyId
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nel recupero dei sopralluoghi'
      });
    }
  }
);

// Serve sopralluogo document PDF
router.get('/:id/documento',
  authenticateToken,
  checkAdvancedPermission('companies', 'read', {
    getSiteId: async (req) => {
      const sopralluogo = await prisma.sopralluogo.findFirst({
        where: { id: req.params.id, tenantId: getEffectiveTenantId(req), deletedAt: null },
        select: { siteId: true }
      });
      return sopralluogo?.siteId;
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const sopralluogo = await prisma.sopralluogo.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: { documentoUrl: true, documentoNome: true }
      });

      if (!sopralluogo || !sopralluogo.documentoUrl) {
        return res.status(404).json({ error: 'Documento non trovato' });
      }

      // Resolve to absolute path and validate it stays within allowed upload directories
      const filePath = path.resolve(sopralluogo.documentoUrl);
      const allowedUploadRoots = [
        path.resolve(BACKEND_ROOT, 'uploads'),
        path.resolve(BACKEND_ROOT, 'servers', 'uploads'),
      ];
      if (!allowedUploadRoots.some(root => filePath.startsWith(root + path.sep))) {
        return res.status(403).json({ error: 'Accesso al file non consentito' });
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File non trovato sul disco' });
      }

      // Sanitize filename to prevent HTTP header injection (OWASP A03)
      const rawFilename = sopralluogo.documentoNome || 'verbale-sopralluogo.pdf';
      const filename = rawFilename.replace(/[\r\n"]/g, '').replace(/[^\w.\-]/g, '_').substring(0, 100);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/pdf');
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      logger.error('Failed to serve sopralluogo document', {
        component: 'sopralluogo-routes',
        action: 'getDocumento',
        error: 'Operazione non riuscita',
        sopralluogoId: req.params?.id
      });
      res.status(500).json({ error: 'Errore nel recupero del documento' });
    }
  }
);

// Get sopralluogo by ID
router.get('/:id',
  authenticateToken,
  checkAdvancedPermission('companies', 'read', {
    getSiteId: async (req) => {
      const sopralluogo = await prisma.sopralluogo.findFirst({
        where: { id: req.params.id, tenantId: getEffectiveTenantId(req), deletedAt: null },
        select: { siteId: true }
      });
      return sopralluogo?.siteId;
    }
  }),
  filterDataByPermissions(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const sopralluogo = await prisma.sopralluogo.findFirst({
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
          },
          esecutore: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      if (!sopralluogo) {
        return res.status(404).json({
          error: 'Sopralluogo non trovato'
        });
      }

      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede

      res.json(sopralluogo);
    } catch (error) {
      logger.error('Failed to fetch sopralluogo', {
        component: 'sopralluogo-routes',
        action: 'getSopralluogo',
        error: 'Operazione non riuscita',
        sopralluogoId: req.params?.id
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nel recupero del sopralluogo'
      });
    }
  }
);

// Create new sopralluogo
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
      const {
        siteId,
        esecutoreId,
        dataEsecuzione,
        dataProssimoSopralluogo,
        valutazione,
        esito,
        note
      } = req.body;

      // Validate required fields
      if (!siteId || !dataEsecuzione) {
        return res.status(400).json({
          error: 'Campi obbligatori mancanti: siteId e dataEsecuzione'
        });
      }

      // Verifica che la sede esista
      const site = await prisma.companySite.findFirst({
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

      // Se è specificato un esecutore, verifica che esista
      if (esecutoreId) {
        const esecutore = await prisma.person.findFirst({
          where: { id: esecutoreId, deletedAt: null }
        });

        if (!esecutore) {
          return res.status(404).json({
            error: 'Esecutore non trovato'
          });
        }
      }

      const sopralluogo = await prisma.sopralluogo.create({
        data: {
          siteId,
          esecutoreId,
          dataEsecuzione: new Date(dataEsecuzione),
          dataProssimoSopralluogo: dataProssimoSopralluogo ? new Date(dataProssimoSopralluogo) : null,
          valutazione,
          esito,
          note,
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
          },
          esecutore: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      res.status(201).json(sopralluogo);

      // Genera movimenti contabili ENTRATA + USCITA in background
      setImmediate(() =>
        MovimentoContabileGenerator.generaPerSopralluogo(sopralluogo, tenantId, req.person?.id)
          .catch(err => logger.warn({ sopralluogoId: sopralluogo.id, error: err.message }, 'Billing per sopralluogo fallito'))
      );
    } catch (error) {
      logger.error('Failed to create sopralluogo', {
        component: 'sopralluogo-routes',
        action: 'createSopralluogo',
        error: 'Operazione non riuscita',
        siteId: req.body?.siteId
      });

      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nella creazione del sopralluogo'
      });
    }
  }
);

// Update sopralluogo
router.put('/:id',
  authenticateToken,
  createSingleUpload('documento'),
  multerErrorHandler,
  checkAdvancedPermission('companies', 'update', {
    getSiteId: async (req) => {
      const sopralluogo = await prisma.sopralluogo.findFirst({
        where: { id: req.params.id, tenantId: getEffectiveTenantId(req), deletedAt: null },
        select: { siteId: true }
      });
      return sopralluogo?.siteId;
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      // Check if sopralluogo exists
      const existingSopralluogo = await prisma.sopralluogo.findFirst({
        where: { id, tenantId, deletedAt: null }
      });

      if (!existingSopralluogo) {
        return res.status(404).json({
          error: 'Sopralluogo non trovato'
        });
      }

      // Se si sta cambiando l'esecutore, verifica che esista
      if (req.body.esecutoreId) {
        const esecutore = await prisma.person.findFirst({
          where: { id: req.body.esecutoreId, deletedAt: null }
        });

        if (!esecutore) {
          return res.status(404).json({
            error: 'Esecutore non trovato'
          });
        }
      }

      // Whitelist campi aggiornabili (security: no mass assignment)
      const allowedFields = ['siteId', 'esecutoreId', 'dataEsecuzione', 'dataProssimoSopralluogo', 'valutazione', 'esito', 'note'];
      const safeData = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) safeData[key] = req.body[key];
      }
      if (req.file) {
        safeData.documentoUrl = req.file.path;
        safeData.documentoNome = req.file.originalname;
      }
      if (safeData.dataEsecuzione) safeData.dataEsecuzione = new Date(safeData.dataEsecuzione);
      if (safeData.dataProssimoSopralluogo) safeData.dataProssimoSopralluogo = new Date(safeData.dataProssimoSopralluogo);

      const sopralluogo = await prisma.sopralluogo.update({
        where: { id, tenantId },
        data: safeData,
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
          },
          esecutore: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      res.json(sopralluogo);

      // Aggiorna movimenti contabili in background (invalida BOZZA + rigenera)
      setImmediate(() =>
        MovimentoContabileGenerator.aggiornaPerSopralluogo(sopralluogo, tenantId, req.person?.id)
          .catch(err => logger.warn({ sopralluogoId: sopralluogo.id, error: err.message }, 'Aggiornamento billing sopralluogo fallito'))
      );
    } catch (error) {
      logger.error('Failed to update sopralluogo', {
        component: 'sopralluogo-routes',
        action: 'updateSopralluogo',
        error: 'Operazione non riuscita',
        sopralluogoId: req.params?.id
      });

      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nell\'aggiornamento del sopralluogo'
      });
    }
  }
);

// Delete sopralluogo (soft delete)
router.delete('/:id',
  authenticateToken,
  checkAdvancedPermission('companies', 'delete', {
    getSiteId: async (req) => {
      const sopralluogo = await prisma.sopralluogo.findFirst({
        where: { id: req.params.id, tenantId: getEffectiveTenantId(req), deletedAt: null },
        select: { siteId: true }
      });
      return sopralluogo?.siteId;
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      // Check if sopralluogo exists
      const existingSopralluogo = await prisma.sopralluogo.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: { id: true }
      });

      if (!existingSopralluogo) {
        return res.status(404).json({
          error: 'Sopralluogo non trovato'
        });
      }

      // Soft delete
      await prisma.sopralluogo.update({
        where: { id, tenantId },
        data: {
          deletedAt: new Date()
        }
      });

      // Annulla movimenti contabili collegati in background
      setImmediate(() =>
        MovimentoContabileGenerator.annullaMovimentiSorgente(
          { sopralluogoId: id },
          tenantId,
          req.person?.id || null
        ).catch(err => logger.warn({ sopralluogoId: id, error: err.message }, 'Annullamento billing sopralluogo fallito'))
      );

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete sopralluogo', {
        component: 'sopralluogo-routes',
        action: 'deleteSopralluogo',
        error: 'Operazione non riuscita',
        sopralluogoId: req.params?.id
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nell\'eliminazione del sopralluogo'
      });
    }
  }
);

export default router;