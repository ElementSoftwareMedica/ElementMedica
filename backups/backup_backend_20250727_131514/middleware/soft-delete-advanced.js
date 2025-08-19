/**
 * Advanced Soft Delete Middleware - Fase 5
 * Middleware avanzato per gestione automatica soft-delete
 * Supporta sia deletedAt che isActive patterns
 */

import logger from '../utils/logger.js';

// Modelli che usano deletedAt per soft-delete
const SOFT_DELETE_MODELS = [
  'Company', 'Course', 'CourseSchedule', 'CourseEnrollment', 'CourseSession',
  'Attestato', 'LetteraIncarico', 'RegistroPresenze', 'Preventivo', 'Fattura',
  'Permission', 'TestDocument', 'RefreshToken', 'Person', 'AdvancedPermission',
  'Tenant', 'TenantConfiguration', 'EnhancedUserRole', 'TenantUsage',
  'CustomRole', 'CustomRolePermission', 'TemplateLink', 'ScheduleCompany',
  'ActivityLog', 'GdprAuditLog', 'ConsentRecord', 'RolePermission'
];

// Modelli che usano isActive per soft-delete
const IS_ACTIVE_MODELS = [
  'PersonRole', 'PersonSession'
];

// Mapping relazioni -> modelli per include automatici
const RELATION_TO_MODEL = {
  'company': 'Company',
  'person': 'Person',
  'personRoles': 'PersonRole',
  'assignedRoles': 'PersonRole',
  'permissions': 'RolePermission',
  'courseSchedules': 'CourseSchedule',
  'schedules': 'CourseSchedule',
  'enrollments': 'CourseEnrollment',
  'courseEnrollments': 'CourseEnrollment',
  'sessions': 'CourseSession',
  'courseSessions': 'CourseSession',
  'attestati': 'Attestato',
  'refreshTokens': 'RefreshToken',
  'customRole': 'CustomRole',
  'customRoles': 'CustomRole',
  'tenant': 'Tenant',
  'enhancedUserRoles': 'EnhancedUserRole',
  'assignedEnhancedRoles': 'EnhancedUserRole',
  'personSessions': 'PersonSession',
  'lettereIncarico': 'LetteraIncarico',
  'registriPresenze': 'RegistroPresenze',
  'testDocuments': 'TestDocument',
  'activityLogs': 'ActivityLog',
  'gdprAuditLogs': 'GdprAuditLog',
  'consentRecords': 'ConsentRecord'
};

/**
 * Crea il middleware soft-delete avanzato
 */
export function createAdvancedSoftDeleteMiddleware() {
  return async (params, next) => {
    const { model, action } = params;
    
    // Skip se modello non ha soft-delete
    if (!SOFT_DELETE_MODELS.includes(model) && !IS_ACTIVE_MODELS.includes(model)) {
      return next(params);
    }
    
    try {
      // FIND OPERATIONS - Aggiungere filtri automatici
      if (['findFirst', 'findMany', 'findUnique', 'count', 'aggregate'].includes(action)) {
        return handleFindOperations(params, next);
      }
      
      // DELETE OPERATIONS - Convertire in soft-delete
      if (['delete', 'deleteMany'].includes(action)) {
        return handleDeleteOperations(params, next);
      }
      
      // UPDATE OPERATIONS - Preservare filtri
      if (['update', 'updateMany', 'upsert'].includes(action)) {
        return handleUpdateOperations(params, next);
      }
      
      return next(params);
    } catch (error) {
      logger.error('Soft delete middleware error', {
        model,
        action,
        error: error.message,
        component: 'soft-delete-middleware'
      });
      throw error;
    }
  };
}

/**
 * Gestisce operazioni di ricerca aggiungendo filtri soft-delete
 */
function handleFindOperations(params, next) {
  const { model, args } = params;
  
  if (!args) {
    params.args = {};
  }
  
  if (!args.where) {
    params.args.where = {};
  }
  
  // Aggiungere filtro appropriato se non già presente
  if (SOFT_DELETE_MODELS.includes(model)) {
    if (!('deletedAt' in args.where)) {
      params.args.where.deletedAt = null;
    }
  } else if (IS_ACTIVE_MODELS.includes(model)) {
    if (!('isActive' in args.where)) {
      params.args.where.isActive = true;
    }
  }
  
  // Gestire include/select con soft-delete
  if (args.include) {
    params.args.include = addSoftDeleteToIncludes(args.include);
  }
  
  return next(params);
}

/**
 * Gestisce operazioni di eliminazione convertendole in soft-delete
 */
function handleDeleteOperations(params, next) {
  const { model, action, args } = params;
  
  if (SOFT_DELETE_MODELS.includes(model)) {
    // Convertire delete in update con deletedAt
    params.action = action === 'delete' ? 'update' : 'updateMany';
    params.args.data = {
      deletedAt: new Date()
    };
    
    // Aggiungere filtro per non eliminare già eliminati
    if (!args.where) {
      params.args.where = {};
    }
    if (!('deletedAt' in args.where)) {
      params.args.where.deletedAt = null;
    }
    
  } else if (IS_ACTIVE_MODELS.includes(model)) {
    // Convertire delete in update con isActive: false
    params.action = action === 'delete' ? 'update' : 'updateMany';
    params.args.data = {
      isActive: false
    };
    
    if (!args.where) {
      params.args.where = {};
    }
    if (!('isActive' in args.where)) {
      params.args.where.isActive = true;
    }
  }
  
  return next(params);
}

/**
 * Gestisce operazioni di aggiornamento preservando filtri soft-delete
 */
function handleUpdateOperations(params, next) {
  const { model, args } = params;
  
  if (!args.where) {
    params.args.where = {};
  }
  
  // Aggiungere filtro per aggiornare solo record attivi
  if (SOFT_DELETE_MODELS.includes(model)) {
    if (!('deletedAt' in args.where)) {
      params.args.where.deletedAt = null;
    }
  } else if (IS_ACTIVE_MODELS.includes(model)) {
    if (!('isActive' in args.where)) {
      params.args.where.isActive = true;
    }
  }
  
  return next(params);
}

/**
 * Aggiunge filtri soft-delete agli include
 */
function addSoftDeleteToIncludes(include) {
  const processedInclude = {};
  
  for (const [key, value] of Object.entries(include)) {
    if (typeof value === 'boolean' && value === true) {
      // Semplice include: true -> aggiungere where
      const filter = getSoftDeleteFilter(key);
      if (Object.keys(filter).length > 0) {
        processedInclude[key] = {
          where: filter
        };
      } else {
        processedInclude[key] = value;
      }
    } else if (typeof value === 'object') {
      // Include complesso
      const filter = getSoftDeleteFilter(key);
      processedInclude[key] = {
        ...value,
        where: {
          ...filter,
          ...(value.where || {})
        }
      };
      
      // Ricorsione per include annidati
      if (value.include) {
        processedInclude[key].include = addSoftDeleteToIncludes(value.include);
      }
    } else {
      processedInclude[key] = value;
    }
  }
  
  return processedInclude;
}

/**
 * Determina il filtro soft-delete appropriato per un modello
 */
function getSoftDeleteFilter(relationName) {
  const modelName = RELATION_TO_MODEL[relationName];
  
  if (SOFT_DELETE_MODELS.includes(modelName)) {
    return { deletedAt: null };
  } else if (IS_ACTIVE_MODELS.includes(modelName)) {
    return { isActive: true };
  }
  
  return {};
}

/**
 * Classe estesa per operazioni speciali
 */
export class ExtendedPrismaClient {
  constructor(prismaClient) {
    this.prisma = prismaClient;
  }
  
  /**
   * Metodo per eliminazione definitiva (GDPR)
   * Bypassa il middleware soft-delete
   */
  async hardDelete(model, where) {
    const modelDelegate = this.prisma[model.toLowerCase()];
    
    if (!modelDelegate) {
      throw new Error(`Model ${model} not found`);
    }
    
    // Log operazione critica
    logger.warn('Hard delete operation', {
      model,
      where,
      component: 'hard-delete'
    });
    
    // Usare deleteMany per bypassare middleware
    return modelDelegate.deleteMany({
      where: {
        ...where,
        // Forzare bypass del middleware
        __bypassSoftDelete: true
      }
    });
  }
  
  /**
   * Metodo per recuperare record eliminati
   */
  async findDeleted(model, args = {}) {
    const modelDelegate = this.prisma[model.toLowerCase()];
    
    if (SOFT_DELETE_MODELS.includes(model)) {
      return modelDelegate.findMany({
        ...args,
        where: {
          ...args.where,
          deletedAt: { not: null }
        }
      });
    } else if (IS_ACTIVE_MODELS.includes(model)) {
      return modelDelegate.findMany({
        ...args,
        where: {
          ...args.where,
          isActive: false
        }
      });
    }
    
    return [];
  }
  
  /**
   * Metodo per ripristinare record eliminati
   */
  async restore(model, where) {
    const modelDelegate = this.prisma[model.toLowerCase()];
    
    if (SOFT_DELETE_MODELS.includes(model)) {
      return modelDelegate.updateMany({
        where: {
          ...where,
          deletedAt: { not: null }
        },
        data: {
          deletedAt: null
        }
      });
    } else if (IS_ACTIVE_MODELS.includes(model)) {
      return modelDelegate.updateMany({
        where: {
          ...where,
          isActive: false
        },
        data: {
          isActive: true
        }
      });
    }
    
    throw new Error(`Model ${model} does not support soft delete`);
  }
  
  /**
   * Metodo per visualizzare tutti i record (inclusi eliminati)
   */
  async findAllIncludingDeleted(model, args = {}) {
    const modelDelegate = this.prisma[model.toLowerCase()];
    
    return modelDelegate.findMany({
      ...args,
      where: {
        ...args.where,
        // Override filtri soft-delete
        OR: [
          { deletedAt: null },
          { deletedAt: { not: null } },
          { isActive: true },
          { isActive: false }
        ]
      }
    });
  }
}

export default createAdvancedSoftDeleteMiddleware;