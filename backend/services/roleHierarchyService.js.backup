import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Servizio per la gestione della gerarchia dei ruoli
 * Implementa un sistema gerarchico dove ogni ruolo può assegnare permessi
 * solo a ruoli di livello pari o inferiore
 */
class RoleHierarchyService {
  
  /**
   * Definizione della gerarchia dei ruoli con livelli e relazioni parent-child
   * Livello più basso = maggiore autorità
   */
  static ROLE_HIERARCHY = {
    'SUPER_ADMIN': {
      level: 0,
      parent: null,
      name: 'Super Amministratore',
      description: 'Accesso completo a tutto il sistema',
      canAssignTo: ['ADMIN', 'COMPANY_ADMIN', 'TENANT_ADMIN', 'TRAINER', 'EMPLOYEE'],
      permissions: ['ALL_PERMISSIONS']
    },
    'ADMIN': {
      level: 1,
      parent: 'SUPER_ADMIN',
      name: 'Amministratore',
      description: 'Gestione completa del tenant',
      canAssignTo: ['COMPANY_ADMIN', 'TENANT_ADMIN', 'HR_MANAGER', 'MANAGER', 'TRAINER', 'EMPLOYEE'],
      permissions: [
        'ROLE_MANAGEMENT', 'USER_MANAGEMENT', 'TENANT_MANAGEMENT',
        'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES', 'VIEW_ROLES', 'EDIT_HIERARCHY',
        'MANAGE_USERS', 'ASSIGN_ROLES', 'REVOKE_ROLES', 'VIEW_ADMINISTRATION',
        'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'DELETE_HIERARCHY', 'MANAGE_HIERARCHY', 'HIERARCHY_MANAGEMENT',
        'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
        'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
        'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
        'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
        'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
        'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS',
        'ADMIN_PANEL', 'SYSTEM_SETTINGS', 'VIEW_REPORTS', 'CREATE_REPORTS'
      ]
    },
    'COMPANY_ADMIN': {
      level: 2,
      parent: 'ADMIN',
      name: 'Amministratore Azienda',
      description: 'Gestione della propria azienda e dipendenti',
      canAssignTo: ['HR_MANAGER', 'MANAGER', 'TRAINER', 'EMPLOYEE'],
      permissions: [
        'CREATE_ROLES', 'EDIT_ROLES', 'VIEW_ROLES',
        'MANAGE_USERS', 'ASSIGN_ROLES', 'VIEW_HIERARCHY',
        'VIEW_COMPANIES', 'EDIT_COMPANIES',
        'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES',
        'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS',
        'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS',
        'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES',
        'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS'
      ]
    },
    'TENANT_ADMIN': {
      level: 2,
      parent: 'ADMIN',
      name: 'Amministratore Tenant',
      description: 'Gestione del tenant',
      canAssignTo: ['COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'TRAINER', 'EMPLOYEE'],
      permissions: [
        'TENANT_MANAGEMENT',
        'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES', 'VIEW_ROLES', 'EDIT_HIERARCHY',
        'MANAGE_USERS', 'ASSIGN_ROLES', 'REVOKE_ROLES', 'VIEW_ADMINISTRATION',
        'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'DELETE_HIERARCHY', 'MANAGE_HIERARCHY',
        'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES',
        'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES',
        'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS',
        'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS',
        'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES'
      ]
    },
    'HR_MANAGER': {
      level: 3,
      parent: 'COMPANY_ADMIN',
      name: 'Manager HR',
      description: 'Gestione risorse umane',
      canAssignTo: ['MANAGER', 'TRAINER', 'EMPLOYEE'],
      permissions: [
        'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES',
        'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS',
        'VIEW_COURSES', 'VIEW_DOCUMENTS'
      ]
    },
    'MANAGER': {
      level: 3,
      parent: 'COMPANY_ADMIN',
      name: 'Manager',
      description: 'Gestione team e progetti',
      canAssignTo: ['DEPARTMENT_HEAD', 'TRAINER_COORDINATOR', 'TRAINER', 'EMPLOYEE'],
      permissions: [
        'VIEW_EMPLOYEES', 'EDIT_EMPLOYEES',
        'VIEW_TRAINERS', 'EDIT_TRAINERS',
        'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES',
        'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS'
      ]
    },
    'DEPARTMENT_HEAD': {
      level: 4,
      parent: 'MANAGER',
      name: 'Capo Dipartimento',
      description: 'Gestione dipartimento',
      canAssignTo: ['SUPERVISOR', 'TRAINER', 'EMPLOYEE'],
      permissions: [
        'VIEW_EMPLOYEES', 'EDIT_EMPLOYEES',
        'VIEW_COURSES', 'EDIT_COURSES',
        'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS'
      ]
    },
    'TRAINER_COORDINATOR': {
      level: 4,
      parent: 'MANAGER',
      name: 'Coordinatore Formatori',
      description: 'Coordinamento attività formative',
      canAssignTo: ['SENIOR_TRAINER', 'TRAINER', 'EXTERNAL_TRAINER'],
      permissions: [
        'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS',
        'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES',
        'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS'
      ]
    },
    'SENIOR_TRAINER': {
      level: 5,
      parent: 'TRAINER_COORDINATOR',
      name: 'Formatore Senior',
      description: 'Formazione avanzata e mentoring',
      canAssignTo: ['TRAINER', 'EXTERNAL_TRAINER'],
      permissions: [
        'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES',
        'VIEW_EMPLOYEES', 'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS'
      ]
    },
    'TRAINER': {
      level: 6,
      parent: 'SENIOR_TRAINER',
      name: 'Formatore',
      description: 'Gestione corsi e formazione',
      canAssignTo: ['EMPLOYEE'],
      permissions: [
        'VIEW_COURSES', 'EDIT_COURSES',
        'VIEW_EMPLOYEES', 'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS'
      ]
    },
    'EXTERNAL_TRAINER': {
      level: 6,
      parent: 'SENIOR_TRAINER',
      name: 'Formatore Esterno',
      description: 'Formazione specialistica esterna',
      canAssignTo: [],
      permissions: [
        'VIEW_COURSES', 'VIEW_DOCUMENTS'
      ]
    },
    'SUPERVISOR': {
      level: 5,
      parent: 'DEPARTMENT_HEAD',
      name: 'Supervisore',
      description: 'Supervisione operativa',
      canAssignTo: ['COORDINATOR', 'OPERATOR', 'EMPLOYEE'],
      permissions: [
        'VIEW_EMPLOYEES', 'EDIT_EMPLOYEES',
        'VIEW_COURSES', 'VIEW_DOCUMENTS'
      ]
    },
    'COORDINATOR': {
      level: 6,
      parent: 'SUPERVISOR',
      name: 'Coordinatore',
      description: 'Coordinamento attività',
      canAssignTo: ['OPERATOR', 'EMPLOYEE'],
      permissions: [
        'VIEW_EMPLOYEES',
        'VIEW_COURSES', 'VIEW_DOCUMENTS'
      ]
    },
    'OPERATOR': {
      level: 7,
      parent: 'COORDINATOR',
      name: 'Operatore',
      description: 'Operazioni base',
      canAssignTo: ['EMPLOYEE'],
      permissions: [
        'VIEW_COURSES', 'VIEW_DOCUMENTS'
      ]
    },
    'EMPLOYEE': {
      level: 8,
      parent: 'OPERATOR',
      name: 'Dipendente',
      description: 'Accesso base alle funzionalità',
      canAssignTo: ['VIEWER'],
      permissions: [
        'VIEW_COURSES', 'VIEW_DOCUMENTS'
      ]
    },
    'VIEWER': {
      level: 9,
      parent: 'EMPLOYEE',
      name: 'Visualizzatore',
      description: 'Solo visualizzazione',
      canAssignTo: ['GUEST'],
      permissions: [
        'VIEW_COURSES', 'VIEW_DOCUMENTS'
      ]
    },
    'GUEST': {
      level: 10,
      parent: 'VIEWER',
      name: 'Ospite',
      description: 'Accesso limitato',
      canAssignTo: [],
      permissions: [
        'VIEW_COURSES'
      ]
    },
    'CONSULTANT': {
      level: 7,
      parent: 'COORDINATOR',
      name: 'Consulente',
      description: 'Consulenza specialistica',
      canAssignTo: [],
      permissions: [
        'VIEW_COURSES', 'VIEW_DOCUMENTS', 'VIEW_REPORTS'
      ]
    },
    'AUDITOR': {
      level: 5,
      parent: 'MANAGER',
      name: 'Auditor',
      description: 'Controllo e audit',
      canAssignTo: [],
      permissions: [
        'VIEW_REPORTS', 'VIEW_DOCUMENTS', 'VIEW_EMPLOYEES'
      ]
    }
  };

  /**
   * Calcola il percorso gerarchico per un ruolo
   * @param {string} roleType - Tipo di ruolo
   * @param {string} parentPath - Percorso del ruolo padre
   * @param {number} position - Posizione tra i fratelli
   * @returns {string} Percorso gerarchico
   */
  static calculatePath(roleType, parentPath = null, position = 1) {
    if (!parentPath) {
      return position.toString();
    }
    return `${parentPath}.${position}`;
  }

  /**
   * Ottiene il livello gerarchico di un ruolo
   */
  static getRoleLevel(roleType) {
    return this.ROLE_HIERARCHY[roleType]?.level || 999;
  }

  /**
   * Ottiene il ruolo padre predefinito
   * @param {string} roleType - Tipo di ruolo
   * @returns {string|null} Tipo di ruolo padre
   */
  static getDefaultParentRole(roleType) {
    return this.ROLE_HIERARCHY[roleType]?.parent || null;
  }

  /**
   * Verifica se un ruolo può assegnare permessi a un altro ruolo
   */
  static canAssignToRole(assignerRole, targetRole) {
    const assignerLevel = this.getRoleLevel(assignerRole);
    const targetLevel = this.getRoleLevel(targetRole);
    
    // Un ruolo può assegnare permessi solo a ruoli di livello superiore (numero più alto)
    return assignerLevel < targetLevel;
  }

  /**
   * Verifica se un ruolo può gestire un altro ruolo (gerarchia)
   * @param {string} managerRoleType - Ruolo del manager
   * @param {string} targetRoleType - Ruolo target
   * @returns {boolean} True se può gestire
   */
  static canManageRole(managerRoleType, targetRoleType) {
    const managerLevel = this.getRoleLevel(managerRoleType);
    const targetLevel = this.getRoleLevel(targetRoleType);
    return managerLevel < targetLevel;
  }

  /**
   * Ottiene i ruoli che un determinato ruolo può assegnare
   */
  static getAssignableRoles(roleType) {
    const roleInfo = this.ROLE_HIERARCHY[roleType];
    if (!roleInfo) return [];
    
    return roleInfo.canAssignTo.map(targetRole => ({
      type: targetRole,
      ...this.ROLE_HIERARCHY[targetRole]
    }));
  }

  /**
   * Ottiene la gerarchia completa dei ruoli
   * Converte la struttura interna per compatibilità con il frontend
   */
  static async getRoleHierarchy(tenantId = null) {
    const hierarchy = {};
    
    // Converte la struttura interna per il frontend
    Object.entries(this.ROLE_HIERARCHY).forEach(([roleType, roleData]) => {
      hierarchy[roleType] = {
        level: roleData.level,
        name: roleData.name,
        description: roleData.description,
        assignableRoles: roleData.canAssignTo || [], // Converte canAssignTo in assignableRoles
        permissions: roleData.permissions || [],
        isCustomRole: roleData.isCustomRole || false,
        customRoleId: roleData.customRoleId || undefined
      };
    });
    
    // Aggiungi i ruoli personalizzati dal database se non sono già nella gerarchia statica
    if (tenantId) {
      try {
        const customRoles = await prisma.customRole.findMany({
          where: {
            tenantId,
            isActive: true,
            deletedAt: null
          },
          include: {
            permissions: true
          }
        });

        customRoles.forEach(customRole => {
          // Genera un roleType come fa addRoleToHierarchy
          const roleType = customRole.name.toUpperCase().replace(/\s+/g, '_');
          
          // Solo se non è già presente nella gerarchia statica
          if (!hierarchy[roleType]) {
            hierarchy[roleType] = {
              level: 3, // Livello di default per i ruoli personalizzati
              name: customRole.name,
              description: customRole.description || '',
              assignableRoles: [],
              permissions: customRole.permissions.map(p => p.permission),
              isCustomRole: true,
              customRoleId: customRole.id
            };
          }
        });
      } catch (error) {
        logger.error('Errore nel recupero dei ruoli personalizzati:', error);
      }
    }
    
    return hierarchy;
  }

  /**
   * Ottiene i permessi che un ruolo può assegnare a un altro ruolo
   * Se viene fornito solo un parametro, restituisce i permessi del ruolo stesso
   */
  static getAssignablePermissions(assignerRole, targetRole = null) {
    // Se non viene specificato un target role, restituisce i permessi del ruolo stesso
    if (!targetRole) {
      return this.ROLE_HIERARCHY[assignerRole]?.permissions || [];
    }
    
    const assignerPermissions = this.ROLE_HIERARCHY[assignerRole]?.permissions || [];
    const targetPermissions = this.ROLE_HIERARCHY[targetRole]?.permissions || [];
    
    // L'assegnatore può concedere solo i permessi che ha lui stesso
    // e che sono appropriati per il ruolo target
    if (assignerPermissions.includes('ALL_PERMISSIONS')) {
      return targetPermissions;
    }
    
    return targetPermissions.filter(permission => 
      assignerPermissions.includes(permission)
    );
  }

  /**
   * Ottiene tutti i permessi che un ruolo può assegnare a qualsiasi ruolo subordinato
   * Questo metodo è utilizzato dal frontend per determinare quali pulsanti abilitare
   */
  static getAllAssignablePermissions(assignerRole) {
    const assignerPermissions = this.ROLE_HIERARCHY[assignerRole]?.permissions || [];
    
    // Se ha ALL_PERMISSIONS, può assegnare qualsiasi permesso
    if (assignerPermissions.includes('ALL_PERMISSIONS')) {
      // Raccoglie tutti i permessi da tutti i ruoli
      const allPermissions = new Set();
      Object.values(this.ROLE_HIERARCHY).forEach(role => {
        if (role.permissions) {
          role.permissions.forEach(permission => allPermissions.add(permission));
        }
      });
      return Array.from(allPermissions);
    }
    
    // Altrimenti, può assegnare solo i permessi che ha lui stesso
    return assignerPermissions;
  }

  /**
   * Assegna un ruolo con controllo gerarchico
   */
  static async assignRoleWithHierarchy(assignerId, targetUserId, targetRole, tenantId, options = {}) {
    try {
      // Ottieni il ruolo dell'assegnatore
      const assigner = await prisma.person.findUnique({
        where: { id: assignerId },
        include: {
          personRoles: {
            where: { isActive: true }
          }
        }
      });

      if (!assigner) {
        throw new Error('Assegnatore non trovato');
      }

      // Determina il ruolo più alto dell'assegnatore
      const assignerRoles = assigner.personRoles.map(pr => pr.roleType);
      const assignerHighestRole = this.getHighestRole(assignerRoles);

      // Verifica se l'assegnatore può assegnare questo ruolo
      if (!this.canAssignToRole(assignerHighestRole, targetRole)) {
        throw new Error(`Il ruolo ${assignerHighestRole} non può assegnare il ruolo ${targetRole}`);
      }

      // Verifica che l'utente target esista
      const targetUser = await prisma.person.findUnique({
        where: { id: targetUserId }
      });

      if (!targetUser) {
        throw new Error('Utente target non trovato');
      }

      // Assegna il ruolo
      const roleAssignment = await prisma.personRole.create({
        data: {
          personId: targetUserId,
          roleType: targetRole,
          tenantId: tenantId,
          companyId: options.companyId || null,
          assignedBy: assignerId,
          isActive: true,
          assignedAt: new Date()
        }
      });

      logger.info(`Ruolo ${targetRole} assegnato a utente ${targetUserId} da ${assignerId}`);
      return roleAssignment;

    } catch (error) {
      logger.error('Errore nell\'assegnazione del ruolo:', error);
      throw error;
    }
  }

  /**
   * Assegna permessi con controllo gerarchico
   */
  static async assignPermissionsWithHierarchy(assignerId, targetUserId, permissions, tenantId) {
    try {
      // Ottieni il ruolo dell'assegnatore
      const assigner = await prisma.person.findUnique({
        where: { id: assignerId },
        include: {
          personRoles: {
            where: { isActive: true }
          }
        }
      });

      if (!assigner) {
        throw new Error('Assegnatore non trovato');
      }

      // Ottieni il ruolo del target
      const targetUser = await prisma.person.findUnique({
        where: { id: targetUserId },
        include: {
          personRoles: {
            where: { isActive: true }
          }
        }
      });

      if (!targetUser) {
        throw new Error('Utente target non trovato');
      }

      const assignerHighestRole = this.getHighestRole(assigner.personRoles.map(pr => pr.roleType));
      const targetHighestRole = this.getHighestRole(targetUser.personRoles.map(pr => pr.roleType));

      // Verifica che l'assegnatore possa modificare i permessi del target
      if (!this.canAssignToRole(assignerHighestRole, targetHighestRole)) {
        throw new Error(`Il ruolo ${assignerHighestRole} non può modificare i permessi di ${targetHighestRole}`);
      }

      // Verifica che l'assegnatore possa concedere questi permessi
      const assignablePermissions = this.getAssignablePermissions(assignerHighestRole, targetHighestRole);
      const invalidPermissions = permissions.filter(p => !assignablePermissions.includes(p));

      if (invalidPermissions.length > 0) {
        throw new Error(`Permessi non assegnabili: ${invalidPermissions.join(', ')}`);
      }

      // Rimuovi i permessi esistenti per questo utente e tenant
      await prisma.rolePermission.deleteMany({
        where: {
          personRole: {
            personId: targetUserId,
            tenantId: tenantId
          }
        }
      });

      // Assegna i nuovi permessi
      const rolePermissions = [];
      for (const permission of permissions) {
        const personRole = targetUser.personRoles.find(pr => pr.tenantId === tenantId);
        if (personRole) {
          const rolePermission = await prisma.rolePermission.create({
            data: {
              personRoleId: personRole.id,
              permissionId: permission,
              granted: true,
              assignedBy: assignerId,
              assignedAt: new Date()
            }
          });
          rolePermissions.push(rolePermission);
        }
      }

      logger.info(`Permessi assegnati a utente ${targetUserId} da ${assignerId}: ${permissions.join(', ')}`);
      return rolePermissions;

    } catch (error) {
      logger.error('Errore nell\'assegnazione dei permessi:', error);
      throw error;
    }
  }

  /**
   * Ottiene il ruolo più alto (livello più basso) da una lista di ruoli
   */
  static getHighestRole(roles) {
    if (!roles || roles.length === 0) return 'EMPLOYEE';
    
    return roles.reduce((highest, current) => {
      const currentLevel = this.getRoleLevel(current);
      const highestLevel = this.getRoleLevel(highest);
      return currentLevel < highestLevel ? current : highest;
    }, roles[0]);
  }

  /**
   * Ottiene la gerarchia completa dei ruoli per un utente (versione con array di ruoli)
   */
  static getUserRoleHierarchy(userRoleTypes) {
    if (!Array.isArray(userRoleTypes) || userRoleTypes.length === 0) {
      return {
        currentRoles: [],
        highestRole: 'EMPLOYEE',
        assignableRoles: [],
        canAssign: false
      };
    }

    const userRoles = userRoleTypes.map(roleType => ({
      roleType,
      level: this.getRoleLevel(roleType),
      ...this.ROLE_HIERARCHY[roleType]
    }));

    const highestRole = this.getHighestRole(userRoleTypes);
    const assignableRoles = this.getAssignableRoles(highestRole);

    return {
      currentRoles: userRoles,
      highestRole,
      assignableRoles,
      canAssign: assignableRoles.length > 0
    };
  }

  /**
   * Ottiene la gerarchia completa dei ruoli per un utente (versione originale con userId)
   */
  static async getUserRoleHierarchyByUserId(userId) {
    try {
      const user = await prisma.person.findUnique({
        where: { id: userId },
        include: {
          personRoles: {
            where: { isActive: true },
            include: {
              tenant: true,
              company: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('Utente non trovato');
      }

      const userRoles = user.personRoles.map(pr => {
        const roleData = this.ROLE_HIERARCHY[pr.roleType];
        return {
          roleType: pr.roleType,
          level: this.getRoleLevel(pr.roleType),
          tenant: pr.tenant?.name,
          company: pr.company?.name,
          name: roleData?.name || pr.roleType,
          description: roleData?.description || '',
          assignableRoles: roleData?.canAssignTo || [], // Converte canAssignTo in assignableRoles
          permissions: roleData?.permissions || []
        };
      });

      const highestRole = this.getHighestRole(user.personRoles.map(pr => pr.roleType));
      const assignableRoles = this.getAssignableRoles(highestRole);

      // Converte la gerarchia per il frontend
      const hierarchy = {};
      Object.entries(this.ROLE_HIERARCHY).forEach(([roleType, roleData]) => {
        hierarchy[roleType] = {
          level: roleData.level,
          name: roleData.name,
          description: roleData.description,
          assignableRoles: roleData.canAssignTo || [],
          permissions: roleData.permissions || []
        };
      });

      return {
        userId: user.id,
        userRoles: user.personRoles.map(pr => pr.roleType),
        hierarchy,
        highestRole,
        userLevel: this.getRoleLevel(highestRole),
        assignableRoles,
        assignablePermissions: this.getAssignablePermissions(highestRole, highestRole)
      };

    } catch (error) {
      logger.error('Errore nel recupero della gerarchia utente:', error);
      throw error;
    }
  }

  /**
   * Verifica se un utente può accedere a una risorsa basandosi sulla gerarchia
   */
  static async canAccessResource(userId, resource, action, tenantId = null) {
    try {
      const user = await prisma.person.findUnique({
        where: { id: userId },
        include: {
          personRoles: {
            where: { 
              isActive: true,
              ...(tenantId && { tenantId })
            }
          }
        }
      });

      if (!user) return false;

      const userRoles = user.personRoles.map(pr => pr.roleType);
      const highestRole = this.getHighestRole(userRoles);
      const rolePermissions = this.ROLE_HIERARCHY[highestRole]?.permissions || [];

      // Verifica se ha il permesso specifico o ALL_PERMISSIONS
      const requiredPermission = `${action.toUpperCase()}_${resource.toUpperCase()}`;
      return rolePermissions.includes('ALL_PERMISSIONS') || 
             rolePermissions.includes(requiredPermission);

    } catch (error) {
      logger.error('Errore nella verifica di accesso:', error);
      return false;
    }
  }

  // ===== NUOVI METODI PER GESTIONE GERARCHIA CON CAMPI PARENTROLEID, LEVEL E PATH =====

  /**
   * Crea o aggiorna un ruolo con logica gerarchica
   */
  static async createRoleWithHierarchy(roleData) {
    try {
      const { roleType, parentRoleId, tenantId, personId } = roleData;

      // Calcola il livello e il path basandosi sul parent
      let level = 0;
      let path = roleType;
      let parentRole = null;

      if (parentRoleId) {
        parentRole = await prisma.personRole.findUnique({
          where: { id: parentRoleId }
        });

        if (!parentRole) {
          throw new Error('Ruolo padre non trovato');
        }

        level = (parentRole.level || 0) + 1;
        path = `${parentRole.path}/${roleType}`;
      } else {
        // Se non ha parent, usa la gerarchia predefinita
        const defaultParent = this.getDefaultParentRole(roleType);
        if (defaultParent) {
          level = this.getRoleLevel(roleType);
          path = this.calculatePath(roleType);
        }
      }

      // Crea il ruolo con i campi gerarchici
      const newRole = await prisma.personRole.create({
        data: {
          ...roleData,
          parentRoleId,
          level,
          path,
          isActive: true,
          assignedAt: new Date()
        },
        include: {
          parentRole: true,
          childRoles: true
        }
      });

      logger.info(`Ruolo ${roleType} creato con gerarchia - Level: ${level}, Path: ${path}`);
      return newRole;

    } catch (error) {
      logger.error('Errore nella creazione del ruolo con gerarchia:', error);
      throw error;
    }
  }

  /**
   * Ottiene tutti i ruoli discendenti di un ruolo
   */
  static async getDescendantRoles(roleId, tenantId = null) {
    try {
      const role = await prisma.personRole.findUnique({
        where: { id: roleId }
      });

      if (!role) {
        throw new Error('Ruolo non trovato');
      }

      // Trova tutti i ruoli che hanno questo ruolo nel loro path
      const descendants = await prisma.personRole.findMany({
        where: {
          path: {
            startsWith: role.path + '/'
          },
          isActive: true,
          ...(tenantId && { tenantId })
        },
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          parentRole: true,
          childRoles: true
        },
        orderBy: [
          { level: 'asc' },
          { path: 'asc' }
        ]
      });

      return descendants;

    } catch (error) {
      logger.error('Errore nel recupero dei ruoli discendenti:', error);
      throw error;
    }
  }

  /**
   * Costruisce l'albero gerarchico completo per un tenant
   */
  static async getHierarchyTree(tenantId, userRoleId = null) {
    try {
      let whereClause = {
        tenantId,
        isActive: true
      };

      // Se specificato un ruolo utente, mostra solo i ruoli che può gestire
      if (userRoleId) {
        const userRole = await prisma.personRole.findUnique({
          where: { id: userRoleId }
        });

        if (userRole) {
          // Mostra solo i ruoli di livello uguale o inferiore
          whereClause.level = {
            gte: userRole.level
          };
        }
      }

      const roles = await prisma.personRole.findMany({
        where: whereClause,
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          parentRole: true,
          childRoles: {
            where: { isActive: true }
          }
        },
        orderBy: [
          { level: 'asc' },
          { path: 'asc' }
        ]
      });

      return this.buildTree(roles);

    } catch (error) {
      logger.error('Errore nella costruzione dell\'albero gerarchico:', error);
      throw error;
    }
  }

  /**
   * Costruisce l'albero dai ruoli piatti
   */
  static buildTree(roles) {
    const roleMap = new Map();
    const rootRoles = [];

    // Crea una mappa di tutti i ruoli
    roles.forEach(role => {
      roleMap.set(role.id, {
        ...role,
        children: []
      });
    });

    // Costruisce l'albero
    roles.forEach(role => {
      const roleNode = roleMap.get(role.id);
      
      if (role.parentRoleId && roleMap.has(role.parentRoleId)) {
        const parent = roleMap.get(role.parentRoleId);
        parent.children.push(roleNode);
      } else {
        rootRoles.push(roleNode);
      }
    });

    return rootRoles;
  }

  /**
   * Verifica se un utente può gestire un ruolo specifico
   */
  static async canUserManageRole(userId, targetRoleId, tenantId) {
    try {
      // Ottieni i ruoli dell'utente
      const userRoles = await prisma.personRole.findMany({
        where: {
          personId: userId,
          tenantId,
          isActive: true
        }
      });

      if (!userRoles.length) return false;

      // Ottieni il ruolo target
      const targetRole = await prisma.personRole.findUnique({
        where: { id: targetRoleId }
      });

      if (!targetRole) return false;

      // Trova il ruolo con il livello più alto (numero più basso) dell'utente
      const userHighestRole = userRoles.reduce((highest, current) => {
        return (current.level || 999) < (highest.level || 999) ? current : highest;
      }, userRoles[0]);

      // L'utente può gestire ruoli di livello uguale o inferiore
      return (userHighestRole.level || 999) <= (targetRole.level || 999);

    } catch (error) {
      logger.error('Errore nella verifica dei permessi di gestione:', error);
      return false;
    }
  }

  /**
   * Aggiorna la gerarchia di un ruolo e dei suoi figli
   */
  static async updateRoleHierarchy(roleId, newParentRoleId = null) {
    try {
      const role = await prisma.personRole.findUnique({
        where: { id: roleId },
        include: {
          childRoles: true
        }
      });

      if (!role) {
        throw new Error('Ruolo non trovato');
      }

      let newLevel = 0;
      let newPath = role.roleType;

      if (newParentRoleId) {
        const newParent = await prisma.personRole.findUnique({
          where: { id: newParentRoleId }
        });

        if (!newParent) {
          throw new Error('Nuovo ruolo padre non trovato');
        }

        newLevel = (newParent.level || 0) + 1;
        newPath = `${newParent.path}/${role.roleType}`;
      }

      // Aggiorna il ruolo corrente
      const updatedRole = await prisma.personRole.update({
        where: { id: roleId },
        data: {
          parentRoleId: newParentRoleId,
          level: newLevel,
          path: newPath
        }
      });

      // Aggiorna ricorsivamente tutti i figli
      await this.updateChildrenPaths(roleId, newPath, newLevel);

      logger.info(`Gerarchia aggiornata per ruolo ${roleId} - Nuovo path: ${newPath}`);
      return updatedRole;

    } catch (error) {
      logger.error('Errore nell\'aggiornamento della gerarchia:', error);
      throw error;
    }
  }

  /**
   * Aggiorna ricorsivamente i path dei ruoli figli
   */
  static async updateChildrenPaths(parentRoleId, parentPath, parentLevel) {
    try {
      const children = await prisma.personRole.findMany({
        where: {
          parentRoleId,
          isActive: true
        }
      });

      for (const child of children) {
        const newChildPath = `${parentPath}/${child.roleType}`;
        const newChildLevel = parentLevel + 1;

        await prisma.personRole.update({
          where: { id: child.id },
          data: {
            path: newChildPath,
            level: newChildLevel
          }
        });

        // Aggiorna ricorsivamente i figli di questo figlio
        await this.updateChildrenPaths(child.id, newChildPath, newChildLevel);
      }

    } catch (error) {
      logger.error('Errore nell\'aggiornamento dei path dei figli:', error);
      throw error;
    }
  }

  /**
   * Aggiunge un nuovo ruolo alla gerarchia
   */
  static async addRoleToHierarchy(roleType, name, description, parentRoleType, permissions, tenantId, createdBy) {
    try {
      // Calcola il livello basato sul parent
      let level = 1;
      if (parentRoleType && this.ROLE_HIERARCHY[parentRoleType]) {
        level = this.ROLE_HIERARCHY[parentRoleType].level + 1;
      }

      logger.info(`Aggiunta nuovo ruolo alla gerarchia: ${roleType}`, { 
        roleType, 
        name, 
        description, 
        parentRoleType, 
        tenantId 
      });

      // Crea il nuovo ruolo personalizzato nella tabella CustomRole
      const newCustomRole = await prisma.customRole.create({
        data: {
          name,
          description: description || '',
          tenantId,
          isActive: true,
          tenantAccess: 'SPECIFIC',
          createdBy,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Aggiungi i permessi se specificati
      if (permissions && permissions.length > 0) {
        const rolePermissions = permissions.map(permission => ({
          customRoleId: newCustomRole.id,
          permission: permission.permissionId || permission,
          scope: permission.scope || 'global',
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        await prisma.customRolePermission.createMany({
          data: rolePermissions
        });
      }

      // Aggiorna la gerarchia statica se necessario
      if (!this.ROLE_HIERARCHY[roleType]) {
        this.ROLE_HIERARCHY[roleType] = {
          level: level,
          parent: parentRoleType,
          name,
          description,
          canAssignTo: [],
          permissions: permissions || [],
          isCustomRole: true,
          customRoleId: newCustomRole.id
        };
      }

      logger.info(`Ruolo personalizzato ${name} (${roleType}) creato con successo`, { 
        id: newCustomRole.id, 
        level: level, 
        roleType 
      });

      return {
        id: newCustomRole.id,
        roleType,
        name,
        description,
        level,
        parentRoleType,
        permissions: permissions || [],
        isCustomRole: true,
        customRoleId: newCustomRole.id
      };

    } catch (error) {
      logger.error('Errore nell\'aggiunta del ruolo alla gerarchia:', error);
      throw error;
    }
  }

  /**
   * Ottiene tutti i ruoli che un utente può visualizzare nella gerarchia
   */
  static async getVisibleRolesForUser(userId, tenantId) {
    try {
      // Ottieni i ruoli dell'utente
      const userRoles = await prisma.personRole.findMany({
        where: {
          personId: userId,
          tenantId,
          isActive: true
        }
      });

      if (!userRoles.length) {
        return [];
      }

      // Trova il livello più alto dell'utente
      const userHighestLevel = Math.min(...userRoles.map(r => r.level || 999));

      // Ottieni tutti i ruoli di livello uguale o inferiore
      const visibleRoles = await prisma.personRole.findMany({
        where: {
          tenantId,
          isActive: true,
          level: {
            gte: userHighestLevel
          }
        },
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          parentRole: true,
          childRoles: {
            where: { isActive: true }
          }
        },
        orderBy: [
          { level: 'asc' },
          { path: 'asc' }
        ]
      });

      return this.buildTree(visibleRoles);

    } catch (error) {
      logger.error('Errore nel recupero dei ruoli visibili:', error);
      throw error;
    }
  }
}

export default RoleHierarchyService;