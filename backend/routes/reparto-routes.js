import express from 'express';
import logger from '../utils/logger.js';
import middleware from '../middleware/auth.js';
import { checkAdvancedPermission, filterDataByPermissions } from '../middleware/advanced-permissions.js';
import prisma from '../config/prisma-optimization.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// Get all Reparti for a site
router.get('/site/:siteId',
  authenticateToken,
  checkAdvancedPermission('companies', 'read', {
    getSiteId: (req) => req.params.siteId
  }),
  filterDataByPermissions(),
  async (req, res) => {
    try {
      const { siteId } = req.params;
      const person = req.person;
      const tenantId = getEffectiveTenantId(req);

      // Verifica che la sede esista e appartenga al tenant
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

      const reparti = await prisma.reparto.findMany({
        where: {
          siteId,
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
          responsabile: {
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
              person: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: { nome: 'asc' }
      });

      res.json({ reparti });
    } catch (error) {
      logger.error('Failed to fetch Reparti', {
        component: 'reparto-routes',
        action: 'getRepartieBySite',
        error: 'Operazione non riuscita',
        stack: error.stack,
        siteId: req.params?.siteId
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nel recupero dei reparti'
      });
    }
  }
);

// Get Reparto by ID
router.get('/:id',
  authenticateToken,
  checkAdvancedPermission('companies', 'read', {
    getSiteId: async (req) => {
      const reparto = await prisma.reparto.findFirst({
        where: { id: req.params.id, tenantId: getEffectiveTenantId(req), deletedAt: null },
        select: { siteId: true }
      });
      return reparto?.siteId;
    }
  }),
  filterDataByPermissions(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const person = req.person;

      const reparto = await prisma.reparto.findFirst({
        where: {
          id,
          tenantId: getEffectiveTenantId(req),
          deletedAt: null
        },
        include: {
          site: {
            include: {
              companyTenantProfile: { include: { company: true } }
            }
          },
          responsabile: {
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

      if (!reparto) {
        return res.status(404).json({
          error: 'Reparto non trovato',
          message: 'Il reparto specificato non esiste'
        });
      }

      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede

      res.json(reparto);
    } catch (error) {
      logger.error('Failed to fetch Reparto', {
        component: 'reparto-routes',
        action: 'getReparto',
        error: 'Operazione non riuscita',
        stack: error.stack,
        repartoId: req.params?.id
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nel recupero del reparto'
      });
    }
  }
);

// Create new Reparto
router.post('/',
  authenticateToken,
  checkAdvancedPermission('companies', 'create', {
    getSiteId: (req) => req.body.siteId
  }),
  async (req, res) => {
    try {
      const person = req.person;
      const tenantId = getEffectiveTenantId(req);
      const { siteId, nome, descrizione, codice, responsabileId } = req.body;

      // Validate required fields
      if (!siteId || !nome) {
        return res.status(400).json({
          error: 'Errore di validazione',
          message: 'siteId e nome sono obbligatori'
        });
      }

      // Verifica che la sede esista e appartenga al tenant
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

      // Verifica che il responsabile esista se specificato
      if (responsabileId) {
        const responsabile = await prisma.person.findUnique({
          where: { id: responsabileId, deletedAt: null }
        });

        if (!responsabile) {
          return res.status(404).json({
            error: 'Responsabile non trovato',
            message: 'La persona specificata non esiste'
          });
        }

        // Verifica che il responsabile appartenga alla stessa company
        if (person.globalRole !== 'ADMIN' && responsabile.companyId !== site.companyId) {
          return res.status(403).json({
            error: 'Accesso negato',
            message: 'Il responsabile deve appartenere alla stessa azienda'
          });
        }
      }

      // Verifica che non esista già un reparto con lo stesso nome nella stessa sede
      const existingReparto = await prisma.reparto.findFirst({
        where: {
          siteId,
          nome,
          deletedAt: null
        }
      });

      if (existingReparto) {
        return res.status(409).json({
          error: 'Conflitto',
          message: 'Un reparto con questo nome esiste già in questa sede'
        });
      }

      const reparto = await prisma.reparto.create({
        data: {
          siteId,
          nome,
          descrizione,
          codice,
          responsabileId,
          tenantId: person.tenantId
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
          responsabile: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      res.status(201).json(reparto);
    } catch (error) {
      logger.error('Failed to create Reparto', {
        component: 'reparto-routes',
        action: 'createReparto',
        error: 'Operazione non riuscita',
        stack: error.stack,
        body: req.body
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nella creazione del reparto'
      });
    }
  }
);

// Update Reparto
router.put('/:id',
  authenticateToken,
  checkAdvancedPermission('companies', 'edit', {
    getSiteId: async (req) => {
      const reparto = await prisma.reparto.findFirst({
        where: { id: req.params.id, tenantId: getEffectiveTenantId(req), deletedAt: null },
        select: { siteId: true }
      });
      return reparto?.siteId;
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const person = req.person;
      const { nome, descrizione, codice, responsabileId } = req.body;

      // Verifica che il reparto esista
      const existingReparto = await prisma.reparto.findFirst({
        where: { id, tenantId: getEffectiveTenantId(req), deletedAt: null },
        include: {
          site: {
            include: { companyTenantProfile: { include: { company: true } } }
          }
        }
      });

      if (!existingReparto) {
        return res.status(404).json({
          error: 'Reparto non trovato',
          message: 'Il reparto specificato non esiste'
        });
      }

      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede

      // Verifica che il responsabile esista se specificato
      if (responsabileId) {
        const responsabile = await prisma.person.findUnique({
          where: { id: responsabileId, deletedAt: null }
        });

        if (!responsabile) {
          return res.status(404).json({
            error: 'Responsabile non trovato',
            message: 'La persona specificata non esiste'
          });
        }

        // Verifica che il responsabile appartenga alla stessa company
        if (person.globalRole !== 'ADMIN' && responsabile.companyId !== existingReparto.site.companyId) {
          return res.status(403).json({
            error: 'Accesso negato',
            message: 'Il responsabile deve appartenere alla stessa azienda'
          });
        }
      }

      // Verifica che non esista già un reparto con lo stesso nome nella stessa sede (escludendo quello corrente)
      if (nome && nome !== existingReparto.nome) {
        const duplicateReparto = await prisma.reparto.findFirst({
          where: {
            siteId: existingReparto.siteId,
            nome,
            deletedAt: null,
            id: { not: id }
          }
        });

        if (duplicateReparto) {
          return res.status(409).json({
            error: 'Conflitto',
            message: 'Un reparto con questo nome esiste già in questa sede'
          });
        }
      }

      const updatedReparto = await prisma.reparto.update({
        where: { id },
        data: {
          ...(nome && { nome }),
          ...(descrizione !== undefined && { descrizione }),
          ...(codice !== undefined && { codice }),
          ...(responsabileId !== undefined && { responsabileId })
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
          responsabile: {
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

      res.json(updatedReparto);
    } catch (error) {
      logger.error('Failed to update Reparto', {
        component: 'reparto-routes',
        action: 'updateReparto',
        error: 'Operazione non riuscita',
        stack: error.stack,
        repartoId: req.params?.id,
        body: req.body
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nell\'aggiornamento del reparto'
      });
    }
  }
);

// Delete Reparto (soft delete)
router.delete('/:id',
  authenticateToken,
  checkAdvancedPermission('companies', 'delete', {
    getSiteId: async (req) => {
      const reparto = await prisma.reparto.findFirst({
        where: { id: req.params.id, tenantId: getEffectiveTenantId(req), deletedAt: null },
        select: { siteId: true }
      });
      return reparto?.siteId;
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const person = req.person;

      // Verifica che il reparto esista
      const reparto = await prisma.reparto.findFirst({
        where: { id, tenantId: getEffectiveTenantId(req), deletedAt: null },
        include: {
          site: {
            include: { companyTenantProfile: { include: { company: true } } }
          },
          personProfiles: {
            where: { deletedAt: null }
          }
        }
      });

      if (!reparto) {
        return res.status(404).json({
          error: 'Reparto non trovato',
          message: 'Il reparto specificato non esiste'
        });
      }

      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede

      // Verifica che non ci siano dipendenti assegnati al reparto
      if (reparto.personProfiles.length > 0) {
        return res.status(409).json({
          error: 'Conflitto',
          message: 'Impossibile eliminare il reparto con dipendenti assegnati. Riassegnare prima i dipendenti.'
        });
      }

      await prisma.reparto.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete Reparto', {
        component: 'reparto-routes',
        action: 'deleteReparto',
        error: 'Operazione non riuscita',
        stack: error.stack,
        repartoId: req.params?.id
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nell\'eliminazione del reparto'
      });
    }
  }
);

// Assign employee to department
router.post('/:id/assign-employee',
  authenticateToken,
  checkAdvancedPermission('companies', 'edit', {
    getSiteId: async (req) => {
      const reparto = await prisma.reparto.findFirst({
        where: { id: req.params.id, tenantId: getEffectiveTenantId(req), deletedAt: null },
        select: { siteId: true }
      });
      return reparto?.siteId;
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { personId } = req.body;
      const person = req.person;

      if (!personId) {
        return res.status(400).json({
          error: 'Errore di validazione',
          message: 'personId obbligatorio'
        });
      }

      // Verifica che il reparto esista
      const reparto = await prisma.reparto.findFirst({
        where: { id, tenantId: getEffectiveTenantId(req), deletedAt: null },
        include: {
          site: {
            include: { companyTenantProfile: { include: { company: true } } }
          }
        }
      });

      if (!reparto) {
        return res.status(404).json({
          error: 'Reparto non trovato',
          message: 'Il reparto specificato non esiste'
        });
      }

      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede

      // Verifica che la persona esista e abbia un profilo nel tenant
      const employee = await prisma.person.findUnique({
        where: { id: personId, deletedAt: null },
        include: { tenantProfiles: { where: { tenantId: getEffectiveTenantId(req), deletedAt: null }, take: 1 } }
      });

      if (!employee) {
        return res.status(404).json({
          error: 'Dipendente non trovato',
          message: 'Il dipendente specificato non esiste'
        });
      }

      const employeeProfile = employee.tenantProfiles[0];

      // P48: Verifica company tramite companyTenantProfileId nel profilo tenant
      if (person.globalRole !== 'ADMIN' && employeeProfile?.companyTenantProfileId !== reparto.site.companyTenantProfileId) {
        return res.status(403).json({
          error: 'Accesso negato',
          message: 'Il dipendente deve appartenere alla stessa azienda'
        });
      }

      // P48: repartoId è su PersonTenantProfile
      if (employeeProfile) {
        await prisma.personTenantProfile.update({
          where: { id: employeeProfile.id },
          data: { repartoId: id }
        });
      }

      res.json({
        message: 'Dipendente assegnato al reparto con successo',
        repartoId: id,
        personId
      });
    } catch (error) {
      logger.error('Failed to assign employee to department', {
        component: 'reparto-routes',
        action: 'assignEmployee',
        error: 'Operazione non riuscita',
        stack: error.stack,
        repartoId: req.params?.id,
        body: req.body
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nell\'assegnazione del dipendente al reparto'
      });
    }
  }
);

// Remove employee from department
router.post('/:id/remove-employee',
  authenticateToken,
  checkAdvancedPermission('companies', 'edit', {
    getSiteId: async (req) => {
      const reparto = await prisma.reparto.findFirst({
        where: { id: req.params.id, tenantId: getEffectiveTenantId(req), deletedAt: null },
        select: { siteId: true }
      });
      return reparto?.siteId;
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { personId } = req.body;
      const person = req.person;

      if (!personId) {
        return res.status(400).json({
          error: 'Errore di validazione',
          message: 'personId obbligatorio'
        });
      }

      // Verifica che il reparto esista
      const reparto = await prisma.reparto.findFirst({
        where: { id, tenantId: getEffectiveTenantId(req), deletedAt: null },
        include: {
          site: {
            include: { companyTenantProfile: { include: { company: true } } }
          }
        }
      });

      if (!reparto) {
        return res.status(404).json({
          error: 'Reparto non trovato',
          message: 'Il reparto specificato non esiste'
        });
      }

      // I permessi sono già stati verificati dal middleware checkAdvancedPermission
      // che ora include la verifica dei permessi per sede

      // Verifica che la persona esista e sia assegnata al reparto
      const employee = await prisma.person.findUnique({
        where: { id: personId, deletedAt: null },
        include: { tenantProfiles: { where: { tenantId: getEffectiveTenantId(req), deletedAt: null }, take: 1 } }
      });

      if (!employee) {
        return res.status(404).json({
          error: 'Dipendente non trovato',
          message: 'Il dipendente specificato non esiste'
        });
      }

      const employeeProfile = employee.tenantProfiles[0];
      if (!employeeProfile || employeeProfile.repartoId !== id) {
        return res.status(400).json({
          error: 'Errore di validazione',
          message: 'Il dipendente non è assegnato a questo reparto'
        });
      }

      // P48: repartoId è su PersonTenantProfile
      await prisma.personTenantProfile.update({
        where: { id: employeeProfile.id },
        data: { repartoId: null }
      });

      res.json({
        message: 'Dipendente rimosso dal reparto con successo',
        repartoId: id,
        personId
      });
    } catch (error) {
      logger.error('Failed to remove employee from department', {
        component: 'reparto-routes',
        action: 'removeEmployee',
        error: 'Operazione non riuscita',
        stack: error.stack,
        repartoId: req.params?.id,
        body: req.body
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nell\'eliminazione del dipendente dal reparto'
      });
    }
  }
);

export default router;