import { validationResult } from 'express-validator';
import personService from '../services/personService.js';
import logger from '../utils/logger.js';

class PersonController {
  // GET /api/persons/employees
  async getEmployees(req, res) {
    try {
      const { companyId, tenantId, search, ...filters } = req.query;
      const personId = req.person.id;
      
      const queryFilters = {};
      if (companyId) queryFilters.companyId = companyId;
      if (tenantId) queryFilters.tenantId = tenantId;
      
      let employees;
      if (search) {
        employees = await personService.searchPersons(search, 'EMPLOYEE', queryFilters);
      } else {
        employees = await personService.getEmployees(queryFilters);
      }
      
      // Filtra i dati in base ai permessi avanzati della persona
      const enhancedRoleService = (await import('../services/enhancedRoleService.js')).default;
      const filteredEmployees = await enhancedRoleService.filterDataByPermissions(
        personId,
        'person',
        'read',
        employees,
        tenantId
      );
      
      // Trasforma i dati per backward compatibility
      const transformedEmployees = (filteredEmployees || []).map(person => ({
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
        title: person.title,
        hired_date: person.hiredDate,
        company_id: person.companyId,
        companyId: person.companyId,
        company: person.company,
        isActive: person.status === 'ACTIVE',
        createdAt: person.createdAt,
        updatedAt: person.updatedAt
      }));
      
      res.json(transformedEmployees);
    } catch (error) {
      logger.error('Error getting employees:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }
  
  // GET /api/persons/trainers
  async getTrainers(req, res) {
    try {
      const { companyId, tenantId, search, ...filters } = req.query;
      const personId = req.person.id;
      
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
        'person',
        'read',
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
        is_active: person.isActive,
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
      const { companyId, tenantId, search, ...filters } = req.query;
      const personId = req.person.id;
      
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
      
      const person = await personService.createPerson(
        transformedData, 
        roleType || 'EMPLOYEE', 
        companyId, 
        tenantId
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
      
      res.status(204).send();
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
      res.status(204).send();
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
        limit = 50
      } = req.query;
      
      const filters = {
        roleType,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        companyId: companyId || undefined,
        search,
        sortBy,
        sortOrder,
        page: parseInt(page),
        limit: parseInt(limit)
      };
      
      const result = await personService.getPersonsWithPagination(filters);
      
      // Trasforma i dati per il frontend
      const transformedPersons = result.persons.map(person => ({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        phone: person.phone,
        address: person.residenceAddress,
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

  // POST /api/persons/import - Importa persone da CSV
  async importPersons(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const result = await personService.importPersonsFromCSV(req.file);
      
      res.json({
        imported: result.imported,
        errors: result.errors
      });
    } catch (error) {
      logger.error('Error importing persons:', { error: error.message });
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