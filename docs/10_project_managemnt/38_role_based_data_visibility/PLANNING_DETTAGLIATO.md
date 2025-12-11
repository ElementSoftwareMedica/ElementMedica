# 📅 Planning Dettagliato - Sistema Visibilità Dati

## Sprint 1: Fondamenta (Giorni 1-2)

### Task 1.1: Aggiornamento Schema Prisma (2h)
**File**: `backend/prisma/schema.prisma`

```prisma
// Aggiungere a AdvancedPermission
model AdvancedPermission {
  // ... campi esistenti ...
  
  // NUOVI CAMPI per scope relational
  relationType    String?      // Tipo di relazione (es: "trainer_courses")
  relationConfig  Json?        // Configurazione completa della relazione
  deniedFields    Json?        // Campi esplicitamente negati
  priority        Int          @default(0)  // Priorità per override
  isInherited     Boolean      @default(false) // Se ereditato
  sourceRoleId    String?      // Da quale ruolo è ereditato
}

// NUOVO MODELLO per definizioni relazioni
model RelationDefinition {
  id              String    @id @default(uuid())
  name            String    @unique  // Es: "trainer_courses"
  displayName     String    // Es: "Formatore - Corsi Assegnati"
  description     String?
  
  // Configurazione relazione
  baseEntity      String    // Entità base (es: "Person")
  targetEntities  Json      // Entità raggiungibili ["Company", "Person"]
  relationChain   Json      // Catena di relazioni
  
  // Metadata
  isActive        Boolean   @default(true)
  isSystem        Boolean   @default(false) // Se definita dal sistema
  tenantId        String?   // null = globale
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
  
  tenant          Tenant?   @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId])
  @@index([name])
  @@map("relation_definitions")
}
```

### Task 1.2: Migration Prisma (1h)
```bash
npx prisma migrate dev --name add_relational_scope_support
npx prisma generate
```

### Task 1.3: Seed Relazioni di Sistema (1h)
**File**: `backend/prisma/seed-relations.js`

```javascript
const SYSTEM_RELATIONS = [
  {
    name: 'trainer_courses',
    displayName: 'Formatore - Corsi Assegnati',
    description: 'Accesso a dati di aziende e persone partecipanti ai corsi dove l\'utente è formatore',
    baseEntity: 'Person',
    targetEntities: ['Company', 'Person', 'CourseSchedule', 'CourseEnrollment'],
    relationChain: [
      { from: 'Person', to: 'CourseSchedule', via: 'trainerId', type: 'oneToMany' },
      { from: 'CourseSchedule', to: 'Company', via: 'companyId', type: 'manyToOne' },
      { from: 'CourseSchedule', to: 'CourseEnrollment', via: 'scheduledCourseId', type: 'oneToMany' },
      { from: 'CourseEnrollment', to: 'Person', via: 'personId', type: 'manyToOne' }
    ],
    isSystem: true
  },
  {
    name: 'company_manager',
    displayName: 'Manager - Propria Azienda',
    description: 'Accesso a dati della propria azienda e relativi dipendenti',
    baseEntity: 'Person',
    targetEntities: ['Company', 'Person', 'CompanySite', 'Reparto'],
    relationChain: [
      { from: 'Person', to: 'Company', via: 'companyId', type: 'manyToOne' },
      { from: 'Company', to: 'Person', via: 'companyId', type: 'oneToMany' },
      { from: 'Company', to: 'CompanySite', via: 'companyId', type: 'oneToMany' }
    ],
    isSystem: true
  },
  {
    name: 'department_head',
    displayName: 'Responsabile Reparto',
    description: 'Accesso a dati del proprio reparto',
    baseEntity: 'Person',
    targetEntities: ['Person', 'Reparto'],
    relationChain: [
      { from: 'Person', to: 'Reparto', via: 'departmentId', type: 'manyToOne' },
      { from: 'Reparto', to: 'Person', via: 'departmentId', type: 'oneToMany' }
    ],
    isSystem: true
  },
  {
    name: 'site_manager',
    displayName: 'Responsabile Sede',
    description: 'Accesso a dati della propria sede aziendale',
    baseEntity: 'Person',
    targetEntities: ['Person', 'CompanySite', 'Reparto'],
    relationChain: [
      { from: 'Person', to: 'CompanySite', via: 'siteId', type: 'manyToOne' },
      { from: 'CompanySite', to: 'Person', via: 'siteId', type: 'oneToMany' }
    ],
    isSystem: true
  }
];
```

---

## Sprint 2: Backend Core (Giorni 2-3)

### Task 2.1: Servizio Risoluzione Relazioni (3h)
**File**: `backend/services/relation-resolver.js`

```javascript
/**
 * Relation Resolver Service
 * Risolve le relazioni e costruisce filtri Prisma dinamici
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

export class RelationResolver {
  
  /**
   * Risolve gli ID delle entità raggiungibili tramite una relazione
   * @param {string} personId - ID della persona base
   * @param {string} relationType - Tipo di relazione
   * @param {string} targetEntity - Entità target
   * @returns {Promise<string[]>} - Array di ID raggiungibili
   */
  async resolveRelatedIds(personId, relationType, targetEntity, tenantId) {
    const definition = await this.getRelationDefinition(relationType);
    if (!definition) {
      logger.warn(`Relation definition not found: ${relationType}`);
      return [];
    }
    
    const chain = definition.relationChain;
    let currentIds = [personId];
    let currentEntity = definition.baseEntity;
    
    for (const link of chain) {
      if (link.from !== currentEntity) continue;
      
      currentIds = await this.traverseLink(currentIds, link, tenantId);
      currentEntity = link.to;
      
      if (currentEntity === targetEntity) {
        return currentIds;
      }
    }
    
    return [];
  }
  
  /**
   * Attraversa un link nella catena di relazioni
   */
  async traverseLink(sourceIds, link, tenantId) {
    const { from, to, via, type } = link;
    
    // Costruisci query dinamica basata sul tipo di relazione
    const model = prisma[this.toPrismaModel(from)];
    
    if (type === 'oneToMany') {
      // Es: Person -> CourseSchedule via trainerId
      const targetModel = prisma[this.toPrismaModel(to)];
      const results = await targetModel.findMany({
        where: {
          [via]: { in: sourceIds },
          tenantId,
          deletedAt: null
        },
        select: { id: true }
      });
      return results.map(r => r.id);
      
    } else if (type === 'manyToOne') {
      // Es: CourseSchedule -> Company via companyId
      const results = await model.findMany({
        where: {
          id: { in: sourceIds },
          tenantId,
          deletedAt: null
        },
        select: { [via]: true }
      });
      return results.map(r => r[via]).filter(Boolean);
    }
    
    return [];
  }
  
  /**
   * Costruisce un filtro Prisma completo per lo scope relational
   */
  async buildRelationalFilter(personId, tenantId, permission) {
    const { resource, relationType, allowedFields, deniedFields } = permission;
    
    const relatedIds = await this.resolveRelatedIds(
      personId, 
      relationType, 
      this.resourceToEntity(resource),
      tenantId
    );
    
    return {
      where: {
        id: { in: relatedIds },
        tenantId,
        deletedAt: null
      },
      select: this.buildFieldSelect(allowedFields, deniedFields)
    };
  }
  
  /**
   * Helper per costruire select dei campi
   */
  buildFieldSelect(allowedFields, deniedFields) {
    if (!allowedFields && !deniedFields) return undefined;
    
    const select = {};
    
    if (allowedFields && allowedFields[0] !== '*') {
      for (const field of allowedFields) {
        select[field] = true;
      }
      // Aggiungi sempre id
      select.id = true;
    }
    
    // I deniedFields verranno rimossi dopo la query
    // per sicurezza (non affidarsi solo a select)
    
    return Object.keys(select).length > 0 ? select : undefined;
  }
  
  // Utility methods
  toPrismaModel(entityName) {
    // Company -> company, CourseSchedule -> courseSchedule
    return entityName.charAt(0).toLowerCase() + entityName.slice(1);
  }
  
  resourceToEntity(resource) {
    const mapping = {
      'companies': 'Company',
      'persons': 'Person',
      'courses': 'Course',
      'schedules': 'CourseSchedule',
      'sites': 'CompanySite',
      'reparti': 'Reparto'
    };
    return mapping[resource] || resource;
  }
  
  async getRelationDefinition(relationType) {
    return prisma.relationDefinition.findUnique({
      where: { name: relationType, deletedAt: null }
    });
  }
}

export const relationResolver = new RelationResolver();
```

### Task 2.2: Servizio Ereditarietà Permessi (3h)
**File**: `backend/services/permission-inheritance.js`

```javascript
/**
 * Permission Inheritance Service
 * Gestisce l'ereditarietà dei permessi nella gerarchia dei ruoli
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

// Configurazione gerarchia di default
const ROLE_HIERARCHY = {
  SUPER_ADMIN: { level: 1, inheritsFrom: [] },
  ADMIN: { level: 2, inheritsFrom: ['TENANT_ADMIN', 'COMPANY_ADMIN'] },
  TENANT_ADMIN: { level: 3, inheritsFrom: ['MANAGER', 'TRAINING_ADMIN'] },
  COMPANY_ADMIN: { level: 3, inheritsFrom: ['COMPANY_MANAGER', 'HR_MANAGER'] },
  MANAGER: { level: 4, inheritsFrom: ['SUPERVISOR', 'COORDINATOR'] },
  HR_MANAGER: { level: 4, inheritsFrom: ['DEPARTMENT_HEAD'] },
  TRAINING_ADMIN: { level: 4, inheritsFrom: ['TRAINER_COORDINATOR'] },
  TRAINER_COORDINATOR: { level: 5, inheritsFrom: ['SENIOR_TRAINER'] },
  DEPARTMENT_HEAD: { level: 5, inheritsFrom: ['SUPERVISOR'] },
  SUPERVISOR: { level: 6, inheritsFrom: ['OPERATOR'] },
  COORDINATOR: { level: 6, inheritsFrom: ['OPERATOR'] },
  SENIOR_TRAINER: { level: 6, inheritsFrom: ['TRAINER'] },
  TRAINER: { level: 7, inheritsFrom: ['EXTERNAL_TRAINER'] },
  OPERATOR: { level: 7, inheritsFrom: ['EMPLOYEE'] },
  EXTERNAL_TRAINER: { level: 8, inheritsFrom: [] },
  EMPLOYEE: { level: 8, inheritsFrom: [] },
  VIEWER: { level: 9, inheritsFrom: [] },
  GUEST: { level: 10, inheritsFrom: [] }
};

export class PermissionInheritanceService {
  
  /**
   * Risolve tutti i permessi effettivi per una persona
   * includendo quelli ereditati dalla gerarchia
   */
  async resolveEffectivePermissions(personId, tenantId) {
    // 1. Carica ruoli della persona
    const personRoles = await prisma.personRole.findMany({
      where: { 
        personId, 
        tenantId, 
        isActive: true,
        deletedAt: null 
      },
      include: {
        advancedPermissions: true,
        customRole: { include: { permissions: true } }
      }
    });
    
    // 2. Mappa permessi con priorità e ereditarietà
    const permissionMap = new Map();
    
    for (const personRole of personRoles) {
      // Permessi diretti del ruolo
      await this.processDirectPermissions(personRole, permissionMap);
      
      // Permessi ereditati dalla gerarchia
      await this.processInheritedPermissions(personRole, permissionMap, tenantId);
    }
    
    // 3. Converti in array e ordina per priorità
    const effectivePermissions = Array.from(permissionMap.values())
      .sort((a, b) => b.priority - a.priority);
    
    logger.debug('Resolved effective permissions', {
      personId,
      tenantId,
      totalPermissions: effectivePermissions.length,
      inheritedCount: effectivePermissions.filter(p => p.isInherited).length
    });
    
    return effectivePermissions;
  }
  
  /**
   * Processa i permessi diretti di un ruolo
   */
  async processDirectPermissions(personRole, permissionMap) {
    const roleLevel = ROLE_HIERARCHY[personRole.roleType]?.level || 99;
    
    for (const perm of personRole.advancedPermissions) {
      const key = `${perm.resource}:${perm.action}`;
      const existing = permissionMap.get(key);
      
      const permissionData = {
        ...perm,
        roleType: personRole.roleType,
        priority: perm.priority || (100 - roleLevel), // Ruoli più alti = priorità più alta
        isInherited: false,
        sourceRoleType: null
      };
      
      // Permesso più specifico o con priorità più alta vince
      if (!existing || permissionData.priority > existing.priority) {
        permissionMap.set(key, permissionData);
      }
    }
    
    // Gestisci anche permessi da CustomRole
    if (personRole.customRole?.permissions) {
      for (const perm of personRole.customRole.permissions) {
        const key = `${perm.resource}:${perm.permission}`;
        const existing = permissionMap.get(key);
        
        const permissionData = {
          resource: perm.resource,
          action: this.permissionToAction(perm.permission),
          scope: perm.scope,
          conditions: perm.conditions,
          allowedFields: perm.allowedFields,
          priority: 50, // Custom roles hanno priorità media
          isInherited: false,
          sourceRoleType: personRole.customRole.name
        };
        
        if (!existing || permissionData.priority > existing.priority) {
          permissionMap.set(key, permissionData);
        }
      }
    }
  }
  
  /**
   * Processa i permessi ereditati dalla gerarchia
   */
  async processInheritedPermissions(personRole, permissionMap, tenantId) {
    const hierarchy = ROLE_HIERARCHY[personRole.roleType];
    if (!hierarchy?.inheritsFrom?.length) return;
    
    for (const parentRoleType of hierarchy.inheritsFrom) {
      // Cerca permessi di default per questo roleType
      const parentPermissions = await this.getDefaultPermissionsForRole(parentRoleType, tenantId);
      
      for (const perm of parentPermissions) {
        const key = `${perm.resource}:${perm.action}`;
        
        // Non sovrascrivere permessi diretti
        if (permissionMap.has(key)) continue;
        
        permissionMap.set(key, {
          ...perm,
          priority: perm.priority - 10, // Permessi ereditati hanno priorità inferiore
          isInherited: true,
          sourceRoleType: parentRoleType
        });
      }
      
      // Ricorsione per ereditarietà multi-livello
      // (limitata a 3 livelli per performance)
    }
  }
  
  /**
   * Ottiene i permessi di default per un tipo di ruolo
   */
  async getDefaultPermissionsForRole(roleType, tenantId) {
    // Prima cerca permessi specifici del tenant
    let permissions = await prisma.advancedPermission.findMany({
      where: {
        personRole: {
          roleType,
          tenantId,
          deletedAt: null
        }
      }
    });
    
    // Se non trovati, usa i default di sistema
    if (permissions.length === 0) {
      permissions = DEFAULT_ROLE_PERMISSIONS[roleType] || [];
    }
    
    return permissions;
  }
  
  /**
   * Verifica se un utente può vedere/modificare una specifica risorsa
   */
  async canAccessResource(personId, tenantId, resource, action, resourceId = null) {
    const permissions = await this.resolveEffectivePermissions(personId, tenantId);
    
    const relevantPerm = permissions.find(p => 
      p.resource === resource && p.action === action
    );
    
    if (!relevantPerm) return { allowed: false, reason: 'No permission found' };
    
    if (relevantPerm.scope === 'none') {
      return { allowed: false, reason: 'Permission explicitly denied' };
    }
    
    if (relevantPerm.scope === 'all') {
      return { allowed: true, permission: relevantPerm };
    }
    
    if (relevantPerm.scope === 'own' && resourceId) {
      const isOwner = await this.checkOwnership(personId, resource, resourceId);
      return { allowed: isOwner, reason: isOwner ? null : 'Not owner', permission: relevantPerm };
    }
    
    if (relevantPerm.scope === 'relational' && resourceId) {
      const { relationResolver } = await import('./relation-resolver.js');
      const relatedIds = await relationResolver.resolveRelatedIds(
        personId, 
        relevantPerm.relationType,
        resource,
        tenantId
      );
      const hasAccess = relatedIds.includes(resourceId);
      return { allowed: hasAccess, reason: hasAccess ? null : 'Not in relation', permission: relevantPerm };
    }
    
    return { allowed: true, permission: relevantPerm };
  }
  
  // Utility methods
  permissionToAction(permission) {
    const mapping = {
      'VIEW_': 'read',
      'CREATE_': 'create',
      'EDIT_': 'update',
      'DELETE_': 'delete',
      'MANAGE_': 'manage'
    };
    for (const [prefix, action] of Object.entries(mapping)) {
      if (permission.startsWith(prefix)) return action;
    }
    return 'read';
  }
  
  async checkOwnership(personId, resource, resourceId) {
    const model = prisma[resource.replace(/s$/, '')];
    if (!model) return false;
    
    const record = await model.findFirst({
      where: { id: resourceId },
      select: { personId: true, createdBy: true }
    });
    
    return record?.personId === personId || record?.createdBy === personId;
  }
}

export const permissionInheritanceService = new PermissionInheritanceService();

// Permessi di default per ruoli di sistema
const DEFAULT_ROLE_PERMISSIONS = {
  TRAINER: [
    { resource: 'schedules', action: 'read', scope: 'relational', relationType: 'trainer_courses' },
    { resource: 'schedules', action: 'update', scope: 'relational', relationType: 'trainer_courses', allowedFields: ['attendance', 'notes'] },
    { resource: 'companies', action: 'read', scope: 'relational', relationType: 'trainer_courses', allowedFields: ['id', 'ragioneSociale', 'citta'] },
    { resource: 'persons', action: 'read', scope: 'relational', relationType: 'trainer_courses', allowedFields: ['id', 'firstName', 'lastName', 'email'] }
  ],
  COMPANY_MANAGER: [
    { resource: 'persons', action: 'read', scope: 'relational', relationType: 'company_manager' },
    { resource: 'persons', action: 'update', scope: 'relational', relationType: 'company_manager', deniedFields: ['salary'] },
    { resource: 'sites', action: 'read', scope: 'relational', relationType: 'company_manager' },
    { resource: 'reparti', action: 'read', scope: 'relational', relationType: 'company_manager' }
  ],
  EMPLOYEE: [
    { resource: 'persons', action: 'read', scope: 'own' },
    { resource: 'schedules', action: 'read', scope: 'own' }
  ]
};
```

### Task 2.3: Middleware Filtraggio Dati (2h)
**File**: `backend/middleware/role-data-filter.js`

```javascript
/**
 * Role Data Filter Middleware
 * Applica automaticamente filtri ai dati in base ai permessi dell'utente
 */

import { permissionInheritanceService } from '../services/permission-inheritance.js';
import { relationResolver } from '../services/relation-resolver.js';
import logger from '../utils/logger.js';

/**
 * Middleware principale per filtraggio dati
 */
export const roleDataFilter = async (req, res, next) => {
  try {
    const { person, tenant } = req;
    
    if (!person || !tenant) {
      req.dataFilter = null;
      return next();
    }
    
    const resource = extractResourceFromPath(req.path);
    if (!resource) {
      req.dataFilter = null;
      return next();
    }
    
    const action = httpMethodToAction(req.method);
    
    // Risolvi permessi effettivi
    const accessCheck = await permissionInheritanceService.canAccessResource(
      person.id,
      tenant.id,
      resource,
      action
    );
    
    if (!accessCheck.allowed) {
      req.dataFilter = { 
        allowed: false, 
        reason: accessCheck.reason,
        resource,
        action
      };
      return next();
    }
    
    const permission = accessCheck.permission;
    
    // Costruisci filtro in base allo scope
    req.dataFilter = await buildDataFilter(person.id, tenant.id, permission);
    req.allowedFields = permission.allowedFields;
    req.deniedFields = permission.deniedFields;
    
    logger.debug('Data filter applied', {
      personId: person.id,
      resource,
      action,
      scope: permission.scope,
      filterApplied: !!req.dataFilter
    });
    
    next();
  } catch (error) {
    logger.error('Error in roleDataFilter', { error: error.message });
    req.dataFilter = null;
    next();
  }
};

/**
 * Costruisce il filtro dati in base al permesso
 */
async function buildDataFilter(personId, tenantId, permission) {
  const baseFilter = {
    tenantId,
    deletedAt: null
  };
  
  switch (permission.scope) {
    case 'all':
      return {
        allowed: true,
        where: baseFilter
      };
      
    case 'tenant':
      return {
        allowed: true,
        where: baseFilter
      };
      
    case 'own':
      return {
        allowed: true,
        where: {
          ...baseFilter,
          OR: [
            { id: personId },
            { personId },
            { createdBy: personId }
          ]
        }
      };
      
    case 'relational':
      return await relationResolver.buildRelationalFilter(
        personId, 
        tenantId, 
        permission
      );
      
    case 'none':
      return {
        allowed: false,
        where: { id: 'BLOCKED' } // Query che non ritorna nulla
      };
      
    default:
      return {
        allowed: true,
        where: baseFilter
      };
  }
}

/**
 * Middleware per applicare filtro a response
 * Da usare dopo la query per filtrare campi
 */
export const filterResponseFields = (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = (data) => {
    if (req.deniedFields && Array.isArray(req.deniedFields)) {
      data = removeFields(data, req.deniedFields);
    }
    return originalJson(data);
  };
  
  next();
};

/**
 * Rimuove campi sensibili dalla response
 */
function removeFields(data, fieldsToRemove) {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => removeFields(item, fieldsToRemove));
  }
  
  if (typeof data === 'object') {
    const filtered = { ...data };
    for (const field of fieldsToRemove) {
      delete filtered[field];
    }
    
    // Ricorsione per oggetti annidati
    for (const key of Object.keys(filtered)) {
      if (typeof filtered[key] === 'object') {
        filtered[key] = removeFields(filtered[key], fieldsToRemove);
      }
    }
    
    return filtered;
  }
  
  return data;
}

// Utility functions
function extractResourceFromPath(path) {
  const matches = path.match(/\/api\/v1\/(\w+)/);
  return matches ? matches[1] : null;
}

function httpMethodToAction(method) {
  const mapping = {
    GET: 'read',
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete'
  };
  return mapping[method] || 'read';
}

export default roleDataFilter;
```

---

## Sprint 3: API & Testing (Giorno 3-4)

### Task 3.1: API per Scope Relazionali (2h)
**File**: `backend/routes/roles/relation-scopes.js`

### Task 3.2: Integrazione con Route Esistenti (2h)
Modificare le route principali per usare `roleDataFilter`

### Task 3.3: Unit Test (2h)
Test per:
- `RelationResolver.resolveRelatedIds()`
- `PermissionInheritanceService.resolveEffectivePermissions()`
- `roleDataFilter` middleware

---

## Sprint 4: Frontend (Giorni 4-5)

### Task 4.1: RelationalScopeEditor Component (2h)
### Task 4.2: PermissionInheritanceView Component (2h)
### Task 4.3: Integrazione in OptimizedPermissionManager (2h)
### Task 4.4: DataVisibilityTab Page (2h)

---

## 📊 Metriche di Successo

| Metrica | Target |
|---------|--------|
| Query relazionali < 100ms | ✅ |
| Cache hit rate > 80% | ✅ |
| Zero errori GDPR | ✅ |
| Test coverage > 80% | ✅ |
| UI response < 500ms | ✅ |

---

## 🚨 Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Query complesse lente | Media | Alto | Cache, Index ottimizzati |
| Conflitti permessi | Media | Medio | Sistema priorità chiaro |
| Breaking changes API | Bassa | Alto | Versioning, deprecation |
| Complessità UI | Media | Medio | Design iterativo |

---

*Piano creato il 30 Novembre 2025*
