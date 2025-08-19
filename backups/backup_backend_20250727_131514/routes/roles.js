import express from 'express';
const router = express.Router();
import enhancedRoleService from '../services/enhancedRoleService.js';
import { tenantMiddleware, validateUserTenant } from '../middleware/tenant.js';
import { authenticate } from '../auth/middleware.js';
import { PrismaClient } from '@prisma/client';
import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

// Enum PersonPermission validi (sincronizzato con schema.prisma)
const VALID_PERSON_PERMISSIONS = [
  'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
  'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
  'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
  'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
  'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
  'MANAGE_ENROLLMENTS', 'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS',
  'DOWNLOAD_DOCUMENTS', 'ADMIN_PANEL', 'SYSTEM_SETTINGS', 'USER_MANAGEMENT',
  // Permessi per la gestione dei ruoli
  'ROLE_MANAGEMENT', 'ROLE_CREATE', 'ROLE_EDIT', 'ROLE_DELETE', 'VIEW_ROLES', 'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES',
  // Permessi per la gestione della gerarchia
  'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'EDIT_HIERARCHY', 'DELETE_HIERARCHY', 'MANAGE_HIERARCHY',
  // Permessi per la gestione degli utenti (aggiuntivi)
  'MANAGE_USERS', 'ASSIGN_ROLES', 'REVOKE_ROLES',
  // Permessi per la gestione dei tenant
  'TENANT_MANAGEMENT', 'VIEW_TENANTS', 'CREATE_TENANTS', 'EDIT_TENANTS', 'DELETE_TENANTS',
  // Permessi per l'amministrazione
  'VIEW_ADMINISTRATION', 'CREATE_ADMINISTRATION', 'EDIT_ADMINISTRATION', 'DELETE_ADMINISTRATION',
  // Permessi GDPR
  'VIEW_GDPR', 'CREATE_GDPR', 'EDIT_GDPR', 'DELETE_GDPR',
  'VIEW_GDPR_DATA', 'EXPORT_GDPR_DATA', 'DELETE_GDPR_DATA', 'MANAGE_CONSENTS',
  // Permessi per i report
  'VIEW_REPORTS', 'CREATE_REPORTS', 'EDIT_REPORTS', 'DELETE_REPORTS', 'EXPORT_REPORTS'
];

/**
 * Valida se un permissionId è valido secondo l'enum PersonPermission
 * @param {string} permissionId - Il permissionId da validare
 * @returns {boolean} - True se valido, false altrimenti
 */
function isValidPersonPermission(permissionId) {
  if (!permissionId || typeof permissionId !== 'string') {
    return false;
  }
  
  // Rimuovi spazi e converti in maiuscolo
  const cleanPermissionId = permissionId.trim().toUpperCase();
  
  // Verifica se è nell'enum
  return VALID_PERSON_PERMISSIONS.includes(cleanPermissionId);
}

/**
 * Filtra e valida i permessi, rimuovendo quelli non validi
 * @param {Array} permissions - Array di permessi da validare
 * @returns {Array} - Array di permessi validi
 */
function validateAndFilterPermissions(permissions) {
  if (!Array.isArray(permissions)) {
    return [];
  }
  
  return permissions.filter(perm => {
    if (!perm || !perm.permissionId) {
      logger.warn(`Permission without permissionId found: ${JSON.stringify(perm)}`);
      return false;
    }
    
    const isValid = isValidPersonPermission(perm.permissionId);
    if (!isValid) {
      logger.warn(`Invalid permission found and filtered out: ${perm.permissionId}`);
    }
    
    return isValid;
  });
}

// Log di debug per tutte le richieste al router roles
router.use((req, res, next) => {
  logger.info(`[ROLES_ROUTER] Request received: ${req.method} ${req.path}`);
  logger.info(`[ROLES_ROUTER] Full URL: ${req.originalUrl}`);
  logger.info(`[ROLES_ROUTER] Headers:`, req.headers);
  next();
});

// Estrai requirePermission dal servizio
const requirePermission = (permission) => enhancedRoleService.requirePermission(permission);

/**
 * Routes per la gestione dei ruoli avanzati
 * Week 12: Sistema Utenti Avanzato
 */

// Test endpoint per verificare autenticazione (senza middleware)
router.get('/test-no-auth', (req, res) => {
  res.json({
    success: true,
    message: 'Endpoint working without auth',
    headers: req.headers.authorization ? 'Token present' : 'No token'
  });
});

// Test endpoint per verificare autenticazione con middleware
router.get('/auth-test-debug', authenticate(), async (req, res) => {
  try {
    console.log('🔍 AUTH TEST DEBUG - Request received');
    console.log('🔍 AUTH TEST DEBUG - req.person:', !!req.person);
    console.log('🔍 AUTH TEST DEBUG - req.person.id:', req.person?.id);
    console.log('🔍 AUTH TEST DEBUG - req.person.tenantId:', req.person?.tenantId);
    
    res.json({
      success: true,
      message: 'Auth middleware test successful',
      data: {
        personId: req.person?.id,
        tenantId: req.person?.tenantId,
        hasAuth: !!req.person
      }
    });
  } catch (error) {
    console.error('🚨 AUTH TEST DEBUG ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Auth middleware test failed'
    });
  }
});

/**
 * ROLE HIERARCHY MANAGEMENT APIs
 * Gestione della gerarchia dei ruoli
 */

/**
 * @route GET /api/roles/hierarchy
 * @desc Ottiene la gerarchia completa dei ruoli
 * @access Authenticated
 */
router.get('/hierarchy',
  authenticate(),
  async (req, res) => {
    try {
      const tenantId = req.tenant?.id || req.person?.tenantId;
      
      // Importa il servizio di gerarchia (forza ricaricamento)
      const timestamp = Date.now();
      const roleHierarchyService = await import(`../services/roleHierarchyService.js?t=${timestamp}`);
      
      const hierarchy = await roleHierarchyService.default.getRoleHierarchy(tenantId);
      
      res.json({
        success: true,
        data: {
          hierarchy,
          totalLevels: Object.keys(hierarchy).length
        }
      });
    } catch (error) {
      console.error('[ROLES_API] Error getting role hierarchy:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get role hierarchy'
      });
    }
  }
);

/**
 * @route GET /api/roles/hierarchy/user/:userId
 * @desc Ottiene la gerarchia dei ruoli per un utente specifico
 * @access Authenticated
 */
router.get('/hierarchy/user/:userId',
  authenticate(),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const tenantId = req.tenant?.id || req.person?.tenantId;
      
      // Importa il servizio di gerarchia (forza ricaricamento)
      const timestamp = Date.now();
      const roleHierarchyService = await import(`../services/roleHierarchyService.js?t=${timestamp}`);
      
      // Ottieni i ruoli dell'utente
      const userRoles = await prisma.personRole.findMany({
        where: {
          personId: userId,
          tenantId: tenantId,
          isActive: true,
          deletedAt: null
        }
      });
      
      const userRoleTypes = userRoles.map(role => role.roleType);
      const userHierarchy = roleHierarchyService.default.getUserRoleHierarchy(userRoleTypes);
      const highestRole = roleHierarchyService.default.getHighestRole(userRoleTypes);
      const userLevel = roleHierarchyService.default.getRoleLevel(highestRole);
      const fullHierarchy = await roleHierarchyService.default.getRoleHierarchy(tenantId);
      
      res.json({
        success: true,
        data: {
          userId,
          userRoles: userRoleTypes,
          hierarchy: fullHierarchy,
          highestRole,
          userLevel,
          assignableRoles: roleHierarchyService.default.getAssignableRoles(highestRole),
          assignablePermissions: roleHierarchyService.default.getAssignablePermissions(highestRole)
        }
      });
    } catch (error) {
      console.error('[ROLES_API] Error getting user role hierarchy:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user role hierarchy'
      });
    }
  }
);

/**
 * @route GET /api/roles/hierarchy/current-user
 * @desc Ottiene la gerarchia dei ruoli per l'utente corrente
 * @access Authenticated
 */
router.get('/hierarchy/current-user',
  authenticate(),
  async (req, res) => {
    try {
      const userId = req.person?.id;
      const tenantId = req.tenant?.id || req.person?.tenantId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID not found'
        });
      }
      
      // Importa il servizio di gerarchia
      const roleHierarchyService = await import(`../services/roleHierarchyService.js?t=${Date.now()}`);
      
      // Ottieni i ruoli dell'utente corrente
      const userRoles = await prisma.personRole.findMany({
        where: {
          personId: userId,
          tenantId: tenantId,
          isActive: true,
          deletedAt: null
        }
      });
      
      const userRoleTypes = userRoles.map(role => role.roleType);
      const userHierarchy = roleHierarchyService.default.getUserRoleHierarchy(userRoleTypes);
      const highestRole = roleHierarchyService.default.getHighestRole(userRoleTypes);
      const userLevel = roleHierarchyService.default.getRoleLevel(highestRole);
      
      // DEBUG: Log dettagliato per il problema dei permessi
      const assignablePermissions = roleHierarchyService.default.getAllAssignablePermissions(highestRole);
      console.log('[DEBUG] Hierarchy endpoint - Highest role:', highestRole);
      console.log('[DEBUG] Hierarchy endpoint - Assignable permissions count:', assignablePermissions.length);
      console.log('[DEBUG] Hierarchy endpoint - Has CREATE_ROLES:', assignablePermissions.includes('CREATE_ROLES'));
      console.log('[DEBUG] Hierarchy endpoint - Has EDIT_ROLES:', assignablePermissions.includes('EDIT_ROLES'));
      console.log('[DEBUG] Hierarchy endpoint - Has DELETE_ROLES:', assignablePermissions.includes('DELETE_ROLES'));
      console.log('[DEBUG] Hierarchy endpoint - First 10 permissions:', assignablePermissions.slice(0, 10));
      
      res.json({
        success: true,
        data: {
          userId,
          userRoles: userRoleTypes,
          hierarchy: userHierarchy,
          highestRole,
          userLevel,
          assignableRoles: roleHierarchyService.default.getAssignableRoles(highestRole),
          assignablePermissions: assignablePermissions
        }
      });
    } catch (error) {
      console.error('[ROLES_API] Error getting current user role hierarchy:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get current user role hierarchy'
      });
    }
  }
);

/**
 * @route POST /api/roles/hierarchy/assign
 * @desc Assegna un ruolo con controllo gerarchico
 * @access Admin
 */
router.post('/hierarchy/assign',
  authenticate(),
  enhancedRoleService.requirePermission('ROLE_MANAGEMENT'),
  async (req, res) => {
    try {
      const { targetUserId, roleType } = req.body;
      const currentUserId = req.person?.id;
      const tenantId = req.tenant?.id || req.person?.tenantId;
      
      if (!targetUserId || !roleType) {
        return res.status(400).json({
          success: false,
          error: 'Target user ID and role type are required'
        });
      }
      
      // Importa il servizio di gerarchia
      const roleHierarchyService = await import(`../services/roleHierarchyService.js?t=${Date.now()}`);
      
      // Ottieni i ruoli dell'utente corrente
      const currentUserRoles = await prisma.personRole.findMany({
        where: {
          personId: currentUserId,
          tenantId: tenantId,
          isActive: true,
          deletedAt: null
        }
      });
      
      const currentUserRoleTypes = currentUserRoles.map(role => role.roleType);
      const currentUserHighestRole = roleHierarchyService.default.getHighestRole(currentUserRoleTypes);
      
      // Verifica se l'utente corrente può assegnare questo ruolo
      const canAssign = roleHierarchyService.default.canAssignToRole(currentUserHighestRole, roleType);
      
      if (!canAssign) {
        return res.status(403).json({
          success: false,
          error: `You don't have permission to assign role ${roleType}. Your highest role: ${currentUserHighestRole}`
        });
      }
      
      // Assegna il ruolo
      const result = await roleHierarchyService.default.assignRoleWithHierarchy(
        targetUserId,
        roleType,
        currentUserHighestRole,
        tenantId
      );
      
      res.json({
        success: true,
        data: result,
        message: `Role ${roleType} assigned successfully to user ${targetUserId}`
      });
    } catch (error) {
      console.error('[ROLES_API] Error assigning role with hierarchy:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to assign role with hierarchy'
      });
    }
  }
);

/**
 * @route POST /api/roles/hierarchy/assign-permissions
 * @desc Assegna permessi con controllo gerarchico
 * @access Admin
 */
router.post('/hierarchy/assign-permissions',
  authenticate(),
  enhancedRoleService.requirePermission('ROLE_MANAGEMENT'),
  async (req, res) => {
    try {
      const { targetUserId, permissions } = req.body;
      const currentUserId = req.person?.id;
      const tenantId = req.tenant?.id || req.person?.tenantId;
      
      if (!targetUserId || !Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          error: 'Target user ID and permissions array are required'
        });
      }
      
      // Importa il servizio di gerarchia
      const roleHierarchyService = await import(`../services/roleHierarchyService.js?t=${Date.now()}`);
      
      // Ottieni i ruoli dell'utente corrente
      const currentUserRoles = await prisma.personRole.findMany({
        where: {
          personId: currentUserId,
          tenantId: tenantId,
          isActive: true,
          deletedAt: null
        }
      });
      
      const currentUserRoleTypes = currentUserRoles.map(role => role.roleType);
      const currentUserHighestRole = roleHierarchyService.default.getHighestRole(currentUserRoleTypes);
      
      // Assegna i permessi con controllo gerarchico
      const result = await roleHierarchyService.default.assignPermissionsWithHierarchy(
        targetUserId,
        permissions,
        currentUserHighestRole,
        tenantId
      );
      
      res.json({
        success: true,
        data: result,
        message: `Permissions assigned successfully to user ${targetUserId}`
      });
    } catch (error) {
      console.error('[ROLES_API] Error assigning permissions with hierarchy:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to assign permissions with hierarchy'
      });
    }
  }
);

/**
 * @route GET /api/roles/hierarchy/assignable/:roleType
 * @desc Ottiene i ruoli e permessi assegnabili per un ruolo specifico
 * @access Authenticated
 */
router.get('/hierarchy/assignable/:roleType',
  authenticate(),
  async (req, res) => {
    try {
      const { roleType } = req.params;
      
      // Importa il servizio di gerarchia
      const roleHierarchyService = await import(`../services/roleHierarchyService.js?t=${Date.now()}`);
      
      const assignableRoles = roleHierarchyService.default.getAssignableRoles(roleType);
      const assignablePermissions = roleHierarchyService.default.getAssignablePermissions(roleType);
      const roleLevel = roleHierarchyService.default.getRoleLevel(roleType);
      
      res.json({
        success: true,
        data: {
          roleType,
          roleLevel,
          assignableRoles,
          assignablePermissions
        }
      });
    } catch (error) {
      console.error('[ROLES_API] Error getting assignable roles and permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get assignable roles and permissions'
      });
    }
  }
);

// Middleware di autenticazione rimosso dal livello globale
// Ora viene applicato individualmente a ogni route che ne ha bisogno

// Test endpoint per verificare autenticazione
router.get('/test-auth', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication working',
    user: {
      id: req.person?.id,
      email: req.person?.email,
      tenantId: req.person?.tenantId,
      roles: req.person?.roles
    },
    tenant: {
      id: req.tenant?.id,
      name: req.tenant?.name
    }
  });
});

// Middleware del tenant solo per le routes che lo richiedono
// Applicato individualmente a ogni route che ne ha bisogno

/**
 * @route GET /api/roles
 * @desc Lista tutti i ruoli disponibili per il tenant con gestione granulare
 * @access Authenticated
 */
router.get('/', authenticate(), tenantMiddleware, async (req, res) => {
  try {
    console.log('🔍 ROLES ENDPOINT - Request received');
    console.log('🔍 ROLES ENDPOINT - req.person:', !!req.person);
    console.log('🔍 ROLES ENDPOINT - req.tenant:', !!req.tenant);
    console.log('🔍 ROLES ENDPOINT - req.headers.authorization:', !!req.headers.authorization);
    
    const tenantId = req.tenant?.id || req.person?.tenantId;
    console.log('🔍 ROLES ENDPOINT - tenantId:', tenantId);
    
    if (!tenantId) {
      console.log('🔍 ROLES ENDPOINT - No tenant ID found');
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required'
      });
    }
    
    console.log('🔍 ROLES ENDPOINT - Starting database queries...');
    
    const { active_only = 'false' } = req.query;

    // Ottieni tutti i ruoli dal database per il tenant
    const roleStats = {};
    
    console.log('🔍 ROLES ENDPOINT - Querying personRole...');
    
    // Query semplificata per debug
    const allRoles = await prisma.personRole.findMany({
      where: {
        isActive: true
      },
      include: {
        person: true
      }
    });

    console.log('🔍 ROLES ENDPOINT - Found allRoles:', allRoles.length);

    console.log('🔍 ROLES ENDPOINT - Querying customRole...');
    
    // Ottieni i ruoli personalizzati dal database
    const customRoles = await prisma.customRole.findMany({
      where: {tenantId: tenantId,},
      include: {
        permissions: true
      }
    });

    console.log('🔍 ROLES ENDPOINT - Found customRoles:', customRoles.length);
    console.log('🔍 ROLES ENDPOINT - Processing roles...');

    allRoles.forEach(role => {
      // Controllo di sicurezza per roleType
      if (!role.roleType || typeof role.roleType !== 'string') {
        console.warn('🚨 ROLES ENDPOINT - Invalid roleType found:', role.roleType);
        return;
      }
      
      if (!roleStats[role.roleType]) {
        roleStats[role.roleType] = {
          id: role.roleType,
          type: role.roleType,
          name: role.roleType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
          description: `Ruolo ${role.roleType.replace('_', ' ').toLowerCase()}`,
          userCount: 0,
          users: [],
          isActive: false,
          isSystemRole: true,
          permissions: [],
          tenantAccess: 'ALL' // Default per ruoli di sistema
        };
      }
      roleStats[role.roleType].userCount++;
      roleStats[role.roleType].users.push(role.person);
      if (role.isActive) {
        roleStats[role.roleType].isActive = true;
      }
    });

    // Aggiungi ruoli personalizzati
    customRoles.forEach(customRole => {
      const roleKey = `CUSTOM_${customRole.id}`;
      roleStats[roleKey] = {
        id: customRole.id,
        type: roleKey,
        name: customRole.name,
        description: customRole.description,
        userCount: 0, // Sarà calcolato dai personRole
        users: [],
        isActive: customRole.isActive,
        isSystemRole: false,
        permissions: customRole.permissions.map(p => p.permission),
        tenantAccess: customRole.tenantAccess || 'SPECIFIC'
      };
    });

    // Aggiungi tutti i tipi di ruolo di sistema disponibili anche se non hanno utenti
    // Using enhancedRoleService.constructor.ROLE_TYPES
        console.log('🔍 ROLES ENDPOINT - enhancedRoleService.constructor.ROLE_TYPES:', enhancedRoleService.constructor.ROLE_TYPES);
        console.log('🔍 ROLES ENDPOINT - typeof enhancedRoleService.constructor.ROLE_TYPES:', typeof enhancedRoleService.constructor.ROLE_TYPES);
        
        Object.keys(enhancedRoleService.constructor.ROLE_TYPES || {}).forEach(roleType => {
      // Controllo di sicurezza per roleType
      if (!roleType || typeof roleType !== 'string') {
        console.warn('🚨 ROLES ENDPOINT - Invalid system roleType found:', roleType);
        return;
      }
      
      if (!roleStats[roleType]) {
        roleStats[roleType] = {
          id: roleType,
          type: roleType,
          name: roleType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
          description: `Ruolo ${roleType.replace('_', ' ').toLowerCase()}`,
          userCount: 0,
          users: [],
          isActive: false,
          isSystemRole: true,
          permissions: [],
          tenantAccess: 'ALL'
        };
      }
    });

    // Filtra i ruoli in base al parametro active_only se richiesto
    let filteredRoles = Object.values(roleStats);
    if (active_only === 'true') {
      filteredRoles = filteredRoles.filter(role => role.isActive);
    }

    res.json({
      success: true,
      data: {
        roles: filteredRoles,
        totalRoles: filteredRoles.length,
        totalUsers: allRoles.filter(role => active_only === 'true' ? role.isActive : true).length
      }
    });
  } catch (error) {
    console.error('🚨 ROLES ENDPOINT ERROR:', error);
    console.error('🚨 ROLES ENDPOINT ERROR STACK:', error.stack);
    console.error('🚨 ROLES ENDPOINT ERROR MESSAGE:', error.message);
    console.error('🚨 ROLES ENDPOINT ERROR NAME:', error.name);
    res.status(500).json({
      success: false,
      error: 'Failed to list roles'
    });
  }
});

/**
 * @route GET /api/roles/permissions
 * @desc Lista tutte le permissioni disponibili raggruppate per categoria
 * @access Authenticated
 */
router.get('/permissions', tenantMiddleware, authenticate(), validateUserTenant, async (req, res) => {
  try {
    // Using EnhancedRoleService.PERMISSIONS
    
    // Raggruppa i permessi per categoria con descrizioni dettagliate
    const groupedPermissions = {
      companies: {
        label: 'Gestione Aziende',
        description: 'Permessi per la gestione delle aziende clienti',
        permissions: [
          { key: 'VIEW_COMPANIES', label: 'Visualizza Aziende', description: 'Può visualizzare l\'elenco delle aziende' },
          { key: 'CREATE_COMPANIES', label: 'Crea Aziende', description: 'Può creare nuove aziende' },
          { key: 'EDIT_COMPANIES', label: 'Modifica Aziende', description: 'Può modificare i dati delle aziende' },
          { key: 'DELETE_COMPANIES', label: 'Elimina Aziende', description: 'Può eliminare aziende' }
        ]
      },
      employees: {
        label: 'Gestione Dipendenti',
        description: 'Permessi per la gestione dei dipendenti delle aziende',
        permissions: [
          { key: 'VIEW_EMPLOYEES', label: 'Visualizza Dipendenti', description: 'Può visualizzare l\'elenco dei dipendenti' },
          { key: 'CREATE_EMPLOYEES', label: 'Crea Dipendenti', description: 'Può aggiungere nuovi dipendenti' },
          { key: 'EDIT_EMPLOYEES', label: 'Modifica Dipendenti', description: 'Può modificare i dati dei dipendenti' },
          { key: 'DELETE_EMPLOYEES', label: 'Elimina Dipendenti', description: 'Può eliminare dipendenti' }
        ]
      },
      trainers: {
        label: 'Gestione Formatori',
        description: 'Permessi per la gestione dei formatori',
        permissions: [
          { key: 'VIEW_TRAINERS', label: 'Visualizza Formatori', description: 'Può visualizzare l\'elenco dei formatori' },
          { key: 'CREATE_TRAINERS', label: 'Crea Formatori', description: 'Può aggiungere nuovi formatori' },
          { key: 'EDIT_TRAINERS', label: 'Modifica Formatori', description: 'Può modificare i dati dei formatori' },
          { key: 'DELETE_TRAINERS', label: 'Elimina Formatori', description: 'Può eliminare formatori' }
        ]
      },
      users: {
        label: 'Gestione Utenti',
        description: 'Permessi per la gestione degli utenti del sistema',
        permissions: [
          { key: 'VIEW_USERS', label: 'Visualizza Utenti', description: 'Può visualizzare l\'elenco degli utenti' },
          { key: 'CREATE_USERS', label: 'Crea Utenti', description: 'Può creare nuovi utenti' },
          { key: 'EDIT_USERS', label: 'Modifica Utenti', description: 'Può modificare i dati degli utenti' },
          { key: 'DELETE_USERS', label: 'Elimina Utenti', description: 'Può eliminare utenti' }
        ]
      },
      courses: {
        label: 'Gestione Corsi',
        description: 'Permessi per la gestione dei corsi di formazione',
        permissions: [
          { key: 'VIEW_COURSES', label: 'Visualizza Corsi', description: 'Può visualizzare l\'elenco dei corsi' },
          { key: 'CREATE_COURSES', label: 'Crea Corsi', description: 'Può creare nuovi corsi' },
          { key: 'EDIT_COURSES', label: 'Modifica Corsi', description: 'Può modificare i corsi esistenti' },
          { key: 'DELETE_COURSES', label: 'Elimina Corsi', description: 'Può eliminare corsi' },
          { key: 'MANAGE_ENROLLMENTS', label: 'Gestisci Iscrizioni', description: 'Può gestire le iscrizioni ai corsi' }
        ]
      },
      documents: {
        label: 'Gestione Documenti',
        description: 'Permessi per la gestione dei documenti',
        permissions: [
          { key: 'VIEW_DOCUMENTS', label: 'Visualizza Documenti', description: 'Può visualizzare l\'elenco dei documenti' },
          { key: 'CREATE_DOCUMENTS', label: 'Crea Documenti', description: 'Può creare nuovi documenti' },
          { key: 'EDIT_DOCUMENTS', label: 'Modifica Documenti', description: 'Può modificare documenti esistenti' },
          { key: 'DELETE_DOCUMENTS', label: 'Elimina Documenti', description: 'Può eliminare documenti' },
          { key: 'DOWNLOAD_DOCUMENTS', label: 'Scarica Documenti', description: 'Può scaricare documenti' }
        ]
      },
      administration: {
        label: 'Amministrazione',
        description: 'Permessi amministrativi del sistema',
        permissions: [
          { key: 'ADMIN_PANEL', label: 'Pannello Admin', description: 'Può accedere al pannello di amministrazione' },
          { key: 'SYSTEM_SETTINGS', label: 'Impostazioni Sistema', description: 'Può modificare le impostazioni del sistema' },
          { key: 'USER_MANAGEMENT', label: 'Gestione Utenti', description: 'Può gestire gli utenti del sistema' },
          { key: 'ROLE_MANAGEMENT', label: 'Gestione Ruoli', description: 'Può gestire i ruoli e i permessi' },
          { key: 'TENANT_MANAGEMENT', label: 'Gestione Tenant', description: 'Può gestire i tenant del sistema' }
        ]
      },
      gdpr: {
        label: 'GDPR e Privacy',
        description: 'Permessi per la gestione della privacy e conformità GDPR',
        permissions: [
          { key: 'VIEW_GDPR_DATA', label: 'Visualizza Dati GDPR', description: 'Può visualizzare i dati relativi al GDPR' },
          { key: 'EXPORT_GDPR_DATA', label: 'Esporta Dati GDPR', description: 'Può esportare i dati per conformità GDPR' },
          { key: 'DELETE_GDPR_DATA', label: 'Elimina Dati GDPR', description: 'Può eliminare dati per diritto all\'oblio' },
          { key: 'MANAGE_CONSENTS', label: 'Gestisci Consensi', description: 'Può gestire i consensi degli utenti' }
        ]
      },
      reports: {
        label: 'Report e Analytics',
        description: 'Permessi per la gestione dei report',
        permissions: [
          { key: 'VIEW_REPORTS', label: 'Visualizza Report', description: 'Può visualizzare i report del sistema' },
          { key: 'CREATE_REPORTS', label: 'Crea Report', description: 'Può creare nuovi report' },
          { key: 'EXPORT_REPORTS', label: 'Esporta Report', description: 'Può esportare i report' }
        ]
      }
    };

    // Ottieni anche i tenant disponibili per la gestione granulare
    const tenants = await prisma.tenant.findMany({
      where: {},
      select: {
        id: true,
        name: true,
        slug: true
      }
    });

    // Ottieni le aziende per il tenant corrente
    const companies = await prisma.company.findMany({
      where: {
        tenantId: req.tenant?.id
      },
      select: {
        id: true,
        ragioneSociale: true
      }
    });

    const totalPermissions = Object.values(groupedPermissions)
      .reduce((total, category) => total + category.permissions.length, 0);

    res.json({
      success: true,
      data: {
        permissions: groupedPermissions,
        tenants,
        companies,
        totalPermissions,
        scopes: [
          { key: 'global', label: 'Globale', description: 'Accesso a tutti i dati' },
          { key: 'tenant', label: 'Tenant', description: 'Accesso limitato al tenant' },
          { key: 'company', label: 'Azienda', description: 'Accesso limitato a specifiche aziende' },
          { key: 'department', label: 'Dipartimento', description: 'Accesso limitato a specifici dipartimenti' }
        ],
        tenantAccessLevels: [
          { key: 'ALL', label: 'Tutti i Tenant', description: 'Accesso a tutti i tenant del sistema' },
          { key: 'SPECIFIC', label: 'Tenant Specifico', description: 'Accesso solo al tenant corrente' },
          { key: 'NONE', label: 'Nessun Accesso', description: 'Nessun accesso ai dati del tenant' }
        ]
      }
    });
  } catch (error) {
    console.error('[ROLES_API] Error listing permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list permissions'
    });
  }
});

/**
 * @route GET /api/roles/users
 * @desc Lista utenti per ruolo
 * @access Admin
 */
router.get('/users', 
  authenticate(),
  enhancedRoleService.requirePermission('users.read'),
  async (req, res) => {
    try {
      const tenantId = req.tenant.id;
      const { role_type, company_id, department_id, page = 1, limit = 20 } = req.query;

      if (!role_type) {
        return res.status(400).json({
          success: false,
          error: 'Role type is required'
        });
      }

      const filters = { tenantId };
      if (company_id) filters.companyId = company_id;
      if (department_id) filters.departmentId = department_id;

      const result = await enhancedRoleService.getUsersByRole(
        role_type,
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('[ROLES_API] Error getting users by role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get users by role'
      });
    }
  }
);

/**
 * @route GET /api/roles/stats
 * @desc Statistiche sui ruoli del tenant
 * @access Admin
 */
router.get('/stats',
  authenticate(),
  enhancedRoleService.requirePermission('analytics.read'),
  async (req, res) => {
    try {
      const tenantId = req.tenant.id;
      const stats = await enhancedRoleService.getRoleStatistics(tenantId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('[ROLES_API] Error getting role statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get role statistics'
      });
    }
  }
);

/**
 * @route POST /api/roles/assign
 * @desc Assegna un ruolo a un utente
 * @access Admin with user management permissions
 */
router.post('/assign',
  authenticate(),
  enhancedRoleService.requirePermission('users.manage_roles'),
  async (req, res) => {
    try {
      const tenantId = req.tenant.id;
      const { personId, roleType, companyId, departmentId, expiresAt, customPermissions } = req.body;

      // Validazione input
      if (!personId || !roleType) {
        return res.status(400).json({
          success: false,
          error: 'Person ID and role type are required'
        });
      }

      // Verifica che il tipo di ruolo esista
      // Using local ROLE_TYPES
      if (!enhancedRoleService.constructor.ROLE_TYPES[roleType]) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role type'
        });
      }

      // Verifica che l'utente appartenga al tenant
      // Questo dovrebbe essere fatto tramite una query al database
      // Per ora assumiamo che sia valido se passa il middleware

      const role = await enhancedRoleService.assignRole(personId, tenantId, roleType, {
        companyId,
        departmentId,
        assignedBy: req.person.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        customPermissions
      });

      res.status(201).json({
        success: true,
        data: role,
        message: 'Role assigned successfully'
      });
    } catch (error) {
      console.error('[ROLES_API] Error assigning role:', error);
      
      if (error.message.includes('already has role')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to assign role'
      });
    }
  }
);

/**
 * @route DELETE /api/roles/remove
 * @desc Rimuove un ruolo da un utente
 * @access Admin with user management permissions
 */
router.delete('/remove',
  authenticate(),
  enhancedRoleService.requirePermission('users.manage_roles'),
  async (req, res) => {
    try {
      const tenantId = req.tenant.id;
      const { personId, roleType, customRoleId, companyId } = req.body;

      if (!personId || (!roleType && !customRoleId)) {
        return res.status(400).json({
          success: false,
          error: 'Person ID and either role type or custom role ID are required'
        });
      }

      // Trova e rimuovi il ruolo
      const whereClause = {
        personId,
        tenantId,
        companyId: companyId || null
      };

      if (customRoleId) {
        whereClause.customRoleId = customRoleId;
      } else {
        whereClause.roleType = roleType;
      }

      const deletedRole = await prisma.personRole.deleteMany({
        where: whereClause
      });

      if (deletedRole.count === 0) {
        return res.status(404).json({
          success: false,
          error: 'Role assignment not found'
        });
      }

      res.json({
        success: true,
        message: 'Role removed successfully',
        data: {
          removedCount: deletedRole.count
        }
      });
    } catch (error) {
      console.error('[ROLES_API] Error removing role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove role'
      });
    }
  }
);

/**
 * @route POST /api/roles/custom
 * @desc Crea un nuovo ruolo personalizzato
 * @access Requires ROLE_MANAGEMENT permission
 */
router.post('/custom', authenticate(), requirePermission('ROLE_MANAGEMENT'), async (req, res) => {
    try {
      const { name, description, permissions = [], tenantAccess = 'SPECIFIC' } = req.body;
      const tenantId = req.tenant.id;
      const createdBy = req.person.id;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Role name is required'
        });
      }

      // Verifica che il nome del ruolo non esista già
      const existingRole = await prisma.customRole.findFirst({
        where: {
          tenantId,
          name
        }
      });

      if (existingRole) {
        return res.status(400).json({
          success: false,
          error: 'A role with this name already exists'
        });
      }

      // Crea il ruolo personalizzato
      const customRole = await prisma.customRole.create({
        data: {
          name,
          description,
          tenantId,
          tenantAccess,
          createdBy,
          permissions: {
            create: permissions.map(perm => ({
              permission: perm.permission,
              resource: perm.resource,
              scope: perm.scope || 'global',
              conditions: perm.conditions,
              allowedFields: perm.allowedFields
            }))
          }
        },
        include: {
          permissions: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'Custom role created successfully',
        data: customRole
      });
    } catch (error) {
      console.error('[ROLES_API] Error creating custom role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create custom role'
      });
    }
  }
);

/**
 * @route PUT /api/roles/custom/:id
 * @desc Aggiorna un ruolo personalizzato
 * @access Requires ROLE_MANAGEMENT permission
 */
router.put('/custom/:id', authenticate(), requirePermission('ROLE_MANAGEMENT'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, permissions = [], tenantAccess, isActive } = req.body;
      const tenantId = req.tenant.id;

      // Verifica che il ruolo esista e appartenga al tenant
      const existingRole = await prisma.customRole.findFirst({
        where: {
          id,
          tenantId
        }
      });

      if (!existingRole) {
        return res.status(404).json({
          success: false,
          error: 'Custom role not found'
        });
      }

      // Se il nome è cambiato, verifica che non esista già
      if (name && name !== existingRole.name) {
        const nameExists = await prisma.customRole.findFirst({
          where: {
            tenantId,
            name,
            id: { not: id }
          }
        });

        if (nameExists) {
          return res.status(400).json({
            success: false,
            error: 'A role with this name already exists'
          });
        }
      }

      // Aggiorna il ruolo in una transazione
      const updatedRole = await prisma.$transaction(async (tx) => {
        // Elimina i permessi esistenti
        await tx.customRolePermission.deleteMany({
          where: { customRoleId: id }
        });

        // Aggiorna il ruolo
        return await tx.customRole.update({
          where: { id },
          data: {
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(tenantAccess && { tenantAccess }),
            ...(isActive !== undefined && { isActive }),
            permissions: {
              create: permissions.map(perm => ({
                permission: perm.permission,
                resource: perm.resource,
                scope: perm.scope || 'global',
                conditions: perm.conditions,
                allowedFields: perm.allowedFields
              }))
            }
          },
          include: {
            permissions: true
          }
        });
      });

      res.json({
        success: true,
        message: 'Custom role updated successfully',
        data: updatedRole
      });
    } catch (error) {
      console.error('[ROLES_API] Error updating custom role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update custom role'
      });
    }
  }
);

/**
 * @route DELETE /api/roles/custom/:id
 * @desc Elimina un ruolo personalizzato
 * @access Requires ROLE_MANAGEMENT permission
 */
router.delete('/custom/:id', authenticate(), requirePermission('ROLE_MANAGEMENT'), async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.tenant.id;

      // Verifica che il ruolo esista e appartenga al tenant
      const existingRole = await prisma.customRole.findFirst({
        where: {id,
          tenantId,}
      });

      if (!existingRole) {
        return res.status(404).json({
          success: false,
          error: 'Custom role not found'
        });
      }

      // Verifica se ci sono utenti con questo ruolo
      const usersWithRole = await prisma.personRole.count({
        where: {customRoleId: id,}
      });

      if (usersWithRole > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete role: ${usersWithRole} users are currently assigned to this role`
        });
      }

      // Soft delete del ruolo
      await prisma.customRole.update({
        where: { id },
        data: {
          isActive: false
        }
      });

      res.json({
        success: true,
        message: 'Custom role deleted successfully'
      });
    } catch (error) {
      console.error('[ROLES_API] Error deleting custom role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete custom role'
      });
    }
  }
);



/**
 * @route GET /api/roles/user/:personId
 * @desc Ottiene tutti i ruoli di una persona specifica
 * @access Admin or Self
 */
router.get('/user/:personId', authenticate(), async (req, res) => {
  try {
    const { personId } = req.params;
    const tenantId = req.tenant.id;
    const currentUser = req.person;

    // Verifica permessi: può vedere i propri ruoli o essere admin
    const canView = currentUser.id === personId || 
      await enhancedRoleService.hasPermission(currentUser.id, 'users.read', { tenantId });

    if (!canView) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const [roles, permissions] = await Promise.all([
      enhancedRoleService.getUserRoles(personId, tenantId),
      enhancedRoleService.getUserPermissions(personId, tenantId)
    ]);

    res.json({
      success: true,
      data: {
        personId,
        roles,
        permissions,
        effectivePermissions: permissions.map(p => p.permission)
      }
    });
  } catch (error) {
    console.error('[ROLES_API] Error getting user roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user roles'
    });
  }
});

/**
 * @route PUT /api/roles/user/:personId/permissions
 * @desc Aggiorna le permissioni personalizzate di una persona
 * @access Admin with user management permissions
 */
router.put('/user/:personId/permissions',
  authenticate(),
  enhancedRoleService.requirePermission('users.manage_roles'),
  async (req, res) => {
    try {
      const { personId } = req.params;
      const tenantId = req.tenant.id;
      const { roleType, companyId, customPermissions } = req.body;

      if (!roleType) {
        return res.status(400).json({
          success: false,
          error: 'Role type is required'
        });
      }

      // Validazione permissioni personalizzate
      if (customPermissions) {
        const validPermissions = Object.keys(enhancedRoleService.constructor.PERMISSIONS);
        const invalidPermissions = customPermissions.filter(p => !validPermissions.includes(p));
        
        if (invalidPermissions.length > 0) {
          return res.status(400).json({
            success: false,
            error: `Invalid permissions: ${invalidPermissions.join(', ')}`
          });
        }
      }

      const success = await enhancedRoleService.updateRolePermissions(
        personId,
        tenantId,
        roleType,
        companyId || null,
        customPermissions || []
      );

      if (success) {
        res.json({
          success: true,
          message: 'Permissions updated successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Role assignment not found'
        });
      }
    } catch (error) {
      console.error('[ROLES_API] Error updating permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update permissions'
      });
    }
  }
);

/**
 * @route POST /api/roles
 * @desc Crea un nuovo ruolo personalizzato nella gerarchia
 * @access Admin
 */
router.post('/',
  authenticate(),
  enhancedRoleService.requirePermission('ROLE_MANAGEMENT'),
  async (req, res) => {
    try {
      const { name, description, permissions, level, parentRoleType } = req.body;
      const tenantId = req.tenant?.id || req.person?.tenantId;
      const userId = req.person?.id;

      console.log('🔄 Creating new role:', { name, description, level, parentRoleType, tenantId, userId });

      // Valida i dati di input
      if (!name || !description) {
        return res.status(400).json({
          success: false,
          error: 'Name and description are required'
        });
      }

      if (level === undefined || level < 1 || level > 6) {
        return res.status(400).json({
          success: false,
          error: 'Level must be between 1 and 6'
        });
      }

      // Importa il servizio di gerarchia
      const roleHierarchyService = await import(`../services/roleHierarchyService.js?t=${Date.now()}`);

      // Crea il tipo di ruolo personalizzato
      const roleType = name.toUpperCase().replace(/\s+/g, '_');

      // Verifica che il ruolo non esista già nella gerarchia
      const existingRole = await roleHierarchyService.default.getRoleHierarchy(tenantId);
      if (existingRole && existingRole[roleType]) {
        return res.status(409).json({
          success: false,
          error: 'Role type already exists in hierarchy'
        });
      }

      // Aggiungi il ruolo alla gerarchia usando il servizio con i parametri corretti
      const createdRole = await roleHierarchyService.default.addRoleToHierarchy(
        roleType,
        name,
        description,
        parentRoleType || null,
        permissions || [],
        tenantId,
        userId
      );

      console.log('✅ Role created successfully:', createdRole);

      res.json({
        success: true,
        message: 'Role created successfully',
        data: {
          roleType,
          name,
          description,
          level: parseInt(level),
          parentRoleType: parentRoleType || null,
          permissions: permissions || [],
          userCount: 0,
          isActive: true
        }
      });
    } catch (error) {
      console.error('[ROLES_API] Error creating role:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create role'
      });
    }
  }
);

/**
 * @route GET /api/roles/:roleType
 * @desc Ottiene informazioni dettagliate su un ruolo specifico
 * @access Authenticated
 */
router.get('/:roleType', authenticate(), async (req, res) => {
  try {
    const { roleType } = req.params;
    const tenantId = req.tenant?.id;

    console.log(`🔍 Getting role info for: ${roleType}`);
    console.log(`🔍 Tenant ID: ${tenantId}`);

    // Verifica che il ruolo esista
    // Using local ROLE_TYPES
    if (!enhancedRoleService.constructor.ROLE_TYPES || !enhancedRoleService.constructor.ROLE_TYPES[roleType]) {
      console.log(`❌ Role type ${roleType} not found in ROLE_TYPES`);
      return res.status(404).json({
        success: false,
        error: 'Role type not found'
      });
    }

    // Ottieni statistiche del ruolo
    const roleStats = await prisma.personRole.findMany({
      where: {roleType,
        tenantId,},
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true
          }
        }
      }
    });

    const roleInfo = {
      id: roleType,
      type: roleType,
      name: roleType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      description: `Ruolo ${roleType.replace('_', ' ').toLowerCase()}`,
      userCount: roleStats.length,
      users: roleStats.map(role => role.person),
      isActive: roleStats.length > 0,
      isSystemRole: true,
      permissions: [], // TODO: implementare permessi specifici
      tenantAccess: 'ALL'
    };

    res.json({
      success: true,
      data: roleInfo
    });
  } catch (error) {
    console.error('[ROLES_API] Error getting role info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get role information'
    });
  }
});

/**
 * @route PUT /api/roles/:roleType
 * @desc Aggiorna un ruolo esistente
 * @access Admin
 */
router.put('/:roleType',
  authenticate(),
  enhancedRoleService.requirePermission('ROLE_MANAGEMENT'),
  async (req, res) => {
    try {
      const { roleType } = req.params;
      const { name, description, permissions } = req.body;
      const tenantId = req.tenant.id;

      // Valida i dati di input
      if (!name || !description) {
        return res.status(400).json({
          success: false,
          error: 'Name and description are required'
        });
      }

      // Verifica che il ruolo esista
      // Using local ROLE_TYPES
      if (!enhancedRoleService.constructor.ROLE_TYPES[roleType]) {
        return res.status(404).json({
          success: false,
          error: 'Role type not found'
        });
      }

      res.json({
        success: true,
        message: 'Role updated successfully',
        data: {
          type: roleType,
          name,
          description,
          permissions: permissions || []
        }
      });
    } catch (error) {
      console.error('[ROLES_API] Error updating role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update role'
      });
    }
  }
);

/**
 * @route GET /api/roles/:roleType/permissions
 * @desc Ottiene i permessi di un ruolo specifico
 * @access Admin
 */
router.get('/:roleType/permissions',
  authenticate(),
  validateUserTenant,
  enhancedRoleService.requirePermission('roles.read'),
  async (req, res) => {
    try {
      let { roleType } = req.params;
      const tenantId = req.tenant?.id;

      // Decodifica l'URL encoding per gestire caratteri speciali come &
      roleType = decodeURIComponent(roleType);

      console.log(`🔍 Getting permissions for role: ${roleType}`);
      console.log(`🔍 Tenant ID: ${tenantId}`);

      // Determina se è un ruolo personalizzato o di sistema
      const isCustomRole = roleType.startsWith('CUSTOM_');
      let isSystemRole = false;
      
      // Verifica se è un ruolo di sistema nell'enum RoleType
      if (!isCustomRole && enhancedRoleService.constructor.ROLE_TYPES && enhancedRoleService.constructor.ROLE_TYPES[roleType]) {
        isSystemRole = true;
      }
      
      // Se non è né custom (con prefisso CUSTOM_) né di sistema, potrebbe essere un ruolo personalizzato senza prefisso
      // Verifica se esiste nella tabella CustomRole
      let isCustomRoleInDB = false;
      let customRoleFromDB = null;
      if (!isCustomRole && !isSystemRole) {
        // Prima cerca per nome esatto (caso in cui il roleType sia già il nome del ruolo)
        customRoleFromDB = await prisma.customRole.findFirst({
          where: { 
            name: roleType,
            tenantId: tenantId,
            deletedAt: null 
          },
          include: {
            permissions: {
              where: {
                deletedAt: null
              }
            }
          }
        });
        
        // Se non trovato per nome esatto, cerca per roleType generato
        if (!customRoleFromDB) {
          // Il roleType potrebbe essere generato dal nome con .toUpperCase().replace(/\s+/g, '_')
          // Quindi cerchiamo un CustomRole il cui nome, quando trasformato, corrisponde al roleType
          const allCustomRoles = await prisma.customRole.findMany({
            where: { 
              tenantId: tenantId,
              deletedAt: null 
            },
            include: {
              permissions: {
                where: {
                  deletedAt: null
                }
              }
            }
          });
          
          customRoleFromDB = allCustomRoles.find(role => {
            const generatedRoleType = role.name.toUpperCase().replace(/\s+/g, '_');
            return generatedRoleType === roleType;
          });
        }
        
        if (customRoleFromDB) {
          isCustomRoleInDB = true;
          console.log(`🔍 Found custom role in database: ${roleType} (name: ${customRoleFromDB.name})`);
        }
      }
      
      // Se non è nessuno dei tipi sopra, verifica se esiste almeno un PersonRole
      // Ma solo se il roleType è valido nell'enum (per evitare errori Prisma)
      if (!isCustomRole && !isSystemRole && !isCustomRoleInDB) {
        try {
          const existingRole = await prisma.personRole.findFirst({
            where: { 
              roleType: roleType,
              tenantId: tenantId,
              deletedAt: null 
            }
          });
          
          if (!existingRole) {
            console.log(`❌ Role type ${roleType} not found anywhere`);
            return res.status(404).json({
              success: false,
              error: 'Role type not found'
            });
          }
        } catch (prismaError) {
          // Se la query Prisma fallisce (probabilmente perché il roleType non è nell'enum),
          // consideriamo il ruolo come non trovato
          console.log(`❌ Role type ${roleType} not valid in enum and not found in CustomRole`);
          return res.status(404).json({
            success: false,
            error: 'Role type not found'
          });
        }
      }

      // Determina se è un ruolo personalizzato o di sistema
      let permissions = [];
      
      if (isCustomRole) {
        // Per ruoli personalizzati con prefisso CUSTOM_, carica da CustomRolePermission
        const customRoleId = roleType.replace('CUSTOM_', '');
        const customRole = await prisma.customRole.findFirst({
          where: { 
            id: customRoleId,
            tenantId: tenantId,
            deletedAt: null 
          },
          include: {
            permissions: {
              where: {
                deletedAt: null
              }
            }
          }
        });
        
        if (customRole && customRole.permissions) {
          permissions = customRole.permissions.map(perm => ({
            permissionId: perm.permission,
            granted: true,
            scope: perm.scope || 'global',
            tenantIds: perm.conditions?.allowedTenants || [],
            fieldRestrictions: perm.allowedFields || []
          }));
        }
      } else if (isCustomRoleInDB) {
        // Per ruoli personalizzati senza prefisso CUSTOM_, usa il customRoleFromDB già trovato
        if (customRoleFromDB && customRoleFromDB.permissions) {
          permissions = customRoleFromDB.permissions.map(perm => ({
            permissionId: perm.permission,
            granted: true,
            scope: perm.scope || 'global',
            tenantIds: perm.conditions?.allowedTenants || [],
            fieldRestrictions: perm.allowedFields || []
          }));
        }
      } else {
        // Per ruoli di sistema, carica i permessi effettivi dal database
        console.log(`🔍 Loading actual permissions for system role: ${roleType}`);
        
        // Trova tutti i PersonRole per questo tipo di ruolo nel tenant
        const personRoles = await prisma.personRole.findMany({
          where: { 
            roleType: roleType,
            tenantId: tenantId
          },
          include: {
            permissions: true,
            advancedPermissions: true
          }
        });
        
        if (personRoles.length > 0) {
          // Usa i permessi del primo PersonRole trovato (dovrebbero essere tutti uguali per lo stesso roleType)
          const personRole = personRoles[0];
          const rolePermissions = personRole.permissions || [];
          const advancedPermissions = personRole.advancedPermissions || [];
          
          // Crea una mappa di tutti i permessi possibili
          let allPossiblePermissions = [];
          try {
            allPossiblePermissions = enhancedRoleService.constructor.getDefaultPermissions(roleType);
          } catch (error) {
            // Se il ruolo non è nell'enum, usa un set di permessi base
            console.log(`⚠️ Role ${roleType} not in enum, using base permissions`);
            allPossiblePermissions = [
              'VIEW_COMPANIES', 'VIEW_EMPLOYEES', 'VIEW_USERS', 'VIEW_COURSES',
              'VIEW_TRAINERS', 'VIEW_DOCUMENTS', 'VIEW_REPORTS'
            ];
          }
          const permissionsMap = {};
          
          // Inizializza tutti i permessi come non granted
          allPossiblePermissions.forEach(permission => {
            permissionsMap[permission] = {
              permissionId: permission,
              granted: false,
              scope: 'all',
              tenantIds: [],
              fieldRestrictions: []
            };
          });
          
          // Aggiorna con i permessi effettivamente granted dal database
          rolePermissions.forEach(perm => {
            if (perm.isGranted && permissionsMap[perm.permission]) {
              permissionsMap[perm.permission].granted = true;
            }
          });
          
          // Aggiorna con i permessi avanzati
          advancedPermissions.forEach(perm => {
            const permissionId = `${perm.action.toUpperCase()}_${perm.resource.toUpperCase()}`;
            if (permissionsMap[permissionId]) {
              permissionsMap[permissionId].granted = true;
              permissionsMap[permissionId].scope = perm.scope || 'all';
              permissionsMap[permissionId].tenantIds = perm.conditions?.allowedTenants || [];
              permissionsMap[permissionId].fieldRestrictions = perm.allowedFields || [];
              if (perm.conditions?.maxRoleLevel) {
                permissionsMap[permissionId].maxRoleLevel = perm.conditions.maxRoleLevel;
              }
            }
          });
          
          permissions = Object.values(permissionsMap);
        } else {
          // Se non ci sono PersonRole, usa i permessi di default
          console.log(`🔍 No PersonRole found, using default permissions for: ${roleType}`);
          let defaultPermissions = [];
          try {
            defaultPermissions = enhancedRoleService.constructor.getDefaultPermissions(roleType);
          } catch (error) {
            // Se il ruolo non è nell'enum, usa un set di permessi base
            console.log(`⚠️ Role ${roleType} not in enum, using base permissions`);
            defaultPermissions = [
              'VIEW_COMPANIES', 'VIEW_EMPLOYEES', 'VIEW_USERS', 'VIEW_COURSES',
              'VIEW_TRAINERS', 'VIEW_DOCUMENTS', 'VIEW_REPORTS'
            ];
          }
          permissions = defaultPermissions.map(permission => ({
            permissionId: permission,
            granted: true,
            scope: 'all',
            tenantIds: [],
            fieldRestrictions: []
          }));
        }
      }

      console.log(`✅ Permissions retrieved successfully for role: ${roleType}`);
      console.log(`📊 Found ${permissions.length} permissions`);

      res.json({
        success: true,
        data: {
          roleType,
          permissions,
          isCustomRole: isCustomRole || isCustomRoleInDB,
          tenantId
        }
      });
    } catch (error) {
      console.error('[ROLES_API] Error getting role permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get role permissions'
      });
    }
  }
);

/**
 * @route PUT /api/roles/:roleType/permissions
 * @desc Aggiorna i permessi di un ruolo specifico
 * @access Admin
 */
router.put('/:roleType/permissions',
  authenticate(),
  validateUserTenant,
  (req, res, next) => {
    logger.info('🔍 BEFORE requirePermission middleware - req.person:', !!req.person);
    logger.info('🔍 BEFORE requirePermission middleware - req.person.id:', req.person?.id);
    logger.info('🔍 BEFORE requirePermission middleware - req.tenantId:', req.tenantId);
    logger.info('🔍 BEFORE requirePermission middleware - req.tenant:', !!req.tenant);
    logger.info('🔍 BEFORE requirePermission middleware - roleType:', req.params.roleType);
    logger.info('🔍 BEFORE requirePermission middleware - method:', req.method);
    logger.info('🔍 BEFORE requirePermission middleware - url:', req.url);
    next();
  },
  requirePermission('ROLE_MANAGEMENT'),
  async (req, res) => {
    try {
      logger.info('🔍 INSIDE PUT /:roleType/permissions endpoint - START');
      const { roleType } = req.params;
      // Gestisce sia il formato array diretto che l'oggetto con proprietà permissions
      const permissions = Array.isArray(req.body) ? req.body : req.body.permissions;
      const tenantId = req.tenant?.id || req.person?.tenantId;

      logger.info(`🔧 Updating permissions for role: ${roleType}`);
      logger.info(`🔧 Tenant ID: ${tenantId}`);
      logger.info(`🔧 Permissions:`, permissions);

      // Validazione input
      if (!permissions || !Array.isArray(permissions)) {
        logger.error('❌ Permissions array is required');
        return res.status(400).json({
          success: false,
          error: 'Permissions array is required'
        });
      }

      // Validazione dei permissionId nel payload
      const invalidPermissions = permissions.filter(perm => 
        perm.granted && (!perm.permissionId || typeof perm.permissionId !== 'string' || perm.permissionId.trim() === '')
      );

      if (invalidPermissions.length > 0) {
        logger.warn(`Invalid permissionIds found:`, invalidPermissions.map(p => p.permissionId));
        return res.status(400).json({
          success: false,
          error: 'Invalid permission data: permissionId must be a non-empty string',
          invalidPermissions: invalidPermissions.map(p => ({ permissionId: p.permissionId }))
        });
      }

      // Validazione dei permissionId malformati (senza underscore) per ruoli di sistema
      const malformedPermissions = permissions.filter(perm => 
        perm.granted && 
        perm.permissionId && 
        typeof perm.permissionId === 'string' && 
        !perm.permissionId.includes('_')
      );

      if (malformedPermissions.length > 0) {
        logger.warn(`Malformed permissionIds found:`, malformedPermissions.map(p => p.permissionId));
        return res.status(400).json({
          success: false,
          error: 'Invalid permission format: permissionId must contain an underscore (e.g., VIEW_COMPANIES)',
          malformedPermissions: malformedPermissions.map(p => ({ permissionId: p.permissionId }))
        });
      }

      logger.info('✅ All validations passed, proceeding with role update');

      // Determina se è un ruolo personalizzato o di sistema
      const isCustomRole = roleType.startsWith('CUSTOM_');
      logger.info(`🔧 Role type: ${isCustomRole ? 'Custom' : 'System'}`);
      
      if (isCustomRole) {
        logger.info('🔧 Processing custom role...');
        try {
          // Per ruoli personalizzati, aggiorna CustomRolePermission
          const customRoleId = roleType.replace('CUSTOM_', '');
          const customRole = await prisma.customRole.findFirst({
            where: { 
              id: customRoleId,
              tenantId: tenantId,
              deletedAt: null 
            }
          });
          
          if (!customRole) {
            logger.error(`❌ Custom role not found: ${customRoleId}`);
            return res.status(404).json({ 
              success: false, 
              error: 'Custom role not found' 
            });
          }
          
          logger.info('🔧 Deleting existing custom role permissions...');
          // Elimina i permessi esistenti per questo ruolo
          await prisma.customRolePermission.deleteMany({
            where: { customRoleId: customRole.id }
          });
          
          logger.info('🔧 Creating new custom role permissions...');
          
          // Valida e filtra i permessi prima di crearli
          const validPermissions = validateAndFilterPermissions(permissions);
          logger.info(`🔧 Validated permissions: ${validPermissions.length}/${permissions.length} valid`);
          
          // Crea i nuovi permessi
          const permissionsToCreate = validPermissions
            .filter(perm => perm.granted)
            .map(perm => {
              // Normalizza il permissionId (rimuovi spazi e converti in maiuscolo)
              const normalizedPermissionId = perm.permissionId.trim().toUpperCase();

              // Costruisce le conditions basandosi su scope e parametri
              let conditions = null;
              
              if (perm.scope === 'hierarchy' && perm.maxRoleLevel) {
                // Per la gestione gerarchica dei ruoli
                conditions = { maxRoleLevel: perm.maxRoleLevel };
              } else if (perm.tenantIds && perm.tenantIds.length > 0) {
                // Per la gestione tenant-specific
                conditions = { allowedTenants: perm.tenantIds };
              } else if (perm.conditions) {
                // Se sono già presenti conditions specifiche
                conditions = perm.conditions;
              }

              return {
                customRoleId: customRole.id,
                permission: normalizedPermissionId,
                scope: perm.scope || 'global',
                conditions: conditions,
                allowedFields: perm.fieldRestrictions && perm.fieldRestrictions.length > 0 ? perm.fieldRestrictions : null
              };
            });
          
          if (permissionsToCreate.length > 0) {
            await prisma.customRolePermission.createMany({
              data: permissionsToCreate
            });
            logger.info(`✅ Created ${permissionsToCreate.length} custom role permissions`);
          }
        } catch (customRoleError) {
          logger.error('❌ Error processing custom role:', customRoleError);
          throw customRoleError;
        }
        
      } else {
        logger.info('🔧 Processing system role...');
        try {
          // Per ruoli di sistema, aggiorna direttamente i permessi per tutti i PersonRole esistenti
          const personRoles = await prisma.personRole.findMany({
            where: { 
              roleType: roleType,
              tenantId: tenantId,
              deletedAt: null 
            }
          });
          
          logger.info(`🔧 Found ${personRoles.length} person roles to update`);
          
          // Per ogni PersonRole, aggiorna i permessi
          for (const personRole of personRoles) {
            logger.info(`🔧 Processing person role: ${personRole.id}`);
            
            try {
              // Elimina i permessi esistenti
              logger.info('🔧 Deleting existing role permissions...');
              await prisma.rolePermission.deleteMany({
                where: { personRoleId: personRole.id }
              });
              
              logger.info('🔧 Deleting existing advanced permissions...');
              await prisma.advancedPermission.deleteMany({
                where: { personRoleId: personRole.id }
              });
              
              logger.info('🔧 Creating new role permissions...');
              
              // Valida e filtra i permessi prima di crearli
              logger.info(`🔧 Raw permissions received: ${JSON.stringify(permissions, null, 2)}`);
              const validPermissions = validateAndFilterPermissions(permissions);
              logger.info(`🔧 Validated permissions: ${validPermissions.length}/${permissions.length} valid`);
              logger.info(`🔧 Valid permissions details: ${JSON.stringify(validPermissions, null, 2)}`);
              
              // Crea i nuovi permessi base
              const rolePermissionsToCreate = validPermissions
                .filter(perm => perm.granted)
                .map(perm => {
                  // Normalizza il permissionId (rimuovi spazi e converti in maiuscolo)
                  const normalizedPermissionId = perm.permissionId.trim().toUpperCase();
                  logger.info(`🔧 Processing permission: ${perm.permissionId} -> ${normalizedPermissionId}`);

                  return {
                    personRoleId: personRole.id,
                    permission: normalizedPermissionId,
                    isGranted: true,
                    grantedBy: req.person?.id
                  };
                });
              
              logger.info(`🔧 Role permissions to create: ${JSON.stringify(rolePermissionsToCreate, null, 2)}`);
              
              if (rolePermissionsToCreate.length > 0) {
                logger.info(`🔧 Attempting to create ${rolePermissionsToCreate.length} role permissions...`);
                await prisma.rolePermission.createMany({
                  data: rolePermissionsToCreate
                });
                logger.info(`✅ Created ${rolePermissionsToCreate.length} role permissions`);
              }
              
              logger.info('🔧 Creating advanced permissions...');
              // Crea i permessi avanzati per quelli con scope specifico
              const advancedPermissionsToCreate = validPermissions
                .filter(perm => perm.granted && (perm.scope !== 'all' || perm.tenantIds?.length > 0 || perm.fieldRestrictions?.length > 0 || perm.maxRoleLevel))
                .map(perm => {
                  logger.info(`🔧 Processing advanced permission: ${perm.permissionId}`);
                  
                  // Normalizza il permissionId
                  const normalizedPermissionId = perm.permissionId.trim().toUpperCase();

                  // Estrae resource e action dal permissionId (es. "VIEW_COMPANIES" -> resource: "companies", action: "view")
                  const parts = normalizedPermissionId.split('_');
                  logger.info(`🔧 Permission parts: ${JSON.stringify(parts)}`);
                  
                  if (parts.length < 2) {
                    logger.warn(`Malformed permissionId (missing underscore): ${normalizedPermissionId}`);
                    return null;
                  }

                  const action = parts[0].toLowerCase();
                  const resource = parts.slice(1).join('_').toLowerCase();
                  
                  logger.info(`🔧 Extracted - action: ${action}, resource: ${resource}`);
                  
                  // Validazione che resource non sia vuoto
                  if (!resource || resource.trim() === '') {
                    logger.warn(`Empty resource extracted from permissionId: ${normalizedPermissionId}`);
                    return null;
                  }

                  // Costruisce le conditions basandosi su scope e parametri
                  let conditions = null;
                  
                  if (perm.scope === 'hierarchy' && perm.maxRoleLevel) {
                    // Per la gestione gerarchica dei ruoli
                    conditions = { maxRoleLevel: perm.maxRoleLevel };
                  } else if (perm.tenantIds && perm.tenantIds.length > 0) {
                    // Per la gestione tenant-specific
                    conditions = { allowedTenants: perm.tenantIds };
                  } else if (perm.conditions) {
                    // Se sono già presenti conditions specifiche
                    conditions = perm.conditions;
                  }

                  return {
                    personRoleId: personRole.id,
                    resource: resource,
                    action: action,
                    scope: perm.scope || 'global',
                    conditions: conditions,
                    allowedFields: perm.fieldRestrictions && perm.fieldRestrictions.length > 0 ? perm.fieldRestrictions : null
                  };
                })
                .filter(perm => perm !== null); // Rimuove i permessi non validi
              
              if (advancedPermissionsToCreate.length > 0) {
                logger.info(`🔧 Creating ${advancedPermissionsToCreate.length} advanced permissions`);
                await prisma.advancedPermission.createMany({
                  data: advancedPermissionsToCreate
                });
                logger.info(`✅ Created ${advancedPermissionsToCreate.length} advanced permissions`);
              }
            } catch (personRoleError) {
              logger.error(`❌ Error processing person role ${personRole.id}:`, personRoleError);
              throw personRoleError;
            }
          }
        } catch (systemRoleError) {
          logger.error('❌ Error processing system role:', systemRoleError);
          throw systemRoleError;
        }
      }

      logger.info(`✅ Permissions updated successfully for role: ${roleType}`);

      res.json({
        success: true,
        message: 'Role permissions updated successfully',
        data: {
          roleType,
          permissionsCount: permissions.filter(p => p.granted).length,
          tenantId,
          isCustomRole
        }
      });
    } catch (error) {
      logger.error('[ROLES_API] Error updating role permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update role permissions'
      });
    }
  }
);

/**
 * @route DELETE /api/roles/:roleType
 * @desc Elimina un ruolo
 * @access Admin
 */
router.delete('/:roleType',
  authenticate(),
  validateUserTenant,
  enhancedRoleService.requirePermission('ROLE_MANAGEMENT'),
  async (req, res) => {
    try {
      const { roleType } = req.params;
      const tenantId = req.tenant.id;

      // Verifica che il ruolo esista
      // Using local ROLE_TYPES
      if (!enhancedRoleService.constructor.ROLE_TYPES[roleType]) {
        return res.status(404).json({
          success: false,
          error: 'Role type not found'
        });
      }

      // Verifica se ci sono utenti con questo ruolo
      const usersWithRole = await prisma.personRole.count({
        where: {roleType,
          tenantId,}
      });

      if (usersWithRole > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete role: ${usersWithRole} users still have this role`
        });
      }

      res.json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error) {
      console.error('[ROLES_API] Error deleting role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete role'
      });
    }
  }
);

/**
 * @route POST /api/roles/cleanup
 * @desc Pulisce i ruoli scaduti
 * @access Admin
 */
router.post('/cleanup',
  authenticate(),
  enhancedRoleService.requirePermission('system.maintenance'),
  async (req, res) => {
    try {
      const tenantId = req.tenant.id;
      const cleanedCount = await enhancedRoleService.cleanupExpiredRoles(tenantId);

      res.json({
        success: true,
        data: {
          cleanedRoles: cleanedCount
        },
        message: `Cleaned up ${cleanedCount} expired roles`
      });
    } catch (error) {
      console.error('[ROLES_API] Error cleaning up roles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup expired roles'
      });
    }
  }
);

/**
 * @route GET /api/roles/check/:permission
 * @desc Verifica se l'utente corrente ha una specifica permissione
 * @access Authenticated
 */
router.get('/check/:permission', authenticate(), async (req, res) => {
  try {
    const { permission } = req.params;
    const personId = req.person.id;
    const tenantId = req.tenant.id;
    const { companyId, departmentId } = req.query;

    const context = { tenantId };
    if (companyId) context.companyId = companyId;
    if (departmentId) context.departmentId = departmentId;

    const hasPermission = await enhancedRoleService.hasPermission(
      personId,
      permission,
      context
    );

    res.json({
      success: true,
      data: {
        permission,
        hasPermission,
        context
      }
    });
  } catch (error) {
    console.error('[ROLES_API] Error checking permission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check permission'
    });
  }
});

/**
 * @route POST /api/roles/:roleType/advanced-permissions
 * @desc Configura permessi avanzati per un ruolo (inclusi campi limitati)
 * @access Admin
 */
router.post('/:roleType/advanced-permissions',
  authenticate(),
  enhancedRoleService.requirePermission('ROLE_MANAGEMENT'),
  async (req, res) => {
    try {
      const { roleType } = req.params;
      const tenantId = req.tenant.id;
      const { resource, action, scope = 'tenant', allowedFields, conditions } = req.body;

      // Validazione input
      if (!resource || !action) {
        return res.status(400).json({
          success: false,
          error: 'Resource and action are required'
        });
      }

      // Trova tutti i PersonRole con questo roleType nel tenant
      const personRoles = await prisma.personRole.findMany({
        where: {roleType,
          tenantId,}
      });

      // Crea o aggiorna i permessi avanzati per ogni PersonRole
      const advancedPermissions = await Promise.all(
        personRoles.map(async (personRole) => {
          return await prisma.advancedPermission.upsert({
            where: {
              personRoleId_resource_action: {
                personRoleId: personRole.id,
                resource,
                action
              }
            },
            update: {
              scope,
              allowedFields,
              conditions,
              updatedAt: new Date()
            },
            create: {
              personRoleId: personRole.id,
              resource,
              action,
              scope,
              allowedFields,
              conditions
            }
          });
        })
      );

      res.json({
        success: true,
        data: {
          roleType,
          resource,
          action,
          scope,
          allowedFields,
          conditions,
          affectedRoles: advancedPermissions.length
        },
        message: 'Advanced permissions configured successfully'
      });
    } catch (error) {
      console.error('[ROLES_API] Error configuring advanced permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to configure advanced permissions'
      });
    }
  }
);



/**
 * @route GET /api/roles/:roleType/advanced-permissions
 * @desc Ottiene i permessi avanzati per un ruolo
 * @access Admin
 */
router.get('/:roleType/advanced-permissions',
  authenticate(),
  enhancedRoleService.requirePermission('roles.read'),
  async (req, res) => {
    try {
      const { roleType } = req.params;
      const tenantId = req.tenant.id;

      // Trova un PersonRole di esempio per questo roleType
      const samplePersonRole = await prisma.personRole.findFirst({
        where: {roleType,
          tenantId,},
        include: {
          advancedPermissions: true
        }
      });

      const advancedPermissions = samplePersonRole?.advancedPermissions || [];

      // Raggruppa per risorsa
      const groupedPermissions = {};
      advancedPermissions.forEach(permission => {
        if (!groupedPermissions[permission.resource]) {
          groupedPermissions[permission.resource] = [];
        }
        groupedPermissions[permission.resource].push({
          action: permission.action,
          scope: permission.scope,
          allowedFields: permission.allowedFields,
          conditions: permission.conditions
        });
      });

      res.json({
        success: true,
        data: {
          roleType,
          advancedPermissions: groupedPermissions,
          totalPermissions: advancedPermissions.length
        }
      });
    } catch (error) {
      console.error('[ROLES_API] Error getting advanced permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get advanced permissions'
      });
    }
  }
);

/**
 * @route DELETE /api/roles/:roleType/advanced-permissions
 * @desc Rimuove permessi avanzati per un ruolo
 * @access Admin
 */
router.delete('/:roleType/advanced-permissions',
  authenticate(),
  enhancedRoleService.requirePermission('ROLE_MANAGEMENT'),
  async (req, res) => {
    try {
      const { roleType } = req.params;
      const tenantId = req.tenant.id;
      const { resource, action } = req.body;

      if (!resource || !action) {
        return res.status(400).json({
          success: false,
          error: 'Resource and action are required'
        });
      }

      // Trova tutti i PersonRole con questo roleType nel tenant
      const personRoles = await prisma.personRole.findMany({
        where: {roleType,
          tenantId,}
      });

      // Soft delete dei permessi avanzati
      const deletedCount = await prisma.advancedPermission.updateMany({
        where: {
          personRoleId: {
            in: personRoles.map(pr => pr.id)
          },
          resource,
          action,
          deletedAt: null
        },
        data: {
          deletedAt: new Date()
        }
      });

      res.json({
        success: true,
        data: {
          roleType,
          resource,
          action,
          deletedCount: deletedCount.count
        },
        message: 'Advanced permissions removed successfully'
      });
    } catch (error) {
      console.error('[ROLES_API] Error removing advanced permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove advanced permissions'
      });
    }
  }
);

/**
 * @route GET /api/roles/hierarchy/visible
 * @desc Ottiene i ruoli visibili per l'utente corrente basati sulla sua gerarchia
 * @access Authenticated
 */
router.get('/hierarchy/visible',
  authenticate(),
  async (req, res) => {
    try {
      const userId = req.person?.id;
      const tenantId = req.tenant?.id || req.person?.tenantId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID not found'
        });
      }
      
      // Importa il servizio di gerarchia
      const roleHierarchyService = await import(`../services/roleHierarchyService.js?t=${Date.now()}`);
      
      // Ottieni i ruoli dell'utente corrente
      const userRoles = await prisma.personRole.findMany({
        where: {
          personId: userId,
          tenantId: tenantId,
          isActive: true,
          deletedAt: null
        }
      });
      
      const userRoleTypes = userRoles.map(role => role.roleType);
      const highestRole = roleHierarchyService.default.getHighestRole(userRoleTypes);
      const userLevel = roleHierarchyService.default.getRoleLevel(highestRole);
      
      // Ottieni la gerarchia completa
      const fullHierarchy = await roleHierarchyService.default.getRoleHierarchy(tenantId);
      
      // Filtra i ruoli visibili basandosi sul livello dell'utente
      const visibleRoles = {};
      Object.entries(fullHierarchy).forEach(([roleType, roleData]) => {
        // L'utente può vedere ruoli del suo livello o inferiori (numeri più alti)
        if (roleData.level >= userLevel) {
          visibleRoles[roleType] = roleData;
        }
      });
      
      res.json({
        success: true,
        data: {
          userId,
          userLevel,
          highestRole,
          visibleRoles,
          totalRoles: Object.keys(visibleRoles).length
        }
      });
    } catch (error) {
      console.error('[ROLES_API] Error getting visible roles for current user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get visible roles for current user'
      });
    }
  }
);

/**
 * @route PUT /api/roles/hierarchy/move
 * @desc Sposta un ruolo nella gerarchia cambiando il suo livello e/o genitore
 * @access Admin
 */
router.put('/hierarchy/move',
  authenticate(),
  async (req, res) => {
    try {
      const { roleType, newLevel, newParentRoleType } = req.body;
      const tenantId = req.tenant?.id || req.person?.tenantId;
      const userId = req.person?.id;
      
      if (!roleType || newLevel === undefined) {
        return res.status(400).json({
          success: false,
          error: 'roleType and newLevel are required'
        });
      }
      
      // Verifica che l'utente abbia i permessi per gestire i ruoli
      const userRoles = await prisma.personRole.findMany({
        where: {
          personId: userId,
          tenantId: tenantId,
          isActive: true,
          deletedAt: null
        }
      });
      
      const userRoleTypes = userRoles.map(role => role.roleType);
      const hasRoleManagement = userRoleTypes.includes('SUPER_ADMIN') || 
                               userRoleTypes.includes('ADMIN') ||
                               userRoleTypes.some(role => role.includes('ADMIN'));
      
      if (!hasRoleManagement) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to manage roles'
        });
      }
      
      // Importa il servizio di gerarchia
      const roleHierarchyService = await import(`../services/roleHierarchyService.js?t=${Date.now()}`);
      
      // Verifica che il ruolo esista nella gerarchia
      const hierarchy = await roleHierarchyService.default.getRoleHierarchy(tenantId);
      if (!hierarchy[roleType]) {
        return res.status(404).json({
          success: false,
          error: 'Role not found in hierarchy'
        });
      }
      
      // Verifica che il nuovo livello sia valido
      if (newLevel < 1 || newLevel > 6) {
        return res.status(400).json({
          success: false,
          error: 'Invalid level. Level must be between 1 and 6'
        });
      }
      
      // Se specificato un genitore, verifica che esista
      if (newParentRoleType && !hierarchy[newParentRoleType]) {
        return res.status(404).json({
          success: false,
          error: 'Parent role not found in hierarchy'
        });
      }
      
      // Se specificato un genitore, verifica che il livello del genitore sia coerente
      if (newParentRoleType) {
        const parentLevel = hierarchy[newParentRoleType].level;
        if (parentLevel >= newLevel) {
          return res.status(400).json({
            success: false,
            error: 'Parent role level must be lower than child role level'
          });
        }
      }
      
      const oldRoleData = { ...hierarchy[roleType] };
      
      // Per ora, aggiorniamo solo i PersonRole esistenti nel database
      // La gerarchia statica verrà aggiornata al prossimo riavvio del server
      const updatedRoles = await prisma.personRole.updateMany({
        where: {
          roleType: roleType,
          tenantId: tenantId,
          isActive: true,
          deletedAt: null
        },
        data: {
          level: newLevel
        }
      });
      
      // Se il ruolo è un CustomRole, aggiorna anche la tabella CustomRole
      if (hierarchy[roleType].isCustomRole && hierarchy[roleType].customRoleId) {
        await prisma.customRole.update({
          where: {
            id: hierarchy[roleType].customRoleId
          },
          data: {
            updatedAt: new Date()
          }
        });
      }
      
      // Log dell'operazione
      logger.info(`Role ${roleType} moved to level ${newLevel}`, {
        roleType,
        oldLevel: oldRoleData.level,
        newLevel,
        newParentRoleType,
        updatedRolesCount: updatedRoles.count,
        tenantId,
        userId
      });
      
      res.json({
        success: true,
        data: {
          roleType,
          oldLevel: oldRoleData.level,
          newLevel,
          newParentRoleType,
          updatedRolesCount: updatedRoles.count
        },
        message: `Role ${roleType} successfully moved to level ${newLevel}. Changes will be fully applied after server restart.`
      });
      
    } catch (error) {
      console.error('[ROLES_API] Error moving role in hierarchy:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to move role in hierarchy'
      });
    }
  }
);

export default router;