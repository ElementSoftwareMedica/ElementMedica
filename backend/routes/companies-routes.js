import express from 'express';
import logger from '../utils/logger.js';
import middleware from '../auth/middleware.js';
import { checkAdvancedPermission, filterDataByPermissions, requireOwnCompany } from '../middleware/advanced-permissions.js';

const router = express.Router();
import prisma from '../config/prisma-optimization.js';
import { randomUUID } from 'crypto';

const { authenticate: authenticateToken } = middleware;

/**
 * Sanitizza i dati dell'azienda rimuovendo i campi che appartengono al modello CompanySite
 * @param {Object} companyData - Dati grezzi dell'azienda dal CSV
 * @returns {Object} - Oggetto con i dati sanitizzati per Company e CompanySite
 */
function sanitizeCompanyData(companyData) {
  // Campi validi per il modello Company (basati sullo schema Prisma)
  // Rimuoviamo i campi duplicati che appartengono a CompanySite
  const validCompanyFields = [
    'id', 'iban', 'pec', 'sdi', 'tenantId', 'slug', 'domain', 'settings',
    'codiceAteco', 'codiceFiscale', 'createdAt', 'deletedAt', 'isActive',
    'subscriptionPlan', 'updatedAt', 'ragioneSociale', 'note', 'piva'
  ];

  // Campi che appartengono al modello CompanySite (inclusi alias legacy)
  const companySiteFieldMap = {
    // alias -> canonical key in siteData
    siteName: 'siteName',
    nomeSede: 'siteName',
    sedeAzienda: 'siteName',
    siteIndirizzo: 'siteIndirizzo',
    indirizzo: 'siteIndirizzo',
    siteCitta: 'siteCitta',
    citta: 'siteCitta',
    siteProvincia: 'siteProvincia',
    provincia: 'siteProvincia',
    siteCap: 'siteCap',
    cap: 'siteCap',
    sitePersonaRiferimento: 'sitePersonaRiferimento',
    personaRiferimento: 'sitePersonaRiferimento',
    siteTelefono: 'siteTelefono',
    telefono: 'siteTelefono',
    siteMail: 'siteMail',
    mail: 'siteMail',
    dvr: 'dvr',
    rsppId: 'rsppId',
    medicoCompetenteId: 'medicoCompetenteId',
    ultimoSopralluogo: 'ultimoSopralluogo',
    prossimoSopralluogo: 'prossimoSopralluogo',
    valutazioneSopralluogo: 'valutazioneSopralluogo',
    sopralluogoEseguitoDa: 'sopralluogoEseguitoDa',
    ultimoSopralluogoRSPP: 'ultimoSopralluogoRSPP',
    prossimoSopralluogoRSPP: 'prossimoSopralluogoRSPP',
    noteSopralluogoRSPP: 'noteSopralluogoRSPP',
    ultimoSopralluogoMedico: 'ultimoSopralluogoMedico',
    prossimoSopralluogoMedico: 'prossimoSopralluogoMedico',
    noteSopralluogoMedico: 'noteSopralluogoMedico',
    'Sito (Domain)': 'domain'
  };

  const companyDataOnly = {};
  const siteDataOnly = {};

  Object.keys(companyData).forEach(key => {
    if (validCompanyFields.includes(key)) {
      companyDataOnly[key] = companyData[key];
    } else if (companySiteFieldMap[key]) {
      const canonical = companySiteFieldMap[key];
      siteDataOnly[canonical] = companyData[key];
    } else {
      // Log per campi non riconosciuti (per debug)
      logger.debug(`Campo non riconosciuto ignorato: ${key}`, {
        component: 'companies-routes',
        action: 'sanitizeCompanyData',
        field: key
      });
    }
  });

  // Normalizza siteName
  if (!siteDataOnly.siteName) {
    siteDataOnly.siteName = siteDataOnly.siteCitta || 'Sede Principale';
  }

  return {
    companyData: companyDataOnly,
    siteData: siteDataOnly
  };
}

// Route di test senza middleware
router.get('/test', (req, res) => {
    const response = {
        message: 'Test route working!',
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
        method: req.method
    };
    
    res.json(response);
});

// Get all companies
router.get('/', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'read'),
  filterDataByPermissions(),
  async (req, res) => {
    try {
      const person = req.person || req.user;
      const permissionContext = req.permissionContext;
      
      let whereClause = {};
      
      // Se lo scope è 'company', limita alle companies della persona
      if (permissionContext.scope === 'company' && person.companyId) {
        whereClause.id = person.companyId;
      }
      
      const companies = await prisma.company.findMany({
        where: {
          ...whereClause,
          tenantId: req.tenantId, // Filtra per tenant
          deletedAt: null // Escludi i record eliminati (soft delete)
        },
        orderBy: { createdAt: 'desc' },
        include: {
          sites: {
            where: { deletedAt: null },
            select: {
              id: true,
              siteName: true,
              citta: true,
              indirizzo: true,
              cap: true,
              provincia: true,
              telefono: true,
              mail: true,
              rsppId: true,
              medicoCompetenteId: true,
              createdAt: true,
              updatedAt: true
            }
          }
        }
      });
      
      res.json(companies);
    } catch (error) {
      logger.error('Failed to fetch companies', {
        component: 'companies-routes',
        action: 'getCompanies',
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch companies'
      });
    }
  }
);

// Get company by ID
router.get('/:id', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'read'),
  requireOwnCompany(),
  filterDataByPermissions(),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const company = await prisma.company.findFirst({ 
        where: { 
          id,
          deletedAt: null // Escludi i record eliminati (soft delete)
        },
        include: {
          persons: true,
          sites: {
            where: { deletedAt: null },
            select: {
              id: true,
              siteName: true,
              citta: true,
              indirizzo: true,
              cap: true,
              provincia: true,
              telefono: true,
              mail: true,
              rsppId: true,
              medicoCompetenteId: true,
              createdAt: true,
              updatedAt: true
            }
          },
          _count: {
            select: {
              persons: true,
              sites: true
            }
          }
        }
      });
      
      if (!company) {
        return res.status(404).json({ 
          error: 'Company not found',
          message: `Company with ID ${id} does not exist`
        });
      }
      
      res.json(company);
    } catch (error) {
      logger.error('Failed to fetch company', {
        component: 'companies-routes',
        action: 'getCompany',
        error: error.message,
        stack: error.stack,
        companyId: req.params?.id
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch company'
      });
    }
  }
);

// Create new company
router.post('/', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'create'),
  async (req, res) => {
    try {
      // Remove 'name' field if present (legacy compatibility)
      const { name, ...data } = req.body;
      const { companyData: mainCompanyData, siteData } = sanitizeCompanyData(data);
      
      // Validate required fields
      if (!mainCompanyData.ragioneSociale) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'ragioneSociale is required'
        });
      }
      
      // Check for duplicate P.IVA if provided
      const person = req.person || req.user;
      let company;
      if (mainCompanyData.piva) {
        // Prima cerca aziende attive con stessa P.IVA nel tenant corrente
        const activeCompanyByPiva = await prisma.company.findFirst({
          where: {
            piva: mainCompanyData.piva,
            tenantId: person.tenantId,
            deletedAt: null
          }
        });
        
        if (activeCompanyByPiva) {
          // Azienda attiva: errore duplicato
          return res.status(409).json({
            error: 'Duplicate P.IVA',
            message: `Un'azienda con P.IVA ${mainCompanyData.piva} esiste già`
          });
        }
        
        // Poi cerca aziende soft-deleted con stessa P.IVA (anche in altri tenant)
        const deletedCompanyByPiva = await prisma.company.findFirst({
          where: {
            piva: mainCompanyData.piva,
            deletedAt: { not: null }
          },
          orderBy: { deletedAt: 'desc' } // Prendi la più recentemente eliminata
        });
        
        if (deletedCompanyByPiva) {
          // Azienda soft-deleted: ripristina e sovrascrivi i dati
          // Rimuovi i campi slug e domain per evitare constraint violation durante il ripristino
          const { slug, domain, ...restoreData } = mainCompanyData;
          
          company = await prisma.company.update({
            where: { id: deletedCompanyByPiva.id },
            data: {
              ...restoreData,
              deletedAt: null,
              updatedAt: new Date(),
              tenantId: person.tenantId // Assegna al tenant corrente
            }
          });
          
          logger.info('Company restored from soft delete', {
            component: 'companies-routes',
            action: 'createCompany',
            companyId: company.id,
            piva: mainCompanyData.piva,
            previousTenantId: deletedCompanyByPiva.tenantId,
            newTenantId: person.tenantId
          });
        } else {
          // Nessuna azienda con questa P.IVA: crea nuova
          company = await prisma.company.create({ 
            data: {
              ...mainCompanyData,
              tenantId: person.tenantId
            }
          });
        }
      } else {
        // Nessuna P.IVA fornita: crea nuova azienda
        company = await prisma.company.create({ 
          data: {
            ...mainCompanyData,
            tenantId: person.tenantId
          }
        });
      }

      // Crea automaticamente la sede principale se ci sono dati di sede
      if (company && (siteData.siteCitta || siteData.siteIndirizzo || siteData.siteName || siteData.siteProvincia || siteData.siteCap || siteData.siteTelefono || siteData.siteMail || siteData.sitePersonaRiferimento)) {
        try {
          const siteDataPayload = {
            companyId: company.id,
            siteName: siteData.siteName || siteData.siteCitta || 'Sede Principale',
            citta: siteData.siteCitta,
            indirizzo: siteData.siteIndirizzo,
            cap: siteData.siteCap,
            provincia: siteData.siteProvincia,
            telefono: siteData.siteTelefono,
            mail: siteData.siteMail,
            personaRiferimento: siteData.sitePersonaRiferimento,
            tenantId: person.tenantId
          };

          // Rimuovi campi undefined/null per evitare errori
          Object.keys(siteDataPayload).forEach(key => {
            if (siteDataPayload[key] === undefined || siteDataPayload[key] === null) {
              delete siteDataPayload[key];
            }
          });

          const mainSite = await prisma.companySite.create({
            data: siteDataPayload
          });

          logger.info('Main site created automatically', {
            component: 'companies-routes',
            action: 'createCompany',
            companyId: company.id,
            siteId: mainSite.id,
            siteName: mainSite.siteName
          });
        } catch (siteError) {
          // Log l'errore ma non bloccare la creazione dell'azienda
          logger.warn('Failed to create main site automatically', {
            component: 'companies-routes',
            action: 'createCompany',
            error: siteError.message,
            companyId: company.id
          });
        }
      }
      
      res.status(201).json(company);
    } catch (error) {
      logger.error('Failed to create company', {
        component: 'companies-routes',
        action: 'createCompany',
        error: error.message,
        stack: error.stack,
        companyName: req.body?.ragioneSociale
      });
      
      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A company with this information already exists'
        });
      }
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to create company'
      });
    }
  }
);

// Update company
router.put('/:id', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'update'),
  requireOwnCompany(),
  async (req, res) => {
    try {
      const { id } = req.params;
      // Remove 'name' field if present (legacy compatibility)
      const { name, ...data } = req.body;
      const { companyData: mainCompanyData, siteData } = sanitizeCompanyData(data);
      
      // Validate required fields
      if (!mainCompanyData.ragioneSociale) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'ragioneSociale is required'
        });
      }
      
      // Check for duplicate P.IVA if provided and update existing company
      const person = req.person || req.user;

      // Assicurati che l'azienda esista
      const existingCompany = await prisma.company.findUnique({ where: { id } });
      if (!existingCompany || existingCompany.deletedAt) {
        return res.status(404).json({
          error: 'Company not found',
          message: `Company with ID ${id} does not exist or has been deleted`
        });
      }

      // Se la P.IVA viene cambiata, verifica duplicati nel tenant corrente
      if (mainCompanyData.piva && mainCompanyData.piva !== existingCompany.piva) {
        const conflict = await prisma.company.findFirst({
          where: {
            piva: mainCompanyData.piva,
            tenantId: person.tenantId,
            deletedAt: null,
            id: { not: id }
          }
        });
        if (conflict) {
          return res.status(409).json({
            error: 'Duplicate P.IVA',
            message: `Un'azienda con P.IVA ${mainCompanyData.piva} esiste già`
          });
        }
      }

      // Non consentire aggiornamento di slug/domain via questo endpoint
      const { slug, domain, ...updateData } = mainCompanyData;

      const company = await prisma.company.update({
        where: { id },
        data: updateData
      });

      // Se sono presenti dati di sede, crea opzionalmente una sede (idempotente)
      if (siteData.siteCitta || siteData.siteIndirizzo || siteData.siteName) {
        try {
          const siteName = siteData.siteName || siteData.siteCitta || 'Sede Principale';

          // Evita duplicati: match su nome + indirizzo/città se presenti
          const existingSite = await prisma.companySite.findFirst({
            where: {
              companyId: id,
              siteName,
              ...(siteData.siteIndirizzo ? { indirizzo: siteData.siteIndirizzo } : {}),
              ...(siteData.siteCitta ? { citta: siteData.siteCitta } : {})
            }
          });

          if (!existingSite) {
            const companySiteData = {
              companyId: id,
              siteName,
              citta: siteData.siteCitta,
              indirizzo: siteData.siteIndirizzo,
              cap: siteData.siteCap,
              provincia: siteData.siteProvincia,
              telefono: siteData.siteTelefono,
              mail: siteData.siteMail,
              tenantId: person.tenantId
            };
            Object.keys(companySiteData).forEach(key => {
              if (companySiteData[key] === undefined || companySiteData[key] === null) delete companySiteData[key];
            });
            const newSite = await prisma.companySite.create({ data: companySiteData });
            logger.info('Site created during company update', {
              component: 'companies-routes',
              action: 'updateCompany',
              companyId: id,
              siteId: newSite.id,
              siteName: newSite.siteName
            });
          }
        } catch (siteError) {
          logger.warn('Failed to create site during update', {
            component: 'companies-routes',
            action: 'updateCompany',
            companyId: id,
            error: siteError.message
          });
        }
      }
      
      res.json(company);
    } catch (error) {
      logger.error('Failed to update company', {
        component: 'companies-routes',
        action: 'updateCompany',
        error: error.message,
        stack: error.stack,
        companyId: req.params?.id
      });
      
      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A company with this information already exists'
        });
      }
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to update company'
      });
    }
  }
);

// Soft delete company
router.delete('/:id', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'delete'),
  requireOwnCompany(),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if company exists
      const existingCompany = await prisma.company.findFirst({ 
        where: { 
          id,
          deletedAt: null // Escludi i record eliminati (soft delete)
        },
        include: {
          persons: {
            where: {
              deletedAt: null // Escludi le persone eliminate (soft delete)
            }
          }
        }
      });
      
      if (!existingCompany) {
        return res.status(404).json({ 
          error: 'Company not found',
          message: `Company with ID ${id} does not exist`
        });
      }
      
      // Check if company has persons
      if (existingCompany.persons.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete company',
          message: 'Company has associated persons. Please remove or reassign persons first.'
        });
      }
      
      // Perform soft delete by updating deletedAt field
      const deletedCompany = await prisma.company.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      logger.info('Company soft deleted', {
        component: 'companies-routes',
        action: 'deleteCompany',
        companyId: id,
        companyName: existingCompany.ragioneSociale
      });
      
      res.status(200).json({
        success: true,
        message: 'Company deleted successfully',
        data: {
          id: deletedCompany.id,
          ragioneSociale: deletedCompany.ragioneSociale,
          deletedAt: deletedCompany.deletedAt
        }
      });
    } catch (error) {
      logger.error('Failed to delete company', {
        component: 'companies-routes',
        action: 'deleteCompany',
        error: error.message,
        stack: error.stack,
        companyId: req.params?.id
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to delete company'
      });
    }
  }
);

// Import companies with sites support
router.post('/import', 
  authenticateToken(), 
  checkAdvancedPermission('companies', 'create'),
  async (req, res) => {
    try {
      const importId = (req.headers['x-import-id'] && String(req.headers['x-import-id'])) || randomUUID();
      const startedAt = Date.now();
      const { companies, overwriteIds = [] } = req.body;
      
      if (!companies || !Array.isArray(companies)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'companies array is required'
        });
      }

      const results = {
        created: [],
        updated: [],
        errors: [],
        sitesCreated: []
      };

      // Mappe per tenere traccia delle aziende per P.IVA e Codice Fiscale
      const companiesByPiva = new Map();
      const companiesByCF = new Map();
      const person = req.person || req.user;

      for (let i = 0; i < companies.length; i++) {
        const companyData = companies[i];
        
        try {
          // Validazione campi obbligatori
          if (!companyData.ragioneSociale) {
            results.errors.push({
              index: i,
              error: 'ragioneSociale è obbligatoria',
              data: companyData
            });
            continue;
          }

          // Gestione duplicati per P.IVA
          if (companyData.piva) {
            const pivaKey = companyData.piva.trim();
            
            // Verifica se esiste già un'azienda con questa P.IVA nel database (incluse quelle eliminate)
            const existingCompany = await prisma.company.findFirst({
              where: {
                piva: pivaKey
              },
              include: {
                sites: true
              }
            });

            // Verifica se c'è già un'azienda con questa P.IVA nel batch corrente
            const batchCompany = companiesByPiva.get(pivaKey);

            if (batchCompany) {
              // Duplicato nel batch corrente - segnala errore
              results.errors.push({
                index: i,
                error: `P.IVA ${pivaKey} duplicata nel file CSV alla riga ${batchCompany.index + 1}`,
                data: companyData
              });
              continue;
            }

            if (existingCompany) {
              const targetCompany = existingCompany;
              
              // Se l'azienda esistente è eliminata (soft delete), riattivala e aggiorna i dati
              if (existingCompany && existingCompany.deletedAt) {
                logger.info('Reactivating deleted company', {
                  component: 'companies-routes', action: 'importCompanies', importId, index: i,
                  companyId: existingCompany.id
                });
                const { companyData: mainCompanyData, siteData } = sanitizeCompanyData(companyData);
                mainCompanyData.tenantId = person.tenantId;
                mainCompanyData.deletedAt = null;
                delete mainCompanyData.slug; delete mainCompanyData.domain;
                if (mainCompanyData.isActive !== undefined && typeof mainCompanyData.isActive === 'string') {
                  mainCompanyData.isActive = mainCompanyData.isActive !== '' && mainCompanyData.isActive.toLowerCase() !== 'false' && mainCompanyData.isActive !== '0';
                }
                const { company: reactivatedCompany, site: createdSite } = await prisma.$transaction(async (tx) => {
                  const company = await tx.company.update({ where: { id: existingCompany.id }, data: mainCompanyData });
                  let site = null;
                  // crea sito se presenti dati di sede
                  const hasSiteInput = siteData.siteCitta || siteData.siteIndirizzo || siteData.siteName;
                  if (hasSiteInput) {
                    const companySiteData = {
                      companyId: company.id,
                      siteName: siteData.siteName || siteData.siteCitta || 'Sede Principale',
                      citta: siteData.siteCitta,
                      indirizzo: siteData.siteIndirizzo,
                      cap: siteData.siteCap,
                      provincia: siteData.siteProvincia,
                      telefono: siteData.siteTelefono,
                      mail: siteData.siteMail,
                      tenantId: person.tenantId
                    };
                    Object.keys(companySiteData).forEach(k => { if (companySiteData[k] === undefined || companySiteData[k] === null) delete companySiteData[k]; });
                    // idempotenza ricerca + creazione
                    const existingSiteTx = await tx.companySite.findFirst({
                      where: {
                        companyId: company.id,
                        siteName: companySiteData.siteName,
                        ...(companySiteData.indirizzo ? { indirizzo: companySiteData.indirizzo } : {}),
                        ...(companySiteData.citta ? { citta: companySiteData.citta } : {})
                      }
                    });
                    if (!existingSiteTx) {
                      site = await tx.companySite.create({ data: companySiteData });
                    }
                  }
                  return { company, site };
                });
                results.updated.push(reactivatedCompany);
                if (createdSite) {
                  results.sitesCreated.push({ companyId: reactivatedCompany.id, site: createdSite });
                }
                companiesByPiva.set(pivaKey, { company: reactivatedCompany, index: i });
                continue;
              }

              // Overwrite esplicito richiesto: aggiorna Company e gestisci sede idempotente
              const overwriteRequested = Array.isArray(overwriteIds) && overwriteIds.some((id) => String(id) === String(targetCompany.id));
              if (overwriteRequested) {
                try {
                  const { companyData: mainCompanyData, siteData } = sanitizeCompanyData(companyData);
                  mainCompanyData.tenantId = person.tenantId;
                  delete mainCompanyData.slug; delete mainCompanyData.domain;
                  if (mainCompanyData.isActive !== undefined && typeof mainCompanyData.isActive === 'string') {
                    mainCompanyData.isActive = mainCompanyData.isActive !== '' && mainCompanyData.isActive.toLowerCase() !== 'false' && mainCompanyData.isActive !== '0';
                  }

                  const { company: updatedCompany, site: createdSite } = await prisma.$transaction(async (tx) => {
                    const company = await tx.company.update({ where: { id: targetCompany.id }, data: mainCompanyData });
                    let site = null;
                    const hasSiteInput = siteData.siteCitta || siteData.siteIndirizzo || siteData.siteName;
                    if (hasSiteInput) {
                      const siteName = siteData.siteName || siteData.siteCitta || 'Sede Principale';
                      const companySiteData = {
                        companyId: company.id,
                        siteName,
                        citta: siteData.siteCitta,
                        indirizzo: siteData.siteIndirizzo,
                        cap: siteData.siteCap,
                        provincia: siteData.siteProvincia,
                        telefono: siteData.siteTelefono,
                        mail: siteData.siteMail,
                        tenantId: person.tenantId
                      };
                      Object.keys(companySiteData).forEach(k => { if (companySiteData[k] === undefined || companySiteData[k] === null) delete companySiteData[k]; });
                      const existingSiteTx = await tx.companySite.findFirst({
                        where: {
                          companyId: company.id,
                          siteName,
                          ...(companySiteData.indirizzo ? { indirizzo: companySiteData.indirizzo } : {}),
                          ...(companySiteData.citta ? { citta: companySiteData.citta } : {})
                        }
                      });
                      if (!existingSiteTx) {
                        site = await tx.companySite.create({ data: companySiteData });
                      }
                    }
                    return { company, site };
                  });

                  results.updated.push(updatedCompany);
                  if (createdSite) {
                    results.sitesCreated.push({
                      companyId: updatedCompany.id,
                      companyName: updatedCompany.ragioneSociale,
                      site: createdSite
                    });
                  }
                  companiesByPiva.set(pivaKey, { company: updatedCompany, index: i });
                  continue;
                } catch (overwriteErr) {
                  logger.warn('Failed to overwrite existing company during import', {
                    component: 'companies-routes', action: 'importCompanies', companyId: targetCompany.id, error: overwriteErr.message, index: i
                  });
                  results.errors.push({ index: i, error: `Errore aggiornamento azienda esistente: ${overwriteErr.message}`, data: companyData });
                  continue;
                }
              }

              // Azienda attiva: gestisco eventuale creazione sede in modo idempotente basato su siteData canonico
              const { companyData: _ignoredMainCompanyData, siteData } = sanitizeCompanyData(companyData);
              const hasSiteInput = siteData.siteCitta || siteData.siteIndirizzo || siteData.siteName;
              if (hasSiteInput) {
                try {
                  const tenantId = person.tenantId;
                  const siteName = siteData.siteName || siteData.siteCitta || 'Sede Principale';
                  const companySiteData = {
                    companyId: targetCompany.id,
                    siteName,
                    citta: siteData.siteCitta,
                    indirizzo: siteData.siteIndirizzo,
                    cap: siteData.siteCap,
                    provincia: siteData.siteProvincia,
                    telefono: siteData.siteTelefono,
                    mail: siteData.siteMail,
                    tenantId
                  };
                  Object.keys(companySiteData).forEach(k => { if (companySiteData[k] === undefined || companySiteData[k] === null) delete companySiteData[k]; });
                  const existingSite = await prisma.companySite.findFirst({
                    where: {
                      companyId: targetCompany.id,
                      siteName,
                      ...(companySiteData.indirizzo ? { indirizzo: companySiteData.indirizzo } : {}),
                      ...(companySiteData.citta ? { citta: companySiteData.citta } : {})
                    }
                  });
                  if (!existingSite) {
                    const newSite = await prisma.companySite.create({ data: companySiteData });
                    results.sitesCreated.push({
                      companyId: targetCompany.id,
                      companyName: targetCompany.ragioneSociale,
                      site: newSite
                    });
                  }
                } catch (siteErr) {
                  logger.warn('Failed to create site for active company during import', {
                    component: 'companies-routes',
                    action: 'importCompanies',
                    companyId: targetCompany.id,
                    error: siteErr.message,
                    index: i
                  });
                  results.errors.push({
                    index: i,
                    error: `Errore creazione sede per azienda attiva: ${siteErr.message}`,
                    data: companyData
                  });
                }
                continue;
              } else {
                // Azienda attiva senza informazioni di sede nel record import: segnalo conflitto
                results.errors.push({
                  index: i,
                  error: `Azienda con P.IVA ${pivaKey} già esistente. Utilizzare l'opzione di sovrascrittura per aggiornare i dati.`,
                  data: companyData,
                  existingCompany: {
                    id: targetCompany.id,
                    ragioneSociale: targetCompany.ragioneSociale,
                    piva: targetCompany.piva,
                    codiceFiscale: targetCompany.codiceFiscale
                  }
                });
                continue;
              }
            } else {
                // Nessuna azienda esistente con questa P.IVA: crea nuova Company (e sede opzionale)
                const { companyData: mainCompanyData, siteData } = sanitizeCompanyData(companyData);
                mainCompanyData.tenantId = person.tenantId;
                delete mainCompanyData.slug; delete mainCompanyData.domain;
                if (mainCompanyData.isActive !== undefined && typeof mainCompanyData.isActive === 'string') {
                  mainCompanyData.isActive = mainCompanyData.isActive !== '' && mainCompanyData.isActive.toLowerCase() !== 'false' && mainCompanyData.isActive !== '0';
                }

                const company = await prisma.company.create({ data: mainCompanyData });

                // Se presenti dati di sede, crea la sede principale
                const hasSiteInput = siteData.siteCitta || siteData.siteIndirizzo || siteData.siteName;
                let createdSite = null;
                if (hasSiteInput) {
                  const siteName = siteData.siteName || siteData.siteCitta || 'Sede Principale';
                  const companySiteData = {
                    companyId: company.id,
                    siteName,
                    citta: siteData.siteCitta,
                    indirizzo: siteData.siteIndirizzo,
                    cap: siteData.siteCap,
                    provincia: siteData.siteProvincia,
                    telefono: siteData.siteTelefono,
                    mail: siteData.siteMail,
                    tenantId: person.tenantId
                  };
                  Object.keys(companySiteData).forEach(k => { if (companySiteData[k] === undefined || companySiteData[k] === null) delete companySiteData[k]; });
                  createdSite = await prisma.companySite.create({ data: companySiteData });
                }

                results.created.push(company);

                // Aggiorna le mappe del batch
                companiesByPiva.set(pivaKey, { company, index: i });
                if (companyData.codiceFiscale) {
                  companiesByCF.set(companyData.codiceFiscale.trim().toUpperCase(), { company, index: i });
                }

                if (createdSite) {
                  results.sitesCreated.push({
                    companyId: company.id,
                    companyName: company.ragioneSociale,
                    site: createdSite
                  });
                }
              }
            } else {
              // Nessuna P.IVA: gestione per Codice Fiscale o creazione nuova Company
              const cfKey = (companyData.codiceFiscale && companyData.codiceFiscale.trim().toUpperCase()) || null;
              if (cfKey) {
                const batchCF = companiesByCF.get(cfKey);
                if (batchCF) {
                  results.errors.push({ index: i, error: `Codice Fiscale ${cfKey} duplicato nel file CSV alla riga ${batchCF.index + 1}`, data: companyData });
                } else {
                  const existingByCF = await prisma.company.findFirst({ where: { codiceFiscale: cfKey }, include: { sites: true } });
                  if (existingByCF) {
                    if (existingByCF.deletedAt) {
                      const { companyData: mainCompanyData, siteData } = sanitizeCompanyData(companyData);
                      mainCompanyData.tenantId = person.tenantId;
                      mainCompanyData.deletedAt = null;
                      delete mainCompanyData.slug; delete mainCompanyData.domain;
                      if (mainCompanyData.isActive !== undefined && typeof mainCompanyData.isActive === 'string') {
                        mainCompanyData.isActive = mainCompanyData.isActive !== '' && mainCompanyData.isActive.toLowerCase() !== 'false' && mainCompanyData.isActive !== '0';
                      }
                      const { company: reactivatedCompany, site: createdSite } = await prisma.$transaction(async (tx) => {
                        const company = await tx.company.update({ where: { id: existingByCF.id }, data: mainCompanyData });
                        let site = null;
                        const hasSiteInput = siteData.siteCitta || siteData.siteIndirizzo || siteData.siteName;
                        if (hasSiteInput) {
                          const siteName = siteData.siteName || siteData.siteCitta || 'Sede Principale';
                          const companySiteData = { companyId: company.id, siteName, citta: siteData.siteCitta, indirizzo: siteData.siteIndirizzo, cap: siteData.siteCap, provincia: siteData.siteProvincia, telefono: siteData.siteTelefono, mail: siteData.siteMail, tenantId: person.tenantId };
                          Object.keys(companySiteData).forEach(k => { if (companySiteData[k] === undefined || companySiteData[k] === null) delete companySiteData[k]; });
                          site = await tx.companySite.create({ data: companySiteData });
                        }
                        return { company, site };
                      });
                      results.updated.push(reactivatedCompany);
                      if (createdSite) { results.sitesCreated.push({ companyId: reactivatedCompany.id, site: createdSite }); }
                      companiesByCF.set(cfKey, { company: reactivatedCompany, index: i });
                    } else {
                      const { companyData: _ignored, siteData } = sanitizeCompanyData(companyData);
                      const hasSiteInput = siteData.siteCitta || siteData.siteIndirizzo || siteData.siteName;
                      if (hasSiteInput) {
                        try {
                          const siteName = siteData.siteName || siteData.siteCitta || 'Sede Principale';
                          const companySiteData = { companyId: existingByCF.id, siteName, citta: siteData.siteCitta, indirizzo: siteData.siteIndirizzo, cap: siteData.siteCap, provincia: siteData.siteProvincia, telefono: siteData.siteTelefono, mail: siteData.siteMail, tenantId: person.tenantId };
                          Object.keys(companySiteData).forEach(k => { if (companySiteData[k] === undefined || companySiteData[k] === null) delete companySiteData[k]; });
                          const existingSite = await prisma.companySite.findFirst({ where: { companyId: existingByCF.id, siteName, ...(companySiteData.indirizzo ? { indirizzo: companySiteData.indirizzo } : {}), ...(companySiteData.citta ? { citta: companySiteData.citta } : {}) } });
                          if (!existingSite) {
                            const newSite = await prisma.companySite.create({ data: companySiteData });
                            results.sitesCreated.push({ companyId: existingByCF.id, companyName: existingByCF.ragioneSociale, site: newSite });
                          }
                        } catch (siteErr) {
                          logger.warn('Failed to create site for active company (CF) during import', { component: 'companies-routes', action: 'importCompanies', companyId: existingByCF.id, error: siteErr.message, index: i });
                          results.errors.push({ index: i, error: `Errore creazione sede per azienda attiva (CF): ${siteErr.message}`, data: companyData });
                        }
                      } else {
                        results.errors.push({ index: i, error: `Azienda con Codice Fiscale ${cfKey} già esistente. Utilizzare l'opzione di sovrascrittura per aggiornare i dati.`, data: companyData, existingCompany: { id: existingByCF.id, ragioneSociale: existingByCF.ragioneSociale, piva: existingByCF.piva, codiceFiscale: existingByCF.codiceFiscale } });
                      }
                    }
                  } else {
                    const { companyData: mainCompanyData, siteData } = sanitizeCompanyData(companyData);
                    mainCompanyData.tenantId = person.tenantId;
                    delete mainCompanyData.slug; delete mainCompanyData.domain;
                    if (mainCompanyData.isActive !== undefined && typeof mainCompanyData.isActive === 'string') {
                      mainCompanyData.isActive = mainCompanyData.isActive !== '' && mainCompanyData.isActive.toLowerCase() !== 'false' && mainCompanyData.isActive !== '0';
                    }
                    const company = await prisma.company.create({ data: mainCompanyData });
                    let createdSite = null;
                    const hasSiteInput = siteData.siteCitta || siteData.siteIndirizzo || siteData.siteName;
                    if (hasSiteInput) {
                      const siteName = siteData.siteName || siteData.siteCitta || 'Sede Principale';
                      const companySiteData = { companyId: company.id, siteName, citta: siteData.siteCitta, indirizzo: siteData.siteIndirizzo, cap: siteData.siteCap, provincia: siteData.siteProvincia, telefono: siteData.siteTelefono, mail: siteData.siteMail, tenantId: person.tenantId };
                      Object.keys(companySiteData).forEach(k => { if (companySiteData[k] === undefined || companySiteData[k] === null) delete companySiteData[k]; });
                      createdSite = await prisma.companySite.create({ data: companySiteData });
                    }
                    results.created.push(company);
                    companiesByCF.set(cfKey, { company, index: i });
                    if (createdSite) {
                      results.sitesCreated.push({ companyId: company.id, companyName: company.ragioneSociale, site: createdSite });
                    }
                  }
                }
              } else {
                // Né P.IVA né Codice Fiscale: crea comunque la Company con i dati disponibili
                const { companyData: mainCompanyData, siteData } = sanitizeCompanyData(companyData);
                mainCompanyData.tenantId = person.tenantId;
                delete mainCompanyData.slug; delete mainCompanyData.domain;
                if (mainCompanyData.isActive !== undefined && typeof mainCompanyData.isActive === 'string') {
                  mainCompanyData.isActive = mainCompanyData.isActive !== '' && mainCompanyData.isActive.toLowerCase() !== 'false' && mainCompanyData.isActive !== '0';
                }
                const company = await prisma.company.create({ data: mainCompanyData });
                let createdSite = null;
                const hasSiteInput = siteData.siteCitta || siteData.siteIndirizzo || siteData.siteName;
                if (hasSiteInput) {
                  const siteName = siteData.siteName || siteData.siteCitta || 'Sede Principale';
                  const companySiteData = { companyId: company.id, siteName, citta: siteData.siteCitta, indirizzo: siteData.siteIndirizzo, cap: siteData.siteCap, provincia: siteData.siteProvincia, telefono: siteData.siteTelefono, mail: siteData.siteMail, tenantId: person.tenantId };
                  Object.keys(companySiteData).forEach(k => { if (companySiteData[k] === undefined || companySiteData[k] === null) delete companySiteData[k]; });
                  createdSite = await prisma.companySite.create({ data: companySiteData });
                }
                results.created.push(company);
                if (createdSite) { results.sitesCreated.push({ companyId: company.id, companyName: company.ragioneSociale, site: createdSite }); }
              }
            }

          } catch (error) {
            logger.error('Error importing company', {
              component: 'companies-routes',
              action: 'importCompany',
              error: error.message,
              index: i,
              companyData
            });
            
            results.errors.push({
              index: i,
              error: error.message,
              data: companyData
            });
          }
        }

        // Se ci sono conflitti che richiedono decisione utente, restituisci status 409
        const hasConflicts = results.errors.some(error => error.existingCompany);
        const totalOps = results.created.length + results.updated.length;
        
        if (hasConflicts && totalOps === 0) {
          // Solo conflitti, nessuna operazione completata
          res.status(409).json({
            success: false,
            message: 'Conflitti rilevati durante l\'importazione',
            results,
            summary: {
              total: companies.length,
              created: results.created.length,
              updated: results.updated.length,
              sitesCreated: results.sitesCreated.length,
              errors: results.errors.length,
              conflicts: results.errors.filter(e => e.existingCompany).length
            }
          });
        } else if (totalOps === 0) {
          // Nessuna creazione/aggiornamento effettuata (solo errori di validazione o altri errori non di conflitto)
          res.status(400).json({
            success: false,
            message: 'Nessuna azienda importata. Verificare i dati e riprovare.',
            results,
            summary: {
              total: companies.length,
              created: results.created.length,
              updated: results.updated.length,
              sitesCreated: results.sitesCreated.length,
              errors: results.errors.length,
              conflicts: results.errors.filter(e => e.existingCompany).length
            }
          });
        } else {
          // Operazioni completate con successo (con o senza alcuni conflitti)
          res.json({
            success: true,
            results,
            summary: {
              total: companies.length,
              created: results.created.length,
              updated: results.updated.length,
              sitesCreated: results.sitesCreated.length,
              errors: results.errors.length,
              conflicts: results.errors.filter(e => e.existingCompany).length
            }
          });
        }

      } catch (error) {
        logger.error('Failed to import companies', {
          component: 'companies-routes',
          action: 'importCompanies',
          error: error.message,
          stack: error.stack
        });
        
        res.status(500).json({ 
          error: 'Internal server error',
          message: 'Failed to import companies'
        });
      }
    }
);

export { router as default };