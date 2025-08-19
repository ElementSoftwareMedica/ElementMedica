import express from 'express';
import logger from '../utils/logger.js';
import middleware from '../auth/middleware.js';
import { checkAdvancedPermission, filterDataByPermissions, requireOwnCompany } from '../middleware/advanced-permissions.js';

const router = express.Router();
import prisma from '../config/prisma-optimization.js';

const { authenticate: authenticateToken } = middleware;

/**
 * Sanitizza i dati dell'azienda rimuovendo i campi che appartengono al modello CompanySite
 * @param {Object} companyData - Dati grezzi dell'azienda dal CSV
 * @returns {Object} - Oggetto con i dati sanitizzati per Company e CompanySite
 */
function sanitizeCompanyData(companyData) {
  // Campi validi per il modello Company (basati sullo schema Prisma)
  const validCompanyFields = [
    'id', 'iban', 'pec', 'sdi', 'cap', 'citta', 'mail', 'note', 'piva', 
    'provincia', 'telefono', 'tenantId', 'slug', 'domain', 'settings', 
    'codiceAteco', 'codiceFiscale', 'createdAt', 'deletedAt', 'isActive', 
    'personaRiferimento', 'sedeAzienda', 'subscriptionPlan', 'updatedAt', 
    'ragioneSociale'
  ];

  // Campi che appartengono al modello CompanySite
  const companySiteFields = [
    'siteName', 'siteIndirizzo', 'siteCitta', 'siteProvincia', 'siteCap',
    'sitePersonaRiferimento', 'siteTelefono', 'siteMail', 'dvr', 'rsppId',
    'medicoCompetenteId', 'ultimoSopralluogo', 'prossimoSopralluogo',
    'valutazioneSopralluogo', 'sopralluogoEseguitoDa', 'ultimoSopralluogoRSPP',
    'prossimoSopralluogoRSPP', 'noteSopralluogoRSPP', 'ultimoSopralluogoMedico',
    'prossimoSopralluogoMedico', 'noteSopralluogoMedico', 'Sito (Domain)',
    'nomeSede', 'indirizzo' // Campi legacy
  ];

  const companyDataOnly = {};
  const siteDataOnly = {};

  // Separa i campi in base al modello di appartenenza
  Object.keys(companyData).forEach(key => {
    if (validCompanyFields.includes(key)) {
      companyDataOnly[key] = companyData[key];
    } else if (companySiteFields.includes(key)) {
      siteDataOnly[key] = companyData[key];
    } else {
      // Log per campi non riconosciuti (per debug)
      logger.debug(`Campo non riconosciuto ignorato: ${key}`, {
        component: 'companies-routes',
        action: 'sanitizeCompanyData',
        field: key,
        value: companyData[key]
      });
    }
  });

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
        orderBy: { createdAt: 'desc' }
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
          _count: {
            select: {
              persons: true
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
      
      // Validate required fields
      if (!data.ragioneSociale) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'ragioneSociale is required'
        });
      }
      
      // Check for duplicate P.IVA if provided
      const person = req.person || req.user;
      let company;
      if (data.piva) {
        // Prima cerca aziende attive con stessa P.IVA nel tenant corrente
        const activeCompanyByPiva = await prisma.company.findFirst({
          where: {
            piva: data.piva,
            tenantId: person.tenantId,
            deletedAt: null
          }
        });
        
        if (activeCompanyByPiva) {
          // Azienda attiva: errore duplicato
          return res.status(409).json({
            error: 'Duplicate P.IVA',
            message: `Un'azienda con P.IVA ${data.piva} esiste già`
          });
        }
        
        // Poi cerca aziende soft-deleted con stessa P.IVA (anche in altri tenant)
        const deletedCompanyByPiva = await prisma.company.findFirst({
          where: {
            piva: data.piva,
            deletedAt: { not: null }
          },
          orderBy: { deletedAt: 'desc' } // Prendi la più recentemente eliminata
        });
        
        if (deletedCompanyByPiva) {
          // Azienda soft-deleted: ripristina e sovrascrivi i dati
          // Rimuovi i campi slug e domain per evitare constraint violation durante il ripristino
          const { slug, domain, ...restoreData } = data;
          
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
            piva: data.piva,
            previousTenantId: deletedCompanyByPiva.tenantId,
            newTenantId: person.tenantId
          });
        } else {
          // Nessuna azienda con questa P.IVA: crea nuova
          company = await prisma.company.create({ 
            data: {
              ...data,
              tenantId: person.tenantId
            }
          });
        }
      } else {
        // Nessuna P.IVA fornita: crea nuova azienda
        company = await prisma.company.create({ 
          data: {
            ...data,
            tenantId: person.tenantId
          }
        });
      }

      // Crea automaticamente la sede principale se ci sono dati di indirizzo
      if (company && (data.citta || data.indirizzo || data.sedeAzienda)) {
        try {
          const siteData = {
            companyId: company.id,
            siteName: data.sedeAzienda || 'Sede Principale',
            citta: data.citta,
            indirizzo: data.indirizzo,
            cap: data.cap,
            provincia: data.provincia,
            telefono: data.telefono,
            mail: data.email,
            personaRiferimento: data.personaRiferimento,
            tenantId: person.tenantId
          };

          // Rimuovi campi undefined/null per evitare errori
          Object.keys(siteData).forEach(key => {
            if (siteData[key] === undefined || siteData[key] === null) {
              delete siteData[key];
            }
          });

          const mainSite = await prisma.companySite.create({
            data: siteData
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
            companyId: company.id,
            error: siteError.message
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
      
      // Check if company exists
      const existingCompany = await prisma.company.findFirst({ 
        where: { 
          id,
          deletedAt: null // Escludi i record eliminati (soft delete)
        }
      });
      if (!existingCompany) {
        return res.status(404).json({ 
          error: 'Company not found',
          message: `Company with ID ${id} does not exist`
        });
      }
      
      // Check for duplicate P.IVA if provided and different from current
      if (data.piva && data.piva !== existingCompany.piva) {
        const existingCompanyByPiva = await prisma.company.findFirst({
          where: {
            piva: data.piva,
            deletedAt: null,
            id: { not: id }
          }
        });
        
        if (existingCompanyByPiva) {
          return res.status(409).json({
            error: 'Duplicate P.IVA',
            message: `Un'azienda con P.IVA ${data.piva} esiste già`
          });
        }
      }
      
      // Rimuovi i campi slug e domain per evitare constraint violation durante l'aggiornamento
      // L'azienda manterrà i suoi valori originali per questi campi unici
      const { slug, domain, ...updateData } = data;
      
      const company = await prisma.company.update({ 
        where: { id }, 
        data: {
          ...updateData
        }
      });
      
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
                  component: 'companies-routes',
                  action: 'importCompanies',
                  companyId: existingCompany.id,
                  piva: pivaKey,
                  ragioneSociale: companyData.ragioneSociale
                });

                // Sanitizza i dati separando Company da CompanySite
                const { companyData: mainCompanyData, siteData } = sanitizeCompanyData(companyData);
                mainCompanyData.tenantId = person.tenantId;
                mainCompanyData.deletedAt = null; // Riattiva l'azienda

                // Rimuovi i campi slug e domain per evitare constraint violation durante la riattivazione
                // L'azienda manterrà i suoi valori originali per questi campi unici
                delete mainCompanyData.slug;
                delete mainCompanyData.domain;

                // Sanitizza i campi booleani per evitare errori Prisma
                if (mainCompanyData.isActive !== undefined) {
                  if (typeof mainCompanyData.isActive === 'string') {
                    // Converte stringhe vuote o "false" in false, tutto il resto in true
                    mainCompanyData.isActive = mainCompanyData.isActive !== '' && 
                                               mainCompanyData.isActive.toLowerCase() !== 'false' && 
                                               mainCompanyData.isActive !== '0';
                  }
                }

                // Aggiorna l'azienda eliminata con i nuovi dati
                const reactivatedCompany = await prisma.company.update({
                  where: { id: existingCompany.id },
                  data: mainCompanyData
                });

                results.updated.push(reactivatedCompany);

                // Crea automaticamente la sede principale se ci sono dati di indirizzo
                if (siteData.siteCitta || siteData.siteIndirizzo || siteData.nomeSede || siteData.indirizzo || 
                    companyData.citta || companyData.indirizzo) {
                  try {
                    const companySiteData = {
                      companyId: reactivatedCompany.id,
                      siteName: siteData.nomeSede || siteData.siteName || companyData.citta || reactivatedCompany.sedeAzienda || 'Sede Principale',
                      citta: siteData.siteCitta || companyData.citta,
                      indirizzo: siteData.siteIndirizzo || siteData.indirizzo,
                      cap: siteData.siteCap || companyData.cap,
                      provincia: siteData.siteProvincia || companyData.provincia,
                      telefono: siteData.siteTelefono || companyData.telefono,
                      mail: siteData.siteMail || companyData.mail,
                      tenantId: person.tenantId
                    };

                    // Rimuovi campi undefined/null per evitare errori
                    Object.keys(companySiteData).forEach(key => {
                      if (companySiteData[key] === undefined || companySiteData[key] === null) {
                        delete companySiteData[key];
                      }
                    });

                    const newSite = await prisma.companySite.create({
                      data: companySiteData
                    });

                    results.sitesCreated.push({
                      companyId: reactivatedCompany.id,
                      companyName: reactivatedCompany.ragioneSociale,
                      site: newSite
                    });
                  } catch (siteError) {
                    logger.warn('Failed to create site during reactivation', {
                      component: 'companies-routes',
                      action: 'importCompanies',
                      companyId: reactivatedCompany.id,
                      error: siteError.message,
                      index: i
                    });
                  }
                }

                // Aggiorna la mappa con l'azienda riattivata
                companiesByPiva.set(pivaKey, { company: reactivatedCompany, index: i });
                continue;
              }

              // Se l'azienda è attiva, verifica se è una sede diversa
              const isDifferentSite = companyData.nomeSede && 
                (companyData.nomeSede !== targetCompany.sedeAzienda ||
                 companyData.citta !== targetCompany.citta ||
                 companyData.indirizzo !== targetCompany.indirizzo);

              if (isDifferentSite && companyData.nomeSede) {
                // Ottieni il tenantId dall'utente autenticato
                const tenantId = person.tenantId;
                
                // Crea una nuova sede per l'azienda esistente
                const siteData = {
                  companyId: targetCompany.id,
                  siteName: companyData.nomeSede,
                  citta: companyData.citta,
                  indirizzo: companyData.indirizzo,
                  cap: companyData.cap,
                  provincia: companyData.provincia,
                  telefono: companyData.telefono,
                  mail: companyData.mail,
                  tenantId: tenantId
                };

                const newSite = await prisma.companySite.create({
                  data: siteData
                });

                results.sitesCreated.push({
                  companyId: targetCompany.id,
                  companyName: targetCompany.ragioneSociale,
                  site: newSite
                });
                continue;
              } else {
                // Azienda attiva con stessa sede - segnala come conflitto che richiede decisione utente
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
            }

            // Aggiungi alla mappa per il controllo dei duplicati nel batch
            companiesByPiva.set(pivaKey, { company: null, index: i });
          }

          // Gestione duplicati per Codice Fiscale (se non c'è P.IVA)
          if (!companyData.piva && companyData.codiceFiscale) {
            const cfKey = companyData.codiceFiscale.trim().toUpperCase();
            
            // Verifica se c'è già un'azienda con questo Codice Fiscale nel batch corrente
            const batchCompanyByCF = companiesByCF.get(cfKey);

            if (batchCompanyByCF) {
              // Duplicato nel batch corrente - segnala errore
              results.errors.push({
                index: i,
                error: `Codice Fiscale ${cfKey} duplicato nel file CSV alla riga ${batchCompanyByCF.index + 1}`,
                data: companyData
              });
              continue;
            }
            
            // Verifica se esiste già un'azienda con questo Codice Fiscale nel database (incluse quelle eliminate)
            const existingCompanyByCF = await prisma.company.findFirst({
              where: {
                codiceFiscale: cfKey
              },
              include: {
                sites: true
              }
            });

            if (existingCompanyByCF) {
              // Se l'azienda esistente è eliminata (soft delete), riattivala e aggiorna i dati
              if (existingCompanyByCF.deletedAt) {
                logger.info('Reactivating deleted company by CF', {
                  component: 'companies-routes',
                  action: 'importCompanies',
                  companyId: existingCompanyByCF.id,
                  codiceFiscale: cfKey,
                  ragioneSociale: companyData.ragioneSociale
                });

                // Sanitizza i dati separando Company da CompanySite
                const { companyData: mainCompanyData, siteData } = sanitizeCompanyData(companyData);
                mainCompanyData.tenantId = person.tenantId;
                mainCompanyData.deletedAt = null; // Riattiva l'azienda

                // Rimuovi i campi slug e domain per evitare constraint violation durante la riattivazione
                // L'azienda manterrà i suoi valori originali per questi campi unici
                delete mainCompanyData.slug;
                delete mainCompanyData.domain;

                // Sanitizza i campi booleani per evitare errori Prisma
                if (mainCompanyData.isActive !== undefined) {
                  if (typeof mainCompanyData.isActive === 'string') {
                    // Converte stringhe vuote o "false" in false, tutto il resto in true
                    mainCompanyData.isActive = mainCompanyData.isActive !== '' && 
                                               mainCompanyData.isActive.toLowerCase() !== 'false' && 
                                               mainCompanyData.isActive !== '0';
                  }
                }

                // Aggiorna l'azienda eliminata con i nuovi dati
                const reactivatedCompany = await prisma.company.update({
                  where: { id: existingCompanyByCF.id },
                  data: mainCompanyData
                });

                results.updated.push(reactivatedCompany);

                // Crea automaticamente la sede principale se ci sono dati di indirizzo
                if (siteData.siteCitta || siteData.siteIndirizzo || siteData.nomeSede || siteData.indirizzo || 
                    companyData.citta || companyData.indirizzo) {
                  try {
                    const companySiteData = {
                      companyId: reactivatedCompany.id,
                      siteName: siteData.nomeSede || siteData.siteName || companyData.citta || reactivatedCompany.sedeAzienda || 'Sede Principale',
                      citta: siteData.siteCitta || companyData.citta,
                      indirizzo: siteData.siteIndirizzo || siteData.indirizzo,
                      cap: siteData.siteCap || companyData.cap,
                      provincia: siteData.siteProvincia || companyData.provincia,
                      telefono: siteData.siteTelefono || companyData.telefono,
                      mail: siteData.siteMail || companyData.mail,
                      tenantId: person.tenantId
                    };

                    // Rimuovi campi undefined/null per evitare errori
                    Object.keys(companySiteData).forEach(key => {
                      if (companySiteData[key] === undefined || companySiteData[key] === null) {
                        delete companySiteData[key];
                      }
                    });

                    const newSite = await prisma.companySite.create({
                      data: companySiteData
                    });

                    results.sitesCreated.push({
                      companyId: reactivatedCompany.id,
                      companyName: reactivatedCompany.ragioneSociale,
                      site: newSite
                    });
                  } catch (siteError) {
                    logger.warn('Failed to create site during CF reactivation', {
                      component: 'companies-routes',
                      action: 'importCompanies',
                      companyId: reactivatedCompany.id,
                      error: siteError.message,
                      index: i
                    });
                  }
                }

                continue;
              } else {
                // Azienda attiva con stesso CF - segnala come conflitto che richiede decisione utente
                results.errors.push({
                  index: i,
                  error: `Azienda con Codice Fiscale ${cfKey} già esistente. Utilizzare l'opzione di sovrascrittura per aggiornare i dati.`,
                  data: companyData,
                  existingCompany: {
                    id: existingCompanyByCF.id,
                    ragioneSociale: existingCompanyByCF.ragioneSociale,
                    piva: existingCompanyByCF.piva,
                    codiceFiscale: existingCompanyByCF.codiceFiscale
                  }
                });
                continue;
              }
            }

            // Aggiungi alla mappa per il controllo dei duplicati nel batch
            companiesByCF.set(cfKey, { company: null, index: i });
          }

          // Ottieni il tenantId dall'utente autenticato
          const tenantId = person.tenantId;
          
          if (!tenantId) {
            results.errors.push({
              index: i,
              error: 'TenantId non trovato per l\'utente autenticato',
              data: companyData
            });
            continue;
          }

          // Sanitizza i dati separando Company da CompanySite
          const { companyData: mainCompanyData, siteData } = sanitizeCompanyData(companyData);
          
          // Aggiungi il tenantId ai dati dell'azienda
          mainCompanyData.tenantId = tenantId;
          
          // Sanitizza i campi booleani per evitare errori Prisma
          if (mainCompanyData.isActive !== undefined) {
            if (typeof mainCompanyData.isActive === 'string') {
              // Converte stringhe vuote o "false" in false, tutto il resto in true
              mainCompanyData.isActive = mainCompanyData.isActive !== '' && 
                                         mainCompanyData.isActive.toLowerCase() !== 'false' && 
                                         mainCompanyData.isActive !== '0';
            }
          } else {
            // Se isActive non è specificato, imposta true di default per le aziende importate
            mainCompanyData.isActive = true;
          }
          
          // Crea o aggiorna l'azienda
          let company;
          const isUpdate = overwriteIds.includes(companyData.id);
          
          if (isUpdate && companyData.id) {
            // Rimuovi i campi slug e domain per evitare constraint violation durante l'aggiornamento
            // L'azienda manterrà i suoi valori originali per questi campi unici
            const updateData = { ...mainCompanyData };
            delete updateData.slug;
            delete updateData.domain;
            
            company = await prisma.company.update({
              where: { id: companyData.id },
              data: updateData
            });
            results.updated.push(company);
          } else {
            company = await prisma.company.create({
              data: mainCompanyData
            });
            results.created.push(company);
          }

          // Aggiorna le mappe con l'azienda creata
          if (companyData.piva) {
            const existing = companiesByPiva.get(companyData.piva.trim());
            if (existing) {
              existing.company = company;
            }
          }
          if (companyData.codiceFiscale) {
            const existing = companiesByCF.get(companyData.codiceFiscale.trim().toUpperCase());
            if (existing) {
              existing.company = company;
            }
          }

          // Crea automaticamente la sede principale se ci sono dati di indirizzo
          if (siteData.siteCitta || siteData.siteIndirizzo || siteData.nomeSede || siteData.indirizzo || 
              mainCompanyData.citta || mainCompanyData.indirizzo) {
            try {
              const companySiteData = {
                companyId: company.id,
                siteName: siteData.nomeSede || siteData.siteName || mainCompanyData.citta || company.sedeAzienda || 'Sede Principale',
                citta: siteData.siteCitta || mainCompanyData.citta,
                indirizzo: siteData.siteIndirizzo || siteData.indirizzo,
                cap: siteData.siteCap || mainCompanyData.cap,
                provincia: siteData.siteProvincia || mainCompanyData.provincia,
                telefono: siteData.siteTelefono || mainCompanyData.telefono,
                mail: siteData.siteMail || mainCompanyData.mail,
                tenantId: tenantId
              };

              // Rimuovi campi undefined/null per evitare errori
              Object.keys(companySiteData).forEach(key => {
                if (companySiteData[key] === undefined || companySiteData[key] === null) {
                  delete companySiteData[key];
                }
              });

              const newSite = await prisma.companySite.create({
                data: companySiteData
              });

              results.sitesCreated.push({
                companyId: company.id,
                companyName: company.ragioneSociale,
                site: newSite
              });
            } catch (siteError) {
              // Log l'errore ma non bloccare l'importazione
              logger.warn('Failed to create site during import', {
                component: 'companies-routes',
                action: 'importCompanies',
                companyId: company.id,
                error: siteError.message,
                index: i
              });
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
      
      if (hasConflicts && results.created.length === 0 && results.updated.length === 0) {
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