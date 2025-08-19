import { validationResult } from 'express-validator';
import personService from '../services/personService.js';
import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';

class PersonController {
  // GET /api/persons/employees
  async getEmployees(req, res) {
    try {
      const { companyId, tenantId, limit, offset } = req.query;
      const personId = req.person?.id;

      logger.info('Getting employees with BYPASS', { 
        companyId, 
        tenantId, 
        limit, 
        offset, 
        personId 
      });

      // BYPASS TEMPORANEO: Query diretta semplificata
      const where = {
        deletedAt: null,
        status: 'ACTIVE'
      };

      if (companyId || req.person?.companyId) {
        where.companyId = companyId || req.person?.companyId;
      }

      if (tenantId || req.person?.tenantId) {
        where.tenantId = tenantId || req.person?.tenantId;
      }

      const queryOptions = {
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          taxCode: true,
          globalRole: true,
          companyId: true,
          tenantId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      };

      if (limit) {
        queryOptions.take = parseInt(limit);
        queryOptions.skip = offset ? parseInt(offset) : 0;
      }

      const employees = await prisma.person.findMany(queryOptions);

      logger.info('Retrieved employees successfully with BYPASS', { 
        count: employees.length 
      });

      res.json({
        success: true,
        data: employees,
        total: employees.length
      });

    } catch (error) {
      logger.error('Error getting employees:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve employees',
        details: error.message
      });
    }
  }
  
  // GET /api/persons/trainers
  async getTrainers(req, res) {
    try {
      const { companyId, search, ...filters } = req.query;
      const personId = req.person.id;
      const tenantId = req.tenantId; // Usa il tenant dal middleware
      
      const queryFilters = {};
      if (companyId) queryFilters.companyId = companyId;
      if (tenantId) queryFilters.tenantId = tenantId;
      
      let trainers;
      if (search) {
        trainers = await personService.searchPersons(search, 'TRAINER', queryFilters);
      } else {
        trainers = await personService.getTrainers(queryFilters);
      }
      
      // Filtra i dati in base ai permessi avanzati della persona
      const enhancedRoleService = (await import('../services/enhancedRoleService.js')).default;
      const filteredTrainers = await enhancedRoleService.filterDataByPermissions(
        personId,
        'trainers',
        'view',
        trainers,
        tenantId
      );
      
      // Trasforma i dati per backward compatibility
      const transformedTrainers = (filteredTrainers || []).map(person => ({
        id: person.id,
        first_name: person.firstName,
        last_name: person.lastName,
        email: person.email,
        phone: person.phone,
        codice_fiscale: person.taxCode,
        birth_date: person.birthDate,
        residence_address: person.residenceAddress,
        residence_city: person.residenceCity,
        postal_code: person.postalCode,
        province: person.province,
        hourly_rate: person.hourlyRate,
        iban: person.iban,
        register_code: person.registerCode,
        certifications: person.certifications,
        specialties: person.specialties,
        vat_number: person.vatNumber,
        is_active: person.status === 'ACTIVE',
        createdAt: person.createdAt,
        updatedAt: person.updatedAt
      }));
      
      res.json(transformedTrainers);
    } catch (error) {
      logger.error('Error getting trainers:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }
  
  // GET /api/persons/users
  async getSystemUsers(req, res) {
    try {
      const { companyId, search, ...filters } = req.query;
      const personId = req.person.id;
      const tenantId = req.tenantId; // Usa il tenant dal middleware
      
      const queryFilters = {};
      if (companyId) queryFilters.companyId = companyId;
      if (tenantId) queryFilters.tenantId = tenantId;
      
      let users;
      if (search) {
        users = await personService.searchPersons(search, ['ADMIN', 'COMPANY_ADMIN', 'MANAGER'], queryFilters);
      } else {
        users = await personService.getSystemUsers(queryFilters);
      }
      
      // Filtra i dati in base ai permessi avanzati della persona
      const enhancedRoleService = (await import('../services/enhancedRoleService.js')).default;
      const filteredUsers = await enhancedRoleService.filterDataByPermissions(
        personId,
        'person',
        'read',
        users,
        tenantId
      );
      
      // Trasforma i dati per backward compatibility
      const transformedUsers = (filteredUsers || []).map(person => ({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        username: person.username,
        globalRole: person.globalRole,
        isActive: person.status === 'ACTIVE',
        lastLogin: person.lastLogin,
        failedAttempts: person.failedAttempts,
        lockedUntil: person.lockedUntil,
        companyId: person.companyId,
        tenantId: person.tenantId,
        createdAt: person.createdAt,
        updatedAt: person.updatedAt
      }));
      
      res.json(transformedUsers);
    } catch (error) {
      logger.error('Error getting system persons:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }
  
  // GET /api/persons/:id
  async getPersonById(req, res) {
    try {
      const { id } = req.params;
      const person = await personService.getPersonById(id);
      
      if (!person) {
        return res.status(404).json({ error: 'Person not found' });
      }
      
      res.json(person);
    } catch (error) {
      logger.error('Error getting person by ID:', { error: error.message, id: req.params.id });
      res.status(500).json({ error: error.message });
    }
  }
  
  // POST /api/persons
  async createPerson(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { roleType, companyId, tenantId, ...personData } = req.body;
      
      // Controllo completo di req.person per debug se necessario
      
      // Usa tenantId e companyId dell'utente autenticato se non forniti
      const finalTenantId = tenantId || req.person?.tenantId;
      const finalCompanyId = companyId || req.person?.companyId;
      
      // Verifica che tenantId sia presente
      if (!finalTenantId) {
        return res.status(400).json({ 
          error: 'TenantId is required. Please provide tenantId in request body or ensure user has a valid tenant.' 
        });
      }
      
      // Trasforma i campi da snake_case a camelCase se necessario
      const transformedData = {
        firstName: personData.firstName || personData.first_name,
        lastName: personData.lastName || personData.last_name,
        email: personData.email,
        phone: personData.phone,
        taxCode: personData.taxCode || personData.codice_fiscale,
        birthDate: personData.birthDate || personData.birth_date,
        residenceAddress: personData.residenceAddress || personData.residence_address,
        residenceCity: personData.residenceCity || personData.residence_city,
        postalCode: personData.postalCode || personData.postal_code,
        province: personData.province,
        title: personData.title,
        hiredDate: personData.hiredDate || personData.hired_date,
        hourlyRate: personData.hourlyRate || personData.hourly_rate,
        iban: personData.iban,
        registerCode: personData.registerCode || personData.register_code,
        certifications: personData.certifications || [],
        specialties: personData.specialties || [],
        vatNumber: personData.vatNumber || personData.vat_number,
        username: personData.username,
        password: personData.password,
        globalRole: personData.globalRole,
        status: personData.status || 'ACTIVE'
      };
      
      // Rimuovi campi undefined per evitare errori Prisma
      Object.keys(transformedData).forEach(key => {
        if (transformedData[key] === undefined) {
          delete transformedData[key];
        }
      });
      
      // Controllo duplicati per taxCode e email
      if (transformedData.taxCode) {
        const existingByTaxCode = await prisma.person.findFirst({
          where: { 
            taxCode: transformedData.taxCode.toUpperCase(), 
            deletedAt: null,
            tenantId: finalTenantId
          }
        });
        if (existingByTaxCode) {
          return res.status(400).json({ 
            error: `Una persona con codice fiscale ${transformedData.taxCode} esiste già nel sistema.`,
            field: 'taxCode',
            existingPersonId: existingByTaxCode.id
          });
        }
      }
      
      if (transformedData.email) {
        const existingByEmail = await prisma.person.findFirst({
          where: { 
            email: transformedData.email.toLowerCase(), 
            deletedAt: null,
            tenantId: finalTenantId
          }
        });
        if (existingByEmail) {
          return res.status(400).json({ 
            error: `Una persona con email ${transformedData.email} esiste già nel sistema.`,
            field: 'email',
            existingPersonId: existingByEmail.id
          });
        }
      }
      
      const person = await personService.createPerson(
        transformedData, 
        roleType || 'EMPLOYEE', 
        finalCompanyId, 
        finalTenantId
      );
      
      res.status(201).json(person);
    } catch (error) {
      logger.error('Error creating person:', { error: error.message, body: req.body });
      res.status(500).json({ error: error.message });
    }
  }
  
  // PUT /api/persons/:id
  async updatePerson(req, res) {
    try {
      const { id } = req.params;
      const { roleType, ...personData } = req.body;
      
      // Trasforma i campi da snake_case a camelCase se necessario
      const transformedData = {
        firstName: personData.firstName || personData.first_name,
        lastName: personData.lastName || personData.last_name,
        email: personData.email,
        phone: personData.phone,
        taxCode: personData.taxCode || personData.codice_fiscale,
        birthDate: personData.birthDate || personData.birth_date,
        residenceAddress: personData.residenceAddress || personData.residence_address,
        residenceCity: personData.residenceCity || personData.residence_city,
        postalCode: personData.postalCode || personData.postal_code,
        province: personData.province,
        title: personData.title,
        hiredDate: personData.hiredDate || personData.hired_date,
        hourlyRate: personData.hourlyRate || personData.hourly_rate,
        iban: personData.iban,
        registerCode: personData.registerCode || personData.register_code,
        certifications: personData.certifications,
        specialties: personData.specialties,
        vatNumber: personData.vatNumber || personData.vat_number,
        username: personData.username,
        globalRole: personData.globalRole,
        status: personData.status || 'ACTIVE'
      };
      
      // Rimuovi campi undefined
      Object.keys(transformedData).forEach(key => {
        if (transformedData[key] === undefined) {
          delete transformedData[key];
        }
      });
      
      const person = await personService.updatePerson(id, transformedData);
      
      res.json(person);
    } catch (error) {
      logger.error('Error updating person:', { error: error.message, id: req.params.id, body: req.body });
      res.status(500).json({ error: error.message });
    }
  }
  
  // DELETE /api/persons/:id
  async deletePerson(req, res) {
    try {
      const { id } = req.params;
      await personService.deletePerson(id);
      
      res.json({ 
        success: true, 
        message: 'Persona eliminata con successo',
        id: id
      });
    } catch (error) {
      logger.error('Error deleting person:', { error: error.message, id: req.params.id });
      res.status(500).json({ error: error.message });
    }
  }
  
  // POST /api/persons/:id/roles
  async addRole(req, res) {
    try {
      const { id } = req.params;
      const { roleType, companyId, tenantId } = req.body;
      
      const role = await personService.addRole(id, roleType, companyId, tenantId);
      res.status(201).json(role);
    } catch (error) {
      logger.error('Error adding role:', { error: error.message, id: req.params.id, body: req.body });
      res.status(500).json({ error: error.message });
    }
  }
  
  // DELETE /api/persons/:id/roles/:roleType
  async removeRole(req, res) {
    try {
      const { id, roleType } = req.params;
      const { companyId, tenantId } = req.query;
      
      await personService.removeRole(id, roleType, companyId, tenantId);
      res.json({ 
        success: true, 
        message: 'Ruolo rimosso con successo',
        personId: id,
        roleType: roleType
      });
    } catch (error) {
      logger.error('Error removing role:', { error: error.message, id: req.params.id, roleType: req.params.roleType });
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/persons - Ottieni tutte le persone con filtri e paginazione
  async getPersons(req, res) {
    try {
      const {
        roleType,
        isActive,
        companyId,
        search,
        sortBy = 'lastLogin',
        sortOrder = 'desc',
        page = 1,
        limit = 50,
        includeDeleted = false
      } = req.query;
      
      const filters = {
        roleType,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        companyId: companyId || undefined,
        search,
        sortBy,
        sortOrder,
        page: parseInt(page),
        limit: parseInt(limit),
        includeDeleted: includeDeleted === 'true'
      };
      
      const result = await personService.getPersonsWithPagination(filters);
      
      // Trasforma i dati per il frontend
      const transformedPersons = result.persons.map(person => ({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        phone: person.phone,
        taxCode: person.taxCode,
        residenceAddress: person.residenceAddress,
        position: person.title,
        department: person.department,
        companyId: person.companyId,
        company: person.company,
        roleType: person.personRoles?.[0]?.roleType || 'EMPLOYEE',
        roles: person.personRoles?.map(role => ({
          id: role.id,
          roleType: role.roleType,
          isActive: role.isActive,
          company: role.company,
          assignedAt: role.assignedAt
        })) || [],
        isActive: person.status === 'ACTIVE',
        isOnline: person.isOnline || false,
        lastLogin: person.lastLogin,
        username: person.username,
        status: person.status,
        createdAt: person.createdAt,
        updatedAt: person.updatedAt
      }));
      
      res.json({
        persons: transformedPersons,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages
      });
    } catch (error) {
      logger.error('Error getting persons:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // PUT /api/persons/:id/status - Attiva/disattiva persona
  async togglePersonStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      const person = await personService.updatePerson(id, {
        status: isActive ? 'ACTIVE' : 'INACTIVE'
      });
      
      res.json({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        isActive: person.status === 'ACTIVE',
        updatedAt: person.updatedAt
      });
    } catch (error) {
      logger.error('Error toggling person status:', { error: error.message, id: req.params.id });
      res.status(500).json({ error: error.message });
    }
  }

  // POST /api/persons/:id/reset-password - Reset password persona
  async resetPersonPassword(req, res) {
    try {
      const { id } = req.params;
      
      const result = await personService.resetPersonPassword(id);
      
      res.json({
        temporaryPassword: result.temporaryPassword
      });
    } catch (error) {
      logger.error('Error resetting person password:', { error: error.message, id: req.params.id });
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/persons/stats - Ottieni statistiche persone
  async getPersonStats(req, res) {
    try {
      const stats = await personService.getPersonStats();
      res.json(stats);
    } catch (error) {
      logger.error('Error getting person stats:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/persons/check-username - Verifica disponibilità username
  async checkUsernameAvailability(req, res) {
    try {
      const { username } = req.query;
      
      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }
      
      const available = await personService.checkUsernameAvailability(username);
      res.json({ available });
    } catch (error) {
      logger.error('Error checking username availability:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/persons/check-email - Verifica disponibilità email
  async checkEmailAvailability(req, res) {
    try {
      const { email, excludePersonId } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }
    
    const available = await personService.checkEmailAvailability(email, excludePersonId);
      res.json({ available });
    } catch (error) {
      logger.error('Error checking email availability:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/persons/export - Esporta persone in CSV
  async exportPersons(req, res) {
    try {
      const {
        roleType,
        isActive,
        companyId,
        search
      } = req.query;
      
      const filters = {
        roleType,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        companyId: companyId || undefined,
        search
      };
      
      const csvData = await personService.exportPersonsToCSV(filters);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="persons.csv"');
      res.send(csvData);
    } catch (error) {
      logger.error('Error exporting persons:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // POST /api/persons/import - Importa persone da CSV o JSON
  async importPersons(req, res) {
    try {
      // Gestisce sia file CSV che dati JSON
      if (req.file) {
        // Importazione da file CSV
        const companyId = req.body.companyId || req.person?.companyId || null;
        let tenantId = req.body.tenantId || req.person?.tenantId || req.tenantId || null;
        
        // Se tenantId è null, usa il primo tenant disponibile
        if (!tenantId) {
          const defaultTenant = await prisma.tenant.findFirst({
            where: {
              isActive: true,
              deletedAt: null
            },
            orderBy: {
              createdAt: 'asc'
            }
          });
          
          if (defaultTenant) {
            tenantId = defaultTenant.id;
            logger.info('Using default tenant for import:', { tenantId: defaultTenant.id, tenantName: defaultTenant.name });
          } else {
            return res.status(400).json({ 
              error: 'No active tenant found. Please contact system administrator.' 
            });
          }
        }
        
        logger.info('Importing persons from CSV:', { 
          companyId,
          tenantId,
          fromBody: req.body.tenantId,
          fromPerson: req.person?.tenantId,
          fromMiddleware: req.tenantId
        });
        
        const csvContent = req.file.buffer.toString('utf-8');
        const result = await personService.importPersonsFromCSV(csvContent, { companyId, tenantId });
        
        res.json({
          imported: result.imported,
          errors: result.errors
        });
      } else if (req.body.persons && Array.isArray(req.body.persons)) {
        // Importazione da dati JSON processati dal frontend
        const { persons, overwriteIds = [] } = req.body;
        const companyId = req.body.companyId || req.person?.companyId || null;
        let tenantId = req.body.tenantId || req.person?.tenantId || req.tenantId || null;
        
        // Se tenantId è null, usa il primo tenant disponibile
        if (!tenantId) {
          const defaultTenant = await prisma.tenant.findFirst({
            where: {
              isActive: true,
              deletedAt: null
            },
            orderBy: {
              createdAt: 'asc'
            }
          });
          
          if (defaultTenant) {
            tenantId = defaultTenant.id;
            logger.info('Using default tenant for import:', { tenantId: defaultTenant.id, tenantName: defaultTenant.name });
          } else {
            return res.status(400).json({ 
              error: 'No active tenant found. Please contact system administrator.' 
            });
          }
        }
        
        logger.info('Importing persons from JSON data:', { 
          count: persons.length, 
          overwriteIds: overwriteIds.length,
          companyId,
          tenantId,
          fromBody: req.body.tenantId,
          fromPerson: req.person?.tenantId,
          fromMiddleware: req.tenantId
        });
        
        const result = await personService.importPersonsFromJSON(persons, overwriteIds, companyId, tenantId);
        
        res.json({
          imported: result.imported,
          errors: result.errors || []
        });
      } else {
        return res.status(400).json({ 
          error: 'Either file upload or persons array is required' 
        });
      }
    } catch (error) {
      logger.error('Error importing persons:', { error: error.message, stack: error.stack });
      res.status(500).json({ error: error.message });
    }
  }

  // DELETE /api/persons/bulk - Elimina più persone
  async deleteMultiplePersons(req, res) {
    try {
      const { personIds } = req.body;
      
      if (!personIds || !Array.isArray(personIds) || personIds.length === 0) {
        return res.status(400).json({ error: 'personIds array is required' });
      }
      
      const result = await personService.deleteMultiplePersons(personIds);
      
      res.json({
        deleted: result.deleted,
        errors: result.errors || []
      });
    } catch (error) {
      logger.error('Error deleting multiple persons:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/persons/preferences - Ottieni preferenze utente
  async getPreferences(req, res) {
    try {
      const personId = req.person.id;
      
      const preferences = await personService.getPersonPreferences(personId);
      
      res.json(preferences || {});
    } catch (error) {
      logger.error('Error getting person preferences:', { error: error.message, personId: req.person?.id });
      res.status(500).json({ error: error.message });
    }
  }

  // PUT /api/persons/preferences - Aggiorna preferenze utente
  async updatePreferences(req, res) {
    try {
      const personId = req.person.id;
      const preferences = req.body;
      
      const updatedPreferences = await personService.updatePersonPreferences(personId, preferences);
      
      res.json(updatedPreferences);
    } catch (error) {
      logger.error('Error updating person preferences:', { error: error.message, personId: req.person?.id });
      res.status(500).json({ error: error.message });
    }
  }

  // POST /api/persons/preferences/reset - Reset preferenze utente ai valori predefiniti
  async resetPreferences(req, res) {
    try {
      const personId = req.person.id;
      
      const defaultPreferences = await personService.resetPersonPreferences(personId);
      
      res.json(defaultPreferences);
    } catch (error) {
      logger.error('Error resetting person preferences:', { error: error.message, personId: req.person?.id });
      res.status(500).json({ error: error.message });
    }
  }
}

export default new PersonController();