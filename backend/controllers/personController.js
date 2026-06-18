import { validationResult } from 'express-validator';
import personService from '../services/personService.js';
import PersonRoleQueryService from '../services/person/PersonRoleQueryService.js';
import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import AdvancedPermissionService from '../services/advanced-permission.js';
import { personTenantAccessService } from '../services/PersonTenantAccessService.js';
import { isTrainerOnlyAccess, getTrainerEnrolledPersonIds } from '../utils/trainerAccess.js';
import { seedDefaultPermissions } from '../services/enhancedRole/utils/PermissionSeeder.js';

const advancedPermissionService = new AdvancedPermissionService();

/**
 * P48: Helper per estrarre i campi tenant-specific da tenantProfiles
 * Cerca il profilo primario (isPrimary=true) o il primo disponibile
 * @param {Object} person - Oggetto Person con tenantProfiles inclusi
 * @param {string} targetTenantId - ID tenant specifico per filtrare (opzionale)
 * @returns {Object} Oggetto person con campi flattened da tenantProfiles
 */
function flattenPersonWithProfile(person, targetTenantId = null) {
  if (!person) return null;

  // Trova il profilo per il tenant specificato, o il primario, o il primo disponibile
  let profile = null;
  const profiles = person.tenantProfiles || [];

  if (targetTenantId) {
    profile = profiles.find(p => p.tenantId === targetTenantId && !p.deletedAt);
  }
  if (!profile) {
    profile = profiles.find(p => p.isPrimary && !p.deletedAt);
  }
  if (!profile) {
    profile = profiles.find(p => !p.deletedAt);
  }
  profile = profile || {};

  // P63: companyTenantProfileId può essere in tenantProfiles O in personRoles
  // Fallback su personRoles per dati legacy pre-P48/P49
  const activeRole = person.personRoles?.find(r => r.isActive);
  const companyTenantProfileId = profile.companyTenantProfileId
    || activeRole?.companyTenantProfileId
    || null;

  // Restituisce person con campi tenant-specific estratti da profile
  return {
    ...person,
    // Campi tenant-specific da PersonTenantProfile
    email: profile.email || null,
    phone: profile.phone || null,
    pec: profile.pec || null,
    status: profile.status || 'PENDING',
    residenceAddress: profile.residenceAddress || null,
    residenceCity: profile.residenceCity || null,
    postalCode: profile.postalCode || null,
    province: profile.province || null,
    title: profile.title || null,
    hiredDate: profile.hiredDate || null,
    endDate: profile.endDate || null,
    hourlyRate: profile.hourlyRate || null,
    monthlyRate: profile.monthlyRate || null,
    iban: profile.iban || null,
    registerCode: profile.registerCode || null,
    registerCode2: profile.registerCode2 || null,
    specialties: profile.specialties || null,
    certifications: profile.certifications || null,
    shortDescription: profile.shortDescription || null,
    fullDescription: profile.fullDescription || null,
    notes: profile.notes || null,
    preferences: profile.preferences || null,
    companyTenantProfileId: companyTenantProfileId,
    companyId: companyTenantProfileId, // P63: alias per backward compatibility frontend
    siteId: profile.siteId || null,
    repartoId: profile.repartoId || null,
    // Relazioni da profile se presenti
    // P49: ragioneSociale è su Company (padre di CompanyTenantProfile)
    company: profile.companyTenantProfile?.company
      || profile.company
      || person.company
      || null,
    site: profile.site || person.site || null,
    // P63: tenantId viene SOLO da PersonTenantProfile (Person.tenantId rimosso)
    tenantId: profile.tenantId || null
  };
}

class PersonController {
  // GET /api/persons/employees (multi-tenant support)
  async getEmployees(req, res) {
    try {
      const { companyId, tenantId, limit, offset, tenantIds, allTenants, corsoCategoria, corsoPeriodoStart, corsoPeriodoEnd } = req.query;
      const personId = req.person?.id;
      // P48: globalRole deprecated, use roles from middleware
      const roles = req.person?.roles || [];
      const primaryRole = roles[0] || null;

      logger.info('Getting employees with multi-tenant support', {
        companyId,
        tenantId,
        limit,
        offset,
        personId,
        tenantIds,
        allTenants
      });

      // Get accessible tenants for multi-tenant filtering
      const accessibleTenants = await personTenantAccessService.getAccessibleTenants(personId, primaryRole);
      const accessibleTenantIds = accessibleTenants.map(t => t.id);

      // Determine tenant filter
      let tenantFilter = {};
      if (tenantIds) {
        const requestedIds = tenantIds.split(',').map(id => id.trim());
        const allowedIds = accessibleTenantIds.length > 0
          ? requestedIds.filter(id => accessibleTenantIds.includes(id))
          : requestedIds;

        if (allowedIds.length > 0) {
          tenantFilter = allowedIds.length === 1
            ? { tenantId: allowedIds[0] }
            : { tenantId: { in: allowedIds } };
        } else {
          tenantFilter = { tenantId: tenantId || req.person?.tenantId };
        }
      } else if (allTenants === 'true' && accessibleTenantIds.length > 0) {
        tenantFilter = { tenantId: { in: accessibleTenantIds } };
      } else if (tenantId || req.person?.tenantId) {
        tenantFilter = { tenantId: tenantId || req.person?.tenantId };
      }

      // P48/P49: Query con tenantProfiles per i campi dinamici
      // Frontend passa companyId che è alias per companyTenantProfileId (P49 pattern)
      const targetTenantId = tenantId || req.person?.tenantId;
      const targetCompanyTenantProfileId = companyId || req.person?.companyTenantProfileId;

      const queryOptions = {
        where: {
          deletedAt: null,
          ...tenantFilter,
          // P48: status è in tenantProfiles
          tenantProfiles: {
            some: {
              status: 'ACTIVE',
              deletedAt: null,
              isActive: true,
              ...(targetCompanyTenantProfileId ? { companyTenantProfileId: targetCompanyTenantProfileId } : {})
            }
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          taxCode: true,
          birthDate: true,
          tenantId: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          // P48: Include tenantProfiles per campi dinamici
          tenantProfiles: {
            where: {
              tenantId: targetTenantId,
              deletedAt: null,
              isActive: true
            },
            select: {
              email: true,
              phone: true,
              title: true,
              status: true,
              hiredDate: true,
              companyTenantProfileId: true,
              siteId: true,
              site: {
                select: { id: true, siteName: true, citta: true }
              }
            },
            take: 1
          },
          // Mansioni attive del lavoratore
          mansioni: {
            where: { isAttiva: true, deletedAt: null, tenantId: targetTenantId },
            select: {
              id: true,
              mansioneId: true,
              isPrimaria: true,
              mansione: { select: { denominazione: true, codice: true } }
            }
          },
          // P48: Include personRoles per ruoli
          personRoles: {
            where: { isActive: true },
            select: { roleType: true }
          }
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

      // Filtro corsi: filtra dipendenti per categoria corso e/o periodo
      if (corsoCategoria || corsoPeriodoStart || corsoPeriodoEnd) {
        if (!queryOptions.where.AND) queryOptions.where.AND = [];
        const enrollmentFilter = { deletedAt: null };
        const scheduleFilter = {};
        if (corsoCategoria) scheduleFilter.course = { category: corsoCategoria };
        if (corsoPeriodoStart || corsoPeriodoEnd) {
          const dateFilter = {};
          if (corsoPeriodoStart) dateFilter.gte = new Date(corsoPeriodoStart);
          if (corsoPeriodoEnd) {
            const end = new Date(corsoPeriodoEnd);
            end.setHours(23, 59, 59, 999);
            dateFilter.lte = end;
          }
          scheduleFilter.startDate = dateFilter;
        }
        if (Object.keys(scheduleFilter).length > 0) enrollmentFilter.schedule = scheduleFilter;
        queryOptions.where.AND.push({ courseEnrollments: { some: enrollmentFilter } });
      }

      // TRAINER-only: restrict visible employees to those enrolled in the trainer's schedules
      const trainerTenantId = tenantId || req.person?.tenantId;
      if (trainerTenantId && await isTrainerOnlyAccess(req.person.id, trainerTenantId)) {
        const enrolledPersonIds = await getTrainerEnrolledPersonIds(req.person.id, trainerTenantId);
        queryOptions.where.id = { in: enrolledPersonIds };
      }

      const employeesRaw = await prisma.person.findMany(queryOptions);

      // P48: Flatten tenantProfiles per backward compatibility
      const employees = employeesRaw.map(p => {
        const profile = p.tenantProfiles?.[0] || {};
        const roles = p.personRoles?.map(r => r.roleType) || [];
        return {
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          taxCode: p.taxCode,
          birthDate: p.birthDate,
          tenantId: p.tenantId,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          deletedAt: p.deletedAt,
          // From tenantProfiles
          email: profile.email || null,
          phone: profile.phone || null,
          title: profile.title || null,
          status: profile.status || 'PENDING',
          hiredDate: profile.hiredDate || null,
          companyTenantProfileId: profile.companyTenantProfileId || null,
          siteId: profile.siteId || null,
          site: profile.site ? {
            id: profile.site.id,
            name: profile.site.siteName,
            siteName: profile.site.siteName,
            citta: profile.site.citta
          } : null,
          // Mansioni attive
          mansioni: (p.mansioni || []).map(lm => ({
            id: lm.id,
            mansioneId: lm.mansioneId,
            denominazione: lm.mansione?.denominazione || null,
            codice: lm.mansione?.codice || null,
            isPrimaria: lm.isPrimaria
          })),
          // From personRoles
          globalRole: roles[0] || null,
          roles: roles
        };
      });

      // Fallback sede: per dipendenti senza sede assegnata, cerca se l'azienda ha una sola sede
      const profileIdsWithoutSite = employees
        .filter(e => !e.siteId && e.companyTenantProfileId)
        .map(e => e.companyTenantProfileId)
        .filter(Boolean);
      const uniqueProfileIds = [...new Set(profileIdsWithoutSite)];
      const companySitesFallback = new Map();
      if (uniqueProfileIds.length > 0) {
        const allSites = await prisma.companySite.findMany({
          where: { companyTenantProfileId: { in: uniqueProfileIds }, deletedAt: null },
          select: { id: true, siteName: true, companyTenantProfileId: true }
        });
        for (const site of allSites) {
          const existing = companySitesFallback.get(site.companyTenantProfileId) || [];
          existing.push(site);
          companySitesFallback.set(site.companyTenantProfileId, existing);
        }
      }
      const employeesWithSite = employees.map(e => {
        if (!e.siteId && e.companyTenantProfileId) {
          const sites = companySitesFallback.get(e.companyTenantProfileId) || [];
          if (sites.length === 1) {
            return { ...e, fallbackSite: { id: sites[0].id, siteName: sites[0].siteName } };
          }
        }
        return e;
      });

      // Applica field-level filtering basato sui permessi, mantenendo la struttura di risposta
      const enhancedRoleService = (await import('../services/enhancedRoleService.js')).default;
      const filteredEmployees = await enhancedRoleService.filterDataByPermissions(
        personId,
        'employees',
        'view',
        employeesWithSite,
        req.person?.tenantId || tenantId
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
        error: 'Impossibile recuperare i dipendenti'
      });
    }
  }

  // GET /api/persons/trainers
  async getTrainers(req, res) {
    try {
      const { companyTenantProfileId, search, ...filters } = req.query;
      const personId = req.person.id;
      // P57: Usa getEffectiveTenantId per supportare cross-tenant admin access
      const tenantId = getEffectiveTenantId(req);

      const queryFilters = {};
      if (companyTenantProfileId) queryFilters.companyTenantProfileId = companyTenantProfileId;
      if (tenantId) queryFilters.tenantId = tenantId;

      let trainers;
      if (search) {
        trainers = await personService.searchPersons(search, 'TRAINER', queryFilters);
      } else {
        // Includi tutti i ruoli trainer (TRAINER, SENIOR_TRAINER, TRAINER_COORDINATOR, EXTERNAL_TRAINER)
        trainers = await PersonRoleQueryService.getPersonsByMultipleRoles(
          ['TRAINER', 'SENIOR_TRAINER', 'TRAINER_COORDINATOR', 'EXTERNAL_TRAINER'],
          queryFilters
        );
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

      // P48: Flatten tenant-specific fields from tenantProfiles
      const transformedTrainers = (filteredTrainers || []).map(rawPerson => {
        const person = flattenPersonWithProfile(rawPerson, tenantId);
        return {
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
        };
      });

      res.json(transformedTrainers);
    } catch (error) {
      logger.error('Error getting trainers:', { error: 'Errore interno del server' });
      res.status(500).json({ error: 'Errore interno del server' });
    }
  }

  // GET /api/persons/users
  async getSystemUsers(req, res) {
    try {
      const { companyTenantProfileId, search, ...filters } = req.query;
      const personId = req.person.id;
      // P57: Usa getEffectiveTenantId per supportare cross-tenant admin access
      const tenantId = getEffectiveTenantId(req);

      const queryFilters = {};
      if (companyTenantProfileId) queryFilters.companyTenantProfileId = companyTenantProfileId;
      if (tenantId) queryFilters.tenantId = tenantId;

      let users;
      if (search) {
        users = await personService.searchPersons(search, ['ADMIN', 'COMPANY_ADMIN', 'MANAGER'], queryFilters);
      } else {
        // Includi tutti i ruoli admin/sistema validi
        users = await PersonRoleQueryService.getPersonsByMultipleRoles(
          ['ADMIN', 'COMPANY_ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'],
          queryFilters
        );
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

      // P48: Flatten tenant-specific fields from tenantProfiles
      const transformedUsers = (filteredUsers || []).map(rawPerson => {
        const person = flattenPersonWithProfile(rawPerson, tenantId);
        return {
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
          companyTenantProfileId: person.companyTenantProfileId,
          tenantId: person.tenantId,
          createdAt: person.createdAt,
          updatedAt: person.updatedAt
        };
      });

      res.json(transformedUsers);
    } catch (error) {
      logger.error('Error getting system persons:', { error: 'Errore interno del server' });
      res.status(500).json({ error: 'Errore interno del server' });
    }
  }

  // GET /api/persons/:id
  async getPersonById(req, res) {
    try {
      const { id } = req.params;
      const { view, fields } = req.query || {};
      const person = await personService.getPersonById(id);

      if (!person) {
        return res.status(404).json({ error: 'Persona non trovata' });
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
          targetCompanyId: target?.companyTenantProfileId,
          requestedFields
        });

        if (!permission.allowed) {
          return res.status(403).json({ error: 'Permesso negato', code: 'PERMISSION_DENIED' });
        }

        // Determina globalRole dell'utente corrente (calcolato da personRoles)
        const me = await prisma.person.findFirst({ // F234: findFirst+deletedAt
          where: { id: req.person.id, deletedAt: null },
          select: {
            personRoles: { where: { isActive: true, deletedAt: null }, select: { roleType: true } }
          }
        });

        // globalRole calcolato da personRoles (il campo globalRole non esiste nel modello)
        let globalRole = null;
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
          targetCompanyId: target?.companyTenantProfileId,
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
      res.status(500).json({ error: 'Errore interno del server' });
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
        targetCompanyId: target?.companyTenantProfileId,
        requestedFields
      });

      if (!readPermission.allowed) {
        return res.status(403).json({ error: 'Permesso negato', code: 'PERMISSION_DENIED', reason: readPermission.reason });
      }

      // Determina globalRole dell'utente corrente (calcolato da personRoles)
      const me = await prisma.person.findFirst({ // F234: findFirst+deletedAt
        where: { id: req.person.id, deletedAt: null },
        select: {
          personRoles: { where: { isActive: true, deletedAt: null }, select: { roleType: true } }
        }
      });

      // globalRole calcolato da personRoles (il campo globalRole non esiste nel modello)
      let globalRole = null;
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
        targetCompanyId: target?.companyTenantProfileId,
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
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }

  // POST /api/persons
  async createPerson(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { roleType, companyId, tenantId, companyTenantProfileId, siteId, ...personData } = req.body;

      // F308: Block PROTECTED_ROLES from being assigned without SUPER_ADMIN or ADMIN caller
      const PROTECTED_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN'];
      if (roleType && PROTECTED_ROLES.includes(roleType)) {
        const requesterRoles = req.person?.roles || [];
        const requesterGlobalRole = req.person?.globalRole;
        const isPrivileged = requesterRoles.includes('SUPER_ADMIN') || requesterRoles.includes('ADMIN') ||
          requesterGlobalRole === 'SUPER_ADMIN' || requesterGlobalRole === 'ADMIN';
        if (!isPrivileged) {
          return res.status(403).json({
            error: 'Permessi insufficienti per assegnare un ruolo protetto',
            code: 'PROTECTED_ROLE_FORBIDDEN'
          });
        }
      }

      // P59/F87: Use getEffectiveTenantId for proper role-validated cross-tenant resolution
      // Priority: body tenantId (explicit) → JWT/header via getEffectiveTenantId (with ADMIN role check)
      const finalTenantId = tenantId || getEffectiveTenantId(req);
      const finalCompanyTenantProfileId = companyTenantProfileId || companyId || req.person?.companyTenantProfileId;

      // Debug log per tenant resolution
      logger.debug('createPerson: tenant resolution', {
        bodyTenantId: tenantId,
        personTenantId: req.person?.tenantId,
        finalTenantId
      });

      // Verifica che tenantId sia presente
      if (!finalTenantId) {
        return res.status(400).json({
          error: 'TenantId è obbligatorio. Fornire tenantId nel body della richiesta o assicurarsi che l\'utente abbia un tenant valido.'
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
        birthPlace: personData.birthPlace || personData.birth_place,
        birthProvince: personData.birthProvince || personData.birth_province,
        gender: personData.gender,
        etnia: personData.etnia,
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
        siteId: siteId || personData.siteId,
        repartoId: personData.repartoId,
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
            },
            // P48: Include TUTTI i tenantProfiles attivi per rilevare same-tenant vs cross-tenant
            tenantProfiles: {
              where: { deletedAt: null, isActive: true }
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

        // P48: Estrai email dal profilo del tenant corrente (se presente) o dal primo profilo
        const profileInTargetTenant = finalTenantId
          ? existingPerson.tenantProfiles.find(p => p.tenantId === finalTenantId)
          : null;
        const existingProfile = profileInTargetTenant || existingPerson.tenantProfiles[0] || {};

        // Determina se la persona è già in questo tenant
        const isSameTenant = !!profileInTargetTenant;

        // Verifica se il ruolo è già assegnato in questo tenant
        const existingRolesInTargetTenant = finalTenantId
          ? existingPerson.personRoles.filter(r => r.tenantId === finalTenantId).map(r => r.roleType)
          : existingRoles;
        const roleAlreadyExistsInTenant = roleType && existingRolesInTargetTenant.includes(roleType);

        // Se il ruolo è già attivo in questo tenant, è un errore definitivo (non serve conferma)
        if (roleAlreadyExistsInTenant && existingPersonType === 'active') {
          return res.status(409).json({
            error: `La persona ${existingPerson.firstName} ${existingPerson.lastName} ha già il ruolo ${roleType} in questa organizzazione.`,
            code: 'ROLE_EXISTS_IN_TENANT',
            existingPerson: {
              id: existingPerson.id,
              firstName: existingPerson.firstName,
              lastName: existingPerson.lastName,
              email: existingProfile.email || null,
              taxCode: existingPerson.taxCode,
              status: existingPersonType,
              currentRoles: existingRoles
            }
          });
        }

        // Determina l'action corretta per il frontend
        let action;
        if (existingPersonType === 'deleted') {
          action = 'REACTIVATE_AND_UPDATE';
        } else if (isSameTenant) {
          action = 'ADD_ROLE_SAME_TENANT';
        } else {
          action = 'ADD_ROLE_NEW_TENANT';
        }

        if (existingPersonType === 'active' && roleType && ['ADD_ROLE_SAME_TENANT', 'ADD_ROLE_NEW_TENANT'].includes(action)) {
          const globalConflicts = ['firstName', 'lastName', 'birthDate', 'birthPlace', 'birthProvince', 'gender']
            .map(field => {
              const incoming = transformedData[field];
              const current = existingPerson[field];
              if (incoming === undefined || incoming === null || incoming === '') return null;
              if (current === undefined || current === null || current === '') return null;
              const incomingValue = incoming instanceof Date ? incoming.toISOString().slice(0, 10) : String(incoming).trim();
              const currentValue = current instanceof Date ? current.toISOString().slice(0, 10) : String(current).trim();
              return incomingValue !== currentValue ? { field, current: currentValue, incoming: incomingValue } : null;
            })
            .filter(Boolean);

          if (!isSameTenant && globalConflicts.length > 0) {
            return res.status(409).json({
              error: 'La persona esiste già in un altro tenant con dati anagrafici diversi. Confermare quali dati globali sono corretti prima di collegarla.',
              code: 'PERSON_GLOBAL_DATA_CONFLICT',
              existingPerson: {
                id: existingPerson.id,
                firstName: existingPerson.firstName,
                lastName: existingPerson.lastName,
                taxCode: existingPerson.taxCode,
                currentRoles: existingRoles
              },
              conflicts: globalConflicts,
              newRoleType: roleType,
              action
            });
          }

          const tenantProfileFields = {
            email: transformedData.email,
            phone: transformedData.phone,
            residenceAddress: transformedData.residenceAddress,
            residenceCity: transformedData.residenceCity,
            postalCode: transformedData.postalCode,
            province: transformedData.province,
            title: transformedData.title,
            hiredDate: transformedData.hiredDate,
            hourlyRate: transformedData.hourlyRate,
            iban: transformedData.iban,
            registerCode: transformedData.registerCode,
            certifications: transformedData.certifications,
            specialties: transformedData.specialties,
            status: transformedData.status || 'ACTIVE',
            companyTenantProfileId: finalCompanyTenantProfileId || null,
            siteId: siteId || null,
            repartoId: personData.repartoId || null
          };
          Object.keys(tenantProfileFields).forEach(key => {
            if (tenantProfileFields[key] === undefined) delete tenantProfileFields[key];
          });

          await prisma.$transaction(async (tx) => {
            const targetProfile = await tx.personTenantProfile.findFirst({
              where: { personId: existingPerson.id, tenantId: finalTenantId, deletedAt: null }
            });
            if (targetProfile) {
              await tx.personTenantProfile.update({
                where: { id: targetProfile.id },
                data: { ...tenantProfileFields, isActive: true, updatedAt: new Date() }
              });
            } else {
              await tx.personTenantProfile.create({
                data: {
                  personId: existingPerson.id,
                  tenantId: finalTenantId,
                  isActive: true,
                  isPrimary: false,
                  ...tenantProfileFields
                }
              });
            }
            const existingRoleAny = await tx.personRole.findFirst({
              where: {
                personId: existingPerson.id,
                roleType,
                customRoleId: null,
                companyTenantProfileId: finalCompanyTenantProfileId || null,
                tenantId: finalTenantId
              }
            });
            if (existingRoleAny) {
              await tx.personRole.update({
                where: { id: existingRoleAny.id },
                data: { isActive: true, deletedAt: null, updatedAt: new Date() }
              });
            } else {
              const mergedRole = await tx.personRole.create({
                data: {
                  personId: existingPerson.id,
                  roleType,
                  isActive: true,
                  isPrimary: false,
                  companyTenantProfileId: finalCompanyTenantProfileId || null,
                  tenantId: finalTenantId,
                  assignedBy: req.person?.id || null
                }
              });
              await seedDefaultPermissions(mergedRole.id, roleType, tx);
            }
          });

          const mergedPerson = await prisma.person.findFirst({
            where: { id: existingPerson.id, deletedAt: null },
            include: {
              personRoles: { where: { deletedAt: null }, include: { companyTenantProfile: true } },
              tenantProfiles: { where: { deletedAt: null }, include: { companyTenantProfile: true, tenant: true } }
            }
          });

          return res.status(200).json({
            ...mergedPerson,
            mergedRole: true,
            action,
            message: isSameTenant
              ? `Ruolo ${roleType} aggiunto alla persona già presente in questa organizzazione.`
              : `Nuovo profilo tenant creato e ruolo ${roleType} aggiunto alla persona esistente.`
          });
        }

        return res.status(409).json({
          error: existingPersonType === 'deleted'
            ? 'Persona già esistente nel sistema (eliminata). Confermare per riattivare e aggiornare i dati.'
            : 'Persona già esistente nel sistema.',
          code: 'PERSON_EXISTS',
          existingPerson: {
            id: existingPerson.id,
            firstName: existingPerson.firstName,
            lastName: existingPerson.lastName,
            email: existingProfile.email || null,
            taxCode: existingPerson.taxCode,
            status: existingPersonType,
            deletedAt: existingPerson.deletedAt,
            currentRoles: existingRoles
          },
          newRoleType: roleType,
          action,
          isSameTenant,
          willReplaceRole,
          willAddRole,
          message: existingPersonType === 'deleted'
            ? `La persona ${existingPerson.firstName} ${existingPerson.lastName} è stata eliminata in precedenza. Vuoi riattivare l'account e aggiornare i dati? ${willReplaceRole ? `Il ruolo cambierà da ${existingRoles.join(', ')} a ${roleType}.` : ''}`
            : isSameTenant
              ? `La persona ${existingPerson.firstName} ${existingPerson.lastName} esiste già in questa organizzazione. ${willAddRole ? `Vuoi aggiungere il ruolo ${roleType}?` : 'Vuoi aggiornare i dati?'}`
              : `La persona ${existingPerson.firstName} ${existingPerson.lastName} esiste già in un'altra organizzazione. ${willAddRole ? `Vuoi creare un accesso con il ruolo ${roleType} in questa organizzazione?` : 'Vuoi creare un profilo in questa organizzazione?'}`
        });
      }

      // Se forceReactivate=true e esiste una persona, aggiorniamo/riattiviamo
      if (existingPerson && forceReactivate) {
        logger.info('Reactivating/updating existing person', {
          personId: existingPerson.id,
          wasDeleted: existingPersonType === 'deleted',
          newRole: roleType
        });

        // P48/P63: Separa i campi Person dai campi PersonTenantProfile
        // Campi che appartengono a Person (anagrafica globale)
        const personFields = {
          firstName: transformedData.firstName,
          lastName: transformedData.lastName,
          taxCode: transformedData.taxCode,
          birthDate: transformedData.birthDate,
          vatNumber: transformedData.vatNumber,
          username: transformedData.username,
          password: transformedData.password,
          globalRole: transformedData.globalRole,
          deletedAt: null,
          updatedAt: new Date()
        };

        // Campi che appartengono a PersonTenantProfile (specifici per tenant)
        const tenantProfileFields = {
          email: transformedData.email,
          phone: transformedData.phone,
          residenceAddress: transformedData.residenceAddress,
          residenceCity: transformedData.residenceCity,
          postalCode: transformedData.postalCode,
          province: transformedData.province,
          title: transformedData.title,
          hiredDate: transformedData.hiredDate,
          hourlyRate: transformedData.hourlyRate,
          iban: transformedData.iban,
          registerCode: transformedData.registerCode,
          certifications: transformedData.certifications,
          specialties: transformedData.specialties,
          status: transformedData.status || 'ACTIVE'
        };

        // Rimuovi campi undefined da personFields
        Object.keys(personFields).forEach(key => {
          if (personFields[key] === undefined) delete personFields[key];
        });

        // Rimuovi campi undefined da tenantProfileFields
        Object.keys(tenantProfileFields).forEach(key => {
          if (tenantProfileFields[key] === undefined) delete tenantProfileFields[key];
        });

        // Aggiorna la persona con solo i campi Person
        const updated = await prisma.person.update({
          where: { id: existingPerson.id },
          data: personFields
        });

        // P48: Aggiorna o crea PersonTenantProfile per questo tenant
        if (Object.keys(tenantProfileFields).length > 0) {
          const existingProfile = await prisma.personTenantProfile.findFirst({
            where: {
              personId: existingPerson.id,
              tenantId: finalTenantId,
              deletedAt: null
            }
          });

          if (existingProfile) {
            // Aggiorna il profilo esistente
            await prisma.personTenantProfile.update({
              where: { id: existingProfile.id },
              data: {
                ...tenantProfileFields,
                isActive: true,
                updatedAt: new Date()
              }
            });
          } else {
            // Crea un nuovo profilo per questo tenant
            await prisma.personTenantProfile.create({
              data: {
                personId: existingPerson.id,
                tenantId: finalTenantId,
                companyTenantProfileId: finalCompanyTenantProfileId,
                ...tenantProfileFields,
                isActive: true
              }
            });
          }
        }

        // Gestisci i ruoli
        if (roleType) {
          // F298: tenantId obbligatorio per evitare IDOR cross-tenant nel branch forceReactivate
          const existingRole = await prisma.personRole.findFirst({
            where: { personId: existingPerson.id, roleType, tenantId: finalTenantId, deletedAt: null }
          });

          if (!existingRole) {
            // Se il ruolo precedente era diverso e la persona era eliminata, 
            // soft-delete del vecchio ruolo e crea il nuovo
            if (existingPersonType === 'deleted') {
              // F316: tenantId obbligatorio — evita soft-delete cross-tenant di ruoli
              await prisma.personRole.updateMany({
                where: { personId: existingPerson.id, tenantId: finalTenantId, deletedAt: null },
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
                companyTenantProfileId: finalCompanyTenantProfileId,
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

        // P48/GDPR: Se cross-tenant e ruolo PAZIENTE, crea PersonDataShareConsent
        // Il tenant di destinazione (finalTenantId) ha bisogno di accedere ai dati della persona
        const profileInTargetTenant = existingPerson.tenantProfiles.find(p => p.tenantId === finalTenantId);
        const isCrossTenant = !profileInTargetTenant && existingPersonType !== 'deleted';
        if (isCrossTenant && roleType === 'PAZIENTE') {
          const sourceTenantProfile = existingPerson.tenantProfiles.find(p => p.tenantId !== finalTenantId);
          if (sourceTenantProfile) {
            await prisma.personDataShareConsent.upsert({
              where: {
                personId_sourceTenantId_targetTenantId: {
                  personId: existingPerson.id,
                  sourceTenantId: sourceTenantProfile.tenantId,
                  targetTenantId: finalTenantId
                }
              },
              create: {
                personId: existingPerson.id,
                sourceTenantId: sourceTenantProfile.tenantId,
                targetTenantId: finalTenantId,
                sharedDataTypes: ['MEDICAL_VISITS', 'MEDICAL_HISTORY'],
                excludedFields: [],
                consentGiven: false,
                approvalStatus: 'PENDING',
                requestedBy: req.person?.id || null,
                requestedAt: new Date(),
                legalBasis: 'LEGITIMATE_INTEREST'
              },
              update: {
                approvalStatus: 'PENDING',
                isRevoked: false,
                revokedAt: null,
                revokedReason: null,
                updatedAt: new Date()
              }
            });

            await prisma.gdprAuditLog.create({
              data: {
                personId: existingPerson.id,
                action: 'CROSS_TENANT_CONSENT_REQUEST',
                resourceType: 'PERSON_DATA_SHARE_CONSENT',
                resourceId: existingPerson.id,
                dataAccessed: {
                  sourceTenantId: sourceTenantProfile.tenantId,
                  targetTenantId: finalTenantId,
                  roleType,
                  performedBy: req.person?.id
                }
              }
            });
          }
        }

        // Ritorna la persona aggiornata con i ruoli (P48/P49: company è in tenantProfiles via companyTenantProfile)
        const result = await prisma.person.findFirst({ // F234: findFirst+deletedAt
          where: { id: existingPerson.id, deletedAt: null },
          include: {
            personRoles: {
              where: { deletedAt: null },
              include: { companyTenantProfile: true } // P49
            },
            tenantProfiles: {
              where: { deletedAt: null },
              include: {
                companyTenantProfile: true, // P49: company -> companyTenantProfile
                tenant: true // P63: tenant relazione su PersonTenantProfile, NON su Person
              }
            }
            // P63: Person.Tenant RIMOSSO - usa tenantProfiles.tenant
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
          return res.status(409).json({ error: 'Username già in uso' });
        }
      }

      const created = await personService.createPerson(
        { ...transformedData },
        roleType,
        finalCompanyTenantProfileId,
        finalTenantId
      );

      res.status(201).json(created);
    } catch (error) {
      logger.error('Error creating person:', { error: 'Errore interno del server' });
      const message = (error && error.message) || '';

      // Gestione errori Prisma per constraint violations
      if (message.toLowerCase().includes('unique constraint') || error.code === 'P2002') {
        // Estrai il campo dalla stringa di errore
        const fieldMatch = message.match(/fields: \(`(\w+)`\)/);
        const field = fieldMatch ? fieldMatch[1] : 'unknown';
        return res.status(409).json({
          error: `${field === 'taxCode' ? 'Codice fiscale' : field === 'email' ? 'Email' : field} già in uso`,
          code: 'DUPLICATE_FIELD',
          field
        });
      }

      if (message && message.toLowerCase().includes('tenantid is required')) {
        return res.status(400).json({ error: 'TenantId è obbligatorio' });
      }
      res.status(500).json({ error: 'Impossibile creare la persona' });
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
      // F76: Use getEffectiveTenantId to support cross-tenant admin operations
      const tenantId = getEffectiveTenantId(req);
      const updated = await personService.updatePerson(id, req.body, tenantId);
      res.json(updated);
    } catch (error) {
      logger.error('Error updating person:', { error: error.message, id: req.params.id });

      // FK validation errors from PersonCore
      if (error.code === 'FK_VALIDATION') {
        return res.status(400).json({ error: 'Riferimento non valido', field: error.field });
      }

      // Prisma FK constraint violation (P2003)
      if (error.code === 'P2003') {
        return res.status(400).json({ error: 'Riferimento non valido: il record collegato non esiste' });
      }

      // Prisma record not found (P2025)
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Persona non trovata' });
      }

      res.status(500).json({ error: 'Aggiornamento persona fallito' });
    }
  }

  // PATCH /api/persons/:id/contact - Aggiorna solo email/phone su PersonTenantProfile
  async updateContact(req, res) {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const { email, phone } = req.body;

      if (email === undefined && phone === undefined) {
        return res.status(400).json({ error: 'Specificare almeno email o telefono' });
      }

      const profile = await prisma.personTenantProfile.findFirst({
        where: { personId: id, tenantId, deletedAt: null }
      });

      if (!profile) {
        return res.status(404).json({ error: 'Profilo persona non trovato' });
      }

      const updateData = {};
      if (email !== undefined) updateData.email = email.toLowerCase().trim();
      if (phone !== undefined) updateData.phone = phone?.trim() || null;

      const updated = await prisma.personTenantProfile.update({
        where: { id: profile.id },
        data: updateData
      });

      logger.info('Person contact updated', {
        component: 'personController',
        action: 'updateContact',
        personId: id,
        tenantId,
        updatedFields: Object.keys(updateData)
      });

      res.json({ success: true, email: updated.email, phone: updated.phone });
    } catch (error) {
      logger.error('Error updating person contact:', { error: error.message, id: req.params.id });
      res.status(500).json({ error: 'Aggiornamento contatti fallito' });
    }
  }

  // DELETE /api/persons/:id - P58: con ownership check e GDPR
  async deletePerson(req, res) {
    try {
      const { id } = req.params;
      const { deletionReason } = req.body;
      // F111: getEffectiveTenantId per supportare admin cross-tenant (X-Operate-Tenant-Id)
      const tenantId = getEffectiveTenantId(req);
      const deletedBy = req.person.id;

      await personService.deletePerson(id, {
        tenantId,
        deletedBy,
        deletionReason: deletionReason || 'Eliminazione singola persona'
      });

      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting person:', { error: error.message, id: req.params.id, tenantId: req.person?.tenantId });

      if (error.message.includes('ownership') || error.message.includes('not owner') || error.message.includes('NOT_OWNER')) {
        return res.status(403).json({
          success: false,
          error: 'Non autorizzato a eliminare questa persona',
          message: 'Errore interno del server',
          code: 'NOT_OWNER'
        });
      }

      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, error: 'Persona non trovata' });
      }

      res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
  }

  // POST /api/persons/:id/roles
  async addRole(req, res) {
    try {
      const { validationResult } = await import('express-validator');
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Tipo di ruolo non valido', details: errors.array() });
      }

      const { id } = req.params;
      const { roleType } = req.body;
      const tenantId = getEffectiveTenantId(req);
      const result = await personService.addRole(id, roleType, null, tenantId);
      res.json(result);
    } catch (error) {
      if (error.message === 'Role already exists for this person') {
        return res.status(409).json({ error: 'Questo ruolo è già assegnato alla persona' });
      }
      logger.error('Error adding role to person:', { error: error.message, id: req.params.id });
      res.status(500).json({ error: 'Aggiunta ruolo alla persona fallita' });
    }
  }

  // DELETE /api/persons/:id/roles/:roleType
  async removeRole(req, res) {
    try {
      const { id, roleType } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const result = await personService.removeRole(id, roleType, null, tenantId);
      res.json(result);
    } catch (error) {
      logger.error('Error removing role from person:', { error: error.message, id: req.params.id, params: req.params });
      res.status(500).json({ error: 'Errore interno del server' });
    }
  }

  // GET /api/persons (multi-tenant support)
  async getPersons(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        roleType,
        specialty,
        companyId,
        tenantId: queryTenantId,
        tenantIds,
        allTenants,
        includeWithoutRoles,
        sortBy = 'lastLogin',
        sortOrder = 'desc',
        isActive
      } = req.query;

      const personId = req.person?.id;
      const globalRole = req.person?.globalRole;

      // Get accessible tenants for multi-tenant filtering
      const accessibleTenants = await personTenantAccessService.getAccessibleTenants(personId, globalRole);
      const accessibleTenantIds = accessibleTenants.map(t => t.id);

      // Determine effective tenantId or tenantIds for filtering
      let effectiveTenantIds = null;
      if (tenantIds) {
        const requestedIds = tenantIds.split(',').map(id => id.trim());
        effectiveTenantIds = accessibleTenantIds.length > 0
          ? requestedIds.filter(id => accessibleTenantIds.includes(id))
          : requestedIds;

        if (effectiveTenantIds.length === 0) {
          // P57: Usa getEffectiveTenantId come fallback per cross-tenant admin access
          const fallbackTenantId = getEffectiveTenantId(req);
          effectiveTenantIds = fallbackTenantId ? [fallbackTenantId] : null;
        }
      } else if (allTenants === 'true' && accessibleTenantIds.length > 0) {
        effectiveTenantIds = accessibleTenantIds;
      } else {
        // P57: Usa getEffectiveTenantId come default per cross-tenant admin access
        const defaultTenantId = getEffectiveTenantId(req);
        effectiveTenantIds = defaultTenantId ? [defaultTenantId] : (queryTenantId ? [queryTenantId] : null);
      }

      // P59: Parse roleType - supporta sia array che stringa con virgole
      let parsedRoleType = roleType;
      if (typeof roleType === 'string' && roleType.includes(',')) {
        parsedRoleType = roleType.split(',').map(r => r.trim()).filter(Boolean);
      }

      const options = {
        roleType: parsedRoleType,
        specialty,
        companyId,
        // Pass tenant filter to service - single or multiple
        tenantId: effectiveTenantIds?.length === 1 ? effectiveTenantIds[0] : undefined,
        tenantIds: effectiveTenantIds?.length > 1 ? effectiveTenantIds : undefined,
        includeWithoutRoles: includeWithoutRoles === 'true',
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

      // P48: Flatten tenant-specific fields from tenantProfiles
      // Determine target tenantId for profile extraction
      const targetTenantId = effectiveTenantIds?.length === 1 ? effectiveTenantIds[0] : req.person?.tenantId;

      const transformed = (result.persons || []).map(rawPerson => {
        const person = flattenPersonWithProfile(rawPerson, targetTenantId);
        return {
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          username: person.username,
          phone: person.phone,
          taxCode: person.taxCode,
          title: person.title, // ✅ Profilo professionale
          companyId: person.companyId, // P63: alias backward compatibility
          companyTenantProfileId: person.companyTenantProfileId, // ✅ Include companyTenantProfileId for schedules
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
          personRoles: (rawPerson.personRoles || []).map(pr => ({
            id: pr.id,
            roleType: pr.roleType,
            isActive: pr.isActive,
            deletedAt: pr.deletedAt,
            professionalProfile: pr.professionalProfile,
            hiringDate: pr.hiringDate,
            // P49: ragioneSociale è su Company (padre di CompanyTenantProfile)
            company: pr.companyTenantProfile?.company ? {
              id: pr.companyTenantProfile.company.id,
              ragioneSociale: pr.companyTenantProfile.company.ragioneSociale || pr.companyTenantProfile.company.name
            } : undefined,
            assignedAt: pr.assignedAt
          })),
          tenantId: person.tenantId, // P63: viene da flattenPersonWithProfile (PersonTenantProfile)
          tenantName: null, // P63: Tenant relation removed, get from tenantProfiles if needed
          birthDate: person.birthDate, // ✅ Include birthDate for display
          hiredDate: person.hiredDate, // ✅ Include hiredDate for employees
          position: person.position,
          status: person.status,
          certifications: person.certifications, // ✅ Include certifications for trainers filtering
          specialties: person.specialties, // ✅ Include specialties for trainers
          residenceCity: person.residenceCity, // ✅ Città residenza per trainers
          hourlyRate: person.hourlyRate ? parseFloat(person.hourlyRate.toString()) : null, // ✅ Prezzo/ora per trainers
          // ✅ Mansioni attive del lavoratore (max 3, prima quella primaria)
          mansioni: (rawPerson.mansioni || []).map(lm => ({
            id: lm.id,
            mansioneId: lm.mansioneId,
            denominazione: lm.mansione?.denominazione,
            codice: lm.mansione?.codice,
            isPrimaria: lm.isPrimaria
          })),
          createdAt: person.createdAt,
          updatedAt: person.updatedAt
        };
      });

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
      res.status(500).json({ error: 'Errore interno del server' });
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
      res.status(500).json({ error: 'Cambio stato fallito' });
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
      res.status(500).json({ error: 'Errore interno del server' });
    }
  }

  // GET /api/persons/stats
  async getPersonStats(req, res) {
    try {
      const stats = await personService.getPersonStats();
      res.json(stats);
    } catch (error) {
      logger.error('Error getting person stats:', { error: 'Errore interno del server' });
      res.status(500).json({ error: 'Errore interno del server' });
    }
  }

  // GET /api/persons/check-username
  async checkUsernameAvailability(req, res) {
    try {
      const { username } = req.query;

      if (!username) {
        return res.status(400).json({ error: 'Username è obbligatorio' });
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
      res.status(500).json({ error: 'Errore interno del server' });
    }
  }

  // GET /api/persons/check-email
  // P48 Fix: Email è ora in PersonTenantProfile, non più in Person
  // P59 Update: Ritorna info sulla persona che usa l'email per warning (non blocco)
  async checkEmailAvailability(req, res) {
    try {
      const { email, tenantId } = req.query;

      if (!email) {
        return res.status(400).json({ error: 'Email è obbligatoria' });
      }

      const normalizedEmail = String(email).toLowerCase().trim();

      // P48: Cerca email in PersonTenantProfile (per-tenant)
      // Se tenantId fornito, cerca solo in quel tenant
      // Altrimenti cerca globalmente (per evitare duplicati cross-tenant)
      const whereClause = {
        email: normalizedEmail,
        deletedAt: null
      };

      // Se l'utente è autenticato, usa il suo tenantId come default
      const effectiveTenantId = tenantId || req.person?.tenantId;
      if (effectiveTenantId) {
        whereClause.tenantId = effectiveTenantId;
      }

      const existing = await prisma.personTenantProfile.findFirst({
        where: whereClause,
        select: {
          id: true,
          personId: true,
          email: true,
          tenantId: true,
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      res.json({
        available: !existing,
        // P59: Info sulla persona che usa l'email (per warning)
        ...(existing && {
          existsInCurrentTenant: existing.tenantId === effectiveTenantId,
          existingPerson: {
            id: existing.person?.id || existing.personId,
            firstName: existing.person?.firstName || '',
            lastName: existing.person?.lastName || '',
            fullName: existing.person ? `${existing.person.firstName} ${existing.person.lastName}`.trim() : 'N/D'
          }
        })
      });
    } catch (error) {
      logger.error('Error checking email availability:', { error: error.message, query: req.query });
      res.status(500).json({ error: 'Errore interno del server' });
    }
  }

  // GET /api/persons/check-taxcode
  // P48: TaxCode rimane globale in Person (identificatore univoco)
  // P59 Update: Supporta cross-tenant import - ritorna info persona per import
  async checkTaxCodeAvailability(req, res) {
    try {
      const { taxCode, tenantId } = req.query;

      if (!taxCode) {
        return res.status(400).json({ error: 'Codice fiscale è obbligatorio' });
      }

      const normalizedTaxCode = String(taxCode).toUpperCase().trim();

      // Cerca persona globalmente
      const existing = await prisma.person.findFirst({
        where: {
          taxCode: normalizedTaxCode,
          deletedAt: null
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          taxCode: true,
          birthDate: true,
          tenantProfiles: {
            where: { deletedAt: null },
            select: {
              id: true,
              tenantId: true,
              email: true,
              phone: true
            }
          }
        }
      });

      // Se l'utente è autenticato, usa il suo tenantId come riferimento
      const effectiveTenantId = tenantId || req.person?.tenantId;

      if (!existing) {
        // CF non esiste - disponibile
        return res.json({
          available: true
        });
      }

      // CF esiste - verifica se è nello stesso tenant o in altro
      const profileInCurrentTenant = existing.tenantProfiles.find(
        p => p.tenantId === effectiveTenantId
      );

      if (profileInCurrentTenant) {
        // Persona esiste già nello stesso tenant - NON disponibile
        return res.json({
          available: false,
          existsInCurrentTenant: true,
          existingPerson: {
            id: existing.id,
            firstName: existing.firstName,
            lastName: existing.lastName,
            fullName: `${existing.firstName} ${existing.lastName}`.trim()
          }
        });
      }

      // P59: Persona esiste in ALTRO tenant - disponibile per IMPORT
      // Frontend mostrerà warning e offrirà opzione di importare i dati core
      return res.json({
        available: true,  // Disponibile per import
        existsInOtherTenant: true,
        canImport: true,
        existingPerson: {
          id: existing.id,
          firstName: existing.firstName,
          lastName: existing.lastName,
          fullName: `${existing.firstName} ${existing.lastName}`.trim(),
          birthDate: existing.birthDate
        },
        message: 'Questa persona esiste già in un altro tenant. I dati anagrafici verranno importati automaticamente.'
      });
    } catch (error) {
      logger.error('Error checking tax code availability:', { error: error.message, query: req.query });
      res.status(500).json({ error: 'Errore interno del server' });
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
        targetCompanyId: filters?.companyTenantProfileId,
        requestedFields
      });

      if (!permission.allowed) {
        return res.status(403).json({ error: 'Permesso negato', code: 'PERMISSION_DENIED', reason: permission.reason });
      }

      // Determina globalRole dell'utente corrente per i default fields (calcolato da personRoles)
      const me = await prisma.person.findFirst({ // F234: findFirst+deletedAt
        where: { id: req.person.id, deletedAt: null },
        select: {
          personRoles: { where: { isActive: true, deletedAt: null }, select: { roleType: true } }
        }
      });

      // globalRole calcolato da personRoles (il campo globalRole non esiste nel modello)
      let globalRole = null;
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
      return res.status(500).json({ error: 'Errore interno del server' });
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

        // F310: Always derive defaultTenantId from JWT context (getEffectiveTenantId) to prevent
        // cross-tenant import bypass via user-supplied defaultTenantId/tenantId in request body.
        const options = {
          overwriteIds: Array.isArray(req.body?.overwriteIds) ? req.body.overwriteIds : [],
          defaultTenantId: getEffectiveTenantId(req),
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
        return res.status(400).json({ error: 'File CSV è obbligatorio' });
      }
      const csvContent = req.file?.buffer ? req.file.buffer.toString('utf-8') : '';
      if (!csvContent) {
        return res.status(400).json({ error: 'File CSV è vuoto' });
      }

      const result = await personService.importPersonsFromCSV(csvContent, {
        defaultTenantId: getEffectiveTenantId(req),
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
      res.status(500).json({ error: 'Errore interno del server' });
    }
  }

  // DELETE /api/persons/bulk - P58: con ownership check e GDPR deletion reason
  async deleteMultiplePersons(req, res) {
    try {
      const { personIds, deletionReason } = req.body;
      // F111: getEffectiveTenantId per supportare admin cross-tenant
      const tenantId = getEffectiveTenantId(req);
      const deletedBy = req.person.id;

      // P58: Ownership check e GDPR logging
      const result = await personService.deleteMultiplePersons(personIds, {
        tenantId,
        deletedBy,
        deletionReason: deletionReason || 'Eliminazione massiva da gestione aziende'
      });

      res.json({
        success: true,
        deleted: result.deleted || 0,
        skipped: result.skipped || 0,
        errors: result.errors || []
      });
    } catch (error) {
      logger.error('Error deleting multiple persons:', { error: error.message, tenantId: req.person?.tenantId });

      // P58: Gestione errori ownership
      if (error.message.includes('ownership') || error.message.includes('not owner')) {
        return res.status(403).json({
          success: false,
          error: 'Non autorizzato a eliminare alcune persone',
          message: 'Errore interno del server',
          code: 'NOT_OWNER'
        });
      }

      return res.status(500).json({ success: false, error: 'Errore interno del server' });
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
      res.status(500).json({ error: 'Errore interno del server' });
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
      res.status(500).json({ error: 'Errore interno del server' });
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
      res.status(500).json({ error: 'Errore interno del server' });
    }
  }

  // ===== PROGETTO 57: CROSS-TENANT IMPORT =====

  /**
   * GET /api/persons/check-existing
   * Verifica se una Person esiste già globalmente per taxCode o vatNumber
   * NON espone dati sensibili (email, phone) - solo conferma esistenza
   * 
   * @query targetTenantId - Il tenant TARGET dove l'admin vuole creare (obbligatorio per cross-tenant)
   *                         Per GET requests, X-Operate-Tenant-Id non viene passato dal frontend,
   *                         quindi usiamo query param per identificare il tenant destinazione
   */
  async checkExistingPerson(req, res) {
    try {
      const { taxCode, vatNumber, targetTenantId } = req.query;
      // P57: Per GET requests, il frontend non passa X-Operate-Tenant-Id
      // Usa targetTenantId da query se fornito, altrimenti fallback al JWT tenant
      const tenantId = targetTenantId || req.person?.tenantId;

      if (!taxCode && !vatNumber) {
        return res.status(400).json({
          error: 'È richiesto almeno uno tra taxCode e vatNumber'
        });
      }

      // Cerca Person globalmente (senza filtro tenant)
      const whereClause = {
        deletedAt: null,
        OR: []
      };

      if (taxCode) {
        whereClause.OR.push({ taxCode: taxCode.toUpperCase().trim() });
      }
      if (vatNumber) {
        whereClause.OR.push({ vatNumber: vatNumber.trim() });
      }

      const existingPerson = await prisma.person.findFirst({
        where: whereClause,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          taxCode: true,
          vatNumber: true,
          // NON includiamo email, phone - sono in PersonTenantProfile e sensibili
          tenantProfiles: {
            where: { deletedAt: null },
            select: {
              id: true,
              tenantId: true,
              isActive: true,
              isPrimary: true
            }
          }
        }
      });

      if (!existingPerson) {
        return res.json({
          exists: false,
          canImport: false,
          message: 'Nessuna persona trovata con questi identificativi'
        });
      }

      // Verifica se già presente nel tenant corrente
      const existsInCurrentTenant = existingPerson.tenantProfiles.some(
        profile => profile.tenantId === tenantId
      );

      if (existsInCurrentTenant) {
        return res.json({
          exists: true,
          canImport: false,
          existsInCurrentTenant: true,
          message: 'La persona esiste già nel tenant corrente'
        });
      }

      // Può essere importata
      return res.json({
        exists: true,
        canImport: true,
        existsInCurrentTenant: false,
        person: {
          id: existingPerson.id,
          firstName: existingPerson.firstName,
          lastName: existingPerson.lastName,
          taxCode: existingPerson.taxCode,
          vatNumber: existingPerson.vatNumber,
          profileCount: existingPerson.tenantProfiles.length
        },
        message: 'Persona trovata in altri tenant. Puoi importarla nel tuo tenant.'
      });

    } catch (error) {
      logger.error('Error checking existing person:', {
        error: 'Errore interno del server',
        taxCode: req.query.taxCode,
        tenantId: req.person?.tenantId
      });
      res.status(500).json({ error: 'Errore durante la verifica' });
    }
  }

  /**
   * POST /api/persons/import-cross-tenant
   * Importa una Person esistente creando un nuovo PersonTenantProfile
   * OBBLIGATORIO: Registra consenso GDPR in PersonDataShareConsent PRIMA del profile
   */
  async importPersonCrossTenant(req, res) {
    try {
      const { personId, sharedDataTypes, profileData = {} } = req.body;
      // P57: Usa getEffectiveTenantId per supportare admin cross-tenant access via X-Frontend-Id
      const tenantId = getEffectiveTenantId(req);
      const performedById = req.person?.id;
      const ipAddress = req.ip || req.connection?.remoteAddress;

      // Validazione sharedDataTypes
      const validDataTypes = ['ANAGRAFICA', 'CONTATTI', 'DOCUMENTI', 'FORMAZIONE', 'SANITARIO'];
      const invalidTypes = sharedDataTypes.filter(t => !validDataTypes.includes(t));
      if (invalidTypes.length > 0) {
        return res.status(400).json({
          error: `Tipi dati non validi: ${invalidTypes.join(', ')}. Valori consentiti: ${validDataTypes.join(', ')}`
        });
      }

      // Verifica che la Person esista
      const existingPerson = await prisma.person.findFirst({
        where: {
          id: personId,
          deletedAt: null
        },
        include: {
          tenantProfiles: {
            where: { tenantId } // Includi anche i soft-deleted per gestirli
          }
        }
      });

      if (!existingPerson) {
        return res.status(404).json({ error: 'Persona non trovata' });
      }

      // P58: Verifica se esiste un profilo per questo tenant (attivo o soft-deleted)
      const activeProfile = existingPerson.tenantProfiles.find(p => !p.deletedAt);
      const deletedProfile = existingPerson.tenantProfiles.find(p => p.deletedAt);

      // Verifica che non esista già un profilo ATTIVO per questo tenant
      if (activeProfile) {
        return res.status(409).json({
          error: 'La persona ha già un profilo in questo tenant'
        });
      }

      // Trova il source tenant (primo profilo esistente)
      const sourceProfile = await prisma.personTenantProfile.findFirst({
        where: { personId, deletedAt: null },
        select: { tenantId: true }
      });

      // Transazione GDPR-compliant
      const result = await prisma.$transaction(async (tx) => {
        // 1. PRIMA: Crea il consenso GDPR (OBBLIGATORIO)
        const consent = await tx.personDataShareConsent.create({
          data: {
            personId,
            sourceTenantId: sourceProfile?.tenantId || tenantId,
            targetTenantId: tenantId,
            sharedDataTypes,
            consentGiven: true,
            consentDate: new Date(),
            consentMethod: 'IMPORT_CROSS_TENANT',
            legalBasis: 'GDPR Art.6.1.a - Consenso esplicito per import cross-tenant'
          }
        });

        let newProfile;

        // P58: Se esiste un profilo soft-deleted, ripristinalo invece di crearne uno nuovo
        if (deletedProfile) {
          newProfile = await tx.personTenantProfile.update({
            where: { id: deletedProfile.id },
            data: {
              deletedAt: null, // Ripristina il profilo
              status: 'PENDING', // Re-import inizia come pending
              isActive: true,
              isPrimary: false,
              ...profileData,
              updatedAt: new Date()
            }
          });
          logger.info('Restored previously deleted person profile', {
            profileId: deletedProfile.id,
            personId,
            tenantId
          });
        } else {
          // 2. Crea il PersonTenantProfile nel nuovo tenant
          newProfile = await tx.personTenantProfile.create({
            data: {
              personId,
              tenantId,
              status: 'PENDING', // PersonStatus.PENDING è valido
              isActive: true,
              isPrimary: false, // Il profilo importato non è primario
              ...profileData
            }
          });
        }

        // 3. Registra audit log GDPR
        await tx.gdprAuditLog.create({
          data: {
            personId,
            action: 'IMPORT_CROSS_TENANT',
            resourceType: 'PERSON_PROFILE',
            resourceId: newProfile.id,
            dataAccessed: {
              profileId: newProfile.id,
              consentId: consent.id,
              sharedDataTypes,
              targetTenantId: tenantId,
              performedBy: performedById
            },
            ipAddress,
            tenantId
          }
        });

        return { profile: newProfile, consent };
      });

      logger.info('Person imported cross-tenant successfully', {
        personId,
        targetTenantId: tenantId,
        profileId: result.profile.id,
        consentId: result.consent.id,
        sharedDataTypes,
        performedBy: performedById
      });

      res.status(201).json({
        success: true,
        message: 'Persona importata con successo nel tenant',
        profile: result.profile,
        consentId: result.consent.id
      });

    } catch (error) {
      logger.error('Error importing person cross-tenant:', {
        error: 'Errore interno del server',
        personId: req.body.personId,
        tenantId: req.person?.tenantId
      });
      res.status(500).json({ error: 'Errore durante l\'importazione' });
    }
  }

  /**
   * P58: Nasconde una persona dalla vista del tenant corrente
   * Revoca il consent cross-tenant senza eliminare i dati originali
   * Usato quando un non-owner vuole "eliminare" una persona condivisa
   */
  async hideFromView(req, res) {
    try {
      const { id: personId } = req.params;
      const { reason } = req.body;
      // F111: getEffectiveTenantId — admin può nascondere dal tenant operativo
      const tenantId = getEffectiveTenantId(req);
      const revokedBy = req.person.id;

      // Trova il consent attivo per questa persona dove il tenant corrente è il target
      const consent = await prisma.personDataShareConsent.findFirst({
        where: {
          personId,
          targetTenantId: tenantId,
          isRevoked: false
        }
      });

      if (!consent) {
        // Se non c'è consent, la persona non è condivisa con questo tenant
        // Potrebbe essere una persona di proprietà del tenant - in tal caso non può nasconderla, deve eliminarla
        return res.status(400).json({
          success: false,
          error: 'Operazione non valida',
          message: 'Questa persona non è stata condivisa con il tuo tenant. Se sei il proprietario, usa l\'eliminazione normale.',
          code: 'NOT_SHARED_PERSON'
        });
      }

      // Revoca il consent
      await prisma.personDataShareConsent.update({
        where: { id: consent.id },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedBy,
          revokedReason: reason || 'Nascosto dalla vista dal tenant'
        }
      });

      // Log GDPR
      await prisma.gdprAuditLog.create({
        data: {
          personId,
          action: 'HIDE_FROM_VIEW',
          resourceType: 'PersonDataShareConsent',
          resourceId: consent.id,
          tenantId,
          dataAccessed: {
            consentId: consent.id,
            sourceTenantId: consent.sourceTenantId,
            targetTenantId: tenantId,
            revokedBy,
            reason: reason || 'Nascosto dalla vista dal tenant',
            operation: 'REVOKE_CONSENT'
          }
        }
      });

      logger.info('Person hidden from view (consent revoked)', {
        personId,
        consentId: consent.id,
        tenantId,
        revokedBy,
        reason
      });

      res.json({
        success: true,
        message: 'Persona nascosta dalla vista con successo',
        consentId: consent.id
      });

    } catch (error) {
      logger.error('Error hiding person from view:', {
        error: 'Errore interno del server',
        personId: req.params?.id,
        tenantId: req.person?.tenantId
      });
      res.status(500).json({ error: 'Errore durante l\'operazione' });
    }
  }

  /**
   * P58: Nasconde più persone dalla vista del tenant corrente
   * Revoca i consent cross-tenant senza eliminare i dati originali
   */
  async hideMultipleFromView(req, res) {
    try {
      const { personIds, reason } = req.body;
      // F111: getEffectiveTenantId — admin può nascondere dal tenant operativo
      const tenantId = getEffectiveTenantId(req);
      const revokedBy = req.person.id;

      const results = {
        hidden: 0,
        skipped: 0,
        errors: []
      };

      // Trova tutti i consent attivi dove il tenant corrente è il target
      const consents = await prisma.personDataShareConsent.findMany({
        where: {
          personId: { in: personIds },
          targetTenantId: tenantId,
          isRevoked: false
        }
      });

      if (consents.length === 0) {
        return res.json({
          success: true,
          message: 'Nessuna persona condivisa da nascondere',
          results
        });
      }

      // Revoca tutti i consent in transazione
      await prisma.$transaction(async (tx) => {
        await tx.personDataShareConsent.updateMany({
          where: {
            id: { in: consents.map(c => c.id) }
          },
          data: {
            isRevoked: true,
            revokedAt: new Date(),
            revokedBy,
            revokedReason: reason || 'Nascosto dalla vista dal tenant (bulk)'
          }
        });

        // Log GDPR per ogni persona
        const auditLogs = consents.map(consent => ({
          personId: consent.personId,
          action: 'HIDE_FROM_VIEW',
          resourceType: 'PersonDataShareConsent',
          resourceId: consent.id,
          tenantId,
          dataAccessed: {
            consentId: consent.id,
            sourceTenantId: consent.sourceTenantId,
            targetTenantId: tenantId,
            revokedBy,
            reason: reason || 'Nascosto dalla vista dal tenant (bulk)',
            operation: 'REVOKE_CONSENT',
            bulkOperation: true
          }
        }));

        await tx.gdprAuditLog.createMany({ data: auditLogs });
      });

      results.hidden = consents.length;
      results.skipped = personIds.length - consents.length;

      // Gli ID non trovati nei consent sono persone non condivise (owner)
      const consentPersonIds = consents.map(c => c.personId);
      for (const pid of personIds) {
        if (!consentPersonIds.includes(pid)) {
          results.errors.push({
            personId: pid,
            error: 'Persona non condivisa con questo tenant (sei il proprietario)',
            code: 'NOT_SHARED'
          });
        }
      }

      logger.info('Multiple persons hidden from view', {
        hidden: results.hidden,
        skipped: results.skipped,
        errors: results.errors.length,
        tenantId,
        revokedBy
      });

      res.json({
        success: true,
        message: `${results.hidden} persone nascoste dalla vista`,
        results
      });

    } catch (error) {
      logger.error('Error hiding multiple persons from view:', {
        error: 'Errore interno del server',
        tenantId: req.person?.tenantId
      });
      res.status(500).json({ error: 'Errore durante l\'operazione' });
    }
  }
}

export default new PersonController();
