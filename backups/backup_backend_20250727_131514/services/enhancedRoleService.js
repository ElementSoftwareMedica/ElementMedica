import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
const prisma = new PrismaClient();

/**
 * Servizio per la gestione dei ruoli avanzati nel sistema multi-tenant
 * Week 12: Sistema Utenti Avanzato
 */
class EnhancedRoleService {
  /**
   * Definizione dei tipi di ruolo e relative permissions
   */
  static ROLE_TYPES = {
    EMPLOYEE: 'EMPLOYEE',
    MANAGER: 'MANAGER',
    HR_MANAGER: 'HR_MANAGER',
    DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
    TRAINER: 'TRAINER',
    SENIOR_TRAINER: 'SENIOR_TRAINER',
    TRAINER_COORDINATOR: 'TRAINER_COORDINATOR',
    EXTERNAL_TRAINER: 'EXTERNAL_TRAINER',
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    COMPANY_ADMIN: 'COMPANY_ADMIN',
    TENANT_ADMIN: 'TENANT_ADMIN',
    VIEWER: 'VIEWER',
    OPERATOR: 'OPERATOR',
    COORDINATOR: 'COORDINATOR',
    SUPERVISOR: 'SUPERVISOR',
    GUEST: 'GUEST',
    CONSULTANT: 'CONSULTANT',
    AUDITOR: 'AUDITOR'
  };

  static ROLE_SCOPES = {
    GLOBAL: 'global',
    TENANT: 'tenant',
    COMPANY: 'company',
    DEPARTMENT: 'department'
  };

  static PERMISSIONS = {
    // User Management
    'users.create': 'Creare utenti',
    'users.read': 'Visualizzare utenti',
    'users.update': 'Modificare utenti',
    'users.delete': 'Eliminare utenti',
    'users.manage_roles': 'Gestire ruoli utenti',
    
    // Role Management
    'roles.create': 'Creare ruoli',
    'roles.read': 'Visualizzare ruoli',
    'roles.update': 'Modificare ruoli',
    'roles.delete': 'Eliminare ruoli',
    
    // Company Management
    'companies.create': 'Creare aziende',
    'companies.read': 'Visualizzare aziende',
    'companies.update': 'Modificare aziende',
    'companies.delete': 'Eliminare aziende',
    'companies.manage_settings': 'Gestire impostazioni azienda',
    
    // Course Management
    'courses.create': 'Creare corsi',
    'courses.read': 'Visualizzare corsi',
    'courses.update': 'Modificare corsi',
    'courses.delete': 'Eliminare corsi',
    'courses.assign': 'Assegnare corsi',
    
    // Training Management
    'training.create': 'Creare sessioni formative',
    'training.read': 'Visualizzare formazioni',
    'training.update': 'Modificare formazioni',
    'training.delete': 'Eliminare formazioni',
    'training.conduct': 'Condurre formazioni',
    
    // Reports and Analytics
    'reports.view': 'Visualizzare report',
    'reports.export': 'Esportare report',
    'analytics.view': 'Visualizzare analytics',
    
    // System Administration
    'system.settings': 'Gestire impostazioni sistema',
    'system.billing': 'Gestire fatturazione',
    'system.audit': 'Visualizzare audit logs',
    'system.backup': 'Gestire backup'
  };

  /**
   * Matrice delle permissions per ruolo
   * Restituisce i valori corretti dell'enum PersonPermission (formato ACTION_ENTITY)
   */
  static getDefaultPermissions(roleType) {
    const permissionMatrix = {
      [this.ROLE_TYPES.SUPER_ADMIN]: [
        // Tutti i permessi disponibili nell'enum PersonPermission
        'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
        'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
        'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
        'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
        'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
        'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS', 'DOWNLOAD_DOCUMENTS',
        'ROLE_MANAGEMENT', 'VIEW_ROLES', 'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES',
        'MANAGE_USERS', 'ASSIGN_ROLES', 'REVOKE_ROLES',
        'SYSTEM_SETTINGS', 'ADMIN_PANEL', 'USER_MANAGEMENT',
        'TENANT_MANAGEMENT', 'VIEW_TENANTS', 'CREATE_TENANTS', 'EDIT_TENANTS', 'DELETE_TENANTS',
        'VIEW_ADMINISTRATION', 'CREATE_ADMINISTRATION', 'EDIT_ADMINISTRATION', 'DELETE_ADMINISTRATION',
        'VIEW_GDPR', 'CREATE_GDPR', 'EDIT_GDPR', 'DELETE_GDPR',
        'VIEW_GDPR_DATA', 'EXPORT_GDPR_DATA', 'DELETE_GDPR_DATA', 'MANAGE_CONSENTS',
        'VIEW_REPORTS', 'CREATE_REPORTS', 'EDIT_REPORTS', 'DELETE_REPORTS', 'EXPORT_REPORTS',
        'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'EDIT_HIERARCHY', 'DELETE_HIERARCHY', 'MANAGE_HIERARCHY', 'HIERARCHY_MANAGEMENT'
      ],
      
      [this.ROLE_TYPES.ADMIN]: [
        // Permessi amministrativi completi
        'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
        'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
        'VIEW_PERSONS', 'CREATE_PERSONS', 'EDIT_PERSONS', 'DELETE_PERSONS',
        'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
        'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
        'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
        'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS', 'DOWNLOAD_DOCUMENTS',
        'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES', 'DELETE_SCHEDULES',
        'VIEW_GDPR', 'CREATE_GDPR', 'EDIT_GDPR', 'DELETE_GDPR', 'MANAGE_GDPR',
        'ROLE_MANAGEMENT', 'VIEW_ROLES', 'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES',
        'MANAGE_USERS', 'ASSIGN_ROLES', 'REVOKE_ROLES',
        'VIEW_REPORTS', 'CREATE_REPORTS', 'EDIT_REPORTS', 'EXPORT_REPORTS',
        'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'EDIT_HIERARCHY', 'DELETE_HIERARCHY', 'MANAGE_HIERARCHY'
      ],
      
      [this.ROLE_TYPES.COMPANY_ADMIN]: [
        'CREATE_USERS', 'VIEW_USERS', 'EDIT_USERS', 'DELETE_USERS', 'ROLE_MANAGEMENT',
        'VIEW_COMPANIES', 'EDIT_COMPANIES',
        'CREATE_COURSES', 'VIEW_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
        'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES',
        'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS',
        'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES',
        'VIEW_REPORTS', 'EXPORT_REPORTS', 'VIEW_ANALYTICS'
      ],
      
      [this.ROLE_TYPES.TENANT_ADMIN]: [
        'CREATE_USERS', 'VIEW_USERS', 'EDIT_USERS', 'DELETE_USERS', 'ROLE_MANAGEMENT',
        'VIEW_COMPANIES', 'EDIT_COMPANIES',
        'CREATE_COURSES', 'VIEW_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
        'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES',
        'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS',
        'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES',
        'VIEW_REPORTS', 'EXPORT_REPORTS', 'VIEW_ANALYTICS'
      ],
      
      [this.ROLE_TYPES.MANAGER]: [
        'VIEW_USERS', 'EDIT_USERS',
        'VIEW_COMPANIES',
        'VIEW_COURSES',
        'VIEW_EMPLOYEES', 'EDIT_EMPLOYEES',
        'VIEW_TRAINERS',
        'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES',
        'VIEW_REPORTS', 'VIEW_ANALYTICS'
      ],
      
      [this.ROLE_TYPES.HR_MANAGER]: [
        'CREATE_USERS', 'VIEW_USERS', 'EDIT_USERS', 'ROLE_MANAGEMENT',
        'VIEW_COMPANIES',
        'VIEW_COURSES',
        'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES',
        'VIEW_TRAINERS',
        'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES',
        'VIEW_REPORTS', 'VIEW_ANALYTICS'
      ],
      
      [this.ROLE_TYPES.TRAINER]: [
        'VIEW_USERS',
        'VIEW_COURSES',
        'VIEW_EMPLOYEES',
        'VIEW_SCHEDULES',
        'VIEW_REPORTS'
      ],
      
      [this.ROLE_TYPES.SENIOR_TRAINER]: [
        'VIEW_USERS',
        'VIEW_COURSES', 'EDIT_COURSES',
        'VIEW_EMPLOYEES',
        'VIEW_TRAINERS',
        'CREATE_SCHEDULES', 'VIEW_SCHEDULES', 'EDIT_SCHEDULES',
        'VIEW_REPORTS'
      ],
      
      [this.ROLE_TYPES.EMPLOYEE]: [
        'VIEW_COURSES',
        'VIEW_SCHEDULES'
      ],
      
      [this.ROLE_TYPES.VIEWER]: [
        'VIEW_COURSES',
        'VIEW_SCHEDULES',
        'VIEW_REPORTS'
      ]
    };

    return permissionMatrix[roleType] || [];
  }

  /**
   * Assegna un ruolo a un utente
   */
  async assignRole(personId, tenantId, roleType, options = {}) {
    try {
      const {
        companyId = null,
        departmentId = null,
        assignedBy = null,
        expiresAt = null,
        customPermissions = null
      } = options;

      // Verifica che la persona esista e appartenga al tenant
      const person = await prisma.person.findFirst({
        where: {
          id: personId,
          OR: [
            { companyId: tenantId },
            { globalRole: 'SUPER_ADMIN' }
          ]
        }
      });

      if (!person) {
        throw new Error('Person not found or does not belong to this tenant');
      }

      // Determina lo scope del ruolo
      let roleScope = this.constructor.ROLE_SCOPES.TENANT;
      if (roleType === this.ROLE_TYPES.SUPER_ADMIN) {
        roleScope = this.constructor.ROLE_SCOPES.GLOBAL;
      } else if (companyId) {
        roleScope = this.constructor.ROLE_SCOPES.COMPANY;
      } else if (departmentId) {
        roleScope = this.constructor.ROLE_SCOPES.DEPARTMENT;
      }

      // Ottieni le permissions di default per il ruolo
      const defaultPermissions = this.constructor.getDefaultPermissions(roleType);
      const permissions = customPermissions || defaultPermissions;

      // Verifica se esiste già un ruolo simile
      const existingRole = await prisma.personRole.findFirst({
        where: {personId,
          tenantId,
          roleType,
          companyId,}
      });

      if (existingRole) {
        // Aggiorna il ruolo esistente
        return await prisma.personRole.update({
          where: { id: existingRole.id },
          data: {
            assignedBy,
            assignedAt: new Date(),
            validUntil: expiresAt
          }
        });
      } else {
        // Crea un nuovo ruolo
        return await prisma.personRole.create({
          data: {
            personId,
            tenantId,
            roleType,
            companyId,
            assignedBy,
            validUntil: expiresAt
          }
        });
      }
    } catch (error) {
      console.error('[ENHANCED_ROLE_SERVICE] Error assigning role:', error);
      throw error;
    }
  }

  /**
   * Rimuove un ruolo da un utente
   */
  async removeRole(personId, tenantId, roleType, companyId = null) {
    try {
      const result = await prisma.personRole.updateMany({
        where: {personId,
          tenantId,
          roleType,
          companyId,},
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      return result.count > 0;
    } catch (error) {
      console.error('[ENHANCED_ROLE_SERVICE] Error removing role:', error);
      throw error;
    }
  }

  /**
   * Ottiene tutti i ruoli di un utente
   */
  async getUserRoles(personId, tenantId = null) {
    try {
      const where = {
        personId,
        isActive: true,
        OR: [
          { validUntil: null },
          { validUntil: { gt: new Date() } }
        ]
      };

      if (tenantId) {
        where.tenantId = tenantId;
      }

      // Ottieni i ruoli dalla tabella PersonRole
      const personRoles = await prisma.personRole.findMany({
        where,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          company: {
            select: {
              id: true,
              ragioneSociale: true
            }
          }
        },
        orderBy: [
          { roleType: 'asc' },
          { assignedAt: 'desc' }
        ]
      });

      // Ottieni anche il globalRole dalla tabella Person
      const person = await prisma.person.findUnique({
        where: { id: personId },
        select: { globalRole: true }
      });

      // Se l'utente ha un globalRole, aggiungilo alla lista dei ruoli
      if (person?.globalRole) {
        const globalRoleEntry = {
          id: `global-${personId}`,
          personId,
          roleType: person.globalRole,
          roleScope: this.constructor.ROLE_SCOPES.GLOBAL,
          isActive: true,
          assignedAt: new Date(),
          validUntil: null,
          tenantId: null,
          companyId: null,
          assignedByPersonId: null,
          permissions: null,
          tenant: null,
          company: null
        };
        
        // Aggiungi il globalRole solo se non è già presente nei personRoles
        const hasGlobalRoleInPersonRoles = personRoles.some(role => role.roleType === person.globalRole);
        if (!hasGlobalRoleInPersonRoles) {
          personRoles.unshift(globalRoleEntry);
        }
      }

      return personRoles;
    } catch (error) {
      console.error('[ENHANCED_ROLE_SERVICE] Error getting user roles:', error);
      throw error;
    }
  }

  /**
   * Verifica se un utente ha una specifica permission
   */
  async hasPermission(personId, permission, context = {}) {
    try {
      const { tenantId, companyId, resourceId } = context;

      // Ottieni tutti i ruoli attivi dell'utente
      const userRoles = await this.getUserRoles(personId, tenantId);

      // Verifica se l'utente è super admin o admin
      const hasGlobalAdmin = userRoles.some(role => 
        role.roleType === this.constructor.ROLE_TYPES.SUPER_ADMIN ||
        role.roleType === this.constructor.ROLE_TYPES.ADMIN
      );

      if (hasGlobalAdmin) {
        return true;
      }

      // Verifica i permessi di default per i ruoli di sistema
      for (const role of userRoles) {
        const defaultPermissions = this.constructor.getDefaultPermissions(role.roleType);
        
        if (defaultPermissions.includes(permission)) {
          // Verifica il contesto se necessario
          if (role.roleScope === this.constructor.ROLE_SCOPES.COMPANY && companyId) {
            if (role.companyId === companyId) {
              return true;
            }
          } else if (role.roleScope === this.constructor.ROLE_SCOPES.TENANT && tenantId) {
            if (role.tenantId === tenantId) {
              return true;
            }
          } else if (role.roleScope === this.constructor.ROLE_SCOPES.GLOBAL) {
            return true;
          } else {
            // Per ruoli senza scope specifico, concedi il permesso
            return true;
          }
        }
      }

      // Verifica i permessi specifici dal database (RolePermission e AdvancedPermission)
      const personRoles = await prisma.personRole.findMany({
        where: {
          personId,
          tenantId,
          isActive: true,
          OR: [
            { validUntil: null },
            { validUntil: { gt: new Date() } }
          ]
        },
        include: {
          permissions: {
            where: {
              permission: permission,
              isGranted: true
            }
          },
          advancedPermissions: true
        }
      });

      // Verifica i permessi base (RolePermission)
      for (const personRole of personRoles) {
        if (personRole.permissions.length > 0) {
          return true;
        }
      }

      // Verifica i permessi avanzati (AdvancedPermission)
      // Estrae resource e action dal permission (es. "VIEW_COMPANIES" -> resource: "companies", action: "view")
      const parts = permission.split('_');
      if (parts.length >= 2) {
        const action = parts[0].toLowerCase();
        const resource = parts.slice(1).join('_').toLowerCase();

        for (const personRole of personRoles) {
          const advancedPermissions = personRole.advancedPermissions.filter(
            ap => ap.resource === resource && ap.action === action
          );

          for (const advPerm of advancedPermissions) {
            // Verifica scope e condizioni
            if (advPerm.scope === 'global') {
              return true;
            } else if (advPerm.scope === 'tenant' && tenantId) {
              return true;
            } else if (advPerm.scope === 'own' && resourceId) {
              // Verifica se la risorsa appartiene all'utente
              if (await this.evaluateConditions(advPerm.conditions, personId, resourceId, tenantId)) {
                return true;
              }
            }
          }
        }
      }

      // Verifica i ruoli personalizzati (CustomRole)
      const customRoles = await prisma.customRole.findMany({
        where: {
          tenantId,
          deletedAt: null,
          customRolePermissions: {
            some: {
              permission: permission
            }
          }
        },
        include: {
          customRolePermissions: {
            where: {
              permission: permission
            }
          }
        }
      });

      // Verifica se l'utente ha uno di questi ruoli personalizzati
      for (const customRole of customRoles) {
        const hasCustomRole = userRoles.some(role => 
          role.roleType === `CUSTOM_${customRole.id}`
        );
        
        if (hasCustomRole && customRole.customRolePermissions.length > 0) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('[ENHANCED_ROLE_SERVICE] Error checking permission:', error);
      return false;
    }
  }

  /**
   * Ottiene tutte le permissions di un utente
   */
  async getUserPermissions(personId, tenantId = null) {
    try {
      const userRoles = await this.getUserRoles(personId, tenantId);
      const allPermissions = new Set();

      // Aggiungi i permessi di default per i ruoli di sistema
      userRoles.forEach(role => {
        const defaultPermissions = this.constructor.getDefaultPermissions(role.roleType);
        defaultPermissions.forEach(permission => allPermissions.add(permission));
      });

      // Aggiungi i permessi specifici dal database (RolePermission)
      const personRoles = await prisma.personRole.findMany({
        where: {
          personId,
          tenantId,
          isActive: true,
          OR: [
            { validUntil: null },
            { validUntil: { gt: new Date() } }
          ]
        },
        include: {
          permissions: {
            where: {
              isGranted: true
            }
          },
          advancedPermissions: true
        }
      });

      // Aggiungi permessi base (RolePermission)
      personRoles.forEach(personRole => {
        personRole.permissions.forEach(rolePerm => {
          allPermissions.add(rolePerm.permission);
        });
      });

      // Aggiungi permessi avanzati (AdvancedPermission) - convertiti in formato standard
      personRoles.forEach(personRole => {
        personRole.advancedPermissions.forEach(advPerm => {
          const permission = `${advPerm.action.toUpperCase()}_${advPerm.resource.toUpperCase()}`;
          allPermissions.add(permission);
        });
      });

      // Aggiungi permessi da ruoli personalizzati (CustomRole)
      const customRoles = await prisma.customRole.findMany({
        where: {
          tenantId,
          deletedAt: null
        },
        include: {
          customRolePermissions: true
        }
      });

      // Verifica se l'utente ha ruoli personalizzati e aggiungi i loro permessi
      customRoles.forEach(customRole => {
        const hasCustomRole = userRoles.some(role => 
          role.roleType === `CUSTOM_${customRole.id}`
        );
        
        if (hasCustomRole) {
          customRole.customRolePermissions.forEach(customPerm => {
            allPermissions.add(customPerm.permission);
          });
        }
      });

      return Array.from(allPermissions);
    } catch (error) {
      console.error('[ENHANCED_ROLE_SERVICE] Error getting user permissions:', error);
      throw error;
    }
  }

  /**
   * Lista utenti con un ruolo specifico
   */
  async getUsersByRole(roleType, tenantId, companyId = null) {
    try {
      const where = {
        roleType,
        tenantId,
        isActive: true
      };

      if (companyId) {
        where.companyId = companyId;
      }

      return await prisma.personRole.findMany({
        where,
        include: {
          person: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true
            }
          },
          company: {
            select: {
              id: true,
              ragioneSociale: true
            }
          }
        }
      });
    } catch (error) {
      console.error('[ENHANCED_ROLE_SERVICE] Error getting users by role:', error);
      throw error;
    }
  }

  /**
   * Aggiorna le permissions di un ruolo
   */
  async updateRolePermissions(roleId, permissions) {
    try {
      return await prisma.personRole.update({
        where: { id: roleId },
        data: {
          permissions: { permissions }
        }
      });
    } catch (error) {
      console.error('[ENHANCED_ROLE_SERVICE] Error updating role permissions:', error);
      throw error;
    }
  }

  /**
   * Ottiene statistiche sui ruoli per un tenant
   */
  async getRoleStatistics(tenantId) {
    try {
      const stats = await prisma.personRole.groupBy({
        by: ['roleType'],
        where: {tenantId,},
        _count: {
          personId: true
        }
      });

      const result = {};
      stats.forEach(stat => {
        result[stat.roleType] = stat._count.personId;
      });

      return result;
    } catch (error) {
      console.error('[ENHANCED_ROLE_SERVICE] Error getting role statistics:', error);
      throw error;
    }
  }

  /**
   * Verifica e pulisce ruoli scaduti
   */
  async cleanupExpiredRoles() {
    try {
      const result = await prisma.personRole.updateMany({
        where: {
          validUntil: {
            lt: new Date()
          },
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      console.log(`[ENHANCED_ROLE_SERVICE] Deactivated ${result.count} expired roles`);
      return result.count;
    } catch (error) {
      console.error('[ENHANCED_ROLE_SERVICE] Error cleaning up expired roles:', error);
      throw error;
    }
  }

  /**
   * Ottiene i permessi avanzati per un utente su una risorsa specifica
   */
  async getAdvancedPermissions(personId, resource, action, tenantId) {
    try {
      const userRoles = await prisma.personRole.findMany({
        where: {
          personId,
          tenantId,
          isActive: true,
          OR: [
            { validUntil: null },
            { validUntil: { gt: new Date() } }
          ]
        },
        include: {
          advancedPermissions: {
            where: {
              resource,
              action
            }
          }
        }
      });

      const permissions = [];
      userRoles.forEach(role => {
        role.advancedPermissions.forEach(permission => {
          permissions.push({
            roleType: role.roleType,
            scope: permission.scope,
            allowedFields: permission.allowedFields,
            conditions: permission.conditions
          });
        });
      });

      return permissions;
    } catch (error) {
      console.error('[ENHANCED_ROLE_SERVICE] Error getting advanced permissions:', error);
      throw error;
    }
  }

  /**
   * Filtra i dati in base ai permessi avanzati dell'utente
   */
  async filterDataByPermissions(personId, resource, action, data, tenantId) {
    try {
      const permissions = await this.getAdvancedPermissions(personId, resource, action, tenantId);
      
      if (permissions.length === 0) {
        // Nessun permesso avanzato, restituisci i dati completi se ha il permesso base
        const hasBasicPermission = await this.hasPermission(personId, `${resource}.${action}`, { tenantId });
        return hasBasicPermission ? data : null;
      }

      // Combina tutti i permessi per determinare i campi accessibili
      const allowedFields = new Set();
      let hasGlobalAccess = false;

      permissions.forEach(permission => {
        if (permission.scope === 'global' || permission.scope === 'tenant') {
          hasGlobalAccess = true;
        }
        
        if (permission.allowedFields && Array.isArray(permission.allowedFields)) {
          permission.allowedFields.forEach(field => allowedFields.add(field));
        }
      });

      // Se ha accesso globale e nessun campo è specificato, restituisci tutto
      if (hasGlobalAccess && allowedFields.size === 0) {
        return data;
      }

      // Filtra i dati in base ai campi consentiti
      if (Array.isArray(data)) {
        return data.map(item => this.filterObjectFields(item, allowedFields));
      } else if (typeof data === 'object' && data !== null) {
        return this.filterObjectFields(data, allowedFields);
      }

      return data;
    } catch (error) {
      console.error('[ENHANCED_ROLE_SERVICE] Error filtering data by permissions:', error);
      throw error;
    }
  }

  /**
   * Filtra i campi di un oggetto in base ai permessi
   */
  filterObjectFields(obj, allowedFields) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const filtered = {};
    
    // Se non ci sono campi specificati, restituisci l'oggetto completo
    if (allowedFields.size === 0) {
      return obj;
    }

    // Filtra solo i campi consentiti
    allowedFields.forEach(field => {
      if (obj.hasOwnProperty(field)) {
        filtered[field] = obj[field];
      }
    });

    // Aggiungi sempre l'ID se presente
    if (obj.id && !filtered.id) {
      filtered.id = obj.id;
    }

    return filtered;
  }

  /**
   * Verifica se un utente può accedere a una risorsa specifica con condizioni
   */
  async canAccessResource(personId, resource, resourceId, action, tenantId) {
    try {
      const permissions = await this.getAdvancedPermissions(personId, resource, action, tenantId);
      
      if (permissions.length === 0) {
        return await this.hasPermission(personId, `${resource}.${action}`, { tenantId });
      }

      // Verifica le condizioni specifiche
      for (const permission of permissions) {
        if (permission.scope === 'global') {
          return true;
        }
        
        if (permission.conditions) {
          const conditionsMet = await this.evaluateConditions(
            permission.conditions, 
            personId, 
            resourceId, 
            tenantId
          );
          if (conditionsMet) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('[ENHANCED_ROLE_SERVICE] Error checking resource access:', error);
      return false;
    }
  }

  /**
   * Valuta le condizioni per l'accesso a una risorsa
   */
  async evaluateConditions(conditions, personId, resourceId, tenantId) {
    try {
      if (!conditions || typeof conditions !== 'object') {
        return true;
      }

      // Esempio di condizioni supportate:
      // { "ownedBy": "self" } - può accedere solo alle proprie risorse
      // { "companyId": "same" } - può accedere solo alle risorse della stessa azienda
      // { "departmentId": "same" } - può accedere solo alle risorse dello stesso dipartimento

      if (conditions.ownedBy === 'self') {
        // Verifica che la risorsa appartenga all'utente
        const resource = await prisma.person.findFirst({
          where: { id: resourceId, id: personId }
        });
        return !!resource;
      }

      if (conditions.companyId === 'same') {
        // Verifica che l'utente e la risorsa appartengano alla stessa azienda
        const userPerson = await prisma.person.findUnique({
          where: { id: personId },
          select: { companyId: true }
        });
        
        const resourcePerson = await prisma.person.findUnique({
          where: { id: resourceId },
          select: { companyId: true }
        });
        
        return userPerson?.companyId === resourcePerson?.companyId;
      }

      return true;
    } catch (error) {
      console.error('[ENHANCED_ROLE_SERVICE] Error evaluating conditions:', error);
      return false;
    }
  }

  /**
   * Middleware per verificare permissions
   */
  requirePermission(permission, contextExtractor = null) {
    // Bind esplicito del contesto this
    const self = this;
    
    return async (req, res, next) => {
      try {
        const personId = req.person?.id;
        
        if (!personId) {
          return res.status(401).json({ 
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        let context = {
          tenantId: req.tenantId,
          companyId: req.person?.companyId
        };

        // Estrai contesto aggiuntivo se fornito
        if (contextExtractor && typeof contextExtractor === 'function') {
          const additionalContext = contextExtractor(req);
          context = { ...context, ...additionalContext };
        }
        
        // Usa self invece di this per garantire il contesto corretto
        const hasPermission = await self.hasPermission(personId, permission, context);
        
        if (!hasPermission) {
          return res.status(403).json({ 
            error: 'Insufficient permissions',
            required: permission,
            context: context
          });
        }

        next();
      } catch (error) {
        console.error('[requirePermission] Permission check error:', error);
        return res.status(500).json({ 
          error: 'Internal server error during permission check',
          code: 'PERMISSION_CHECK_ERROR'
        });
      }
    };
  }
}

// Esporta sia la classe che l'istanza
export { EnhancedRoleService };
export default new EnhancedRoleService();