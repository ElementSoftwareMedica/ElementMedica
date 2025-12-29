# Person Activity Logging System - Technical Plan

## 📋 Overview

Piano per implementare un sistema di logging completo per tracciare le attività delle Person nell'applicazione. Il sistema deve essere:
- **Pulito**: Codice ben organizzato e separato dalle business logic
- **Ordinato**: Struttura chiara e consistente
- **Manutentibile**: Facile da estendere e modificare
- **Scalabile**: Performante anche con grandi volumi di dati
- **Sicuro**: GDPR compliant, nessun dato sensibile nei log

---

## 🏗️ Architettura Proposta

### 1. Struttura File

```
backend/
├── services/
│   └── activity/
│       ├── index.js                 # Export pubblici
│       ├── ActivityService.js       # Servizio principale
│       ├── ActivityTypes.js         # Enum e tipi di attività
│       ├── ActivityFormatter.js     # Formattazione messaggi
│       └── ActivityRetention.js     # Gestione retention e cleanup
│
├── middleware/
│   └── activityTracking.js          # Middleware per tracking automatico
│
└── routes/
    └── v1/
        └── activity/
            ├── index.js             # Router principale
            ├── logs.js              # API per visualizzare log
            └── analytics.js         # API per analytics
```

### 2. Schema Database (già esistente + estensioni)

L'ActivityLog esistente è già buono. Propongo queste estensioni:

```prisma
model ActivityLog {
  id           String    @id @default(uuid())
  personId     String    @map("user_id")
  action       String                          // Azione eseguita (enum ActivityType)
  category     String?                         // NEW: Categoria (AUTH, CRUD, NAVIGATION, etc.)
  resource     String?                         // NEW: Risorsa coinvolta (Company, Course, etc.)
  resourceId   String?                         // NEW: ID della risorsa
  details      String?                         // Dettagli aggiuntivi (JSON)
  metadata     Json?                           // NEW: Metadata strutturato
  ipAddress    String?                         // NEW: IP address
  userAgent    String?                         // NEW: Browser/device info
  sessionId    String?                         // NEW: Link a PersonSession
  duration     Int?                            // NEW: Durata operazione (ms)
  success      Boolean   @default(true)        // NEW: Successo/fallimento
  errorCode    String?                         // NEW: Codice errore se fallito
  timestamp    DateTime  @default(now())
  createdAt    DateTime  @default(now())
  deletedAt    DateTime?
  updatedAt    DateTime  @updatedAt
  tenantId     String
  
  // Relations
  tenant    Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  person    Person        @relation("ActivityLog_Person", fields: [personId], references: [id], onDelete: Cascade)
  session   PersonSession? @relation(fields: [sessionId], references: [id])
  
  // Indexes for performance
  @@index([tenantId])
  @@index([personId])
  @@index([personId, timestamp])
  @@index([action, timestamp])
  @@index([category, timestamp])          // NEW
  @@index([resource, resourceId])         // NEW
  @@index([sessionId])                    // NEW
  @@index([timestamp])
  @@map("activity_logs")
}
```

---

## 📊 Tipi di Attività da Tracciare

### 1. Categoria AUTH (Autenticazione)
| Action | Description | Data Tracked |
|--------|-------------|--------------|
| `AUTH_LOGIN_SUCCESS` | Login riuscito | email, tenantId, ipAddress, userAgent |
| `AUTH_LOGIN_FAILED` | Login fallito | identifier, reason, ipAddress |
| `AUTH_LOGOUT` | Logout | sessionDuration |
| `AUTH_TOKEN_REFRESH` | Token refreshato | - |
| `AUTH_PASSWORD_RESET_REQUEST` | Richiesta reset password | email |
| `AUTH_PASSWORD_RESET_COMPLETE` | Password resettata | - |
| `AUTH_SESSION_EXPIRED` | Sessione scaduta | sessionDuration |
| `AUTH_CONCURRENT_LOGIN` | Login da altro device | newDeviceInfo |

### 2. Categoria CRUD (Operazioni dati)
| Action | Description | Data Tracked |
|--------|-------------|--------------|
| `ENTITY_CREATE` | Creazione entità | entityType, entityId |
| `ENTITY_READ` | Lettura entità | entityType, entityId |
| `ENTITY_UPDATE` | Modifica entità | entityType, entityId, changedFields |
| `ENTITY_DELETE` | Eliminazione entità | entityType, entityId |
| `ENTITY_EXPORT` | Export dati | entityType, count, format |
| `ENTITY_IMPORT` | Import dati | entityType, count, status |

### 3. Categoria NAVIGATION (Navigazione)
| Action | Description | Data Tracked |
|--------|-------------|--------------|
| `PAGE_VIEW` | Visualizzazione pagina | path, referrer |
| `SEARCH_PERFORMED` | Ricerca effettuata | query, resultsCount |
| `FILTER_APPLIED` | Filtro applicato | filterType, filterValue |

### 4. Categoria DOCUMENT (Documenti)
| Action | Description | Data Tracked |
|--------|-------------|--------------|
| `DOCUMENT_GENERATE` | Generazione documento | docType, templateId |
| `DOCUMENT_DOWNLOAD` | Download documento | docId, docType |
| `DOCUMENT_SIGN` | Firma documento | docId, signatureType |
| `DOCUMENT_SHARE` | Condivisione documento | docId, recipients |

### 5. Categoria ADMIN (Amministrazione)
| Action | Description | Data Tracked |
|--------|-------------|--------------|
| `PERMISSION_GRANTED` | Permesso concesso | targetPersonId, permission |
| `PERMISSION_REVOKED` | Permesso revocato | targetPersonId, permission |
| `ROLE_ASSIGNED` | Ruolo assegnato | targetPersonId, roleType |
| `TENANT_SWITCH` | Cambio tenant | fromTenantId, toTenantId |
| `SETTINGS_CHANGED` | Modifica impostazioni | settingKey, oldValue, newValue |

---

## 🛠️ Implementazione

### Phase 1: Core Service (Priority: HIGH)

**File: `backend/services/activity/ActivityTypes.js`**
```javascript
/**
 * Activity Types Enum
 * Definisce tutti i tipi di attività tracciabili
 */
export const ActivityCategory = {
  AUTH: 'AUTH',
  CRUD: 'CRUD',
  NAVIGATION: 'NAVIGATION',
  DOCUMENT: 'DOCUMENT',
  ADMIN: 'ADMIN',
  SYSTEM: 'SYSTEM'
};

export const ActivityType = {
  // Auth
  AUTH_LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_TOKEN_REFRESH: 'AUTH_TOKEN_REFRESH',
  AUTH_PASSWORD_RESET_REQUEST: 'AUTH_PASSWORD_RESET_REQUEST',
  AUTH_PASSWORD_RESET_COMPLETE: 'AUTH_PASSWORD_RESET_COMPLETE',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  
  // CRUD
  ENTITY_CREATE: 'ENTITY_CREATE',
  ENTITY_READ: 'ENTITY_READ',
  ENTITY_UPDATE: 'ENTITY_UPDATE',
  ENTITY_DELETE: 'ENTITY_DELETE',
  ENTITY_EXPORT: 'ENTITY_EXPORT',
  ENTITY_IMPORT: 'ENTITY_IMPORT',
  
  // Navigation
  PAGE_VIEW: 'PAGE_VIEW',
  SEARCH_PERFORMED: 'SEARCH_PERFORMED',
  
  // Document
  DOCUMENT_GENERATE: 'DOCUMENT_GENERATE',
  DOCUMENT_DOWNLOAD: 'DOCUMENT_DOWNLOAD',
  DOCUMENT_SIGN: 'DOCUMENT_SIGN',
  
  // Admin
  PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  PERMISSION_REVOKED: 'PERMISSION_REVOKED',
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',
  TENANT_SWITCH: 'TENANT_SWITCH',
  SETTINGS_CHANGED: 'SETTINGS_CHANGED'
};

// Map action to category
export const getActivityCategory = (action) => {
  if (action.startsWith('AUTH_')) return ActivityCategory.AUTH;
  if (action.startsWith('ENTITY_')) return ActivityCategory.CRUD;
  if (action.startsWith('PAGE_') || action.startsWith('SEARCH_')) return ActivityCategory.NAVIGATION;
  if (action.startsWith('DOCUMENT_')) return ActivityCategory.DOCUMENT;
  if (action.startsWith('PERMISSION_') || action.startsWith('ROLE_') || action.startsWith('TENANT_') || action.startsWith('SETTINGS_')) return ActivityCategory.ADMIN;
  return ActivityCategory.SYSTEM;
};
```

**File: `backend/services/activity/ActivityService.js`**
```javascript
/**
 * Activity Service
 * Servizio centralizzato per il logging delle attività Person
 * 
 * Caratteristiche:
 * - Async queue per non bloccare le operazioni
 * - Batch insert per performance
 * - Sanitization automatica dei dati sensibili
 * - Retry logic per resilienza
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { ActivityType, getActivityCategory } from './ActivityTypes.js';

class ActivityService {
  constructor() {
    this.queue = [];
    this.batchSize = 100;
    this.flushInterval = 5000; // 5 secondi
    this.isProcessing = false;
    
    // Avvia il flush periodico
    this.startFlushTimer();
  }
  
  /**
   * Log an activity (async, non-blocking)
   */
  async log(params) {
    const {
      personId,
      action,
      resource = null,
      resourceId = null,
      details = null,
      metadata = null,
      ipAddress = null,
      userAgent = null,
      sessionId = null,
      duration = null,
      success = true,
      errorCode = null,
      tenantId
    } = params;
    
    // Validation
    if (!personId || !action || !tenantId) {
      logger.warn('ActivityService: Missing required fields', { personId, action, tenantId });
      return;
    }
    
    // Sanitize sensitive data
    const sanitizedMetadata = this.sanitizeMetadata(metadata);
    const sanitizedDetails = this.sanitizeDetails(details);
    
    // Add to queue
    this.queue.push({
      personId,
      action,
      category: getActivityCategory(action),
      resource,
      resourceId,
      details: sanitizedDetails,
      metadata: sanitizedMetadata,
      ipAddress: this.sanitizeIp(ipAddress),
      userAgent: this.truncateUserAgent(userAgent),
      sessionId,
      duration,
      success,
      errorCode,
      tenantId,
      timestamp: new Date()
    });
    
    // Flush if batch size reached
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }
  
  /**
   * Sanitize metadata to remove sensitive data
   */
  sanitizeMetadata(metadata) {
    if (!metadata) return null;
    
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
    const sanitized = { ...metadata };
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  /**
   * Sanitize details string
   */
  sanitizeDetails(details) {
    if (!details) return null;
    // Remove any potential passwords or tokens
    return details.replace(/password['":\s]*[^,}\s]+/gi, 'password:[REDACTED]')
                  .replace(/token['":\s]*[^,}\s]+/gi, 'token:[REDACTED]');
  }
  
  /**
   * Sanitize IP address (remove IPv6 prefix if present)
   */
  sanitizeIp(ip) {
    if (!ip) return null;
    return ip.replace(/^::ffff:/, '').replace(/\\/g, '');
  }
  
  /**
   * Truncate user agent to reasonable length
   */
  truncateUserAgent(userAgent) {
    if (!userAgent) return null;
    return userAgent.substring(0, 500);
  }
  
  /**
   * Start periodic flush timer
   */
  startFlushTimer() {
    setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }
  
  /**
   * Flush queue to database
   */
  async flush() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      await prisma.activityLog.createMany({
        data: batch,
        skipDuplicates: true
      });
      
      logger.debug('ActivityService: Flushed batch', { count: batch.length });
    } catch (error) {
      logger.error('ActivityService: Flush failed', {
        error: error.message,
        count: batch.length
      });
      
      // Re-queue failed items for retry (once only)
      if (!batch[0]._retried) {
        batch.forEach(item => {
          item._retried = true;
          this.queue.unshift(item);
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Get activities for a person
   */
  async getPersonActivities(personId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      category = null,
      action = null,
      startDate = null,
      endDate = null,
      tenantId
    } = options;
    
    const where = {
      personId,
      tenantId,
      deletedAt: null
    };
    
    if (category) where.category = category;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }
    
    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          action: true,
          category: true,
          resource: true,
          resourceId: true,
          details: true,
          metadata: true,
          success: true,
          errorCode: true,
          timestamp: true,
          ipAddress: true
        }
      }),
      prisma.activityLog.count({ where })
    ]);
    
    return { activities, total, limit, offset };
  }
  
  /**
   * Get activity summary for a person
   */
  async getPersonActivitySummary(personId, tenantId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const activities = await prisma.activityLog.groupBy({
      by: ['action'],
      where: {
        personId,
        tenantId,
        timestamp: { gte: startDate },
        deletedAt: null
      },
      _count: true
    });
    
    const loginCount = await prisma.activityLog.count({
      where: {
        personId,
        tenantId,
        action: 'AUTH_LOGIN_SUCCESS',
        timestamp: { gte: startDate },
        deletedAt: null
      }
    });
    
    const lastActivity = await prisma.activityLog.findFirst({
      where: {
        personId,
        tenantId,
        deletedAt: null
      },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true, action: true }
    });
    
    return {
      period: `${days} days`,
      totalActivities: activities.reduce((sum, a) => sum + a._count, 0),
      loginCount,
      lastActivity,
      byAction: activities.map(a => ({ action: a.action, count: a._count }))
    };
  }
}

// Singleton
export const activityService = new ActivityService();
export default activityService;
```

### Phase 2: Middleware Integration (Priority: HIGH)

**File: `backend/middleware/activityTracking.js`**
```javascript
/**
 * Activity Tracking Middleware
 * Traccia automaticamente le attività HTTP
 */

import activityService from '../services/activity/ActivityService.js';
import { ActivityType } from '../services/activity/ActivityTypes.js';

/**
 * Middleware per tracciare le request HTTP
 */
export const trackActivity = (options = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Capture response
    const originalSend = res.send;
    res.send = function(body) {
      res.body = body;
      return originalSend.call(this, body);
    };
    
    res.on('finish', async () => {
      // Skip if no authenticated user
      if (!req.person?.id) return;
      
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;
      
      // Determine action type based on method and path
      const action = determineAction(req.method, req.path, options);
      if (!action) return; // Skip if not trackable
      
      // Extract resource info
      const { resource, resourceId } = extractResourceInfo(req);
      
      await activityService.log({
        personId: req.person.id,
        action,
        resource,
        resourceId,
        details: options.details || null,
        metadata: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          query: Object.keys(req.query).length > 0 ? req.query : undefined
        },
        ipAddress: getClientIp(req),
        userAgent: req.get('User-Agent'),
        sessionId: req.session?.id || null,
        duration,
        success,
        errorCode: success ? null : String(res.statusCode),
        tenantId: req.person.tenantId
      });
    });
    
    next();
  };
};

/**
 * Helper to determine action type
 */
function determineAction(method, path, options) {
  if (options.action) return options.action;
  
  // Auth routes
  if (path.includes('/auth/login')) return method === 'POST' ? ActivityType.AUTH_LOGIN_SUCCESS : null;
  if (path.includes('/auth/logout')) return ActivityType.AUTH_LOGOUT;
  if (path.includes('/auth/refresh')) return ActivityType.AUTH_TOKEN_REFRESH;
  
  // CRUD routes
  const crudMap = {
    'GET': ActivityType.ENTITY_READ,
    'POST': ActivityType.ENTITY_CREATE,
    'PUT': ActivityType.ENTITY_UPDATE,
    'PATCH': ActivityType.ENTITY_UPDATE,
    'DELETE': ActivityType.ENTITY_DELETE
  };
  
  // Skip common non-entity routes
  if (path.includes('/health') || path.includes('/metrics')) return null;
  
  return crudMap[method] || null;
}

/**
 * Extract resource info from request
 */
function extractResourceInfo(req) {
  const pathParts = req.path.split('/').filter(Boolean);
  
  // Common patterns: /api/v1/companies/:id, /api/v1/persons/:id
  const resourceIndex = pathParts.findIndex(p => 
    ['companies', 'persons', 'courses', 'schedules', 'documents', 'templates'].includes(p)
  );
  
  if (resourceIndex >= 0) {
    const resource = pathParts[resourceIndex];
    const resourceId = pathParts[resourceIndex + 1] || req.body?.id || null;
    return { resource, resourceId };
  }
  
  return { resource: null, resourceId: null };
}

/**
 * Get client IP handling proxies
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim().replace(/\\/g, '');
  }
  return (req.ip || '127.0.0.1').replace(/^::ffff:/, '');
}
```

### Phase 3: API Endpoints (Priority: MEDIUM)

**File: `backend/routes/v1/activity/logs.js`**
```javascript
/**
 * Activity Logs API
 * Endpoints per visualizzare i log di attività
 */

import express from 'express';
import { authenticate } from '../../../auth/middleware.js';
import activityService from '../../../services/activity/ActivityService.js';

const router = express.Router();

/**
 * GET /api/v1/activity/me
 * Get current user's activities
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const { limit, offset, category, action, startDate, endDate } = req.query;
    
    const result = await activityService.getPersonActivities(req.person.id, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      category,
      action,
      startDate,
      endDate,
      tenantId: req.person.tenantId
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/activity/me/summary
 * Get current user's activity summary
 */
router.get('/me/summary', authenticate, async (req, res) => {
  try {
    const { days } = req.query;
    
    const summary = await activityService.getPersonActivitySummary(
      req.person.id,
      req.person.tenantId,
      parseInt(days) || 30
    );
    
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/activity/persons/:personId
 * Get activities for a specific person (admin only)
 */
router.get('/persons/:personId', authenticate, async (req, res) => {
  try {
    // Check admin permission
    if (!req.person.roles?.includes('ADMIN') && !req.person.roles?.includes('SUPER_ADMIN')) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    const { personId } = req.params;
    const { limit, offset, category, action, startDate, endDate } = req.query;
    
    const result = await activityService.getPersonActivities(personId, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      category,
      action,
      startDate,
      endDate,
      tenantId: req.person.tenantId
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

---

## 🔒 Security Considerations

### 1. Data Sanitization
- **Mai** loggare password, token, chiavi API
- Sanitizzare IP addresses (rimuovere prefissi IPv6)
- Truncare user agent per evitare injection
- Rimuovere PII non necessari dai metadata

### 2. Access Control
- Solo utente stesso può vedere i propri log (tranne admin)
- Admin può vedere log di tutti gli utenti del proprio tenant
- Super Admin può vedere log cross-tenant

### 3. Retention Policy
- Log di autenticazione: 2 anni (GDPR)
- Log di operazioni: 1 anno
- Log di navigazione: 90 giorni
- Implementare job di cleanup automatico

### 4. Performance
- Batch insert per ridurre carico DB
- Async queue per non bloccare le operazioni
- Indici ottimizzati per query comuni
- Pagination obbligatoria per le query

---

## 📈 Monitoring e Analytics

### Dashboard Metrics
1. **Login Activity**
   - Login giornalieri per tenant
   - Login falliti (potenziali attacchi)
   - Session duration media

2. **User Activity**
   - Utenti più attivi
   - Azioni più comuni
   - Trend settimanali

3. **Security Alerts**
   - Multiple login failures
   - Login da IP sospetti
   - Accessi fuori orario

---

## 🚀 Implementation Roadmap

### Week 1: Core Implementation
- [ ] Creare ActivityService con queue e batch insert
- [ ] Definire ActivityTypes enum
- [ ] Aggiungere campi al schema Prisma
- [ ] Eseguire migration

### Week 2: Integration
- [ ] Creare middleware activityTracking
- [ ] Integrare nel login/logout flow
- [ ] Integrare nelle route CRUD principali

### Week 3: API & UI
- [ ] Creare API endpoints per lettura log
- [ ] Creare componente React per visualizzare activity
- [ ] Aggiungere filtri e paginazione

### Week 4: Polish & Monitoring
- [ ] Implementare retention policy e cleanup job
- [ ] Creare dashboard analytics
- [ ] Test di carico e ottimizzazione

---

## 📝 Migration Script

```sql
-- Add new columns to activity_logs
ALTER TABLE activity_logs
ADD COLUMN IF NOT EXISTS category VARCHAR(50),
ADD COLUMN IF NOT EXISTS resource VARCHAR(100),
ADD COLUMN IF NOT EXISTS resource_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50),
ADD COLUMN IF NOT EXISTS user_agent VARCHAR(500),
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS error_code VARCHAR(50);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON activity_logs(category, timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_session ON activity_logs(session_id);
```

---

## ✅ Acceptance Criteria

1. **Funzionalità**
   - [ ] Ogni login/logout viene loggato
   - [ ] Ogni operazione CRUD viene loggata
   - [ ] I log sono filtrabili per data, azione, persona
   - [ ] Gli admin possono vedere i log del proprio tenant

2. **Performance**
   - [ ] Il logging non rallenta le operazioni (< 5ms overhead)
   - [ ] La query dei log è performante (< 200ms per 1000 record)
   - [ ] Il batch insert funziona correttamente

3. **Security**
   - [ ] Nessun dato sensibile nei log
   - [ ] Access control implementato correttamente
   - [ ] Audit trail GDPR compliant

4. **Manutenibilità**
   - [ ] Codice ben documentato
   - [ ] Test unitari per ActivityService
   - [ ] Facile aggiungere nuovi tipi di attività
