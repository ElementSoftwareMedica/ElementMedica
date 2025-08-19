import express from 'express';
import { PrismaClient } from '@prisma/client';
import middleware from '../auth/middleware.js';
import logger from '../utils/logger.js';
import { body, validationResult } from 'express-validator';

const { authenticate: authenticateToken, authorize: requirePermission } = middleware;
const router = express.Router();
const prisma = new PrismaClient();

/**
 * Settings Routes - Gestione completa ruoli e permessi
 * Implementazione per pagina settings/users
 */

// Definizione completa dei permessi del sistema
const SYSTEM_PERMISSIONS = {
  // User Management
  'users.create': { label: 'Creare utenti', category: 'users', scope: ['all', 'own'] },
  'users.read': { label: 'Visualizzare utenti', category: 'users', scope: ['all', 'own'] },
  'users.update': { label: 'Modificare utenti', category: 'users', scope: ['all', 'own'] },
  'users.delete': { label: 'Eliminare utenti', category: 'users', scope: ['all', 'own'] },
  'users.manage_roles': { label: 'Gestire ruoli utenti', category: 'users', scope: ['all'] },
  
  // Company Management
  'companies.create': { label: 'Creare aziende', category: 'companies', scope: ['all'] },
  'companies.read': { label: 'Visualizzare aziende', category: 'companies', scope: ['all', 'own'] },
  'companies.update': { label: 'Modificare aziende', category: 'companies', scope: ['all', 'own'] },
  'companies.delete': { label: 'Eliminare aziende', category: 'companies', scope: ['all'] },
  'companies.manage_settings': { label: 'Gestire impostazioni azienda', category: 'companies', scope: ['all', 'own'] },
  
  // Course Management
  'courses.create': { label: 'Creare corsi', category: 'courses', scope: ['all', 'own'] },
  'courses.read': { label: 'Visualizzare corsi', category: 'courses', scope: ['all', 'own'] },
  'courses.update': { label: 'Modificare corsi', category: 'courses', scope: ['all', 'own'] },
  'courses.delete': { label: 'Eliminare corsi', category: 'courses', scope: ['all', 'own'] },
  'courses.assign': { label: 'Assegnare corsi', category: 'courses', scope: ['all', 'own'] },
  
  // Employee Management
  'employees.create': { label: 'Creare dipendenti', category: 'employees', scope: ['all', 'own'] },
  'employees.read': { label: 'Visualizzare dipendenti', category: 'employees', scope: ['all', 'own'] },
  'employees.update': { label: 'Modificare dipendenti', category: 'employees', scope: ['all', 'own'] },
  'employees.delete': { label: 'Eliminare dipendenti', category: 'employees', scope: ['all', 'own'] },
  
  // Training Management
  'training.create': { label: 'Creare sessioni formative', category: 'training', scope: ['all', 'own'] },
  'training.read': { label: 'Visualizzare formazioni', category: 'training', scope: ['all', 'own'] },
  'training.update': { label: 'Modificare formazioni', category: 'training', scope: ['all', 'own'] },
  'training.delete': { label: 'Eliminare formazioni', category: 'training', scope: ['all', 'own'] },
  'training.conduct': { label: 'Condurre formazioni', category: 'training', scope: ['all', 'own'] },
  
  // Reports and Analytics
  'reports.view': { label: 'Visualizzare report', category: 'reports', scope: ['all', 'own'] },
  'reports.export': { label: 'Esportare report', category: 'reports', scope: ['all', 'own'] },
  'analytics.view': { label: 'Visualizzare analytics', category: 'analytics', scope: ['all', 'own'] },
  
  // System Administration
  'system.settings': { label: 'Gestire impostazioni sistema', category: 'system', scope: ['all'] },
  'system.billing': { label: 'Gestire fatturazione', category: 'system', scope: ['all'] },
  'system.audit': { label: 'Visualizzare audit logs', category: 'system', scope: ['all'] },
  'system.backup': { label: 'Gestire backup', category: 'system', scope: ['all'] }
};

// Definizione dei campi visualizzabili per entità
const ENTITY_FIELDS = {
  users: {
    id: { label: 'ID', required: true },
    email: { label: 'Email', required: true },
    firstName: { label: 'Nome', required: false },
    lastName: { label: 'Cognome', required: false },
    phone: { label: 'Telefono', required: false },
    address: { label: 'Indirizzo', required: false },
    dateOfBirth: { label: 'Data di nascita', required: false },
    fiscalCode: { label: 'Codice fiscale', required: false },
    isActive: { label: 'Attivo', required: false },
    lastLogin: { label: 'Ultimo accesso', required: false },
    createdAt: { label: 'Data creazione', required: false }
  },
  companies: {
    id: { label: 'ID', required: true },
    name: { label: 'Nome azienda', required: true },
    email: { label: 'Email', required: false },
    phone: { label: 'Telefono', required: false },
    address: { label: 'Indirizzo', required: false },
    vatNumber: { label: 'Partita IVA', required: false },
    fiscalCode: { label: 'Codice fiscale', required: false },
    website: { label: 'Sito web', required: false },
    description: { label: 'Descrizione', required: false },
    isActive: { label: 'Attiva', required: false },
    createdAt: { label: 'Data creazione', required: false }
  },
  courses: {
    id: { label: 'ID', required: true },
    title: { label: 'Titolo', required: true },
    description: { label: 'Descrizione', required: false },
    duration: { label: 'Durata', required: false },
    price: { label: 'Prezzo', required: false },
    category: { label: 'Categoria', required: false },
    level: { label: 'Livello', required: false },
    isActive: { label: 'Attivo', required: false },
    createdAt: { label: 'Data creazione', required: false }
  },
  employees: {
    id: { label: 'ID', required: true },
    firstName: { label: 'Nome', required: true },
    lastName: { label: 'Cognome', required: true },
    email: { label: 'Email', required: false },
    phone: { label: 'Telefono', required: false },
    position: { label: 'Posizione', required: false },
    department: { label: 'Dipartimento', required: false },
    hireDate: { label: 'Data assunzione', required: false },
    salary: { label: 'Stipendio', required: false },
    isActive: { label: 'Attivo', required: false }
  }
};

/**
 * @route GET /api/settings/roles
 * @desc Ottieni tutti i ruoli del sistema
 * @access Admin
 */
router.get('/roles', 
  authenticateToken(),
  requirePermission(['ROLE_MANAGEMENT', 'SYSTEM_SETTINGS']),
  async (req, res) => {
    try {
      // Ottieni tutti i tipi di ruolo disponibili dall'enum RoleType
      const roleTypes = [
        'EMPLOYEE', 'MANAGER', 'HR_MANAGER', 'DEPARTMENT_HEAD', 'TRAINER', 
        'SENIOR_TRAINER', 'TRAINER_COORDINATOR', 'EXTERNAL_TRAINER', 
        'SUPER_ADMIN', 'ADMIN', 'COMPANY_ADMIN', 'TENANT_ADMIN', 
        'VIEWER', 'OPERATOR', 'COORDINATOR', 'SUPERVISOR', 'GUEST', 
        'CONSULTANT', 'AUDITOR'
      ];

      // Mappa i ruoli con descrizioni e permessi predefiniti
      const roleDescriptions = {
        'SUPER_ADMIN': { name: 'Super Admin', description: 'Accesso completo al sistema' },
        'ADMIN': { name: 'Amministratore', description: 'Amministratore del tenant' },
        'COMPANY_ADMIN': { name: 'Amministratore Azienda', description: 'Amministratore di azienda' },
        'TENANT_ADMIN': { name: 'Amministratore Tenant', description: 'Amministratore del tenant' },
        'MANAGER': { name: 'Manager', description: 'Manager di dipartimento' },
        'HR_MANAGER': { name: 'Manager HR', description: 'Manager delle risorse umane' },
        'DEPARTMENT_HEAD': { name: 'Capo Dipartimento', description: 'Responsabile di dipartimento' },
        'TRAINER': { name: 'Formatore', description: 'Formatore standard' },
        'SENIOR_TRAINER': { name: 'Formatore Senior', description: 'Formatore esperto' },
        'TRAINER_COORDINATOR': { name: 'Coordinatore Formatori', description: 'Coordinatore dei formatori' },
        'EXTERNAL_TRAINER': { name: 'Formatore Esterno', description: 'Formatore esterno' },
        'EMPLOYEE': { name: 'Dipendente', description: 'Dipendente standard' },
        'VIEWER': { name: 'Visualizzatore', description: 'Solo visualizzazione' },
        'OPERATOR': { name: 'Operatore', description: 'Operatore del sistema' },
        'COORDINATOR': { name: 'Coordinatore', description: 'Coordinatore generale' },
        'SUPERVISOR': { name: 'Supervisore', description: 'Supervisore' },
        'GUEST': { name: 'Ospite', description: 'Accesso limitato' },
        'CONSULTANT': { name: 'Consulente', description: 'Consulente esterno' },
        'AUDITOR': { name: 'Auditor', description: 'Auditor del sistema' }
      };

      // Ottieni i ruoli attualmente assegnati con i loro permessi
      const assignedRoles = await prisma.personRole.findMany({
        where: {},
        include: {
          permissions: true,
          advancedPermissions: true,
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        distinct: ['roleType']
      });

      // Crea la lista completa dei ruoli
      const allRoles = roleTypes.map(roleType => {
        const roleInfo = roleDescriptions[roleType] || { name: roleType, description: '' };
        const assignedRole = assignedRoles.find(ar => ar.roleType === roleType);
        
        return {
          id: roleType,
          name: roleInfo.name,
          description: roleInfo.description,
          isSystem: true,
          permissions: assignedRole ? assignedRole.permissions.map(p => p.permission) : [],
          advancedPermissions: assignedRole ? assignedRole.advancedPermissions : [],
          usersCount: assignedRoles.filter(ar => ar.roleType === roleType).length
        };
      });

      res.json({
        success: true,
        data: allRoles
      });
    } catch (error) {
      logger.error('Failed to fetch roles', {
        component: 'settings-routes',
        action: 'getRoles',
        error: error.message,
        stack: error.stack,
        personId: req.person?.id
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch roles'
      });
    }
  }
);

/**
 * @route GET /api/settings/permissions
 * @desc Ottieni tutti i permessi del sistema
 * @access Admin
 */
router.get('/permissions',
  authenticateToken(),
  requirePermission(['ROLE_MANAGEMENT', 'SYSTEM_SETTINGS']),
  async (req, res) => {
    try {
      // Permessi disponibili dall'enum PersonPermission
      const systemPermissions = [
        'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
        'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
        'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
        'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
        'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
        'MANAGE_ENROLLMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS',
        'DOWNLOAD_DOCUMENTS', 'ADMIN_PANEL', 'SYSTEM_SETTINGS', 'USER_MANAGEMENT',
        'ROLE_MANAGEMENT', 'TENANT_MANAGEMENT', 'VIEW_GDPR_DATA', 'EXPORT_GDPR_DATA',
        'DELETE_GDPR_DATA', 'MANAGE_CONSENTS', 'VIEW_REPORTS', 'CREATE_REPORTS', 'EXPORT_REPORTS'
      ];

      // Raggruppa i permessi per categoria
      const groupedPermissions = {
        companies: {
          label: 'Aziende',
          permissions: {
            VIEW_COMPANIES: { label: 'Visualizzare aziende', key: 'VIEW_COMPANIES', scope: ['all', 'own'] },
            CREATE_COMPANIES: { label: 'Creare aziende', key: 'CREATE_COMPANIES', scope: ['all'] },
            EDIT_COMPANIES: { label: 'Modificare aziende', key: 'EDIT_COMPANIES', scope: ['all', 'own'] },
            DELETE_COMPANIES: { label: 'Eliminare aziende', key: 'DELETE_COMPANIES', scope: ['all'] }
          }
        },
        employees: {
          label: 'Dipendenti',
          permissions: {
            VIEW_EMPLOYEES: { label: 'Visualizzare dipendenti', key: 'VIEW_EMPLOYEES', scope: ['all', 'own'] },
            CREATE_EMPLOYEES: { label: 'Creare dipendenti', key: 'CREATE_EMPLOYEES', scope: ['all', 'own'] },
            EDIT_EMPLOYEES: { label: 'Modificare dipendenti', key: 'EDIT_EMPLOYEES', scope: ['all', 'own'] },
            DELETE_EMPLOYEES: { label: 'Eliminare dipendenti', key: 'DELETE_EMPLOYEES', scope: ['all', 'own'] }
          }
        },
        trainers: {
          label: 'Formatori',
          permissions: {
            VIEW_TRAINERS: { label: 'Visualizzare formatori', key: 'VIEW_TRAINERS', scope: ['all', 'own'] },
            CREATE_TRAINERS: { label: 'Creare formatori', key: 'CREATE_TRAINERS', scope: ['all'] },
            EDIT_TRAINERS: { label: 'Modificare formatori', key: 'EDIT_TRAINERS', scope: ['all', 'own'] },
            DELETE_TRAINERS: { label: 'Eliminare formatori', key: 'DELETE_TRAINERS', scope: ['all'] }
          }
        },
        users: {
          label: 'Utenti',
          permissions: {
            VIEW_USERS: { label: 'Visualizzare utenti', key: 'VIEW_USERS', scope: ['all', 'own'] },
            CREATE_USERS: { label: 'Creare utenti', key: 'CREATE_USERS', scope: ['all'] },
            EDIT_USERS: { label: 'Modificare utenti', key: 'EDIT_USERS', scope: ['all', 'own'] },
            DELETE_USERS: { label: 'Eliminare utenti', key: 'DELETE_USERS', scope: ['all'] }
          }
        },
        courses: {
          label: 'Corsi',
          permissions: {
            VIEW_COURSES: { label: 'Visualizzare corsi', key: 'VIEW_COURSES', scope: ['all', 'own'] },
            CREATE_COURSES: { label: 'Creare corsi', key: 'CREATE_COURSES', scope: ['all', 'own'] },
            EDIT_COURSES: { label: 'Modificare corsi', key: 'EDIT_COURSES', scope: ['all', 'own'] },
            DELETE_COURSES: { label: 'Eliminare corsi', key: 'DELETE_COURSES', scope: ['all', 'own'] },
            MANAGE_ENROLLMENTS: { label: 'Gestire iscrizioni', key: 'MANAGE_ENROLLMENTS', scope: ['all', 'own'] }
          }
        },
        documents: {
          label: 'Documenti',
          permissions: {
            CREATE_DOCUMENTS: { label: 'Creare documenti', key: 'CREATE_DOCUMENTS', scope: ['all', 'own'] },
            EDIT_DOCUMENTS: { label: 'Modificare documenti', key: 'EDIT_DOCUMENTS', scope: ['all', 'own'] },
            DELETE_DOCUMENTS: { label: 'Eliminare documenti', key: 'DELETE_DOCUMENTS', scope: ['all', 'own'] },
            DOWNLOAD_DOCUMENTS: { label: 'Scaricare documenti', key: 'DOWNLOAD_DOCUMENTS', scope: ['all', 'own'] }
          }
        },
        system: {
          label: 'Sistema',
          permissions: {
            ADMIN_PANEL: { label: 'Pannello amministratore', key: 'ADMIN_PANEL', scope: ['all'] },
            SYSTEM_SETTINGS: { label: 'Impostazioni sistema', key: 'SYSTEM_SETTINGS', scope: ['all'] },
            USER_MANAGEMENT: { label: 'Gestione utenti', key: 'USER_MANAGEMENT', scope: ['all'] },
            ROLE_MANAGEMENT: { label: 'Gestione ruoli', key: 'ROLE_MANAGEMENT', scope: ['all'] },
            TENANT_MANAGEMENT: { label: 'Gestione tenant', key: 'TENANT_MANAGEMENT', scope: ['all'] }
          }
        },
        gdpr: {
          label: 'GDPR',
          permissions: {
            VIEW_GDPR_DATA: { label: 'Visualizzare dati GDPR', key: 'VIEW_GDPR_DATA', scope: ['all', 'own'] },
            EXPORT_GDPR_DATA: { label: 'Esportare dati GDPR', key: 'EXPORT_GDPR_DATA', scope: ['all', 'own'] },
            DELETE_GDPR_DATA: { label: 'Eliminare dati GDPR', key: 'DELETE_GDPR_DATA', scope: ['all', 'own'] },
            MANAGE_CONSENTS: { label: 'Gestire consensi', key: 'MANAGE_CONSENTS', scope: ['all', 'own'] }
          }
        },
        reports: {
          label: 'Report',
          permissions: {
            VIEW_REPORTS: { label: 'Visualizzare report', key: 'VIEW_REPORTS', scope: ['all', 'own'] },
            CREATE_REPORTS: { label: 'Creare report', key: 'CREATE_REPORTS', scope: ['all', 'own'] },
            EXPORT_REPORTS: { label: 'Esportare report', key: 'EXPORT_REPORTS', scope: ['all', 'own'] }
          }
        }
      };

      res.json({
        success: true,
        data: {
          permissions: groupedPermissions,
          categories: Object.keys(groupedPermissions),
          availablePermissions: systemPermissions
        }
      });
    } catch (error) {
      logger.error('Failed to fetch permissions', {
        component: 'settings-routes',
        action: 'getPermissions',
        error: error.message,
        stack: error.stack,
        personId: req.person?.id
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch permissions'
      });
    }
  }
);

/**
 * @route GET /api/settings/entity-fields
 * @desc Ottieni i campi disponibili per ogni entità
 * @access Admin
 */
router.get('/entity-fields',
  authenticateToken(),
  requirePermission(['users.manage_roles', 'system.settings']),
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: ENTITY_FIELDS
      });
    } catch (error) {
      logger.error('Failed to fetch entity fields', {
        component: 'settings-routes',
        action: 'getEntityFields',
        error: error.message,
        stack: error.stack,
        personId: req.person?.id
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch entity fields'
      });
    }
  }
);

/**
 * @route POST /api/settings/roles/:roleType/permissions
 * @desc Assegna permessi a un ruolo per un utente specifico
 * @access Admin
 */
router.post('/roles/:roleType/permissions',
  authenticateToken(),
  requirePermission(['ROLE_MANAGEMENT', 'USER_MANAGEMENT']),
  [
    body('personId').notEmpty().withMessage('ID persona richiesto'),
    body('permissions').isArray().withMessage('Permessi devono essere un array'),
    body('scope').optional().isString().withMessage('Scope deve essere una stringa')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { roleType } = req.params;
      const { personId, permissions, scope = 'global' } = req.body;

      // Verifica che la persona esista
      const person = await prisma.person.findUnique({
        where: { id: personId }
      });

      if (!person) {
        return res.status(404).json({
          success: false,
          error: 'Person not found'
        });
      }

      // Trova o crea il PersonRole
      let personRole = await prisma.personRole.findFirst({
        where: {personId,
          roleType,}
      });

      if (!personRole) {
        personRole = await prisma.personRole.create({
          data: {
            personId,
            roleType,
            isActive: true,
            assignedBy: req.person.id,
            companyId: req.person.companyId,
            tenantId: req.person.tenantId
          }
        });
      }

      // Rimuovi i permessi esistenti
      await prisma.rolePermission.deleteMany({
        where: { personRoleId: personRole.id }
      });

      // Aggiungi i nuovi permessi
      if (permissions && permissions.length > 0) {
        const rolePermissions = permissions.map(permission => ({
          personRoleId: personRole.id,
          permission,
          isGranted: true,
          grantedBy: req.person.id
        }));

        await prisma.rolePermission.createMany({
          data: rolePermissions
        });
      }

      res.status(201).json({
        success: true,
        data: {
          personRoleId: personRole.id,
          roleType,
          permissions,
          scope
        }
      });
    } catch (error) {
      logger.error('Failed to assign role permissions', {
        component: 'settings-routes',
        action: 'assignRolePermissions',
        error: error.message,
        stack: error.stack,
        personId: req.person?.id
      });
      res.status(500).json({
        success: false,
        error: 'Failed to assign role permissions'
      });
    }
  }
);

/**
 * @route PUT /api/settings/users/:personId/role
 * @desc Aggiorna il ruolo di un utente
 * @access Admin
 */
router.put('/users/:personId/role',
  authenticateToken(),
  requirePermission(['ROLE_MANAGEMENT', 'USER_MANAGEMENT']),
  [
    body('roleType').notEmpty().withMessage('Tipo ruolo richiesto'),
    body('permissions').optional().isArray().withMessage('Permessi devono essere un array'),
    body('companyId').optional().isString(),
    body('validUntil').optional().isISO8601().withMessage('Data validità deve essere in formato ISO8601')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { personId } = req.params;
      const { roleType, permissions, companyId, validUntil } = req.body;

      // Verifica che l'utente esista
      const user = await prisma.person.findUnique({
        where: { id: personId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Disattiva i ruoli esistenti
      await prisma.personRole.updateMany({
        where: {personId: personId,},
        data: {
          isActive: false
        }
      });

      // Crea il nuovo ruolo
      const newPersonRole = await prisma.personRole.create({
        data: {
          personId: personId,
          roleType,
          isActive: true,
          isPrimary: true,
          assignedBy: req.person.id,
          companyId: companyId || req.person.companyId,
          tenantId: req.person.tenantId,
          validUntil: validUntil ? new Date(validUntil) : null
        }
      });

      // Aggiungi i permessi se forniti
      if (permissions && permissions.length > 0) {
        const rolePermissions = permissions.map(permission => ({
          personRoleId: newPersonRole.id,
          permission,
          isGranted: true,
          grantedBy: req.person.id
        }));

        await prisma.rolePermission.createMany({
          data: rolePermissions
        });
      }

      res.json({
        success: true,
        data: {
          personRoleId: newPersonRole.id,
          personId,
          roleType,
          permissions: permissions || [],
          validUntil
        }
      });
    } catch (error) {
      logger.error('Failed to update user role', {
        component: 'settings-routes',
        action: 'updateUserRole',
        error: error.message,
        stack: error.stack,
        personId: req.person?.id,
        targetPersonId: req.params.personId
      });
      res.status(500).json({
        success: false,
        error: 'Failed to update user role'
      });
    }
  }
);

/**
 * @route DELETE /api/settings/users/:personId/role/:roleId
 * @desc Rimuove un ruolo da un utente
 * @access Admin
 */
router.delete('/users/:personId/role/:roleId',
  authenticateToken(),
  requirePermission(['ROLE_MANAGEMENT', 'USER_MANAGEMENT']),
  async (req, res) => {
    try {
      const { personId, roleId } = req.params;

      // Verifica che il ruolo esista e appartenga all'utente
      const personRole = await prisma.personRole.findFirst({
        where: {id: roleId,
          personId: personId,}
      });

      if (!personRole) {
        return res.status(404).json({
          success: false,
          error: 'Role assignment not found'
        });
      }

      // Disattiva il ruolo
      await prisma.personRole.update({
        where: { id: roleId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      // Rimuovi tutti i permessi associati
      await prisma.rolePermission.deleteMany({
        where: { personRoleId: roleId }
      });

      res.json({
        success: true,
        message: 'Role removed successfully'
      });
    } catch (error) {
      logger.error('Failed to remove user role', {
        component: 'settings-routes',
        action: 'removeUserRole',
        error: error.message,
        stack: error.stack,
        personId: req.person?.id,
        targetPersonId: req.params.personId,
        roleId: req.params.roleId
      });
      res.status(500).json({
        success: false,
        error: 'Failed to remove user role'
      });
    }
  }
);

/**
 * @route GET /api/settings/users
 * @desc Ottieni tutti gli utenti con i loro ruoli
 * @access Admin
 */
router.get('/users',
  authenticateToken(),
  requirePermission(['USER_MANAGEMENT', 'ROLE_MANAGEMENT']),
  async (req, res) => {
    try {
      const users = await prisma.person.findMany({
        where: {
          status: 'ACTIVE'
        },
        include: {
          personRoles: {
            where: {},
            include: {
              permissions: {
                where: {
                  isGranted: true
                }
              },
              advancedPermissions: true,
              company: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          company: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const formattedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        company: user.company,
        roles: user.personRoles.map(personRole => ({
          id: personRole.id,
          roleType: personRole.roleType,
          company: personRole.company,
          assignedAt: personRole.assignedAt,
          validUntil: personRole.validUntil,
          isPrimary: personRole.isPrimary,
          permissions: personRole.permissions.map(p => p.permission),
          advancedPermissions: personRole.advancedPermissions
        }))
      }));

      res.json({
        success: true,
        data: formattedUsers
      });
    } catch (error) {
      logger.error('Failed to fetch users', {
        component: 'settings-routes',
        action: 'getUsers',
        error: error.message,
        stack: error.stack,
        personId: req.person?.id
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users'
      });
    }
  }
);

export default router;