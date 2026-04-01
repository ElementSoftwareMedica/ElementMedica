import express from 'express';
import logger from '../utils/logger.js';
import middleware from '../middleware/auth.js';
import { checkAdvancedPermission, filterDataByPermissions, requireOwnCompany } from '../middleware/advanced-permissions.js';
import prisma from '../config/prisma-optimization.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// Get all sites for a company
router.get('/company/:companyId',
  authenticateToken,
  async (req, res) => {
    try {
      const { companyId } = req.params;
      const tenantId = getEffectiveTenantId(req);

      // P48: Verifica che la company esista e abbia un profilo nel tenant
      const profile = await prisma.companyTenantProfile.findFirst({
        where: { companyId, tenantId, deletedAt: null }
      });

      if (!profile) {
        return res.status(404).json({
          error: 'Azienda non trovata',
          message: 'Azienda non trovata'
        });
      }

      // P48: CompanySite usa companyTenantProfileId
      const sites = await prisma.companySite.findMany({
        where: {
          companyTenantProfileId: profile.id,
          tenantId,
          deletedAt: null
        },
        include: {
          rspp: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          medicoCompetente: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              personProfiles: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Restituisco i dati nel formato atteso dal frontend
      res.json({ sites });
    } catch (error) {
      logger.error('Failed to fetch company sites', {
        component: 'company-sites-routes',
        action: 'getCompanySites',
        error: 'Operazione non riuscita',
        stack: error.stack,
        companyId: req.params?.companyId
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nel recupero delle sedi aziendali'
      });
    }
  }
);

// Get site by ID
router.get('/:id',
  authenticateToken,
  checkAdvancedPermission('companies', 'read', {
    getSiteId: (req) => req.params.id
  }),
  filterDataByPermissions(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const site = await prisma.companySite.findUnique({
        where: {
          id,
          tenantId,
          deletedAt: null
        },
        include: {
          companyTenantProfile: { include: { company: true } },
          rspp: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          medicoCompetente: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          personProfiles: {
            where: { deletedAt: null },
            select: {
              id: true,
              email: true,
              phone: true,
              title: true,
              person: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      if (!site) {
        return res.status(404).json({
          error: 'Sede non trovata',
          message: 'Sede non trovata'
        });
      }

      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede

      res.json(site);
    } catch (error) {
      logger.error('Failed to fetch site', {
        component: 'company-sites-routes',
        action: 'getSite',
        error: 'Operazione non riuscita',
        stack: error.stack,
        siteId: req.params?.id
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nel recupero della sede'
      });
    }
  }
);

// Create new site
router.post('/',
  authenticateToken,
  // checkAdvancedPermission('companies', 'create'), // Temporaneamente disabilitato per debug
  async (req, res) => {
    try {
      const person = req.person;
      const tenantId = getEffectiveTenantId(req);
      const { companyId, siteName, ...siteData } = req.body;

      // Validate required fields
      if (!companyId || !siteName) {
        return res.status(400).json({
          error: 'Errore di validazione',
          message: 'companyId e nome sede sono obbligatori'
        });
      }

      // P48: Trova CompanyTenantProfile per la company nel tenant corrente
      const profile = await prisma.companyTenantProfile.findFirst({
        where: { companyId, tenantId, deletedAt: null }
      });

      if (!profile) {
        return res.status(404).json({
          error: 'Azienda non trovata',
          message: 'Azienda non trovata nel tenant corrente'
        });
      }

      // Verifica che non esista già una sede con lo stesso nome per questa company
      const existingSite = await prisma.companySite.findFirst({
        where: {
          companyTenantProfileId: profile.id,
          siteName,
          tenantId,
          deletedAt: null
        }
      });

      if (existingSite) {
        return res.status(409).json({
          error: 'Conflitto',
          message: 'Esiste già una sede con questo nome per questa azienda'
        });
      }

      // Whitelist dei campi consentiti per CompanySite
      const ALLOWED_FIELDS = [
        'siteName', 'indirizzo', 'citta', 'cap', 'provincia', 'telefono', 'mail',
        'personaRiferimento', 'numeroPAT', 'referenteId', 'rsppId', 'medicoCompetenteId',
        'dvr', 'dvrDataAggiornamento',
        'ultimoSopralluogo', 'prossimoSopralluogo', 'valutazioneSopralluogo', 'sopralluogoEseguitoDa',
        'ultimoSopralluogoRSPP', 'prossimoSopralluogoRSPP', 'noteSopralluogoRSPP',
        'ultimoSopralluogoMedico', 'prossimoSopralluogoMedico', 'noteSopralluogoMedico'
      ];
      const cleanedSiteData = {};
      for (const key of ALLOWED_FIELDS) {
        if (key in siteData) cleanedSiteData[key] = siteData[key];
      }

      // Converti stringhe vuote in null per i campi DateTime
      const dateFields = [
        'ultimoSopralluogo',
        'prossimoSopralluogo',
        'ultimoSopralluogoRSPP',
        'prossimoSopralluogoRSPP',
        'ultimoSopralluogoMedico',
        'prossimoSopralluogoMedico'
      ];

      dateFields.forEach(field => {
        if (cleanedSiteData[field] === '' || cleanedSiteData[field] === undefined) {
          cleanedSiteData[field] = null;
        } else if (cleanedSiteData[field]) {
          // Converti in Date se è una stringa valida
          try {
            cleanedSiteData[field] = new Date(cleanedSiteData[field]);
          } catch (e) {
            cleanedSiteData[field] = null;
          }
        }
      });

      const site = await prisma.companySite.create({
        data: {
          companyTenantProfileId: profile.id,
          siteName,
          tenantId,
          ...cleanedSiteData
        },
        include: {
          companyTenantProfile: { include: { company: true } },
          rspp: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          medicoCompetente: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      res.status(201).json(site);
    } catch (error) {
      logger.error('Failed to create site', {
        component: 'company-sites-routes',
        action: 'createSite',
        error: 'Operazione non riuscita',
        stack: error.stack,
        companyId: req.body?.companyId,
        siteName: req.body?.siteName
      });

      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'Conflitto',
          message: 'Esiste già una sede con queste informazioni'
        });
      }

      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nella creazione della sede'
      });
    }
  }
);

// Update site
router.put('/:id',
  authenticateToken,
  // checkAdvancedPermission('companies', 'update'), // Temporaneamente disabilitato per debug
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const updateData = req.body;

      // Check if site exists
      const existingSite = await prisma.companySite.findUnique({
        where: {
          id,
          tenantId,
          deletedAt: null
        },
        include: {
          companyTenantProfile: true
        }
      });

      if (!existingSite) {
        return res.status(404).json({
          error: 'Sede non trovata',
          message: 'Sede non trovata'
        });
      }

      // Se si sta cambiando il nome della sede, verifica che non esista già
      if (updateData.siteName && updateData.siteName !== existingSite.siteName) {
        const duplicateSite = await prisma.companySite.findFirst({
          where: {
            companyTenantProfileId: existingSite.companyTenantProfileId,
            siteName: updateData.siteName,
            tenantId,
            deletedAt: null,
            id: { not: id }
          }
        });

        if (duplicateSite) {
          return res.status(409).json({
            error: 'Conflitto',
            message: 'Esiste già una sede con questo nome per questa azienda'
          });
        }
      }

      // Whitelist dei campi consentiti per CompanySite
      const ALLOWED_FIELDS = [
        'siteName', 'indirizzo', 'citta', 'cap', 'provincia', 'telefono', 'mail',
        'personaRiferimento', 'numeroPAT', 'referenteId', 'rsppId', 'medicoCompetenteId',
        'dvr', 'dvrDataAggiornamento',
        'ultimoSopralluogo', 'prossimoSopralluogo', 'valutazioneSopralluogo', 'sopralluogoEseguitoDa',
        'ultimoSopralluogoRSPP', 'prossimoSopralluogoRSPP', 'noteSopralluogoRSPP',
        'ultimoSopralluogoMedico', 'prossimoSopralluogoMedico', 'noteSopralluogoMedico'
      ];
      const cleanedUpdateData = {};
      for (const key of ALLOWED_FIELDS) {
        if (key in updateData) cleanedUpdateData[key] = updateData[key];
      }

      // Converti stringhe vuote in null per i campi DateTime
      const dateFields = [
        'ultimoSopralluogo',
        'prossimoSopralluogo',
        'ultimoSopralluogoRSPP',
        'prossimoSopralluogoRSPP',
        'ultimoSopralluogoMedico',
        'prossimoSopralluogoMedico'
      ];

      dateFields.forEach(field => {
        if (cleanedUpdateData[field] === '' || cleanedUpdateData[field] === undefined) {
          cleanedUpdateData[field] = null;
        } else if (cleanedUpdateData[field]) {
          // Converti in Date se è una stringa valida
          try {
            cleanedUpdateData[field] = new Date(cleanedUpdateData[field]);
          } catch (e) {
            cleanedUpdateData[field] = null;
          }
        }
      });

      const site = await prisma.companySite.update({
        where: { id },
        data: cleanedUpdateData,
        include: {
          companyTenantProfile: { include: { company: true } },
          rspp: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          medicoCompetente: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      res.json(site);
    } catch (error) {
      logger.error('Failed to update site', {
        component: 'company-sites-routes',
        action: 'updateSite',
        error: 'Operazione non riuscita',
        stack: error.stack,
        siteId: req.params?.id
      });

      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'Conflitto',
          message: 'Esiste già una sede con queste informazioni'
        });
      }

      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nell\'aggiornamento della sede'
      });
    }
  }
);

// Delete site (soft delete)
router.delete('/:id',
  authenticateToken,
  checkAdvancedPermission('companies', 'delete'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      // Check if site exists
      const existingSite = await prisma.companySite.findUnique({
        where: {
          id,
          tenantId,
          deletedAt: null
        }
      });

      if (!existingSite) {
        return res.status(404).json({
          error: 'Sede non trovata',
          message: 'Sede non trovata'
        });
      }

      // P48: Verifica che non ci siano profili assegnati a questa sede
      const assignedProfiles = await prisma.personTenantProfile.count({
        where: {
          siteId: id,
          tenantId,
          deletedAt: null
        }
      });

      if (assignedProfiles > 0) {
        return res.status(409).json({
          error: 'Conflitto',
          message: 'Impossibile eliminare la sede: ci sono ancora dipendenti assegnati'
        });
      }

      // Soft delete
      await prisma.companySite.update({
        where: { id },
        data: {
          deletedAt: new Date()
        }
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete site', {
        component: 'company-sites-routes',
        action: 'deleteSite',
        error: 'Operazione non riuscita',
        stack: error.stack,
        siteId: req.params?.id
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nell\'eliminazione della sede'
      });
    }
  }
);

// Migrate employees from one site to another and optionally delete the source site
router.post('/:id/migrate-employees',
  authenticateToken,
  checkAdvancedPermission('companies', 'write'),
  async (req, res) => {
    try {
      const { id: sourceSiteId } = req.params;
      const { targetSiteId, deleteSourceSite } = req.body;
      const tenantId = getEffectiveTenantId(req);

      if (!targetSiteId) {
        return res.status(400).json({
          error: 'Parametri mancanti',
          message: 'Specificare la sede di destinazione (targetSiteId)'
        });
      }

      if (sourceSiteId === targetSiteId) {
        return res.status(400).json({
          error: 'Operazione non valida',
          message: 'La sede di origine e destinazione devono essere diverse'
        });
      }

      // Verify source site exists and belongs to tenant
      const sourceSite = await prisma.companySite.findFirst({
        where: { id: sourceSiteId, tenantId, deletedAt: null }
      });
      if (!sourceSite) {
        return res.status(404).json({
          error: 'Sede non trovata',
          message: 'La sede di origine non esiste'
        });
      }

      // Verify target site exists, belongs to same company and tenant
      const targetSite = await prisma.companySite.findFirst({
        where: { id: targetSiteId, companyId: sourceSite.companyId, tenantId, deletedAt: null }
      });
      if (!targetSite) {
        return res.status(404).json({
          error: 'Sede di destinazione non trovata',
          message: 'La sede di destinazione non esiste o non appartiene alla stessa azienda'
        });
      }

      // Migrate all employees
      const result = await prisma.personTenantProfile.updateMany({
        where: { siteId: sourceSiteId, tenantId, deletedAt: null },
        data: { siteId: targetSiteId }
      });

      // Optionally soft-delete the source site
      if (deleteSourceSite) {
        await prisma.companySite.update({
          where: { id: sourceSiteId },
          data: { deletedAt: new Date() }
        });
      }

      logger.info('Employees migrated between sites', {
        component: 'company-sites-routes',
        action: 'migrateEmployees',
        sourceSiteId,
        targetSiteId,
        migratedCount: result.count,
        sourceDeleted: !!deleteSourceSite
      });

      res.json({
        success: true,
        message: `${result.count} dipendenti migrati con successo`,
        migratedCount: result.count
      });
    } catch (error) {
      logger.error('Failed to migrate employees', {
        component: 'company-sites-routes',
        action: 'migrateEmployees',
        error: 'Operazione non riuscita',
        stack: error.stack,
        siteId: req.params?.id
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nella migrazione dei dipendenti'
      });
    }
  }
);

export default router;