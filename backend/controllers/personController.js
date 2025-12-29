import { validationResult } from 'express-validator';
import personService from '../services/personService.js';
import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';
import AdvancedPermissionService from '../services/advanced-permission.js';

const advancedPermissionService = new AdvancedPermissionService();

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
          title: true, // Profilo professionale
          phone: true,
          birthDate: true,
          hiredDate: true, // Data assunzione
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

      // Applica field-level filtering basato sui permessi, mantenendo la struttura di risposta
      const enhancedRoleService = (await import('../services/enhancedRoleService.js')).default;
      const filteredEmployees = await enhancedRoleService.filterDataByPermissions(
        personId,
        'employees',
        'view',
        employees,
        req.tenantId || tenantId
      );

      logger.info('Retrieved employees successfully with BYPASS', {
        count: (filteredEmployees || []).length
      });

      res.json({
        success: true,
        data: filteredEmployees || [],
        total: (filteredEmployees || []).length
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
      const { view, fields } = req.query || {};
      const person = await personService.getPersonById(id);

      if (!person) {
        return res.status(404).json({ error: 'Person not found' });
      }

      // Calcolo metadati visibilità (senza filtrare i campi della persona per retrocompatibilità)
      const resource = (view === 'employee') ? 'employees' : (view === 'trainer') ? 'trainers' : 'persons';
      const requestedFields = typeof fields === 'string' && fields.length > 0 ? fields.split(',').map(f => f.trim()).filter(Boolean) : undefined;

      let visibilityMeta = { allowed: true, visibleFields: ['*'], defaults: ['*'], resource, view: view || 'person' };
      try {
        const target = await advancedPermissionService.getPersonById(id);
        const permission = await advancedPermissionService.checkPermission({
          personId: req.person.id,
          resource,
          action: 'read',
          targetCompanyId: target?.companyId,
          requestedFields
        });

        if (!permission.allowed) {
          return res.status(403).json({ error: 'Permission denied', code: 'PERMISSION_DENIED' });
        }

        // Determina globalRole dell'utente corrente
        const me = await prisma.person.findUnique({
          where: { id: req.person.id },
          select: {
            globalRole: true,
            personRoles: { where: { isActive: true }, select: { roleType: true } }
          }
        });

        let globalRole = me?.globalRole || null;
        const roles = (me?.personRoles || []).map(r => r.roleType);
        if (!globalRole) {
          if (roles.includes('SUPER_ADMIN')) globalRole = 'SUPER_ADMIN';
          else if (roles.includes('ADMIN')) globalRole = 'ADMIN';
          else if (roles.includes('COMPANY_ADMIN')) globalRole = 'COMPANY_ADMIN';
          else if (roles.includes('MANAGER')) globalRole = 'MANAGER';
          else if (roles.includes('EMPLOYEE')) globalRole = 'EMPLOYEE';
        }

        const defaultFields = advancedPermissionService.getDefaultFieldsForRole(globalRole || 'EMPLOYEE', resource) || [];
        let visibleFields;
        if (permission.allowedFields && permission.allowedFields.includes('*')) {
          visibleFields = requestedFields || (defaultFields.length ? defaultFields : ['*']);
        } else if (permission.allowedFields && permission.allowedFields.length > 0) {
          visibleFields = advancedPermissionService.filterAllowedFields(requestedFields, permission.allowedFields);
        } else {
          // Nessuna policy esplicita: usa default per ruolo
          visibleFields = defaultFields && defaultFields.length ? defaultFields : (requestedFields || ['*']);
        }

        // Calcola editableFields con azione 'update'
        const editPermission = await advancedPermissionService.checkPermission({
          personId: req.person.id,
          resource,
          action: 'update',
          targetCompanyId: target?.companyId,
          requestedFields
        });
        let editableFields;
        if (editPermission.allowedFields && editPermission.allowedFields.includes('*')) {
          editableFields = requestedFields || (defaultFields.length ? defaultFields : ['*']);
        } else if (editPermission.allowedFields && editPermission.allowedFields.length > 0) {
          editableFields = advancedPermissionService.filterAllowedFields(requestedFields, editPermission.allowedFields);
        } else {
          editableFields = defaultFields && defaultFields.length ? defaultFields : (requestedFields || ['*']);
        }

        visibilityMeta = {
          allowed: true,
          resource,
          view: view || 'person',
          visibleFields,
          editableFields,
          defaults: defaultFields,
          meta: { scope: permission.scope, reason: permission.reason }
        };
      } catch (permErr) {
        logger.warn('Visibility metadata calculation failed, falling back to default', { error: permErr.message });
      }

      res.json({ ...person, _visibility: visibilityMeta });
    } catch (error) {
      logger.error('Error getting person by ID:', { error: error.message, id: req.params.id });
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/persons/:id/fields-visibility
  async getPersonFieldsVisibility(req, res) {
    try {
      const { id } = req.params;
      const { view, fields } = req.query || {};

      // Mappa view -> resource
      const resource = (view === 'employee') ? 'employees' : (view === 'trainer') ? 'trainers' : 'persons';
      const requestedFields = typeof fields === 'string' && fields.length > 0
        ? fields.split(',').map(f => f.trim()).filter(Boolean)
        : undefined;

      // Persona target per determinare company scope
      const target = await advancedPermissionService.getPersonById(id);

      // Permessi di lettura
      const readPermission = await advancedPermissionService.checkPermission({
        personId: req.person.id,
        resource,
        action: 'read',
        targetCompanyId: target?.companyId,
        requestedFields
      });

      if (!readPermission.allowed) {
        return res.status(403).json({ error: 'Permission denied', code: 'PERMISSION_DENIED', reason: readPermission.reason });
      }

      // Determina globalRole dell'utente corrente
      const me = await prisma.person.findUnique({
        where: { id: req.person.id },
        select: {
          globalRole: true,
          personRoles: { where: { isActive: true }, select: { roleType: true } }
        }
      });

      let globalRole = me?.globalRole || null;
      const roles = (me?.personRoles || []).map(r => r.roleType);
      if (!globalRole) {
        if (roles.includes('SUPER_ADMIN')) globalRole = 'SUPER_ADMIN';
        else if (roles.includes('ADMIN')) globalRole = 'ADMIN';
        else if (roles.includes('COMPANY_ADMIN')) globalRole = 'COMPANY_ADMIN';
        else if (roles.includes('MANAGER')) globalRole = 'MANAGER';
        else if (roles.includes('EMPLOYEE')) globalRole = 'EMPLOYEE';
      }

      const defaultFields = advancedPermissionService.getDefaultFieldsForRole(globalRole || 'EMPLOYEE', resource) || [];

      // Calcolo campi visibili
      let visibleFields;
      if (readPermission.allowedFields && readPermission.allowedFields.includes('*')) {
        visibleFields = requestedFields || (defaultFields.length ? defaultFields : ['*']);
      } else if (readPermission.allowedFields && readPermission.allowedFields.length > 0) {
        visibleFields = advancedPermissionService.filterAllowedFields(requestedFields, readPermission.allowedFields);
      } else {
        visibleFields = defaultFields && defaultFields.length ? defaultFields : (requestedFields || ['*']);
      }

      // Permessi di modifica
      const editPermission = await advancedPermissionService.checkPermission({
        personId: req.person.id,
        resource,
        action: 'update',
        targetCompanyId: target?.companyId,
        requestedFields
      });

      // Calcolo campi editabili
      let editableFields;
      if (editPermission.allowedFields && editPermission.allowedFields.includes('*')) {
        editableFields = requestedFields || (defaultFields.length ? defaultFields : ['*']);
      } else if (editPermission.allowedFields && editPermission.allowedFields.length > 0) {
        editableFields = advancedPermissionService.filterAllowedFields(requestedFields, editPermission.allowedFields);
      } else {
        editableFields = defaultFields && defaultFields.length ? defaultFields : (requestedFields || ['*']);
      }

      // Costruisco mappa per campo { visible, editable }
      const fieldsSet = new Set(
        (requestedFields && requestedFields.length > 0)
          ? requestedFields
          : Array.from(new Set([...(Array.isArray(visibleFields) ? visibleFields : []), ...(Array.isArray(editableFields) ? editableFields : [])]))
      );

      const isAllVisible = Array.isArray(visibleFields) && visibleFields.includes('*');
      const isAllEditable = Array.isArray(editableFields) && editableFields.includes('*');

      const fieldsMap = {};
      for (const key of fieldsSet) {
        fieldsMap[key] = {
          visible: isAllVisible ? true : visibleFields.includes(key),
          editable: isAllEditable ? true : editableFields.includes(key)
        };
      }

      return res.json({
        personId: id,
        resource,
        view: view || 'person',
        allowed: true,
        visibleFields,
        editableFields,
        fields: fieldsMap,
        defaults: defaultFields,
        meta: { scope: readPermission.scope, reason: readPermission.reason }
      });
    } catch (error) {
      logger.error('Error getting person fields visibility:', { error: error.message, id: req.params?.id });
      return res.status(500).json({ error: error.message });
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
      const finalTenantId = tenantId
        || req.headers['x-tenant-id']
        || req.tenantId
        || (req.tenant && req.tenant.id)
        || req.person?.tenantId;
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

      // Converti date da stringa a Date se necessario
      if (transformedData.birthDate && typeof transformedData.birthDate === 'string') {
        try {
          const dateStr = transformedData.birthDate.trim();
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Formato YYYY-MM-DD: aggiungi orario per evitare problemi timezone
            transformedData.birthDate = new Date(dateStr + 'T00:00:00.000Z');
          } else {
            // Altri formati: usa costruttore Date standard
            transformedData.birthDate = new Date(dateStr);
          }

          // Verifica che la data sia valida
          if (isNaN(transformedData.birthDate.getTime())) {
            transformedData.birthDate = null;
          }
        } catch (error) {
          transformedData.birthDate = null;
        }
      }

      if (transformedData.hiredDate && typeof transformedData.hiredDate === 'string') {
        try {
          const dateStr = transformedData.hiredDate.trim();
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            transformedData.hiredDate = new Date(dateStr + 'T00:00:00.000Z');
          } else {
            transformedData.hiredDate = new Date(dateStr);
          }

          if (isNaN(transformedData.hiredDate.getTime())) {
            transformedData.hiredDate = null;
          }
        } catch (error) {
          transformedData.hiredDate = null;
        }
      }

      // Normalizzazione campi critici
      if (transformedData.email) {
        transformedData.email = String(transformedData.email).toLowerCase().trim();
      }
      if (transformedData.taxCode) {
        transformedData.taxCode = String(transformedData.taxCode).toUpperCase().trim();
      }

      // Validazioni minime per prevenire errori 500 lato Prisma
      if (!transformedData.firstName || !transformedData.lastName) {
        return res.status(400).json({
          error: 'firstName e lastName sono obbligatori per creare una persona',
          code: 'VALIDATION_ERROR',
          fields: ['firstName', 'lastName']
        });
      }

      // Check per persone esistenti (attive o eliminate)
      // Se forceReactivate=true nel body, salta i check e procedi con riattivazione
      const forceReactivate = req.body.forceReactivate === true;

      // Cerca persone esistenti per email o taxCode (incluse le eliminate)
      let existingPerson = null;
      let existingPersonType = null; // 'active' o 'deleted'

      // SOLO il codice fiscale (taxCode) è considerato univoco per le Person
      // L'email NON deve causare conflitto - più persone possono avere la stessa email
      if (transformedData.taxCode) {
        existingPerson = await prisma.person.findFirst({
          where: { taxCode: transformedData.taxCode },
          include: {
            personRoles: {
              where: { deletedAt: null }
            }
          }
        });
        if (existingPerson) {
          existingPersonType = existingPerson.deletedAt ? 'deleted' : 'active';
        }
      }
      // NOTA: Rimosso il check su email - solo taxCode è univoco

      // Se esiste una persona e non è forzato il riattivo, chiedi conferma
      if (existingPerson && !forceReactivate) {
        const existingRoles = existingPerson.personRoles.map(r => r.roleType);
        const willReplaceRole = existingPersonType === 'deleted' && roleType && !existingRoles.includes(roleType);
        const willAddRole = existingPersonType === 'active' && roleType && !existingRoles.includes(roleType);

        return res.status(409).json({
          error: existingPersonType === 'deleted'
            ? 'Persona già esistente nel sistema (eliminata). Confermare per riattivare e aggiornare i dati.'
            : 'Persona già esistente nel sistema.',
          code: 'PERSON_EXISTS',
          existingPerson: {
            id: existingPerson.id,
            firstName: existingPerson.firstName,
            lastName: existingPerson.lastName,
            email: existingPerson.email,
            taxCode: existingPerson.taxCode,
            status: existingPersonType,
            deletedAt: existingPerson.deletedAt,
            currentRoles: existingRoles
          },
          newRoleType: roleType,
          action: existingPersonType === 'deleted' ? 'REACTIVATE_AND_UPDATE' : 'ADD_ROLE_OR_UPDATE',
          willReplaceRole,
          willAddRole,
          message: existingPersonType === 'deleted'
            ? `La persona ${existingPerson.firstName} ${existingPerson.lastName} è stata eliminata in precedenza. Vuoi riattivare l'account e aggiornare i dati? ${willReplaceRole ? `Il ruolo cambierà da ${existingRoles.join(', ')} a ${roleType}.` : ''}`
            : `La persona ${existingPerson.firstName} ${existingPerson.lastName} esiste già. ${willAddRole ? `Vuoi aggiungere il ruolo ${roleType}?` : 'Vuoi aggiornare i dati?'}`
        });
      }

      // Se forceReactivate=true e esiste una persona, aggiorniamo/riattiviamo
      if (existingPerson && forceReactivate) {
        logger.info('Reactivating/updating existing person', {
          personId: existingPerson.id,
          wasDeleted: existingPersonType === 'deleted',
          newRole: roleType
        });

        // Prepara i dati da aggiornare
        const updateData = {
          ...transformedData,
          deletedAt: null,
          status: 'ACTIVE',
          updatedAt: new Date()
        };

        // Rimuovi campi undefined
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) delete updateData[key];
        });

        // Aggiorna la persona
        const updated = await prisma.person.update({
          where: { id: existingPerson.id },
          data: updateData
        });

        // Gestisci i ruoli
        if (roleType) {
          const existingRole = await prisma.personRole.findFirst({
            where: { personId: existingPerson.id, roleType, deletedAt: null }
          });

          if (!existingRole) {
            // Se il ruolo precedente era diverso e la persona era eliminata, 
            // soft-delete del vecchio ruolo e crea il nuovo
            if (existingPersonType === 'deleted') {
              await prisma.personRole.updateMany({
                where: { personId: existingPerson.id, deletedAt: null },
                data: { deletedAt: new Date(), isActive: false }
              });
            }

            // Crea il nuovo ruolo
            await prisma.personRole.create({
              data: {
                personId: existingPerson.id,
                roleType,
                isActive: true,
                isPrimary: true,
                companyId: finalCompanyId,
                tenantId: finalTenantId
              }
            });
          } else {
            // Riattiva il ruolo esistente se era disattivato
            await prisma.personRole.update({
              where: { id: existingRole.id },
              data: { isActive: true, deletedAt: null }
            });
          }
        }

        // Ritorna la persona aggiornata con i ruoli
        const result = await prisma.person.findUnique({
          where: { id: existingPerson.id },
          include: {
            personRoles: { where: { deletedAt: null } },
            company: true,
            tenant: true
          }
        });

        return res.status(200).json({
          ...result,
          reactivated: existingPersonType === 'deleted',
          message: existingPersonType === 'deleted'
            ? 'Persona riattivata con successo'
            : 'Dati persona aggiornati con successo'
        });
      }

      // Controlli duplicati per nuove persone (non esistenti)
      if (transformedData.username) {
        const existingByUsername = await prisma.person.findFirst({ where: { username: transformedData.username, deletedAt: null } });
        if (existingByUsername) {
          return res.status(409).json({ error: 'Username already in use' });
        }
      }

      const created = await personService.createPerson(
        { ...transformedData },
        roleType,
        finalCompanyId,
        finalTenantId
      );

      res.status(201).json(created);
    } catch (error) {
      logger.error('Error creating person:', { error: error.message });
      const message = (error && error.message) || '';

      // Gestione errori Prisma per constraint violations
      if (message.toLowerCase().includes('unique constraint') || error.code === 'P2002') {
        // Estrai il campo dalla stringa di errore
        const fieldMatch = message.match(/fields: \(`(\w+)`\)/);
        const field = fieldMatch ? fieldMatch[1] : 'unknown';
        return res.status(409).json({
          error: `${field === 'taxCode' ? 'Tax code' : field === 'email' ? 'Email' : field} already in use`,
          code: 'DUPLICATE_FIELD',
          field
        });
      }

      if (message && message.toLowerCase().includes('tenantid is required')) {
        return res.status(400).json({ error: 'TenantId is required' });
      }
      const resp = { error: 'Failed to create person' };
      if (process.env.NODE_ENV !== 'production' && message) {
        resp.details = message;
      }
      res.status(500).json(resp);
    }
  }

  // PUT /api/persons/:id
  async updatePerson(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updated = await personService.updatePerson(id, req.body);
      res.json(updated);
    } catch (error) {
      logger.error('Error updating person:', { error: error.message, id: req.params.id });
      res.status(500).json({ error: 'Failed to update person' });
    }
  }

  // DELETE /api/persons/:id
  async deletePerson(req, res) {
    try {
      const { id } = req.params;
      await personService.deletePerson(id);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting person:', { error: error.message, id: req.params.id });
      res.status(500).json({ error: error.message });
    }
  }

  // POST /api/persons/:id/roles
  async addRole(req, res) {
    try {
      const { id } = req.params;
      const { roleType } = req.body;
      const result = await personService.addRole(id, roleType);
      res.json(result);
    } catch (error) {
      logger.error('Error adding role to person:', { error: error.message, id: req.params.id });
      res.status(500).json({ error: 'Failed to add role to person' });
    }
  }

  // DELETE /api/persons/:id/roles/:roleType
  async removeRole(req, res) {
    try {
      const { id, roleType } = req.params;
      const result = await personService.removeRole(id, roleType);
      res.json(result);
    } catch (error) {
      logger.error('Error removing role from person:', { error: error.message, id: req.params.id, params: req.params });
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/persons
  async getPersons(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        roleType,
        companyId,
        tenantId: queryTenantId,
        sortBy = 'lastLogin',
        sortOrder = 'desc',
        isActive
      } = req.query;

      // Use tenantId from: 1) middleware req.tenantId, 2) person's tenantId, 3) query param
      const effectiveTenantId = req.tenantId || req.person?.tenantId || queryTenantId;

      const options = {
        roleType,
        companyId,
        tenantId: effectiveTenantId, // Pass tenant filter to service
        search,
        sortBy,
        sortOrder,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      if (typeof isActive !== 'undefined') {
        // normalize string boolean to actual boolean
        options.isActive = (isActive === true || isActive === 'true');
      }

      const result = await personService.getPersonsWithPagination(options);

      // Trasforma per frontend
      const transformed = (result.persons || []).map(person => ({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        username: person.username,
        phone: person.phone,
        taxCode: person.taxCode,
        title: person.title, // ✅ Profilo professionale
        companyId: person.companyId, // ✅ Include companyId for schedules
        company: person.company ? {
          id: person.company.id,
          ragioneSociale: person.company.ragioneSociale || person.company.name
        } : undefined,
        siteId: person.siteId, // ✅ Include siteId for employees
        site: person.site ? {
          id: person.site.id,
          siteName: person.site.siteName,
          citta: person.site.citta,
          indirizzo: person.site.indirizzo
        } : undefined,
        personRoles: (person.personRoles || []).map(pr => ({
          id: pr.id,
          roleType: pr.roleType,
          isActive: pr.isActive,
          deletedAt: pr.deletedAt,
          professionalProfile: pr.professionalProfile,
          hiringDate: pr.hiringDate,
          company: pr.company ? {
            id: pr.company.id,
            ragioneSociale: pr.company.ragioneSociale || pr.company.name
          } : undefined,
          assignedAt: pr.assignedAt
        })),
        tenantId: person.tenantId, // ✅ Include tenantId for consistency
        tenantName: person.tenant?.name,
        birthDate: person.birthDate, // ✅ Include birthDate for display
        hiredDate: person.hiredDate, // ✅ Include hiredDate for employees
        position: person.position,
        status: person.status,
        certifications: person.certifications, // ✅ Include certifications for trainers filtering
        specialties: person.specialties, // ✅ Include specialties for trainers
        residenceCity: person.residenceCity, // ✅ Città residenza per trainers
        hourlyRate: person.hourlyRate ? parseFloat(person.hourlyRate.toString()) : null, // ✅ Prezzo/ora per trainers
        createdAt: person.createdAt,
        updatedAt: person.updatedAt
      }));

      res.json({
        success: true,
        persons: transformed,
        data: transformed, // alias retrocompatibile
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        pages: result.totalPages // alias retrocompatibile
      });
    } catch (error) {
      logger.error('Error getting persons:', { error: error.message, query: req.query });
      res.status(500).json({ error: error.message });
    }
  }

  // PUT /api/persons/:id/status
  async togglePersonStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const result = await personService.togglePersonStatus(id, isActive);
      res.json(result);
    } catch (error) {
      logger.error('Error toggling person status:', { error: error.message, id: req.params.id });
      res.status(500).json({ error: 'Failed to toggle status' });
    }
  }

  // POST /api/persons/:id/reset-password
  async resetPersonPassword(req, res) {
    try {
      const { id } = req.params;
      const result = await personService.resetPersonPassword(id);
      res.json(result);
    } catch (error) {
      logger.error('Error resetting person password:', { error: error.message, id: req.params.id });
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/persons/stats
  async getPersonStats(req, res) {
    try {
      const stats = await personService.getPersonStats();
      res.json(stats);
    } catch (error) {
      logger.error('Error getting person stats:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/persons/check-username
  async checkUsernameAvailability(req, res) {
    try {
      const { username } = req.query;

      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }

      const existing = await prisma.person.findFirst({
        where: {
          username: String(username),
          deletedAt: null
        }
      });

      res.json({ available: !existing });
    } catch (error) {
      logger.error('Error checking username availability:', { error: error.message, query: req.query });
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/persons/check-email
  async checkEmailAvailability(req, res) {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const existing = await prisma.person.findFirst({
        where: {
          email: String(email).toLowerCase().trim(),
          deletedAt: null
        }
      });

      res.json({ available: !existing });
    } catch (error) {
      logger.error('Error checking email availability:', { error: error.message, query: req.query });
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/persons/check-taxcode
  async checkTaxCodeAvailability(req, res) {
    try {
      const { taxCode } = req.query;

      if (!taxCode) {
        return res.status(400).json({ error: 'Tax code is required' });
      }

      const existing = await prisma.person.findFirst({
        where: {
          taxCode: String(taxCode).toUpperCase().trim(),
          deletedAt: null
        }
      });

      res.json({ available: !existing });
    } catch (error) {
      logger.error('Error checking tax code availability:', { error: error.message, query: req.query });
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/persons/export
  async exportPersons(req, res) {
    try {
      const { format = 'csv', view: viewQuery, fields, ...filtersFromQuery } = req.query;

      // Determina view effettiva (preferisci entità virtuale se presente)
      const effectiveView = viewQuery || (
        req.virtualEntity?.name === 'TRAINERS' ? 'trainer' :
          req.virtualEntity?.name === 'EMPLOYEES' ? 'employee' :
            'person'
      );

      // Costruisci filtri effettivi partendo dalla query
      const filters = { ...filtersFromQuery };

      // Imposta tenantId di default dall'utente autenticato se non esplicitato
      const tenantIdFromAuth = req.person?.tenantId || req.tenant?.id;
      if (!filters.tenantId && tenantIdFromAuth) {
        filters.tenantId = tenantIdFromAuth;
      }

      // Se invocato da route di entità virtuale, applica roleType coerente se non già passato
      if (!filters.roleType && req.virtualEntity?.name) {
        if (req.virtualEntity.name === 'TRAINERS') filters.roleType = 'TRAINER';
        if (req.virtualEntity.name === 'EMPLOYEES') filters.roleType = 'EMPLOYEE';
      }
      // In assenza di virtual entity, deduci da view
      if (!filters.roleType) {
        if (effectiveView === 'trainer') filters.roleType = 'TRAINER';
        else if (effectiveView === 'employee') filters.roleType = 'EMPLOYEE';
      }

      // Mappa view -> resource per controllo permessi
      const resource = (effectiveView === 'employee') ? 'employees' : (effectiveView === 'trainer') ? 'trainers' : 'persons';
      const requestedFields = typeof fields === 'string' && fields.length > 0
        ? fields.split(',').map(f => f.trim()).filter(Boolean)
        : undefined;

      // Permessi sull'export (azione read sulla risorsa)
      const permission = await advancedPermissionService.checkPermission({
        personId: req.person.id,
        resource,
        action: 'read',
        targetCompanyId: filters?.companyId,
        requestedFields
      });

      if (!permission.allowed) {
        return res.status(403).json({ error: 'Permission denied', code: 'PERMISSION_DENIED', reason: permission.reason });
      }

      // Determina globalRole dell'utente corrente per i default fields
      const me = await prisma.person.findUnique({
        where: { id: req.person.id },
        select: {
          globalRole: true,
          personRoles: { where: { isActive: true }, select: { roleType: true } }
        }
      });

      let globalRole = me?.globalRole || null;
      const roles = (me?.personRoles || []).map(r => r.roleType);
      if (!globalRole) {
        if (roles.includes('SUPER_ADMIN')) globalRole = 'SUPER_ADMIN';
        else if (roles.includes('ADMIN')) globalRole = 'ADMIN';
        else if (roles.includes('COMPANY_ADMIN')) globalRole = 'COMPANY_ADMIN';
        else if (roles.includes('MANAGER')) globalRole = 'MANAGER';
        else if (roles.includes('EMPLOYEE')) globalRole = 'EMPLOYEE';
      }

      const defaultFields = advancedPermissionService.getDefaultFieldsForRole(globalRole || 'EMPLOYEE', resource) || [];

      // Calcola allowedFields da passare all'export
      let allowedFields;
      if (permission.allowedFields && permission.allowedFields.includes('*')) {
        allowedFields = requestedFields || (defaultFields.length ? defaultFields : ['*']);
      } else if (permission.allowedFields && permission.allowedFields.length > 0) {
        allowedFields = advancedPermissionService.filterAllowedFields(requestedFields, permission.allowedFields);
      } else {
        allowedFields = defaultFields && defaultFields.length ? defaultFields : (requestedFields || ['*']);
      }

      const options = { view: effectiveView, allowedFields };

      if (format === 'json') {
        const data = await personService.exportPersonsToJSON(filters, options);
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(data);
      }

      const csv = await personService.exportPersonsToCSV(filters, options);
      res.setHeader('Content-Type', 'text/csv');
      const fileView = effectiveView ? `_${effectiveView}` : '';
      res.setHeader('Content-Disposition', `attachment; filename="persons_export${fileView}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      logger.error('Error exporting persons:', { error: error.message, query: req.query });
      return res.status(500).json({ error: error.message });
    }
  }

  // POST /api/persons/import
  async importPersons(req, res) {
    try {
      const contentType = req.headers['content-type'] || '';
      const isJson = contentType.includes('application/json');
      const { mode = 'csv' } = req.query;

      // Path JSON: accetta sia mode=json sia Content-Type JSON o presenza di body.persons
      if (mode === 'json' || isJson || Array.isArray(req.body?.persons) || Array.isArray(req.body)) {
        // Normalizza payload in array
        let personsPayload = [];
        if (Array.isArray(req.body?.persons)) {
          personsPayload = req.body.persons;
        } else if (req.body?.persons && typeof req.body.persons === 'object') {
          personsPayload = [req.body.persons];
        } else if (Array.isArray(req.body)) {
          personsPayload = req.body;
        } else if (req.body && typeof req.body === 'object') {
          personsPayload = [req.body];
        }
        if (!personsPayload || personsPayload.length === 0) {
          return res.status(400).json({ error: 'JSON payload vuoto: fornire almeno una persona' });
        }

        const options = {
          overwriteIds: Array.isArray(req.body?.overwriteIds) ? req.body.overwriteIds : [],
          defaultTenantId: req.headers['x-tenant-id'] || req.body?.defaultTenantId || req.body?.tenantId || null,
          defaultCompanyId: req.body?.defaultCompanyId || null,
          updateExisting: Array.isArray(req.body?.overwriteIds) && req.body.overwriteIds.length > 0,
          skipDuplicates: false
        };

        const result = await personService.importPersonsFromJSON(personsPayload, options);
        return res.json({
          success: true,
          imported: result.imported || 0,
          updated: result.updated || 0,
          skipped: result.skipped || 0,
          errors: result.errors || []
        });
      }

      // Path CSV (predefinito)
      if (!req.file) {
        return res.status(400).json({ error: 'CSV file is required' });
      }
      const csvContent = req.file?.buffer ? req.file.buffer.toString('utf-8') : '';
      if (!csvContent) {
        return res.status(400).json({ error: 'CSV file is empty' });
      }

      const result = await personService.importPersonsFromCSV(csvContent, {
        defaultTenantId: req.headers['x-tenant-id'] || null,
        defaultCompanyId: req.body?.defaultCompanyId || null,
        skipDuplicates: false
      });
      res.json({
        success: true,
        imported: result.imported || 0,
        skipped: result.skipped || 0,
        errors: result.errors || []
      });
    } catch (error) {
      logger.error('Error importing persons:', { error: error.message, query: req.query });
      res.status(500).json({ error: error.message });
    }
  }

  // DELETE /api/persons/bulk
  async deleteMultiplePersons(req, res) {
    try {
      const { personIds } = req.body;
      const result = await personService.deleteMultiplePersons(personIds);
      res.json({
        success: true,
        deleted: result.deleted || 0,
        errors: result.errors || []
      });
    } catch (error) {
      logger.error('Error deleting multiple persons:', { error: error.message });
      return res.status(500).json({ error: error.message });
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